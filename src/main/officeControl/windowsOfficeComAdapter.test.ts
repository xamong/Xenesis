import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { OfficeActionResult } from '../../shared/officeControl';
import {
  createWindowsOfficeComAdapter,
  resolveWindowsOfficeControlHostPath,
  type WindowsOfficeControlHostRunInput,
} from './windowsOfficeComAdapter';

test('resolveWindowsOfficeControlHostPath prefers packaged resource path when packaged', () => {
  const resourcesPath = path.join('C:', 'Program Files', 'Xenesis', 'resources');
  const expected = path.join(resourcesPath, 'office-control-host', 'Xenesis.OfficeControlHost.exe');

  const resolved = resolveWindowsOfficeControlHostPath({
    appIsPackaged: true,
    resourcesPath,
    existsSync: (candidate) => candidate === expected,
  });

  assert.equal(resolved, expected);
});

test('resolveWindowsOfficeControlHostPath returns first existing dev candidate', () => {
  const cwd = path.join('D:', 'repo');
  const releaseCandidate = path.join(
    cwd,
    'tools',
    'office-control-host',
    'bin',
    'Release',
    'net8.0-windows',
    'win-x64',
    'Xenesis.OfficeControlHost.exe',
  );

  const resolved = resolveWindowsOfficeControlHostPath({
    cwd,
    existsSync: (candidate) => candidate === releaseCandidate,
  });

  assert.equal(resolved, releaseCandidate);
});

test('Windows Office COM adapter sends typed host payloads and preserves successful results', async () => {
  const calls: WindowsOfficeControlHostRunInput[] = [];
  const adapter = createWindowsOfficeComAdapter({
    hostPath: 'C:\\Host\\Xenesis.OfficeControlHost.exe',
    runHost: async (input) => {
      calls.push(input);
      return JSON.stringify({
        ok: true,
        action: 'excel.writeRange',
        documentType: 'excel',
        provider: 'windows-com',
        path: 'C:\\work\\report.xlsx',
        message: 'Excel range written.',
      } satisfies OfficeActionResult);
    },
  });

  const result = await adapter.run({
    kind: 'excel.writeRange',
    documentType: 'excel',
    provider: 'windows-com',
    path: 'C:\\work\\report.xlsx',
    sheetName: 'Summary',
    startCell: 'B2',
    rows: [
      ['Name', 'Value'],
      ['A', 1],
    ],
    save: true,
    sheets: [],
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'windows-com');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.payload, {
    action: 'excel.writeRange',
    provider: 'windows-com',
    documentType: 'excel',
    path: 'C:\\work\\report.xlsx',
    outputPath: undefined,
    overwrite: false,
    visible: false,
    readOnly: false,
    reuseExisting: false,
    save: true,
    sheetName: 'Summary',
    range: undefined,
    startCell: 'B2',
    rows: [
      ['Name', 'Value'],
      ['A', 1],
    ],
    saveAsPath: undefined,
  });
});

test('Windows Office COM adapter maps missing host to unavailable provider status and host_not_found action result', async () => {
  let called = false;
  const adapter = createWindowsOfficeComAdapter({
    hostPath: '',
    runHost: async () => {
      called = true;
      return '{}';
    },
  });

  const status = await adapter.status();
  const result = await adapter.run({
    kind: 'excel.openWorkbook',
    documentType: 'excel',
    provider: 'windows-com',
    path: 'C:\\work\\report.xlsx',
    sheets: [],
    rows: [],
  });

  assert.equal(called, false);
  assert.equal(status.available, false);
  assert.equal(status.id, 'windows-com');
  assert.equal(result.ok, false);
  assert.equal(result.code, 'host_not_found');
});

test('Windows Office COM adapter maps invalid host JSON to stable failure', async () => {
  const adapter = createWindowsOfficeComAdapter({
    hostPath: 'C:\\Host\\Xenesis.OfficeControlHost.exe',
    runHost: async () => 'not json',
  });

  const result = await adapter.run({
    kind: 'excel.exportPdf',
    documentType: 'excel',
    provider: 'windows-com',
    path: 'C:\\work\\report.xlsx',
    outputPath: 'C:\\work\\report.pdf',
    sheets: [],
    rows: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.action, 'excel.exportPdf');
  assert.equal(result.code, 'host_invalid_json');
});

test('Windows Office COM adapter default resolution uses packaged resources when packaged', async () => {
  const resourcesPath = fs.mkdtempSync(path.join(os.tmpdir(), 'xenesis-office-host-resources-'));
  const hostPath = path.join(resourcesPath, 'office-control-host', 'Xenesis.OfficeControlHost.exe');
  fs.mkdirSync(path.dirname(hostPath), { recursive: true });
  fs.writeFileSync(hostPath, '');
  const calls: WindowsOfficeControlHostRunInput[] = [];

  try {
    const adapter = createWindowsOfficeComAdapter({
      appIsPackaged: true,
      resourcesPath,
      runHost: async (input) => {
        calls.push(input);
        return JSON.stringify({
          ok: true,
          action: 'status',
          providers: [{ id: 'windows-com', available: true, apps: ['excel'] }],
          message: 'Office status read.',
        });
      },
    });

    const status = await adapter.status();

    assert.equal(status.available, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.hostPath, hostPath);
  } finally {
    fs.rmSync(resourcesPath, { recursive: true, force: true });
  }
});
