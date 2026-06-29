import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(scriptDir);

test('provider Desk MCP prompt smoke proves natural prompt reaches provider with CR tools', () => {
  const result = spawnSync('npm', ['run', 'provider:desk-mcp-prompt-smoke', '--silent'], {
    cwd: packageRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 120000,
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  assert.equal(result.status, 0, output);
  const report = JSON.parse(result.stdout.trim());
  assert.equal(report.ok, true);
  assert.equal(report.summary.failed, 0);
  assert(report.checks.some((check) => check.id === 'stdin-natural-prompt' && check.ok));
  assert(report.checks.some((check) => check.id === 'stdin-cr-mcp-tools' && check.ok));
  assert(report.checks.some((check) => check.id === 'metadata-mcp-configured' && check.ok));
});
