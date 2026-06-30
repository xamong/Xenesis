import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on('error', reject);
  });
}

async function waitForHealth(baseUrl, child) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < 10000) {
    if (child.exitCode !== null) throw new Error(`server exited early: ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError ?? new Error('server did not become ready');
}

async function api(baseUrl, apiPath, options = {}) {
  const response = await fetch(`${baseUrl}${apiPath}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const contentType = response.headers.get('content-type') || '';
  const json = contentType.includes('application/json')
    ? await response.json()
    : { success: false, error: `HTTP ${response.status}: ${await response.text()}` };
  if (!response.ok || json.success === false) {
    throw new Error(json.error || `HTTP ${response.status}`);
  }
  return json.data;
}

const syncPayload = {
  snapshotId: 'crsnap_routes_123456789012345678',
  capturedAt: '2026-07-01T00:00:00.000Z',
  source: 'route-smoke',
  registryHash: 'a'.repeat(64),
  nodeCount: 1,
  callableCount: 1,
  eventCount: 0,
  schemaCount: 0,
  rawPayloadHash: 'b'.repeat(64),
  rawPayloadJson: '[{"path":"xd.meta.local"}]',
  capabilities: [
    {
      path: 'xd.meta.local',
      parentPath: 'xd.meta',
      segment: 'local',
      kind: 'method',
      label: 'Local Meta',
      description: 'Route smoke capability',
      permission: 'read',
      approval: 'never',
      readable: false,
      writable: false,
      callable: true,
      subscribable: false,
      hasSchema: false,
      status: 'active',
    },
  ],
  schemas: [],
};

test('local server exposes CR metadata and Meta Management routes', async () => {
  const port = await getFreePort();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xenesis-meta-local-'));
  const dbPath = path.join(tempDir, 'database.db');
  const payloadDir = path.join(tempDir, 'cr-payloads');
  const child = spawn(process.execPath, ['index.js'], {
    cwd: path.resolve('server'),
    env: { ...process.env, PORT: String(port), DB_PATH: dbPath, CR_PAYLOAD_DIR: payloadDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForHealth(baseUrl, child);

    const sync = await api(baseUrl, '/api/cr/sync', {
      method: 'POST',
      body: JSON.stringify(syncPayload),
    });
    assert.equal(sync.ok, true);
    assert.equal(sync.capabilities, 1);

    const capabilities = await api(baseUrl, '/api/cr/capabilities?callable=true');
    assert.equal(capabilities.length, 1);
    assert.equal(capabilities[0].PATH, 'xd.meta.local');

    const run = await api(baseUrl, '/api/cr/runs', {
      method: 'POST',
      body: JSON.stringify({
        runId: 'route-run-1',
        path: 'xd.meta.local',
        source: 'route-smoke',
        ok: true,
        startedAt: '2026-07-01T00:01:00.000Z',
        durationMs: 5,
      }),
    });
    assert.equal(run.runId, 'route-run-1');

    const summary = await api(baseUrl, '/api/meta/summary');
    assert.equal(summary.crCapabilities, 1);

    const validation = await api(baseUrl, '/api/meta/validate', {
      method: 'POST',
      body: JSON.stringify({ items: [{ PID: 0, CODE: '', TYPE: 'GROUP' }] }),
    });
    assert.equal(validation.status, 'error');

    const select = await api(baseUrl, '/api/database/query', {
      method: 'POST',
      body: JSON.stringify({
        sql: 'SELECT CODE FROM TB_CODE_INFO_NEW WHERE PCODE=?',
        params: ['CRCAP'],
        readOnly: true,
      }),
    });
    assert.equal(select.type, 'SELECT');
    assert.equal(select.rowCount, 1);

    await assert.rejects(
      () =>
        api(baseUrl, '/api/database/query', {
          method: 'POST',
          body: JSON.stringify({ sql: 'SELECT 1; DELETE FROM TB_CODE_INFO_NEW', readOnly: true }),
        }),
      /Only one read-only SQL statement is allowed|not allowed/i,
    );
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
