import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ShellSession } from "../../src/tools/shellSession.js";

const isWin = process.platform === "win32";
let session: ShellSession | undefined;
afterEach(() => {
  session?.dispose();
  session = undefined;
});

/** True while the OS still has a process with this pid (process.kill(pid,0) is the
 *  cross-platform liveness probe: ESRCH => gone, success/EPERM => still present). */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
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

describe("ShellSession persistence", () => {
  it("persists cwd across separate exec calls", async () => {
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    await mkdir(join(root, "sub"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    await session.exec(isWin ? "Set-Location sub" : "cd sub", 30000);
    const r = await session.exec(isWin ? "(Get-Location).Path" : "pwd -P", 30000);
    expect(r.output.replace(/\\/g, "/").toLowerCase()).toContain("/sub");
    expect(r.cwd.replace(/\\/g, "/").toLowerCase()).toContain("/sub");
  }, 30000);

  it("persists an env var across exec calls", async () => {
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    await session.exec(isWin ? "$env:S10VAR='hello'" : "export S10VAR=hello", 30000);
    const r = await session.exec(isWin ? "Write-Output $env:S10VAR" : "echo $S10VAR", 30000);
    expect(r.output).toContain("hello");
  }, 30000);

  it("parses a non-zero exit code and strips the sentinel", async () => {
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    // Deterministic non-zero exit on the actual platform.
    const r = await session.exec(isWin ? "cmd /c exit 3" : "(exit 3)", 30000);
    expect(r.exitCode).toBe(3);
    // exit code surfaced; marker not visible in output
    expect(r.output).not.toMatch(/__XENESIS_SH_/);
  }, 30000);

  it("merges stderr into stdout", async () => {
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    const r = await session.exec(
      isWin ? "Write-Error 'errline'" : "echo errline 1>&2",
      30000
    );
    expect(r.output).toContain("errline");
    expect(r.output).not.toMatch(/__XENESIS_SH_/);
  }, 30000);

  it("times out and recovers (kill+restart) so a later command still runs", async () => {
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    const slow = await session.exec(isWin ? "Start-Sleep -Seconds 10" : "sleep 10", 300);
    expect(slow.timedOut).toBe(true);
    const r = await session.exec(isWin ? "Write-Output ok" : "echo ok", 30000);
    expect(r.output).toContain("ok");
  }, 30000);

  it("emits the sentinel on a terminating error (no hang, no kill+restart)", async () => {
    // A PowerShell `throw` is a TERMINATING error that aborts the input line. The
    // marker must still emit so the command resolves promptly instead of hanging
    // until timeoutMs and tearing down the session. A short timeout (3s) proves
    // this: a regression would time out instead of returning quickly.
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    const r = await session.exec(isWin ? "throw 'boom'" : "false", 3000);
    expect(r.timedOut).toBe(false);
    expect(r.exitCode).not.toBe(0);
    expect(r.output).not.toMatch(/__XENESIS_SH_/);
    if (isWin) expect(r.output).toContain("boom");
    // Session survives: env exports from before the error persist (no restart).
    await session.exec(isWin ? "$env:S10TERM='kept'" : "export S10TERM=kept", 30000);
    const bad = await session.exec(
      isWin ? "Get-Item 'Z:\\definitely-missing' -ErrorAction Stop" : "false",
      3000
    );
    expect(bad.timedOut).toBe(false);
    expect(bad.exitCode).not.toBe(0);
    const kept = await session.exec(
      isWin ? "Write-Output $env:S10TERM" : "echo $S10TERM",
      30000
    );
    expect(kept.output).toContain("kept");
  }, 30000);

  it("dispose() kills the tracked child PID — no orphan process survives", async () => {
    // Spec §5 + global constraint #1: cleanupSession/dispose must kill the session
    // child strictly by its tracked PID via killProcessTree, leaving NO live process.
    // A no-throw assertion is too weak (dispose kills fire-and-forget), so this probes
    // the OS: capture the real spawned pid, confirm it is alive, dispose, then poll
    // until the OS reports it gone.
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    // Force a real child to spawn and run a command so the pid is established.
    await session.exec(isWin ? "Write-Output up" : "echo up", 30000);
    const pid = session.childPid;
    expect(pid).toBeGreaterThan(0);
    expect(isAlive(pid!)).toBe(true);

    session.dispose();
    session = undefined; // afterEach must not double-dispose

    const dead = await waitFor(() => !isAlive(pid!), 15000);
    expect(dead).toBe(true);
  }, 30000);

  it("restart (timeout recovery) kills the OLD child PID and spawns a fresh one", async () => {
    // Global constraint #1/#2: a timed-out command triggers kill+restart of the child
    // by its tracked PID; the stale child must not survive as an orphan, and a new pid
    // is established for the recovering command.
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    await session.exec(isWin ? "Write-Output up" : "echo up", 30000);
    const firstPid = session.childPid;
    expect(firstPid).toBeGreaterThan(0);

    const slow = await session.exec(isWin ? "Start-Sleep -Seconds 10" : "sleep 10", 300);
    expect(slow.timedOut).toBe(true);

    const oldDead = await waitFor(() => !isAlive(firstPid!), 15000);
    expect(oldDead).toBe(true);

    // The session recovers on a fresh child with a different pid.
    const r = await session.exec(isWin ? "Write-Output ok" : "echo ok", 30000);
    expect(r.output).toContain("ok");
    expect(session.childPid).toBeGreaterThan(0);
    expect(session.childPid).not.toBe(firstPid);
  }, 30000);

  it("reports a non-zero exit code for a NON-terminating shell error (matches stateless path)", async () => {
    // BUG 1 regression guard: a NON-terminating PowerShell error (no -ErrorAction Stop,
    // no throw) sets `$?` to $false but does NOT abort the line. On win32 the wrapper
    // must capture `$?` INSIDE the scriptblock, before `Out-String -Stream` (which
    // succeeds) overwrites it — otherwise the session reports exitCode 0 while the
    // stateless one-shot buildShellInvocation reports exit 1 for the same command,
    // breaching the model-visible {ok,content} backward-compat contract.
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    const r = await session.exec(
      isWin ? "Get-ChildItem 'Z:\\nope-xenesis-does-not-exist'" : "ls /nope-xenesis-does-not-exist",
      30000
    );
    expect(r.timedOut).toBe(false);
    expect(r.exitCode).not.toBe(0);
    expect(r.output).not.toMatch(/__XENESIS_SH_/);
  }, 30000);

  it("strips the marker (no hang/leak) when a command writes with NO trailing newline", async () => {
    // BUG 2 regression guard: a raw console write with no trailing newline (win32) or
    // printf without "\n" (POSIX) would glue the marker onto that line. The read regex
    // is `^`-anchored (m-flag), so the marker fails to match, leaks into visible output,
    // and the read hangs until timeoutMs (kill+restart). The wrapper must emit the marker
    // on its own line. A short timeout (3s) proves it resolves promptly instead of hanging.
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    const r = await session.exec(
      isWin ? "[Console]::Out.Write('NONL_S10')" : "printf 'NONL_S10'",
      3000
    );
    expect(r.timedOut).toBe(false);
    expect(r.output).toContain("NONL_S10");
    expect(r.output).not.toMatch(/__XENESIS_SH_/);
  }, 30000);

  it("parses a negative exit code (no hang, no marker leak)", async () => {
    // On win32 a native exe can set a NEGATIVE $LASTEXITCODE. The marker regex must
    // accept a leading minus, else the marker fails to match, leaks into output, and
    // the command hangs until timeoutMs. A short timeout (3s) proves it resolves fast.
    const root = await mkdtemp(join(tmpdir(), "s10-"));
    session = new ShellSession({ workspaceRoot: root, cwd: root });
    const r = await session.exec('node -e "process.exit(-1)"', 3000);
    expect(r.timedOut).toBe(false);
    expect(r.output).not.toMatch(/__XENESIS_SH_/);
    // node exit(-1) wraps to 255 on POSIX; on win32 $LASTEXITCODE is -1.
    expect(r.exitCode).not.toBe(0);
  }, 30000);
});
