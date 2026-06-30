import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('capability coverage audit writes exactly one terminal newline to an injected output path', () => {
  const originalAudit = readFileSync('docs/capability-registry-audit.md', 'utf8');
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'xd-capability-coverage-audit-'));
  const auditPath = path.join(tmpDir, 'audit.md');

  const result = spawnSync(process.execPath, ['./scripts/capabilityCoverageAudit.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      XENESIS_CAPABILITY_AUDIT_OUTPUT: auditPath,
    },
    encoding: 'utf8',
  });

  try {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(auditPath), true);

    const markdown = readFileSync(auditPath, 'utf8');
    assert.match(markdown, /\n$/);
    assert.doesNotMatch(markdown, /\n\s*\n$/);

    assert.equal(readFileSync('docs/capability-registry-audit.md', 'utf8'), originalAudit);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
