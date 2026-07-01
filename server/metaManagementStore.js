const crypto = require('node:crypto');

const SUPPORTED_TYPES = new Set(['GROUP', 'TABLE', 'ATTR', 'CODE', 'DATA']);
const WRITE_KEYWORDS = /\b(insert|update|delete|drop|alter|create|replace|truncate|vacuum|attach|detach|reindex)\b/i;
const MULTI_STATEMENT_ERROR = 'Only one read-only SQL statement is allowed.';

const META_CHANGELOG_COLUMNS = [
  ['CHANGE_ID', 'CHANGE_ID TEXT'],
  ['ENTITY_TABLE', "ENTITY_TABLE TEXT NOT NULL DEFAULT 'TB_CODE_INFO_NEW'"],
  ['ENTITY_UID', 'ENTITY_UID TEXT'],
  ['ENTITY_KEY', 'ENTITY_KEY TEXT'],
  ['ACTION', "ACTION TEXT NOT NULL DEFAULT 'change'"],
  ['SOURCE', "SOURCE TEXT NOT NULL DEFAULT 'meta-management'"],
  ['ACTOR', 'ACTOR TEXT'],
  ['SUMMARY', "SUMMARY TEXT NOT NULL DEFAULT ''"],
  ['BEFORE_JSON', 'BEFORE_JSON TEXT'],
  ['AFTER_JSON', 'AFTER_JSON TEXT'],
  ['DIFF_JSON', 'DIFF_JSON TEXT'],
  ['OK', 'OK INTEGER NOT NULL DEFAULT 1'],
  ['ERROR', 'ERROR TEXT'],
  ['CREATED_AT', "CREATED_AT TEXT NOT NULL DEFAULT ''"],
];

const META_VALIDATION_RUN_COLUMNS = [
  ['RUN_ID', 'RUN_ID TEXT'],
  ['SCOPE', "SCOPE TEXT NOT NULL DEFAULT 'batch'"],
  ['TARGET_UID', 'TARGET_UID TEXT'],
  ['TARGET_CODE', 'TARGET_CODE TEXT'],
  ['STATUS', "STATUS TEXT NOT NULL DEFAULT 'ok'"],
  ['ERROR_COUNT', 'ERROR_COUNT INTEGER NOT NULL DEFAULT 0'],
  ['WARNING_COUNT', 'WARNING_COUNT INTEGER NOT NULL DEFAULT 0'],
  ['RESULT_JSON', "RESULT_JSON TEXT NOT NULL DEFAULT '{}'"],
  ['CREATED_AT', "CREATED_AT TEXT NOT NULL DEFAULT ''"],
];

function createMetaManagementStore(db) {
  ensureMetaManagementSchema(db);

  return {
    validateCodeBatch(payload) {
      const result = validateCodeBatch(db, payload);
      recordValidationRun(db, result, payload);
      return result;
    },
    recordValidationRun(result, payload) {
      return recordValidationRun(db, result, payload);
    },
    recordChange(change) {
      return recordChange(db, change);
    },
    recordBatchChanges(results, items, options) {
      return recordBatchChanges(db, results, items, options);
    },
    listChangelog(query) {
      return listChangelog(db, query);
    },
    listActivity(query) {
      return listActivity(db, query);
    },
    getSummary(options) {
      return getSummary(db, options);
    },
    runReadOnlyQuery(sql, params) {
      return runReadOnlyQuery(db, sql, params);
    },
  };
}

function ensureMetaManagementSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS META_CHANGELOG (
      CHANGE_ID TEXT PRIMARY KEY,
      ENTITY_TABLE TEXT NOT NULL,
      ENTITY_UID TEXT,
      ENTITY_KEY TEXT,
      ACTION TEXT NOT NULL,
      SOURCE TEXT NOT NULL DEFAULT 'meta-management',
      ACTOR TEXT,
      SUMMARY TEXT NOT NULL DEFAULT '',
      BEFORE_JSON TEXT,
      AFTER_JSON TEXT,
      DIFF_JSON TEXT,
      OK INTEGER NOT NULL DEFAULT 1,
      ERROR TEXT,
      CREATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS META_VALIDATION_RUN (
      RUN_ID TEXT PRIMARY KEY,
      SCOPE TEXT NOT NULL,
      TARGET_UID TEXT,
      TARGET_CODE TEXT,
      STATUS TEXT NOT NULL,
      ERROR_COUNT INTEGER NOT NULL DEFAULT 0,
      WARNING_COUNT INTEGER NOT NULL DEFAULT 0,
      RESULT_JSON TEXT NOT NULL DEFAULT '{}',
      CREATED_AT TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureColumns(db, 'META_CHANGELOG', META_CHANGELOG_COLUMNS);
  ensureColumns(db, 'META_VALIDATION_RUN', META_VALIDATION_RUN_COLUMNS);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_meta_changelog_created ON META_CHANGELOG(CREATED_AT);
    CREATE INDEX IF NOT EXISTS idx_meta_changelog_entity ON META_CHANGELOG(ENTITY_TABLE, ENTITY_UID);
    CREATE INDEX IF NOT EXISTS idx_meta_changelog_action ON META_CHANGELOG(ACTION);
    CREATE INDEX IF NOT EXISTS idx_meta_changelog_source ON META_CHANGELOG(SOURCE);
    CREATE INDEX IF NOT EXISTS idx_meta_validation_created ON META_VALIDATION_RUN(CREATED_AT);
    CREATE INDEX IF NOT EXISTS idx_meta_validation_target ON META_VALIDATION_RUN(TARGET_UID, TARGET_CODE);
    CREATE INDEX IF NOT EXISTS idx_meta_validation_status ON META_VALIDATION_RUN(STATUS);
  `);
}

function ensureColumns(db, tableName, definitions) {
  const existing = new Set(
    db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((column) => column.name),
  );
  for (const [name, definition] of definitions) {
    if (!existing.has(name)) {
      db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`).run();
    }
  }
}

function validateCodeBatch(db, payload = {}) {
  const items = readItems(payload);
  const scope = String(payload?.scope || 'batch');
  const target = {
    uid: normalizeOptionalText(payload?.targetUid ?? payload?.target?.uid),
    code: normalizeOptionalText(payload?.targetCode ?? payload?.target?.code),
  };
  const runId = makeId('metaval');
  const errors = [];
  const warnings = [];
  const seen = new Map();
  const deletedUids = new Set(
    items
      .filter((item) => isDeleted(item))
      .map((item) => normalizeOptionalText(item.UID ?? item.uid))
      .filter(Boolean),
  );

  for (const [index, item] of items.entries()) {
    if (isDeleted(item)) continue;

    const type = normalizeOptionalText(item.TYPE ?? item.type)?.toUpperCase() || '';
    const code = normalizeOptionalText(item.CODE ?? item.code);
    const uid = normalizeOptionalText(item.UID ?? item.uid);
    const pidValue = item.PID ?? item.pid;
    const pid = normalizePid(pidValue);
    const duplicatePid = pid.missing ? 0 : pid.value;
    const context = { index, uid, pid: duplicatePid, code, type };

    if (!code) addIssue(errors, 'missing-code', 'CODE is required.', context);
    if (!SUPPORTED_TYPES.has(type))
      addIssue(errors, 'unknown-type', `Unsupported TYPE: ${type || '(blank)'}.`, context);
    if (pid.invalid || (type && type !== 'GROUP' && pid.missing)) {
      addIssue(errors, 'invalid-pid', 'A numeric PID is required.', context);
    }
    if (type === 'DATA' && !normalizeOptionalText(item.RID ?? item.rid)) {
      addIssue(errors, 'missing-rid', 'DATA rows require RID.', context);
    }

    if (code && SUPPORTED_TYPES.has(type) && !pid.invalid) {
      const key = `${duplicatePid}\u0000${code}\u0000${type}`;
      if (seen.has(key)) {
        addIssue(errors, 'duplicate-in-batch', 'Duplicate PID, CODE, TYPE in incoming batch.', {
          ...context,
          firstIndex: seen.get(key),
        });
      } else {
        seen.set(key, index);
      }

      const duplicate = db
        .prepare(`
          SELECT UID FROM TB_CODE_INFO_NEW
          WHERE DEL_YN='N' AND PID=? AND CODE=? AND TYPE=? AND CAST(UID AS TEXT) != ?
          ORDER BY UID
        `)
        .all(duplicatePid, code, type, String(uid || ''))
        .find((row) => !deletedUids.has(String(row.UID)));
      if (duplicate) {
        addIssue(errors, 'duplicate-code', 'Active row with same PID, CODE, TYPE already exists.', {
          ...context,
          existingUid: String(duplicate.UID),
        });
      }
    }

    if (!normalizeOptionalText(item.FORMORDER ?? item.formOrder ?? item.formorder)) {
      addIssue(warnings, 'missing-formorder', 'FORMORDER is recommended.', context);
    }
    if ((type === 'CODE' || type === 'ATTR') && !normalizeOptionalText(item.SHOW_YN ?? item.showYn ?? item.show_yn)) {
      addIssue(warnings, 'missing-show-yn', 'SHOW_YN is recommended for CODE and ATTR rows.', context);
    }
  }

  const errorCount = errors.length;
  const warningCount = warnings.length;
  return {
    runId,
    scope,
    target,
    status: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'ok',
    errorCount,
    warningCount,
    errors,
    warnings,
  };
}

function recordValidationRun(db, result, payload = {}) {
  if (!result || typeof result !== 'object') throw new Error('Validation result is required.');
  const runId = result.runId || makeId('metaval');
  const scope = String(result.scope || payload?.scope || 'batch');
  const targetUid = normalizeOptionalText(result.target?.uid ?? payload?.targetUid ?? payload?.target?.uid);
  const targetCode = normalizeOptionalText(result.target?.code ?? payload?.targetCode ?? payload?.target?.code);
  const status = result.status || 'ok';
  db.prepare(`
    INSERT INTO META_VALIDATION_RUN (
      RUN_ID, SCOPE, TARGET_UID, TARGET_CODE, STATUS, ERROR_COUNT, WARNING_COUNT, RESULT_JSON, CREATED_AT
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    runId,
    scope,
    targetUid,
    targetCode,
    status,
    numberOrZero(result.errorCount),
    numberOrZero(result.warningCount),
    stableJson({ ...result, runId, scope }),
    payload?.createdAt || new Date().toISOString(),
  );
  return { runId };
}

function recordChange(db, change = {}) {
  if (!change || typeof change !== 'object') throw new Error('Change record is required.');
  const changeId = change.changeId || makeId('metachg');
  db.prepare(`
    INSERT INTO META_CHANGELOG (
      CHANGE_ID, ENTITY_TABLE, ENTITY_UID, ENTITY_KEY, ACTION, SOURCE, ACTOR, SUMMARY,
      BEFORE_JSON, AFTER_JSON, DIFF_JSON, OK, ERROR, CREATED_AT
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    changeId,
    change.entityTable || change.ENTITY_TABLE || 'TB_CODE_INFO_NEW',
    normalizeOptionalText(change.entityUid ?? change.ENTITY_UID),
    normalizeOptionalText(change.entityKey ?? change.ENTITY_KEY),
    change.action || change.ACTION || 'change',
    change.source || change.SOURCE || 'meta-management',
    normalizeOptionalText(change.actor ?? change.ACTOR),
    normalizeOptionalText(change.summary ?? change.SUMMARY) || '',
    jsonOrNull(change.beforeJson ?? change.before ?? change.BEFORE_JSON),
    jsonOrNull(change.afterJson ?? change.after ?? change.AFTER_JSON),
    jsonOrNull(change.diffJson ?? change.diff ?? change.DIFF_JSON),
    boolToInt(change.ok ?? change.OK ?? true),
    normalizeOptionalText(change.error ?? change.ERROR),
    change.createdAt || change.CREATED_AT || new Date().toISOString(),
  );
  return { changeId };
}

function recordBatchChanges(db, results = {}, items = [], options = {}) {
  const changes = [];
  const groups = [
    ['inserted', 'batch.insert'],
    ['updated', 'batch.update'],
    ['deleted', 'batch.delete'],
  ];
  const itemList = Array.isArray(items) ? items : [];
  const itemByUid = new Map(itemList.map((item) => [String(item.UID ?? item.uid ?? ''), item]));
  const insertedItems = itemList.filter((item) => !normalizeOptionalText(item.UID ?? item.uid) && !isDeleted(item));

  for (const [key, action] of groups) {
    const records = Array.isArray(results[key]) ? results[key] : [];
    for (const [index, record] of records.entries()) {
      const uid = normalizeOptionalText(record.UID ?? record.uid ?? record.entityUid);
      const sourceIndex = Number(record._sourceIndex);
      const sourceItem = Number.isInteger(sourceIndex) && sourceIndex >= 0 ? itemList[sourceIndex] : null;
      const item =
        sourceItem || (uid ? itemByUid.get(uid) : null) || (key === 'inserted' ? insertedItems[index] : null) || record;
      changes.push(
        recordChange(db, {
          entityTable: options.entityTable || 'TB_CODE_INFO_NEW',
          entityUid: uid,
          entityKey: makeEntityKey(item),
          action,
          source: options.source || 'meta-management',
          actor: options.actor,
          summary: options.summary || `${action} ${makeEntityKey(item)}`.trim(),
          before: record.before,
          after: record.after || item,
          diff: record.diff,
          ok: record.ok !== false,
          error: record.error,
          createdAt: options.createdAt,
        }),
      );
    }
  }

  return { changes };
}

function listChangelog(db, query = {}) {
  return db
    .prepare(`
      SELECT * FROM META_CHANGELOG
      ORDER BY datetime(replace(replace(CREATED_AT, 'T', ' '), 'Z', '')) DESC, CREATED_AT DESC, CHANGE_ID DESC
      LIMIT ?
    `)
    .all(readLimit(query?.limit, 50, 200));
}

function listActivity(db, query = {}) {
  const limit = readLimit(query?.limit, 50, 200);
  const candidateLimit = Math.min(limit * 4, 400);
  const activities = listChangelog(db, { limit: candidateLimit }).map((row) => ({
    kind: 'meta',
    id: row.CHANGE_ID,
    action: row.ACTION,
    source: row.SOURCE,
    summary: row.SUMMARY,
    ok: row.OK === 1,
    error: row.ERROR,
    entityTable: row.ENTITY_TABLE,
    entityUid: row.ENTITY_UID,
    createdAt: row.CREATED_AT,
  }));

  if (tableExists(db, 'CR_RUN')) {
    const crRows = db
      .prepare(`
        SELECT * FROM CR_RUN
        ORDER BY datetime(replace(replace(STARTED_AT, 'T', ' '), 'Z', '')) DESC, STARTED_AT DESC, CREATED_AT DESC
        LIMIT ?
      `)
      .all(candidateLimit);
    for (const row of crRows) {
      activities.push({
        kind: 'cr',
        id: row.RUN_ID,
        runId: row.RUN_ID,
        path: row.PATH,
        source: row.SOURCE,
        ok: row.OK === 1,
        error: row.ERROR,
        durationMs: row.DURATION_MS,
        createdAt: row.STARTED_AT || row.CREATED_AT,
      });
    }
  }

  return activities.sort((left, right) => compareActivityTimestamp(right.createdAt, left.createdAt)).slice(0, limit);
}

function getSummary(db, options = {}) {
  const lastValidation = db
    .prepare(`
      SELECT STATUS, CREATED_AT FROM META_VALIDATION_RUN
      ORDER BY datetime(replace(replace(CREATED_AT, 'T', ' '), 'Z', '')) DESC, CREATED_AT DESC, RUN_ID DESC
      LIMIT 1
    `)
    .get();
  const lastSave = db
    .prepare(`
      SELECT CREATED_AT FROM META_CHANGELOG
      ORDER BY datetime(replace(replace(CREATED_AT, 'T', ' '), 'Z', '')) DESC, CREATED_AT DESC, CHANGE_ID DESC
      LIMIT 1
    `)
    .get();

  return {
    dbPath: options?.dbPath || '',
    totalRows: countRows(db, "SELECT COUNT(*) AS count FROM TB_CODE_INFO_NEW WHERE DEL_YN='N'"),
    templateRows: countRows(
      db,
      "SELECT COUNT(*) AS count FROM TB_CODE_INFO_NEW WHERE DEL_YN='N' AND TYPE IN ('GROUP', 'TABLE')",
    ),
    dataRows: countRows(db, "SELECT COUNT(*) AS count FROM TB_CODE_INFO_NEW WHERE DEL_YN='N' AND TYPE='DATA'"),
    crCapabilities: tableExists(db, 'CR_CAPABILITY')
      ? countRows(db, "SELECT COUNT(*) AS count FROM CR_CAPABILITY WHERE STATUS='active'")
      : 0,
    recentFailedCrRuns: tableExists(db, 'CR_RUN')
      ? countRows(db, 'SELECT COUNT(*) AS count FROM CR_RUN WHERE OK=0')
      : 0,
    lastSaveAt: lastSave?.CREATED_AT || null,
    lastValidationStatus: lastValidation?.STATUS || null,
    lastValidationAt: lastValidation?.CREATED_AT || null,
  };
}

function runReadOnlyQuery(db, sql, params = []) {
  if (typeof sql !== 'string' || !sql.trim()) throw new Error('SQL is required.');
  const normalizedSql = sql.trim();
  if (!isSingleStatement(normalizedSql)) throw new Error(MULTI_STATEMENT_ERROR);
  const lower = normalizedSql.toLowerCase();
  const isAllowed =
    lower.startsWith('select') || /^pragma\s+table_info\s*\(\s*["'`[]?[\w.]+["'`\]]?\s*\)\s*;?$/i.test(normalizedSql);
  if (!isAllowed) throw new Error('Only read-only SELECT queries are allowed.');
  if (WRITE_KEYWORDS.test(stripSqlLiteralsAndComments(normalizedSql))) {
    throw new Error('Write and DDL statements are not allowed in read-only queries.');
  }

  const rows = db.prepare(normalizedSql).all(...normalizeParams(params));
  return { rows, rowCount: rows.length, type: 'SELECT' };
}

function readItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function addIssue(target, code, message, context) {
  target.push({ ...context, code, message });
}

function isDeleted(item) {
  return item?._deleted === true;
}

function normalizePid(value) {
  if (value === undefined || value === null || value === '') return { value: null, missing: true, invalid: false };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return { value: null, missing: false, invalid: true };
  return { value: n, missing: false, invalid: false };
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function makeEntityKey(item = {}) {
  const pid = normalizeOptionalText(item.PID ?? item.pid);
  const code = normalizeOptionalText(item.CODE ?? item.code);
  const type = normalizeOptionalText(item.TYPE ?? item.type);
  if (!pid && code) return code;
  return [pid, code, type].filter(Boolean).join(':');
}

function tableExists(db, tableName) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName));
}

function countRows(db, sql) {
  return db.prepare(sql).get().count;
}

function readLimit(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  return Array.isArray(params) ? params : [params];
}

function boolToInt(value) {
  return value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function jsonOrNull(value) {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : stableJson(value);
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

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

function isSingleStatement(sql) {
  const semicolons = semicolonPositionsOutsideLiterals(sql.trim());
  if (semicolons.length === 0) return true;
  if (semicolons.length > 1) return false;
  return sql.slice(semicolons[0] + 1).trim() === '';
}

function semicolonPositionsOutsideLiterals(sql) {
  const positions = [];
  let quote = null;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];
    if (quote) {
      if (char === quote) {
        if (next === quote) {
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (char === '-' && next === '-') {
      const newline = sql.indexOf('\n', i + 2);
      i = newline === -1 ? sql.length : newline;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 1;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === ';') positions.push(i);
  }
  return positions;
}

function stripSqlLiteralsAndComments(sql) {
  let output = '';
  let quote = null;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];
    if (quote) {
      if (char === quote) {
        if (next === quote) {
          i += 1;
        } else {
          quote = null;
        }
      }
      output += ' ';
      continue;
    }
    if (char === '-' && next === '-') {
      const newline = sql.indexOf('\n', i + 2);
      i = newline === -1 ? sql.length : newline;
      output += ' ';
      continue;
    }
    if (char === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 1;
      output += ' ';
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      output += ' ';
      continue;
    }
    output += char;
  }
  return output;
}

function compareActivityTimestamp(left, right) {
  const leftTime = timestampMillis(left);
  const rightTime = timestampMillis(right);
  if (leftTime !== rightTime) return leftTime - rightTime;
  return String(left || '').localeCompare(String(right || ''));
}

function timestampMillis(value) {
  if (!value) return 0;
  const text = String(value);
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(text) ? `${text.replace(' ', 'T')}Z` : text;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : 0;
}

module.exports = { createMetaManagementStore };
