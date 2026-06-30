import { spawn } from 'node:child_process';
import type { HookSpec } from '../config/types.js';
import { computeShellEnv } from '../core/isolation/secretScrub.js';
import type {
  BlockingHookHandler,
  PreToolUseDecision,
  PreToolUsePayload,
  StopDecision,
  StopPayload,
} from './blocking.js';

interface Logger {
  warn(message: string): void;
}

type HookEvent = 'pre_tool_use' | 'stop';
type CommandDecision = PreToolUseDecision | StopDecision;

// Map each event to the payload it receives and the decision it can emit, so
// the returned handler is natively assignable to the typed registration
// contract (BlockingHookHandler<PreToolUsePayload, PreToolUseDecision> /
// <StopPayload, StopDecision>) without an `as any` cast at the Task 6 seam.
interface EventContract {
  pre_tool_use: { payload: PreToolUsePayload; decision: PreToolUseDecision };
  stop: { payload: StopPayload; decision: StopDecision };
}

function allowFor<E extends HookEvent>(event: E): EventContract[E]['decision'] {
  const d: CommandDecision = event === 'pre_tool_use' ? { decision: 'allow' } : { decision: 'allow-stop' };
  return d as EventContract[E]['decision'];
}

function blockFor<E extends HookEvent>(event: E, reason: string): EventContract[E]['decision'] {
  const d: CommandDecision =
    event === 'pre_tool_use'
      ? { decision: 'block', reason }
      : { decision: 'block-stop', continuePrompt: reason, reason };
  return d as EventContract[E]['decision'];
}

// Normalize Claude-Code {decision} and hermes {action} stdout shapes onto the
// blocking decision union. Unknown/empty/unparseable stdout fails open (allow).
function parseDecision<E extends HookEvent>(stdout: string, event: E): EventContract[E]['decision'] {
  const trimmed = stdout.trim();
  if (!trimmed) return allowFor(event);
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return allowFor(event);
  }
  const verb = (obj.decision ?? obj.action) as string | undefined;
  const reason = (obj.reason ?? obj.message ?? obj.content) as string | undefined;
  if (verb === 'block') {
    return blockFor(event, reason ?? 'Blocked by hook command.');
  }
  if (event === 'pre_tool_use' && verb === 'modify' && obj.tool_input && typeof obj.tool_input === 'object') {
    const modify: PreToolUseDecision = {
      decision: 'modify',
      modifiedArgs: obj.tool_input as Record<string, unknown>,
      reason,
    };
    return modify as EventContract[E]['decision'];
  }
  return allowFor(event);
}

// Per-event overloads: the pre_tool_use handler is typed
// (payload: PreToolUsePayload) => Promise<PreToolUseDecision> and the stop
// handler (payload: StopPayload) => Promise<StopDecision>. The concrete
// (payload: P) => Promise<D> shape is a subtype of
// BlockingHookHandler<P, D> = (payload: P) => D | undefined | Promise<D |
// undefined>, so each result drops straight into its typed registration slot
// (PreToolUseRegistration.handler / StopRegistration.handler) without an
// `as any` cast, while still giving direct call sites a precise non-undefined
// Promise<D> result.
export function createCommandHookHandler(
  spec: HookSpec,
  event: 'pre_tool_use',
  defaults: { commandTimeoutMs: number },
  logger?: Logger,
): (payload: PreToolUsePayload) => Promise<PreToolUseDecision>;
export function createCommandHookHandler(
  spec: HookSpec,
  event: 'stop',
  defaults: { commandTimeoutMs: number },
  logger?: Logger,
): (payload: StopPayload) => Promise<StopDecision>;
export function createCommandHookHandler<E extends HookEvent>(
  spec: HookSpec,
  event: E,
  defaults: { commandTimeoutMs: number },
  logger?: Logger,
): (payload: EventContract[E]['payload']) => Promise<EventContract[E]['decision']> {
  // Per-event typing is locked in at compile time by the module-level
  // `_lockInContract` block at the bottom of this file (src-resident, so it
  // binds the per-task gate `tsc -p tsconfig.json --noEmit`). See the comment
  // there for the full rationale.
  type Decision = EventContract[E]['decision'];
  const timeoutMs = spec.timeoutMs ?? defaults.commandTimeoutMs;
  return (payload: EventContract[E]['payload']) =>
    new Promise<Decision>((resolveDecision) => {
      let stdout = '';
      let settled = false;
      const settle = (d: Decision) => {
        if (!settled) {
          settled = true;
          resolveDecision(d);
        }
      };

      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(spec.command, {
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe'],
          // User-configured hook commands run arbitrary shell; scrub secrets/exec-hijack
          // vars so a careless or hostile hook can't read API keys/webhook tokens from
          // the env. computeShellEnv returns undefined only on XENESIS_ISOLATION_SCRUB="0"
          // (opt-out), which restores full-env inheritance exactly as before.
          env: computeShellEnv(process.env),
        });
      } catch (error) {
        logger?.warn(`Hook command failed to spawn; failing open: ${String(error)}`);
        settle(allowFor(event));
        return;
      }

      const timer = setTimeout(() => {
        logger?.warn(`Hook command timed out after ${timeoutMs}ms; failing open.`);
        child.kill();
        settle(allowFor(event));
      }, timeoutMs);

      child.stdout?.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.on('error', (error) => {
        clearTimeout(timer);
        logger?.warn(`Hook command errored; failing open: ${String(error)}`);
        settle(allowFor(event));
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (settled) return;
        if (code !== 0) {
          settle(blockFor(event, `Hook command exited with code ${code}.`));
          return;
        }
        settle(parseDecision(stdout, event));
      });

      try {
        child.stdin?.write(JSON.stringify({ hookEvent: event, ...payload }));
        child.stdin?.end();
      } catch {
        // stdin may already be closed; the close/error handler resolves.
      }
    });
}

// --- Compile-time lock-in (src-resident contract gate) ---------------------
// Mirrors tests/s5/commandHook.test.ts:18-29, but lives under src/**/*.ts so it
// is compiled by the prescribed per-task gate `tsc -p tsconfig.json --noEmit`
// (whose include is ["src/**/*.ts"]). The selected overload result for each
// event MUST be assignable to its typed BlockingHookHandler registration slot
// without an `as any` cast. A regression of the adapter to
// `(payload: Record<string,unknown>) => Promise<PreToolUseDecision|StopDecision>`
// fails param contravariance / return narrowing here and breaks the gate.
// The `if (false ...)` guard keeps this purely type-level: the body, which
// spawns child processes, is never executed (and `_lockInContract` is referenced
// via `void` only to satisfy no-unused-vars).
function _lockInContract(): void {
  if (false as boolean) {
    const _preReg: BlockingHookHandler<PreToolUsePayload, PreToolUseDecision> = createCommandHookHandler(
      { command: 'true' },
      'pre_tool_use',
      { commandTimeoutMs: 1000 },
    );
    const _stopReg: BlockingHookHandler<StopPayload, StopDecision> = createCommandHookHandler(
      { command: 'true' },
      'stop',
      { commandTimeoutMs: 1000 },
    );
    void _preReg;
    void _stopReg;
  }
}
void _lockInContract;
