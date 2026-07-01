import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCrRegistrySnapshot,
  extractCrWorkflowRunEvents,
  hashCrPayload,
  makeCrShortRid,
  redactCrValue,
} from './crMetadata';
import type { DeskBridgeCapabilityNode } from './deskBridgeCapabilities';

const nodes: DeskBridgeCapabilityNode[] = [
  {
    path: 'xd.terminals',
    label: 'Terminals',
    description: 'Terminal session lifecycle and output inspection.',
    kind: 'group',
    permission: 'read',
    approval: 'never',
    readable: true,
    children: [],
  },
  {
    path: 'xd.terminals.list',
    label: 'List terminals',
    description: 'List terminal sessions.',
    kind: 'method',
    permission: 'read',
    approval: 'never',
    callable: true,
    schema: {
      type: 'object',
      properties: {
        includeBuffer: { type: 'boolean', default: false },
      },
    },
  },
];

test('buildCrRegistrySnapshot canonicalizes capabilities and hashes schemas', () => {
  const snapshot = buildCrRegistrySnapshot(nodes, {
    capturedAt: '2026-06-27T00:00:00.000Z',
    source: 'unit-test',
  });

  assert.equal(snapshot.nodeCount, 2);
  assert.equal(snapshot.callableCount, 1);
  assert.equal(snapshot.eventCount, 0);
  assert.equal(snapshot.schemaCount, 1);
  assert.match(snapshot.snapshotId, /^crsnap_[a-f0-9]{24}$/);
  assert.equal(snapshot.capabilities[1].path, 'xd.terminals.list');
  assert.equal(snapshot.capabilities[1].parentPath, 'xd.terminals');
  assert.equal(snapshot.capabilities[1].segment, 'list');
  assert.equal(snapshot.capabilities[1].callable, true);
  assert.match(snapshot.capabilities[1].schemaHash ?? '', /^[a-f0-9]{64}$/);
  assert.equal(snapshot.schemas.length, 1);
  assert.equal(snapshot.schemas[0].schemaHash, snapshot.capabilities[1].schemaHash);

  const again = buildCrRegistrySnapshot([...nodes].reverse(), {
    capturedAt: '2026-06-27T00:00:00.000Z',
    source: 'unit-test',
  });
  assert.equal(again.registryHash, snapshot.registryHash);
});

test('redactCrValue removes sensitive keys and preserves safe strings', () => {
  const redacted = redactCrValue({
    Authorization: 'Bearer abc.def.ghi',
    apiKey: 'sk-secret',
    nested: {
      bridgeToken: 'bridge-secret',
      visible: 'kept',
      url: 'http://127.0.0.1:3847',
    },
    list: [{ password: 'pw', value: 'ok' }],
  });

  assert.deepEqual(redacted, {
    Authorization: '[redacted]',
    apiKey: '[redacted]',
    nested: {
      bridgeToken: '[redacted]',
      visible: 'kept',
      url: 'http://127.0.0.1:3847',
    },
    list: [{ password: '[redacted]', value: 'ok' }],
  });
});

test('makeCrShortRid produces deterministic XMDB-safe RIDs', () => {
  const rid = makeCrShortRid('CRCAP', 'xd.terminals.list');
  assert.equal(rid.length, 26);
  assert.match(rid, /^CRCAP_[a-f0-9]{20}$/);
  assert.equal(makeCrShortRid('CRCAP', 'xd.terminals.list'), rid);
});

test('hashCrPayload hashes canonical JSON independent of key order', () => {
  assert.equal(hashCrPayload({ b: 2, a: 1 }), hashCrPayload({ a: 1, b: 2 }));
});

test('extractCrWorkflowRunEvents converts workflow result steps into ordered events', () => {
  const events = extractCrWorkflowRunEvents('run-1', {
    results: [
      { index: 0, path: 'xd.dock.panes.list', label: 'List panes', ok: true, durationMs: 4 },
      { index: 1, path: 'xd.views.open', ok: false, skipped: true, error: 'Skipped after previous failure.' },
    ],
  });

  assert.deepEqual(events, [
    {
      runId: 'run-1',
      seq: 0,
      stepPath: 'xd.dock.panes.list',
      stepLabel: 'List panes',
      ok: true,
      skipped: false,
      error: undefined,
      durationMs: 4,
      resultHash: undefined,
    },
    {
      runId: 'run-1',
      seq: 1,
      stepPath: 'xd.views.open',
      stepLabel: undefined,
      ok: false,
      skipped: true,
      error: 'Skipped after previous failure.',
      durationMs: 0,
      resultHash: undefined,
    },
  ]);
});
