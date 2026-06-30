// src/db/startupImports.ts
// One-shot legacy JSON → SQLite migration.  Called once at runtime boot
// (AgentRuntimeFactory / gateway / cli).  All imports are idempotent:
// if the table already contains rows the import is skipped and the old
// JSON is left in place; only on a successful import is it renamed to
// *.migrated.

import { join, resolve } from 'node:path';
import { openDatabase } from './database.js';
import { importLegacyArray, importLegacyMap } from './importLegacyJson.js';

const ran = new Set<string>();

function key(xenesisHome: string, memoryPath: string) {
  const normalized = `${resolve(xenesisHome)}\0${resolve(memoryPath)}`.replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

/**
 * Run all legacy-JSON → SQLite imports once per xenesisHome per process.
 * `memoryPath` is the configured memory.path (may be absolute or relative to xenesisHome).
 */
export async function runStartupImports(xenesisHome: string, opts: { memoryPath?: string } = {}): Promise<void> {
  const memoryPath = opts.memoryPath ?? join(xenesisHome, 'memory.json');
  const k = key(xenesisHome, memoryPath);
  if (ran.has(k)) return;
  ran.add(k);
  try {
    const db = openDatabase(xenesisHome);

    // agent_tasks: array of AgentTask objects
    await importLegacyArray<Record<string, unknown>>(db, {
      table: 'agent_tasks',
      jsonPath: join(xenesisHome, 'agent_tasks.json'),
      toRecord: (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const r = raw as Record<string, unknown>;
        if (typeof r.id !== 'string' || typeof r.prompt !== 'string') return null;
        return r as Record<string, unknown>;
      },
      insertAll: (records) => {
        const stmt = db.prepare(
          `INSERT OR IGNORE INTO agent_tasks
           (id, status, source, handoff_id, parent_session_id, schedule_id,
            priority, handoff_order, created_at, updated_at, rev, data)
         VALUES (?,?,?,?,?,?,?,?,?,?,0,?)`,
        );
        const fallbackTs = new Date().toISOString();
        for (const r of records) {
          stmt.run(
            r.id as string,
            (r.status as string) ?? 'queued',
            (r.source as string) ?? null,
            (r.handoffId as string) ?? null,
            (r.parentSessionId as string) ?? null,
            (r.scheduleId as string) ?? null,
            (r.priority as number) ?? 0,
            (r.handoffOrder as number) ?? null,
            (r.createdAt as string) ?? fallbackTs,
            (r.updatedAt as string) ?? fallbackTs,
            JSON.stringify(r),
          );
        }
      },
    });

    // schedules: array of TaskSchedule objects
    await importLegacyArray<Record<string, unknown>>(db, {
      table: 'schedules',
      jsonPath: join(xenesisHome, 'schedules.json'),
      toRecord: (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const r = raw as Record<string, unknown>;
        if (typeof r.id !== 'string') return null;
        return r;
      },
      insertAll: (records) => {
        const stmt = db.prepare(
          `INSERT OR IGNORE INTO schedules
           (id, enabled, kind, created_at, updated_at, rev, data)
         VALUES (?,?,?,?,?,0,?)`,
        );
        const fallbackTs = new Date().toISOString();
        for (const r of records) {
          const trigger = r.trigger as Record<string, unknown> | undefined;
          stmt.run(
            r.id as string,
            r.enabled ? 1 : 0,
            (trigger?.type as string) ?? null,
            (r.createdAt as string) ?? fallbackTs,
            (r.updatedAt as string) ?? fallbackTs,
            JSON.stringify(r),
          );
        }
      },
    });

    // subagent_tasks: array of SubagentTask objects
    await importLegacyArray<Record<string, unknown>>(db, {
      table: 'subagent_tasks',
      jsonPath: join(xenesisHome, 'tasks.json'),
      toRecord: (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const r = raw as Record<string, unknown>;
        if (typeof r.id !== 'string') return null;
        return r;
      },
      insertAll: (records) => {
        const stmt = db.prepare(
          `INSERT OR IGNORE INTO subagent_tasks
           (id, status, subagent, created_at, updated_at, rev, data)
         VALUES (?,?,?,?,?,0,?)`,
        );
        const fallbackTs = new Date().toISOString();
        for (const r of records) {
          stmt.run(
            r.id as string,
            (r.status as string) ?? 'queued',
            (r.subagent as string) ?? null,
            (r.createdAt as string) ?? fallbackTs,
            (r.updatedAt as string) ?? fallbackTs,
            JSON.stringify(r),
          );
        }
      },
    });

    // channel_sessions: map of { key -> sessionId }
    await importLegacyMap<{ key: string; sessionId: string }>(db, {
      table: 'channel_sessions',
      jsonPath: join(xenesisHome, 'channel_sessions.json'),
      entries: (parsed) => {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
        return Object.entries(parsed as Record<string, unknown>).flatMap(([key, value]) => {
          if (typeof value === 'string') return [{ key, sessionId: value }];
          if (value && typeof value === 'object' && typeof (value as { sessionId?: unknown }).sessionId === 'string') {
            return [{ key, sessionId: (value as { sessionId: string }).sessionId }];
          }
          return [];
        });
      },
      insertAll: (records) => {
        const stmt = db.prepare(
          `INSERT OR IGNORE INTO channel_sessions (key, session_id, updated_at, rev)
         VALUES (?,?,?,0)`,
        );
        const ts = new Date().toISOString();
        for (const r of records) {
          stmt.run(r.key, r.sessionId, ts);
        }
      },
    });

    // plugins: array of PluginStateRecord
    await importLegacyArray<Record<string, unknown>>(db, {
      table: 'plugins',
      jsonPath: join(xenesisHome, 'plugins.json'),
      toRecord: (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const r = raw as Record<string, unknown>;
        if (typeof r.path !== 'string') return null;
        return r;
      },
      insertAll: (records) => {
        const stmt = db.prepare(
          `INSERT OR IGNORE INTO plugins
           (path, name, enabled, installed_at, updated_at, rev)
         VALUES (?,?,?,?,?,0)`,
        );
        for (const r of records) {
          stmt.run(
            r.path as string,
            (r.name as string) ?? null,
            r.enabled ? 1 : 0,
            (r.installedAt as string) ?? new Date().toISOString(),
            (r.updatedAt as string) ?? new Date().toISOString(),
          );
        }
      },
    });

    // memory: array of MemoryRecord — path may be custom (config-driven)
    await importLegacyArray<Record<string, unknown>>(db, {
      table: 'memory',
      jsonPath: memoryPath,
      toRecord: (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const r = raw as Record<string, unknown>;
        if (typeof r.id !== 'string') return null;
        return r;
      },
      insertAll: (records) => {
        const stmt = db.prepare(
          `INSERT OR IGNORE INTO memory
           (id, priority, updated_at, rev, data)
         VALUES (?,?,?,0,?)`,
        );
        for (const r of records) {
          stmt.run(
            r.id as string,
            (r.priority as number) ?? 0,
            (r.updatedAt as string) ?? new Date().toISOString(),
            JSON.stringify(r),
          );
        }
      },
    });
  } catch (error) {
    ran.delete(k);
    throw error;
  }
}
