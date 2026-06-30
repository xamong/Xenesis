#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type LearnMode = 'review-only' | 'queue-only' | 'run-next';

interface ParsedLearnArgs {
  mode: LearnMode;
  passThrough: string[];
  help: boolean;
}

function packageRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

function tsxCli() {
  const root = packageRoot();
  const candidates = [
    join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    join(root, '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('tsx CLI not found');
  return found;
}

function readOptionValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Option ${name} requires a value.`);
  return value;
}

function parseLearnMode(value: string): LearnMode {
  if (value === 'review-only' || value === 'queue-only' || value === 'run-next') return value;
  throw new Error(`Unknown capability learn mode "${value}". Use review-only, queue-only, or run-next.`);
}

function parseLearnArgs(args: string[]): ParsedLearnArgs {
  let mode: LearnMode = 'run-next';
  let modeSpecified = false;
  const passThrough: string[] = [];

  const setMode = (nextMode: LearnMode) => {
    if (modeSpecified && mode !== nextMode) {
      throw new Error(`Capability learn mode already set to "${mode}".`);
    }
    mode = nextMode;
    modeSpecified = true;
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      return { mode, passThrough, help: true };
    }
    if (arg === '--mode') {
      setMode(parseLearnMode(readOptionValue(args, index, '--mode')));
      index += 1;
    } else if (arg === '--review-only') {
      setMode('review-only');
    } else if (arg === '--queue-only') {
      setMode('queue-only');
    } else if (arg === '--run-next') {
      setMode('run-next');
    } else {
      passThrough.push(arg);
    }
  }

  return { mode, passThrough, help: false };
}

function modeLoopArgs(mode: LearnMode) {
  if (mode === 'review-only') return ['--from-run-reports'];
  if (mode === 'queue-only') return ['--from-run-reports', '--queue-next'];
  return ['--from-run-reports', '--run-next'];
}

function loopArgs(parsed: ParsedLearnArgs) {
  return [...modeLoopArgs(parsed.mode), ...parsed.passThrough];
}

function printHelp() {
  console.log(
    [
      'Usage: npm run capability:learn -- [mode] [capability-loop options]',
      '',
      'Builds capability improvement work from failed run reports.',
      '',
      'Modes:',
      '  --mode review-only   Import failed run reports and write improvement/backlog reports only.',
      '  --mode queue-only    Select and queue the next improvement task without running it.',
      '  --mode run-next      Select, queue, and run the next improvement task. Default.',
      '',
      'Shortcuts:',
      '  --review-only        Same as --mode review-only.',
      '  --queue-only         Same as --mode queue-only.',
      '  --run-next           Same as --mode run-next.',
      '',
      'All other options are forwarded to capability:loop.',
    ].join('\n'),
  );
}

async function main() {
  const parsed = parseLearnArgs(process.argv.slice(2));
  if (parsed.help) {
    printHelp();
    return;
  }

  const root = packageRoot();
  const child = spawn(
    process.execPath,
    [tsxCli(), resolve(root, 'scripts', 'capability-loop.ts'), ...loopArgs(parsed)],
    {
      cwd: root,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    },
  );

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  const exitCode = await new Promise<number>((resolveExit) => {
    child.on('error', (error) => {
      console.error(`capability-learn: error: ${error.message}`);
      resolveExit(1);
    });
    child.on('exit', (code) => resolveExit(code ?? 1));
  });
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(`capability-learn: error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
