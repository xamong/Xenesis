/**
 * S7 — Event-sourced session resume.
 *
 * A typed, serializable snapshot of the per-run state that an `AgentRunner` must
 * restore in order to continue an interrupted run at the last turn boundary
 * WITHOUT replaying past events (seed-state, never replay). This is captured into
 * an always-on `run_snapshot` JSONL event each turn and restored by
 * `resumeAgentPipeline`.
 *
 * The user-derived state (forbidden tools, request constraints, tool
 * preferences, prompt tool priority) is intentionally NOT snapshotted — it is
 * re-derived from the recovered user message on resume.
 */
export interface ResumableRunState {
  turns: number;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  recovery: {
    projectAnalysisEvidenceRecoveryCount: number;
    explicitToolCompletionRecoveryCount: number;
    fileMutationRequiredRecoveryCount: number;
    maxOutputTokensRecoveryCount: number;
    toolRecoveryFinalizationRecoveryCount: number;
    repositoryRecommendationRecoveryUsed: boolean;
    falseUnavailableToolRecoveryUsed: boolean;
  };
  successfulToolNames: string[];
  attemptedToolNames: string[];
  successfulEvidencePaths: string[];
  successfulEvidenceToolCount: number;
  successfulMutationCount: number;
  mutationSinceLastRead: boolean;
  verificationRecoveryCounts: Array<[string, number]>;
  autoVerificationRepairSignatures: string[];
  verificationRepairExtensionActive: boolean;
  recentCompactionSavedRatios: number[];
  previousCompactSummary?: string;
  stopHookContinuationCount: number;
  messageSeq: number;
  alwaysAllowedTools?: string[];
  pendingApproval?: {
    toolCallId: string;
    toolName: string;
    toolInput: unknown;
    approvalId: string;
    reason: string;
    riskLevel: string;
    summary: string;
    preview?: string;
  };
}

/**
 * Structural guard for reads. A `run_snapshot` event read from a (possibly
 * older / hand-edited / partially-written) JSONL log is untrusted; this guard
 * lets resume degrade gracefully (fall back to message-only resume) instead of
 * crashing on a malformed snapshot.
 */
export function isResumableRunState(value: unknown): value is ResumableRunState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const num = (x: unknown) => typeof x === "number" && Number.isFinite(x);
  const strArr = (x: unknown) => Array.isArray(x) && x.every((s) => typeof s === "string");
  if (!num(v.turns) || !num(v.messageSeq) || !num(v.stopHookContinuationCount)) return false;
  if (!num(v.successfulEvidenceToolCount) || !num(v.successfulMutationCount)) return false;
  if (!v.usage || typeof v.usage !== "object") return false;
  const u = v.usage as Record<string, unknown>;
  if (!num(u.inputTokens) || !num(u.outputTokens) || !num(u.totalTokens)) return false;
  if (!v.recovery || typeof v.recovery !== "object") return false;
  const r = v.recovery as Record<string, unknown>;
  if (
    !num(r.projectAnalysisEvidenceRecoveryCount) ||
    !num(r.explicitToolCompletionRecoveryCount) ||
    !num(r.fileMutationRequiredRecoveryCount) ||
    !num(r.maxOutputTokensRecoveryCount) ||
    !num(r.toolRecoveryFinalizationRecoveryCount)
  ) {
    return false;
  }
  if (
    typeof r.repositoryRecommendationRecoveryUsed !== "boolean" ||
    typeof r.falseUnavailableToolRecoveryUsed !== "boolean"
  ) {
    return false;
  }
  if (
    !strArr(v.successfulToolNames) ||
    !strArr(v.attemptedToolNames) ||
    !strArr(v.successfulEvidencePaths) ||
    !strArr(v.autoVerificationRepairSignatures)
  ) {
    return false;
  }
  if (!Array.isArray(v.verificationRecoveryCounts) || !Array.isArray(v.recentCompactionSavedRatios)) return false;
  if (
    typeof v.verificationRepairExtensionActive !== "boolean" ||
    typeof v.mutationSinceLastRead !== "boolean"
  ) {
    return false;
  }
  if (v.previousCompactSummary !== undefined && typeof v.previousCompactSummary !== "string") return false;
  if (v.alwaysAllowedTools !== undefined && !strArr(v.alwaysAllowedTools)) return false;
  if (v.pendingApproval !== undefined && (typeof v.pendingApproval !== "object" || v.pendingApproval === null)) return false;
  return true;
}

/**
 * The loop-local + instance state that an `AgentRunner.run()` turn needs in order
 * to build a `ResumableRunState`. Several of these are LOCALS inside `run()`
 * (turns, the recovery counters, the Sets, `recentCompactionSavedRatios`), so
 * `buildRunSnapshot` is called inline in the loop where those locals are in
 * scope — this keeps AgentRunner's internals out of this module while still
 * producing a single typed snapshot object.
 */
export interface RunSnapshotInput {
  turns: number;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  projectAnalysisEvidenceRecoveryCount: number;
  explicitToolCompletionRecoveryCount: number;
  fileMutationRequiredRecoveryCount: number;
  maxOutputTokensRecoveryCount: number;
  toolRecoveryFinalizationRecoveryCount: number;
  repositoryRecommendationRecoveryUsed: boolean;
  falseUnavailableToolRecoveryUsed: boolean;
  successfulToolNames: Set<string>;
  attemptedToolNames: Set<string>;
  successfulEvidencePaths: Set<string>;
  successfulEvidenceToolCount: number;
  successfulMutationCount: number;
  mutationSinceLastRead: boolean;
  verificationRecoveryCounts: Map<string, number>;
  autoVerificationRepairSignatures: Set<string>;
  verificationRepairExtensionActive: boolean;
  recentCompactionSavedRatios: number[];
  previousCompactSummary?: string;
  stopHookContinuationCount: number;
  messageSeq: number;
  alwaysAllowedTools?: Set<string>;
  pendingApproval?: ResumableRunState["pendingApproval"];
}

export function buildRunSnapshot(input: RunSnapshotInput): ResumableRunState {
  return {
    turns: input.turns,
    usage: {
      inputTokens: input.usage.inputTokens,
      outputTokens: input.usage.outputTokens,
      totalTokens: input.usage.totalTokens
    },
    recovery: {
      projectAnalysisEvidenceRecoveryCount: input.projectAnalysisEvidenceRecoveryCount,
      explicitToolCompletionRecoveryCount: input.explicitToolCompletionRecoveryCount,
      fileMutationRequiredRecoveryCount: input.fileMutationRequiredRecoveryCount,
      maxOutputTokensRecoveryCount: input.maxOutputTokensRecoveryCount,
      toolRecoveryFinalizationRecoveryCount: input.toolRecoveryFinalizationRecoveryCount,
      repositoryRecommendationRecoveryUsed: input.repositoryRecommendationRecoveryUsed,
      falseUnavailableToolRecoveryUsed: input.falseUnavailableToolRecoveryUsed
    },
    successfulToolNames: Array.from(input.successfulToolNames),
    attemptedToolNames: Array.from(input.attemptedToolNames),
    successfulEvidencePaths: Array.from(input.successfulEvidencePaths),
    successfulEvidenceToolCount: input.successfulEvidenceToolCount,
    successfulMutationCount: input.successfulMutationCount,
    mutationSinceLastRead: input.mutationSinceLastRead,
    verificationRecoveryCounts: Array.from(input.verificationRecoveryCounts.entries()),
    autoVerificationRepairSignatures: Array.from(input.autoVerificationRepairSignatures),
    verificationRepairExtensionActive: input.verificationRepairExtensionActive,
    recentCompactionSavedRatios: [...input.recentCompactionSavedRatios],
    ...(input.previousCompactSummary !== undefined
      ? { previousCompactSummary: input.previousCompactSummary }
      : {}),
    stopHookContinuationCount: input.stopHookContinuationCount,
    messageSeq: input.messageSeq,
    alwaysAllowedTools: Array.from(input.alwaysAllowedTools ?? []),
    ...(input.pendingApproval ? { pendingApproval: input.pendingApproval } : {})
  };
}
