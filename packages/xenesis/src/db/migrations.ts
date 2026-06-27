// src/db/migrations.ts
import type { DatabaseSync } from "node:sqlite";

const MIGRATIONS: string[] = [
  // v1: initial Tier-1 schema
  `
  CREATE TABLE IF NOT EXISTS agent_tasks (
    id TEXT PRIMARY KEY, status TEXT NOT NULL, source TEXT, handoff_id TEXT,
    parent_session_id TEXT, schedule_id TEXT, priority INTEGER NOT NULL DEFAULT 0,
    handoff_order INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_handoff ON agent_tasks(handoff_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_parent ON agent_tasks(parent_session_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_schedule ON agent_tasks(schedule_id);

  CREATE TABLE IF NOT EXISTS subagent_tasks (
    id TEXT PRIMARY KEY, status TEXT NOT NULL, subagent TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1, kind TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);

  CREATE TABLE IF NOT EXISTS channel_sessions (
    key TEXT PRIMARY KEY, session_id TEXT NOT NULL, updated_at TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0);

  CREATE TABLE IF NOT EXISTS plugins (
    path TEXT PRIMARY KEY, name TEXT, enabled INTEGER NOT NULL DEFAULT 0,
    installed_at TEXT NOT NULL, updated_at TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0);

  CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY, priority INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);

  CREATE TABLE IF NOT EXISTS plan_sessions (
    session_id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);

  CREATE TABLE IF NOT EXISTS worktree_sessions (
    session_id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);

  CREATE TABLE IF NOT EXISTS team_sessions (
    session_id TEXT PRIMARY KEY, team_name TEXT, rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);

  CREATE TABLE IF NOT EXISTS teams (
    team_name TEXT PRIMARY KEY, rev INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);
  `,
  // v2: durable channel message queue
  `
  CREATE TABLE IF NOT EXISTS channel_messages (
    id TEXT PRIMARY KEY,
    channel_key TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_channel_messages_key_created
    ON channel_messages(channel_key, created_at, id);
  `,
  // v3: durable multi-agent message inbox
  `
  CREATE TABLE IF NOT EXISTS agent_messages (
    id TEXT PRIMARY KEY,
    from_session_id TEXT NOT NULL,
    to_task_id TEXT NOT NULL,
    to_agent_name TEXT,
    summary TEXT,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'message',
    created_at TEXT NOT NULL,
    claimed_at TEXT,
    claimed_by_session_id TEXT,
    read_at TEXT,
    read_by_session_id TEXT);
  CREATE INDEX IF NOT EXISTS idx_agent_messages_unread
    ON agent_messages(to_task_id, read_at, created_at, id);
  `,
  // v4: semantic memory embedding vector (Float32 BLOB; NULL = not yet embedded -> keyword fallback)
  `
  ALTER TABLE memory ADD COLUMN embedding BLOB;
  `,
  // v5: Evidence-Governed Memory sidecar ledger tables. Active memory remains in `memory`.
  `
  CREATE TABLE IF NOT EXISTS memory_proposals (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_memory_proposals_status
    ON memory_proposals(status, updated_at, id);

  CREATE TABLE IF NOT EXISTS memory_evidence (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    sensitivity TEXT NOT NULL,
    created_at TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_memory_evidence_kind_created
    ON memory_evidence(kind, created_at, id);

  CREATE TABLE IF NOT EXISTS memory_ledger_events (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    memory_id TEXT,
    proposal_id TEXT,
    evidence_id TEXT,
    created_at TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_memory_ledger_events_memory
    ON memory_ledger_events(memory_id, created_at, id);
  CREATE INDEX IF NOT EXISTS idx_memory_ledger_events_proposal
    ON memory_ledger_events(proposal_id, created_at, id);
  CREATE INDEX IF NOT EXISTS idx_memory_ledger_events_evidence
    ON memory_ledger_events(evidence_id, created_at, id);
  `
];

/** True once runMigrations has confirmed fts5 virtual tables exist (or were created). */
let ftsAvailable = false;

/** Whether the session-transcript FTS5 virtual tables are usable on this connection. */
export function isSessionSearchFtsAvailable(): boolean {
  return ftsAvailable;
}

export function runMigrations(db: DatabaseSync): void {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  let version = row.user_version ?? 0;
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(MIGRATIONS[i]!);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
