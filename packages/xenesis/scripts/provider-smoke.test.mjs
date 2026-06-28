import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), 'provider-smoke.mjs');

test('provider smoke gateway requests use the configured auth token', () => {
  const source = readFileSync(scriptPath, 'utf8');

  assert.match(source, /--auth-token-env/);
  assert.match(source, /XENESIS_PROVIDER_SMOKE_GATEWAY_TOKEN/);
  assert.match(source, /authorization/i);
});
