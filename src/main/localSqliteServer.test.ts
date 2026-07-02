import assert from 'node:assert/strict';
import test from 'node:test';
import {
  localSqliteApiUrl,
  normalizeLocalSqliteServerSettings,
  resolveInternalServerLaunchOptions,
  shouldUseInternalSqliteServer,
} from './localSqliteServer';

test('historical remote default migrates to the bundled local SQLite server', () => {
  const settings = normalizeLocalSqliteServerSettings({
    apiUrl: 'https://ai.xamong.com',
    devMode: false,
    serverPort: 3001,
  });

  assert.equal(settings.apiUrl, 'http://localhost:3001');
  assert.equal(settings.devMode, true);
});

test('custom remote API URL is preserved for users who explicitly configured it', () => {
  const settings = normalizeLocalSqliteServerSettings({
    apiUrl: 'https://meta.example.com',
    devMode: false,
    serverPort: 3001,
  });

  assert.equal(settings.apiUrl, 'https://meta.example.com');
  assert.equal(settings.devMode, false);
});

test('internal server auto-starts for local API URLs or local server mode', () => {
  assert.equal(
    shouldUseInternalSqliteServer({ apiUrl: 'http://localhost:4500', devMode: false, serverPort: 4500 }),
    true,
  );
  assert.equal(
    shouldUseInternalSqliteServer({ apiUrl: 'https://meta.example.com', devMode: true, serverPort: 3001 }),
    true,
  );
  assert.equal(
    shouldUseInternalSqliteServer({ apiUrl: 'https://meta.example.com', devMode: false, serverPort: 3001 }),
    false,
  );
});

test('packaged server launch uses Electron as Node without requiring system Node.js', () => {
  const launch = resolveInternalServerLaunchOptions({
    isPackaged: true,
    platform: 'win32',
    electronExecPath: 'C:\\Program Files\\Xenesis Desk\\Xenesis Desk.exe',
    scriptPath: 'C:\\Program Files\\Xenesis Desk\\resources\\app.asar.unpacked\\server\\index.js',
    port: 4555,
    baseEnv: { PATH: 'C:\\Windows\\System32' },
  });

  assert.equal(launch.command, 'C:\\Program Files\\Xenesis Desk\\Xenesis Desk.exe');
  assert.deepEqual(launch.args, ['C:\\Program Files\\Xenesis Desk\\resources\\app.asar.unpacked\\server\\index.js']);
  assert.equal(launch.cwd, 'C:\\Program Files\\Xenesis Desk\\resources\\app.asar.unpacked\\server');
  assert.equal(launch.env.PORT, '4555');
  assert.equal(launch.env.ELECTRON_RUN_AS_NODE, '1');
});

test('development server launch keeps system Node.js', () => {
  const launch = resolveInternalServerLaunchOptions({
    isPackaged: false,
    platform: 'linux',
    electronExecPath: '/opt/Xenesis Desk/xenesis-desk',
    scriptPath: '/workspace/xenesis-desk/server/index.js',
    port: 3001,
    baseEnv: { ELECTRON_RUN_AS_NODE: '1' },
  });

  assert.equal(localSqliteApiUrl(3001), 'http://localhost:3001');
  assert.equal(launch.command, 'node');
  assert.deepEqual(launch.args, ['/workspace/xenesis-desk/server/index.js']);
  assert.equal(launch.env.PORT, '3001');
  assert.equal(launch.env.ELECTRON_RUN_AS_NODE, undefined);
});
