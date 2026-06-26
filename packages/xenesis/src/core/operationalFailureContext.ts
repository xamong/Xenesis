import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { xenesisStatePath, type XenesisConfig } from "../config/index.js";
import { SqliteAgentTaskStore } from "../orchestration/SqliteAgentTaskStore.js";
import type { VerificationReport } from "../verification/index.js";
import {
  adaptiveExecutionPolicySystemLines,
  buildAdaptiveExecutionPolicy,
  type AdaptiveExecutionPolicy,
  type DiagnosticCapabilityImpactEffectiveness,
  type DiagnosticCapabilityPolicyImpactPattern,
  type DiagnosticFailurePatterns
} from "./adaptiveExecutionPolicy.js";
import type { ContextSourceEvent } from "./events.js";

export type OperationalFailureKind = "report" | "run_report" | "task";

export interface OperationalFailureContextItem {
  id: string;
  kind: OperationalFailureKind;
  sortTime: number;
  summary: string;
  details: string[];
}

export interface OperationalFailureContextSummary {
  enabled: boolean;
  total: number;
  reports: number;
  runReports: number;
  tasks: number;
  latest?: OperationalFailureContextItem;
  items: OperationalFailureContextItem[];
  adaptivePolicy: AdaptiveExecutionPolicy;
  detail: string;
}

export interface OperationalRepairPreflightDecision {
  context?: string;
  shouldRepair?: boolean;
  blockReason?: string;
}

function statePath(config: XenesisConfig, ...parts: string[]) {
  return xenesisStatePath(config.xenesisHome, ...parts);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((left, right) => left.localeCompare(right));
}

function uniqueInOrder(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function operationalTimestamp(value: unknown) {
  const text = optionalText(value);
  const parsed = text ? Date.parse(text) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function truncateOperationalText(value: unknown, maxChars = 240) {
  const text = optionalText(value);
  if (!text) return undefined;
  const normalized = text.replace(/\s+/g, " ");
  return normalized.length <= maxChars ? normalized : `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
}

async function readJsonFile(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

async function listFiles(path: string, pattern: RegExp) {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((file) => file.isFile() && pattern.test(file.name))
      .map((file) => file.name);
  } catch {
    return [];
  }
}

function reportKindFromName(fileName: string) {
  return fileName.match(/^(smoke|scenario|connect|provider-live)-/)?.[1] ?? "report";
}

function reportSummaryText(report: Record<string, unknown>) {
  const summary = isObject(report.summary) ? report.summary : undefined;
  if (!summary) return undefined;
  const total = optionalNumber(summary.total);
  const passed = optionalNumber(summary.passed);
  const failed = optionalNumber(summary.failed);
  if (total !== undefined && passed !== undefined && failed !== undefined) {
    return `${passed}/${total} passed, ${failed} failed`;
  }
  return undefined;
}

function failedNamedItems(report: Record<string, unknown>) {
  const arrays = [report.checks, report.scenarios].filter(Array.isArray) as unknown[][];
  return arrays.flatMap((items) =>
    items
      .filter(isObject)
      .filter((item) => optionalText(item.status) === "failed" || optionalNumber(item.failed) !== undefined)
      .map((item) => {
        const name = optionalText(item.name) ?? optionalText(item.id) ?? "item";
        const message = truncateOperationalText(item.message ?? item.error, 180);
        return message ? `${name} failed - ${message}` : `${name} failed`;
      }));
}

function isFailedOperationalReport(report: Record<string, unknown>) {
  const summary = isObject(report.summary) ? report.summary : undefined;
  const failed = summary ? optionalNumber(summary.failed) : undefined;
  const status = optionalText(report.status);
  const exitCode = optionalNumber(report.exitCode);
  return (
    (failed !== undefined && failed > 0) ||
    (exitCode !== undefined && exitCode !== 0) ||
    status === "failed" ||
    status === "error"
  );
}

function createOperationalReportItem(fileName: string, report: Record<string, unknown>): OperationalFailureContextItem | undefined {
  if (!isFailedOperationalReport(report)) return undefined;
  const id = optionalText(report.id) ?? fileName.replace(/\.json$/i, "");
  const kind = reportKindFromName(fileName);
  const createdAt = optionalText(report.createdAt);
  const summary = reportSummaryText(report);
  return {
    id,
    kind: "report",
    sortTime: operationalTimestamp(report.createdAt),
    summary: `${kind} report ${id}${createdAt ? ` (${createdAt})` : ""}${summary ? ` - ${summary}` : ""}`,
    details: failedNamedItems(report).slice(0, 3)
  };
}

function failedToolSummaries(report: Record<string, unknown>) {
  if (!Array.isArray(report.tools)) return [];
  return report.tools
    .filter(isObject)
    .filter((tool) => (optionalNumber(tool.failures) ?? 0) > 0)
    .map((tool) => {
      const name = optionalText(tool.name) ?? "tool";
      const calls = optionalNumber(tool.calls) ?? 0;
      const failures = optionalNumber(tool.failures) ?? 0;
      return `${name} ${failures}/${calls} failures`;
    });
}

function failedVerificationSummaries(report: Record<string, unknown>) {
  const verification = isObject(report.verification) ? report.verification : undefined;
  const results = Array.isArray(verification?.results) ? verification.results : [];
  return results
    .filter(isObject)
    .filter((result) => result.ok === false)
    .map((result) => {
      const command = optionalText(result.command) ?? "verification command";
      const exitCode = optionalNumber(result.exitCode);
      return `verification failed: ${command}${exitCode !== undefined ? ` (exit ${exitCode})` : ""}`;
    });
}

function failedRepairSummaries(report: Record<string, unknown>) {
  if (!Array.isArray(report.repairs)) return [];
  return report.repairs
    .filter(isObject)
    .filter((repair) => optionalText(repair.status) === "failed")
    .flatMap((repair) => {
      const failedCommands = stringArray(repair.failedCommands);
      return failedCommands.length > 0
        ? failedCommands.map((command) => `repair failed: ${command}`)
        : ["repair failed"];
    });
}

function repairBlockSummaries(report: Record<string, unknown>) {
  const metrics = isObject(report.metrics) ? report.metrics : undefined;
  if (metrics?.blocked === true) return ["repair loop blocked in this run"];
  if (metrics?.repairSuccess === false && (optionalNumber(metrics.repairAttemptCount) ?? 0) > 0) {
    return ["repair attempts did not recover this run"];
  }
  return [];
}

function isFailedRunReport(report: Record<string, unknown>) {
  const metrics = isObject(report.metrics) ? report.metrics : undefined;
  const success = typeof metrics?.success === "boolean" ? metrics.success : undefined;
  const status = optionalText(report.status);
  return (
    success === false ||
    status === "failed" ||
    status === "error" ||
    failedToolSummaries(report).length > 0
  );
}

function createRunReportFailureItem(fileName: string, report: Record<string, unknown>): OperationalFailureContextItem | undefined {
  if (!isFailedRunReport(report)) return undefined;
  const id = optionalText(report.id) ?? fileName.replace(/\.json$/i, "");
  const sessionId = optionalText(report.sessionId);
  const status = optionalText(report.status);
  const createdAt = optionalText(report.createdAt);
  return {
    id,
    kind: "run_report",
    sortTime: operationalTimestamp(report.createdAt),
    summary: `agent run report ${id}${sessionId ? ` session=${sessionId}` : ""}${status ? ` status=${status}` : ""}${createdAt ? ` (${createdAt})` : ""}`,
    details: [
      ...failedToolSummaries(report).slice(0, 3),
      ...failedVerificationSummaries(report).slice(0, 3),
      ...failedRepairSummaries(report).slice(0, 3),
      ...repairBlockSummaries(report).slice(0, 1)
    ]
  };
}

function createTaskFailureItem(task: Record<string, unknown>): OperationalFailureContextItem | undefined {
  const status = optionalText(task.status);
  if (status !== "failed" && status !== "blocked") return undefined;
  const id = optionalText(task.id);
  if (!id) return undefined;
  const label = optionalText(task.label);
  const handoffTitle = optionalText(task.handoffTitle);
  const reason = truncateOperationalText(task.error ?? task.blockedReason, 220);
  const prompt = truncateOperationalText(task.prompt, 220);
  const updatedAt = optionalText(task.updatedAt);
  return {
    id,
    kind: "task",
    sortTime: operationalTimestamp(task.updatedAt ?? task.createdAt),
    summary: `agent task ${id} status=${status}${label ? ` label=${label}` : ""}${handoffTitle ? ` handoff=${handoffTitle}` : ""}${updatedAt ? ` (${updatedAt})` : ""}`,
    details: [
      ...(prompt ? [`prompt: ${prompt}`] : []),
      ...(reason ? [`reason: ${reason}`] : [])
    ]
  };
}

async function collectOperationalReports(config: XenesisConfig, maxItems: number) {
  if (maxItems <= 0) return [];
  const reportsDir = statePath(config, "reports");
  const files = await listFiles(reportsDir, /^(smoke|scenario|connect|provider-live)-.+\.json$/);
  const items = await Promise.all(files.map(async (fileName) => {
    const report = await readJsonFile(resolve(reportsDir, fileName));
    return isObject(report) ? createOperationalReportItem(fileName, report) : undefined;
  }));
  return items
    .filter((item): item is OperationalFailureContextItem => Boolean(item))
    .sort(compareOperationalFailures)
    .slice(0, maxItems);
}

async function collectRunReports(config: XenesisConfig, maxItems: number) {
  if (maxItems <= 0) return [];
  const reportsDir = statePath(config, "run_reports");
  const files = await listFiles(reportsDir, /^[A-Za-z0-9_.-]+\.json$/);
  const items = await Promise.all(files.map(async (fileName) => {
    const report = await readJsonFile(resolve(reportsDir, fileName));
    return isObject(report) ? createRunReportFailureItem(fileName, report) : undefined;
  }));
  return items
    .filter((item): item is OperationalFailureContextItem => Boolean(item))
    .sort(compareOperationalFailures)
    .slice(0, maxItems);
}

async function collectFailedTasks(config: XenesisConfig, maxItems: number) {
  if (maxItems <= 0) return [];
  const tasks = await new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome }).list() as unknown as Record<string, unknown>[];
  return tasks
    .filter(isObject)
    .map(createTaskFailureItem)
    .filter((item): item is OperationalFailureContextItem => Boolean(item))
    .sort(compareOperationalFailures)
    .slice(0, maxItems);
}

async function readRunReportRecords(config: XenesisConfig, maxItems: number) {
  if (maxItems <= 0) return [];
  const reportsDir = statePath(config, "run_reports");
  const files = await listFiles(reportsDir, /^[A-Za-z0-9_.-]+\.json$/);
  const records = await Promise.all(files.map(async (fileName) => {
    const report = await readJsonFile(resolve(reportsDir, fileName));
    return isObject(report)
      ? {
        fileName,
        report,
        sortTime: operationalTimestamp(report.createdAt)
      }
      : undefined;
  }));
  return records
    .filter((record): record is { fileName: string; report: Record<string, unknown>; sortTime: number } => Boolean(record))
    .sort((left, right) => right.sortTime - left.sortTime || right.fileName.localeCompare(left.fileName))
    .slice(0, maxItems);
}

function summarizePatternTools(records: Array<{ report: Record<string, unknown> }>) {
  const summaries = new Map<string, {
    name: string;
    calls: number;
    failures: number;
    runCount: number;
    latestSessionId?: string;
    latestTraceId?: string;
  }>();

  for (const { report } of records) {
    const tools = Array.isArray(report.tools) ? report.tools : [];
    for (const tool of tools.filter(isObject)) {
      const name = optionalText(tool.name);
      const failures = optionalNumber(tool.failures) ?? 0;
      if (!name || failures <= 0) continue;
      const summary = summaries.get(name) ?? {
        name,
        calls: 0,
        failures: 0,
        runCount: 0
      };
      summary.calls += optionalNumber(tool.calls) ?? 0;
      summary.failures += failures;
      summary.runCount += 1;
      summary.latestSessionId ??= optionalText(report.sessionId);
      summary.latestTraceId ??= optionalText(report.traceId);
      summaries.set(name, summary);
    }
  }

  return Array.from(summaries.values())
    .sort((left, right) => (
      right.failures - left.failures ||
      right.runCount - left.runCount ||
      left.name.localeCompare(right.name)
    ))
    .slice(0, 10);
}

function summarizePatternToolChoices(records: Array<{ report: Record<string, unknown> }>) {
  const summaries = new Map<string, {
    missedTool: string;
    priorityReason: string;
    missedCount: number;
    priorityTools: string[];
    latestSessionId?: string;
    latestTraceId?: string;
  }>();

  for (const { report } of records) {
    const toolChoice = isObject(report.toolChoice) ? report.toolChoice : undefined;
    const items = Array.isArray(toolChoice?.items) ? toolChoice.items : [];
    for (const item of items.filter(isObject)) {
      if (optionalText(item.status) !== "missed_priority") continue;
      const missedTool = optionalText(item.name);
      if (!missedTool) continue;
      const priorityReasons = stringArray(item.priorityReasons);
      const priorityTools = stringArray(item.priorityTools);
      for (const priorityReason of priorityReasons.length > 0 ? priorityReasons : ["unknown"]) {
        const key = `${priorityReason}|${missedTool}`;
        const summary = summaries.get(key) ?? {
          missedTool,
          priorityReason,
          missedCount: 0,
          priorityTools: [],
          latestSessionId: optionalText(report.sessionId),
          latestTraceId: optionalText(report.traceId)
        };
        summary.missedCount += 1;
        summary.priorityTools = uniqueInOrder([...summary.priorityTools, ...priorityTools]);
        summary.latestSessionId ??= optionalText(report.sessionId);
        summary.latestTraceId ??= optionalText(report.traceId);
        summaries.set(key, summary);
      }
    }
  }

  return Array.from(summaries.values())
    .sort((left, right) => (
      right.missedCount - left.missedCount ||
      left.priorityReason.localeCompare(right.priorityReason) ||
      left.missedTool.localeCompare(right.missedTool)
    ))
    .slice(0, 10);
}

function isBlockedRepairTrace(decision: Record<string, unknown>) {
  if (optionalText(decision.kind) !== "repair") return false;
  const title = optionalText(decision.title)?.toLowerCase() ?? "";
  const reason = optionalText(decision.reason)?.toLowerCase() ?? "";
  return optionalText(decision.status) === "blocked" ||
    title.includes("blocked") ||
    reason.includes("blocked");
}

function summarizePatternRepairStops(records: Array<{ report: Record<string, unknown> }>) {
  const summaries = new Map<string, {
    reason: string;
    count: number;
    failedCommands: string[];
    latestSessionId?: string;
    latestTraceId?: string;
  }>();

  for (const { report } of records) {
    const decisions = Array.isArray(report.decisionTrace) ? report.decisionTrace : [];
    for (const decision of decisions.filter(isObject)) {
      if (!isBlockedRepairTrace(decision)) continue;
      const reason = optionalText(decision.reason) ?? "repair_blocked";
      const summary = summaries.get(reason) ?? {
        reason,
        count: 0,
        failedCommands: []
      };
      summary.count += 1;
      summary.failedCommands = uniqueInOrder([
        ...summary.failedCommands,
        ...stringArray(decision.related)
      ]);
      summary.latestSessionId ??= optionalText(report.sessionId);
      summary.latestTraceId ??= optionalText(report.traceId);
      summaries.set(reason, summary);
    }
  }

  return Array.from(summaries.values())
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason))
    .slice(0, 10);
}

async function summarizePatternHandoffBottlenecks(config: XenesisConfig) {
  const tasks = await new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome }).list() as unknown as Record<string, unknown>[];
  const summaries = new Map<string, {
    handoffId: string;
    title?: string;
    total: number;
    queued: number;
    running: number;
    blocked: number;
    failed: number;
    completed: number;
    cancelled: number;
    active: number;
    labels: string[];
    blockedReasons: string[];
  }>();

  for (const task of tasks.filter(isObject)) {
    const handoffId = optionalText(task.handoffId);
    const status = optionalText(task.status);
    if (!handoffId || !status) continue;
    const summary = summaries.get(handoffId) ?? {
      handoffId,
      ...(optionalText(task.handoffTitle) ? { title: optionalText(task.handoffTitle) } : {}),
      total: 0,
      queued: 0,
      running: 0,
      blocked: 0,
      failed: 0,
      completed: 0,
      cancelled: 0,
      active: 0,
      labels: [],
      blockedReasons: []
    };

    summary.total += 1;
    if (status === "queued") summary.queued += 1;
    if (status === "running") summary.running += 1;
    if (status === "blocked") summary.blocked += 1;
    if (status === "failed") summary.failed += 1;
    if (status === "completed") summary.completed += 1;
    if (status === "cancelled") summary.cancelled += 1;
    if (status !== "completed" && status !== "cancelled") summary.active += 1;
    const label = optionalText(task.label);
    if (label) summary.labels.push(label);
    const blockedReason = optionalText(task.blockedReason);
    if (blockedReason) summary.blockedReasons.push(blockedReason);
    if (!summary.title) summary.title = optionalText(task.handoffTitle);
    summaries.set(handoffId, summary);
  }

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      labels: uniqueSorted(summary.labels),
      blockedReasons: uniqueSorted(summary.blockedReasons)
    }))
    .filter((summary) => summary.active > 0 && (summary.blocked > 0 || summary.failed > 0 || summary.queued > 0))
    .sort((left, right) => (
      right.blocked - left.blocked ||
      right.active - left.active ||
      right.failed - left.failed ||
      left.handoffId.localeCompare(right.handoffId)
    ))
    .slice(0, 10);
}

function capabilityImpactFromResult(result: Record<string, unknown>) {
  if (optionalText(result.status) !== "completed") return undefined;
  const impact = isObject(result.impact) ? result.impact : undefined;
  if (!impact || optionalText(impact.status) !== "completed") return undefined;
  const area = optionalText(impact.area) ?? optionalText(result.area);
  if (!area) return undefined;
  const taskId = optionalText(impact.taskId) ?? optionalText(result.taskId);
  return {
    area,
    taskIds: taskId ? [taskId] : [],
    targetFiles: stringArray(impact.targetFiles),
    verification: uniqueInOrder([
      ...stringArray(impact.verification),
      ...stringArray(result.verification)
    ]),
    sourceScenarioIds: uniqueInOrder([
      ...stringArray(impact.sourceScenarioIds),
      ...stringArray(result.sourceScenarioIds)
    ]),
    resultAt: optionalText(impact.recordedAt) ?? optionalText(result.resultAt)
  };
}

type RunReportRecord = {
  fileName: string;
  report: Record<string, unknown>;
  sortTime: number;
};

function averageMetric(records: RunReportRecord[], metricName: string) {
  const values = records
    .map(({ report }) => {
      const metrics = isObject(report.metrics) ? report.metrics : undefined;
      return metrics ? optionalNumber(metrics[metricName]) : undefined;
    })
    .filter((value): value is number => value !== undefined);
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundedDelta(after: number | undefined, before: number | undefined) {
  if (after === undefined || before === undefined) return undefined;
  return Math.round((after - before) * 100) / 100;
}

function effectivenessStatus(input: {
  qualityScoreDelta?: number;
  toolPriorityMissedCountDelta?: number;
  verificationPassRateDelta?: number;
  repairAttemptCountDelta?: number;
}): DiagnosticCapabilityImpactEffectiveness["status"] {
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

function capabilityImpactEffectiveness(
  latestResultAt: string | undefined,
  records: RunReportRecord[]
): DiagnosticCapabilityImpactEffectiveness | undefined {
  const impactTime = operationalTimestamp(latestResultAt);
  if (impactTime <= 0) return undefined;
  const before = records.filter((record) => record.sortTime > 0 && record.sortTime < impactTime);
  const after = records.filter((record) => record.sortTime > impactTime);
  if (before.length === 0 || after.length === 0) {
    return {
      status: "insufficient_data",
      beforeRuns: before.length,
      afterRuns: after.length
    };
  }

  const qualityScoreDelta = roundedDelta(
    averageMetric(after, "qualityScore"),
    averageMetric(before, "qualityScore")
  );
  const toolPriorityMissedCountDelta = roundedDelta(
    averageMetric(after, "toolPriorityMissedCount"),
    averageMetric(before, "toolPriorityMissedCount")
  );
  const verificationPassRateDelta = roundedDelta(
    averageMetric(after, "verificationPassRate"),
    averageMetric(before, "verificationPassRate")
  );
  const repairAttemptCountDelta = roundedDelta(
    averageMetric(after, "repairAttemptCount"),
    averageMetric(before, "repairAttemptCount")
  );
  const deltas = {
    ...(qualityScoreDelta !== undefined ? { qualityScoreDelta } : {}),
    ...(toolPriorityMissedCountDelta !== undefined ? { toolPriorityMissedCountDelta } : {}),
    ...(verificationPassRateDelta !== undefined ? { verificationPassRateDelta } : {}),
    ...(repairAttemptCountDelta !== undefined ? { repairAttemptCountDelta } : {})
  };
  return {
    status: Object.keys(deltas).length > 0 ? effectivenessStatus(deltas) : "insufficient_data",
    beforeRuns: before.length,
    afterRuns: after.length,
    ...deltas
  };
}

async function summarizeCapabilityPolicyImpacts(
  config: XenesisConfig,
  records: RunReportRecord[]
): Promise<DiagnosticCapabilityPolicyImpactPattern[]> {
  const log = await readJsonFile(statePath(config, "reports", "capability-task-results.json"));
  if (!isObject(log) || !Array.isArray(log.results)) return [];
  const summaries = new Map<string, {
    area: string;
    count: number;
    taskIds: string[];
    targetFiles: string[];
    verification: string[];
    sourceScenarioIds: string[];
    latestResultAt?: string;
    latestResultTime: number;
    effectiveness?: DiagnosticCapabilityImpactEffectiveness;
  }>();

  for (const result of log.results.filter(isObject)) {
    const impact = capabilityImpactFromResult(result);
    if (!impact) continue;
    const latestResultTime = operationalTimestamp(impact.resultAt);
    const summary = summaries.get(impact.area) ?? {
      area: impact.area,
      count: 0,
      taskIds: [],
      targetFiles: [],
      verification: [],
      sourceScenarioIds: [],
      latestResultTime: 0
    };
    summary.count += 1;
    summary.taskIds = uniqueInOrder([...summary.taskIds, ...impact.taskIds]);
    summary.targetFiles = uniqueInOrder([...summary.targetFiles, ...impact.targetFiles]);
    summary.verification = uniqueInOrder([...summary.verification, ...impact.verification]);
    summary.sourceScenarioIds = uniqueInOrder([...summary.sourceScenarioIds, ...impact.sourceScenarioIds]);
    if (latestResultTime >= summary.latestResultTime) {
      summary.latestResultTime = latestResultTime;
      summary.latestResultAt = impact.resultAt;
      summary.effectiveness = capabilityImpactEffectiveness(impact.resultAt, records);
    }
    summaries.set(impact.area, summary);
  }

  return Array.from(summaries.values())
    .sort((left, right) => (
      right.count - left.count ||
      right.latestResultTime - left.latestResultTime ||
      left.area.localeCompare(right.area)
    ))
    .slice(0, 10)
    .map((summary) => ({
      area: summary.area,
      count: summary.count,
      taskIds: summary.taskIds,
      targetFiles: summary.targetFiles,
      verification: summary.verification,
      sourceScenarioIds: summary.sourceScenarioIds,
      ...(summary.latestResultAt ? { latestResultAt: summary.latestResultAt } : {}),
      ...(summary.effectiveness ? { effectiveness: summary.effectiveness } : {})
    }));
}

async function collectDiagnosticFailurePatterns(config: XenesisConfig): Promise<DiagnosticFailurePatterns> {
  const records = await readRunReportRecords(config, config.context.operationalFailures.maxRunReports);
  return {
    topFailedTools: summarizePatternTools(records),
    toolChoicePatterns: summarizePatternToolChoices(records),
    repairStopReasons: summarizePatternRepairStops(records),
    handoffBottlenecks: await summarizePatternHandoffBottlenecks(config),
    capabilityPolicyImpacts: await summarizeCapabilityPolicyImpacts(config, records)
  };
}

function compareOperationalFailures(left: OperationalFailureContextItem, right: OperationalFailureContextItem) {
  return right.sortTime - left.sortTime || right.id.localeCompare(left.id);
}

function emptySummary(enabled: boolean, detail: string): OperationalFailureContextSummary {
  return {
    enabled,
    total: 0,
    reports: 0,
    runReports: 0,
    tasks: 0,
    items: [],
    adaptivePolicy: buildAdaptiveExecutionPolicy({
      topFailedTools: [],
      toolChoicePatterns: [],
      repairStopReasons: [],
      handoffBottlenecks: [],
      capabilityPolicyImpacts: []
    }),
    detail
  };
}

export async function collectOperationalFailureContext(config: XenesisConfig): Promise<OperationalFailureContextSummary> {
  const policy = config.context.operationalFailures;
  if (!policy.enabled) {
    return emptySummary(false, "disabled by context.operationalFailures.enabled");
  }

  const [reports, runReports, tasks, patterns] = await Promise.all([
    collectOperationalReports(config, policy.maxReports),
    collectRunReports(config, policy.maxRunReports),
    collectFailedTasks(config, policy.maxTasks),
    collectDiagnosticFailurePatterns(config)
  ]);
  const items = [...reports, ...runReports, ...tasks]
    .sort(compareOperationalFailures)
    .slice(0, policy.maxItems);
  const adaptivePolicy = buildAdaptiveExecutionPolicy(patterns);

  if (items.length === 0 && !adaptivePolicy.active) {
    return emptySummary(true, "no recent failed reports or tasks");
  }

  const baseDetail = items.length > 0
    ? items.map((item) => `${item.kind}:${item.id}`).join(", ")
    : "no recent failed reports or tasks";
  return {
    enabled: true,
    total: items.length,
    reports: items.filter((item) => item.kind === "report").length,
    runReports: items.filter((item) => item.kind === "run_report").length,
    tasks: items.filter((item) => item.kind === "task").length,
    latest: items[0],
    items,
    adaptivePolicy,
    detail: adaptivePolicy.active
      ? `${baseDetail}; adaptive policy active: ${adaptivePolicy.detail}`
      : baseDetail
  };
}

export function buildOperationalFailureSystemMessage(summary: OperationalFailureContextSummary) {
  if (!summary.enabled || (summary.items.length === 0 && !summary.adaptivePolicy.active)) return undefined;
  return [
    "Xenesis recent operational failure context:",
    "Use these recent failures only as diagnostic hints. Do not assume they apply if the user's current request is unrelated.",
    ...summary.items.flatMap((item, index) => [
      `${index + 1}. ${item.summary}`,
      ...item.details.map((line) => `   - ${line}`)
    ]),
    ...operationalRecoveryPolicyLines(summary),
    ...adaptiveExecutionPolicySystemLines(summary.adaptivePolicy)
  ].join("\n");
}

export function operationalFailureContextSource(summary: OperationalFailureContextSummary): Omit<ContextSourceEvent, "type"> {
  return {
    source: "operational_failure",
    name: "recent failed reports and tasks",
    injected: summary.enabled && (summary.items.length > 0 || summary.adaptivePolicy.active),
    itemCount: summary.total,
    detail: summary.detail
  };
}

export function buildOperationalRepairPreflightContext(summary: OperationalFailureContextSummary) {
  if (!summary.enabled || summary.items.length === 0) return undefined;
  return [
    "Recent operational failure hints:",
    ...summary.items.slice(0, 5).flatMap((item, index) => [
      `${index + 1}. ${item.kind}:${item.id} - ${item.summary}`,
      ...item.details.slice(0, 2).map((line) => `   - ${line}`)
    ])
  ].join("\n");
}

function itemText(item: OperationalFailureContextItem) {
  return [item.summary, ...item.details].join("\n").toLowerCase();
}

function hasRecentShellFailures(summary: OperationalFailureContextSummary) {
  return summary.items.some((item) => /\bshell\s+\d+\/\d+\s+failures\b/i.test([item.summary, ...item.details].join("\n")));
}

function hasRecentBlockedRepair(summary: OperationalFailureContextSummary) {
  return summary.items.some((item) => {
    const text = itemText(item);
    return text.includes("repair failed:") ||
      text.includes("repair loop blocked") ||
      text.includes("repair attempts did not recover");
  });
}

function operationalRecoveryPolicyLines(summary: OperationalFailureContextSummary) {
  const rules: string[] = [];

  if (hasRecentShellFailures(summary)) {
    rules.push(
      "Recent shell failures detected: Prefer tree, glob, list, read, search, code_symbols, lsp, and diagnostics before shell.",
      "Use shell only for explicit command execution or when structured tools cannot answer the request; keep shell commands narrow and platform-specific."
    );
  }

  if (hasRecentBlockedRepair(summary)) {
    rules.push(
      "Recent blocked repair attempts detected: inspect the previous failure evidence first, run the smallest targeted verification, and stop instead of repeating the same repair when the failure signature is unchanged."
    );
  }

  if (rules.length === 0) return [];
  return [
    "",
    "Operational recovery policy:",
    ...rules.map((rule) => `- ${rule}`)
  ];
}

function failedCommandsFromVerification(verification: VerificationReport | undefined) {
  if (!verification) return [];
  return verification.results
    .filter((result) => !result.ok)
    .map((result) => result.command.trim().toLowerCase())
    .filter(Boolean);
}

function itemMentionsCommand(item: OperationalFailureContextItem, command: string) {
  return itemText(item).includes(command);
}

function hasRecentFailedRepairForSameCommand(
  summary: OperationalFailureContextSummary,
  verification: VerificationReport | undefined
) {
  const failedCommands = failedCommandsFromVerification(verification);
  if (failedCommands.length === 0) return false;
  return summary.items.some((item) => {
    const text = itemText(item);
    const failedRepair = text.includes("repair failed:") ||
      text.includes("repair loop blocked") ||
      text.includes("repair attempts did not recover");
    return failedRepair && failedCommands.some((command) => itemMentionsCommand(item, command));
  });
}

export function buildOperationalRepairPreflightDecision(
  summary: OperationalFailureContextSummary,
  verification?: VerificationReport
): OperationalRepairPreflightDecision | undefined {
  const context = buildOperationalRepairPreflightContext(summary);
  if (!context) return undefined;
  if (hasRecentFailedRepairForSameCommand(summary, verification)) {
    return {
      context,
      shouldRepair: false,
      blockReason: "recent_failed_repair_for_same_command"
    };
  }
  return { context };
}
