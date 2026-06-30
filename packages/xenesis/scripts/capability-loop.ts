#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { type ApprovalMode, type ProviderName, xenesisStatePath } from '../src/config/index.js';
import { runAgentPrompt } from '../src/core/AgentRunService.js';
import {
  acceptedCapabilityScenarios,
  buildCapabilityLoopReport,
  type CapabilityEvalReport,
  type CapabilityImprovementRunReportInput,
  type CapabilityImprovementTaskRecoveryMode,
  type CapabilityLoopEvalRunSummary,
  type CapabilityLoopReportMode,
  type CapabilityLoopUsageSummary,
  type CapabilityScenarioBacklog,
  capabilityLoopUsageFromEvalReport,
  completeCapabilityImprovementLoop,
  evaluateCapabilityLoopCycleProgress,
  evaluateCapabilityLoopSafetyBudget,
  promoteCapabilityFailures,
  promoteFailedRunReportsToCapabilityScenarios,
  queueCapabilityLoopNextTasks,
  readCapabilityImprovementTaskBacklog,
  readCapabilityImprovementTaskResults,
  readCapabilityScenarioBacklog,
  runCapabilityLoopNextTasks,
  selectCapabilityLoopNextTasks,
  writeCapabilityImprovementReport,
  writeCapabilityImprovementTaskBacklog,
  writeCapabilityImprovementTaskResults,
  writeCapabilityLoopReport,
  writeCapabilityScenarioBacklog,
} from '../src/evaluation/index.js';
import { type AgentTaskExecutor, SqliteAgentTaskStore } from '../src/orchestration/index.js';

interface ParsedArgs {
  workspace?: string;
  provider?: ProviderName;
  model?: string;
  approval?: ApprovalMode;
  scenarios: string[];
  maxScenarios?: number;
  timeoutMs: number;
  intervalMs: number;
  iterations: number;
  fromRunReports: boolean;
  reportDir?: string;
  backlog?: string;
  improveOut?: string;
  tasksOut?: string;
  results?: string;
  runReports?: string;
  sessions?: string;
  acceptedOut?: string;
  maxRunReports: number;
  agentTasks?: string;
  loopReport?: string;
  summaryOut?: string;
  config?: string;
  selectNext: boolean;
  queueNext: boolean;
  runNext: boolean;
  nextLimit: number;
  selfReviewCooldownMs: number;
  failurePatternCooldownMs: number;
  cycleLimit: number;
  maxCycleMinutes?: number;
  maxNextTasks?: number;
  maxPolicyImpactReworkAttempts: number;
  autoFollowUpAfterFailures?: number;
  maxCycleInputTokens?: number;
  maxCycleOutputTokens?: number;
  maxCycleTotalTokens?: number;
  maxCycleCostUsd?: number;
  inputTokenUsdPer1m?: number;
  outputTokenUsdPer1m?: number;
  requireCycleApproval: boolean;
  autoImprove: boolean;
  recoverFailed: boolean;
  runRecovered: boolean;
  rerunAfterRecovery: boolean;
  recoveryMode: CapabilityImprovementTaskRecoveryMode;
  json: boolean;
}

interface EvalRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  reportPath: string;
  report?: CapabilityEvalReport;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    scenarios: [],
    timeoutMs: 120000,
    intervalMs: 0,
    iterations: 1,
    fromRunReports: false,
    selectNext: false,
    queueNext: false,
    runNext: false,
    nextLimit: 1,
    selfReviewCooldownMs: 10 * 60 * 1000,
    failurePatternCooldownMs: 10 * 60 * 1000,
    maxPolicyImpactReworkAttempts: 1,
    maxRunReports: 20,
    cycleLimit: 1,
    requireCycleApproval: false,
    autoImprove: false,
    recoverFailed: false,
    runRecovered: false,
    rerunAfterRecovery: false,
    recoveryMode: 'retry',
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Option ${arg} requires a value.`);
      index += 1;
      return value;
    };

    if (arg === '--workspace') parsed.workspace = next();
    else if (arg === '--provider') parsed.provider = next() as ProviderName;
    else if (arg === '--model') parsed.model = next();
    else if (arg === '--approval') {
      const value = next();
      if (value !== 'safe' && value !== 'auto' && value !== 'readonly') {
        throw new Error('--approval must be safe, auto, or readonly.');
      }
      parsed.approval = value;
    } else if (arg === '--scenario') parsed.scenarios.push(next());
    else if (arg === '--max-scenarios') parsed.maxScenarios = positiveInteger(next(), '--max-scenarios');
    else if (arg === '--timeout-ms') parsed.timeoutMs = positiveInteger(next(), '--timeout-ms');
    else if (arg === '--interval-ms') parsed.intervalMs = nonNegativeInteger(next(), '--interval-ms');
    else if (arg === '--iterations') parsed.iterations = positiveInteger(next(), '--iterations');
    else if (arg === '--from-run-reports') {
      parsed.fromRunReports = true;
      parsed.autoImprove = true;
    } else if (arg === '--report-dir') parsed.reportDir = next();
    else if (arg === '--backlog') parsed.backlog = next();
    else if (arg === '--improve-out') parsed.improveOut = next();
    else if (arg === '--tasks-out') parsed.tasksOut = next();
    else if (arg === '--results') parsed.results = next();
    else if (arg === '--run-reports') parsed.runReports = next();
    else if (arg === '--sessions') parsed.sessions = next();
    else if (arg === '--accepted-out') parsed.acceptedOut = next();
    else if (arg === '--max-run-reports') parsed.maxRunReports = positiveInteger(next(), '--max-run-reports');
    else if (arg === '--agent-tasks') parsed.agentTasks = next();
    else if (arg === '--loop-report') parsed.loopReport = next();
    else if (arg === '--summary-out') parsed.summaryOut = next();
    else if (arg === '--config') parsed.config = next();
    else if (arg === '--select-next') {
      parsed.autoImprove = true;
      parsed.selectNext = true;
    } else if (arg === '--queue-next') {
      parsed.autoImprove = true;
      parsed.selectNext = true;
      parsed.queueNext = true;
    } else if (arg === '--run-next') {
      parsed.autoImprove = true;
      parsed.selectNext = true;
      parsed.queueNext = true;
      parsed.runNext = true;
    } else if (arg === '--next-limit') parsed.nextLimit = positiveInteger(next(), '--next-limit');
    else if (arg === '--self-review-cooldown-ms')
      parsed.selfReviewCooldownMs = nonNegativeInteger(next(), '--self-review-cooldown-ms');
    else if (arg === '--failure-pattern-cooldown-ms')
      parsed.failurePatternCooldownMs = nonNegativeInteger(next(), '--failure-pattern-cooldown-ms');
    else if (arg === '--max-next-tasks') parsed.maxNextTasks = positiveInteger(next(), '--max-next-tasks');
    else if (arg === '--max-policy-impact-reworks')
      parsed.maxPolicyImpactReworkAttempts = nonNegativeInteger(next(), '--max-policy-impact-reworks');
    else if (arg === '--max-cycle-minutes') parsed.maxCycleMinutes = positiveNumber(next(), '--max-cycle-minutes');
    else if (arg === '--max-cycle-input-tokens')
      parsed.maxCycleInputTokens = positiveInteger(next(), '--max-cycle-input-tokens');
    else if (arg === '--max-cycle-output-tokens')
      parsed.maxCycleOutputTokens = positiveInteger(next(), '--max-cycle-output-tokens');
    else if (arg === '--max-cycle-total-tokens')
      parsed.maxCycleTotalTokens = positiveInteger(next(), '--max-cycle-total-tokens');
    else if (arg === '--max-cycle-cost-usd') parsed.maxCycleCostUsd = positiveNumber(next(), '--max-cycle-cost-usd');
    else if (arg === '--input-token-usd-per-1m')
      parsed.inputTokenUsdPer1m = positiveNumber(next(), '--input-token-usd-per-1m');
    else if (arg === '--output-token-usd-per-1m')
      parsed.outputTokenUsdPer1m = positiveNumber(next(), '--output-token-usd-per-1m');
    else if (arg === '--require-cycle-approval') parsed.requireCycleApproval = true;
    else if (arg === '--cycle-limit') {
      parsed.cycleLimit = positiveInteger(next(), '--cycle-limit');
      parsed.autoImprove = true;
      parsed.selectNext = true;
      parsed.queueNext = true;
      parsed.runNext = true;
    } else if (arg === '--auto-improve') parsed.autoImprove = true;
    else if (arg === '--recover-failed') {
      parsed.autoImprove = true;
      parsed.recoverFailed = true;
    } else if (arg === '--run-recovered') {
      parsed.autoImprove = true;
      parsed.recoverFailed = true;
      parsed.runRecovered = true;
    } else if (arg === '--rerun-after-recovery') {
      parsed.autoImprove = true;
      parsed.recoverFailed = true;
      parsed.runRecovered = true;
      parsed.rerunAfterRecovery = true;
    } else if (arg === '--closed-loop') {
      parsed.autoImprove = true;
      parsed.recoverFailed = true;
      parsed.runRecovered = true;
      parsed.rerunAfterRecovery = true;
    } else if (arg === '--recovery-mode') {
      const value = next();
      if (value !== 'retry' && value !== 'follow-up') {
        throw new Error('--recovery-mode must be retry or follow-up.');
      }
      parsed.recoveryMode = value;
    } else if (arg === '--auto-follow-up-after-failures')
      parsed.autoFollowUpAfterFailures = positiveInteger(next(), '--auto-follow-up-after-failures');
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option ${arg}. Run "npm run capability:loop -- --help".`);
    }
  }

  return parsed;
}

function positiveInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function positiveNumber(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number.`);
  return parsed;
}

function nonNegativeInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`);
  return parsed;
}

function printHelp() {
  console.log(
    [
      'Usage: npm run capability:loop -- [options]',
      '',
      'Runs capability:eval one or more times and promotes failed scenario patterns into a review backlog.',
      '',
      'Options:',
      '  --workspace <path>      Workspace passed to capability:eval.',
      '  --provider <name>       Provider override passed to capability:eval.',
      '  --model <name>          Model override passed to capability:eval.',
      '  --approval <mode>       Approval mode: safe, auto, or readonly.',
      '  --scenario <id>         Scenario id passed to capability:eval. May be repeated.',
      '  --max-scenarios <n>     Limit selected scenarios.',
      '  --timeout-ms <n>        Timeout per scenario. Default: 120000.',
      '  --iterations <n>        Number of eval runs. Default: 1.',
      '  --interval-ms <n>       Delay between runs. Default: 0.',
      '  --from-run-reports      Skip capability eval and build improvement work from run report self-review data.',
      '  --report-dir <path>     Directory for loop-created eval reports.',
      '  --backlog <path>        Backlog output path.',
      '  --auto-improve          Build improvement report and task backlog after eval.',
      '  --recover-failed        Recover failed capability tasks from the result log.',
      '  --run-recovered         Execute recovered tasks through the normal agent runner.',
      '  --rerun-after-recovery  Run capability eval again after recovered tasks run.',
      '  --closed-loop           Shortcut for auto-improve + recover + run + rerun.',
      '  --recovery-mode <mode>  retry or follow-up. Default: retry.',
      '  --auto-follow-up-after-failures <n> Switch repeated failed recovery tasks to follow-up mode at n failures.',
      '  --improve-out <path>    Improvement report path.',
      '  --tasks-out <path>      Improvement task backlog path.',
      '  --results <path>        Improvement task result log path.',
      '  --run-reports <dir>     Run report directory for self-review feedback. Default: $XENESIS_HOME/run_reports',
      '  --sessions <dir>        Session log directory used to recover prompts for failed run report intake.',
      '  --accepted-out <path>   Accepted scenario output path for failed run report intake. Default: $XENESIS_HOME/reports/capability-accepted-scenarios.json',
      '  --max-run-reports <n>   Maximum recent run reports to read. Default: 20',
      '  --agent-tasks <path>    Durable agent task queue path.',
      '  --loop-report <path>    Human-readable loop report path.',
      '  --summary-out <path>    Markdown summary output path for operator review.',
      '  --select-next           Select next improvement tasks from the loop report.',
      '  --queue-next            Queue selected next tasks as durable agent tasks.',
      '  --run-next              Queue and run selected next tasks, then record results.',
      '  --next-limit <n>        Maximum next tasks to select or queue. Default: 1.',
      '  --self-review-cooldown-ms <n> Skip recently handled self-review actions for this many milliseconds. Default: 600000.',
      '  --failure-pattern-cooldown-ms <n> Skip recently handled repeated failure patterns for this many milliseconds. Default: 600000.',
      '  --cycle-limit <n>       Repeat eval/improve/run cycles up to n times.',
      '  --max-cycle-minutes <n> Stop after the elapsed cycle budget is reached.',
      '  --max-next-tasks <n>    Stop after running this many next tasks in total.',
      '  --max-policy-impact-reworks <n> Stop automatic policy-impact rework after n completed rework attempts. Default: 1.',
      '  --max-cycle-input-tokens <n> Stop after eval + task input token budget is reached.',
      '  --max-cycle-output-tokens <n> Stop after eval + task output token budget is reached.',
      '  --max-cycle-total-tokens <n> Stop after eval + task total token budget is reached.',
      '  --max-cycle-cost-usd <n> Stop after estimated eval + task cost budget is reached.',
      '  --input-token-usd-per-1m <n> Input token price used for estimated cost.',
      '  --output-token-usd-per-1m <n> Output token price used for estimated cost.',
      '  --require-cycle-approval Prompt before continuing to another autonomous cycle.',
      '  --config <path>         Config path for recovered task runs.',
      '  --json                  Print JSON summary.',
    ].join('\n'),
  );
}

function packageRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

function resolveXenesisHome() {
  return process.env.XENESIS_HOME?.trim() ? resolve(process.env.XENESIS_HOME) : resolve(homedir(), '.xenesis');
}

function defaultImprovementReportPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-improvement-report.json');
}

function defaultImprovementTasksPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-improvement-tasks.json');
}

function defaultImprovementResultsPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-task-results.json');
}

function defaultRunReportsPath() {
  return resolve(resolveXenesisHome(), 'run_reports');
}

function defaultSessionsPath() {
  return resolve(resolveXenesisHome(), 'sessions');
}

function defaultAcceptedScenariosPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-accepted-scenarios.json');
}

function defaultLoopReportPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-loop-report.json');
}

function defaultAgentTasksPath() {
  return xenesisStatePath(resolveXenesisHome(), 'agent_tasks.json');
}

function createAgentTaskStore(agentTasksPath: string) {
  const xenesisHome = basename(agentTasksPath) === 'agent_tasks.json' ? dirname(agentTasksPath) : agentTasksPath;
  return new SqliteAgentTaskStore({ xenesisHome });
}

function capabilityLoopMode(parsed: ParsedArgs): CapabilityLoopReportMode {
  if (parsed.rerunAfterRecovery) return 'closed-loop';
  if (parsed.autoImprove) return 'auto-improve';
  return 'eval-only';
}

function evalRunSummary(run: EvalRunResult): CapabilityLoopEvalRunSummary {
  const summary: CapabilityLoopEvalRunSummary = {
    reportPath: run.reportPath,
    exitCode: run.exitCode,
    failedScenarioIds: run.report?.metrics.failedScenarioIds ?? [],
  };
  if (run.report?.summary.score !== undefined) summary.score = run.report.summary.score;
  if (run.report) summary.usage = capabilityLoopUsageFromEvalReport(run.report);
  return summary;
}

function taskExecutorStatusFromRun(result: Awaited<ReturnType<typeof runAgentPrompt>>): {
  status: 'completed' | 'failed' | 'blocked';
  error?: string;
} {
  const stopped = result.events.find((event) => event.type === 'stopped');
  if (stopped?.type === 'stopped') {
    const error = `run stopped: ${stopped.reason}`;
    return {
      status: stopped.reason === 'user_input_required' ? 'blocked' : 'failed',
      error,
    };
  }

  if (result.runReport?.status && result.runReport.status !== 'completed') {
    return {
      status: result.runReport.metrics.userInputRequired || result.runReport.metrics.blocked ? 'blocked' : 'failed',
      error: `run report status=${result.runReport.status}`,
    };
  }

  const selfReview = result.selfReview;
  if (selfReview?.status === 'fail') {
    return {
      status: 'failed',
      error: `run self-review failed: score=${selfReview.score} findings=${selfReview.findings.length}`,
    };
  }

  if (result.exitCode !== 0) {
    return {
      status: 'failed',
      error: `run exited with code ${result.exitCode}`,
    };
  }

  return { status: 'completed' };
}

function createCapabilityTaskExecutor(parsed: ParsedArgs): AgentTaskExecutor {
  return async (task) => {
    const result = await runAgentPrompt({
      cwd: resolve(parsed.workspace ?? process.cwd()),
      configPath: parsed.config,
      env: process.env,
      prompt: task.prompt,
      mode: 'work',
      sessionId: task.sessionId,
      cli: {
        ...(parsed.provider ? { provider: parsed.provider } : {}),
        ...(parsed.model ? { model: parsed.model } : {}),
        ...(parsed.approval ? { approvalMode: parsed.approval } : {}),
      },
    });
    const status = taskExecutorStatusFromRun(result);
    return {
      ...status,
      output: result.doneContent ?? '',
      sessionId: result.sessionId,
      usage: result.usage,
    };
  };
}

function stamp(date: Date) {
  return date.toISOString().replace(/[-:.]/g, '');
}

function npmSpawnCommand(args: string[]) {
  return process.platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', 'npm', ...args] }
    : { command: 'npm', args };
}

function delay(ms: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function maxElapsedMs(parsed: ParsedArgs) {
  return parsed.maxCycleMinutes === undefined ? undefined : Math.ceil(parsed.maxCycleMinutes * 60_000);
}

function remainingNextTaskLimit(parsed: ParsedArgs, ranNextTasks: number) {
  if (parsed.maxNextTasks === undefined) return parsed.nextLimit;
  return Math.max(0, Math.min(parsed.nextLimit, parsed.maxNextTasks - ranNextTasks));
}

function emptyUsage(): CapabilityLoopUsageSummary {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
}

function emptyCapabilityBacklog(now = new Date()) {
  return {
    kind: 'capability-scenario-backlog' as const,
    updatedAt: now.toISOString(),
    candidates: [],
  };
}

function addUsage(target: CapabilityLoopUsageSummary, usage: CapabilityLoopUsageSummary | undefined) {
  if (!usage) return;
  target.inputTokens += usage.inputTokens;
  target.outputTokens += usage.outputTokens;
  target.totalTokens += usage.totalTokens;
}

function addRunUsage(
  target: CapabilityLoopUsageSummary,
  runs: Array<{ agentTask: { usage?: CapabilityLoopUsageSummary } }>,
) {
  for (const run of runs) addUsage(target, run.agentTask.usage);
}

function addEvalUsageFromReport(
  totalUsage: CapabilityLoopUsageSummary,
  evalUsage: CapabilityLoopUsageSummary,
  report: CapabilityEvalReport,
) {
  const usage = capabilityLoopUsageFromEvalReport(report);
  addUsage(evalUsage, usage);
  addUsage(totalUsage, usage);
}

function estimatedCostUsd(parsed: ParsedArgs, usage: CapabilityLoopUsageSummary) {
  if (parsed.inputTokenUsdPer1m === undefined && parsed.outputTokenUsdPer1m === undefined) return undefined;
  return (
    (usage.inputTokens / 1_000_000) * (parsed.inputTokenUsdPer1m ?? 0) +
    (usage.outputTokens / 1_000_000) * (parsed.outputTokenUsdPer1m ?? 0)
  );
}

function signedFixed(value: number | undefined) {
  if (value === undefined) return 'n/a';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

function normalizeFailureType(failure: string) {
  return failure
    .replace(/^run degradation:\s*/i, '')
    .replace(/^verification status:\s*/i, 'verification_status:')
    .replace(/^tool failed:\s*/i, 'tool_failed:')
    .replace(/^self-review\s+[^:]+:\s*/i, 'self_review:')
    .trim();
}

function remainingFailureTypes(backlog: CapabilityScenarioBacklog | undefined) {
  const failures = new Set<string>();
  for (const candidate of backlog?.candidates ?? []) {
    if (candidate.status === 'ignored') continue;
    for (const failure of candidate.failures) {
      const normalized = normalizeFailureType(failure);
      if (normalized) failures.add(normalized);
    }
  }
  return Array.from(failures).sort((left, right) => left.localeCompare(right));
}

function commandArg(value: string) {
  return /[\s"]/u.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

function recommendedLearnCommand(parsed: ParsedArgs, summaryOutPath: string) {
  return [
    'npm',
    'run',
    'capability:learn',
    '--',
    ...(parsed.workspace ? ['--workspace', commandArg(parsed.workspace)] : []),
    ...(parsed.provider ? ['--provider', parsed.provider] : []),
    ...(parsed.model ? ['--model', commandArg(parsed.model)] : []),
    '--summary-out',
    commandArg(summaryOutPath),
    '--next-limit',
    String(parsed.nextLimit),
    ...(parsed.maxNextTasks !== undefined ? ['--max-next-tasks', String(parsed.maxNextTasks)] : []),
  ].join(' ');
}

function markdownTableCell(value: string | number | undefined) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}

async function approveNextCapabilityCycle(cycle: number, cycleLimit: number) {
  if (!process.stdin.isTTY) return false;
  const reader = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    const answer = await reader.question(`capability-loop: continue after cycle ${cycle}/${cycleLimit}? [y/N] `);
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  } finally {
    reader.close();
  }
}

async function readReport(path: string): Promise<CapabilityEvalReport | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as CapabilityEvalReport;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function readRunReportObjects(
  dir: string,
  maxItems: number,
): Promise<Array<{ fileName: string; report: Record<string, unknown> }>> {
  let files;
  try {
    files = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }

  const reports = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith('.json'))
      .map(async (file) => {
        try {
          const report = JSON.parse(await readFile(resolve(dir, file.name), 'utf8')) as unknown;
          return isRecord(report) ? { fileName: file.name, report } : undefined;
        } catch {
          return undefined;
        }
      }),
  );

  return reports
    .filter((entry): entry is { fileName: string; report: Record<string, unknown> } => Boolean(entry))
    .sort(
      (left, right) =>
        (optionalString(right.report.createdAt) ?? '').localeCompare(optionalString(left.report.createdAt) ?? '') ||
        right.fileName.localeCompare(left.fileName),
    )
    .slice(0, Math.max(1, maxItems));
}

async function readRunReports(dir: string, maxItems: number): Promise<CapabilityImprovementRunReportInput[]> {
  const reports = await readRunReportObjects(dir, maxItems);
  return reports
    .map(({ report }) => report as CapabilityImprovementRunReportInput)
    .filter((report): report is CapabilityImprovementRunReportInput =>
      Boolean(
        report.sessionId &&
          report.createdAt &&
          report.selfReview &&
          Array.isArray(report.selfReview.findings) &&
          Array.isArray(report.selfReview.nextActions),
      ),
    );
}

async function readSessionPrompt(sessionsDir: string, sessionId: string) {
  try {
    const raw = await readFile(resolve(sessionsDir, `${sessionId}.jsonl`), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let record: unknown;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (!isRecord(record) || record.type !== 'user_message' || !isRecord(record.message)) continue;
      const content = optionalString(record.message.content);
      if (content) return content;
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
  return undefined;
}

async function readFailedRunReportLearningEntries(runReportsDir: string, sessionsDir: string, maxItems: number) {
  const records = await readRunReportObjects(runReportsDir, maxItems);
  return await Promise.all(
    records.map(async ({ fileName, report }) => {
      const sessionId = optionalString(report.sessionId);
      return {
        fileName,
        report,
        ...(sessionId ? { prompt: await readSessionPrompt(sessionsDir, sessionId) } : {}),
      };
    }),
  );
}

async function writeAcceptedCapabilityScenarios(path: string, backlog: CapabilityScenarioBacklog) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(acceptedCapabilityScenarios(backlog), null, 2)}\n`, 'utf8');
}

async function runEvalOnce(parsed: ParsedArgs, iteration: number): Promise<EvalRunResult> {
  const reportDir = resolve(parsed.reportDir ?? resolve(resolveXenesisHome(), 'reports'));
  await mkdir(reportDir, { recursive: true });
  const reportPath = resolve(reportDir, `capability-loop-${stamp(new Date())}-${iteration}.json`);
  const evalArgs = [
    '--prefix',
    packageRoot(),
    'run',
    'capability:eval',
    '--',
    '--report',
    reportPath,
    '--timeout-ms',
    String(parsed.timeoutMs),
    ...(parsed.workspace ? ['--workspace', parsed.workspace] : []),
    ...(parsed.provider ? ['--provider', parsed.provider] : []),
    ...(parsed.model ? ['--model', parsed.model] : []),
    ...(parsed.approval ? ['--approval', parsed.approval] : []),
    ...(parsed.maxScenarios !== undefined ? ['--max-scenarios', String(parsed.maxScenarios)] : []),
    ...parsed.scenarios.flatMap((scenario) => ['--scenario', scenario]),
  ];

  const spawned = npmSpawnCommand(evalArgs);
  return await new Promise<EvalRunResult>((resolveRun) => {
    const child = spawn(spawned.command, spawned.args, {
      cwd: packageRoot(),
      env: process.env,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', async (error) => {
      resolveRun({
        exitCode: 1,
        stdout,
        stderr: `${stderr}${stderr ? '\n' : ''}${error.message}`,
        reportPath,
        report: await readReport(reportPath),
      });
    });
    child.on('exit', async (code) => {
      resolveRun({
        exitCode: code ?? 1,
        stdout,
        stderr,
        reportPath,
        report: await readReport(reportPath),
      });
    });
  });
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const loopStartedAt = Date.now();
  const backlogPath = resolve(
    parsed.backlog ?? resolve(resolveXenesisHome(), 'reports', 'capability-scenario-backlog.json'),
  );
  let backlog = await readCapabilityScenarioBacklog(backlogPath);
  if (!backlog && parsed.fromRunReports) {
    backlog = emptyCapabilityBacklog();
    await writeCapabilityScenarioBacklog(backlogPath, backlog);
  }
  const runs: EvalRunResult[] = [];
  let improvement: Awaited<ReturnType<typeof completeCapabilityImprovementLoop>> | undefined;
  let recoveredTaskCount = 0;
  let skippedRecoveryCount = 0;
  let rerunTaskCount = 0;
  let runIteration = 1;
  const loopUsage = emptyUsage();
  let improvementPaths:
    | {
        report: string;
        tasks: string;
        results: string;
        agentTasks: string;
      }
    | undefined;
  const loopReportPath = resolve(parsed.loopReport ?? defaultLoopReportPath());
  const evalUsage = emptyUsage();
  const taskUsage = emptyUsage();
  let runReportIntake:
    | {
        acceptedOut: string;
        imported: number;
        skipped: number;
        accepted: number;
      }
    | undefined;
  let loopReport = buildCapabilityLoopReport({
    mode: capabilityLoopMode(parsed),
    evalRuns: [],
    backlogPath,
    candidates: backlog?.candidates.length ?? 0,
    recoveredTaskCount: 0,
    skippedRecoveryCount: 0,
    rerunTaskCount: 0,
    maxPolicyImpactReworkAttempts: parsed.maxPolicyImpactReworkAttempts,
  });
  const nextTasksSummary: {
    selected: string[];
    readinessSteering: Array<{
      taskId: string;
      readinessId: string;
      status: string;
      score: number;
    }>;
    skipped: number;
    queued: string[];
    queueSkipped: number;
    ran: number;
    runSkipped: number;
  } = {
    selected: [],
    readinessSteering: [],
    skipped: 0,
    queued: [],
    queueSkipped: 0,
    ran: 0,
    runSkipped: 0,
  };
  let hasNextTasksSummary = false;
  const cycleProgress: ReturnType<typeof evaluateCapabilityLoopCycleProgress>[] = [];

  for (let cycle = 1; cycle <= parsed.cycleLimit; cycle += 1) {
    const cycleRunStart = runs.length;
    if (parsed.fromRunReports) {
      if (!parsed.json) {
        console.error(`capability-loop: cycle ${cycle}/${parsed.cycleLimit} using run reports only`);
      }
    } else {
      for (let iteration = 1; iteration <= parsed.iterations; iteration += 1) {
        if (!parsed.json) {
          console.error(`capability-loop: cycle ${cycle}/${parsed.cycleLimit} run ${iteration}/${parsed.iterations}`);
        }
        const run = await runEvalOnce(parsed, runIteration);
        runIteration += 1;
        runs.push(run);
        if (!run.report) {
          console.error(`capability-loop: report not found or unreadable: ${run.reportPath}`);
        } else {
          addEvalUsageFromReport(loopUsage, evalUsage, run.report);
          backlog = promoteCapabilityFailures({ report: run.report, existing: backlog });
          await writeCapabilityScenarioBacklog(backlogPath, backlog);
        }
        if (iteration < parsed.iterations && parsed.intervalMs > 0) await delay(parsed.intervalMs);
      }
    }

    const preTaskElapsedLimitMs = maxElapsedMs(parsed);
    const preTaskEstimatedCostUsd = estimatedCostUsd(parsed, loopUsage);
    const preTaskSafetyStopReason = evaluateCapabilityLoopSafetyBudget({
      elapsedMs: Date.now() - loopStartedAt,
      ...(preTaskElapsedLimitMs !== undefined ? { maxElapsedMs: preTaskElapsedLimitMs } : {}),
      usage: { ...loopUsage },
      ...(parsed.maxCycleInputTokens !== undefined ? { maxInputTokens: parsed.maxCycleInputTokens } : {}),
      ...(parsed.maxCycleOutputTokens !== undefined ? { maxOutputTokens: parsed.maxCycleOutputTokens } : {}),
      ...(parsed.maxCycleTotalTokens !== undefined ? { maxTotalTokens: parsed.maxCycleTotalTokens } : {}),
      ...(preTaskEstimatedCostUsd !== undefined ? { estimatedCostUsd: preTaskEstimatedCostUsd } : {}),
      ...(parsed.maxCycleCostUsd !== undefined ? { maxCostUsd: parsed.maxCycleCostUsd } : {}),
    });
    let cycleRunReports: CapabilityImprovementRunReportInput[] = [];

    if (!preTaskSafetyStopReason && parsed.autoImprove && backlog) {
      const improvementReportPath = resolve(parsed.improveOut ?? defaultImprovementReportPath());
      const improvementTasksPath = resolve(parsed.tasksOut ?? defaultImprovementTasksPath());
      const improvementResultsPath = resolve(parsed.results ?? defaultImprovementResultsPath());
      const runReportsPath = resolve(parsed.runReports ?? defaultRunReportsPath());
      const sessionsPath = resolve(parsed.sessions ?? defaultSessionsPath());
      const acceptedOutPath = resolve(parsed.acceptedOut ?? defaultAcceptedScenariosPath());
      const agentTasksPath = resolve(parsed.agentTasks ?? defaultAgentTasksPath());
      const store = createAgentTaskStore(agentTasksPath);
      const existingTaskBacklog =
        improvement?.taskBacklog ?? (await readCapabilityImprovementTaskBacklog(improvementTasksPath));
      const existingTaskResults =
        improvement?.taskResults ?? (await readCapabilityImprovementTaskResults(improvementResultsPath));
      cycleRunReports = await readRunReports(runReportsPath, parsed.maxRunReports);
      if (parsed.fromRunReports) {
        const intake = promoteFailedRunReportsToCapabilityScenarios({
          entries: await readFailedRunReportLearningEntries(runReportsPath, sessionsPath, parsed.maxRunReports),
          ...(backlog ? { existing: backlog } : {}),
          status: 'accepted',
        });
        backlog = intake.backlog;
        await writeCapabilityScenarioBacklog(backlogPath, backlog);
        await writeAcceptedCapabilityScenarios(acceptedOutPath, backlog);
        runReportIntake = {
          acceptedOut: acceptedOutPath,
          imported: (runReportIntake?.imported ?? 0) + intake.imported,
          skipped: (runReportIntake?.skipped ?? 0) + intake.skipped,
          accepted: intake.accepted,
        };
      }
      improvementPaths = {
        report: improvementReportPath,
        tasks: improvementTasksPath,
        results: improvementResultsPath,
        agentTasks: agentTasksPath,
      };

      improvement = await completeCapabilityImprovementLoop({
        backlog,
        ...(existingTaskBacklog ? { taskBacklog: existingTaskBacklog } : {}),
        ...(existingTaskResults ? { taskResults: existingTaskResults } : {}),
        ...(cycleRunReports.length > 0 ? { runReports: cycleRunReports } : {}),
        store,
        recoverFailed: parsed.recoverFailed,
        recoveryMode: parsed.recoveryMode,
        autoFollowUpAfterFailures: parsed.autoFollowUpAfterFailures,
        runRecovered: parsed.runRecovered,
        executor: createCapabilityTaskExecutor(parsed),
      });
      recoveredTaskCount += improvement.recovery?.recovered.length ?? 0;
      skippedRecoveryCount += improvement.recovery?.skipped.length ?? 0;
      rerunTaskCount += improvement.recoveredRuns.length;
      addRunUsage(taskUsage, improvement.recoveredRuns);
      addRunUsage(loopUsage, improvement.recoveredRuns);
      await writeCapabilityImprovementReport(improvementReportPath, improvement.report);
      await writeCapabilityImprovementTaskBacklog(improvementTasksPath, improvement.taskBacklog);
      if (improvement.taskResults) {
        await writeCapabilityImprovementTaskResults(improvementResultsPath, improvement.taskResults);
      }

      if (parsed.rerunAfterRecovery && improvement.recoveredRuns.length > 0) {
        if (!parsed.json) console.error(`capability-loop: cycle ${cycle}/${parsed.cycleLimit} recovery rerun`);
        const run = await runEvalOnce(parsed, runIteration);
        runIteration += 1;
        runs.push(run);
        if (!run.report) {
          console.error(`capability-loop: report not found or unreadable: ${run.reportPath}`);
        } else {
          addEvalUsageFromReport(loopUsage, evalUsage, run.report);
          backlog = promoteCapabilityFailures({ report: run.report, existing: backlog });
          await writeCapabilityScenarioBacklog(backlogPath, backlog);
          improvement = await completeCapabilityImprovementLoop({
            backlog,
            taskBacklog: improvement.taskBacklog,
            ...(improvement.taskResults ? { taskResults: improvement.taskResults } : {}),
            ...(cycleRunReports.length > 0 ? { runReports: cycleRunReports } : {}),
          });
          await writeCapabilityImprovementReport(improvementReportPath, improvement.report);
          await writeCapabilityImprovementTaskBacklog(improvementTasksPath, improvement.taskBacklog);
        }
      }
    }

    loopReport = buildCapabilityLoopReport({
      mode: capabilityLoopMode(parsed),
      evalRuns: runs.map(evalRunSummary),
      backlogPath,
      candidates: backlog?.candidates.length ?? 0,
      ...(improvementPaths ? { improvementPaths } : {}),
      ...(improvement ? { improvement } : {}),
      recoveredTaskCount,
      skippedRecoveryCount,
      rerunTaskCount,
      maxPolicyImpactReworkAttempts: parsed.maxPolicyImpactReworkAttempts,
    });

    let cycleSelected = 0;
    let cycleQueued = 0;
    let cycleRan = 0;
    let cycleRunSkipped = 0;

    if (!preTaskSafetyStopReason && parsed.selectNext && improvement) {
      hasNextTasksSummary = true;
      const cycleNextLimit = remainingNextTaskLimit(parsed, nextTasksSummary.ran);
      const selection =
        cycleNextLimit > 0
          ? selectCapabilityLoopNextTasks({
              report: loopReport,
              taskBacklog: improvement.taskBacklog,
              limit: cycleNextLimit,
              selfReviewCooldownMs: parsed.selfReviewCooldownMs,
              failurePatternCooldownMs: parsed.failurePatternCooldownMs,
            })
          : {
              kind: 'capability-loop-next-tasks' as const,
              createdAt: new Date().toISOString(),
              limit: 0,
              selected: [],
              skipped: [],
            };
      cycleSelected = selection.selected.length;
      nextTasksSummary.selected.push(...selection.selected.map((task) => task.taskId));
      nextTasksSummary.readinessSteering.push(
        ...selection.selected
          .filter((task) => task.readinessId && task.readinessStatus && task.readinessScore !== undefined)
          .map((task) => ({
            taskId: task.taskId,
            readinessId: task.readinessId!,
            status: task.readinessStatus!,
            score: task.readinessScore!,
          })),
      );
      nextTasksSummary.skipped += selection.skipped.length;

      if (parsed.queueNext && selection.selected.length > 0) {
        const agentTasksPath = improvementPaths?.agentTasks ?? resolve(parsed.agentTasks ?? defaultAgentTasksPath());
        const store = createAgentTaskStore(agentTasksPath);
        const queued = await queueCapabilityLoopNextTasks({
          selection,
          taskBacklog: improvement.taskBacklog,
          store,
        });
        improvement = {
          ...improvement,
          taskBacklog: queued.taskBacklog,
        };
        cycleQueued = queued.queued.length;
        nextTasksSummary.queued.push(...queued.queued.map((task) => task.agentTaskId));
        nextTasksSummary.queueSkipped += queued.skipped.length;

        if (parsed.runNext && queued.queued.length > 0 && backlog) {
          const executed = await runCapabilityLoopNextTasks({
            backlog,
            taskBacklog: queued.taskBacklog,
            queued: queued.queued,
            ...(improvement.taskResults ? { results: improvement.taskResults } : {}),
            ...(cycleRunReports.length > 0 ? { runReports: cycleRunReports } : {}),
            store,
            executor: createCapabilityTaskExecutor(parsed),
          });
          improvement = {
            ...improvement,
            report: executed.report,
            taskBacklog: executed.taskBacklog,
            ...(executed.taskResults ? { taskResults: executed.taskResults } : {}),
          };
          cycleRan = executed.runs.length;
          cycleRunSkipped = executed.skipped.length;
          addRunUsage(taskUsage, executed.runs);
          addRunUsage(loopUsage, executed.runs);
          nextTasksSummary.ran += cycleRan;
          nextTasksSummary.runSkipped += cycleRunSkipped;
        }

        if (improvementPaths) {
          await writeCapabilityImprovementReport(improvementPaths.report, improvement.report);
          await writeCapabilityImprovementTaskBacklog(improvementPaths.tasks, improvement.taskBacklog);
          if (improvement.taskResults) {
            await writeCapabilityImprovementTaskResults(improvementPaths.results, improvement.taskResults);
          }
        }
      }
    }

    loopReport = buildCapabilityLoopReport({
      mode: capabilityLoopMode(parsed),
      evalRuns: runs.map(evalRunSummary),
      backlogPath,
      candidates: backlog?.candidates.length ?? 0,
      ...(improvementPaths ? { improvementPaths } : {}),
      ...(improvement ? { improvement } : {}),
      recoveredTaskCount,
      skippedRecoveryCount,
      rerunTaskCount,
      maxPolicyImpactReworkAttempts: parsed.maxPolicyImpactReworkAttempts,
    });
    await writeCapabilityLoopReport(loopReportPath, loopReport);

    const cycleRuns = runs.slice(cycleRunStart);
    const elapsedLimitMs = maxElapsedMs(parsed);
    const cycleEstimatedCostUsd = estimatedCostUsd(parsed, loopUsage);
    const progress = evaluateCapabilityLoopCycleProgress({
      cycle,
      cycleLimit: parsed.cycleLimit,
      evalRuns: cycleRuns.length,
      missingReports: cycleRuns.filter((run) => !run.report).length,
      selectedNextTasks: cycleSelected,
      queuedNextTasks: cycleQueued,
      ranNextTasks: cycleRan,
      runSkipped: cycleRunSkipped,
      completedRecommendations: improvement?.report.execution.completedRecommendations ?? 0,
      remainingRecommendations: improvement?.report.execution.remainingRecommendationIds.length ?? 0,
      totalRanNextTasks: nextTasksSummary.ran,
      ...(parsed.maxNextTasks !== undefined ? { maxRanNextTasks: parsed.maxNextTasks } : {}),
      elapsedMs: Date.now() - loopStartedAt,
      ...(elapsedLimitMs !== undefined ? { maxElapsedMs: elapsedLimitMs } : {}),
      usage: { ...loopUsage },
      ...(parsed.maxCycleInputTokens !== undefined ? { maxInputTokens: parsed.maxCycleInputTokens } : {}),
      ...(parsed.maxCycleOutputTokens !== undefined ? { maxOutputTokens: parsed.maxCycleOutputTokens } : {}),
      ...(parsed.maxCycleTotalTokens !== undefined ? { maxTotalTokens: parsed.maxCycleTotalTokens } : {}),
      ...(cycleEstimatedCostUsd !== undefined ? { estimatedCostUsd: cycleEstimatedCostUsd } : {}),
      ...(parsed.maxCycleCostUsd !== undefined ? { maxCostUsd: parsed.maxCycleCostUsd } : {}),
    });
    if (progress.continue && parsed.requireCycleApproval) {
      const approved = await approveNextCapabilityCycle(cycle, parsed.cycleLimit);
      if (!approved) {
        progress.continue = false;
        progress.stopReason = 'cycle-approval-declined';
      }
    }
    cycleProgress.push(progress);
    if (!progress.continue) break;
  }

  const safety = {
    ...(parsed.maxCycleMinutes !== undefined ? { maxCycleMinutes: parsed.maxCycleMinutes } : {}),
    ...(parsed.maxNextTasks !== undefined ? { maxNextTasks: parsed.maxNextTasks } : {}),
    selfReviewCooldownMs: parsed.selfReviewCooldownMs,
    failurePatternCooldownMs: parsed.failurePatternCooldownMs,
    ...(parsed.autoFollowUpAfterFailures !== undefined
      ? { autoFollowUpAfterFailures: parsed.autoFollowUpAfterFailures }
      : {}),
    ...(parsed.maxCycleInputTokens !== undefined ? { maxCycleInputTokens: parsed.maxCycleInputTokens } : {}),
    ...(parsed.maxCycleOutputTokens !== undefined ? { maxCycleOutputTokens: parsed.maxCycleOutputTokens } : {}),
    ...(parsed.maxCycleTotalTokens !== undefined ? { maxCycleTotalTokens: parsed.maxCycleTotalTokens } : {}),
    ...(parsed.maxCycleCostUsd !== undefined ? { maxCycleCostUsd: parsed.maxCycleCostUsd } : {}),
    ...(parsed.inputTokenUsdPer1m !== undefined ? { inputTokenUsdPer1m: parsed.inputTokenUsdPer1m } : {}),
    ...(parsed.outputTokenUsdPer1m !== undefined ? { outputTokenUsdPer1m: parsed.outputTokenUsdPer1m } : {}),
    maxPolicyImpactReworkAttempts: parsed.maxPolicyImpactReworkAttempts,
    requireCycleApproval: parsed.requireCycleApproval,
  };
  const finalEstimatedCostUsd = estimatedCostUsd(parsed, loopUsage);

  const summary = {
    kind: 'capability-loop',
    runs: runs.length,
    failedRuns: runs.filter((run) => run.exitCode !== 0).length,
    reports: runs.map((run) => run.reportPath),
    backlog: backlogPath,
    loopReport: loopReportPath,
    candidates: backlog?.candidates.length ?? 0,
    runReportIntake,
    improvement: improvement
      ? {
          report: improvementPaths?.report,
          tasks: improvementPaths?.tasks,
          results: improvementPaths?.results,
          agentTasks: improvementPaths?.agentTasks,
          recommendations: improvement.report.execution.totalRecommendations,
          completedRecommendations: improvement.report.execution.completedRecommendations,
          failedRecommendations: improvement.report.execution.failedRecommendations,
          remainingRecommendations: improvement.report.execution.remainingRecommendationIds.length,
          recoveredTasks: recoveredTaskCount,
          skippedRecoveries: skippedRecoveryCount,
          rerunTasks: rerunTaskCount,
        }
      : undefined,
    policyImpact: loopReport.policyImpact,
    policyImpactDecisions: loopReport.policyImpactDecisions,
    capabilityReadiness: loopReport.capabilityReadiness,
    nextTasks: hasNextTasksSummary ? nextTasksSummary : undefined,
    usage: {
      ...loopUsage,
      ...(finalEstimatedCostUsd !== undefined ? { estimatedCostUsd: finalEstimatedCostUsd } : {}),
    },
    usageBreakdown: {
      eval: evalUsage,
      tasks: taskUsage,
    },
    safety,
    cycles: {
      limit: parsed.cycleLimit,
      completed: cycleProgress.length,
      stopReason: cycleProgress.at(-1)?.stopReason,
      progress: cycleProgress,
    },
  };

  if (parsed.summaryOut) {
    const summaryOutPath = resolve(parsed.summaryOut);
    const failureTypes = remainingFailureTypes(backlog);
    const nextCommand = recommendedLearnCommand(parsed, summaryOutPath);
    const previewCandidates = improvement
      ? selectCapabilityLoopNextTasks({
          report: loopReport,
          taskBacklog: improvement.taskBacklog,
          limit: 3,
          selfReviewCooldownMs: parsed.selfReviewCooldownMs,
          failurePatternCooldownMs: parsed.failurePatternCooldownMs,
        }).selected
      : [];
    const lines = [
      '# Capability Learn Summary',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Mode: ${summary.kind}`,
      '',
      '## Run Report Intake',
      `Imported run reports: ${summary.runReportIntake?.imported ?? 0}`,
      `Skipped run reports: ${summary.runReportIntake?.skipped ?? 0}`,
      `Accepted scenarios: ${summary.runReportIntake?.accepted ?? 0}`,
      `Accepted scenarios file: ${summary.runReportIntake?.acceptedOut ?? 'none'}`,
      '',
      '## Loop',
      `Eval runs: ${summary.runs}`,
      `Failed eval runs: ${summary.failedRuns}`,
      `Backlog candidates: ${summary.candidates}`,
      `Backlog file: ${summary.backlog}`,
      `Loop report file: ${summary.loopReport}`,
      `Cycles: ${summary.cycles.completed}/${summary.cycles.limit}`,
      `Stop reason: ${summary.cycles.stopReason ?? 'none'}`,
      '',
      '## Improvement',
      `Recommendations: ${summary.improvement?.recommendations ?? 0}`,
      `Completed recommendations: ${summary.improvement?.completedRecommendations ?? 0}`,
      `Failed recommendations: ${summary.improvement?.failedRecommendations ?? 0}`,
      `Remaining recommendations: ${summary.improvement?.remainingRecommendations ?? 0}`,
      `Recovered tasks: ${summary.improvement?.recoveredTasks ?? 0}`,
      `Rerun tasks: ${summary.improvement?.rerunTasks ?? 0}`,
      '',
      '## Capability Gains',
      `Completed recommendation coverage: ${summary.improvement?.completedRecommendations ?? 0}/${summary.improvement?.recommendations ?? 0}`,
      `Completed next-task runs: ${summary.nextTasks?.ran ?? 0}`,
      `Closed failure scenarios now tracked: ${summary.runReportIntake?.accepted ?? 0}`,
      '',
      '## Remaining Failure Types',
      ...(failureTypes.length > 0 ? failureTypes.slice(0, 12).map((failure) => `- ${failure}`) : ['none']),
      '',
      '## Next Tasks',
      `Selected next tasks: ${summary.nextTasks?.selected.length ?? 0}`,
      `Queued next tasks: ${summary.nextTasks?.queued.length ?? 0}`,
      `Ran next tasks: ${summary.nextTasks?.ran ?? 0}`,
      `Skipped next tasks: ${summary.nextTasks?.skipped ?? 0}`,
      ...(summary.nextTasks?.selected.length ? ['', ...summary.nextTasks.selected.map((taskId) => `- ${taskId}`)] : []),
      '',
      '## Next Task Candidates',
      ...(previewCandidates.length > 0
        ? [
            '| Rank | Task | Priority | Area | Reason |',
            '| --- | --- | --- | --- | --- |',
            ...previewCandidates
              .map((task, index) =>
                [
                  index + 1,
                  markdownTableCell(task.taskId),
                  markdownTableCell(task.priority),
                  markdownTableCell(task.area),
                  markdownTableCell(task.reason),
                ].join(' | '),
              )
              .map((row) => `| ${row} |`),
          ]
        : ['none']),
      '',
      '## Usage',
      `Input tokens: ${summary.usage.inputTokens}`,
      `Output tokens: ${summary.usage.outputTokens}`,
      `Total tokens: ${summary.usage.totalTokens}`,
      `Estimated cost USD: ${summary.usage.estimatedCostUsd ?? 'unknown'}`,
      '',
      '## Recommended Next Command',
      '```powershell',
      nextCommand,
      '```',
      '',
      '## Next Actions',
      summary.nextTasks && summary.nextTasks.ran > 0
        ? 'Review the generated task results and run the capability loop again after making any manual changes.'
        : 'Review the backlog and select the next capability task when ready.',
    ];
    await mkdir(dirname(summaryOutPath), { recursive: true });
    await writeFile(summaryOutPath, `${lines.join('\n')}\n`, 'utf8');
    if (!parsed.json) console.log(`capability-loop: summary ${summaryOutPath}`);
  }

  if (parsed.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`capability-loop: runs ${summary.runs}`);
    console.log(`capability-loop: failed eval runs ${summary.failedRuns}`);
    console.log(`capability-loop: candidates ${summary.candidates}`);
    console.log(`capability-loop: backlog ${summary.backlog}`);
    console.log(`capability-loop: loop report ${summary.loopReport}`);
    console.log(
      [
        'capability-loop: cycles',
        `${summary.cycles.completed}/${summary.cycles.limit}`,
        `stop=${summary.cycles.stopReason ?? 'continue'}`,
      ].join(' '),
    );
    if (
      summary.safety.requireCycleApproval ||
      summary.safety.maxCycleMinutes !== undefined ||
      summary.safety.maxNextTasks !== undefined ||
      summary.safety.selfReviewCooldownMs !== undefined ||
      summary.safety.failurePatternCooldownMs !== undefined ||
      summary.safety.maxPolicyImpactReworkAttempts !== undefined ||
      summary.safety.autoFollowUpAfterFailures !== undefined ||
      summary.safety.maxCycleInputTokens !== undefined ||
      summary.safety.maxCycleOutputTokens !== undefined ||
      summary.safety.maxCycleTotalTokens !== undefined ||
      summary.safety.maxCycleCostUsd !== undefined
    ) {
      console.log(
        [
          'capability-loop: safety',
          `maxCycleMinutes=${summary.safety.maxCycleMinutes ?? 'none'}`,
          `maxNextTasks=${summary.safety.maxNextTasks ?? 'none'}`,
          `selfReviewCooldownMs=${summary.safety.selfReviewCooldownMs}`,
          `failurePatternCooldownMs=${summary.safety.failurePatternCooldownMs}`,
          `maxPolicyImpactReworks=${summary.safety.maxPolicyImpactReworkAttempts}`,
          `autoFollowUpAfterFailures=${summary.safety.autoFollowUpAfterFailures ?? 'none'}`,
          `maxInputTokens=${summary.safety.maxCycleInputTokens ?? 'none'}`,
          `maxOutputTokens=${summary.safety.maxCycleOutputTokens ?? 'none'}`,
          `maxTotalTokens=${summary.safety.maxCycleTotalTokens ?? 'none'}`,
          `maxCostUsd=${summary.safety.maxCycleCostUsd ?? 'none'}`,
          `requireCycleApproval=${summary.safety.requireCycleApproval}`,
        ].join(' '),
      );
    }
    console.log(
      [
        'capability-loop: usage',
        `inputTokens=${summary.usage.inputTokens}`,
        `outputTokens=${summary.usage.outputTokens}`,
        `totalTokens=${summary.usage.totalTokens}`,
        `estimatedCostUsd=${summary.usage.estimatedCostUsd ?? 'unknown'}`,
      ].join(' '),
    );
    console.log(
      [
        'capability-loop: usage breakdown',
        `eval=${summary.usageBreakdown.eval.totalTokens}`,
        `tasks=${summary.usageBreakdown.tasks.totalTokens}`,
      ].join(' '),
    );
    if (summary.improvement) {
      console.log(`capability-loop: improvement report ${summary.improvement.report}`);
      console.log(`capability-loop: improvement tasks ${summary.improvement.tasks}`);
      console.log(
        [
          'capability-loop: improvement summary',
          `recommendations=${summary.improvement.recommendations}`,
          `completed=${summary.improvement.completedRecommendations}`,
          `failed=${summary.improvement.failedRecommendations}`,
          `remaining=${summary.improvement.remainingRecommendations}`,
          `recovered=${summary.improvement.recoveredTasks}`,
          `rerunTasks=${summary.improvement.rerunTasks}`,
        ].join(' '),
      );
      if (summary.improvement.skippedRecoveries > 0) {
        console.log(`capability-loop: skipped recoveries ${summary.improvement.skippedRecoveries}`);
      }
    }
    if (summary.policyImpact && summary.policyImpact.completedTaskIds.length > 0) {
      console.log(
        [
          'capability-loop: policy impact',
          `areas=${summary.policyImpact.areas.join(',') || 'none'}`,
          `tasks=${summary.policyImpact.completedTaskIds.length}`,
          `latest=${summary.policyImpact.latestImpactAt ?? 'unknown'}`,
        ].join(' '),
      );
      for (const item of summary.policyImpact.effectiveness) {
        console.log(
          [
            'capability-loop: policy impact effectiveness',
            `area=${item.area}`,
            `status=${item.status}`,
            `before=${item.beforeRuns}`,
            `after=${item.afterRuns}`,
            `qualityScore=${signedFixed(item.qualityScoreDelta)}`,
            `toolPriorityMissedCount=${signedFixed(item.toolPriorityMissedCountDelta)}`,
            `verificationPassRate=${signedFixed(item.verificationPassRateDelta)}`,
            `repairAttemptCount=${signedFixed(item.repairAttemptCountDelta)}`,
          ].join(' '),
        );
      }
    }
    if (summary.policyImpactDecisions && summary.policyImpactDecisions.length > 0) {
      for (const item of summary.policyImpactDecisions) {
        console.log(
          [
            'capability-loop: policy impact decision',
            `area=${item.area}`,
            `status=${item.status}`,
            `action=${item.action}`,
            `reason=${JSON.stringify(item.reason)}`,
          ].join(' '),
        );
      }
    }
    for (const item of summary.capabilityReadiness) {
      console.log(
        [
          'capability-loop: readiness',
          `id=${item.id}`,
          `status=${item.status}`,
          `score=${item.score}`,
          `next=${JSON.stringify(item.nextAction)}`,
        ].join(' '),
      );
    }
    if (summary.nextTasks) {
      console.log(
        [
          'capability-loop: next tasks',
          `selected=${summary.nextTasks.selected.length}`,
          `queued=${summary.nextTasks.queued.length}`,
          `ran=${summary.nextTasks.ran}`,
          `skipped=${summary.nextTasks.skipped}`,
          `queueSkipped=${summary.nextTasks.queueSkipped}`,
          `runSkipped=${summary.nextTasks.runSkipped}`,
        ].join(' '),
      );
      for (const taskId of summary.nextTasks.selected) {
        console.log(`capability-loop: selected next task ${taskId}`);
      }
      for (const item of summary.nextTasks.readinessSteering) {
        console.log(
          [
            'capability-loop: readiness steered task',
            `task=${item.taskId}`,
            `readiness=${item.readinessId}`,
            `status=${item.status}`,
            `score=${item.score}`,
          ].join(' '),
        );
      }
      for (const agentTaskId of summary.nextTasks.queued) {
        console.log(`capability-loop: queued next task ${agentTaskId}`);
      }
    }
  }

  process.exitCode = runs.some((run) => !run.report) ? 1 : 0;
}

main().catch((error) => {
  console.error(`capability-loop: error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
