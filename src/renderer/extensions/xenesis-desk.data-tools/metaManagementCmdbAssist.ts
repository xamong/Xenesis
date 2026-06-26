import type { MetaRecord } from './metaManagementProvider';

export interface MetaFormOption {
  label: string;
  value: string;
}

export interface MetaFormField {
  code: string;
  label: string;
  inputType: 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'textarea';
  visible: boolean;
  required: boolean;
  readOnly: boolean;
  defaultValue: string;
  width: number;
  options: MetaFormOption[];
  source: string;
}

export interface MetaRelation {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: 'parent' | 'template' | 'attribute' | 'instance' | 'value';
}

export interface MetaExportPayload {
  version: 'xd-meta-xmdb-assist/v1';
  exportedAt: string;
  selectedNode: MetaRecord | null;
  templates: MetaRecord[];
  attributes: MetaRecord[];
  instances: MetaRecord[];
  formFields: MetaFormField[];
  relations: MetaRelation[];
}

export interface MetaFormPreviewRow {
  field: MetaFormField;
  value: string;
  source: 'instance' | 'default' | 'empty';
}

export interface MetaImportPlan {
  ok: boolean;
  error?: string;
  items: MetaRecord[];
  warnings: string[];
  summary: {
    templates: number;
    attributes: number;
    instances: number;
    totalItems: number;
  };
}

export interface MetaImportContextSummary {
  sourceLabel: string;
  sourceMeta: string;
  targetLabel: string;
  targetMeta: string;
  exportedAt: string;
}

export interface MetaImportConflictSummary {
  total: number;
  blocked: number;
  reused: number;
  updated: number;
  changedRows: number;
  changedFields: number;
}

const CHECKBOX_FIELD_NAMES = new Set(['SHOW_YN', 'USE_YN', 'DEL_YN', 'REQUIRED_YN', 'READONLY_YN']);
const READONLY_FIELD_NAMES = new Set(['UID', 'PID', 'AID', 'RID', 'RIX', 'INSERT_DT', 'UPDATE_DT']);
const JSON_CONFIG_FIELDS = [
  'GRIDINFO',
  'MAKEFORM',
  'OPTIONSJSON',
  'CONFIG',
  'DESCRIPTION',
  'TTSHINT',
  'RESERVE',
  'RESERV1',
  'RESERV2',
  'VALUE',
];
const BATCH_INSERT_FIELDS = [
  'PID',
  'PCODE',
  'AID',
  'ACODE',
  'CODE',
  'NAME',
  'VALUE',
  'TYPE',
  'FORMORDER',
  'DESCRIPTION',
  'SHOW_YN',
  'CID',
  'RID',
  'RIX',
  'TARGET',
  'RESERVE',
  'RESERV1',
  'RESERV2',
  'RESERV3',
  'USE_YN',
  'TTSHINT',
] as const;

function asString(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

function isYes(value: unknown): boolean {
  return String(value ?? '').toUpperCase() === 'Y';
}

function sortByFormOrder<T extends MetaRecord>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const av = Number.parseInt(asString(a.FORMORDER), 10);
    const bv = Number.parseInt(asString(b.FORMORDER), 10);
    return (Number.isNaN(av) ? 0 : av) - (Number.isNaN(bv) ? 0 : bv);
  });
}

function parseJsonObject(value: unknown): MetaRecord | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as MetaRecord;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as MetaRecord) : null;
  } catch {
    return null;
  }
}

function collectConfig(row: MetaRecord): MetaRecord {
  const merged: MetaRecord = {};
  for (const field of JSON_CONFIG_FIELDS) {
    const parsed = parseJsonObject(row[field]);
    if (parsed) Object.assign(merged, parsed);
  }
  return merged;
}

function optionFromValue(value: unknown): MetaFormOption | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const row = value as MetaRecord;
    const optionValue = asString(row.value ?? row.CODE ?? row.code ?? row.id ?? row.key ?? row.label);
    const optionLabel = asString(row.label ?? row.NAME ?? row.name ?? row.text ?? optionValue);
    return optionValue ? { label: optionLabel || optionValue, value: optionValue } : null;
  }
  const text = asString(value).trim();
  if (!text) return null;
  const pair = text.includes(':') ? text.split(':') : text.includes('=') ? text.split('=') : null;
  if (pair && pair.length >= 2) {
    const optionValue = pair.shift()?.trim() ?? '';
    const optionLabel = pair.join('=').trim();
    return optionValue ? { label: optionLabel || optionValue, value: optionValue } : null;
  }
  return { label: text, value: text };
}

function normalizeOptions(value: unknown): MetaFormOption[] {
  if (value === undefined || value === null || value === '') return [];
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (Array.isArray(parsed)) return normalizeOptions(parsed);
        if (parsed && typeof parsed === 'object') {
          const config = parsed as MetaRecord;
          return normalizeOptions(config.options ?? config.items ?? config.values ?? config);
        }
      } catch {
        return [];
      }
    }
    return text
      .split(/[|,;]/)
      .map(optionFromValue)
      .filter((item): item is MetaFormOption => !!item);
  }
  if (Array.isArray(value)) {
    return value.map(optionFromValue).filter((item): item is MetaFormOption => !!item);
  }
  if (typeof value === 'object') {
    return Object.entries(value as MetaRecord).map(([optionValue, optionLabel]) => ({
      value: optionValue,
      label: asString(optionLabel) || optionValue,
    }));
  }
  return [];
}

function inferInputType(row: MetaRecord, config: MetaRecord, options: MetaFormOption[]): MetaFormField['inputType'] {
  const explicit = asString(
    config.inputType ?? config.editor ?? config.control ?? row.INPUT_TYPE ?? row.EDITOR,
  ).toLowerCase();
  if (['number', 'date', 'checkbox', 'select', 'textarea', 'text'].includes(explicit)) {
    return explicit as MetaFormField['inputType'];
  }
  if (options.length > 0) return 'select';

  const code = asString(row.CODE ?? row.field).toUpperCase();
  const dataType = asString(config.dataType ?? row.DATA_TYPE ?? row.TYPE).toUpperCase();
  if (CHECKBOX_FIELD_NAMES.has(code) || code.endsWith('_YN') || dataType === 'BOOLEAN') return 'checkbox';
  if (
    dataType.includes('INT') ||
    dataType.includes('NUM') ||
    ['CNT', 'COUNT', 'TOTAL', 'PRICE', 'AMOUNT'].some((suffix) => code.endsWith(suffix))
  )
    return 'number';
  if (dataType.includes('DATE') || code.endsWith('_DT') || code.endsWith('_DATE')) return 'date';
  if (code.includes('DESC') || code.includes('COMMENT') || code.includes('MEMO') || code.includes('TEXT'))
    return 'textarea';
  return 'text';
}

function fieldWidth(row: MetaRecord, config: MetaRecord): number {
  const raw = config.width ?? config.formWidth ?? row.WIDTH ?? row.FORMWIDTH;
  const width = typeof raw === 'number' ? raw : Number.parseInt(asString(raw), 10);
  if (Number.isFinite(width) && width > 0) return Math.min(Math.max(width, 80), 720);
  return 180;
}

export function buildMetaFormFields(rawAttrs: MetaRecord[], colDefs: MetaRecord[]): MetaFormField[] {
  const colByField = new Map(colDefs.map((col) => [asString(col.field), col]));
  const attrRows: MetaRecord[] =
    rawAttrs.length > 0
      ? sortByFormOrder(rawAttrs)
      : colDefs.map((col) => ({ CODE: col.field, NAME: col.title, SHOW_YN: col.visible ? 'Y' : 'N' }) as MetaRecord);

  return attrRows
    .map((row) => {
      const code = asString(row.CODE ?? row.field);
      if (!code) return null;
      const col = colByField.get(code);
      const config = collectConfig(row);
      const options = normalizeOptions(
        config.options ??
          config.items ??
          config.combo ??
          row.OPTIONSJSON ??
          row.OPTIONS ??
          row.COMBO_OPTIONS ??
          row.RESERV1,
      );
      return {
        code,
        label: asString(row.NAME ?? row.title ?? col?.title ?? code) || code,
        inputType: inferInputType(row, config, options),
        visible: col?.visible === false ? false : row.SHOW_YN !== 'N',
        required: Boolean(config.required) || isYes(row.REQUIRED_YN) || isYes(row.NOT_NULL),
        readOnly: Boolean(config.readOnly) || isYes(row.READONLY_YN) || READONLY_FIELD_NAMES.has(code.toUpperCase()),
        defaultValue: asString(config.defaultValue ?? row.DEFAULT_VALUE ?? row.VALUE),
        width: fieldWidth(row, config),
        options,
        source: asString(row.PCODE ?? row.ACODE ?? row.TYPE ?? 'attribute'),
      } satisfies MetaFormField;
    })
    .filter((field): field is MetaFormField => !!field);
}

function relationNodeId(prefix: string, value: unknown): string {
  return `${prefix}:${asString(value) || 'unknown'}`;
}

function pushRelation(relations: MetaRelation[], seen: Set<string>, relation: MetaRelation): void {
  if (seen.has(relation.id)) return;
  seen.add(relation.id);
  relations.push(relation);
}

export function buildMetaRelations(
  selectedNode: MetaRecord | null,
  templates: MetaRecord[],
  attributes: MetaRecord[],
  instances: MetaRecord[],
): MetaRelation[] {
  const relations: MetaRelation[] = [];
  const seen = new Set<string>();

  if (selectedNode?.UID && selectedNode.PID && selectedNode.PID !== selectedNode.UID) {
    pushRelation(relations, seen, {
      id: `parent:${selectedNode.PID}:${selectedNode.UID}`,
      from: relationNodeId('node', selectedNode.PID),
      to: relationNodeId('node', selectedNode.UID),
      label: 'parent',
      kind: 'parent',
    });
  }

  for (const row of templates) {
    if (!row.UID || !row.PID || row.UID === row.PID) continue;
    pushRelation(relations, seen, {
      id: `template:${row.PID}:${row.UID}`,
      from: relationNodeId('node', row.PID),
      to: relationNodeId('node', row.UID),
      label: asString(row.TYPE || 'template'),
      kind: 'template',
    });
  }

  for (const row of attributes) {
    const attrId = row.UID ?? row.CODE;
    const ownerId = row.PID ?? selectedNode?.AID ?? selectedNode?.UID;
    if (!attrId || !ownerId) continue;
    pushRelation(relations, seen, {
      id: `attribute:${ownerId}:${attrId}`,
      from: relationNodeId('node', ownerId),
      to: relationNodeId('attr', attrId),
      label: asString(row.CODE || 'attribute'),
      kind: 'attribute',
    });
  }

  for (const row of instances) {
    const instanceId = row.RID ?? row.UID ?? row._rowId;
    if (!instanceId || !selectedNode?.UID) continue;
    pushRelation(relations, seen, {
      id: `instance:${selectedNode.UID}:${instanceId}`,
      from: relationNodeId('node', selectedNode.UID),
      to: relationNodeId('instance', instanceId),
      label: asString(row.CODE || row.NAME || 'instance'),
      kind: 'instance',
    });
  }

  return relations;
}

export function buildMetaFormPreviewRows(
  fields: MetaFormField[],
  instances: MetaRecord[],
  selectedRid?: string | number | null,
): MetaFormPreviewRow[] {
  const selectedInstance = selectedRid
    ? instances.find((row) => String(row.RID ?? row.UID ?? row._rowId ?? '') === String(selectedRid))
    : instances[0];

  return fields
    .filter((field) => field.visible)
    .map((field) => {
      const value = selectedInstance?.[field.code];
      if (value !== undefined && value !== null && value !== '') {
        return { field, value: asString(value), source: 'instance' } satisfies MetaFormPreviewRow;
      }
      if (field.defaultValue) {
        return { field, value: field.defaultValue, source: 'default' } satisfies MetaFormPreviewRow;
      }
      return { field, value: '', source: 'empty' } satisfies MetaFormPreviewRow;
    });
}

export function buildMetaExportPayload(args: {
  selectedNode: MetaRecord | null;
  templates: MetaRecord[];
  attributes: MetaRecord[];
  rawAttrs: MetaRecord[];
  instances: MetaRecord[];
  colDefs: MetaRecord[];
  now?: Date | string;
}): MetaExportPayload {
  const exportedAt =
    args.now instanceof Date
      ? args.now.toISOString()
      : typeof args.now === 'string'
        ? args.now
        : new Date().toISOString();
  const formFields = buildMetaFormFields(args.rawAttrs, args.colDefs);
  const relations = buildMetaRelations(args.selectedNode, args.templates, args.attributes, args.instances);
  return {
    version: 'xd-meta-xmdb-assist/v1',
    exportedAt,
    selectedNode: args.selectedNode,
    templates: args.templates,
    attributes: args.attributes,
    instances: args.instances,
    formFields,
    relations,
  };
}

function sanitizeBatchInsertRow(row: MetaRecord): MetaRecord | null {
  const item: MetaRecord = {};
  for (const key of BATCH_INSERT_FIELDS) {
    if (row[key] !== undefined) item[key] = row[key];
  }
  if (!item.CODE && !item.NAME && !item.VALUE) return null;
  item.SHOW_YN = item.SHOW_YN ?? 'N';
  item.USE_YN = item.USE_YN ?? 'Y';
  return item;
}

function expandImportInstanceRows(snapshot: Partial<MetaExportPayload>): MetaRecord[] {
  const selectedNode = snapshot.selectedNode ?? null;
  const attributes = Array.isArray(snapshot.attributes) ? snapshot.attributes : [];
  const attributeByCode = new Map(attributes.map((row) => [asString(row.CODE), row]));
  const formFields = Array.isArray(snapshot.formFields) ? snapshot.formFields : [];
  const instances = Array.isArray(snapshot.instances) ? snapshot.instances : [];
  const rows: MetaRecord[] = [];

  for (const instance of instances) {
    if (instance.CODE || instance.TYPE) {
      const item = sanitizeBatchInsertRow(instance);
      if (item) rows.push(item);
      continue;
    }

    const rid = instance.RID || `IMPORT_${Date.now()}_${rows.length}`;
    for (const field of formFields) {
      if (!(field.code in instance)) continue;
      const attr = attributeByCode.get(field.code);
      rows.push({
        PID: selectedNode?.UID ?? instance.PID ?? 0,
        PCODE: selectedNode?.CODE ?? instance.PCODE ?? '',
        AID: selectedNode?.AID,
        ACODE: selectedNode?.ACODE,
        CODE: field.code,
        NAME: attr?.NAME ?? field.label,
        VALUE: instance[field.code],
        TYPE: 'DATA',
        FORMORDER: attr?.FORMORDER ?? '',
        CID: attr?.UID,
        RID: rid,
        RIX: instance.RIX ?? 0,
        SHOW_YN: 'N',
        USE_YN: 'Y',
      });
    }

    if (rid && !rows.some((row) => row.RID === rid && row.CODE === 'ROWID')) {
      rows.push({
        PID: selectedNode?.UID ?? instance.PID ?? 0,
        PCODE: selectedNode?.CODE ?? instance.PCODE ?? '',
        AID: selectedNode?.AID,
        ACODE: selectedNode?.ACODE,
        CODE: 'ROWID',
        NAME: 'ROWID',
        VALUE: rid,
        TYPE: 'DATA',
        RID: rid,
        RIX: instance.RIX ?? 0,
        SHOW_YN: 'N',
        USE_YN: 'Y',
      });
    }
  }

  return rows;
}

export function buildMetaImportPlan(text: string): MetaImportPlan {
  const preview = previewMetaImportPayload(text);
  if (!preview.ok) {
    return {
      ok: false,
      error: preview.error,
      items: [],
      warnings: [],
      summary: { templates: 0, attributes: 0, instances: 0, totalItems: 0 },
    };
  }

  const parsed = JSON.parse(text) as Partial<MetaExportPayload>;
  const templates = Array.isArray(parsed.templates) ? parsed.templates : [];
  const attributes = Array.isArray(parsed.attributes) ? parsed.attributes : [];
  const instances = Array.isArray(parsed.instances) ? parsed.instances : [];
  const templateItems = templates.map(sanitizeBatchInsertRow).filter((item): item is MetaRecord => !!item);
  const attributeItems = attributes.map(sanitizeBatchInsertRow).filter((item): item is MetaRecord => !!item);
  const instanceItems = expandImportInstanceRows(parsed);
  const items = [...templateItems, ...attributeItems, ...instanceItems];
  const warnings: string[] = [];

  if (items.some((item) => item.PID || item.AID || item.CID)) {
    warnings.push(
      'This plan strips UID values but keeps PID/AID/CID references. Review parent and attribute links before applying it to another database.',
    );
  }
  if (items.some((item) => item.RID)) {
    warnings.push(
      'RID values are preserved so DATA rows stay grouped. Change them if you need fully independent duplicated records.',
    );
  }

  return {
    ok: true,
    items,
    warnings,
    summary: {
      templates: templates.length,
      attributes: attributes.length,
      instances: instances.length,
      totalItems: items.length,
    },
  };
}

function metaNodeLabel(row: MetaRecord | null | undefined, fallback: string): string {
  const name = asString(row?.NAME ?? row?.name);
  const code = asString(row?.CODE ?? row?.code);
  if (name && code) return `${name} (${code})`;
  return name || code || fallback;
}

function metaNodeDetails(row: MetaRecord | null | undefined, fallback: string): string {
  if (!row) return fallback;
  const parts = [
    asString(row.TYPE ?? row.type),
    asString(row.UID ?? row.uid) ? `UID ${asString(row.UID ?? row.uid)}` : '',
    asString(row.PCODE ?? row.pcode) ? `Parent ${asString(row.PCODE ?? row.pcode)}` : '',
  ].filter(Boolean);
  return parts.join(' / ') || fallback;
}

export function buildMetaImportContextSummary(
  text: string,
  targetNode: MetaRecord | null,
): MetaImportContextSummary | null {
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text) as Partial<MetaExportPayload>;
    if (parsed.version !== 'xd-meta-xmdb-assist/v1') return null;
    const sourceNode = parsed.selectedNode ?? null;
    return {
      sourceLabel: metaNodeLabel(sourceNode, 'Unknown source'),
      sourceMeta: metaNodeDetails(sourceNode, 'No source node in snapshot.'),
      targetLabel: metaNodeLabel(targetNode, 'No target selected'),
      targetMeta: metaNodeDetails(targetNode, 'Select a target node before dry run or apply.'),
      exportedAt: asString(parsed.exportedAt) || 'Unknown export time',
    };
  } catch {
    return null;
  }
}

export function buildMetaImportConflictSummary(conflicts: MetaRecord[]): MetaImportConflictSummary {
  return conflicts.reduce<MetaImportConflictSummary>(
    (summary, conflict) => {
      summary.total++;
      const changedFields = Number(conflict.changedFields ?? 0) || 0;
      if (conflict.resolved !== true) {
        summary.blocked++;
      } else if (conflict.resolution === 'update') {
        summary.updated++;
      } else {
        summary.reused++;
      }
      if (changedFields > 0) {
        summary.changedRows++;
        summary.changedFields += changedFields;
      }
      return summary;
    },
    { total: 0, blocked: 0, reused: 0, updated: 0, changedRows: 0, changedFields: 0 },
  );
}

export function previewMetaImportPayload(text: string): {
  ok: boolean;
  error?: string;
  summary?: { templates: number; attributes: number; instances: number; relations: number };
} {
  if (!text.trim()) return { ok: false, error: 'Paste a XMDB assist JSON snapshot.' };
  try {
    const parsed = JSON.parse(text) as Partial<MetaExportPayload>;
    if (parsed.version !== 'xd-meta-xmdb-assist/v1') {
      return { ok: false, error: 'Unsupported snapshot version.' };
    }
    return {
      ok: true,
      summary: {
        templates: Array.isArray(parsed.templates) ? parsed.templates.length : 0,
        attributes: Array.isArray(parsed.attributes) ? parsed.attributes.length : 0,
        instances: Array.isArray(parsed.instances) ? parsed.instances.length : 0,
        relations: Array.isArray(parsed.relations) ? parsed.relations.length : 0,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid JSON.' };
  }
}
