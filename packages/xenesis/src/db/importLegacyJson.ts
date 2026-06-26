// src/db/importLegacyJson.ts
import type { DatabaseSync } from "node:sqlite";
import { readFile, rename } from "node:fs/promises";

async function readJsonIfExists(path: string): Promise<unknown | undefined> {
  try { return JSON.parse(await readFile(path, "utf8")) as unknown; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}

async function backup(path: string) {
  try { await rename(path, `${path}.migrated`); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}

export async function importLegacyArray<T>(db: DatabaseSync, opts: {
  table: string; jsonPath: string; toRecord: (raw: unknown) => T | null; insertAll: (records: T[]) => void;
}): Promise<{ imported: number; skipped: boolean }> {
  const parsed = await readJsonIfExists(opts.jsonPath);
  const raws = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).records) ? (parsed as Record<string, unknown[]>).records : (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).plugins) ? (parsed as Record<string, unknown[]>).plugins : undefined));
  if (!raws) return { imported: 0, skipped: true };
  let imported = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    const count = (db.prepare(`SELECT COUNT(*) AS c FROM ${opts.table}`).get() as { c: number }).c;
    if (count === 0) {
      const records = raws.map(opts.toRecord).filter((r): r is T => r !== null);
      opts.insertAll(records);
      imported = records.length;
    }
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  await backup(opts.jsonPath);
  return { imported, skipped: imported === 0 };
}

export async function importLegacyMap<T>(db: DatabaseSync, opts: {
  table: string; jsonPath: string; entries: (parsed: unknown) => T[]; insertAll: (records: T[]) => void;
}): Promise<{ imported: number; skipped: boolean }> {
  const parsed = await readJsonIfExists(opts.jsonPath);
  if (parsed === undefined) return { imported: 0, skipped: true };
  let imported = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    const count = (db.prepare(`SELECT COUNT(*) AS c FROM ${opts.table}`).get() as { c: number }).c;
    if (count === 0) { const records = opts.entries(parsed); opts.insertAll(records); imported = records.length; }
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  await backup(opts.jsonPath);
  return { imported, skipped: imported === 0 };
}
