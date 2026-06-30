// src/tools/shellProcessRegistry.ts
//
// In-memory module-singleton registry of background shell sessions spawned by the
// shell tool (background: true). Mirrors Hermes tools/process_registry.py but is
// scoped to MINE: host-only, no Docker/SSH/Modal/PTY backends, no crash-recovery
// checkpoint. Sessions are owned by an agent sessionId so the process tool can
// scope list/poll/kill to the owning session, and AgentRunner can reap them on
// session teardown via killAllForSession (wired through shellTool.cleanupSession).
//
// Output is captured into a rolling buffer capped at DEFAULT_MAX_OUTPUT_CHARS so a
// chatty long-lived process can't grow memory without bound. A concurrent-session
// cap (MAX_BACKGROUND_SESSIONS) prunes finished sessions LRU-style.

import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { buildShellInvocation, killProcessTree } from '../utils/command.js';

// Single source of truth for the output cap; matches command.ts DEFAULT_MAX_OUTPUT_CHARS.
export const DEFAULT_MAX_OUTPUT_CHARS = 100_000;

// Max concurrently-tracked background sessions across all agent sessions. When the
// total would exceed this, finished sessions are pruned oldest-first (LRU) to make room.
export const MAX_BACKGROUND_SESSIONS = 64;

export type ShellCompletionReason = 'exited' | 'killed' | 'failed_start';

export interface ShellSession {
  id: string;
  sessionId: string; // owning agent session
  command: string;
  cwd: string;
  child?: ChildProcess;
  pid?: number;
  startedAt: number;
  exited: boolean;
  exitCode: number | null;
  reason?: ShellCompletionReason;
  outputBuffer: string;
  notifyOnComplete: boolean;
}

export interface ShellSpawnOptions {
  sessionId: string;
  command: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  notifyOnComplete?: boolean;
  maxOutputChars?: number;
  /** Invoked once on background exit when notifyOnComplete is true. Best-effort; errors are swallowed. */
  onComplete?: (session: ShellSession) => void | Promise<void>;
}

export interface ShellPollResult {
  status: 'running' | 'exited';
  sessionId: string;
  id: string;
  command: string;
  pid?: number;
  uptimeMs: number;
  outputPreview: string;
  exited: boolean;
  exitCode: number | null;
  reason?: ShellCompletionReason;
}

export interface ShellLogResult {
  id: string;
  status: 'running' | 'exited';
  output: string;
  totalLines: number;
  showing: number;
}

export interface ShellWaitResult {
  status: 'exited' | 'timeout';
  id: string;
  exited: boolean;
  exitCode: number | null;
  reason?: ShellCompletionReason;
  output: string;
}

// Wait cap: a background wait must not block the agent run loop forever. Clamp the
// caller's requested timeout into [MIN, MAX].
const WAIT_MIN_MS = 1;
const WAIT_MAX_MS = 600_000;

export class ShellProcessRegistry {
  private readonly sessions = new Map<string, ShellSession>();

  /** Spawn a detached (POSIX) / windowsHide (win32) background shell process. */
  spawn(opts: ShellSpawnOptions): ShellSession {
    const maxOutputChars = opts.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
    const { shell, args } = buildShellInvocation(opts.command);

    const session: ShellSession = {
      id: `proc-${randomUUID()}`,
      sessionId: opts.sessionId,
      command: opts.command,
      cwd: opts.cwd,
      startedAt: Date.now(),
      exited: false,
      exitCode: null,
      outputBuffer: '',
      notifyOnComplete: opts.notifyOnComplete ?? false,
    };

    let child: ChildProcess;
    try {
      child = spawn(shell, args, {
        cwd: opts.cwd,
        windowsHide: true,
        detached: process.platform !== 'win32',
        ...(opts.env ? { env: opts.env } : {}),
      });
    } catch (error) {
      session.exited = true;
      session.exitCode = null;
      session.reason = 'failed_start';
      session.outputBuffer = error instanceof Error ? error.message : String(error);
      this.track(session);
      return session;
    }

    session.child = child;
    session.pid = child.pid;
    this.track(session);

    const append = (chunk: string) => {
      const remaining = maxOutputChars - session.outputBuffer.length;
      if (remaining <= 0) {
        // Rolling window: keep the tail so live progress stays visible.
        session.outputBuffer = (session.outputBuffer + chunk).slice(-maxOutputChars);
        return;
      }
      session.outputBuffer += chunk;
      if (session.outputBuffer.length > maxOutputChars) {
        session.outputBuffer = session.outputBuffer.slice(-maxOutputChars);
      }
    };

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => append(chunk));
    child.stderr?.on('data', (chunk: string) => append(chunk));

    const finalize = (exitCode: number | null, reason: ShellCompletionReason) => {
      if (session.exited) return;
      session.exited = true;
      // A kill() pre-sets reason "killed"; do not clobber it on the close event.
      session.reason = session.reason ?? reason;
      session.exitCode = session.reason === 'killed' ? (exitCode ?? null) : exitCode;
      if (session.notifyOnComplete && opts.onComplete) {
        void Promise.resolve()
          .then(() => opts.onComplete!(session))
          .catch(() => undefined);
      }
    };

    child.on('error', (error) => {
      if (session.exited) return;
      append(error instanceof Error ? error.message : String(error));
      finalize(null, 'failed_start');
    });
    child.on('close', (code) => {
      finalize(code, 'exited');
    });

    return session;
  }

  /**
   * Reconcile session.exited against the real child state. Node's 'close' event can be
   * delayed when a descendant keeps a stdio pipe open, but ChildProcess exposes
   * exitCode/signalCode once the direct child has exited. When the child is dead but the
   * close handler has not fired yet, flip exited here so poll/wait don't hang (mirrors
   * Hermes's _reconcile_local_exit). Safe no-op for already-exited or child-less sessions.
   */
  private reconcile(session: ShellSession): void {
    if (session.exited || !session.child) return;
    const child = session.child;
    // Only exitCode/signalCode being set means the OS process actually terminated. Do NOT
    // treat child.killed===true as dead: that flag is set synchronously by child.kill()
    // while the process (and any grandchild holding the cwd) is still tearing down.
    const dead = child.exitCode !== null || child.signalCode !== null;
    if (!dead) return;
    session.exited = true;
    session.reason = session.reason ?? 'exited';
    session.exitCode = child.exitCode ?? null;
  }

  poll(id: string): ShellPollResult | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    this.reconcile(session);
    return {
      status: session.exited ? 'exited' : 'running',
      sessionId: session.sessionId,
      id: session.id,
      command: session.command,
      pid: session.pid,
      uptimeMs: Date.now() - session.startedAt,
      outputPreview: session.outputBuffer.slice(-1000),
      exited: session.exited,
      exitCode: session.exitCode,
      reason: session.reason,
    };
  }

  readLog(id: string, offset = 0, limit = 200): ShellLogResult | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    const lines = session.outputBuffer.split('\n');
    const totalLines = lines.length;
    const selected = offset === 0 && limit > 0 ? lines.slice(-limit) : lines.slice(offset, offset + limit);
    return {
      id: session.id,
      status: session.exited ? 'exited' : 'running',
      output: selected.join('\n'),
      totalLines,
      showing: selected.length,
    };
  }

  /** List sessions owned by the given agent sessionId (oldest-first). */
  list(sessionId: string): ShellSession[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.sessionId === sessionId)
      .sort((a, b) => a.startedAt - b.startedAt);
  }

  /**
   * Block until the session exits or the (clamped) timeout elapses; resolves early on exit.
   *
   * Implemented as a short poll of `session.exited` (which the spawn-time 'close' handler
   * flips) rather than attaching a second 'close' listener here. Attaching another listener
   * to the same child while awaiting it was observed to suppress the child's 'close' event
   * under the vitest worker event loop, so the simple poll is both reliable and side-effect free.
   */
  async wait(id: string, timeoutMs: number): Promise<ShellWaitResult | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const clamped = Math.max(WAIT_MIN_MS, Math.min(WAIT_MAX_MS, Math.floor(timeoutMs)));
    const deadline = Date.now() + clamped;
    const POLL_MS = 25;

    while (!session.exited && Date.now() < deadline) {
      const remaining = deadline - Date.now();
      await new Promise<void>((resolve) => {
        setTimeout(resolve, Math.min(POLL_MS, Math.max(1, remaining)));
      });
      this.reconcile(session); // detect a dead child even if 'close' is delayed
    }

    return {
      status: session.exited ? 'exited' : 'timeout',
      id: session.id,
      exited: session.exited,
      exitCode: session.exitCode,
      reason: session.reason,
      output: session.outputBuffer.slice(-2000),
    };
  }

  /** Terminate a session's process tree. Returns false when the id is unknown. */
  async kill(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;
    if (session.exited) return true;
    // Pre-set the reason so the close handler doesn't relabel it "exited".
    session.reason = 'killed';
    // killProcessTree first: it walks the whole tree atomically (taskkill /t on Windows,
    // killpg on POSIX) while the grandchild (e.g. the node child under the PowerShell
    // wrapper) is still parented, so it is reaped too — no orphan left holding the cwd.
    await killProcessTree(session.pid, 'force');
    // Then signal the direct child handle as a backstop so Node emits 'close' promptly
    // (the awaited taskkill alone was observed to delay the close event under load).
    try {
      session.child?.kill();
    } catch {
      // Already gone — nothing to do.
    }
    return true;
  }

  /** Kill every running session owned by an agent session. Used by shellTool.cleanupSession. */
  async killAllForSession(sessionId: string): Promise<number> {
    const targets = Array.from(this.sessions.values()).filter((s) => s.sessionId === sessionId && !s.exited);
    // Kill in parallel so a contended taskkill on one process does not serialize the rest.
    const results = await Promise.all(targets.map((session) => this.kill(session.id)));
    return results.filter(Boolean).length;
  }

  /** Test/teardown helper: forget a session record (does not kill). */
  forget(id: string): void {
    this.sessions.delete(id);
  }

  private track(session: ShellSession): void {
    this.pruneIfNeeded();
    this.sessions.set(session.id, session);
  }

  private pruneIfNeeded(): void {
    if (this.sessions.size < MAX_BACKGROUND_SESSIONS) return;
    // LRU prune of finished sessions (oldest startedAt first). Never evict a running
    // session — losing its handle would orphan the process.
    const finished = Array.from(this.sessions.values())
      .filter((s) => s.exited)
      .sort((a, b) => a.startedAt - b.startedAt);
    let toRemove = this.sessions.size - MAX_BACKGROUND_SESSIONS + 1;
    for (const session of finished) {
      if (toRemove <= 0) break;
      this.sessions.delete(session.id);
      toRemove -= 1;
    }
  }
}

// Module-level singleton shared by shellTool (spawn) and processTool (lifecycle).
export const shellProcessRegistry = new ShellProcessRegistry();
