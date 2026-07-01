export type OfficeDocumentType = 'excel' | 'word' | 'powerpoint';
export type OfficeProviderId = 'file' | 'macos-apple-events' | 'windows-com';
export type OfficeActionKind =
  | 'status'
  | 'excel.createWorkbook'
  | 'excel.inspectWorkbook'
  | 'excel.openWorkbook'
  | 'excel.readRange'
  | 'excel.writeRange'
  | 'excel.saveWorkbook'
  | 'excel.closeWorkbook'
  | 'excel.exportPdf';
export type OfficeApprovalLevel = 'low' | 'medium' | 'high';

export const DEFAULT_OFFICE_MAX_READ_CELLS = 50_000;
export const DEFAULT_OFFICE_MAX_WRITE_CELLS = 50_000;

export interface OfficeControlSettings {
  enabled: boolean;
  defaultOutputDir: string;
  openAfterCreate: boolean;
  allowPdfExport: boolean;
  allowModifyExistingDocuments: boolean;
  enableWindowsComProvider: boolean;
  enableMacosAppleEventsProvider: boolean;
  allowVisibleOfficeAutomation: boolean;
  maxReadCells: number;
  maxWriteCells: number;
}

export interface OfficeSheetInput {
  name: string;
  rows: unknown[][];
}

export interface OfficeAction {
  kind: OfficeActionKind;
  documentType?: OfficeDocumentType;
  provider?: OfficeProviderId;
  path?: string;
  outputPath?: string;
  overwrite?: boolean;
  openAfterCreate?: boolean;
  visible?: boolean;
  readOnly?: boolean;
  reuseExisting?: boolean;
  save?: boolean;
  sheets: OfficeSheetInput[];
  sheetName?: string;
  range?: string;
  startCell?: string;
  rows: unknown[][];
  saveAsPath?: string;
}

export interface OfficeProviderStatus {
  id: OfficeProviderId;
  available: boolean;
  apps: OfficeDocumentType[];
  message?: string;
  details?: Record<string, unknown>;
}

export interface OfficeActionResult {
  ok: boolean;
  action: OfficeActionKind;
  documentType?: OfficeDocumentType;
  path?: string;
  provider?: OfficeProviderId;
  outputPath?: string;
  providers?: OfficeProviderStatus[];
  sheets?: Array<{ name: string; rowCount: number; columnCount: number }>;
  rows?: unknown[][];
  warnings?: string[];
  message: string;
  code?: string;
  error?: string;
}

export function normalizeOfficeSettings(raw: Partial<OfficeControlSettings> | undefined): OfficeControlSettings {
  return {
    enabled: raw?.enabled !== false,
    allowModifyExistingDocuments: raw?.allowModifyExistingDocuments === true,
    allowVisibleOfficeAutomation: raw?.allowVisibleOfficeAutomation === true,
    allowPdfExport: raw?.allowPdfExport === true,
    enableMacosAppleEventsProvider: raw?.enableMacosAppleEventsProvider !== false,
    enableWindowsComProvider: raw?.enableWindowsComProvider !== false,
    openAfterCreate: raw?.openAfterCreate === true,
    maxReadCells: normalizePositiveInteger(raw?.maxReadCells, DEFAULT_OFFICE_MAX_READ_CELLS),
    maxWriteCells: normalizePositiveInteger(raw?.maxWriteCells, DEFAULT_OFFICE_MAX_WRITE_CELLS),
    defaultOutputDir: typeof raw?.defaultOutputDir === 'string' ? raw.defaultOutputDir.trim() : '',
  };
}

export function normalizeOfficeAction(path: string, raw: unknown): OfficeAction {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const kind = officeKindFromPath(path);
  const action: OfficeAction = {
    kind,
    documentType: kind.startsWith('excel.') ? 'excel' : undefined,
    provider: normalizeProvider(input.provider),
    path: normalizeText(input.path),
    outputPath: normalizeText(input.outputPath),
    overwrite: input.overwrite === true,
    openAfterCreate: input.openAfterCreate === true,
    visible: input.visible === true,
    readOnly: input.readOnly === true,
    reuseExisting: input.reuseExisting === true,
    save: input.save === true,
    sheets: normalizeSheets(input.sheets),
    sheetName: normalizeText(input.sheetName),
    range: normalizeText(input.range),
    startCell: normalizeText(input.startCell),
    rows: normalizeRows(input.rows),
    saveAsPath: normalizeText(input.saveAsPath),
  };

  if (requiresWorkbookPath(kind) && !action.path) {
    throw new Error('Office action requires path.');
  }
  if (kind === 'excel.readRange' && (!action.sheetName || !action.range)) {
    throw new Error('Office readRange requires sheetName and range.');
  }
  if (kind === 'excel.readRange' && countRangeCells(action.range || '') > DEFAULT_OFFICE_MAX_READ_CELLS) {
    throw new Error('Office readRange exceeds maxReadCells.');
  }
  if (kind === 'excel.createWorkbook' && action.sheets.length === 0) {
    throw new Error('Office createWorkbook requires at least one sheet.');
  }
  if (kind === 'excel.writeRange' && !action.sheetName) {
    throw new Error('Office writeRange requires sheetName.');
  }
  if (kind === 'excel.writeRange' && !action.startCell) {
    throw new Error('Office writeRange requires startCell.');
  }
  if (kind === 'excel.writeRange' && action.rows.length === 0) {
    throw new Error('Office writeRange requires rows.');
  }
  if (kind === 'excel.writeRange' && countRowsCells(action.rows) > DEFAULT_OFFICE_MAX_WRITE_CELLS) {
    throw new Error('Office writeRange exceeds maxWriteCells.');
  }
  if (kind === 'excel.exportPdf' && !action.outputPath) {
    throw new Error('Office exportPdf requires outputPath.');
  }

  return action;
}

export function classifyOfficeApproval(action: OfficeAction): OfficeApprovalLevel {
  if (action.kind === 'status') return 'low';
  if (
    action.kind === 'excel.writeRange' ||
    action.kind === 'excel.saveWorkbook' ||
    action.kind === 'excel.closeWorkbook' ||
    action.kind === 'excel.exportPdf' ||
    action.visible
  ) {
    return 'high';
  }
  if (action.overwrite) return 'high';
  if (action.path && action.kind !== 'excel.inspectWorkbook' && action.kind !== 'excel.readRange') return 'high';
  return 'medium';
}

function officeKindFromPath(path: string): OfficeActionKind {
  if (path === 'xd.office.status') return 'status';
  if (path === 'xd.office.excel.createWorkbook') return 'excel.createWorkbook';
  if (path === 'xd.office.excel.inspectWorkbook') return 'excel.inspectWorkbook';
  if (path === 'xd.office.excel.openWorkbook') return 'excel.openWorkbook';
  if (path === 'xd.office.excel.readRange') return 'excel.readRange';
  if (path === 'xd.office.excel.writeRange') return 'excel.writeRange';
  if (path === 'xd.office.excel.saveWorkbook') return 'excel.saveWorkbook';
  if (path === 'xd.office.excel.closeWorkbook') return 'excel.closeWorkbook';
  if (path === 'xd.office.excel.exportPdf') return 'excel.exportPdf';
  throw new Error(`Unsupported Office capability: ${path}`);
}

function normalizeProvider(value: unknown): OfficeProviderId | undefined {
  return value === 'file' || value === 'macos-apple-events' || value === 'windows-com' ? value : undefined;
}

function requiresWorkbookPath(kind: OfficeActionKind): boolean {
  return (
    kind === 'excel.inspectWorkbook' ||
    kind === 'excel.openWorkbook' ||
    kind === 'excel.readRange' ||
    kind === 'excel.writeRange' ||
    kind === 'excel.saveWorkbook' ||
    kind === 'excel.closeWorkbook' ||
    kind === 'excel.exportPdf'
  );
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSheets(value: unknown): OfficeSheetInput[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object' && !Array.isArray(item)),
    )
    .map((item, index) => ({
      name: normalizeText(item.name) || `Sheet${index + 1}`,
      rows: Array.isArray(item.rows) ? item.rows.map((row) => (Array.isArray(row) ? row : [row])) : [],
    }))
    .filter((sheet) => sheet.rows.length > 0);
}

function normalizeRows(value: unknown): unknown[][] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => (Array.isArray(row) ? row : [row]));
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function countRowsCells(rows: unknown[][]): number {
  return rows.reduce((total, row) => total + row.length, 0);
}

function countRangeCells(range: string): number {
  const match = range.match(/^([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/);
  if (!match) return 1;
  const startColumn = columnIndex(match[1] || 'A');
  const startRow = Number(match[2] || 1);
  const endColumn = columnIndex(match[3] || 'A');
  const endRow = Number(match[4] || 1);
  return (Math.abs(endColumn - startColumn) + 1) * (Math.abs(endRow - startRow) + 1);
}

function columnIndex(column: string): number {
  return column
    .toUpperCase()
    .split('')
    .reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0);
}
