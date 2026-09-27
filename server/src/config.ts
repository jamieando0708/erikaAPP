import { randomBytes } from "node:crypto";

export type BillingMode = "dev" | "revenuecat";

export interface Config {
  port: number;
  databasePath: string;
  /** 32-byte key used to encrypt health data at rest (AES-256-GCM). */
  healthDataKey: Buffer;
  billingMode: BillingMode;
  revenueCatWebhookSecret: string | null;
  ytDlpPath: string;
  claudeModel: string;
  /** Origins allowed to call the API from a browser (the web preview). Phones don't need this. */
  corsOrigins: string[];
  /** Fake AI results so the app can be tried without an API key. */
  demoMode: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === "production";

  let healthDataKey: Buffer;
  if (env.HEALTH_DATA_KEY) {
    healthDataKey = Buffer.from(env.HEALTH_DATA_KEY, "base64");
    if (healthDataKey.length !== 32) {
      throw new Error("HEALTH_DATA_KEY must be 32 bytes, base64 encoded");
    }
  } else if (production) {
    throw new Error("HEALTH_DATA_KEY is required in production");
  } else {
    // Dev only: a throwaway key means encrypted data is unreadable after a restart.
    console.warn("HEALTH_DATA_KEY not set - using a temporary key (dev only)");
    healthDataKey = randomBytes(32);
  }

  const billingMode = (env.BILLING_MODE ?? (production ? "revenuecat" : "dev")) as BillingMode;
  if (billingMode !== "dev" && billingMode !== "revenuecat") {
    throw new Error(`Unknown BILLING_MODE: ${billingMode}`);
  }
  if (billingMode === "dev" && production) {
    throw new Error("BILLING_MODE=dev is not allowed in production");
  }

  return {
    port: Number(env.PORT ?? 4000),
    databasePath: env.DATABASE_PATH ?? "./data/factfit.db",
    healthDataKey,
    billingMode,
    revenueCatWebhookSecret: env.REVENUECAT_WEBHOOK_SECRET ?? null,
    ytDlpPath: env.YTDLP_PATH ?? "yt-dlp",
    claudeModel: env.CLAUDE_MODEL ?? "claude-opus-5",
    corsOrigins: (env.CORS_ORIGINS ?? (production ? "" : "*")).split(",").map((o) => o.trim()).filter(Boolean),
    demoMode: env.DEMO_MODE === "1" && !production,
  };
}
