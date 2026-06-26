import { GOWOORI_GENERATION_ACCEPTANCE_CASES } from '../agent/gowooriGenerationAcceptance';
import type { GowooriProvider } from '../agent/gowooriProviders';
import type { GowooriProviderBenchmarkReport, GowooriQualityLogEntry } from '../agent/gowooriQualityLog';

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

export interface GowooriQualityCaseMatrixRow {
  id: string;
  title: string;
  providers: Array<{
    provider: string;
    entry: GowooriQualityLogEntry | null;
  }>;
}

export interface GowooriQualityCaseDiffItem {
  provider: string;
  entry: GowooriQualityLogEntry | null;
}

export interface GowooriBenchmarkProviderOption {
  id: GowooriProvider;
  label: string;
  selected: boolean;
  active: boolean;
}

export interface GowooriProviderDefinitionSummary {
  id: GowooriProvider;
  label: string;
}

interface CreateGowooriQualityFilterSummaryOptions {
  selectedQualityProvider: string;
  selectedQualityMode: string;
  selectedQualityCase: string;
  filteredQualityLog: GowooriQualityLogEntry[];
  totalQualityLogCount: number;
}

export function createGowooriQualityFilterSummary({
  selectedQualityProvider,
  selectedQualityMode,
  selectedQualityCase,
  filteredQualityLog,
  totalQualityLogCount,
}: CreateGowooriQualityFilterSummaryOptions): GowooriQualityFilterSummary {
  return {
    provider: selectedQualityProvider === 'all' ? 'All providers' : selectedQualityProvider,
    mode: selectedQualityMode === 'all' ? 'All modes' : selectedQualityMode,
    caseTitle: selectedQualityCase === 'all' ? 'All cases' : selectedQualityCase,
    visible: filteredQualityLog.length,
    total: totalQualityLogCount,
    stable: filteredQualityLog.filter((entry) => entry.status === 'stable').length,
    repaired: filteredQualityLog.filter((entry) => entry.status === 'repaired').length,
    blocked: filteredQualityLog.filter((entry) => entry.status === 'blocked').length,
    applied: filteredQualityLog.filter((entry) => entry.applied).length,
    errors: filteredQualityLog.reduce((sum, entry) => sum + entry.errorCount, 0),
    warnings: filteredQualityLog.reduce((sum, entry) => sum + entry.warningCount, 0),
  };
}

export function areGowooriQualityFiltersActive(
  selectedQualityProvider: string,
  selectedQualityMode: string,
  selectedQualityCase: string,
): boolean {
  return selectedQualityProvider !== 'all' || selectedQualityMode !== 'all' || selectedQualityCase !== 'all';
}

export function createGowooriQualityCaseMatrix(
  qualityLog: GowooriQualityLogEntry[],
  qualityBenchmark: GowooriProviderBenchmarkReport,
): GowooriQualityCaseMatrixRow[] {
  const providerLabels = qualityBenchmark.providers.map((item) => item.provider);
  const caseTitles = GOWOORI_GENERATION_ACCEPTANCE_CASES.map((item) => item.title);
  const latestByProviderCase = new Map<string, GowooriQualityLogEntry>();

  for (const entry of qualityLog) {
    if (!caseTitles.includes(entry.promptTitle)) continue;
    const key = `${entry.provider}\n${entry.promptTitle}`;
    const current = latestByProviderCase.get(key);
    if (!current || entry.completedAt > current.completedAt) {
      latestByProviderCase.set(key, entry);
    }
  }

  return GOWOORI_GENERATION_ACCEPTANCE_CASES.map((testCase) => ({
    id: testCase.id,
    title: testCase.title,
    providers: providerLabels.map((providerLabel) => ({
      provider: providerLabel,
      entry: latestByProviderCase.get(`${providerLabel}\n${testCase.title}`) ?? null,
    })),
  }));
}

export function createSelectedGowooriQualityCaseDiff(
  qualityLog: GowooriQualityLogEntry[],
  qualityBenchmark: GowooriProviderBenchmarkReport,
  selectedQualityEntry: GowooriQualityLogEntry | null,
): GowooriQualityCaseDiffItem[] {
  if (!selectedQualityEntry) return [];
  const providers = qualityBenchmark.providers.map((item) => item.provider);
  const latestByProvider = new Map<string, GowooriQualityLogEntry>();

  for (const entry of qualityLog) {
    if (entry.promptTitle !== selectedQualityEntry.promptTitle) continue;
    const current = latestByProvider.get(entry.provider);
    if (!current || entry.completedAt > current.completedAt) {
      latestByProvider.set(entry.provider, entry);
    }
  }

  const orderedProviders =
    providers.length > 0
      ? providers
      : [...new Set(qualityLog.map((entry) => entry.provider))].sort((a, b) => a.localeCompare(b));

  return orderedProviders.map((providerName) => ({
    provider: providerName,
    entry: latestByProvider.get(providerName) ?? null,
  }));
}

export function createGowooriBenchmarkProviderOptions(
  providerDefinitions: GowooriProviderDefinitionSummary[],
  benchmarkProviders: GowooriProvider[],
  activeProvider: GowooriProvider,
): GowooriBenchmarkProviderOption[] {
  const selected = new Set<GowooriProvider>(benchmarkProviders);
  return providerDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    selected: selected.has(definition.id),
    active: definition.id === activeProvider,
  }));
}
