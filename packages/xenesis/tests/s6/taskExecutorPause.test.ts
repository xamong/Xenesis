import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentRunPipelineOptions, AgentRunPipelineResult } from "../../src/core/AgentRunPipeline.js";
import type { ApprovalRequest } from "../../src/core/events.js";
import type {
  IsolationOutcome,
  ProvisionedWorkspace,
  WorkspaceProvisioner
} from "../../src/core/isolation/index.js";
import type { AgentTask } from "../../src/orchestration/agentTasks.js";

// ---------------------------------------------------------------------------
// taskExecutor Step 7 — paused -> blocked mapping (integration-level coverage)
//
// The background pause test in resumeApproval.test.ts drives AgentRunner
// directly; it never exercises createPipelineTaskExecutor's branch that maps a
// pipeline `status: "paused"` result to a task `status: "blocked"` (instead of
// throwing / reporting a failure). These tests stub runAgentPipeline + the
// isolation provisioner so only that mapping is under test.
// ---------------------------------------------------------------------------

// Module-level hook so each test controls what runAgentPipeline returns.
type RunAgentPipeline = (options: AgentRunPipelineOptions) => Promise<AgentRunPipelineResult>;
const runAgentPipelineMock = vi.fn<RunAgentPipeline>();

vi.mock("../../src/core/AgentRunPipeline.js", () => ({
  runAgentPipeline: (options: AgentRunPipelineOptions) => runAgentPipelineMock(options),
}));

// Stub the isolation layer to a no-op shared workspace so provisioning does not
// touch git / the filesystem. cleanup() returns a benign IsolationOutcome.
const ISOLATION_OUTCOME: IsolationOutcome = {
  mode: "shared",
  changedFiles: 0,
  newCommits: 0,
  kept: false,
};

vi.mock("../../src/core/isolation/index.js", () => {
  const provisioner: WorkspaceProvisioner = {
    async provision(): Promise<ProvisionedWorkspace> {
      return {
        workspaceRoot: "/tmp/ws",
        cwd: "/tmp/ws",
        mode: "shared",
        async cleanup() {
          return ISOLATION_OUTCOME;
        },
      };
    },
  };
  return {
    decideTaskMode: () => "shared" as const,
    resolveProvisioner: () => provisioner,
  };
});

// Imported AFTER the mocks are registered (vi.mock is hoisted, so this is safe).
import { createPipelineTaskExecutor } from "../../src/orchestration/taskExecutor.js";

function makeTask(): AgentTask {
  const now = new Date().toISOString();
  return {
    id: "task-1",
    prompt: "please echo ls",
    status: "running",
    sessionId: "sess-1",
    createdAt: now,
    updatedAt: now,
  };
}

function pendingApproval(): ApprovalRequest {
  return {
    toolCallId: "bg1",
    approvalId: "ap1",
    name: "echo",
    input: { cmd: "ls" },
    reason: "mutating tool requires approval",
    riskLevel: "medium",
    summary: "echo ls",
  };
}

function pausedResult(pending?: ApprovalRequest): AgentRunPipelineResult {
  return {
    exitCode: 0,
    sessionId: "sess-1",
    events: [],
    doneContent: "paused before tool",
    turns: 1,
    status: "paused",
    ...(pending ? { pendingApproval: pending } : {}),
  };
}

beforeEach(() => {
  runAgentPipelineMock.mockReset();
});

describe("createPipelineTaskExecutor — paused -> blocked (S6)", () => {
  it("maps a paused pipeline result to status 'blocked' (does NOT throw/fail)", async () => {
    const pending = pendingApproval();
    runAgentPipelineMock.mockResolvedValue(pausedResult(pending));

    const executor = createPipelineTaskExecutor({ cwd: "/tmp/ws" });
    const result = await executor(makeTask(), { signal: new AbortController().signal });

    // Non-vacuous: MUST fail if the executor threw or reported failure/completed.
    expect(result.status).toBe("blocked");
    expect(result.sessionId).toBe("sess-1");
    expect(result.output).toBe("paused before tool");
    // The blocked reason names the pending tool + reason so Desk inbox can render it.
    expect(result.error).toContain("echo");
    expect(result.error).toContain("mutating tool requires approval");
    expect(result.isolation).toEqual(ISOLATION_OUTCOME);
  });

  it("does NOT auto-deny: the executor never reports a failure/exit-code error for a pause", async () => {
    runAgentPipelineMock.mockResolvedValue(pausedResult(pendingApproval()));

    const executor = createPipelineTaskExecutor({ cwd: "/tmp/ws" });
    // Must resolve (not reject) — the prior `approvalHandler: () => false` bug
    // would have produced a normal `done` result that silently denied the tool;
    // a missing pause mapping would surface exitCode!==0 as a throw.
    await expect(
      executor(makeTask(), { signal: new AbortController().signal })
    ).resolves.toMatchObject({ status: "blocked" });
  });

  it("falls back to a generic blocked reason when pendingApproval is absent", async () => {
    runAgentPipelineMock.mockResolvedValue(pausedResult(undefined));

    const executor = createPipelineTaskExecutor({ cwd: "/tmp/ws" });
    const result = await executor(makeTask(), { signal: new AbortController().signal });

    expect(result.status).toBe("blocked");
    expect(result.error).toBe("awaiting approval");
  });

  it("a non-paused (done) result is reported as a normal completion (no status override)", async () => {
    runAgentPipelineMock.mockResolvedValue({
      exitCode: 0,
      sessionId: "sess-1",
      events: [],
      doneContent: "all done",
      turns: 2,
      status: "done",
    });

    const executor = createPipelineTaskExecutor({ cwd: "/tmp/ws" });
    const result = await executor(makeTask(), { signal: new AbortController().signal });

    // The completion path leaves `status` unset (worker treats it as completed)
    // and carries no blocked error.
    expect(result.status).toBeUndefined();
    expect(result.output).toBe("all done");
    expect(result.error).toBeUndefined();
  });
});
