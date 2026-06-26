import type { ColDef } from './useMetaManagementData';
import type { SgCellType, SgColSpec } from './useMetaManagementSpanGrid';

export const CHECKBOX_FIELDS = new Set(['SHOW_YN', 'USE_YN', 'DEL_YN']);
export const READONLY_FIELDS = new Set(['UID', 'INSERT_DT', 'UPDATE_DT', 'RID', 'RIX']);

export function buildTemplateGridColumns(deleteLabel: string): SgColSpec[] {
  return [
    { key: 'UID', label: 'UID', width: 38, type: 'ro' },
    { key: 'PID', label: 'PID', width: 38, type: 'ro' },
    { key: 'PCODE', label: 'PCODE', width: 80, type: 'text' },
    { key: 'CODE', label: 'CODE', width: 100, type: 'text' },
    { key: 'NAME', label: 'NAME', width: 140, type: 'text' },
    { key: 'TYPE', label: 'TYPE', width: 60, type: 'text' },
    { key: 'FORMORDER', label: 'ORDER', width: 80, type: 'text' },
    { key: 'USE_YN', label: 'USE', width: 38, type: 'chk' },
    { key: '__del__', label: deleteLabel, width: 46, type: 'del' },
  ];
}

export function buildAttributeGridColumns(deleteLabel: string): SgColSpec[] {
  return [
    { key: 'UID', label: 'UID', width: 38, type: 'ro' },
    { key: 'PID', label: 'PID', width: 38, type: 'ro' },
    { key: 'SHOW_YN', label: 'SHOW', width: 38, type: 'chk' },
    { key: 'CODE', label: 'CODE', width: 100, type: 'text' },
    { key: 'NAME', label: 'NAME', width: 140, type: 'text' },
    { key: 'FORMORDER', label: 'ORDER', width: 80, type: 'text' },
    { key: '__del__', label: deleteLabel, width: 46, type: 'del' },
  ];
}

export function getInstanceColumnWidth(field: string): number {
  if (field === 'UID') return 40;
  if (field === 'PID') return 40;
  if (field === 'PCODE') return 80;
  if (field === 'CODE') return 100;
  if (field === 'NAME') return 120;
  if (field === 'RID') return 80;
  if (field === 'FORMORDER') return 70;
  if (CHECKBOX_FIELDS.has(field)) return 40;
  return 100;
}

export function getInstanceColumnType(field: string): SgCellType {
  if (CHECKBOX_FIELDS.has(field)) return 'chk';
  if (READONLY_FIELDS.has(field)) return 'ro';
  return 'text';
}

export function buildInstanceGridColumns(columns: ColDef[], deleteLabel: string): SgColSpec[] {
  return [
    ...columns.map((col) => ({
      key: col.field,
      label: col.title,
      width: getInstanceColumnWidth(col.field),
      type: getInstanceColumnType(col.field),
    })),
    { key: '__del__', label: deleteLabel, width: 46, type: 'del' as SgCellType },
  ];
}
