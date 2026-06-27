import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildNaturalDeskRoutingLiveSmokeReport,
  buildNaturalDeskRoutingSubmitRequest,
  formatNaturalDeskRoutingLiveSmokePlan,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_APP_READY_SELECTOR,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_SUBMIT_PATH,
} from './xenesisNaturalDeskRoutingLiveSmoke.mjs';

test('natural Desk routing live smoke opens Agent and submits natural prompts through CR', () => {
  assert.deepEqual(NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST, {
    path: 'xd.tools.core.xenesisAgent.open',
    source: 'xenesis-natural-desk-routing-live-smoke',
    approved: true,
    args: {
      placement: 'tab',
    },
  });

  assert.equal(NATURAL_DESK_ROUTING_LIVE_SMOKE_SUBMIT_PATH, 'xd.testing.xenesisAgent.submitPrompt');
  assert.equal(NATURAL_DESK_ROUTING_LIVE_SMOKE_APP_READY_SELECTOR, '.btn-settings');

  assert.deepEqual(NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS, [
    {
      id: 'action-inbox-list',
      prompt: '액션 인박스 목록 보여줘',
      expectedPath: 'xd.mcp.actionInbox.list',
      expectedVisibleText: 'Action Inbox 목록을 조회합니다.',
    },
    {
      id: 'action-inbox-open',
      prompt: 'Action Inbox 열어줘',
      expectedPath: 'xd.tools.core.hermesActionInbox.open',
      expectedVisibleText: 'Desk action completed',
    },
  ]);

  const plan = formatNaturalDeskRoutingLiveSmokePlan();
  assert.match(plan, /xd\.tools\.core\.xenesisAgent\.open/);
  assert.match(plan, /xd\.testing\.xenesisAgent\.submitPrompt/);
  assert.match(plan, /액션 인박스 목록 보여줘/);
  assert.match(plan, /Action Inbox 열어줘/);
  assert.match(plan, /xd\.mcp\.actionInbox\.list/);
  assert.match(plan, /xd\.tools\.core\.hermesActionInbox\.open/);
});

test('natural Desk routing live smoke builds submit requests that wait for applied CR paths', () => {
  const request = buildNaturalDeskRoutingSubmitRequest(NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS[0], 42000);

  assert.deepEqual(request, {
    path: 'xd.testing.xenesisAgent.submitPrompt',
    source: 'xenesis-natural-desk-routing-live-smoke',
    approved: true,
    args: {
      prompt: '액션 인박스 목록 보여줘',
      expectedText: 'xd.mcp.actionInbox.list',
      expectedTextScope: 'anywhere',
      bypassNaturalDeskRouting: false,
      timeoutMs: 42000,
    },
  });
});

test('natural Desk routing live smoke package script is exposed explicitly', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['smoke:xenesis:natural-desk-routing'],
    'node ./scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs',
  );
});

test('natural Desk routing live smoke report summarizes prompt path and text checks', () => {
  const report = buildNaturalDeskRoutingLiveSmokeReport([
    { id: 'agent-open', ok: true },
    { id: 'action-inbox-list:path', ok: true, prompt: '액션 인박스 목록 보여줘' },
    {
      id: 'action-inbox-open:visible-text',
      ok: false,
      prompt: 'Action Inbox 열어줘',
      error: 'missing visible text',
    },
  ]);

  assert.equal(report.ok, false);
  assert.equal(report.summary.total, 3);
  assert.equal(report.summary.passed, 2);
  assert.equal(report.summary.failed, 1);
  assert.equal(report.checks[1].prompt, '액션 인박스 목록 보여줘');
  assert.equal(report.checks[2].error, 'missing visible text');
});
