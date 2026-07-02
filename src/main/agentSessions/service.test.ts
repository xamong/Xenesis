import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { normalizeAgentSession } from '../../shared/agentSessions';
import type { AgentSessionAdapter } from './adapters';
import { createAgentSessionService } from './service';

test('service scans adapters, applies pin and hide overlay, and searches sessions', async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xd-agent-service-'));
  try {
    const adapter: AgentSessionAdapter = {
      id: 'codex',
      label: 'Codex CLI',
      localCliAgentId: 'codex',
      scannerVersion: 1,
      buildResumeCommand: (session) => `codex resume ${session.sourceSessionId}`,
      async scan() {
        return {
          diagnostics: [],
          sessions: [
            normalizeAgentSession({
              source: 'codex',
              provider: 'codex',
              sourceSessionId: 'a',
              projectPath: 'D:/work/xenesis-desk',
              title: 'Terminal layout fix',
              summary: 'Fix terminal layout',
              updatedAt: '2026-06-29T01:00:00.000Z',
              resumeCommand: 'codex resume a',
              sourceDetails: { sourcePaths: ['fixture'], scannerVersion: 1, scanStatus: 'fresh' },
            }),
          ],
        };
      },
    };
    const service = createAgentSessionService({
      homeDir: root,
      xenisHomeDir: root,
      adapters: [adapter],
      installedLocalCliAgents: ['codex'],
    });

    const scan = await service.scan({ force: true });
    assert.equal(scan.sessions.length, 1);
    await service.pin({ sessionId: 'codex:a', pinned: true });
    await service.hide({ sessionId: 'codex:a', hidden: true });

    assert.equal((await service.list({})).length, 0);
    assert.equal((await service.list({ includeHidden: true }))[0].pinned, true);
    assert.equal((await service.search({ query: 'terminal', includeHidden: true })).length, 1);
    assert.deepEqual((await service.status()).installedLocalCliAgents, ['codex']);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test('service persists attached terminal links in the overlay and reflected session state', async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xd-agent-service-link-'));
  try {
    const adapter: AgentSessionAdapter = {
      id: 'codex',
      label: 'Codex CLI',
      localCliAgentId: 'codex',
      scannerVersion: 1,
      buildResumeCommand: (session) => `codex resume ${session.sourceSessionId}`,
      async scan() {
        return {
          diagnostics: [],
          sessions: [
            normalizeAgentSession({
              source: 'codex',
              provider: 'codex',
              sourceSessionId: 'a',
              projectPath: 'D:/work/xenesis-desk',
              title: 'Terminal layout fix',
              summary: 'Fix terminal layout',
              updatedAt: '2026-06-29T01:00:00.000Z',
              resumeCommand: 'codex resume a',
              sourceDetails: { sourcePaths: ['fixture'], scannerVersion: 1, scanStatus: 'fresh' },
            }),
          ],
        };
      },
    };
    const service = createAgentSessionService({
      homeDir: root,
      xenisHomeDir: root,
      adapters: [adapter],
      installedLocalCliAgents: ['codex'],
    });

    await service.scan({ force: true });
    const attachResult = await service.attachTerminal({ sessionId: 'codex:a', termId: 'term-42' });

    assert.equal(attachResult.ok, true);
    const attachedSession = attachResult.session;
    assert.ok(attachedSession);
    assert.equal(attachedSession.id, 'codex:a');
    assert.equal(attachedSession.state, 'linked');
    assert.equal(attachedSession.terminalId, 'term-42');
    assert.equal(attachedSession.terminal?.termId, 'term-42');

    const reloaded = createAgentSessionService({
      homeDir: root,
      xenisHomeDir: root,
      adapters: [adapter],
      installedLocalCliAgents: ['codex'],
    });
    const [session] = await reloaded.list({ includeHidden: true });

    assert.equal(session.state, 'linked');
    assert.equal(session.terminalId, 'term-42');
    assert.equal(session.terminal?.termId, 'term-42');
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
