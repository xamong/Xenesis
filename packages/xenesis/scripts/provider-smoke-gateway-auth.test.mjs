import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(scriptDir);
const providerSmokeScript = join(scriptDir, 'provider-smoke.mjs');

test('provider smoke defaults to auto provider resolution', () => {
  const source = readFileSync(providerSmokeScript, 'utf8');
  assert.match(source, /process\.env\.XENESIS_PROVIDER \|\| ['"]auto['"]/);
});

test('provider smoke uses connect readiness before live prompt checks', () => {
  const source = readFileSync(providerSmokeScript, 'utf8');
  assert.match(source, /\["--provider", provider, "--model", model, "connect", "check"\]/);
  assert.doesNotMatch(source, /\["--provider", provider, "--model", model, "connect", "check", "--probe"\]/);
});

test('provider smoke authenticates gateway run checks', () => {
  const xenesisHome = mkdtempSync(join(tmpdir(), 'xenesis-provider-smoke-'));
  const result = spawnSync(
    process.execPath,
    [providerSmokeScript, '--mode', 'gateway-auth'],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        XENESIS_HOME: xenesisHome,
        XENESIS_MODEL: 'mock-model',
        XENESIS_PROVIDER: 'mock',
        XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true',
      },
      encoding: 'utf8',
      timeout: 120000,
    },
  );
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  try {
    assert.equal(result.status, 0, output);
    assert.match(output, /provider-smoke: gateway-run ok/);
    assert.match(output, /provider-smoke: gateway-stream ok/);
  } finally {
    rmSync(xenesisHome, { recursive: true, force: true });
  }
});
