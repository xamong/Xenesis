import type {
  CapabilityScenario,
  CapabilityScenarioCategory
} from "./capabilityEval.js";
import type {
  CapabilityFailureSignals,
  CapabilityScenarioBacklog,
  CapabilityScenarioCandidate,
  CapabilityScenarioCandidateStatus
} from "./capabilityFeedbackLoop.js";

export interface FailedRunReportLearningEntry {
  report: Record<string, unknown>;
  prompt?: string;
  fileName?: string;
}

export interface PromoteFailedRunReportsToCapabilityScenariosOptions {
  entries: FailedRunReportLearningEntry[];
  existing?: CapabilityScenarioBacklog;
  status?: CapabilityScenarioCandidateStatus;
  now?: () => Date;
  maxCandidates?: number;
}

export interface PromoteFailedRunReportsToCapabilityScenariosResult {
  backlog: CapabilityScenarioBacklog;
  candidates: CapabilityScenarioCandidate[];
  imported: number;
  skipped: number;
  accepted: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function objectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(optionalText).filter((item): item is string => Boolean(item))
    : [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "run";
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function reportMetrics(report: Record<string, unknown>) {
  return isObject(report.metrics) ? report.metrics : {};
}

function reportSelfReview(report: Record<string, unknown>) {
  return isObject(report.selfReview) ? report.selfReview : {};
}

function reportTools(report: Record<string, unknown>) {
  return objectArray(report.tools).map((tool) => ({
    name: optionalText(tool.name),
    calls: optionalNumber(tool.calls) ?? 0,
    failures: optionalNumber(tool.failures) ?? 0
  })).filter((tool): tool is { name: string; calls: number; failures: number } => Boolean(tool.name));
}

function reportChanges(report: Record<string, unknown>) {
  return objectArray(report.changes);
}

function reportVerification(report: Record<string, unknown>) {
  return isObject(report.verification) ? report.verification : undefined;
}

function selfReviewFindings(report: Record<string, unknown>) {
  return objectArray(reportSelfReview(report).findings);
}

function isFailedRunReport(report: Record<string, unknown>) {
  const metrics = reportMetrics(report);
  const success = optionalBoolean(metrics.success);
  const status = optionalText(report.status);
  const selfReviewStatus = optionalText(reportSelfReview(report).status);
  return (
    success === false ||
    status === "failed" ||
    status === "error" ||
    selfReviewStatus === "fail" ||
    reportTools(report).some((tool) => tool.failures > 0)
  );
}

function failedToolEvidence(report: Record<string, unknown>) {
  return reportTools(report)
    .filter((tool) => tool.failures > 0)
    .map((tool) => `tool failed: ${tool.name} ${tool.failures}/${Math.max(tool.calls, tool.failures)}`);
}

function degradationEvidence(report: Record<string, unknown>) {
  return stringArray(reportMetrics(report).degradationReasons)
    .map((reason) => `run degradation: ${reason}`);
}

function verificationEvidence(report: Record<string, unknown>) {
  const verification = reportVerification(report);
  if (!verification) return [];
  const status = optionalText(verification.status);
  return status && status !== "passed" ? [`verification status: ${status}`] : [];
}

function selfReviewEvidence(report: Record<string, unknown>) {
  return selfReviewFindings(report)
    .map((finding) => {
      const area = optionalText(finding.area) ?? "unknown";
      const severity = optionalText(finding.severity) ?? "unknown";
      const message = optionalText(finding.message);
      return message ? `self-review(${area}/${severity}): ${message}` : undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function runFailureEvidence(report: Record<string, unknown>) {
  const status = optionalText(report.status);
  const metrics = reportMetrics(report);
  return unique([
    ...(status && status !== "completed" ? [`run status: ${status}`] : []),
    ...degradationEvidence(report),
    ...failedToolEvidence(report),
    ...verificationEvidence(report),
    ...selfReviewEvidence(report),
    metrics.blocked === true ? "run blocked" : ""
  ]);
}

function hasVerificationFailureSignal(report: Record<string, unknown>) {
  const metrics = reportMetrics(report);
  const verification = reportVerification(report);
  return (
    metrics.verificationAfterChangeMissing === true ||
    stringArray(metrics.degradationReasons).some((reason) => (
      reason === "missing_verification_after_change" ||
      reason === "verification_failed"
    )) ||
    optionalText(verification?.status) === "failed" ||
    selfReviewFindings(report).some((finding) => optionalText(finding.area) === "verification")
  );
}

function inferCategory(report: Record<string, unknown>): CapabilityScenarioCategory {
  const tools = reportTools(report).map((tool) => tool.name);
  const metrics = reportMetrics(report);
  if (hasVerificationFailureSignal(report)) return "verification";
  if (tools.some((tool) => tool.startsWith("desk_"))) return "desk";
  if (tools.some((tool) => tool === "weather_current" || tool === "news_latest" || tool === "sports_scores" || tool === "market_quote" || tool === "web_search")) {
    return "current-info";
  }
  if (tools.some((tool) => tool.startsWith("memory"))) return "memory-session";
  if ((optionalNumber(metrics.providerRetryCount) ?? 0) > 0 || (optionalNumber(metrics.providerFallbackCount) ?? 0) > 0) {
    return "provider-recovery";
  }
  if (reportTools(report).some((tool) => tool.failures > 0)) return "tool-recovery";
  if (reportChanges(report).length > 0) return "practical-work";
  return "practical-work";
}

function inferredRequiredTools(report: Record<string, unknown>) {
  const tools = reportTools(report)
    .filter((tool) => tool.calls > 0)
    .map((tool) => tool.name);
  const additions = [
    hasVerificationFailureSignal(report) ? "diagnostics" : "",
    reportChanges(report).length > 0 && !tools.includes("read") ? "read" : ""
  ];
  return unique([...tools, ...additions]);
}

function inferredRequiredTextAny(report: Record<string, unknown>) {
  if (hasVerificationFailureSignal(report) || reportChanges(report).length > 0) {
    return [["검증", "diagnostics", "verification"]];
  }
  if (inferCategory(report) === "tool-recovery") {
    return [["복구", "recovery", "retry"]];
  }
  if (inferCategory(report) === "provider-recovery") {
    return [["provider", "fallback", "retry"]];
  }
  return [];
}

function failureSignals(report: Record<string, unknown>, requiredTools: string[], requiredTextAny: string[][]): CapabilityFailureSignals {
  return {
    requiredFirstTool: requiredTools[0],
    missingTools: requiredTools,
    requiredToolAny: [],
    missingEvents: [],
    forbiddenTools: [],
    missingText: [],
    requiredTextAny,
    minimumToolCalls: Object.fromEntries(requiredTools.map((tool) => [tool, 1])),
    orderedToolFailures: [],
    rawFailures: runFailureEvidence(report)
  };
}

function scenarioPrompt(prompt: string, report: Record<string, unknown>, failures: string[]) {
  const reportId = optionalText(report.id) ?? optionalText(report.sessionId) ?? "unknown";
  return [
    prompt,
    "",
    "이 시나리오는 실제 실패 run report에서 승격되었습니다.",
    `sourceReportId: ${reportId}`,
    "동일한 실패 징후를 피하고, 필요한 도구 사용과 검증 증거를 최종 응답에 포함하세요.",
    ...(failures.length > 0 ? ["failureSignals:", ...failures.slice(0, 6).map((failure) => `- ${failure}`)] : [])
  ].join("\n");
}

function candidateIdFor(report: Record<string, unknown>, prompt: string, failures: string[]) {
  const sessionId = optionalText(report.sessionId) ?? optionalText(report.id) ?? "unknown";
  return `failed-run-${slug(sessionId)}-${stableHash([
    optionalText(report.id) ?? "",
    sessionId,
    prompt,
    ...failures
  ].join("\n"))}`;
}

function candidateFromEntry(
  entry: FailedRunReportLearningEntry,
  timestamp: string,
  status: CapabilityScenarioCandidateStatus
): CapabilityScenarioCandidate | undefined {
  const prompt = optionalText(entry.prompt);
  if (!prompt || !isFailedRunReport(entry.report)) return undefined;

  const failures = runFailureEvidence(entry.report);
  const id = candidateIdFor(entry.report, prompt, failures);
  const sourceReportId = optionalText(entry.report.id) ?? entry.fileName ?? id;
  const sourceScenarioId = `run:${optionalText(entry.report.sessionId) ?? sourceReportId}`;
  const category = inferCategory(entry.report);
  const requiredTools = inferredRequiredTools(entry.report);
  const requiredTextAny = inferredRequiredTextAny(entry.report);
  const suggestedScenario: CapabilityScenario = {
    id,
    category,
    prompt: scenarioPrompt(prompt, entry.report, failures),
    ...(requiredTools.length > 0 ? { requiredTools } : {}),
    ...(requiredTextAny.length > 0 ? { requiredTextAny } : {}),
    weight: category === "verification" || category === "practical-work" ? 3 : 2,
    maxDurationMs: 180000
  };

  return {
    id,
    status,
    sourceReportId,
    sourceScenarioId,
    category,
    prompt,
    occurrences: 1,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    failures,
    toolCalls: reportTools(entry.report).map((tool) => tool.name),
    signals: failureSignals(entry.report, requiredTools, requiredTextAny),
    suggestedScenario
  };
}

function mergeCandidate(previous: CapabilityScenarioCandidate | undefined, next: CapabilityScenarioCandidate) {
  if (!previous) return next;
  return {
    ...next,
    status: previous.status,
    notes: previous.notes,
    firstSeenAt: previous.firstSeenAt,
    occurrences: previous.occurrences + 1
  };
}

export function promoteFailedRunReportsToCapabilityScenarios(
  options: PromoteFailedRunReportsToCapabilityScenariosOptions
): PromoteFailedRunReportsToCapabilityScenariosResult {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const maxCandidates = Math.max(1, options.maxCandidates ?? 200);
  const status = options.status ?? "accepted";
  const candidates = new Map<string, CapabilityScenarioCandidate>();
  let imported = 0;
  let skipped = 0;

  for (const candidate of options.existing?.candidates ?? []) {
    candidates.set(candidate.id, candidate);
  }

  for (const entry of options.entries) {
    const next = candidateFromEntry(entry, timestamp, status);
    if (!next) {
      skipped += 1;
      continue;
    }
    imported += 1;
    candidates.set(next.id, mergeCandidate(candidates.get(next.id), next));
  }

  const nextCandidates = Array.from(candidates.values())
    .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt) || left.id.localeCompare(right.id))
    .slice(0, maxCandidates);
  const backlog: CapabilityScenarioBacklog = {
    kind: "capability-scenario-backlog",
    updatedAt: timestamp,
    candidates: nextCandidates
  };

  return {
    backlog,
    candidates: nextCandidates,
    imported,
    skipped,
    accepted: nextCandidates.filter((candidate) => candidate.status === "accepted").length
  };
}
