import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('capability coverage audit fails on every CR completeness counter', () => {
  const source = fs.readFileSync(path.join(import.meta.dirname, 'capabilityCoverageAudit.mjs'), 'utf8');
  const hasFailuresLine = source.match(/const hasFailures\s*=\s*([\s\S]*?);/);

  assert.ok(hasFailuresLine, 'hasFailures declaration is present');
  assert.match(hasFailuresLine[1], /audit\.missingRegistered\.length > 0/);
  assert.match(hasFailuresLine[1], /audit\.missingDispatched\.length > 0/);
  assert.match(hasFailuresLine[1], /audit\.undispatchedCallable\.length > 0/);
  assert.match(hasFailuresLine[1], /audit\.dispatchMissingTree\.length > 0/);
});
