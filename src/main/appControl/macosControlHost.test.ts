import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  createMacosControlHostClient,
  type MacosControlHostRunInput,
  resolveMacosControlHostPath,
} from './macosControlHost';

test('resolveMacosControlHostPath prefers packaged resource path when packaged', () => {
  const resourcesPath = path.join('/Applications/Xenesis Desk.app', 'Contents', 'Resources');
  const expected = path.join(resourcesPath, 'macos-control-host', 'xenesis-macos-control-host');

  const resolved = resolveMacosControlHostPath({
    appIsPackaged: true,
    resourcesPath,
    existsSync: (candidate) => candidate === expected,
  });

  assert.equal(resolved, expected);
});

test('resolveMacosControlHostPath returns first existing dev candidate', () => {
  const cwd = path.join('/Users/dev', 'xenesis-desk');
  const expected = path.join(cwd, 'tools', 'macos-control-host', '.build', 'debug', 'xenesis-macos-control-host');

  const resolved = resolveMacosControlHostPath({
    cwd,
    existsSync: (candidate) => candidate === expected,
  });

  assert.equal(resolved, expected);
});

test('macOS control host client sends JSON payloads to the selected helper', async () => {
  const calls: MacosControlHostRunInput[] = [];
  const client = createMacosControlHostClient({
    hostPath: '/tmp/xenesis-macos-control-host',
    runHost: async (input) => {
      calls.push(input);
      return JSON.stringify({
        ok: true,
        action: 'inspect',
        approvalLevel: 'low',
        windows: [],
        message: 'Inspect complete.',
      });
    },
  });

  const result = await client.run({
    action: 'inspect',
    appId: 'textedit',
    bundleId: 'com.apple.TextEdit',
    includeTreePreview: true,
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0]?.hostPath, '/tmp/xenesis-macos-control-host');
  assert.deepEqual(calls[0]?.payload, {
    action: 'inspect',
    target: {
      appId: 'textedit',
      bundleId: 'com.apple.TextEdit',
    },
    options: {
      includeTreePreview: true,
    },
  });
});

test('macOS control host client maps missing helper and invalid JSON to stable failures', async () => {
  const missing = createMacosControlHostClient({
    hostPath: '',
    runHost: async () => {
      throw new Error('must not run');
    },
  });
  const invalid = createMacosControlHostClient({
    hostPath: '/tmp/xenesis-macos-control-host',
    runHost: async () => 'not json',
  });

  const missingResult = await missing.run({ action: 'permissionStatus' });
  const invalidResult = await invalid.run({ action: 'permissionStatus' });

  assert.equal(missingResult.code, 'host_not_found');
  assert.equal(invalidResult.code, 'host_invalid_json');
  assert.match(invalidResult.error || '', /not json/);
});
