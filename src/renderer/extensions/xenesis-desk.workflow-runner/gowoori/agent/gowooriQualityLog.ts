import type { GowooriArtifactRepairDiagnostic } from './gowooriArtifactRepair';

export type GowooriQualityStatus = 'stable' | 'repaired' | 'blocked';
export type GowooriQualityFailureReason = 'none' | 'provider-error' | 'validation-error' | 'repair-failed';
export type GowooriQualityApplyState = 'queued' | 'skipped' | 'blocked';

export const GOWOORI_QUALITY_LOG_SCHEMA = 'gowoori-quality-log/v1';
export const GOWOORI_PROVIDER_BENCHMARK_SCHEMA = 'gowoori-provider-benchmark/v1';
export const GOWOORI_BRIDGE_MATRIX_REPORT_SCHEMA = 'gowoori-bridge-matrix-report/v1';
export const GOWOORI_QUALITY_FILTER_ALL = 'all';

export interface GowooriQualityDiagnosticItem {
  severity: GowooriArtifactRepairDiagnostic['severity'];
  message: string;
}

export interface GowooriQualityLogEntry {
  id: string;
  provider: string;
  mode: string;
  promptTitle: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  sourceChars: number;
  artifactSource?: string;
  normalizedChanged: boolean;
  preflightOk: boolean;
  autoRepairAttempted: boolean;
  autoRepairSucceeded: boolean;
  applyRequested: boolean;
  applied: boolean;
  failureReason: GowooriQualityFailureReason;
  applyState: GowooriQualityApplyState;
  providerError: boolean;
  repairBeforeDiagnosticsCount: number;
  repairAfterDiagnosticsCount: number;
  repairDiagnosticsDelta: number;
  diagnosticsCount: number;
  warningCount: number;
  errorCount: number;
  diagnosticMessages: GowooriQualityDiagnosticItem[];
  status: GowooriQualityStatus;
  summary?: string;
}

export interface GowooriQualityLogInput {
  id: string;
  provider: string;
  mode: string;
  promptTitle: string;
  startedAt: number;
  completedAt: number;
  source: string;
  sourceChars?: number;
  normalizedChanged: boolean;
  preflightOk: boolean;
  autoRepairAttempted: boolean;
  autoRepairSucceeded: boolean;
  applyRequested?: boolean;
  applied: boolean;
  providerError?: boolean;
  repairBeforeDiagnosticsCount?: number;
  repairAfterDiagnosticsCount?: number;
  diagnostics: GowooriArtifactRepairDiagnostic[];
  summary?: string;
}

export interface GowooriQualityProviderSummary {
  provider: string;
  total: number;
  stable: number;
  repaired: number;
  blocked: number;
  applyRequested: number;
  applied: number;
  averageDurationMs: number;
  averageSourceChars: number;
  applyRequestRate: number;
}

export interface GowooriQualitySummary {
  total: number;
  stable: number;
  repaired: number;
  blocked: number;
  applyRequested: number;
  applied: number;
  applyRequestRate: number;
  providers: GowooriQualityProviderSummary[];
}

export interface GowooriQualityDiagnosticSummary extends GowooriQualityDiagnosticItem {
  count: number;
  providers: string[];
}

export interface GowooriProviderBenchmarkItem {
  provider: string;
  total: number;
  success: number;
  stable: number;
  repaired: number;
  blocked: number;
  applyRequested: number;
  applied: number;
  successRate: number;
  stableRate: number;
  repairRate: number;
  blockRate: number;
  applyRate: number;
  applyRequestRate: number;
  averageDurationMs: number;
  averageSourceChars: number;
  topDiagnostics: GowooriQualityDiagnosticSummary[];
}

export interface GowooriProviderBenchmarkCaseCell {
  provider: string;
  entryId?: string;
  status: GowooriQualityStatus | 'missing';
  success: boolean;
  diagnosticsCount: number;
  warningCount: number;
  errorCount: number;
  durationMs: number;
  sourceChars: number;
  completedAt?: number;
  repaired: boolean;
  applied: boolean;
  failureReason: GowooriQualityFailureReason;
  applyState: GowooriQualityApplyState;
  applyRequested: boolean;
  repairDiagnosticsDelta: number;
  diagnosticSummary?: string;
  artifactPreview?: string;
  summary?: string;
}

export interface GowooriProviderBenchmarkCaseItem {
  caseId: string;
  caseTitle: string;
  total: number;
  success: number;
  successRate: number;
  providers: GowooriProviderBenchmarkCaseCell[];
}

export interface GowooriProviderBenchmarkReport {
  total: number;
  bestProvider?: string;
  providers: GowooriProviderBenchmarkItem[];
  caseMatrix: GowooriProviderBenchmarkCaseItem[];
  topDiagnostics: GowooriQualityDiagnosticSummary[];
}

export type GowooriProviderRecommendation = 'recommended' | 'watch' | 'risk';

export interface GowooriProviderScorecardItem {
  provider: string;
  rank: number;
  total: number;
  score: number;
  recommendation: GowooriProviderRecommendation;
  successRate: number;
  stableFirstRate: number;
  repairDependencyRate: number;
  blockRate: number;
  averageDurationMs: number;
  reason: string;
  topDiagnostics: GowooriQualityDiagnosticSummary[];
}

export interface GowooriProviderScorecardReport {
  total: number;
  recommendedProvider?: string;
  providers: GowooriProviderScorecardItem[];
  recommended: GowooriProviderScorecardItem[];
  watch: GowooriProviderScorecardItem[];
  risk: GowooriProviderScorecardItem[];
}

export interface GowooriProviderBenchmarkExport {
  schema: typeof GOWOORI_PROVIDER_BENCHMARK_SCHEMA;
  exportedAt: string;
  benchmark: GowooriProviderBenchmarkReport;
}

export interface GowooriProviderBenchmarkImportResult {
  benchmark: GowooriProviderBenchmarkReport | null;
  dropped: number;
  error?: string;
}

export interface GowooriProviderBenchmarkProviderDelta {
  provider: string;
  currentTotal: number;
  baselineTotal: number;
  totalDelta: number;
  currentSuccessRate: number;
  baselineSuccessRate: number;
  successRateDelta: number;
  currentBlockRate: number;
  baselineBlockRate: number;
  blockRateDelta: number;
  averageDurationMsDelta: number;
  trend: 'improved' | 'regressed' | 'flat' | 'new' | 'removed';
}

export interface GowooriProviderBenchmarkCaseDelta {
  caseId: string;
  caseTitle: string;
  provider: string;
  currentStatus: GowooriProviderBenchmarkCaseCell['status'];
  baselineStatus: GowooriProviderBenchmarkCaseCell['status'];
  successChanged: boolean;
  diagnosticsDelta: number;
  durationMsDelta: number;
  trend: 'improved' | 'regressed' | 'flat' | 'new' | 'removed';
}

export interface GowooriProviderBenchmarkComparisonReport {
  currentTotal: number;
  baselineTotal: number;
  providerDeltas: GowooriProviderBenchmarkProviderDelta[];
  caseDeltas: GowooriProviderBenchmarkCaseDelta[];
  improvementCount: number;
  regressionCount: number;
  newProviderCount: number;
  removedProviderCount: number;
  missingBaselineCount: number;
}

export type GowooriProviderHealthLevel = 'good' | 'watch' | 'risk';
export type GowooriProviderTrendDirection = 'up' | 'flat' | 'down';

export interface GowooriProviderHealthItem {
  provider: string;
  total: number;
  success: number;
  stable: number;
  repaired: number;
  blocked: number;
  applyRequested: number;
  applied: number;
  applyRequestRate: number;
  successRate: number;
  recentSuccessRate: number;
  repairAttempted: number;
  repairSucceeded: number;
  repairSuccessRate: number;
  averageDurationMs: number;
  lastCompletedAt: number;
  health: GowooriProviderHealthLevel;
  topDiagnostics: GowooriQualityDiagnosticSummary[];
}

export interface GowooriProviderHealthRecentSummary {
  total: number;
  success: number;
  successRate: number;
  previousSuccessRate: number;
  trendDelta: number;
  trendDirection: GowooriProviderTrendDirection;
}

export interface GowooriProviderHealthDashboard {
  total: number;
  recent: GowooriProviderHealthRecentSummary;
  providers: GowooriProviderHealthItem[];
  topDiagnostics: GowooriQualityDiagnosticSummary[];
}

export interface GowooriProviderHealthDashboardOptions {
  trendWindow?: number;
  diagnosticsLimit?: number;
}

export type GowooriProviderReadinessState = 'ready' | 'blocked' | 'unknown';

export interface GowooriProviderReadinessItem {
  provider: string;
  state: GowooriProviderReadinessState;
  latestEntry: GowooriQualityLogEntry | null;
  latestCompletedAt: number;
  summary: string;
  diagnosticSummary?: string;
}

export interface GowooriProviderReadinessReport {
  total: number;
  ready: number;
  blocked: number;
  unknown: number;
  latestCompletedAt: number;
  providers: GowooriProviderReadinessItem[];
}

export interface GowooriProviderTimelinePoint {
  id: string;
  provider: string;
  mode: string;
  promptTitle: string;
  completedAt: number;
  durationMs: number;
  sourceChars: number;
  status: GowooriQualityStatus;
  success: boolean;
  applyRequested: boolean;
  applied: boolean;
  diagnosticsCount: number;
  diagnosticSummary?: string;
}

export interface GowooriProviderTimelineTrack {
  provider: string;
  total: number;
  stable: number;
  repaired: number;
  blocked: number;
  applyRequested: number;
  applied: number;
  averageDurationMs: number;
  applyRequestRate: number;
  latestCompletedAt: number;
}

export interface GowooriProviderTimelineReport {
  total: number;
  providers: GowooriProviderTimelineTrack[];
  points: GowooriProviderTimelinePoint[];
}

export interface GowooriQualityLogExport {
  schema: typeof GOWOORI_QUALITY_LOG_SCHEMA;
  exportedAt: string;
  entries: GowooriQualityLogEntry[];
}

export interface GowooriQualityLogImportResult {
  entries: GowooriQualityLogEntry[];
  dropped: number;
}

export interface GowooriBridgeMatrixReportImportResult extends GowooriQualityLogImportResult {
  summary?: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface GowooriQualityFilterState {
  provider?: string;
  mode?: string;
  caseTitle?: string;
}

export interface GowooriQualityFilterOptions {
  providers: string[];
  modes: string[];
  caseTitles: string[];
}

export interface GowooriBridgeMatrixProviderSummary {
  provider: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  repaired: number;
  blocked: number;
  repairAttempted: number;
  repairSucceeded: number;
  repairSuccessRate: number;
  averageDurationMs: number;
}

export interface GowooriBridgeMatrixSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  stable: number;
  repaired: number;
  blocked: number;
  repairAttempted: number;
  repairSucceeded: number;
  repairSuccessRate: number;
  averageDurationMs: number;
  providers: GowooriBridgeMatrixProviderSummary[];
}

export function createGowooriQualityLogEntry(input: GowooriQualityLogInput): GowooriQualityLogEntry {
  const diagnostics = Array.isArray(input.diagnostics) ? input.diagnostics : [];
  const sourceText = String(input.source || '');
  const sourceChars = normalizeNonNegativeNumber(input.sourceChars, sourceText.length);
  const diagnosticMessages = diagnostics
    .map((item) => ({
      severity: item.severity,
      message: String(item.message || '').trim(),
    }))
    .filter((item) => item.message);
  const warningCount = diagnostics.filter((item) => item.severity === 'warning').length;
  const errorCount = diagnostics.filter((item) => item.severity === 'error').length;
  const preflightOk = input.preflightOk === true;
  const autoRepairAttempted = input.autoRepairAttempted === true;
  const autoRepairSucceeded = input.autoRepairSucceeded === true;
  const providerError = input.providerError === true;
  const applyRequested = input.applyRequested === true || input.applied === true;
  const applied = applyRequested && preflightOk;
  const status = resolveGowooriQualityStatus(preflightOk, autoRepairAttempted, autoRepairSucceeded);
  const repairBeforeDiagnosticsCount = normalizeNonNegativeNumber(
    input.repairBeforeDiagnosticsCount,
    autoRepairAttempted ? diagnostics.length : 0,
  );
  const repairAfterDiagnosticsCount = normalizeNonNegativeNumber(
    input.repairAfterDiagnosticsCount,
    autoRepairSucceeded ? 0 : repairBeforeDiagnosticsCount,
  );
  const artifactSource = normalizeArtifactSourceForQualityLog(input.source);

  return {
    id: input.id,
    provider: normalizeQualityLabel(input.provider, 'unknown'),
    mode: normalizeQualityLabel(input.mode, 'generate'),
    promptTitle: normalizeQualityLabel(input.promptTitle, 'Untitled request'),
    startedAt: normalizeTimestamp(input.startedAt),
    completedAt: normalizeTimestamp(input.completedAt),
    durationMs: Math.max(0, normalizeTimestamp(input.completedAt) - normalizeTimestamp(input.startedAt)),
    sourceChars,
    ...(artifactSource ? { artifactSource } : {}),
    normalizedChanged: input.normalizedChanged === true,
    preflightOk,
    autoRepairAttempted,
    autoRepairSucceeded,
    applyRequested,
    applied,
    failureReason: resolveGowooriQualityFailureReason(
      preflightOk,
      providerError,
      autoRepairAttempted,
      autoRepairSucceeded,
    ),
    applyState: resolveGowooriQualityApplyState(preflightOk, applyRequested),
    providerError,
    repairBeforeDiagnosticsCount,
    repairAfterDiagnosticsCount,
    repairDiagnosticsDelta: repairAfterDiagnosticsCount - repairBeforeDiagnosticsCount,
    diagnosticsCount: diagnostics.length,
    warningCount,
    errorCount,
    diagnosticMessages,
    status,
    summary: input.summary?.trim() || undefined,
  };
}

export function createGowooriQualityFilterOptions(entries: GowooriQualityLogEntry[]): GowooriQualityFilterOptions {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const providers = new Set<string>();
  const modes = new Set<string>();
  const caseTitles = new Set<string>();

  for (const entry of normalizedEntries) {
    providers.add(normalizeQualityLabel(entry.provider, 'unknown'));
    modes.add(normalizeQualityLabel(entry.mode, 'generate'));
    caseTitles.add(normalizeQualityLabel(entry.promptTitle, 'Untitled request'));
  }

  return {
    providers: [GOWOORI_QUALITY_FILTER_ALL, ...Array.from(providers).sort((a, b) => a.localeCompare(b))],
    modes: [GOWOORI_QUALITY_FILTER_ALL, ...Array.from(modes).sort((a, b) => a.localeCompare(b))],
    caseTitles: [GOWOORI_QUALITY_FILTER_ALL, ...Array.from(caseTitles).sort((a, b) => a.localeCompare(b))],
  };
}

export function filterGowooriQualityLog(
  entries: GowooriQualityLogEntry[],
  filters: GowooriQualityFilterState = {},
): GowooriQualityLogEntry[] {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const provider = normalizeQualityLabel(filters.provider, GOWOORI_QUALITY_FILTER_ALL);
  const mode = normalizeQualityLabel(filters.mode, GOWOORI_QUALITY_FILTER_ALL);
  const caseTitle = normalizeQualityLabel(filters.caseTitle, GOWOORI_QUALITY_FILTER_ALL);

  return normalizedEntries.filter((entry) => {
    if (provider !== GOWOORI_QUALITY_FILTER_ALL && entry.provider !== provider) return false;
    if (mode !== GOWOORI_QUALITY_FILTER_ALL && entry.mode !== mode) return false;
    if (caseTitle !== GOWOORI_QUALITY_FILTER_ALL && entry.promptTitle !== caseTitle) return false;
    return true;
  });
}

export function createGowooriBridgeMatrixSummary(entries: GowooriQualityLogEntry[]): GowooriBridgeMatrixSummary {
  const matrixEntries = (Array.isArray(entries) ? entries : []).filter((entry) => entry.mode === 'bridge-matrix');
  const providers = new Map<string, GowooriBridgeMatrixProviderSummary & { durationTotal: number }>();
  const summary: GowooriBridgeMatrixSummary & { durationTotal: number } = {
    total: matrixEntries.length,
    passed: 0,
    failed: 0,
    passRate: 0,
    stable: 0,
    repaired: 0,
    blocked: 0,
    repairAttempted: 0,
    repairSucceeded: 0,
    repairSuccessRate: 0,
    averageDurationMs: 0,
    providers: [],
    durationTotal: 0,
  };

  for (const entry of matrixEntries) {
    const passed = isSuccessfulQualityEntry(entry);
    if (passed) summary.passed += 1;
    if (!passed) summary.failed += 1;
    summary[entry.status] += 1;
    if (entry.autoRepairAttempted) summary.repairAttempted += 1;
    if (entry.autoRepairSucceeded) summary.repairSucceeded += 1;
    summary.durationTotal += entry.durationMs;

    const providerName = normalizeQualityLabel(entry.provider, 'unknown');
    const providerSummary = providers.get(providerName) ?? {
      provider: providerName,
      total: 0,
      passed: 0,
      failed: 0,
      passRate: 0,
      repaired: 0,
      blocked: 0,
      repairAttempted: 0,
      repairSucceeded: 0,
      repairSuccessRate: 0,
      averageDurationMs: 0,
      durationTotal: 0,
    };
    providerSummary.total += 1;
    if (passed) providerSummary.passed += 1;
    if (!passed) providerSummary.failed += 1;
    if (entry.status === 'repaired') providerSummary.repaired += 1;
    if (entry.status === 'blocked') providerSummary.blocked += 1;
    if (entry.autoRepairAttempted) providerSummary.repairAttempted += 1;
    if (entry.autoRepairSucceeded) providerSummary.repairSucceeded += 1;
    providerSummary.durationTotal += entry.durationMs;
    providers.set(providerName, providerSummary);
  }

  summary.passRate = toRate(summary.passed, summary.total);
  summary.repairSuccessRate = toRate(summary.repairSucceeded, summary.repairAttempted);
  summary.averageDurationMs = Math.round(summary.total > 0 ? summary.durationTotal / summary.total : 0);
  summary.providers = Array.from(providers.values())
    .map((item) => ({
      provider: item.provider,
      total: item.total,
      passed: item.passed,
      failed: item.failed,
      passRate: toRate(item.passed, item.total),
      repaired: item.repaired,
      blocked: item.blocked,
      repairAttempted: item.repairAttempted,
      repairSucceeded: item.repairSucceeded,
      repairSuccessRate: toRate(item.repairSucceeded, item.repairAttempted),
      averageDurationMs: Math.round(item.total > 0 ? item.durationTotal / item.total : 0),
    }))
    .sort((a, b) => b.passRate - a.passRate || b.total - a.total || a.provider.localeCompare(b.provider));

  return {
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    passRate: summary.passRate,
    stable: summary.stable,
    repaired: summary.repaired,
    blocked: summary.blocked,
    repairAttempted: summary.repairAttempted,
    repairSucceeded: summary.repairSucceeded,
    repairSuccessRate: summary.repairSuccessRate,
    averageDurationMs: summary.averageDurationMs,
    providers: summary.providers,
  };
}

export function exportGowooriQualityLog(
  entries: GowooriQualityLogEntry[],
  exportedAt = new Date().toISOString(),
): string {
  const payload: GowooriQualityLogExport = {
    schema: GOWOORI_QUALITY_LOG_SCHEMA,
    exportedAt,
    entries: (Array.isArray(entries) ? entries : [])
      .map((entry) => sanitizeImportedQualityEntry(entry))
      .filter((entry): entry is GowooriQualityLogEntry => entry !== null),
  };
  return JSON.stringify(payload, null, 2);
}

export function importGowooriQualityLog(raw: string): GowooriQualityLogImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], dropped: 1 };
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.entries)
      ? parsed.entries
      : null;

  if (!candidates) {
    return { entries: [], dropped: 1 };
  }

  const entries: GowooriQualityLogEntry[] = [];
  let dropped = 0;
  for (const item of candidates) {
    const entry = sanitizeImportedQualityEntry(item);
    if (entry) {
      entries.push(entry);
    } else {
      dropped += 1;
    }
  }

  return { entries, dropped };
}

export function importGowooriBridgeMatrixReport(raw: string): GowooriBridgeMatrixReportImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: [], dropped: 1 };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.cases)) {
    return { entries: [], dropped: 1 };
  }

  const generatedAt = normalizeDateTimestamp(parsed.generatedAt, Date.now());
  const entries: GowooriQualityLogEntry[] = [];
  let dropped = 0;

  parsed.cases.forEach((item, index) => {
    if (!isRecord(item)) {
      dropped += 1;
      return;
    }

    const caseId = normalizeQualityLabel(item.id, '');
    if (!caseId) {
      dropped += 1;
      return;
    }

    const durationMs = normalizeNonNegativeNumber(item.durationMs, 0);
    const completedAt = generatedAt + index;
    const startedAt = Math.max(0, completedAt - durationMs);
    const caseLabel = normalizeQualityLabel(item.label, caseId);
    const provider = normalizeQualityLabel(item.provider, 'unknown');
    const ok = item.ok === true;
    const repairAttempted = item.repairAttempted === true;
    const repairSucceeded = item.repairSucceeded === true;
    const diagnostics = normalizeBridgeMatrixDiagnostics(item.diagnostics, item.error);
    const sourceChars = normalizeNonNegativeNumber(item.sourceLength, 0);
    const applied = item.applied === true && ok;
    const repairBeforeDiagnosticsCount = normalizeNonNegativeNumber(
      item.repairBeforeDiagnosticsCount,
      repairAttempted ? diagnostics.length : 0,
    );
    const repairAfterDiagnosticsCount = normalizeNonNegativeNumber(
      item.repairAfterDiagnosticsCount,
      repairSucceeded ? 0 : repairBeforeDiagnosticsCount,
    );
    const statusLabel = ok ? (repairAttempted || repairSucceeded ? 'repaired' : 'stable') : 'blocked';

    entries.push(
      createGowooriQualityLogEntry({
        id: `bridge-matrix-${slugQualityLabel(caseId, `case-${index + 1}`)}-${completedAt}`,
        provider,
        mode: 'bridge-matrix',
        promptTitle: `Bridge smoke matrix: ${caseLabel}`,
        startedAt,
        completedAt,
        source: '',
        sourceChars,
        normalizedChanged: repairAttempted || repairSucceeded,
        preflightOk: ok,
        autoRepairAttempted: repairAttempted,
        autoRepairSucceeded: repairSucceeded,
        applyRequested: item.applied === true,
        applied,
        providerError: !ok && normalizeOptionalText(item.error) !== undefined && diagnostics.length === 0,
        repairBeforeDiagnosticsCount,
        repairAfterDiagnosticsCount,
        diagnostics,
        summary: [
          `Bridge smoke matrix ${statusLabel}.`,
          `${provider} / ${caseId}.`,
          `${durationMs}ms, ${sourceChars} source chars.`,
        ].join(' '),
      }),
    );
  });

  return {
    entries,
    dropped,
    ...(isRecord(parsed.summary)
      ? {
          summary: {
            total: normalizeNonNegativeNumber(parsed.summary.total, entries.length + dropped),
            passed: normalizeNonNegativeNumber(
              parsed.summary.passed,
              entries.filter((entry) => entry.preflightOk).length,
            ),
            failed: normalizeNonNegativeNumber(
              parsed.summary.failed,
              entries.filter((entry) => !entry.preflightOk).length + dropped,
            ),
          },
        }
      : {}),
  };
}

export function mergeGowooriQualityLogs(
  existing: GowooriQualityLogEntry[],
  incoming: GowooriQualityLogEntry[],
  limit = 200,
): GowooriQualityLogEntry[] {
  const byId = new Map<string, GowooriQualityLogEntry>();
  for (const entry of Array.isArray(existing) ? existing : []) {
    const normalized = sanitizeImportedQualityEntry(entry);
    if (normalized) byId.set(normalized.id, normalized);
  }
  for (const entry of Array.isArray(incoming) ? incoming : []) {
    const normalized = sanitizeImportedQualityEntry(entry);
    if (normalized) byId.set(normalized.id, normalized);
  }

  return Array.from(byId.values())
    .sort((a, b) => b.completedAt - a.completedAt || b.startedAt - a.startedAt || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.round(limit)));
}

export function summarizeGowooriQualityLog(entries: GowooriQualityLogEntry[]): GowooriQualitySummary {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const providers = new Map<string, GowooriQualityProviderSummary & { durationTotal: number; sourceTotal: number }>();
  const summary: GowooriQualitySummary = {
    total: normalizedEntries.length,
    stable: 0,
    repaired: 0,
    blocked: 0,
    applyRequested: 0,
    applied: 0,
    applyRequestRate: 0,
    providers: [],
  };

  for (const entry of normalizedEntries) {
    summary[entry.status] += 1;
    if (entry.applyRequested) summary.applyRequested += 1;
    if (entry.applied) summary.applied += 1;

    const provider = entry.provider || 'unknown';
    const providerSummary = providers.get(provider) ?? {
      provider,
      total: 0,
      stable: 0,
      repaired: 0,
      blocked: 0,
      applyRequested: 0,
      applied: 0,
      averageDurationMs: 0,
      averageSourceChars: 0,
      applyRequestRate: 0,
      durationTotal: 0,
      sourceTotal: 0,
    };
    providerSummary.total += 1;
    providerSummary[entry.status] += 1;
    if (entry.applyRequested) providerSummary.applyRequested += 1;
    if (entry.applied) providerSummary.applied += 1;
    providerSummary.durationTotal += entry.durationMs;
    providerSummary.sourceTotal += entry.sourceChars;
    providers.set(provider, providerSummary);
  }

  summary.providers = Array.from(providers.values())
    .map((item) => ({
      provider: item.provider,
      total: item.total,
      stable: item.stable,
      repaired: item.repaired,
      blocked: item.blocked,
      applyRequested: item.applyRequested,
      applied: item.applied,
      averageDurationMs: Math.round(item.total > 0 ? item.durationTotal / item.total : 0),
      averageSourceChars: Math.round(item.total > 0 ? item.sourceTotal / item.total : 0),
      applyRequestRate: toRate(item.applyRequested, item.total),
    }))
    .sort((a, b) => b.total - a.total || a.provider.localeCompare(b.provider));

  summary.applyRequestRate = toRate(summary.applyRequested, summary.total);

  return summary;
}

export function createGowooriProviderCaseMatrix(
  entries: GowooriQualityLogEntry[],
  providerOrder: string[] = [],
): GowooriProviderBenchmarkCaseItem[] {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const providers = new Set<string>();
  const latestByCaseProvider = new Map<string, GowooriQualityLogEntry>();
  const cases = new Map<string, { title: string; latestCompletedAt: number }>();

  for (const provider of providerOrder) {
    const providerLabel = normalizeQualityLabel(provider, '');
    if (providerLabel) providers.add(providerLabel);
  }

  for (const entry of normalizedEntries) {
    const provider = normalizeQualityLabel(entry.provider, 'unknown');
    const caseTitle = normalizeQualityLabel(entry.promptTitle, 'Untitled request');
    providers.add(provider);

    const caseSummary = cases.get(caseTitle) ?? { title: caseTitle, latestCompletedAt: 0 };
    caseSummary.latestCompletedAt = Math.max(caseSummary.latestCompletedAt, normalizeTimestamp(entry.completedAt));
    cases.set(caseTitle, caseSummary);

    const key = `${caseTitle}\n${provider}`;
    const current = latestByCaseProvider.get(key);
    if (
      !current ||
      normalizeTimestamp(entry.completedAt) > normalizeTimestamp(current.completedAt) ||
      (normalizeTimestamp(entry.completedAt) === normalizeTimestamp(current.completedAt) &&
        normalizeTimestamp(entry.startedAt) > normalizeTimestamp(current.startedAt))
    ) {
      latestByCaseProvider.set(key, entry);
    }
  }

  const providerLabels = Array.from(providers).sort((a, b) => {
    const aIndex = providerOrder.indexOf(a);
    const bIndex = providerOrder.indexOf(b);
    if (aIndex >= 0 || bIndex >= 0) {
      return (aIndex >= 0 ? aIndex : Number.MAX_SAFE_INTEGER) - (bIndex >= 0 ? bIndex : Number.MAX_SAFE_INTEGER);
    }
    return a.localeCompare(b);
  });

  return Array.from(cases.values())
    .sort((a, b) => b.latestCompletedAt - a.latestCompletedAt || a.title.localeCompare(b.title))
    .map((testCase, index) => {
      const caseId = slugQualityLabel(testCase.title, `case-${index + 1}`);
      const providerCells = providerLabels.map((provider) => {
        const entry = latestByCaseProvider.get(`${testCase.title}\n${provider}`);
        return entry ? createBenchmarkCaseCell(provider, entry) : createMissingBenchmarkCaseCell(provider);
      });
      const total = providerCells.filter((item) => item.status !== 'missing').length;
      const success = providerCells.filter((item) => item.status !== 'missing' && item.success).length;

      return {
        caseId,
        caseTitle: testCase.title,
        total,
        success,
        successRate: toRate(success, total),
        providers: providerCells,
      };
    });
}

export function createGowooriProviderBenchmark(entries: GowooriQualityLogEntry[]): GowooriProviderBenchmarkReport {
  const normalizedEntries = Array.isArray(entries) ? entries : [];
  const providers = new Map<
    string,
    {
      provider: string;
      entries: GowooriQualityLogEntry[];
      durationTotal: number;
      sourceTotal: number;
    }
  >();

  for (const entry of normalizedEntries) {
    const provider = entry.provider || 'unknown';
    const bucket = providers.get(provider) ?? {
      provider,
      entries: [],
      durationTotal: 0,
      sourceTotal: 0,
    };
    bucket.entries.push(entry);
    bucket.durationTotal += entry.durationMs;
    bucket.sourceTotal += entry.sourceChars;
    providers.set(provider, bucket);
  }

  const providerBenchmarks = Array.from(providers.values())
    .map((bucket) => {
      const total = bucket.entries.length;
      const stable = bucket.entries.filter((entry) => entry.status === 'stable').length;
      const repaired = bucket.entries.filter((entry) => entry.status === 'repaired').length;
      const blocked = bucket.entries.filter((entry) => entry.status === 'blocked').length;
      const applyRequested = bucket.entries.filter((entry) => entry.applyRequested).length;
      const applied = bucket.entries.filter((entry) => entry.applied).length;
      const success = stable + repaired;

      return {
        provider: bucket.provider,
        total,
        success,
        stable,
        repaired,
        blocked,
        applyRequested,
        applied,
        successRate: toRate(success, total),
        stableRate: toRate(stable, total),
        repairRate: toRate(repaired, total),
        blockRate: toRate(blocked, total),
        applyRate: toRate(applied, total),
        applyRequestRate: toRate(applyRequested, total),
        averageDurationMs: Math.round(total > 0 ? bucket.durationTotal / total : 0),
        averageSourceChars: Math.round(total > 0 ? bucket.sourceTotal / total : 0),
        topDiagnostics: createTopDiagnostics(bucket.entries),
      };
    })
    .sort(compareProviderBenchmark);

  return {
    total: normalizedEntries.length,
    bestProvider: providerBenchmarks[0]?.provider,
    providers: providerBenchmarks,
    caseMatrix: createGowooriProviderCaseMatrix(
      normalizedEntries,
      providerBenchmarks.map((item) => item.provider),
    ),
    topDiagnostics: createTopDiagnostics(normalizedEntries),
  };
}

export function createGowooriProviderScorecard(
  benchmark: GowooriProviderBenchmarkReport,
): GowooriProviderScorecardReport {
  const report = sanitizeBenchmarkReport(benchmark);
  const fastestAverageDuration = report.providers
    .filter((item) => item.averageDurationMs > 0)
    .reduce((min, item) => Math.min(min, item.averageDurationMs), Number.POSITIVE_INFINITY);
  const durationBaseline = Number.isFinite(fastestAverageDuration) ? fastestAverageDuration : 0;

  const providers = report.providers
    .map((item) => {
      const repairDependencyRate = item.success > 0 ? toRate(item.repaired, item.success) : 0;
      const durationPenalty =
        durationBaseline > 0 && item.averageDurationMs > durationBaseline
          ? Math.min(12, Math.round(((item.averageDurationMs - durationBaseline) / durationBaseline) * 6))
          : 0;
      const score = clampScore(
        Math.round(
          item.successRate * 0.42 +
            item.stableRate * 0.36 +
            (100 - item.blockRate) * 0.16 -
            repairDependencyRate * 0.18 -
            durationPenalty,
        ),
      );
      const recommendation = resolveProviderRecommendation(item, repairDependencyRate);
      return {
        provider: item.provider,
        rank: 0,
        total: item.total,
        score,
        recommendation,
        successRate: item.successRate,
        stableFirstRate: item.stableRate,
        repairDependencyRate,
        blockRate: item.blockRate,
        averageDurationMs: item.averageDurationMs,
        reason: createProviderScoreReason(item, recommendation, repairDependencyRate),
        topDiagnostics: item.topDiagnostics,
      };
    })
    .sort(compareProviderScorecardItem)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return {
    total: report.total,
    recommendedProvider: providers.find((item) => item.recommendation === 'recommended')?.provider,
    providers,
    recommended: providers.filter((item) => item.recommendation === 'recommended'),
    watch: providers.filter((item) => item.recommendation === 'watch'),
    risk: providers.filter((item) => item.recommendation === 'risk'),
  };
}

export function createGowooriProviderHealthDashboard(
  entries: GowooriQualityLogEntry[],
  options: GowooriProviderHealthDashboardOptions = {},
): GowooriProviderHealthDashboard {
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => sanitizeImportedQualityEntry(entry))
    .filter((entry): entry is GowooriQualityLogEntry => entry !== null)
    .sort((a, b) => a.completedAt - b.completedAt || a.startedAt - b.startedAt || a.id.localeCompare(b.id));
  const trendWindow = Math.max(1, Math.round(options.trendWindow ?? 5));
  const diagnosticsLimit = Math.max(1, Math.round(options.diagnosticsLimit ?? 5));
  const recentEntries = normalizedEntries.slice(-trendWindow);
  const previousEntries = normalizedEntries.slice(
    Math.max(0, normalizedEntries.length - trendWindow * 2),
    Math.max(0, normalizedEntries.length - trendWindow),
  );
  const recentSuccessRate = getSuccessRate(recentEntries);
  const previousSuccessRate = getSuccessRate(previousEntries);
  const trendDelta =
    recentEntries.length > 0 && previousEntries.length > 0 ? recentSuccessRate - previousSuccessRate : 0;

  const providers = new Map<
    string,
    {
      provider: string;
      entries: GowooriQualityLogEntry[];
      recentEntries: GowooriQualityLogEntry[];
      durationTotal: number;
      lastCompletedAt: number;
    }
  >();

  for (const entry of normalizedEntries) {
    const provider = entry.provider || 'unknown';
    const bucket = providers.get(provider) ?? {
      provider,
      entries: [],
      recentEntries: [],
      durationTotal: 0,
      lastCompletedAt: 0,
    };
    bucket.entries.push(entry);
    bucket.durationTotal += entry.durationMs;
    bucket.lastCompletedAt = Math.max(bucket.lastCompletedAt, entry.completedAt);
    providers.set(provider, bucket);
  }

  for (const bucket of providers.values()) {
    bucket.recentEntries = bucket.entries.slice(-trendWindow);
  }

  const providerHealth = Array.from(providers.values())
    .map((bucket) => {
      const total = bucket.entries.length;
      const stable = bucket.entries.filter((entry) => entry.status === 'stable').length;
      const repaired = bucket.entries.filter((entry) => entry.status === 'repaired').length;
      const blocked = bucket.entries.filter((entry) => entry.status === 'blocked').length;
      const applyRequested = bucket.entries.filter((entry) => entry.applyRequested).length;
      const applied = bucket.entries.filter((entry) => entry.applied).length;
      const success = stable + repaired;
      const repairAttempted = bucket.entries.filter((entry) => entry.autoRepairAttempted).length;
      const repairSucceeded = bucket.entries.filter(
        (entry) => entry.autoRepairAttempted && entry.autoRepairSucceeded,
      ).length;
      const successRate = toRate(success, total);
      const repairSuccessRate = toRate(repairSucceeded, repairAttempted);

      return {
        provider: bucket.provider,
        total,
        success,
        stable,
        repaired,
        blocked,
        applyRequested,
        applied,
        applyRequestRate: toRate(applyRequested, total),
        successRate,
        recentSuccessRate: getSuccessRate(bucket.recentEntries),
        repairAttempted,
        repairSucceeded,
        repairSuccessRate,
        averageDurationMs: Math.round(total > 0 ? bucket.durationTotal / total : 0),
        lastCompletedAt: bucket.lastCompletedAt,
        health: resolveProviderHealth(successRate, toRate(blocked, total), repairSuccessRate),
        topDiagnostics: createTopDiagnostics(bucket.entries, diagnosticsLimit),
      };
    })
    .sort(compareProviderHealth);

  return {
    total: normalizedEntries.length,
    recent: {
      total: recentEntries.length,
      success: recentEntries.filter(isSuccessfulQualityEntry).length,
      successRate: recentSuccessRate,
      previousSuccessRate,
      trendDelta,
      trendDirection: resolveTrendDirection(trendDelta),
    },
    providers: providerHealth,
    topDiagnostics: createTopDiagnostics(normalizedEntries, diagnosticsLimit),
  };
}

export function createGowooriProviderReadinessReport(
  entries: GowooriQualityLogEntry[],
  providerIds: string[] = [],
): GowooriProviderReadinessReport {
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => sanitizeImportedQualityEntry(entry))
    .filter((entry): entry is GowooriQualityLogEntry => entry !== null)
    .filter((entry) => entry.mode === 'settings-test')
    .sort((a, b) => b.completedAt - a.completedAt || b.startedAt - a.startedAt || a.id.localeCompare(b.id));

  const providerSet = new Set<string>();
  for (const providerId of providerIds) {
    const normalized = normalizeQualityLabel(providerId, '');
    if (normalized) providerSet.add(normalized);
  }
  for (const entry of normalizedEntries) {
    providerSet.add(entry.provider || 'unknown');
  }

  const providers = Array.from(providerSet)
    .sort((a, b) => a.localeCompare(b))
    .map((provider) => {
      const latestEntry = normalizedEntries.find((entry) => entry.provider === provider) ?? null;
      const state: GowooriProviderReadinessState = latestEntry
        ? latestEntry.preflightOk
          ? 'ready'
          : 'blocked'
        : 'unknown';
      const diagnosticSummary =
        latestEntry?.diagnosticMessages
          .slice(0, 2)
          .map((diagnostic) => `${diagnostic.severity}: ${diagnostic.message}`)
          .join(' | ') || undefined;
      return {
        provider,
        state,
        latestEntry,
        latestCompletedAt: latestEntry?.completedAt ?? 0,
        summary:
          latestEntry?.summary ||
          (latestEntry
            ? latestEntry.preflightOk
              ? 'Provider smoke passed.'
              : 'Provider smoke is blocked.'
            : 'Run Preflight to verify this provider.'),
        diagnosticSummary,
      };
    });

  return {
    total: providers.length,
    ready: providers.filter((item) => item.state === 'ready').length,
    blocked: providers.filter((item) => item.state === 'blocked').length,
    unknown: providers.filter((item) => item.state === 'unknown').length,
    latestCompletedAt: providers.reduce((latest, item) => Math.max(latest, item.latestCompletedAt), 0),
    providers: providers.sort(compareProviderReadinessItem),
  };
}

export function createGowooriProviderTimeline(
  entries: GowooriQualityLogEntry[],
  limit = 24,
): GowooriProviderTimelineReport {
  const selectedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry) => sanitizeImportedQualityEntry(entry))
    .filter((entry): entry is GowooriQualityLogEntry => entry !== null)
    .sort((a, b) => b.completedAt - a.completedAt || b.startedAt - a.startedAt || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.round(limit)))
    .reverse();

  const providerBuckets = new Map<
    string,
    {
      provider: string;
      entries: GowooriQualityLogEntry[];
      durationTotal: number;
      latestCompletedAt: number;
      applyRequested: number;
    }
  >();

  const points = selectedEntries.map((entry) => {
    const provider = entry.provider || 'unknown';
    const bucket = providerBuckets.get(provider) ?? {
      provider,
      entries: [],
      durationTotal: 0,
      latestCompletedAt: 0,
      applyRequested: 0,
    };
    bucket.entries.push(entry);
    bucket.durationTotal += entry.durationMs;
    bucket.latestCompletedAt = Math.max(bucket.latestCompletedAt, entry.completedAt);
    if (entry.applyRequested) bucket.applyRequested += 1;
    providerBuckets.set(provider, bucket);

    const diagnosticSummary =
      entry.diagnosticMessages.map((diagnostic) => `${diagnostic.severity}: ${diagnostic.message}`).join(' | ') ||
      undefined;

    return {
      id: entry.id,
      provider,
      mode: entry.mode,
      promptTitle: entry.promptTitle,
      completedAt: entry.completedAt,
      durationMs: entry.durationMs,
      sourceChars: entry.sourceChars,
      status: entry.status,
      success: entry.status !== 'blocked',
      applyRequested: entry.applyRequested,
      applied: entry.applied,
      diagnosticsCount: entry.diagnosticsCount,
      diagnosticSummary,
    };
  });

  const providers = Array.from(providerBuckets.values())
    .map((bucket) => {
      const total = bucket.entries.length;
      return {
        provider: bucket.provider,
        total,
        stable: bucket.entries.filter((entry) => entry.status === 'stable').length,
        repaired: bucket.entries.filter((entry) => entry.status === 'repaired').length,
        blocked: bucket.entries.filter((entry) => entry.status === 'blocked').length,
        applyRequested: bucket.applyRequested,
        applied: bucket.entries.filter((entry) => entry.applied).length,
        applyRequestRate: toRate(bucket.applyRequested, total),
        averageDurationMs: Math.round(total > 0 ? bucket.durationTotal / total : 0),
        latestCompletedAt: bucket.latestCompletedAt,
      };
    })
    .sort((a, b) => a.latestCompletedAt - b.latestCompletedAt || a.provider.localeCompare(b.provider));

  return {
    total: points.length,
    providers,
    points,
  };
}

export function exportGowooriProviderBenchmarkJson(
  benchmark: GowooriProviderBenchmarkReport,
  exportedAt = new Date().toISOString(),
): string {
  const payload: GowooriProviderBenchmarkExport = {
    schema: GOWOORI_PROVIDER_BENCHMARK_SCHEMA,
    exportedAt,
    benchmark: sanitizeBenchmarkReport(benchmark),
  };
  return JSON.stringify(payload, null, 2);
}

export function importGowooriProviderBenchmark(raw: string): GowooriProviderBenchmarkImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { benchmark: null, dropped: 1, error: 'Invalid benchmark JSON.' };
  }

  const benchmarkCandidate =
    isRecord(parsed) && parsed.schema === GOWOORI_PROVIDER_BENCHMARK_SCHEMA ? parsed.benchmark : parsed;
  if (!isRecord(benchmarkCandidate) || !Array.isArray(benchmarkCandidate.providers)) {
    return { benchmark: null, dropped: 1, error: 'JSON does not contain a Gowoori provider benchmark.' };
  }

  const benchmark = sanitizeBenchmarkReport(benchmarkCandidate as unknown as GowooriProviderBenchmarkReport);
  if (benchmark.providers.length === 0) {
    return { benchmark: null, dropped: 1, error: 'Benchmark contains no provider rows.' };
  }

  return { benchmark, dropped: 0 };
}

export function exportGowooriProviderBenchmarkCsv(benchmark: GowooriProviderBenchmarkReport): string {
  const report = sanitizeBenchmarkReport(benchmark);
  const providerHeader = [
    'provider',
    'total',
    'success',
    'stable',
    'repaired',
    'blocked',
    'applyRequested',
    'applied',
    'successRate',
    'stableRate',
    'repairRate',
    'blockRate',
    'applyRate',
    'applyRequestRate',
    'averageDurationMs',
    'averageSourceChars',
    'topDiagnostics',
  ];
  const providerRows = report.providers.map((item) => [
    item.provider,
    item.total,
    item.success,
    item.stable,
    item.repaired,
    item.blocked,
    item.applyRequested,
    item.applied,
    item.successRate,
    item.stableRate,
    item.repairRate,
    item.blockRate,
    item.applyRate,
    item.applyRequestRate,
    item.averageDurationMs,
    item.averageSourceChars,
    item.topDiagnostics.map((diagnostic) => `${diagnostic.severity}: ${diagnostic.message}`).join(' | '),
  ]);
  const benchmarkCaseCsvHeader =
    'caseId,caseTitle,provider,status,success,applyRequested,diagnosticsCount,durationMs,sourceChars,completedAt,entryId,warningCount,errorCount,repaired,applied,failureReason,applyState,repairDiagnosticsDelta,diagnosticSummary,artifactPreview,summary';
  const caseRows = report.caseMatrix.flatMap((testCase) =>
    testCase.providers.map((cell) => [
      testCase.caseId,
      testCase.caseTitle,
      cell.provider,
      cell.status,
      cell.success,
      cell.applyRequested,
      cell.diagnosticsCount,
      cell.durationMs,
      cell.sourceChars,
      cell.completedAt ?? '',
      cell.entryId ?? '',
      cell.warningCount,
      cell.errorCount,
      cell.repaired,
      cell.applied,
      cell.failureReason,
      cell.applyState,
      cell.repairDiagnosticsDelta,
      cell.diagnosticSummary ?? '',
      cell.artifactPreview ?? '',
      cell.summary ?? '',
    ]),
  );

  const providerCsv = [providerHeader, ...providerRows].map((row) => row.map(csvCell).join(',')).join('\n');
  const caseCsv = [benchmarkCaseCsvHeader, ...caseRows.map((row) => row.map(csvCell).join(','))].join('\n');

  return [providerCsv, caseCsv].filter(Boolean).join('\n\n');
}

export function createGowooriProviderBenchmarkComparison(
  current: GowooriProviderBenchmarkReport,
  baseline: GowooriProviderBenchmarkReport,
): GowooriProviderBenchmarkComparisonReport {
  const currentReport = sanitizeBenchmarkReport(current);
  const baselineReport = sanitizeBenchmarkReport(baseline);
  const currentProviderMap = new Map(currentReport.providers.map((item) => [item.provider, item]));
  const baselineProviderMap = new Map(baselineReport.providers.map((item) => [item.provider, item]));
  const providers = Array.from(
    new Set([
      ...baselineReport.providers.map((item) => item.provider),
      ...currentReport.providers.map((item) => item.provider),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const providerDeltas = providers
    .map((providerName) => {
      const currentItem = currentProviderMap.get(providerName);
      const baselineItem = baselineProviderMap.get(providerName);
      const successRateDelta = (currentItem?.successRate ?? 0) - (baselineItem?.successRate ?? 0);
      const blockRateDelta = (currentItem?.blockRate ?? 0) - (baselineItem?.blockRate ?? 0);
      return {
        provider: providerName,
        currentTotal: currentItem?.total ?? 0,
        baselineTotal: baselineItem?.total ?? 0,
        totalDelta: (currentItem?.total ?? 0) - (baselineItem?.total ?? 0),
        currentSuccessRate: currentItem?.successRate ?? 0,
        baselineSuccessRate: baselineItem?.successRate ?? 0,
        successRateDelta,
        currentBlockRate: currentItem?.blockRate ?? 0,
        baselineBlockRate: baselineItem?.blockRate ?? 0,
        blockRateDelta,
        averageDurationMsDelta: (currentItem?.averageDurationMs ?? 0) - (baselineItem?.averageDurationMs ?? 0),
        trend: resolveBenchmarkTrend(
          currentItem !== undefined,
          baselineItem !== undefined,
          successRateDelta,
          -blockRateDelta,
        ),
      };
    })
    .sort(
      (a, b) =>
        compareBenchmarkTrend(a.trend, b.trend) ||
        b.successRateDelta - a.successRateDelta ||
        a.provider.localeCompare(b.provider),
    );

  const currentCaseMap = createBenchmarkCaseCellMap(currentReport);
  const baselineCaseMap = createBenchmarkCaseCellMap(baselineReport);
  const caseKeys = Array.from(new Set([...baselineCaseMap.keys(), ...currentCaseMap.keys()])).sort((a, b) =>
    a.localeCompare(b),
  );
  const caseDeltas = caseKeys
    .map((key) => {
      const currentItem = currentCaseMap.get(key);
      const baselineItem = baselineCaseMap.get(key);
      const [caseId, providerName] = key.split('\n');
      const caseTitle = currentItem?.caseTitle ?? baselineItem?.caseTitle ?? caseId;
      const currentCell = currentItem?.cell ?? createMissingBenchmarkCaseCell(providerName || 'unknown');
      const baselineCell = baselineItem?.cell ?? createMissingBenchmarkCaseCell(providerName || 'unknown');
      const diagnosticsDelta = currentCell.diagnosticsCount - baselineCell.diagnosticsCount;
      const successScoreDelta = Number(currentCell.success) - Number(baselineCell.success);

      return {
        caseId,
        caseTitle,
        provider: providerName || currentCell.provider || baselineCell.provider,
        currentStatus: currentCell.status,
        baselineStatus: baselineCell.status,
        successChanged: currentCell.success !== baselineCell.success,
        diagnosticsDelta,
        durationMsDelta: currentCell.durationMs - baselineCell.durationMs,
        trend: resolveBenchmarkTrend(
          currentItem !== undefined,
          baselineItem !== undefined,
          successScoreDelta,
          -diagnosticsDelta,
        ),
      };
    })
    .sort(
      (a, b) =>
        compareBenchmarkTrend(a.trend, b.trend) ||
        a.caseTitle.localeCompare(b.caseTitle) ||
        a.provider.localeCompare(b.provider),
    );

  return {
    currentTotal: currentReport.total,
    baselineTotal: baselineReport.total,
    providerDeltas,
    caseDeltas,
    improvementCount:
      providerDeltas.filter((item) => item.trend === 'improved').length +
      caseDeltas.filter((item) => item.trend === 'improved').length,
    regressionCount:
      providerDeltas.filter((item) => item.trend === 'regressed').length +
      caseDeltas.filter((item) => item.trend === 'regressed').length,
    newProviderCount: providerDeltas.filter((item) => item.trend === 'new').length,
    removedProviderCount: providerDeltas.filter((item) => item.trend === 'removed').length,
    missingBaselineCount: caseDeltas.filter((item) => item.trend === 'new').length,
  };
}

function sanitizeImportedQualityEntry(input: unknown): GowooriQualityLogEntry | null {
  if (!isRecord(input)) return null;
  const id = normalizeQualityLabel(input.id, '');
  if (!id) return null;

  const startedAt = normalizeTimestamp(input.startedAt);
  const completedAt = normalizeTimestamp(input.completedAt);
  const durationMs = normalizeNonNegativeNumber(input.durationMs, Math.max(0, completedAt - startedAt));
  const diagnosticMessages = normalizeDiagnosticMessages(input.diagnosticMessages);
  const diagnosticsCount =
    diagnosticMessages.length > 0 ? diagnosticMessages.length : normalizeNonNegativeNumber(input.diagnosticsCount, 0);
  const warningCount =
    diagnosticMessages.length > 0
      ? diagnosticMessages.filter((item) => item.severity === 'warning').length
      : normalizeNonNegativeNumber(input.warningCount, 0);
  const errorCount =
    diagnosticMessages.length > 0
      ? diagnosticMessages.filter((item) => item.severity === 'error').length
      : normalizeNonNegativeNumber(input.errorCount, 0);
  const preflightOk = input.preflightOk === true;
  const autoRepairAttempted = input.autoRepairAttempted === true;
  const autoRepairSucceeded = input.autoRepairSucceeded === true;
  const providerError = input.providerError === true;
  const applyRequested = input.applyRequested === true || input.applied === true;
  const applied = applyRequested && preflightOk;
  const repairBeforeDiagnosticsCount = normalizeNonNegativeNumber(
    input.repairBeforeDiagnosticsCount,
    autoRepairAttempted ? diagnosticsCount : 0,
  );
  const repairAfterDiagnosticsCount = normalizeNonNegativeNumber(
    input.repairAfterDiagnosticsCount,
    autoRepairSucceeded ? 0 : repairBeforeDiagnosticsCount,
  );
  const status = isGowooriQualityStatus(input.status)
    ? input.status
    : resolveGowooriQualityStatus(preflightOk, autoRepairAttempted, autoRepairSucceeded);
  const summary = normalizeOptionalText(input.summary);
  const artifactSource = normalizeArtifactSourceForQualityLog(input.artifactSource);

  return {
    id,
    provider: normalizeQualityLabel(input.provider, 'unknown'),
    mode: normalizeQualityLabel(input.mode, 'generate'),
    promptTitle: normalizeQualityLabel(input.promptTitle, 'Untitled request'),
    startedAt,
    completedAt,
    durationMs,
    sourceChars: normalizeNonNegativeNumber(input.sourceChars, artifactSource?.length ?? 0),
    ...(artifactSource ? { artifactSource } : {}),
    normalizedChanged: input.normalizedChanged === true,
    preflightOk,
    autoRepairAttempted,
    autoRepairSucceeded,
    applyRequested,
    applied,
    failureReason: isGowooriQualityFailureReason(input.failureReason)
      ? input.failureReason
      : resolveGowooriQualityFailureReason(preflightOk, providerError, autoRepairAttempted, autoRepairSucceeded),
    applyState: isGowooriQualityApplyState(input.applyState)
      ? applyRequested
        ? input.applyState
        : 'skipped'
      : resolveGowooriQualityApplyState(preflightOk, applyRequested),
    providerError,
    repairBeforeDiagnosticsCount,
    repairAfterDiagnosticsCount,
    repairDiagnosticsDelta: normalizeNonNegativeSignedNumber(
      input.repairDiagnosticsDelta,
      repairAfterDiagnosticsCount - repairBeforeDiagnosticsCount,
    ),
    diagnosticsCount,
    warningCount,
    errorCount,
    diagnosticMessages,
    status,
    ...(summary ? { summary } : {}),
  };
}

function sanitizeBenchmarkReport(input: GowooriProviderBenchmarkReport): GowooriProviderBenchmarkReport {
  const providers = Array.isArray(input?.providers) ? input.providers : [];
  const sanitizedProviders = providers.map((item) => ({
    provider: normalizeQualityLabel(item.provider, 'unknown'),
    total: normalizeNonNegativeNumber(item.total, 0),
    success: normalizeNonNegativeNumber(item.success, 0),
    stable: normalizeNonNegativeNumber(item.stable, 0),
    repaired: normalizeNonNegativeNumber(item.repaired, 0),
    blocked: normalizeNonNegativeNumber(item.blocked, 0),
    applyRequested: normalizeNonNegativeNumber(item.applyRequested, 0),
    applied: normalizeNonNegativeNumber(item.applied, 0),
    successRate: normalizeNonNegativeNumber(item.successRate, 0),
    stableRate: normalizeNonNegativeNumber(item.stableRate, 0),
    repairRate: normalizeNonNegativeNumber(item.repairRate, 0),
    blockRate: normalizeNonNegativeNumber(item.blockRate, 0),
    applyRate: normalizeNonNegativeNumber(item.applyRate, 0),
    applyRequestRate: normalizeNonNegativeNumber(item.applyRequestRate, 0),
    averageDurationMs: normalizeNonNegativeNumber(item.averageDurationMs, 0),
    averageSourceChars: normalizeNonNegativeNumber(item.averageSourceChars, 0),
    topDiagnostics: normalizeDiagnosticSummaries(item.topDiagnostics),
  }));
  const caseMatrix = normalizeBenchmarkCaseMatrix(input?.caseMatrix);

  return {
    total: normalizeNonNegativeNumber(
      input?.total,
      sanitizedProviders.reduce((sum, item) => sum + item.total, 0),
    ),
    bestProvider: normalizeOptionalText(input?.bestProvider),
    providers: sanitizedProviders,
    caseMatrix,
    topDiagnostics: normalizeDiagnosticSummaries(input?.topDiagnostics),
  };
}

function resolveGowooriQualityStatus(
  preflightOk: boolean,
  autoRepairAttempted: boolean,
  autoRepairSucceeded: boolean,
): GowooriQualityStatus {
  if (!preflightOk) return 'blocked';
  if (autoRepairAttempted || autoRepairSucceeded) return 'repaired';
  return 'stable';
}

function resolveGowooriQualityFailureReason(
  preflightOk: boolean,
  providerError: boolean,
  autoRepairAttempted: boolean,
  autoRepairSucceeded: boolean,
): GowooriQualityFailureReason {
  if (preflightOk) return 'none';
  if (providerError) return 'provider-error';
  if (autoRepairAttempted && !autoRepairSucceeded) return 'repair-failed';
  return 'validation-error';
}

function resolveGowooriQualityApplyState(preflightOk: boolean, applyRequested: boolean): GowooriQualityApplyState {
  if (!applyRequested) return 'skipped';
  if (!preflightOk) return 'blocked';
  return 'queued';
}

function normalizeTimestamp(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function normalizeDateTimestamp(value: unknown, fallback: number): number {
  if (typeof value === 'number') return normalizeTimestamp(value);
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : Math.round(fallback);
}

function normalizeQualityLabel(value: unknown, fallback: string): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function slugQualityLabel(value: unknown, fallback: string): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function normalizeOptionalText(value: unknown): string | undefined {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function normalizeArtifactSourceForQualityLog(value: unknown): string | undefined {
  const source = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  return source.trim() ? source : undefined;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : fallback;
}

function normalizeNonNegativeSignedNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeBridgeMatrixDiagnostics(value: unknown, error: unknown): GowooriArtifactRepairDiagnostic[] {
  const messages: string[] = [];
  const addMessage = (candidate: unknown) => {
    const text = String(candidate || '').trim();
    if (!text) return;
    for (const segment of text.split(/\s+\|\s+(?=(?:ERROR|WARNING|WARN|INFO):)/i)) {
      const normalized = segment.trim();
      if (normalized) messages.push(normalized);
    }
  };

  if (Array.isArray(value)) {
    for (const item of value) addMessage(item);
  } else {
    addMessage(value);
  }
  addMessage(error);

  const seen = new Set<string>();
  const diagnostics: GowooriArtifactRepairDiagnostic[] = [];
  for (const item of messages) {
    const parsed = /^(error|warning|warn|info):\s*(.+)$/i.exec(item);
    const severity = parsed
      ? parsed[1].toLowerCase() === 'info'
        ? 'info'
        : parsed[1].toLowerCase() === 'error'
          ? 'error'
          : 'warning'
      : 'error';
    const message = (parsed ? parsed[2] : item).trim();
    if (!message) continue;
    const key = `${severity}\n${message.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    diagnostics.push({ severity, message });
  }
  return diagnostics;
}

function isGowooriQualityStatus(value: unknown): value is GowooriQualityStatus {
  return value === 'stable' || value === 'repaired' || value === 'blocked';
}

function isGowooriQualityFailureReason(value: unknown): value is GowooriQualityFailureReason {
  return value === 'none' || value === 'provider-error' || value === 'validation-error' || value === 'repair-failed';
}

function isGowooriQualityApplyState(value: unknown): value is GowooriQualityApplyState {
  return value === 'queued' || value === 'skipped' || value === 'blocked';
}

function createBenchmarkCaseCell(provider: string, entry: GowooriQualityLogEntry): GowooriProviderBenchmarkCaseCell {
  const diagnosticSummary =
    entry.diagnosticMessages.map((diagnostic) => `${diagnostic.severity}: ${diagnostic.message}`).join(' | ') ||
    undefined;
  const artifactPreview = normalizeArtifactSourceForQualityLog(entry.artifactSource)?.slice(0, 900);

  return {
    provider,
    entryId: entry.id,
    status: entry.status,
    success: isSuccessfulQualityEntry(entry),
    applyRequested: entry.applyRequested,
    diagnosticsCount: entry.diagnosticsCount,
    warningCount: entry.warningCount,
    errorCount: entry.errorCount,
    durationMs: entry.durationMs,
    sourceChars: entry.sourceChars,
    completedAt: entry.completedAt,
    repaired: entry.autoRepairAttempted || entry.autoRepairSucceeded || entry.status === 'repaired',
    applied: entry.applied,
    failureReason: entry.failureReason,
    applyState: entry.applyState,
    repairDiagnosticsDelta: entry.repairDiagnosticsDelta,
    ...(diagnosticSummary ? { diagnosticSummary } : {}),
    ...(artifactPreview ? { artifactPreview } : {}),
    ...(entry.summary ? { summary: entry.summary } : {}),
  };
}

function createMissingBenchmarkCaseCell(provider: string): GowooriProviderBenchmarkCaseCell {
  return {
    provider,
    applyRequested: false,
    status: 'missing',
    success: false,
    diagnosticsCount: 0,
    warningCount: 0,
    errorCount: 0,
    durationMs: 0,
    sourceChars: 0,
    repaired: false,
    applied: false,
    failureReason: 'none',
    applyState: 'skipped',
    repairDiagnosticsDelta: 0,
  };
}

function normalizeBenchmarkCaseMatrix(value: unknown): GowooriProviderBenchmarkCaseItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!isRecord(item)) return null;
      const caseTitle = normalizeQualityLabel(item.caseTitle, `Case ${index + 1}`);
      const providers = Array.isArray(item.providers)
        ? item.providers
            .map(normalizeBenchmarkCaseCell)
            .filter((cell): cell is GowooriProviderBenchmarkCaseCell => cell !== null)
        : [];
      const total = normalizeNonNegativeNumber(
        item.total,
        providers.filter((cell) => cell.status !== 'missing').length,
      );
      const success = normalizeNonNegativeNumber(
        item.success,
        providers.filter((cell) => cell.status !== 'missing' && cell.success).length,
      );

      return {
        caseId: normalizeQualityLabel(item.caseId, slugQualityLabel(caseTitle, `case-${index + 1}`)),
        caseTitle,
        total,
        success,
        successRate: normalizeNonNegativeNumber(item.successRate, toRate(success, total)),
        providers,
      };
    })
    .filter((item): item is GowooriProviderBenchmarkCaseItem => item !== null);
}

function normalizeBenchmarkCaseCell(value: unknown): GowooriProviderBenchmarkCaseCell | null {
  if (!isRecord(value)) return null;
  const status =
    value.status === 'missing' ? 'missing' : isGowooriQualityStatus(value.status) ? value.status : 'missing';
  return {
    provider: normalizeQualityLabel(value.provider, 'unknown'),
    ...(normalizeOptionalText(value.entryId) ? { entryId: normalizeOptionalText(value.entryId) } : {}),
    status,
    success: value.success === true,
    applyRequested: value.applyRequested === true,
    diagnosticsCount: normalizeNonNegativeNumber(value.diagnosticsCount, 0),
    warningCount: normalizeNonNegativeNumber(value.warningCount, 0),
    errorCount: normalizeNonNegativeNumber(value.errorCount, 0),
    durationMs: normalizeNonNegativeNumber(value.durationMs, 0),
    sourceChars: normalizeNonNegativeNumber(value.sourceChars, 0),
    ...(normalizeNonNegativeNumber(value.completedAt, 0) > 0
      ? { completedAt: normalizeNonNegativeNumber(value.completedAt, 0) }
      : {}),
    repaired: value.repaired === true,
    applied: value.applied === true,
    failureReason: isGowooriQualityFailureReason(value.failureReason) ? value.failureReason : 'none',
    applyState: isGowooriQualityApplyState(value.applyState)
      ? value.applyState
      : value.applied === true
        ? 'queued'
        : 'skipped',
    repairDiagnosticsDelta: normalizeNonNegativeSignedNumber(value.repairDiagnosticsDelta, 0),
    ...(normalizeOptionalText(value.diagnosticSummary)
      ? { diagnosticSummary: normalizeOptionalText(value.diagnosticSummary) }
      : {}),
    ...(normalizeOptionalText(value.artifactPreview)
      ? { artifactPreview: normalizeOptionalText(value.artifactPreview) }
      : {}),
    ...(normalizeOptionalText(value.summary) ? { summary: normalizeOptionalText(value.summary) } : {}),
  };
}

function normalizeDiagnosticMessages(value: unknown): GowooriQualityDiagnosticItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const message = normalizeOptionalText(item.message);
      if (!message) return null;
      return {
        severity: normalizeDiagnosticSeverity(item.severity),
        message,
      };
    })
    .filter((item): item is GowooriQualityDiagnosticItem => item !== null);
}

function normalizeDiagnosticSummaries(value: unknown): GowooriQualityDiagnosticSummary[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const message = normalizeOptionalText(item.message);
      if (!message) return null;
      return {
        severity: normalizeDiagnosticSeverity(item.severity),
        message,
        count: normalizeNonNegativeNumber(item.count, 0),
        providers: Array.isArray(item.providers)
          ? item.providers
              .map((provider) => normalizeQualityLabel(provider, ''))
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b))
          : [],
      };
    })
    .filter((item): item is GowooriQualityDiagnosticSummary => item !== null);
}

function normalizeDiagnosticSeverity(value: unknown): GowooriArtifactRepairDiagnostic['severity'] {
  if (value === 'error' || value === 'warning' || value === 'info') return value;
  return 'info';
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function toRate(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function compareProviderBenchmark(a: GowooriProviderBenchmarkItem, b: GowooriProviderBenchmarkItem): number {
  return (
    b.successRate - a.successRate ||
    b.stableRate - a.stableRate ||
    a.blockRate - b.blockRate ||
    a.repairRate - b.repairRate ||
    a.averageDurationMs - b.averageDurationMs ||
    a.provider.localeCompare(b.provider)
  );
}

function createBenchmarkCaseCellMap(report: GowooriProviderBenchmarkReport): Map<
  string,
  {
    caseTitle: string;
    cell: GowooriProviderBenchmarkCaseCell;
  }
> {
  const cells = new Map<string, { caseTitle: string; cell: GowooriProviderBenchmarkCaseCell }>();
  for (const testCase of report.caseMatrix) {
    for (const cell of testCase.providers) {
      if (cell.status === 'missing') continue;
      cells.set(`${testCase.caseId}\n${cell.provider}`, {
        caseTitle: testCase.caseTitle,
        cell,
      });
    }
  }
  return cells;
}

function resolveBenchmarkTrend(
  hasCurrent: boolean,
  hasBaseline: boolean,
  primaryDelta: number,
  secondaryDelta: number,
): GowooriProviderBenchmarkProviderDelta['trend'] {
  if (hasCurrent && !hasBaseline) return 'new';
  if (!hasCurrent && hasBaseline) return 'removed';
  if (primaryDelta > 0 || (primaryDelta === 0 && secondaryDelta > 0)) return 'improved';
  if (primaryDelta < 0 || (primaryDelta === 0 && secondaryDelta < 0)) return 'regressed';
  return 'flat';
}

function compareBenchmarkTrend(
  a: GowooriProviderBenchmarkProviderDelta['trend'],
  b: GowooriProviderBenchmarkProviderDelta['trend'],
): number {
  const rank: Record<GowooriProviderBenchmarkProviderDelta['trend'], number> = {
    regressed: 0,
    removed: 1,
    new: 2,
    improved: 3,
    flat: 4,
  };
  return rank[a] - rank[b];
}

function compareProviderHealth(a: GowooriProviderHealthItem, b: GowooriProviderHealthItem): number {
  const healthRank: Record<GowooriProviderHealthLevel, number> = {
    good: 0,
    watch: 1,
    risk: 2,
  };
  return (
    healthRank[a.health] - healthRank[b.health] ||
    b.recentSuccessRate - a.recentSuccessRate ||
    b.successRate - a.successRate ||
    a.averageDurationMs - b.averageDurationMs ||
    a.provider.localeCompare(b.provider)
  );
}

function compareProviderReadinessItem(a: GowooriProviderReadinessItem, b: GowooriProviderReadinessItem): number {
  const stateRank: Record<GowooriProviderReadinessState, number> = {
    ready: 0,
    blocked: 1,
    unknown: 2,
  };
  return (
    stateRank[a.state] - stateRank[b.state] ||
    b.latestCompletedAt - a.latestCompletedAt ||
    a.provider.localeCompare(b.provider)
  );
}

function compareProviderScorecardItem(a: GowooriProviderScorecardItem, b: GowooriProviderScorecardItem): number {
  const recommendationRank: Record<GowooriProviderRecommendation, number> = {
    recommended: 0,
    watch: 1,
    risk: 2,
  };
  return (
    recommendationRank[a.recommendation] - recommendationRank[b.recommendation] ||
    b.score - a.score ||
    b.stableFirstRate - a.stableFirstRate ||
    b.successRate - a.successRate ||
    a.blockRate - b.blockRate ||
    a.repairDependencyRate - b.repairDependencyRate ||
    a.averageDurationMs - b.averageDurationMs ||
    a.provider.localeCompare(b.provider)
  );
}

function resolveProviderRecommendation(
  item: GowooriProviderBenchmarkItem,
  repairDependencyRate: number,
): GowooriProviderRecommendation {
  if (item.total === 0 || item.blockRate >= 50 || item.successRate < 60) return 'risk';
  if (item.successRate >= 90 && item.stableRate >= 70 && item.blockRate <= 10 && repairDependencyRate <= 30) {
    return 'recommended';
  }
  return 'watch';
}

function createProviderScoreReason(
  item: GowooriProviderBenchmarkItem,
  recommendation: GowooriProviderRecommendation,
  repairDependencyRate: number,
): string {
  if (recommendation === 'recommended') {
    return `${item.successRate}% success with ${item.stableRate}% stable-first output and ${item.blockRate}% blocked.`;
  }
  if (recommendation === 'risk') {
    const causes = [];
    if (item.blockRate >= 50) causes.push(`${item.blockRate}% blocked`);
    if (item.successRate < 60) causes.push(`${item.successRate}% success`);
    if (causes.length === 0) causes.push('insufficient successful runs');
    return `Risk: ${causes.join(', ')}.`;
  }
  const causes = [];
  if (repairDependencyRate > 30) causes.push(`${repairDependencyRate}% repair dependency`);
  if (item.stableRate < 70) causes.push(`${item.stableRate}% stable-first output`);
  if (item.blockRate > 10) causes.push(`${item.blockRate}% blocked`);
  if (causes.length === 0) causes.push('usable but not enough stable-first evidence yet');
  return `Watch: ${causes.join(', ')}.`;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getSuccessRate(entries: GowooriQualityLogEntry[]): number {
  return toRate(entries.filter(isSuccessfulQualityEntry).length, entries.length);
}

function isSuccessfulQualityEntry(entry: GowooriQualityLogEntry): boolean {
  return entry.status !== 'blocked';
}

function resolveProviderHealth(
  successRate: number,
  blockRate: number,
  repairSuccessRate: number,
): GowooriProviderHealthLevel {
  if (successRate >= 90 && blockRate <= 10) return 'good';
  if (successRate >= 60 || repairSuccessRate >= 50) return 'watch';
  return 'risk';
}

function resolveTrendDirection(delta: number): GowooriProviderTrendDirection {
  if (delta >= 20) return 'up';
  if (delta <= -20) return 'down';
  return 'flat';
}

function createTopDiagnostics(entries: GowooriQualityLogEntry[], limit = 5): GowooriQualityDiagnosticSummary[] {
  const byMessage = new Map<string, GowooriQualityDiagnosticSummary>();
  for (const entry of entries) {
    for (const diagnostic of entry.diagnosticMessages) {
      const key = `${diagnostic.severity}\n${diagnostic.message}`;
      const summary = byMessage.get(key) ?? {
        severity: diagnostic.severity,
        message: diagnostic.message,
        count: 0,
        providers: [],
      };
      summary.count += 1;
      if (!summary.providers.includes(entry.provider)) {
        summary.providers.push(entry.provider);
      }
      byMessage.set(key, summary);
    }
  }

  return Array.from(byMessage.values())
    .map((item) => ({
      ...item,
      providers: [...item.providers].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.count - a.count || a.severity.localeCompare(b.severity) || a.message.localeCompare(b.message))
    .slice(0, limit);
}
