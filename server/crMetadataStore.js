const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function createCrMetadataStore(db, options = {}) {
  const payloadDir = options.payloadDir || path.join(__dirname, 'cr-payloads');
  ensureCrMetadataSchema(db);

  return {
    syncRegistry(payload) {
      return syncRegistry(db, payload, { payloadDir });
    },
    recordRun(record) {
      return recordRun(db, record, { payloadDir });
    },
    recordRunEvents(runId, events = []) {
      return recordRunEvents(db, runId, Array.isArray(events) ? events : []);
    },
    listCapabilities(query = {}) {
      return listCapabilities(db, query);
    },
    getCapability(capabilityPath) {
      return db.prepare('SELECT * FROM CR_CAPABILITY WHERE PATH=?').get(capabilityPath);
    },
    listSnapshots(query = {}) {
      return listSnapshots(db, query);
    },
    listRuns(query = {}) {
      return listRuns(db, query);
    },
    getRun(runId) {
      const run = db.prepare('SELECT * FROM CR_RUN WHERE RUN_ID=?').get(runId);
      if (!run) return undefined;
      return { ...run, EVENTS: listRunEvents(db, runId) };
    },
    listRunEvents(runId) {
      return listRunEvents(db, runId);
    },
    storePayload(kind, value) {
      return storePayload(db, kind, value, { payloadDir });
    },
  };
}

function ensureCrMetadataSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS CR_REGISTRY_SNAPSHOT (
      SNAPSHOT_ID TEXT PRIMARY KEY,
      CAPTURED_AT TEXT NOT NULL,
      SOURCE TEXT NOT NULL,
      REGISTRY_HASH TEXT NOT NULL,
      NODE_COUNT INTEGER NOT NULL DEFAULT 0,
      CALLABLE_COUNT INTEGER NOT NULL DEFAULT 0,
      EVENT_COUNT INTEGER NOT NULL DEFAULT 0,
      SCHEMA_COUNT INTEGER NOT NULL DEFAULT 0,
      RAW_PAYLOAD_HASH TEXT,
      CREATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS CR_CAPABILITY_SCHEMA (
      SCHEMA_HASH TEXT PRIMARY KEY,
      SCHEMA_JSON TEXT NOT NULL,
      CREATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS CR_CAPABILITY (
      PATH TEXT PRIMARY KEY,
      PARENT_PATH TEXT NOT NULL DEFAULT '',
      SEGMENT TEXT NOT NULL DEFAULT '',
      KIND TEXT NOT NULL,
      LABEL TEXT NOT NULL,
      DESCRIPTION TEXT NOT NULL DEFAULT '',
      PERMISSION TEXT NOT NULL DEFAULT 'read',
      APPROVAL TEXT NOT NULL DEFAULT 'never',
      READABLE INTEGER NOT NULL DEFAULT 0,
      WRITABLE INTEGER NOT NULL DEFAULT 0,
      CALLABLE INTEGER NOT NULL DEFAULT 0,
      SUBSCRIBABLE INTEGER NOT NULL DEFAULT 0,
      HAS_SCHEMA INTEGER NOT NULL DEFAULT 0,
      SCHEMA_HASH TEXT,
      STATUS TEXT NOT NULL DEFAULT 'active',
      FIRST_SEEN_AT TEXT NOT NULL,
      LAST_SEEN_AT TEXT NOT NULL,
      LAST_SNAPSHOT_ID TEXT,
      UPDATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS CR_PAYLOAD (
      PAYLOAD_HASH TEXT PRIMARY KEY,
      KIND TEXT NOT NULL,
      SIZE_BYTES INTEGER NOT NULL DEFAULT 0,
      JSON_TEXT TEXT,
      FILE_PATH TEXT,
      CREATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS CR_RUN (
      RUN_ID TEXT PRIMARY KEY,
      PATH TEXT NOT NULL,
      SOURCE TEXT NOT NULL DEFAULT 'internal',
      SOURCE_AGENT TEXT,
      CHANNEL TEXT,
      USER_ID TEXT,
      PERMISSION TEXT NOT NULL DEFAULT 'read',
      APPROVAL TEXT NOT NULL DEFAULT 'never',
      APPROVED INTEGER NOT NULL DEFAULT 0,
      APPROVAL_REQUIRED INTEGER NOT NULL DEFAULT 0,
      OK INTEGER NOT NULL DEFAULT 0,
      ERROR TEXT,
      STARTED_AT TEXT NOT NULL,
      COMPLETED_AT TEXT,
      DURATION_MS INTEGER NOT NULL DEFAULT 0,
      ARGS_HASH TEXT,
      RESULT_HASH TEXT,
      CREATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS CR_RUN_EVENT (
      RUN_ID TEXT NOT NULL,
      SEQ INTEGER NOT NULL,
      STEP_PATH TEXT NOT NULL DEFAULT '',
      STEP_LABEL TEXT,
      OK INTEGER NOT NULL DEFAULT 0,
      SKIPPED INTEGER NOT NULL DEFAULT 0,
      ERROR TEXT,
      DURATION_MS INTEGER NOT NULL DEFAULT 0,
      RESULT_HASH TEXT,
      CREATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (RUN_ID, SEQ)
    );

    CREATE INDEX IF NOT EXISTS idx_cr_capability_parent ON CR_CAPABILITY(PARENT_PATH);
    CREATE INDEX IF NOT EXISTS idx_cr_capability_status ON CR_CAPABILITY(STATUS);
    CREATE INDEX IF NOT EXISTS idx_cr_capability_callable ON CR_CAPABILITY(CALLABLE);
    CREATE INDEX IF NOT EXISTS idx_cr_run_path ON CR_RUN(PATH);
    CREATE INDEX IF NOT EXISTS idx_cr_run_started ON CR_RUN(STARTED_AT);
    CREATE INDEX IF NOT EXISTS idx_cr_run_source ON CR_RUN(SOURCE);
  `);
}

function syncRegistry(db, payload, options = {}) {
  validateRegistryPayload(payload);
  const now = new Date().toISOString();
  const capabilities = Array.isArray(payload.capabilities) ? payload.capabilities : [];
  const schemas = Array.isArray(payload.schemas) ? payload.schemas : [];
  const activePaths = capabilities.map((capability) => capability.path).filter(Boolean);

  const run = db.transaction(() => {
    if (payload.rawPayloadJson) {
      storePayload(db, 'registry', JSON.parse(payload.rawPayloadJson), {
        payloadDir: options.payloadDir,
        hash: payload.rawPayloadHash,
        createdAt: payload.capturedAt,
      });
    }

    db.prepare(`
      INSERT OR REPLACE INTO CR_REGISTRY_SNAPSHOT (
        SNAPSHOT_ID, CAPTURED_AT, SOURCE, REGISTRY_HASH, NODE_COUNT, CALLABLE_COUNT,
        EVENT_COUNT, SCHEMA_COUNT, RAW_PAYLOAD_HASH
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.snapshotId,
      payload.capturedAt,
      payload.source,
      payload.registryHash,
      numberOrZero(payload.nodeCount),
      numberOrZero(payload.callableCount),
      numberOrZero(payload.eventCount),
      numberOrZero(payload.schemaCount),
      payload.rawPayloadHash || null,
    );

    const insertSchema = db.prepare(`
      INSERT OR IGNORE INTO CR_CAPABILITY_SCHEMA (SCHEMA_HASH, SCHEMA_JSON)
      VALUES (?, ?)
    `);
    for (const schema of schemas) {
      if (!schema?.schemaHash) continue;
      insertSchema.run(schema.schemaHash, schema.schemaJson || '{}');
    }

    if (activePaths.length > 0) {
      const placeholders = activePaths.map(() => '?').join(',');
      db.prepare(
        `UPDATE CR_CAPABILITY SET STATUS='removed', UPDATED_AT=? WHERE STATUS='active' AND PATH NOT IN (${placeholders})`,
      ).run(now, ...activePaths);
      db.prepare(
        `UPDATE TB_CODE_INFO_NEW SET DEL_YN='Y', UPDATE_DT=CURRENT_TIMESTAMP WHERE PCODE='CRCAP' AND CODE NOT IN (${placeholders})`,
      ).run(...activePaths);
    } else {
      db.prepare("UPDATE CR_CAPABILITY SET STATUS='removed', UPDATED_AT=? WHERE STATUS='active'").run(now);
      db.prepare("UPDATE TB_CODE_INFO_NEW SET DEL_YN='Y', UPDATE_DT=CURRENT_TIMESTAMP WHERE PCODE='CRCAP'").run();
    }

    const upsertCapability = db.prepare(`
      INSERT INTO CR_CAPABILITY (
        PATH, PARENT_PATH, SEGMENT, KIND, LABEL, DESCRIPTION, PERMISSION, APPROVAL,
        READABLE, WRITABLE, CALLABLE, SUBSCRIBABLE, HAS_SCHEMA, SCHEMA_HASH, STATUS,
        FIRST_SEEN_AT, LAST_SEEN_AT, LAST_SNAPSHOT_ID, UPDATED_AT
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      ON CONFLICT(PATH) DO UPDATE SET
        PARENT_PATH=excluded.PARENT_PATH,
        SEGMENT=excluded.SEGMENT,
        KIND=excluded.KIND,
        LABEL=excluded.LABEL,
        DESCRIPTION=excluded.DESCRIPTION,
        PERMISSION=excluded.PERMISSION,
        APPROVAL=excluded.APPROVAL,
        READABLE=excluded.READABLE,
        WRITABLE=excluded.WRITABLE,
        CALLABLE=excluded.CALLABLE,
        SUBSCRIBABLE=excluded.SUBSCRIBABLE,
        HAS_SCHEMA=excluded.HAS_SCHEMA,
        SCHEMA_HASH=excluded.SCHEMA_HASH,
        STATUS='active',
        LAST_SEEN_AT=excluded.LAST_SEEN_AT,
        LAST_SNAPSHOT_ID=excluded.LAST_SNAPSHOT_ID,
        UPDATED_AT=excluded.UPDATED_AT
    `);

    for (const capability of capabilities) {
      upsertCapability.run(
        capability.path,
        capability.parentPath || '',
        capability.segment || lastSegment(capability.path),
        capability.kind || 'method',
        capability.label || capability.path,
        capability.description || '',
        capability.permission || 'read',
        capability.approval || 'never',
        boolToInt(capability.readable),
        boolToInt(capability.writable),
        boolToInt(capability.callable),
        boolToInt(capability.subscribable),
        boolToInt(capability.hasSchema),
        capability.schemaHash || null,
        payload.capturedAt,
        payload.capturedAt,
        payload.snapshotId,
        now,
      );
      writeXmdbCapabilityMirror(db, capability, payload.snapshotId);
    }
  });

  run();

  return {
    ok: true,
    snapshotId: payload.snapshotId,
    capabilities: capabilities.length,
    schemas: schemas.length,
  };
}

function recordRun(db, record, options = {}) {
  if (!record || typeof record !== 'object') throw new Error('CR run record is required.');
  const runId = record.runId || `crrun_${hashValue({ path: record.path, startedAt: record.startedAt }).slice(0, 24)}`;
  const startedAt = record.startedAt || new Date().toISOString();
  const durationMs = numberOrZero(record.durationMs);
  const completedAt = record.completedAt || new Date(new Date(startedAt).getTime() + durationMs).toISOString();

  const run = db.transaction(() => {
    const argsPayload = record.args === undefined ? null : storePayload(db, 'args', record.args, options);
    const resultPayload = record.result === undefined ? null : storePayload(db, 'result', record.result, options);

    db.prepare(`
      INSERT INTO CR_RUN (
        RUN_ID, PATH, SOURCE, SOURCE_AGENT, CHANNEL, USER_ID, PERMISSION, APPROVAL,
        APPROVED, APPROVAL_REQUIRED, OK, ERROR, STARTED_AT, COMPLETED_AT, DURATION_MS,
        ARGS_HASH, RESULT_HASH
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(RUN_ID) DO UPDATE SET
        PATH=excluded.PATH,
        SOURCE=excluded.SOURCE,
        SOURCE_AGENT=excluded.SOURCE_AGENT,
        CHANNEL=excluded.CHANNEL,
        USER_ID=excluded.USER_ID,
        PERMISSION=excluded.PERMISSION,
        APPROVAL=excluded.APPROVAL,
        APPROVED=excluded.APPROVED,
        APPROVAL_REQUIRED=excluded.APPROVAL_REQUIRED,
        OK=excluded.OK,
        ERROR=excluded.ERROR,
        STARTED_AT=excluded.STARTED_AT,
        COMPLETED_AT=excluded.COMPLETED_AT,
        DURATION_MS=excluded.DURATION_MS,
        ARGS_HASH=excluded.ARGS_HASH,
        RESULT_HASH=excluded.RESULT_HASH
    `).run(
      runId,
      record.path || '',
      record.source || 'internal',
      record.sourceAgent || null,
      record.channel || null,
      record.userId || null,
      record.permission || 'read',
      record.approval || 'never',
      boolToInt(record.approved),
      boolToInt(record.approvalRequired),
      boolToInt(record.ok),
      record.error || null,
      startedAt,
      completedAt,
      durationMs,
      argsPayload?.payloadHash || null,
      resultPayload?.payloadHash || null,
    );

    recordRunEvents(db, runId, Array.isArray(record.events) ? record.events : []);
    writeXmdbRunMirror(db, { ...record, runId, startedAt, durationMs });
  });

  run();
  return { ok: true, runId };
}

function recordRunEvents(db, runId, events) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO CR_RUN_EVENT (
      RUN_ID, SEQ, STEP_PATH, STEP_LABEL, OK, SKIPPED, ERROR, DURATION_MS, RESULT_HASH
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const run = db.transaction(() => {
    for (const [index, event] of events.entries()) {
      insert.run(
        runId,
        Number.isFinite(Number(event.seq)) ? Number(event.seq) : index,
        event.stepPath || '',
        event.stepLabel || null,
        boolToInt(event.ok),
        boolToInt(event.skipped),
        event.error || null,
        numberOrZero(event.durationMs),
        event.resultHash || null,
      );
    }
  });
  run();
  return { ok: true, runId, events: events.length };
}

function listCapabilities(db, query = {}) {
  const where = [];
  const params = [];
  const status = query.status || 'active';
  if (status !== 'all') {
    where.push('STATUS=?');
    params.push(status);
  }
  if (query.callable !== undefined) {
    where.push('CALLABLE=?');
    params.push(boolToInt(query.callable));
  }
  if (query.path) {
    where.push('PATH LIKE ?');
    params.push(`${String(query.path)}%`);
  }
  const sql = `SELECT * FROM CR_CAPABILITY${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY PATH LIMIT ?`;
  params.push(readLimit(query.limit, 500, 5000));
  return db.prepare(sql).all(...params);
}

function listSnapshots(db, query = {}) {
  return db
    .prepare('SELECT * FROM CR_REGISTRY_SNAPSHOT ORDER BY CAPTURED_AT DESC LIMIT ?')
    .all(readLimit(query.limit, 50, 500));
}

function listRuns(db, query = {}) {
  const where = [];
  const params = [];
  if (query.path) {
    where.push('PATH LIKE ?');
    params.push(`${String(query.path)}%`);
  }
  if (query.source) {
    where.push('SOURCE=?');
    params.push(String(query.source));
  }
  if (query.ok !== undefined) {
    where.push('OK=?');
    params.push(boolToInt(query.ok));
  }
  const sql = `SELECT * FROM CR_RUN${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY STARTED_AT DESC LIMIT ?`;
  params.push(readLimit(query.limit, 200, 5000));
  return db.prepare(sql).all(...params);
}

function listRunEvents(db, runId) {
  return db.prepare('SELECT * FROM CR_RUN_EVENT WHERE RUN_ID=? ORDER BY SEQ').all(runId);
}

function storePayload(db, kind, value, options = {}) {
  const jsonText = typeof value === 'string' ? value : stableJson(value);
  const payloadHash = options.hash || hashText(jsonText);
  const createdAt = options.createdAt || new Date().toISOString();
  let filePath = null;

  if (options.payloadDir) {
    fs.mkdirSync(options.payloadDir, { recursive: true });
    filePath = path.join(options.payloadDir, `${payloadHash}.json`);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, jsonText, 'utf8');
  }

  db.prepare(`
    INSERT OR IGNORE INTO CR_PAYLOAD (PAYLOAD_HASH, KIND, SIZE_BYTES, JSON_TEXT, FILE_PATH, CREATED_AT)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(payloadHash, kind, Buffer.byteLength(jsonText, 'utf8'), jsonText, filePath, createdAt);

  return { payloadHash, filePath, sizeBytes: Buffer.byteLength(jsonText, 'utf8') };
}

function writeXmdbCapabilityMirror(db, capability, snapshotId) {
  const value = JSON.stringify({
    path: capability.path,
    kind: capability.kind || 'method',
    permission: capability.permission || 'read',
    approval: capability.approval || 'never',
    callable: capability.callable === true,
    snapshotId,
    schemaHash: capability.schemaHash || null,
  });
  upsertXmdbMirror(db, {
    pcode: 'CRCAP',
    code: capability.path,
    name: capability.label || capability.path,
    description: capability.description || '',
    value,
    type: 'CR',
    rid: makeShortRid('CRCAP', capability.path),
    target: capability.parentPath || '',
    reserve: capability.kind || '',
    reserv1: capability.permission || '',
    reserv2: capability.approval || '',
    reserv3: snapshotId,
  });
}

function writeXmdbRunMirror(db, record) {
  upsertXmdbMirror(db, {
    pcode: 'CRRUN',
    code: record.runId,
    name: `${record.ok ? 'OK' : 'ERR'} ${record.path || ''}`.slice(0, 100),
    description: record.error || '',
    value: JSON.stringify({
      runId: record.runId,
      path: record.path || '',
      source: record.source || 'internal',
      ok: record.ok === true,
      startedAt: record.startedAt,
      durationMs: numberOrZero(record.durationMs),
    }),
    type: 'CR',
    rid: makeShortRid('CRRUN', record.runId),
    target: record.path || '',
    reserve: record.source || '',
    reserv1: record.channel || '',
    reserv2: record.sourceAgent || '',
    reserv3: record.startedAt || '',
  });
}

function upsertXmdbMirror(db, row) {
  const existing = db
    .prepare('SELECT UID FROM TB_CODE_INFO_NEW WHERE PCODE=? AND CODE=? ORDER BY UID LIMIT 1')
    .get(row.pcode, row.code);
  const params = [
    row.pcode,
    row.code,
    truncate(row.name, 100),
    row.value,
    row.type,
    truncate(row.description, 255),
    row.rid,
    truncate(row.target, 50),
    truncate(row.reserve, 255),
    truncate(row.reserv1, 255),
    truncate(row.reserv2, 255),
    truncate(row.reserv3, 255),
  ];

  if (existing) {
    db.prepare(`
      UPDATE TB_CODE_INFO_NEW SET
        PCODE=?, CODE=?, NAME=?, VALUE=?, TYPE=?, DESCRIPTION=?, RID=?, TARGET=?,
        RESERVE=?, RESERV1=?, RESERV2=?, RESERV3=?, SHOW_YN='Y', USE_YN='Y',
        DEL_YN='N', UPDATE_DT=CURRENT_TIMESTAMP
      WHERE UID=?
    `).run(...params, existing.UID);
    return;
  }

  db.prepare(`
    INSERT INTO TB_CODE_INFO_NEW (
      PID, PCODE, CODE, NAME, VALUE, TYPE, DESCRIPTION, SHOW_YN, RID, TARGET,
      RESERVE, RESERV1, RESERV2, RESERV3, USE_YN, DEL_YN
    ) VALUES (0, ?, ?, ?, ?, ?, ?, 'Y', ?, ?, ?, ?, ?, ?, 'Y', 'N')
  `).run(...params);
}

function validateRegistryPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('CR registry payload is required.');
  for (const key of ['snapshotId', 'capturedAt', 'source', 'registryHash']) {
    if (!payload[key]) throw new Error(`CR registry payload is missing ${key}.`);
  }
}

function stableJson(value) {
  return JSON.stringify(sortJsonValue(value)) || 'null';
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortJsonValue(nested)]),
  );
}

function hashValue(value) {
  return hashText(stableJson(value));
}

function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function makeShortRid(prefix, value) {
  const safePrefix = String(prefix || 'CR')
    .replace(/[^A-Z0-9_]/gi, '')
    .toUpperCase()
    .slice(0, 10);
  return `${safePrefix || 'CR'}_${hashText(String(value)).slice(0, 20)}`;
}

function readLimit(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function boolToInt(value) {
  return value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function lastSegment(value) {
  const parts = String(value || '')
    .split('.')
    .filter(Boolean);
  return parts[parts.length - 1] || String(value || '');
}

function truncate(value, max) {
  const text = value == null ? '' : String(value);
  return text.length > max ? text.slice(0, max) : text;
}

module.exports = {
  createCrMetadataStore,
  ensureCrMetadataSchema,
};
