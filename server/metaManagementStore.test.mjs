import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import storeModule from './metaManagementStore.js';

const { createMetaManagementStore } = storeModule;

function createDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE TB_CODE_INFO_NEW (
      UID INTEGER PRIMARY KEY AUTOINCREMENT,
      PID INTEGER DEFAULT NULL,
      PCODE VARCHAR(50) DEFAULT NULL,
      AID INTEGER DEFAULT NULL,
      ACODE VARCHAR(50) DEFAULT NULL,
      CODE VARCHAR(50) DEFAULT NULL,
      NAME VARCHAR(100) DEFAULT NULL,
      VALUE TEXT DEFAULT NULL,
      TYPE VARCHAR(10) DEFAULT NULL,
      FORMORDER VARCHAR(10) DEFAULT NULL,
      DESCRIPTION VARCHAR(255) DEFAULT NULL,
      SHOW_YN CHAR(1) DEFAULT NULL,
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
    );

    CREATE TABLE CR_RUN (
      RUN_ID TEXT PRIMARY KEY,
      PATH TEXT NOT NULL,
      SOURCE TEXT NOT NULL DEFAULT 'internal',
      OK INTEGER NOT NULL DEFAULT 0,
      ERROR TEXT,
      STARTED_AT TEXT NOT NULL,
      DURATION_MS INTEGER NOT NULL DEFAULT 0,
      CREATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE CR_CAPABILITY (
      PATH TEXT PRIMARY KEY,
      STATUS TEXT NOT NULL DEFAULT 'active'
    );
  `);
  return db;
}

function createStore(db = createDb()) {
  return { db, store: createMetaManagementStore(db) };
}

function tableExists(db, tableName) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName));
}

function columnNames(db, tableName) {
  return db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map((column) => column.name);
}

const metaChangelogColumns = [
  'CHANGE_ID',
  'ENTITY_TABLE',
  'ENTITY_UID',
  'ENTITY_KEY',
  'ACTION',
  'SOURCE',
  'ACTOR',
  'SUMMARY',
  'BEFORE_JSON',
  'AFTER_JSON',
  'DIFF_JSON',
  'OK',
  'ERROR',
  'CREATED_AT',
];

const metaValidationRunColumns = [
  'RUN_ID',
  'SCOPE',
  'TARGET_UID',
  'TARGET_CODE',
  'STATUS',
  'ERROR_COUNT',
  'WARNING_COUNT',
  'RESULT_JSON',
  'CREATED_AT',
];

test('createMetaManagementStore initializes meta support tables', () => {
  const { db } = createStore();

  assert.equal(tableExists(db, 'META_CHANGELOG'), true);
  assert.equal(tableExists(db, 'META_VALIDATION_RUN'), true);
});

test('createMetaManagementStore migrates a partial existing META_CHANGELOG table additively', () => {
  const db = createDb();
  db.exec('CREATE TABLE META_CHANGELOG (CHANGE_ID TEXT PRIMARY KEY)');

  const store = createMetaManagementStore(db);
  const result = store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: '1',
    action: 'update',
    summary: 'Migrated changelog row',
  });

  assert.ok(result.changeId);
  assert.deepEqual(columnNames(db, 'META_CHANGELOG').sort(), metaChangelogColumns.toSorted());
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM META_CHANGELOG').get().count, 1);
});

test('createMetaManagementStore migrates a partial existing META_VALIDATION_RUN table additively', () => {
  const db = createDb();
  db.exec('CREATE TABLE META_VALIDATION_RUN (RUN_ID TEXT PRIMARY KEY)');

  const store = createMetaManagementStore(db);
  const result = store.validateCodeBatch({
    scope: 'batch',
    items: [{ UID: 1, PID: 0, CODE: 'GROUP_A', TYPE: 'GROUP', FORMORDER: '1' }],
  });

  assert.equal(result.status, 'ok');
  assert.deepEqual(columnNames(db, 'META_VALIDATION_RUN').sort(), metaValidationRunColumns.toSorted());
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM META_VALIDATION_RUN').get().count, 1);
});

test('validateCodeBatch blocks missing CODE and duplicate active database rows', () => {
  const { db, store } = createStore();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, FORMORDER, SHOW_YN, DEL_YN) VALUES (10, 7, 'EXISTING', 'CODE', '1', 'Y', 'N')",
  ).run();

  const result = store.validateCodeBatch({
    scope: 'batch',
    items: [
      { UID: 1, PID: 7, CODE: '', TYPE: 'CODE', FORMORDER: '1', SHOW_YN: 'Y' },
      { UID: 2, PID: 7, CODE: 'EXISTING', TYPE: 'CODE', FORMORDER: '2', SHOW_YN: 'Y' },
    ],
  });

  assert.equal(result.status, 'error');
  assert.equal(result.errorCount, 2);
  assert.deepEqual(result.errors.map((error) => error.code).sort(), ['duplicate-code', 'missing-code']);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM META_VALIDATION_RUN').get().count, 1);
});

test('validateCodeBatch detects duplicate active database rows when first match is the same UID', () => {
  const { db, store } = createStore();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, FORMORDER, SHOW_YN, DEL_YN) VALUES (1, 7, 'DUP', 'CODE', '1', 'Y', 'N')",
  ).run();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, FORMORDER, SHOW_YN, DEL_YN) VALUES (2, 7, 'DUP', 'CODE', '1', 'Y', 'N')",
  ).run();

  const result = store.validateCodeBatch({
    scope: 'batch',
    items: [{ UID: 1, PID: 7, CODE: 'DUP', NAME: 'Dup', TYPE: 'CODE', FORMORDER: '1', SHOW_YN: 'Y' }],
  });

  assert.equal(result.status, 'error');
  assert.equal(result.errorCount, 1);
  assert.deepEqual(
    result.errors.map((error) => error.code),
    ['duplicate-code'],
  );
});

test('validateCodeBatch allows replacing a row deleted in the same batch', () => {
  const { db, store } = createStore();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, FORMORDER, SHOW_YN, DEL_YN) VALUES (1, 7, 'DUP', 'CODE', '1', 'Y', 'N')",
  ).run();

  const result = store.validateCodeBatch({
    scope: 'batch',
    items: [
      { UID: 1, _deleted: true },
      { PID: 7, CODE: 'DUP', TYPE: 'CODE', FORMORDER: '1', SHOW_YN: 'Y' },
    ],
  });

  assert.notEqual(result.status, 'error');
  assert.equal(
    result.errors.some((error) => error.code === 'duplicate-code'),
    false,
  );
});

test('validateCodeBatch still blocks replacements when another duplicate remains active', () => {
  const { db, store } = createStore();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, FORMORDER, SHOW_YN, DEL_YN) VALUES (1, 7, 'DUP', 'CODE', '1', 'Y', 'N')",
  ).run();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, FORMORDER, SHOW_YN, DEL_YN) VALUES (2, 7, 'DUP', 'CODE', '2', 'Y', 'N')",
  ).run();

  const result = store.validateCodeBatch({
    scope: 'batch',
    items: [
      { UID: 1, _deleted: true },
      { PID: 7, CODE: 'DUP', TYPE: 'CODE', FORMORDER: '1', SHOW_YN: 'Y' },
    ],
  });

  assert.equal(result.status, 'error');
  assert.equal(result.errors.find((error) => error.code === 'duplicate-code')?.existingUid, '2');
});

test('validateCodeBatch does not treat DEL_YN alone as a same-batch delete', () => {
  const { db, store } = createStore();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, FORMORDER, SHOW_YN, DEL_YN) VALUES (1, 7, 'DUP', 'CODE', '1', 'Y', 'N')",
  ).run();

  const result = store.validateCodeBatch({
    scope: 'batch',
    items: [
      { UID: 1, DEL_YN: 'Y' },
      { PID: 7, CODE: 'DUP', TYPE: 'CODE', FORMORDER: '1', SHOW_YN: 'Y' },
    ],
  });

  assert.equal(result.status, 'error');
  assert.equal(result.errors.find((error) => error.code === 'duplicate-code')?.existingUid, '1');
});

test('validateCodeBatch checks omitted root GROUP PID as zero for duplicates', () => {
  const { db, store } = createStore();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, FORMORDER, DEL_YN) VALUES (1, 0, 'Root', 'GROUP', '1', 'N')",
  ).run();

  const result = store.validateCodeBatch({
    scope: 'batch',
    items: [{ CODE: 'Root', TYPE: 'GROUP', FORMORDER: '1' }],
  });

  assert.equal(result.status, 'error');
  assert.equal(
    result.errors.some((error) => error.code === 'duplicate-code'),
    true,
  );
});

test('validateCodeBatch warns for missing FORMORDER and missing SHOW_YN on CODE and ATTR rows', () => {
  const { store } = createStore();

  const result = store.validateCodeBatch({
    scope: 'template',
    items: [
      { UID: 1, PID: 0, CODE: 'CUSTOMER', TYPE: 'TABLE', SHOW_YN: 'Y' },
      { UID: 2, PID: 1, CODE: 'NAME', TYPE: 'ATTR', FORMORDER: '1' },
      { UID: 3, PID: 1, CODE: 'STATUS', TYPE: 'CODE' },
    ],
  });

  assert.equal(result.status, 'warning');
  assert.equal(result.errorCount, 0);
  assert.equal(result.warningCount, 4);
  assert.deepEqual(result.warnings.map((warning) => warning.code).sort(), [
    'missing-formorder',
    'missing-formorder',
    'missing-show-yn',
    'missing-show-yn',
  ]);
});

test('recordChange records successful and failed changelog rows with newest first', () => {
  const { store } = createStore();

  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: '1',
    entityKey: 'CODE:A',
    action: 'update',
    summary: 'Updated A',
    ok: true,
    createdAt: '2026-06-27T00:00:00.000Z',
  });
  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: '2',
    entityKey: 'CODE:B',
    action: 'delete',
    summary: 'Delete failed',
    ok: false,
    error: 'locked',
    createdAt: '2026-06-27T00:01:00.000Z',
  });

  const rows = store.listChangelog({ limit: 10 });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].ENTITY_UID, '2');
  assert.equal(rows[0].OK, 0);
  assert.equal(rows[0].ERROR, 'locked');
  assert.equal(rows[1].ENTITY_UID, '1');
  assert.equal(rows[1].OK, 1);
});

test('recordBatchChanges maps batch results to insert, update, and delete changelog actions', () => {
  const { store } = createStore();

  const result = store.recordBatchChanges(
    {
      inserted: [{ UID: 1 }],
      updated: [{ UID: 2, before: { NAME: 'Before' }, after: { NAME: 'After' } }],
      deleted: [{ UID: 3 }],
    },
    [
      { UID: 1, PID: 7, CODE: 'A', TYPE: 'CODE' },
      { UID: 2, PID: 7, CODE: 'B', TYPE: 'CODE' },
      { UID: 3, PID: 7, CODE: 'C', TYPE: 'CODE' },
    ],
    { actor: 'tester', createdAt: '2026-06-27T00:00:00.000Z' },
  );

  assert.equal(result.changes.length, 3);
  const rows = store.listChangelog({ limit: 10 });
  assert.deepEqual(rows.map((row) => row.ACTION).sort(), ['batch.delete', 'batch.insert', 'batch.update']);
  assert.deepEqual(rows.map((row) => row.ACTOR).sort(), ['tester', 'tester', 'tester']);
});

test('recordBatchChanges maps inserted changelog entity key from original item when saved row only has UID', () => {
  const { store } = createStore();

  store.recordBatchChanges(
    {
      inserted: [{ UID: 101, action: 'inserted' }],
    },
    [{ PID: 7, CODE: 'INSERTED_CODE', TYPE: 'CODE', FORMORDER: '1', SHOW_YN: 'Y' }],
    { createdAt: '2026-06-27T00:00:00.000Z' },
  );

  const [row] = store.listChangelog({ limit: 10 });
  assert.equal(row.ACTION, 'batch.insert');
  assert.equal(row.ENTITY_UID, '101');
  assert.equal(row.ENTITY_KEY, '7:INSERTED_CODE:CODE');
  assert.match(row.SUMMARY, /INSERTED_CODE/);
});

test('recordBatchChanges maps mixed-batch inserted rows to the original inserted item', () => {
  const { store } = createStore();

  store.recordBatchChanges(
    {
      inserted: [{ UID: 99, action: 'inserted' }],
      updated: [{ UID: 1, action: 'updated' }],
    },
    [
      { UID: 1, CODE: 'UPDATED', TYPE: 'CODE' },
      { CODE: 'INSERTED', TYPE: 'CODE' },
    ],
    { createdAt: '2026-06-27T00:00:00.000Z' },
  );

  const inserted = store.listChangelog({ limit: 10 }).find((row) => row.ACTION === 'batch.insert');
  assert.equal(inserted.ENTITY_UID, '99');
  assert.equal(inserted.ENTITY_KEY, 'INSERTED');
});

test('getSummary and listActivity include metadata row counts and CR rows', () => {
  const { db, store } = createStore();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, DEL_YN) VALUES (1, 0, 'GROUP_A', 'GROUP', 'N')",
  ).run();
  db.prepare(
    "INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, DEL_YN) VALUES (2, 1, 'TABLE_A', 'TABLE', 'N')",
  ).run();
  db.prepare("INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, DEL_YN) VALUES (3, 2, 'ROW_A', 'DATA', 'N')").run();
  db.prepare("INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, DEL_YN) VALUES (4, 2, 'OLD', 'DATA', 'Y')").run();
  db.prepare("INSERT INTO CR_CAPABILITY (PATH, STATUS) VALUES ('xd.meta.list', 'active')").run();
  db.prepare("INSERT INTO CR_CAPABILITY (PATH, STATUS) VALUES ('xd.old', 'removed')").run();
  db.prepare(
    "INSERT INTO CR_RUN (RUN_ID, PATH, SOURCE, OK, ERROR, STARTED_AT, DURATION_MS, CREATED_AT) VALUES ('cr-1', 'xd.meta.validate', 'test', 0, 'boom', '2026-06-27T00:02:00.000Z', 7, '2026-06-27T00:02:00.000Z')",
  ).run();
  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: '3',
    action: 'save',
    summary: 'Saved row',
    createdAt: '2026-06-27T00:03:00.000Z',
  });
  store.validateCodeBatch({
    scope: 'summary',
    items: [{ UID: 3, PID: 2, CODE: 'ROW_A', TYPE: 'DATA', RID: 'RID_1', FORMORDER: '1' }],
  });

  const summary = store.getSummary({ dbPath: 'memory.db' });
  assert.equal(summary.dbPath, 'memory.db');
  assert.equal(summary.totalRows, 3);
  assert.equal(summary.templateRows, 2);
  assert.equal(summary.dataRows, 1);
  assert.equal(summary.crCapabilities, 1);
  assert.equal(summary.recentFailedCrRuns, 1);
  assert.equal(summary.lastSaveAt, '2026-06-27T00:03:00.000Z');
  assert.equal(summary.lastValidationStatus, 'ok');
  assert.ok(summary.lastValidationAt);

  const activity = store.listActivity({ limit: 10 });
  assert.equal(activity[0].kind, 'meta');
  assert.equal(
    activity.some((item) => item.kind === 'cr' && item.runId === 'cr-1'),
    true,
  );
});

test('listActivity sorts mixed SQL and ISO timestamps by actual time', () => {
  const { db, store } = createStore();
  db.prepare(
    "INSERT INTO CR_RUN (RUN_ID, PATH, SOURCE, OK, STARTED_AT, DURATION_MS, CREATED_AT) VALUES ('cr-newer', 'xd.meta.validate', 'test', 1, '2026-06-27 00:04:00', 5, '2026-06-27 00:04:00')",
  ).run();
  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: '1',
    action: 'save',
    summary: 'Older ISO save',
    createdAt: '2026-06-27T00:03:00.000Z',
  });

  const activity = store.listActivity({ limit: 10 });

  assert.equal(activity[0].kind, 'cr');
  assert.equal(activity[0].runId, 'cr-newer');
});

test('listActivity applies normalized timestamp sorting before limit slicing meta candidates', () => {
  const { store } = createStore();
  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: 'older',
    action: 'save',
    summary: 'Older ISO save',
    createdAt: '2026-06-27T00:03:00.000Z',
  });
  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: 'newer',
    action: 'save',
    summary: 'Newer SQLite save',
    createdAt: '2026-06-27 00:04:00',
  });

  const activity = store.listActivity({ limit: 1 });

  assert.equal(activity.length, 1);
  assert.equal(activity[0].entityUid, 'newer');
  assert.equal(activity[0].createdAt, '2026-06-27 00:04:00');
});

test('listActivity source ordering keeps newest SQLite-style changelog row inside limit one candidates', () => {
  const { store } = createStore();
  for (const [index, createdAt] of [
    '2026-06-27T00:03:00.000Z',
    '2026-06-27T00:02:00.000Z',
    '2026-06-27T00:01:00.000Z',
    '2026-06-27T00:00:00.000Z',
  ].entries()) {
    store.recordChange({
      entityTable: 'TB_CODE_INFO_NEW',
      entityUid: `older-${index + 1}`,
      action: 'save',
      summary: `Older ISO save ${index + 1}`,
      createdAt,
    });
  }
  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: 'newer-sqlite',
    action: 'save',
    summary: 'Newer SQLite save',
    createdAt: '2026-06-27 00:04:00',
  });

  const activity = store.listActivity({ limit: 1 });

  assert.equal(activity.length, 1);
  assert.equal(activity[0].entityUid, 'newer-sqlite');
  assert.equal(activity[0].createdAt, '2026-06-27 00:04:00');
});

test('listActivity source ordering keeps newest SQLite-style CR run inside limit one candidates', () => {
  const { db, store } = createStore();
  for (const [index, startedAt] of [
    '2026-06-27T00:03:00.000Z',
    '2026-06-27T00:02:00.000Z',
    '2026-06-27T00:01:00.000Z',
    '2026-06-27T00:00:00.000Z',
  ].entries()) {
    db.prepare(`
      INSERT INTO CR_RUN (RUN_ID, PATH, SOURCE, OK, STARTED_AT, DURATION_MS, CREATED_AT)
      VALUES (?, 'xd.meta.validate', 'test', 1, ?, 5, ?)
    `).run(`cr-older-${index + 1}`, startedAt, startedAt);
  }
  db.prepare(`
    INSERT INTO CR_RUN (RUN_ID, PATH, SOURCE, OK, STARTED_AT, DURATION_MS, CREATED_AT)
    VALUES ('cr-newer-sqlite', 'xd.meta.validate', 'test', 1, '2026-06-27 00:04:00', 5, '2026-06-27 00:04:00')
  `).run();

  const activity = store.listActivity({ limit: 1 });

  assert.equal(activity.length, 1);
  assert.equal(activity[0].kind, 'cr');
  assert.equal(activity[0].runId, 'cr-newer-sqlite');
  assert.equal(activity[0].createdAt, '2026-06-27 00:04:00');
});

test('getSummary reports lastSaveAt using normalized changelog timestamp ordering', () => {
  const { store } = createStore();
  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: 'older',
    action: 'save',
    summary: 'Older ISO save',
    createdAt: '2026-06-27T00:03:00.000Z',
  });
  store.recordChange({
    entityTable: 'TB_CODE_INFO_NEW',
    entityUid: 'newer',
    action: 'save',
    summary: 'Newer SQLite save',
    createdAt: '2026-06-27 00:04:00',
  });

  const summary = store.getSummary({});

  assert.equal(summary.lastSaveAt, '2026-06-27 00:04:00');
});

test('getSummary reports lastValidationStatus using normalized validation timestamp ordering', () => {
  const { db, store } = createStore();
  db.prepare(`
    INSERT INTO META_VALIDATION_RUN (
      RUN_ID, SCOPE, STATUS, ERROR_COUNT, WARNING_COUNT, RESULT_JSON, CREATED_AT
    ) VALUES ('val-older', 'batch', 'warning', 0, 1, '{}', '2026-06-27T00:03:00.000Z')
  `).run();
  db.prepare(`
    INSERT INTO META_VALIDATION_RUN (
      RUN_ID, SCOPE, STATUS, ERROR_COUNT, WARNING_COUNT, RESULT_JSON, CREATED_AT
    ) VALUES ('val-newer', 'batch', 'ok', 0, 0, '{}', '2026-06-27 00:04:00')
  `).run();

  const summary = store.getSummary({});

  assert.equal(summary.lastValidationStatus, 'ok');
  assert.equal(summary.lastValidationAt, '2026-06-27 00:04:00');
});

test('runReadOnlyQuery allows one read-only SELECT and rejects writes and multi-statement SQL', () => {
  const { db, store } = createStore();
  db.prepare("INSERT INTO TB_CODE_INFO_NEW (UID, PID, CODE, TYPE, DEL_YN) VALUES (1, 0, 'A', 'GROUP', 'N')").run();

  const select = store.runReadOnlyQuery('SELECT CODE, TYPE FROM TB_CODE_INFO_NEW WHERE UID=?', [1]);
  assert.equal(select.type, 'SELECT');
  assert.equal(select.rowCount, 1);
  assert.deepEqual(select.rows, [{ CODE: 'A', TYPE: 'GROUP' }]);

  const pragma = store.runReadOnlyQuery('PRAGMA table_info(TB_CODE_INFO_NEW)');
  assert.ok(pragma.rowCount > 0);

  assert.throws(() => store.runReadOnlyQuery("UPDATE TB_CODE_INFO_NEW SET CODE='B' WHERE UID=1"), /read-only/i);
  assert.throws(() => store.runReadOnlyQuery('SELECT 1; SELECT 2'), /Only one read-only SQL statement is allowed/);
  assert.throws(() => store.runReadOnlyQuery('SELECT 1;;'), /Only one read-only SQL statement is allowed/);
  assert.throws(() => store.runReadOnlyQuery('SELECT 1; ;'), /Only one read-only SQL statement is allowed/);
});
