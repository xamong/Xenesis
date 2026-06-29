import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { AgentRunner } from "../../src/core/AgentRunner.js";
import type { AgentRunnerOptions, AgentRunResult } from "../../src/core/AgentRunner.js";
import { resumeAgentPipeline } from "../../src/core/AgentRunPipeline.js";
import { readSessionLog, hasApprovalResolved } from "../../src/sessions/history.js";
import { repairToolResultPairing } from "../../src/core/messages.js";
import type { AgentMessage, ToolCall } from "../../src/core/messages.js";
import type { AgentProvider, ProviderRequest, ProviderResponse } from "../../src/providers/types.js";
import type { AgentRunEvent, ApprovalDecision } from "../../src/core/events.js";
import type { ResumableRunState } from "../../src/core/resume/ResumableRunState.js";
import type { Tool } from "../../src/tools/types.js";

// ---------------------------------------------------------------------------
// AgentRunner-direct harness (precise exactly-once / deny / idempotency control)
// ---------------------------------------------------------------------------

// A provider that, given a history whose last turn is a paired tool_result,
// finishes with a plain-text answer (no further tool calls). On resume the runner
// applies the pending decision BEFORE the loop, so the very first provider turn
// already sees a complete exchange -> the LLM never re-emits the stored call.
function finishingProvider(): AgentProvider {
  return {
    name: "mock",
    model: "mock-model",
    async complete(_request: ProviderRequest): Promise<ProviderResponse> {
      return { message: { role: "assistant", content: "done." }, stopReason: "stop" };
    }
  };
}

interface EchoRunArgs {
  cmd: string;
}

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

function workspaceTmp(): string {
  return mkdtempSync(join(tmpdir(), "s6-resumeapproval-"));
}

const PENDING_TOOL_CALL: ToolCall = { id: "tc1", name: "echo", input: { cmd: "ls" } };

// The dangling assistant tool_call from the paused run, rehydrated into history.
// On a real resume `repairToolResultPairing` EXCLUDES tc1, so there is no
// synthetic tool_result for it; here we mirror that (no tool_result for tc1).
function pausedHistory(): AgentMessage[] {
  return [
    { role: "user", content: "please echo ls", id: "sess:m0" },
    { role: "assistant", content: "", toolCalls: [PENDING_TOOL_CALL], id: "sess:m1" }
  ];
}

function pausedResumeState(): ResumableRunState {
  return {
    turns: 1,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    recovery: {
      projectAnalysisEvidenceRecoveryCount: 0,
      explicitToolCompletionRecoveryCount: 0,
      fileMutationRequiredRecoveryCount: 0,
      maxOutputTokensRecoveryCount: 0,
      toolRecoveryFinalizationRecoveryCount: 0,
      repositoryRecommendationRecoveryUsed: false,
      falseUnavailableToolRecoveryUsed: false
    },
    successfulToolNames: [],
    attemptedToolNames: [],
    successfulEvidencePaths: [],
    successfulEvidenceToolCount: 0,
    successfulMutationCount: 0,
    mutationSinceLastRead: false,
    verificationRecoveryCounts: [],
    autoVerificationRepairSignatures: [],
    verificationRepairExtensionActive: false,
    recentCompactionSavedRatios: [],
    stopHookContinuationCount: 0,
    messageSeq: 2,
    alwaysAllowedTools: [],
    pendingApproval: {
      toolCallId: "tc1",
      toolName: "echo",
      toolInput: { cmd: "ls" },
      approvalId: "ap1",
      reason: "needs approval",
      riskLevel: "high",
      summary: "run echo ls"
    }
  };
}

function baseResumeOptions(
  tool: Tool,
  decision: ApprovalDecision,
  history: AgentMessage[] = pausedHistory(),
  state: ResumableRunState = pausedResumeState()
): AgentRunnerOptions {
  const workspaceRoot = workspaceTmp();
  return {
    provider: finishingProvider(),
    model: "mock-model",
    workspaceRoot,
    xenesisHome: join(workspaceRoot, ".xenesis"),
    approvalMode: "auto",
    maxTurns: 4,
    tools: [tool],
    historyMessages: history,
    resuming: true,
    resumeState: state,
    injectedApprovalDecision: decision
  } as AgentRunnerOptions;
}

async function runToResult(
  runner: AgentRunner,
  input: string
): Promise<{ events: AgentRunEvent[]; result: AgentRunResult }> {
  const events: AgentRunEvent[] = [];
  const iterator = runner.run(input);
  while (true) {
    const step = await iterator.next();
    if (step.done) return { events, result: step.value };
    events.push(step.value);
  }
}

function eventsOfType<T extends AgentRunEvent["type"]>(
  events: AgentRunEvent[],
  type: T
): Array<Extract<AgentRunEvent, { type: T }>> {
  return events.filter((e): e is Extract<AgentRunEvent, { type: T }> => e.type === type);
}

describe("resume applies pending approval (S6)", () => {
  it("approve -> the stored tool executes exactly once, approval_resolved written, dangling tool_call paired", async () => {
    const { tool, runSpy } = makeEchoTool();
    const decision: ApprovalDecision = {
      toolCallId: "tc1",
      approvalId: "ap1",
      approved: true,
      decision: "approve",
      resolvedAt: new Date().toISOString()
    };
    const runner = new AgentRunner(baseResumeOptions(tool, decision));
    const { events, result } = await runToResult(runner, "please echo ls");

    // exactly once.
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy).toHaveBeenCalledWith(expect.objectContaining({ cmd: "ls" }), expect.anything());

    const resolved = eventsOfType(events, "approval_resolved");
    expect(resolved.length).toBe(1);
    expect(resolved[0].toolCallId).toBe("tc1");
    expect(resolved[0].approved).toBe(true);
    expect(resolved[0].decision).toBe("approve");

    // the dangling tool_call is now paired with a successful tool_result.
    const toolResults = eventsOfType(events, "tool_result");
    const tc1Result = toolResults.find((r) => r.message.toolCallId === "tc1");
    expect(tc1Result).toBeDefined();
    expect(tc1Result!.ok).toBe(true);

    const pairedInMessages = result.messages.find(
      (m) => m.role === "tool" && (m as { toolCallId?: string }).toolCallId === "tc1"
    );
    expect(pairedInMessages).toBeDefined();
    // no permission_request re-asked on resume (the decision was injected).
    expect(eventsOfType(events, "permission_request").length).toBe(0);
    expect(result.status).toBe("done");
  });

  it("deny -> deny tool_result, tool not executed", async () => {
    const { tool, runSpy } = makeEchoTool();
    const decision: ApprovalDecision = {
      toolCallId: "tc1",
      approvalId: "ap1",
      approved: false,
      decision: "deny",
      resolvedAt: new Date().toISOString()
    };
    const runner = new AgentRunner(baseResumeOptions(tool, decision));
    const { events, result } = await runToResult(runner, "please echo ls");

    expect(runSpy).not.toHaveBeenCalled();
    const resolved = eventsOfType(events, "approval_resolved");
    expect(resolved.length).toBe(1);
    expect(resolved[0].decision).toBe("deny");
    expect(resolved[0].approved).toBe(false);

    const toolResults = eventsOfType(events, "tool_result");
    const tc1Result = toolResults.find((r) => r.message.toolCallId === "tc1");
    expect(tc1Result).toBeDefined();
    expect(tc1Result!.ok).toBe(false);
    expect(result.status).toBe("done");
  });

  it("always-allow -> tool executes once and is added to alwaysAllowedTools (snapshot carries it)", async () => {
    const { tool, runSpy } = makeEchoTool();
    const decision: ApprovalDecision = {
      toolCallId: "tc1",
      approvalId: "ap1",
      approved: true,
      decision: "always-allow",
      resolvedAt: new Date().toISOString()
    };
    // run_snapshot events are JSONL-only (recorded, not yielded), so capture them
    // through a session writer to prove always-allow is persisted for resume.
    const written: Array<{ type: string; state?: { alwaysAllowedTools?: string[] } }> = [];
    const sessionWriter = {
      write: async (event: { type: string; state?: { alwaysAllowedTools?: string[] } }) => {
        written.push(event);
      }
    };
    const runner = new AgentRunner({
      ...baseResumeOptions(tool, decision),
      sessionWriter
    } as AgentRunnerOptions);
    const { events } = await runToResult(runner, "please echo ls");
    expect(runSpy).toHaveBeenCalledTimes(1);
    const resolved = eventsOfType(events, "approval_resolved");
    expect(resolved[0].decision).toBe("always-allow");
    // the post-resume run_snapshot records echo as always-allowed.
    const snapshots = written.filter((e) => e.type === "run_snapshot");
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots.at(-1)!.state!.alwaysAllowedTools).toContain("echo");
  });

  it("idempotent: a resume whose history already has a tc1 tool_result does NOT re-execute", async () => {
    const { tool, runSpy } = makeEchoTool();
    const decision: ApprovalDecision = {
      toolCallId: "tc1",
      approvalId: "ap1",
      approved: true,
      decision: "approve",
      resolvedAt: new Date().toISOString()
    };
    // history where tc1 was ALREADY resolved (a prior resume paired it).
    const resolvedHistory: AgentMessage[] = [
      { role: "user", content: "please echo ls", id: "sess:m0" },
      { role: "assistant", content: "", toolCalls: [PENDING_TOOL_CALL], id: "sess:m1" },
      { role: "tool", toolCallId: "tc1", name: "echo", content: "ran: ls", id: "sess:m2" }
    ];
    const state = { ...pausedResumeState() };
    const runner = new AgentRunner(baseResumeOptions(tool, decision, resolvedHistory, state));
    const { events } = await runToResult(runner, "please echo ls");
    // Non-vacuous: the tool must NOT run a second time on the repeat resume.
    expect(runSpy).not.toHaveBeenCalled();
    // No new approval_resolved either (already applied).
    expect(eventsOfType(events, "approval_resolved").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// hasApprovalResolved + repairToolResultPairing exclusion (unit)
// ---------------------------------------------------------------------------

describe("hasApprovalResolved + pairing exclusion (S6)", () => {
  it("hasApprovalResolved detects a logged approval_resolved by toolCallId", () => {
    const records = [
      { type: "user_message", sessionId: "s", timestamp: "t", message: { role: "user", content: "x" } },
      { type: "approval_resolved", sessionId: "s", timestamp: "t", toolCallId: "tc1", approvalId: "ap1", approved: true, decision: "approve", resolvedAt: "t" }
    ] as Parameters<typeof hasApprovalResolved>[0];
    expect(hasApprovalResolved(records, "tc1")).toBe(true);
    expect(hasApprovalResolved(records, "tcX")).toBe(false);
  });

  it("repairToolResultPairing excludes the pending toolCallId (no synthetic placeholder for it)", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "go" },
      { role: "assistant", content: "", toolCalls: [{ id: "tc1", name: "echo", input: { cmd: "ls" } }] }
    ];
    const repaired = repairToolResultPairing(messages, { excludeToolCallIds: new Set(["tc1"]) });
    // The dangling tc1 must NOT be given a synthetic tool_result.
    const tc1Result = repaired.find(
      (m) => m.role === "tool" && (m as { toolCallId?: string }).toolCallId === "tc1"
    );
    expect(tc1Result).toBeUndefined();
    // Without the exclusion, a synthetic placeholder WOULD be added (proves non-vacuity).
    const repairedNoExclude = repairToolResultPairing(messages);
    const synth = repairedNoExclude.find(
      (m) => m.role === "tool" && (m as { toolCallId?: string }).toolCallId === "tc1"
    );
    expect(synth).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Pipeline-level: resumeAgentPipeline applies the decision exactly once + idempotency
// ---------------------------------------------------------------------------

async function seedLog(records: object[]) {
  const h = await mkdtemp(join(tmpdir(), "s6-pipe-"));
  const dir = resolve(h, "sessions");
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, "sess.jsonl"),
    records.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8"
  );
  return h;
}

function pendingSnapshotRecord() {
  const state = pausedResumeState();
  return { type: "run_snapshot", sessionId: "sess", timestamp: "t", state };
}

describe("resumeAgentPipeline with approvalDecision (S6)", () => {
  it("approve -> the stored write tool executes exactly once (file created) + approval_resolved logged", async () => {
    const h = await seedLog([
      { type: "user_message", sessionId: "sess", timestamp: "t", message: { role: "user", content: "create a file" } },
      {
        type: "assistant_message",
        sessionId: "sess",
        timestamp: "t",
        message: { role: "assistant", content: "", toolCalls: [{ id: "tc1", name: "write", input: { path: "out.txt", content: "hello" } }] }
      },
      {
        type: "run_snapshot",
        sessionId: "sess",
        timestamp: "t",
        state: {
          ...pausedResumeState(),
          pendingApproval: {
            toolCallId: "tc1",
            toolName: "write",
            toolInput: { path: "out.txt", content: "hello" },
            approvalId: "ap1",
            reason: "needs approval",
            riskLevel: "high",
            summary: "write out.txt"
          }
        }
      }
    ]);
    const result = await resumeAgentPipeline({
      sessionId: "sess",
      xenesisHome: h,
      cwd: h,
      env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: "true" },
      cli: { provider: "mock", model: "mock-model", workspace: h, approvalMode: "auto" },
      approvalDecision: {
        toolCallId: "tc1",
        approvalId: "ap1",
        approved: true,
        decision: "approve",
        resolvedAt: new Date().toISOString()
      }
    } as Parameters<typeof resumeAgentPipeline>[0]);
    expect(result.sessionId).toBe("sess");

    // exactly-once side effect: the file exists with the written content.
    const written = await readFile(resolve(h, "out.txt"), "utf8");
    expect(written).toBe("hello");

    const recs = await readSessionLog(h, "sess");
    expect(hasApprovalResolved(recs, "tc1")).toBe(true);
    // the dangling tc1 is now paired by a real tool_result event.
    const tc1Results = recs.filter(
      (r) => r.type === "tool_result" && (r as { message?: { toolCallId?: string } }).message?.toolCallId === "tc1"
    );
    expect(tc1Results.length).toBe(1);
  });

  it("idempotent: a second resume over a log that already has approval_resolved for tc1 does NOT re-execute", async () => {
    const records = [
      { type: "user_message", sessionId: "sess", timestamp: "t", message: { role: "user", content: "create a file" } },
      {
        type: "assistant_message",
        sessionId: "sess",
        timestamp: "t",
        message: { role: "assistant", content: "", toolCalls: [{ id: "tc1", name: "write", input: { path: "out2.txt", content: "hello2" } }] }
      },
      {
        type: "run_snapshot",
        sessionId: "sess",
        timestamp: "t",
        state: {
          ...pausedResumeState(),
          pendingApproval: {
            toolCallId: "tc1",
            toolName: "write",
            toolInput: { path: "out2.txt", content: "hello2" },
            approvalId: "ap1",
            reason: "needs approval",
            riskLevel: "high",
            summary: "write out2.txt"
          }
        }
      },
      // tc1 was already resolved+paired by a prior resume.
      { type: "approval_resolved", sessionId: "sess", timestamp: "t", toolCallId: "tc1", approvalId: "ap1", approved: true, decision: "approve", resolvedAt: "t" },
      {
        type: "tool_result",
        sessionId: "sess",
        timestamp: "t",
        ok: true,
        message: { role: "tool", toolCallId: "tc1", name: "write", content: "Wrote 6 characters to out2.txt." }
      }
    ];
    const h = await seedLog(records);
    await resumeAgentPipeline({
      sessionId: "sess",
      xenesisHome: h,
      cwd: h,
      env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: "true" },
      cli: { provider: "mock", model: "mock-model", workspace: h, approvalMode: "auto" },
      approvalDecision: {
        toolCallId: "tc1",
        approvalId: "ap1",
        approved: true,
        decision: "approve",
        resolvedAt: new Date().toISOString()
      }
    } as Parameters<typeof resumeAgentPipeline>[0]);

    // Non-vacuous idempotency: the file must NOT have been written by this resume
    // (the prior resume already applied the decision; out2.txt was never created
    // here because we never actually ran the write tool in the seed).
    let created = false;
    try {
      await readFile(resolve(h, "out2.txt"), "utf8");
      created = true;
    } catch {
      created = false;
    }
    expect(created).toBe(false);

    // still exactly one approval_resolved + one tool_result for tc1.
    const recs = await readSessionLog(h, "sess");
    const resolvedCount = recs.filter(
      (r) => r.type === "approval_resolved" && (r as { toolCallId?: string }).toolCallId === "tc1"
    ).length;
    expect(resolvedCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Background: a runner with NO approvalHandler hitting ask pauses (does not deny)
// ---------------------------------------------------------------------------

describe("background pause-not-deny (S6)", () => {
  it("a runner with NO approvalHandler hitting ask pauses (status paused), does not auto-deny", async () => {
    const { tool, runSpy } = makeEchoTool();
    const workspaceRoot = workspaceTmp();
    const provider: AgentProvider = (() => {
      let turn = 0;
      return {
        name: "mock",
        model: "mock-model",
        async complete(_request: ProviderRequest): Promise<ProviderResponse> {
          turn += 1;
          if (turn === 1) {
            return {
              message: { role: "assistant", content: "", toolCalls: [{ id: "bg1", name: "echo", input: { cmd: "ls" } }] },
              stopReason: "tool_use"
            };
          }
          return { message: { role: "assistant", content: "done." }, stopReason: "stop" };
        }
      };
    })();
    // safe approvalMode so a mutating tool gets routed to ask; no approvalHandler.
    const runner = new AgentRunner({
      provider,
      model: "mock-model",
      workspaceRoot,
      xenesisHome: join(workspaceRoot, ".xenesis"),
      approvalMode: "safe",
      maxTurns: 4,
      tools: [tool]
    } as AgentRunnerOptions);
    const { result } = await runToResult(runner, "please echo ls");
    // Non-vacuous: MUST fail if the runner auto-denied instead of pausing.
    expect(runSpy).not.toHaveBeenCalled();
    expect(result.status).toBe("paused");
    if (result.status !== "paused") throw new Error("expected paused");
    expect(result.pendingApproval.toolCallId).toBe("bg1");
  });
});
