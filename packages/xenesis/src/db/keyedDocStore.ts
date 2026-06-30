// src/db/keyedDocStore.ts
import type { DatabaseSync } from 'node:sqlite';

export class KeyedDocStore<T> {
  constructor(
    private readonly db: DatabaseSync,
    private readonly table: string,
    private readonly keyColumn: string,
    private readonly extraColumns: { name: string; value: (key: string, doc: T) => string | number | null }[] = [],
  ) {}
  get(key: string): T | undefined {
    const row = this.db.prepare(`SELECT data FROM ${this.table} WHERE ${this.keyColumn} = ?`).get(key) as
      | { data: string }
      | undefined;
    return row ? (JSON.parse(row.data) as T) : undefined;
  }
  set(key: string, doc: T): void {
    const cols = [this.keyColumn, 'data', ...this.extraColumns.map((c) => c.name), 'rev'];
    const placeholders = cols.map((c) => (c === 'rev' ? '1' : '?')).join(', ');
    const vals = [key, JSON.stringify(doc), ...this.extraColumns.map((c) => c.value(key, doc))];
    const updates = [
      'data=excluded.data',
      ...this.extraColumns.map((c) => `${c.name}=excluded.${c.name}`),
      `rev=${this.table}.rev+1`,
    ].join(', ');
    this.db
      .prepare(
        `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${this.keyColumn}) DO UPDATE SET ${updates}`,
      )
      .run(...vals);
  }
  delete(key: string): boolean {
    return Number(this.db.prepare(`DELETE FROM ${this.table} WHERE ${this.keyColumn} = ?`).run(key).changes) > 0;
  }
  all(): T[] {
    return (this.db.prepare(`SELECT data FROM ${this.table}`).all() as { data: string }[]).map(
      (r) => JSON.parse(r.data) as T,
    );
  }
}
