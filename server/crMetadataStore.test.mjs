import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import storeModule from './crMetadataStore.js';

const { createCrMetadataStore } = storeModule;

function createDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE TB_CODE_INFO_NEW (
      UID INTEGER PRIMARY KEY AUTOINCREMENT,
      PID INTEGER NOT NULL DEFAULT 0,
      PCODE VARCHAR(50) NOT NULL DEFAULT '',
      AID INTEGER DEFAULT NULL,
      ACODE VARCHAR(50) DEFAULT NULL,
      CODE VARCHAR(50) DEFAULT NULL,
      NAME VARCHAR(100) DEFAULT NULL,
      VALUE TEXT DEFAULT NULL,
      TYPE VARCHAR(10) DEFAULT NULL,
      FORMORDER VARCHAR(10) DEFAULT NULL,
      DESCRIPTION VARCHAR(255) DEFAULT NULL,
      SHOW_YN CHAR(1) NOT NULL DEFAULT 'N',
      CID INTEGER DEFAULT NULL,
      RID VARCHAR(32) DEFAULT NULL,
      RIX INTEGER DEFAULT NULL,
      TARGET VARCHAR(50) DEFAULT NULL,
      RESERVE VARCHAR(255) DEFAULT NULL,
      RESERV1 VARCHAR(255) DEFAULT NULL,
      RESERV2 VARCHAR(255) DEFAULT NULL,
      RESERV3 VARCHAR(255) DEFAULT NULL,
      USE_YN CHAR(1) NOT NULL DEFAULT 'Y',
      DEL_YN CHAR(1) NOT NULL DEFAULT 'N',
      TTSHINT VARCHAR(255) DEFAULT NULL,
      INSERT_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
      UPDATE_DT DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return db;
}

function createStore() {
  return createCrMetadataStore(createDb(), {
    payloadDir: fs.mkdtempSync(path.join(os.tmpdir(), 'cr-metadata-')),
  });
}

const syncPayload = {
  snapshotId: 'crsnap_123456789012345678901234',
  capturedAt: '2026-06-27T00:00:00.000Z',
  source: 'unit-test',
  registryHash: 'a'.repeat(64),
  nodeCount: 2,
  callableCount: 1,
  eventCount: 0,
  schemaCount: 1,
  rawPayloadHash: 'b'.repeat(64),
  rawPayloadJson: JSON.stringify([{ path: 'xd' }, { path: 'xd.terminals.list' }]),
  capabilities: [
    {
      path: 'xd',
      parentPath: '',
      segment: 'xd',
      kind: 'group',
      label: 'Xenesis Desk',
      description: 'Root',
      permission: 'read',
      approval: 'never',
      readable: true,
      writable: false,
      callable: false,
      subscribable: false,
      hasSchema: false,
      status: 'active',
    },
    {
      path: 'xd.terminals.list',
      parentPath: 'xd.terminals',
      segment: 'list',
      kind: 'method',
      label: 'List terminals',
      description: 'List terminal sessions.',
      permission: 'read',
      approval: 'never',
      readable: false,
      writable: false,
      callable: true,
      subscribable: false,
      hasSchema: true,
      schemaHash: 'c'.repeat(64),
      status: 'active',
    },
  ],
  schemas: [{ schemaHash: 'c'.repeat(64), schemaJson: '{"type":"object"}' }],
};

test('createCrMetadataStore initializes CR tables and syncs capabilities', () => {
  const store = createStore();

  const result = store.syncRegistry(syncPayload);

  assert.equal(result.ok, true);
  assert.equal(result.snapshotId, syncPayload.snapshotId);
  assert.equal(result.capabilities, 2);
  assert.equal(result.schemas, 1);
  assert.equal(store.listCapabilities({}).length, 2);
  assert.equal(store.listCapabilities({ callable: true })[0].PATH, 'xd.terminals.list');
  assert.equal(store.listSnapshots({ limit: 10 })[0].SNAPSHOT_ID, syncPayload.snapshotId);
});

test('syncRegistry marks missing previous paths as removed', () => {
  const store = createStore();

  store.syncRegistry(syncPayload);
  store.syncRegistry({
    ...syncPayload,
    snapshotId: 'crsnap_222222222222222222222222',
    registryHash: 'd'.repeat(64),
    capabilities: [syncPayload.capabilities[0]],
    schemas: [],
    nodeCount: 1,
    callableCount: 0,
    schemaCount: 0,
  });

  const removed = store.listCapabilities({ status: 'removed' });
  assert.equal(removed.length, 1);
  assert.equal(removed[0].PATH, 'xd.terminals.list');
});

test('recordRun stores payload references and workflow events', () => {
  const store = createStore();
  store.syncRegistry(syncPayload);

  const result = store.recordRun({
    runId: 'run-1',
    path: 'xd.terminals.list',
    source: 'xenesis',
    sourceAgent: 'agent',
    channel: 'telegram',
    userId: 'user-1',
    permission: 'read',
    approval: 'never',
    approved: false,
    approvalRequired: false,
    args: { max: 10 },
    result: { ok: true, rows: [1, 2, 3] },
    ok: true,
    startedAt: '2026-06-27T00:01:00.000Z',
    durationMs: 12,
    events: [
      {
        runId: 'run-1',
        seq: 0,
        stepPath: 'xd.terminals.list',
        stepLabel: 'List terminals',
        ok: true,
        skipped: false,
        durationMs: 12,
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.runId, 'run-1');
  assert.equal(store.listRuns({ limit: 10 })[0].RUN_ID, 'run-1');
  assert.equal(store.listRunEvents('run-1').length, 1);
});

test('syncRegistry writes compact XMDB mirror rows', () => {
  const db = createDb();
  const store = createCrMetadataStore(db, {
    payloadDir: fs.mkdtempSync(path.join(os.tmpdir(), 'cr-metadata-')),
  });

  store.syncRegistry(syncPayload);

  const rows = db
    .prepare("SELECT CODE, NAME, RID, VALUE FROM TB_CODE_INFO_NEW WHERE PCODE='CRCAP' AND DEL_YN='N' ORDER BY CODE")
    .all();
  assert.equal(rows.length, 2);
  assert.equal(rows[1].CODE, 'xd.terminals.list');
  assert.equal(rows[1].NAME, 'List terminals');
  assert.match(rows[1].RID, /^CRCAP_[a-f0-9]{20}$/);
  assert.equal(JSON.parse(rows[1].VALUE).callable, true);
});
