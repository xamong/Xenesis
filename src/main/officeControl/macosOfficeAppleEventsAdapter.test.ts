import assert from 'node:assert/strict';
import test from 'node:test';
import type { OfficeActionResult } from '../../shared/officeControl';
import {
  createMacosOfficeAppleEventsAdapter,
  type MacosOfficeAppleEventsRunInput,
} from './macosOfficeAppleEventsAdapter';

test('macOS Office Apple Events adapter reports unavailable status outside macOS without invoking automation', async () => {
  let called = false;
  const adapter = createMacosOfficeAppleEventsAdapter({
    platform: 'win32',
    runAppleEvents: async () => {
      called = true;
      return '{}';
    },
  });

  const status = await adapter.status();

  assert.equal(called, false);
  assert.equal(status.id, 'macos-apple-events');
  assert.equal(status.available, false);
});

test('macOS Office Apple Events adapter sends typed operation payloads and preserves successful results', async () => {
  const calls: MacosOfficeAppleEventsRunInput[] = [];
  const adapter = createMacosOfficeAppleEventsAdapter({
    platform: 'darwin',
    runAppleEvents: async (input) => {
      calls.push(input);
      return JSON.stringify({
        ok: true,
        action: 'excel.exportPdf',
        documentType: 'excel',
        provider: 'macos-apple-events',
        path: '/Users/me/report.xlsx',
        outputPath: '/Users/me/report.pdf',
        message: 'Excel workbook exported.',
      } satisfies OfficeActionResult);
    },
  });

  const result = await adapter.run({
    kind: 'excel.exportPdf',
    documentType: 'excel',
    provider: 'macos-apple-events',
    path: '/Users/me/report.xlsx',
    outputPath: '/Users/me/report.pdf',
    overwrite: true,
    sheets: [],
    rows: [],
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'macos-apple-events');
  assert.deepEqual(calls[0], {
    operation: 'excel.exportPdf',
    action: 'excel.exportPdf',
    args: {
      provider: 'macos-apple-events',
      documentType: 'excel',
      path: '/Users/me/report.xlsx',
      outputPath: '/Users/me/report.pdf',
      overwrite: true,
      visible: false,
      readOnly: false,
      reuseExisting: false,
      save: false,
      sheetName: undefined,
      range: undefined,
      startCell: undefined,
      rows: [],
      saveAsPath: undefined,
    },
    timeoutMs: 20000,
  });
});

test('macOS Office Apple Events adapter maps invalid automation JSON to stable failure', async () => {
  const adapter = createMacosOfficeAppleEventsAdapter({
    platform: 'darwin',
    runAppleEvents: async () => 'not json',
  });

  const result = await adapter.run({
    kind: 'excel.openWorkbook',
    documentType: 'excel',
    provider: 'macos-apple-events',
    path: '/Users/me/report.xlsx',
    sheets: [],
    rows: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.action, 'excel.openWorkbook');
  assert.equal(result.code, 'host_invalid_json');
});

test('macOS Office Apple Events adapter maps automation rejection to apple_events_failed', async () => {
  const adapter = createMacosOfficeAppleEventsAdapter({
    platform: 'darwin',
    runAppleEvents: async () => {
      throw new Error('Not authorized to send Apple events to Microsoft Excel.');
    },
  });

  const result = await adapter.run({
    kind: 'excel.readRange',
    documentType: 'excel',
    provider: 'macos-apple-events',
    path: '/Users/me/report.xlsx',
    sheetName: 'Summary',
    range: 'A1:B2',
    sheets: [],
    rows: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.action, 'excel.readRange');
  assert.equal(result.code, 'apple_events_failed');
  assert.match(result.error || '', /Not authorized/);
});
