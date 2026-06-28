import { describe, expect, it } from "vitest";
import type { AgentRunPipelineOptions, AgentRunPipelineResult } from "../../src/core/AgentRunPipeline.js";
import { runResolvedWorkflow } from "../../src/workflows/runner.js";
import type { WorkflowSelection } from "../../src/workflows/types.js";

function workflow(): WorkflowSelection {
  return {
    name: "test",
    prompt: "hello",
    pipeline: {}
  };
}

function pipelineResult(): AgentRunPipelineResult {
  return {
    exitCode: 0,
    sessionId: "session-1",
    events: [],
    turns: 1
  };
}

describe("runResolvedWorkflow lifecycle", () => {
  it("passes disposeRunner through to pipeline calls for one-shot workflow callers", async () => {
    const calls: AgentRunPipelineOptions[] = [];

    await runResolvedWorkflow({
      workflow: workflow(),
      cwd: "E:/workspace",
      stream: false,
      disposeRunner: true,
      runPipeline: async (options) => {
        calls.push(options);
        return pipelineResult();
      }
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].disposeRunner).toBe(true);
  });
});
