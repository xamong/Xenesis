import { realpath } from "node:fs/promises";
import { z } from "zod";
import { computeShellEnv } from "../core/isolation/secretScrub.js";
import { LOCAL_BACKEND } from "../core/isolation/executionBackend.js";
import {
  findShellCommandOutsideWorkspacePath,
  isDestructiveShellCommand,
  isLowRiskShellCommand
} from "../permissions/shellRisk.js";
import { assertExistingPathInsideWorkspace, isPathInside } from "../utils/workspace.js";
import { ShellSession } from "./shellSession.js";
import { shellProcessRegistry } from "./shellProcessRegistry.js";
import type { Tool, ToolContext } from "./types.js";

// Re-export so existing importers (and the persistent ShellSession) can keep
// `import { computeShellEnv } from ".../tools/shellTool.js"`; the implementation now
// lives in the secretScrub leaf module to avoid a tool<->session import cycle.
export { computeShellEnv };

const shellInput = z.object({
  command: z.string().min(1),
  timeoutMs: z.number().int().positive().max(120000).default(30000),
  /**
   * Run the command as a detached BACKGROUND process (via {@link ShellProcessRegistry})
   * instead of the foreground persistent shell. Returns immediately with a registry
   * handle; use the `process` tool (poll/log/wait/kill) to manage it. The per-command
   * guards still run first, and the process inherits the session's current cwd.
   */
  background: z.boolean().default(false)
});

type ShellInput = z.infer<typeof shellInput>;

export interface ShellToolOptions {
  /** Route commands through a long-lived per-session shell (default true). When false, every command spawns a fresh one-shot shell (the historical stateless behavior). */
  persistent: boolean;
  /** Dispose an idle session shell after this many ms of inactivity (an unref'd safety-net timer). */
  idleTimeoutMs: number;
  /**
   * Observability seam (no-op in production; unset by the registry/defaults): invoked
   * with the tracked child pid each time a session's shell is (re)spawned, and with
   * `undefined` when a session is disposed. Lets lifecycle tests assert the no-orphan /
   * idle-disposal invariants against the EXACT pid the tool tracks for killProcessTree,
   * rather than inferring it by enumerating OS processes. Never affects behavior.
   */
  onSessionLifecycle?: (event: {
    sessionId: string;
    pid: number | undefined;
    phase: "spawn" | "dispose";
  }) => void;
}

interface SessionEntry {
  session: ShellSession;
  idleTimer?: NodeJS.Timeout;
  activeRuns: number;
  /** Last child pid reported via onSessionLifecycle, so a restart (new pid) re-emits "spawn" but a no-op exec does not. */
  lastReportedPid?: number;
}

function shellEnv(context: ToolContext): NodeJS.ProcessEnv | undefined {
  return computeShellEnv(context.env ?? process.env);
}

/**
 * Run the per-command security guards that apply equally to the stateless and the
 * persistent path: cwd must be inside the workspace; the command must not be
 * destructive; the command must not write to an absolute path outside the workspace.
 * Returns the validated cwd on success, or a failed tool result to short-circuit.
 */
async function runGuards(
  input: ShellInput,
  context: ToolContext
): Promise<{ ok: true; cwd: string } | { ok: false; content: string }> {
  let cwd: string;
  try {
    cwd = await assertExistingPathInsideWorkspace(context.workspaceRoot, context.cwd);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, content: `Cannot run shell command: cwd is outside the workspace. ${message}` };
  }

  if (isDestructiveShellCommand(input.command)) {
    return { ok: false, content: "Blocked shell command: destructive command detected." };
  }

  const outsidePath = findShellCommandOutsideWorkspacePath(input.command, context.workspaceRoot);
  if (outsidePath) {
    return { ok: false, content: `Blocked shell command: command writes outside the workspace: ${outsidePath}` };
  }

  return { ok: true, cwd };
}

/**
 * Stateless one-shot path (the `persistent:false` behavior and the spawn-failure
 * fallback): spawn a fresh shell per command via the context's execution backend
 * (defaulting to {@link LOCAL_BACKEND}, which is `runCommand` byte-for-byte) and map
 * the result to the model-visible `{ ok, content }` shape. cwd is already validated.
 */
async function runStateless(input: ShellInput, context: ToolContext, cwd: string) {
  const env = shellEnv(context);
  const result = await (context.executionBackend ?? LOCAL_BACKEND).run({
    command: input.command,
    cwd,
    timeoutMs: input.timeoutMs,
    ...(env ? { env } : {})
  });

  if (result.timedOut) {
    return { ok: false, content: `Command timed out after ${input.timeoutMs}ms.` };
  }

  const outputParts = [result.stdout.trimEnd(), result.stderr.trimEnd()].filter(Boolean);
  if (result.truncated) outputParts.push("[output truncated after 100000 characters]");
  const output = outputParts.join("\n");
  if (result.exitCode !== 0) {
    return {
      ok: false,
      content: `Command failed with exit code ${result.exitCode}.\n${output}`.trim()
    };
  }

  return { ok: true, content: output || "Command completed with no output." };
}

/**
 * Build the `shell` tool. When `options.persistent` is true the tool closes over a
 * `Map<sessionId, SessionEntry>` of long-lived shell subprocesses (mirroring
 * `createBrowserTool`): each session is lazily spawned, kept alive across `run()`
 * calls so `cd`/`export` persist, reset on an unref'd idle-timeout, and torn down by
 * `cleanupSession` (fanned out by `AgentRunner.cleanupToolSessions`). When false, the
 * tool falls back to the historical stateless one-shot `runCommand` path.
 */
export function createShellTool(options: ShellToolOptions): Tool<ShellInput> {
  const sessions = new Map<string, SessionEntry>();

  function disposeSession(sessionId: string): void {
    const entry = sessions.get(sessionId);
    if (!entry) return;
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    sessions.delete(sessionId);
    const pid = entry.session.childPid;
    entry.session.dispose();
    options.onSessionLifecycle?.({ sessionId, pid, phase: "dispose" });
  }

  // Report a (re)spawn the first time a session's tracked child pid appears or changes
  // (e.g. after a kill+restart). No-op when the pid is unchanged or the seam is unset.
  function reportSpawn(sessionId: string, entry: SessionEntry): void {
    if (!options.onSessionLifecycle) return;
    const pid = entry.session.childPid;
    if (pid !== undefined && pid !== entry.lastReportedPid) {
      entry.lastReportedPid = pid;
      options.onSessionLifecycle({ sessionId, pid, phase: "spawn" });
    }
  }

  function clearIdleTimer(entry: SessionEntry): void {
    if (!entry.idleTimer) return;
    clearTimeout(entry.idleTimer);
    entry.idleTimer = undefined;
  }

  function scheduleIdleTimer(sessionId: string, entry: SessionEntry): void {
    clearIdleTimer(entry);
    entry.idleTimer = setTimeout(() => {
      disposeSession(sessionId);
    }, options.idleTimeoutMs);
    entry.idleTimer.unref?.();
  }

  function beginSessionRun(entry: SessionEntry): void {
    clearIdleTimer(entry);
    entry.activeRuns += 1;
  }

  function endSessionRun(sessionId: string, entry: SessionEntry): void {
    entry.activeRuns = Math.max(0, entry.activeRuns - 1);
    if (entry.activeRuns === 0 && sessions.get(sessionId) === entry) {
      scheduleIdleTimer(sessionId, entry);
    }
  }

  function entryFor(context: ToolContext, cwd: string): SessionEntry {
    let entry = sessions.get(context.sessionId);
    if (!entry) {
      const env = shellEnv(context);
      entry = {
        activeRuns: 0,
        session: new ShellSession({
          workspaceRoot: context.workspaceRoot,
          cwd,
          ...(env ? { env } : {})
        })
      };
      sessions.set(context.sessionId, entry);
    }
    clearIdleTimer(entry);
    return entry;
  }

  return {
    name: "shell",
    description:
      "Run a shell command in the workspace with timeout and captured output. On Windows this runs in PowerShell; avoid POSIX heredocs such as python - <<'PY' and prefer PowerShell-native commands.",
    inputSchema: shellInput,
    isReadOnly: (input) => isLowRiskShellCommand(input.command),
    cleanupSession: async (sessionId: string) => {
      disposeSession(sessionId);
    },
    async run(input, context) {
      // Per-command guards run FIRST, identically on every path (a long-lived
      // session — and a detached background process — must not let an un-guarded
      // command through).
      const guard = await runGuards(input, context);
      if (!guard.ok) return { ok: false, content: guard.content };
      const cwd = guard.cwd;

      // Background route: hand the command to the detached ShellProcessRegistry
      // (separate from the foreground persistent shell) and return its ack
      // immediately. This runs regardless of `options.persistent` so a one-shot
      // configuration can still launch background processes. The process inherits
      // the persistent session's CURRENT cwd when one is live (so a prior `cd`
      // sticks); otherwise the validated workspace cwd. Lifecycle (poll/log/wait/
      // kill) is the `process` tool's job, and teardown is covered by
      // ShellProcessRegistry.killAllForSession via processTool.cleanupSession — do
      // not spawn a foreground session just to read its cwd.
      if (input.background) {
        const bgCwd = sessions.get(context.sessionId)?.session.cwd ?? cwd;
        const env = shellEnv(context);
        const bg = shellProcessRegistry.spawn({
          sessionId: context.sessionId,
          command: input.command,
          cwd: bgCwd,
          ...(env ? { env } : {})
        });
        // Expose only a serializable handle to the model (the raw ShellSession holds
        // a ChildProcess + unbounded output buffer). `sessionId` is the registry id,
        // matching the `process` tool's `session_id` parameter convention.
        const ack = {
          sessionId: bg.id,
          command: bg.command,
          cwd: bg.cwd,
          pid: bg.pid,
          status: bg.exited ? ("exited" as const) : ("running" as const),
          reason: bg.reason
        };
        if (bg.exited && bg.reason === "failed_start") {
          return {
            ok: false,
            content: `Background process failed to start: ${bg.outputBuffer}`.trim(),
            data: ack
          };
        }
        return {
          ok: true,
          content: `Started background process ${bg.id} (pid ${bg.pid ?? "?"}). Use the process tool (poll/log/wait/kill) with session_id="${bg.id}" to manage it.`,
          data: ack
        };
      }

      // Stateless fallback: spawn a fresh shell per command (no persistence).
      if (!options.persistent) {
        return await runStateless(input, context, cwd);
      }

      // Persistent path: route through the per-session long-lived shell. If the
      // session cannot run the command (spawn failure surfaces as a thrown error
      // from exec's internals), fall back to the stateless one-shot path.
      let entry: SessionEntry;
      try {
        entry = entryFor(context, cwd);
      } catch {
        return await runStateless(input, context, cwd);
      }

      let r: { output: string; exitCode: number; cwd: string; timedOut: boolean };
      beginSessionRun(entry);
      try {
        r = await entry.session.exec(input.command, input.timeoutMs);
        reportSpawn(context.sessionId, entry);
      } catch {
        // The session shell is unusable: tear it down and fall back to one-shot.
        disposeSession(context.sessionId);
        return await runStateless(input, context, cwd);
      } finally {
        endSessionRun(context.sessionId, entry);
      }

      if (r.timedOut) {
        return { ok: false, content: `Command timed out after ${input.timeoutMs}ms.` };
      }

      // Workspace boundary: the command may have cd'd the session shell. Enforce
      // the tracked cwd inside the workspace; a session that escaped is restarted
      // (its dispose drops the poisoned child; the next run re-spawns at the
      // workspace root) and the command is rejected. `r.cwd` is the sentinel's
      // canonical (Get-Location) path, which may resolve symlinks / 8.3 short names;
      // compare against the workspace REAL path so a benign first command (no cd) is
      // not falsely flagged when the root itself is a symlink/short-name path.
      let boundaryRoot = context.workspaceRoot;
      try {
        boundaryRoot = await realpath(context.workspaceRoot);
      } catch {
        // Workspace root vanished mid-run; fall back to the raw root.
      }
      if (!isPathInside(boundaryRoot, r.cwd)) {
        disposeSession(context.sessionId);
        return {
          ok: false,
          content: "Blocked: command changed directory outside the workspace."
        };
      }
      // Reflect the persisted cwd on the per-run channel (display, background spawns).
      context.setCwd?.(r.cwd);

      if (r.exitCode !== 0) {
        return {
          ok: false,
          content: `Command failed with exit code ${r.exitCode}.\n${r.output}`.trim()
        };
      }

      return { ok: true, content: r.output || "Command completed with no output." };
    }
  };
}

/**
 * Default `shell` tool instance (persistent by default) so existing importers
 * (the tool registry, existing tests) keep `import { shellTool }` working until the
 * registry is rewired to call `createShellTool(config.shell)` directly. Uses the
 * documented defaults: persistent on, 5-minute idle timeout.
 */
export const shellTool: Tool<ShellInput> = createShellTool({
  persistent: true,
  idleTimeoutMs: 300000
});
