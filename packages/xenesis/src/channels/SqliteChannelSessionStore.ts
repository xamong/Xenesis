// src/channels/SqliteChannelSessionStore.ts
import { openDatabase } from "../db/database.js";
import { runStartupImports } from "../db/startupImports.js";
import type {
  ChannelMessageQueueStore,
  ChannelQueuedConversation,
  ChannelQueuedMessage,
  ChannelQueuedMessageInput,
  ChannelSessionStore
} from "./manager.js";

function createMessageId() {
  return `channel-message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class SqliteChannelSessionStore implements ChannelSessionStore, ChannelMessageQueueStore {
  private readonly db: ReturnType<typeof openDatabase>;
  private readonly ready: Promise<void>;
  constructor(private readonly options: { xenesisHome: string }) {
    this.db = openDatabase(options.xenesisHome);
    this.ready = runStartupImports(options.xenesisHome);
  }

  async get(key: string) {
    await this.ready;
    const row = this.db.prepare("SELECT session_id FROM channel_sessions WHERE key = ?").get(key) as { session_id: string } | undefined;
    return row?.session_id;
  }

  async set(key: string, sessionId: string) {
    await this.ready;
    this.db.prepare(
      "INSERT INTO channel_sessions (key, session_id, updated_at, rev) VALUES (?,?,?,1) ON CONFLICT(key) DO UPDATE SET session_id=excluded.session_id, updated_at=excluded.updated_at, rev=channel_sessions.rev+1"
    ).run(key, sessionId, new Date().toISOString());
  }

  async clear(key: string) {
    await this.ready;
    this.db.prepare("DELETE FROM channel_sessions WHERE key = ?").run(key);
  }

  async enqueueMessage(key: string, message: ChannelQueuedMessageInput) {
    await this.ready;
    this.db.prepare(
      `INSERT INTO channel_messages (id, channel_key, conversation_id, text, created_at)
       VALUES (?,?,?,?,?)`
    ).run(createMessageId(), key, message.conversationId, message.text, new Date().toISOString());
  }

  async peekMessages(key: string): Promise<ChannelQueuedMessage[]> {
    await this.ready;
    const rows = this.db.prepare(
      `SELECT id, channel_key, conversation_id, text, created_at
       FROM channel_messages
       WHERE channel_key = ?
       ORDER BY rowid ASC`
    ).all(key) as Array<{
      id: string;
      channel_key: string;
      conversation_id: string;
      text: string;
      created_at: string;
    }>;
    if (rows.length === 0) return [];
    return rows.map((row) => ({
      id: row.id,
      key: row.channel_key,
      conversationId: row.conversation_id,
      text: row.text,
      createdAt: row.created_at
    }));
  }

  async deleteMessages(ids: string[]): Promise<void> {
    await this.ready;
    if (ids.length === 0) return;
    const deleteStmt = this.db.prepare("DELETE FROM channel_messages WHERE id = ?");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const id of ids) deleteStmt.run(id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async drainMessages(key: string): Promise<ChannelQueuedMessage[]> {
    const messages = await this.peekMessages(key);
    await this.deleteMessages(messages.map((message) => message.id));
    return messages;
  }

  async clearMessages(key: string) {
    await this.ready;
    this.db.prepare("DELETE FROM channel_messages WHERE channel_key = ?").run(key);
  }

  async listQueuedConversations(adapterName: string): Promise<ChannelQueuedConversation[]> {
    await this.ready;
    const prefix = `${adapterName}:%`;
    const rows = this.db.prepare(
      `SELECT channel_key, conversation_id, MIN(rowid) AS first_rowid
       FROM channel_messages
       WHERE channel_key LIKE ?
       GROUP BY channel_key, conversation_id
       ORDER BY first_rowid ASC, channel_key ASC`
    ).all(prefix) as Array<{
      channel_key: string;
      conversation_id: string;
    }>;
    return rows.map((row) => ({
      key: row.channel_key,
      conversationId: row.conversation_id
    }));
  }
}
