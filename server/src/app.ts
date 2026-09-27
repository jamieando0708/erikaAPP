import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import type { Config } from "./config.js";
import type { DB } from "./db.js";
import { FactCheckError, type FactChecker } from "./factcheck/claude.js";
import type { FactCheckReport } from "./factcheck/report.js";
import { type HealthProfile, HealthProfileSchema } from "./profile.js";
import {
  decryptJson,
  encryptJson,
  hashPassword,
  hashToken,
  newSessionToken,
  safeEqual,
  verifyPassword,
} from "./security.js";
import { effectiveTier, PRODUCT_TO_TIER, startOfMonthUtc, TIERS, type TierId } from "./tiers.js";
import type { VideoExtractor } from "./video/extract.js";
import { detectPlatform, extractUrl, isPublicHost } from "./video/platform.js";

export const CONSENT_VERSION = "2026-09-v1";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export interface AppDeps {
  config: Config;
  db: DB;
  extractor: VideoExtractor;
  factChecker: FactChecker;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  tier: string;
  tier_expires_at: number | null;
  health_consent_at: number | null;
  health_consent_version: string | null;
  created_at: number;
}

interface CheckRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  url: string;
  platform: string;
  status: "processing" | "done" | "failed";
  error: string | null;
  result_enc: string | null;
  created_at: number;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: UserRow;
  }
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function createApp({ config, db, extractor, factChecker }: AppDeps) {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use((req, res, next) => {
    const origin = req.header("origin");
    const allowed = config.corsOrigins;
    if (origin && (allowed.includes("*") || allowed.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", allowed.includes("*") ? "*" : origin);
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  const pending = new Set<Promise<void>>();
  const key = config.healthDataKey;

  // ---------- helpers ----------

  const getUser = (id: string) =>
    db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;

  function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const row = token
      ? (db
          .prepare("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?")
          .get(hashToken(token), Date.now()) as { user_id: string } | undefined)
      : undefined;
    const user = row && getUser(row.user_id);
    if (!user) throw new HttpError(401, "Please log in again.", "unauthenticated");
    req.user = user;
    next();
  }

  function startSession(userId: string) {
    const { token, tokenHash } = newSessionToken();
    const now = Date.now();
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?)").run(tokenHash, userId, now, now + SESSION_TTL_MS);
    return token;
  }

  function checksThisMonth(userId: string) {
    const row = db
      .prepare("SELECT COUNT(*) AS n FROM checks WHERE user_id = ? AND created_at >= ? AND status != 'failed'")
      .get(userId, startOfMonthUtc()) as { n: number };
    return row.n;
  }

  function listProfiles(userId: string) {
    const rows = db
      .prepare("SELECT id, data_enc, updated_at FROM profiles WHERE user_id = ? ORDER BY created_at")
      .all(userId) as Array<{ id: string; data_enc: string; updated_at: number }>;
    return rows.map((r) => ({ id: r.id, updatedAt: r.updated_at, ...decryptJson<HealthProfile>(key, r.data_enc) }));
  }

  function me(user: UserRow) {
    const tier = effectiveTier(user.tier, user.tier_expires_at);
    const used = checksThisMonth(user.id);
    return {
      id: user.id,
      email: user.email,
      tier,
      tierExpiresAt: user.tier_expires_at,
      usage: { checksThisMonth: used, checksRemaining: Math.max(0, tier.checksPerMonth - used) },
      healthConsent: user.health_consent_version === CONSENT_VERSION,
      profiles: listProfiles(user.id).map((p) => ({ id: p.id, displayName: p.displayName })),
    };
  }

  function checkSummary(row: CheckRow) {
    const report = row.result_enc ? decryptJson<FactCheckReport>(key, row.result_enc) : null;
    return {
      id: row.id,
      url: row.url,
      platform: row.platform,
      status: row.status,
      error: row.error,
      createdAt: row.created_at,
      profileId: row.profile_id,
      score: report?.overall_score ?? null,
      verdict: report?.verdict ?? null,
      summary: report?.summary ?? null,
    };
  }

  const getOwnCheck = (userId: string, id: string) => {
    const row = db.prepare("SELECT * FROM checks WHERE id = ? AND user_id = ?").get(id, userId) as
      | CheckRow
      | undefined;
    if (!row) throw new HttpError(404, "Check not found.");
    return row;
  };

  // ---------- auth ----------

  const Credentials = z.object({
    email: z.string().trim().toLowerCase().email().max(200),
    password: z.string().min(8, "Password must be at least 8 characters.").max(200),
  });

  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  function throttle(email: string) {
    const now = Date.now();
    const entry = loginAttempts.get(email);
    if (!entry || entry.resetAt < now) {
      loginAttempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 });
      return;
    }
    if (++entry.count > 10) throw new HttpError(429, "Too many attempts. Please wait 15 minutes.");
  }

  app.post("/auth/signup", async (req, res) => {
    const { email, password } = Credentials.parse(req.body);
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
      throw new HttpError(409, "An account with that email already exists.");
    }
    const id = randomUUID();
    db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
      id,
      email,
      await hashPassword(password),
      Date.now(),
    );
    res.status(201).json({ token: startSession(id), user: me(getUser(id)!) });
  });

  app.post("/auth/login", async (req, res) => {
    const { email, password } = Credentials.parse(req.body);
    throttle(email);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new HttpError(401, "Email or password is incorrect.");
    }
    loginAttempts.delete(email);
    res.json({ token: startSession(user.id), user: me(user) });
  });

  app.post("/auth/logout", requireAuth, (req, res) => {
    const token = req.header("authorization")!.slice(7);
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    res.status(204).end();
  });

  // ---------- account, consent & privacy (GDPR) ----------

  app.get("/me", requireAuth, (req, res) => {
    res.json(me(req.user!));
  });

  app.post("/me/consent", requireAuth, (req, res) => {
    const body = z.object({ version: z.literal(CONSENT_VERSION), accepted: z.literal(true) }).parse(req.body);
    db.prepare("UPDATE users SET health_consent_at = ?, health_consent_version = ? WHERE id = ?").run(
      Date.now(),
      body.version,
      req.user!.id,
    );
    res.json(me(getUser(req.user!.id)!));
  });

  // Withdrawing consent deletes all stored health data.
  app.delete("/me/consent", requireAuth, (req, res) => {
    db.prepare("DELETE FROM profiles WHERE user_id = ?").run(req.user!.id);
    db.prepare("UPDATE users SET health_consent_at = NULL, health_consent_version = NULL WHERE id = ?").run(
      req.user!.id,
    );
    res.json(me(getUser(req.user!.id)!));
  });

  app.get("/me/export", requireAuth, (req, res) => {
    const u = req.user!;
    const checks = (
      db.prepare("SELECT * FROM checks WHERE user_id = ? ORDER BY created_at").all(u.id) as unknown as CheckRow[]
    ).map((c) => ({
      ...checkSummary(c),
      report: c.result_enc ? decryptJson<FactCheckReport>(key, c.result_enc) : null,
    }));
    res.setHeader("Content-Disposition", 'attachment; filename="sift-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: {
        email: u.email,
        createdAt: new Date(u.created_at).toISOString(),
        tier: u.tier,
        healthConsentAt: u.health_consent_at ? new Date(u.health_consent_at).toISOString() : null,
        healthConsentVersion: u.health_consent_version,
      },
      profiles: listProfiles(u.id),
      checks,
    });
  });

  app.delete("/me", requireAuth, (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.user!.id); // cascades to everything else
    res.status(204).end();
  });

  // ---------- health profiles ----------

  function requireConsent(user: UserRow) {
    if (user.health_consent_version !== CONSENT_VERSION) {
      throw new HttpError(403, "Please agree to the health data terms first.", "consent_required");
    }
  }

  app.get("/profiles", requireAuth, (req, res) => {
    res.json(listProfiles(req.user!.id));
  });

  app.post("/profiles", requireAuth, (req, res) => {
    const user = req.user!;
    requireConsent(user);
    const profile = HealthProfileSchema.parse(req.body);
    const count = (db.prepare("SELECT COUNT(*) AS n FROM profiles WHERE user_id = ?").get(user.id) as { n: number }).n;
    const tier = effectiveTier(user.tier, user.tier_expires_at);
    if (count >= tier.maxProfiles) {
      throw new HttpError(403, "Family profiles are part of the Pro plan.", "upgrade_required");
    }
    const id = randomUUID();
    const now = Date.now();
    db.prepare("INSERT INTO profiles VALUES (?, ?, ?, ?, ?)").run(id, user.id, encryptJson(key, profile), now, now);
    res.status(201).json({ id, updatedAt: now, ...profile });
  });

  app.put("/profiles/:id", requireAuth, (req, res) => {
    requireConsent(req.user!);
    const profile = HealthProfileSchema.parse(req.body);
    const now = Date.now();
    const result = db
      .prepare("UPDATE profiles SET data_enc = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(encryptJson(key, profile), now, String(req.params.id), req.user!.id);
    if (result.changes === 0) throw new HttpError(404, "Profile not found.");
    res.json({ id: String(req.params.id), updatedAt: now, ...profile });
  });

  app.delete("/profiles/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM profiles WHERE id = ? AND user_id = ?").run(String(req.params.id), req.user!.id);
    res.status(204).end();
  });

  // ---------- plans ----------

  app.get("/plans", (_req, res) => {
    res.json(Object.values(TIERS).filter((t) => t.id !== "free"));
  });

  // ---------- fact checks ----------

  const NewCheck = z.object({
    /** The shared text or link, e.g. "Look at this https://vm.tiktok.com/abc". */
    shared: z.string().trim().min(1).max(2000),
    note: z.string().trim().max(2000).optional(),
    profileId: z.string().optional(),
  });

  app.post("/checks", requireAuth, (req, res) => {
    const user = req.user!;
    const body = NewCheck.parse(req.body);
    // A link to check, or else the pasted post/claim itself.
    const url = extractUrl(body.shared);
    if (url && !isPublicHost(url)) {
      throw new HttpError(400, "That link can't be checked. Try copying it again.", "bad_link");
    }
    if (!url && body.shared.length < 15) {
      throw new HttpError(400, "Paste a link, or type out the claim you want checked.", "bad_input");
    }

    const tier = effectiveTier(user.tier, user.tier_expires_at);
    if (checksThisMonth(user.id) >= tier.checksPerMonth) {
      throw new HttpError(
        402,
        tier.id === "free"
          ? "You've used your free checks this month. Pick a plan to keep going."
          : "You've reached this month's check limit for your plan.",
        "limit_reached",
      );
    }

    let profile: HealthProfile | null = null;
    let profileId: string | null = null;
    if (tier.personalAdvice && user.health_consent_version === CONSENT_VERSION) {
      const profiles = listProfiles(user.id);
      const chosen = body.profileId ? profiles.find((p) => p.id === body.profileId) : profiles[0];
      if (body.profileId && !chosen) throw new HttpError(404, "Profile not found.");
      if (chosen) {
        const { id, updatedAt: _u, ...data } = chosen;
        profile = data;
        profileId = id;
      }
    }

    const id = randomUUID();
    const platform = url ? detectPlatform(url) : "text";
    db.prepare(
      "INSERT INTO checks (id, user_id, profile_id, url, platform, status, created_at) VALUES (?, ?, ?, ?, ?, 'processing', ?)",
    ).run(id, user.id, profileId, url ? url.toString() : body.shared, platform, Date.now());

    const job = (async () => {
      try {
        let video = null;
        if (url) {
          video = await extractor.extract(url, platform);
          // Articles and other web pages are read by the AI itself (web_fetch).
          const hasContent = video.transcript || video.description || video.title || body.note || platform === "other";
          if (!hasContent) {
            throw new FactCheckError(
              "We couldn't read this video. Add a short note about what it claims and try again.",
            );
          }
        }
        const report = await factChecker.check({
          url: url ? url.toString() : null,
          platform,
          video,
          userNote: url ? (body.note ?? null) : body.shared,
          profile,
        });
        db.prepare("UPDATE checks SET status = 'done', result_enc = ? WHERE id = ?").run(encryptJson(key, report), id);
      } catch (err) {
        console.error(`check ${id} failed:`, err);
        const message =
          err instanceof FactCheckError ? err.message : "Something went wrong checking this video. Please try again.";
        db.prepare("UPDATE checks SET status = 'failed', error = ? WHERE id = ?").run(message, id);
      }
    })();
    pending.add(job);
    void job.finally(() => pending.delete(job));

    res.status(202).json({ id, status: "processing" });
  });

  app.get("/checks", requireAuth, (req, res) => {
    const rows = db
      .prepare("SELECT * FROM checks WHERE user_id = ? ORDER BY created_at DESC LIMIT 100")
      .all(req.user!.id) as unknown as CheckRow[];
    res.json(rows.map(checkSummary));
  });

  app.get("/checks/:id", requireAuth, (req, res) => {
    const row = getOwnCheck(req.user!.id, String(req.params.id));
    res.json({
      ...checkSummary(row),
      report: row.result_enc ? decryptJson<FactCheckReport>(key, row.result_enc) : null,
    });
  });

  app.delete("/checks/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM checks WHERE id = ? AND user_id = ?").run(String(req.params.id), req.user!.id);
    res.status(204).end();
  });

  // Pro: a plain-text summary to show or send to a doctor.
  app.get("/checks/:id/doctor-report", requireAuth, (req, res) => {
    const user = req.user!;
    if (!effectiveTier(user.tier, user.tier_expires_at).doctorReports) {
      throw new HttpError(403, "Doctor reports are part of the Pro plan.", "upgrade_required");
    }
    const row = getOwnCheck(user.id, String(req.params.id));
    if (!row.result_enc) throw new HttpError(409, "This check isn't finished yet.");
    res.type("text/plain").send(doctorReport(row, decryptJson<FactCheckReport>(key, row.result_enc)));
  });

  // ---------- billing ----------

  if (config.billingMode === "dev") {
    // Lets you try every plan while developing, without real payments.
    app.post("/billing/dev/activate", requireAuth, (req, res) => {
      const { tier } = z.object({ tier: z.enum(["free", "basic", "plus", "pro"]) }).parse(req.body);
      const expires = tier === "free" ? null : Date.now() + 30 * 24 * 60 * 60 * 1000;
      db.prepare("UPDATE users SET tier = ?, tier_expires_at = ? WHERE id = ?").run(tier, expires, req.user!.id);
      res.json(me(getUser(req.user!.id)!));
    });
  }

  // RevenueCat sends App Store / Google Play subscription events here.
  app.post("/billing/revenuecat/webhook", (req, res) => {
    const secret = config.revenueCatWebhookSecret;
    if (!secret || !safeEqual(req.header("authorization") ?? "", `Bearer ${secret}`)) {
      throw new HttpError(401, "Unauthorized");
    }
    const event = z
      .object({
        event: z.object({
          type: z.string(),
          app_user_id: z.string(),
          product_id: z.string().optional(),
          new_product_id: z.string().nullish(),
          expiration_at_ms: z.number().nullish(),
        }),
      })
      .parse(req.body).event;

    const productId = event.new_product_id ?? event.product_id;
    const tier: TierId | undefined = productId ? PRODUCT_TO_TIER[productId] : undefined;
    const grants = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "SUBSCRIPTION_EXTENDED"];

    if (grants.includes(event.type) && tier) {
      db.prepare("UPDATE users SET tier = ?, tier_expires_at = ? WHERE id = ?").run(
        tier,
        event.expiration_at_ms ?? null,
        event.app_user_id,
      );
    } else if (event.type === "EXPIRATION") {
      db.prepare("UPDATE users SET tier = 'free', tier_expires_at = NULL WHERE id = ?").run(event.app_user_id);
    }
    // CANCELLATION just turns off auto-renew; access continues until EXPIRATION.
    res.json({ ok: true });
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // ---------- errors ----------

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, code: err.code });
    } else if (err instanceof ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request.", code: "invalid" });
    } else {
      console.error(err);
      res.status(500).json({ error: "Something went wrong." });
    }
  });

  return { app, waitForIdle: () => Promise.all([...pending]) };
}

const VERDICT_LABEL: Record<string, string> = {
  accurate: "Accurate",
  mostly_accurate: "Mostly accurate",
  mixed: "Mixed",
  misleading: "Misleading",
  false: "False",
  unverifiable: "Can't be verified",
};

function doctorReport(row: CheckRow, r: FactCheckReport): string {
  const lines = [
    "Sift - fact-check summary",
    row.platform === "text" ? `Claim: ${row.url}` : `Link: ${row.url}`,
    `Checked: ${new Date(row.created_at).toISOString().slice(0, 10)}`,
    `Overall: ${VERDICT_LABEL[r.verdict]} (${r.overall_score}/100)`,
    "",
    r.headline,
    r.summary,
    "",
    "Claims:",
    ...r.claims.map((c) => `- ${c.claim} -> ${c.verdict.replace("_", " ")}. ${c.explanation}`),
  ];
  if (r.personal) {
    lines.push("", "Relevance to patient:", r.personal.advice, ...r.personal.cautions.map((c) => `- ${c}`));
  }
  if (r.sources.length) lines.push("", "Sources:", ...r.sources.map((s) => `- ${s.title}: ${s.url}`));
  lines.push("", "Generated by AI for discussion with a health professional. Not a diagnosis.");
  return lines.join("\n");
}
