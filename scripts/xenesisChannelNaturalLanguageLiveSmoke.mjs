#!/usr/bin/env node
import { access, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_TIMEOUT_MS = 240000;
export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SOURCE = 'xenesis-channel-natural-language-live-smoke';
export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT =
  'Desk Capability Registry MCP 도구만 사용해 텔레그램 채널의 channel routing status readback과 channel runtime status readback capability를 각각 실제 호출 결과로 직접 읽어줘. 목록, 설명, 연결 요약, 전체 런타임 요약으로 대체하지 말고, 읽기 결과의 route binding, session scope, runtime readiness만 정리해줘. 열기, 검토 요청, 설정 변경, 테스트 메시지는 하지 말고, 마지막 줄에 channel-routing-readback-ok라고 써줘.';
const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_MARKER = 'channel-routing-readback-ok';
const CHANNEL_NATURAL_LANGUAGE_RAW_PROMPT_SYNTAX_PATTERN =
  /xd\.|```|xenesis-desk-action|[{}]|["']?path["']?\s*:|["']?args?["']?\s*:|(?:channel|id)\s*:\s*['"]?telegram/i;
const XENESIS_AGENT_STATE_STORAGE_KEY = 'xenesis:xenesis-agent-state:v1';

const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_ROUTING_READBACK_PATHS = Object.freeze([
  'xd.xenesis.channels.routing.status',
]);
const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_RUNTIME_READBACK_PATHS = Object.freeze([
  'xd.xenesis.channels.runtime.status',
]);

export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_READBACK_PATHS = Object.freeze([
  ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_ROUTING_READBACK_PATHS,
  ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_RUNTIME_READBACK_PATHS,
]);

export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_PROVIDER_READ_ONLY_ALLOWED_PATHS = Object.freeze([
  'xd.xenesis.connections.status',
  'xd.xenesis.connections.diagnostics.status',
  ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_READBACK_PATHS,
]);

export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_FORBIDDEN_MUTATING_PATHS = Object.freeze([
  'xd.xenesis.connections.setupRequests.apply',
  'xd.xenesis.connections.setupRequests.request',
  'xd.xenesis.channels.profileDrafts.apply',
  'xd.xenesis.channels.profileDrafts.request',
  'xd.xenesis.profiles.testChannel',
  'xd.xenesis.profiles.install',
  'xd.xenesis.channels.runtime.request',
  'xd.xenesis.profiles.updateChannels',
  'xd.xenesis.gateway.start',
  'xd.xenesis.gateway.restart',
]);

const CHANNEL_NATURAL_LANGUAGE_PROFILE_MUTATION_PATHS = new Set([
  'xd.xenesis.connections.setupRequests.apply',
  'xd.xenesis.connections.setupRequests.request',
  'xd.xenesis.channels.profileDrafts.apply',
  'xd.xenesis.channels.profileDrafts.request',
  'xd.xenesis.channels.runtime.request',
  'xd.xenesis.profiles.install',
  'xd.xenesis.profiles.updateChannels',
  'xd.xenesis.gateway.start',
  'xd.xenesis.gateway.restart',
]);
const CHANNEL_NATURAL_LANGUAGE_TEST_SEND_PATHS = new Set(['xd.xenesis.profiles.testChannel']);
const CHANNEL_NATURAL_LANGUAGE_PROVIDER_READ_ONLY_ALLOWED_PATHS = new Set(
  CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_PROVIDER_READ_ONLY_ALLOWED_PATHS,
);

export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_OPEN_REQUEST = {
  path: 'xd.tools.core.xenesisAgent.open',
  source: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SOURCE,
  approved: true,
  args: { placement: 'tab' },
};

export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_STATUS_REQUEST = {
  path: 'xd.xenesis.status',
  source: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {},
};

export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_CONNECTIONS_STATUS_REQUEST = {
  path: 'xd.xenesis.connections.status',
  source: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {},
};

export const CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SUBMIT_REQUEST = {
  path: 'xd.testing.xenesisAgent.submitPrompt',
  source: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {
    prompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
    expectedText: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_MARKER,
    expectedTextScope: 'newResponse',
    timeoutMs: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_TIMEOUT_MS,
    progressIntervalMs: 1000,
    progressSampleLimit: 30,
    bypassDirectDeskRouting: true,
  },
};

export function buildChannelNaturalLanguageLiveSmokeEnv(baseEnv, xenisHome, userDataDir) {
  return {
    ...baseEnv,
    XENIS_HOME: xenisHome,
    XENESIS_DESK_USER_DATA_DIR: userDataDir,
    XENESIS_CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE: '1',
    XENESIS_STREAM_IDLE_MS: baseEnv.XENESIS_STREAM_IDLE_MS ?? '300000',
  };
}

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
        return /^(?:desk_)?tool_(?:call|result)$|^mcp_|approval/i.test(kind)
          ? [kind, summary, detail]
          : [kind, summary];
      })
    : [];
  return [
    unwrapped.responseTextPreview,
    unwrapped.bodyTextPreview,
    unwrapped.bodyTextTail,
    unwrapped.workLogText,
    unwrapped.artifactStatusLine,
    unwrapped.expectedText,
    unwrapped.error,
    result?.responseTextPreview,
    result?.workLogText,
    ...progressText,
    ...rawStreamText,
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join('\n');
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function turnItemsFromRawRecord(record) {
  const params = isRecord(record?.params) ? record.params : undefined;
  const candidates = [
    isRecord(record?.turn) ? record.turn : undefined,
    isRecord(record?.initial) && isRecord(record.initial.turn) ? record.initial.turn : undefined,
    isRecord(record?.completed) && isRecord(record.completed.turn) ? record.completed.turn : undefined,
    isRecord(params?.turn) ? params.turn : undefined,
  ];
  return candidates.flatMap((turn) => (Array.isArray(turn?.items) ? turn.items.filter(isRecord) : []));
}

function providerRawRecordsFromRaw(raw) {
  const out = [];
  const appendRecord = (record) => {
    if (!isRecord(record)) return;
    out.push(record);
    out.push(...turnItemsFromRawRecord(record));
  };
  if (Array.isArray(raw)) {
    for (const record of raw) appendRecord(record);
    return out;
  }
  if (!isRecord(raw)) return out;
  if (Array.isArray(raw.records)) {
    for (const record of raw.records) appendRecord(record);
  }
  out.push(...turnItemsFromRawRecord(raw));
  return out;
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

function providerRawRecordIsCompleted(record) {
  const method = typeof record.method === 'string' ? record.method : '';
  const params = isRecord(record.params) ? record.params : undefined;
  const item = isRecord(params?.item)
    ? params.item
    : isRecord(record) && typeof record.type === 'string'
      ? record
      : undefined;
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

function crCallArgsFromRecord(record) {
  if (isRecord(record.args)) return record.args;
  const args = {};
  if (typeof record.channel === 'string') args.channel = record.channel;
  if (typeof record.id === 'string') args.id = record.id;
  return args;
}

function firstCrCallInValue(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const call = firstCrCallInValue(item, depth + 1);
      if (call) return call;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  for (const [key, entryValue] of Object.entries(value)) {
    if (key === 'path' && typeof entryValue === 'string' && /^(?:xd\.|desk_|xenesis_desk_)/.test(entryValue)) {
      return { path: entryValue, args: crCallArgsFromRecord(value) };
    }
    if (typeof entryValue === 'string' && entryValue.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(entryValue);
        const call = firstCrCallInValue(parsed, depth + 1);
        if (call) return call;
      } catch {
        // Non-JSON strings are ignored; diagnostics must stay best-effort and redacted.
      }
    }
    const call = firstCrCallInValue(entryValue, depth + 1);
    if (call) return call;
  }
  return null;
}

function firstCrCallInProviderToolArguments(record) {
  if (!isRecord(record)) return null;
  const params = isRecord(record.params) ? record.params : undefined;
  const item = isRecord(params?.item) ? params.item : typeof record.type === 'string' ? record : undefined;
  const itemToolCall = isRecord(item?.toolCall) ? item.toolCall : undefined;
  const itemFunction = isRecord(item?.function) ? item.function : undefined;
  const paramsToolCall = isRecord(params?.toolCall) ? params.toolCall : undefined;
  const recordToolCall = isRecord(record.toolCall) ? record.toolCall : undefined;
  const candidates = [
    item?.arguments,
    item?.input,
    item?.args,
    itemToolCall?.input,
    itemToolCall?.arguments,
    itemFunction?.arguments,
    paramsToolCall?.input,
    paramsToolCall?.arguments,
    params?.arguments,
    params?.input,
    recordToolCall?.input,
    recordToolCall?.arguments,
    record.arguments,
    record.input,
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === 'string') {
      try {
        const parsed = JSON.parse(candidate);
        const call = firstCrCallInValue(parsed);
        if (call) return call;
      } catch {}
    } else {
      const call = firstCrCallInValue(candidate);
      if (call) return call;
    }
  }
  return null;
}

function firstCrCallInProviderRawRecord(value) {
  return firstCrCallInProviderToolArguments(value);
}

function firstCrPathInProviderRawRecord(value, depth = 0) {
  void depth;
  return firstCrCallInProviderRawRecord(value)?.path || '';
}

function crCallTargetsTelegram(call) {
  if (!isRecord(call?.args)) return false;
  const channel = typeof call.args.channel === 'string' ? call.args.channel.toLowerCase() : '';
  const id = typeof call.args.id === 'string' ? call.args.id.toLowerCase() : '';
  return channel === 'telegram' || id === 'telegram';
}

function providerRawRecordLooksLikeDeskToolPath(record) {
  const method = typeof record.method === 'string' ? record.method : '';
  const params = isRecord(record.params) ? record.params : undefined;
  const item = isRecord(params?.item)
    ? params.item
    : isRecord(record) && typeof record.type === 'string'
      ? record
      : undefined;
  const itemType = typeof item?.type === 'string' ? item.type : '';
  const itemName = typeof item?.name === 'string' ? item.name : '';
  const itemServer = typeof item?.server === 'string' ? item.server : '';
  const itemTool = typeof item?.tool === 'string' ? item.tool : '';
  const itemToolName = typeof item?.toolName === 'string' ? item.toolName : '';
  const paramsName = typeof params?.name === 'string' ? params.name : '';
  const paramsToolName = typeof params?.toolName === 'string' ? params.toolName : '';
  const pathValue = firstCrPathInProviderRawRecord(record);
  const toolIdentityText = [
    method,
    itemType,
    itemName,
    itemServer,
    itemTool,
    itemToolName,
    paramsName,
    paramsToolName,
  ].join(' ');
  const toolNameText = [itemName, itemServer, itemTool, itemToolName, paramsName, paramsToolName].join(' ');
  const summaryText = JSON.stringify({
    method,
    itemType,
    itemName,
    itemServer: itemServer || undefined,
    itemTool: itemTool || undefined,
    itemToolName: itemToolName || undefined,
    name: paramsName || undefined,
    toolName: paramsToolName || undefined,
    path: pathValue,
  });
  return (
    Boolean(pathValue) &&
    /tool|mcp/i.test(toolIdentityText) &&
    /(?:xenesis_desk_call_capability|desk_call_capability)\b/i.test(`${toolNameText} ${summaryText}`)
  );
}

function providerRawRecordLooksLikeDeskToolCall(record) {
  return providerRawRecordIsCompleted(record) && providerRawRecordLooksLikeDeskToolPath(record);
}

function providerRawRecordLooksLikeChannelReadback(record) {
  const call = firstCrCallInProviderRawRecord(record);
  return (
    providerRawRecordLooksLikeDeskToolCall(record) &&
    crCallTargetsTelegram(call) &&
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_READBACK_PATHS.includes(call.path)
  );
}

function providerRawRecordLooksLikeForbiddenMutation(record) {
  const pathValue = firstCrPathInProviderRawRecord(record);
  return (
    providerRawRecordLooksLikeDeskToolCall(record) &&
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_FORBIDDEN_MUTATING_PATHS.includes(pathValue)
  );
}

function providerRawRecordLooksLikeRoutingReadback(record) {
  const call = firstCrCallInProviderRawRecord(record);
  return (
    providerRawRecordLooksLikeDeskToolCall(record) &&
    crCallTargetsTelegram(call) &&
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_ROUTING_READBACK_PATHS.includes(call.path)
  );
}

function providerRawRecordLooksLikeRuntimeReadback(record) {
  const call = firstCrCallInProviderRawRecord(record);
  return (
    providerRawRecordLooksLikeDeskToolCall(record) &&
    crCallTargetsTelegram(call) &&
    CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_RUNTIME_READBACK_PATHS.includes(call.path)
  );
}

function providerRawRecordReadOnlyAllowlistViolationPath(record) {
  if (!providerRawRecordLooksLikeDeskToolPath(record)) return '';
  const pathValue = firstCrPathInProviderRawRecord(record);
  if (!pathValue || CHANNEL_NATURAL_LANGUAGE_PROVIDER_READ_ONLY_ALLOWED_PATHS.has(pathValue)) return '';
  return pathValue;
}

function summarizeProviderRawRecord(record) {
  const params = isRecord(record.params) ? record.params : undefined;
  const item = isRecord(params?.item)
    ? params.item
    : isRecord(record) && typeof record.type === 'string'
      ? record
      : undefined;
  const summary = {
    method: typeof record.method === 'string' ? record.method : '',
    itemType: typeof item?.type === 'string' ? item.type : '',
    itemName: typeof item?.name === 'string' ? item.name : '',
    itemServer: typeof item?.server === 'string' ? item.server : '',
    itemTool: typeof item?.tool === 'string' ? item.tool : '',
    itemToolName: typeof item?.toolName === 'string' ? item.toolName : '',
    name: typeof params?.name === 'string' ? params.name : '',
    toolName: typeof params?.toolName === 'string' ? params.toolName : '',
    path: firstCrPathInProviderRawRecord(record),
    looksLikeDeskToolCall: providerRawRecordLooksLikeDeskToolCall(record),
    looksLikeChannelReadback: providerRawRecordLooksLikeChannelReadback(record),
    looksLikeForbiddenMutation: providerRawRecordLooksLikeForbiddenMutation(record),
  };
  return Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== ''));
}

export function providerRawRecordSummariesFromDetail(detail) {
  if (typeof detail !== 'string' || !detail.trim()) return [];
  try {
    return collectProviderRawRecords(JSON.parse(detail)).map(summarizeProviderRawRecord);
  } catch {
    return [];
  }
}

function providerRawRecordsFromSubmitResult(submitResult) {
  const unwrapped = unwrapCapabilityResult(submitResult);
  const rawStream = Array.isArray(unwrapped.rawStream) ? unwrapped.rawStream : [];
  return rawStream.flatMap((entry) => {
    if (typeof entry?.detail !== 'string' || !entry.detail.trim()) return [];
    try {
      return collectProviderRawRecords(JSON.parse(entry.detail));
    } catch {
      return [];
    }
  });
}

function hasProviderChannelCrMcpToolEvidence(submitResult) {
  const records = providerRawRecordsFromSubmitResult(submitResult);
  return (
    records.some(providerRawRecordLooksLikeRoutingReadback) && records.some(providerRawRecordLooksLikeRuntimeReadback)
  );
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
  return /approval request:\s*|approvalRequired["']?\s*[:=]\s*true|approvalRequired\s+true|actionInboxItem(?:["']?\s*:|\.|["']|\s)/i.test(
    collectResultText(submitResult),
  );
}

function hasApprovalCard(submitResult) {
  const unwrapped = unwrapCapabilityResult(submitResult);
  return (
    unwrapped.approvalCardVisible === true ||
    unwrapped.approvalRequired === true ||
    isRecord(unwrapped.actionInboxItem) ||
    isRecord(unwrapped.approvalCard)
  );
}

function usedForbiddenPath(submitResult, forbiddenSet) {
  return providerRawRecordsFromSubmitResult(submitResult).some((record) => {
    if (!providerRawRecordLooksLikeDeskToolCall(record)) return false;
    return forbiddenSet.has(firstCrPathInProviderRawRecord(record));
  });
}

function usedProviderRawItemType(submitResult, pattern) {
  return providerRawRecordsFromSubmitResult(submitResult).some((record) => {
    const params = isRecord(record.params) ? record.params : undefined;
    const item = isRecord(params?.item) ? params.item : typeof record.type === 'string' ? record : undefined;
    const itemType = typeof item?.type === 'string' ? item.type : '';
    return pattern.test(itemType);
  });
}

function providerReadOnlyAllowlistViolationPath(submitResult) {
  for (const record of providerRawRecordsFromSubmitResult(submitResult)) {
    const violationPath = providerRawRecordReadOnlyAllowlistViolationPath(record);
    if (violationPath) return violationPath;
  }
  return '';
}

function providerRuntimeFromStatus(statusResult) {
  const unwrapped = unwrapCapabilityResult(statusResult);
  return unwrapped.status?.providerRuntime || unwrapped.providerRuntime || null;
}

function listConnectionItems(connectionsStatusResult) {
  const unwrapped = unwrapCapabilityResult(connectionsStatusResult);
  const sections = unwrapped.sections || unwrapped.status?.sections || {};
  return Object.values(sections).flatMap((section) => (Array.isArray(section?.items) ? section.items : []));
}

function telegramReadOnlyStateFromConnectionsStatus(connectionsStatusResult) {
  const item = listConnectionItems(connectionsStatusResult).find((candidate) => candidate?.id === 'telegram');
  if (!item) return null;
  return {
    id: item.id,
    supportLevel: item.supportLevel || '',
    status: item.status || '',
    routeBinding: item.channelRouting?.routeBinding || item.channelTemplate?.routing?.routeBinding || '',
    sessionScope: item.channelRouting?.sessionScope || item.channelTemplate?.routing?.sessionScope || '',
    runtimeSupport: item.channelRuntime?.runtimeSupport || '',
    runtimeStatus: item.channelRuntime?.runtimeStatus || '',
    draftStatus: item.channelProfileDraft?.draftStatus || '',
    missingRequiredFields: item.channelProfileDraft?.missingRequiredFields || [],
    routingReadPaths: item.channelRouting?.readPaths || item.channelTemplate?.routing?.readPaths || [],
    runtimeReadPaths: item.channelRuntime?.readPaths || [],
  };
}

function buildChannelStateReadOnlyCheck(beforeStatus, afterStatus) {
  const afterState = telegramReadOnlyStateFromConnectionsStatus(afterStatus);
  if (!afterState) {
    return {
      id: 'channel-state-read-only',
      ok: false,
      error: 'Missing Telegram channel readback from xd.xenesis.connections.status.',
    };
  }
  const hasRouting =
    typeof afterState.routeBinding === 'string' &&
    afterState.routeBinding.length > 0 &&
    typeof afterState.sessionScope === 'string' &&
    afterState.sessionScope.length > 0;
  const hasRuntime =
    afterState.runtimeSupport === 'implemented' &&
    typeof afterState.runtimeStatus === 'string' &&
    afterState.runtimeStatus.length > 0 &&
    afterState.runtimeReadPaths.includes('xd.xenesis.channels.runtime.status');
  if (!hasRouting || !hasRuntime) {
    return {
      id: 'channel-state-read-only',
      ok: false,
      error: `Incomplete Telegram routing/runtime readback: routing=${hasRouting} runtime=${hasRuntime}`,
    };
  }
  const beforeState = beforeStatus ? telegramReadOnlyStateFromConnectionsStatus(beforeStatus) : null;
  if (beforeState && JSON.stringify(beforeState) !== JSON.stringify(afterState)) {
    return {
      id: 'channel-state-read-only',
      ok: false,
      text: afterState.runtimeStatus,
      error: 'Stable Telegram channel readback state changed during the natural-language smoke.',
    };
  }
  return {
    id: 'channel-state-read-only',
    ok: true,
    text: afterState.runtimeStatus,
  };
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

export function buildChannelNaturalLanguageReportChecks({
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
  const crEvidence = hasProviderChannelCrMcpToolEvidence(submitResult);
  const providerDeskMcpRecovery = hasProviderDeskMcpRecovery(submitResult);
  const readbackMatches =
    Boolean(readbackRuntime?.provider) &&
    readbackRuntime.provider === runtimeProvider &&
    (!runtimeSource || readbackRuntime.source === runtimeSource) &&
    (!runtimeProcessModel || readbackRuntime.processModel === runtimeProcessModel);
  const chatOnlyApprovalText = hasChatOnlyApprovalText(submitResult);
  const approvalCard = hasApprovalCard(submitResult);
  const profileMutation = usedForbiddenPath(submitResult, CHANNEL_NATURAL_LANGUAGE_PROFILE_MUTATION_PATHS);
  const testSendOrDelivery = usedForbiddenPath(submitResult, CHANNEL_NATURAL_LANGUAGE_TEST_SEND_PATHS);
  const providerWebSearch = usedProviderRawItemType(submitResult, /webSearch/i);
  const providerCommandExecution = usedProviderRawItemType(submitResult, /commandExecution/i);
  const readOnlyAllowlistViolationPath = providerReadOnlyAllowlistViolationPath(submitResult);
  const resultText = collectResultText(submitResult);
  const finalMarker = resultText.includes(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_MARKER);
  const rawPromptSyntax = CHANNEL_NATURAL_LANGUAGE_RAW_PROMPT_SYNTAX_PATTERN.test(naturalPrompt);
  const channelStateCheck = buildChannelStateReadOnlyCheck(
    crReadbackAfterPrompt?.connectionsStatusBeforePrompt,
    crReadbackAfterPrompt?.connectionsStatusAfterPrompt,
  );

  return [
    {
      id: 'natural-prompt-submitted',
      ok: naturalPrompt === CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT && !rawPromptSyntax,
      prompt: naturalPrompt,
      ...(naturalPrompt !== CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT || rawPromptSyntax
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
      id: 'final-marker',
      ok: finalMarker,
      text: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_MARKER,
      ...(!finalMarker ? { error: `Missing final marker ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_MARKER}.` } : {}),
    },
    {
      id: 'provider-channel-cr-mcp-evidence',
      ok: crEvidence,
      ...(!crEvidence ? { error: 'No provider raw CR/MCP channel-readback tool evidence was found.' } : {}),
    },
    {
      id: 'provider-channel-cr-mcp-evidence-not-recovered',
      ok: !providerDeskMcpRecovery,
      ...(providerDeskMcpRecovery
        ? { error: 'CR/MCP evidence was collected only after deterministic provider evidence recovery.' }
        : {}),
    },
    {
      id: 'cr-readback-after-prompt',
      ok: readbackMatches && channelStateCheck.ok,
      text: readbackRuntime?.provider || '',
      ...(!(readbackMatches && channelStateCheck.ok)
        ? { error: 'CR readback after prompt did not match provider runtime metadata or channel status.' }
        : {}),
    },
    channelStateCheck,
    {
      id: 'provider-raw-cr-mcp-read-only-allowlist',
      ok: !readOnlyAllowlistViolationPath,
      ...(readOnlyAllowlistViolationPath
        ? { error: `Provider raw tool stream used unallowed CR/MCP path ${readOnlyAllowlistViolationPath}.` }
        : {}),
    },
    {
      id: 'no-provider-web-search',
      ok: !providerWebSearch,
      ...(providerWebSearch ? { error: 'Provider raw stream used webSearch instead of Desk CR readback only.' } : {}),
    },
    {
      id: 'no-shell-command-fallback',
      ok: !providerCommandExecution,
      ...(providerCommandExecution
        ? { error: 'Provider raw stream used commandExecution instead of Desk CR readback only.' }
        : {}),
    },
    {
      id: 'no-chat-only-approval',
      ok: !chatOnlyApprovalText,
      ...(chatOnlyApprovalText
        ? { error: 'Provider turn exposed chat-only approval internals instead of product-language approval state.' }
        : {}),
    },
    {
      id: 'no-approval-card',
      ok: !approvalCard,
      ...(approvalCard ? { error: 'Natural-language channel readback unexpectedly produced an approval card.' } : {}),
    },
    {
      id: 'no-profile-mutation',
      ok: !profileMutation,
      ...(profileMutation ? { error: 'Provider raw tool stream used a forbidden profile/runtime mutation path.' } : {}),
    },
    {
      id: 'no-test-send-or-delivery',
      ok: !testSendOrDelivery,
      ...(testSendOrDelivery ? { error: 'Provider raw tool stream used a forbidden test-send path.' } : {}),
    },
  ];
}

export function buildChannelNaturalLanguageLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map(normalizeCheck);
  const passed = normalizedChecks.filter((check) => check.ok).length;
  const failed = normalizedChecks.length - passed;
  const providerEvidence = {
    hasChannelCrMcpToolEvidence: extra.providerEvidence?.hasChannelCrMcpToolEvidence === true,
    hasCrReadbackAfterPrompt: extra.providerEvidence?.hasCrReadbackAfterPrompt === true,
    usedProviderDeskMcpRecovery:
      extra.providerEvidence?.usedProviderDeskMcpRecovery === true ||
      extra.providerEvidence?.hasProviderDeskMcpRecovery === true,
  };
  const noForbiddenEvidence = normalizedChecks
    .filter((check) =>
      [
        'no-chat-only-approval',
        'no-approval-card',
        'provider-raw-cr-mcp-read-only-allowlist',
        'no-provider-web-search',
        'no-shell-command-fallback',
        'no-profile-mutation',
        'no-test-send-or-delivery',
        'channel-state-read-only',
      ].includes(check.id),
    )
    .every((check) => check.ok);

  return {
    ...extra,
    ok: failed === 0,
    createdAt: startedAt.toISOString(),
    providerNaturalLanguageToolSelectionProof:
      providerEvidence.hasChannelCrMcpToolEvidence &&
      providerEvidence.hasCrReadbackAfterPrompt &&
      !providerEvidence.usedProviderDeskMcpRecovery &&
      noForbiddenEvidence,
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

export function buildChannelNaturalLanguageFailureReport(error, startedAt = new Date(), extra = {}) {
  const message = errorMessage(error);
  return buildChannelNaturalLanguageLiveSmokeReport(
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
        hasChannelCrMcpToolEvidence: false,
        hasCrReadbackAfterPrompt: false,
        usedProviderDeskMcpRecovery: false,
      },
    },
  );
}

export function buildChannelNaturalLanguageCliFailure(error, args = {}, startedAt = new Date()) {
  const report = buildChannelNaturalLanguageFailureReport(error, startedAt);
  if (args.json) {
    return {
      stream: 'stdout',
      text: JSON.stringify(report, null, 2),
      report,
    };
  }
  return {
    stream: 'stderr',
    text: `xenesis-channel-natural-language-live-smoke: failed - ${errorMessage(error)}`,
    report,
  };
}

export function formatChannelNaturalLanguageLiveSmokePlan() {
  return [
    'Xenesis channel natural-language live smoke plan',
    `Natural prompt: ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT}`,
    'Provider natural-language CR tool-selection proof: false until completed provider CR/MCP channel-readback evidence is observed without deterministic recovery',
    `CR open path: ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_OPEN_REQUEST.path}`,
    `CR submit path: ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SUBMIT_REQUEST.path}`,
    `CR provider status path: ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_STATUS_REQUEST.path}`,
    `CR channel readback paths: ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_READBACK_PATHS.join(', ')}`,
    `Allowed provider raw CR/MCP read-only paths: ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_PROVIDER_READ_ONLY_ALLOWED_PATHS.join(', ')}`,
    `Post-prompt channel state readback: ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_CONNECTIONS_STATUS_REQUEST.path}`,
    `App shell readiness: ${CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_APP_READY_SELECTOR}`,
    'Forbidden action classes: connection setup apply/request, channel profile request/apply, channel test-send, runtime review request, profile install/update, gateway lifecycle',
    'Required checks: provider readback, footer provider, raw CR/MCP channel evidence, final marker, post-prompt read-only channel readback',
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
  await page.waitForSelector(CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
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

async function createChannelNaturalLanguageTempStateDirs(options = {}) {
  const xenisHomeProvided = typeof options.xenisHome === 'string' && options.xenisHome.trim();
  const userDataDirProvided = typeof options.userDataDir === 'string' && options.userDataDir.trim();
  const xenisHome = xenisHomeProvided
    ? path.resolve(options.xenisHome)
    : await mkdtemp(path.join(os.tmpdir(), 'xenesis-channel-natural-language-'));
  const userDataDir = userDataDirProvided
    ? path.resolve(options.userDataDir)
    : await mkdtemp(path.join(os.tmpdir(), 'xenesis-channel-natural-language-user-data-'));
  const shouldRemoveXenisHome = options.keepXenisHome === true ? false : !xenisHomeProvided;
  const shouldRemoveUserDataDir = options.keepUserDataDir === true ? false : !userDataDirProvided;

  return {
    xenisHome,
    userDataDir,
    shouldRemoveXenisHome,
    shouldRemoveUserDataDir,
    async cleanup() {
      if (shouldRemoveUserDataDir) await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
      if (shouldRemoveXenisHome) await rm(xenisHome, { recursive: true, force: true }).catch(() => undefined);
    },
  };
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

export async function runChannelNaturalLanguageLiveSmoke(options = {}) {
  const timeout = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_TIMEOUT_MS;
  const root = path.resolve(options.repoRoot ?? repoRoot);
  const appPath = path.resolve(options.appPath ?? process.env.XENESIS_CHANNEL_NATURAL_LANGUAGE_ELECTRON_APP ?? root);
  const startedAt = new Date();
  let electronApp;

  await assertBuiltElectronOutput(root);

  const { _electron } = await import('playwright');
  const tempState = await createChannelNaturalLanguageTempStateDirs(options);
  try {
    electronApp = await _electron.launch({
      args: [appPath, '--disable-gpu'],
      cwd: root,
      timeout,
      env: buildChannelNaturalLanguageLiveSmokeEnv(process.env, tempState.xenisHome, tempState.userDataDir),
    });

    const page = await electronApp.firstWindow({ timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    await waitForAppShellReady(page, timeout);
    const callCapability = (request) =>
      page.evaluate((innerRequest) => globalThis.deskBridgeAPI.callCapability(innerRequest), request);

    const openResult = await callCapability({ ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_OPEN_REQUEST });
    if (openResult?.ok !== true) {
      throw new Error(`Agent pane open failed: ${openResult?.error || JSON.stringify(openResult)}`);
    }

    const statusResult = await callCapability({ ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_STATUS_REQUEST });
    const providerRuntime = providerRuntimeFromStatus(statusResult);
    if (providerRuntime?.safeForReasoning === false) {
      throw new Error(
        `Missing provider credentials or unsafe provider runtime: ${(providerRuntime.diagnostics || []).join('; ')}`,
      );
    }

    const connectionsStatusBeforePrompt = await callCapability({
      ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_CONNECTIONS_STATUS_REQUEST,
    });
    const footerProvider = await readFooterProvider(page);
    const rawStreamBeforePrompt = await readXenesisAgentRawStreamSnapshot(page);
    const submitResult = await callCapability({
      ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SUBMIT_REQUEST,
      args: { ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_SUBMIT_REQUEST.args, timeoutMs: timeout },
    });
    const rawStreamAfterPrompt = await readXenesisAgentRawStreamSnapshot(page);
    const submitResultWithRawStream = attachRawStreamToSubmitResult(
      submitResult,
      newRawStreamEntries(rawStreamBeforePrompt.entries, rawStreamAfterPrompt.entries),
    );
    const afterStatusResult = await callCapability({ ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_STATUS_REQUEST });
    const connectionsStatusAfterPrompt = await callCapability({
      ...CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_CONNECTIONS_STATUS_REQUEST,
    });
    const checks = buildChannelNaturalLanguageReportChecks({
      naturalPrompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
      providerRuntime,
      footerProvider,
      submitResult: submitResultWithRawStream,
      crReadbackAfterPrompt: {
        providerRuntime: providerRuntimeFromStatus(afterStatusResult),
        connectionsStatusBeforePrompt,
        connectionsStatusAfterPrompt,
      },
    });
    const providerEvidence = {
      hasChannelCrMcpToolEvidence: checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence')?.ok === true,
      hasCrReadbackAfterPrompt:
        checks.find((check) => check.id === 'cr-readback-after-prompt')?.ok === true &&
        checks.find((check) => check.id === 'channel-state-read-only')?.ok === true,
      usedProviderDeskMcpRecovery:
        checks.find((check) => check.id === 'provider-channel-cr-mcp-evidence-not-recovered')?.ok === false,
    };

    return buildChannelNaturalLanguageLiveSmokeReport(checks, startedAt, {
      xenisHome: tempState.shouldRemoveXenisHome ? '<temp-removed>' : tempState.xenisHome,
      userDataDir: tempState.shouldRemoveUserDataDir ? '<temp-removed>' : tempState.userDataDir,
      naturalPrompt: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_NATURAL_PROMPT,
      providerRuntime,
      footerProvider,
      providerEvidence,
      submit: submitDiagnostics(submitResultWithRawStream),
      rawStreamDiagnostics: {
        before: rawStreamBeforePrompt.diagnostics,
        after: rawStreamAfterPrompt.diagnostics,
      },
      status: { path: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_STATUS_REQUEST.path, ok: statusResult?.ok === true },
      connectionsStatus: {
        path: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_CONNECTIONS_STATUS_REQUEST.path,
        beforeOk: connectionsStatusBeforePrompt?.ok === true,
        afterOk: connectionsStatusAfterPrompt?.ok === true,
        telegramState: telegramReadOnlyStateFromConnectionsStatus(connectionsStatusAfterPrompt),
      },
    });
  } finally {
    if (electronApp) await electronApp.close().catch(() => undefined);
    await tempState.cleanup();
  }
}

function parseCliArgs(argv) {
  const args = {
    json: false,
    plan: false,
    timeoutMs: CHANNEL_NATURAL_LANGUAGE_LIVE_SMOKE_TIMEOUT_MS,
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
    console.log(formatChannelNaturalLanguageLiveSmokePlan());
    return;
  }
  const report = await runChannelNaturalLanguageLiveSmoke({ timeoutMs: args.timeoutMs });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `xenesis-channel-natural-language-live-smoke: ${report.ok ? 'passed' : 'failed'} ${report.summary.passed}/${report.summary.total}`,
    );
    for (const check of report.checks) {
      console.log(
        `xenesis-channel-natural-language-live-smoke: ${check.id} ${check.ok ? 'passed' : `failed - ${check.error}`}`,
      );
    }
  }
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    const failure = buildChannelNaturalLanguageCliFailure(error, parseCliArgs(process.argv.slice(2)));
    if (failure.stream === 'stdout') {
      console.log(failure.text);
    } else {
      console.error(failure.text);
    }
    process.exitCode = 1;
  });
}
