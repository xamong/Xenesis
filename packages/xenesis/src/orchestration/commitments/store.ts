/**
 * P6 (e): Commitment store — persists pending CommitmentRecords. SQLite-backed
 * ({@link SqliteCommitmentStore}), parallel to SqliteScheduleStore. Uses the v6 `commitments`
 * table (see src/db/migrations.ts). An in-memory variant ({@link InMemoryCommitmentStore}) is
 * provided for tests.
 *
 * Adapted from OpenClaw `src/commitments/store.ts` (JSON file store → SQLite table store).
 */
import { randomBytes } from "node:crypto";
import { openDatabase } from "../../db/database.js";
import { TableStore } from "../../db/tableStore.js";
import type {
  CommitmentRecord,
  CommitmentScope,
  CommitmentStatus,
} from "./types.js";

const ROLLING_DAY_MS = 24 * 60 * 60 * 1000;
const SCOPE_SEP = "";

export function generateCommitmentId(nowMs: number = Date.now()): string {
  return `cm_${nowMs.toString(36)}_${randomBytes(5).toString("hex")}`;
}

function scopeValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

/** Stable routing/identity key — two records collide for dedupe only within the same scope. */
export function buildCommitmentScopeKey(scope: CommitmentScope): string {
  return [
    scopeValue(scope.agentId),
    scopeValue(scope.sessionKey),
    scopeValue(scope.channel),
    scopeValue(scope.accountId),
    scopeValue(scope.to),
    scopeValue(scope.threadId),
    scopeValue(scope.senderId),
  ].join(SCOPE_SEP);
}

export function isActiveStatus(status: CommitmentStatus): boolean {
  return status === "pending" || status === "snoozed";
}

/** Non-mutating sort by due-window earliest, then createdAt (ES2022-safe; no toSorted). */
function sortByDue(records: CommitmentRecord[]): CommitmentRecord[] {
  return [...records].sort(
    (a, b) => a.dueWindow.earliestMs - b.dueWindow.earliestMs || a.createdAtMs - b.createdAtMs,
  );
}

export interface CreateCommitmentInput {
  scope: CommitmentScope;
  kind: CommitmentRecord["kind"];
  sensitivity: CommitmentRecord["sensitivity"];
  source: CommitmentRecord["source"];
  reason: string;
  suggestedText: string;
  dedupeKey: string;
  confidence: number;
  earliestMs: number;
  latestMs: number;
  timezone: string;
  sourceMessageId?: string;
  sourceRunId?: string;
}

export interface ListPendingForScopeOptions {
  scope: CommitmentScope;
  nowMs?: number;
  limit?: number;
}

export interface ListDueOptions {
  agentId: string;
  sessionKey: string;
  nowMs?: number;
  limit?: number;
  /** Hours after the due window's latest before an unsent commitment is treated as expired. */
  expireAfterHours?: number;
  /** Max deliveries surfaced per scope per rolling day. */
  maxPerDay?: number;
}

export interface CommitmentStore {
  /**
   * Inserts a commitment, or merges into an existing active one sharing scope+dedupeKey
   * (widening the due window, keeping the max confidence). Returns the created record, or
   * undefined when it merged into an existing one.
   */
  upsert(input: CreateCommitmentInput, nowMs?: number): Promise<CommitmentRecord | undefined>;
  get(id: string): Promise<CommitmentRecord | undefined>;
  list(): Promise<CommitmentRecord[]>;
  listPendingForScope(options: ListPendingForScopeOptions): Promise<CommitmentRecord[]>;
  listDue(options: ListDueOptions): Promise<CommitmentRecord[]>;
  markStatus(
    ids: string[],
    status: Extract<CommitmentStatus, "sent" | "dismissed" | "expired">,
    nowMs?: number,
  ): Promise<void>;
  setTaskId(id: string, taskId: string, nowMs?: number): Promise<void>;
  remove(id: string): Promise<boolean>;
}

abstract class BaseCommitmentStore implements CommitmentStore {
  protected abstract all(): CommitmentRecord[];
  protected abstract write(record: CommitmentRecord): void;
  protected abstract replace(record: CommitmentRecord): void;
  protected abstract deleteById(id: string): boolean;
  protected abstract readById(id: string): CommitmentRecord | undefined;

  async upsert(
    input: CreateCommitmentInput,
    nowMs = Date.now(),
  ): Promise<CommitmentRecord | undefined> {
    const scopeKey = buildCommitmentScopeKey(input.scope);
    const dedupeKey = input.dedupeKey.trim();
    const existing = this.all().find(
      (c) =>
        buildCommitmentScopeKey(c) === scopeKey &&
        c.dedupeKey === dedupeKey &&
        isActiveStatus(c.status),
    );
    if (existing) {
      this.replace({
        ...existing,
        reason: input.reason.trim() || existing.reason,
        suggestedText: input.suggestedText.trim() || existing.suggestedText,
        confidence: Math.max(existing.confidence, input.confidence),
        dueWindow: {
          earliestMs: Math.min(existing.dueWindow.earliestMs, input.earliestMs),
          latestMs: Math.max(existing.dueWindow.latestMs, input.latestMs),
          timezone: input.timezone,
        },
        updatedAtMs: nowMs,
      });
      return undefined;
    }
    const record: CommitmentRecord = {
      id: generateCommitmentId(nowMs),
      agentId: input.scope.agentId,
      sessionKey: input.scope.sessionKey,
      channel: input.scope.channel,
      ...(input.scope.accountId ? { accountId: input.scope.accountId } : {}),
      ...(input.scope.to ? { to: input.scope.to } : {}),
      ...(input.scope.threadId ? { threadId: input.scope.threadId } : {}),
      ...(input.scope.senderId ? { senderId: input.scope.senderId } : {}),
      kind: input.kind,
      sensitivity: input.sensitivity,
      source: input.source,
      status: "pending",
      reason: input.reason.trim(),
      suggestedText: input.suggestedText.trim(),
      dedupeKey,
      confidence: input.confidence,
      dueWindow: {
        earliestMs: input.earliestMs,
        latestMs: input.latestMs,
        timezone: input.timezone,
      },
      ...(input.sourceMessageId ? { sourceMessageId: input.sourceMessageId } : {}),
      ...(input.sourceRunId ? { sourceRunId: input.sourceRunId } : {}),
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
      attempts: 0,
    };
    this.write(record);
    return record;
  }

  async get(id: string): Promise<CommitmentRecord | undefined> {
    return this.readById(id);
  }

  async list(): Promise<CommitmentRecord[]> {
    return sortByDue(this.all());
  }

  async listPendingForScope(options: ListPendingForScopeOptions): Promise<CommitmentRecord[]> {
    const nowMs = options.nowMs ?? Date.now();
    const scopeKey = buildCommitmentScopeKey(options.scope);
    const limit = options.limit ?? 20;
    return sortByDue(
      this.all().filter(
        (c) =>
          buildCommitmentScopeKey(c) === scopeKey &&
          isActiveStatus(c.status) &&
          (c.status !== "snoozed" || (c.snoozedUntilMs ?? 0) <= nowMs),
      ),
    ).slice(0, limit);
  }

  private countSentForSession(agentId: string, sessionKey: string, nowMs: number): number {
    const sinceMs = nowMs - ROLLING_DAY_MS;
    return this.all().filter(
      (c) =>
        c.agentId === agentId &&
        c.sessionKey === sessionKey &&
        c.status === "sent" &&
        (c.sentAtMs ?? 0) >= sinceMs,
    ).length;
  }

  async listDue(options: ListDueOptions): Promise<CommitmentRecord[]> {
    const nowMs = options.nowMs ?? Date.now();
    const staleAfterMs = (options.expireAfterHours ?? 72) * 60 * 60 * 1000;
    const maxPerDay = options.maxPerDay ?? Number.POSITIVE_INFINITY;
    const remainingToday =
      maxPerDay - this.countSentForSession(options.agentId, options.sessionKey, nowMs);
    if (remainingToday <= 0) return [];
    const limit = Math.min(options.limit ?? remainingToday, remainingToday);
    return sortByDue(
      this.all().filter(
        (c) =>
          c.agentId === options.agentId &&
          c.sessionKey === options.sessionKey &&
          isActiveStatus(c.status) &&
          c.dueWindow.earliestMs <= nowMs &&
          c.dueWindow.latestMs + staleAfterMs >= nowMs &&
          (c.status !== "snoozed" || (c.snoozedUntilMs ?? 0) <= nowMs),
      ),
    ).slice(0, limit);
  }

  async markStatus(
    ids: string[],
    status: Extract<CommitmentStatus, "sent" | "dismissed" | "expired">,
    nowMs = Date.now(),
  ): Promise<void> {
    for (const id of ids) {
      const existing = this.readById(id);
      if (!existing || !isActiveStatus(existing.status)) continue;
      this.replace({
        ...existing,
        status,
        updatedAtMs: nowMs,
        ...(status === "sent" ? { sentAtMs: nowMs } : {}),
        ...(status === "dismissed" ? { dismissedAtMs: nowMs } : {}),
        ...(status === "expired" ? { expiredAtMs: nowMs } : {}),
      });
    }
  }

  async setTaskId(id: string, taskId: string, nowMs = Date.now()): Promise<void> {
    const existing = this.readById(id);
    if (!existing) return;
    this.replace({ ...existing, taskId, updatedAtMs: nowMs });
  }

  async remove(id: string): Promise<boolean> {
    return this.deleteById(id);
  }
}

/** SQLite-backed commitment store (production). */
export class SqliteCommitmentStore extends BaseCommitmentStore {
  private readonly table: TableStore<CommitmentRecord>;

  constructor(options: { xenesisHome: string }) {
    super();
    this.table = new TableStore<CommitmentRecord>(openDatabase(options.xenesisHome), {
      table: "commitments",
      id: (c) => c.id,
      indexColumns: [
        "agent_id",
        "session_key",
        "status",
        "dedupe_key",
        "earliest_ms",
        "latest_ms",
        "sent_at_ms",
        "created_at_ms",
        "updated_at_ms",
      ],
      derive: (c) => ({
        agent_id: c.agentId,
        session_key: c.sessionKey,
        status: c.status,
        dedupe_key: c.dedupeKey,
        earliest_ms: c.dueWindow.earliestMs,
        latest_ms: c.dueWindow.latestMs,
        sent_at_ms: c.sentAtMs ?? null,
        created_at_ms: c.createdAtMs,
        updated_at_ms: c.updatedAtMs,
      }),
    });
  }

  protected all(): CommitmentRecord[] {
    return this.table.list();
  }
  protected write(record: CommitmentRecord): void {
    this.table.upsert(record);
  }
  protected replace(record: CommitmentRecord): void {
    this.table.upsert(record);
  }
  protected deleteById(id: string): boolean {
    return this.table.delete(id);
  }
  protected readById(id: string): CommitmentRecord | undefined {
    return this.table.get(id);
  }
}

/** In-memory commitment store (tests / no-DB callers). */
export class InMemoryCommitmentStore extends BaseCommitmentStore {
  private readonly records = new Map<string, CommitmentRecord>();

  protected all(): CommitmentRecord[] {
    return [...this.records.values()];
  }
  protected write(record: CommitmentRecord): void {
    this.records.set(record.id, record);
  }
  protected replace(record: CommitmentRecord): void {
    this.records.set(record.id, record);
  }
  protected deleteById(id: string): boolean {
    return this.records.delete(id);
  }
  protected readById(id: string): CommitmentRecord | undefined {
    return this.records.get(id);
  }
}
