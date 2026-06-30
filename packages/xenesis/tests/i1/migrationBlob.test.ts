import { mkdtemp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/index.js';
import { openDatabase } from '../../src/db/database.js';
import { runMigrations } from '../../src/db/migrations.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

const require = createRequire(import.meta.url);
const { DatabaseSync: SqliteDatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');

/** The v1 `memory` schema, exactly as created by MIGRATIONS[0] (no `embedding` column). */
const V1_MEMORY_TABLE = `
  CREATE TABLE memory (
    id TEXT PRIMARY KEY, priority INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);
`;

function memoryColumns(db: DatabaseSync): string[] {
  return (db.prepare('PRAGMA table_info(memory)').all() as Array<{ name: string }>).map((c) => c.name);
}

describe('v4 embedding migration + BLOB round-trip', () => {
  it('(a) fresh DB: memory table has an embedding column and round-trips a Float32Array', async () => {
    const home = await mkdtemp(join(tmpdir(), 'i1-'));
    const db = openDatabase(home); // runs migrations to latest
    expect(memoryColumns(db).includes('embedding')).toBe(true);

    const vec = new Float32Array([0.1, -0.2, 0.3]);
    db.prepare('INSERT INTO memory (id, priority, updated_at, rev, data) VALUES (?,?,?,?,?)').run(
      'm1',
      0,
      '2026-01-01T00:00:00.000Z',
      0,
      JSON.stringify({ id: 'm1', text: 'x', tags: [], updatedAt: '2026-01-01T00:00:00.000Z' }),
    );
    db.prepare('UPDATE memory SET embedding = ? WHERE id = ?').run(Buffer.from(vec.buffer), 'm1');
    const row = db.prepare('SELECT embedding FROM memory WHERE id = ?').get('m1') as { embedding: Uint8Array };
    const back = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
    expect(Array.from(back)).toEqual(Array.from(vec));
  });

  it('(b) existing v3 DB with rows: migrating to v4 adds the column and existing rows get NULL', async () => {
    const home = await mkdtemp(join(tmpdir(), 'i1-'));
    const dbPath = resolve(home, 'xenesis-v3.db');
    // Build a database "stuck" at v3: create the v1 `memory` table, seed a row, stamp user_version = 3.
    // runMigrations should then apply ONLY the v4 ALTER (it starts from user_version).
    const db = new SqliteDatabaseSync(dbPath);
    db.exec(V1_MEMORY_TABLE);
    db.prepare('INSERT INTO memory (id, priority, updated_at, rev, data) VALUES (?,?,?,?,?)').run(
      'old-1',
      0,
      '2025-12-31T00:00:00.000Z',
      0,
      JSON.stringify({ id: 'old-1', text: 'legacy', tags: [], updatedAt: '2025-12-31T00:00:00.000Z' }),
    );
    db.exec('PRAGMA user_version = 3');

    // Pre-conditions: the column does not yet exist, the legacy row is present.
    expect(memoryColumns(db).includes('embedding')).toBe(false);
    expect((db.prepare('SELECT COUNT(*) AS n FROM memory').get() as { n: number }).n).toBe(1);

    runMigrations(db); // applies v4

    // The ALTER is nullable: the column now exists and the pre-existing row's embedding is NULL.
    expect(memoryColumns(db).includes('embedding')).toBe(true);
    const row = db.prepare('SELECT id, embedding FROM memory WHERE id = ?').get('old-1') as {
      id: string;
      embedding: unknown;
    };
    expect(row.id).toBe('old-1');
    expect(row.embedding).toBeNull();
    db.close();
  });
});

describe('config: extensions.memory.embedder parsing', () => {
  it('defaults to no embedder when the field is absent (zero-config parity)', async () => {
    const workspace = await createTempWorkspace('i1-cfg-');
    try {
      const config = await loadConfig({ cwd: workspace.root, env: {} });
      expect(config.extensions.memory.embedder).toBeUndefined();
    } finally {
      await workspace.cleanup();
    }
  });

  it('parses a deterministic embedder block with dimensions and minScore', async () => {
    const workspace = await createTempWorkspace('i1-cfg-');
    try {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(
        join(workspace.root, 'xenesis.config.json'),
        JSON.stringify({
          extensions: {
            memory: {
              enabled: true,
              path: '.xenesis/memory.json',
              embedder: { provider: 'deterministic', dimensions: 128, minScore: 0.25 },
            },
          },
        }),
      );
      const config = await loadConfig({ cwd: workspace.root, env: {} });
      expect(config.extensions.memory.embedder).toEqual({
        provider: 'deterministic',
        dimensions: 128,
        minScore: 0.25,
      });
    } finally {
      await workspace.cleanup();
    }
  });

  it('rejects an unknown embedder provider', async () => {
    const workspace = await createTempWorkspace('i1-cfg-');
    try {
      const { writeFile } = await import('node:fs/promises');
      await writeFile(
        join(workspace.root, 'xenesis.config.json'),
        JSON.stringify({
          extensions: { memory: { enabled: true, embedder: { provider: 'openai' } } },
        }),
      );
      await expect(loadConfig({ cwd: workspace.root, env: {} })).rejects.toThrow();
    } finally {
      await workspace.cleanup();
    }
  });
});
