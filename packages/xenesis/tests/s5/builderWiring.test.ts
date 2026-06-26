/**
 * Task 7: Builder wiring (anti-dead-code) + integration
 *
 * Asserts that AgentRunnerBuilder constructs a HookRegistry from config and
 * passes it into AgentRunner so that a configured command hook actually fires
 * end-to-end. Without this wiring S5 is dead code (the exact failure mode of
 * the pre-S5 observer hooks).
 */
import { describe, it, expect, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import { buildHookRegistry, buildAgentRunner } from "../../src/core/AgentRunnerBuilder.js";
import { loadConfig } from "../../src/config/index.js";
import { closeAllDatabases } from "../../src/db/database.js";
import { createTempWorkspace } from "../helpers/tempWorkspace.js";
import type { XenesisConfig } from "../../src/config/types.js";
import { defaultConfig } from "../../src/config/types.js";

// ESM: resolve fixtures relative to import.meta.url.
const fixturePath = (name: string) =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const fix = (name: string) => `"${process.execPath}" "${fixturePath(name)}"`;

// ---------------------------------------------------------------------------
// Minimal fake XenesisConfig with hooks populated
// ---------------------------------------------------------------------------
function fakeConfig(hooks: Partial<XenesisConfig["hooks"]> = {}): XenesisConfig {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "s5-builder-"));
  return {
    ...defaultConfig,
    workspace: workspaceRoot,
    xenesisHome: join(workspaceRoot, ".xenesis"),
    hooks: { ...defaultConfig.hooks, ...hooks }
  } as unknown as XenesisConfig;
}

// ---------------------------------------------------------------------------
// Mock-provider + stub-tool harness (reused from preToolUseSeam.test.ts style)
// ---------------------------------------------------------------------------
import { AgentRunner, type AgentRunnerOptions } from "../../src/core/AgentRunner.js";
import type { AgentProvider, ProviderRequest, ProviderResponse } from "../../src/providers/types.js";
import type { AgentRunEvent } from "../../src/core/events.js";
import type { Tool } from "../../src/tools/types.js";
import type { ToolCall } from "../../src/core/messages.js";

function singleToolCallProvider(toolCall: ToolCall): AgentProvider {
  let turn = 0;
  return {
    name: "mock",
    model: "mock-model",
    async complete(_request: ProviderRequest): Promise<ProviderResponse> {
      turn += 1;
      if (turn === 1) {
        return { message: { role: "assistant", content: "", toolCalls: [toolCall] }, stopReason: "tool_use" };
      }
      return { message: { role: "assistant", content: "done." }, stopReason: "stop" };
    }
  };
}

function makeShellTool() {
  const runSpy = vi.fn(async (input: { cmd: string }) => ({
    ok: true,
    content: `ran: ${input.cmd}`
  }));
  // Use "shell_stub" as the name so it matches the ^shell$ toolPattern in the
  // block-hook test but is not a built-in name that might trigger capability guards.
  // Both integration tests use the same tool: the first blocks via the hook pattern,
  // the second allows through because the registry is empty (hooks.enabled=false).
  const tool: Tool<{ cmd: string }> = {
    name: "shell_stub",
    description: "stub tool for builder wiring tests",
    inputSchema: z.object({ cmd: z.string() }),
    isReadOnly: () => false,
    run: runSpy as unknown as Tool<{ cmd: string }>["run"]
  };
  return { tool, runSpy };
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
  return events.filter(
    (e): e is Extract<AgentRunEvent, { type: "tool_result" }> => e.type === "tool_result"
  );
}

const shellCall: ToolCall = { id: "call-shell-1", name: "shell_stub", input: { cmd: "ls" } };

// ---------------------------------------------------------------------------
// Unit: buildHookRegistry helper
// ---------------------------------------------------------------------------
describe("buildHookRegistry helper", () => {
  it("produces a registry with hasPreToolUse()=true when config has preToolUse specs", () => {
    const config = fakeConfig({
      enabled: true,
      preToolUse: [{ command: fix("hook-block.mjs"), toolPattern: "^shell_stub$" }]
    });
    const registry = buildHookRegistry(config);
    expect(registry.hasPreToolUse()).toBe(true);
    expect(registry.hasStop()).toBe(false);
  });

  it("produces an empty registry when hooks.enabled=false (even with specs)", () => {
    const config = fakeConfig({
      enabled: false,
      preToolUse: [{ command: fix("hook-block.mjs") }],
      stop: [{ command: fix("hook-block.mjs") }]
    });
    const registry = buildHookRegistry(config);
    expect(registry.hasPreToolUse()).toBe(false);
    expect(registry.hasStop()).toBe(false);
  });

  it("merges programmatic registrations even when config specs are empty", () => {
    const config = fakeConfig({ enabled: true, preToolUse: [] });
    const registry = buildHookRegistry(config, [
      { event: "pre_tool_use", handler: () => ({ decision: "allow" as const }) }
    ]);
    expect(registry.hasPreToolUse()).toBe(true);
  });

  it("programmatic registrations fire even when hooks.enabled=false", () => {
    // programmatic hooks are always registered regardless of the config flag
    // (the enabled flag only gates config-driven command hooks).
    const config = fakeConfig({ enabled: false });
    const registry = buildHookRegistry(config, [
      { event: "stop", handler: () => ({ decision: "allow-stop" as const }) }
    ]);
    expect(registry.hasStop()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration: config command hook fires end-to-end via AgentRunner
// ---------------------------------------------------------------------------
describe("AgentRunnerBuilder hook wiring (end-to-end)", () => {
  it("a config command hook blocks a matching tool end-to-end", async () => {
    // Config: preToolUse contains hook-block.mjs scoped to ^shell_stub$
    const config = fakeConfig({
      enabled: true,
      preToolUse: [{ command: fix("hook-block.mjs"), toolPattern: "^shell_stub$" }]
    });

    const { tool, runSpy } = makeShellTool();
    const registry = buildHookRegistry(config);

    const workspaceRoot = config.workspace;
    const runner = new AgentRunner({
      provider: singleToolCallProvider(shellCall),
      model: "mock-model",
      workspaceRoot,
      xenesisHome: config.xenesisHome,
      approvalMode: "auto",
      maxTurns: 4,
      tools: [tool],
      hookRegistry: registry
    } as AgentRunnerOptions);

    const events = await drain(runner, "please run ls");

    // The hook must have blocked the tool: run spy NOT called.
    expect(runSpy).not.toHaveBeenCalled();
    // A deny tool_result must exist (pairing preserved).
    const results = toolResultEvents(events);
    expect(results.length).toBe(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].message.toolCallId).toBe("call-shell-1");
    // Deny message contains "blocked by fixture" (from hook-block.mjs).
    expect(results[0].message.content).toContain("blocked by fixture");
  }, 10000);

  it("hooks.enabled=false -> no hooks fire, tool runs normally", async () => {
    const config = fakeConfig({
      enabled: false,
      // Even with a blocking spec registered, enabled:false must produce an empty registry.
      preToolUse: [{ command: fix("hook-block.mjs"), toolPattern: "^shell_stub$" }]
    });

    const { tool, runSpy } = makeShellTool();
    const registry = buildHookRegistry(config);

    const workspaceRoot = config.workspace;
    const runner = new AgentRunner({
      provider: singleToolCallProvider(shellCall),
      model: "mock-model",
      workspaceRoot,
      xenesisHome: config.xenesisHome,
      approvalMode: "auto",
      maxTurns: 4,
      tools: [tool],
      hookRegistry: registry
    } as AgentRunnerOptions);

    const events = await drain(runner, "please run ls");

    // No hooks: tool must run normally.
    expect(runSpy).toHaveBeenCalledTimes(1);
    const results = toolResultEvents(events);
    expect(results.length).toBe(1);
    expect(results[0].ok).toBe(true);
    expect(results[0].message.content).toContain("ran: ls");
  }, 10000);
});

// ---------------------------------------------------------------------------
// Anti-dead-code: the wiring line itself (buildAgentRunner -> AgentRunner)
//
// The two integration tests above pass a registry into a MANUALLY-constructed
// AgentRunner; they prove the registry blocks, but NOT that buildAgentRunner
// actually hands its registry to the runner it returns. Deleting `hookRegistry,`
// from the AgentRunner constructor call inside buildAgentRunner survives those
// tests (the option is optional, so no type error and no thrown exception).
//
// This block closes that gap by driving the FULL builder pipeline: it loads a
// real XenesisConfig (provider:"mock") whose config.hooks.preToolUse points at
// hook-block.mjs, calls buildAgentRunner, and runs the returned runner against
// a mock-driven `shell` tool call. If the builder drops the registry, the hook
// never fires, `shell` runs, and the "blocked by fixture" assertion fails.
// ---------------------------------------------------------------------------
describe("buildAgentRunner passes the config-built HookRegistry to the runner", () => {
  it("a config command hook blocks a matching tool when run through buildAgentRunner", async () => {
    const workspace = await createTempWorkspace("s5-builder-e2e-");
    try {
      const xenesisHome = join(workspace.root, ".xenesis");
      const configPath = join(workspace.root, "xenesis.config.json");
      await writeFile(
        configPath,
        JSON.stringify({
          provider: "mock",
          model: "mock-model",
          workspace: ".",
          hooks: {
            enabled: true,
            // Scope the block to the `shell` tool the mock prompt drives below.
            preToolUse: [{ command: fix("hook-block.mjs"), toolPattern: "^shell$" }]
          }
        }),
        "utf8"
      );
      const config = await loadConfig({
        cwd: workspace.root,
        configPath,
        env: { XENESIS_HOME: xenesisHome }
      });

      const prompt = "mock:tool:shell:{\"command\":\"echo hi\"}";
      const built = await buildAgentRunner({
        config,
        env: {},
        prompt,
        sessionId: "builder-hook-wiring-session"
      });
      const result = await built.runner.runToCompletion(prompt);

      // The deny content (decision.content ?? decision.reason) from hook-block.mjs
      // is surfaced as the tool_result; the mock provider then echoes it back as
      // its final assistant message ("mock final: <tool result>"). If the builder
      // had dropped the registry, `shell` would have run and this would not match.
      expect(result.content).toContain("blocked by fixture");
    } finally {
      // Release the cached SQLite WAL handle before unlinking the temp workspace,
      // otherwise the .xenesis/xenesis.db file is still open and cleanup throws
      // EBUSY on Windows (the unrelated flakiness noted in the Task 7 review).
      closeAllDatabases();
      await workspace.cleanup();
    }
  }, 15000);
});
