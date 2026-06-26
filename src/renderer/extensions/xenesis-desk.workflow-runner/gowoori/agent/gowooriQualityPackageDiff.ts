import type {
  GowooriProviderBenchmarkCaseCell,
  GowooriProviderBenchmarkCaseItem,
  GowooriProviderBenchmarkReport,
  GowooriProviderRecommendation,
  GowooriProviderScorecardReport,
  GowooriQualityLogEntry,
} from './gowooriQualityLog';
import { createGowooriProviderScorecard } from './gowooriQualityLog';

export interface RestoredQualityPackageState {
  name: string;
  importedAt: number;
  entries: GowooriQualityLogEntry[];
  entryIds: string[];
  selectedEntryId: string;
  provider: string;
  mode: string;
  caseTitle: string;
  benchmarkTotal: number;
  benchmarkProviderCount: number;
  scorecard: GowooriProviderScorecardReport | null;
  caseMatrix: GowooriProviderBenchmarkCaseItem[];
  benchmarkProviders: string[];
}

export interface RestoredQualityGroupSummary {
  total: number;
  stable: number;
  repaired: number;
  blocked: number;
  errors: number;
  warnings: number;
}

export interface RestoredQualityGroupDiff extends RestoredQualityGroupSummary {
  key: string;
  label: string;
  baseline: RestoredQualityGroupSummary;
  delta: number;
  stableDelta: number;
  repairedDelta: number;
  blockedDelta: number;
  errorDelta: number;
  warningDelta: number;
}

export interface RestoredQualityStatusDiff {
  status: GowooriQualityLogEntry['status'];
  baseline: number;
  current: number;
  delta: number;
}

export interface RestoredQualityScorecardDiff {
  provider: string;
  packageRank: number;
  currentRank: number;
  rankDelta: number;
  packageScore: number;
  currentScore: number;
  scoreDelta: number;
  packageRecommendation: GowooriProviderRecommendation | 'missing';
  currentRecommendation: GowooriProviderRecommendation | 'missing';
  recommendationChanged: boolean;
}

export interface RestoredQualityMatrixDiff {
  caseTitle: string;
  provider: string;
  packageStatus: GowooriProviderBenchmarkCaseCell['status'];
  currentStatus: GowooriProviderBenchmarkCaseCell['status'];
  packageDiagnostics: number;
  currentDiagnostics: number;
  changed: boolean;
}

export interface RestoredQualityPackageDiff {
  retainedEntries: GowooriQualityLogEntry[];
  missingEntries: GowooriQualityLogEntry[];
  outsideEntries: GowooriQualityLogEntry[];
  providerChanges: RestoredQualityGroupDiff[];
  caseChanges: RestoredQualityGroupDiff[];
  statusChanges: RestoredQualityStatusDiff[];
  scorecardChanges: RestoredQualityScorecardDiff[];
  matrixChanges: RestoredQualityMatrixDiff[];
}

export interface RestoredQualityPackageSummary extends RestoredQualityPackageState {
  retained: number;
  missing: number;
  outsidePackage: number;
  currentDelta: number;
  providerDelta: number;
  packageRecommendedProvider?: string;
  currentRecommendedProvider?: string;
  recommendedProviderChanged: boolean;
  scorecardChangeCount: number;
  matrixChangeCount: number;
}

export interface RestoredQualityArtifactRepairResult {
  id: string;
  provider: string;
  caseTitle: string;
  source: string;
  summary: string;
  createdAt: number;
  prompt: string;
}

export interface RestoredQualityPackageDiffHistoryItem {
  id: string;
  packageState: RestoredQualityPackageState;
  summary: RestoredQualityPackageSummary;
  diff: RestoredQualityPackageDiff;
  report: string;
  drilldownRequest?: RestoredQualityArtifactDrilldownRequest | null;
  repairResult?: RestoredQualityArtifactRepairResult | null;
}

export interface RestoredQualityArtifactDrilldownRequest {
  provider: string;
  caseTitle?: string;
}

export type RestoredQualityArtifactLineDiffStatus = 'same' | 'changed' | 'added' | 'removed';

export interface RestoredQualityArtifactLineDiffLine {
  lineNumber: number;
  packageLineNumber: number | null;
  currentLineNumber: number | null;
  packageText: string;
  currentText: string;
  status: RestoredQualityArtifactLineDiffStatus;
}

export interface RestoredQualityArtifactLineDiff {
  lines: RestoredQualityArtifactLineDiffLine[];
  summary: {
    total: number;
    same: number;
    changed: number;
    added: number;
    removed: number;
  };
}

export interface RestoredQualityArtifactDrilldown {
  provider: string;
  caseTitle: string;
  packageEntry: GowooriQualityLogEntry | null;
  currentEntry: GowooriQualityLogEntry | null;
  packageSource: string;
  currentSource: string;
  artifactLineDiff: RestoredQualityArtifactLineDiff;
  packageStatus: GowooriProviderBenchmarkCaseCell['status'];
  currentStatus: GowooriProviderBenchmarkCaseCell['status'];
  packageDiagnostics: number;
  currentDiagnostics: number;
  hasArtifactComparison: boolean;
}

function formatQualityReportCell(value: unknown): string {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

function createRestoredQualityGroupSummary(): RestoredQualityGroupSummary {
  return {
    total: 0,
    stable: 0,
    repaired: 0,
    blocked: 0,
    errors: 0,
    warnings: 0,
  };
}

function addRestoredQualityEntryToGroup(summary: RestoredQualityGroupSummary, entry: GowooriQualityLogEntry): void {
  summary.total += 1;
  summary.stable += entry.status === 'stable' ? 1 : 0;
  summary.repaired += entry.status === 'repaired' ? 1 : 0;
  summary.blocked += entry.status === 'blocked' ? 1 : 0;
  summary.errors += entry.errorCount;
  summary.warnings += entry.warningCount;
}

function summarizeRestoredQualityGroups(
  entries: GowooriQualityLogEntry[],
  getKey: (entry: GowooriQualityLogEntry) => string,
): Map<string, RestoredQualityGroupSummary> {
  const groups = new Map<string, RestoredQualityGroupSummary>();

  for (const entry of entries) {
    const key = getKey(entry).trim() || 'Unknown';
    const summary = groups.get(key) ?? createRestoredQualityGroupSummary();
    addRestoredQualityEntryToGroup(summary, entry);
    groups.set(key, summary);
  }

  return groups;
}

function createRestoredQualityGroupDiffs(
  baselineEntries: GowooriQualityLogEntry[],
  currentEntries: GowooriQualityLogEntry[],
  getKey: (entry: GowooriQualityLogEntry) => string,
): RestoredQualityGroupDiff[] {
  const baselineGroups = summarizeRestoredQualityGroups(baselineEntries, getKey);
  const currentGroups = summarizeRestoredQualityGroups(currentEntries, getKey);
  const keys = Array.from(new Set([...baselineGroups.keys(), ...currentGroups.keys()])).sort((left, right) =>
    left.localeCompare(right),
  );

  return keys
    .map((key) => {
      const baseline = baselineGroups.get(key) ?? createRestoredQualityGroupSummary();
      const current = currentGroups.get(key) ?? createRestoredQualityGroupSummary();

      return {
        key,
        label: key,
        ...current,
        baseline,
        delta: current.total - baseline.total,
        stableDelta: current.stable - baseline.stable,
        repairedDelta: current.repaired - baseline.repaired,
        blockedDelta: current.blocked - baseline.blocked,
        errorDelta: current.errors - baseline.errors,
        warningDelta: current.warnings - baseline.warnings,
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.delta) - Math.abs(left.delta) ||
        right.total - left.total ||
        left.label.localeCompare(right.label),
    );
}

function createRestoredQualityStatusDiffs(
  baselineEntries: GowooriQualityLogEntry[],
  currentEntries: GowooriQualityLogEntry[],
): RestoredQualityStatusDiff[] {
  const statuses: Array<GowooriQualityLogEntry['status']> = ['stable', 'repaired', 'blocked'];

  return statuses.map((status) => {
    const baseline = baselineEntries.filter((entry) => entry.status === status).length;
    const current = currentEntries.filter((entry) => entry.status === status).length;

    return {
      status,
      baseline,
      current,
      delta: current - baseline,
    };
  });
}

function createRestoredQualityScorecardDiffs(
  packageScorecard: GowooriProviderScorecardReport | null,
  currentBenchmark?: GowooriProviderBenchmarkReport,
): RestoredQualityScorecardDiff[] {
  if (!packageScorecard || !currentBenchmark) return [];
  const currentScorecard = createGowooriProviderScorecard(currentBenchmark);
  const packageByProvider = new Map(packageScorecard.providers.map((item) => [item.provider, item]));
  const currentByProvider = new Map(currentScorecard.providers.map((item) => [item.provider, item]));
  const providers = Array.from(new Set([...packageByProvider.keys(), ...currentByProvider.keys()])).sort(
    (left, right) => left.localeCompare(right),
  );

  return providers
    .map((provider) => {
      const packageItem = packageByProvider.get(provider);
      const currentItem = currentByProvider.get(provider);
      const packageRank = packageItem?.rank ?? 0;
      const currentRank = currentItem?.rank ?? 0;
      const packageScore = packageItem?.score ?? 0;
      const currentScore = currentItem?.score ?? 0;
      const packageRecommendation: GowooriProviderRecommendation | 'missing' = packageItem?.recommendation ?? 'missing';
      const currentRecommendation: GowooriProviderRecommendation | 'missing' = currentItem?.recommendation ?? 'missing';

      return {
        provider,
        packageRank,
        currentRank,
        rankDelta: packageRank > 0 && currentRank > 0 ? packageRank - currentRank : 0,
        packageScore,
        currentScore,
        scoreDelta: currentScore - packageScore,
        packageRecommendation,
        currentRecommendation,
        recommendationChanged: packageRecommendation !== currentRecommendation,
      };
    })
    .sort((left, right) => {
      const recommendationDelta = Number(right.recommendationChanged) - Number(left.recommendationChanged);
      if (recommendationDelta !== 0) return recommendationDelta;
      return Math.abs(right.scoreDelta) - Math.abs(left.scoreDelta) || left.provider.localeCompare(right.provider);
    });
}

function createCaseMatrixCellMap(
  matrix: GowooriProviderBenchmarkCaseItem[],
): Map<string, GowooriProviderBenchmarkCaseCell> {
  const map = new Map<string, GowooriProviderBenchmarkCaseCell>();
  for (const testCase of matrix) {
    for (const providerCell of testCase.providers) {
      map.set(`${testCase.caseTitle}\n${providerCell.provider}`, providerCell);
    }
  }
  return map;
}

function createRestoredQualityMatrixDiffs(
  packageMatrix: GowooriProviderBenchmarkCaseItem[],
  currentBenchmark?: GowooriProviderBenchmarkReport,
): RestoredQualityMatrixDiff[] {
  if (!currentBenchmark) return [];
  const packageCellMap = createCaseMatrixCellMap(packageMatrix);
  const currentCellMap = createCaseMatrixCellMap(currentBenchmark.caseMatrix);
  const keys = Array.from(new Set([...packageCellMap.keys(), ...currentCellMap.keys()])).sort((left, right) =>
    left.localeCompare(right),
  );

  return keys
    .map((key) => {
      const [caseTitle, provider] = key.split('\n');
      const packageCell = packageCellMap.get(key);
      const currentCell = currentCellMap.get(key);
      const packageStatus = packageCell?.status ?? 'missing';
      const currentStatus = currentCell?.status ?? 'missing';
      const packageDiagnostics = packageCell?.diagnosticsCount ?? 0;
      const currentDiagnostics = currentCell?.diagnosticsCount ?? 0;

      return {
        caseTitle,
        provider,
        packageStatus,
        currentStatus,
        packageDiagnostics,
        currentDiagnostics,
        changed: packageStatus !== currentStatus || packageDiagnostics !== currentDiagnostics,
      };
    })
    .sort((left, right) => {
      const changedDelta = Number(right.changed) - Number(left.changed);
      if (changedDelta !== 0) return changedDelta;
      return left.caseTitle.localeCompare(right.caseTitle) || left.provider.localeCompare(right.provider);
    });
}

function findMatrixCaseCell(
  matrix: GowooriProviderBenchmarkCaseItem[],
  provider: string,
  caseTitle: string,
): GowooriProviderBenchmarkCaseCell | null {
  const testCase = matrix.find((item) => item.caseTitle === caseTitle);
  return testCase?.providers.find((item) => item.provider === provider) ?? null;
}

function findLatestRestoredQualityEntry(
  entries: GowooriQualityLogEntry[],
  provider: string,
  caseTitle?: string,
): GowooriQualityLogEntry | null {
  return (
    entries
      .filter((entry) => entry.provider === provider && (!caseTitle || entry.promptTitle === caseTitle))
      .sort(
        (left, right) =>
          right.completedAt - left.completedAt || right.startedAt - left.startedAt || left.id.localeCompare(right.id),
      )[0] ?? null
  );
}

function resolveRestoredQualityDrilldownCaseTitle(
  restoredPackage: RestoredQualityPackageState,
  currentBenchmark: GowooriProviderBenchmarkReport | undefined,
  provider: string,
  requestedCaseTitle?: string,
): string {
  if (requestedCaseTitle?.trim()) return requestedCaseTitle.trim();
  const changedCase = createRestoredQualityMatrixDiffs(restoredPackage.caseMatrix, currentBenchmark).find(
    (item) => item.provider === provider && item.changed,
  );
  if (changedCase) return changedCase.caseTitle;
  const packageCase = restoredPackage.caseMatrix.find((item) =>
    item.providers.some((cell) => cell.provider === provider && cell.status !== 'missing'),
  );
  if (packageCase) return packageCase.caseTitle;
  const currentCase = currentBenchmark?.caseMatrix.find((item) =>
    item.providers.some((cell) => cell.provider === provider && cell.status !== 'missing'),
  );
  return currentCase?.caseTitle ?? '';
}

function resolveRestoredQualityEntryByCell(
  entries: GowooriQualityLogEntry[],
  cell: GowooriProviderBenchmarkCaseCell | null,
  provider: string,
  caseTitle: string,
): GowooriQualityLogEntry | null {
  if (cell?.entryId) {
    const byId = entries.find((entry) => entry.id === cell.entryId);
    if (byId) return byId;
  }
  return findLatestRestoredQualityEntry(entries, provider, caseTitle);
}

function splitArtifactLines(source: string): string[] {
  if (!source) return [];
  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function createArtifactLineDiff(packageSource: string, currentSource: string): RestoredQualityArtifactLineDiff {
  const packageLines = splitArtifactLines(packageSource);
  const currentLines = splitArtifactLines(currentSource);
  const lcs = Array.from({ length: packageLines.length + 1 }, () =>
    Array.from({ length: currentLines.length + 1 }, () => 0),
  );

  for (let packageIndex = packageLines.length - 1; packageIndex >= 0; packageIndex -= 1) {
    for (let currentIndex = currentLines.length - 1; currentIndex >= 0; currentIndex -= 1) {
      lcs[packageIndex][currentIndex] =
        packageLines[packageIndex] === currentLines[currentIndex]
          ? lcs[packageIndex + 1][currentIndex + 1] + 1
          : Math.max(lcs[packageIndex + 1][currentIndex], lcs[packageIndex][currentIndex + 1]);
    }
  }

  const lines: RestoredQualityArtifactLineDiffLine[] = [];
  const pendingPackage: Array<{ text: string; lineNumber: number }> = [];
  const pendingCurrent: Array<{ text: string; lineNumber: number }> = [];

  const pushLine = (
    status: RestoredQualityArtifactLineDiffStatus,
    packageLine: { text: string; lineNumber: number } | null,
    currentLine: { text: string; lineNumber: number } | null,
  ) => {
    lines.push({
      lineNumber: lines.length + 1,
      packageLineNumber: packageLine?.lineNumber ?? null,
      currentLineNumber: currentLine?.lineNumber ?? null,
      packageText: packageLine?.text ?? '',
      currentText: currentLine?.text ?? '',
      status,
    });
  };

  const flushPending = () => {
    while (pendingPackage.length > 0 && pendingCurrent.length > 0) {
      pushLine('changed', pendingPackage.shift() ?? null, pendingCurrent.shift() ?? null);
    }
    while (pendingPackage.length > 0) {
      pushLine('removed', pendingPackage.shift() ?? null, null);
    }
    while (pendingCurrent.length > 0) {
      pushLine('added', null, pendingCurrent.shift() ?? null);
    }
  };

  let packageIndex = 0;
  let currentIndex = 0;

  while (packageIndex < packageLines.length && currentIndex < currentLines.length) {
    if (packageLines[packageIndex] === currentLines[currentIndex]) {
      flushPending();
      pushLine(
        'same',
        { text: packageLines[packageIndex], lineNumber: packageIndex + 1 },
        { text: currentLines[currentIndex], lineNumber: currentIndex + 1 },
      );
      packageIndex += 1;
      currentIndex += 1;
    } else if (lcs[packageIndex + 1][currentIndex] >= lcs[packageIndex][currentIndex + 1]) {
      pendingPackage.push({ text: packageLines[packageIndex], lineNumber: packageIndex + 1 });
      packageIndex += 1;
    } else {
      pendingCurrent.push({ text: currentLines[currentIndex], lineNumber: currentIndex + 1 });
      currentIndex += 1;
    }
  }

  while (packageIndex < packageLines.length) {
    pendingPackage.push({ text: packageLines[packageIndex], lineNumber: packageIndex + 1 });
    packageIndex += 1;
  }
  while (currentIndex < currentLines.length) {
    pendingCurrent.push({ text: currentLines[currentIndex], lineNumber: currentIndex + 1 });
    currentIndex += 1;
  }
  flushPending();

  return {
    lines,
    summary: {
      total: lines.length,
      same: lines.filter((line) => line.status === 'same').length,
      changed: lines.filter((line) => line.status === 'changed').length,
      added: lines.filter((line) => line.status === 'added').length,
      removed: lines.filter((line) => line.status === 'removed').length,
    },
  };
}

export function createRestoredQualityArtifactDrilldown(
  restoredPackage: RestoredQualityPackageState,
  currentEntries: GowooriQualityLogEntry[],
  request: RestoredQualityArtifactDrilldownRequest,
  currentBenchmark?: GowooriProviderBenchmarkReport,
): RestoredQualityArtifactDrilldown {
  const provider = request.provider.trim() || 'Unknown';
  const caseTitle = resolveRestoredQualityDrilldownCaseTitle(
    restoredPackage,
    currentBenchmark,
    provider,
    request.caseTitle,
  );
  const packageCell = caseTitle ? findMatrixCaseCell(restoredPackage.caseMatrix, provider, caseTitle) : null;
  const currentCell =
    caseTitle && currentBenchmark ? findMatrixCaseCell(currentBenchmark.caseMatrix, provider, caseTitle) : null;
  const packageEntry = caseTitle
    ? resolveRestoredQualityEntryByCell(restoredPackage.entries, packageCell, provider, caseTitle)
    : findLatestRestoredQualityEntry(restoredPackage.entries, provider);
  const currentEntry = caseTitle
    ? resolveRestoredQualityEntryByCell(currentEntries, currentCell, provider, caseTitle)
    : findLatestRestoredQualityEntry(currentEntries, provider);
  const packageSource = packageEntry?.artifactSource ?? packageCell?.artifactPreview ?? '';
  const currentSource = currentEntry?.artifactSource ?? currentCell?.artifactPreview ?? '';

  return {
    provider,
    caseTitle: caseTitle || packageEntry?.promptTitle || currentEntry?.promptTitle || 'All cases',
    packageEntry,
    currentEntry,
    packageSource,
    currentSource,
    artifactLineDiff: createArtifactLineDiff(packageSource, currentSource),
    packageStatus: packageCell?.status ?? packageEntry?.status ?? 'missing',
    currentStatus: currentCell?.status ?? currentEntry?.status ?? 'missing',
    packageDiagnostics: packageCell?.diagnosticsCount ?? packageEntry?.diagnosticsCount ?? 0,
    currentDiagnostics: currentCell?.diagnosticsCount ?? currentEntry?.diagnosticsCount ?? 0,
    hasArtifactComparison: Boolean(packageSource || currentSource),
  };
}

function formatRestoredQualityArtifactReviewLine(line: RestoredQualityArtifactLineDiffLine): string {
  return `| ${[
    line.lineNumber,
    line.status,
    line.packageLineNumber ?? '-',
    line.packageText || '',
    line.currentLineNumber ?? '-',
    line.currentText || '',
  ]
    .map(formatQualityReportCell)
    .join(' | ')} |`;
}

export function createRestoredQualityArtifactReviewNote(drilldown: RestoredQualityArtifactDrilldown): string {
  const changedLines = drilldown.artifactLineDiff.lines.filter((line) => line.status !== 'same');
  const changedRows =
    changedLines.map(formatRestoredQualityArtifactReviewLine).join('\n') ||
    '| None | same | - | No changed lines | - | No changed lines |';

  return [
    '# Gowoori Restored Artifact Review Note',
    '',
    `- Provider: ${drilldown.provider}`,
    `- Case: ${drilldown.caseTitle}`,
    `- Package entry: ${drilldown.packageEntry?.id ?? 'none'}`,
    `- Current entry: ${drilldown.currentEntry?.id ?? 'none'}`,
    `- Status: ${drilldown.packageStatus} -> ${drilldown.currentStatus}`,
    `- Diagnostics: ${drilldown.packageDiagnostics} -> ${drilldown.currentDiagnostics}`,
    `- Line summary: ${drilldown.artifactLineDiff.summary.changed} changed, ${drilldown.artifactLineDiff.summary.added} added, ${drilldown.artifactLineDiff.summary.removed} removed`,
    '',
    '## Changed lines',
    '',
    '| Diff line | State | Package line | Package text | Current line | Current text |',
    '| ---: | --- | ---: | --- | ---: | --- |',
    changedRows,
    '',
    '## Review guidance',
    '',
    '- Prefer the current artifact when it is renderable and diagnostics improved.',
    '- Prefer the package artifact when the current artifact regressed or lost required XCON/SKETCH structure.',
    '- Re-run provider benchmark after applying a replacement artifact.',
    '',
  ].join('\n');
}

export function createRestoredQualityPackageDiff(
  restoredPackage: RestoredQualityPackageState,
  currentEntries: GowooriQualityLogEntry[],
  benchmark?: GowooriProviderBenchmarkReport,
): RestoredQualityPackageDiff {
  const restoredIds = new Set(restoredPackage.entryIds);
  const currentIds = new Set(currentEntries.map((entry) => entry.id));
  const retainedEntries = currentEntries.filter((entry) => restoredIds.has(entry.id));
  const missingEntries = restoredPackage.entries.filter((entry) => !currentIds.has(entry.id));
  const outsideEntries = currentEntries.filter((entry) => !restoredIds.has(entry.id));

  return {
    retainedEntries,
    missingEntries,
    outsideEntries,
    providerChanges: createRestoredQualityGroupDiffs(
      restoredPackage.entries,
      retainedEntries,
      (entry) => entry.provider,
    ),
    caseChanges: createRestoredQualityGroupDiffs(
      restoredPackage.entries,
      retainedEntries,
      (entry) => entry.promptTitle,
    ),
    statusChanges: createRestoredQualityStatusDiffs(restoredPackage.entries, retainedEntries),
    scorecardChanges: createRestoredQualityScorecardDiffs(restoredPackage.scorecard, benchmark),
    matrixChanges: createRestoredQualityMatrixDiffs(restoredPackage.caseMatrix, benchmark),
  };
}

export function createRestoredQualityPackageSummary(
  restoredPackage: RestoredQualityPackageState,
  currentEntries: GowooriQualityLogEntry[],
  benchmark: GowooriProviderBenchmarkReport,
): RestoredQualityPackageSummary {
  const restoredIds = new Set(restoredPackage.entryIds);
  const currentIds = new Set(currentEntries.map((entry) => entry.id));
  const currentScorecard = createGowooriProviderScorecard(benchmark);
  const packageRecommendedProvider = restoredPackage.scorecard?.recommendedProvider;
  const currentRecommendedProvider = currentScorecard.recommendedProvider;
  const scorecardChanges = createRestoredQualityScorecardDiffs(restoredPackage.scorecard, benchmark);
  const matrixChanges = createRestoredQualityMatrixDiffs(restoredPackage.caseMatrix, benchmark);

  return {
    ...restoredPackage,
    retained: currentEntries.filter((entry) => restoredIds.has(entry.id)).length,
    missing: restoredPackage.entryIds.filter((id) => !currentIds.has(id)).length,
    outsidePackage: currentEntries.filter((entry) => !restoredIds.has(entry.id)).length,
    currentDelta: benchmark.total - restoredPackage.benchmarkTotal,
    providerDelta: benchmark.providers.length - restoredPackage.benchmarkProviderCount,
    packageRecommendedProvider,
    currentRecommendedProvider,
    recommendedProviderChanged: (packageRecommendedProvider ?? '') !== (currentRecommendedProvider ?? ''),
    scorecardChangeCount: scorecardChanges.filter(
      (item) => item.recommendationChanged || item.scoreDelta !== 0 || item.rankDelta !== 0,
    ).length,
    matrixChangeCount: matrixChanges.filter((item) => item.changed).length,
  };
}

export function formatSignedNumber(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function formatRestoredQualityGroupDiffRow(item: RestoredQualityGroupDiff): string {
  return `| ${[
    formatQualityReportCell(item.label),
    item.baseline.total,
    item.total,
    formatSignedNumber(item.delta),
    `${item.stable} (${formatSignedNumber(item.stableDelta)})`,
    `${item.repaired} (${formatSignedNumber(item.repairedDelta)})`,
    `${item.blocked} (${formatSignedNumber(item.blockedDelta)})`,
    `${item.errors} (${formatSignedNumber(item.errorDelta)})`,
    `${item.warnings} (${formatSignedNumber(item.warningDelta)})`,
  ].join(' | ')} |`;
}

function formatRestoredQualityScorecardDiffRow(item: RestoredQualityScorecardDiff): string {
  return `| ${[
    formatQualityReportCell(item.provider),
    item.packageRank || '-',
    item.currentRank || '-',
    formatSignedNumber(item.rankDelta),
    item.packageScore,
    item.currentScore,
    formatSignedNumber(item.scoreDelta),
    item.packageRecommendation,
    item.currentRecommendation,
  ]
    .map(formatQualityReportCell)
    .join(' | ')} |`;
}

function formatRestoredQualityMatrixDiffRow(item: RestoredQualityMatrixDiff): string {
  return `| ${[
    formatQualityReportCell(item.caseTitle),
    formatQualityReportCell(item.provider),
    item.packageStatus,
    item.currentStatus,
    item.packageDiagnostics,
    item.currentDiagnostics,
    item.changed ? 'changed' : 'same',
  ]
    .map(formatQualityReportCell)
    .join(' | ')} |`;
}

function formatRestoredQualityEntryList(entries: GowooriQualityLogEntry[]): string {
  if (entries.length === 0) return '- None';

  return entries
    .slice(0, 12)
    .map((entry) =>
      [
        `- ${entry.provider}`,
        entry.mode,
        entry.promptTitle,
        entry.status,
        `${entry.errorCount} error / ${entry.warningCount} warning`,
      ]
        .map(formatQualityReportCell)
        .join(' / '),
    )
    .join('\n');
}

function createMarkdownArtifactFence(source: string): string {
  const normalizedSource = source.trimEnd();
  const defaultMarkdownFence = '```markdown';
  if (!normalizedSource.includes('```')) {
    return [defaultMarkdownFence, normalizedSource, '```'].join('\n');
  }
  return ['````markdown', normalizedSource, '````'].join('\n');
}

function formatRestoredQualityRepairResult(result?: RestoredQualityArtifactRepairResult | null): string {
  if (!result) {
    return ['## Repaired artifact', '', '- No repaired artifact has been captured for this package diff yet.', ''].join(
      '\n',
    );
  }

  return [
    '## Repaired artifact',
    '',
    `- Provider: ${result.provider}`,
    `- Case: ${result.caseTitle}`,
    `- Message: ${result.id}`,
    `- Created: ${new Date(result.createdAt).toLocaleString()}`,
    `- Summary: ${formatQualityReportCell(result.summary) || 'No summary'}`,
    `- Source length: ${result.source.length} chars`,
    `- Prompt length: ${result.prompt.length} chars`,
    '',
    '### Repaired artifact source',
    '',
    createMarkdownArtifactFence(result.source),
    '',
  ].join('\n');
}

export function createRestoredPackageDiffReport(
  summary: RestoredQualityPackageSummary,
  diff: RestoredQualityPackageDiff,
  repairResult?: RestoredQualityArtifactRepairResult | null,
): string {
  const providerRows =
    diff.providerChanges.map(formatRestoredQualityGroupDiffRow).join('\n') ||
    '| None | 0 | 0 | +0 | 0 (+0) | 0 (+0) | 0 (+0) | 0 (+0) | 0 (+0) |';
  const caseRows =
    diff.caseChanges.map(formatRestoredQualityGroupDiffRow).join('\n') ||
    '| None | 0 | 0 | +0 | 0 (+0) | 0 (+0) | 0 (+0) | 0 (+0) | 0 (+0) |';
  const statusRows = diff.statusChanges
    .map(
      (item) =>
        `| ${[item.status, item.baseline, item.current, formatSignedNumber(item.delta)]
          .map(formatQualityReportCell)
          .join(' | ')} |`,
    )
    .join('\n');
  const scorecardRows =
    diff.scorecardChanges.map(formatRestoredQualityScorecardDiffRow).join('\n') ||
    '| None | - | - | +0 | 0 | 0 | +0 | - | - |';
  const matrixRows =
    diff.matrixChanges
      .filter((item) => item.changed)
      .map(formatRestoredQualityMatrixDiffRow)
      .join('\n') || '| None | - | - | - | 0 | 0 | same |';

  return [
    '# Gowoori Quality Package Diff',
    '',
    `- Package: ${summary.name}`,
    `- Imported: ${new Date(summary.importedAt).toLocaleString()}`,
    `- Restored filter: ${summary.provider} / ${summary.mode} / ${summary.caseTitle}`,
    `- Package baseline: ${summary.benchmarkTotal} run(s), ${summary.benchmarkProviderCount} provider(s)`,
    `- Current delta: ${formatSignedNumber(summary.currentDelta)} run(s)`,
    `- Provider delta: ${formatSignedNumber(summary.providerDelta)} provider(s)`,
    `- Retained: ${summary.retained}`,
    `- Missing: ${summary.missing}`,
    `- Outside package: ${summary.outsidePackage}`,
    '',
    '## Provider changes',
    '',
    '| Provider | Baseline | Current | Delta | Stable | Repaired | Blocked | Errors | Warnings |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    providerRows,
    '',
    '## Case changes',
    '',
    '| Case | Baseline | Current | Delta | Stable | Repaired | Blocked | Errors | Warnings |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    caseRows,
    '',
    '## Status changes',
    '',
    '| Status | Baseline | Current | Delta |',
    '| --- | ---: | ---: | ---: |',
    statusRows,
    '',
    '## Scorecard changes',
    '',
    `- Package recommended provider: ${summary.packageRecommendedProvider ?? 'none'}`,
    `- Current recommended provider: ${summary.currentRecommendedProvider ?? 'none'}`,
    `- Recommended provider changed: ${summary.recommendedProviderChanged ? 'yes' : 'no'}`,
    '',
    '| Provider | Package rank | Current rank | Rank delta | Package score | Current score | Score delta | Package recommendation | Current recommendation |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
    scorecardRows,
    '',
    '## Matrix changes',
    '',
    '| Case | Provider | Package status | Current status | Package diagnostics | Current diagnostics | State |',
    '| --- | --- | --- | --- | ---: | ---: | --- |',
    matrixRows,
    '',
    '## Missing from current log',
    '',
    formatRestoredQualityEntryList(diff.missingEntries),
    '',
    '## New outside package',
    '',
    formatRestoredQualityEntryList(diff.outsideEntries),
    '',
    formatRestoredQualityRepairResult(repairResult),
  ].join('\n');
}
