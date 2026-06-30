import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { AgentRunnerOptions } from '../../src/core/AgentRunner.js';
import { AgentRunner } from '../../src/core/AgentRunner.js';
import type { AgentRunEvent, SessionEvent } from '../../src/core/events.js';
import type { AgentMessage } from '../../src/core/messages.js';
import type { ResumableRunState } from '../../src/core/resume/ResumableRunState.js';
import type { AgentProvider, ProviderRequest, ProviderResponse } from '../../src/providers/types.js';
import type { SessionWriter } from '../../src/sessions/types.js';

// A mock provider that ALWAYS returns a plain-text final answer with NO tool
// calls, so the resumed run terminates after a single provider turn.
function makeProvider() {
  let turn = 0;
  const completeSpy = vi.fn(async (_request: ProviderRequest): Promise<ProviderResponse> => {
    turn += 1;
    return {
      message: { role: 'assistant', content: `final-answer-turn-${turn}` },
      stopReason: 'stop',
    };
  });
  const provider: AgentProvider = {
    name: 'mock',
    model: 'mock-model',
    complete: completeSpy as AgentProvider['complete'],
  };
  return { provider, completeSpy };
}

// In-memory SessionWriter that captures every event the runner records (the
// always-on `run_snapshot` is recorded but never yielded, so this is the only
// way to observe the restored internal counters).
function capturingWriter(): { writer: SessionWriter; events: SessionEvent[] } {
  const events: SessionEvent[] = [];
  const writer: SessionWriter = {
    async write(event: SessionEvent): Promise<void> {
      events.push(event);
    },
  };
  return { writer, events };
}

function workspaceTmp(): string {
  return mkdtempSync(join(tmpdir(), 's7-resume-'));
}

const fullRecovery: ResumableRunState['recovery'] = {
  projectAnalysisEvidenceRecoveryCount: 0,
  explicitToolCompletionRecoveryCount: 0,
  fileMutationRequiredRecoveryCount: 0,
  maxOutputTokensRecoveryCount: 0,
  toolRecoveryFinalizationRecoveryCount: 0,
  repositoryRecommendationRecoveryUsed: false,
  falseUnavailableToolRecoveryUsed: false,
};

function makeResumeState(overrides: Partial<ResumableRunState> = {}): ResumableRunState {
  return {
    turns: 2,
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    recovery: { ...fullRecovery },
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
    messageSeq: 5,
    ...overrides,
  };
}

function baseOptions(provider: AgentProvider, extra?: Partial<AgentRunnerOptions>): AgentRunnerOptions {
  const workspaceRoot = workspaceTmp();
  return {
    provider,
    model: 'mock-model',
    workspaceRoot,
    xenesisHome: join(workspaceRoot, '.xenesis'),
    approvalMode: 'auto',
    maxTurns: 12,
    tools: [],
    ...extra,
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
  return events.filter((e): e is Extract<AgentRunEvent, { type: 'done' }> => e.type === 'done');
}

function runSnapshotEvents(events: SessionEvent[]) {
  return events.filter((e): e is Extract<SessionEvent, { type: 'run_snapshot' }> => e.type === 'run_snapshot');
}

const PRIOR_USER_CONTENT = 'do the thing';

// A rehydrated history that already ends with the triggering user message
// (turn-boundary resume): a prior user message + the assistant turn that was
// already produced before the crash.
function rehydratedHistory(): AgentMessage[] {
  return [
    { role: 'user', content: PRIOR_USER_CONTENT, id: 'sess:r0' },
    { role: 'assistant', content: 'working on it', id: 'sess:r1' },
  ];
}

describe('AgentRunner resumeState restore', () => {
  it('restores turn count (does not start at 0)', async () => {
    const { provider } = makeProvider();
    const runner = new AgentRunner(
      baseOptions(provider, {
        historyMessages: rehydratedHistory(),
        resumeState: makeResumeState({ turns: 2 }),
      } as Partial<AgentRunnerOptions>),
    );
    // The resumed run continues from turn 2; the first (and only) provider turn
    // increments to turn 3. A no-op restore would report turns === 1.
    const events = await drain(runner, PRIOR_USER_CONTENT);
    const dones = doneEvents(events);
    expect(dones.length).toBe(1);
    expect(dones[0].turns).toBe(3);
  });

  it('does not duplicate the userMessage when resuming', async () => {
    const { provider } = makeProvider();
    const runner = new AgentRunner(
      baseOptions(provider, {
        historyMessages: rehydratedHistory(),
        resumeState: makeResumeState(),
      } as Partial<AgentRunnerOptions>),
    );
    const result = await runner.runToCompletion(PRIOR_USER_CONTENT);
    const userCopies = result.messages.filter((m) => m.role === 'user' && m.content === PRIOR_USER_CONTENT);
    expect(userCopies.length).toBe(1);
  });

  it('does append the userMessage on a fresh (non-resume) run', async () => {
    // Control: without resumeState the user message IS appended (so the
    // gate above is non-vacuous).
    const { provider } = makeProvider();
    const runner = new AgentRunner(baseOptions(provider, { historyMessages: [] } as Partial<AgentRunnerOptions>));
    const result = await runner.runToCompletion(PRIOR_USER_CONTENT);
    const userCopies = result.messages.filter((m) => m.role === 'user' && m.content === PRIOR_USER_CONTENT);
    expect(userCopies.length).toBe(1);
    // ...and a fresh run starts at turn 1.
    expect(result.turns).toBe(1);
  });

  it('restores previousCompactSummary, stopHookContinuationCount, usage and messageSeq', async () => {
    const { provider } = makeProvider();
    const { writer, events } = capturingWriter();
    const runner = new AgentRunner(
      baseOptions(provider, {
        historyMessages: rehydratedHistory(),
        sessionWriter: writer,
        resumeState: makeResumeState({
          turns: 2,
          previousCompactSummary: 'earlier summary',
          stopHookContinuationCount: 2,
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          messageSeq: 7,
        }),
      } as Partial<AgentRunnerOptions>),
    );
    await drain(runner, PRIOR_USER_CONTENT);
    const snapshots = runSnapshotEvents(events);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    const first = snapshots[0].state;
    // The first per-turn snapshot is captured AFTER the resumed `turns`
    // increments (2 -> 3) and reflects the restored internal state.
    expect(first.turns).toBe(3);
    expect(first.previousCompactSummary).toBe('earlier summary');
    expect(first.stopHookContinuationCount).toBe(2);
    expect(first.usage).toEqual({ inputTokens: 100, outputTokens: 50, totalTokens: 150 });
    // messageSeq was restored to 7, then bumped by the (non-appended) user
    // message derivation path. On resume no user message is appended, so the
    // next id assignment (the assistant message) consumes seq 7.
    expect(first.messageSeq).toBeGreaterThanOrEqual(7);
  });
});
