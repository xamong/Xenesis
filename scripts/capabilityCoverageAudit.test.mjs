import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('capability coverage audit writes exactly one terminal newline', () => {
  const result = spawnSync(process.execPath, ['./scripts/capabilityCoverageAudit.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const markdown = readFileSync('docs/capability-registry-audit.md', 'utf8');
  assert.match(markdown, /\n$/);
  assert.doesNotMatch(markdown, /\n\s*\n$/);
});
