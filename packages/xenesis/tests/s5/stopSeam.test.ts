import { describe, it, expect, vi } from "vitest";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { AgentRunner } from "../../src/core/AgentRunner.js";
import type { AgentRunnerOptions } from "../../src/core/AgentRunner.js";
import { HookRegistry } from "../../src/hooks/HookRegistry.js";
import type { BlockingHookRegistration, StopDecision } from "../../src/hooks/blocking.js";
import type { AgentProvider, ProviderRequest, ProviderResponse } from "../../src/providers/types.js";
import type { AgentRunEvent } from "../../src/core/events.js";

// A mock provider that ALWAYS returns a plain-text final answer with NO tool
// calls. Each turn it returns a fresh marker so we can count how many provider
// turns the run actually took. Records the messages it was handed each turn so
// we can assert the injected continuation prompt reached the provider.
function noToolFinalProvider(): {
  provider: AgentProvider;
  completeSpy: ReturnType<typeof vi.fn>;
  seenContents: string[][];
} {
  let turn = 0;
  const seenContents: string[][] = [];
  const completeSpy = vi.fn(async (request: ProviderRequest): Promise<ProviderResponse> => {
    turn += 1;
    seenContents.push(
      request.messages
        .filter((m) => m.role === "user")
        .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    );
    return {
      message: { role: "assistant", content: `final-answer-turn-${turn}` },
      stopReason: "stop"
    };
  });
  return {
    provider: { name: "mock", model: "mock-model", complete: completeSpy as AgentProvider["complete"] },
    completeSpy,
    seenContents
  };
}

function workspaceTmp(): string {
  return mkdtempSync(join(tmpdir(), "s5-stop-"));
}

function baseOptions(
  provider: AgentProvider,
  hookRegistry?: HookRegistry,
  extra?: Partial<AgentRunnerOptions>
): AgentRunnerOptions {
  const workspaceRoot = workspaceTmp();
  return {
    provider,
    model: "mock-model",
    workspaceRoot,
    xenesisHome: join(workspaceRoot, ".xenesis"),
    approvalMode: "auto",
    maxTurns: 12,
    tools: [],
    hookRegistry,
    ...extra
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

function doneEvents(events: AgentRunEvent[]) {
  return events.filter((e): e is Extract<AgentRunEvent, { type: "done" }> => e.type === "done");
}

function runStateEvents(events: AgentRunEvent[]) {
  return events.filter((e): e is Extract<AgentRunEvent, { type: "run_state" }> => e.type === "run_state");
}

describe("Stop seam", () => {
  it("allow-stop (empty registry) -> single completion, no extra turns", async () => {
    const { provider, completeSpy } = noToolFinalProvider();
    const runner = new AgentRunner(baseOptions(provider));
    const events = await drain(runner, "answer me");

    // Exactly one provider turn; the run stops on the first no-tool-call answer.
    expect(completeSpy).toHaveBeenCalledTimes(1);
    const dones = doneEvents(events);
    expect(dones.length).toBe(1);
    expect(dones[0].content).toContain("final-answer-turn-1");
  });

  it("block-stop injects a continuation and the loop continues at least once", async () => {
    let stopCalls = 0;
    const registry = new HookRegistry();
    registry.register({
      event: "stop",
      handler: (): StopDecision => {
        stopCalls += 1;
        // Block once, then allow stop.
        return stopCalls === 1
          ? { decision: "block-stop", continuePrompt: "keep going please" }
          : { decision: "allow-stop" };
      }
    } satisfies BlockingHookRegistration);

    const { provider, completeSpy, seenContents } = noToolFinalProvider();
    const runner = new AgentRunner(baseOptions(provider, registry));
    const events = await drain(runner, "answer me");

    // The stop hook forced one extra provider turn (2 total).
    expect(completeSpy).toHaveBeenCalledTimes(2);
    // The continuation prompt reached the provider on the second turn.
    expect(seenContents[1].some((c) => c.includes("keep going please"))).toBe(true);
    // A run_state event announced the continuation.
    const continuationStates = runStateEvents(events).filter((e) =>
      e.summary.toLowerCase().includes("continuation")
    );
    expect(continuationStates.length).toBeGreaterThanOrEqual(1);
    // Eventually terminates.
    expect(doneEvents(events).length).toBe(1);
  });

  it("bounded at maxStopHookContinuations then stops with a reason", async () => {
    const registry = new HookRegistry();
    // ALWAYS block-stop: only the cap can terminate the run.
    registry.register({
      event: "stop",
      handler: (): StopDecision => ({ decision: "block-stop", continuePrompt: "again" })
    } satisfies BlockingHookRegistration);

    const { provider, completeSpy } = noToolFinalProvider();
    const runner = new AgentRunner(
      baseOptions(provider, registry, { maxStopHookContinuations: 2, maxTurns: 12 } as Partial<AgentRunnerOptions>)
    );
    const events = await drain(runner, "answer me");

    // Cap = 2 continuations: turn1 (block->cont1), turn2 (block->cont2), turn3 (cap reached -> stop).
    expect(completeSpy).toHaveBeenCalledTimes(3);
    const dones = doneEvents(events);
    expect(dones.length).toBe(1);
    // Two accepted-continuation states (one per allowed continuation) ...
    const acceptedStates = runStateEvents(events).filter((e) => /continuation \d+\/\d+/i.test(e.summary));
    expect(acceptedStates.length).toBe(2);
    // ... and exactly one cap-reached state with a clear reason.
    const capStates = runStateEvents(events).filter((e) => e.summary.toLowerCase().includes("cap reached"));
    expect(capStates.length).toBe(1);
  });

  it("a throwing stop handler is fail-open (allow-stop) -> stops normally", async () => {
    const registry = new HookRegistry();
    registry.register({
      event: "stop",
      handler: (): StopDecision => {
        throw new Error("boom");
      }
    } satisfies BlockingHookRegistration);

    const { provider, completeSpy } = noToolFinalProvider();
    const runner = new AgentRunner(baseOptions(provider, registry));
    const events = await drain(runner, "answer me");

    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(doneEvents(events).length).toBe(1);
  });
});
