// src/extensions/SqlitePluginStateStore.ts
import { openDatabase } from "../db/database.js";
import { runStartupImports } from "../db/startupImports.js";
import { resolve, relative, isAbsolute } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { PluginStateRecord } from "./types.js";
import { readPluginManifest } from "./plugins.js";

/**
 * Mirror of plugins.ts:119 — store relative when inside the workspace.
 * Returns the relative path (forward-slash normalised), or "." if the resolved
 * path equals the workspace root. Plugin callers validate workspace boundaries
 * before records are stored, so paths outside the workspace are not persisted.
 */
function toWorkspaceRelativePath(workspaceRoot: string, path: string): string {
  // Mirrors resolveWorkspacePath: if the path is relative, resolve it against
  // workspaceRoot first (not cwd) so "plugins/reverse" → "<workspaceRoot>/plugins/reverse".
  const absPath = isAbsolute(path) ? resolve(path) : resolve(workspaceRoot, path);
  const relativePath = relative(resolve(workspaceRoot), absPath).replace(/\\/g, "/");
  return relativePath || ".";
}

type PluginRow = {
  path: string;
  name: string | null;
  enabled: number;
  installed_at: string;
  updated_at: string;
};

export class SqlitePluginStateStore {
  private readonly db: DatabaseSync;
  private readonly ready: Promise<void>;
  private readonly now: () => Date;

  constructor(private readonly options: { xenesisHome: string; workspaceRoot: string; now?: () => Date }) {
    this.db = openDatabase(options.xenesisHome);
    this.ready = runStartupImports(options.xenesisHome);
    this.now = options.now ?? (() => new Date());
  }

  private rowToRecord(row: PluginRow): PluginStateRecord {
    return {
      path: row.path,
      ...(row.name !== null && row.name !== undefined ? { name: row.name } : {}),
      enabled: row.enabled === 1,
      installedAt: row.installed_at,
      updatedAt: row.updated_at,
    };
  }

  private getRow(rel: string): PluginRow | undefined {
    return this.db
      .prepare("SELECT path, name, enabled, installed_at, updated_at FROM plugins WHERE path = ?")
      .get(rel) as PluginRow | undefined;
  }

  /**
   * Install (or reinstall) a plugin.
   * Preserve legacy install semantics:
   *   - new record: enabled=true, installedAt=now, name=null (manifest not read here)
   *   - existing record: enabled is reset to true (File store always enables on reinstall),
   *     installedAt is preserved, updatedAt is refreshed, name preserved from existing row.
   * NOTE: The plan's install preserves `enabled` on reinstall; legacy behavior always
   * re-enabled on reinstall, and this store preserves that runtime contract.
   */
  async install(path: string): Promise<PluginStateRecord> {
    await this.ready;
    const rel = toWorkspaceRelativePath(this.options.workspaceRoot, path);
    const absPath = isAbsolute(path) ? resolve(path) : resolve(this.options.workspaceRoot, path);
    const manifest = await readPluginManifest(absPath);
    const ts = this.now().toISOString();
    const existing = this.getRow(rel);
    const installedAt = existing?.installed_at ?? ts;

    this.db
      .prepare(
        `INSERT INTO plugins (path, name, enabled, installed_at, updated_at, rev)
         VALUES (?, ?, 1, ?, ?, 1)
         ON CONFLICT(path) DO UPDATE SET
           name = excluded.name,
           enabled = 1,
           installed_at = excluded.installed_at,
           updated_at = excluded.updated_at,
           rev = plugins.rev + 1`
      )
      .run(rel, manifest.name ?? null, installedAt, ts);

    return this.rowToRecord(this.getRow(rel)!);
  }

  /**
   * Re-stamp updated_at (and refresh name from manifest if provided by caller).
   * Re-stamp updated_at and refresh name from manifest; throws if not installed.
   */
  async update(path: string): Promise<PluginStateRecord> {
    await this.ready;
    const rel = toWorkspaceRelativePath(this.options.workspaceRoot, path);
    const absPath = isAbsolute(path) ? resolve(path) : resolve(this.options.workspaceRoot, path);
    const manifest = await readPluginManifest(absPath);
    const ts = this.now().toISOString();
    const existing = this.getRow(rel);
    if (!existing) throw new Error(`Plugin is not installed: ${rel}`);

    this.db
      .prepare("UPDATE plugins SET name = ?, updated_at = ?, rev = rev + 1 WHERE path = ?")
      .run(manifest.name ?? null, ts, rel);

    return this.rowToRecord(this.getRow(rel)!);
  }

  /**
   * Remove a plugin record.
   * Remove a plugin record; throws if not installed.
   */
  async uninstall(path: string): Promise<PluginStateRecord> {
    await this.ready;
    const rel = toWorkspaceRelativePath(this.options.workspaceRoot, path);
    const existing = this.getRow(rel);
    if (!existing) throw new Error(`Plugin is not installed: ${rel}`);

    this.db.prepare("DELETE FROM plugins WHERE path = ?").run(rel);
    return this.rowToRecord(existing);
  }

  async enable(path: string): Promise<PluginStateRecord> {
    return this.setEnabled(path, true);
  }

  async disable(path: string): Promise<PluginStateRecord> {
    return this.setEnabled(path, false);
  }

  /**
   * Preserve legacy setEnabled semantics: throws if plugin is not installed.
   */
  private async setEnabled(path: string, enabled: boolean): Promise<PluginStateRecord> {
    await this.ready;
    const rel = toWorkspaceRelativePath(this.options.workspaceRoot, path);
    const ts = this.now().toISOString();
    const existing = this.getRow(rel);
    if (!existing) throw new Error(`Plugin is not installed: ${rel}`);

    this.db
      .prepare("UPDATE plugins SET enabled = ?, updated_at = ?, rev = rev + 1 WHERE path = ?")
      .run(enabled ? 1 : 0, ts, rel);

    return this.rowToRecord(this.getRow(rel)!);
  }

  /** Returns all plugin records sorted by path. */
  async list(): Promise<PluginStateRecord[]> {
    await this.ready;
    const rows = this.db
      .prepare("SELECT path, name, enabled, installed_at, updated_at FROM plugins ORDER BY path")
      .all() as PluginRow[];
    return rows.map((r) => this.rowToRecord(r));
  }

  /** Returns workspace-relative paths of enabled plugins. */
  async enabledPaths(): Promise<string[]> {
    await this.ready;
    const rows = this.db
      .prepare("SELECT path FROM plugins WHERE enabled = 1 ORDER BY path")
      .all() as { path: string }[];
    return rows.map((r) => r.path);
  }
}
