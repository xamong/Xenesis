#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProviderMatrixReport,
  defaultProviderMatrixTargets,
  type ProviderMatrixResult,
  type ProviderMatrixTarget,
  type ProviderMatrixUsage,
} from '../src/smoke/index.js';

interface ParsedArgs {
  providers: string[];
  report?: string;
  timeoutMs: number;
  json: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    providers: [],
    timeoutMs: 120000,
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
    if (arg === '--provider') parsed.providers.push(next());
    else if (arg === '--report') parsed.report = next();
    else if (arg === '--timeout-ms') parsed.timeoutMs = Number(next());
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: npm run provider:matrix -- [options]',
          '',
          'Options:',
          '  --provider <name>  Provider to check. May be repeated. Default: openai, claude.',
          '  --report <path>    Output report path.',
          '  --timeout-ms <n>   Timeout per provider capability eval. Default: 120000.',
          '  --json             Print JSON report.',
        ].join('\n'),
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown option ${arg}.`);
    }
  }
  if (!Number.isInteger(parsed.timeoutMs) || parsed.timeoutMs <= 0) {
    throw new Error('--timeout-ms must be a positive integer.');
  }
  return parsed;
}

function packageRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

function npmSpawnCommand(args: string[]) {
  return process.platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', 'npm', ...args] }
    : { command: 'npm', args };
}

function stamp(date: Date) {
  return date.toISOString().replace(/[-:.]/g, '');
}

function resolveXenesisHome() {
  const value = process.env.XENESIS_HOME?.trim() || resolve(homedir(), '.xenesis');
  return isAbsolute(value) ? resolve(value) : resolve(packageRoot(), value);
}

function selectedTargets(parsed: ParsedArgs): ProviderMatrixTarget[] {
  const targets = defaultProviderMatrixTargets(process.env);
  if (parsed.providers.length === 0) return targets;
  const selected = new Set(parsed.providers);
  return targets.filter((target) => selected.has(target.provider));
}

function scenarioFile(workspace: string) {
  const path = join(workspace, 'provider-matrix-scenario.json');
  writeFileSync(
    path,
    `${JSON.stringify(
      [
        {
          id: 'provider-matrix-live',
          category: 'provider-recovery',
          prompt: 'Provider connectivity check. Please answer with: XENESIS_PROVIDER_MATRIX_OK',
          requiredText: ['XENESIS_PROVIDER_MATRIX_OK'],
          weight: 1,
        },
      ],
      null,
      2,
    )}\n`,
    'utf8',
  );
  return path;
}

function readUsage(reportPath: string): ProviderMatrixUsage | undefined {
  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as {
    metrics?: { usage?: ProviderMatrixUsage };
  };
  return report.metrics?.usage;
}

function runProvider(
  target: ProviderMatrixTarget,
  options: {
    scenarioPath: string;
    timeoutMs: number;
    reportDir: string;
  },
): ProviderMatrixResult {
  if (!target.available) {
    return {
      provider: target.provider,
      model: target.model,
      status: 'skipped',
      durationMs: 0,
      skippedReason: `missing ${target.credentialEnv}`,
    };
  }

  const startedAt = Date.now();
  const reportPath = resolve(options.reportDir, `provider-matrix-${target.provider}-${stamp(new Date())}.json`);
  const spawned = npmSpawnCommand([
    '--prefix',
    packageRoot(),
    'run',
    'capability:eval',
    '--',
    '--scenario-file',
    options.scenarioPath,
    '--scenario',
    'provider-matrix-live',
    '--provider',
    target.provider,
    '--model',
    target.model,
    '--approval',
    'readonly',
    '--timeout-ms',
    String(options.timeoutMs),
    '--report',
    reportPath,
    '--json',
  ]);
  const result = spawnSync(spawned.command, spawned.args, {
    cwd: packageRoot(),
    env: process.env,
    encoding: 'utf8',
    timeout: options.timeoutMs + 30000,
  });

  const durationMs = Date.now() - startedAt;
  if (result.status !== 0) {
    const usage = readUsageIfExists(reportPath);
    const detail = [
      result.error ? `spawn error: ${result.error.message}` : undefined,
      result.signal ? `signal: ${result.signal}` : undefined,
      result.status === null ? 'exit status: null' : `exit status: ${result.status}`,
      result.stdout?.trim() ? `stdout:\n${result.stdout.trim()}` : undefined,
      result.stderr?.trim() ? `stderr:\n${result.stderr.trim()}` : undefined,
    ].filter((item): item is string => Boolean(item));
    return {
      provider: target.provider,
      model: target.model,
      status: 'failed',
      durationMs,
      ...(usage ? { usage } : {}),
      error: detail.join('\n\n'),
      reportPath,
    };
  }

  return {
    provider: target.provider,
    model: target.model,
    status: 'passed',
    durationMs,
    usage: readUsage(reportPath),
    reportPath,
  };
}

function readUsageIfExists(reportPath: string): ProviderMatrixUsage | undefined {
  try {
    return readUsage(reportPath);
  } catch {
    return undefined;
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const root = packageRoot();
  const xenesisHome = resolveXenesisHome();
  const reportPath = resolve(
    parsed.report ?? resolve(xenesisHome, 'reports', `provider-matrix-${stamp(new Date())}.json`),
  );
  const workDir = mkdtempSync(join(tmpdir(), 'xenesis-provider-matrix-'));
  const reportDir = resolve(xenesisHome, 'reports');
  mkdirSync(reportDir, { recursive: true });
  try {
    const scenarioPath = scenarioFile(workDir);
    const results = selectedTargets(parsed).map((target) => {
      if (!parsed.json) console.log(`provider-matrix: ${target.provider} ${target.available ? 'running' : 'skipped'}`);
      return runProvider(target, {
        scenarioPath,
        timeoutMs: parsed.timeoutMs,
        reportDir,
      });
    });
    const report = buildProviderMatrixReport({
      id: `provider-matrix-${stamp(new Date())}`,
      createdAt: new Date().toISOString(),
      workspace: root,
      results,
    });
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    if (parsed.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`provider-matrix: report ${reportPath}`);
      console.log(
        `provider-matrix: passed ${report.summary.passed}/${report.summary.total} skipped ${report.summary.skipped}`,
      );
      console.log(
        `provider-matrix: usage totalTokens=${report.usage.totalTokens} measured=${report.usage.measuredProviders.join(',') || 'none'}`,
      );
    }
    process.exitCode = report.summary.failed === 0 ? 0 : 1;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

await main();
