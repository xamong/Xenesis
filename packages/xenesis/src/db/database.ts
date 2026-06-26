// src/db/database.ts
// Warning suppression must be patched before node:sqlite is loaded. A static ESM
// import would be evaluated before this module body, so load SQLite after patching.
{
  const original = process.emitWarning.bind(process);
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const name = typeof warning === "string" ? (rest[0] as string | { type?: string }) : warning?.name;
    const text = typeof warning === "string" ? warning : warning?.message ?? "";
    const type = typeof name === "object" ? (name as { type?: string })?.type : name;
    if ((type === "ExperimentalWarning" || /experimental/i.test(String(type ?? ""))) && /sqlite/i.test(text)) return;
    return (original as (...a: unknown[]) => void)(warning as never, ...(rest as never[]));
  }) as typeof process.emitWarning;
}

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { runMigrations } from "./migrations.js";

const require = createRequire(import.meta.url);
const { DatabaseSync: SqliteDatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

const connections = new Map<string, DatabaseSync>();
const DB_INIT_RETRY_DELAYS_MS = [25, 50, 100, 200, 400];

function connectionKey(xenesisHome: string) {
  const r = resolve(xenesisHome);
  return process.platform === "win32" ? r.toLowerCase() : r;
}

export function databaseFilePath(xenesisHome: string) {
  return resolve(xenesisHome, "xenesis.db");
}

export function openDatabase(xenesisHome: string): DatabaseSync {
  const key = connectionKey(xenesisHome);
  const existing = connections.get(key);
  if (existing) return existing;
  mkdirSync(resolve(xenesisHome), { recursive: true });
  const db = new SqliteDatabaseSync(databaseFilePath(xenesisHome));
  execWithTransientRetry(db, "PRAGMA busy_timeout = 5000;");
  execWithTransientRetry(db, "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
  runMigrations(db);
  connections.set(key, db);
  return db;
}

export function closeAllDatabases() {
  for (const db of connections.values()) {
    try { db.close(); } catch { /* ignore */ }
  }
  connections.clear();
}

function execWithTransientRetry(db: DatabaseSync, sql: string) {
  for (let attempt = 0; attempt <= DB_INIT_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      db.exec(sql);
      return;
    } catch (error) {
      if (attempt === DB_INIT_RETRY_DELAYS_MS.length || !isTransientSqliteInitError(error)) {
        throw error;
      }
      sleepSync(DB_INIT_RETRY_DELAYS_MS[attempt]);
    }
  }
}

function isTransientSqliteInitError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const details = [
    error.message,
    (error as { code?: unknown }).code,
    (error as { errstr?: unknown }).errstr,
    (error as { errcode?: unknown }).errcode
  ].map(String).join(" ");
  return /\b(SQLITE_BUSY|SQLITE_LOCKED|ERR_SQLITE_ERROR)\b/i.test(details)
    || /database is locked|disk I\/O error|resource busy/i.test(details);
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
