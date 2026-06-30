/**
 * P6 (c): wakeGate — a cheap, MECHANICAL pre-filter the scheduler runs AFTER a schedule
 * is due but BEFORE it creates an AgentTask. When it returns false, NO task is created, so
 * the scheduled run incurs NO inference cost; the scheduler simply advances `lastFiredAt`.
 *
 * Hard rules:
 *  - NO model is ever invoked here. The check is purely mechanical (spawn a command and
 *    parse its trailing sentinel, or compare a file mtime against lastFiredAt).
 *  - FAIL OPEN: any error, timeout, or unparseable output returns `true` (wake the agent).
 *    A broken gate must never silently drop scheduled work.
 *  - The spawned command is secret-scrubbed exactly like the shell tool (same env names),
 *    timeout-bound, and run in the workspace.
 */
import { stat } from 'node:fs/promises';
import { buildScrubbedEnv, KNOWN_SECRET_ENV } from '../core/isolation/secretScrub.js';
import { runCommand } from '../utils/command.js';
import type { ScheduleWakeCheck, TaskSchedule } from './schedules.js';

/** Default ceiling for a wake-check command. Kept short — this is a pre-filter, not work. */
const DEFAULT_WAKE_COMMAND_TIMEOUT_MS = 10_000;

/** The subset of a command result the wake gate consults. */
export interface WakeCommandResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Injectable command runner so tests need not spawn a real shell (which can hang). */
export type WakeCommandRunner = (input: {
  command: string;
  cwd: string;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
}) => Promise<WakeCommandResult>;

export interface EvaluateWakeGateOptions {
  /** Working directory for a "command" wake-check. Defaults to process.cwd(). */
  cwd?: string;
  /** Env source for scrubbing/spawning. Defaults to process.env. */
  env?: NodeJS.ProcessEnv;
  /** Override the command timeout (ms). */
  commandTimeoutMs?: number;
  /** Reference time for "file-changed" comparison. Defaults to new Date(). */
  now?: () => Date;
  /** Injectable command runner (tests). Defaults to the real `runCommand`. */
  commandRunner?: WakeCommandRunner;
}

/** Builds the secret-scrubbed env used for a wake-check command (mirrors shellTool). */
function scrubbedWakeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const secretNames = new Set<string>(KNOWN_SECRET_ENV);
  for (const name of (env.XENESIS_ISOLATION_SCRUB_NAMES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    secretNames.add(name);
  }
  const allowlist = (env.XENESIS_ISOLATION_SCRUB_ALLOW ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return buildScrubbedEnv(env, { secretNames, allowlist });
}

/**
 * Parses the trailing `{"wakeAgent":false}` sentinel from command output. Returns:
 *  - false → the LAST JSON object in the output has wakeAgent === false (do not wake).
 *  - true  → wakeAgent is anything else / sentinel absent / unparseable (fail open → wake).
 *
 * Only the LAST top-level JSON object is consulted so a command may emit progress text
 * and end with its decision.
 */
export function parseWakeAgentSentinel(output: string): boolean {
  const trimmed = output.trim();
  if (!trimmed) return true;
  // Find the last balanced top-level {...} object in the output.
  let depth = 0;
  let end = -1;
  let lastStart = -1;
  let lastObject: string | undefined;
  const inString = false;
  const escaped = false;
  for (let i = trimmed.length - 1; i >= 0; i -= 1) {
    const ch = trimmed[i]!;
    // Scanning backwards: track string state loosely; the JSON.parse below is authoritative.
    if (!inString && ch === '}') {
      if (depth === 0) end = i;
      depth += 1;
    } else if (!inString && ch === '{') {
      depth -= 1;
      if (depth === 0 && end >= 0) {
        lastStart = i;
        lastObject = trimmed.slice(lastStart, end + 1);
        break;
      }
    }
  }
  void escaped;
  void inString;
  if (!lastObject) return true;
  try {
    const parsed = JSON.parse(lastObject) as { wakeAgent?: unknown };
    return parsed.wakeAgent === false ? false : true;
  } catch {
    return true; // unparseable → fail open.
  }
}

async function evaluateCommandGate(
  check: Extract<ScheduleWakeCheck, { type: 'command' }>,
  options: EvaluateWakeGateOptions,
): Promise<boolean> {
  const env = options.env ?? process.env;
  const run: WakeCommandRunner = options.commandRunner ?? runCommand;
  try {
    const result = await run({
      command: check.run,
      cwd: options.cwd ?? process.cwd(),
      timeoutMs: options.commandTimeoutMs ?? DEFAULT_WAKE_COMMAND_TIMEOUT_MS,
      env: scrubbedWakeEnv(env),
    });
    // Timeout → fail open (wake). A pre-filter that hangs must not drop the scheduled run.
    if (result.timedOut) return true;
    // Parse the trailing sentinel from stdout (fall back to stderr if stdout empty).
    return parseWakeAgentSentinel(result.stdout || result.stderr);
  } catch {
    return true; // spawn error → fail open.
  }
}

async function evaluateFileChangedGate(
  check: Extract<ScheduleWakeCheck, { type: 'file-changed' }>,
  schedule: TaskSchedule,
  options: EvaluateWakeGateOptions,
): Promise<boolean> {
  try {
    const stats = await stat(check.path);
    const lastFired = schedule.lastFiredAt ? Date.parse(schedule.lastFiredAt) : NaN;
    // No prior fire (or unparseable) → wake (treat as changed). This is the conservative,
    // fail-open default for the very first run.
    if (!Number.isFinite(lastFired)) return true;
    return stats.mtimeMs > lastFired;
  } catch {
    // Missing file / stat error → fail open (wake). Don't silently drop scheduled work.
    return true;
  }
}

/**
 * Evaluates a schedule's wakeCheck. Returns whether the agent should be woken (a task
 * created). When the schedule has no wakeCheck, always returns true. FAILS OPEN on any error.
 */
export async function evaluateWakeGate(
  schedule: TaskSchedule,
  options: EvaluateWakeGateOptions = {},
): Promise<boolean> {
  const check = schedule.wakeCheck;
  if (!check) return true;
  try {
    if (check.type === 'command') return await evaluateCommandGate(check, options);
    if (check.type === 'file-changed') return await evaluateFileChangedGate(check, schedule, options);
    return true; // unknown check kind → fail open.
  } catch {
    return true; // any unexpected error → fail open.
  }
}
