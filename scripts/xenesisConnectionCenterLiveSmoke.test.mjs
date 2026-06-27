import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildConnectionCenterLiveSmokeReport,
  CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR,
  CONNECTION_CENTER_LIVE_SMOKE_CHECKS,
  CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST,
  CONNECTION_CENTER_LIVE_SMOKE_SELECTOR_STATE,
  formatConnectionCenterLiveSmokePlan,
} from './xenesisConnectionCenterLiveSmoke.mjs';

test('connection center live smoke opens Settings through CR and checks renderer detail surfaces', () => {
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

  assert.deepEqual(
    CONNECTION_CENTER_LIVE_SMOKE_CHECKS.map((check) => check.id),
    [
      'connection-center-root',
      'connection-center-title',
      'onboarding-guided-steps',
      'provider-profile-review-steps',
      'tool-oauth-review-steps',
      'channel-profile-review-steps',
    ],
  );
  assert.ok(CONNECTION_CENTER_LIVE_SMOKE_CHECKS.every((check) => check.selector || check.text));
  assert.equal(CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR, '.btn-settings');
  assert.equal(CONNECTION_CENTER_LIVE_SMOKE_SELECTOR_STATE, 'attached');

  const plan = formatConnectionCenterLiveSmokePlan();
  assert.match(plan, /xd\.panes\.settings\.open/);
  assert.match(plan, /App shell readiness: \.btn-settings/);
  assert.match(plan, /selector state: attached/);
  assert.match(plan, /data-settings-section="xenesis-connections"/);
  assert.match(plan, /data-xenesis-tool-oauth-draft/);
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
