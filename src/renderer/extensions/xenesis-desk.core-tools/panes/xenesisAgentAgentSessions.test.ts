import assert from 'node:assert/strict';
import test from 'node:test';

import { buildXenesisAgentSessionsSlashPlan, renderXenesisAgentSessionsSlashResult } from './xenesisAgentAgentSessions';

test('buildXenesisAgentSessionsSlashPlan maps read commands to Agent Sessions CR paths', () => {
  assert.deepEqual(buildXenesisAgentSessionsSlashPlan(''), {
    ok: true,
    action: 'status',
    path: 'xd.agentSessions.status',
    args: {},
    approved: false,
    pendingMessage: 'Reading Agent Sessions status...',
  });

  assert.deepEqual(buildXenesisAgentSessionsSlashPlan('search terminal layout'), {
    ok: true,
    action: 'search',
    path: 'xd.agentSessions.search',
    args: { query: 'terminal layout', includeHidden: true, limit: 12 },
    approved: false,
    pendingMessage: 'Searching Agent Sessions...',
  });
});

test('buildXenesisAgentSessionsSlashPlan maps resume and attach commands without pre-approving them', () => {
  assert.deepEqual(buildXenesisAgentSessionsSlashPlan('resume codex:session-abc'), {
    ok: true,
    action: 'resume',
    path: 'xd.agentSessions.resume',
    args: { sessionId: 'codex:session-abc', target: 'smart' },
    approved: false,
    pendingMessage: 'Requesting Agent Session resume...',
  });

  assert.deepEqual(buildXenesisAgentSessionsSlashPlan('resume terminal layout'), {
    ok: true,
    action: 'resume',
    path: 'xd.agentSessions.resume',
    args: { query: 'terminal layout', target: 'smart' },
    approved: false,
    pendingMessage: 'Requesting Agent Session resume...',
  });

  assert.deepEqual(buildXenesisAgentSessionsSlashPlan('attach codex:session-abc term-42'), {
    ok: true,
    action: 'attach',
    path: 'xd.agentSessions.attachTerminal',
    args: { sessionId: 'codex:session-abc', termId: 'term-42' },
    approved: false,
    pendingMessage: 'Linking Agent Session to terminal...',
  });
});

test('buildXenesisAgentSessionsSlashPlan rejects unsafe or incomplete forms', () => {
  assert.deepEqual(buildXenesisAgentSessionsSlashPlan('resume'), {
    ok: false,
    error: 'usage: /agent-sessions resume <query|session-id>',
  });
  assert.deepEqual(buildXenesisAgentSessionsSlashPlan('attach codex:session-abc'), {
    ok: false,
    error: 'usage: /agent-sessions attach <session-id> <term-id>',
  });
  assert.deepEqual(buildXenesisAgentSessionsSlashPlan('delete codex:session-abc'), {
    ok: false,
    error: 'usage: /agent-sessions [status|scan|list|search|resume|attach|open]',
  });
});

test('renderXenesisAgentSessionsSlashResult summarizes status, lists, and approval stops', () => {
  assert.equal(
    renderXenesisAgentSessionsSlashResult(
      { action: 'status' },
      {
        ok: true,
        path: 'xd.agentSessions.status',
        result: {
          counts: { total: 3, 'state:linked': 1 },
          supportedSources: ['codex', 'claude'],
          lastScannedAt: '2026-07-02T00:00:00.000Z',
        },
      },
    ),
    [
      'Agent Sessions status:',
      '- total: 3',
      '- linked: 1',
      '- sources: codex, claude',
      '- last scan: 2026-07-02T00:00:00.000Z',
    ].join('\n'),
  );

  assert.equal(
    renderXenesisAgentSessionsSlashResult(
      { action: 'search' },
      {
        ok: true,
        path: 'xd.agentSessions.search',
        result: [
          {
            id: 'codex:abc',
            sourceLabel: 'Codex',
            title: 'Terminal layout',
            projectName: 'Xenesis',
            state: 'saved',
            updatedAt: '2026-07-02T00:00:00.000Z',
          },
        ],
      },
    ),
    ['Agent Sessions search:', '- Codex · Terminal layout · Xenesis · saved · codex:abc'].join('\n'),
  );

  assert.equal(
    renderXenesisAgentSessionsSlashResult(
      { action: 'resume' },
      {
        ok: false,
        path: 'xd.agentSessions.resume',
        approvalRequired: true,
        approval: 'when-external',
      },
    ),
    'Desk approval is required before resuming the Agent Session.',
  );
});

test('renderXenesisAgentSessionsSlashResult includes resume target plan reason when available', () => {
  assert.equal(
    renderXenesisAgentSessionsSlashResult(
      { action: 'resume' },
      {
        ok: true,
        path: 'xd.agentSessions.resume',
        result: {
          session: { title: 'Terminal layout' },
          termId: 'term-2',
          targetPlan: {
            target: 'existing',
            termId: 'term-2',
            reason: 'Idle matching terminal selected.',
          },
        },
      },
    ),
    [
      'Agent Session resume requested:',
      '- session: Terminal layout',
      '- terminal: term-2',
      '- target: Idle matching terminal selected.',
    ].join('\n'),
  );
});
