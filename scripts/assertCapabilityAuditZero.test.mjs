import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  REQUIRED_CAPABILITY_AUDIT_ZERO_COUNTERS,
  assertCapabilityAuditZero,
  parseCapabilityAuditCounters,
} from './assertCapabilityAuditZero.mjs';

const ZERO_AUDIT = `
# Xenesis Desk Capability Registry Audit

## Summary

- Registered nodes: 801
- Callable methods: 497
- Subscribable events: 54
- Coverage path references: 689
- Dispatcher paths: 477
- Missing registered paths: 0
- Missing dispatched coverage paths: 0
- Undispatched static callable methods: 0
- Dispatcher paths missing from tree: 0
`;

test('capability audit zero assertion names all release-gate counters', () => {
  assert.deepEqual(REQUIRED_CAPABILITY_AUDIT_ZERO_COUNTERS, [
    'Missing registered paths',
    'Missing dispatched coverage paths',
    'Undispatched static callable methods',
    'Dispatcher paths missing from tree',
  ]);
});

test('capability audit zero assertion parses generated summary counters', () => {
  const counters = parseCapabilityAuditCounters(ZERO_AUDIT);

  assert.equal(counters.get('Missing registered paths'), 0);
  assert.equal(counters.get('Missing dispatched coverage paths'), 0);
  assert.equal(counters.get('Undispatched static callable methods'), 0);
  assert.equal(counters.get('Dispatcher paths missing from tree'), 0);
});

test('capability audit zero assertion returns verified counters when all gates are zero', () => {
  assert.deepEqual(assertCapabilityAuditZero(ZERO_AUDIT), {
    ok: true,
    counters: {
      'Missing registered paths': 0,
      'Missing dispatched coverage paths': 0,
      'Undispatched static callable methods': 0,
      'Dispatcher paths missing from tree': 0,
    },
  });
});

test('capability audit zero assertion fails on nonzero counters', () => {
  assert.throws(
    () =>
      assertCapabilityAuditZero(
        ZERO_AUDIT.replace('- Missing dispatched coverage paths: 0', '- Missing dispatched coverage paths: 2'),
      ),
    /Missing dispatched coverage paths must be 0, got 2/,
  );
});

test('capability audit zero assertion fails when a required counter is absent', () => {
  assert.throws(
    () => assertCapabilityAuditZero(ZERO_AUDIT.replace('- Dispatcher paths missing from tree: 0', '')),
    /Missing required capability audit counter: Dispatcher paths missing from tree/,
  );
});

test('capability audit zero assertion cli exits nonzero on a failing audit file', () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'xd-capability-audit-zero-'));
  const auditPath = path.join(tmpDir, 'audit.md');

  try {
    writeFileSync(auditPath, ZERO_AUDIT.replace('- Missing registered paths: 0', '- Missing registered paths: 1'));
    const result = spawnSync(process.execPath, ['scripts/assertCapabilityAuditZero.mjs', auditPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing registered paths must be 0, got 1/);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
