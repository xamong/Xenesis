// src/db/tableStore.ts
import type { DatabaseSync } from "node:sqlite";

export interface TableSpec<T> {
  table: string;
  id: (record: T) => string;
  indexColumns: string[];
  derive: (record: T) => Record<string, string | number | null>;
}

const MAX_OPTIMISTIC_RETRIES = 8;

export class TableStore<T> {
  constructor(private readonly db: DatabaseSync, private readonly spec: TableSpec<T>) {}

  private idColumn() { return this.spec.table === "channel_sessions" ? "key" : (this.spec.table === "plugins" ? "path" : (["plan_sessions","worktree_sessions","team_sessions"].includes(this.spec.table) ? "session_id" : (this.spec.table === "teams" ? "team_name" : "id"))); }

  get(id: string): T | undefined {
    const row = this.db.prepare(`SELECT data FROM ${this.spec.table} WHERE ${this.idColumn()} = ?`).get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : undefined;
  }

  list(where?: string, params: (string | number | null)[] = []): T[] {
    const sql = `SELECT data FROM ${this.spec.table}${where ? ` WHERE ${where}` : ""}`;
    const rows = this.db.prepare(sql).all(...params) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  private columnsAndValues(record: T) {
    const cols = ["rev", "data", ...this.spec.indexColumns];
    const derived = this.spec.derive(record);
    const values: (string | number | null)[] = [0, JSON.stringify(record), ...this.spec.indexColumns.map((c) => derived[c] ?? null)];
    return { cols: [this.idColumn(), ...cols], values: [this.spec.id(record), ...values] };
  }

  insert(record: T): void {
    const { cols, values } = this.columnsAndValues(record);
    const placeholders = cols.map(() => "?").join(", ");
    this.db.prepare(`INSERT INTO ${this.spec.table} (${cols.join(", ")}) VALUES (${placeholders})`).run(...values);
  }

  upsert(record: T): void {
    const { cols, values } = this.columnsAndValues(record);
    const placeholders = cols.map(() => "?").join(", ");
    const updates = cols.filter((c) => c !== this.idColumn() && c !== "rev").map((c) => `${c}=excluded.${c}`).concat("rev=" + this.spec.table + ".rev+1").join(", ");
    this.db.prepare(`INSERT INTO ${this.spec.table} (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT(${this.idColumn()}) DO UPDATE SET ${updates}`).run(...values);
  }

  delete(id: string): boolean {
    const res = this.db.prepare(`DELETE FROM ${this.spec.table} WHERE ${this.idColumn()} = ?`).run(id);
    return Number(res.changes) > 0;
  }

  updateOptimistic(id: string, mutate: (current: T) => T): T {
    for (let attempt = 0; attempt < MAX_OPTIMISTIC_RETRIES; attempt++) {
      const row = this.db.prepare(`SELECT data, rev FROM ${this.spec.table} WHERE ${this.idColumn()} = ?`).get(id) as { data: string; rev: number } | undefined;
      if (!row) throw new Error(`Record not found: ${id}`);
      const next = mutate(JSON.parse(row.data) as T);
      const derived = this.spec.derive(next);
      const setCols = ["data = ?", "rev = rev + 1", ...this.spec.indexColumns.map((c) => `${c} = ?`)];
      const setVals: (string | number | null)[] = [JSON.stringify(next), ...this.spec.indexColumns.map((c) => derived[c] ?? null)];
      const res = this.db.prepare(`UPDATE ${this.spec.table} SET ${setCols.join(", ")} WHERE ${this.idColumn()} = ? AND rev = ?`).run(...setVals, id, row.rev);
      if (Number(res.changes) > 0) return next;
      // rev changed under us → retry
    }
    throw new Error(`Optimistic update exhausted retries: ${id}`);
  }

  tx<R>(fn: () => R): R {
    this.db.exec("BEGIN IMMEDIATE");
    try { const r = fn(); this.db.exec("COMMIT"); return r; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
}
