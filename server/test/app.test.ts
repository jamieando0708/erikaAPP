import { randomBytes } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { CONSENT_VERSION, createApp } from "../src/app.js";
import type { Config } from "../src/config.js";
import { openDatabase } from "../src/db.js";
import type { FactCheckInput, FactChecker } from "../src/factcheck/claude.js";
import type { FactCheckReport } from "../src/factcheck/report.js";
import type { VideoExtractor } from "../src/video/extract.js";

const config: Config = {
  port: 0,
  databasePath: ":memory:",
  healthDataKey: randomBytes(32),
  billingMode: "dev",
  revenueCatWebhookSecret: "rc-secret",
  ytDlpPath: "yt-dlp",
  claudeModel: "test",
  corsOrigins: [],
  demoMode: false,
  deepgramApiKey: null,
  maxTranscribeSeconds: 900,
};

const fakeReport: FactCheckReport = {
  headline: "Squats fix everything?",
  topic: "fitness",
  overall_score: 80,
  verdict: "mostly_accurate",
  summary: "Mostly right.",
  claims: [],
  useful_takeaways: [],
  red_flags: [],
  personal: null,
  see_a_professional: false,
  urgent_safety_warning: null,
  sources: [],
};

function setup(videoHasContent = true) {
  const db = openDatabase(":memory:");
  const inputs: FactCheckInput[] = [];
  const extractor: VideoExtractor = {
    extract: async () => ({
      title: videoHasContent ? "Squats fix everything" : null,
      description: null,
      creator: null,
      durationSec: null,
      transcript: null,
      source: videoHasContent ? "metadata" : "none",
    }),
  };
  const factChecker: FactChecker = {
    check: async (input) => {
      inputs.push(input);
      return { ...fakeReport, personal: input.profile ? { relevance: "helpful_for_you", advice: "Go for it", cautions: [] } : null };
    },
  };
  const { app, waitForIdle } = createApp({ config, db, extractor, factChecker });
  return { app, db, inputs, waitForIdle };
}

async function signup(app: ReturnType<typeof setup>["app"], email = "a@example.com") {
  const res = await request(app).post("/auth/signup").send({ email, password: "password123" });
  expect(res.status).toBe(201);
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

const profile = { displayName: "Me", age: 34, conditions: ["asthma"], medications: ["salbutamol"] };

describe("API", () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it("signs up, logs in and rejects bad passwords", async () => {
    await signup(ctx.app);
    expect((await request(ctx.app).post("/auth/signup").send({ email: "A@example.com", password: "password123" })).status).toBe(409);
    expect((await request(ctx.app).post("/auth/login").send({ email: "a@example.com", password: "password123" })).status).toBe(200);
    expect((await request(ctx.app).post("/auth/login").send({ email: "a@example.com", password: "nopenope1" })).status).toBe(401);
    expect((await request(ctx.app).get("/me")).status).toBe(401);
  });

  it("requires consent before storing health data, and encrypts it", async () => {
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    const denied = await request(ctx.app).post("/profiles").set(auth).send(profile);
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("consent_required");

    await request(ctx.app).post("/me/consent").set(auth).send({ version: CONSENT_VERSION, accepted: true }).expect(200);
    const created = await request(ctx.app).post("/profiles").set(auth).send(profile).expect(201);
    expect(created.body.medications).toEqual(["salbutamol"]);

    const raw = ctx.db.prepare("SELECT data_enc FROM profiles").get() as { data_enc: string };
    expect(raw.data_enc).not.toContain("salbutamol");

    // A second profile needs Pro.
    expect((await request(ctx.app).post("/profiles").set(auth).send(profile)).body.code).toBe("upgrade_required");
    await request(ctx.app).post("/billing/dev/activate").set(auth).send({ tier: "pro" }).expect(200);
    await request(ctx.app).post("/profiles").set(auth).send({ ...profile, displayName: "Mum" }).expect(201);

    // Withdrawing consent deletes health data.
    await request(ctx.app).delete("/me/consent").set(auth).expect(200);
    expect((await request(ctx.app).get("/profiles").set(auth)).body).toEqual([]);
  });

  it("runs a fact check from share-sheet text", async () => {
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    const started = await request(ctx.app)
      .post("/checks")
      .set(auth)
      .send({ shared: "lol look https://vm.tiktok.com/ZM123/" })
      .expect(202);
    await ctx.waitForIdle();

    const check = await request(ctx.app).get(`/checks/${started.body.id}`).set(auth).expect(200);
    expect(check.body.status).toBe("done");
    expect(check.body.platform).toBe("tiktok");
    expect(check.body.report.overall_score).toBe(80);
    expect((await request(ctx.app).get("/checks").set(auth)).body).toHaveLength(1);
  });

  it("checks a pasted claim without a link", async () => {
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    const claim = "Magnesium supplements fix insomnia for everyone";
    const started = await request(ctx.app).post("/checks").set(auth).send({ shared: claim }).expect(202);
    await ctx.waitForIdle();
    expect(ctx.inputs[0]).toMatchObject({ url: null, video: null, platform: "text", userNote: claim });
    const check = await request(ctx.app).get(`/checks/${started.body.id}`).set(auth);
    expect(check.body.status).toBe("done");
    expect(check.body.platform).toBe("text");
  });

  it("only sends the health profile on plans with personal advice", async () => {
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    await request(ctx.app).post("/me/consent").set(auth).send({ version: CONSENT_VERSION, accepted: true });
    await request(ctx.app).post("/profiles").set(auth).send(profile);

    await request(ctx.app).post("/checks").set(auth).send({ shared: "https://youtu.be/a" }).expect(202);
    await ctx.waitForIdle();
    expect(ctx.inputs[0]!.profile).toBeNull();

    await request(ctx.app).post("/billing/dev/activate").set(auth).send({ tier: "plus" });
    await request(ctx.app).post("/checks").set(auth).send({ shared: "https://youtu.be/b" }).expect(202);
    await ctx.waitForIdle();
    expect(ctx.inputs[1]!.profile?.medications).toEqual(["salbutamol"]);
  });

  it("enforces the monthly limit", async () => {
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    for (let i = 0; i < 3; i++) {
      await request(ctx.app).post("/checks").set(auth).send({ shared: `https://youtu.be/${i}` }).expect(202);
    }
    const blocked = await request(ctx.app).post("/checks").set(auth).send({ shared: "https://youtu.be/x" });
    expect(blocked.status).toBe(402);
    expect(blocked.body.code).toBe("limit_reached");
    await ctx.waitForIdle();
  });

  it("rejects non-links and internal addresses", async () => {
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(ctx.app).post("/checks").set(auth).send({ shared: "hello" })).body.code).toBe("bad_input");
    expect((await request(ctx.app).post("/checks").set(auth).send({ shared: "http://169.254.169.254/latest" })).body.code).toBe("bad_link");
  });

  it("fails a check nicely when the video can't be read and there's no note", async () => {
    ctx = setup(false);
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    const started = await request(ctx.app).post("/checks").set(auth).send({ shared: "https://www.instagram.com/reel/x/" });
    await ctx.waitForIdle();
    const check = await request(ctx.app).get(`/checks/${started.body.id}`).set(auth);
    expect(check.body.status).toBe("failed");
    expect(check.body.error).toMatch(/note/);
    // Failed checks don't use up the allowance.
    expect((await request(ctx.app).get("/me").set(auth)).body.usage.checksThisMonth).toBe(0);
  });

  it("keeps users' checks private from each other", async () => {
    const a = await signup(ctx.app, "a@example.com");
    const b = await signup(ctx.app, "b@example.com");
    const started = await request(ctx.app).post("/checks").set({ Authorization: `Bearer ${a.token}` }).send({ shared: "https://youtu.be/a" });
    await ctx.waitForIdle();
    expect((await request(ctx.app).get(`/checks/${started.body.id}`).set({ Authorization: `Bearer ${b.token}` })).status).toBe(404);
  });

  it("gates doctor reports to Pro", async () => {
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    const started = await request(ctx.app).post("/checks").set(auth).send({ shared: "https://youtu.be/a" });
    await ctx.waitForIdle();
    expect((await request(ctx.app).get(`/checks/${started.body.id}/doctor-report`).set(auth)).status).toBe(403);
    await request(ctx.app).post("/billing/dev/activate").set(auth).send({ tier: "pro" });
    const report = await request(ctx.app).get(`/checks/${started.body.id}/doctor-report`).set(auth).expect(200);
    expect(report.text).toContain("Mostly accurate (80/100)");
  });

  it("exports and deletes all of a user's data", async () => {
    const { token } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    await request(ctx.app).post("/me/consent").set(auth).send({ version: CONSENT_VERSION, accepted: true });
    await request(ctx.app).post("/profiles").set(auth).send(profile);
    await request(ctx.app).post("/checks").set(auth).send({ shared: "https://youtu.be/a" });
    await ctx.waitForIdle();

    const exported = await request(ctx.app).get("/me/export").set(auth).expect(200);
    expect(exported.body.profiles[0].conditions).toEqual(["asthma"]);
    expect(exported.body.checks).toHaveLength(1);

    await request(ctx.app).delete("/me").set(auth).expect(204);
    for (const table of ["users", "profiles", "checks", "sessions"]) {
      expect((ctx.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n).toBe(0);
    }
  });

  it("applies RevenueCat subscription events", async () => {
    const { token, userId } = await signup(ctx.app);
    const auth = { Authorization: `Bearer ${token}` };
    const event = (type: string, product_id = "sift_plus_monthly") => ({
      event: { type, app_user_id: userId, product_id, expiration_at_ms: Date.now() + 86_400_000 },
    });

    expect((await request(ctx.app).post("/billing/revenuecat/webhook").send(event("INITIAL_PURCHASE"))).status).toBe(401);

    const hook = (body: object) =>
      request(ctx.app).post("/billing/revenuecat/webhook").set({ Authorization: "Bearer rc-secret" }).send(body).expect(200);
    await hook(event("INITIAL_PURCHASE"));
    expect((await request(ctx.app).get("/me").set(auth)).body.tier.id).toBe("plus");
    await hook(event("CANCELLATION"));
    expect((await request(ctx.app).get("/me").set(auth)).body.tier.id).toBe("plus");
    await hook(event("EXPIRATION"));
    expect((await request(ctx.app).get("/me").set(auth)).body.tier.id).toBe("free");
  });
});
