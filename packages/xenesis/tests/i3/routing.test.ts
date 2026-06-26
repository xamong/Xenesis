import { describe, it, expect } from "vitest";
import { createShellTool } from "../../src/tools/shellTool.js";
import { diagnosticsTool } from "../../src/tools/runtimeTools.js";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const isWin = process.platform === "win32";
const fakeResult = { exitCode: 0, stdout: "FAKE_BACKEND_OUTPUT", stderr: "", timedOut: false, truncated: false };
const fakeBackend = { kind: "docker" as const, run: async () => fakeResult, runArgs: async () => fakeResult };
const ctx = (root: string, extra: any = {}) =>
  ({ workspaceRoot: root, cwd: root, sessionId: "I3", env: process.env, setCwd: () => {}, ...extra } as any);

describe("shellTool routes the stateless path through context.executionBackend", () => {
  it("a fake backend intercepts (real shell not spawned)", async () => {
    const root = await mkdtemp(join(tmpdir(), "i3r-"));
    const tool = createShellTool({ persistent: false, idleTimeoutMs: 300000 }); // stateless path
    const r = await tool.run(
      { command: isWin ? "Write-Output real" : "echo real", timeoutMs: 30000, background: false } as any,
      ctx(root, { executionBackend: fakeBackend })
    );
    expect(r.content).toContain("FAKE_BACKEND_OUTPUT"); // proves routing; the real command would print "real"
  }, 30000);

  it("with the default (local) backend, output is the real command (byte-parity)", async () => {
    const root = await mkdtemp(join(tmpdir(), "i3r-"));
    const tool = createShellTool({ persistent: false, idleTimeoutMs: 300000 });
    const r = await tool.run(
      { command: isWin ? "Write-Output real" : "echo real", timeoutMs: 30000, background: false } as any,
      ctx(root)
    ); // no executionBackend -> LOCAL
    expect(r.content).toContain("real");
  }, 30000);
});

describe("diagnosticsTool routes runCommandArgs through context.executionBackend", () => {
  it("a fake backend intercepts (real npm not spawned)", async () => {
    const root = await mkdtemp(join(tmpdir(), "i3rd-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ name: "i3-diag", scripts: { typecheck: "echo should-not-run" } }),
      "utf8"
    );
    const r = await diagnosticsTool.run(
      { script: "typecheck", args: [], timeoutMs: 30000, maxOutputChars: 20000 } as any,
      ctx(root, { executionBackend: fakeBackend })
    );
    expect(r.content).toContain("FAKE_BACKEND_OUTPUT"); // proves routing through runArgs
  }, 30000);
});
