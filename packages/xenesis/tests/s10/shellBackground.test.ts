import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createShellTool } from "../../src/tools/shellTool.js";
import { shellProcessRegistry } from "../../src/tools/shellProcessRegistry.js";

const isWin = process.platform === "win32";
const ctx = (root: string, sessionId = "BG") =>
  ({
    workspaceRoot: root,
    cwd: root,
    sessionId,
    env: process.env,
    setCwd: () => {}
  }) as any;

describe("shell background routing", () => {
  it("background:true returns a background ack and does not block on a long command", async () => {
    const root = await mkdtemp(join(tmpdir(), "s10bg-"));
    const tool = createShellTool({ persistent: true, idleTimeoutMs: 300000 });
    const start = Date.now();
    const r = await tool.run(
      {
        command: isWin ? "Start-Sleep -Seconds 30" : "sleep 30",
        timeoutMs: 30000,
        background: true
      } as any,
      ctx(root, "BG1")
    );
    const elapsed = Date.now() - start;

    expect(r.ok).toBe(true);
    // Did NOT block for the 30s command — the ack returned promptly.
    expect(elapsed).toBeLessThan(10000);
    // The ack references the background process handle (not the command output),
    // and exposes the registry id so the process tool can poll/kill it.
    expect((r as any).data?.sessionId).toMatch(/^proc-/);
    expect(r.content).toContain((r as any).data.sessionId);

    // The process was registered under the agent session and is reachable for cleanup.
    const listed = shellProcessRegistry.list("BG1");
    expect(listed.some((s) => s.id === (r as any).data.sessionId)).toBe(true);

    // Clean up the spawned long-running process so it does not leak past the test.
    await shellProcessRegistry.killAllForSession("BG1");
  }, 15000);

  it("background:true inherits the persistent session's LIVE cwd after a prior cd", async () => {
    // Non-vacuous discriminator for shellTool.ts `sessions.get(...)?.session.cwd ?? cwd`:
    // a foreground `cd sub` must STICK for the next background spawn. If the code used the
    // `?? cwd` (context.cwd === workspace root) fallback instead of the live session cwd,
    // the background process's registry cwd would be the root and the `/sub` assertion
    // would FAIL — so this proves the live-session-cwd branch is exercised, not the fallback.
    const root = await mkdtemp(join(tmpdir(), "s10bg-"));
    await mkdir(join(root, "sub"));
    const tool = createShellTool({ persistent: true, idleTimeoutMs: 300000 });

    // Foreground `cd sub` warms the persistent session AND moves its tracked cwd into the
    // subdir (the boundary check passes: sub is inside root).
    const cdResult = await tool.run(
      { command: isWin ? "Set-Location sub" : "cd sub", timeoutMs: 30000 } as any,
      ctx(root, "BG2")
    );
    expect(cdResult.ok).toBe(true);

    const r = await tool.run(
      {
        command: isWin ? "Start-Sleep -Seconds 30" : "sleep 30",
        timeoutMs: 30000,
        background: true
      } as any,
      ctx(root, "BG2")
    );

    expect(r.ok).toBe(true);
    const session = shellProcessRegistry.list("BG2").find((s) => s.id === (r as any).data.sessionId);
    expect(session).toBeDefined();
    // The background process inherited the LIVE session cwd (the subdir), proving the
    // prior `cd sub` stuck rather than the spawn resetting to the workspace-root fallback.
    const bgCwd = session!.cwd.replace(/\\/g, "/").toLowerCase();
    expect(bgCwd).toContain("/sub");
    // It is still the warmed session's cwd, i.e. inside the workspace root, not some
    // unrelated path. (root may be an 8.3/symlink path vs. the sentinel's canonical
    // Get-Location, so we assert the discriminating /sub leaf rather than the full root.)
    expect(bgCwd.endsWith("/sub")).toBe(true);

    await tool.cleanupSession?.("BG2");
    await shellProcessRegistry.killAllForSession("BG2");
  }, 15000);

  it("background:true still runs the per-command guards (destructive blocked)", async () => {
    const root = await mkdtemp(join(tmpdir(), "s10bg-"));
    const tool = createShellTool({ persistent: true, idleTimeoutMs: 300000 });
    const r = await tool.run(
      {
        command: "Remove-Item -Recurse missing-target",
        timeoutMs: 30000,
        background: true
      } as any,
      ctx(root, "BG3")
    );
    expect(r.ok).toBe(false);
    expect(r.content).toMatch(/blocked|destructive/i);
    // Nothing was spawned for a blocked command.
    expect(shellProcessRegistry.list("BG3").length).toBe(0);
  }, 15000);
});
