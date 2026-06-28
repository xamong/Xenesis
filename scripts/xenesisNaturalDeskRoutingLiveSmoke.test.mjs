import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildNaturalDeskRoutingLiveSmokeEnv,
  buildNaturalDeskRoutingLiveSmokeReport,
  buildNaturalDeskRoutingSubmitRequest,
  formatNaturalDeskRoutingLiveSmokePlan,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_APP_READY_SELECTOR,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_APPROVAL_VISIBLE_TEXT_ALIASES,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS,
  NATURAL_DESK_ROUTING_LIVE_SMOKE_SUBMIT_PATH,
  normalizePromptChecks,
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
      id: 'notion-connection-card-open',
      prompt: '노션 연결 카드 열어줘',
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
      id: 'hermes-task-scenarios-guide-open',
      prompt: 'Hermes task scenarios guide file 열어줘',
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
      id: 'connection-setup-request-approval',
      prompt: '노션 연결해줘',
      expectedPath: 'xd.xenesis.connections.setupRequests.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'provider-setup-catalog-open',
      prompt: 'AI provider setup 전체 열어줘',
      expectedPath: 'xd.xenesis.providers.setup.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-routing-catalog-open',
      prompt: 'AI provider routing 전체 열어줘',
      expectedPath: 'xd.xenesis.providers.routing.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-view-catalog-open',
      prompt: 'AI provider view 전체 열어줘',
      expectedPath: 'xd.xenesis.providers.views.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-runtime-view-section-open',
      prompt: 'codex app-server runtime view 열어줘',
      expectedPath: 'xd.xenesis.providers.views.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-setup-status',
      prompt: 'AI provider setup 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.providers.setup.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-routing-status',
      prompt: 'AI provider routing 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.providers.routing.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-view-status',
      prompt: 'AI provider view 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.providers.views.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-profile-draft-status',
      prompt: 'AI provider profile draft 상태 보여줘',
      expectedPath: 'xd.xenesis.providers.profileDrafts.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'provider-profile-draft-request-approval',
      prompt: 'AI provider 설정해줘',
      expectedPath: 'xd.xenesis.providers.profileDrafts.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'provider-profile-draft-apply-approval',
      prompt: 'AI provider profile draft 적용해줘',
      expectedPath: 'xd.xenesis.providers.profileDrafts.apply',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'provider-setup-plans-status',
      prompt: 'AI provider 설정 플랜 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.providers.setupPlans.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'codex-provider-setup-plan-open',
      prompt: 'codex app-server provider 설정 플랜 열어줘',
      expectedPath: 'xd.xenesis.providers.setupPlans.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'settings-run-model-open',
      prompt: 'AI 모델 설정 열어줘',
      expectedPath: 'xd.panes.settings.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'settings-external-apps-open',
      prompt: '외부 앱 설정 열어줘',
      expectedPath: 'xd.panes.settings.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'settings-connectors-open',
      prompt: 'Connectors 설정 열어줘',
      expectedPath: 'xd.panes.settings.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'settings-workspace-open',
      prompt: '작업공간 설정 열어줘',
      expectedPath: 'xd.panes.settings.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'notion-connector-open',
      prompt: '노션 connector 열어줘',
      expectedPath: 'xd.xenesis.tools.connectors.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-connectors-status',
      prompt: '외부 툴 connector 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.connectors.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-setup-catalog-open',
      prompt: '외부 툴 setup 전체 열어줘',
      expectedPath: 'xd.xenesis.tools.setup.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-setup-status',
      prompt: '외부 툴 setup 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.setup.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-setup-plans-status',
      prompt: '외부 툴 설정 플랜 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.setupPlans.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'notion-tool-setup-plan-open',
      prompt: '노션 외부 도구 설정 플랜 열어줘',
      expectedPath: 'xd.xenesis.tools.setupPlans.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-setup-plans-status',
      prompt: '외부 메신저 설정 플랜 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.setupPlans.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'telegram-channel-setup-plan-open',
      prompt: '텔레그램 채널 설정 플랜 열어줘',
      expectedPath: 'xd.xenesis.channels.setupPlans.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-view-catalog-open',
      prompt: '외부 툴 view 전체 열어줘',
      expectedPath: 'xd.xenesis.tools.views.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-view-status',
      prompt: '외부 툴 view 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.views.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'notion-mcp-template-tool-view-section-open',
      prompt: '노션 MCP 템플릿 뷰 열어줘',
      expectedPath: 'xd.xenesis.tools.views.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-calendar-oauth-tool-view-section-open',
      prompt: '구글 캘린더 OAuth draft view 열어줘',
      expectedPath: 'xd.xenesis.tools.views.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'telegram-routing-messenger-view-section-open',
      prompt: '텔레그램 routing view 열어줘',
      expectedPath: 'xd.xenesis.messengers.views.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'slack-profile-draft-messenger-view-section-open',
      prompt: '슬랙 profile draft view 열어줘',
      expectedPath: 'xd.xenesis.messengers.views.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-calendar-oauth-status',
      prompt: '구글 캘린더 OAuth 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.oauthDrafts.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-calendar-oauth-runtime-status',
      prompt: '구글 캘린더 OAuth runtime 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.oauthRuntime.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'notion-tool-runtime-status',
      prompt: '노션 tool runtime 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.runtime.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-calendar-oauth-setup-packet',
      prompt: '구글 캘린더 OAuth 설정 패킷 보여줘',
      expectedPath: 'xd.xenesis.tools.oauthDrafts.setupPacket',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-calendar-oauth-setup-packet-open',
      prompt: 'google calendar oauth setup packet 열어줘',
      expectedPath: 'xd.xenesis.tools.oauthDrafts.setupPacket.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-workspace-oauth-runtime-open',
      prompt: '구글 워크스페이스 OAuth runtime 열어줘',
      expectedPath: 'xd.xenesis.tools.oauthRuntime.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'github-tool-runtime-open',
      prompt: '깃허브 tool runtime 열어줘',
      expectedPath: 'xd.xenesis.tools.runtime.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-mcp-install-drafts-status',
      prompt: '외부 툴 MCP 설치 초안 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.mcpInstallDrafts.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-mcp-install-drafts-open',
      prompt: '외부 툴 MCP 설치 초안 전체 열어줘',
      expectedPath: 'xd.xenesis.tools.mcpInstallDrafts.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-mcp-install-draft-request-approval',
      prompt: '노션 MCP 설치해줘',
      expectedPath: 'xd.xenesis.tools.mcpInstallDrafts.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'tool-mcp-install-draft-apply-approval',
      prompt: '노션 MCP 설치 적용해줘',
      expectedPath: 'xd.xenesis.tools.mcpInstallDrafts.apply',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'linear-mcp-oauth-status',
      prompt: '리니어 mcp oauth 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.mcpOAuth.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'linear-mcp-oauth-open',
      prompt: 'linear mcp oauth 열어줘',
      expectedPath: 'xd.xenesis.tools.mcpOAuth.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'linear-mcp-oauth-request-approval',
      prompt: '리니어 mcp oauth 검토 요청해줘',
      expectedPath: 'xd.xenesis.tools.mcpOAuth.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'google-calendar-oauth-runtime-request-approval',
      prompt: '구글 캘린더 OAuth runtime 검토 요청해줘',
      expectedPath: 'xd.xenesis.tools.oauthRuntime.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'google-calendar-tool-runtime-request-approval',
      prompt: '구글 캘린더 tool runtime 검토 요청해줘',
      expectedPath: 'xd.xenesis.tools.runtime.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'tool-action-policy-status',
      prompt: '외부 툴 action policy catalog 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.actions.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-action-policy-open',
      prompt: '외부 툴 액션 정책 전체 열어줘',
      expectedPath: 'xd.xenesis.tools.actions.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-action-policy-request-approval',
      prompt: '리니어 액션 정책 검토 요청해줘',
      expectedPath: 'xd.xenesis.tools.actions.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'tool-user-stories-status',
      prompt: '외부 툴 user stories 상태 보여줘',
      expectedPath: 'xd.xenesis.tools.userStories.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-user-story-workflow-preview',
      prompt: '노션 user story workflow preview 해줘',
      expectedPath: 'xd.automation.workflow.preview',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'hermes-task-scenarios-guide-status',
      prompt: '헤르메스 작업 시나리오 가이드 상태 보여줘',
      expectedPath: 'xd.xenesis.guides.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-install-plans-open',
      prompt: '외부 툴 install plans catalog 열어줘',
      expectedPath: 'xd.xenesis.tools.installPlans.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'tool-install-plan-request-approval',
      prompt: '노션 설치 계획 검토 요청해줘',
      expectedPath: 'xd.xenesis.tools.installPlans.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'connection-setup-apply-approval',
      prompt: '노션 연결 설정 적용해줘',
      expectedPath: 'xd.xenesis.connections.setupRequests.apply',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'tool-oauth-draft-request-approval',
      prompt: '구글 캘린더 OAuth 인증해줘',
      expectedPath: 'xd.xenesis.tools.oauthDrafts.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'google-chat-routing-status',
      prompt: '구글 챗 라우팅 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.routing.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-routing-catalog-open',
      prompt: '외부 메신저 라우팅 전체 열어줘',
      expectedPath: 'xd.xenesis.channels.routing.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-safety-status',
      prompt: '외부 채널 safety catalog 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.safety.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-safety-catalog-open',
      prompt: '외부 메신저 안전 전체 열어줘',
      expectedPath: 'xd.xenesis.channels.safety.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-access-groups-status',
      prompt: '외부 채널 access groups catalog 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.accessGroups.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-access-groups-catalog-open',
      prompt: '외부 메신저 접근 그룹 전체 열어줘',
      expectedPath: 'xd.xenesis.channels.accessGroups.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-pairing-status',
      prompt: '외부 채널 pairing catalog 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.pairing.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-pairing-catalog-open',
      prompt: '외부 메신저 페어링 전체 열어줘',
      expectedPath: 'xd.xenesis.channels.pairing.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'google-chat-runtime-status',
      prompt: '구글 챗 runtime 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.runtime.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'telegram-runtime-open',
      prompt: '텔레그램 channel runtime 열어줘',
      expectedPath: 'xd.xenesis.channels.runtime.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-user-stories-status',
      prompt: '외부 채널 user stories catalog 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.userStories.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-user-story-workflow-preview',
      prompt: '텔레그램 사용자 스토리 워크플로 미리보기 해줘',
      expectedPath: 'xd.automation.workflow.preview',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-profile-draft-status',
      prompt: 'channel profile draft 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.channels.profileDrafts.status',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'channel-profile-draft-request-approval',
      prompt: '텔레그램 채널 프로필 검토 요청해줘',
      expectedPath: 'xd.xenesis.channels.profileDrafts.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'channel-profile-draft-apply-approval',
      prompt: '텔레그램 채널 설정 적용해줘',
      expectedPath: 'xd.xenesis.channels.profileDrafts.apply',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'channel-test-send-approval',
      prompt: '텔레그램 테스트 메시지 보내줘',
      expectedPath: 'xd.xenesis.profiles.testChannel',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'whatsapp-runtime-request-approval',
      prompt: '왓츠앱 runtime 검토 요청해줘',
      expectedPath: 'xd.xenesis.channels.runtime.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      id: 'messenger-view-catalog-open',
      prompt: '외부 메신저 view 전체 열어줘',
      expectedPath: 'xd.xenesis.messengers.views.open',
      expectedVisibleText: 'Desk action completed',
    },
    {
      id: 'messenger-view-status',
      prompt: '외부 메신저 setup 전체 상태 보여줘',
      expectedPath: 'xd.xenesis.messengers.views.status',
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
  assert.match(plan, /노션 연결해줘/);
  assert.match(plan, /AI provider setup 전체 열어줘/);
  assert.match(plan, /AI provider routing 전체 열어줘/);
  assert.match(plan, /AI provider view 전체 열어줘/);
  assert.match(plan, /AI provider setup 전체 상태 보여줘/);
  assert.match(plan, /AI provider routing 전체 상태 보여줘/);
  assert.match(plan, /AI provider view 전체 상태 보여줘/);
  assert.match(plan, /AI provider profile draft 상태 보여줘/);
  assert.match(plan, /AI provider 설정해줘/);
  assert.match(plan, /AI provider profile draft 적용해줘/);
  assert.match(plan, /노션 connector 열어줘/);
  assert.match(plan, /외부 툴 connector 전체 상태 보여줘/);
  assert.match(plan, /외부 툴 setup 전체 열어줘/);
  assert.match(plan, /외부 툴 setup 전체 상태 보여줘/);
  assert.match(plan, /외부 툴 view 전체 열어줘/);
  assert.match(plan, /외부 툴 view 전체 상태 보여줘/);
  assert.match(plan, /구글 캘린더 OAuth 상태 보여줘/);
  assert.match(plan, /외부 툴 MCP 설치 초안 전체 상태 보여줘/);
  assert.match(plan, /외부 툴 MCP 설치 초안 전체 열어줘/);
  assert.match(plan, /노션 MCP 설치해줘/);
  assert.match(plan, /외부 툴 action policy catalog 상태 보여줘/);
  assert.match(plan, /외부 툴 액션 정책 전체 열어줘/);
  assert.match(plan, /리니어 액션 정책 검토 요청해줘/);
  assert.match(plan, /외부 툴 user stories 상태 보여줘/);
  assert.match(plan, /외부 툴 install plans catalog 열어줘/);
  assert.match(plan, /노션 설치 계획 검토 요청해줘/);
  assert.match(plan, /노션 연결 설정 적용해줘/);
  assert.match(plan, /구글 캘린더 OAuth 인증해줘/);
  assert.match(plan, /구글 챗 라우팅 상태 보여줘/);
  assert.match(plan, /외부 메신저 라우팅 전체 열어줘/);
  assert.match(plan, /외부 채널 safety catalog 상태 보여줘/);
  assert.match(plan, /외부 메신저 안전 전체 열어줘/);
  assert.match(plan, /외부 채널 access groups catalog 상태 보여줘/);
  assert.match(plan, /외부 메신저 접근 그룹 전체 열어줘/);
  assert.match(plan, /외부 채널 pairing catalog 상태 보여줘/);
  assert.match(plan, /외부 메신저 페어링 전체 열어줘/);
  assert.match(plan, /외부 채널 user stories catalog 상태 보여줘/);
  assert.match(plan, /channel profile draft 전체 상태 보여줘/);
  assert.match(plan, /텔레그램 채널 프로필 검토 요청해줘/);
  assert.match(plan, /외부 메신저 view 전체 열어줘/);
  assert.match(plan, /외부 메신저 setup 전체 상태 보여줘/);
  assert.match(plan, /텔레그램 setup 열어줘/);
  assert.match(plan, /xd\.mcp\.actionInbox\.list/);
  assert.match(plan, /xd\.tools\.core\.hermesActionInbox\.open/);
  assert.match(plan, /xd\.xenesis\.onboarding\.status/);
  assert.match(plan, /xd\.xenesis\.connections\.open/);
  assert.match(plan, /xd\.xenesis\.guides\.open/);
  assert.match(plan, /xd\.xenesis\.connections\.diagnostics\.open/);
  assert.match(plan, /xd\.xenesis\.connections\.setupRequests\.status/);
  assert.match(plan, /xd\.xenesis\.connections\.setupRequests\.request/);
  assert.match(plan, /xd\.xenesis\.providers\.setup\.open/);
  assert.match(plan, /xd\.xenesis\.providers\.routing\.open/);
  assert.match(plan, /xd\.xenesis\.providers\.views\.open/);
  assert.match(plan, /xd\.xenesis\.providers\.setup\.status/);
  assert.match(plan, /xd\.xenesis\.providers\.routing\.status/);
  assert.match(plan, /xd\.xenesis\.providers\.views\.status/);
  assert.match(plan, /xd\.xenesis\.providers\.profileDrafts\.status/);
  assert.match(plan, /xd\.xenesis\.providers\.profileDrafts\.request/);
  assert.match(plan, /xd\.xenesis\.tools\.connectors\.open/);
  assert.match(plan, /xd\.xenesis\.tools\.connectors\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.setup\.open/);
  assert.match(plan, /xd\.xenesis\.tools\.setup\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.views\.open/);
  assert.match(plan, /xd\.xenesis\.tools\.views\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.oauthDrafts\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.oauthDrafts\.setupPacket/);
  assert.match(plan, /xd\.xenesis\.tools\.mcpInstallDrafts\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.mcpInstallDrafts\.open/);
  assert.match(plan, /xd\.xenesis\.tools\.mcpInstallDrafts\.request/);
  assert.match(plan, /xd\.xenesis\.tools\.actions\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.actions\.open/);
  assert.match(plan, /xd\.xenesis\.tools\.actions\.request/);
  assert.match(plan, /xd\.xenesis\.tools\.userStories\.status/);
  assert.match(plan, /xd\.xenesis\.tools\.installPlans\.open/);
  assert.match(plan, /xd\.xenesis\.tools\.installPlans\.request/);
  assert.match(plan, /xd\.xenesis\.connections\.setupRequests\.apply/);
  assert.match(plan, /xd\.xenesis\.tools\.oauthDrafts\.request/);
  assert.match(plan, /xd\.xenesis\.channels\.routing\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.routing\.open/);
  assert.match(plan, /xd\.xenesis\.channels\.safety\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.safety\.open/);
  assert.match(plan, /xd\.xenesis\.channels\.accessGroups\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.accessGroups\.open/);
  assert.match(plan, /xd\.xenesis\.channels\.pairing\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.pairing\.open/);
  assert.match(plan, /xd\.xenesis\.channels\.userStories\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.profileDrafts\.status/);
  assert.match(plan, /xd\.xenesis\.channels\.profileDrafts\.request/);
  assert.match(plan, /xd\.xenesis\.channels\.profileDrafts\.apply/);
  assert.match(plan, /xd\.xenesis\.messengers\.views\.open/);
  assert.match(plan, /xd\.xenesis\.messengers\.views\.status/);
  assert.match(plan, /Desk action approval required/);
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

test('natural Desk routing live smoke builds isolated state env', () => {
  assert.deepEqual(
    buildNaturalDeskRoutingLiveSmokeEnv(
      { PATH: 'test-path', XENIS_HOME: 'old-home' },
      'C:\\tmp\\xd-routing-home',
      'C:\\tmp\\xd-routing-user-data',
    ),
    {
      PATH: 'test-path',
      XENIS_HOME: 'C:\\tmp\\xd-routing-home',
      XENESIS_DESK_USER_DATA_DIR: 'C:\\tmp\\xd-routing-user-data',
      XENESIS_NATURAL_DESK_ROUTING_LIVE_SMOKE: '1',
    },
  );
});

test('natural Desk routing live smoke treats inline approval card text as approval visible evidence', () => {
  assert.ok(NATURAL_DESK_ROUTING_LIVE_SMOKE_APPROVAL_VISIBLE_TEXT_ALIASES.includes('승인 대기'));

  const checks = normalizePromptChecks(
    {
      id: 'tool-mcp-install-draft-request-approval',
      prompt: '노션 MCP 설치해줘',
      expectedPath: 'xd.xenesis.tools.mcpInstallDrafts.request',
      expectedVisibleText: 'Desk action approval required',
    },
    {
      ok: true,
      result: {
        ok: true,
        submitted: true,
        matchedExpectedText: true,
        expectedText: 'xd.xenesis.tools.mcpInstallDrafts.request',
        bodyTextTail:
          'xd.xenesis.tools.mcpInstallDrafts.request\nCAPABILITY REGISTRY\n승인 대기\n승인 후 실행\n항상 승인\n취소',
      },
    },
  );

  assert.equal(checks.find((check) => check.id.endsWith(':path'))?.ok, true);
  assert.equal(checks.find((check) => check.id.endsWith(':visible-text'))?.ok, true);
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
