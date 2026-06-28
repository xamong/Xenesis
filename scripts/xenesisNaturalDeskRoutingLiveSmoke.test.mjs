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
      id: 'onboarding-status',
      prompt: '초기 설정 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.onboarding.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'connection-center-open',
      prompt: 'Connection Center 열어줘',
      expectedPath: 'xd.xenesis.connections.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'hermes-user-stories-guide-open',
      prompt: 'Hermes user stories guide 열어줘',
      expectedPath: 'xd.xenesis.guides.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'openclaw-channel-setup-guide-open',
      prompt: 'OpenClaw channel setup guide 열어줘',
      expectedPath: 'xd.xenesis.guides.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'connection-diagnostics-open',
      prompt: 'Connection diagnostics catalog 열어줘',
      expectedPath: 'xd.xenesis.connections.diagnostics.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'connection-setup-requests-status',
      prompt: 'Connection setup requests catalog 상태 보여줘',
      expectedPath: 'xd.xenesis.connections.setupRequests.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-setup-catalog-open',
      prompt: 'AI provider setup 전체 열어줘',
      expectedPath: 'xd.xenesis.providers.setup.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-profile-draft-status',
      prompt: 'AI provider profile draft 상태 보여줘',
      expectedPath: 'xd.xenesis.providers.profileDrafts.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'notion-connector-open',
      prompt: '노션 connector 열어줘',
      expectedPath: 'xd.xenesis.tools.connectors.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-calendar-oauth-status',
      prompt: '구글 캘린더 OAuth 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.oauthDrafts.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-user-stories-status',
      prompt: '외부 툴 user stories 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.userStories.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-install-plans-open',
      prompt: '외부 툴 install plans catalog 열어줘',
      expectedPath: 'xd.xenesis.tools.installPlans.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-chat-routing-status',
      prompt: '구글 챗 라우팅 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.routing.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-user-stories-status',
      prompt: '외부 채널 user stories catalog 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.userStories.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-profile-draft-status',
      prompt: 'channel profile draft 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.profileDrafts.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'telegram-setup-open',
      prompt: '텔레그램 setup 열어줘',
      expectedPath: 'xd.xenesis.messengers.views.open',
      expectedVisibleText: 'Desk action completed',
    },
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
  assert.match(plan, /Agent reopen: before each prompt/);
  assert.match(plan, /액션 인박스 목록 보여줘/);
  assert.match(plan, /Action Inbox 열어줘/);
  assert.match(plan, /초기 설정 전체 상태 보여줘/);
  assert.match(plan, /Connection Center 열어줘/);
  assert.match(plan, /Hermes user stories guide 열어줘/);
  assert.match(plan, /OpenClaw channel setup guide 열어줘/);
  assert.match(plan, /Connection diagnostics catalog 열어줘/);
  assert.match(plan, /Connection setup requests catalog 상태 보여줘/);
  assert.match(plan, /AI provider setup 전체 열어줘/);
  assert.match(plan, /AI provider profile draft 상태 보여줘/);
  assert.match(plan, /노션 connector 열어줘/);
  assert.match(plan, /구글 캘린더 OAuth 상태 보여줘/);
  assert.match(plan, /외부 툴 user stories 상태 보여줘/);
  assert.match(plan, /외부 툴 install plans catalog 열어줘/);
  assert.match(plan, /구글 챗 라우팅 상태 보여줘/);
  assert.match(plan, /외부 채널 user stories catalog 상태 보여줘/);
  assert.match(plan, /channel profile draft 전체 상태 보여줘/);
  assert.match(plan, /텔레그램 setup 열어줘/);
  assert.match(plan, /xd\.mcp\.actionInbox\.list/);
  assert.match(plan, /xd\.tools\.core\.hermesActionInbox\.open/);
  assert.match(plan, /xd\.xenesis\.onboarding\.status/);
  assert.match(plan, /xd\.xenesis\.connections\.open/);
  assert.match(plan, /xd\.xenesis\.guides\.open/);
  assert.match(plan, /xd\.xenesis\.connections\.diagnostics\.open/);
  assert.match(plan, /xd\.xenesis\.connections\.setupRequests\.status/);
  assert.match(plan, /xd\.xenesis\.providers\.setup\.open/);
  assert.match(plan, /xd\.xenesis\.providers\.profileDrafts\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.connectors\.open/);
  assert.match(plan, /xd\.xenesis\.tools\.oauthDrafts\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.userStories\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.installPlans\.open/);
  assert.match(plan, /xd\.xenesis\.channels\.routing\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.userStories\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.profileDrafts\.status/);
  assert.match(plan, /xd\.xenesis\.messengers\.views\.open/);
});

test('natural Desk routing live smoke builds submit requests that wait for applied CR paths', () => {
  const actionInboxListPrompt = NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS.find(
    (promptCase) => promptCase.id === 'action-inbox-list',
  );
  assert.ok(actionInboxListPrompt);

  const request = buildNaturalDeskRoutingSubmitRequest(actionInboxListPrompt, 42000);

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
