import type { AgentMessage, ToolCall } from "./messages.js";
import type { ToolEvent } from "../tools/types.js";
import type { PermissionRiskLevel } from "../config/index.js";
import type { PermissionStatus } from "../permissions/policy.js";
import type { ProviderFailureKind } from "./providerFailurePolicy.js";
import type { ResumableRunState } from "./resume/ResumableRunState.js";

export type UserMessageEvent = {
  type: "user_message";
  message: Extract<AgentMessage, { role: "user" }>;
};

export type AssistantMessageEvent = {
  type: "assistant_message";
  message: Extract<AgentMessage, { role: "assistant" }>;
};

export type AssistantDeltaEvent = {
  type: "assistant_delta";
  delta: string;
};

export type ProviderRetryEvent = {
  type: "provider_retry";
  provider: string;
  attempt: number;
  maxRetries: number;
  message: string;
  failureKind?: ProviderFailureKind;
  retryable?: boolean;
  remainingRetries?: number;
};

export type ProviderFallbackEvent = {
  type: "provider_fallback";
  from: string;
  to: string;
  message: string;
  failureKind?: ProviderFailureKind;
  fromModel?: string;
  toModel?: string;
  modelSwitch?: boolean;
};

export type ContextCompactEvent = {
  type: "context_compact";
  originalMessages: number;
  compactedMessages: number;
  keptMessages: number;
  summary?: string;
  summarizedFrom?: number;
  summarizedTo?: number;
};

export type ContextRecoveryEvent = {
  type: "context_recovery";
  reason: "provider_context_limit";
  message: string;
  originalMessages: number;
  compactedMessages: number;
};

export type ArtifactEvent = {
  type: "artifact";
  artifactId: string;
  title: string;
  kind: string;
};

export type WorkspaceChangeEvent = {
  type: "workspace_change";
  changeId: string;
  action: string;
  path: string;
  toolName: string;
};

export type RunLifecycleStatus =
  | "started"
  | "provider_request"
  | "tool_call"
  | "awaiting_approval"
  | "tool_result"
  | "completed"
  | "stopped"
  | "failed"
  | "cancelled";

export type RunLifecyclePhase =
  | "planning"
  | "executing"
  | "approving"
  | "terminal";

export type RunStateEvent = {
  type: "run_state";
  status: RunLifecycleStatus;
  phase: RunLifecyclePhase;
  turns: number;
  summary: string;
  toolCallId?: string;
  toolName?: string;
  reason?: string;
  error?: string;
};

export type WorkflowStepStatus = "running" | "completed" | "failed";

export interface WorkflowStepSummary {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowRunSummary {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export type WorkflowStepEvent = {
  type: "workflow_step";
  workflow: WorkflowRunSummary;
  step: WorkflowStepSummary;
  index: number;
  total: number;
  status: WorkflowStepStatus;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  exitCode?: number;
  error?: string;
};

export type RunStageName = "run" | "verify" | "repair" | "report";
export type RunStageStatus = "started" | "completed" | "skipped" | "failed" | "blocked";

export type RunStageEvent = {
  type: "run_stage";
  stage: RunStageName;
  status: RunStageStatus;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  reason?: string;
};

export type ContextSourceKind =
  | "base"
  | "capability_policy"
  | "tool_policy"
  | "mode"
  | "ide"
  | "saved_plan"
  | "workspace_context"
  | "background_task"
  | "agent_message"
  | "operational_failure"
  | "workflow"
  | "skill"
  | "memory";

export type ContextSourceEvent = {
  type: "context_source";
  source: ContextSourceKind;
  name: string;
  injected: boolean;
  itemCount?: number;
  detail?: string;
  usedTokens?: number;
  tokenBudget?: number;
  droppedReason?: "expired" | "conflict_replaced" | "token_budget";
};

export type AgentIntent =
  | "default"
  | "analyze"
  | "explain"
  | "propose"
  | "plan"
  | "work"
  | "debug"
  | "refactor"
  | "long_task"
  | "research";

export type IntentRouteEvent = {
  type: "intent_route";
  intent: AgentIntent;
  mode?: "plan" | "work";
  approvalMode?: "safe" | "auto" | "readonly";
  reason: string;
};

export type ToolCallEvent = {
  type: "tool_call";
  toolCall: ToolCall;
};

export type ToolResultEvent = {
  type: "tool_result";
  ok: boolean;
  message: Extract<AgentMessage, { role: "tool" }>;
};

export type ToolResultStoredEvent = {
  type: "tool_result_stored";
  toolCallId: string;
  name: string;
  path: string;
  originalChars: number;
  previewChars: number;
};

export type ToolPolicyAuditStatus = "allow" | "deny";

export type ToolPolicyAuditEvent = {
  type: "tool_policy_audit";
  toolCallId: string;
  name: string;
  policyName: string;
  status: ToolPolicyAuditStatus;
  reason: string;
  nextAction?: string;
  requiredBefore: string[];
  missingBefore: string[];
  requiredBeforeAny?: string[];
  missingBeforeAny?: string[];
  priorityTools?: string[];
};

export type ToolPolicySnapshotEvent = {
  type: "tool_policy_snapshot";
  policyName: string;
  priorityTools: string[];
  requiredBefore: Record<string, string[]>;
  requiredBeforeAny: Record<string, string[]>;
};

export type ToolChoiceAuditStatus = "followed_priority" | "missed_priority";

export type ToolChoiceAuditEvent = {
  type: "tool_choice_audit";
  toolCallId: string;
  name: string;
  status: ToolChoiceAuditStatus;
  reason: string;
  priorityReasons: string[];
  priorityTools: string[];
  unmetPriorityTools: string[];
};

export type ToolRuntimeEvent = {
  type: "tool_event";
  event: ToolEvent;
};

export interface ApprovalRequest {
  toolCallId: string;
  approvalId: string;
  name: string;
  input: unknown;
  reason: string;
  riskLevel: PermissionRiskLevel;
  summary: string;
  preview?: string;
  severity?: "info" | "warning" | "critical";
  allowedDecisions?: Array<"approve" | "deny" | "always-allow">;
  timeoutMs?: number;
  timeoutBehavior?: "allow" | "deny";
}

export interface ApprovalDecision {
  toolCallId: string;
  approvalId: string;
  approved: boolean;
  decision: "approve" | "deny" | "always-allow" | "timeout";
  resolvedAt: string;
}

export type ApprovalResolvedEvent = {
  type: "approval_resolved";
  toolCallId: string;
  approvalId: string;
  approved: boolean;
  decision: ApprovalDecision["decision"];
  resolvedAt: string;
};

export type PermissionAuditEvent = {
  type: "permission_audit";
  toolCallId: string;
  name: string;
  status: PermissionStatus;
  reason: string;
  riskLevel: PermissionRiskLevel;
  summary: string;
  preview?: string;
  hardDeny: boolean;
};

export type PermissionRequestEvent = {
  type: "permission_request";
  request: ApprovalRequest;
};

export interface AgentRunUsageSnapshot {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export type DoneEvent = {
  type: "done";
  content: string;
  turns: number;
  usage?: AgentRunUsageSnapshot;
};

export type StoppedEvent = {
  type: "stopped";
  reason: "max_turns" | "user_input_required" | "cancelled" | "budget";
  turns: number;
  usage?: AgentRunUsageSnapshot;
};

export type IncompleteRunEvent = {
  type: "incomplete_run";
  reason: StoppedEvent["reason"] | "provider_error";
  turns: number;
  summary: string;
  usage?: AgentRunUsageSnapshot;
};

export type VerificationResultEvent = {
  type: "verification_result";
  status: "passed" | "failed" | "skipped" | "error";
  attempt: number;
  maxAttempts: number;
  failedCommands: string[];
};

export type RepairDecisionEvent = {
  type: "repair_decision";
  status: "continue" | "completed" | "skipped" | "blocked" | "auto_executed" | "failed";
  reason: string;
  attempt: number;
  maxAttempts: number;
  failedCommands: string[];
};

export type RunSelfReviewStatus = "pass" | "warn" | "fail";
export type RunSelfReviewArea =
  | "completion"
  | "verification"
  | "tool_choice"
  | "tool_recovery"
  | "permission"
  | "provider"
  | "context"
  | "handoff";
export type RunSelfReviewSeverity = "low" | "medium" | "high";

export interface RunSelfReviewFinding {
  area: RunSelfReviewArea;
  severity: RunSelfReviewSeverity;
  message: string;
  nextAction: string;
}

export type RunSelfReviewEvent = {
  type: "run_self_review";
  status: RunSelfReviewStatus;
  score: number;
  findings: RunSelfReviewFinding[];
  nextActions: string[];
};

export type ErrorEvent = {
  type: "error";
  message: string;
};

/**
 * S7 — always-on per-turn snapshot of the resumable run state. Persisted to the
 * JSONL session log but EXCLUDED from the public pipeline event stream (like
 * `assistant_delta`): callers should never observe it.
 */
export type RunSnapshotEvent = {
  type: "run_snapshot";
  state: ResumableRunState;
};

export type SessionEvent =
  | UserMessageEvent
  | AssistantMessageEvent
  | ProviderRetryEvent
  | ProviderFallbackEvent
  | ContextRecoveryEvent
  | ContextCompactEvent
  | ArtifactEvent
  | WorkspaceChangeEvent
  | RunStateEvent
  | RunSnapshotEvent
  | WorkflowStepEvent
  | RunStageEvent
  | ContextSourceEvent
  | IntentRouteEvent
  | ToolCallEvent
  | ToolPolicySnapshotEvent
  | ToolChoiceAuditEvent
  | ToolResultStoredEvent
  | ToolResultEvent
  | ToolPolicyAuditEvent
  | ToolRuntimeEvent
  | PermissionAuditEvent
  | PermissionRequestEvent
  | ApprovalResolvedEvent
  | DoneEvent
  | IncompleteRunEvent
  | StoppedEvent
  | VerificationResultEvent
  | RepairDecisionEvent
  | RunSelfReviewEvent
  | ErrorEvent;

export type AgentRunEvent = SessionEvent | AssistantDeltaEvent;

export type RecordedSessionEvent = SessionEvent & {
  sessionId: string;
  traceId?: string;
  timestamp: string;
  seq?: number;
};
