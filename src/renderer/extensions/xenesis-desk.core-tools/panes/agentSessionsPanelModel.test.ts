import assert from 'node:assert/strict';
import test from 'node:test';

import type { AgentSession } from '../../../../shared/agentSessions';
import { buildAgentSessionPanelCounts, getAgentSessionActionState } from './agentSessionsPanelModel';

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

test('buildAgentSessionPanelCounts summarizes visible panel state', () => {
  const counts = buildAgentSessionPanelCounts([
    session({ state: 'running' }),
    session({ id: 'linked', state: 'linked', pinned: true }),
    session({ id: 'hidden', state: 'hidden', hidden: true }),
    session({
      id: 'failed',
      state: 'saved',
      sourceDetails: { sourcePaths: [], scannerVersion: 1, scanStatus: 'failed' },
    }),
  ]);

  assert.deepEqual(counts, {
    total: 4,
    running: 1,
    linked: 1,
    pinned: 1,
    hidden: 1,
    degraded: 1,
  });
});

test('getAgentSessionActionState disables resume without a command or source', () => {
  assert.equal(getAgentSessionActionState(session()).canResume, true);

  const noCommand = getAgentSessionActionState(session({ resumeCommand: '' }));
  assert.equal(noCommand.canResume, false);
  assert.match(noCommand.resumeReason, /no resume command/i);

  const unavailable = getAgentSessionActionState(session({ state: 'unavailable' }));
  assert.equal(unavailable.canResume, false);
  assert.match(unavailable.resumeReason, /unavailable/i);
});
