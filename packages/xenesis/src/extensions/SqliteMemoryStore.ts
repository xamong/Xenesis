// src/extensions/SqliteMemoryStore.ts
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../db/database.js';
import { runStartupImports } from '../db/startupImports.js';
import { TableStore } from '../db/tableStore.js';
import type { Embedder } from './embedding.js';
import { semanticSearch } from './embedding.js';
import { rankRecords } from './memory.js';
import type { MemoryInput, MemoryRecord, MemoryStore } from './types.js';

const DEFAULT_MAX_RECORDS = 500;
const DEFAULT_MIN_SCORE = 0.25;

export class SqliteMemoryStore implements MemoryStore {
  private readonly db: DatabaseSync;
  private readonly table: TableStore<MemoryRecord>;
  private readonly ready: Promise<void>;
  private readonly now: () => Date;
  private readonly maxRecords: number;
  private readonly embedder?: Embedder;
  private readonly minScore: number;
  constructor(options: {
    xenesisHome: string;
    memoryPath?: string;
    now?: () => Date;
    maxRecords?: number;
    embedder?: Embedder;
    minScore?: number;
  }) {
    this.now = options.now ?? (() => new Date());
    this.maxRecords = options.maxRecords ?? DEFAULT_MAX_RECORDS;
    this.embedder = options.embedder;
    this.minScore = options.minScore ?? DEFAULT_MIN_SCORE;
    this.db = openDatabase(options.xenesisHome);
    this.table = new TableStore<MemoryRecord>(this.db, {
      table: 'memory',
      id: (r) => r.id,
      indexColumns: ['priority', 'updated_at'],
      derive: (r) => ({ priority: r.priority ?? 0, updated_at: r.updatedAt }),
    });
    this.ready = runStartupImports(options.xenesisHome, { memoryPath: options.memoryPath });
    // Lazy background backfill: embed pre-existing rows whose `embedding IS NULL` (e.g. rows imported
    // before an embedder was configured). Best-effort and non-blocking — never awaited by the
    // constructor or by search; until a row is embedded it scores via the keyword fallback.
    if (this.embedder) void this.backfill();
  }
  // Embed NULL-embedding rows in batched setImmediate ticks. Each row is wrapped in try/catch so a
  // failure leaves that row on the keyword fallback (never throws out of the background task).
  //
  // Termination guarantee: we page forward by a strictly-increasing `id` cursor (`id > ?` ORDER BY id)
  // rather than re-selecting every `embedding IS NULL` row each batch. A row whose embed() throws is
  // left NULL (keyword fallback) but the cursor has already advanced past its id, so a failing row is
  // attempted at most once per process and can never be re-fetched in a tight loop. Without this, a
  // future network embedder that throws on some rows would spin `SELECT ... WHERE embedding IS NULL`
  // on the same rows forever (a permanent background CPU drain). One forward pass is O(rows).
  private async backfill(): Promise<void> {
    const embedder = this.embedder;
    if (!embedder) return;
    try {
      await this.ready;
    } catch {
      return;
    }
    let cursor = ''; // every row id satisfies `id > ''`, so the first page starts at the lowest id
    for (;;) {
      let rows: Array<{ id: string; data: string }>;
      try {
        rows = this.db
          .prepare('SELECT id, data FROM memory WHERE embedding IS NULL AND id > ? ORDER BY id LIMIT 50')
          .all(cursor) as Array<{ id: string; data: string }>;
      } catch {
        return;
      }
      if (rows.length === 0) return;
      // Advance the cursor past this page up front; failed rows below the cursor are never re-selected.
      cursor = rows[rows.length - 1]!.id;
      for (const row of rows) {
        try {
          const record = JSON.parse(row.data) as MemoryRecord;
          const text = typeof record.text === 'string' ? record.text : '';
          const vec = await embedder.embed(text);
          this.db
            .prepare('UPDATE memory SET embedding = ? WHERE id = ?')
            .run(Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength), row.id);
        } catch {
          // swallow: this row stays on the keyword fallback. The cursor has moved past it, so it is
          // not retried this process — no infinite re-selection of a persistently failing row.
        }
      }
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }
  async upsert(input: MemoryInput): Promise<MemoryRecord> {
    await this.ready;
    const record: MemoryRecord = {
      id: input.id,
      text: input.text,
      tags: input.tags ?? [],
      source: input.source,
      priority: input.priority,
      updatedAt: this.now().toISOString(),
    };
    this.table.upsert(record);
    // Embedding lives in its own BLOB column (TableStore only writes the JSON `data` + index cols),
    // so persist it with a supplementary UPDATE after the row exists.
    if (this.embedder) {
      const vec = await this.embedder.embed(record.text);
      this.db
        .prepare('UPDATE memory SET embedding = ? WHERE id = ?')
        .run(Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength), record.id);
      record.embedding = vec;
    }
    this.prune();
    return record;
  }
  async remove(id: string): Promise<void> {
    await this.ready;
    const deleted = this.table.delete(id);
    if (!deleted) throw new Error(`Memory record not found: ${id}`);
  }
  async list(): Promise<MemoryRecord[]> {
    await this.ready;
    return this.table.list();
  }
  async search(query: string): Promise<MemoryRecord[]> {
    const records = await this.list();
    if (!this.embedder) return rankRecords(records, query);
    // list() yields records WITHOUT embeddings (TableStore reads only the JSON `data`); join the
    // BLOB column back on so cosine-scored rows score by vector and unembedded rows fall back to keyword.
    const embeddings = this.loadEmbeddings();
    const withEmbeddings = records.map((r) => {
      const vec = embeddings.get(r.id);
      return vec ? { ...r, embedding: vec } : r;
    });
    return semanticSearch(withEmbeddings, query, this.embedder, this.minScore);
  }
  private loadEmbeddings(): Map<string, Float32Array> {
    const rows = this.db.prepare('SELECT id, embedding FROM memory WHERE embedding IS NOT NULL').all() as Array<{
      id: string;
      embedding: Uint8Array;
    }>;
    const map = new Map<string, Float32Array>();
    for (const row of rows) {
      const buf = row.embedding;
      if (!buf || buf.byteLength < 4) continue;
      map.set(row.id, new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4)));
    }
    return map;
  }
  // Preserve legacy pruning semantics: evict lowest priority, then oldest.
  private prune(): void {
    const all = this.table.list();
    if (all.length <= this.maxRecords) return;
    const victims = [...all]
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || Date.parse(a.updatedAt) - Date.parse(b.updatedAt))
      .slice(0, all.length - this.maxRecords);
    for (const v of victims) this.table.delete(v.id);
  }
}
