// src/tools/sessionSearchTool.ts
// P5b-1: cross-session transcript recall. Searches indexed session messages
// (session_messages + FTS5 from migration v4) so the agent can recall what was said
// in earlier sessions. Korean-safe: trigram FTS handles >=3-char CJK queries; a 2-char
// query (which trigram CANNOT match) falls back to FTS prefix then LIKE '%q%'.

import type { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { openDatabase } from '../db/database.js';
import { isSessionSearchFtsAvailable } from '../db/migrations.js';
import { reindexSessions } from '../sessions/SessionTranscriptIndexer.js';
import type { Tool, ToolContext } from './types.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const SNIPPET_RADIUS = 60;

const sessionSearchInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(MAX_LIMIT).nullable().optional(),
  sessionId: z.string().min(1).nullable().optional(),
  role: z.enum(['user', 'assistant', 'tool']).nullable().optional(),
});

const sessionSearchOpenAIInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(MAX_LIMIT).nullable(),
  sessionId: z.string().nullable(),
  role: z.enum(['user', 'assistant', 'tool']).nullable(),
});

export type SessionSearchToolInput = z.infer<typeof sessionSearchInput>;

export interface SessionSearchHit {
  sessionId: string;
  seq: number;
  role: string;
  snippet: string;
  createdAt: string;
}

interface MessageRow {
  id: number;
  session_id: string;
  seq: number;
  role: string;
  text: string;
  tool_name: string | null;
  created_at: string;
}

/** Build a ±radius character window around the first occurrence of any query token. */
function buildSnippet(text: string, query: string, radius = SNIPPET_RADIUS): string {
  const haystack = text.toLowerCase();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  let matchIndex = -1;
  for (const token of tokens) {
    const idx = haystack.indexOf(token);
    if (idx >= 0 && (matchIndex < 0 || idx < matchIndex)) matchIndex = idx;
  }
  if (matchIndex < 0) {
    return text.length <= radius * 2 ? text : `${text.slice(0, radius * 2)}...`;
  }
  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(text.length, matchIndex + radius);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`.replace(/\s+/g, ' ').trim();
}

type SqlParam = string | number | null;

function applyFilters(
  baseSql: string,
  params: SqlParam[],
  input: SessionSearchToolInput,
): { sql: string; params: SqlParam[] } {
  let sql = baseSql;
  const next: SqlParam[] = [...params];
  if (input.sessionId) {
    sql += ' AND session_messages.session_id = ?';
    next.push(input.sessionId);
  }
  if (input.role) {
    sql += ' AND session_messages.role = ?';
    next.push(input.role);
  }
  return { sql, params: next };
}

/** length>=3 path: UNION trigram + unicode61 rowids, rank by best (MIN) bm25. */
function searchWithFts(db: DatabaseSync, query: string, limit: number, input: SessionSearchToolInput): MessageRow[] {
  const ranked = applyFilters(
    `SELECT session_messages.*, MIN(m.rank) AS best_rank
     FROM (
       SELECT rowid, bm25(session_messages_trig) AS rank
       FROM session_messages_trig WHERE session_messages_trig MATCH ?
       UNION ALL
       SELECT rowid, bm25(session_messages_fts) AS rank
       FROM session_messages_fts WHERE session_messages_fts MATCH ?
     ) AS m
     JOIN session_messages ON session_messages.id = m.rowid
     WHERE 1=1`,
    [query, query],
    input,
  );
  const sql = `${ranked.sql} GROUP BY session_messages.id ORDER BY best_rank ASC LIMIT ?`;
  return db.prepare(sql).all(...ranked.params, limit) as unknown as MessageRow[];
}

/** length<3 (e.g. 2-char Korean): FTS prefix first, else LIKE '%q%' (the CJK fallback). */
function searchShortQuery(db: DatabaseSync, query: string, limit: number, input: SessionSearchToolInput): MessageRow[] {
  if (isSessionSearchFtsAvailable()) {
    try {
      const prefix = applyFilters(
        `SELECT session_messages.*, bm25(session_messages_fts) AS best_rank
         FROM session_messages_fts
         JOIN session_messages ON session_messages.id = session_messages_fts.rowid
         WHERE session_messages_fts MATCH ?`,
        [`${query}*`],
        input,
      );
      const prefixSql = `${prefix.sql} ORDER BY best_rank ASC LIMIT ?`;
      const prefixRows = db.prepare(prefixSql).all(...prefix.params, limit) as unknown as MessageRow[];
      if (prefixRows.length > 0) return prefixRows;
    } catch {
      // malformed prefix MATCH (rare) — fall through to LIKE
    }
  }
  // LIKE '%q%' fallback: the only path that reliably matches a 2-char substring inside a
  // longer Korean token (trigram needs >=3 chars; unicode61 only matches whole tokens).
  const escaped = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const like = applyFilters(
    `SELECT session_messages.*, 0 AS best_rank
     FROM session_messages
     WHERE session_messages.text LIKE ? ESCAPE '\\'`,
    [`%${escaped}%`],
    input,
  );
  const likeSql = `${like.sql} ORDER BY session_messages.id DESC LIMIT ?`;
  return db.prepare(likeSql).all(...like.params, limit) as unknown as MessageRow[];
}

function tableIsEmpty(db: DatabaseSync): boolean {
  const row = db.prepare('SELECT 1 FROM session_messages LIMIT 1').get();
  return !row;
}

function renderHitLine(hit: SessionSearchHit): string {
  return `${hit.sessionId}#${hit.seq} [${hit.role}] ${hit.createdAt} - ${hit.snippet}`;
}

export function createSessionSearchTool(): Tool<SessionSearchToolInput, SessionSearchHit[]> {
  return {
    name: 'session_search',
    description:
      'Search transcripts of past Xenesis sessions (cross-session recall). Returns matching user, assistant, and tool messages with snippets. Supports Korean and other CJK queries, including short 2-character terms.',
    inputSchema: sessionSearchInput,
    openaiInputSchema: sessionSearchOpenAIInput,
    isReadOnly: () => true,
    async run(input: SessionSearchToolInput, context: ToolContext) {
      const xenesisHome = context.xenesisHome;
      if (!xenesisHome) {
        return { ok: false, content: 'session_search: no Xenesis home is configured for this run.' };
      }
      try {
        const query = input.query.trim();
        if (!query) return { ok: false, content: 'session_search: query is empty.' };
        const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
        const db = openDatabase(xenesisHome);

        // Lazy one-shot backfill: index pre-v4 session logs the first time we search an
        // empty table so existing installs are immediately searchable.
        if (tableIsEmpty(db)) {
          await reindexSessions(xenesisHome);
        }

        const useFts = query.length >= 3 && isSessionSearchFtsAvailable();
        const rows = useFts ? searchWithFts(db, query, limit, input) : searchShortQuery(db, query, limit, input);

        const hits: SessionSearchHit[] = rows.map((row) => ({
          sessionId: row.session_id,
          seq: row.seq,
          role: row.role,
          snippet: buildSnippet(row.text, query),
          createdAt: row.created_at,
        }));

        return {
          ok: true,
          content: hits.length > 0 ? hits.map(renderHitLine).join('\n') : 'session_search: no matches',
          data: hits,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, content: `session_search failed: ${message}` };
      }
    },
  };
}
