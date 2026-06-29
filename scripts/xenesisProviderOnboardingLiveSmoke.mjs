#!/usr/bin/env node
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const PROVIDER_ONBOARDING_LIVE_SMOKE_TIMEOUT_MS = 30000;
export const PROVIDER_ONBOARDING_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const PROVIDER_ONBOARDING_LIVE_SMOKE_SOURCE = 'xenesis-provider-onboarding-live-smoke';
export const PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT =
  '프로바이더 라우팅 상태를 추측하지 말고 CR로 확인한 뒤 마지막 줄에 provider-routing-readback-ok라고 써줘';
const XENESIS_AGENT_STATE_STORAGE_KEY = 'xenesis:xenesis-agent-state:v1';

export const PROVIDER_ONBOARDING_LIVE_SMOKE_OPEN_REQUEST = {
  path: 'xd.tools.core.xenesisAgent.open',
  source: PROVIDER_ONBOARDING_LIVE_SMOKE_SOURCE,
  approved: true,
  args: { placement: 'tab' },
};

export const PROVIDER_ONBOARDING_LIVE_SMOKE_STATUS_REQUEST = {
  path: 'xd.xenesis.status',
  source: PROVIDER_ONBOARDING_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {},
};

export const PROVIDER_ONBOARDING_LIVE_SMOKE_SUBMIT_REQUEST = {
  path: 'xd.testing.xenesisAgent.submitPrompt',
  source: PROVIDER_ONBOARDING_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {
    prompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
    expectedText: 'provider-routing-readback-ok',
    expectedTextScope: 'newResponse',
    timeoutMs: PROVIDER_ONBOARDING_LIVE_SMOKE_TIMEOUT_MS,
    progressIntervalMs: 1000,
    progressSampleLimit: 30,
    bypassDirectDeskRouting: true,
  },
};

function unwrapCapabilityResult(capabilityResult) {
  if (capabilityResult?.result && typeof capabilityResult.result === 'object') return capabilityResult.result;
  return capabilityResult || {};
}

function collectResultText(result) {
  const unwrapped = unwrapCapabilityResult(result);
  const progressText = Array.isArray(unwrapped.progressSamples)
    ? unwrapped.progressSamples.flatMap((sample) => [
        sample?.lastLineText,
        sample?.lastAssistantText,
        sample?.lastSystemText,
      ])
    : [];
  const rawStreamText = Array.isArray(unwrapped.rawStream)
    ? unwrapped.rawStream.flatMap((entry) => {
        const kind = typeof entry?.kind === 'string' ? entry.kind : '';
        const summary = typeof entry?.summary === 'string' ? entry.summary : '';
        const detail = typeof entry?.detail === 'string' ? entry.detail : '';
        return /^(?:desk_)?tool_(?:call|result)$|^mcp_/i.test(kind) ? [kind, summary, detail] : [kind, summary];
      })
    : [];
  const providerRawToolText = Array.isArray(unwrapped.rawStream)
    ? unwrapped.rawStream.flatMap((entry) => providerRawToolEvidenceTextFromDetail(entry?.detail))
    : [];
  return [
    unwrapped.responseTextPreview,
    unwrapped.bodyTextPreview,
    unwrapped.bodyTextTail,
    unwrapped.workLogText,
    unwrapped.artifactStatusLine,
    unwrapped.expectedText,
    result?.responseTextPreview,
    result?.workLogText,
    ...progressText,
    ...rawStreamText,
    ...providerRawToolText,
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join('\n');
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function providerRawRecordsFromRaw(raw) {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (isRecord(raw) && Array.isArray(raw.records)) return raw.records.filter(isRecord);
  return [];
}

function collectProviderRawRecords(value, out = [], depth = 0) {
  if (depth > 6 || value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectProviderRawRecords(item, out, depth + 1);
    return out;
  }
  if (!isRecord(value)) return out;
  const providerMetadata = isRecord(value.providerMetadata) ? value.providerMetadata : undefined;
  const cliMetadata = isRecord(providerMetadata?.cli) ? providerMetadata.cli : undefined;
  if (cliMetadata && Object.hasOwn(cliMetadata, 'raw')) {
    out.push(...providerRawRecordsFromRaw(cliMetadata.raw));
  }
  for (const key of ['message', 'data', 'result', 'events', 'messages']) {
    collectProviderRawRecords(value[key], out, depth + 1);
  }
  return out;
}

function providerRawRecordLooksLikeDeskToolCall(record) {
  const method = typeof record.method === 'string' ? record.method : '';
  const params = isRecord(record.params) ? record.params : undefined;
  const item = isRecord(params?.item) ? params.item : undefined;
  const itemType = typeof item?.type === 'string' ? item.type : '';
  const itemName = typeof item?.name === 'string' ? item.name : '';
  const text = JSON.stringify({
    method,
    itemType,
    itemName,
    name: typeof params?.name === 'string' ? params.name : undefined,
    toolName: typeof params?.toolName === 'string' ? params.toolName : undefined,
    path: firstCrPathInProviderRawRecord(record),
  });
  return (
    providerRawRecordIsCompleted(record) &&
    /tool|mcp|item/i.test(`${method} ${itemType}`) &&
    /xenesis_desk_(?:call_capability|capabilities|capability)|desk_call_capability|xd\./i.test(text)
  );
}

function providerRawRecordIsCompleted(record) {
  const method = typeof record.method === 'string' ? record.method : '';
  const params = isRecord(record.params) ? record.params : undefined;
  const item = isRecord(params?.item) ? params.item : undefined;
  const statusText = [
    typeof record.status === 'string' ? record.status : '',
    typeof params?.status === 'string' ? params.status : '',
    typeof item?.status === 'string' ? item.status : '',
  ].join(' ');
  return (
    /(?:item\/completed|tool.*(?:result|completed)|mcp.*(?:result|completed))/i.test(method) ||
    /(?:completed|result|success)/i.test(statusText)
  );
}

function firstCrPathInProviderRawRecord(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    for (const item of value) {
      const pathValue = firstCrPathInProviderRawRecord(item, depth + 1);
      if (pathValue) return pathValue;
    }
    return '';
  }
  if (!isRecord(value)) return '';
  for (const [key, entryValue] of Object.entries(value)) {
    if (key === 'path' && typeof entryValue === 'string' && /^(?:xd\.|desk_|xenesis_desk_)/.test(entryValue)) {
      return entryValue;
    }
    if (typeof entryValue === 'string' && entryValue.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(entryValue);
        const pathValue = firstCrPathInProviderRawRecord(parsed, depth + 1);
        if (pathValue) return pathValue;
      } catch {
        // Non-JSON strings are ignored; diagnostics must stay best-effort and redacted.
      }
    }
    const pathValue = firstCrPathInProviderRawRecord(entryValue, depth + 1);
    if (pathValue) return pathValue;
  }
  return '';
}

function summarizeProviderRawRecord(record) {
  const params = isRecord(record.params) ? record.params : undefined;
  const item = isRecord(params?.item) ? params.item : undefined;
  const summary = {
    method: typeof record.method === 'string' ? record.method : '',
    itemType: typeof item?.type === 'string' ? item.type : '',
    itemName: typeof item?.name === 'string' ? item.name : '',
    name: typeof params?.name === 'string' ? params.name : '',
    toolName: typeof params?.toolName === 'string' ? params.toolName : '',
    path: firstCrPathInProviderRawRecord(record),
    looksLikeDeskToolCall: providerRawRecordLooksLikeDeskToolCall(record),
  };
  return Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== '' && value !== false));
}

export function providerRawRecordSummariesFromDetail(detail) {
  if (typeof detail !== 'string' || !detail.trim()) return [];
  try {
    return collectProviderRawRecords(JSON.parse(detail)).map(summarizeProviderRawRecord);
  } catch {
    return [];
  }
}

function providerRawToolEvidenceTextFromDetail(detail) {
  if (typeof detail !== 'string' || !detail.trim()) return [];
  try {
    const parsed = JSON.parse(detail);
    return collectProviderRawRecords(parsed)
      .filter(providerRawRecordLooksLikeDeskToolCall)
      .map((record) => `provider_raw_tool_call: ${JSON.stringify(record).slice(0, 2000)}`);
  } catch {
    return [];
  }
}

function normalizeCheck(check) {
  return {
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.prompt ? { prompt: String(check.prompt) } : {}),
    ...(check.expectedPath ? { expectedPath: String(check.expectedPath) } : {}),
    ...(check.text ? { text: String(check.text) } : {}),
    ...(check.error ? { error: String(check.error) } : {}),
  };
}

function providerRuntimeFromStatus(statusResult) {
  const unwrapped = unwrapCapabilityResult(statusResult);
  return unwrapped.status?.providerRuntime || unwrapped.providerRuntime || null;
}

function hasCrMcpToolEvidence(submitResult) {
  const unwrapped = unwrapCapabilityResult(submitResult);
  const rawStream = Array.isArray(unwrapped.rawStream) ? unwrapped.rawStream : [];
  return rawStream.some((entry) => providerRawToolEvidenceTextFromDetail(entry?.detail).length > 0);
}

function hasProviderDeskMcpRecovery(submitResult) {
  const unwrapped = unwrapCapabilityResult(submitResult);
  const rawStream = Array.isArray(unwrapped.rawStream) ? unwrapped.rawStream : [];
  return rawStream.some((entry) => {
    const kind = typeof entry?.kind === 'string' ? entry.kind : '';
    const summary = typeof entry?.summary === 'string' ? entry.summary : '';
    return (
      kind === 'provider_progress' && /requesting Desk CR MCP tool-call evidence before final answer/i.test(summary)
    );
  });
}

function hasChatOnlyApprovalText(submitResult) {
  return /approval request:\s*|approvalRequired\s*=\s*true|actionInboxItem\./i.test(collectResultText(submitResult));
}

function submitDiagnostics(submitResult) {
  const unwrapped = unwrapCapabilityResult(submitResult);
  const rawStream = Array.isArray(unwrapped.rawStream) ? unwrapped.rawStream : [];
  const providerRawRecordSummaries = rawStream
    .flatMap((entry) => providerRawRecordSummariesFromDetail(entry?.detail))
    .slice(0, 30);
  return {
    ok: submitResult?.ok === true,
    matchedExpectedText: unwrapped.matchedExpectedText === true,
    responseTextPreview: String(unwrapped.responseTextPreview || '').slice(0, 1000),
    lastProgress: unwrapped.lastProgress || null,
    providerRawRecordSummaries,
    rawStream: rawStream.slice(0, 12).map((entry) => ({
      kind: typeof entry?.kind === 'string' ? entry.kind : '',
      summary: typeof entry?.summary === 'string' ? entry.summary.slice(0, 500) : '',
      providerRawRecordSummaries: providerRawRecordSummariesFromDetail(entry?.detail).slice(0, 12),
    })),
  };
}

export function buildProviderOnboardingReportChecks({
  naturalPrompt,
  providerRuntime,
  footerProvider,
  submitResult,
  crReadbackAfterPrompt,
}) {
  const readbackRuntime = crReadbackAfterPrompt?.providerRuntime || null;
  const runtimeProvider = providerRuntime?.provider || '';
  const runtimeSource = providerRuntime?.source || '';
  const runtimeProcessModel = providerRuntime?.processModel || '';
  const crEvidence = hasCrMcpToolEvidence(submitResult);
  const providerDeskMcpRecovery = hasProviderDeskMcpRecovery(submitResult);
  const readbackMatches =
    Boolean(readbackRuntime?.provider) &&
    readbackRuntime.provider === runtimeProvider &&
    (!runtimeSource || readbackRuntime.source === runtimeSource) &&
    (!runtimeProcessModel || readbackRuntime.processModel === runtimeProcessModel);
  const chatOnlyApprovalText = hasChatOnlyApprovalText(submitResult);

  return [
    {
      id: 'natural-prompt-submitted',
      ok: naturalPrompt === PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
      prompt: naturalPrompt,
      ...(!(naturalPrompt === PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT)
        ? { error: 'Natural prompt did not match smoke contract.' }
        : {}),
    },
    {
      id: 'status-readback-provider',
      ok: Boolean(runtimeProvider),
      text: runtimeProvider,
      ...(!runtimeProvider ? { error: 'Missing providerRuntime.provider readback.' } : {}),
    },
    {
      id: 'status-readback-source',
      ok: Boolean(runtimeSource),
      text: runtimeSource,
      ...(!runtimeSource ? { error: 'Missing providerRuntime.source readback.' } : {}),
    },
    {
      id: 'status-readback-process-model',
      ok: Boolean(runtimeProcessModel),
      text: runtimeProcessModel,
      ...(!runtimeProcessModel ? { error: 'Missing providerRuntime.processModel readback.' } : {}),
    },
    {
      id: 'footer-provider',
      ok: Boolean(footerProvider) && Boolean(runtimeProvider) && String(footerProvider).includes(runtimeProvider),
      text: String(footerProvider || ''),
      ...(!(Boolean(footerProvider) && Boolean(runtimeProvider) && String(footerProvider).includes(runtimeProvider))
        ? { error: `Footer provider ${footerProvider || '<missing>'} did not match ${runtimeProvider || '<missing>'}.` }
        : {}),
    },
    {
      id: 'provider-cr-mcp-evidence',
      ok: crEvidence,
      ...(!crEvidence ? { error: 'No CR/MCP tool-call evidence was found in the provider turn.' } : {}),
    },
    {
      id: 'provider-cr-mcp-evidence-not-recovered',
      ok: !providerDeskMcpRecovery,
      ...(providerDeskMcpRecovery
        ? { error: 'CR/MCP evidence was collected only after deterministic provider evidence recovery.' }
        : {}),
    },
    {
      id: 'cr-readback-after-prompt',
      ok: readbackMatches,
      text: readbackRuntime?.provider || '',
      ...(!readbackMatches ? { error: 'CR readback after prompt did not match provider runtime metadata.' } : {}),
    },
    {
      id: 'no-chat-only-approval',
      ok: !chatOnlyApprovalText,
      ...(chatOnlyApprovalText
        ? { error: 'Provider turn exposed chat-only approval internals instead of product-language approval state.' }
        : {}),
    },
  ];
}

export function buildProviderOnboardingLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map(normalizeCheck);
  const passed = normalizedChecks.filter((check) => check.ok).length;
  const failed = normalizedChecks.length - passed;
  const providerEvidence = {
    hasCrMcpToolEvidence: extra.providerEvidence?.hasCrMcpToolEvidence === true,
    hasCrReadbackAfterPrompt: extra.providerEvidence?.hasCrReadbackAfterPrompt === true,
    usedProviderDeskMcpRecovery:
      extra.providerEvidence?.usedProviderDeskMcpRecovery === true ||
      extra.providerEvidence?.hasProviderDeskMcpRecovery === true,
  };

  return {
    ...extra,
    ok: failed === 0,
    createdAt: startedAt.toISOString(),
    providerNaturalLanguageToolSelectionProof:
      providerEvidence.hasCrMcpToolEvidence &&
      providerEvidence.hasCrReadbackAfterPrompt &&
      !providerEvidence.usedProviderDeskMcpRecovery,
    providerEvidence,
    summary: {
      total: normalizedChecks.length,
      passed,
      failed,
    },
    checks: normalizedChecks,
  };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function buildProviderOnboardingFailureReport(error, startedAt = new Date(), extra = {}) {
  const message = errorMessage(error);
  return buildProviderOnboardingLiveSmokeReport(
    [
      {
        id: 'provider-runtime-safe-for-reasoning',
        ok: false,
        error: message,
      },
    ],
    startedAt,
    {
      ...extra,
      error: message,
      diagnostics: [message],
      providerEvidence: {
        hasCrMcpToolEvidence: false,
        hasCrReadbackAfterPrompt: false,
        usedProviderDeskMcpRecovery: false,
      },
    },
  );
}

export function buildProviderOnboardingCliFailure(error, args = {}, startedAt = new Date()) {
  const report = buildProviderOnboardingFailureReport(error, startedAt);
  if (args.json) {
    return {
      stream: 'stdout',
      text: JSON.stringify(report, null, 2),
      report,
    };
  }
  return {
    stream: 'stderr',
    text: `xenesis-provider-onboarding-live-smoke: failed - ${errorMessage(error)}`,
    report,
  };
}

export function formatProviderOnboardingLiveSmokePlan() {
  return [
    'Xenesis provider onboarding live smoke plan',
    `Natural prompt: ${PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT}`,
    'Provider natural-language CR tool-selection proof: false until completed provider CR/MCP evidence is observed without deterministic recovery',
    `CR open path: ${PROVIDER_ONBOARDING_LIVE_SMOKE_OPEN_REQUEST.path}`,
    `CR submit path: ${PROVIDER_ONBOARDING_LIVE_SMOKE_SUBMIT_REQUEST.path}`,
    `CR status path: ${PROVIDER_ONBOARDING_LIVE_SMOKE_STATUS_REQUEST.path}`,
    `App shell readiness: ${PROVIDER_ONBOARDING_LIVE_SMOKE_APP_READY_SELECTOR}`,
    'Required checks: provider readback, footer provider, CR/MCP tool evidence, post-prompt CR readback',
  ].join('\n');
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
  await page.waitForSelector(PROVIDER_ONBOARDING_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(globalThis.deskBridgeAPI?.callCapability), undefined, { timeout });
}

async function readFooterProvider(page) {
  return page
    .evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.xd-xenesis-terminal-statusbar *'));
      const providerNode = nodes.find((node) => /provider|프로바이더/i.test(node.textContent || ''));
      return providerNode?.textContent?.replace(/^.*?:\s*/, '').trim() || '';
    })
    .catch(() => '');
}

async function readXenesisAgentRawStreamSnapshot(page) {
  return page
    .evaluate(async (storageKey) => {
      const sanitizeEntry = (entry) => ({
        agentId: typeof entry?.agentId === 'string' ? entry.agentId : '',
        id: typeof entry?.id === 'string' ? entry.id : '',
        kind: typeof entry?.kind === 'string' ? entry.kind : '',
        summary: typeof entry?.summary === 'string' ? entry.summary : '',
        detail: typeof entry?.detail === 'string' ? entry.detail : '',
      });
      const bridge = window.__xenesisDeskAgentBridge;
      const agents = typeof bridge?.listAgents === 'function' ? bridge.listAgents() : [];
      const diagnostics = {
        bridgePresent: Boolean(bridge),
        hasListAgentRawEvents: typeof bridge?.listAgentRawEvents === 'function',
        agentCount: agents.length,
        agents: agents.map((agent) => ({
          agentId: typeof agent?.agentId === 'string' ? agent.agentId : '',
          title: typeof agent?.title === 'string' ? agent.title : '',
          status: typeof agent?.status === 'string' ? agent.status : '',
          running: agent?.running === true,
        })),
        rawEventCounts: [],
        source: 'bridge',
      };
      if (agents.length > 0 && typeof bridge?.listAgentRawEvents === 'function') {
        const rawEvents = [];
        for (const agent of agents) {
          if (!agent?.agentId) continue;
          const result = await bridge.listAgentRawEvents(agent.agentId, { limit: 100 });
          const events = result?.ok && Array.isArray(result.events) ? result.events : [];
          diagnostics.rawEventCounts.push({ agentId: agent.agentId, count: events.length });
          rawEvents.push(...events.map(sanitizeEntry));
        }
        return { entries: rawEvents, diagnostics };
      }
      try {
        const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) || '{}');
        const entries = Array.isArray(parsed.rawStream) ? parsed.rawStream.slice(0, 120).map(sanitizeEntry) : [];
        return {
          entries,
          diagnostics: {
            ...diagnostics,
            source: 'sessionStorage',
            rawEventCounts: [{ agentId: 'sessionStorage', count: entries.length }],
          },
        };
      } catch {
        return { entries: [], diagnostics: { ...diagnostics, source: 'none' } };
      }
    }, XENESIS_AGENT_STATE_STORAGE_KEY)
    .catch((error) => ({
      entries: [],
      diagnostics: {
        bridgePresent: false,
        hasListAgentRawEvents: false,
        agentCount: 0,
        agents: [],
        rawEventCounts: [],
        source: 'error',
        error: error instanceof Error ? error.message : String(error),
      },
    }));
}

function newRawStreamEntries(beforeEntries, afterEntries) {
  const entryKey = (entry) => `${entry.agentId || ''}:${entry.id || ''}`;
  const beforeIds = new Set(beforeEntries.map(entryKey).filter((key) => key !== ':'));
  return afterEntries.filter((entry) => {
    const key = entryKey(entry);
    return key === ':' || !beforeIds.has(key);
  });
}

function attachRawStreamToSubmitResult(submitResult, rawStream) {
  if (submitResult?.result && typeof submitResult.result === 'object') {
    return {
      ...submitResult,
      result: {
        ...submitResult.result,
        rawStream,
      },
    };
  }
  return {
    ...submitResult,
    rawStream,
  };
}

export async function runProviderOnboardingLiveSmoke(options = {}) {
  const timeout = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : PROVIDER_ONBOARDING_LIVE_SMOKE_TIMEOUT_MS;
  const root = path.resolve(options.repoRoot ?? repoRoot);
  const appPath = path.resolve(options.appPath ?? process.env.XENESIS_PROVIDER_ONBOARDING_ELECTRON_APP ?? root);
  const startedAt = new Date();
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
        XENESIS_PROVIDER_ONBOARDING_LIVE_SMOKE: '1',
      },
    });

    const page = await electronApp.firstWindow({ timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    await waitForAppShellReady(page, timeout);
    const callCapability = (request) =>
      page.evaluate((innerRequest) => globalThis.deskBridgeAPI.callCapability(innerRequest), request);

    const openResult = await callCapability({ ...PROVIDER_ONBOARDING_LIVE_SMOKE_OPEN_REQUEST });
    if (openResult?.ok !== true)
      throw new Error(`Agent pane open failed: ${openResult?.error || JSON.stringify(openResult)}`);

    const statusResult = await callCapability({ ...PROVIDER_ONBOARDING_LIVE_SMOKE_STATUS_REQUEST });
    const providerRuntime = providerRuntimeFromStatus(statusResult);
    if (providerRuntime?.safeForReasoning === false) {
      throw new Error(
        `Missing provider credentials or unsafe provider runtime: ${(providerRuntime.diagnostics || []).join('; ')}`,
      );
    }

    const footerProvider = await readFooterProvider(page);
    const rawStreamBeforePrompt = await readXenesisAgentRawStreamSnapshot(page);
    const submitResult = await callCapability({
      ...PROVIDER_ONBOARDING_LIVE_SMOKE_SUBMIT_REQUEST,
      args: { ...PROVIDER_ONBOARDING_LIVE_SMOKE_SUBMIT_REQUEST.args, timeoutMs: timeout },
    });
    const rawStreamAfterPrompt = await readXenesisAgentRawStreamSnapshot(page);
    const submitResultWithRawStream = attachRawStreamToSubmitResult(
      submitResult,
      newRawStreamEntries(rawStreamBeforePrompt.entries, rawStreamAfterPrompt.entries),
    );
    const afterStatusResult = await callCapability({ ...PROVIDER_ONBOARDING_LIVE_SMOKE_STATUS_REQUEST });
    const crReadbackAfterPrompt = { providerRuntime: providerRuntimeFromStatus(afterStatusResult) };
    const checks = buildProviderOnboardingReportChecks({
      naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
      providerRuntime,
      footerProvider,
      submitResult: submitResultWithRawStream,
      crReadbackAfterPrompt,
    });
    const providerEvidence = {
      hasCrMcpToolEvidence: checks.find((check) => check.id === 'provider-cr-mcp-evidence')?.ok === true,
      hasCrReadbackAfterPrompt: checks.find((check) => check.id === 'cr-readback-after-prompt')?.ok === true,
      usedProviderDeskMcpRecovery:
        checks.find((check) => check.id === 'provider-cr-mcp-evidence-not-recovered')?.ok === false,
    };

    return buildProviderOnboardingLiveSmokeReport(checks, startedAt, {
      naturalPrompt: PROVIDER_ONBOARDING_LIVE_SMOKE_NATURAL_PROMPT,
      providerRuntime,
      footerProvider,
      providerEvidence,
      submit: submitDiagnostics(submitResultWithRawStream),
      rawStreamDiagnostics: {
        before: rawStreamBeforePrompt.diagnostics,
        after: rawStreamAfterPrompt.diagnostics,
      },
      status: { path: PROVIDER_ONBOARDING_LIVE_SMOKE_STATUS_REQUEST.path, ok: statusResult?.ok === true },
    });
  } finally {
    if (electronApp) await electronApp.close().catch(() => undefined);
  }
}

function parseCliArgs(argv) {
  const args = {
    json: false,
    plan: false,
    timeoutMs: PROVIDER_ONBOARDING_LIVE_SMOKE_TIMEOUT_MS,
  };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    else if (arg === '--plan') args.plan = true;
    else if (arg.startsWith('--timeout=')) args.timeoutMs = Number(arg.slice('--timeout='.length));
  }
  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.plan) {
    console.log(formatProviderOnboardingLiveSmokePlan());
    return;
  }
  const report = await runProviderOnboardingLiveSmoke({ timeoutMs: args.timeoutMs });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `xenesis-provider-onboarding-live-smoke: ${report.ok ? 'passed' : 'failed'} ${report.summary.passed}/${report.summary.total}`,
    );
    for (const check of report.checks) {
      console.log(
        `xenesis-provider-onboarding-live-smoke: ${check.id} ${check.ok ? 'passed' : `failed - ${check.error}`}`,
      );
    }
  }
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    const failure = buildProviderOnboardingCliFailure(error, parseCliArgs(process.argv.slice(2)));
    if (failure.stream === 'stdout') {
      console.log(failure.text);
    } else {
      console.error(failure.text);
    }
    process.exitCode = 1;
  });
}
