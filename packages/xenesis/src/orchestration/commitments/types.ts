/**
 * P6 (e): Commitments subsystem (ported from OpenClaw `src/commitments/`).
 *
 * A commitment is an INFERRED future follow-up — a useful check-in opportunity the user did
 * NOT explicitly schedule. Explicit "remind me / schedule this" requests are cron-owned and
 * MUST be skipped by the extractor. When a commitment's due window opens, the scheduler turns
 * it into a one-shot AgentTask so it flows through the SAME isolated-run + [SILENT] path as a
 * scheduled run. The extractor itself NEVER schedules cron — it only writes commitment records.
 */

export type CommitmentKind = 'event_check_in' | 'deadline_check' | 'care_check_in' | 'open_loop';

export type CommitmentSensitivity = 'routine' | 'personal' | 'care';

export type CommitmentStatus = 'pending' | 'sent' | 'dismissed' | 'snoozed' | 'expired';

export type CommitmentSource = 'inferred_user_context' | 'agent_promise';

/** Routing/identity scope. Kept off the extractor prompt (it sees only itemId + text). */
export interface CommitmentScope {
  agentId: string;
  sessionKey: string;
  channel: string;
  accountId?: string;
  to?: string;
  threadId?: string;
  senderId?: string;
}

export interface CommitmentDueWindow {
  earliestMs: number;
  latestMs: number;
  timezone: string;
}

export type CommitmentRecord = CommitmentScope & {
  id: string;
  kind: CommitmentKind;
  sensitivity: CommitmentSensitivity;
  source: CommitmentSource;
  status: CommitmentStatus;
  reason: string;
  suggestedText: string;
  dedupeKey: string;
  confidence: number;
  dueWindow: CommitmentDueWindow;
  sourceMessageId?: string;
  sourceRunId?: string;
  createdAtMs: number;
  updatedAtMs: number;
  attempts: number;
  lastAttemptAtMs?: number;
  sentAtMs?: number;
  dismissedAtMs?: number;
  snoozedUntilMs?: number;
  expiredAtMs?: number;
  /** The AgentTask id created when this commitment's due window opened (one-shot delivery). */
  taskId?: string;
};

/** A model-proposed commitment, before validation against thresholds / future-due checks. */
export interface CommitmentCandidate {
  itemId: string;
  kind: CommitmentKind;
  sensitivity: CommitmentSensitivity;
  source: CommitmentSource;
  reason: string;
  suggestedText: string;
  dedupeKey: string;
  confidence: number;
  dueWindow: {
    earliest: string;
    latest?: string;
    timezone?: string;
  };
}

/** One completed interactive turn, hydrated with existing-pending context for the extractor. */
export type CommitmentExtractionItem = CommitmentScope & {
  itemId: string;
  nowMs: number;
  timezone: string;
  userText: string;
  assistantText?: string;
  sourceMessageId?: string;
  sourceRunId?: string;
  existingPending: Array<{
    kind: CommitmentKind;
    reason: string;
    dedupeKey: string;
    earliestMs: number;
    latestMs: number;
  }>;
};

export interface CommitmentExtractionBatchResult {
  candidates: CommitmentCandidate[];
}
