import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { ArtifactRecord } from '../artifacts/index.js';
import type { WorkspaceChangeRecord, WorkspaceCheckpoint } from '../changes/index.js';
import { buildProviderQualityMetrics, type ProviderQualityMetrics } from '../core/agentCapabilityPolicy.js';
import type {
  ContextSourceEvent,
  RunSelfReviewEvent,
  RunStageEvent,
  ToolChoiceAuditEvent,
  ToolPolicyAuditEvent,
  ToolPolicySnapshotEvent,
  WorkflowStepEvent,
} from '../core/events.js';
import type { SessionLogRecord } from '../sessions/index.js';
import type { VerificationReport, VerificationStatus } from '../verification/index.js';

export interface RunReportToolSummary {
  name: string;
  calls: number;
  failures: number;
}

export interface RunReportHandoffSummary {
  toolCallId: string;
  handoffId?: string;
  title?: string;
  taskCount: number;
  dependencyCount: number;
  dependencyLabelCount: number;
  labels: string[];
  queued: boolean;
}

export interface RunReportRepairRecord {
  sessionId: string;
  createdAt: string;
  status: 'completed' | 'failed';
  sourceVerificationCreatedAt?: string;
  failedCommands: string[];
  attempt?: number;
  verificationStatus?: VerificationStatus;
  rollback?: {
    status: 'reverted' | 'skipped' | 'failed';
    changeCount: number;
    message?: string;
  };
  acceptance?: {
    status: 'accepted' | 'skipped' | 'failed';
    changeCount: number;
    message?: string;
  };
}

export type RunReportWorkflowStep = Omit<WorkflowStepEvent, 'type'>;
export type RunReportStage = Omit<RunStageEvent, 'type'>;
export type RunReportContextSource = Omit<ContextSourceEvent, 'type'>;
export type RunReportSelfReview = Omit<RunSelfReviewEvent, 'type'>;
export type RunReportToolChoiceAudit = Omit<ToolChoiceAuditEvent, 'type'>;
export type RunReportToolPolicyAudit = Omit<ToolPolicyAuditEvent, 'type'>;
export type RunReportToolPolicySnapshot = Omit<ToolPolicySnapshotEvent, 'type'>;

export interface RunReportToolChoiceReasonSummary {
  total: number;
  followedCount: number;
  missedCount: number;
}

export interface RunReportToolChoiceSummary {
  total: number;
  followedCount: number;
  missedCount: number;
  followRate: number;
  missedRate: number;
  byReason: Record<string, RunReportToolChoiceReasonSummary>;
  items: RunReportToolChoiceAudit[];
}

export interface RunReportToolPolicySummary {
  policyName: string;
  priorityTools: string[];
  requiredBefore: Record<string, string[]>;
  requiredBeforeAny: Record<string, string[]>;
  allowCount: number;
  denyCount: number;
  nextActions: string[];
}

export type RunReportToolRecoveryKind =
  | 'missing_tool'
  | 'invalid_tool_input'
  | 'permission_denied'
  | 'approval_denied'
  | 'tool_failed'
  | 'tool_policy_denied';

export interface RunReportToolRecoveryItem {
  kind: RunReportToolRecoveryKind;
  toolCallId: string;
  toolName: string;
  reason: string;
  nextAction?: string;
  recovered: boolean;
  recoveredByToolCallId?: string;
  recoveredByToolName?: string;
}

export interface RunReportToolRecoverySummary {
  total: number;
  recoveredCount: number;
  unrecoveredCount: number;
  byKind: Record<RunReportToolRecoveryKind, number>;
  items: RunReportToolRecoveryItem[];
}

export type RunReportDecisionKind = 'context' | 'tool_choice' | 'tool_policy' | 'tool_recovery' | 'repair' | 'handoff';

export interface RunReportDecisionTraceEntry {
  kind: RunReportDecisionKind;
  title: string;
  reason: string;
  status?: string;
  related?: string[];
}

export interface RunReportMetrics {
  success: boolean;
  qualityScore: number;
  degradationReasons: string[];
  contextInjectionCount: number;
  decisionTraceCount: number;
  providerRetryCount: number;
  providerFallbackCount: number;
  contextRecoveryCount: number;
  verificationAfterChangeMissing: boolean;
  verificationPassed?: boolean;
  verificationPassRate?: number;
  repairAttemptCount: number;
  repairSuccess: boolean;
  toolFailureRate: number;
  shellUsageRatio: number;
  permissionAskCount: number;
  permissionDenyCount: number;
  toolChoiceAuditCount: number;
  toolPriorityFollowRate: number;
  toolPriorityMissedCount: number;
  toolPolicyAllowCount: number;
  toolPolicyDenyCount: number;
  toolRecoveryHintCount: number;
  toolRecoveryRecoveredCount: number;
  toolRecoveryUnrecoveredCount: number;
  contextCompactCount: number;
  maxTurnStop: boolean;
  userInputRequired: boolean;
  stageFailureCount: number;
  blocked: boolean;
  handoffUsed: boolean;
  handoffCount: number;
  handoffTaskCount: number;
  handoffDependencyCount: number;
}

export interface RunReport {
  id: string;
  sessionId: string;
  traceId?: string;
  createdAt: string;
  status: string;
  phase?: string;
  turns: number;
  eventCount: number;
  messageCount: number;
  toolCallCount: number;
  toolResultCount: number;
  tools: RunReportToolSummary[];
  changes: WorkspaceChangeRecord[];
  artifacts: ArtifactRecord[];
  workflowSteps?: RunReportWorkflowStep[];
  stages?: RunReportStage[];
  contextSources?: RunReportContextSource[];
  toolChoice?: RunReportToolChoiceSummary;
  toolPolicyAudits?: RunReportToolPolicyAudit[];
  toolPolicy?: RunReportToolPolicySummary;
  toolRecovery?: RunReportToolRecoverySummary;
  handoffs?: RunReportHandoffSummary[];
  decisionTrace?: RunReportDecisionTraceEntry[];
  providerQuality?: ProviderQualityMetrics;
  metrics: RunReportMetrics;
  selfReview: RunReportSelfReview;
  checkpoint?: WorkspaceCheckpoint;
  verification?: VerificationReport;
  repairs?: RunReportRepairRecord[];
}

export interface BuildRunReportInput {
  sessionId: string;
  records: SessionLogRecord[];
  changes: WorkspaceChangeRecord[];
  artifacts: ArtifactRecord[];
  checkpoint?: WorkspaceCheckpoint;
  verification?: VerificationReport;
  repairs?: RunReportRepairRecord[];
  createdAt?: string;
}

export interface FileRunReportStoreOptions {
  xenesisHome: string;
  now?: () => Date;
}

function isMessageRecord(record: SessionLogRecord) {
  return record.type === 'user_message' || record.type === 'assistant_message' || record.type === 'tool_result';
}

function latestRunState(records: SessionLogRecord[]) {
  return records.filter((record) => record.type === 'run_state').at(-1) as
    | (SessionLogRecord & { type: 'run_state'; status: string; phase: string; turns: number })
    | undefined;
}

function terminalStatus(records: SessionLogRecord[]) {
  const state = latestRunState(records);
  if (state) return { status: state.status, phase: state.phase, turns: state.turns };
  const stopped = records.find(
    (record): record is SessionLogRecord & { type: 'stopped'; turns: number } => record.type === 'stopped',
  );
  if (stopped) return { status: 'stopped', turns: stopped.turns };
  const done = records.find(
    (record): record is SessionLogRecord & { type: 'done'; turns: number } => record.type === 'done',
  );
  if (done) return { status: 'completed', turns: done.turns };
  const error = records.find((record) => record.type === 'error');
  if (error) return { status: 'failed', turns: 0 };
  return { status: 'unknown', turns: 0 };
}

function summarizeTools(records: SessionLogRecord[]): RunReportToolSummary[] {
  const summaries = new Map<string, RunReportToolSummary>();
  for (const record of records) {
    if (record.type === 'tool_call') {
      const summary = summaries.get(record.toolCall.name) ?? {
        name: record.toolCall.name,
        calls: 0,
        failures: 0,
      };
      summary.calls += 1;
      summaries.set(record.toolCall.name, summary);
    }
    if (record.type === 'tool_result' && !record.ok) {
      const summary = summaries.get(record.message.name) ?? {
        name: record.message.name,
        calls: 0,
        failures: 0,
      };
      summary.failures += 1;
      summaries.set(record.message.name, summary);
    }
  }
  return Array.from(summaries.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function compactLabel(value: string) {
  return value.length > 80 ? `${value.slice(0, 77)}...` : value;
}

function handoffTaskLabel(task: Record<string, unknown>) {
  const prompt = optionalString(task.prompt);
  return (
    optionalString(task.label) ??
    optionalString(task.title) ??
    optionalString(task.name) ??
    (prompt ? compactLabel(prompt) : undefined)
  );
}

function parseHandoffId(content: string) {
  return content.match(/\bhandoffId:\s*([A-Za-z0-9_.-]+)/i)?.[1];
}

function parseQueuedTaskCount(content: string) {
  const parsed = Number(content.match(/\bqueued\s+(\d+)\s+task/i)?.[1]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function summarizeHandoffs(records: SessionLogRecord[]): RunReportHandoffSummary[] {
  const successfulResults = new Map<string, string>();
  for (const record of records) {
    if (record.type === 'tool_result' && record.ok && record.message.name === 'task_handoff') {
      successfulResults.set(record.message.toolCallId, record.message.content);
    }
  }

  const handoffs: RunReportHandoffSummary[] = [];
  for (const record of records) {
    if (record.type !== 'tool_call' || record.toolCall.name !== 'task_handoff') continue;
    const resultContent = successfulResults.get(record.toolCall.id);
    if (!resultContent) continue;

    const input = isObject(record.toolCall.input) ? record.toolCall.input : {};
    const action = optionalString(input.action);
    if (action && action !== 'queue') continue;

    const rawTasks = Array.isArray(input.tasks) ? input.tasks : [];
    const tasks = rawTasks.filter(isObject);
    const labels: string[] = [];
    let dependencyCount = 0;
    let dependencyLabelCount = 0;

    for (const task of tasks) {
      const label = handoffTaskLabel(task);
      if (label) labels.push(label);
      const dependsOn = stringArray(task.dependsOn);
      const dependsOnLabels = stringArray(task.dependsOnLabels);
      dependencyCount += dependsOn.length + dependsOnLabels.length;
      dependencyLabelCount += dependsOnLabels.length;
    }

    const taskCount = tasks.length > 0 ? tasks.length : (parseQueuedTaskCount(resultContent) ?? 0);
    const handoffId = parseHandoffId(resultContent);
    const title = optionalString(input.title);
    handoffs.push({
      toolCallId: record.toolCall.id,
      ...(handoffId ? { handoffId } : {}),
      ...(title ? { title } : {}),
      taskCount,
      dependencyCount,
      dependencyLabelCount,
      labels,
      queued: true,
    });
  }

  return handoffs;
}

function workflowStepKey(step: WorkflowStepEvent) {
  return [step.workflow.name, step.index, step.total, step.step.name].join(':');
}

function summarizeWorkflowSteps(records: SessionLogRecord[]): RunReportWorkflowStep[] {
  const steps = new Map<string, RunReportWorkflowStep>();
  for (const record of records) {
    if (record.type !== 'workflow_step') continue;
    const { type: _type, sessionId: _sessionId, traceId: _traceId, timestamp: _timestamp, ...step } = record;
    steps.set(workflowStepKey(record), step);
  }
  return Array.from(steps.values()).sort((left, right) => left.index - right.index);
}

function summarizeStages(records: SessionLogRecord[]): RunReportStage[] {
  const stages = new Map<string, RunReportStage>();
  for (const record of records) {
    if (record.type !== 'run_stage') continue;
    const { type: _type, sessionId: _sessionId, traceId: _traceId, timestamp: _timestamp, ...stage } = record;
    stages.set(stage.stage, stage);
  }
  return Array.from(stages.values()).sort((left, right) => left.stage.localeCompare(right.stage));
}

function summarizeContextSources(records: SessionLogRecord[]): RunReportContextSource[] {
  const sources = new Map<string, RunReportContextSource>();
  for (const record of records) {
    if (record.type !== 'context_source') continue;
    const { type: _type, sessionId: _sessionId, traceId: _traceId, timestamp: _timestamp, ...source } = record;
    sources.set(`${source.source}:${source.name}`, source);
  }
  return Array.from(sources.values()).sort((left, right) =>
    `${left.source}:${left.name}`.localeCompare(`${right.source}:${right.name}`),
  );
}

function summarizeToolChoiceAudits(records: SessionLogRecord[]): RunReportToolChoiceAudit[] {
  return records
    .filter((record): record is SessionLogRecord & { type: 'tool_choice_audit' } => record.type === 'tool_choice_audit')
    .map((record) => {
      const { type: _type, sessionId: _sessionId, traceId: _traceId, timestamp: _timestamp, ...audit } = record;
      return audit;
    });
}

function summarizeToolChoice(audits: RunReportToolChoiceAudit[]): RunReportToolChoiceSummary | undefined {
  if (audits.length === 0) return undefined;

  const followedCount = audits.filter((audit) => audit.status === 'followed_priority').length;
  const missedCount = audits.filter((audit) => audit.status === 'missed_priority').length;
  const byReason: Record<string, RunReportToolChoiceReasonSummary> = {};

  for (const audit of audits) {
    for (const reason of audit.priorityReasons.length > 0 ? audit.priorityReasons : ['unknown']) {
      byReason[reason] ??= { total: 0, followedCount: 0, missedCount: 0 };
      byReason[reason].total += 1;
      if (audit.status === 'followed_priority') byReason[reason].followedCount += 1;
      if (audit.status === 'missed_priority') byReason[reason].missedCount += 1;
    }
  }

  return {
    total: audits.length,
    followedCount,
    missedCount,
    followRate: audits.length > 0 ? followedCount / audits.length : 0,
    missedRate: audits.length > 0 ? missedCount / audits.length : 0,
    byReason,
    items: audits,
  };
}

function summarizeToolPolicyAudits(records: SessionLogRecord[]): RunReportToolPolicyAudit[] {
  return records
    .filter((record): record is SessionLogRecord & { type: 'tool_policy_audit' } => record.type === 'tool_policy_audit')
    .map((record) => {
      const { type: _type, sessionId: _sessionId, traceId: _traceId, timestamp: _timestamp, ...audit } = record;
      return audit;
    });
}

function summarizeToolPolicySnapshots(records: SessionLogRecord[]): RunReportToolPolicySnapshot[] {
  return records
    .filter(
      (record): record is SessionLogRecord & { type: 'tool_policy_snapshot' } => record.type === 'tool_policy_snapshot',
    )
    .map((record) => {
      const { type: _type, sessionId: _sessionId, traceId: _traceId, timestamp: _timestamp, ...snapshot } = record;
      return snapshot;
    });
}

function uniqueNonEmpty(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}

function summarizeToolPolicy(
  snapshots: RunReportToolPolicySnapshot[],
  audits: RunReportToolPolicyAudit[],
): RunReportToolPolicySummary | undefined {
  const latestSnapshot = snapshots.at(-1);
  if (!latestSnapshot && audits.length === 0) return undefined;

  const firstAudit = audits[0];
  const policyName = latestSnapshot?.policyName ?? firstAudit?.policyName ?? 'unknown';
  const priorityTools = latestSnapshot?.priorityTools ?? firstAudit?.priorityTools ?? [];
  return {
    policyName,
    priorityTools,
    requiredBefore: latestSnapshot?.requiredBefore ?? {},
    requiredBeforeAny: latestSnapshot?.requiredBeforeAny ?? {},
    allowCount: audits.filter((audit) => audit.status === 'allow').length,
    denyCount: audits.filter((audit) => audit.status === 'deny').length,
    nextActions: uniqueNonEmpty(audits.map((audit) => audit.nextAction)),
  };
}

type ToolRecoveryCandidate = RunReportToolRecoveryItem & {
  index: number;
  recoveryTargets: string[];
};
type FailedToolResultRecord = SessionLogRecord & { type: 'tool_result'; ok: false };
type SuccessfulToolResultRecord = SessionLogRecord & { type: 'tool_result'; ok: true };

function emptyToolRecoveryByKind(): Record<RunReportToolRecoveryKind, number> {
  return {
    missing_tool: 0,
    invalid_tool_input: 0,
    permission_denied: 0,
    approval_denied: 0,
    tool_failed: 0,
    tool_policy_denied: 0,
  };
}

function isFailedToolResult(record: SessionLogRecord): record is FailedToolResultRecord {
  return record.type === 'tool_result' && !record.ok;
}

function isSuccessfulToolResult(record: SessionLogRecord): record is SuccessfulToolResultRecord {
  return record.type === 'tool_result' && record.ok;
}

function classifyFailedToolResult(record: FailedToolResultRecord): {
  kind: RunReportToolRecoveryKind;
  reason: string;
  nextAction?: string;
} {
  const content = record.message.content.trim();
  if (/^Invalid input for tool\b/.test(content)) {
    return {
      kind: 'invalid_tool_input',
      reason: content,
      nextAction: 'Retry the tool with input that matches its schema.',
    };
  }
  if (/^Tool\s+"[^"]+"\s+is not available\./.test(content)) {
    return {
      kind: 'missing_tool',
      reason: content,
      nextAction: 'Choose an available tool or answer without a tool if no suitable tool exists.',
    };
  }
  if (/^Permission denied for tool\b/.test(content)) {
    return {
      kind: 'permission_denied',
      reason: content,
      nextAction: 'Use an allowed tool, request approval, or explain the limitation.',
    };
  }
  if (/^Tool policy\b.*\bdenied tool\b/.test(content) || /^Tool policy denied for tool\b/.test(content)) {
    return {
      kind: 'tool_policy_denied',
      reason: content,
      nextAction: 'Run the required predecessor tool before retrying.',
    };
  }
  return {
    kind: 'tool_failed',
    reason: content || `Tool "${record.message.name}" failed.`,
    nextAction: 'Inspect the failure, adjust the input or context, and retry only if the cause changed.',
  };
}

function successfulToolResults(records: SessionLogRecord[]) {
  return records
    .map((record, index) => ({ record, index }))
    .filter(
      (
        entry,
      ): entry is {
        record: SuccessfulToolResultRecord;
        index: number;
      } => isSuccessfulToolResult(entry.record),
    );
}

function failedToolResultsByCallId(records: SessionLogRecord[]) {
  const failed = new Map<string, FailedToolResultRecord>();
  for (const record of records) {
    if (isFailedToolResult(record)) {
      failed.set(record.message.toolCallId, record);
    }
  }
  return failed;
}

function findRecoveryForCandidate(
  candidate: ToolRecoveryCandidate,
  successes: ReturnType<typeof successfulToolResults>,
) {
  const targetNames =
    candidate.recoveryTargets.length > 0
      ? new Set(candidate.recoveryTargets)
      : candidate.kind === 'missing_tool'
        ? undefined
        : new Set([candidate.toolName]);

  return successes.find(
    ({ record, index }) => index > candidate.index && (!targetNames || targetNames.has(record.message.name)),
  );
}

function publicToolRecoveryItem(candidate: ToolRecoveryCandidate): RunReportToolRecoveryItem {
  const { index: _index, recoveryTargets: _recoveryTargets, ...item } = candidate;
  return item;
}

function summarizeToolRecovery(records: SessionLogRecord[]): RunReportToolRecoverySummary | undefined {
  const candidates = new Map<string, ToolRecoveryCandidate>();
  const failedResults = failedToolResultsByCallId(records);

  const addCandidate = (candidate: ToolRecoveryCandidate) => {
    if (candidates.has(candidate.toolCallId)) return;
    candidates.set(candidate.toolCallId, candidate);
  };

  records.forEach((record, index) => {
    if (record.type === 'tool_policy_audit' && record.status === 'deny') {
      const recoveryTargets = uniqueNonEmpty([
        ...record.missingBefore,
        ...(record.missingBeforeAny ?? []),
        ...record.requiredBefore,
        ...(record.requiredBeforeAny ?? []),
      ]);
      addCandidate({
        kind: 'tool_policy_denied',
        toolCallId: record.toolCallId,
        toolName: record.name,
        reason: record.reason,
        ...(record.nextAction ? { nextAction: record.nextAction } : {}),
        recovered: false,
        index,
        recoveryTargets: recoveryTargets.length > 0 ? recoveryTargets : [record.name],
      });
      return;
    }

    if (record.type === 'permission_audit' && (record.status !== 'allow' || record.hardDeny)) {
      if (record.status === 'ask' && !failedResults.has(record.toolCallId)) return;
      addCandidate({
        kind: record.status === 'ask' ? 'approval_denied' : 'permission_denied',
        toolCallId: record.toolCallId,
        toolName: record.name,
        reason: record.reason,
        nextAction:
          record.status === 'ask'
            ? 'Ask for explicit approval or choose a lower-risk alternative.'
            : 'Use an allowed tool, request approval, or explain the limitation.',
        recovered: false,
        index,
        recoveryTargets: [record.name],
      });
      return;
    }

    if (isFailedToolResult(record)) {
      if (candidates.has(record.message.toolCallId)) return;
      const classification = classifyFailedToolResult(record);
      addCandidate({
        kind: classification.kind,
        toolCallId: record.message.toolCallId,
        toolName: record.message.name,
        reason: classification.reason,
        ...(classification.nextAction ? { nextAction: classification.nextAction } : {}),
        recovered: false,
        index,
        recoveryTargets: classification.kind === 'missing_tool' ? [] : [record.message.name],
      });
    }
  });

  const successes = successfulToolResults(records);
  const items = Array.from(candidates.values())
    .sort((left, right) => left.index - right.index)
    .map((candidate) => {
      const recovery = findRecoveryForCandidate(candidate, successes);
      if (!recovery) return publicToolRecoveryItem(candidate);
      return publicToolRecoveryItem({
        ...candidate,
        recovered: true,
        recoveredByToolCallId: recovery.record.message.toolCallId,
        recoveredByToolName: recovery.record.message.name,
      });
    });

  if (items.length === 0) return undefined;

  const byKind = emptyToolRecoveryByKind();
  for (const item of items) byKind[item.kind] += 1;
  const recoveredCount = items.filter((item) => item.recovered).length;
  return {
    total: items.length,
    recoveredCount,
    unrecoveredCount: items.length - recoveredCount,
    byKind,
    items,
  };
}

function summarizeRepairDecisionTraces(records: SessionLogRecord[]): RunReportDecisionTraceEntry[] {
  return records
    .filter((record): record is SessionLogRecord & { type: 'repair_decision' } => record.type === 'repair_decision')
    .map((record) => ({
      kind: 'repair',
      title: `Repair ${record.status}`,
      reason: record.reason,
      status: record.status,
      related: record.failedCommands,
    }));
}

function summarizeDecisionTrace(
  contextSources: RunReportContextSource[],
  toolChoice: RunReportToolChoiceSummary | undefined,
  toolPolicyAudits: RunReportToolPolicyAudit[],
  toolRecovery: RunReportToolRecoverySummary | undefined,
  handoffs: RunReportHandoffSummary[],
  records: SessionLogRecord[],
): RunReportDecisionTraceEntry[] {
  const decisions: RunReportDecisionTraceEntry[] = [];

  for (const source of contextSources.filter((item) => item.injected)) {
    decisions.push({
      kind: 'context',
      title: `Injected ${source.source} context`,
      reason: source.detail ?? source.name,
      related: [source.name, ...(source.itemCount !== undefined ? [`items:${source.itemCount}`] : [])],
    });
  }

  for (const item of toolChoice?.items ?? []) {
    decisions.push({
      kind: 'tool_choice',
      title: `${item.status === 'missed_priority' ? 'Missed' : 'Followed'} priority for ${item.name}`,
      reason: item.reason,
      status: item.status,
      related: item.status === 'missed_priority' ? item.unmetPriorityTools : item.priorityTools,
    });
  }

  for (const audit of toolPolicyAudits) {
    decisions.push({
      kind: 'tool_policy',
      title: `${audit.status === 'deny' ? 'Denied' : 'Allowed'} ${audit.name} by ${audit.policyName}`,
      reason: audit.nextAction ? `${audit.reason}; next: ${audit.nextAction}` : audit.reason,
      status: audit.status,
      related:
        audit.priorityTools && audit.priorityTools.length > 0
          ? audit.priorityTools
          : [...audit.requiredBefore, ...audit.missingBefore],
    });
  }

  for (const item of toolRecovery?.items ?? []) {
    decisions.push({
      kind: 'tool_recovery',
      title: `${item.recovered ? 'Recovered' : 'Unresolved'} ${item.kind} for ${item.toolName}`,
      reason: item.nextAction ? `${item.reason}; next: ${item.nextAction}` : item.reason,
      status: item.recovered ? 'recovered' : 'unresolved',
      related: [
        item.toolCallId,
        ...(item.recoveredByToolCallId ? [item.recoveredByToolCallId] : []),
        ...(item.recoveredByToolName ? [item.recoveredByToolName] : []),
      ],
    });
  }

  decisions.push(...summarizeRepairDecisionTraces(records));

  for (const handoff of handoffs) {
    decisions.push({
      kind: 'handoff',
      title: `Queued ${handoff.taskCount} background task${handoff.taskCount === 1 ? '' : 's'}`,
      reason: handoff.title ?? handoff.handoffId ?? 'task handoff queued',
      status: handoff.queued ? 'queued' : 'unknown',
      related: handoff.labels,
    });
  }

  return decisions;
}

function buildMetrics(
  terminal: ReturnType<typeof terminalStatus>,
  records: SessionLogRecord[],
  changes: WorkspaceChangeRecord[],
  tools: RunReportToolSummary[],
  handoffs: RunReportHandoffSummary[],
  verification: VerificationReport | undefined,
  repairs: RunReportRepairRecord[] | undefined,
  stages: RunReportStage[],
  toolChoice: RunReportToolChoiceSummary | undefined,
  toolPolicyAudits: RunReportToolPolicyAudit[],
  toolRecovery: RunReportToolRecoverySummary | undefined,
  contextSources: RunReportContextSource[],
  decisionTrace: RunReportDecisionTraceEntry[],
): RunReportMetrics {
  const toolCalls = tools.reduce((sum, tool) => sum + tool.calls, 0);
  const toolFailures = tools.reduce((sum, tool) => sum + tool.failures, 0);
  const shellCalls = tools.filter((tool) => tool.name === 'shell').reduce((sum, tool) => sum + tool.calls, 0);
  const permissionAudits = records.filter((record) => record.type === 'permission_audit');
  const stoppedReasons = records.filter(
    (record): record is SessionLogRecord & { type: 'stopped' } => record.type === 'stopped',
  );
  const repairDecisions = records.filter((record) => record.type === 'repair_decision');
  const blocked =
    stages.some((stage) => stage.status === 'blocked') ||
    repairDecisions.some((record) => record.type === 'repair_decision' && record.status === 'blocked');
  const verificationTotal = verification ? verification.passed + verification.failed : undefined;
  const handoffTaskCount = handoffs.reduce((sum, handoff) => sum + handoff.taskCount, 0);
  const handoffDependencyCount = handoffs.reduce((sum, handoff) => sum + handoff.dependencyCount, 0);
  const toolFailureRate = toolCalls > 0 ? toolFailures / toolCalls : 0;
  const shellUsageRatio = toolCalls > 0 ? shellCalls / toolCalls : 0;
  const permissionDenyCount = permissionAudits.filter(
    (record) => record.type === 'permission_audit' && record.status === 'deny',
  ).length;
  const toolPolicyDenyCount = toolPolicyAudits.filter((record) => record.status === 'deny').length;
  const repairAttemptCount =
    repairs?.length ??
    repairDecisions.filter(
      (record) => record.type === 'repair_decision' && (record.status === 'continue' || record.status === 'completed'),
    ).length;
  const repairSuccess = repairs ? repairs.every((repair) => repair.status === 'completed') : !blocked;
  const maxTurnStop = stoppedReasons.some((record) => record.reason === 'max_turns');
  const userInputRequired = stoppedReasons.some((record) => record.reason === 'user_input_required');
  const stageFailureCount = stages.filter((stage) => stage.status === 'failed' || stage.status === 'blocked').length;
  const providerQuality = buildProviderQualityMetrics(records);
  const providerDegraded =
    providerQuality.retryCount > 0 || providerQuality.fallbackCount > 0 || providerQuality.contextRecoveryCount > 0;
  const verificationAfterChangeMissing = changes.length > 0 && !verification;
  const toolRecoveryHintCount = toolRecovery?.total ?? 0;
  const toolRecoveryRecoveredCount = toolRecovery?.recoveredCount ?? 0;
  const toolRecoveryUnrecoveredCount = toolRecovery?.unrecoveredCount ?? 0;
  const toolChoiceAuditCount = toolChoice?.total ?? 0;
  const toolPriorityFollowRate = toolChoice?.followRate ?? 1;
  const toolPriorityMissedCount = toolChoice?.missedCount ?? 0;
  const degradationReasons = [
    terminal.status !== 'completed' ? 'not_completed' : undefined,
    blocked ? 'blocked' : undefined,
    verificationAfterChangeMissing ? 'missing_verification_after_change' : undefined,
    verification && verification.status !== 'passed' ? 'verification_failed' : undefined,
    toolFailureRate > 0 ? 'tool_failures' : undefined,
    toolPriorityMissedCount > 0 ? 'tool_priority_missed' : undefined,
    toolRecoveryUnrecoveredCount > 0 ? 'tool_recovery_unresolved' : undefined,
    shellUsageRatio > 0.5 ? 'shell_heavy' : undefined,
    permissionDenyCount > 0 ? 'permission_denied' : undefined,
    toolPolicyDenyCount > 0 ? 'tool_policy_denied' : undefined,
    repairAttemptCount > 1 ? 'repeated_repair_attempts' : undefined,
    !repairSuccess ? 'repair_failed' : undefined,
    maxTurnStop ? 'max_turns' : undefined,
    userInputRequired ? 'user_input_required' : undefined,
    stageFailureCount > 0 ? 'stage_failures' : undefined,
    providerDegraded ? 'provider_degraded' : undefined,
  ].filter((reason): reason is string => Boolean(reason));
  const qualityPenalty =
    (terminal.status !== 'completed' ? 25 : 0) +
    (blocked ? 25 : 0) +
    (verificationAfterChangeMissing ? 10 : 0) +
    (verification && verification.status !== 'passed' ? 20 : 0) +
    Math.min(20, Math.round(toolFailureRate * 20)) +
    Math.min(10, toolPriorityMissedCount * 5) +
    Math.min(10, toolRecoveryUnrecoveredCount * 5) +
    Math.min(10, Math.round(shellUsageRatio * 10)) +
    Math.min(15, permissionDenyCount * 5) +
    Math.min(20, toolPolicyDenyCount * 10) +
    Math.min(10, Math.max(0, repairAttemptCount - 1) * 5) +
    (!repairSuccess ? 10 : 0) +
    (maxTurnStop ? 15 : 0) +
    (userInputRequired ? 5 : 0) +
    Math.min(20, stageFailureCount * 10) +
    (providerQuality.riskLevel === 'high' ? 15 : providerQuality.riskLevel === 'medium' ? 5 : 0);

  return {
    success:
      terminal.status === 'completed' &&
      !blocked &&
      !verificationAfterChangeMissing &&
      (verification ? verification.status === 'passed' : true),
    qualityScore: Math.max(0, 100 - qualityPenalty),
    degradationReasons,
    contextInjectionCount: contextSources.filter((source) => source.injected).length,
    decisionTraceCount: decisionTrace.length,
    providerRetryCount: providerQuality.retryCount,
    providerFallbackCount: providerQuality.fallbackCount,
    contextRecoveryCount: providerQuality.contextRecoveryCount,
    verificationAfterChangeMissing,
    ...(verification
      ? {
          verificationPassed: verification.status === 'passed',
          verificationPassRate:
            verificationTotal && verificationTotal > 0 ? verification.passed / verificationTotal : 0,
        }
      : {}),
    repairAttemptCount,
    repairSuccess,
    toolFailureRate,
    shellUsageRatio,
    permissionAskCount: records.filter((record) => record.type === 'permission_request').length,
    permissionDenyCount,
    toolChoiceAuditCount,
    toolPriorityFollowRate,
    toolPriorityMissedCount,
    toolPolicyAllowCount: toolPolicyAudits.filter((record) => record.status === 'allow').length,
    toolPolicyDenyCount,
    toolRecoveryHintCount,
    toolRecoveryRecoveredCount,
    toolRecoveryUnrecoveredCount,
    contextCompactCount: records.filter((record) => record.type === 'context_compact').length,
    maxTurnStop,
    userInputRequired,
    stageFailureCount,
    blocked,
    handoffUsed: handoffs.length > 0,
    handoffCount: handoffs.length,
    handoffTaskCount,
    handoffDependencyCount,
  };
}

const verificationToolNames = new Set(['diagnostics', 'app_e2e_check', 'app_readiness', 'browser']);

function contentHasFailureSignal(content: string) {
  return /verificationOk:\s*false|repairRequired:\s*true|timedOut:\s*true|failureLikeOutput:\s*true|completionBlocked:\s*true|status:\s*(?:fail|failed)|failures:\s*[1-9]\d*|pageErrors:\s*[1-9]\d*|exitCode:\s*(?:none|[1-9]\d*)|tool policy denied|failed:|error:|net::ERR_|page\.goto/i.test(
    content,
  );
}

function verificationToolResultOk(name: string, ok: boolean, content: string) {
  if (!ok || contentHasFailureSignal(content)) return false;
  if (name === 'diagnostics') return /verificationOk:\s*true|exitCode:\s*0/i.test(content);
  if (name === 'app_e2e_check') return /status:\s*pass/i.test(content);
  if (name === 'app_readiness') return /status:\s*pass/i.test(content);
  if (name === 'browser') return content.trim().length > 0;
  return false;
}

function inferVerificationReportFromToolResults(records: SessionLogRecord[]): VerificationReport | undefined {
  const verificationResults = records
    .filter(
      (record): record is SessionLogRecord & { type: 'tool_result' } =>
        record.type === 'tool_result' && verificationToolNames.has(record.message.name),
    )
    .map((record) => ({
      command: `tool:${record.message.name}`,
      ok: verificationToolResultOk(record.message.name, record.ok, record.message.content),
      exitCode: record.ok ? 0 : 1,
      stdout: record.message.content,
      stderr: record.ok ? '' : record.message.content,
      durationMs: 0,
    }));

  if (verificationResults.length === 0) return undefined;
  const passed = verificationResults.filter((result) => result.ok).length;
  const failed = verificationResults.length - passed;
  return {
    status: failed === 0 ? 'passed' : 'failed',
    createdAt: latestToolResultTimestamp(records) ?? new Date().toISOString(),
    commandCount: verificationResults.length,
    passed,
    failed,
    results: verificationResults,
  };
}

function latestToolResultTimestamp(records: SessionLogRecord[]) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (record.type === 'tool_result') return record.timestamp;
  }
  return undefined;
}

function firstTraceId(records: SessionLogRecord[]) {
  return records.find((record) => typeof record.traceId === 'string' && record.traceId.trim())?.traceId;
}

function uniqueActions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildRunSelfReview(input: { status: string; metrics: RunReportMetrics }): RunReportSelfReview {
  const findings: RunReportSelfReview['findings'] = [];
  const { metrics } = input;

  if (input.status !== 'completed' || metrics.maxTurnStop || metrics.userInputRequired || metrics.blocked) {
    findings.push({
      area: 'completion',
      severity: metrics.blocked || metrics.maxTurnStop ? 'high' : 'medium',
      message: `Run ended with status ${input.status}.`,
      nextAction: 'Resume or rerun from the latest session with the preserved trace and stop reason.',
    });
  }

  if (metrics.verificationAfterChangeMissing) {
    findings.push({
      area: 'verification',
      severity: 'high',
      message: 'Workspace changes were recorded without verification evidence.',
      nextAction: 'Run focused diagnostics, tests, or verification before accepting the run.',
    });
  } else if (metrics.verificationPassed === false) {
    findings.push({
      area: 'verification',
      severity: 'high',
      message: 'Verification failed for this run.',
      nextAction: 'Inspect failed verification output, patch the concrete defect, and rerun verification.',
    });
  }

  if (metrics.toolPriorityMissedCount > 0) {
    findings.push({
      area: 'tool_choice',
      severity: 'medium',
      message: `${metrics.toolPriorityMissedCount} priority tool choice${metrics.toolPriorityMissedCount === 1 ? ' was' : 's were'} missed.`,
      nextAction: 'Strengthen priority guidance for repeated missed-priority tools.',
    });
  }

  if (metrics.toolRecoveryUnrecoveredCount > 0) {
    findings.push({
      area: 'tool_recovery',
      severity: metrics.toolRecoveryUnrecoveredCount > 1 ? 'high' : 'medium',
      message: `${metrics.toolRecoveryUnrecoveredCount} tool recovery item${metrics.toolRecoveryUnrecoveredCount === 1 ? ' remains' : 's remain'} unresolved.`,
      nextAction: 'Inspect unresolved tool failures and retry only after the cause changes.',
    });
  }

  if (metrics.permissionDenyCount > 0) {
    findings.push({
      area: 'permission',
      severity: 'medium',
      message: `${metrics.permissionDenyCount} permission denial${metrics.permissionDenyCount === 1 ? '' : 's'} occurred.`,
      nextAction: 'Use allowed tools, request explicit approval, or report the exact limitation.',
    });
  }

  if (metrics.providerRetryCount > 0 || metrics.providerFallbackCount > 0 || metrics.contextRecoveryCount > 0) {
    findings.push({
      area: 'provider',
      severity: metrics.providerFallbackCount > 0 ? 'medium' : 'low',
      message: 'Provider retry, fallback, or context recovery occurred.',
      nextAction: 'Monitor provider retry, fallback, and context recovery patterns.',
    });
  }

  if (metrics.handoffUsed && metrics.handoffTaskCount === 0) {
    findings.push({
      area: 'handoff',
      severity: 'medium',
      message: 'A handoff was recorded without queued task details.',
      nextAction: 'Inspect handoff records and preserve task dependency labels.',
    });
  }

  const nextActions = uniqueActions(
    findings.map((finding) => {
      if (finding.area === 'completion') return 'resume_incomplete_run';
      if (finding.area === 'verification')
        return metrics.verificationAfterChangeMissing ? 'run_verification_after_change' : 'repair_failed_verification';
      if (finding.area === 'tool_choice') return 'strengthen_tool_choice_order';
      if (finding.area === 'tool_recovery') return 'resolve_tool_recovery_hints';
      if (finding.area === 'permission') return 'review_permission_policy';
      if (finding.area === 'provider') return 'monitor_provider_quality';
      if (finding.area === 'context') return 'improve_context_injection';
      return 'inspect_handoff_state';
    }),
  );

  const hasHigh = findings.some((finding) => finding.severity === 'high');
  const status =
    !metrics.success || hasHigh ? 'fail' : findings.length > 0 || metrics.qualityScore < 100 ? 'warn' : 'pass';

  return {
    status,
    score: metrics.qualityScore,
    findings,
    nextActions,
  };
}

export function buildRunReport(input: BuildRunReportInput): RunReport {
  const terminal = terminalStatus(input.records);
  const traceId = firstTraceId(input.records);
  const tools = summarizeTools(input.records);
  const workflowSteps = summarizeWorkflowSteps(input.records);
  const stages = summarizeStages(input.records);
  const contextSources = summarizeContextSources(input.records);
  const toolChoiceAudits = summarizeToolChoiceAudits(input.records);
  const toolChoice = summarizeToolChoice(toolChoiceAudits);
  const toolPolicyAudits = summarizeToolPolicyAudits(input.records);
  const toolPolicySnapshots = summarizeToolPolicySnapshots(input.records);
  const toolPolicy = summarizeToolPolicy(toolPolicySnapshots, toolPolicyAudits);
  const toolRecovery = summarizeToolRecovery(input.records);
  const handoffs = summarizeHandoffs(input.records);
  const decisionTrace = summarizeDecisionTrace(
    contextSources,
    toolChoice,
    toolPolicyAudits,
    toolRecovery,
    handoffs,
    input.records,
  );
  const providerQuality = buildProviderQualityMetrics(input.records);
  const verification = input.verification ?? inferVerificationReportFromToolResults(input.records);
  const metrics = buildMetrics(
    terminal,
    input.records,
    input.changes,
    tools,
    handoffs,
    verification,
    input.repairs,
    stages,
    toolChoice,
    toolPolicyAudits,
    toolRecovery,
    contextSources,
    decisionTrace,
  );
  const selfReview = buildRunSelfReview({
    status: terminal.status,
    metrics,
  });
  return {
    id: `run-report-${input.sessionId}`,
    sessionId: input.sessionId,
    ...(traceId ? { traceId } : {}),
    createdAt: input.createdAt ?? new Date().toISOString(),
    status: terminal.status,
    ...(terminal.phase ? { phase: terminal.phase } : {}),
    turns: terminal.turns,
    eventCount: input.records.length,
    messageCount: input.records.filter(isMessageRecord).length,
    toolCallCount: input.records.filter((record) => record.type === 'tool_call').length,
    toolResultCount: input.records.filter((record) => record.type === 'tool_result').length,
    tools,
    changes: input.changes,
    artifacts: input.artifacts,
    ...(workflowSteps.length > 0 ? { workflowSteps } : {}),
    ...(stages.length > 0 ? { stages } : {}),
    ...(contextSources.length > 0 ? { contextSources } : {}),
    ...(toolChoice ? { toolChoice } : {}),
    ...(toolPolicyAudits.length > 0 ? { toolPolicyAudits } : {}),
    ...(toolPolicy ? { toolPolicy } : {}),
    ...(toolRecovery ? { toolRecovery } : {}),
    ...(handoffs.length > 0 ? { handoffs } : {}),
    ...(decisionTrace.length > 0 ? { decisionTrace } : {}),
    ...(providerQuality.retryCount > 0 || providerQuality.fallbackCount > 0 || providerQuality.contextRecoveryCount > 0
      ? { providerQuality }
      : {}),
    metrics,
    selfReview,
    ...(input.checkpoint ? { checkpoint: input.checkpoint } : {}),
    ...(verification ? { verification } : {}),
    ...(input.repairs ? { repairs: input.repairs } : {}),
  };
}

export class FileRunReportStore {
  private readonly root: string;
  private readonly now: () => Date;

  constructor(options: FileRunReportStoreOptions) {
    this.root = resolve(options.xenesisHome, 'run_reports');
    this.now = options.now ?? (() => new Date());
  }

  async save(report: RunReport) {
    const path = this.reportPath(report.sessionId);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return report;
  }

  async read(sessionId: string): Promise<RunReport | undefined> {
    try {
      return JSON.parse(await readFile(this.reportPath(sessionId), 'utf8')) as RunReport;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  build(input: Omit<BuildRunReportInput, 'createdAt'>) {
    return buildRunReport({
      ...input,
      createdAt: this.now().toISOString(),
    });
  }

  private reportPath(sessionId: string) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(sessionId)) {
      throw new Error(`Invalid session id: ${sessionId}`);
    }
    return resolve(this.root, `${sessionId}.json`);
  }
}
