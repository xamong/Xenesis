#!/usr/bin/env node
import { access, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const NATURAL_DESK_ROUTING_LIVE_SMOKE_TIMEOUT_MS = 30000;
export const NATURAL_DESK_ROUTING_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const NATURAL_DESK_ROUTING_LIVE_SMOKE_SOURCE = 'xenesis-natural-desk-routing-live-smoke';
export const NATURAL_DESK_ROUTING_LIVE_SMOKE_SUBMIT_PATH = 'xd.testing.xenesisAgent.submitPrompt';
export const NATURAL_DESK_ROUTING_LIVE_SMOKE_APPROVAL_VISIBLE_TEXT_ALIASES = [
  'Desk action approval required',
  '승인 대기',
  '승인 후 실행',
];

export const NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST = {
  path: 'xd.tools.core.xenesisAgent.open',
  source: NATURAL_DESK_ROUTING_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {
    placement: 'tab',
  },
};

export const NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS = [
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
];

export function buildNaturalDeskRoutingSubmitRequest(
  promptCase,
  timeoutMs = NATURAL_DESK_ROUTING_LIVE_SMOKE_TIMEOUT_MS,
) {
  return {
    path: NATURAL_DESK_ROUTING_LIVE_SMOKE_SUBMIT_PATH,
    source: NATURAL_DESK_ROUTING_LIVE_SMOKE_SOURCE,
    approved: true,
    args: {
      prompt: promptCase.prompt,
      expectedText: promptCase.expectedPath,
      expectedTextScope: 'anywhere',
      bypassNaturalDeskRouting: false,
      timeoutMs,
    },
  };
}

export function buildNaturalDeskRoutingLiveSmokeEnv(baseEnv, xenisHome, userDataDir) {
  return {
    ...baseEnv,
    XENIS_HOME: xenisHome,
    XENESIS_DESK_USER_DATA_DIR: userDataDir,
    XENESIS_NATURAL_DESK_ROUTING_LIVE_SMOKE: '1',
  };
}

export function formatNaturalDeskRoutingLiveSmokePlan() {
  const lines = [
    'Xenesis natural Desk routing live smoke plan',
    `CR open path: ${NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST.path}`,
    `CR open args: ${JSON.stringify(NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST.args)}`,
    `CR submit path: ${NATURAL_DESK_ROUTING_LIVE_SMOKE_SUBMIT_PATH}`,
    'Agent reopen: before each prompt',
    `App shell readiness: ${NATURAL_DESK_ROUTING_LIVE_SMOKE_APP_READY_SELECTOR}`,
    'Natural prompts:',
  ];

  for (const promptCase of NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS) {
    lines.push(`- ${promptCase.prompt} -> ${promptCase.expectedPath} (${promptCase.expectedVisibleText})`);
  }

  return lines.join('\n');
}

export function buildNaturalDeskRoutingLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map((check) => ({
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.label ? { label: String(check.label) } : {}),
    ...(check.prompt ? { prompt: String(check.prompt) } : {}),
    ...(check.expectedPath ? { expectedPath: String(check.expectedPath) } : {}),
    ...(check.text ? { text: String(check.text) } : {}),
    ...(check.error ? { error: String(check.error) } : {}),
  }));
  const passed = normalizedChecks.filter((check) => check.ok).length;
  const failed = normalizedChecks.length - passed;

  return {
    ok: failed === 0,
    createdAt: startedAt.toISOString(),
    summary: {
      total: normalizedChecks.length,
      passed,
      failed,
    },
    checks: normalizedChecks,
    ...extra,
  };
}

function unwrapCapabilityResult(capabilityResult) {
  if (capabilityResult?.result && typeof capabilityResult.result === 'object') {
    return capabilityResult.result;
  }
  return capabilityResult || {};
}

function collectResultText(result) {
  return [
    result.responseTextPreview,
    result.bodyTextPreview,
    result.bodyTextTail,
    result.artifactStatusLine,
    result.artifactDiagnosticSummary,
    result.expectedText,
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join('\n');
}

function visibleTextMatches(promptCase, text) {
  if (text.includes(promptCase.expectedVisibleText)) return true;
  if (promptCase.expectedVisibleText !== 'Desk action approval required') return false;
  return NATURAL_DESK_ROUTING_LIVE_SMOKE_APPROVAL_VISIBLE_TEXT_ALIASES.some((alias) => text.includes(alias));
}

export function normalizePromptChecks(promptCase, capabilityResult) {
  const result = unwrapCapabilityResult(capabilityResult);
  const text = collectResultText(result);
  const capabilityOk = capabilityResult?.ok === true;
  const resultOk = result.ok !== false;
  const submitted = result.submitted === true || Number(result.newLineCount || 0) > 0;
  const pathMatched =
    result.matchedExpectedText === true ||
    result.expectedText === promptCase.expectedPath ||
    text.includes(promptCase.expectedPath);
  const visibleTextMatched = visibleTextMatches(promptCase, text);

  return [
    {
      id: `${promptCase.id}:path`,
      ok: capabilityOk && resultOk && submitted && pathMatched,
      prompt: promptCase.prompt,
      expectedPath: promptCase.expectedPath,
      ...(!(capabilityOk && resultOk && submitted && pathMatched)
        ? {
            error:
              capabilityResult?.error ||
              result.error ||
              `submitted=${submitted} pathMatched=${pathMatched} matchedExpectedText=${result.matchedExpectedText}`,
          }
        : {}),
    },
    {
      id: `${promptCase.id}:visible-text`,
      ok: capabilityOk && resultOk && submitted && visibleTextMatched,
      prompt: promptCase.prompt,
      text: promptCase.expectedVisibleText,
      ...(!(capabilityOk && resultOk && submitted && visibleTextMatched)
        ? {
            error:
              capabilityResult?.error ||
              result.error ||
              `submitted=${submitted} visibleTextMatched=${visibleTextMatched}`,
          }
        : {}),
    },
  ];
}

async function assertBuiltElectronOutput(root) {
  const requiredPaths = [path.join(root, 'out', 'main', 'index.js'), path.join(root, 'out', 'renderer', 'index.html')];
  for (const requiredPath of requiredPaths) {
    try {
      await access(requiredPath);
    } catch {
      throw new Error(`Missing built Electron output: ${path.relative(root, requiredPath)}. Run npm run build first.`);
    }
  }
}

async function waitForAppShellReady(page, timeout) {
  await page.waitForSelector(NATURAL_DESK_ROUTING_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(globalThis.deskBridgeAPI?.callCapability), undefined, { timeout });
}

export async function runNaturalDeskRoutingLiveSmoke(options = {}) {
  const timeout = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : NATURAL_DESK_ROUTING_LIVE_SMOKE_TIMEOUT_MS;
  const root = path.resolve(options.repoRoot ?? repoRoot);
  const appPath = path.resolve(options.appPath ?? process.env.XENESIS_NATURAL_DESK_ROUTING_ELECTRON_APP ?? root);
  const startedAt = new Date();
  const checkResults = [];
  const openResults = [];
  const promptResults = [];
  const xenisHome =
    typeof options.xenisHome === 'string' && options.xenisHome.trim()
      ? path.resolve(options.xenisHome)
      : await mkdtemp(path.join(os.tmpdir(), 'xenesis-natural-desk-routing-'));
  const userDataDir =
    typeof options.userDataDir === 'string' && options.userDataDir.trim()
      ? path.resolve(options.userDataDir)
      : await mkdtemp(path.join(os.tmpdir(), 'xenesis-natural-desk-routing-user-data-'));
  const shouldRemoveXenisHome = options.keepXenisHome === true ? false : !options.xenisHome;
  const shouldRemoveUserDataDir = options.keepUserDataDir === true ? false : !options.userDataDir;
  let electronApp;

  await assertBuiltElectronOutput(root);

  const { _electron } = await import('playwright');
  try {
    electronApp = await _electron.launch({
      args: [appPath, '--disable-gpu'],
      cwd: root,
      timeout,
      env: buildNaturalDeskRoutingLiveSmokeEnv(process.env, xenisHome, userDataDir),
    });

    const page = await electronApp.firstWindow({ timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    await waitForAppShellReady(page, timeout);

    for (const promptCase of NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS) {
      const openResult = await page.evaluate((request) => globalThis.deskBridgeAPI.callCapability(request), {
        ...NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST,
      });
      const openOk = openResult?.ok === true;
      openResults.push({ id: promptCase.id, ok: openOk });
      checkResults.push({
        id: `${promptCase.id}:agent-open`,
        ok: openOk,
        expectedPath: NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST.path,
        ...(!openOk ? { error: openResult?.error || JSON.stringify(openResult) } : {}),
      });
      if (!openOk) continue;

      const submitRequest = buildNaturalDeskRoutingSubmitRequest(promptCase, timeout);
      const submitResult = await page.evaluate(
        (request) => globalThis.deskBridgeAPI.callCapability(request),
        submitRequest,
      );
      promptResults.push({
        id: promptCase.id,
        path: promptCase.expectedPath,
        ok: Boolean(submitResult?.ok && unwrapCapabilityResult(submitResult).ok !== false),
      });
      checkResults.push(...normalizePromptChecks(promptCase, submitResult));
    }
  } finally {
    if (electronApp) {
      await electronApp.close().catch(() => undefined);
    }
    if (shouldRemoveXenisHome) {
      await rm(xenisHome, { recursive: true, force: true }).catch(() => undefined);
    }
    if (shouldRemoveUserDataDir) {
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  return buildNaturalDeskRoutingLiveSmokeReport(checkResults, startedAt, {
    xenisHome: shouldRemoveXenisHome ? '<temp-removed>' : xenisHome,
    userDataDir: shouldRemoveUserDataDir ? '<temp-removed>' : userDataDir,
    open: {
      path: NATURAL_DESK_ROUTING_LIVE_SMOKE_OPEN_REQUEST.path,
      ok: openResults.length > 0 && openResults.every((result) => result.ok),
      prompts: openResults,
    },
    prompts: promptResults,
  });
}

function parseCliArgs(argv) {
  const args = {
    json: false,
    plan: false,
    timeoutMs: NATURAL_DESK_ROUTING_LIVE_SMOKE_TIMEOUT_MS,
  };

  for (const arg of argv) {
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--plan') {
      args.plan = true;
      continue;
    }
    if (arg.startsWith('--timeout=')) {
      args.timeoutMs = Number(arg.slice('--timeout='.length));
    }
  }

  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.plan) {
    console.log(formatNaturalDeskRoutingLiveSmokePlan());
    return;
  }

  const report = await runNaturalDeskRoutingLiveSmoke({ timeoutMs: args.timeoutMs });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `xenesis-natural-desk-routing-live-smoke: ${report.ok ? 'passed' : 'failed'} ${report.summary.passed}/${report.summary.total}`,
    );
    for (const check of report.checks) {
      console.log(
        `xenesis-natural-desk-routing-live-smoke: ${check.id} ${check.ok ? 'passed' : `failed - ${check.error}`}`,
      );
    }
  }
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(
      `xenesis-natural-desk-routing-live-smoke: failed - ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  });
}
