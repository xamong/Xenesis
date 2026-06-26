/**
 * P6 (e): Commitment runtime — the debounced enqueue + batch-drain extractor, plus due-surfacing.
 *
 * Extraction:
 *  - A completed INTERACTIVE turn is enqueued via {@link enqueueCommitmentExtraction}. Enqueue is
 *    a NO-OP when commitments are disabled (default OFF), so the whole subsystem is zero-cost.
 *  - After a debounce window the queue drains in batches. Each batch runs the hidden extractor on
 *    an AUX/cheap model with TOOLS DISABLED (`tools:[]`), DISTINCT from the main agent loop. The
 *    extractor NEVER schedules cron — it only validates + stores commitment records.
 *
 * Due-surfacing ({@link surfaceDueCommitments}):
 *  - When a commitment's dueWindow opens, a ONE-SHOT AgentTask is created carrying a synthetic
 *    `scheduleId` (`commitment:<id>`). That routes it through the SAME unattended isolated-run +
 *    [SILENT] path as a scheduled run (see taskExecutor.ts), and respects approval gates.
 */
import type { AgentTask, CreateAgentTaskInput } from "../agentTasks.js";
import { resolveCommitmentsConfig, resolveCommitmentTimezone } from "./config.js";
import {
  buildCommitmentExtractionPrompt,
  parseCommitmentExtractionOutput,
  validateCommitmentCandidates,
} from "./extraction.js";
import type { CommitmentStore } from "./store.js";
import type {
  CommitmentExtractionBatchResult,
  CommitmentExtractionItem,
  CommitmentRecord,
  CommitmentScope,
} from "./types.js";

type TimerHandle = ReturnType<typeof setTimeout>;

/** Minimal config shape the runtime reads (full XenesisConfig satisfies this). */
export type CommitmentRuntimeConfig = Parameters<typeof resolveCommitmentsConfig>[0] & {
  agents?: { defaults?: { userTimezone?: string } };
};

/** Runs the hidden extractor prompt on an aux/cheap model with TOOLS DISABLED → raw text. */
export type CommitmentModelRunner = (params: {
  prompt: string;
  provider?: string;
  model?: string;
  timeoutMs: number;
}) => Promise<string>;

/** Creates the one-shot AgentTask used to surface a due commitment. */
export type CommitmentTaskCreator = (input: CreateAgentTaskInput) => Promise<AgentTask>;

export interface CommitmentRuntimeOptions {
  store: CommitmentStore;
  /** Aux/cheap model runner. Tools MUST be disabled by the implementation. */
  runModel: CommitmentModelRunner;
  /** Resolves the user's timezone (falls back to config + system tz). */
  config?: CommitmentRuntimeConfig;
  now?: () => number;
  setTimer?: (cb: () => void, ms: number) => TimerHandle;
  clearTimer?: (h: TimerHandle) => void;
  /** Optional logger for non-fatal extraction failures. */
  logger?: (message: string) => void;
}

type QueueEntry = Omit<CommitmentExtractionItem, "existingPending">;

export type EnqueueCommitmentInput = CommitmentScope & {
  userText: string;
  assistantText?: string;
  sourceMessageId?: string;
  sourceRunId?: string;
  nowMs?: number;
};

/**
 * The commitment runtime. One instance per process (the wiring layer constructs it with a real
 * model runner + store). Holds the debounce queue + timer; opt-in default-OFF is enforced here.
 */
export class CommitmentRuntime {
  private queue: QueueEntry[] = [];
  private timer: TimerHandle | null = null;
  private draining = false;
  private overflowWarned = false;
  private idCounter = 0;

  constructor(private readonly options: CommitmentRuntimeOptions) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private setTimer(cb: () => void, ms: number): TimerHandle {
    const handle = this.options.setTimer ? this.options.setTimer(cb, ms) : setTimeout(cb, ms);
    if (typeof handle === "object" && handle && "unref" in handle && typeof handle.unref === "function") {
      handle.unref();
    }
    return handle;
  }

  private clearTimer(handle: TimerHandle): void {
    (this.options.clearTimer ?? clearTimeout)(handle);
  }

  private buildItemId(nowMs: number): string {
    this.idCounter += 1;
    return `turn:${nowMs.toString(36)}:${this.idCounter.toString(36)}`;
  }

  /**
   * Enqueues one completed interactive turn for delayed commitment extraction. Returns false
   * (no-op) when commitments are DISABLED (the default), or the turn lacks required scope/text.
   * Never throws and never blocks the caller.
   */
  enqueue(input: EnqueueCommitmentInput): boolean {
    const resolved = resolveCommitmentsConfig(this.options.config);
    if (!resolved.enabled) return false;
    const nowMs = input.nowMs ?? this.now();
    const agentId = input.agentId?.trim() ?? "";
    const sessionKey = input.sessionKey?.trim() ?? "";
    const channel = input.channel?.trim() ?? "";
    const userText = input.userText?.trim() ?? "";
    const assistantText = input.assistantText?.trim() ?? "";
    if (!agentId || !sessionKey || !channel || !userText || !assistantText) return false;
    if (this.queue.length >= resolved.extraction.queueMaxItems) {
      if (!this.overflowWarned) {
        this.options.logger?.("commitment extraction queue full; dropping hidden extraction request");
        this.overflowWarned = true;
      }
      return false;
    }
    this.queue.push({
      itemId: this.buildItemId(nowMs),
      nowMs,
      timezone: resolveCommitmentTimezone(this.options.config?.agents?.defaults?.userTimezone),
      agentId,
      sessionKey,
      channel,
      ...(input.accountId?.trim() ? { accountId: input.accountId.trim() } : {}),
      ...(input.to?.trim() ? { to: input.to.trim() } : {}),
      ...(input.threadId?.trim() ? { threadId: input.threadId.trim() } : {}),
      ...(input.senderId?.trim() ? { senderId: input.senderId.trim() } : {}),
      userText,
      assistantText,
      ...(input.sourceMessageId?.trim() ? { sourceMessageId: input.sourceMessageId.trim() } : {}),
      ...(input.sourceRunId?.trim() ? { sourceRunId: input.sourceRunId.trim() } : {}),
    });
    if (!this.timer) {
      this.timer = this.setTimer(() => {
        this.timer = null;
        void this.drain().catch((err: unknown) => {
          this.options.logger?.(`commitment extraction failed: ${String(err)}`);
        });
      }, resolved.extraction.debounceMs);
    }
    return true;
  }

  /** Hydrates a queued turn with existing-pending context the extractor uses to avoid dupes. */
  private async hydrate(entry: QueueEntry): Promise<CommitmentExtractionItem> {
    const pending = await this.options.store.listPendingForScope({
      scope: entry,
      nowMs: entry.nowMs,
      limit: 8,
    });
    return {
      ...entry,
      existingPending: pending.map((c) => ({
        kind: c.kind,
        reason: c.reason,
        dedupeKey: c.dedupeKey,
        earliestMs: c.dueWindow.earliestMs,
        latestMs: c.dueWindow.latestMs,
      })),
    };
  }

  private async extractBatch(
    items: CommitmentExtractionItem[],
    timeoutSeconds: number,
    provider?: string,
    model?: string,
  ): Promise<CommitmentExtractionBatchResult> {
    const prompt = buildCommitmentExtractionPrompt({ items });
    const raw = await this.options.runModel({
      prompt,
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
      timeoutMs: timeoutSeconds * 1000,
    });
    return parseCommitmentExtractionOutput(raw);
  }

  /** Drains all queued turns in batches. Returns the number of items processed. */
  async drain(): Promise<number> {
    if (this.draining) return 0;
    const resolved = resolveCommitmentsConfig(this.options.config);
    if (!resolved.enabled) {
      this.queue = [];
      return 0;
    }
    this.draining = true;
    try {
      let processed = 0;
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, resolved.extraction.batchMaxItems);
        const items = await Promise.all(batch.map((entry) => this.hydrate(entry)));
        const result = await this.extractBatch(
          items,
          resolved.extraction.timeoutSeconds,
          resolved.extraction.provider,
          resolved.extraction.model,
        );
        const validated = validateCommitmentCandidates({ items, result, resolved });
        const nowMs = this.now();
        for (const entry of validated) {
          await this.options.store.upsert(
            {
              scope: entry.item,
              kind: entry.candidate.kind,
              sensitivity: entry.candidate.sensitivity,
              source: entry.candidate.source,
              reason: entry.candidate.reason,
              suggestedText: entry.candidate.suggestedText,
              dedupeKey: entry.candidate.dedupeKey,
              confidence: entry.candidate.confidence,
              earliestMs: entry.earliestMs,
              latestMs: entry.latestMs,
              timezone: entry.timezone,
              ...(entry.item.sourceMessageId ? { sourceMessageId: entry.item.sourceMessageId } : {}),
              ...(entry.item.sourceRunId ? { sourceRunId: entry.item.sourceRunId } : {}),
            },
            nowMs,
          );
        }
        processed += items.length;
      }
      return processed;
    } finally {
      this.draining = false;
    }
  }

  /** Clears any pending debounce timer + queued work (shutdown / tests). */
  reset(): void {
    if (this.timer) this.clearTimer(this.timer);
    this.timer = null;
    this.queue = [];
    this.draining = false;
    this.overflowWarned = false;
  }
}

/**
 * Builds the prompt surfaced to the unattended run for a due commitment. The follow-up is the
 * commitment's suggestedText; it is delivered through the same [SILENT]/isolated path so a run
 * that decides there is nothing to say still suppresses delivery.
 */
export function buildCommitmentSurfacePrompt(commitment: CommitmentRecord): string {
  return [
    "A previously-inferred follow-up is now due. Decide whether it is still worth surfacing to the user.",
    `Follow-up: ${commitment.suggestedText}`,
    `Context for this follow-up (do not quote verbatim): ${commitment.reason}`,
  ].join("\n");
}

/** Synthetic scheduleId for a commitment-surfacing task → unattended [SILENT]/isolated path. */
export function commitmentTaskScheduleId(commitmentId: string): string {
  return `commitment:${commitmentId}`;
}

export interface SurfaceDueOptions {
  store: CommitmentStore;
  createTask: CommitmentTaskCreator;
  agentId: string;
  sessionKey: string;
  config?: CommitmentRuntimeConfig;
  nowMs?: number;
  limit?: number;
}

/**
 * Surfaces all due commitments for a scope: creates a one-shot AgentTask per commitment (routed
 * unattended via the synthetic scheduleId), records the taskId, and marks the commitment sent.
 * NO-OP when commitments are disabled. Returns the created tasks.
 *
 * The extractor NEVER calls this; only a periodic check / TaskScheduler integration does.
 */
export async function surfaceDueCommitments(options: SurfaceDueOptions): Promise<AgentTask[]> {
  const resolved = resolveCommitmentsConfig(options.config);
  if (!resolved.enabled) return [];
  const nowMs = options.nowMs ?? Date.now();
  const due = await options.store.listDue({
    agentId: options.agentId,
    sessionKey: options.sessionKey,
    nowMs,
    ...(options.limit !== undefined ? { limit: options.limit } : {}),
    expireAfterHours: resolved.expireAfterHours,
    maxPerDay: resolved.maxPerDay,
  });
  const created: AgentTask[] = [];
  for (const commitment of due) {
    const task = await options.createTask({
      prompt: buildCommitmentSurfacePrompt(commitment),
      scheduleId: commitmentTaskScheduleId(commitment.id),
      source: "commitment",
      metadata: { commitmentId: commitment.id, channel: commitment.channel },
    });
    await options.store.setTaskId(commitment.id, task.id, nowMs);
    await options.store.markStatus([commitment.id], "sent", nowMs);
    created.push(task);
  }
  return created;
}
