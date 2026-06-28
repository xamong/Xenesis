import { describe, expect, it, vi } from "vitest";
import { executeAgentRun } from "../../src/core/AgentRunExecutor.js";
import type { AgentRunResult } from "../../src/core/AgentRunner.js";
import type { AgentRunEvent } from "../../src/core/events.js";
import type { SessionWriter } from "../../src/sessions/types.js";

function doneResult(): AgentRunResult {
  return {
    status: "done",
    content: "ok",
    messages: [],
    turns: 1,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  };
}

describe("executeAgentRun lifecycle", () => {
  it("keeps runners alive by default so embedded persistent providers can span turns", async () => {
    const dispose = vi.fn();
    const runner = {
      dispose,
      async *run(): AsyncGenerator<AgentRunEvent, AgentRunResult, void> {
        return doneResult();
      }
    };
    const sessionWriter: SessionWriter = { write: vi.fn(async () => undefined) };

    await executeAgentRun({
      runner,
      prompt: "hello",
      sessionWriter
    });

    expect(dispose).not.toHaveBeenCalled();
  });

  it("disposes runners after completion when a one-shot caller opts in", async () => {
    const dispose = vi.fn();
    const runner = {
      dispose,
      async *run(): AsyncGenerator<AgentRunEvent, AgentRunResult, void> {
        return doneResult();
      }
    };
    const sessionWriter: SessionWriter = { write: vi.fn(async () => undefined) };

    await executeAgentRun({
      runner,
      prompt: "hello",
      sessionWriter,
      disposeRunner: true
    });

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
