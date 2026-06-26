import { describe, it, expect } from "vitest";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { serverTool } from "../../src/tools/runtimeTools.js";
import { createTempWorkspace } from "../helpers/tempWorkspace.js";
import type { ToolContext } from "../../src/tools/types.js";

function toolContext(workspaceRoot: string): ToolContext {
  return {
    workspaceRoot,
    cwd: workspaceRoot,
    sessionId: "server-env-scrub-test",
    todos: [],
    emit: () => {},
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
  } as ToolContext;
}

async function readJsonWithRetry(path: string): Promise<Record<string, string>> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`env dump not written: ${path}`);
}

describe("server_start scrubs secrets from the managed child env", () => {
  it("does not leak *_API_KEY secrets to the spawned managed server", async () => {
    const workspace = await createTempWorkspace("xenesis-server-env-");
    const context = toolContext(workspace.root);
    const hadPriorValue = "FOO_API_KEY" in process.env;
    const priorValue = process.env.FOO_API_KEY;
    process.env.FOO_API_KEY = "leak-me-please";
    try {
      const serverDir = workspace.root;
      const serverPath = join(serverDir, "dump-server.mjs");
      await mkdir(serverDir, { recursive: true });
      await writeFile(
        serverPath,
        [
          `import { writeFileSync } from "node:fs";`,
          // The child writes its OWN process.env so the test can inspect what the spawn handed it.
          `writeFileSync("env-dump.json", JSON.stringify(process.env));`,
          `console.log("dump-server ready");`,
          `setInterval(() => {}, 1000);`
        ].join("\n"),
        "utf8"
      );

      const result = await serverTool.run(
        { action: "start", name: "envtest", command: "node dump-server.mjs", cwd: "." },
        context
      );
      expect(result.ok).toBe(true);

      const childEnv = await readJsonWithRetry(join(serverDir, "env-dump.json"));
      // The secret must NOT reach the child.
      expect(childEnv.FOO_API_KEY).toBeUndefined();
      // Sanity: a non-secret var still passes through, proving env was populated (not empty).
      expect(childEnv.PATH ?? childEnv.Path).toBeDefined();
    } finally {
      await serverTool.run({ action: "stop", name: "envtest", cwd: "." }, context).catch(() => {});
      if (hadPriorValue) process.env.FOO_API_KEY = priorValue;
      else delete process.env.FOO_API_KEY;
      await workspace.cleanup();
    }
  }, 20000);
});
