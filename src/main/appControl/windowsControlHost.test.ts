import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  createWindowsControlHostClient,
  resolveWindowsControlHostPath,
  type WindowsControlHostRunInput,
} from './windowsControlHost';

test('resolveWindowsControlHostPath prefers packaged resource path when packaged', () => {
  const resourcesPath = path.join('C:', 'Program Files', 'Xenesis', 'resources');
  const expected = path.join(resourcesPath, 'windows-control-host', 'Xenesis.WindowsControlHost.exe');

  const resolved = resolveWindowsControlHostPath({
    appIsPackaged: true,
    resourcesPath,
    existsSync: (candidate) => candidate === expected,
  });

  assert.equal(resolved, expected);
});

test('resolveWindowsControlHostPath returns first existing dev candidate', () => {
  const cwd = path.join('D:', 'repo');
  const expected = path.join(
    cwd,
    'tools',
    'windows-control-host',
    'bin',
    'Debug',
    'net8.0-windows',
    'win-x64',
    'Xenesis.WindowsControlHost.exe',
  );

  const resolved = resolveWindowsControlHostPath({
    cwd,
    existsSync: (candidate) => candidate === expected,
  });

  assert.equal(resolved, expected);
});

test('Windows control host client builds target and option payloads', async () => {
  const calls: WindowsControlHostRunInput[] = [];
  const client = createWindowsControlHostClient({
    hostPath: 'C:\\Host\\Xenesis.WindowsControlHost.exe',
    timeoutMs: 1234,
    runHost: async (input) => {
      calls.push(input);
      return JSON.stringify({
        ok: true,
        action: 'captureElement',
        approvalLevel: 'low',
        windows: [],
        message: 'Captured.',
      });
    },
  });

  const result = await client.run({
    action: 'captureElement',
    appId: 'notepad',
    executable: 'notepad.exe',
    path: 'C:\\Windows\\notepad.exe',
    processName: 'notepad',
    titleContains: 'Untitled',
    windowId: '1001',
    elementRef: 'uia:button:1',
    x: 10.5,
    y: 20.5,
    depth: 3,
    limit: 50,
    includeValues: true,
    includeFullTree: false,
    includeTreePreview: true,
    durationMs: 700,
    screenshotPath: 'C:\\Temp\\element.png',
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0]?.hostPath, 'C:\\Host\\Xenesis.WindowsControlHost.exe');
  assert.equal(calls[0]?.timeoutMs, 1234);
  assert.deepEqual(calls[0]?.payload, {
    action: 'captureElement',
    target: {
      appId: 'notepad',
      executable: 'notepad.exe',
      path: 'C:\\Windows\\notepad.exe',
      processName: 'notepad',
      titleContains: 'Untitled',
      windowId: '1001',
      elementRef: 'uia:button:1',
      x: 11,
      y: 21,
    },
    options: {
      depth: 3,
      limit: 50,
      includeValues: true,
      includeFullTree: false,
      includeTreePreview: true,
      durationMs: 700,
      screenshotPath: 'C:\\Temp\\element.png',
    },
  });
});

test('Windows control host client maps missing host and invalid JSON to stable failures', async () => {
  const missing = createWindowsControlHostClient({
    hostPath: '',
    runHost: async () => {
      throw new Error('must not run');
    },
  });
  const invalid = createWindowsControlHostClient({
    hostPath: 'C:\\Host\\Xenesis.WindowsControlHost.exe',
    runHost: async () => 'not json',
  });

  const missingResult = await missing.run({ action: 'inspect', appId: 'notepad' });
  const invalidResult = await invalid.run({ action: 'tree', appId: 'notepad' });

  assert.equal(missingResult.code, 'host_not_found');
  assert.equal(invalidResult.code, 'host_invalid_json');
  assert.match(invalidResult.error || '', /not json/);
});
