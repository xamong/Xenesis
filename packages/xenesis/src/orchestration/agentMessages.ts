import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "../db/database.js";
import { type AgentTask, type AgentTaskStore, now } from "./agentTasks.js";

export type AgentMessageType = "message" | "structured";

export interface AgentInboxMessage {
  id: string;
  fromSessionId: string;
  toTaskId: string;
  toAgentName?: string;
  summary?: string;
  message: string;
  messageType: AgentMessageType;
  createdAt: string;
  claimedAt?: string;
  claimedBySessionId?: string;
  readAt?: string;
  readBySessionId?: string;
}

export interface CreateAgentMessageInput {
  id?: string;
  fromSessionId: string;
  toTaskId: string;
  toAgentName?: string;
  summary?: string;
  message: string;
  messageType?: AgentMessageType;
  createdAt?: string;
}

export interface AgentMessageListOptions {
  limit?: number;
  includeClaimed?: boolean;
}

export interface AgentMessageContextOptions {
  receiverSessionId: string;
  maxMessages?: number;
  maxMessageChars?: number;
  maxTotalChars?: number;
  claim?: boolean;
}

export interface AgentMessageContextSummary {
  messageIds: string[];
  content?: string;
}

export interface AgentMessageStore {
  enqueue(input: CreateAgentMessageInput): Promise<AgentInboxMessage>;
  listUnread(toTaskId: string, options?: AgentMessageListOptions): Promise<AgentInboxMessage[]>;
  claimUnread(toTaskId: string, receiverSessionId: string, options?: AgentMessageListOptions): Promise<AgentInboxMessage[]>;
  markRead(ids: string[], readBySessionId: string): Promise<void>;
  releaseClaims(ids: string[], claimedBySessionId: string): Promise<void>;
  pruneReadBefore?(beforeIso: string): Promise<number>;
}

interface AgentMessageRow {
  id: string;
  from_session_id: string;
  to_task_id: string;
  to_agent_name: string | null;
  summary: string | null;
  message: string;
  message_type: string;
  created_at: string;
  claimed_at: string | null;
  claimed_by_session_id: string | null;
  read_at: string | null;
  read_by_session_id: string | null;
}

interface TableInfoRow {
  name: string;
}

const MESSAGE_SELECT_COLUMNS = [
  "id",
  "from_session_id",
  "to_task_id",
  "to_agent_name",
  "summary",
  "message",
  "message_type",
  "created_at",
  "claimed_at",
  "claimed_by_session_id",
  "read_at",
  "read_by_session_id"
].join(", ");

const CLAIM_TTL_MS = 30 * 60 * 1000;

let messageSequence = 0;

function createAgentMessageId() {
  messageSequence = (messageSequence + 1) % Number.MAX_SAFE_INTEGER;
  return [
    "agent-message",
    Date.now().toString(36),
    messageSequence.toString(36).padStart(4, "0"),
    randomUUID()
  ].join("-");
}

function mapRow(row: AgentMessageRow): AgentInboxMessage {
  return {
    id: row.id,
    fromSessionId: row.from_session_id,
    toTaskId: row.to_task_id,
    ...(row.to_agent_name ? { toAgentName: row.to_agent_name } : {}),
    ...(row.summary ? { summary: row.summary } : {}),
    message: row.message,
    messageType: row.message_type === "structured" ? "structured" : "message",
    createdAt: row.created_at,
    claimedAt: row.claimed_at ?? undefined,
    claimedBySessionId: row.claimed_by_session_id ?? undefined,
    readAt: row.read_at ?? undefined,
    readBySessionId: row.read_by_session_id ?? undefined
  };
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 14)).trimEnd()}\n[truncated]`;
}

export class SqliteAgentMessageStore implements AgentMessageStore {
  private readonly db: DatabaseSync;

  constructor(options: { xenesisHome: string }) {
    this.db = openDatabase(options.xenesisHome);
    ensureClaimColumns(this.db);
  }

  async enqueue(input: CreateAgentMessageInput): Promise<AgentInboxMessage> {
    const timestamp = input.createdAt ?? now();
    const message: AgentInboxMessage = {
      id: input.id ?? createAgentMessageId(),
      fromSessionId: input.fromSessionId,
      toTaskId: input.toTaskId,
      ...(input.toAgentName ? { toAgentName: input.toAgentName } : {}),
      ...(input.summary ? { summary: input.summary } : {}),
      message: input.message,
      messageType: input.messageType ?? "message",
      createdAt: timestamp
    };
    const result = this.db.prepare(`
      INSERT OR IGNORE INTO agent_messages (
        id, from_session_id, to_task_id, to_agent_name, summary, message, message_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      message.id,
      message.fromSessionId,
      message.toTaskId,
      message.toAgentName ?? null,
      message.summary ?? null,
      message.message,
      message.messageType,
      message.createdAt
    );
    if (Number(result.changes ?? 0) === 0) {
      const existing = this.db.prepare(`
        SELECT ${MESSAGE_SELECT_COLUMNS}
        FROM agent_messages
        WHERE id = ?
      `).get(message.id) as unknown as AgentMessageRow | undefined;
      if (existing) return mapRow(existing);
      throw new Error(`Agent message insert was ignored but no existing row was found: ${message.id}`);
    }
    return message;
  }

  async listUnread(toTaskId: string, options: AgentMessageListOptions = {}): Promise<AgentInboxMessage[]> {
    const limit = Math.max(1, options.limit ?? 50);
    const claimedFilter = options.includeClaimed ? "" : "AND claimed_at IS NULL";
    const rows = this.db.prepare(`
      SELECT ${MESSAGE_SELECT_COLUMNS}
      FROM agent_messages
      WHERE to_task_id = ? AND read_at IS NULL ${claimedFilter}
      ORDER BY created_at ASC, id ASC
      LIMIT ?
    `).all(toTaskId, limit) as unknown as AgentMessageRow[];
    return rows.map(mapRow);
  }

  async claimUnread(
    toTaskId: string,
    receiverSessionId: string,
    options: AgentMessageListOptions = {}
  ): Promise<AgentInboxMessage[]> {
    const limit = Math.max(1, options.limit ?? 50);
    const timestamp = now();
    const staleBefore = new Date(Date.now() - CLAIM_TTL_MS).toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const candidates = this.db.prepare(`
        SELECT ${MESSAGE_SELECT_COLUMNS}
        FROM agent_messages
        WHERE to_task_id = ?
          AND read_at IS NULL
          AND (claimed_at IS NULL OR claimed_at < ?)
        ORDER BY created_at ASC, id ASC
        LIMIT ?
      `).all(toTaskId, staleBefore, limit) as unknown as AgentMessageRow[];
      const ids = candidates.map((row) => row.id);
      if (ids.length === 0) {
        this.db.exec("COMMIT");
        return [];
      }
      const placeholders = ids.map(() => "?").join(", ");
      this.db.prepare(`
        UPDATE agent_messages
        SET claimed_at = ?, claimed_by_session_id = ?
        WHERE id IN (${placeholders})
          AND read_at IS NULL
          AND (claimed_at IS NULL OR claimed_at < ?)
      `).run(timestamp, receiverSessionId, ...ids, staleBefore);
      const rows = this.db.prepare(`
        SELECT ${MESSAGE_SELECT_COLUMNS}
        FROM agent_messages
        WHERE id IN (${placeholders})
          AND read_at IS NULL
          AND claimed_at = ?
          AND claimed_by_session_id = ?
        ORDER BY created_at ASC, id ASC
      `).all(...ids, timestamp, receiverSessionId) as unknown as AgentMessageRow[];
      this.db.exec("COMMIT");
      return rows.map(mapRow);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async markRead(ids: string[], readBySessionId: string): Promise<void> {
    if (ids.length === 0) return;
    const timestamp = now();
    const update = this.db.prepare(`
      UPDATE agent_messages
      SET read_at = ?, read_by_session_id = ?
      WHERE id = ?
        AND read_at IS NULL
        AND (claimed_by_session_id IS NULL OR claimed_by_session_id = ?)
    `);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const id of ids) update.run(timestamp, readBySessionId, id, readBySessionId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async releaseClaims(ids: string[], claimedBySessionId: string): Promise<void> {
    if (ids.length === 0) return;
    const update = this.db.prepare(`
      UPDATE agent_messages
      SET claimed_at = NULL, claimed_by_session_id = NULL
      WHERE id = ?
        AND read_at IS NULL
        AND claimed_by_session_id = ?
    `);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const id of ids) update.run(id, claimedBySessionId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async pruneReadBefore(beforeIso: string): Promise<number> {
    const result = this.db.prepare(`
      DELETE FROM agent_messages
      WHERE read_at IS NOT NULL AND read_at < ?
    `).run(beforeIso);
    return Number(result.changes ?? 0);
  }
}

function ensureClaimColumns(db: DatabaseSync) {
  const columns = new Set(
    (db.prepare("PRAGMA table_info(agent_messages)").all() as unknown as TableInfoRow[])
      .map((row) => row.name)
  );
  if (!columns.has("claimed_at")) {
    db.exec("ALTER TABLE agent_messages ADD COLUMN claimed_at TEXT");
  }
  if (!columns.has("claimed_by_session_id")) {
    db.exec("ALTER TABLE agent_messages ADD COLUMN claimed_by_session_id TEXT");
  }
}

export async function collectAgentMessages(
  store: AgentMessageStore,
  toTaskId: string,
  options: AgentMessageContextOptions
): Promise<AgentMessageContextSummary> {
  const maxMessages = Math.max(1, options.maxMessages ?? 8);
  const maxMessageChars = Math.max(120, options.maxMessageChars ?? 1200);
  const maxTotalChars = Math.max(maxMessageChars, options.maxTotalChars ?? 5000);
  const messages = options.claim
    ? await store.claimUnread(toTaskId, options.receiverSessionId, { limit: maxMessages })
    : await store.listUnread(toTaskId, { limit: maxMessages });
  if (messages.length === 0) return { messageIds: [] };

  const lines: string[] = [
    "Xenesis agent messages:",
    "Use these messages from other durable agents before continuing this task."
  ];
  for (const [index, message] of messages.entries()) {
    const header = [
      `${index + 1}. from: ${message.fromSessionId}`,
      message.toAgentName ? `to: ${message.toAgentName}` : `toTaskId: ${message.toTaskId}`,
      `receivedAt: ${message.createdAt}`,
      message.messageType === "structured" ? "type: structured" : undefined
    ].filter((part): part is string => Boolean(part)).join(" | ");
    lines.push(header);
    if (message.summary) lines.push(`summary: ${truncateText(message.summary, 260)}`);
    lines.push(`message:\n${truncateText(message.message, maxMessageChars)}`);
  }

  const messageIds = messages.map((message) => message.id);
  return {
    messageIds,
    content: truncateText(lines.join("\n"), maxTotalChars)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function legacyMessageBody(value: unknown) {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

function legacyMessageCreatedAt(value: unknown) {
  if (typeof value !== "string") return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
}

function legacyMessageType(value: unknown): AgentMessageType {
  return value === "structured" ? "structured" : "message";
}

function stableLegacyMessageId(taskId: string, index: number, item: unknown) {
  const digest = createHash("sha256")
    .update(JSON.stringify({ taskId, index, item }))
    .digest("hex")
    .slice(0, 32);
  return `legacy-agent-message-${digest}`;
}

function taskAgentName(task: AgentTask) {
  const metadataName = stringField(task.metadata?.name);
  return metadataName ?? task.label ?? task.subagent;
}

export async function drainLegacyAgentInbox(
  taskStore: AgentTaskStore,
  messageStore: AgentMessageStore,
  taskId: string
): Promise<number> {
  const task = await taskStore.get(taskId);
  const inbox = task?.metadata && Array.isArray(task.metadata.inbox) ? task.metadata.inbox : [];
  if (!task || inbox.length === 0) return 0;

  let migrated = 0;
  const remainingInbox: unknown[] = [];
  for (const [index, item] of inbox.entries()) {
    if (!isRecord(item)) {
      remainingInbox.push(item);
      continue;
    }
    const body = legacyMessageBody(item.message);
    if (!body.trim()) {
      remainingInbox.push(item);
      continue;
    }
    await messageStore.enqueue({
      id: stableLegacyMessageId(task.id, index, item),
      fromSessionId: stringField(item.from) ?? task.parentSessionId ?? "legacy-agent-message",
      toTaskId: task.id,
      toAgentName: stringField(item.to) ?? taskAgentName(task),
      summary: stringField(item.summary),
      message: body,
      messageType: legacyMessageType(item.type),
      createdAt: legacyMessageCreatedAt(item.timestamp)
    });
    migrated++;
  }
  if (migrated === 0) return 0;

  const { inbox: _inbox, ...metadata } = task.metadata ?? {};
  const nextMetadata = remainingInbox.length > 0
    ? { ...metadata, inbox: remainingInbox }
    : metadata;
  await taskStore.update(task.id, {
    metadata: nextMetadata
  });
  return migrated;
}
