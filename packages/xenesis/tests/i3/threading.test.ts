import { describe, it, expect } from "vitest";
import { z } from "zod";
import { LocalExecutionBackend } from "../../src/core/isolation/executionBackend.js";
import { createToolRegistryKernelExecutor } from "../../src/core/kernel/ToolRegistryKernelExecutor.js";
import type { ToolContext, Tool, ToolRegistry } from "../../src/tools/types.js";
import type { ExecutionBackend } from "../../src/core/isolation/executionBackend.js";

const noopLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

function makeProbeRegistry(onRun: (ctx: ToolContext) => void): ToolRegistry {
  const probeTool: Tool<Record<string, never>, unknown> = {
    name: "probe",
    description: "captures tool context",
    inputSchema: z.object({}).passthrough() as unknown as z.ZodType<Record<string, never>, z.ZodTypeDef, unknown>,
    isReadOnly: () => true,
    async run(_input, ctx) {
      onRun(ctx);
      return { ok: true, content: "ok" };
    }
  };
  return new Map([["probe", probeTool as Tool]]);
}

const stubToolCall = {
  type: "tool_use" as const,
  id: "tc-1",
  name: "probe",
  input: {}
};

describe("executionBackend threading", () => {
  it("ToolContext passed to a tool has executionBackend (defaults to local)", async () => {
    let captured: ToolContext | undefined;
    const registry = makeProbeRegistry((ctx) => { captured = ctx; });
    const executor = createToolRegistryKernelExecutor({
      registry,
      workspaceRoot: process.cwd(),
      cwd: process.cwd(),
      logger: noopLogger
    });
    await executor.execute({ toolCall: stubToolCall, runId: "run-1", turn: 1, sequence: 1 });
    expect(captured).toBeDefined();
    expect(captured!.executionBackend).toBeDefined();
    expect(captured!.executionBackend!.kind).toBe("local");
    expect(captured!.executionBackend).toBeInstanceOf(LocalExecutionBackend);
  });

  it("an injected non-local backend reaches the tool context", async () => {
    let captured: ToolContext | undefined;
    const registry = makeProbeRegistry((ctx) => { captured = ctx; });
    const fake: ExecutionBackend = {
      kind: "docker",
      run: async () => ({ exitCode: 0, stdout: "", stderr: "", timedOut: false, truncated: false }),
      runArgs: async () => ({ exitCode: 0, stdout: "", stderr: "", timedOut: false, truncated: false })
    };
    const executor = createToolRegistryKernelExecutor({
      registry,
      workspaceRoot: process.cwd(),
      cwd: process.cwd(),
      logger: noopLogger,
      executionBackend: fake
    });
    await executor.execute({ toolCall: stubToolCall, runId: "run-2", turn: 1, sequence: 1 });
    expect(captured).toBeDefined();
    expect(captured!.executionBackend).toBe(fake);
  });
});
