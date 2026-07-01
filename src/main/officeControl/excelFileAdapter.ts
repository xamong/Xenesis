import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import type { OfficeAction, OfficeActionResult } from '../../shared/officeControl';

export interface ExcelFileAdapter {
  createWorkbook(action: OfficeAction): Promise<OfficeActionResult>;
  inspectWorkbook(action: OfficeAction): Promise<OfficeActionResult>;
  readRange(action: OfficeAction): Promise<OfficeActionResult>;
}

export function createExcelFileAdapter(): ExcelFileAdapter {
  return {
    async createWorkbook(action) {
      const outputPath = action.outputPath || path.join(os.tmpdir(), `xenesis-office-${Date.now()}.xlsx`);
      if (!action.overwrite && (await exists(outputPath))) {
        return failed('excel.createWorkbook', 'overwrite_required', `File already exists: ${outputPath}`);
      }

      const workbook = XLSX.utils.book_new();
      for (const sheet of action.sheets) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), safeSheetName(sheet.name));
      }
      XLSX.writeFile(workbook, outputPath);

      return {
        ok: true,
        action: 'excel.createWorkbook',
        documentType: 'excel',
        path: outputPath,
        sheets: summarizeWorkbook(workbook),
        message: 'Excel workbook created.',
      };
    },

    async inspectWorkbook(action) {
      const workbook = XLSX.readFile(action.path || '');
      return {
        ok: true,
        action: 'excel.inspectWorkbook',
        documentType: 'excel',
        path: action.path,
        sheets: summarizeWorkbook(workbook),
        message: 'Excel workbook inspected.',
      };
    },

    async readRange(action) {
      const workbook = XLSX.readFile(action.path || '');
      const sheet = workbook.Sheets[action.sheetName || ''];
      if (!sheet) return failed('excel.readRange', 'sheet_not_found', `Sheet not found: ${action.sheetName}`);
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        range: action.range,
        blankrows: false,
      });
      return {
        ok: true,
        action: 'excel.readRange',
        documentType: 'excel',
        path: action.path,
        rows,
        message: 'Excel range read.',
      };
    },
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function safeSheetName(value: string): string {
  return (
    value
      .replace(/[\\/?*[\]:]/g, ' ')
      .trim()
      .slice(0, 31) || 'Sheet1'
  );
}

function summarizeWorkbook(workbook: XLSX.WorkBook): Array<{ name: string; rowCount: number; columnCount: number }> {
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    const columnCount = rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
    return { name, rowCount: rows.length, columnCount };
  });
}

function failed(action: OfficeActionResult['action'], code: string, message: string): OfficeActionResult {
  return { ok: false, action, code, error: message, message };
}
