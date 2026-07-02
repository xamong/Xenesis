import assert from 'node:assert/strict';
import test from 'node:test';

import type { AgentSession } from './agentSessions';
import { type AgentSessionTerminalMatchInfo, planAgentSessionResumeTarget } from './agentSessionTerminalLinker';

function session(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'codex:project:abc',
    source: 'codex',
    sourceLabel: 'Codex',
    provider: 'codex',
    providerLabel: 'Codex',
    sourceSessionId: 'abc',
    kind: 'conversation',
    kindLabel: 'Conversation',
    projectName: 'Project',
    projectPath: 'D:\\Work\\Project',
    title: 'Fix bug',
    summary: 'Fix bug',
    updatedAt: '2026-07-01T00:00:00.000Z',
    resumeCommand: 'codex resume abc',
    resumeModes: [],
    resume: { available: true, command: 'codex resume abc' },
    state: 'saved',
    status: 'unknown',
    pinned: false,
    hidden: false,
    sourceDetails: { sourcePaths: [], scannerVersion: 1, scanStatus: 'fresh' },
    metadata: {},
    ...overrides,
  };
}

function terminal(overrides: Partial<AgentSessionTerminalMatchInfo> = {}): AgentSessionTerminalMatchInfo {
  return {
    id: 'term-1',
    kind: 'shell',
    cwd: 'D:\\Work\\Project',
    shellCwd: 'D:\\Work\\Project',
    localCliAgentId: 'codex',
    active: false,
    exited: false,
    isAltBuffer: false,
    ...overrides,
  };
}

test('planAgentSessionResumeTarget reuses an idle matching terminal', () => {
  const plan = planAgentSessionResumeTarget(session(), [terminal()]);

  assert.equal(plan.target, 'existing');
  assert.equal(plan.termId, 'term-1');
});

test('planAgentSessionResumeTarget skips an unsafe first candidate and reuses the next safe candidate', () => {
  const plan = planAgentSessionResumeTarget(session(), [
    terminal({ id: 'busy-term', active: true, lastSentCommand: 'codex' }),
    terminal({ id: 'idle-term' }),
  ]);

  assert.equal(plan.target, 'existing');
  assert.equal(plan.termId, 'idle-term');
  assert.match(plan.reason, /idle matching terminal/i);
});

test('planAgentSessionResumeTarget does not auto-reuse an unsafe linked terminal', () => {
  const plan = planAgentSessionResumeTarget(
    session({ terminalId: 'linked-term', terminal: { termId: 'linked-term', active: true } }),
    [terminal({ id: 'linked-term', active: true, lastSentCommand: 'codex resume abc' })],
  );

  assert.equal(plan.target, 'new');
  assert.match(plan.reason, /recent active command/i);
});

test('planAgentSessionResumeTarget allows explicit terminal override even when unsafe', () => {
  const plan = planAgentSessionResumeTarget(
    session(),
    [terminal({ id: 'explicit-term', active: true, isAltBuffer: true, lastSentCommand: 'vim' })],
    { termId: 'explicit-term' },
  );

  assert.equal(plan.target, 'existing');
  assert.equal(plan.termId, 'explicit-term');
  assert.match(plan.reason, /explicit terminal/i);
});

test('planAgentSessionResumeTarget matches agent-session metadata without a local CLI profile', () => {
  const plan = planAgentSessionResumeTarget(
    session({ source: 'xenesis', sourceLabel: 'Xenesis', projectPath: 'D:\\Work\\Project' }),
    [
      terminal({
        localCliAgentId: undefined,
        terminalMetadata: {
          kind: 'agent-session-resume',
          agent: 'Xenesis',
          projectPath: 'D:\\Work\\Project',
          command: 'xenesis sessions resume abc',
        },
      }),
    ],
  );

  assert.equal(plan.target, 'existing');
  assert.equal(plan.termId, 'term-1');
});

test('planAgentSessionResumeTarget avoids visible subagent terminals during smart reuse', () => {
  const plan = planAgentSessionResumeTarget(session({ source: 'xenesis', sourceLabel: 'Xenesis' }), [
    terminal({
      id: 'subagent-term',
      localCliAgentId: undefined,
      terminalMetadata: {
        kind: 'xenesis-desk-subagent',
        agent: 'Xenesis',
        projectPath: 'D:\\Work\\Project',
        command: 'codex exec',
      },
    }),
  ]);

  assert.equal(plan.target, 'new');
  assert.match(plan.reason, /app-managed/i);
});
