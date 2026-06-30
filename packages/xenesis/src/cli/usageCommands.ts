import { readdir, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { XenesisConfig } from '../config/index.js';
import { SqliteAgentTaskStore } from '../orchestration/SqliteAgentTaskStore.js';
import { SqliteScheduleStore } from '../orchestration/SqliteScheduleStore.js';
import { resolveProviderSettings } from '../providers/index.js';

interface UsageSnapshot {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedUsd?: number;
}

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  estimateCount: number;
}

interface LocalUsageSummary {
  sessionCount: number;
  runReportCount: number;
  taskCount: number;
  scheduleCount: number;
  usageSnapshots: UsageSnapshot[];
  runStatuses: Record<string, number>;
  taskStatuses: Record<string, number>;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return undefined;
    return undefined;
  }
}

async function listFiles(directory: string, suffix: string) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
      .map((entry) => resolve(directory, entry.name))
      .sort();
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function extractCostUsd(value: Record<string, unknown>) {
  const direct =
    optionalNumber(value.estimatedUsd) ?? optionalNumber(value.costUsd) ?? optionalNumber(value.totalCostUsd);
  if (direct !== undefined) return direct;

  const cost = value.cost;
  if (!isRecord(cost)) return undefined;
  return (
    optionalNumber(cost.estimatedUsd) ??
    optionalNumber(cost.costUsd) ??
    optionalNumber(cost.totalUsd) ??
    optionalNumber(cost.totalCostUsd)
  );
}

function extractUsage(value: unknown): UsageSnapshot | undefined {
  if (!isRecord(value)) return undefined;
  const usage = isRecord(value.usage) ? value.usage : value;
  const inputTokens = optionalNumber(usage.inputTokens);
  const outputTokens = optionalNumber(usage.outputTokens);
  const explicitTotalTokens = optionalNumber(usage.totalTokens);
  const totalTokens = explicitTotalTokens ?? (inputTokens ?? 0) + (outputTokens ?? 0);
  const estimatedUsd = extractCostUsd(usage) ?? extractCostUsd(value);

  if (
    inputTokens === undefined &&
    outputTokens === undefined &&
    explicitTotalTokens === undefined &&
    estimatedUsd === undefined
  ) {
    return undefined;
  }

  return {
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    totalTokens,
    ...(estimatedUsd !== undefined ? { estimatedUsd } : {}),
  };
}

function addStatus(bucket: Record<string, number>, status: unknown) {
  if (typeof status !== 'string' || status.trim().length === 0) return;
  bucket[status] = (bucket[status] ?? 0) + 1;
}

async function readSessionUsageSnapshots(xenesisHome: string) {
  const snapshots: UsageSnapshot[] = [];
  const files = await listFiles(resolve(xenesisHome, 'sessions'), '.jsonl');
  for (const file of files) {
    const raw = await readFile(file, 'utf8').catch(() => '');
    for (const line of raw.split(/\r?\n/).filter(Boolean)) {
      let record: unknown;
      try {
        record = JSON.parse(line) as unknown;
      } catch {
        continue;
      }
      const snapshot = extractUsage(record);
      if (snapshot) snapshots.push(snapshot);
    }
  }
  return { count: files.length, snapshots };
}

async function readRunReportUsage(xenesisHome: string) {
  const snapshots: UsageSnapshot[] = [];
  const statuses: Record<string, number> = {};
  const files = await listFiles(resolve(xenesisHome, 'run_reports'), '.json');
  for (const file of files) {
    const report = await readJson(file);
    if (!isRecord(report)) continue;
    addStatus(statuses, report.status);
    const snapshot = extractUsage(report);
    if (snapshot) snapshots.push(snapshot);
  }
  return { count: files.length, snapshots, statuses };
}

async function readTaskUsage(xenesisHome: string) {
  const snapshots: UsageSnapshot[] = [];
  const statuses: Record<string, number> = {};
  const tasks = (await new SqliteAgentTaskStore({ xenesisHome }).list()) as unknown as Record<string, unknown>[];
  for (const task of tasks) {
    addStatus(statuses, task.status);
    const snapshot = extractUsage(task);
    if (snapshot) snapshots.push(snapshot);
  }
  return { count: tasks.length, snapshots, statuses };
}

async function readScheduleCount(xenesisHome: string) {
  const schedules = await new SqliteScheduleStore({ xenesisHome }).list();
  return schedules.length;
}

async function readLocalUsageSummary(config: XenesisConfig): Promise<LocalUsageSummary> {
  const [sessions, runReports, tasks, scheduleCount] = await Promise.all([
    readSessionUsageSnapshots(config.xenesisHome),
    readRunReportUsage(config.xenesisHome),
    readTaskUsage(config.xenesisHome),
    readScheduleCount(config.xenesisHome),
  ]);

  return {
    sessionCount: sessions.count,
    runReportCount: runReports.count,
    taskCount: tasks.count,
    scheduleCount,
    usageSnapshots: [...sessions.snapshots, ...runReports.snapshots, ...tasks.snapshots],
    runStatuses: runReports.statuses,
    taskStatuses: tasks.statuses,
  };
}

function totalUsage(snapshots: UsageSnapshot[]) {
  return snapshots.reduce<UsageTotals>(
    (total, snapshot) => ({
      inputTokens: total.inputTokens + snapshot.inputTokens,
      outputTokens: total.outputTokens + snapshot.outputTokens,
      totalTokens: total.totalTokens + snapshot.totalTokens,
      estimatedUsd: total.estimatedUsd + (snapshot.estimatedUsd ?? 0),
      estimateCount: total.estimateCount + (snapshot.estimatedUsd !== undefined ? 1 : 0),
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedUsd: 0, estimateCount: 0 },
  );
}

function formatUsd(value: number) {
  return value.toFixed(6);
}

function renderStatusBucket(bucket: Record<string, number>) {
  const entries = Object.entries(bucket).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return 'none';
  return entries.map(([status, count]) => `${status}:${count}`).join(' ');
}

export async function renderUsageCommand(config: XenesisConfig) {
  const summary = await readLocalUsageSummary(config);
  const totals = totalUsage(summary.usageSnapshots);
  return [
    'usage: local data only (no provider or billing probe)',
    `usage: sessions=${summary.sessionCount} reports=${summary.runReportCount} tasks=${summary.taskCount} usageSnapshots=${summary.usageSnapshots.length}`,
    `usage: inputTokens=${totals.inputTokens} outputTokens=${totals.outputTokens} totalTokens=${totals.totalTokens}`,
  ];
}

export async function renderCostCommand(config: XenesisConfig) {
  const summary = await readLocalUsageSummary(config);
  const totals = totalUsage(summary.usageSnapshots);
  if (summary.usageSnapshots.length === 0) {
    return [
      'cost: local estimates only (no billing API)',
      'cost: no local usage data',
      'cost: estimatedUsd=0.000000 inputTokens=0 outputTokens=0 totalTokens=0',
    ];
  }

  const estimateLine =
    totals.estimateCount > 0
      ? `cost: estimates=${totals.estimateCount} estimatedUsd=${formatUsd(totals.estimatedUsd)}`
      : 'cost: estimates=0 estimatedUsd=unavailable';
  const totalLine =
    totals.estimateCount > 0
      ? `cost: estimatedUsd=${formatUsd(totals.estimatedUsd)} inputTokens=${totals.inputTokens} outputTokens=${totals.outputTokens} totalTokens=${totals.totalTokens}`
      : `cost: estimatedUsd=unavailable inputTokens=${totals.inputTokens} outputTokens=${totals.outputTokens} totalTokens=${totals.totalTokens}`;

  return ['cost: local estimates only (no billing API)', estimateLine, totalLine];
}

export async function renderStatsCommand(config: XenesisConfig) {
  const summary = await readLocalUsageSummary(config);
  return [
    'stats: local data only',
    `stats: sessions=${summary.sessionCount} runs=${summary.runReportCount} tasks=${summary.taskCount} schedules=${summary.scheduleCount}`,
    `stats: runStatus=${renderStatusBucket(summary.runStatuses)}`,
    `stats: taskStatus=${renderStatusBucket(summary.taskStatuses)}`,
  ];
}

async function hasLocalAuth(config: XenesisConfig) {
  return (await readJson(resolve(config.xenesisHome, 'auth.json'))) !== undefined;
}

export async function renderLoginStatusCommand(config: XenesisConfig, env: NodeJS.ProcessEnv) {
  const settings = resolveProviderSettings(config, env);
  const apiKeyStatus = settings.apiKeyEnv
    ? settings.apiKey && settings.apiKey.trim().length > 0
      ? 'present'
      : 'missing'
    : 'not_required';
  return [
    'login: local status only (OAuth/browser login disabled)',
    `login: provider=${config.provider} model=${config.model}`,
    `login: apiKeyEnv=${settings.apiKeyEnv ?? 'none'} status=${apiKeyStatus}`,
    `login: localAuth=${(await hasLocalAuth(config)) ? 'present' : 'missing'}`,
  ];
}

export async function renderLogoutCommand(config: XenesisConfig) {
  const authPath = resolve(config.xenesisHome, 'auth.json');
  try {
    await unlink(authPath);
    return ['logout: cleared $XENESIS_HOME/auth.json'];
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return ['logout: no local auth state'];
    }
    throw error;
  }
}

function renderFallbacks(config: XenesisConfig) {
  if (config.providerFallbacks.length === 0) return 'none';
  return config.providerFallbacks
    .map((fallback) => (fallback.model ? `${fallback.provider}:${fallback.model}` : fallback.provider))
    .join(', ');
}

export function renderRateLimitOptionsCommand(config: XenesisConfig) {
  return [
    'rate-limit-options: local provider failure policy',
    `rate-limit-options: providerRetries=${config.providerRetries}`,
    `rate-limit-options: providerFallbacks=${renderFallbacks(config)}`,
    `rate-limit-options: maxTurns=${config.maxTurns}`,
    `rate-limit-options: autoCompact=${config.context.autoCompact} compactAfterMessages=${config.context.compactAfterMessages} compactKeepMessages=${config.context.compactKeepMessages} maxToolResultChars=${config.context.maxToolResultChars}`,
    'rate-limit-options: no live rate-limit query',
  ];
}
