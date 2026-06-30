import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import type { XenesisConfig } from '../config/index.js';
import { displayXenesisStatePath, xenesisStatePath } from '../config/index.js';
import { SqliteAgentTaskStore } from '../orchestration/SqliteAgentTaskStore.js';
import { SqliteScheduleStore } from '../orchestration/SqliteScheduleStore.js';
import { createBuiltInTools } from '../tools/index.js';

export const diagnosticCommandNames = [
  'ant-trace',
  'backfill-sessions',
  'break-cache',
  'debug-tool-call',
  'heapdump',
  'insights',
  'mock-limits',
  'reset-limits',
  'extra-usage',
  'good-claude',
  'release-notes',
] as const;

export type DiagnosticCommandName = (typeof diagnosticCommandNames)[number];

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
  estimates: number;
}

interface LocalDiagnosticsSummary {
  sessionFiles: string[];
  runReportFiles: string[];
  taskCount: number;
  scheduleCount: number;
  messageRecords: number;
  usageSnapshots: UsageSnapshot[];
  runReportSessionIds: Set<string>;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDiagnosticCommandName(value: string | undefined): value is DiagnosticCommandName {
  return (diagnosticCommandNames as readonly string[]).includes(value ?? '');
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

async function readJsonLines(path: string) {
  const lines = (await readFile(path, 'utf8').catch(() => '')).split(/\r?\n/u).filter(Boolean);
  const records: unknown[] = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line) as unknown);
    } catch {
      // Ignore malformed local session records for diagnostics.
    }
  }
  return records;
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
    totalTokens: explicitTotalTokens ?? (inputTokens ?? 0) + (outputTokens ?? 0),
    ...(estimatedUsd !== undefined ? { estimatedUsd } : {}),
  };
}

async function readLocalDiagnosticsSummary(config: XenesisConfig): Promise<LocalDiagnosticsSummary> {
  const sessionFiles = await listFiles(xenesisStatePath(config.xenesisHome, 'sessions'), '.jsonl');
  const runReportFiles = await listFiles(xenesisStatePath(config.xenesisHome, 'run_reports'), '.json');
  const tasks = await new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome }).list();
  const schedules = await new SqliteScheduleStore({ xenesisHome: config.xenesisHome }).list();
  const usageSnapshots: UsageSnapshot[] = [];
  const runReportSessionIds = new Set<string>();
  let messageRecords = 0;

  for (const file of sessionFiles) {
    const records = await readJsonLines(file);
    messageRecords += records.length;
    for (const record of records) {
      const usage = extractUsage(record);
      if (usage) usageSnapshots.push(usage);
    }
  }

  for (const file of runReportFiles) {
    const report = await readJson(file);
    if (!isRecord(report)) continue;
    if (typeof report.sessionId === 'string' && report.sessionId.trim()) {
      runReportSessionIds.add(report.sessionId.trim());
    }
    const usage = extractUsage(report);
    if (usage) usageSnapshots.push(usage);
  }

  for (const task of tasks) {
    const usage = extractUsage(task);
    if (usage) usageSnapshots.push(usage);
  }

  return {
    sessionFiles,
    runReportFiles,
    taskCount: tasks.length,
    scheduleCount: schedules.length,
    messageRecords,
    usageSnapshots,
    runReportSessionIds,
  };
}

function totalUsage(snapshots: UsageSnapshot[]): UsageTotals {
  return snapshots.reduce<UsageTotals>(
    (total, snapshot) => ({
      inputTokens: total.inputTokens + snapshot.inputTokens,
      outputTokens: total.outputTokens + snapshot.outputTokens,
      totalTokens: total.totalTokens + snapshot.totalTokens,
      estimatedUsd: total.estimatedUsd + (snapshot.estimatedUsd ?? 0),
      estimates: total.estimates + (snapshot.estimatedUsd === undefined ? 0 : 1),
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedUsd: 0, estimates: 0 },
  );
}

function displayStatePath(config: XenesisConfig, path: string) {
  return displayXenesisStatePath(config.xenesisHome, path);
}

function assertInsideXenesisHome(config: XenesisConfig, path: string) {
  const home = resolve(config.xenesisHome);
  const target = resolve(path);
  const rel = relative(home, target);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) return target;
  throw new Error(`Refusing to access path outside XENESIS_HOME: ${path}`);
}

async function directoryStats(path: string): Promise<{ entries: number; bytes: number; exists: boolean }> {
  let rootStat;
  try {
    rootStat = await stat(path);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return { entries: 0, bytes: 0, exists: false };
    throw error;
  }
  if (!rootStat.isDirectory()) return { entries: 1, bytes: rootStat.size, exists: true };

  let entries = 0;
  let bytes = 0;
  const stack = [path];
  while (stack.length > 0 && entries < 10000) {
    const current = stack.pop()!;
    const children = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const child of children) {
      entries += 1;
      const childPath = resolve(current, child.name);
      if (child.isDirectory()) {
        stack.push(childPath);
      } else if (child.isFile()) {
        bytes += (await stat(childPath).catch(() => ({ size: 0 }))).size;
      }
    }
  }
  return { entries, bytes, exists: true };
}

async function countTraceMatches(config: XenesisConfig, traceId?: string) {
  const summary = await readLocalDiagnosticsSummary(config);
  let matches = 0;
  for (const file of summary.sessionFiles) {
    for (const record of await readJsonLines(file)) {
      if (!isRecord(record)) continue;
      const recordTraceId = typeof record.traceId === 'string' ? record.traceId : undefined;
      if (traceId ? recordTraceId === traceId : recordTraceId) matches += 1;
    }
  }
  for (const file of summary.runReportFiles) {
    const report = await readJson(file);
    if (!isRecord(report)) continue;
    const reportTraceId = typeof report.traceId === 'string' ? report.traceId : undefined;
    if (traceId ? reportTraceId === traceId : reportTraceId) matches += 1;
  }
  return { summary, matches };
}

async function renderAntTraceCommand(config: XenesisConfig, args: string[]) {
  if (args.length > 1) throw new Error('Command "ant-trace" accepts at most one trace id.');
  const traceId = args[0]?.trim();
  const { summary, matches } = await countTraceMatches(config, traceId);
  return [
    'ant-trace: local trace diagnostics only',
    `ant-trace: traceId=${traceId || 'all'}`,
    `ant-trace: sessions=${summary.sessionFiles.length} runReports=${summary.runReportFiles.length} matches=${matches}`,
    'ant-trace: providerCalls=false network=false',
  ];
}

async function renderBackfillSessionsCommand(config: XenesisConfig, args: string[]) {
  if (args.length > 0) throw new Error('Command "backfill-sessions" does not accept positional arguments.');
  const summary = await readLocalDiagnosticsSummary(config);
  const sessionIds = summary.sessionFiles.map((file) =>
    file
      .replace(/\\/g, '/')
      .split('/')
      .pop()!
      .replace(/\.jsonl$/u, ''),
  );
  const missingRunReports = sessionIds.filter((sessionId) => !summary.runReportSessionIds.has(sessionId)).length;
  return [
    'backfill-sessions: dryRun=true',
    `backfill-sessions: sessions=${summary.sessionFiles.length} runReports=${summary.runReportFiles.length} missingRunReports=${missingRunReports}`,
    'backfill-sessions: writes=0 providerCalls=false network=false',
  ];
}

async function renderBreakCacheCommand(config: XenesisConfig, args: string[]) {
  if (args.length > 0) throw new Error('Command "break-cache" does not accept positional arguments.');
  const target = assertInsideXenesisHome(config, xenesisStatePath(config.xenesisHome, 'cache'));
  const before = await directoryStats(target);
  if (before.exists) await rm(target, { recursive: true, force: true });
  return [
    `break-cache: target=${displayStatePath(config, target)} removed=${before.exists}`,
    `break-cache: entries=${before.entries} bytes=${before.bytes}`,
    'break-cache: providerCalls=false network=false',
  ];
}

function renderDebugToolCallCommand(config: XenesisConfig, args: string[], env: NodeJS.ProcessEnv) {
  if (args.length > 1) throw new Error('Command "debug-tool-call" accepts at most one tool name.');
  const toolName = args[0]?.trim();
  const tools = createBuiltInTools({ env });
  const names = Array.from(tools.keys()).sort((left, right) => left.localeCompare(right));
  const tool = toolName ? tools.get(toolName) : undefined;
  return [
    'debug-tool-call: dryRun=true',
    `debug-tool-call: tool=${toolName || 'none'} available=${toolName ? String(tool !== undefined) : 'not-requested'}`,
    `debug-tool-call: builtInTools=${names.length} configuredProvider=${config.provider}`,
    `debug-tool-call: aliases=${tool?.aliases?.join(',') || 'none'}`,
    'debug-tool-call: invocation=false providerCalls=false network=false',
  ];
}

async function renderHeapdumpCommand(config: XenesisConfig, args: string[]) {
  if (args.length > 0) throw new Error('Command "heapdump" does not accept positional arguments.');
  const usage = process.memoryUsage();
  const metadataPath = assertInsideXenesisHome(
    config,
    xenesisStatePath(config.xenesisHome, 'diagnostics', 'heapdump-metadata.json'),
  );
  const metadata = {
    generatedAt: new Date().toISOString(),
    mode: 'metadata-only',
    heapDumpWritten: false,
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    memoryUsage: usage,
  };
  await mkdir(dirname(metadataPath), { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return [
    'heapdump: mode=metadata-only',
    'heapdump: heapDumpWritten=false',
    `heapdump: metadata=${displayStatePath(config, metadataPath)}`,
    `heapdump: rss=${usage.rss} heapUsed=${usage.heapUsed} heapTotal=${usage.heapTotal} external=${usage.external}`,
  ];
}

async function renderInsightsCommand(config: XenesisConfig, args: string[]) {
  if (args.length > 0) throw new Error('Command "insights" does not accept positional arguments.');
  const summary = await readLocalDiagnosticsSummary(config);
  const totals = totalUsage(summary.usageSnapshots);
  const reportPath = assertInsideXenesisHome(
    config,
    xenesisStatePath(config.xenesisHome, 'diagnostics', 'insights.json'),
  );
  const report = {
    generatedAt: new Date().toISOString(),
    localOnly: true,
    providerCalls: false,
    network: false,
    sessions: summary.sessionFiles.length,
    messageRecords: summary.messageRecords,
    runReports: summary.runReportFiles.length,
    tasks: summary.taskCount,
    schedules: summary.scheduleCount,
    usageSnapshots: summary.usageSnapshots.length,
    usage: totals,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return [
    'insights: local report only (no model, upload, or remote collection)',
    `insights: sessions=${summary.sessionFiles.length} messages=${summary.messageRecords} runs=${summary.runReportFiles.length} tasks=${summary.taskCount} schedules=${summary.scheduleCount}`,
    `insights: usageSnapshots=${summary.usageSnapshots.length} inputTokens=${totals.inputTokens} outputTokens=${totals.outputTokens} estimatedUsd=${totals.estimates > 0 ? totals.estimatedUsd.toFixed(6) : 'unavailable'}`,
    `insights: written=${displayStatePath(config, reportPath)}`,
  ];
}

async function renderMockLimitsCommand(config: XenesisConfig, args: string[]) {
  if (args.length > 0) throw new Error('Command "mock-limits" does not accept positional arguments.');
  const statePath = assertInsideXenesisHome(
    config,
    xenesisStatePath(config.xenesisHome, 'diagnostics', 'mock-limits.json'),
  );
  const state = {
    enabled: true,
    createdAt: new Date().toISOString(),
    source: 'xenesis-cli',
    localOnly: true,
    limits: {
      requestsRemaining: 0,
      resetAt: null,
    },
  };
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return [
    'mock-limits: enabled=true',
    `mock-limits: state=${displayStatePath(config, statePath)}`,
    'mock-limits: providerCalls=false network=false',
  ];
}

async function renderResetLimitsCommand(config: XenesisConfig, args: string[]) {
  if (args.length > 0) throw new Error('Command "reset-limits" does not accept positional arguments.');
  const statePath = assertInsideXenesisHome(
    config,
    xenesisStatePath(config.xenesisHome, 'diagnostics', 'mock-limits.json'),
  );
  let removed = false;
  try {
    await rm(statePath, { force: false });
    removed = true;
  } catch (error) {
    if (!(isNodeError(error) && error.code === 'ENOENT')) throw error;
  }
  return [
    `reset-limits: removed=${removed}`,
    `reset-limits: state=${displayStatePath(config, statePath)}`,
    'reset-limits: providerCalls=false network=false',
  ];
}

async function renderExtraUsageCommand(config: XenesisConfig, args: string[]) {
  if (args.length > 0) throw new Error('Command "extra-usage" does not accept positional arguments.');
  const summary = await readLocalDiagnosticsSummary(config);
  return [
    'extra-usage: local status only (no billing API, admin request, or browser launch)',
    `extra-usage: provider=${config.provider} model=${config.model}`,
    `extra-usage: localUsageSnapshots=${summary.usageSnapshots.length} network=false browser=false requests=false`,
  ];
}

function renderGoodClaudeCommand(args: string[]) {
  if (args.length > 0) throw new Error('Command "good-claude" does not accept positional arguments.');
  return [
    'good-claude: local compatibility no-op',
    'good-claude: reference=hidden-disabled-stub',
    'good-claude: providerCalls=false network=false',
  ];
}

async function renderReleaseNotesCommand(args: string[]) {
  if (args.length > 0) throw new Error('Command "release-notes" does not accept positional arguments.');
  const raw = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
  const pkg = JSON.parse(raw) as { name?: string; version?: string };
  return [
    'release-notes: local package metadata only',
    `release-notes: package=${pkg.name ?? 'xenesis'} version=${pkg.version ?? '0.0.0'}`,
    'release-notes: changelog=missing',
    'release-notes: providerCalls=false network=false',
  ];
}

export async function renderDiagnosticCommand(
  config: XenesisConfig,
  command: DiagnosticCommandName,
  args: string[] = [],
  env: NodeJS.ProcessEnv = process.env,
) {
  switch (command) {
    case 'ant-trace':
      return await renderAntTraceCommand(config, args);
    case 'backfill-sessions':
      return await renderBackfillSessionsCommand(config, args);
    case 'break-cache':
      return await renderBreakCacheCommand(config, args);
    case 'debug-tool-call':
      return renderDebugToolCallCommand(config, args, env);
    case 'heapdump':
      return await renderHeapdumpCommand(config, args);
    case 'insights':
      return await renderInsightsCommand(config, args);
    case 'mock-limits':
      return await renderMockLimitsCommand(config, args);
    case 'reset-limits':
      return await renderResetLimitsCommand(config, args);
    case 'extra-usage':
      return await renderExtraUsageCommand(config, args);
    case 'good-claude':
      return renderGoodClaudeCommand(args);
    case 'release-notes':
      return await renderReleaseNotesCommand(args);
  }
}
