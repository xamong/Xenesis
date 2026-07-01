import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mainSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');

test('main process normalizes local SQLite settings and bridge URL resolution', () => {
  assert.match(mainSource, /from ['"]\.\/localSqliteServer['"]/);
  assert.match(mainSource, /apiUrl:\s*localSqliteApiUrl\(LOCAL_SQLITE_DEFAULT_PORT\)/);
  assert.match(mainSource, /serverPort:\s*LOCAL_SQLITE_DEFAULT_PORT/);
  assert.match(mainSource, /Object\.assign\(merged,\s*normalizeLocalSqliteServerSettings\(merged\)\)/);
  assert.match(mainSource, /const normalized = normalizeLocalSqliteServerSettings\(settings\)/);
  assert.match(mainSource, /return localSqliteApiUrl\(normalized\.serverPort\)/);
});

test('main process uses packaged-safe internal server launch options and startup condition', () => {
  assert.match(mainSource, /resolveInternalServerLaunchOptions\(\{/);
  assert.match(mainSource, /spawn\(launch\.command,\s*launch\.args,\s*\{/);
  assert.match(mainSource, /const startupSettings = loadSettings\(\)/);
  assert.match(mainSource, /shouldUseInternalSqliteServer\(startupSettings\)/);
});
