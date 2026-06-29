import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertConnectionCenterReferenceBaselineChecks,
  buildConnectionCenterLiveSmokeReport,
  CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR,
  CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST,
  CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST,
  CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS,
  formatConnectionCenterLiveSmokePlan,
  normalizeConnectionCenterSnapshotChecks,
} from './xenesisConnectionCenterLiveSmoke.mjs';

test('connection center live smoke opens Connection Center and snapshots it through CR', () => {
  assert.deepEqual(CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST, {
    path: 'xd.xenesis.connections.open',
    source: 'xenesis-connection-center-live-smoke',
    approved: true,
    args: {
      ensureVisible: true,
    },
  });

  assert.deepEqual(CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST, {
    path: 'xd.testing.connectionCenter.snapshot',
    source: 'xenesis-connection-center-live-smoke',
    approved: true,
    args: {
      maxTextLength: 1200,
      timeoutMs: 3000,
    },
  });

  assert.equal(CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR, '.btn-settings');

  const plan = formatConnectionCenterLiveSmokePlan();
  assert.match(plan, /xd\.xenesis\.connections\.open/);
  assert.match(plan, /xd\.testing\.connectionCenter\.snapshot/);
  assert.match(plan, /App shell readiness: \.btn-settings/);
  assert.doesNotMatch(plan, /xd\.panes\.settings\.open/);
  assert.doesNotMatch(plan, /xenesis-connections/);
  assert.doesNotMatch(plan, /selector state: attached/);
});

test('connection center live smoke package script is exposed explicitly', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['smoke:xenesis:connection-center'],
    'node ./scripts/xenesisConnectionCenterLiveSmoke.mjs',
  );
});

test('connection center live smoke requires exact reference baseline check ids', () => {
  assert.deepEqual(CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS, [
    'reference-baseline:connection-center-root',
    'reference-baseline:connection-center-title',
    'reference-baseline:onboarding-guided-steps',
    'reference-baseline:provider-profile-review-steps',
    'reference-baseline:tool-profile-review-steps',
    'reference-baseline:tool-oauth-review-steps',
    'reference-baseline:tool-oauth-runtime-readback',
    'reference-baseline:channel-runtime-readback',
    'reference-baseline:channel-profile-review-steps',
  ]);

  const plan = formatConnectionCenterLiveSmokePlan();
  for (const id of CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS) assert.match(plan, new RegExp(id));

  const mainSource = readFileSync('src/main/index.ts', 'utf8');
  for (const id of CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS) assert.match(mainSource, new RegExp(id));
});

test('connection center live smoke fails when reference baseline checks are missing or failing', () => {
  const passingChecks = CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS.map((id) => ({ id, ok: true }));
  assert.equal(assertConnectionCenterReferenceBaselineChecks(passingChecks), passingChecks);

  assert.throws(
    () => assertConnectionCenterReferenceBaselineChecks(passingChecks.slice(1)),
    /Missing reference baseline checks: reference-baseline:connection-center-root/,
  );

  assert.throws(
    () =>
      assertConnectionCenterReferenceBaselineChecks(
        passingChecks.map((check) =>
          check.id === 'reference-baseline:tool-oauth-review-steps' ? { ...check, ok: false } : check,
        ),
      ),
    /Failing reference baseline checks: reference-baseline:tool-oauth-review-steps/,
  );
});

test('connection center live smoke report summarizes passed and failed checks', () => {
  const report = buildConnectionCenterLiveSmokeReport([
    { id: 'reference-baseline:connection-center-root', ok: true },
    { id: 'reference-baseline:tool-oauth-review-steps', ok: false, error: 'missing selector' },
  ]);

  assert.equal(report.ok, false);
  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.passed, 1);
  assert.equal(report.summary.failed, 1);
  assert.equal(report.checks[1].error, 'missing selector');
});

test('connection center live smoke normalizes CR snapshot checks into report checks', () => {
  const checks = normalizeConnectionCenterSnapshotChecks({
    ok: true,
    result: {
      checks: [
        {
          id: 'reference-baseline:connection-center-root',
          selector: '[data-root]',
          present: true,
          textPresent: true,
        },
        {
          id: 'reference-baseline:tool-oauth-review-steps',
          selector: '[data-tool]',
          expectedText: 'review step',
          present: true,
          textPresent: false,
          text: 'missing',
        },
      ],
    },
  });

  assert.deepEqual(checks, [
    { id: 'reference-baseline:connection-center-root', selector: '[data-root]', ok: true },
    {
      id: 'reference-baseline:tool-oauth-review-steps',
      selector: '[data-tool]',
      text: 'review step',
      ok: false,
      error: 'present=true textPresent=false',
    },
  ]);
});
