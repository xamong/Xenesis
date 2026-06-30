// src/sessions/SessionTranscriptIndexer.ts
// P5b-1: cross-session transcript indexer. Feeds session message text into the
// `session_messages` table (migration v4), whose AFTER INSERT triggers keep the
// FTS5 indexes (session_messages_fts / session_messages_trig) in sync.
//
// Best-effort by contract: indexSessionEvent NEVER throws into its caller. A run must
// not break because transcript indexing failed (a missing/older DB, a SQLite error, an
// unresolved xenesisHome). On failure we silently drop the index write.
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openDatabase } from '../db/database.js';
import { readSessionLog } from './history.js';

export type IndexableRole = 'user' | 'assistant' | 'tool';

export interface IndexSessionEventInput {
  sessionId: string;
  seq: number;
  role: IndexableRole;
  text: string;
  toolName?: string | undefined;
  createdAt: string;
}

/**
 * Insert one transcript message into `session_messages` (idempotent on the
 * UNIQUE(session_id, seq) constraint). The AFTER INSERT trigger mirrors it into the
 * FTS tables. Best-effort: errors are swallowed so indexing can never break a run.
 */
export function indexSessionEvent(xenesisHome: string, input: IndexSessionEventInput): void {
  const text = input.text.trim();
  if (!text) return; // skip empty transcript text (nothing to search)
  try {
    const db = openDatabase(xenesisHome);
    db.prepare(
      `INSERT OR IGNORE INTO session_messages(session_id, seq, role, text, tool_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(input.sessionId, input.seq, input.role, text, input.toolName ?? null, input.createdAt);
  } catch {
    // Best-effort: indexing failures must never propagate into the agent run.
  }
}

const SESSION_FILE_RE = /^([A-Za-z0-9][A-Za-z0-9_.-]*)\.jsonl$/;

function roleForRecord(record: { type: string }): IndexableRole | undefined {
  if (record.type === 'user_message') return 'user';
  if (record.type === 'assistant_message') return 'assistant';
  if (record.type === 'tool_result') return 'tool';
  return undefined;
}

/**
 * One-shot backfill: walk `<xenesisHome>/sessions/*.jsonl` and feed every indexable
 * message into `session_messages`. Called lazily by session_search when the table is
 * empty so an existing install (sessions written before v4) becomes searchable.
 *
 * Uses the JSONL line index as `seq` (matching the live JsonlSessionWriter append index)
 * so re-indexing is idempotent via INSERT OR IGNORE. Best-effort throughout.
 */
export async function reindexSessions(xenesisHome: string): Promise<number> {
  let indexed = 0;
  let files: string[];
  try {
    files = await readdir(resolve(xenesisHome, 'sessions'));
  } catch {
    return 0; // no sessions directory yet
  }

  for (const file of files) {
    const match = SESSION_FILE_RE.exec(file);
    if (!match) continue;
    const sessionId = match[1]!;
    let records: Awaited<ReturnType<typeof readSessionLog>>;
    try {
      records = await readSessionLog(xenesisHome, sessionId);
    } catch {
      continue; // unreadable/corrupt log — skip it
    }

    records.forEach((record, seq) => {
      const role = roleForRecord(record);
      if (!role) return;
      const message = (record as { message?: unknown }).message;
      if (!message || typeof message !== 'object') return;
      const content = (message as { content?: unknown }).content;
      if (typeof content !== 'string') return;
      const toolName = role === 'tool' ? (message as { name?: unknown }).name : undefined;
      const createdAt =
        typeof (record as { timestamp?: unknown }).timestamp === 'string'
          ? (record as { timestamp: string }).timestamp
          : new Date().toISOString();
      const before = indexed;
      indexSessionEvent(xenesisHome, {
        sessionId,
        seq,
        role,
        text: content,
        toolName: typeof toolName === 'string' ? toolName : undefined,
        createdAt,
      });
      // We can't know from indexSessionEvent whether the row was new, but counting
      // attempted non-empty inserts is enough for the "table was empty" backfill signal.
      if (content.trim()) indexed = before + 1;
    });
  }

  return indexed;
}
