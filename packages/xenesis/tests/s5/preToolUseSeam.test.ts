import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { AgentRunner } from "../../src/core/AgentRunner.js";
import type { AgentRunnerOptions } from "../../src/core/AgentRunner.js";
import { HookRegistry } from "../../src/hooks/HookRegistry.js";
import type { BlockingHookRegistration } from "../../src/hooks/blocking.js";
import type { Tool } from "../../src/tools/types.js";
import type { AgentProvider, ProviderRequest, ProviderResponse } from "../../src/providers/types.js";
import type { AgentRunEvent } from "../../src/core/events.js";
import type { ToolCall } from "../../src/core/messages.js";

// A mock provider that issues exactly one tool call on the first turn, then a
// plain-text final answer with NO tool calls on every subsequent turn (so the
// run terminates after the single tool call resolves).
function singleToolCallProvider(toolCall: ToolCall): AgentProvider {
  let turn = 0;
  return {
    name: "mock",
    model: "mock-model",
    async complete(_request: ProviderRequest): Promise<ProviderResponse> {
      turn += 1;
      if (turn === 1) {
        return {
          message: { role: "assistant", content: "", toolCalls: [toolCall] },
          stopReason: "tool_use"
        };
      }
      return {
        message: { role: "assistant", content: "done." },
        stopReason: "stop"
      };
    }
  };
}

interface EchoRunArgs {
  cmd: string;
}

// A stub "echo" tool whose run() is a spy; mutating (not read-only) so it traverses
// the same gates a real mutation would, and records the args it was actually given.
function makeEchoTool() {
  const runSpy = vi.fn(async (input: EchoRunArgs) => ({
    ok: true,
    content: `ran: ${input.cmd}`
  }));
  const tool: Tool<EchoRunArgs> = {
    name: "echo",
    description: "echoes a command",
    inputSchema: z.object({ cmd: z.string() }),
    isReadOnly: () => false,
    run: runSpy as unknown as Tool<EchoRunArgs>["run"]
  };
  return { tool, runSpy };
}

// A read-only, concurrency-safe "peek" tool so the partitioner routes its calls
// through the concurrent path (collectToolRun), which must also consult the hook.
function makePeekTool() {
  const runSpy = vi.fn(async (input: EchoRunArgs) => ({
    ok: true,
    content: `peeked: ${input.cmd}`
  }));
  const tool: Tool<EchoRunArgs> = {
    name: "peek",
    description: "peeks a command",
    inputSchema: z.object({ cmd: z.string() }),
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    run: runSpy as unknown as Tool<EchoRunArgs>["run"]
  };
  return { tool, runSpy };
}

function twoToolCallProvider(toolCalls: ToolCall[]): AgentProvider {
  let turn = 0;
  return {
    name: "mock",
    model: "mock-model",
    async complete(_request: ProviderRequest): Promise<ProviderResponse> {
      turn += 1;
      if (turn === 1) {
        return {
          message: { role: "assistant", content: "", toolCalls },
          stopReason: "tool_use"
        };
      }
      return { message: { role: "assistant", content: "done." }, stopReason: "stop" };
    }
  };
}

function workspaceTmp(): string {
  return mkdtempSync(join(tmpdir(), "s5-pretooluse-"));
}

function baseOptions(tool: Tool, provider: AgentProvider, hookRegistry?: HookRegistry): AgentRunnerOptions {
  const workspaceRoot = workspaceTmp();
  return {
    provider,
    model: "mock-model",
    workspaceRoot,
    xenesisHome: join(workspaceRoot, ".xenesis"),
    approvalMode: "auto", // never block on permission ask in these tests
    maxTurns: 4,
    tools: [tool],
    hookRegistry
  } as AgentRunnerOptions;
}

async function drain(runner: AgentRunner, input: string): Promise<AgentRunEvent[]> {
  const events: AgentRunEvent[] = [];
  const iterator = runner.run(input);
  while (true) {
    const step = await iterator.next();
    if (step.done) break;
    events.push(step.value);
  }
  return events;
}

function toolResultEvents(events: AgentRunEvent[]) {
  return events.filter((e): e is Extract<AgentRunEvent, { type: "tool_result" }> => e.type === "tool_result");
}

const echoCall: ToolCall = { id: "call-1", name: "echo", input: { cmd: "ls" } };

describe("PreToolUse seam", () => {
  it("allow (empty registry) -> tool runs normally", async () => {
    const { tool, runSpy } = makeEchoTool();
    const runner = new AgentRunner(baseOptions(tool, singleToolCallProvider(echoCall)));
    const events = await drain(runner, "please echo ls");
    expect(runSpy).toHaveBeenCalledTimes(1);
    const results = toolResultEvents(events);
    expect(results.length).toBe(1);
    expect(results[0].ok).toBe(true);
    expect(results[0].message.content).toContain("ran: ls");
  });

  it("block -> tool.run NOT called, deny tool_result carries the reason, pairing intact", async () => {
    const { tool, runSpy } = makeEchoTool();
    const registry = new HookRegistry();
    registry.register({
      event: "pre_tool_use",
      handler: () => ({ decision: "block", reason: "blocked-by-hook-reason" })
    } satisfies BlockingHookRegistration);
    const runner = new AgentRunner(baseOptions(tool, singleToolCallProvider(echoCall), registry));
    const events = await drain(runner, "please echo ls");

    expect(runSpy).not.toHaveBeenCalled();
    const results = toolResultEvents(events);
    expect(results.length).toBe(1);
    // pairing: the deny lands in the tool_result position, addressed to the same tool call id.
    expect(results[0].ok).toBe(false);
    expect(results[0].message.role).toBe("tool");
    expect(results[0].message.toolCallId).toBe("call-1");
    expect(results[0].message.content).toContain("blocked-by-hook-reason");

    // audit event emitted for the hook deny.
    const audits = events.filter(
      (e): e is Extract<AgentRunEvent, { type: "tool_policy_audit" }> => e.type === "tool_policy_audit"
    );
    const hookAudit = audits.find((a) => a.policyName === "hook:PreToolUse" && a.status === "deny");
    expect(hookAudit).toBeDefined();
  });

  it("block content overrides reason in the tool_result body when provided", async () => {
    const { tool, runSpy } = makeEchoTool();
    const registry = new HookRegistry();
    registry.register({
      event: "pre_tool_use",
      handler: () => ({ decision: "block", reason: "short-reason", content: "verbose-block-content" })
    } satisfies BlockingHookRegistration);
    const runner = new AgentRunner(baseOptions(tool, singleToolCallProvider(echoCall), registry));
    const events = await drain(runner, "please echo ls");
    expect(runSpy).not.toHaveBeenCalled();
    const results = toolResultEvents(events);
    expect(results[0].message.content).toContain("verbose-block-content");
  });

  it("modify(valid) -> tool.run receives the modified args", async () => {
    const { tool, runSpy } = makeEchoTool();
    const registry = new HookRegistry();
    registry.register({
      event: "pre_tool_use",
      handler: () => ({ decision: "modify", modifiedArgs: { cmd: "MODIFIED" } })
    } satisfies BlockingHookRegistration);
    const runner = new AgentRunner(baseOptions(tool, singleToolCallProvider(echoCall), registry));
    const events = await drain(runner, "please echo ls");

    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy.mock.calls[0][0]).toEqual({ cmd: "MODIFIED" });
    const results = toolResultEvents(events);
    expect(results[0].ok).toBe(true);
    expect(results[0].message.content).toContain("ran: MODIFIED");
  });

  it("modify(invalid schema) -> deny, tool.run NOT called", async () => {
    const { tool, runSpy } = makeEchoTool();
    const registry = new HookRegistry();
    registry.register({
      event: "pre_tool_use",
      // cmd must be a string; a number fails the tool's inputSchema on re-validation.
      handler: () => ({ decision: "modify", modifiedArgs: { cmd: 123 } })
    } satisfies BlockingHookRegistration);
    const runner = new AgentRunner(baseOptions(tool, singleToolCallProvider(echoCall), registry));
    const events = await drain(runner, "please echo ls");

    expect(runSpy).not.toHaveBeenCalled();
    const results = toolResultEvents(events);
    expect(results.length).toBe(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].message.content.toLowerCase()).toContain("invalid");
  });

  it("concurrent path (collectToolRun) also routes through the hook -> blocked", async () => {
    const { tool, runSpy } = makePeekTool();
    const registry = new HookRegistry();
    registry.register({
      event: "pre_tool_use",
      handler: () => ({ decision: "block", reason: "concurrent-block" })
    } satisfies BlockingHookRegistration);
    const calls: ToolCall[] = [
      { id: "c-1", name: "peek", input: { cmd: "a" } },
      { id: "c-2", name: "peek", input: { cmd: "b" } }
    ];
    const runner = new AgentRunner(baseOptions(tool, twoToolCallProvider(calls), registry));
    const events = await drain(runner, "please peek twice");

    expect(runSpy).not.toHaveBeenCalled();
    const results = toolResultEvents(events);
    expect(results.length).toBe(2);
    expect(results.every((r) => r.ok === false)).toBe(true);
    expect(results.every((r) => r.message.content.includes("concurrent-block"))).toBe(true);
    // pairing preserved for both concurrent calls.
    expect(results.map((r) => r.message.toolCallId).sort()).toEqual(["c-1", "c-2"]);
  });

  it("toolNamePattern that does not match -> hook is skipped, tool runs", async () => {
    const { tool, runSpy } = makeEchoTool();
    const registry = new HookRegistry();
    registry.register({
      event: "pre_tool_use",
      toolNamePattern: "^write$", // does not match "echo"
      handler: () => ({ decision: "block", reason: "should-not-fire" })
    } satisfies BlockingHookRegistration);
    const runner = new AgentRunner(baseOptions(tool, singleToolCallProvider(echoCall), registry));
    const events = await drain(runner, "please echo ls");
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(toolResultEvents(events)[0].ok).toBe(true);
  });
});
