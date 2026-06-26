/**
 * DuckDB-WASM in-memory analytics engine for the renderer process.
 *
 * Provides SQL queries over CSV, JSON, and Parquet files without
 * importing them into SQLite first. Results can be exported as
 * fixture-compatible JSON for XCON data binding.
 *
 * Usage:
 *   const engine = await createDuckDBEngine();
 *   const result = await engine.query("SELECT region, SUM(revenue) FROM 'sales.csv' GROUP BY region");
 *   const fixture = engine.toFixture(result);
 *   engine.close();
 */

import * as duckdb from '@duckdb/duckdb-wasm';

export interface DuckDBQueryResult {
  columns: string[];
  types: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

export interface DuckDBEngine {
  query(sql: string): Promise<DuckDBQueryResult>;
  toFixture(result: DuckDBQueryResult): Record<string, unknown>;
  registerFileBuffer(name: string, buffer: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

let sharedDb: duckdb.AsyncDuckDB | null = null;
let sharedConn: duckdb.AsyncDuckDBConnection | null = null;

async function initDuckDB(): Promise<{ db: duckdb.AsyncDuckDB; conn: duckdb.AsyncDuckDBConnection }> {
  if (sharedDb && sharedConn) return { db: sharedDb, conn: sharedConn };

  const DUCKDB_BUNDLES = await duckdb.selectBundle({
    mvp: {
      mainModule: new URL('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm', import.meta.url).href,
      mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js', import.meta.url).href,
    },
    eh: {
      mainModule: new URL('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm', import.meta.url).href,
      mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).href,
    },
  });

  const logger = new duckdb.ConsoleLogger();
  const worker = new Worker(DUCKDB_BUNDLES.mainWorker!);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(DUCKDB_BUNDLES.mainModule);
  const conn = await db.connect();

  sharedDb = db;
  sharedConn = conn;
  return { db, conn };
}

export async function createDuckDBEngine(): Promise<DuckDBEngine> {
  const { db, conn } = await initDuckDB();

  return {
    async query(sql: string): Promise<DuckDBQueryResult> {
      const startedAt = performance.now();
      const result = await conn.query(sql);
      const durationMs = Math.round(performance.now() - startedAt);

      const schema = result.schema;
      const columns = schema.fields.map((f) => f.name);
      const types = schema.fields.map((f) => String(f.type));
      const rows: Record<string, unknown>[] = [];

      for (let i = 0; i < result.numRows; i++) {
        const row: Record<string, unknown> = {};
        for (const col of columns) {
          const value = result.getChildAt(columns.indexOf(col))?.get(i);
          row[col] = value instanceof BigInt ? Number(value) : value;
        }
        rows.push(row);
      }

      return { columns, types, rows, rowCount: result.numRows, durationMs };
    },

    toFixture(result: DuckDBQueryResult): Record<string, unknown> {
      return {
        columns: result.columns,
        data: result.rows,
        rowCount: result.rowCount,
        queryDurationMs: result.durationMs,
      };
    },

    async registerFileBuffer(name: string, buffer: Uint8Array): Promise<void> {
      await db.registerFileBuffer(name, buffer);
    },

    async close(): Promise<void> {
      if (sharedConn) {
        await sharedConn.close();
        sharedConn = null;
      }
      if (sharedDb) {
        await sharedDb.terminate();
        sharedDb = null;
      }
    },
  };
}
