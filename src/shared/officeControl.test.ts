import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyOfficeApproval, normalizeOfficeAction, normalizeOfficeSettings } from './officeControl';

test('office settings are enabled by default with guarded installed automation', () => {
  assert.deepEqual(normalizeOfficeSettings(undefined), {
    enabled: true,
    allowModifyExistingDocuments: false,
    allowVisibleOfficeAutomation: false,
    allowPdfExport: false,
    enableMacosAppleEventsProvider: true,
    enableWindowsComProvider: true,
    openAfterCreate: false,
    maxReadCells: 50000,
    maxWriteCells: 50000,
    defaultOutputDir: '',
  });
});

test('normalizes Excel create workbook action', () => {
  const action = normalizeOfficeAction('xd.office.excel.createWorkbook', {
    sheets: [
      {
        name: 'Summary',
        rows: [
          ['Month', 'Revenue'],
          ['Jan', 1200],
        ],
      },
    ],
  });

  assert.equal(action.kind, 'excel.createWorkbook');
  assert.equal(action.documentType, 'excel');
  assert.equal(action.sheets.length, 1);
  assert.equal(action.sheets[0]?.name, 'Summary');
});

test('normalizes Excel read range action with bounded range', () => {
  const action = normalizeOfficeAction('xd.office.excel.readRange', {
    path: 'C:/work/report.xlsx',
    sheetName: 'Summary',
    range: 'A1:D20',
  });

  assert.equal(action.kind, 'excel.readRange');
  assert.equal(action.path, 'C:/work/report.xlsx');
  assert.equal(action.sheetName, 'Summary');
  assert.equal(action.range, 'A1:D20');
});

test('normalizes installed Excel provider actions for Windows and macOS', () => {
  const open = normalizeOfficeAction('xd.office.excel.openWorkbook', {
    provider: 'macos-apple-events',
    path: '/Users/me/report.xlsx',
    visible: true,
    readOnly: true,
    reuseExisting: true,
  });
  assert.equal(open.kind, 'excel.openWorkbook');
  assert.equal(open.provider, 'macos-apple-events');
  assert.equal(open.visible, true);
  assert.equal(open.readOnly, true);
  assert.equal(open.reuseExisting, true);

  const write = normalizeOfficeAction('xd.office.excel.writeRange', {
    provider: 'windows-com',
    path: 'C:/work/report.xlsx',
    sheetName: 'Summary',
    startCell: 'B2',
    rows: [
      ['Month', 'Revenue'],
      ['Jan', 1200],
    ],
    save: true,
  });
  assert.equal(write.kind, 'excel.writeRange');
  assert.equal(write.provider, 'windows-com');
  assert.equal(write.startCell, 'B2');
  assert.equal(write.save, true);
  assert.equal(write.rows.length, 2);

  const saved = normalizeOfficeAction('xd.office.excel.saveWorkbook', {
    provider: 'windows-com',
    path: 'C:/work/report.xlsx',
    saveAsPath: 'C:/work/report-copy.xlsx',
  });
  assert.equal(saved.kind, 'excel.saveWorkbook');
  assert.equal(saved.saveAsPath, 'C:/work/report-copy.xlsx');

  const exported = normalizeOfficeAction('xd.office.excel.exportPdf', {
    provider: 'macos-apple-events',
    path: '/Users/me/report.xlsx',
    outputPath: '/Users/me/report.pdf',
  });
  assert.equal(exported.kind, 'excel.exportPdf');
  assert.equal(exported.outputPath, '/Users/me/report.pdf');
});

test('rejects invalid installed Excel provider action inputs', () => {
  assert.throws(() => normalizeOfficeAction('xd.office.excel.openWorkbook', {}), /Office action requires path/);
  assert.throws(
    () =>
      normalizeOfficeAction('xd.office.excel.writeRange', {
        path: 'C:/work/report.xlsx',
        sheetName: 'Summary',
        rows: [['A']],
      }),
    /Office writeRange requires startCell/,
  );
  assert.throws(
    () =>
      normalizeOfficeAction('xd.office.excel.writeRange', {
        path: 'C:/work/report.xlsx',
        sheetName: 'Summary',
        startCell: 'A1',
      }),
    /Office writeRange requires rows/,
  );
  assert.throws(
    () =>
      normalizeOfficeAction('xd.office.excel.writeRange', {
        path: 'C:/work/report.xlsx',
        sheetName: 'Summary',
        startCell: 'A1',
        rows: Array.from({ length: 501 }, () => Array.from({ length: 100 }, () => 'x')),
      }),
    /Office writeRange exceeds maxWriteCells/,
  );
  assert.throws(
    () => normalizeOfficeAction('xd.office.excel.exportPdf', { path: 'C:/work/report.xlsx' }),
    /Office exportPdf requires outputPath/,
  );
});

test('rejects missing workbook path for inspect and read', () => {
  assert.throws(() => normalizeOfficeAction('xd.office.excel.inspectWorkbook', {}), /Office action requires path/);
  assert.throws(
    () => normalizeOfficeAction('xd.office.excel.readRange', { sheetName: 'Sheet1', range: 'A1:A2' }),
    /Office action requires path/,
  );
});

test('classifies Office approval levels', () => {
  assert.equal(classifyOfficeApproval(normalizeOfficeAction('xd.office.status', {})), 'low');
  assert.equal(
    classifyOfficeApproval(
      normalizeOfficeAction('xd.office.excel.createWorkbook', {
        sheets: [{ name: 'Summary', rows: [['A']] }],
      }),
    ),
    'medium',
  );
  assert.equal(
    classifyOfficeApproval(
      normalizeOfficeAction('xd.office.excel.createWorkbook', {
        outputPath: 'C:/work/existing.xlsx',
        overwrite: true,
        sheets: [{ name: 'Summary', rows: [['A']] }],
      }),
    ),
    'high',
  );
  assert.equal(
    classifyOfficeApproval(
      normalizeOfficeAction('xd.office.excel.writeRange', {
        path: 'C:/work/existing.xlsx',
        sheetName: 'Summary',
        startCell: 'A1',
        rows: [['A']],
      }),
    ),
    'high',
  );
  assert.equal(
    classifyOfficeApproval(
      normalizeOfficeAction('xd.office.excel.exportPdf', {
        path: 'C:/work/existing.xlsx',
        outputPath: 'C:/work/existing.pdf',
      }),
    ),
    'high',
  );
});
