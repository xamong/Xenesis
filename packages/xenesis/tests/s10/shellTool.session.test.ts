import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createShellTool } from '../../src/tools/shellTool.js';
import type { ToolContext } from '../../src/tools/types.js';

const isWin = process.platform === 'win32';

type LifecycleEvent = {
  sessionId: string;
  pid: number | undefined;
  phase: 'spawn' | 'dispose';
};

/** True while the OS still has a process with this pid (process.kill(pid,0) is the
 *  cross-platform liveness probe: ESRCH => gone, success/EPERM => still present). */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Poll until `predicate` holds or the deadline passes; returns the final result. */
async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return predicate();
}

function ctx(root: string, sessionId: string): ToolContext {
  let cwd = root;
  return {
    workspaceRoot: root,
    cwd,
    sessionId,
    env: process.env,
    todos: [],
    emit: () => undefined,
    setCwd: (next: string) => {
      cwd = next;
    },
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

describe('createShellTool persistence + lifecycle', () => {
  it('persists cwd across two run() calls in the same session, then cleanupSession disposes', async () => {
    const root = await mkdtemp(join(tmpdir(), 's10t-'));
    const tool = createShellTool({ persistent: true, idleTimeoutMs: 300000 });
    await tool.run({ command: isWin ? "$env:T='1'" : 'export T=1', timeoutMs: 30000 } as never, ctx(root, 'S'));
    const r = await tool.run(
      { command: isWin ? 'Write-Output $env:T' : 'echo $T', timeoutMs: 30000 } as never,
      ctx(root, 'S'),
    );
    expect(r.ok).toBe(true);
    expect(r.content).toContain('1');
    await tool.cleanupSession?.('S'); // no throw; child disposed
  }, 30000);

  it('persistent:false uses the stateless path (no session persistence)', async () => {
    const root = await mkdtemp(join(tmpdir(), 's10t-'));
    const tool = createShellTool({ persistent: false, idleTimeoutMs: 300000 });
    await tool.run({ command: isWin ? "$env:T2='x'" : 'export T2=x', timeoutMs: 30000 } as never, ctx(root, 'S2'));
    const r = await tool.run(
      { command: isWin ? 'Write-Output $env:T2' : 'echo $T2', timeoutMs: 30000 } as never,
      ctx(root, 'S2'),
    );
    // stateless: the var does NOT persist between separate one-shot spawns
    expect(r.content).not.toContain('x');
  }, 30000);

  it('reports a non-zero exit code as a failed result on the persistent path', async () => {
    const root = await mkdtemp(join(tmpdir(), 's10t-'));
    const tool = createShellTool({ persistent: true, idleTimeoutMs: 300000 });
    const r = await tool.run(
      { command: isWin ? 'cmd /c exit 4' : '(exit 4)', timeoutMs: 30000 } as never,
      ctx(root, 'EXIT'),
    );
    expect(r.ok).toBe(false);
    expect(r.content).toContain('exit code 4');
    await tool.cleanupSession?.('EXIT');
  }, 30000);

  it('surfaces a per-command timeout as a failed result and the session recovers', async () => {
    const root = await mkdtemp(join(tmpdir(), 's10t-'));
    const tool = createShellTool({ persistent: true, idleTimeoutMs: 300000 });
    const slow = await tool.run(
      { command: isWin ? 'Start-Sleep -Seconds 10' : 'sleep 10', timeoutMs: 300 } as never,
      ctx(root, 'TO'),
    );
    expect(slow.ok).toBe(false);
    expect(slow.content).toMatch(/timed out/i);
    const r = await tool.run(
      { command: isWin ? 'Write-Output recovered' : 'echo recovered', timeoutMs: 30000 } as never,
      ctx(root, 'TO'),
    );
    expect(r.ok).toBe(true);
    expect(r.content).toContain('recovered');
    await tool.cleanupSession?.('TO');
  }, 30000);

  it('contains a cd that escapes the workspace and rejects the command', async () => {
    // The persistent session tracks cwd from the sentinel and enforces it inside the
    // workspace. A cd to the parent (outside the workspace root) must be rejected and
    // the session restarted so a later in-workspace command still runs at the root.
    const parent = await mkdtemp(join(tmpdir(), 's10out-'));
    const root = join(parent, 'ws');
    await mkdir(root);
    const tool = createShellTool({ persistent: true, idleTimeoutMs: 300000 });
    const escaped = await tool.run(
      { command: isWin ? 'Set-Location ..' : 'cd ..', timeoutMs: 30000 } as never,
      ctx(root, 'ESC'),
    );
    expect(escaped.ok).toBe(false);
    expect(escaped.content).toMatch(/outside the workspace/i);
    // The session recovers at the workspace root for the next command.
    const back = await tool.run(
      { command: isWin ? 'Write-Output back' : 'echo back', timeoutMs: 30000 } as never,
      ctx(root, 'ESC'),
    );
    expect(back.ok).toBe(true);
    expect(back.content).toContain('back');
    await tool.cleanupSession?.('ESC');
  }, 30000);

  it('still blocks destructive commands on the persistent path before spawning', async () => {
    const root = await mkdtemp(join(tmpdir(), 's10t-'));
    const tool = createShellTool({ persistent: true, idleTimeoutMs: 300000 });
    const r = await tool.run(
      { command: 'Remove-Item -Recurse missing-target', timeoutMs: 30000 } as never,
      ctx(root, 'GUARD'),
    );
    expect(r.ok).toBe(false);
    expect(r.content).toMatch(/blocked|destructive/i);
    await tool.cleanupSession?.('GUARD');
  }, 30000);

  it('cleanupSession kills the tracked child PID — no live process after dispose', async () => {
    // Spec §5: cleanupSession disposes the child so no live process survives. The
    // no-throw assertion elsewhere is too weak; this captures the EXACT pid the tool
    // tracks for killProcessTree (via the lifecycle seam), confirms it is alive after
    // spawn, then OS-asserts it is dead after cleanupSession.
    const root = await mkdtemp(join(tmpdir(), 's10t-'));
    const events: LifecycleEvent[] = [];
    const tool = createShellTool({
      persistent: true,
      idleTimeoutMs: 300000,
      onSessionLifecycle: (e) => events.push(e),
    });
    await tool.run({ command: isWin ? 'Write-Output up' : 'echo up', timeoutMs: 30000 } as never, ctx(root, 'KILL'));
    const spawn = events.find((e) => e.phase === 'spawn' && e.sessionId === 'KILL');
    expect(spawn?.pid).toBeGreaterThan(0);
    const pid = spawn!.pid!;
    expect(isAlive(pid)).toBe(true);

    await tool.cleanupSession?.('KILL');
    // The tool reports the dispose for the same tracked pid...
    expect(events.some((e) => e.phase === 'dispose' && e.sessionId === 'KILL' && e.pid === pid)).toBe(true);
    // ...and the OS confirms the child is actually gone (no orphan).
    const dead = await waitFor(() => !isAlive(pid), 15000);
    expect(dead).toBe(true);
  }, 40000);

  it('idle-timeout does not dispose a command while it is still running', async () => {
    const root = await mkdtemp(join(tmpdir(), 's10t-'));
    const events: LifecycleEvent[] = [];
    const tool = createShellTool({
      persistent: true,
      idleTimeoutMs: 100,
      onSessionLifecycle: (e) => events.push(e),
    });

    const r = await tool.run(
      {
        command: isWin ? 'Start-Sleep -Milliseconds 250; Write-Output up' : 'sleep 0.25; echo up',
        timeoutMs: 2000,
      } as never,
      ctx(root, 'ACTIVE_IDLE'),
    );

    expect(r.ok).toBe(true);
    expect(r.content).toContain('up');
    const spawn = events.find((e) => e.phase === 'spawn' && e.sessionId === 'ACTIVE_IDLE');
    expect(spawn?.pid).toBeGreaterThan(0);
    const pid = spawn!.pid!;
    expect(isAlive(pid)).toBe(true);

    await tool.cleanupSession?.('ACTIVE_IDLE');
    const dead = await waitFor(() => !isAlive(pid), 15000);
    expect(dead).toBe(true);
  }, 10000);

  it('idle-timeout disposes a stale session — the tracked child PID is killed', async () => {
    // Spec §5: an idle-timer disposes a stale session. Existing tests use a 5-min
    // timeout and never fire it; here a short REAL idle timeout (the timer is unref'd
    // setTimeout, so we let wall-clock advance) elapses with no further commands. The
    // dispose must be driven by the idle timer (not cleanupSession), and the OS must
    // report the tracked child dead.
    const root = await mkdtemp(join(tmpdir(), 's10t-'));
    const events: LifecycleEvent[] = [];
    const tool = createShellTool({
      persistent: true,
      idleTimeoutMs: 700,
      onSessionLifecycle: (e) => events.push(e),
    });
    await tool.run({ command: isWin ? 'Write-Output up' : 'echo up', timeoutMs: 30000 } as never, ctx(root, 'IDLE'));
    const spawn = events.find((e) => e.phase === 'spawn' && e.sessionId === 'IDLE');
    expect(spawn?.pid).toBeGreaterThan(0);
    const pid = spawn!.pid!;
    expect(isAlive(pid)).toBe(true);

    // Do nothing: let the idle timer (700ms) fire and dispose the session on its own.
    const disposed = await waitFor(
      () => events.some((e) => e.phase === 'dispose' && e.sessionId === 'IDLE' && e.pid === pid),
      15000,
    );
    expect(disposed).toBe(true);
    // The OS confirms the idle-disposed child is actually gone.
    const dead = await waitFor(() => !isAlive(pid), 15000);
    expect(dead).toBe(true);
  }, 40000);
});
