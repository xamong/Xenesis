import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resumeAgentPipeline } from '../../src/core/AgentRunPipeline.js';
import type { AgentMessage } from '../../src/core/messages.js';
import { SYNTHETIC_TOOL_RESULT_PLACEHOLDER } from '../../src/core/messages.js';
import { readSessionLog } from '../../src/sessions/history.js';

async function seedLog(records: object[]) {
  const h = await mkdtemp(join(tmpdir(), 's7r-'));
  const dir = resolve(h, 'sessions');
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'sess.jsonl'), records.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  return h;
}

function fullSnapshot(turns: number) {
  return {
    type: 'run_snapshot',
    sessionId: 'sess',
    timestamp: 't',
    state: {
      turns,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      recovery: {
        projectAnalysisEvidenceRecoveryCount: 0,
        explicitToolCompletionRecoveryCount: 0,
        fileMutationRequiredRecoveryCount: 0,
        maxOutputTokensRecoveryCount: 0,
        toolRecoveryFinalizationRecoveryCount: 0,
        repositoryRecommendationRecoveryUsed: false,
        falseUnavailableToolRecoveryUsed: false,
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
    },
  };
}

// Minimal pipeline options matching the runAgentPipeline signature. `workspace`
// is the seeded home so the mock run does not touch the real project; the mock
// provider returns a no-tool-call completion so the resumed run terminates.
// `capture.messages` records the final conversation the runner sent to the
// model (system messages stripped) so tests can inspect the rehydrated history.
function resumeOpts(h: string, capture?: { messages?: AgentMessage[] }) {
  return {
    sessionId: 'sess',
    xenesisHome: h,
    cwd: h,
    env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true' },
    cli: { provider: 'mock', model: 'mock-model', workspace: h, approvalMode: 'auto' },
    onMessages: (messages: AgentMessage[]) => {
      if (capture) capture.messages = messages;
    },
  } as Parameters<typeof resumeAgentPipeline>[0];
}

function userTurns(messages: AgentMessage[]) {
  return messages.filter((m) => m.role === 'user');
}

describe('resumeAgentPipeline', () => {
  it('rehydrates history + restores the run_snapshot (turns != 0) and continues with the same sessionId via mock provider', async () => {
    const h = await seedLog([
      { type: 'user_message', sessionId: 'sess', timestamp: 't', message: { role: 'user', content: 'do X' } },
      {
        type: 'assistant_message',
        sessionId: 'sess',
        timestamp: 't',
        message: { role: 'assistant', content: 'working' },
      },
      fullSnapshot(2),
    ]);
    const result = await resumeAgentPipeline(resumeOpts(h));
    expect(result).toBeTruthy();
    expect(result.sessionId).toBe('sess');
    // The run appended to the SAME log: more records than were seeded.
    const recs = await readSessionLog(h, 'sess');
    expect(recs.length).toBeGreaterThan(3);
    // Non-vacuous restore proof: the FIRST run_snapshot the resumed run writes
    // is captured after `turns` increments from the restored value (2 -> 3). A
    // no-op restore would start at 0 and write turns === 1.
    const newSnapshots = recs.filter((r): r is typeof r & { state: { turns: number } } => r.type === 'run_snapshot');
    // The seeded snapshot (turns 2) plus at least one new snapshot.
    expect(newSnapshots.length).toBeGreaterThanOrEqual(2);
    expect(newSnapshots.at(-1)!.state.turns).toBeGreaterThanOrEqual(3);
  });

  it('with NO run_snapshot, degrades to message-only resume WITHOUT duplicating the user message', async () => {
    // A pre-S7 log: a single user_message, no run_snapshot. This is the primary
    // backward-compatibility resume path (spec §4, Global Constraint #4): resume
    // must NOT re-append or re-record the triggering user message even though no
    // snapshot is restored (it is already the last turn in the rehydrated history).
    const h = await seedLog([
      { type: 'user_message', sessionId: 'sess', timestamp: 't', message: { role: 'user', content: 'hi' } },
    ]);
    const capture: { messages?: AgentMessage[] } = {};
    const result = await resumeAgentPipeline(resumeOpts(h, capture));
    expect(result).toBeTruthy();
    expect(result.sessionId).toBe('sess');

    // Persisted-log proof: the resumed run must NOT write a second user_message
    // event. Before the fix this regressed from 1 -> 2.
    const recs = await readSessionLog(h, 'sess');
    const userMessageEvents = recs.filter((r) => r.type === 'user_message');
    expect(userMessageEvents.length).toBe(1);

    // In-memory proof: the conversation sent to the model contains the user turn
    // exactly once (no doubled trailing user message).
    const turns = userTurns(capture.messages ?? []);
    expect(turns.length).toBe(1);
    expect(turns[0]!.content).toBe('hi');
  });

  it('repairs a dangling tool_call from a mid-tool-call crash before continuing', async () => {
    const h = await seedLog([
      { type: 'user_message', sessionId: 'sess', timestamp: 't', message: { role: 'user', content: 'go' } },
      {
        type: 'assistant_message',
        sessionId: 'sess',
        timestamp: 't',
        message: { role: 'assistant', content: '', toolCalls: [{ id: 'tc1', name: 'read', input: {} }] },
      },
      // no tool_result for tc1 -> dangling
    ]);
    const capture: { messages?: AgentMessage[] } = {};
    const result = await resumeAgentPipeline(resumeOpts(h, capture));
    expect(result).toBeTruthy();
    expect(result.sessionId).toBe('sess');

    // Non-vacuous pairing proof: repairToolResultPairing must have synthesized a
    // tool_result for the dangling tool_call `tc1`, so the rehydrated history the
    // runner sends to the model pairs every tool_call with a tool_result. Without
    // the repair a real provider would reject this with a 400. We assert on the
    // synthesized placeholder directly (the mock provider does NOT enforce
    // pairing, so a `toBeTruthy()`-only check would pass even with the repair
    // removed — this asserts the actual production rehydrate output).
    const messages = capture.messages ?? [];
    const synthesized = messages.find(
      (m): m is Extract<AgentMessage, { role: 'tool' }> => m.role === 'tool' && m.toolCallId === 'tc1',
    );
    expect(synthesized).toBeDefined();
    expect(synthesized!.content).toBe(SYNTHETIC_TOOL_RESULT_PLACEHOLDER);

    // Every assistant tool_call in the rehydrated history is paired with a
    // tool_result (no dangling tool_call survives the rehydrate).
    const toolCallIds = messages
      .filter((m): m is Extract<AgentMessage, { role: 'assistant' }> => m.role === 'assistant')
      .flatMap((m) => (m.toolCalls ?? []).map((c) => c.id));
    const toolResultIds = new Set(
      messages.filter((m): m is Extract<AgentMessage, { role: 'tool' }> => m.role === 'tool').map((m) => m.toolCallId),
    );
    for (const id of toolCallIds) {
      expect(toolResultIds.has(id)).toBe(true);
    }
  });
});
