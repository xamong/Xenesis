import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { setTimeout as delay } from 'node:timers/promises';
import { type CliConfigOverrides, displayXenesisStatePath, loadConfig, xenesisStatePath } from '../config/index.js';
import type { AgentRunEvent } from '../core/events.js';
import { closeAllDatabases } from '../db/database.js';
import { type GatewayHandle, type GatewayRunCli, startGateway } from '../gateway/index.js';
import { type AgentTask, SqliteAgentTaskStore, TaskWorker } from '../orchestration/index.js';

export type ScenarioStatus = 'passed' | 'failed';

export interface ScenarioCliDiagnostic {
  kind: 'cli_run';
  argv: string[];
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

export type ScenarioDiagnostic = ScenarioCliDiagnostic;

export interface ScenarioResult {
  name: string;
  status: ScenarioStatus;
  durationMs: number;
  message: string;
  diagnostics?: ScenarioDiagnostic[];
}

export interface ScenarioReport {
  id: string;
  createdAt: string;
  workspace: string;
  configPath?: string;
  scenarioWorkspace: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    score: number;
  };
  exitCode: number;
  scenarios: ScenarioResult[];
}

export interface RunScenarioSuiteOptions {
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  cli?: CliConfigOverrides;
  runCli: GatewayRunCli;
  now?: () => Date;
}

export interface RunScenarioSuiteResult {
  exitCode: number;
  report: ScenarioReport;
  reportPath: string;
  lines: string[];
}

export interface ScenarioReportEntry {
  report: ScenarioReport;
  path: string;
}

interface CapturedCliRun {
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

interface ScenarioRuntimeOptions extends RunScenarioSuiteOptions {
  diagnostics?: ScenarioDiagnostic[];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function reportStamp(date: Date) {
  return date.toISOString().replace(/[-:.]/g, '');
}

function scenarioReportId(date: Date) {
  return `scenario-${reportStamp(date)}`;
}

function reportsDir(xenesisHome: string) {
  return xenesisStatePath(xenesisHome, 'reports');
}

function displayPath(xenesisHome: string, path: string) {
  return displayXenesisStatePath(xenesisHome, path);
}

function scenarioStatus(report: ScenarioReport) {
  return report.summary.failed === 0 ? 'passed' : 'failed';
}

function scenarioReportPathFromTarget(xenesisHome: string, target: string) {
  if (/[\\/]/.test(target)) return resolve(target);
  const fileName = target.endsWith('.json')
    ? target
    : `${target.startsWith('scenario-') ? target : `scenario-${target}`}.json`;
  return join(reportsDir(xenesisHome), fileName);
}

function formatArg(arg: string) {
  return /\s/.test(arg) ? JSON.stringify(arg) : arg;
}

function previewLines(label: 'stdout' | 'stderr', lines: string[]) {
  if (lines.length === 0) return [];
  const maxLines = 5;
  const rendered = lines.slice(0, maxLines).map((line) => `${label}: ${line}`);
  if (lines.length > maxLines) rendered.push(`${label}: ... (${lines.length - maxLines} more lines)`);
  return rendered;
}

function gatewayAuthHeaders(gateway: GatewayHandle, headers: Record<string, string> = {}) {
  if (!gateway.authToken) throw new Error('Gateway did not provide an auth token.');
  return {
    ...headers,
    authorization: `Bearer ${gateway.authToken}`,
  };
}

async function writeScenarioConfig(workspaceRoot: string) {
  const configPath = join(workspaceRoot, 'xenesis.config.json');
  await writeFile(
    configPath,
    JSON.stringify({
      provider: 'mock',
      model: 'scenario-mock',
      workspace: '.',
      maxTurns: 4,
      extensions: {
        memory: { enabled: true, path: '.xenesis/memory.json' },
      },
    }),
    'utf8',
  );
  return configPath;
}

async function captureCli(
  options: ScenarioRuntimeOptions,
  argv: string[],
  io: { stdin?: NodeJS.ReadableStream } = {},
): Promise<CapturedCliRun> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await options.runCli(argv, {
    cwd: options.cwd,
    env: options.env,
    stdin: io.stdin,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });
  options.diagnostics?.push({
    kind: 'cli_run',
    argv: [...argv],
    exitCode,
    stdout: [...stdout],
    stderr: [...stderr],
  });
  return { exitCode, stdout, stderr };
}

function expectExit(run: CapturedCliRun, description: string) {
  if (run.exitCode !== 0) {
    throw new Error(`${description} exited ${run.exitCode}: ${run.stderr.join('\n')}`);
  }
}

function expectOutput(run: CapturedCliRun, text: string, description: string) {
  if (!run.stdout.join('\n').includes(text)) {
    throw new Error(`${description} did not include expected output: ${text}`);
  }
}

function scenarioArgv(workspaceRoot: string, configPath: string, ...args: string[]) {
  return ['node', 'xenesis', '--cwd', workspaceRoot, '--config', configPath, ...args];
}

async function runScenario(
  name: string,
  fn: () => Promise<string>,
  diagnostics: ScenarioDiagnostic[] = [],
): Promise<ScenarioResult> {
  const startedAt = Date.now();
  try {
    return {
      name,
      status: 'passed',
      durationMs: Date.now() - startedAt,
      message: await fn(),
    };
  } catch (error) {
    return {
      name,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      message: errorMessage(error),
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  }
}

async function scenarioPlanWork(options: ScenarioRuntimeOptions, workspaceRoot: string, configPath: string) {
  const plan = await captureCli(
    options,
    scenarioArgv(workspaceRoot, configPath, 'plan', '--print', '--save-plan', 'Create a short implementation plan'),
  );
  expectExit(plan, 'plan');
  expectOutput(plan, 'plan: saved $XENESIS_HOME/plans/latest.txt', 'plan');

  const work = await captureCli(
    options,
    scenarioArgv(workspaceRoot, configPath, 'work', '--print', '--from-plan', 'mock:system'),
  );
  expectExit(work, 'work');
  expectOutput(work, 'Xenesis loaded plan:', 'work');
  return 'plan saved and work loaded it';
}

async function writeAgentLoopScenarioConfig(workspaceRoot: string) {
  await writeFile(
    join(workspaceRoot, 'xenesis.config.json'),
    JSON.stringify({
      provider: 'mock',
      model: 'scenario-mock',
      workspace: '.',
      maxTurns: 4,
      context: {
        autoCompact: true,
        compactAfterMessages: 2,
        compactKeepMessages: 2,
        maxToolResultChars: 40,
      },
      extensions: {
        memory: { enabled: true, path: '.xenesis/memory.json' },
        plugins: { paths: ['plugins/flaky'] },
      },
    }),
    'utf8',
  );
}

async function writeFlakyPlugin(workspaceRoot: string) {
  const pluginDir = join(workspaceRoot, 'plugins', 'flaky');
  await mkdir(pluginDir, { recursive: true });
  await writeFile(
    join(pluginDir, 'xenesis.plugin.json'),
    JSON.stringify({
      name: 'flaky-plugin',
      version: '0.1.0',
      tools: [
        {
          name: 'flaky_once',
          entry: './flaky.mjs',
          exportName: 'flakyOnceTool',
          description: 'Fails once and then succeeds',
        },
      ],
    }),
    'utf8',
  );
  await writeFile(
    join(pluginDir, 'flaky.mjs'),
    [
      'let attempts = 0;',
      '',
      'export const flakyOnceTool = {',
      "  name: 'flaky_once',",
      "  description: 'Fails once and then succeeds',",
      '  inputSchema: { safeParse(input) { return { success: true, data: input ?? {} }; } },',
      '  isReadOnly() { return true; },',
      '  async run() {',
      '    attempts += 1;',
      "    if (attempts === 1) return { ok: false, content: 'temporary failure' };",
      "    return { ok: true, content: 'recovered after retry' };",
      '  }',
      '};',
    ].join('\n'),
    'utf8',
  );
}

async function scenarioAgentLoopQuality(options: ScenarioRuntimeOptions, workspaceRoot: string, configPath: string) {
  await writeFlakyPlugin(workspaceRoot);
  await writeAgentLoopScenarioConfig(workspaceRoot);

  const retry = await captureCli(
    options,
    scenarioArgv(workspaceRoot, configPath, '--print', 'mock:tool:flaky_once:{}'),
  );
  expectExit(retry, 'agent loop tool retry');
  expectOutput(retry, 'recovered after retry', 'agent loop tool retry');
  expectOutput(retry, 'mock final: recovered after retry', 'agent loop tool retry');

  await writeFile(
    join(workspaceRoot, 'long-output.txt'),
    ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'xenesis-agent-loop-quality'].join('\n'),
    'utf8',
  );
  const longOutput = await captureCli(
    options,
    scenarioArgv(workspaceRoot, configPath, '--print', 'mock:tool:read:{"path":"long-output.txt"}'),
  );
  expectExit(longOutput, 'agent loop long output');
  expectOutput(longOutput, '[output truncated:', 'agent loop long output');
  expectOutput(longOutput, 'context compacted:', 'agent loop context compact');
  return 'tool retry, long output truncation, and context compact passed';
}

async function scenarioChatContext(options: ScenarioRuntimeOptions, workspaceRoot: string, configPath: string) {
  const run = await captureCli(options, scenarioArgv(workspaceRoot, configPath, 'chat', '--print'), {
    stdin: Readable.from(['first question\n', 'mock:messages\n', '/exit\n']),
  });
  expectExit(run, 'chat');
  expectOutput(run, 'user: first question', 'chat context');
  expectOutput(run, 'assistant: mock response: first question', 'chat context');
  return 'chat preserved session context';
}

async function scenarioMemoryContext(options: ScenarioRuntimeOptions, workspaceRoot: string, configPath: string) {
  const add = await captureCli(
    options,
    scenarioArgv(workspaceRoot, configPath, 'memory', 'add', 'project-goal', 'Build a general AI agent'),
  );
  expectExit(add, 'memory add');

  const run = await captureCli(options, scenarioArgv(workspaceRoot, configPath, '--print', 'mock:system agent'));
  expectExit(run, 'memory context');
  expectOutput(run, 'Xenesis relevant memory:', 'memory context');
  expectOutput(run, 'Build a general AI agent', 'memory context');
  return 'memory was injected into system context';
}

async function scenarioTaskLifecycle(options: ScenarioRuntimeOptions, workspaceRoot: string, configPath: string) {
  const start = await captureCli(options, scenarioArgv(workspaceRoot, configPath, 'tasks', 'start', 'mock:messages'));
  expectExit(start, 'task start');
  const taskId = start.stdout.join('\n').match(/task: queued ([A-Za-z0-9_.-]+)/)?.[1];
  if (!taskId) throw new Error('task start did not return a task id');

  const run = await captureCli(options, scenarioArgv(workspaceRoot, configPath, 'tasks', 'run', taskId, '--print'));
  expectExit(run, 'task run');
  expectOutput(run, `task: completed ${taskId}`, 'task run');

  const show = await captureCli(options, scenarioArgv(workspaceRoot, configPath, 'tasks', 'show', taskId));
  expectExit(show, 'task show');
  expectOutput(show, 'status: completed', 'task show');
  return 'task queued, ran, and completed';
}

async function scenarioGatewayIdeContext(options: RunScenarioSuiteOptions, workspaceRoot: string) {
  const gateway = await startGateway({
    cwd: workspaceRoot,
    env: options.env,
    port: 0,
    runCli: options.runCli,
  });

  try {
    const response = await fetch(`${gateway.url}/run`, {
      method: 'POST',
      headers: gatewayAuthHeaders(gateway, { 'content-type': 'application/json' }),
      body: JSON.stringify({
        prompt: 'mock:system',
        ideContext: {
          activeFile: 'src/app.ts',
          openFiles: [{ path: 'src/app.ts', languageId: 'typescript', text: 'export const value = 1;' }],
        },
      }),
    });
    const body = (await response.json()) as { exitCode?: number; events?: AgentRunEvent[]; errors?: string };
    if (response.status !== 200) throw new Error(`gateway /run returned ${response.status}`);
    if (body.exitCode !== 0) throw new Error(body.errors || `gateway /run exited ${body.exitCode}`);
    const content =
      body.events
        ?.filter(
          (event): event is Extract<AgentRunEvent, { type: 'assistant_message' }> => event.type === 'assistant_message',
        )
        .map((event) => event.message.content)
        .join('\n') ?? '';
    if (!content.includes('Xenesis IDE context:')) {
      throw new Error('gateway run did not inject IDE context');
    }
    return 'gateway accepted IDE context';
  } finally {
    await gateway.close();
  }
}

async function writeLongRunningHandoffConfig(workspaceRoot: string, options: { operationalFailures?: boolean } = {}) {
  await writeFile(
    join(workspaceRoot, 'xenesis.config.json'),
    JSON.stringify({
      provider: 'mock',
      model: 'scenario-mock',
      workspace: '.',
      maxTurns: 4,
      approvalMode: 'auto',
      ...(options.operationalFailures === false ? { context: { operationalFailures: { enabled: false } } } : {}),
      extensions: {
        memory: { enabled: true, path: '.xenesis/memory.json' },
      },
    }),
    'utf8',
  );
}

function handoffPrompt() {
  const toolInput = {
    title: 'Scenario long-running handoff',
    tasks: [
      { label: 'inspect', prompt: 'Inspect the workspace structure.' },
      { label: 'implement', prompt: 'Implement the required runtime change.', dependsOnLabels: ['inspect'] },
      { label: 'verify', prompt: 'Run verification and collect results.', dependsOnLabels: ['implement'] },
      { label: 'report', prompt: 'Summarize the outcome.', dependsOnLabels: ['verify'] },
    ],
  };
  return [
    'Audit the whole project, migrate the runtime path, verify the result, and report the outcome.',
    'This is broad, ordered work and should be split into durable background stages.',
    `mock:tool:task_handoff:${JSON.stringify(toolInput)}`,
  ].join('\n');
}

async function scenarioLongRunningHandoff(options: RunScenarioSuiteOptions, workspaceRoot: string) {
  await writeLongRunningHandoffConfig(workspaceRoot);
  const gateway = await startGateway({
    cwd: workspaceRoot,
    env: options.env,
    port: 0,
    runCli: options.runCli,
  });

  try {
    const response = await fetch(`${gateway.url}/run`, {
      method: 'POST',
      headers: gatewayAuthHeaders(gateway, { 'content-type': 'application/json' }),
      body: JSON.stringify({
        workflow: 'xenis',
        prompt: handoffPrompt(),
      }),
    });
    const body = (await response.json()) as {
      exitCode?: number;
      traceId?: string;
      output?: string;
      errors?: string;
    };
    if (response.status !== 200) throw new Error(`gateway /run returned ${response.status}`);
    if (body.exitCode !== 0) throw new Error(body.errors || `gateway /run exited ${body.exitCode}`);
    if (!body.traceId) throw new Error('gateway run did not return a trace id');
    if (!body.output?.includes('task handoff: queued 4 task(s)')) {
      throw new Error('gateway run did not queue handoff tasks');
    }

    const traceResponse = await fetch(`${gateway.url}/traces/${encodeURIComponent(body.traceId)}`, {
      headers: gatewayAuthHeaders(gateway),
    });
    const trace = (await traceResponse.json()) as {
      diagnostics?: {
        handoffCount?: number;
        handoffTaskCount?: number;
        handoffDependencyCount?: number;
      };
      runReports?: Array<{
        handoffs?: Array<{
          title?: string;
          taskCount?: number;
          dependencyCount?: number;
          dependencyLabelCount?: number;
          labels?: string[];
        }>;
        metrics?: {
          handoffUsed?: boolean;
          handoffCount?: number;
          handoffTaskCount?: number;
          handoffDependencyCount?: number;
        };
      }>;
    };
    if (traceResponse.status !== 200) throw new Error(`gateway trace returned ${traceResponse.status}`);
    if (trace.diagnostics?.handoffCount !== 1) throw new Error('trace diagnostics did not record handoffCount=1');
    if (trace.diagnostics?.handoffTaskCount !== 4)
      throw new Error('trace diagnostics did not record handoffTaskCount=4');
    if (trace.diagnostics?.handoffDependencyCount !== 3) {
      throw new Error('trace diagnostics did not record handoffDependencyCount=3');
    }

    const handoff = trace.runReports?.[0]?.handoffs?.[0];
    if (!handoff) throw new Error('trace run report did not include handoff summary');
    if (handoff.title !== 'Scenario long-running handoff') throw new Error('handoff title was not preserved');
    if (handoff.taskCount !== 4 || handoff.dependencyCount !== 3 || handoff.dependencyLabelCount !== 3) {
      throw new Error('handoff summary counts were not preserved');
    }
    if (handoff.labels?.join(',') !== 'inspect,implement,verify,report') {
      throw new Error('handoff labels were not preserved');
    }
    if (trace.runReports?.[0]?.metrics?.handoffUsed !== true) {
      throw new Error('run report metrics did not mark handoffUsed');
    }

    const statusResponse = await fetch(`${gateway.url}/status`, {
      headers: gatewayAuthHeaders(gateway),
    });
    const status = (await statusResponse.json()) as {
      quality?: {
        handoffRunCount?: number;
        handoffCount?: number;
        handoffTaskCount?: number;
        handoffDependencyCount?: number;
      };
    };
    if (statusResponse.status !== 200) throw new Error(`gateway status returned ${statusResponse.status}`);
    if (status.quality?.handoffRunCount !== 1) throw new Error('status quality did not record handoffRunCount=1');
    if (status.quality?.handoffCount !== 1) throw new Error('status quality did not record handoffCount=1');
    if (status.quality?.handoffTaskCount !== 4) throw new Error('status quality did not record handoffTaskCount=4');
    if (status.quality?.handoffDependencyCount !== 3) {
      throw new Error('status quality did not record handoffDependencyCount=3');
    }

    return 'handoff report, trace diagnostics, and status quality passed';
  } finally {
    await gateway.close();
  }
}

function handoffWorkerPrompt() {
  const toolInput = {
    title: 'Scenario handoff worker execution',
    tasks: [
      { label: 'prepare', prompt: 'Prepare worker inputs.' },
      { label: 'flaky', prompt: 'Complete after one transient worker failure.', dependsOnLabels: ['prepare'] },
      { label: 'broken', prompt: 'Fail after all worker retry attempts.' },
      { label: 'blocked', prompt: 'Wait behind the broken dependency.', dependsOnLabels: ['broken'] },
    ],
  };
  return [
    'Create a durable background handoff for worker execution testing.',
    `mock:tool:task_handoff:${JSON.stringify(toolInput)}`,
  ].join('\n');
}

function taskByLabel(tasks: AgentTask[]) {
  return new Map(tasks.filter((task) => task.label).map((task) => [task.label!, task]));
}

async function waitForWorkerIdle(worker: TaskWorker) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (worker.runningCount() === 0) return;
    await delay(5);
  }
  throw new Error('handoff worker did not become idle');
}

async function driveWorkerUntil(
  worker: TaskWorker,
  store: SqliteAgentTaskStore,
  done: (tasks: AgentTask[]) => boolean,
) {
  for (let tick = 0; tick < 12; tick += 1) {
    await worker.tick();
    await waitForWorkerIdle(worker);
    const tasks = await store.list();
    if (done(tasks)) return tasks;
  }
  throw new Error('handoff worker did not reach expected terminal state');
}

async function scenarioHandoffWorkerExecution(options: RunScenarioSuiteOptions, workspaceRoot: string) {
  await writeLongRunningHandoffConfig(workspaceRoot, { operationalFailures: false });
  const gateway = await startGateway({
    cwd: workspaceRoot,
    env: options.env,
    port: 0,
    runCli: options.runCli,
    worker: false,
  });

  try {
    const response = await fetch(`${gateway.url}/run`, {
      method: 'POST',
      headers: gatewayAuthHeaders(gateway, { 'content-type': 'application/json' }),
      body: JSON.stringify({
        workflow: 'xenis',
        prompt: handoffWorkerPrompt(),
      }),
    });
    const body = (await response.json()) as {
      exitCode?: number;
      traceId?: string;
      output?: string;
      errors?: string;
    };
    if (response.status !== 200) throw new Error(`gateway /run returned ${response.status}`);
    if (body.exitCode !== 0) throw new Error(body.errors || `gateway /run exited ${body.exitCode}`);
    if (!body.traceId) throw new Error('gateway run did not return a trace id');
    if (!body.output?.includes('task handoff: queued 4 task(s)')) {
      throw new Error('gateway run did not queue worker handoff tasks');
    }

    const xenesisHome = options.env?.XENESIS_HOME ?? join(workspaceRoot, '.xenesis');
    const store = new SqliteAgentTaskStore({ xenesisHome });
    const attempts = new Map<string, number>();
    const worker = new TaskWorker({
      taskStore: store,
      concurrency: 1,
      maxAttempts: 2,
      pollIntervalMs: 1000,
      executor: async (task) => {
        const nextAttempt = (attempts.get(task.id) ?? 0) + 1;
        attempts.set(task.id, nextAttempt);
        if (task.label === 'flaky' && nextAttempt === 1) {
          throw new Error('temporary worker failure');
        }
        if (task.label === 'broken') {
          throw new Error('planned worker failure');
        }
        return {
          output: `worker completed ${task.label ?? task.id}`,
          sessionId: `${task.id}-session`,
        };
      },
    });

    const finalTasks = await driveWorkerUntil(worker, store, (tasks) => {
      const byLabel = taskByLabel(tasks);
      return (
        byLabel.get('prepare')?.status === 'completed' &&
        byLabel.get('flaky')?.status === 'completed' &&
        byLabel.get('broken')?.status === 'failed' &&
        byLabel.get('blocked')?.status === 'blocked'
      );
    });
    const byLabel = taskByLabel(finalTasks);
    const prepare = byLabel.get('prepare');
    const flaky = byLabel.get('flaky');
    const broken = byLabel.get('broken');
    const blocked = byLabel.get('blocked');
    if (!prepare || !flaky || !broken || !blocked) throw new Error('worker handoff task labels were not preserved');
    if ((flaky.attempts ?? 0) !== 2) throw new Error('flaky handoff task was not retried once');
    if ((broken.attempts ?? 0) !== 2) throw new Error('broken handoff task did not exhaust retry attempts');
    if (!blocked.blockedBy?.includes(broken.id)) throw new Error('blocked task did not record failed dependency');

    const tasksResponse = await fetch(`${gateway.url}/tasks`, {
      headers: gatewayAuthHeaders(gateway),
    });
    const taskList = (await tasksResponse.json()) as { tasks?: AgentTask[] };
    if (tasksResponse.status !== 200) throw new Error(`gateway tasks returned ${tasksResponse.status}`);
    const gatewayTasks = taskByLabel(taskList.tasks ?? []);
    if (gatewayTasks.get('flaky')?.attempts !== 2) throw new Error('gateway tasks did not expose retry attempts');
    if (gatewayTasks.get('blocked')?.status !== 'blocked')
      throw new Error('gateway tasks did not expose blocked status');

    const traceResponse = await fetch(`${gateway.url}/traces/${encodeURIComponent(body.traceId)}`, {
      headers: gatewayAuthHeaders(gateway),
    });
    const trace = (await traceResponse.json()) as {
      diagnostics?: {
        taskExecution?: {
          taskCount?: number;
          handoffTaskCount?: number;
          completedCount?: number;
          failedCount?: number;
          blockedCount?: number;
          retriedCount?: number;
          handoffIds?: string[];
        };
      };
      tasks?: AgentTask[];
    };
    if (traceResponse.status !== 200) throw new Error(`gateway trace returned ${traceResponse.status}`);
    const execution = trace.diagnostics?.taskExecution;
    if (execution?.taskCount !== 4) throw new Error('trace did not attach four handoff worker tasks');
    if (execution.handoffTaskCount !== 4) throw new Error('trace did not count handoff worker tasks');
    if (execution.completedCount !== 2) throw new Error('trace did not count completed worker tasks');
    if (execution.failedCount !== 1) throw new Error('trace did not count failed worker task');
    if (execution.blockedCount !== 1) throw new Error('trace did not count blocked worker task');
    if (execution.retriedCount !== 2) throw new Error('trace did not count retried worker tasks');
    if ((trace.tasks ?? []).length !== 4) throw new Error('trace detail did not include handoff worker tasks');

    const statusResponse = await fetch(`${gateway.url}/status`, {
      headers: gatewayAuthHeaders(gateway),
    });
    const status = (await statusResponse.json()) as {
      tasks?: {
        total?: number;
        completed?: number;
        failed?: number;
        blocked?: number;
        retried?: number;
      };
    };
    if (statusResponse.status !== 200) throw new Error(`gateway status returned ${statusResponse.status}`);
    if ((status.tasks?.total ?? 0) < 4 || (status.tasks?.completed ?? 0) < 2 || (status.tasks?.failed ?? 0) < 1) {
      throw new Error('gateway status did not summarize worker task terminal states');
    }
    if ((status.tasks?.blocked ?? 0) < 1 || (status.tasks?.retried ?? 0) < 2) {
      throw new Error('gateway status did not summarize blocked/retried worker tasks');
    }

    return 'handoff worker executed completed, retried, and blocked tasks';
  } finally {
    await gateway.close();
  }
}

function summarize(scenarios: ScenarioResult[]) {
  const passed = scenarios.filter((scenario) => scenario.status === 'passed').length;
  const total = scenarios.length;
  return {
    total,
    passed,
    failed: total - passed,
    score: total === 0 ? 0 : Math.round((passed / total) * 100),
  };
}

function renderScenarioLines(report: ScenarioReport, xenesisHome: string, reportPath: string) {
  const status = scenarioStatus(report);
  return [
    `scenario: report ${displayPath(xenesisHome, reportPath)}`,
    `scenario: ${status} ${report.summary.passed}/${report.summary.total}`,
    `scenario: score ${report.summary.score}`,
    ...report.scenarios.map((scenario) =>
      scenario.status === 'passed'
        ? `scenario: ${scenario.name} passed`
        : `scenario: ${scenario.name} failed - ${scenario.message}`,
    ),
  ];
}

export function renderScenarioReportDetails(
  entry: ScenarioReportEntry,
  xenesisHome: string,
  summaryLabel: 'latest' | 'summary',
) {
  const report = entry.report;
  const status = scenarioStatus(report);
  const lines = [
    `scenario: report ${displayPath(xenesisHome, entry.path)}`,
    `scenario: ${summaryLabel} ${status} ${report.summary.passed}/${report.summary.total} (${report.createdAt})`,
    `scenario: score ${report.summary.score}`,
  ];

  for (const scenario of report.scenarios) {
    lines.push(
      scenario.status === 'passed'
        ? `scenario: ${scenario.name} passed`
        : `scenario: ${scenario.name} failed - ${scenario.message}`,
    );
    for (const diagnostic of scenario.diagnostics ?? []) {
      if (diagnostic.kind === 'cli_run') {
        lines.push(`diagnostic: cli_run exitCode=${diagnostic.exitCode}`);
        lines.push(`argv: ${diagnostic.argv.map(formatArg).join(' ')}`);
        lines.push(...previewLines('stdout', diagnostic.stdout));
        lines.push(...previewLines('stderr', diagnostic.stderr));
      }
    }
  }

  return lines;
}

export async function runScenarioSuite(options: RunScenarioSuiteOptions): Promise<RunScenarioSuiteResult> {
  const createdAt = options.now?.() ?? new Date();
  const id = scenarioReportId(createdAt);
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env,
    cli: options.cli,
  });
  const workspaceRoot = config.workspace;

  const scenarioWorkspace = await mkdtemp(join(tmpdir(), 'xenesis-scenario-'));
  let scenarios: ScenarioResult[] = [];
  try {
    const scenarioConfigPath = await writeScenarioConfig(scenarioWorkspace);
    const scenarioOptions = {
      ...options,
      cwd: scenarioWorkspace,
      configPath: scenarioConfigPath,
      env: {
        ...options.env,
        XENESIS_HOME: join(scenarioWorkspace, '.xenesis'),
      },
    };
    const runScenarioWithDiagnostics = async (
      name: string,
      fn: (runtimeOptions: ScenarioRuntimeOptions) => Promise<string>,
    ) => {
      const diagnostics: ScenarioDiagnostic[] = [];
      return await runScenario(name, () => fn({ ...scenarioOptions, diagnostics }), diagnostics);
    };
    scenarios = [
      await runScenarioWithDiagnostics('plan-work', (runtimeOptions) =>
        scenarioPlanWork(runtimeOptions, scenarioWorkspace, scenarioConfigPath),
      ),
      await runScenarioWithDiagnostics('agent-loop-quality', (runtimeOptions) =>
        scenarioAgentLoopQuality(runtimeOptions, scenarioWorkspace, scenarioConfigPath),
      ),
      await runScenarioWithDiagnostics('chat-context', (runtimeOptions) =>
        scenarioChatContext(runtimeOptions, scenarioWorkspace, scenarioConfigPath),
      ),
      await runScenarioWithDiagnostics('memory-context', (runtimeOptions) =>
        scenarioMemoryContext(runtimeOptions, scenarioWorkspace, scenarioConfigPath),
      ),
      await runScenarioWithDiagnostics('task-lifecycle', (runtimeOptions) =>
        scenarioTaskLifecycle(runtimeOptions, scenarioWorkspace, scenarioConfigPath),
      ),
      await runScenario('gateway-ide-context', () => scenarioGatewayIdeContext(scenarioOptions, scenarioWorkspace)),
      await runScenario('long-running-handoff', () => scenarioLongRunningHandoff(scenarioOptions, scenarioWorkspace)),
      await runScenario('handoff-worker-execution', () =>
        scenarioHandoffWorkerExecution(scenarioOptions, scenarioWorkspace),
      ),
    ];
  } finally {
    closeAllDatabases();
    await rm(scenarioWorkspace, { recursive: true, force: true });
  }

  const summary = summarize(scenarios);
  const exitCode = summary.failed === 0 ? 0 : 1;
  const report: ScenarioReport = {
    id,
    createdAt: createdAt.toISOString(),
    workspace: workspaceRoot,
    configPath: options.configPath,
    scenarioWorkspace,
    summary,
    exitCode,
    scenarios,
  };
  const dir = reportsDir(config.xenesisHome);
  const reportPath = join(dir, `${id}.json`);
  await mkdir(dir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return {
    exitCode,
    report,
    reportPath,
    lines: renderScenarioLines(report, config.xenesisHome, reportPath),
  };
}

export async function readLatestScenarioReportEntry(xenesisHome: string): Promise<ScenarioReportEntry | undefined> {
  let files;
  try {
    files = await readdir(reportsDir(xenesisHome), { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }

  const latest = files
    .filter((file) => file.isFile() && /^scenario-\d{8}T\d{9}Z\.json$/.test(file.name))
    .map((file) => file.name)
    .sort()
    .at(-1);

  if (!latest) return undefined;
  const path = join(reportsDir(xenesisHome), latest);
  return {
    path,
    report: JSON.parse(await readFile(path, 'utf8')) as ScenarioReport,
  };
}

export async function readScenarioReportEntry(
  xenesisHome: string,
  target: string,
): Promise<ScenarioReportEntry | undefined> {
  const path = scenarioReportPathFromTarget(xenesisHome, target);
  try {
    return {
      path,
      report: JSON.parse(await readFile(path, 'utf8')) as ScenarioReport,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function readLatestScenarioReport(xenesisHome: string): Promise<ScenarioReport | undefined> {
  return (await readLatestScenarioReportEntry(xenesisHome))?.report;
}

export function formatLatestScenarioReport(report: ScenarioReport) {
  const status = scenarioStatus(report);
  return `scenario: latest ${status} ${report.summary.passed}/${report.summary.total} (${report.createdAt})`;
}
