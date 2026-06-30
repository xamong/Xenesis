#!/usr/bin/env node
import { access, mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const CHANNEL_APPROVAL_LIVE_SMOKE_TIMEOUT_MS = 30000;
export const CHANNEL_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const CHANNEL_APPROVAL_LIVE_SMOKE_SOURCE = 'xenesis-channel-approval-live-smoke';
export const CHANNEL_APPROVAL_LIVE_SMOKE_SUBMIT_PATH = 'xd.testing.xenesisAgent.submitPrompt';
export const CHANNEL_APPROVAL_LIVE_SMOKE_PROOF_TYPE = 'structured-cr-approval-evidence';
export const CHANNEL_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF = false;
export const CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_ENV_NAME = 'XENESIS_SLICE04_WEBHOOK_URL';
export const CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_PATH = '/slice04-channel-approval';

export const CHANNEL_APPROVAL_LIVE_SMOKE_DEFAULT_DELIVERY_ENV_NAMES = Object.freeze([
  'TELEGRAM_BOT_TOKEN',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SLACK_WEBHOOK_URL',
  'DISCORD_BOT_TOKEN',
  'DISCORD_WEBHOOK_URL',
  'XENESIS_WEBHOOK_URL',
]);

export const CHANNEL_APPROVAL_LIVE_SMOKE_THIRD_PARTY_CHANNELS = Object.freeze(['telegram', 'slack', 'discord']);

export const CHANNEL_APPROVAL_LIVE_SMOKE_RAW_TARGET_IDENTIFIERS = Object.freeze([
  '123456789',
  'C012345',
  'D012345',
  'G012345',
  'telegram-chat-id',
  'slack-channel-id',
  'discord-channel-id',
  'discord-guild-id',
]);

export const CHANNEL_APPROVAL_LIVE_SMOKE_FAKE_SECRET_MARKERS = Object.freeze([
  'telegram-secret-token',
  'xoxb-slice04-secret',
  'discord-secret-token',
  'slice04-webhook-secret',
  'https://hooks.slack.com/services/slice04',
  'https://discord.com/api/webhooks/slice04',
  'https://slice04.invalid/default-webhook',
]);

export const CHANNEL_APPROVAL_LIVE_SMOKE_OPEN_REQUEST = {
  path: 'xd.tools.core.xenesisAgent.open',
  source: CHANNEL_APPROVAL_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {
    placement: 'tab',
  },
};

export const CHANNEL_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST = {
  path: 'xd.mcp.actionInbox.list',
  source: CHANNEL_APPROVAL_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {},
};

export const CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST = {
  path: 'xd.xenesis.profiles.install',
  source: CHANNEL_APPROVAL_LIVE_SMOKE_SOURCE,
  approved: true,
  args: { template: 'desk', name: 'slice04-channel-smoke', activate: true },
};

export const CHANNEL_APPROVAL_LIVE_SMOKE_CASES = [
  {
    id: 'webhook-profile-draft-apply',
    requestPrompt: [
      'Apply the Slice 04 loopback webhook channel profile draft.',
      '',
      '```xenesis-desk-action',
      '{"path":"xd.xenesis.channels.profileDrafts.apply","args":{"channel":"webhook","profile":"slice04-channel-smoke","settings":{"enabled":true,"urlEnv":"XENESIS_SLICE04_WEBHOOK_URL","approvalMode":"safe"}},"approved":false,"reason":"Apply Slice 04 loopback webhook channel profile draft"}',
      '```',
    ].join('\n'),
    approvalPrompt: '[approve pending Desk action]',
    approvalAction: 'once',
    expectedRequestPath: 'xd.xenesis.channels.profileDrafts.apply',
    expectedRequestText: 'Desk action approval required',
    expectedApprovalText: 'Desk action completed',
    expectedCapabilityApprovalItem: {
      id: 'capability-xenesis-xd.xenesis.channels.profileDrafts.apply',
      title: 'Approve Xenesis Desk capability: xd.xenesis.channels.profileDrafts.apply',
      kind: 'capability-approval',
      status: 'pending',
      source: 'Xenesis Desk Capability Registry',
      sessionId: 'xenesis-capability',
      approvalSessionKey: 'capability:xenesis:xd.xenesis.channels.profileDrafts.apply',
    },
  },
  {
    id: 'webhook-test-send',
    requestPrompt: [
      'Send the Slice 04 loopback webhook diagnostic.',
      '',
      '```xenesis-desk-action',
      '{"path":"xd.xenesis.profiles.testChannel","args":{"channel":"webhook","profile":"slice04-channel-smoke"},"approved":false,"reason":"Send Slice 04 loopback webhook diagnostic"}',
      '```',
    ].join('\n'),
    approvalPrompt: '[approve pending Desk action]',
    approvalAction: 'once',
    expectedRequestPath: 'xd.xenesis.profiles.testChannel',
    expectedRequestText: 'Desk action approval required',
    expectedApprovalText: 'Desk action completed',
    expectedCapabilityApprovalItem: {
      id: 'capability-xenesis-xd.xenesis.profiles.testChannel',
      title: 'Approve Xenesis Desk capability: xd.xenesis.profiles.testChannel',
      kind: 'capability-approval',
      status: 'pending',
      source: 'Xenesis Desk Capability Registry',
      sessionId: 'xenesis-capability',
      approvalSessionKey: 'capability:xenesis:xd.xenesis.profiles.testChannel',
    },
  },
];

export function buildChannelApprovalSubmitRequest(promptCase, phase, timeoutMs) {
  const isApproval = phase === 'approval';
  return {
    path: CHANNEL_APPROVAL_LIVE_SMOKE_SUBMIT_PATH,
    source: CHANNEL_APPROVAL_LIVE_SMOKE_SOURCE,
    approved: true,
    args: {
      prompt: isApproval ? promptCase.approvalPrompt : promptCase.requestPrompt,
      expectedText: isApproval ? promptCase.expectedApprovalText : promptCase.expectedRequestText,
      expectedTextScope: 'anywhere',
      timeoutMs,
      ...(isApproval
        ? {
            approvePendingAction: true,
            approvalAction: promptCase.approvalAction || 'once',
          }
        : {}),
    },
  };
}

export function buildChannelApprovalLiveSmokeEnv(baseEnv, xenisHome, userDataDir, loopbackUrl) {
  const blockedEnvNames = new Set(
    [...CHANNEL_APPROVAL_LIVE_SMOKE_DEFAULT_DELIVERY_ENV_NAMES, CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_ENV_NAME].map(
      (name) => name.toLowerCase(),
    ),
  );
  const env = {};
  for (const [name, value] of Object.entries(baseEnv || {})) {
    if (blockedEnvNames.has(name.toLowerCase())) continue;
    env[name] = value;
  }
  return {
    ...env,
    XENIS_HOME: xenisHome,
    XENESIS_DESK_USER_DATA_DIR: userDataDir,
    XENESIS_CHANNEL_APPROVAL_LIVE_SMOKE: '1',
    [CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_ENV_NAME]: loopbackUrl,
  };
}

export function formatChannelApprovalLiveSmokePlan() {
  const lines = [
    'Xenesis channel approval live smoke plan',
    `Proof type: ${CHANNEL_APPROVAL_LIVE_SMOKE_PROOF_TYPE}`,
    `Provider natural-language CR tool-selection proof: ${CHANNEL_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF}`,
    'Structured CR approval evidence: fenced xenesis-desk-action blocks plus Action Inbox readback',
    `CR open path: ${CHANNEL_APPROVAL_LIVE_SMOKE_OPEN_REQUEST.path}`,
    `CR submit path: ${CHANNEL_APPROVAL_LIVE_SMOKE_SUBMIT_PATH}`,
    `CR profile seed path: ${CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST.path}`,
    `CR Action Inbox list path: ${CHANNEL_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST.path}`,
    `Loopback webhook env: ${CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_ENV_NAME}`,
    `Removed default delivery env: ${CHANNEL_APPROVAL_LIVE_SMOKE_DEFAULT_DELIVERY_ENV_NAMES.join(', ')}`,
    `Third-party delivery disabled: ${CHANNEL_APPROVAL_LIVE_SMOKE_THIRD_PARTY_CHANNELS.join(', ')}`,
    `App shell readiness: ${CHANNEL_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR}`,
    'Mutating explicit CR channel actions:',
  ];

  for (const promptCase of CHANNEL_APPROVAL_LIVE_SMOKE_CASES) {
    lines.push(`- ${promptCase.id} -> ${promptCase.expectedRequestPath} (${promptCase.expectedRequestText})`);
    lines.push(
      `  approve via explicit testing flag: approvePendingAction=true approvalAction=${promptCase.approvalAction || 'once'} (${promptCase.expectedApprovalText})`,
    );
  }

  return lines.join('\n');
}

export function buildChannelApprovalLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map((check) => ({
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.prompt ? { prompt: String(check.prompt) } : {}),
    ...(check.expectedPath ? { expectedPath: String(check.expectedPath) } : {}),
    ...(check.text ? { text: String(check.text) } : {}),
    ...(check.error ? { error: String(check.error) } : {}),
  }));
  const passed = normalizedChecks.filter((check) => check.ok).length;
  const failed = normalizedChecks.length - passed;

  return {
    ...extra,
    ok: failed === 0,
    proofType: CHANNEL_APPROVAL_LIVE_SMOKE_PROOF_TYPE,
    providerNaturalLanguageToolSelectionProof: CHANNEL_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF,
    createdAt: startedAt.toISOString(),
    summary: {
      total: normalizedChecks.length,
      passed,
      failed,
    },
    checks: normalizedChecks,
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
    result.expectedText,
    result.error,
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join('\n');
}

export function extractActionInboxItems(capabilityResult) {
  const result = unwrapCapabilityResult(capabilityResult);
  if (Array.isArray(result.actions)) return result.actions;
  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(result)) return result;
  return [];
}

function actionInboxItemMatches(item, expected) {
  if (!item || typeof item !== 'object') return false;
  for (const [key, value] of Object.entries(expected)) {
    if (String(item[key] ?? '') !== String(value)) return false;
  }
  return true;
}

function findActionInboxItem(items, expected) {
  return items.find((item) => actionInboxItemMatches(item, expected)) || null;
}

function updatedAfter(item, startedAt) {
  if (!startedAt) return true;
  const updatedAt = Date.parse(String(item?.updatedAt || item?.createdAt || ''));
  const startedMillis = Date.parse(String(startedAt));
  if (!Number.isFinite(updatedAt) || !Number.isFinite(startedMillis)) return false;
  return updatedAt >= startedMillis - 1000;
}

export function parseCapabilityApprovalCommand(command) {
  const parsed = JSON.parse(String(command || ''));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Capability approval command is not an object.');
  }
  if (parsed.type !== 'desk-capability-call') {
    throw new Error('Action Inbox command is not a Desk capability call.');
  }
  if (typeof parsed.path !== 'string' || !parsed.path.trim()) {
    throw new Error('Capability approval command is missing path.');
  }
  return {
    type: 'desk-capability-call',
    path: parsed.path.trim(),
    args: parsed.args,
    source: typeof parsed.source === 'string' && parsed.source.trim() ? parsed.source.trim() : 'mcp',
  };
}

function lowerIncludesWholeWord(text, value) {
  return new RegExp(`(^|[^a-z])${value}([^a-z]|$)`, 'i').test(text);
}

function containsCaseInsensitive(text, value) {
  return text.toLowerCase().includes(String(value).toLowerCase());
}

function throwUnsafeEvidence(category) {
  throw new Error(`Unsafe ${category} leaked into channel approval smoke evidence.`);
}

export function assertChannelApprovalSmokeTextSafe(text, options = {}) {
  const value = String(text || '');
  if (typeof options.loopbackUrl === 'string' && options.loopbackUrl && value.includes(options.loopbackUrl)) {
    throwUnsafeEvidence('loopback URL');
  }

  for (const unsafe of CHANNEL_APPROVAL_LIVE_SMOKE_RAW_TARGET_IDENTIFIERS) {
    if (value.includes(unsafe)) throwUnsafeEvidence('raw target identifier');
  }

  for (const unsafe of CHANNEL_APPROVAL_LIVE_SMOKE_FAKE_SECRET_MARKERS) {
    if (value.includes(unsafe)) throwUnsafeEvidence('secret marker');
  }

  if (options.includeDefaultDeliveryEnvNames) {
    for (const unsafe of CHANNEL_APPROVAL_LIVE_SMOKE_DEFAULT_DELIVERY_ENV_NAMES) {
      if (containsCaseInsensitive(value, unsafe)) throwUnsafeEvidence('default delivery env name');
    }
  }

  if (options.includeThirdPartyChannels) {
    const lower = value.toLowerCase();
    for (const channel of CHANNEL_APPROVAL_LIVE_SMOKE_THIRD_PARTY_CHANNELS) {
      if (lowerIncludesWholeWord(lower, channel)) {
        throwUnsafeEvidence('third-party channel name');
      }
    }
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const CHANNEL_APPROVAL_APPLY_ARG_KEYS = Object.freeze(new Set(['channel', 'profile', 'settings']));
const CHANNEL_APPROVAL_APPLY_SETTINGS_KEYS = Object.freeze(new Set(['enabled', 'urlEnv', 'approvalMode']));
const CHANNEL_APPROVAL_TEST_SEND_ARG_KEYS = Object.freeze(new Set(['channel', 'profile']));

function hasUnexpectedKeys(record, allowedKeys) {
  return Object.keys(record).some((key) => !allowedKeys.has(key));
}

function unexpectedArgsError(label, record, allowedKeys) {
  if (!isRecord(record)) return `${label} must be an object.`;
  if (hasUnexpectedKeys(record, allowedKeys)) return `${label} contains unexpected field(s).`;
  return '';
}

function normalizeSubmitCheck({
  id,
  prompt,
  capabilityResult,
  expectedPath,
  expectedText,
  loopbackUrl,
  requireApprovalClick = false,
}) {
  const result = unwrapCapabilityResult(capabilityResult);
  const text = collectResultText(result);
  const capabilityOk = capabilityResult?.ok === true;
  const resultOk = result.ok !== false;
  const submitted = result.submitted === true || Number(result.newLineCount || 0) > 0;
  const textMatched = result.matchedExpectedText === true || text.includes(expectedText);
  const pathMatched = text.includes(expectedPath);
  const approvalClickMatched = !requireApprovalClick || result.approvalButtonClicked === true;
  const approvalButtonText = String(result.approvalButtonText || '');
  const approvalButtonTextMatched =
    !requireApprovalClick || (approvalButtonText.length > 0 && !/(?:항상|always)/i.test(approvalButtonText));
  let safetyError = '';
  try {
    assertChannelApprovalSmokeTextSafe(text, { loopbackUrl });
  } catch (error) {
    safetyError = error instanceof Error ? error.message : String(error);
  }
  const ok =
    capabilityOk &&
    resultOk &&
    submitted &&
    textMatched &&
    pathMatched &&
    approvalClickMatched &&
    approvalButtonTextMatched &&
    !safetyError;

  return {
    id,
    ok,
    prompt,
    expectedPath,
    text: expectedText,
    ...(!ok
      ? {
          error:
            safetyError ||
            capabilityResult?.error ||
            result.error ||
            (!approvalButtonTextMatched
              ? `Unexpected approval button: ${approvalButtonText || '<missing>'}`
              : `submitted=${submitted} textMatched=${textMatched} pathMatched=${pathMatched} approvalButtonClicked=${result.approvalButtonClicked}`),
        }
      : {}),
  };
}

function getMappedResult(value, id) {
  if (value instanceof Map) return value.get(id);
  if (value && typeof value === 'object') return value[id];
  return undefined;
}

function validateExpectedPendingCommandArgs(promptCase, command) {
  if (!isRecord(command.args)) return 'Capability approval command args must be an object.';

  const allowedArgKeys =
    promptCase.expectedRequestPath === 'xd.xenesis.channels.profileDrafts.apply'
      ? CHANNEL_APPROVAL_APPLY_ARG_KEYS
      : CHANNEL_APPROVAL_TEST_SEND_ARG_KEYS;
  const unexpectedTopLevelError = unexpectedArgsError('Capability approval command args', command.args, allowedArgKeys);
  if (unexpectedTopLevelError) return unexpectedTopLevelError;

  if (command.args.channel !== 'webhook') return 'Capability approval command channel is not webhook.';
  if (command.args.profile !== 'slice04-channel-smoke') {
    return 'Capability approval command profile is not slice04-channel-smoke.';
  }

  if (promptCase.expectedRequestPath === 'xd.xenesis.channels.profileDrafts.apply') {
    if (!isRecord(command.args.settings)) return 'Apply command settings must be an object.';
    const unexpectedSettingsError = unexpectedArgsError(
      'Apply command settings',
      command.args.settings,
      CHANNEL_APPROVAL_APPLY_SETTINGS_KEYS,
    );
    if (unexpectedSettingsError) return unexpectedSettingsError;
    if (command.args.settings.enabled !== true) return 'Apply command enabled flag is not true.';
    if (command.args.settings.urlEnv !== CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_ENV_NAME) {
      return 'Apply command urlEnv is not the Slice 04 loopback env name.';
    }
    if (command.args.settings.approvalMode !== 'safe') return 'Apply command approval mode is not safe.';
  }

  return '';
}

export function validateChannelApprovalPendingCommand(promptCase, pendingActionInboxResult, startedAt, loopbackUrl) {
  const pendingItems = extractActionInboxItems(pendingActionInboxResult);
  const pendingCapabilityItem = findActionInboxItem(pendingItems, promptCase.expectedCapabilityApprovalItem);
  let commandError = '';
  if (pendingCapabilityItem) {
    try {
      const command = parseCapabilityApprovalCommand(pendingCapabilityItem.command);
      if (command.path !== promptCase.expectedRequestPath) {
        throw new Error(`Expected command path ${promptCase.expectedRequestPath}, got ${command.path}`);
      }
      assertChannelApprovalSmokeTextSafe(pendingCapabilityItem.command, {
        loopbackUrl,
        includeDefaultDeliveryEnvNames: true,
        includeThirdPartyChannels: true,
      });
      const argsError = validateExpectedPendingCommandArgs(promptCase, command);
      if (argsError) throw new Error(argsError);
    } catch (error) {
      commandError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    id: `${promptCase.id}:pending-capability-approval`,
    ok:
      pendingActionInboxResult?.ok === true &&
      Boolean(pendingCapabilityItem) &&
      updatedAfter(pendingCapabilityItem, startedAt) &&
      !commandError,
    text: promptCase.expectedCapabilityApprovalItem.title,
    ...(!pendingCapabilityItem
      ? { error: `Missing pending capability approval item: ${promptCase.expectedCapabilityApprovalItem.id}` }
      : !updatedAfter(pendingCapabilityItem, startedAt)
        ? { error: `Pending capability approval item was not refreshed: ${pendingCapabilityItem.updatedAt || ''}` }
        : commandError
          ? { error: commandError }
          : {}),
  };
}

function buildPendingCapabilityApprovalCheck(promptCase, pendingActionInboxResult, startedAt, loopbackUrl) {
  return validateChannelApprovalPendingCommand(promptCase, pendingActionInboxResult, startedAt, loopbackUrl);
}

function buildApprovedCapabilityApprovalCheck(promptCase, afterActionInboxResult, loopbackUrl, startedAt) {
  const afterItems = extractActionInboxItems(afterActionInboxResult);
  const approvedCapabilityItem = findActionInboxItem(afterItems, {
    ...promptCase.expectedCapabilityApprovalItem,
    status: 'approved',
  });
  let safetyError = '';
  if (approvedCapabilityItem) {
    try {
      assertChannelApprovalSmokeTextSafe(
        [approvedCapabilityItem.command, approvedCapabilityItem.result, approvedCapabilityItem.error].join('\n'),
        { loopbackUrl },
      );
    } catch (error) {
      safetyError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    id: `${promptCase.id}:approved-capability-approval`,
    ok:
      afterActionInboxResult?.ok === true &&
      Boolean(approvedCapabilityItem) &&
      updatedAfter(approvedCapabilityItem, startedAt) &&
      String(approvedCapabilityItem?.result || '').includes(
        `Capability call approved and executed: ${promptCase.expectedRequestPath}`,
      ) &&
      !safetyError,
    text: promptCase.expectedCapabilityApprovalItem.title,
    ...(!approvedCapabilityItem
      ? { error: `Missing approved capability approval item: ${promptCase.expectedCapabilityApprovalItem.id}` }
      : !updatedAfter(approvedCapabilityItem, startedAt)
        ? { error: `Approved capability approval item was not refreshed: ${approvedCapabilityItem.updatedAt || ''}` }
        : !String(approvedCapabilityItem.result || '').includes(
              `Capability call approved and executed: ${promptCase.expectedRequestPath}`,
            )
          ? {
              error: `Capability approval result did not include executed path: ${approvedCapabilityItem.result || ''}`,
            }
          : safetyError
            ? { error: safetyError }
            : {}),
  };
}

function buildTestSendCommandSanitizedCheck(promptCase, pendingActionInboxResult, loopbackUrl) {
  const pendingItems = extractActionInboxItems(pendingActionInboxResult);
  const pendingCapabilityItem = findActionInboxItem(pendingItems, promptCase.expectedCapabilityApprovalItem);
  try {
    if (!pendingCapabilityItem) throw new Error('Missing test-send pending capability approval item.');
    const command = parseCapabilityApprovalCommand(pendingCapabilityItem.command);
    if (command.path !== 'xd.xenesis.profiles.testChannel') {
      throw new Error(`Unexpected test-send command path: ${command.path}`);
    }
    const argsError = validateExpectedPendingCommandArgs(promptCase, command);
    if (argsError) throw new Error(argsError);
    assertChannelApprovalSmokeTextSafe(pendingCapabilityItem.command, {
      loopbackUrl,
      includeDefaultDeliveryEnvNames: true,
      includeThirdPartyChannels: true,
    });
    return {
      id: `${promptCase.id}:test-send-command-sanitized`,
      ok: true,
      text: 'test-send command is webhook-only and URL-free',
    };
  } catch (error) {
    return {
      id: `${promptCase.id}:test-send-command-sanitized`,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildLoopbackDeliveryCheck(loopbackRequests, loopbackUrl) {
  const requests = Array.isArray(loopbackRequests) ? loopbackRequests : [];
  const request = requests[0];
  const body = request?.body && typeof request.body === 'object' ? request.body : {};
  let safetyError = '';
  try {
    assertChannelApprovalSmokeTextSafe(JSON.stringify(body), { loopbackUrl });
  } catch (error) {
    safetyError = error instanceof Error ? error.message : String(error);
  }

  const ok =
    requests.length === 1 &&
    request?.method === 'POST' &&
    body.channel === 'webhook' &&
    body.conversationId === 'test' &&
    !safetyError;
  return {
    id: 'webhook-test-send:loopback-delivery',
    ok,
    text: 'one loopback webhook diagnostic received',
    ...(!ok
      ? {
          error:
            safetyError ||
            `requests=${requests.length} method=${request?.method || ''} channel=${body.channel || ''} conversationId=${body.conversationId || ''}`,
        }
      : {}),
  };
}

export function normalizeChannelApprovalChecks(results) {
  const checks = [];
  for (const promptCase of CHANNEL_APPROVAL_LIVE_SMOKE_CASES) {
    const requestSubmitResult = getMappedResult(results.requestSubmitResults, promptCase.id);
    const pendingActionInboxResult = getMappedResult(results.pendingActionInboxResults, promptCase.id);
    const approvalSubmitResult = getMappedResult(results.approvalSubmitResults, promptCase.id);
    const afterActionInboxResult = getMappedResult(results.afterActionInboxResults, promptCase.id);

    checks.push(
      normalizeSubmitCheck({
        id: `${promptCase.id}:request-submit`,
        prompt: promptCase.requestPrompt,
        capabilityResult: requestSubmitResult,
        expectedPath: promptCase.expectedRequestPath,
        expectedText: promptCase.expectedRequestText,
        loopbackUrl: results.loopbackUrl,
      }),
    );
    checks.push(
      buildPendingCapabilityApprovalCheck(promptCase, pendingActionInboxResult, results.startedAt, results.loopbackUrl),
    );
    if (promptCase.expectedRequestPath === 'xd.xenesis.profiles.testChannel') {
      checks.push(buildTestSendCommandSanitizedCheck(promptCase, pendingActionInboxResult, results.loopbackUrl));
    }
    checks.push(
      normalizeSubmitCheck({
        id: `${promptCase.id}:approval-submit`,
        prompt: promptCase.approvalPrompt,
        capabilityResult: approvalSubmitResult,
        expectedPath: promptCase.expectedRequestPath,
        expectedText: promptCase.expectedApprovalText,
        loopbackUrl: results.loopbackUrl,
        requireApprovalClick: true,
      }),
    );
    if (promptCase.expectedRequestPath === 'xd.xenesis.profiles.testChannel') {
      checks.push(buildLoopbackDeliveryCheck(results.loopbackRequests, results.loopbackUrl));
    }
    checks.push(
      buildApprovedCapabilityApprovalCheck(promptCase, afterActionInboxResult, results.loopbackUrl, results.startedAt),
    );
  }
  return checks;
}

export async function createChannelApprovalTempStateDirs({ options = {}, mkdtempImpl = mkdtemp, rmImpl = rm } = {}) {
  const xenisHomeProvided = typeof options.xenisHome === 'string' && options.xenisHome.trim();
  const userDataDirProvided = typeof options.userDataDir === 'string' && options.userDataDir.trim();
  let xenisHome;
  let userDataDir;

  try {
    xenisHome = xenisHomeProvided
      ? path.resolve(options.xenisHome)
      : await mkdtempImpl(path.join(os.tmpdir(), 'xenesis-channel-approval-'));
    userDataDir = userDataDirProvided
      ? path.resolve(options.userDataDir)
      : await mkdtempImpl(path.join(os.tmpdir(), 'xenesis-channel-approval-user-data-'));
  } catch (error) {
    if (xenisHome && !xenisHomeProvided) {
      await rmImpl(xenisHome, { recursive: true, force: true }).catch(() => undefined);
    }
    throw error;
  }

  const shouldRemoveXenisHome = options.keepXenisHome === true ? false : !xenisHomeProvided;
  const shouldRemoveUserDataDir = options.keepUserDataDir === true ? false : !userDataDirProvided;
  return {
    xenisHome,
    userDataDir,
    shouldRemoveXenisHome,
    shouldRemoveUserDataDir,
    cleanup: async () => {
      if (shouldRemoveXenisHome) {
        await rmImpl(xenisHome, { recursive: true, force: true }).catch(() => undefined);
      }
      if (shouldRemoveUserDataDir) {
        await rmImpl(userDataDir, { recursive: true, force: true }).catch(() => undefined);
      }
    },
  };
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');
  try {
    return { rawBody, body: rawBody ? JSON.parse(rawBody) : null };
  } catch {
    return { rawBody, body: rawBody };
  }
}

export async function startChannelApprovalLoopbackWebhookServer() {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_PATH) {
      response.writeHead(404).end();
      return;
    }
    const { rawBody, body } = await readRequestBody(request);
    requests.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      rawBody,
      body,
    });
    response.writeHead(204).end();
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}${CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_PATH}`,
    requests,
    waitForRequests: async (count = 1, timeoutMs = 30000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() <= deadline) {
        if (requests.length >= count) return requests;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error(`Timed out waiting for ${count} loopback webhook request(s).`);
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
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
  await page.waitForSelector(CHANNEL_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(globalThis.deskBridgeAPI?.callCapability), undefined, { timeout });
}

export async function runChannelApprovalLiveSmoke(options = {}) {
  const timeout = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : CHANNEL_APPROVAL_LIVE_SMOKE_TIMEOUT_MS;
  const root = path.resolve(options.repoRoot ?? repoRoot);
  const appPath = path.resolve(options.appPath ?? process.env.XENESIS_CHANNEL_APPROVAL_ELECTRON_APP ?? root);
  const startedAt = new Date();
  const checkResults = [];
  const requestSubmitResults = new Map();
  const pendingActionInboxResults = new Map();
  const approvalSubmitResults = new Map();
  const afterActionInboxResults = new Map();
  const caseResults = [];

  await assertBuiltElectronOutput(root);
  const tempState = await createChannelApprovalTempStateDirs({ options });
  const { xenisHome, userDataDir } = tempState;
  let electronApp;
  let loopbackServer;
  let profileInstallResult;

  try {
    loopbackServer = await startChannelApprovalLoopbackWebhookServer();
    const { _electron } = await import('playwright');
    electronApp = await _electron.launch({
      args: [appPath, '--disable-gpu'],
      cwd: root,
      timeout,
      env: buildChannelApprovalLiveSmokeEnv(process.env, xenisHome, userDataDir, loopbackServer.url),
    });

    const page = await electronApp.firstWindow({ timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    await waitForAppShellReady(page, timeout);

    const callCapability = (request) =>
      page.evaluate((innerRequest) => globalThis.deskBridgeAPI.callCapability(innerRequest), request);

    const openResult = await callCapability({ ...CHANNEL_APPROVAL_LIVE_SMOKE_OPEN_REQUEST });
    checkResults.push({
      id: 'agent-open',
      ok: openResult?.ok === true,
      expectedPath: CHANNEL_APPROVAL_LIVE_SMOKE_OPEN_REQUEST.path,
      ...(!(openResult?.ok === true) ? { error: openResult?.error || JSON.stringify(openResult) } : {}),
    });

    profileInstallResult = await callCapability({ ...CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST });
    checkResults.push({
      id: 'profile-install',
      ok:
        profileInstallResult?.ok === true &&
        profileInstallResult?.result?.profile?.active === CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST.args.name,
      expectedPath: CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST.path,
      ...(!(
        profileInstallResult?.ok === true &&
        profileInstallResult?.result?.profile?.active === CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST.args.name
      )
        ? { error: profileInstallResult?.error || JSON.stringify(profileInstallResult) }
        : {}),
    });

    for (const promptCase of CHANNEL_APPROVAL_LIVE_SMOKE_CASES) {
      const requestSubmitResult = await callCapability(
        buildChannelApprovalSubmitRequest(promptCase, 'request', timeout),
      );
      requestSubmitResults.set(promptCase.id, requestSubmitResult);
      const pendingActionInboxResult = await callCapability({
        ...CHANNEL_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST,
      });
      pendingActionInboxResults.set(promptCase.id, pendingActionInboxResult);
      const pendingSafetyCheck = validateChannelApprovalPendingCommand(
        promptCase,
        pendingActionInboxResult,
        startedAt.toISOString(),
        loopbackServer.url,
      );
      checkResults.push({
        ...pendingSafetyCheck,
        id: `${promptCase.id}:pre-approval-command-safety`,
      });
      if (!pendingSafetyCheck.ok) {
        caseResults.push({
          id: promptCase.id,
          requestSubmitted: requestSubmitResult?.ok === true,
          approvalSubmitted: false,
          blockedBeforeApproval: true,
        });
        continue;
      }
      const approvalSubmitResult = await callCapability(
        buildChannelApprovalSubmitRequest(promptCase, 'approval', timeout),
      );
      approvalSubmitResults.set(promptCase.id, approvalSubmitResult);
      if (promptCase.expectedRequestPath === 'xd.xenesis.profiles.testChannel') {
        await loopbackServer.waitForRequests(1, timeout).catch(() => undefined);
      }
      const afterActionInboxResult = await callCapability({
        ...CHANNEL_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST,
      });
      afterActionInboxResults.set(promptCase.id, afterActionInboxResult);
      caseResults.push({
        id: promptCase.id,
        requestSubmitted: requestSubmitResult?.ok === true,
        approvalSubmitted: approvalSubmitResult?.ok === true,
      });
    }

    const normalizedChecks = normalizeChannelApprovalChecks({
      startedAt: startedAt.toISOString(),
      loopbackUrl: loopbackServer.url,
      requestSubmitResults,
      pendingActionInboxResults,
      approvalSubmitResults,
      afterActionInboxResults,
      loopbackRequests: loopbackServer.requests,
    });
    checkResults.push(...normalizedChecks);
  } finally {
    if (electronApp) {
      await electronApp.close().catch(() => undefined);
    }
    if (loopbackServer) {
      await loopbackServer.close().catch(() => undefined);
    }
    await tempState.cleanup();
  }

  const report = buildChannelApprovalLiveSmokeReport(checkResults, startedAt, {
    xenisHome: tempState.shouldRemoveXenisHome ? '<temp-removed>' : xenisHome,
    userDataDir: tempState.shouldRemoveUserDataDir ? '<temp-removed>' : userDataDir,
    profileSeed: {
      path: CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST.path,
      ok: profileInstallResult?.ok === true,
      profile: CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST.args.name,
    },
    loopback: {
      envName: CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_ENV_NAME,
      url: '<loopback-redacted>',
      received: loopbackServer?.requests.length ?? 0,
    },
    cases: caseResults,
  });
  assertChannelApprovalSmokeTextSafe(JSON.stringify(report), {
    loopbackUrl: loopbackServer?.url,
  });
  return report;
}

function parseCliArgs(argv) {
  const args = {
    json: false,
    plan: false,
    timeoutMs: CHANNEL_APPROVAL_LIVE_SMOKE_TIMEOUT_MS,
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
    console.log(formatChannelApprovalLiveSmokePlan());
    return;
  }

  const report = await runChannelApprovalLiveSmoke({ timeoutMs: args.timeoutMs });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `xenesis-channel-approval-live-smoke: ${report.ok ? 'passed' : 'failed'} ${report.summary.passed}/${report.summary.total}`,
    );
    for (const check of report.checks) {
      console.log(
        `xenesis-channel-approval-live-smoke: ${check.id} ${check.ok ? 'passed' : `failed - ${check.error}`}`,
      );
    }
  }
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`xenesis-channel-approval-live-smoke: failed - ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
