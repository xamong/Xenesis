import assert from 'node:assert/strict';
import test from 'node:test';
import type { OfficeAction, OfficeActionResult, OfficeProviderStatus } from '../../shared/officeControl';
import { createOfficeControlService } from './officeControlService';

test('office service returns disabled result when settings disable office control', async () => {
  const service = createOfficeControlService({ getSettings: () => ({ enabled: false }) });
  const result = await service.run('xd.office.status', {});
  assert.equal(result.ok, false);
  assert.equal(result.code, 'office_control_disabled');
});

test('office service returns provider status when enabled', async () => {
  const service = createOfficeControlService({
    getSettings: () => ({ enabled: true, enableWindowsComProvider: false, enableMacosAppleEventsProvider: false }),
  });
  const result = await service.run('xd.office.status', {});
  assert.equal(result.ok, true);
  assert.equal(result.action, 'status');
  assert.equal(
    result.providers?.some((provider) => provider.id === 'file' && provider.available),
    true,
  );
});

test('office service uses default settings when no settings reader is provided', async () => {
  const service = createOfficeControlService({
    windowsComAdapter: stubInstalledOfficeAdapter({ id: 'windows-com', available: false, apps: [] }),
    macosAppleEventsAdapter: stubInstalledOfficeAdapter({ id: 'macos-apple-events', available: false, apps: [] }),
  });

  const result = await service.run('xd.office.status', {});

  assert.equal(result.ok, true);
  assert.equal(
    result.providers?.some((provider) => provider.id === 'file' && provider.available),
    true,
  );
});

test('office service reports Windows COM and macOS Apple Events provider status', async () => {
  const service = createOfficeControlService({
    getSettings: () => ({ enabled: true }),
    platform: 'darwin',
    windowsComAdapter: stubInstalledOfficeAdapter({
      id: 'windows-com',
      available: false,
      apps: [],
      message: 'Windows COM is only available on Windows.',
    }),
    macosAppleEventsAdapter: stubInstalledOfficeAdapter({
      id: 'macos-apple-events',
      available: true,
      apps: ['excel'],
      message: 'Excel Apple Events available.',
    }),
  });

  const result = await service.run('xd.office.status', {});

  assert.equal(result.ok, true);
  assert.equal(
    result.providers?.some((provider) => provider.id === 'windows-com'),
    true,
  );
  assert.equal(
    result.providers?.some((provider) => provider.id === 'macos-apple-events' && provider.available),
    true,
  );
});

test('office service routes installed provider Excel actions by explicit provider and platform default', async () => {
  const calls: OfficeAction[] = [];
  const windowsComAdapter = stubInstalledOfficeAdapter({
    id: 'windows-com',
    available: true,
    apps: ['excel'],
    message: 'Excel COM available.',
    run: async (action) => {
      calls.push(action);
      return ok(action);
    },
  });
  const macosAppleEventsAdapter = stubInstalledOfficeAdapter({
    id: 'macos-apple-events',
    available: true,
    apps: ['excel'],
    message: 'Excel Apple Events available.',
    run: async (action) => {
      calls.push(action);
      return ok(action);
    },
  });

  const windowsService = createOfficeControlService({
    getSettings: () => ({ enabled: true, allowModifyExistingDocuments: true, allowPdfExport: true }),
    platform: 'win32',
    windowsComAdapter,
    macosAppleEventsAdapter,
  });
  const macService = createOfficeControlService({
    getSettings: () => ({ enabled: true, allowModifyExistingDocuments: true, allowPdfExport: true }),
    platform: 'darwin',
    windowsComAdapter,
    macosAppleEventsAdapter,
  });

  const windowsWrite = await windowsService.run('xd.office.excel.writeRange', {
    path: 'C:/work/report.xlsx',
    sheetName: 'Summary',
    startCell: 'A1',
    rows: [['A']],
    save: true,
  });
  const macExport = await macService.run('xd.office.excel.exportPdf', {
    path: '/Users/me/report.xlsx',
    outputPath: '/Users/me/report.pdf',
    provider: 'macos-apple-events',
  });

  assert.equal(windowsWrite.ok, true);
  assert.equal(macExport.ok, true);
  assert.equal(calls[0]?.provider, 'windows-com');
  assert.equal(calls[1]?.provider, 'macos-apple-events');
});

test('office service blocks installed provider writes when settings disallow them', async () => {
  const service = createOfficeControlService({
    getSettings: () => ({ enabled: true, allowModifyExistingDocuments: false }),
    platform: 'win32',
    windowsComAdapter: stubInstalledOfficeAdapter({
      id: 'windows-com',
      available: true,
      apps: ['excel'],
      message: 'Excel COM available.',
    }),
  });

  const result = await service.run('xd.office.excel.writeRange', {
    path: 'C:/work/report.xlsx',
    sheetName: 'Summary',
    startCell: 'A1',
    rows: [['A']],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'modify_existing_disabled');
});

test('office service enforces configured Office read and write cell limits', async () => {
  const service = createOfficeControlService({
    getSettings: () => ({
      enabled: true,
      allowModifyExistingDocuments: true,
      maxReadCells: 4,
      maxWriteCells: 2,
    }),
    platform: 'win32',
    windowsComAdapter: stubInstalledOfficeAdapter({
      id: 'windows-com',
      available: true,
      apps: ['excel'],
      message: 'Excel COM available.',
    }),
  });

  const read = await service.run('xd.office.excel.readRange', {
    provider: 'windows-com',
    path: 'C:/work/report.xlsx',
    sheetName: 'Summary',
    range: 'A1:C2',
  });
  const write = await service.run('xd.office.excel.writeRange', {
    path: 'C:/work/report.xlsx',
    sheetName: 'Summary',
    startCell: 'A1',
    rows: [['A', 'B'], ['C']],
  });

  assert.equal(read.ok, false);
  assert.equal(read.code, 'range_too_large');
  assert.equal(write.ok, false);
  assert.equal(write.code, 'write_too_large');
});

function stubInstalledOfficeAdapter(
  status: OfficeProviderStatus & { run?: (action: OfficeAction) => Promise<OfficeActionResult> },
) {
  return {
    status: async () => status,
    run: status.run ?? (async (action: OfficeAction) => ok(action)),
  };
}

function ok(action: OfficeAction): OfficeActionResult {
  return {
    ok: true,
    action: action.kind,
    documentType: action.documentType,
    provider: action.provider,
    path: action.path,
    message: `${action.kind} ok`,
  };
}
