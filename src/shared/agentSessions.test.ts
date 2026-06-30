import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_SESSION_KIND_LABELS,
  AGENT_SESSION_PROVIDER_LABELS,
  type AgentSession,
  applyAgentSessionListFilters,
  createAgentSessionId,
  isVisibleSubagentTerminalMetadata,
  normalizeAgentProjectName,
  normalizeAgentSession,
  rankAgentSessions,
  sortAgentSessions,
  summarizeAgentSession,
  summarizeAgentSessionCounts,
} from './agentSessions';

test('normalizeAgentSession creates stable labels and IDs', () => {
  const session = normalizeAgentSession({
    source: 'codex',
    provider: 'codex',
    sourceSessionId: 'codex-session-1',
    projectPath: 'D:\\Work\\Project',
    title: '',
    updatedAt: '2026-06-29T01:02:03.000Z',
    messageCount: 4,
    status: 'active',
  });

  assert.equal(session.id, createAgentSessionId('codex', 'codex-session-1'));
  assert.equal(session.providerLabel, AGENT_SESSION_PROVIDER_LABELS.codex);
  assert.equal(session.kindLabel, AGENT_SESSION_KIND_LABELS.conversation);
  assert.equal(session.title, 'Codex session 1');
  assert.equal(session.projectName, 'Project');
  assert.equal(session.status, 'active');
});

test('normalizeAgentSession keeps explicit titles and marks missing resume support', () => {
  const session = normalizeAgentSession({
    source: 'claude',
    provider: 'claude',
    sourceSessionId: 'claude-1',
    kind: 'plan',
    title: 'Refactor terminal bridge',
    projectPath: '/repo/xenesis-desk',
  });

  assert.equal(session.title, 'Refactor terminal bridge');
  assert.equal(session.projectName, 'xenesis-desk');
  assert.equal(session.kindLabel, AGENT_SESSION_KIND_LABELS.plan);
  assert.equal(session.resume.available, false);
  assert.equal(session.resume.reason, 'No resume command is available for this session.');
});

test('sortAgentSessions orders active recent sessions first', () => {
  const sessions: AgentSession[] = [
    normalizeAgentSession({
      source: 'gemini',
      provider: 'gemini',
      sourceSessionId: 'old',
      updatedAt: '2026-06-28T00:00:00.000Z',
      status: 'completed',
    }),
    normalizeAgentSession({
      source: 'codex',
      provider: 'codex',
      sourceSessionId: 'new',
      updatedAt: '2026-06-29T00:00:00.000Z',
      status: 'active',
    }),
    normalizeAgentSession({
      source: 'xenesis',
      provider: 'xenesis',
      sourceSessionId: 'live',
      updatedAt: '2026-06-27T00:00:00.000Z',
      status: 'active',
    }),
  ];

  assert.deepEqual(
    sortAgentSessions(sessions).map((session) => session.sourceSessionId),
    ['new', 'live', 'old'],
  );
});

test('summarizeAgentSession produces compact operator text', () => {
  const summary = summarizeAgentSession(
    normalizeAgentSession({
      source: 'xenesis',
      provider: 'xenesis',
      sourceSessionId: 'term-1',
      projectPath: 'D:\\Code\\xenesis-desk',
      terminalId: 'term-1',
      resumeCommand: 'codex resume abc',
      messageCount: 12,
    }),
  );

  assert.equal(summary.title, 'Xenesis session term-1');
  assert.equal(summary.subtitle, 'Xenesis · xenesis-desk · 12 messages · terminal term-1');
  assert.equal(summary.canResume, true);
});

test('normalizeAgentProjectName derives basename from Windows and POSIX paths', () => {
  assert.equal(normalizeAgentProjectName('D:/work/xenesis-desk'), 'xenesis-desk');
  assert.equal(normalizeAgentProjectName('/Users/me/project/'), 'project');
});

test('applyAgentSessionListFilters excludes hidden sessions by default', () => {
  const sessions = [
    normalizeAgentSession({ source: 'codex', provider: 'codex', sourceSessionId: 'a' }),
    normalizeAgentSession({ source: 'claude', provider: 'claude', sourceSessionId: 'b', hidden: true }),
  ];

  assert.deepEqual(
    applyAgentSessionListFilters(sessions, {}).map((item) => item.id),
    ['codex:a'],
  );
  assert.deepEqual(
    applyAgentSessionListFilters(sessions, { includeHidden: true }).map((item) => item.id),
    ['codex:a', 'claude:b'],
  );
});

test('rankAgentSessions ranks title and prompt matches before summary-only matches', () => {
  const ranked = rankAgentSessions(
    [
      normalizeAgentSession({
        source: 'codex',
        provider: 'codex',
        sourceSessionId: 'title',
        title: 'Terminal layout repair',
        updatedAt: '2026-06-29T01:00:00.000Z',
      }),
      normalizeAgentSession({
        source: 'codex',
        provider: 'codex',
        sourceSessionId: 'summary',
        title: 'Other work',
        summary: 'Terminal layout repair',
        updatedAt: '2026-06-29T02:00:00.000Z',
      }),
      normalizeAgentSession({
        source: 'codex',
        provider: 'codex',
        sourceSessionId: 'none',
        title: 'Release notes',
        summary: 'Packaging',
        updatedAt: '2026-06-29T03:00:00.000Z',
      }),
    ],
    'terminal layout',
  );

  assert.deepEqual(
    ranked.map((item) => item.id),
    ['codex:title', 'codex:summary'],
  );
});

test('summarizeAgentSessionCounts includes source, state, pinned, and hidden counts', () => {
  const counts = summarizeAgentSessionCounts([
    normalizeAgentSession({ source: 'codex', provider: 'codex', sourceSessionId: 'a', pinned: true }),
    normalizeAgentSession({ source: 'claude', provider: 'claude', sourceSessionId: 'b', hidden: true }),
  ]);

  assert.equal(counts.total, 2);
  assert.equal(counts['source:codex'], 1);
  assert.equal(counts['source:claude'], 1);
  assert.equal(counts.pinned, 1);
  assert.equal(counts.hidden, 1);
});

test('isVisibleSubagentTerminalMetadata recognizes worker and plan terminals', () => {
  assert.equal(isVisibleSubagentTerminalMetadata({ kind: 'xenesis-desk-subagent' }), true);
  assert.equal(isVisibleSubagentTerminalMetadata({ kind: 'xenesis-desk-subagent-plan' }), true);
  assert.equal(isVisibleSubagentTerminalMetadata({ kind: 'other' }), false);
});
