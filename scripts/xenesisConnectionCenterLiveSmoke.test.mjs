import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildConnectionCenterLiveSmokeReport,
  CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR,
  CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST,
  CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST,
  formatConnectionCenterLiveSmokePlan,
  normalizeConnectionCenterSnapshotChecks,
} from './xenesisConnectionCenterLiveSmoke.mjs';

test('connection center live smoke opens Settings and snapshots Connection Center through CR', () => {
  assert.deepEqual(CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST, {
    path: 'xd.panes.settings.open',
    source: 'xenesis-connection-center-live-smoke',
    approved: true,
    args: {
      category: 'xenesis-agent',
      mode: 'connections',
      section: 'xenesis-connections',
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
  assert.match(plan, /xd\.panes\.settings\.open/);
  assert.match(plan, /xd\.testing\.connectionCenter\.snapshot/);
  assert.match(plan, /App shell readiness: \.btn-settings/);
  assert.doesNotMatch(plan, /selector state: attached/);
});

test('connection center live smoke package script is exposed explicitly', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['smoke:xenesis:connection-center'],
    'node ./scripts/xenesisConnectionCenterLiveSmoke.mjs',
  );
});

test('connection center live smoke report summarizes passed and failed checks', () => {
  const report = buildConnectionCenterLiveSmokeReport([
    { id: 'connection-center-root', ok: true },
    { id: 'tool-oauth-review-steps', ok: false, error: 'missing selector' },
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
        { id: 'connection-center-root', selector: '[data-root]', present: true, textPresent: true },
        {
          id: 'tool-oauth-review-steps',
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
    { id: 'connection-center-root', selector: '[data-root]', ok: true },
    {
      id: 'tool-oauth-review-steps',
      selector: '[data-tool]',
      text: 'review step',
      ok: false,
      error: 'present=true textPresent=false',
    },
  ]);
});
