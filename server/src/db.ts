import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type DB = DatabaseSync;

export function openDatabase(path: string): DB {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
}

function migrate(db: DB) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      tier TEXT NOT NULL DEFAULT 'free',
      tier_expires_at INTEGER,
      health_consent_at INTEGER,
      health_consent_version TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    -- Health profiles. Pro accounts can have several (family members).
    -- Everything medical lives in data_enc, encrypted with HEALTH_DATA_KEY.
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data_enc TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Results can contain personal health advice, so they are encrypted too.
    CREATE TABLE IF NOT EXISTS checks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
      url TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      result_enc TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS checks_user_created ON checks(user_id, created_at);
  `);
}
