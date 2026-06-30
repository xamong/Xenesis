import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type CliConfigOverrides, displayXenesisStatePath, loadConfig, xenesisStatePath } from '../config/index.js';
import { closeAllDatabases } from '../db/database.js';
import { type GatewayHandle, type GatewayRunCli, startGateway } from '../gateway/index.js';
import { createBuiltInTools, type ToolContext } from '../tools/index.js';

export type SmokeCheckStatus = 'passed' | 'failed';

export interface SmokeCheckResult {
  name: string;
  status: SmokeCheckStatus;
  durationMs: number;
  message: string;
}

export interface SmokeReport {
  id: string;
  createdAt: string;
  workspace: string;
  configPath?: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  exitCode: number;
  checks: SmokeCheckResult[];
}

export interface RunSmokeOptions {
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  cli?: CliConfigOverrides;
  runCli: GatewayRunCli;
  now?: () => Date;
}

export interface RunSmokeResult {
  exitCode: number;
  report: SmokeReport;
  reportPath: string;
  lines: string[];
}

export interface SmokeReportEntry {
  report: SmokeReport;
  path: string;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function smokeStamp(date: Date) {
  return date.toISOString().replace(/[-:.]/g, '');
}

function smokeReportId(date: Date) {
  return `smoke-${smokeStamp(date)}`;
}

function reportsDir(xenesisHome: string) {
  return xenesisStatePath(xenesisHome, 'reports');
}

function displayPath(xenesisHome: string, path: string) {
  return displayXenesisStatePath(xenesisHome, path);
}

function smokeStatus(report: SmokeReport) {
  return report.summary.failed === 0 ? 'passed' : 'failed';
}

function smokeReportPathFromTarget(xenesisHome: string, target: string) {
  if (/[\\/]/.test(target)) return resolve(target);
  const fileName = target.endsWith('.json')
    ? target
    : `${target.startsWith('smoke-') ? target : `smoke-${target}`}.json`;
  return join(reportsDir(xenesisHome), fileName);
}

async function runCheck(name: string, fn: () => Promise<string>): Promise<SmokeCheckResult> {
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
    };
  }
}

function parseJsonEvents(lines: string[]) {
  return lines.flatMap((line) => {
    try {
      return [JSON.parse(line) as { type?: string; content?: string; message?: { content?: string } }];
    } catch {
      return [];
    }
  });
}

function gatewayAuthHeaders(gateway: GatewayHandle, headers: Record<string, string> = {}) {
  if (!gateway.authToken) throw new Error('Gateway did not provide an auth token.');
  return {
    ...headers,
    authorization: `Bearer ${gateway.authToken}`,
  };
}

async function checkConfig(options: RunSmokeOptions) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env,
    cli: options.cli,
  });
  return `provider=${config.provider}, model=${config.model}`;
}

async function checkTools() {
  const tools = createBuiltInTools();
  if (tools.size === 0) throw new Error('No built-in tools loaded.');
  return `${tools.size} built-in tools loaded`;
}

function smokeToolContext(workspaceRoot: string, xenesisHome: string): ToolContext {
  return {
    workspaceRoot,
    xenesisHome,
    cwd: workspaceRoot,
    sessionId: 'smoke-tool-capabilities',
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

async function fileExists(path: string) {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

async function checkToolCapabilities() {
  const tempDir = await mkdtemp(join(tmpdir(), 'xenesis-tool-smoke-'));
  const workspaceRoot = join(tempDir, 'workspace');
  const xenesisHome = join(tempDir, 'home');
  const srcDir = join(workspaceRoot, 'src');
  await mkdir(srcDir, { recursive: true });
  await writeFile(join(srcDir, 'sample.ts'), 'export function helper() {\n  return true;\n}\n', 'utf8');

  try {
    const tools = createBuiltInTools();
    const context = smokeToolContext(workspaceRoot, xenesisHome);

    const shell = await tools.get('shell')!.run(
      {
        command:
          "node -e \"require('fs').writeFileSync('blocked-marker.txt','ran')\"; Remove-Item -Recurse missing-target",
        timeoutMs: 5000,
      },
      context,
    );
    if (shell.ok || !/blocked|destructive/i.test(shell.content)) {
      throw new Error(`shell safety smoke failed: ${shell.content}`);
    }
    if (await fileExists(join(workspaceRoot, 'blocked-marker.txt'))) {
      throw new Error('shell safety smoke spawned a blocked command.');
    }

    const lsp = await tools.get('lsp')!.run(
      {
        action: 'definition',
        symbol: 'helper',
      },
      context,
    );
    if (!lsp.ok || !lsp.content.includes('src/sample.ts:1:17 function helper')) {
      throw new Error(`lsp smoke failed: ${lsp.content}`);
    }

    const task = await tools.get('agent_task')!.run(
      {
        action: 'create',
        prompt: 'Smoke durable task',
      },
      context,
    );
    if (!task.ok || !task.content.includes('agent task created:')) {
      throw new Error(`agent_task smoke failed: ${task.content}`);
    }

    const search = await tools.get('tool_search')!.run(
      {
        query: 'find code definition references',
        maxResults: 3,
      },
      context,
    );
    if (!search.ok || !search.content.split(/\r?\n/)[0]?.includes('lsp')) {
      throw new Error(`tool_search smoke failed: ${search.content}`);
    }

    return 'shell safety, lsp, agent_task, and tool_search completed';
  } finally {
    closeAllDatabases();
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function checkAgent(options: RunSmokeOptions) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const argv = [
    'node',
    'xenesis',
    '--cwd',
    options.cwd,
    '--provider',
    'mock',
    '--model',
    'smoke-mock',
    '--max-turns',
    '2',
    '--print',
    '--json',
  ];
  if (options.configPath) argv.push('--config', options.configPath);
  if (options.cli?.xenesisHome) argv.push('--home', options.cli.xenesisHome);
  if (options.cli?.profile) argv.push('--profile', options.cli.profile);
  argv.push('smoke agent');

  const exitCode = await options.runCli(argv, {
    cwd: options.cwd,
    env: options.env,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  });

  const events = parseJsonEvents(stdout);
  const content = events.map((event) => event.content ?? event.message?.content ?? '').join('\n');

  if (exitCode !== 0) throw new Error(stderr.join('\n') || `agent smoke exited ${exitCode}`);
  if (!content.includes('mock response: smoke agent')) {
    throw new Error('Agent smoke did not return the expected mock response.');
  }
  return 'mock agent run completed';
}

async function checkGateway(options: RunSmokeOptions) {
  const tempDir = await mkdtemp(join(tmpdir(), 'xenesis-smoke-'));
  const smokeConfigPath = join(tempDir, 'xenesis.config.json');
  await writeFile(
    smokeConfigPath,
    JSON.stringify({
      provider: 'mock',
      model: 'smoke-mock',
      workspace: '.',
    }),
    'utf8',
  );

  const gateway = await startGateway({
    cwd: options.cwd,
    env: options.env,
    port: 0,
    cliArgs: [
      ...(options.cli?.xenesisHome ? ['--home', options.cli.xenesisHome] : []),
      ...(options.cli?.profile ? ['--profile', options.cli.profile] : []),
    ],
    runCli: options.runCli,
  });

  try {
    const health = await fetch(`${gateway.url}/health`);
    if (health.status !== 200) throw new Error(`Gateway health returned ${health.status}.`);

    const run = await fetch(`${gateway.url}/run`, {
      method: 'POST',
      headers: gatewayAuthHeaders(gateway, { 'content-type': 'application/json' }),
      body: JSON.stringify({
        prompt: 'smoke gateway',
        configPath: smokeConfigPath,
      }),
    });
    const body = (await run.json()) as { exitCode?: number; output?: string; errors?: string };
    if (run.status !== 200) throw new Error(`Gateway run returned ${run.status}.`);
    if (body.exitCode !== 0) throw new Error(body.errors || `Gateway run exited ${body.exitCode}.`);
    if (!String(body.output ?? '').includes('mock response: smoke gateway')) {
      throw new Error('Gateway smoke did not return the expected mock response.');
    }
    return 'gateway health and /run completed';
  } finally {
    await gateway.close();
    closeAllDatabases();
    await rm(tempDir, { recursive: true, force: true });
  }
}

function summarize(checks: SmokeCheckResult[]) {
  const passed = checks.filter((check) => check.status === 'passed').length;
  return {
    total: checks.length,
    passed,
    failed: checks.length - passed,
  };
}

function renderSmokeLines(report: SmokeReport, xenesisHome: string, reportPath: string) {
  const status = smokeStatus(report);
  return [
    `smoke: report ${displayPath(xenesisHome, reportPath)}`,
    `smoke: ${status} ${report.summary.passed}/${report.summary.total}`,
    ...report.checks.map((check) =>
      check.status === 'passed' ? `smoke: ${check.name} passed` : `smoke: ${check.name} failed - ${check.message}`,
    ),
  ];
}

export function renderSmokeReportDetails(
  entry: SmokeReportEntry,
  xenesisHome: string,
  summaryLabel: 'latest' | 'summary',
) {
  const report = entry.report;
  const status = smokeStatus(report);
  return [
    `smoke: report ${displayPath(xenesisHome, entry.path)}`,
    `smoke: ${summaryLabel} ${status} ${report.summary.passed}/${report.summary.total} (${report.createdAt})`,
    ...report.checks.map((check) =>
      check.status === 'passed' ? `smoke: ${check.name} passed` : `smoke: ${check.name} failed - ${check.message}`,
    ),
  ];
}

export async function runSmoke(options: RunSmokeOptions): Promise<RunSmokeResult> {
  const createdAt = options.now?.() ?? new Date();
  const id = smokeReportId(createdAt);
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env,
    cli: options.cli,
  });
  const workspaceRoot = config.workspace;
  const checks = [
    await runCheck('config', () => checkConfig(options)),
    await runCheck('tools', checkTools),
    await runCheck('tool_capabilities', checkToolCapabilities),
    await runCheck('agent', () => checkAgent(options)),
    await runCheck('gateway', () => checkGateway(options)),
  ];
  const summary = summarize(checks);
  const exitCode = summary.failed === 0 ? 0 : 1;
  const report: SmokeReport = {
    id,
    createdAt: createdAt.toISOString(),
    workspace: workspaceRoot,
    configPath: options.configPath,
    summary,
    exitCode,
    checks,
  };
  const dir = reportsDir(config.xenesisHome);
  const reportPath = join(dir, `${id}.json`);
  await mkdir(dir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  closeAllDatabases();

  return {
    exitCode,
    report,
    reportPath,
    lines: renderSmokeLines(report, config.xenesisHome, reportPath),
  };
}

export async function readLatestSmokeReportEntry(xenesisHome: string): Promise<SmokeReportEntry | undefined> {
  let files;
  try {
    files = await readdir(reportsDir(xenesisHome), { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }

  const latest = files
    .filter((file) => file.isFile() && /^smoke-\d{8}T\d{9}Z\.json$/.test(file.name))
    .map((file) => file.name)
    .sort()
    .at(-1);

  if (!latest) return undefined;
  const path = join(reportsDir(xenesisHome), latest);
  return {
    path,
    report: JSON.parse(await readFile(path, 'utf8')) as SmokeReport,
  };
}

export async function readSmokeReportEntry(xenesisHome: string, target: string): Promise<SmokeReportEntry | undefined> {
  const path = smokeReportPathFromTarget(xenesisHome, target);
  try {
    return {
      path,
      report: JSON.parse(await readFile(path, 'utf8')) as SmokeReport,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function readLatestSmokeReport(xenesisHome: string): Promise<SmokeReport | undefined> {
  return (await readLatestSmokeReportEntry(xenesisHome))?.report;
}

export function formatLatestSmokeReport(report: SmokeReport) {
  const status = smokeStatus(report);
  return `smoke: latest ${status} ${report.summary.passed}/${report.summary.total} (${report.createdAt})`;
}
