#!/usr/bin/env node
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const NATURAL_DESK_ROUTING_LIVE_SMOKE_TIMEOUT_MS = 30000;
export const NATURAL_DESK_ROUTING_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const NATURAL_DESK_ROUTING_LIVE_SMOKE_SOURCE = 'xenesis-natural-desk-routing-live-smoke';
export const NATURAL_DESK_ROUTING_LIVE_SMOKE_SUBMIT_PATH = 'xd.testing.xenesisAgent.submitPrompt';

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
    id: 'google-calendar-oauth-status',
    prompt: '구글 캘린더 OAuth 상태 보여줘',
    expectedPath: 'xd.xenesis.tools.oauthDrafts.status',
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
    id: 'channel-profile-draft-request-approval',
    prompt: '텔레그램 채널 프로필 검토 요청해줘',
    expectedPath: 'xd.xenesis.channels.profileDrafts.request',
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

function normalizePromptChecks(promptCase, capabilityResult) {
  const result = unwrapCapabilityResult(capabilityResult);
  const text = collectResultText(result);
  const capabilityOk = capabilityResult?.ok === true;
  const resultOk = result.ok !== false;
  const submitted = result.submitted === true || Number(result.newLineCount || 0) > 0;
  const pathMatched =
    result.matchedExpectedText === true ||
    result.expectedText === promptCase.expectedPath ||
    text.includes(promptCase.expectedPath);
  const visibleTextMatched = text.includes(promptCase.expectedVisibleText);

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
  let electronApp;

  await assertBuiltElectronOutput(root);

  const { _electron } = await import('playwright');
  try {
    electronApp = await _electron.launch({
      args: [appPath, '--disable-gpu'],
      cwd: root,
      timeout,
      env: {
        ...process.env,
        XENESIS_NATURAL_DESK_ROUTING_LIVE_SMOKE: '1',
      },
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
  }

  return buildNaturalDeskRoutingLiveSmokeReport(checkResults, startedAt, {
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
