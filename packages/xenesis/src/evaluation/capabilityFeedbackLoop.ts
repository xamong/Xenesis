import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  CapabilityEvalReport,
  CapabilityEvalResult,
  CapabilityScenario
} from "./capabilityEval.js";
import { defaultCapabilityScenarios } from "./capabilityEval.js";
import {
  runAgentTask,
  type AgentTask,
  type AgentTaskExecutor,
  type AgentTaskStore
} from "../orchestration/index.js";
import type {
  RunSelfReviewArea,
  RunSelfReviewSeverity
} from "../core/events.js";
import type { RunReport } from "../runReports/index.js";

const DEFAULT_MAX_POLICY_IMPACT_REWORK_ATTEMPTS = 1;

export type CapabilityScenarioCandidateStatus = "candidate" | "accepted" | "ignored";

export interface CapabilityFailureSignals {
  requiredFirstTool?: string;
  missingTools: string[];
  requiredToolAny: string[][];
  missingEvents: string[];
  forbiddenTools: string[];
  missingText: string[];
  requiredTextAny: string[][];
  minimumToolCalls: Record<string, number>;
  orderedToolFailures: string[];
  rawFailures: string[];
}

export interface CapabilityScenarioCandidate {
  id: string;
  status: CapabilityScenarioCandidateStatus;
  sourceReportId: string;
  sourceScenarioId: string;
  category: CapabilityEvalResult["category"];
  prompt: string;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  failures: string[];
  toolCalls: string[];
  stdoutPreview?: string;
  stderrPreview?: string;
  signals: CapabilityFailureSignals;
  suggestedScenario: CapabilityScenario;
  notes?: string;
}

export interface CapabilityScenarioBacklog {
  kind: "capability-scenario-backlog";
  updatedAt: string;
  candidates: CapabilityScenarioCandidate[];
}

export type CapabilityImprovementPriority = "critical" | "high" | "medium" | "low";

export type CapabilityFailureCategory =
  | "tool-routing"
  | "missing-tools"
  | "missing-tool-groups"
  | "missing-events"
  | "forbidden-tools"
  | "missing-text"
  | "missing-text-groups"
  | "minimum-tool-calls"
  | "tool-order"
  | "unclassified";

export interface CapabilityImprovementFinding {
  id: string;
  failureCategory: CapabilityFailureCategory;
  scenarioCategory: CapabilityScenarioCandidate["category"];
  priority: CapabilityImprovementPriority;
  priorityScore: number;
  title: string;
  action: string;
  candidateIds: string[];
  sourceScenarioIds: string[];
  statuses: Record<CapabilityScenarioCandidateStatus, number>;
  occurrences: number;
  signals: string[];
  evidence: string[];
  lastSeenAt: string;
}

export interface CapabilityImprovementCategorySummary {
  candidates: number;
  occurrences: number;
  topFailureCategories: CapabilityFailureCategory[];
}

export type CapabilityImprovementArea =
  | "tool-selection-policy"
  | "self-execution-loop"
  | "context-continuity"
  | "verify-repair-loop"
  | "runtime-observability"
  | "permission-safety"
  | "answer-synthesis"
  | "scenario-taxonomy";

export type CapabilityImprovementExecutionStatus =
  | "open"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "blocked";

export interface CapabilityImprovementExecutionDetails {
  executionStatus: CapabilityImprovementExecutionStatus;
  latestTaskResultAt?: string;
  latestTaskSessionId?: string;
  latestTaskOutputPreview?: string;
  latestTaskError?: string;
}

export interface CapabilityImprovementExecutionSummary {
  totalRecommendations: number;
  openRecommendations: number;
  runningRecommendations: number;
  completedRecommendations: number;
  failedRecommendations: number;
  cancelledRecommendations: number;
  blockedRecommendations: number;
  totalTaskCandidates: number;
  openTaskCandidates: number;
  runningTaskCandidates: number;
  completedTaskCandidates: number;
  failedTaskCandidates: number;
  cancelledTaskCandidates: number;
  blockedTaskCandidates: number;
  remainingRecommendationIds: string[];
  failedRecommendationIds: string[];
  latestResultAt?: string;
  policyImpact?: CapabilityImprovementPolicyImpactSummary;
}

export interface CapabilityImprovementPolicyImpactSummary {
  completedTaskIds: string[];
  areas: CapabilityImprovementArea[];
  targetFiles: string[];
  verification: string[];
  effectiveness: CapabilityImprovementPolicyImpactEffectiveness[];
  latestImpactAt?: string;
}

export type CapabilityImprovementPolicyImpactEffectivenessStatus =
  | "improved"
  | "regressed"
  | "mixed"
  | "insufficient_data";

export interface CapabilityImprovementPolicyImpactEffectiveness {
  area: CapabilityImprovementArea;
  status: CapabilityImprovementPolicyImpactEffectivenessStatus;
  beforeRuns: number;
  afterRuns: number;
  qualityScoreDelta?: number;
  toolPriorityMissedCountDelta?: number;
  verificationPassRateDelta?: number;
  repairAttemptCountDelta?: number;
}

export interface CapabilityRunFailurePattern {
  id: string;
  sourceScenarioId: string;
  area: RunSelfReviewArea;
  severity: RunSelfReviewSeverity;
  message: string;
  nextAction: string;
  count: number;
  priorityBoost: number;
  firstSeenAt: string;
  latestSeenAt: string;
  runReportIds: string[];
  sessionIds: string[];
}

export interface CapabilityImprovementRecommendation {
  id: string;
  area: CapabilityImprovementArea;
  priority: CapabilityImprovementPriority;
  priorityScore: number;
  title: string;
  rationale: string;
  actions: string[];
  targetFiles: string[];
  verification: string[];
  findingIds: string[];
  failureCategories: CapabilityFailureCategory[];
  scenarioCategories: string[];
  sourceScenarioIds: string[];
  signals: string[];
  executionStatus: CapabilityImprovementExecutionStatus;
  latestTaskResultAt?: string;
  latestTaskSessionId?: string;
  latestTaskOutputPreview?: string;
  latestTaskError?: string;
  failurePatternIds?: string[];
}

export type CapabilityImprovementTaskStatus = "candidate" | "accepted" | "ignored";

export interface CapabilityImprovementTaskCandidate {
  id: string;
  status: CapabilityImprovementTaskStatus;
  recommendationId: string;
  area: CapabilityImprovementArea;
  priority: CapabilityImprovementPriority;
  priorityScore: number;
  title: string;
  prompt: string;
  labels: string[];
  targetFiles: string[];
  verification: string[];
  findingIds: string[];
  sourceScenarioIds: string[];
  sourceReportCreatedAt: string;
  createdAt: string;
  executionStatus: CapabilityImprovementExecutionStatus;
  latestTaskResultAt?: string;
  latestTaskSessionId?: string;
  latestTaskOutputPreview?: string;
  latestTaskError?: string;
  promotedAgentTaskId?: string;
  promotedAt?: string;
  failurePatternIds?: string[];
}

export interface CapabilityImprovementTaskBacklog {
  kind: "capability-improvement-task-backlog";
  createdAt: string;
  sourceReportCreatedAt: string;
  tasks: CapabilityImprovementTaskCandidate[];
}

export interface CapabilityImprovementTaskRunRecord {
  taskId: string;
  status: AgentTask["status"];
  resultAt: string;
  sessionId: string;
  source?: string;
  label?: string;
  attempts?: number;
  output?: string;
  error?: string;
  artifactId?: string;
  usage?: AgentTask["usage"];
  recommendationId?: string;
  area?: CapabilityImprovementArea;
  sourceScenarioIds: string[];
  verification: string[];
  impact?: CapabilityImprovementTaskImpact;
}

export interface CapabilityImprovementTaskImpact {
  kind: "capability-improvement-impact";
  taskId: string;
  recommendationId: string;
  area: CapabilityImprovementArea;
  status: "completed";
  summary: string;
  targetFiles: string[];
  verification: string[];
  sourceScenarioIds: string[];
  recordedAt: string;
}

export interface CapabilityImprovementTaskResultsLog {
  kind: "capability-improvement-task-results";
  updatedAt: string;
  results: CapabilityImprovementTaskRunRecord[];
}

export interface CapabilityImprovementReport {
  kind: "capability-improvement-report";
  createdAt: string;
  backlogUpdatedAt: string;
  summary: {
    totalCandidates: number;
    activeCandidates: number;
    acceptedCandidates: number;
    candidateCandidates: number;
    ignoredCandidates: number;
    repeatedCandidates: number;
    totalOccurrences: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categorySummary: Record<string, CapabilityImprovementCategorySummary>;
  failurePatterns?: CapabilityRunFailurePattern[];
  findings: CapabilityImprovementFinding[];
  recommendations: CapabilityImprovementRecommendation[];
  taskCandidates: CapabilityImprovementTaskCandidate[];
  execution: CapabilityImprovementExecutionSummary;
}

export interface PromoteCapabilityFailuresOptions {
  report: CapabilityEvalReport;
  existing?: CapabilityScenarioBacklog;
  now?: () => Date;
  maxCandidates?: number;
}

export interface UpdateCapabilityCandidateStatusOptions {
  backlog: CapabilityScenarioBacklog;
  id: string;
  status: CapabilityScenarioCandidateStatus;
  notes?: string;
  now?: () => Date;
}

export interface BuildCapabilityImprovementReportOptions {
  backlog: CapabilityScenarioBacklog;
  taskResults?: CapabilityImprovementTaskResultsLog;
  runReports?: CapabilityImprovementRunReportInput[];
  now?: () => Date;
}

export interface BuildCapabilityImprovementTaskBacklogOptions {
  report: Pick<CapabilityImprovementReport, "createdAt" | "recommendations">;
  now?: () => Date;
}

export interface PromoteCapabilityImprovementTaskOptions {
  backlog: CapabilityImprovementTaskBacklog;
  id: string;
  store: AgentTaskStore;
  now?: () => Date;
}

export interface PromoteCapabilityImprovementTaskResult {
  backlog: CapabilityImprovementTaskBacklog;
  agentTask: AgentTask;
}

export interface RecordCapabilityImprovementTaskRunOptions {
  task: AgentTask;
  existing?: CapabilityImprovementTaskResultsLog;
  taskCandidate?: CapabilityImprovementTaskCandidate;
  now?: () => Date;
}

export interface RunCapabilityImprovementAgentTaskOptions {
  store: AgentTaskStore;
  id: string;
  executor: AgentTaskExecutor;
  results?: CapabilityImprovementTaskResultsLog;
  taskCandidate?: CapabilityImprovementTaskCandidate;
  now?: () => Date;
}

export interface RunCapabilityImprovementAgentTaskResult {
  agentTask: AgentTask;
  results: CapabilityImprovementTaskResultsLog;
}

export type CapabilityImprovementTaskRecoveryMode = "retry" | "follow-up";

export interface RecoverFailedCapabilityImprovementTasksOptions {
  backlog: CapabilityImprovementTaskBacklog;
  results?: CapabilityImprovementTaskResultsLog;
  store: AgentTaskStore;
  ids?: string[];
  mode?: CapabilityImprovementTaskRecoveryMode;
  autoFollowUpAfterFailures?: number;
  maxTasks?: number;
  now?: () => Date;
}

export interface CapabilityImprovementTaskRecoveryRecord {
  taskId: string;
  agentTaskId: string;
  mode: CapabilityImprovementTaskRecoveryMode;
  status: AgentTask["status"];
}

export interface CapabilityImprovementTaskRecoverySkippedRecord {
  taskId: string;
  reason: string;
}

export interface RecoverFailedCapabilityImprovementTasksResult {
  backlog: CapabilityImprovementTaskBacklog;
  recovered: CapabilityImprovementTaskRecoveryRecord[];
  skipped: CapabilityImprovementTaskRecoverySkippedRecord[];
}

export interface CompleteCapabilityImprovementLoopOptions {
  backlog: CapabilityScenarioBacklog;
  taskBacklog?: CapabilityImprovementTaskBacklog;
  taskResults?: CapabilityImprovementTaskResultsLog;
  runReports?: CapabilityImprovementRunReportInput[];
  store?: AgentTaskStore;
  recoverFailed?: boolean;
  recoveryMode?: CapabilityImprovementTaskRecoveryMode;
  autoFollowUpAfterFailures?: number;
  runRecovered?: boolean;
  executor?: AgentTaskExecutor;
  now?: () => Date;
}

export interface CompleteCapabilityImprovementLoopResult {
  report: CapabilityImprovementReport;
  taskBacklog: CapabilityImprovementTaskBacklog;
  taskResults?: CapabilityImprovementTaskResultsLog;
  recovery?: RecoverFailedCapabilityImprovementTasksResult;
  recoveredRuns: RunCapabilityImprovementAgentTaskResult[];
}

export type CapabilityImprovementRunReportInput = Pick<
  RunReport,
  "id" | "sessionId" | "createdAt" | "status" | "selfReview"
> & {
  metrics?: Partial<Pick<
    RunReport["metrics"],
    | "qualityScore"
    | "toolPriorityMissedCount"
    | "verificationPassRate"
    | "repairAttemptCount"
    | "maxTurnStop"
    | "userInputRequired"
    | "blocked"
    | "toolRecoveryUnrecoveredCount"
  >>;
};

export type CapabilityLoopReportMode = "eval-only" | "auto-improve" | "closed-loop";

export interface CapabilityLoopUsageSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CapabilityLoopEvalUsageSummary extends CapabilityLoopUsageSummary {
  availableRuns: number;
  unavailableRuns: number;
  unavailableScenarioIds: string[];
}

export interface CapabilityLoopReportUsageSummary extends CapabilityLoopUsageSummary {
  evalAvailableRuns: number;
  evalUnavailableRuns: number;
  evalUnavailableScenarioIds: string[];
}

export interface CapabilityLoopEvalRunSummary {
  reportPath: string;
  exitCode: number;
  score?: number;
  failedScenarioIds: string[];
  usage?: CapabilityLoopEvalUsageSummary;
}

export interface CapabilityLoopReportPaths {
  backlog: string;
  improvementReport?: string;
  improvementTasks?: string;
  improvementResults?: string;
  agentTasks?: string;
}

export interface CapabilityLoopReport {
  kind: "capability-loop-report";
  createdAt: string;
  mode: CapabilityLoopReportMode;
  summary: {
    totalRuns: number;
    failedEvalRuns: number;
    candidates: number;
    recommendations: number;
    completedRecommendations: number;
    failedRecommendations: number;
    remainingRecommendations: number;
    recoveredTasks: number;
    skippedRecoveries: number;
    rerunTasks: number;
    usage: CapabilityLoopReportUsageSummary;
  };
  paths: CapabilityLoopReportPaths;
  evalRuns: CapabilityLoopEvalRunSummary[];
  completedRecommendationIds: string[];
  failedRecommendationIds: string[];
  remainingRecommendationIds: string[];
  recoveredTaskIds: string[];
  skippedRecoveries: CapabilityImprovementTaskRecoverySkippedRecord[];
  rerunTaskIds: string[];
  policyImpact?: CapabilityImprovementPolicyImpactSummary;
  policyImpactDecisions?: CapabilityPolicyImpactDecision[];
  capabilityReadiness: CapabilityReadinessDimension[];
  nextActions: string[];
}

export type CapabilityReadinessDimensionId =
  | "failure-classification"
  | "eval-scenario-coverage"
  | "tool-execution-strategy"
  | "plan-execute-verify-loop"
  | "context-memory-session"
  | "self-run-practice"
  | "provider-fallback"
  | "reporting-metrics";

export type CapabilityReadinessStatus = "ready" | "watch" | "needs-work";

export interface CapabilityReadinessDimension {
  id: CapabilityReadinessDimensionId;
  title: string;
  status: CapabilityReadinessStatus;
  score: number;
  evidence: string[];
  nextAction: string;
}

export type CapabilityPolicyImpactDecisionAction =
  | "rework_regressed_impact"
  | "stop_rework_limit_reached"
  | "deprioritize_improved_area"
  | "observe_insufficient_data"
  | "keep_standard_priority";

export interface CapabilityPolicyImpactDecision {
  area: CapabilityImprovementArea;
  status: CapabilityImprovementPolicyImpactEffectivenessStatus;
  action: CapabilityPolicyImpactDecisionAction;
  reason: string;
  attempts?: number;
  maxAttempts?: number;
}

export interface BuildCapabilityLoopReportOptions {
  mode: CapabilityLoopReportMode;
  evalRuns: CapabilityLoopEvalRunSummary[];
  backlogPath: string;
  candidates: number;
  improvementPaths?: {
    report: string;
    tasks: string;
    results: string;
    agentTasks: string;
  };
  improvement?: CompleteCapabilityImprovementLoopResult;
  recoveredTaskCount?: number;
  skippedRecoveryCount?: number;
  rerunTaskCount?: number;
  maxPolicyImpactReworkAttempts?: number;
  now?: () => Date;
}

export interface CapabilityLoopNextTask {
  taskId: string;
  recommendationId: string;
  area: CapabilityImprovementArea;
  priority: CapabilityImprovementPriority;
  priorityScore: number;
  title: string;
  executionStatus: CapabilityImprovementExecutionStatus;
  sourceScenarioIds: string[];
  verification: string[];
  reason: "failed recommendation" | "remaining recommendation" | "regressed policy impact";
  policyAction?: CapabilityPolicyImpactDecisionAction;
  policyReason?: string;
  readinessId?: CapabilityReadinessDimensionId;
  readinessStatus?: CapabilityReadinessStatus;
  readinessScore?: number;
  readinessReason?: string;
}

export interface CapabilityLoopNextTaskSkippedRecord {
  taskId: string;
  recommendationId: string;
  reason: string;
}

export interface CapabilityLoopNextTaskSelection {
  kind: "capability-loop-next-tasks";
  createdAt: string;
  limit: number;
  selected: CapabilityLoopNextTask[];
  skipped: CapabilityLoopNextTaskSkippedRecord[];
}

export interface SelectCapabilityLoopNextTasksOptions {
  report: Pick<
    CapabilityLoopReport,
    "completedRecommendationIds" | "failedRecommendationIds" | "remainingRecommendationIds"
  > & {
    policyImpactDecisions?: CapabilityPolicyImpactDecision[];
    capabilityReadiness?: CapabilityReadinessDimension[];
  };
  taskBacklog: CapabilityImprovementTaskBacklog;
  limit?: number;
  selfReviewCooldownMs?: number;
  failurePatternCooldownMs?: number;
  now?: () => Date;
}

export interface CapabilityLoopQueuedTaskRecord {
  taskId: string;
  agentTaskId: string;
  status: AgentTask["status"];
}

export interface QueueCapabilityLoopNextTasksOptions {
  selection: Pick<CapabilityLoopNextTaskSelection, "selected">;
  taskBacklog: CapabilityImprovementTaskBacklog;
  store: AgentTaskStore;
  now?: () => Date;
}

export interface QueueCapabilityLoopNextTasksResult {
  taskBacklog: CapabilityImprovementTaskBacklog;
  queued: CapabilityLoopQueuedTaskRecord[];
  skipped: CapabilityLoopNextTaskSkippedRecord[];
}

export interface CapabilityLoopNextTaskRunSkippedRecord {
  taskId: string;
  agentTaskId: string;
  reason: string;
}

export interface RunCapabilityLoopNextTasksOptions {
  backlog: CapabilityScenarioBacklog;
  taskBacklog: CapabilityImprovementTaskBacklog;
  queued: CapabilityLoopQueuedTaskRecord[];
  results?: CapabilityImprovementTaskResultsLog;
  runReports?: CapabilityImprovementRunReportInput[];
  store: AgentTaskStore;
  executor: AgentTaskExecutor;
  now?: () => Date;
}

export interface RunCapabilityLoopNextTasksResult {
  report: CapabilityImprovementReport;
  taskBacklog: CapabilityImprovementTaskBacklog;
  taskResults?: CapabilityImprovementTaskResultsLog;
  runs: RunCapabilityImprovementAgentTaskResult[];
  skipped: CapabilityLoopNextTaskRunSkippedRecord[];
}

export type CapabilityLoopCycleStopReason =
  | "eval-report-missing"
  | "no-remaining-recommendations"
  | "no-next-task"
  | "next-task-budget-reached"
  | "input-token-budget-reached"
  | "output-token-budget-reached"
  | "total-token-budget-reached"
  | "cost-budget-reached"
  | "time-budget-exceeded"
  | "cycle-approval-declined"
  | "cycle-limit-reached";

export interface CapabilityLoopCycleProgressInput {
  cycle: number;
  cycleLimit: number;
  evalRuns: number;
  missingReports: number;
  selectedNextTasks: number;
  queuedNextTasks: number;
  ranNextTasks: number;
  runSkipped: number;
  completedRecommendations: number;
  remainingRecommendations: number;
  totalRanNextTasks?: number;
  maxRanNextTasks?: number;
  elapsedMs?: number;
  maxElapsedMs?: number;
  usage?: CapabilityLoopUsageSummary;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxTotalTokens?: number;
  estimatedCostUsd?: number;
  maxCostUsd?: number;
}

export interface CapabilityLoopCycleProgress extends CapabilityLoopCycleProgressInput {
  continue: boolean;
  stopReason?: CapabilityLoopCycleStopReason;
}

export type CapabilityLoopSafetyBudgetStopReason = Extract<
  CapabilityLoopCycleStopReason,
  | "input-token-budget-reached"
  | "output-token-budget-reached"
  | "total-token-budget-reached"
  | "cost-budget-reached"
  | "time-budget-exceeded"
>;

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "scenario";
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function splitAlternatives(value: string) {
  return unique(value.split(/\s+or\s+/i));
}

function parsePositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseCapabilityFailureSignals(failures: string[]): CapabilityFailureSignals {
  const signals: CapabilityFailureSignals = {
    missingTools: [],
    requiredToolAny: [],
    missingEvents: [],
    forbiddenTools: [],
    missingText: [],
    requiredTextAny: [],
    minimumToolCalls: {},
    orderedToolFailures: [],
    rawFailures: failures
  };

  for (const failure of failures) {
    let match = /^first tool was .+?, expected (.+)$/.exec(failure);
    if (match) {
      signals.requiredFirstTool = match[1]!.trim();
      continue;
    }

    match = /^missing first tool: (.+)$/.exec(failure);
    if (match) {
      signals.requiredFirstTool = match[1]!.trim();
      continue;
    }

    match = /^missing required tool: (.+)$/.exec(failure);
    if (match) {
      signals.missingTools.push(match[1]!.trim());
      continue;
    }

    match = /^missing required tool group: (.+)$/.exec(failure);
    if (match) {
      signals.requiredToolAny.push(splitAlternatives(match[1]!));
      continue;
    }

    match = /^missing required event: (.+)$/.exec(failure);
    if (match) {
      signals.missingEvents.push(match[1]!.trim());
      continue;
    }

    match = /^used forbidden tool: (.+)$/.exec(failure);
    if (match) {
      signals.forbiddenTools.push(match[1]!.trim());
      continue;
    }

    match = /^missing required text: (.+)$/.exec(failure);
    if (match) {
      signals.missingText.push(match[1]!.trim());
      continue;
    }

    match = /^missing required text group: (.+)$/.exec(failure);
    if (match) {
      signals.requiredTextAny.push(splitAlternatives(match[1]!));
      continue;
    }

    match = /^missing required tool call count: ([A-Za-z0-9_.:-]+) \d+\/(\d+)$/.exec(failure);
    if (match) {
      const minimum = parsePositiveInteger(match[2]!);
      if (minimum !== undefined) signals.minimumToolCalls[match[1]!] = minimum;
      continue;
    }

    match = /^missing ordered tool after .+?: (.+)$/.exec(failure);
    if (match) {
      signals.orderedToolFailures.push(match[1]!.trim());
    }
  }

  return {
    ...signals,
    missingTools: unique(signals.missingTools),
    requiredToolAny: signals.requiredToolAny.filter((group) => group.length > 0),
    missingEvents: unique(signals.missingEvents),
    forbiddenTools: unique(signals.forbiddenTools),
    missingText: unique(signals.missingText),
    requiredTextAny: signals.requiredTextAny.filter((group) => group.length > 0),
    orderedToolFailures: unique(signals.orderedToolFailures)
  };
}

function suggestedScenarioFromResult(
  result: CapabilityEvalResult,
  signals: CapabilityFailureSignals,
  candidateId: string
): CapabilityScenario {
  return {
    id: `candidate-${candidateId}`,
    category: result.category,
    prompt: result.prompt,
    ...(signals.requiredFirstTool ? { requiredFirstTool: signals.requiredFirstTool } : {}),
    ...(signals.missingTools.length > 0 ? { requiredTools: signals.missingTools } : {}),
    ...(signals.requiredToolAny.length > 0 ? { requiredToolAny: signals.requiredToolAny } : {}),
    ...(signals.missingEvents.length > 0 ? { requiredEvents: signals.missingEvents } : {}),
    ...(signals.forbiddenTools.length > 0 ? { forbiddenTools: signals.forbiddenTools } : {}),
    ...(signals.missingText.length > 0 ? { requiredText: signals.missingText } : {}),
    ...(signals.requiredTextAny.length > 0 ? { requiredTextAny: signals.requiredTextAny } : {}),
    ...(Object.keys(signals.minimumToolCalls).length > 0 ? { minimumToolCalls: signals.minimumToolCalls } : {}),
    weight: result.weight
  };
}

function candidateIdFor(result: CapabilityEvalResult) {
  const signature = [
    result.id,
    result.category,
    result.prompt,
    ...result.failures
  ].join("\n");
  return `${slug(result.id)}-${stableHash(signature)}`;
}

function candidateFromResult(
  report: CapabilityEvalReport,
  result: CapabilityEvalResult,
  timestamp: string
): CapabilityScenarioCandidate {
  const id = candidateIdFor(result);
  const signals = parseCapabilityFailureSignals(result.failures);
  return {
    id,
    status: "candidate",
    sourceReportId: report.id,
    sourceScenarioId: result.id,
    category: result.category,
    prompt: result.prompt,
    occurrences: 1,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    failures: result.failures,
    toolCalls: result.toolCalls,
    ...(result.stdoutPreview ? { stdoutPreview: result.stdoutPreview } : {}),
    ...(result.stderrPreview ? { stderrPreview: result.stderrPreview } : {}),
    signals,
    suggestedScenario: suggestedScenarioFromResult(result, signals, id)
  };
}

function mergeCandidate(
  previous: CapabilityScenarioCandidate | undefined,
  next: CapabilityScenarioCandidate
): CapabilityScenarioCandidate {
  if (!previous) return next;
  return {
    ...next,
    status: previous.status,
    notes: previous.notes,
    firstSeenAt: previous.firstSeenAt,
    occurrences: previous.occurrences + 1
  };
}

export function promoteCapabilityFailures(options: PromoteCapabilityFailuresOptions): CapabilityScenarioBacklog {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const maxCandidates = Math.max(1, options.maxCandidates ?? 200);
  const candidates = new Map<string, CapabilityScenarioCandidate>();

  for (const candidate of options.existing?.candidates ?? []) {
    candidates.set(candidate.id, candidate);
  }

  for (const result of options.report.results) {
    if (result.status !== "failed") continue;
    const next = candidateFromResult(options.report, result, timestamp);
    candidates.set(next.id, mergeCandidate(candidates.get(next.id), next));
  }

  return {
    kind: "capability-scenario-backlog",
    updatedAt: timestamp,
    candidates: Array.from(candidates.values())
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt) || left.id.localeCompare(right.id))
      .slice(0, maxCandidates)
  };
}

export function updateCapabilityCandidateStatus(
  options: UpdateCapabilityCandidateStatusOptions
): CapabilityScenarioBacklog {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  let found = false;
  const candidates = options.backlog.candidates.map((candidate) => {
    if (candidate.id !== options.id) return candidate;
    found = true;
    return {
      ...candidate,
      status: options.status,
      ...(options.notes !== undefined ? { notes: options.notes } : {})
    };
  });
  if (!found) throw new Error(`Capability scenario candidate not found: ${options.id}`);
  return {
    ...options.backlog,
    updatedAt: timestamp,
    candidates
  };
}

export function acceptedCapabilityScenarios(backlog: CapabilityScenarioBacklog): CapabilityScenario[] {
  return backlog.candidates
    .filter((candidate) => candidate.status === "accepted")
    .sort((left, right) => left.sourceScenarioId.localeCompare(right.sourceScenarioId) || left.id.localeCompare(right.id))
    .map((candidate) => candidate.suggestedScenario);
}

export function mergeCapabilityScenarios(
  baseScenarios: CapabilityScenario[],
  extraScenarios: CapabilityScenario[]
): CapabilityScenario[] {
  const seen = new Set<string>();
  const merged: CapabilityScenario[] = [];
  for (const scenario of [...baseScenarios, ...extraScenarios]) {
    if (seen.has(scenario.id)) continue;
    seen.add(scenario.id);
    merged.push(scenario);
  }
  return merged;
}

function failureCategoryWeight(category: CapabilityFailureCategory) {
  switch (category) {
    case "tool-routing":
      return 28;
    case "missing-tools":
      return 30;
    case "missing-tool-groups":
    case "missing-events":
    case "minimum-tool-calls":
    case "tool-order":
      return 25;
    case "forbidden-tools":
    case "missing-text-groups":
      return 20;
    case "missing-text":
      return 10;
    case "unclassified":
      return 0;
  }
}

function failureCategoryOrder(category: CapabilityFailureCategory) {
  const order: CapabilityFailureCategory[] = [
    "tool-routing",
    "missing-tools",
    "missing-tool-groups",
    "missing-events",
    "minimum-tool-calls",
    "tool-order",
    "forbidden-tools",
    "missing-text",
    "missing-text-groups",
    "unclassified"
  ];
  return order.indexOf(category);
}

function priorityFromScore(score: number): CapabilityImprovementPriority {
  if (score >= 60) return "critical";
  if (score >= 40) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function categorySignals(candidate: CapabilityScenarioCandidate): Array<{
  category: CapabilityFailureCategory;
  signals: string[];
}> {
  const result: Array<{ category: CapabilityFailureCategory; signals: string[] }> = [];
  if (
    candidate.signals.requiredFirstTool &&
    !candidate.signals.missingTools.includes(candidate.signals.requiredFirstTool)
  ) {
    result.push({ category: "tool-routing", signals: [candidate.signals.requiredFirstTool] });
  }
  if (candidate.signals.missingTools.length > 0) {
    result.push({ category: "missing-tools", signals: candidate.signals.missingTools });
  }
  if (candidate.signals.requiredToolAny.length > 0) {
    result.push({ category: "missing-tool-groups", signals: candidate.signals.requiredToolAny.map((group) => group.join(" or ")) });
  }
  if (candidate.signals.missingEvents.length > 0) {
    result.push({ category: "missing-events", signals: candidate.signals.missingEvents });
  }
  if (candidate.signals.forbiddenTools.length > 0) {
    result.push({ category: "forbidden-tools", signals: candidate.signals.forbiddenTools });
  }
  if (candidate.signals.missingText.length > 0) {
    result.push({ category: "missing-text", signals: candidate.signals.missingText });
  }
  if (candidate.signals.requiredTextAny.length > 0) {
    result.push({ category: "missing-text-groups", signals: candidate.signals.requiredTextAny.map((group) => group.join(" or ")) });
  }
  const minimumToolSignals = Object.entries(candidate.signals.minimumToolCalls).map(([tool, minimum]) => `${tool}:${minimum}`);
  if (minimumToolSignals.length > 0) {
    result.push({ category: "minimum-tool-calls", signals: minimumToolSignals });
  }
  if (candidate.signals.orderedToolFailures.length > 0) {
    result.push({ category: "tool-order", signals: candidate.signals.orderedToolFailures });
  }
  if (result.length === 0) {
    result.push({ category: "unclassified", signals: candidate.failures });
  }
  return result;
}

interface CapabilityImprovementFindingGroup {
  failureCategory: CapabilityFailureCategory;
  scenarioCategory: CapabilityScenarioCandidate["category"];
  candidateIds: string[];
  sourceScenarioIds: string[];
  statuses: Record<CapabilityScenarioCandidateStatus, number>;
  occurrences: number;
  signals: string[];
  evidence: string[];
  lastSeenAt: string;
}

function addImprovementFindingGroup(
  grouped: Map<string, CapabilityImprovementFindingGroup>,
  key: string,
  input: Omit<CapabilityImprovementFindingGroup, "statuses"> & {
    statuses?: Partial<Record<CapabilityScenarioCandidateStatus, number>>;
  }
) {
  const group = grouped.get(key) ?? {
    failureCategory: input.failureCategory,
    scenarioCategory: input.scenarioCategory,
    candidateIds: [],
    sourceScenarioIds: [],
    statuses: emptyStatusCounts(),
    occurrences: 0,
    signals: [],
    evidence: [],
    lastSeenAt: input.lastSeenAt
  };
  group.candidateIds = unique([...group.candidateIds, ...input.candidateIds]);
  group.sourceScenarioIds = unique([...group.sourceScenarioIds, ...input.sourceScenarioIds]);
  for (const [status, count] of Object.entries(input.statuses ?? {})) {
    group.statuses[status as CapabilityScenarioCandidateStatus] += count ?? 0;
  }
  group.occurrences += input.occurrences;
  group.signals = unique([...group.signals, ...input.signals]);
  group.evidence = unique([...group.evidence, ...input.evidence]);
  if (input.lastSeenAt > group.lastSeenAt) group.lastSeenAt = input.lastSeenAt;
  grouped.set(key, group);
}

function selfReviewActionArea(action: string) {
  switch (action) {
    case "resume_incomplete_run":
      return "completion";
    case "run_verification_after_change":
    case "repair_failed_verification":
      return "verification";
    case "strengthen_tool_choice_order":
      return "tool_choice";
    case "resolve_tool_recovery_hints":
      return "tool_recovery";
    case "review_permission_policy":
      return "permission";
    case "monitor_provider_quality":
      return "provider";
    case "improve_context_injection":
      return "context";
    case "inspect_handoff_state":
      return "handoff";
    default:
      return undefined;
  }
}

function selfReviewActionForFinding(
  report: CapabilityImprovementRunReportInput,
  finding: CapabilityImprovementRunReportInput["selfReview"]["findings"][number]
) {
  return report.selfReview.nextActions.find((action) => selfReviewActionArea(action) === finding.area)
    ?? slug(finding.nextAction);
}

function selfReviewSourceScenarioId(action: string) {
  return `self-review:${action}`;
}

function failurePatternIdForSourceScenario(sourceScenarioId: string) {
  return `failure-pattern:${sourceScenarioId}`;
}

function severityRank(severity: RunSelfReviewSeverity) {
  switch (severity) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

function failurePatternPriorityBoost(count: number, severity: RunSelfReviewSeverity) {
  if (count <= 1) return 0;
  const base = severity === "high"
    ? 15
    : severity === "medium"
      ? 10
      : 5;
  return Math.min(40, (count - 1) * base);
}

function selfReviewFindingResolvedByReport(
  finding: CapabilityImprovementRunReportInput["selfReview"]["findings"][number],
  report: CapabilityImprovementRunReportInput
) {
  if (report.selfReview.status !== "pass" || report.selfReview.findings.length > 0) return false;
  switch (finding.area) {
    case "completion":
      return (
        report.metrics?.maxTurnStop === false &&
        report.metrics?.userInputRequired === false &&
        report.metrics?.blocked === false
      );
    case "verification":
      return (
        report.metrics?.verificationPassRate === 1 ||
        (report.metrics?.verificationPassRate === undefined && report.metrics?.repairAttemptCount === 0)
      );
    case "tool_choice":
      return report.metrics?.toolPriorityMissedCount === 0;
    case "tool_recovery":
      return report.metrics?.toolRecoveryUnrecoveredCount === 0;
    default:
      return false;
  }
}

function selfReviewFindingIsStale(
  report: CapabilityImprovementRunReportInput,
  finding: CapabilityImprovementRunReportInput["selfReview"]["findings"][number],
  runReports: CapabilityImprovementRunReportInput[]
) {
  return runReports.some((candidate) =>
    candidate.createdAt > report.createdAt &&
    selfReviewFindingResolvedByReport(finding, candidate));
}

function activeSelfReviewFindings(runReports: CapabilityImprovementRunReportInput[]) {
  return runReports.flatMap((report) =>
    report.selfReview.findings
      .filter((finding) => !selfReviewFindingIsStale(report, finding, runReports))
      .map((finding) => ({ report, finding })));
}

function buildSelfReviewFailurePatterns(
  runReports: CapabilityImprovementRunReportInput[]
): CapabilityRunFailurePattern[] {
  const patterns = new Map<string, CapabilityRunFailurePattern>();

  for (const { report, finding } of activeSelfReviewFindings(runReports)) {
    const action = selfReviewActionForFinding(report, finding);
    const sourceScenarioId = selfReviewSourceScenarioId(action);
    const id = failurePatternIdForSourceScenario(sourceScenarioId);
    const existing = patterns.get(id);
    const latestFinding = !existing || report.createdAt >= existing.latestSeenAt;
    const severity = existing && severityRank(existing.severity) > severityRank(finding.severity)
      ? existing.severity
      : finding.severity;

    patterns.set(id, {
      id,
      sourceScenarioId,
      area: finding.area,
      severity,
      message: latestFinding ? finding.message : existing.message,
      nextAction: latestFinding ? finding.nextAction : existing.nextAction,
      count: (existing?.count ?? 0) + 1,
      priorityBoost: 0,
      firstSeenAt: existing && existing.firstSeenAt < report.createdAt
        ? existing.firstSeenAt
        : report.createdAt,
      latestSeenAt: existing && existing.latestSeenAt > report.createdAt
        ? existing.latestSeenAt
        : report.createdAt,
      runReportIds: unique([
        ...(existing?.runReportIds ?? []),
        report.id
      ]),
      sessionIds: unique([
        ...(existing?.sessionIds ?? []),
        report.sessionId
      ])
    });
  }

  return Array.from(patterns.values())
    .filter((pattern) => pattern.count > 1)
    .map((pattern) => ({
      ...pattern,
      priorityBoost: failurePatternPriorityBoost(pattern.count, pattern.severity)
    }))
    .sort((left, right) => (
      right.count - left.count ||
      severityRank(right.severity) - severityRank(left.severity) ||
      right.latestSeenAt.localeCompare(left.latestSeenAt) ||
      left.id.localeCompare(right.id)
    ));
}

function selfReviewSignalMapping(
  finding: CapabilityImprovementRunReportInput["selfReview"]["findings"][number],
  action: string
): {
  scenarioCategory: CapabilityScenarioCandidate["category"];
  failureCategory: CapabilityFailureCategory;
} {
  switch (finding.area) {
    case "completion":
      return { scenarioCategory: "long-running", failureCategory: "missing-events" };
    case "verification":
      return { scenarioCategory: "verification", failureCategory: "minimum-tool-calls" };
    case "tool_choice":
      return { scenarioCategory: "workspace", failureCategory: "tool-order" };
    case "tool_recovery":
      return { scenarioCategory: "tool-recovery", failureCategory: "tool-order" };
    case "permission":
      return { scenarioCategory: "practical-work", failureCategory: "forbidden-tools" };
    case "provider":
      return { scenarioCategory: "provider-recovery", failureCategory: "missing-events" };
    case "context":
      return { scenarioCategory: "memory-session", failureCategory: "missing-events" };
    case "handoff":
      return { scenarioCategory: "channel", failureCategory: "missing-events" };
    default:
      return action.includes("verification")
        ? { scenarioCategory: "verification", failureCategory: "minimum-tool-calls" }
        : { scenarioCategory: "practical-work", failureCategory: "unclassified" };
  }
}

function addSelfReviewFindingGroups(
  grouped: Map<string, CapabilityImprovementFindingGroup>,
  runReports: CapabilityImprovementRunReportInput[]
) {
  for (const { report, finding } of activeSelfReviewFindings(runReports)) {
    const action = selfReviewActionForFinding(report, finding);
    const mapping = selfReviewSignalMapping(finding, action);
    const sourceScenarioId = selfReviewSourceScenarioId(action);
    addImprovementFindingGroup(grouped, `${mapping.scenarioCategory}:${mapping.failureCategory}`, {
      failureCategory: mapping.failureCategory,
      scenarioCategory: mapping.scenarioCategory,
      candidateIds: [],
      sourceScenarioIds: [sourceScenarioId],
      occurrences: 1,
      signals: unique([
        sourceScenarioId,
        finding.area,
        finding.severity
      ]),
      evidence: [
        `self-review session=${report.sessionId} status=${report.selfReview.status} score=${report.selfReview.score} area=${finding.area} severity=${finding.severity}: ${finding.message}`
      ],
      lastSeenAt: report.createdAt
    });
  }
}

function selfReviewFindingOccurrenceCount(runReports: CapabilityImprovementRunReportInput[]) {
  return activeSelfReviewFindings(runReports).length;
}

function findingTitle(category: CapabilityFailureCategory, scenarioCategory: string) {
  return `${scenarioCategory}: ${category}`;
}

function findingAction(category: CapabilityFailureCategory, signals: string[]) {
  const signalText = signals.length > 0 ? signals.join(", ") : "the missing evidence";
  switch (category) {
    case "tool-routing":
      return `Strengthen tool routing so ${signalText} is selected before answering.`;
    case "missing-tools":
      return `Add prompt, policy, or tool-selection guidance that makes Xenesis call ${signalText}.`;
    case "missing-tool-groups":
      return `Ensure at least one specialized tool from ${signalText} is selected before answering.`;
    case "missing-events":
      return `Expose and preserve runtime event evidence for ${signalText}.`;
    case "forbidden-tools":
      return `Reduce unsafe or generic tool use, especially ${signalText}, by preferring structured alternatives.`;
    case "missing-text":
      return `Improve answer synthesis so final responses include required evidence: ${signalText}.`;
    case "missing-text-groups":
      return `Improve answer synthesis so at least one required evidence phrase appears: ${signalText}.`;
    case "minimum-tool-calls":
      return `Ensure repeated verification or lookup calls meet the minimum counts: ${signalText}.`;
    case "tool-order":
      return `Adjust the agent loop so ordered tool evidence appears after the required predecessor: ${signalText}.`;
    case "unclassified":
      return "Review the transcript and classify this failure into a more precise scenario requirement.";
  }
}

function emptyStatusCounts(): Record<CapabilityScenarioCandidateStatus, number> {
  return {
    candidate: 0,
    accepted: 0,
    ignored: 0
  };
}

function recommendationAreaForFailure(category: CapabilityFailureCategory): CapabilityImprovementArea {
  switch (category) {
    case "tool-routing":
    case "missing-tools":
    case "missing-tool-groups":
    case "minimum-tool-calls":
    case "tool-order":
      return "tool-selection-policy";
    case "missing-events":
      return "runtime-observability";
    case "forbidden-tools":
      return "permission-safety";
    case "missing-text":
    case "missing-text-groups":
      return "answer-synthesis";
    case "unclassified":
      return "scenario-taxonomy";
  }
}

function recommendationAreaForScenarioCategory(category: string): CapabilityImprovementArea | undefined {
  switch (category) {
    case "practical-work":
    case "long-running":
      return "self-execution-loop";
    case "memory-session":
      return "context-continuity";
    case "verification":
      return "verify-repair-loop";
    default:
      return undefined;
  }
}

function recommendationAreasForFinding(finding: CapabilityImprovementFinding): CapabilityImprovementArea[] {
  return unique([
    recommendationAreaForFailure(finding.failureCategory),
    recommendationAreaForScenarioCategory(finding.scenarioCategory) ?? ""
  ]) as CapabilityImprovementArea[];
}

function recommendationAreaOrder(area: CapabilityImprovementArea) {
  const order: CapabilityImprovementArea[] = [
    "tool-selection-policy",
    "self-execution-loop",
    "context-continuity",
    "verify-repair-loop",
    "runtime-observability",
    "permission-safety",
    "answer-synthesis",
    "scenario-taxonomy"
  ];
  return order.indexOf(area);
}

function recommendationTitle(area: CapabilityImprovementArea) {
  switch (area) {
    case "tool-selection-policy":
      return "Strengthen tool selection and ordering policy";
    case "self-execution-loop":
      return "Strengthen practical self-execution loop";
    case "context-continuity":
      return "Strengthen memory and session continuity";
    case "verify-repair-loop":
      return "Strengthen verification and repair loop";
    case "runtime-observability":
      return "Expose required runtime events consistently";
    case "permission-safety":
      return "Tighten unsafe or generic tool denial and recovery";
    case "answer-synthesis":
      return "Improve final answer evidence synthesis";
    case "scenario-taxonomy":
      return "Classify unstructured capability failures";
  }
}

function recommendationRationale(area: CapabilityImprovementArea, signals: string[]) {
  const signalText = signals.length > 0 ? signals.join(", ") : "the repeated failure evidence";
  switch (area) {
    case "tool-selection-policy":
      return `Repeated runs indicate Xenesis is not selecting or ordering required structured tools: ${signalText}.`;
    case "self-execution-loop":
      return `Practical work scenarios failed, which means the inspect, plan, execute, verify, repair, and report loop needs tighter end-to-end guidance: ${signalText}.`;
    case "context-continuity":
      return `Memory, session, or context-continuity scenarios failed, so durable context injection and stale-context arbitration need improvement: ${signalText}.`;
    case "verify-repair-loop":
      return `Verification scenarios failed, so the agent needs stronger failure-evidence capture, bounded repair, and rerun behavior: ${signalText}.`;
    case "runtime-observability":
      return `Capability checks need durable runtime events for diagnostics and regression scoring: ${signalText}.`;
    case "permission-safety":
      return `The agent used tools that should be avoided or denied before safer alternatives are tried: ${signalText}.`;
    case "answer-synthesis":
      return `The run may complete but the final answer still misses required evidence: ${signalText}.`;
    case "scenario-taxonomy":
      return `Some failures are not yet mapped to a precise capability class: ${signalText}.`;
  }
}

function recommendationActions(area: CapabilityImprovementArea, signals: string[]) {
  const signalText = signals.length > 0 ? signals.join(", ") : "the affected capability";
  switch (area) {
    case "tool-selection-policy":
      return [
        `Update tool-selection guidance so ${signalText} is preferred before generic answering or broad search.`,
        "Add or adjust adaptive policy rules when repeated diagnostics show the same missing tool pattern.",
        "Keep the matching capability scenario active as a regression check."
      ];
    case "self-execution-loop":
      return [
        "Make the runtime classify practical work before acting, then force inspect -> plan -> execute -> verify -> report evidence for non-trivial requests.",
        "Promote practical-work scenario failures into concrete improvement tasks instead of treating them as isolated prompt misses.",
        "Keep practical-work capability scenarios in the default regression suite."
      ];
    case "context-continuity":
      return [
        "Inject live workspace, Desk/IDE, background task, session, and memory context in a clear priority order.",
        "Refresh live context when the user says current, selected, active, or this folder.",
        "Keep memory for durable facts and preferences rather than transient scratchpad state."
      ];
    case "verify-repair-loop":
      return [
        "Capture the first failing verification command and smallest useful error before editing.",
        "Rerun the focused verification after repair, and stop when the same failure signature repeats.",
        "Record repair stop reasons in reports so the next run avoids repeating the same failed fix."
      ];
    case "runtime-observability":
      return [
        `Emit and preserve runtime event evidence for ${signalText}.`,
        "Confirm session logs, reports, and gateway traces expose the same event names.",
        "Add scenario assertions for the required events."
      ];
    case "permission-safety":
      return [
        `Prefer safer structured alternatives before allowing ${signalText}.`,
        "Review deny/recovery policy so the agent explains blocked actions and chooses a permitted path.",
        "Add regression checks for forbidden tool avoidance."
      ];
    case "answer-synthesis":
      return [
        `Update answer synthesis so final responses include ${signalText}.`,
        "Verify the final answer uses gathered evidence rather than only tool output side effects.",
        "Add required text or text group checks to keep the response behavior stable."
      ];
    case "scenario-taxonomy":
      return [
        "Review the raw failure text and add a more precise parser category.",
        "Promote the scenario only after the failure class is understandable and actionable.",
        "Update the improvement report mapping when a new category is added."
      ];
  }
}

function recommendationTargetFiles(area: CapabilityImprovementArea) {
  switch (area) {
    case "tool-selection-policy":
      return [
        "src/core/agentCapabilityPolicy.ts",
        "src/core/adaptiveExecutionPolicy.ts",
        "src/core/intentRouter.ts",
        "src/tools/index.ts",
        "src/evaluation/capabilityEval.ts"
      ];
    case "self-execution-loop":
      return [
        "src/core/AgentRuntimeFactory.ts",
        "src/core/AgentRunner.ts",
        "src/core/AgentRunService.ts",
        "src/core/agentCapabilityPolicy.ts",
        "src/workflows/llmOrchestrationPolicy.ts",
        "src/evaluation/capabilityEval.ts"
      ];
    case "context-continuity":
      return [
        "src/core/AgentRuntimeFactory.ts",
        "src/context/index.ts",
        "src/extensions/memory.ts",
        "src/sessions/index.ts",
        "src/orchestration/index.ts",
        "src/evaluation/capabilityEval.ts"
      ];
    case "verify-repair-loop":
      return [
        "src/verification/index.ts",
        "src/core/AgentRunService.ts",
        "src/core/AgentRunReporter.ts",
        "src/core/operationalFailureContext.ts",
        "src/evaluation/capabilityEval.ts"
      ];
    case "runtime-observability":
      return [
        "src/core/events.ts",
        "src/core/AgentRunner.ts",
        "src/core/AgentRunService.ts",
        "src/sessions/JsonlSessionWriter.ts",
        "src/evaluation/capabilityEval.ts"
      ];
    case "permission-safety":
      return [
        "src/permissions/policy.ts",
        "src/core/adaptiveExecutionPolicy.ts",
        "src/core/AgentRunner.ts",
        "src/evaluation/capabilityEval.ts"
      ];
    case "answer-synthesis":
      return [
        "src/core/AgentRunner.ts",
        "src/core/AgentRunPipeline.ts",
        "src/workflows/llmOrchestrationPolicy.ts",
        "src/evaluation/capabilityEval.ts"
      ];
    case "scenario-taxonomy":
      return [
        "src/evaluation/capabilityEval.ts",
        "src/evaluation/capabilityFeedbackLoop.ts"
      ];
  }
}

function recommendationVerification(sourceScenarioIds: string[]) {
  const scenarioCommands = unique(sourceScenarioIds)
    .filter((scenarioId) => !scenarioId.startsWith("self-review:") && !scenarioId.startsWith("run:"))
    .sort()
    .slice(0, 5)
    .map((scenarioId) => `npm run capability:eval -- --scenario ${scenarioId}`);
  return [
    ...scenarioCommands,
    "npm run typecheck",
    "npm run capability:improve",
    "npm run test -- tests/evaluation/capabilityFeedbackLoop.test.ts"
  ];
}

function requiredVerification(commands: string[]) {
  return unique([
    ...commands,
    "npm run typecheck"
  ]);
}

function sanitizeTaskPromptText(value: string) {
  return value
    .replace(/\b([A-Za-z_][A-Za-z0-9_-]*):\d+\b/g, "$1")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function truncatePromptLine(value: string, maxChars: number) {
  const sanitized = sanitizeTaskPromptText(value);
  if (sanitized.length <= maxChars) return sanitized;
  return `${sanitized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function compactPromptValues(values: string[], maxItems: number) {
  return unique(values.map(sanitizeTaskPromptText))
    .filter((value) => value.length > 0)
    .slice(0, maxItems);
}

function promptEvidenceLine(label: string, values: string[], maxItems: number) {
  const compact = compactPromptValues(values, maxItems);
  if (compact.length === 0) return undefined;
  const remaining = Math.max(0, unique(values).length - compact.length);
  return `${label}: ${compact.join(", ")}${remaining > 0 ? ` (+${remaining} more)` : ""}`;
}

function diagnosticsHintForVerification(command: string) {
  const match = command.match(/^npm\s+run\s+(?:--silent\s+)?([A-Za-z0-9:_-]+)(?:\s+--\s+(.+))?$/);
  if (!match) return undefined;
  const script = match[1]!;
  const rawArgs = match[2]?.trim();
  if (!rawArgs) return `diagnostics script=${script}`;
  const args = rawArgs.split(/\s+/).filter(Boolean);
  return `diagnostics script=${script} args=${args.join(" ")}`;
}

function diagnosticsHintsForVerification(commands: string[]) {
  return unique(commands
    .map(diagnosticsHintForVerification)
    .filter((hint): hint is string => Boolean(hint)));
}

function taskPromptForRecommendation(recommendation: CapabilityImprovementRecommendation) {
  const failurePatternIds = recommendation.failurePatternIds ?? [];
  const verification = requiredVerification(recommendation.verification);
  const diagnosticsHints = diagnosticsHintsForVerification(verification);
  const evidence = [
    promptEvidenceLine("Findings", recommendation.findingIds, 6),
    promptEvidenceLine("Scenarios", recommendation.sourceScenarioIds, 6),
    promptEvidenceLine("Signals", recommendation.signals, 6),
    promptEvidenceLine("Failure patterns", failurePatternIds, 4)
  ].filter((line): line is string => Boolean(line));
  return [
    `Capability improvement task: ${recommendation.title}`,
    "",
    `Priority: ${recommendation.priority} (${recommendation.priorityScore})`,
    `Area: ${recommendation.area}`,
    "",
    "Rationale:",
    truncatePromptLine(recommendation.rationale, 520),
    "",
    "Actions:",
    ...recommendation.actions.slice(0, 4).map((action) => `- ${truncatePromptLine(action, 260)}`),
    "",
    "Execution constraints:",
    "- Make one cohesive change set and avoid broad rewrites.",
    "- Inspect before editing, patch minimally, then run the listed verification.",
    "- Treat findings, scenarios, signals, and failure patterns as evidence labels, not literal patch targets.",
    "- Do not add interface fields, config knobs, or schema properties unless the failure output or a focused test explicitly requires them.",
    "- Stop and report blocked/failed status when the same failure signature repeats or required context is missing.",
    "",
    "Target files:",
    ...recommendation.targetFiles.map((path) => `- ${path}`),
    "",
    "Verification:",
    ...verification.map((command) => `- ${command}`),
    ...(diagnosticsHints.length > 0
      ? [
          "",
          "Tool-safe diagnostics hints:",
          ...diagnosticsHints.map((hint) => `- ${hint}`)
        ]
      : []),
    "",
    "Key evidence:",
    ...(evidence.length > 0 ? evidence.map((line) => `- ${line}`) : ["- repeated capability failure evidence"])
  ].join("\n");
}

function executionStatusFromTaskStatus(status: AgentTask["status"]): CapabilityImprovementExecutionStatus {
  switch (status) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "running":
      return "running";
    case "cancelled":
      return "cancelled";
    case "blocked":
      return "blocked";
    case "queued":
      return "open";
  }
}

function latestTaskResult(
  current: CapabilityImprovementTaskRunRecord | undefined,
  next: CapabilityImprovementTaskRunRecord
) {
  if (!current) return next;
  return next.resultAt >= current.resultAt ? next : current;
}

function latestTaskResultsByRecommendation(results: CapabilityImprovementTaskResultsLog | undefined) {
  const latestByRecommendation = new Map<string, CapabilityImprovementTaskRunRecord>();
  for (const result of results?.results ?? []) {
    if (!result.recommendationId) continue;
    latestByRecommendation.set(
      result.recommendationId,
      latestTaskResult(latestByRecommendation.get(result.recommendationId), result)
    );
  }
  return latestByRecommendation;
}

function latestTaskResultsByTask(results: CapabilityImprovementTaskResultsLog | undefined) {
  const latestByTask = new Map<string, CapabilityImprovementTaskRunRecord>();
  for (const result of results?.results ?? []) {
    latestByTask.set(result.taskId, latestTaskResult(latestByTask.get(result.taskId), result));
  }
  return latestByTask;
}

function executionDetailsFromTaskResult(
  result: CapabilityImprovementTaskRunRecord | undefined
): CapabilityImprovementExecutionDetails {
  if (!result) return { executionStatus: "open" };

  const details: CapabilityImprovementExecutionDetails = {
    executionStatus: executionStatusFromTaskStatus(result.status),
    latestTaskResultAt: result.resultAt,
    latestTaskSessionId: result.sessionId
  };
  if (result.output) details.latestTaskOutputPreview = result.output.slice(0, 1200);
  if (result.error) details.latestTaskError = result.error;
  return details;
}

function impactFromCompletedTask(
  task: AgentTask,
  taskCandidate: CapabilityImprovementTaskCandidate | undefined,
  recordedAt: string
): CapabilityImprovementTaskImpact | undefined {
  if (task.status !== "completed" || !taskCandidate) return undefined;
  return {
    kind: "capability-improvement-impact",
    taskId: task.id,
    recommendationId: taskCandidate.recommendationId,
    area: taskCandidate.area,
    status: "completed",
    summary: `${taskCandidate.title} completed for ${taskCandidate.area}.`,
    targetFiles: [...taskCandidate.targetFiles],
    verification: [...taskCandidate.verification],
    sourceScenarioIds: [...taskCandidate.sourceScenarioIds],
    recordedAt
  };
}

function emptyPolicyImpactSummary(): CapabilityImprovementPolicyImpactSummary {
  return {
    completedTaskIds: [],
    areas: [],
    targetFiles: [],
    verification: [],
    effectiveness: []
  };
}

function runReportTimestamp(report: CapabilityImprovementRunReportInput) {
  const parsed = Date.parse(report.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function averageRunMetric(
  reports: CapabilityImprovementRunReportInput[],
  metricName: "qualityScore" | "toolPriorityMissedCount" | "verificationPassRate" | "repairAttemptCount"
) {
  const values = reports
    .map((report) => report.metrics?.[metricName])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundedDelta(after: number | undefined, before: number | undefined) {
  if (after === undefined || before === undefined) return undefined;
  return Math.round((after - before) * 100) / 100;
}

function impactEffectivenessStatus(input: {
  qualityScoreDelta?: number;
  toolPriorityMissedCountDelta?: number;
  verificationPassRateDelta?: number;
  repairAttemptCountDelta?: number;
}): CapabilityImprovementPolicyImpactEffectivenessStatus {
  const signals = [
    input.qualityScoreDelta !== undefined && Math.abs(input.qualityScoreDelta) > 0.001
      ? Math.sign(input.qualityScoreDelta)
      : 0,
    input.toolPriorityMissedCountDelta !== undefined && Math.abs(input.toolPriorityMissedCountDelta) > 0.001
      ? -Math.sign(input.toolPriorityMissedCountDelta)
      : 0,
    input.verificationPassRateDelta !== undefined && Math.abs(input.verificationPassRateDelta) > 0.001
      ? Math.sign(input.verificationPassRateDelta)
      : 0,
    input.repairAttemptCountDelta !== undefined && Math.abs(input.repairAttemptCountDelta) > 0.001
      ? -Math.sign(input.repairAttemptCountDelta)
      : 0
  ];
  const improved = signals.filter((signal) => signal > 0).length;
  const regressed = signals.filter((signal) => signal < 0).length;
  if (improved > regressed) return "improved";
  if (regressed > improved) return "regressed";
  return "mixed";
}

function buildImpactEffectiveness(
  area: CapabilityImprovementArea,
  recordedAt: string | undefined,
  runReports: CapabilityImprovementRunReportInput[] | undefined
): CapabilityImprovementPolicyImpactEffectiveness | undefined {
  const impactTime = Date.parse(recordedAt ?? "");
  if (!Number.isFinite(impactTime) || !runReports || runReports.length === 0) return undefined;
  const before = runReports.filter((report) => {
    const timestamp = runReportTimestamp(report);
    return timestamp > 0 && timestamp < impactTime;
  });
  const after = runReports.filter((report) => runReportTimestamp(report) > impactTime);
  if (before.length === 0 || after.length === 0) {
    return {
      area,
      status: "insufficient_data",
      beforeRuns: before.length,
      afterRuns: after.length
    };
  }
  const deltas = {
    qualityScoreDelta: roundedDelta(
      averageRunMetric(after, "qualityScore"),
      averageRunMetric(before, "qualityScore")
    ),
    toolPriorityMissedCountDelta: roundedDelta(
      averageRunMetric(after, "toolPriorityMissedCount"),
      averageRunMetric(before, "toolPriorityMissedCount")
    ),
    verificationPassRateDelta: roundedDelta(
      averageRunMetric(after, "verificationPassRate"),
      averageRunMetric(before, "verificationPassRate")
    ),
    repairAttemptCountDelta: roundedDelta(
      averageRunMetric(after, "repairAttemptCount"),
      averageRunMetric(before, "repairAttemptCount")
    )
  };
  const presentDeltas = Object.fromEntries(
    Object.entries(deltas).filter((entry): entry is [keyof typeof deltas, number] => entry[1] !== undefined)
  );
  return {
    area,
    status: Object.keys(presentDeltas).length > 0 ? impactEffectivenessStatus(presentDeltas) : "insufficient_data",
    beforeRuns: before.length,
    afterRuns: after.length,
    ...presentDeltas
  };
}

function buildPolicyImpactEffectiveness(
  impacts: CapabilityImprovementTaskImpact[],
  runReports: CapabilityImprovementRunReportInput[] | undefined
) {
  const latestByArea = new Map<CapabilityImprovementArea, CapabilityImprovementTaskImpact>();
  for (const impact of impacts) {
    const current = latestByArea.get(impact.area);
    if (!current || impact.recordedAt.localeCompare(current.recordedAt) >= 0) {
      latestByArea.set(impact.area, impact);
    }
  }
  return Array.from(latestByArea.values())
    .map((impact) => buildImpactEffectiveness(impact.area, impact.recordedAt, runReports))
    .filter((item): item is CapabilityImprovementPolicyImpactEffectiveness => Boolean(item))
    .sort((left, right) => left.area.localeCompare(right.area));
}

function buildPolicyImpactSummary(
  taskResults: CapabilityImprovementTaskResultsLog | undefined,
  runReports?: CapabilityImprovementRunReportInput[]
): CapabilityImprovementPolicyImpactSummary {
  const impacts = (taskResults?.results ?? [])
    .map((result) => result.impact)
    .filter((impact): impact is CapabilityImprovementTaskImpact => Boolean(impact));
  if (impacts.length === 0) return emptyPolicyImpactSummary();

  const summary: CapabilityImprovementPolicyImpactSummary = {
    completedTaskIds: unique(impacts.map((impact) => impact.taskId)),
    areas: unique(impacts.map((impact) => impact.area)) as CapabilityImprovementArea[],
    targetFiles: unique(impacts.flatMap((impact) => impact.targetFiles)),
    verification: unique(impacts.flatMap((impact) => impact.verification)),
    effectiveness: buildPolicyImpactEffectiveness(impacts, runReports)
  };
  const latestImpactAt = impacts.map((impact) => impact.recordedAt).sort().at(-1);
  if (latestImpactAt) summary.latestImpactAt = latestImpactAt;
  return summary;
}

function statusCounts(items: Array<{ executionStatus: CapabilityImprovementExecutionStatus }>) {
  return {
    open: items.filter((item) => item.executionStatus === "open").length,
    running: items.filter((item) => item.executionStatus === "running").length,
    completed: items.filter((item) => item.executionStatus === "completed").length,
    failed: items.filter((item) => item.executionStatus === "failed").length,
    cancelled: items.filter((item) => item.executionStatus === "cancelled").length,
    blocked: items.filter((item) => item.executionStatus === "blocked").length
  };
}

function latestResultAt(results: CapabilityImprovementTaskResultsLog | undefined) {
  return (results?.results ?? [])
    .map((result) => result.resultAt)
    .sort()
    .at(-1);
}

function buildExecutionSummary(
  recommendations: CapabilityImprovementRecommendation[],
  taskCandidates: CapabilityImprovementTaskCandidate[],
  taskResults: CapabilityImprovementTaskResultsLog | undefined,
  runReports: CapabilityImprovementRunReportInput[] | undefined
): CapabilityImprovementExecutionSummary {
  const recommendationCounts = statusCounts(recommendations);
  const taskCounts = statusCounts(taskCandidates);
  const summary: CapabilityImprovementExecutionSummary = {
    totalRecommendations: recommendations.length,
    openRecommendations: recommendationCounts.open,
    runningRecommendations: recommendationCounts.running,
    completedRecommendations: recommendationCounts.completed,
    failedRecommendations: recommendationCounts.failed,
    cancelledRecommendations: recommendationCounts.cancelled,
    blockedRecommendations: recommendationCounts.blocked,
    totalTaskCandidates: taskCandidates.length,
    openTaskCandidates: taskCounts.open,
    runningTaskCandidates: taskCounts.running,
    completedTaskCandidates: taskCounts.completed,
    failedTaskCandidates: taskCounts.failed,
    cancelledTaskCandidates: taskCounts.cancelled,
    blockedTaskCandidates: taskCounts.blocked,
    remainingRecommendationIds: recommendations
      .filter((recommendation) => recommendation.executionStatus !== "completed")
      .map((recommendation) => recommendation.id),
    failedRecommendationIds: recommendations
      .filter((recommendation) => recommendation.executionStatus === "failed")
      .map((recommendation) => recommendation.id),
    policyImpact: buildPolicyImpactSummary(taskResults, runReports)
  };
  const latest = latestResultAt(taskResults);
  if (latest) summary.latestResultAt = latest;
  return summary;
}

function compactTimestampForId(timestamp: string) {
  return timestamp
    .replace(/[^0-9A-Za-z]+/g, "")
    .toLowerCase();
}

function followUpTaskId(baseTaskId: string, timestamp: string) {
  return `${baseTaskId}-followup-${compactTimestampForId(timestamp)}`;
}

function reworkTaskId(baseTaskId: string, timestamp: string) {
  return `${baseTaskId}-rework-${compactTimestampForId(timestamp)}`;
}

function isPolicyImpactReworkTaskId(taskId: string | undefined) {
  return Boolean(taskId?.includes("-rework-"));
}

function resetRecoveredTaskCandidate(
  task: CapabilityImprovementTaskCandidate,
  agentTaskId: string,
  timestamp: string
): CapabilityImprovementTaskCandidate {
  const {
    latestTaskResultAt,
    latestTaskSessionId,
    latestTaskOutputPreview,
    latestTaskError,
    ...rest
  } = task;
  return {
    ...rest,
    status: "accepted",
    promotedAgentTaskId: agentTaskId,
    promotedAt: timestamp,
    executionStatus: "open"
  };
}

function taskCandidateWithExecutionDetails(
  task: CapabilityImprovementTaskCandidate,
  details: CapabilityImprovementExecutionDetails
): CapabilityImprovementTaskCandidate {
  const {
    latestTaskResultAt,
    latestTaskSessionId,
    latestTaskOutputPreview,
    latestTaskError,
    ...rest
  } = task;
  const updated: CapabilityImprovementTaskCandidate = {
    ...rest,
    executionStatus: details.executionStatus
  };
  if (details.latestTaskResultAt) updated.latestTaskResultAt = details.latestTaskResultAt;
  if (details.latestTaskSessionId) updated.latestTaskSessionId = details.latestTaskSessionId;
  if (details.latestTaskOutputPreview) updated.latestTaskOutputPreview = details.latestTaskOutputPreview;
  if (details.latestTaskError) updated.latestTaskError = details.latestTaskError;
  return updated;
}

function syncTaskBacklogExecution(
  backlog: CapabilityImprovementTaskBacklog,
  report: CapabilityImprovementReport
): CapabilityImprovementTaskBacklog {
  const reportTaskById = new Map(report.taskCandidates.map((task) => [task.id, task]));
  return {
    ...backlog,
    tasks: backlog.tasks.map((task) => {
      const reportTask = reportTaskById.get(task.id);
      if (!reportTask) return task;
      return taskCandidateWithExecutionDetails(task, {
        executionStatus: reportTask.executionStatus,
        latestTaskResultAt: reportTask.latestTaskResultAt,
        latestTaskSessionId: reportTask.latestTaskSessionId,
        latestTaskOutputPreview: reportTask.latestTaskOutputPreview,
        latestTaskError: reportTask.latestTaskError
      });
    })
  };
}

function recoveryFollowUpPrompt(
  task: CapabilityImprovementTaskCandidate,
  result: CapabilityImprovementTaskRunRecord
) {
  return [
    `Follow-up capability improvement task: ${task.title}`,
    "",
    "Previous failure:",
    `- Task: ${result.taskId}`,
    `- Status: ${result.status}`,
    `- Session: ${result.sessionId}`,
    result.error ? `- Error: ${result.error}` : "- Error: none recorded",
    "",
    "Original task:",
    task.prompt
  ].join("\n");
}

function findCapabilityTaskCandidateForResult(
  backlog: CapabilityImprovementTaskBacklog,
  result: CapabilityImprovementTaskRunRecord
) {
  return backlog.tasks.find((task) =>
    task.id === result.taskId ||
    task.promotedAgentTaskId === result.taskId ||
    (result.recommendationId !== undefined && task.recommendationId === result.recommendationId));
}

function latestFailedCapabilityTaskResults(
  results: CapabilityImprovementTaskResultsLog | undefined,
  ids: string[] | undefined
) {
  const idSet = ids && ids.length > 0 ? new Set(ids) : undefined;
  return Array.from(latestTaskResultsByTask(results).values())
    .filter((result) => result.status === "failed")
    .filter((result) =>
      !idSet ||
      idSet.has(result.taskId) ||
      (result.recommendationId !== undefined && idSet.has(result.recommendationId)))
    .sort((left, right) => left.taskId.localeCompare(right.taskId));
}

function failedCapabilityTaskResultCount(
  results: CapabilityImprovementTaskResultsLog | undefined,
  task: CapabilityImprovementTaskCandidate
) {
  return (results?.results ?? []).filter((result) => (
    result.status === "failed" &&
    (
      result.taskId === task.id ||
      result.taskId === task.promotedAgentTaskId ||
      (result.recommendationId !== undefined && result.recommendationId === task.recommendationId)
    )
  )).length;
}

function recoveryModeForFailedTask(
  baseMode: CapabilityImprovementTaskRecoveryMode,
  failureCount: number,
  threshold: number | undefined
): CapabilityImprovementTaskRecoveryMode {
  if (threshold !== undefined && failureCount >= threshold) return "follow-up";
  return baseMode;
}

function taskCandidateFromRecommendation(
  recommendation: CapabilityImprovementRecommendation,
  sourceReportCreatedAt: string,
  createdAt: string
): CapabilityImprovementTaskCandidate {
  const failurePatternIds = recommendation.failurePatternIds ?? [];
  const candidate: CapabilityImprovementTaskCandidate = {
    id: `capability-task-${recommendation.id}`,
    status: "candidate",
    recommendationId: recommendation.id,
    area: recommendation.area,
    priority: recommendation.priority,
    priorityScore: recommendation.priorityScore,
    title: recommendation.title,
    prompt: taskPromptForRecommendation(recommendation),
    labels: unique([
      "capability-improvement",
      recommendation.area,
      recommendation.priority,
      ...recommendation.failureCategories,
      ...failurePatternIds
    ]),
    targetFiles: recommendation.targetFiles,
    verification: requiredVerification(recommendation.verification),
    findingIds: recommendation.findingIds,
    sourceScenarioIds: recommendation.sourceScenarioIds,
    sourceReportCreatedAt,
    createdAt,
    executionStatus: recommendation.executionStatus
  };
  if (recommendation.latestTaskResultAt) candidate.latestTaskResultAt = recommendation.latestTaskResultAt;
  if (recommendation.latestTaskSessionId) candidate.latestTaskSessionId = recommendation.latestTaskSessionId;
  if (recommendation.latestTaskOutputPreview) candidate.latestTaskOutputPreview = recommendation.latestTaskOutputPreview;
  if (recommendation.latestTaskError) candidate.latestTaskError = recommendation.latestTaskError;
  if (failurePatternIds.length > 0) candidate.failurePatternIds = failurePatternIds;
  return candidate;
}

function priorityToAgentTaskPriority(priority: CapabilityImprovementPriority) {
  switch (priority) {
    case "critical":
      return 100;
    case "high":
      return 75;
    case "medium":
      return 50;
    case "low":
      return 25;
  }
}

export function buildCapabilityImprovementRecommendations(
  report: Pick<CapabilityImprovementReport, "findings"> & {
    failurePatterns?: CapabilityRunFailurePattern[];
  }
): CapabilityImprovementRecommendation[] {
  const failurePatternsBySourceScenario = new Map(
    (report.failurePatterns ?? []).map((pattern) => [pattern.sourceScenarioId, pattern])
  );
  const groups = new Map<CapabilityImprovementArea, {
    area: CapabilityImprovementArea;
    priorityScore: number;
    findingIds: string[];
    failureCategories: CapabilityFailureCategory[];
    scenarioCategories: string[];
    sourceScenarioIds: string[];
    signals: string[];
    failurePatternIds: string[];
  }>();

  for (const finding of report.findings) {
    const relatedPatterns = finding.sourceScenarioIds
      .map((scenarioId) => failurePatternsBySourceScenario.get(scenarioId))
      .filter((pattern): pattern is CapabilityRunFailurePattern => Boolean(pattern));
    const patternBoost = relatedPatterns.reduce((max, pattern) => Math.max(max, pattern.priorityBoost), 0);
    for (const area of recommendationAreasForFinding(finding)) {
      const group = groups.get(area) ?? {
        area,
        priorityScore: 0,
        findingIds: [],
        failureCategories: [],
        scenarioCategories: [],
        sourceScenarioIds: [],
        signals: [],
        failurePatternIds: []
      };
      group.priorityScore = Math.max(group.priorityScore, finding.priorityScore + patternBoost);
      group.findingIds = unique([...group.findingIds, finding.id]);
      group.failureCategories = unique([...group.failureCategories, finding.failureCategory]) as CapabilityFailureCategory[];
      group.scenarioCategories = unique([...group.scenarioCategories, finding.scenarioCategory]);
      group.sourceScenarioIds = unique([...group.sourceScenarioIds, ...finding.sourceScenarioIds]);
      group.signals = unique([...group.signals, ...finding.signals]);
      group.failurePatternIds = unique([
        ...group.failurePatternIds,
        ...relatedPatterns.map((pattern) => pattern.id)
      ]);
      groups.set(area, group);
    }
  }

  return Array.from(groups.values()).map((group) => {
    const recommendation: CapabilityImprovementRecommendation = {
      id: group.area,
      area: group.area,
      priority: priorityFromScore(group.priorityScore),
      priorityScore: group.priorityScore,
      title: recommendationTitle(group.area),
      rationale: recommendationRationale(group.area, group.signals),
      actions: recommendationActions(group.area, group.signals),
      targetFiles: recommendationTargetFiles(group.area),
      verification: recommendationVerification(group.sourceScenarioIds),
      findingIds: group.findingIds.sort(),
      failureCategories: group.failureCategories.sort((left, right) => failureCategoryOrder(left) - failureCategoryOrder(right)),
      scenarioCategories: group.scenarioCategories.sort(),
      sourceScenarioIds: group.sourceScenarioIds.sort(),
      signals: group.signals.sort(),
      executionStatus: "open" as const
    };
    const failurePatternIds = group.failurePatternIds.sort();
    if (failurePatternIds.length > 0) recommendation.failurePatternIds = failurePatternIds;
    return recommendation;
  }).sort((left, right) => (
    right.priorityScore - left.priorityScore ||
    recommendationAreaOrder(left.area) - recommendationAreaOrder(right.area) ||
    left.area.localeCompare(right.area)
  ));
}

export function buildCapabilityImprovementTaskBacklog(
  options: BuildCapabilityImprovementTaskBacklogOptions
): CapabilityImprovementTaskBacklog {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  return {
    kind: "capability-improvement-task-backlog",
    createdAt,
    sourceReportCreatedAt: options.report.createdAt,
    tasks: options.report.recommendations.map((recommendation) =>
      taskCandidateFromRecommendation(recommendation, options.report.createdAt, createdAt))
  };
}

export async function promoteCapabilityImprovementTask(
  options: PromoteCapabilityImprovementTaskOptions
): Promise<PromoteCapabilityImprovementTaskResult> {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const candidate = options.backlog.tasks.find((task) => task.id === options.id);
  if (!candidate) throw new Error(`Capability improvement task candidate not found: ${options.id}`);
  if (candidate.status === "ignored") {
    throw new Error(`Capability improvement task candidate is ignored: ${options.id}`);
  }
  if (candidate.promotedAgentTaskId) {
    throw new Error(`Capability improvement task candidate already promoted: ${options.id}`);
  }

  const agentTask = await options.store.create({
    id: candidate.id,
    prompt: candidate.prompt,
    source: "capability-improvement",
    label: candidate.title,
    priority: priorityToAgentTaskPriority(candidate.priority),
    approvalMode: "safe",
    maxTurns: 8
  });

  return {
    agentTask,
    backlog: {
      ...options.backlog,
      tasks: options.backlog.tasks.map((task) =>
        task.id === options.id
          ? {
              ...task,
              status: "accepted",
              promotedAgentTaskId: agentTask.id,
              promotedAt: timestamp
            }
          : task)
    }
  };
}

export function recordCapabilityImprovementTaskRun(
  options: RecordCapabilityImprovementTaskRunOptions
): CapabilityImprovementTaskResultsLog {
  const resultAt = (options.now ?? (() => new Date()))().toISOString();
  const record: CapabilityImprovementTaskRunRecord = {
    taskId: options.task.id,
    status: options.task.status,
    resultAt,
    sessionId: options.task.sessionId,
    source: options.task.source,
    label: options.task.label,
    attempts: options.task.attempts,
    output: options.task.output,
    error: options.task.error,
    artifactId: options.task.artifactId,
    usage: options.task.usage,
    recommendationId: options.taskCandidate?.recommendationId,
    area: options.taskCandidate?.area,
    sourceScenarioIds: options.taskCandidate?.sourceScenarioIds ?? [],
    verification: options.taskCandidate?.verification ?? []
  };
  const impact = impactFromCompletedTask(options.task, options.taskCandidate, resultAt);
  if (impact) record.impact = impact;
  return {
    kind: "capability-improvement-task-results",
    updatedAt: resultAt,
    results: [
      ...(options.existing?.results ?? []),
      record
    ]
  };
}

export async function runCapabilityImprovementAgentTask(
  options: RunCapabilityImprovementAgentTaskOptions
): Promise<RunCapabilityImprovementAgentTaskResult> {
  let task: AgentTask;
  try {
    task = await runAgentTask(options.store, options.id, options.executor);
  } catch (error) {
    const latest = await options.store.get(options.id);
    if (!latest) throw error;
    task = latest;
  }
  return {
    agentTask: task,
    results: recordCapabilityImprovementTaskRun({
      task,
      existing: options.results,
      taskCandidate: options.taskCandidate,
      now: options.now
    })
  };
}

async function createCapabilityImprovementFollowUpTask(
  store: AgentTaskStore,
  task: CapabilityImprovementTaskCandidate,
  result: CapabilityImprovementTaskRunRecord,
  timestamp: string
) {
  return await store.create({
    id: followUpTaskId(task.id, timestamp),
    prompt: recoveryFollowUpPrompt(task, result),
    parentSessionId: result.sessionId,
    source: "capability-improvement-follow-up",
    label: `Follow up: ${task.title}`,
    priority: priorityToAgentTaskPriority(task.priority),
    approvalMode: "safe",
    maxTurns: 8
  });
}

function policyImpactReworkPrompt(
  task: CapabilityImprovementTaskCandidate,
  item: CapabilityLoopNextTask
) {
  return [
    `Rework capability improvement task after policy impact regression: ${task.title}`,
    "",
    "Regression signal:",
    item.policyReason ? `- ${item.policyReason}` : "- Policy impact effectiveness regressed after this area was completed.",
    "",
    "Rework goal:",
    "- Inspect the original capability change and its resulting run reports.",
    "- Preserve the intended improvement while removing regressions.",
    "- Add or update focused tests/eval scenarios that would catch the regression.",
    "",
    "Original task:",
    task.prompt
  ].join("\n");
}

async function createCapabilityPolicyImpactReworkTask(
  store: AgentTaskStore,
  task: CapabilityImprovementTaskCandidate,
  item: CapabilityLoopNextTask,
  timestamp: string
) {
  return await store.create({
    id: reworkTaskId(task.id, timestamp),
    prompt: policyImpactReworkPrompt(task, item),
    parentSessionId: task.latestTaskSessionId ?? task.promotedAgentTaskId,
    source: "capability-improvement-rework",
    label: `Rework: ${task.title}`,
    priority: priorityToAgentTaskPriority(task.priority),
    approvalMode: "safe",
    maxTurns: 8
  });
}

export async function recoverFailedCapabilityImprovementTasks(
  options: RecoverFailedCapabilityImprovementTasksOptions
): Promise<RecoverFailedCapabilityImprovementTasksResult> {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const mode = options.mode ?? "retry";
  const maxTasks = Math.max(1, options.maxTasks ?? Number.MAX_SAFE_INTEGER);
  const failedResults = latestFailedCapabilityTaskResults(options.results, options.ids).slice(0, maxTasks);
  const recovered: CapabilityImprovementTaskRecoveryRecord[] = [];
  const skipped: CapabilityImprovementTaskRecoverySkippedRecord[] = [];
  const recoveredAgentTaskIds = new Map<string, string>();
  let nextBacklog = options.backlog;

  for (const result of failedResults) {
    const task = findCapabilityTaskCandidateForResult(nextBacklog, result);
    if (!task) {
      skipped.push({ taskId: result.taskId, reason: "task candidate not found" });
      continue;
    }

    try {
      const effectiveMode = recoveryModeForFailedTask(
        mode,
        failedCapabilityTaskResultCount(options.results, task),
        options.autoFollowUpAfterFailures
      );
      const agentTask = effectiveMode === "follow-up"
        ? await createCapabilityImprovementFollowUpTask(options.store, task, result, timestamp)
        : await options.store.retry(result.taskId);
      recovered.push({
        taskId: task.id,
        agentTaskId: agentTask.id,
        mode: effectiveMode,
        status: agentTask.status
      });
      recoveredAgentTaskIds.set(task.id, agentTask.id);
    } catch (error) {
      skipped.push({
        taskId: result.taskId,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (recoveredAgentTaskIds.size > 0) {
    nextBacklog = {
      ...nextBacklog,
      tasks: nextBacklog.tasks.map((task) => {
        const agentTaskId = recoveredAgentTaskIds.get(task.id);
        return agentTaskId ? resetRecoveredTaskCandidate(task, agentTaskId, timestamp) : task;
      })
    };
  }

  return {
    backlog: nextBacklog,
    recovered,
    skipped
  };
}

export async function completeCapabilityImprovementLoop(
  options: CompleteCapabilityImprovementLoopOptions
): Promise<CompleteCapabilityImprovementLoopResult> {
  let taskResults = options.taskResults;
  let report = buildCapabilityImprovementReport({
    backlog: options.backlog,
    taskResults,
    ...(options.runReports ? { runReports: options.runReports } : {}),
    now: options.now
  });
  let taskBacklog = options.taskBacklog ?? buildCapabilityImprovementTaskBacklog({
    report,
    now: options.now
  });
  taskBacklog = syncTaskBacklogExecution(taskBacklog, report);
  let recovery: RecoverFailedCapabilityImprovementTasksResult | undefined;
  const recoveredRuns: RunCapabilityImprovementAgentTaskResult[] = [];

  if (options.recoverFailed) {
    if (!options.store) throw new Error("Capability improvement loop recovery requires an agent task store.");
    recovery = await recoverFailedCapabilityImprovementTasks({
      backlog: taskBacklog,
      results: taskResults,
      store: options.store,
      mode: options.recoveryMode ?? "retry",
      autoFollowUpAfterFailures: options.autoFollowUpAfterFailures,
      now: options.now
    });
    taskBacklog = recovery.backlog;

    if (options.runRecovered && recovery.recovered.length > 0) {
      if (!options.executor) throw new Error("Capability improvement loop rerun requires an executor.");
      for (const item of recovery.recovered) {
        const taskCandidate = taskBacklog.tasks.find((task) => task.id === item.taskId);
        const run = await runCapabilityImprovementAgentTask({
          store: options.store,
          id: item.agentTaskId,
          taskCandidate,
          results: taskResults,
          executor: options.executor,
          now: options.now
        });
        taskResults = run.results;
        recoveredRuns.push(run);
      }
    }

    report = buildCapabilityImprovementReport({
      backlog: options.backlog,
      taskResults,
      ...(options.runReports ? { runReports: options.runReports } : {}),
      now: options.now
    });
    taskBacklog = syncTaskBacklogExecution(taskBacklog, report);
  }

  const result: CompleteCapabilityImprovementLoopResult = {
    report,
    taskBacklog,
    recoveredRuns
  };
  if (taskResults) result.taskResults = taskResults;
  if (recovery) result.recovery = recovery;
  return result;
}

export function buildCapabilityImprovementReport(
  options: BuildCapabilityImprovementReportOptions
): CapabilityImprovementReport {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const activeCandidates = options.backlog.candidates.filter((candidate) => candidate.status !== "ignored");
  const runReports = options.runReports ?? [];
  const selfReviewOccurrences = selfReviewFindingOccurrenceCount(runReports);
  const failurePatterns = buildSelfReviewFailurePatterns(runReports);
  const grouped = new Map<string, CapabilityImprovementFindingGroup>();

  for (const candidate of activeCandidates) {
    for (const item of categorySignals(candidate)) {
      const key = `${candidate.category}:${item.category}`;
      addImprovementFindingGroup(grouped, key, {
        failureCategory: item.category,
        scenarioCategory: candidate.category,
        candidateIds: [candidate.id],
        sourceScenarioIds: [candidate.sourceScenarioId],
        statuses: { [candidate.status]: 1 },
        occurrences: candidate.occurrences,
        signals: item.signals,
        evidence: candidate.failures,
        lastSeenAt: candidate.lastSeenAt
      });
    }
  }
  addSelfReviewFindingGroups(grouped, runReports);

  const findings = Array.from(grouped.values()).map((group) => {
    const priorityScore = group.occurrences * failureCategoryWeight(group.failureCategory);
    const priority = priorityFromScore(priorityScore);
    return {
      id: `${group.scenarioCategory}-${group.failureCategory}`,
      failureCategory: group.failureCategory,
      scenarioCategory: group.scenarioCategory,
      priority,
      priorityScore,
      title: findingTitle(group.failureCategory, group.scenarioCategory),
      action: findingAction(group.failureCategory, group.signals),
      candidateIds: group.candidateIds,
      sourceScenarioIds: group.sourceScenarioIds,
      statuses: group.statuses,
      occurrences: group.occurrences,
      signals: group.signals,
      evidence: group.evidence,
      lastSeenAt: group.lastSeenAt
    };
  }).sort((left, right) => (
    right.priorityScore - left.priorityScore ||
    failureCategoryOrder(left.failureCategory) - failureCategoryOrder(right.failureCategory) ||
    left.id.localeCompare(right.id)
  ));

  const categorySummary: Record<string, CapabilityImprovementCategorySummary> = {};
  for (const candidate of activeCandidates) {
    const summary = categorySummary[candidate.category] ?? {
      candidates: 0,
      occurrences: 0,
      topFailureCategories: []
    };
    summary.candidates += 1;
    summary.occurrences += candidate.occurrences;
    categorySummary[candidate.category] = summary;
  }
  for (const [category, summary] of Object.entries(categorySummary)) {
    summary.topFailureCategories = findings
      .filter((finding) => finding.scenarioCategory === category)
      .sort((left, right) => (
        right.occurrences - left.occurrences ||
        failureCategoryOrder(left.failureCategory) - failureCategoryOrder(right.failureCategory)
      ))
      .map((finding) => finding.failureCategory)
      .slice(0, 5);
  }

  const taskResultsByRecommendation = latestTaskResultsByRecommendation(options.taskResults);
  const recommendations = buildCapabilityImprovementRecommendations({ findings, failurePatterns }).map((recommendation) => ({
    ...recommendation,
    ...executionDetailsFromTaskResult(taskResultsByRecommendation.get(recommendation.id))
  }));
  const reportCreatedAt = createdAt;
  const taskResultsByTask = latestTaskResultsByTask(options.taskResults);
  const taskCandidates = recommendations.map((recommendation) => {
    const taskCandidate = taskCandidateFromRecommendation(recommendation, reportCreatedAt, reportCreatedAt);
    return {
      ...taskCandidate,
      ...executionDetailsFromTaskResult(taskResultsByTask.get(taskCandidate.id))
    };
  });

  return {
    kind: "capability-improvement-report",
    createdAt,
    backlogUpdatedAt: options.backlog.updatedAt,
    summary: {
      totalCandidates: options.backlog.candidates.length,
      activeCandidates: activeCandidates.length,
      acceptedCandidates: activeCandidates.filter((candidate) => candidate.status === "accepted").length,
      candidateCandidates: activeCandidates.filter((candidate) => candidate.status === "candidate").length,
      ignoredCandidates: options.backlog.candidates.filter((candidate) => candidate.status === "ignored").length,
      repeatedCandidates: activeCandidates.filter((candidate) => candidate.occurrences > 1).length,
      totalOccurrences: activeCandidates.reduce((sum, candidate) => sum + candidate.occurrences, 0) + selfReviewOccurrences,
      critical: findings.filter((finding) => finding.priority === "critical").length,
      high: findings.filter((finding) => finding.priority === "high").length,
      medium: findings.filter((finding) => finding.priority === "medium").length,
      low: findings.filter((finding) => finding.priority === "low").length
    },
    categorySummary,
    failurePatterns,
    findings,
    recommendations,
    taskCandidates,
    execution: buildExecutionSummary(recommendations, taskCandidates, options.taskResults, options.runReports)
  };
}

function capabilityLoopReportPaths(options: BuildCapabilityLoopReportOptions): CapabilityLoopReportPaths {
  const paths: CapabilityLoopReportPaths = {
    backlog: options.backlogPath
  };
  if (options.improvementPaths) {
    paths.improvementReport = options.improvementPaths.report;
    paths.improvementTasks = options.improvementPaths.tasks;
    paths.improvementResults = options.improvementPaths.results;
    paths.agentTasks = options.improvementPaths.agentTasks;
  }
  return paths;
}

function copyEvalRunSummary(run: CapabilityLoopEvalRunSummary): CapabilityLoopEvalRunSummary {
  const summary: CapabilityLoopEvalRunSummary = {
    reportPath: run.reportPath,
    exitCode: run.exitCode,
    failedScenarioIds: [...run.failedScenarioIds]
  };
  if (run.score !== undefined) summary.score = run.score;
  if (run.usage) {
    summary.usage = {
      inputTokens: run.usage.inputTokens,
      outputTokens: run.usage.outputTokens,
      totalTokens: run.usage.totalTokens,
      availableRuns: run.usage.availableRuns,
      unavailableRuns: run.usage.unavailableRuns,
      unavailableScenarioIds: [...run.usage.unavailableScenarioIds]
    };
  }
  return summary;
}

export function capabilityLoopUsageFromEvalReport(report: CapabilityEvalReport): CapabilityLoopEvalUsageSummary {
  return {
    inputTokens: report.metrics.usage.inputTokens,
    outputTokens: report.metrics.usage.outputTokens,
    totalTokens: report.metrics.usage.totalTokens,
    availableRuns: report.metrics.usage.availableRuns,
    unavailableRuns: report.metrics.usage.unavailableRuns,
    unavailableScenarioIds: [...report.metrics.usage.unavailableScenarioIds]
  };
}

function buildCapabilityLoopReportUsageSummary(
  evalRuns: CapabilityLoopEvalRunSummary[]
): CapabilityLoopReportUsageSummary {
  return evalRuns.reduce<CapabilityLoopReportUsageSummary>((summary, run) => {
    if (!run.usage) return summary;
    return {
      inputTokens: summary.inputTokens + run.usage.inputTokens,
      outputTokens: summary.outputTokens + run.usage.outputTokens,
      totalTokens: summary.totalTokens + run.usage.totalTokens,
      evalAvailableRuns: summary.evalAvailableRuns + run.usage.availableRuns,
      evalUnavailableRuns: summary.evalUnavailableRuns + run.usage.unavailableRuns,
      evalUnavailableScenarioIds: unique([
        ...summary.evalUnavailableScenarioIds,
        ...run.usage.unavailableScenarioIds
      ])
    };
  }, {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    evalAvailableRuns: 0,
    evalUnavailableRuns: 0,
    evalUnavailableScenarioIds: []
  });
}

function completedCapabilityRecommendationIds(report: CapabilityImprovementReport | undefined) {
  if (!report) return [];
  return report.recommendations
    .filter((recommendation) => recommendation.executionStatus === "completed")
    .map((recommendation) => recommendation.id);
}

function readinessStatusFromScore(score: number): CapabilityReadinessStatus {
  if (score >= 80) return "ready";
  if (score >= 50) return "watch";
  return "needs-work";
}

function readinessDimension(input: {
  id: CapabilityReadinessDimensionId;
  title: string;
  score: number;
  evidence: string[];
  nextAction: string;
  status?: CapabilityReadinessStatus;
}): CapabilityReadinessDimension {
  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  return {
    id: input.id,
    title: input.title,
    status: input.status ?? readinessStatusFromScore(score),
    score,
    evidence: unique(input.evidence),
    nextAction: input.nextAction
  };
}

function defaultScenarioIds() {
  return new Set(defaultCapabilityScenarios.map((scenario) => scenario.id));
}

function defaultScenarioCategoryCount(category: CapabilityEvalResult["category"]) {
  return defaultCapabilityScenarios.filter((scenario) => scenario.category === category).length;
}

function scenarioCoverageDimension() {
  const ids = defaultScenarioIds();
  const required = [
    "workspace-readme-summary",
    "workspace-code-symbols-before-shell",
    "practical-client-server-plan-verify",
    "practical-safe-edit-verify",
    "verify-repair-loop",
    "context-compact-continuity",
    "provider-fallback",
    "current-news-latest",
    "current-weather-location",
    "current-sports-results",
    "current-market-status",
    "long-task-handoff",
    "channel-approval-flow"
  ];
  const present = required.filter((id) => ids.has(id));
  return readinessDimension({
    id: "eval-scenario-coverage",
    title: "Capability eval scenario coverage",
    score: required.length === 0 ? 100 : (present.length / required.length) * 100,
    evidence: [
      ...present.map((id) => `scenario=${id}`),
      `categories=${unique(defaultCapabilityScenarios.map((scenario) => scenario.category)).length}`,
      `totalScenarios=${defaultCapabilityScenarios.length}`
    ],
    nextAction: present.length === required.length
      ? "Keep the default capability scenario suite active as a regression baseline."
      : `Add missing default capability scenarios: ${required.filter((id) => !ids.has(id)).join(", ")}.`
  });
}

function activeRecommendationAreas(report: CapabilityImprovementReport | undefined) {
  return new Set((report?.recommendations ?? [])
    .filter((recommendation) => recommendation.executionStatus !== "completed")
    .map((recommendation) => recommendation.area));
}

function completedRecommendationAreas(report: CapabilityImprovementReport | undefined) {
  return new Set((report?.recommendations ?? [])
    .filter((recommendation) => recommendation.executionStatus === "completed")
    .map((recommendation) => recommendation.area));
}

function readinessForAreas(input: {
  id: CapabilityReadinessDimensionId;
  title: string;
  areas: CapabilityImprovementArea[];
  activeAreas: Set<CapabilityImprovementArea>;
  completedAreas: Set<CapabilityImprovementArea>;
  coverageEvidence: string[];
  readyAction: string;
  workAction: string;
}) {
  const active = input.areas.filter((area) => input.activeAreas.has(area));
  const completed = input.areas.filter((area) => input.completedAreas.has(area));
  if (active.length > 0) {
    return readinessDimension({
      id: input.id,
      title: input.title,
      score: 40,
      status: "needs-work",
      evidence: [
        ...input.coverageEvidence,
        ...active.map((area) => `remainingArea=${area}`)
      ],
      nextAction: `${input.workAction}: ${active.join(", ")}.`
    });
  }
  if (completed.length > 0) {
    return readinessDimension({
      id: input.id,
      title: input.title,
      score: 100,
      evidence: [
        ...input.coverageEvidence,
        ...completed.map((area) => `completedArea=${area}`)
      ],
      nextAction: input.readyAction
    });
  }
  return readinessDimension({
    id: input.id,
    title: input.title,
    score: 75,
    status: "watch",
    evidence: input.coverageEvidence,
    nextAction: input.readyAction
  });
}

function failureClassificationDimension(report: CapabilityImprovementReport | undefined) {
  const findings = report?.findings ?? [];
  const classified = findings.filter((finding) => finding.failureCategory !== "unclassified").length;
  const score = findings.length === 0 ? 100 : (classified / findings.length) * 100;
  return readinessDimension({
    id: "failure-classification",
    title: "Failure classification",
    score,
    evidence: [
      `classifiedFindings=${classified}/${findings.length}`,
      ...unique(findings.map((finding) => `${finding.scenarioCategory}:${finding.failureCategory}`)).slice(0, 8)
    ],
    nextAction: classified === findings.length
      ? "Keep converting failed eval evidence into precise improvement categories."
      : "Classify unstructured capability failures before generating broad improvement work."
  });
}

function selfRunPracticeDimension(options: {
  mode: CapabilityLoopReportMode;
  evalRuns: CapabilityLoopEvalRunSummary[];
  improvement?: CompleteCapabilityImprovementLoopResult;
}) {
  const evidence = [
    `mode=${options.mode}`,
    `evalRuns=${options.evalRuns.length}`,
    `recommendations=${options.improvement?.report.execution.totalRecommendations ?? 0}`
  ];
  if (options.mode === "closed-loop" && options.evalRuns.length > 0) {
    return readinessDimension({
      id: "self-run-practice",
      title: "Self-run practice loop",
      score: 100,
      evidence,
      nextAction: "Continue using closed-loop self-runs to turn failures into tasks and rerun evidence."
    });
  }
  if (options.mode === "auto-improve" && options.improvement) {
    return readinessDimension({
      id: "self-run-practice",
      title: "Self-run practice loop",
      score: 70,
      status: "watch",
      evidence,
      nextAction: "Run closed-loop or run-next mode periodically to execute generated improvement tasks."
    });
  }
  return readinessDimension({
    id: "self-run-practice",
    title: "Self-run practice loop",
    score: 45,
    status: "needs-work",
    evidence,
    nextAction: "Run capability loop with auto-improve and run-next to exercise Xenesis against itself."
  });
}

function providerFallbackDimension(report: CapabilityImprovementReport | undefined) {
  const providerFindings = report?.findings.filter((finding) => finding.scenarioCategory === "provider-recovery") ?? [];
  if (providerFindings.length > 0) {
    return readinessDimension({
      id: "provider-fallback",
      title: "Provider fallback and recovery",
      score: 40,
      status: "needs-work",
      evidence: [
        `providerFindings=${providerFindings.length}`,
        `scenarioCount=${defaultScenarioCategoryCount("provider-recovery")}`
      ],
      nextAction: "Fix provider retry/fallback event evidence before relying on fallback automation."
    });
  }
  return readinessDimension({
    id: "provider-fallback",
    title: "Provider fallback and recovery",
    score: defaultScenarioCategoryCount("provider-recovery") > 0 ? 85 : 45,
    evidence: [
      `scenarioCount=${defaultScenarioCategoryCount("provider-recovery")}`,
      "event=provider_fallback"
    ],
    nextAction: "Keep provider fallback scenarios in the regular capability suite."
  });
}

function reportingMetricsDimension(options: {
  evalRuns: CapabilityLoopEvalRunSummary[];
  policyImpact?: CapabilityImprovementPolicyImpactSummary;
  policyImpactDecisions: CapabilityPolicyImpactDecision[];
}) {
  const usageTotal = options.evalRuns.reduce((sum, run) => sum + (run.usage?.totalTokens ?? 0), 0);
  const hasMetrics = options.evalRuns.length > 0 || Boolean(options.policyImpact) || options.policyImpactDecisions.length > 0;
  return readinessDimension({
    id: "reporting-metrics",
    title: "Operational reports and quality metrics",
    score: hasMetrics ? 90 : 55,
    status: hasMetrics ? "ready" : "watch",
    evidence: [
      `evalRuns=${options.evalRuns.length}`,
      `usageTotalTokens=${usageTotal}`,
      `policyImpactDecisions=${options.policyImpactDecisions.length}`
    ],
    nextAction: hasMetrics
      ? "Use loop reports, policy impact decisions, and usage data to steer the next improvement batch."
      : "Run capability eval or self-review loops so reports include measurable quality signals."
  });
}

function buildCapabilityReadiness(options: {
  mode: CapabilityLoopReportMode;
  evalRuns: CapabilityLoopEvalRunSummary[];
  improvement?: CompleteCapabilityImprovementLoopResult;
  policyImpact?: CapabilityImprovementPolicyImpactSummary;
  policyImpactDecisions: CapabilityPolicyImpactDecision[];
}): CapabilityReadinessDimension[] {
  const report = options.improvement?.report;
  const activeAreas = activeRecommendationAreas(report);
  const completedAreas = completedRecommendationAreas(report);
  return [
    failureClassificationDimension(report),
    scenarioCoverageDimension(),
    readinessForAreas({
      id: "tool-execution-strategy",
      title: "Tool selection and execution strategy",
      areas: ["tool-selection-policy", "permission-safety"],
      activeAreas,
      completedAreas,
      coverageEvidence: [
        "priorityTools=read,search,code_symbols,lsp,diagnostics",
        `workspaceSymbolScenarios=${defaultCapabilityScenarios.filter((scenario) => scenario.id === "workspace-code-symbols-before-shell").length}`
      ],
      readyAction: "Keep read/search/code_symbols/lsp/diagnostics ahead of generic shell or web fallback.",
      workAction: "Resolve active tool execution strategy recommendations"
    }),
    readinessForAreas({
      id: "plan-execute-verify-loop",
      title: "Plan, execute, verify, and repair loop",
      areas: ["self-execution-loop", "verify-repair-loop"],
      activeAreas,
      completedAreas,
      coverageEvidence: [
        "scenario=practical-client-server-plan-verify",
        "scenario=verify-repair-loop"
      ],
      readyAction: "Keep inspect, plan, execute, verify, bounded repair, and report evidence in order.",
      workAction: "Resolve active plan/execute/verify recommendations"
    }),
    readinessForAreas({
      id: "context-memory-session",
      title: "Context, memory, and session continuity",
      areas: ["context-continuity"],
      activeAreas,
      completedAreas,
      coverageEvidence: [
        "scenario=context-compact-continuity",
        "scenario=session-resume-context",
        "scenario=memory-save-search"
      ],
      readyAction: "Keep live workspace context ahead of stale session and durable memory context.",
      workAction: "Resolve active context continuity recommendations"
    }),
    selfRunPracticeDimension({
      mode: options.mode,
      evalRuns: options.evalRuns,
      improvement: options.improvement
    }),
    providerFallbackDimension(report),
    reportingMetricsDimension({
      evalRuns: options.evalRuns,
      policyImpact: options.policyImpact,
      policyImpactDecisions: options.policyImpactDecisions
    })
  ];
}

function readinessNeedsWorkActions(readiness: CapabilityReadinessDimension[]) {
  const needsWork = readiness.filter((item) => item.status === "needs-work");
  if (needsWork.length === 0) return [];
  return [`Capability readiness needs work: ${needsWork.map((item) => item.id).join(", ")}.`];
}

function capabilityLoopNextActions(options: {
  improvement?: CompleteCapabilityImprovementLoopResult;
  failedRecommendationIds: string[];
  remainingRecommendationIds: string[];
  skippedRecoveries: CapabilityImprovementTaskRecoverySkippedRecord[];
  failedEvalRuns: number;
  policyImpactDecisions?: CapabilityPolicyImpactDecision[];
  capabilityReadiness?: CapabilityReadinessDimension[];
}) {
  const actions: string[] = [];
  if (!options.improvement && options.failedEvalRuns > 0) {
    actions.push("Run capability loop with --auto-improve to turn failed eval runs into improvement tasks.");
  }
  const regressedAreas = unique((options.policyImpactDecisions ?? [])
    .filter((decision) => decision.action === "rework_regressed_impact")
    .map((decision) => decision.area));
  if (regressedAreas.length > 0) {
    actions.push(`Rework regressed capability impact areas: ${regressedAreas.join(", ")}.`);
  }
  const reworkLimitAreas = unique((options.policyImpactDecisions ?? [])
    .filter((decision) => decision.action === "stop_rework_limit_reached")
    .map((decision) => decision.area));
  if (reworkLimitAreas.length > 0) {
    actions.push(`Review regressed capability impact areas after rework limit: ${reworkLimitAreas.join(", ")}.`);
  }
  if (options.failedRecommendationIds.length > 0) {
    actions.push(`Recover failed recommendations: ${options.failedRecommendationIds.join(", ")}.`);
  }
  if (options.remainingRecommendationIds.length > 0) {
    actions.push(`Continue capability work for ${options.remainingRecommendationIds.join(", ")}.`);
  }
  if (options.skippedRecoveries.length > 0) {
    actions.push(`Review skipped recoveries: ${options.skippedRecoveries.map((item) => item.taskId).join(", ")}.`);
  }
  actions.push(...readinessNeedsWorkActions(options.capabilityReadiness ?? []));
  if (actions.length === 0) {
    actions.push("No remaining capability recommendations in this loop report.");
  }
  return actions;
}

function policyImpactDecisionAction(
  status: CapabilityImprovementPolicyImpactEffectivenessStatus
): CapabilityPolicyImpactDecisionAction {
  switch (status) {
    case "regressed":
      return "rework_regressed_impact";
    case "improved":
      return "deprioritize_improved_area";
    case "insufficient_data":
      return "observe_insufficient_data";
    case "mixed":
      return "keep_standard_priority";
  }
}

function policyImpactDecisionReason(
  effect: CapabilityImprovementPolicyImpactEffectiveness,
  action: CapabilityPolicyImpactDecisionAction,
  attempts: number,
  maxAttempts: number
) {
  if (action === "stop_rework_limit_reached") {
    return `${effect.area} still regressed after ${attempts} policy-impact rework attempt(s); stop automatic rework and require review.`;
  }
  switch (effect.status) {
    case "regressed":
      return `${effect.area} regressed after capability work; requeue the same area before expanding adjacent work.`;
    case "improved":
      return `${effect.area} improved after capability work; lower priority for same-area follow-ups while the signal remains positive.`;
    case "insufficient_data":
      return `${effect.area} has insufficient before/after run data; keep observing before changing priority.`;
    case "mixed":
      return `${effect.area} has mixed before/after run signals; keep standard priority until the trend is clearer.`;
  }
}

function policyImpactReworkAttemptCount(
  policyImpact: CapabilityImprovementPolicyImpactSummary,
  area: CapabilityImprovementArea
) {
  const prefix = `capability-task-${area}-rework-`;
  return policyImpact.completedTaskIds.filter((taskId) => taskId.startsWith(prefix)).length;
}

function buildPolicyImpactDecisions(
  policyImpact: CapabilityImprovementPolicyImpactSummary | undefined,
  maxPolicyImpactReworkAttempts = DEFAULT_MAX_POLICY_IMPACT_REWORK_ATTEMPTS
): CapabilityPolicyImpactDecision[] {
  if (!policyImpact) return [];
  const maxAttempts = Math.max(0, maxPolicyImpactReworkAttempts);
  return policyImpact.effectiveness.map((effect) => {
    const attempts = policyImpactReworkAttemptCount(policyImpact, effect.area);
    const action = effect.status === "regressed" && attempts >= maxAttempts
      ? "stop_rework_limit_reached"
      : policyImpactDecisionAction(effect.status);
    const decision: CapabilityPolicyImpactDecision = {
      area: effect.area,
      status: effect.status,
      action,
      reason: policyImpactDecisionReason(effect, action, attempts, maxAttempts)
    };
    if (action === "stop_rework_limit_reached") {
      decision.attempts = attempts;
      decision.maxAttempts = maxAttempts;
    }
    return decision;
  });
}

export function buildCapabilityLoopReport(options: BuildCapabilityLoopReportOptions): CapabilityLoopReport {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const improvementReport = options.improvement?.report;
  const execution = improvementReport?.execution;
  const failedEvalRuns = options.evalRuns.filter((run) => run.exitCode !== 0).length;
  const evalRuns = options.evalRuns.map(copyEvalRunSummary);
  const completedRecommendationIds = completedCapabilityRecommendationIds(improvementReport);
  const failedRecommendationIds = execution?.failedRecommendationIds ?? [];
  const remainingRecommendationIds = execution?.remainingRecommendationIds ?? [];
  const recoveredTaskIds = unique(options.improvement?.recovery?.recovered.map((item) => item.taskId) ?? []);
  const skippedRecoveries = options.improvement?.recovery?.skipped ?? [];
  const rerunTaskIds = unique(options.improvement?.recoveredRuns.map((run) => run.agentTask.id) ?? []);
  const policyImpact = execution?.policyImpact;
  const policyImpactDecisions = buildPolicyImpactDecisions(policyImpact, options.maxPolicyImpactReworkAttempts);
  const capabilityReadiness = buildCapabilityReadiness({
    mode: options.mode,
    evalRuns,
    improvement: options.improvement,
    policyImpact,
    policyImpactDecisions
  });

  return {
    kind: "capability-loop-report",
    createdAt,
    mode: options.mode,
    summary: {
      totalRuns: options.evalRuns.length,
      failedEvalRuns,
      candidates: options.candidates,
      recommendations: execution?.totalRecommendations ?? 0,
      completedRecommendations: execution?.completedRecommendations ?? 0,
      failedRecommendations: execution?.failedRecommendations ?? 0,
      remainingRecommendations: remainingRecommendationIds.length,
      recoveredTasks: options.recoveredTaskCount ?? recoveredTaskIds.length,
      skippedRecoveries: options.skippedRecoveryCount ?? skippedRecoveries.length,
      rerunTasks: options.rerunTaskCount ?? rerunTaskIds.length,
      usage: buildCapabilityLoopReportUsageSummary(evalRuns)
    },
    paths: capabilityLoopReportPaths(options),
    evalRuns,
    completedRecommendationIds,
    failedRecommendationIds,
    remainingRecommendationIds,
    recoveredTaskIds,
    skippedRecoveries,
    rerunTaskIds,
    ...(policyImpact && policyImpact.completedTaskIds.length > 0
      ? { policyImpact }
      : {}),
    ...(policyImpactDecisions.length > 0
      ? { policyImpactDecisions }
      : {}),
    capabilityReadiness,
    nextActions: capabilityLoopNextActions({
      improvement: options.improvement,
      failedRecommendationIds,
      remainingRecommendationIds,
      skippedRecoveries,
      failedEvalRuns,
      policyImpactDecisions,
      capabilityReadiness
    })
  };
}

function recommendationLoopOrder(report: SelectCapabilityLoopNextTasksOptions["report"]) {
  const ids = unique([
    ...report.failedRecommendationIds,
    ...report.remainingRecommendationIds
  ]);
  return new Map(ids.map((id, index) => [id, index]));
}

const capabilityReadinessAreas: Record<CapabilityReadinessDimensionId, CapabilityImprovementArea[]> = {
  "failure-classification": ["scenario-taxonomy"],
  "eval-scenario-coverage": ["scenario-taxonomy"],
  "tool-execution-strategy": ["tool-selection-policy", "permission-safety"],
  "plan-execute-verify-loop": ["verify-repair-loop", "self-execution-loop"],
  "context-memory-session": ["context-continuity"],
  "self-run-practice": ["self-execution-loop"],
  "provider-fallback": ["runtime-observability"],
  "reporting-metrics": ["runtime-observability"]
};

function readinessSelectionRank(status: CapabilityReadinessStatus) {
  if (status === "needs-work") return 0;
  if (status === "watch") return 1;
  return 2;
}

function capabilityReadinessByArea(
  readiness: CapabilityReadinessDimension[] | undefined
) {
  const byArea = new Map<CapabilityImprovementArea, CapabilityReadinessDimension>();
  for (const item of readiness ?? []) {
    for (const area of capabilityReadinessAreas[item.id]) {
      const existing = byArea.get(area);
      if (!existing) {
        byArea.set(area, item);
        continue;
      }
      const rankDiff = readinessSelectionRank(item.status) - readinessSelectionRank(existing.status);
      if (rankDiff < 0 || (rankDiff === 0 && item.score < existing.score)) {
        byArea.set(area, item);
      }
    }
  }
  return byArea;
}

function taskReadinessRank(
  task: CapabilityImprovementTaskCandidate,
  readiness: Map<CapabilityImprovementArea, CapabilityReadinessDimension>
) {
  const item = readiness.get(task.area);
  return item ? readinessSelectionRank(item.status) : 3;
}

function nextTaskFromCandidate(
  task: CapabilityImprovementTaskCandidate,
  reason: CapabilityLoopNextTask["reason"],
  decision?: CapabilityPolicyImpactDecision,
  readiness?: CapabilityReadinessDimension
): CapabilityLoopNextTask {
  const nextTask: CapabilityLoopNextTask = {
    taskId: task.id,
    recommendationId: task.recommendationId,
    area: task.area,
    priority: task.priority,
    priorityScore: task.priorityScore,
    title: task.title,
    executionStatus: task.executionStatus,
    sourceScenarioIds: task.sourceScenarioIds,
    verification: task.verification,
    reason
  };
  if (decision) {
    nextTask.policyAction = decision.action;
    nextTask.policyReason = decision.reason;
  }
  if (readiness && readiness.status !== "ready") {
    nextTask.readinessId = readiness.id;
    nextTask.readinessStatus = readiness.status;
    nextTask.readinessScore = readiness.score;
    nextTask.readinessReason = `capability readiness ${readiness.status}: ${readiness.nextAction}`;
  }
  return nextTask;
}

function selfReviewSourceScenarioIds(task: CapabilityImprovementTaskCandidate) {
  return task.sourceScenarioIds.filter((scenarioId) => scenarioId.startsWith("self-review:"));
}

function latestTaskActivityTimestamp(task: CapabilityImprovementTaskCandidate) {
  return task.latestTaskResultAt ?? task.promotedAt;
}

function selfReviewCooldownSkipReason(
  task: CapabilityImprovementTaskCandidate,
  cooldownMs: number | undefined,
  now: Date
) {
  if (!cooldownMs || cooldownMs <= 0) return undefined;
  const selfReviewSources = selfReviewSourceScenarioIds(task);
  if (selfReviewSources.length === 0) return undefined;
  const activityAt = latestTaskActivityTimestamp(task);
  if (!activityAt) return undefined;
  const activityTime = Date.parse(activityAt);
  if (!Number.isFinite(activityTime)) return undefined;
  const cooldownUntilMs = activityTime + cooldownMs;
  if (now.getTime() >= cooldownUntilMs) return undefined;
  return `self-review action cooldown active: ${selfReviewSources.join(", ")} until ${new Date(cooldownUntilMs).toISOString()}`;
}

function taskFailurePatternIds(task: CapabilityImprovementTaskCandidate) {
  return unique([
    ...(task.failurePatternIds ?? []),
    ...task.labels.filter((label) => label.startsWith("failure-pattern:"))
  ]);
}

function latestFailurePatternActivityById(tasks: CapabilityImprovementTaskCandidate[]) {
  const activityByPattern = new Map<string, string>();
  for (const task of tasks) {
    const activityAt = latestTaskActivityTimestamp(task);
    if (!activityAt) continue;
    const activityTime = Date.parse(activityAt);
    if (!Number.isFinite(activityTime)) continue;
    for (const failurePatternId of taskFailurePatternIds(task)) {
      const existing = activityByPattern.get(failurePatternId);
      if (!existing || activityTime > Date.parse(existing)) {
        activityByPattern.set(failurePatternId, activityAt);
      }
    }
  }
  return activityByPattern;
}

function failurePatternCooldownSkipReason(
  task: CapabilityImprovementTaskCandidate,
  cooldownMs: number | undefined,
  now: Date,
  activityByPattern: Map<string, string>
) {
  if (!cooldownMs || cooldownMs <= 0) return undefined;
  const failurePatternIds = taskFailurePatternIds(task);
  if (failurePatternIds.length === 0) return undefined;
  const active = failurePatternIds
    .map((failurePatternId) => {
      const activityAt = activityByPattern.get(failurePatternId);
      if (!activityAt) return undefined;
      const activityTime = Date.parse(activityAt);
      if (!Number.isFinite(activityTime)) return undefined;
      const cooldownUntilMs = activityTime + cooldownMs;
      if (now.getTime() >= cooldownUntilMs) return undefined;
      return { failurePatternId, cooldownUntilMs };
    })
    .filter((item): item is { failurePatternId: string; cooldownUntilMs: number } => Boolean(item));
  if (active.length === 0) return undefined;
  const cooldownUntilMs = Math.max(...active.map((item) => item.cooldownUntilMs));
  return `failure pattern cooldown active: ${active.map((item) => item.failurePatternId).join(", ")} until ${new Date(cooldownUntilMs).toISOString()}`;
}

function policyImpactDecisionByArea(decisions: CapabilityPolicyImpactDecision[] | undefined) {
  const rank: Record<CapabilityPolicyImpactDecisionAction, number> = {
    rework_regressed_impact: 0,
    stop_rework_limit_reached: 0,
    keep_standard_priority: 1,
    observe_insufficient_data: 2,
    deprioritize_improved_area: 3
  };
  const byArea = new Map<CapabilityImprovementArea, CapabilityPolicyImpactDecision>();
  for (const decision of decisions ?? []) {
    const existing = byArea.get(decision.area);
    if (!existing || rank[decision.action] < rank[existing.action]) byArea.set(decision.area, decision);
  }
  return byArea;
}

function policySelectionRank(
  task: CapabilityImprovementTaskCandidate,
  decisions: Map<CapabilityImprovementArea, CapabilityPolicyImpactDecision>
) {
  const decision = decisions.get(task.area);
  if (decision?.action === "rework_regressed_impact") return 0;
  if (decision?.action === "stop_rework_limit_reached") return 0;
  if (decision?.action === "deprioritize_improved_area") return 2;
  return 1;
}

function activePolicyImpactReworkSkipReason(task: CapabilityImprovementTaskCandidate) {
  if (!isPolicyImpactReworkTaskId(task.promotedAgentTaskId)) return undefined;
  if (
    task.executionStatus !== "open" &&
    task.executionStatus !== "running" &&
    task.executionStatus !== "blocked"
  ) {
    return undefined;
  }
  return `policy impact rework already active: ${task.promotedAgentTaskId}`;
}

export function selectCapabilityLoopNextTasks(
  options: SelectCapabilityLoopNextTasksOptions
): CapabilityLoopNextTaskSelection {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const now = new Date(createdAt);
  const limit = Math.max(1, options.limit ?? 1);
  const completed = new Set(options.report.completedRecommendationIds);
  const failed = new Set(options.report.failedRecommendationIds);
  const remaining = new Set(options.report.remainingRecommendationIds);
  const order = recommendationLoopOrder(options.report);
  const decisions = policyImpactDecisionByArea(options.report.policyImpactDecisions);
  const readiness = capabilityReadinessByArea(options.report.capabilityReadiness);
  const selected: CapabilityLoopNextTask[] = [];
  const skipped: CapabilityLoopNextTaskSkippedRecord[] = [];
  const failurePatternActivity = latestFailurePatternActivityById(options.taskBacklog.tasks);
  const tasks = [...options.taskBacklog.tasks].sort((left, right) => {
    const policyRankDiff = policySelectionRank(left, decisions) - policySelectionRank(right, decisions);
    if (policyRankDiff !== 0) return policyRankDiff;
    const readinessRankDiff = taskReadinessRank(left, readiness) - taskReadinessRank(right, readiness);
    if (readinessRankDiff !== 0) return readinessRankDiff;
    const leftOrder = order.get(left.recommendationId) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.recommendationId) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    const priorityDiff = right.priorityScore - left.priorityScore;
    if (priorityDiff !== 0) return priorityDiff;
    return left.id.localeCompare(right.id);
  });

  for (const task of tasks) {
    const skip = (reason: string) => {
      skipped.push({
        taskId: task.id,
        recommendationId: task.recommendationId,
        reason
      });
    };

    const decision = decisions.get(task.area);
    if (decision?.action === "stop_rework_limit_reached") {
      skip(`policy impact rework limit reached after ${decision.attempts ?? 0} attempt(s)`);
      continue;
    }
    const shouldReworkRegressed = decision?.action === "rework_regressed_impact";
    if (shouldReworkRegressed) {
      const activeReworkReason = activePolicyImpactReworkSkipReason(task);
      if (activeReworkReason) {
        skip(activeReworkReason);
        continue;
      }
    }

    if (!shouldReworkRegressed && (completed.has(task.recommendationId) || task.executionStatus === "completed")) {
      skip("recommendation already completed");
      continue;
    }
    if (task.status === "ignored") {
      skip("task candidate ignored");
      continue;
    }
    if (!shouldReworkRegressed && task.promotedAgentTaskId) {
      skip("task already promoted");
      continue;
    }
    const cooldownSkipReason = selfReviewCooldownSkipReason(task, options.selfReviewCooldownMs, now);
    if (cooldownSkipReason) {
      skip(cooldownSkipReason);
      continue;
    }
    const failurePatternCooldownReason = failurePatternCooldownSkipReason(
      task,
      options.failurePatternCooldownMs,
      now,
      failurePatternActivity
    );
    if (failurePatternCooldownReason) {
      skip(failurePatternCooldownReason);
      continue;
    }
    if (!shouldReworkRegressed && !failed.has(task.recommendationId) && !remaining.has(task.recommendationId)) {
      skip("recommendation not requested by loop report");
      continue;
    }
    if (task.executionStatus === "running" || task.executionStatus === "blocked") {
      skip(`task is ${task.executionStatus}`);
      continue;
    }
    if (selected.length >= limit) {
      skip("selection limit reached");
      continue;
    }

    selected.push(nextTaskFromCandidate(
      task,
      shouldReworkRegressed
        ? "regressed policy impact"
        : failed.has(task.recommendationId)
          ? "failed recommendation"
          : "remaining recommendation",
      shouldReworkRegressed ? decision : undefined,
      readiness.get(task.area)
    ));
  }

  return {
    kind: "capability-loop-next-tasks",
    createdAt,
    limit,
    selected,
    skipped
  };
}

export async function queueCapabilityLoopNextTasks(
  options: QueueCapabilityLoopNextTasksOptions
): Promise<QueueCapabilityLoopNextTasksResult> {
  let taskBacklog = options.taskBacklog;
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const queued: CapabilityLoopQueuedTaskRecord[] = [];
  const skipped: CapabilityLoopNextTaskSkippedRecord[] = [];

  for (const item of options.selection.selected) {
    try {
      let agentTask: AgentTask;
      if (item.policyAction === "rework_regressed_impact") {
        const candidate = taskBacklog.tasks.find((task) => task.id === item.taskId);
        if (!candidate) throw new Error(`Capability improvement task candidate not found: ${item.taskId}`);
        if (candidate.status === "ignored") {
          throw new Error(`Capability improvement task candidate is ignored: ${item.taskId}`);
        }
        agentTask = await createCapabilityPolicyImpactReworkTask(
          options.store,
          candidate,
          item,
          timestamp
        );
        taskBacklog = {
          ...taskBacklog,
          tasks: taskBacklog.tasks.map((task) =>
            task.id === item.taskId
              ? resetRecoveredTaskCandidate(task, agentTask.id, timestamp)
              : task)
        };
      } else {
        const result = await promoteCapabilityImprovementTask({
          backlog: taskBacklog,
          id: item.taskId,
          store: options.store,
          now: () => new Date(timestamp)
        });
        agentTask = result.agentTask;
        taskBacklog = result.backlog;
      }
      queued.push({
        taskId: item.taskId,
        agentTaskId: agentTask.id,
        status: agentTask.status
      });
    } catch (error) {
      skipped.push({
        taskId: item.taskId,
        recommendationId: item.recommendationId,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    taskBacklog,
    queued,
    skipped
  };
}

function findCapabilityTaskCandidateForQueuedTask(
  backlog: CapabilityImprovementTaskBacklog,
  item: CapabilityLoopQueuedTaskRecord
) {
  return backlog.tasks.find((task) =>
    task.id === item.taskId || task.promotedAgentTaskId === item.agentTaskId);
}

export async function runCapabilityLoopNextTasks(
  options: RunCapabilityLoopNextTasksOptions
): Promise<RunCapabilityLoopNextTasksResult> {
  let taskResults = options.results;
  const runs: RunCapabilityImprovementAgentTaskResult[] = [];
  const skipped: CapabilityLoopNextTaskRunSkippedRecord[] = [];

  for (const item of options.queued) {
    const taskCandidate = findCapabilityTaskCandidateForQueuedTask(options.taskBacklog, item);
    if (!taskCandidate) {
      skipped.push({
        taskId: item.taskId,
        agentTaskId: item.agentTaskId,
        reason: "task candidate not found"
      });
      continue;
    }

    try {
      const run = await runCapabilityImprovementAgentTask({
        store: options.store,
        id: item.agentTaskId,
        taskCandidate,
        results: taskResults,
        executor: options.executor,
        now: options.now
      });
      taskResults = run.results;
      runs.push(run);
    } catch (error) {
      skipped.push({
        taskId: item.taskId,
        agentTaskId: item.agentTaskId,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const report = buildCapabilityImprovementReport({
    backlog: options.backlog,
    ...(taskResults ? { taskResults } : {}),
    ...(options.runReports ? { runReports: options.runReports } : {}),
    now: options.now
  });
  const taskBacklog = syncTaskBacklogExecution(options.taskBacklog, report);
  const result: RunCapabilityLoopNextTasksResult = {
    report,
    taskBacklog,
    runs,
    skipped
  };
  if (taskResults) result.taskResults = taskResults;
  return result;
}

export function evaluateCapabilityLoopCycleProgress(
  input: CapabilityLoopCycleProgressInput
): CapabilityLoopCycleProgress {
  let stopReason: CapabilityLoopCycleStopReason | undefined;
  if (input.missingReports > 0) {
    stopReason = "eval-report-missing";
  } else {
    stopReason = evaluateCapabilityLoopSafetyBudget(input);
  }

  if (!stopReason && input.remainingRecommendations === 0) {
    stopReason = "no-remaining-recommendations";
  } else if (!stopReason && input.ranNextTasks === 0) {
    stopReason = "no-next-task";
  } else if (!stopReason && (
    input.maxRanNextTasks !== undefined &&
    input.totalRanNextTasks !== undefined &&
    input.totalRanNextTasks >= input.maxRanNextTasks
  )) {
    stopReason = "next-task-budget-reached";
  } else if (!stopReason && input.cycle >= input.cycleLimit) {
    stopReason = "cycle-limit-reached";
  }

  const progress: CapabilityLoopCycleProgress = {
    ...input,
    continue: stopReason === undefined
  };
  if (stopReason) progress.stopReason = stopReason;
  return progress;
}

export function evaluateCapabilityLoopSafetyBudget(
  input: Pick<
    CapabilityLoopCycleProgressInput,
    | "usage"
    | "maxInputTokens"
    | "maxOutputTokens"
    | "maxTotalTokens"
    | "estimatedCostUsd"
    | "maxCostUsd"
    | "elapsedMs"
    | "maxElapsedMs"
  >
): CapabilityLoopSafetyBudgetStopReason | undefined {
  if (
    input.maxInputTokens !== undefined &&
    input.usage !== undefined &&
    input.usage.inputTokens >= input.maxInputTokens
  ) {
    return "input-token-budget-reached";
  }
  if (
    input.maxOutputTokens !== undefined &&
    input.usage !== undefined &&
    input.usage.outputTokens >= input.maxOutputTokens
  ) {
    return "output-token-budget-reached";
  }
  if (
    input.maxTotalTokens !== undefined &&
    input.usage !== undefined &&
    input.usage.totalTokens >= input.maxTotalTokens
  ) {
    return "total-token-budget-reached";
  }
  if (
    input.maxCostUsd !== undefined &&
    input.estimatedCostUsd !== undefined &&
    input.estimatedCostUsd >= input.maxCostUsd
  ) {
    return "cost-budget-reached";
  }
  if (
    input.maxElapsedMs !== undefined &&
    input.elapsedMs !== undefined &&
    input.elapsedMs >= input.maxElapsedMs
  ) {
    return "time-budget-exceeded";
  }
  return undefined;
}

export async function readCapabilityScenarioBacklog(path: string): Promise<CapabilityScenarioBacklog | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as CapabilityScenarioBacklog;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    return undefined;
  }
}

export async function writeCapabilityScenarioBacklog(path: string, backlog: CapabilityScenarioBacklog) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(backlog, null, 2)}\n`, "utf8");
}

export async function writeCapabilityImprovementReport(path: string, report: CapabilityImprovementReport) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function writeCapabilityLoopReport(path: string, report: CapabilityLoopReport) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function writeCapabilityImprovementTaskBacklog(path: string, backlog: CapabilityImprovementTaskBacklog) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(backlog, null, 2)}\n`, "utf8");
}

export async function readCapabilityImprovementTaskBacklog(path: string): Promise<CapabilityImprovementTaskBacklog | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as CapabilityImprovementTaskBacklog;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    return undefined;
  }
}

export async function readCapabilityImprovementTaskResults(path: string): Promise<CapabilityImprovementTaskResultsLog | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as CapabilityImprovementTaskResultsLog;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    return undefined;
  }
}

export async function writeCapabilityImprovementTaskResults(path: string, results: CapabilityImprovementTaskResultsLog) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(results, null, 2)}\n`, "utf8");
}
