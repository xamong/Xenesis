import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { normalizeAgentSession } from '../../shared/agentSessions';
import { AGENT_SESSION_CACHE_VERSION, AGENT_SESSION_OVERLAY_VERSION, createAgentSessionIndexStore } from './indexStore';

async function withTempDir<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xd-agent-index-'));
  try {
    return await fn(root);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
}

test('index store returns empty cache and overlay defaults before files exist', async () => {
  await withTempDir(async (root) => {
    const store = createAgentSessionIndexStore(root);

    assert.deepEqual(await store.loadCache(), {
      version: AGENT_SESSION_CACHE_VERSION,
      savedAt: '',
      sessions: [],
      diagnostics: [],
    });
    assert.deepEqual(await store.loadOverlay(), {
      version: AGENT_SESSION_OVERLAY_VERSION,
      pinned: [],
      hidden: [],
      links: {},
    });
  });
});

test('index store persists cache and overlay under xenis agent-sessions directory', async () => {
  await withTempDir(async (root) => {
    const store = createAgentSessionIndexStore(root);
    const session = normalizeAgentSession({
      source: 'codex',
      provider: 'codex',
      sourceSessionId: 'a',
      title: 'Review desk CR',
      updatedAt: '2026-06-29T01:00:00.000Z',
    });

    await store.saveCache({
      version: AGENT_SESSION_CACHE_VERSION,
      savedAt: '2026-06-29T02:00:00.000Z',
      sessions: [session],
      diagnostics: [{ source: 'codex', level: 'info', message: 'ok' }],
    });
    await store.saveOverlay({
      version: AGENT_SESSION_OVERLAY_VERSION,
      pinned: ['codex:a'],
      hidden: ['claude:b'],
      links: { 'codex:a': { termId: 'term-1', linkedAt: '2026-06-29T03:00:00.000Z' } },
    });

    assert.equal(store.cachePath, path.join(root, 'agent-sessions', 'cache.json'));
    assert.equal(store.overlayPath, path.join(root, 'agent-sessions', 'overlay.json'));
    assert.equal((await store.loadCache()).sessions[0].id, 'codex:a');
    assert.deepEqual((await store.loadOverlay()).pinned, ['codex:a']);
  });
});

test('index store resets files with unsupported versions', async () => {
  await withTempDir(async (root) => {
    const store = createAgentSessionIndexStore(root);
    await fs.promises.mkdir(path.dirname(store.cachePath), { recursive: true });
    await fs.promises.writeFile(
      store.cachePath,
      JSON.stringify({ version: AGENT_SESSION_CACHE_VERSION + 1, savedAt: 'stale', sessions: [{}] }),
      'utf8',
    );
    await fs.promises.writeFile(
      store.overlayPath,
      JSON.stringify({ version: AGENT_SESSION_OVERLAY_VERSION + 1, pinned: ['stale'] }),
      'utf8',
    );

    assert.deepEqual((await store.loadCache()).sessions, []);
    assert.deepEqual((await store.loadOverlay()).pinned, []);
  });
});
