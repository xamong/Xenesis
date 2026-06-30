import assert from 'node:assert/strict';
import test from 'node:test';
import type { DeskBridgeCapabilityAuditRecord, DeskBridgeCapabilityNode } from '../shared/deskBridgeCapabilities';
import { createCrMetadataBridge } from './crMetadataBridge';

function createFetchRecorder() {
  const calls: { url: string; body: unknown }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(JSON.stringify({ success: true, data: { ok: true, rows: [] } }), { status: 200 });
  };
  return { calls, fetchImpl };
}

const nodes: DeskBridgeCapabilityNode[] = [
  {
    path: 'xd.app.status',
    label: 'Read status',
    description: 'Read status.',
    kind: 'method',
    permission: 'read',
    approval: 'never',
    callable: true,
  },
];

test('sync posts canonical registry payload to the meta API', async () => {
  const { calls, fetchImpl } = createFetchRecorder();
  const bridge = createCrMetadataBridge({
    getApiUrl: () => 'http://127.0.0.1:3001',
    listCapabilities: () => nodes,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

  const result = await bridge.sync({ reason: 'manual' });

  assert.deepEqual(result, { ok: true, rows: [] });
  assert.equal(calls[0].url, 'http://127.0.0.1:3001/api/cr/sync');
  assert.match((calls[0].body as { snapshotId: string }).snapshotId, /^crsnap_/);
  assert.equal((calls[0].body as { source: string }).source, 'desk:manual');
});

test('recordRunFromAudit redacts args and keeps call failures isolated', async () => {
  const calls: { url: string; body: unknown }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    throw new Error('server down');
  };
  const bridge = createCrMetadataBridge({
    getApiUrl: () => 'http://127.0.0.1:3001',
    listCapabilities: () => nodes,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  const audit: DeskBridgeCapabilityAuditRecord = {
    timestamp: '2026-06-27T00:02:00.000Z',
    path: 'xd.app.status',
    source: 'xenesis',
    permission: 'read',
    approval: 'never',
    approved: false,
    args: { apiKey: 'secret', visible: 'ok' },
    resultOk: true,
    durationMs: 5,
  };

  await bridge.recordRunFromAudit(audit, { ok: true, path: 'xd.app.status', result: { status: 'ok' } });

  assert.equal(calls.length, 1);
  assert.equal((calls[0].body as any).args.apiKey, '[redacted]');
  assert.equal((calls[0].body as any).args.visible, 'ok');
  assert.equal((calls[0].body as any).path, 'xd.app.status');
});
