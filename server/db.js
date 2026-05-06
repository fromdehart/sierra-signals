import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../data/sierra.db");

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return _db;
}

// ---------- Accounts ----------

export function dbLoadAllAccounts() {
  return getDb().prepare("SELECT data FROM accounts ORDER BY updated_at DESC").all()
    .map(r => JSON.parse(r.data));
}

export function dbSaveAccount(acct) {
  getDb().prepare(
    "INSERT INTO accounts (id, data, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at"
  ).run(acct.id, JSON.stringify(acct));
}

export function dbDeleteAccount(id) {
  getDb().prepare("DELETE FROM accounts WHERE id = ?").run(id);
}

// ---------- Settings ----------

export function dbLoadSettings() {
  const rows = getDb().prepare("SELECT key, value FROM settings").all();
  const out = {};
  rows.forEach(r => { out[r.key] = JSON.parse(r.value); });
  return out;
}

export function dbSaveSetting(key, value) {
  getDb().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).run(key, JSON.stringify(value));
}
