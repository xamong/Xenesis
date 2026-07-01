import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createExcelFileAdapter } from './excelFileAdapter';

test('Excel file adapter creates, inspects, and reads a workbook', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xenesis-office-'));
  const outputPath = path.join(dir, 'sales.xlsx');
  const adapter = createExcelFileAdapter();

  const created = await adapter.createWorkbook({
    kind: 'excel.createWorkbook',
    documentType: 'excel',
    outputPath,
    sheets: [
      {
        name: 'Summary',
        rows: [
          ['Month', 'Revenue'],
          ['Jan', 1200],
          ['Feb', 1800],
        ],
      },
    ],
    rows: [],
  });

  assert.equal(created.ok, true);
  assert.equal(created.path, outputPath);

  const inspected = await adapter.inspectWorkbook({
    kind: 'excel.inspectWorkbook',
    documentType: 'excel',
    path: outputPath,
    sheets: [],
    rows: [],
  });

  assert.equal(inspected.ok, true);
  assert.deepEqual(inspected.sheets?.[0], { name: 'Summary', rowCount: 3, columnCount: 2 });

  const range = await adapter.readRange({
    kind: 'excel.readRange',
    documentType: 'excel',
    path: outputPath,
    sheetName: 'Summary',
    range: 'A1:B2',
    sheets: [],
    rows: [],
  });

  assert.equal(range.ok, true);
  assert.deepEqual(range.rows, [
    ['Month', 'Revenue'],
    ['Jan', 1200],
  ]);
});

test('Excel file adapter blocks overwrite unless overwrite is true', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xenesis-office-'));
  const outputPath = path.join(dir, 'exists.xlsx');
  await fs.writeFile(outputPath, 'existing');
  const adapter = createExcelFileAdapter();

  const result = await adapter.createWorkbook({
    kind: 'excel.createWorkbook',
    documentType: 'excel',
    outputPath,
    overwrite: false,
    sheets: [{ name: 'Summary', rows: [['A']] }],
    rows: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'overwrite_required');
});
