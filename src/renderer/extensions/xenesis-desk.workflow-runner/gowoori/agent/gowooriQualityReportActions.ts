import {
  createGowooriProviderScorecard,
  type GowooriProviderBenchmarkCaseItem,
  type GowooriProviderBenchmarkReport,
  type GowooriProviderScorecardReport,
  type GowooriQualityLogEntry,
  importGowooriProviderBenchmark,
  importGowooriQualityLog,
} from './gowooriQualityLog';

export interface GowooriQualityFilterSummary {
  provider: string;
  mode: string;
  caseTitle: string;
  visible: number;
  total: number;
  stable: number;
  repaired: number;
  blocked: number;
  applied: number;
  errors: number;
  warnings: number;
}

export interface GowooriQualityReportPackageImport {
  entries: GowooriQualityLogEntry[];
  dropped: number;
  selectedEntryId: string;
  provider: string;
  mode: string;
  caseTitle: string;
  benchmark: GowooriProviderBenchmarkReport | null;
  scorecard: GowooriProviderScorecardReport | null;
  caseMatrix: GowooriProviderBenchmarkCaseItem[];
  benchmarkProviders: string[];
}

function formatQualityReportCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

function isGowooriQualityReportRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeQualityPackageFilterValue(value: unknown, allLabels: string[]): string {
  const text = String(value ?? '').trim();
  if (!text) return 'all';
  return allLabels.includes(text.toLowerCase()) ? 'all' : text;
}

function normalizeQualityPackageStringList(value: unknown, fallback: string[] = []): string[] {
  const values = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(values.map((item) => String(item ?? '').trim()).filter(Boolean)));
}

function normalizeQualityPackageScorecard(
  value: unknown,
  fallback: GowooriProviderScorecardReport | null,
): GowooriProviderScorecardReport | null {
  if (isGowooriQualityReportRecord(value) && Array.isArray(value.providers)) {
    return value as unknown as GowooriProviderScorecardReport;
  }
  return fallback;
}

function normalizeQualityPackageCaseMatrix(
  value: unknown,
  fallback: GowooriProviderBenchmarkCaseItem[] = [],
): GowooriProviderBenchmarkCaseItem[] {
  return Array.isArray(value) ? (value as GowooriProviderBenchmarkCaseItem[]) : fallback;
}

export function createFilteredQualityReport(
  qualityFilterSummary: GowooriQualityFilterSummary,
  entries: GowooriQualityLogEntry[],
  selectedEntry: GowooriQualityLogEntry | null,
): string {
  const rows = entries.map((entry) =>
    [
      formatQualityReportCell(entry.provider),
      formatQualityReportCell(entry.mode),
      formatQualityReportCell(entry.promptTitle),
      formatQualityReportCell(entry.status),
      formatQualityReportCell(`${entry.durationMs}ms`),
      formatQualityReportCell(`${entry.errorCount} error / ${entry.warningCount} warning`),
      formatQualityReportCell(entry.failureReason),
    ].join(' | '),
  );

  return [
    '# Gowoori Quality Filtered Report',
    '',
    `- Filter: ${qualityFilterSummary.provider} / ${qualityFilterSummary.mode} / ${qualityFilterSummary.caseTitle}`,
    `- Runs: ${qualityFilterSummary.visible} visible / ${qualityFilterSummary.total} total`,
    `- Status: ${qualityFilterSummary.stable} stable, ${qualityFilterSummary.repaired} repaired, ${qualityFilterSummary.blocked} blocked, ${qualityFilterSummary.applied} applied`,
    `- Diagnostics: ${qualityFilterSummary.errors} error(s), ${qualityFilterSummary.warnings} warning(s)`,
    selectedEntry
      ? `- Selected: ${selectedEntry.provider} / ${selectedEntry.mode} / ${selectedEntry.promptTitle} / ${selectedEntry.status}`
      : '- Selected: none',
    '',
    '| Provider | Mode | Case | Status | Duration | Diagnostics | Failure reason |',
    '| --- | --- | --- | --- | ---: | --- | --- |',
    ...(rows.length > 0 ? rows : ['| - | - | - | - | - | - | No matching runs |']),
  ].join('\n');
}

export function createQualityReportPackage(input: {
  qualityFilterSummary: GowooriQualityFilterSummary;
  entries: GowooriQualityLogEntry[];
  selectedEntry: GowooriQualityLogEntry | null;
  bridgeMatrixSummary: unknown;
  providerBenchmark: GowooriProviderBenchmarkReport;
  providerScorecard?: GowooriProviderScorecardReport;
  providerCaseMatrix?: GowooriProviderBenchmarkCaseItem[];
  benchmarkProviders?: string[];
  caseDiff: Array<{ provider: string; entry: GowooriQualityLogEntry | null }>;
}): string {
  const providerScorecard = input.providerScorecard ?? createGowooriProviderScorecard(input.providerBenchmark);
  const providerCaseMatrix = input.providerCaseMatrix ?? input.providerBenchmark.caseMatrix;
  const benchmarkProviders = normalizeQualityPackageStringList(
    input.benchmarkProviders,
    input.providerBenchmark.providers.map((item) => item.provider),
  );

  return JSON.stringify(
    {
      schema: 'gowoori-quality-report-package/v1',
      generatedAt: new Date().toISOString(),
      filter: input.qualityFilterSummary,
      selectedEntryId: input.selectedEntry?.id ?? null,
      selectedEntry: input.selectedEntry,
      filteredEntries: input.entries,
      bridgeMatrixSummary: input.bridgeMatrixSummary,
      providerBenchmark: input.providerBenchmark,
      providerScorecard,
      providerCaseMatrix,
      benchmarkProviders,
      selectedProviderMatrix: {
        providers: benchmarkProviders,
        cases: providerCaseMatrix,
      },
      caseDiff: input.caseDiff,
    },
    null,
    2,
  );
}

export function parseQualityReportPackage(raw: string): GowooriQualityReportPackageImport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      entries: [],
      dropped: 1,
      selectedEntryId: '',
      provider: 'all',
      mode: 'all',
      caseTitle: 'all',
      benchmark: null,
      scorecard: null,
      caseMatrix: [],
      benchmarkProviders: [],
    };
  }

  if (!isGowooriQualityReportRecord(parsed) || parsed.schema !== 'gowoori-quality-report-package/v1') {
    return {
      entries: [],
      dropped: 1,
      selectedEntryId: '',
      provider: 'all',
      mode: 'all',
      caseTitle: 'all',
      benchmark: null,
      scorecard: null,
      caseMatrix: [],
      benchmarkProviders: [],
    };
  }

  const rawEntries = Array.isArray(parsed.filteredEntries) ? parsed.filteredEntries : [];
  const selectedEntry = isGowooriQualityReportRecord(parsed.selectedEntry) ? parsed.selectedEntry : null;
  const qualityLogImport = importGowooriQualityLog(
    JSON.stringify({
      entries: selectedEntry ? [...rawEntries, selectedEntry] : rawEntries,
    }),
  );
  const entries = Array.from(new Map(qualityLogImport.entries.map((entry) => [entry.id, entry])).values());
  const filter = isGowooriQualityReportRecord(parsed.filter) ? parsed.filter : {};
  const selectedEntryId =
    typeof parsed.selectedEntryId === 'string' && parsed.selectedEntryId.trim()
      ? parsed.selectedEntryId.trim()
      : selectedEntry && typeof selectedEntry.id === 'string'
        ? selectedEntry.id.trim()
        : (entries[0]?.id ?? '');
  const benchmarkResult = importGowooriProviderBenchmark(JSON.stringify(parsed.providerBenchmark ?? null));
  const benchmark = benchmarkResult.benchmark;
  const selectedProviderMatrix = isGowooriQualityReportRecord(parsed.selectedProviderMatrix)
    ? parsed.selectedProviderMatrix
    : {};
  const fallbackScorecard = benchmark ? createGowooriProviderScorecard(benchmark) : null;
  const scorecard = normalizeQualityPackageScorecard(parsed.providerScorecard, fallbackScorecard);
  const caseMatrix = normalizeQualityPackageCaseMatrix(
    parsed.providerCaseMatrix,
    normalizeQualityPackageCaseMatrix(selectedProviderMatrix.cases, benchmark?.caseMatrix ?? []),
  );
  const benchmarkProviders = normalizeQualityPackageStringList(
    parsed.benchmarkProviders,
    normalizeQualityPackageStringList(
      selectedProviderMatrix.providers,
      benchmark?.providers.map((item) => item.provider) ?? [],
    ),
  );

  return {
    entries,
    dropped: qualityLogImport.dropped,
    selectedEntryId,
    provider: normalizeQualityPackageFilterValue(filter.provider, ['all', 'all providers']),
    mode: normalizeQualityPackageFilterValue(filter.mode, ['all', 'all modes']),
    caseTitle: normalizeQualityPackageFilterValue(filter.caseTitle, ['all', 'all cases']),
    benchmark,
    scorecard,
    caseMatrix,
    benchmarkProviders,
  };
}
