import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(scriptDir);
const providerSmokeScript = join(scriptDir, 'provider-smoke.mjs');

test('provider smoke authenticates gateway run checks', () => {
  const xenesisHome = mkdtempSync(join(tmpdir(), 'xenesis-provider-smoke-'));
  const result = spawnSync(process.execPath, [providerSmokeScript], {
    cwd: packageRoot,
    env: {
      ...process.env,
      XENESIS_HOME: xenesisHome,
      XENESIS_MODEL: 'mock-model',
      XENESIS_PROVIDER: 'mock',
    },
    encoding: 'utf8',
    timeout: 120000,
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  try {
    assert.equal(result.status, 0, output);
    assert.match(output, /provider-smoke: gateway-run ok/);
    assert.match(output, /provider-smoke: gateway-stream ok/);
  } finally {
    rmSync(xenesisHome, { recursive: true, force: true });
  }
});
