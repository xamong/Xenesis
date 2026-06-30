import assert from 'node:assert/strict';
import test from 'node:test';

import type { AgentSession } from '../../shared/agentSessions';
import type { TerminalHostSessionInfo } from '../terminal/terminalHost';
import { planAgentSessionResumeTarget } from './terminalLinker';

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

function terminal(overrides: Partial<TerminalHostSessionInfo> = {}): TerminalHostSessionInfo {
  return {
    id: 'term-1',
    kind: 'shell',
    label: 'PowerShell',
    detail: 'D:\\Work\\Project',
    shell: 'powershell',
    cwd: 'D:\\Work\\Project',
    localCliAgentId: 'codex',
    shellContext: { cwd: 'D:\\Work\\Project', exited: false, connectionStatus: 'connected', updatedAt: 1 },
    groupId: 'local',
    groupName: 'Local',
    active: false,
    fitLocked: false,
    isAltBuffer: false,
    imageAddonLoaded: false,
    ...overrides,
  };
}

test('planAgentSessionResumeTarget reuses an idle matching terminal', () => {
  const plan = planAgentSessionResumeTarget(session(), [terminal()]);

  assert.equal(plan.target, 'existing');
  assert.equal(plan.termId, 'term-1');
});

test('planAgentSessionResumeTarget opens a new terminal when the match is unsafe', () => {
  const plan = planAgentSessionResumeTarget(session(), [terminal({ isAltBuffer: true })]);

  assert.equal(plan.target, 'new');
  assert.match(plan.reason, /alternate buffer/i);
});

test('planAgentSessionResumeTarget can match MCP terminal metadata', () => {
  const plan = planAgentSessionResumeTarget(
    session({ source: 'xenesis', sourceLabel: 'Xenesis', projectPath: 'D:\\Work\\Project' }),
    [
      terminal({
        localCliAgentId: undefined,
        terminalMetadata: { kind: 'agent-session-resume', agent: 'Xenesis', command: 'xenesis sessions resume abc' },
      }),
    ],
  );

  assert.equal(plan.target, 'existing');
  assert.equal(plan.termId, 'term-1');
});
