import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { openDatabase } from "../../db/database.js";
import { runStartupImports } from "../../db/startupImports.js";
import type { OracleObservation } from "./GoldenReplay.js";

interface ChannelSessionRow {
  key: string;
  session_id: string;
  updated_at: string | null;
  rev: number;
}

async function readJsonIfExists(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function sourceKeys(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }
  return Object.keys(parsed).sort();
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Expected channel_sessions.${field} to be a string`);
  }
  return value;
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number") {
    throw new Error(`Expected channel_sessions.${field} to be a number`);
  }
  return value;
}

export async function collectLegacySessionMigrationObservation(xenesisHome: string): Promise<OracleObservation> {
  const legacyPath = join(xenesisHome, "channel_sessions.json");
  const migratedPath = `${legacyPath}.migrated`;

  await runStartupImports(xenesisHome);

  const db = openDatabase(xenesisHome);
  const rawRows = db.prepare(
    `SELECT key, session_id, updated_at, rev
     FROM channel_sessions
     ORDER BY key ASC`
  ).all();
  const rows: ChannelSessionRow[] = rawRows.map((row) => ({
    key: requiredString(row.key, "key"),
    session_id: requiredString(row.session_id, "session_id"),
    updated_at: row.updated_at === null ? null : requiredString(row.updated_at, "updated_at"),
    rev: requiredNumber(row.rev, "rev")
  }));
  const source = await readJsonIfExists(migratedPath) ?? await readJsonIfExists(legacyPath);
  const allSourceKeys = sourceKeys(source);
  const importedKeys = new Set(rows.map((row) => row.key));
  const rowKeys = rows.map((row) => row.key);

  return {
    ledgerEntries: [
      {
        type: "legacy_channel_session_migration",
        sourceKeys: allSourceKeys,
        ignoredKeys: allSourceKeys.filter((key) => !importedKeys.has(key)),
        rows: rows.map((row) => ({
          key: row.key,
          sessionId: row.session_id,
          rev: row.rev,
          updatedAtPresent: typeof row.updated_at === "string" && row.updated_at.length > 0
        })),
        migrated: existsSync(migratedPath),
        legacyFilePresent: existsSync(legacyPath),
        stableRowOrder: rowKeys.every((key, index) => index === 0 || rowKeys[index - 1]! <= key)
      }
    ],
    finalStatus: "legacy_session_migration_ready",
    visibleResult: "legacy channel_sessions.json string and object values migrate into SQLite channel_sessions, invalid entries are ignored, and the legacy file is marked migrated"
  };
}
