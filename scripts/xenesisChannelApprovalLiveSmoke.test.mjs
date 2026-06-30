import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as channelSmoke from './xenesisChannelApprovalLiveSmoke.mjs';
import {
  assertChannelApprovalSmokeTextSafe,
  buildChannelApprovalLiveSmokeEnv,
  buildChannelApprovalLiveSmokeReport,
  buildChannelApprovalSubmitRequest,
  CHANNEL_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST,
  CHANNEL_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR,
  CHANNEL_APPROVAL_LIVE_SMOKE_CASES,
  CHANNEL_APPROVAL_LIVE_SMOKE_DEFAULT_DELIVERY_ENV_NAMES,
  CHANNEL_APPROVAL_LIVE_SMOKE_FAKE_SECRET_MARKERS,
  CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_ENV_NAME,
  CHANNEL_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF,
  CHANNEL_APPROVAL_LIVE_SMOKE_OPEN_REQUEST,
  CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST,
  CHANNEL_APPROVAL_LIVE_SMOKE_PROOF_TYPE,
  CHANNEL_APPROVAL_LIVE_SMOKE_RAW_TARGET_IDENTIFIERS,
  CHANNEL_APPROVAL_LIVE_SMOKE_SOURCE,
  CHANNEL_APPROVAL_LIVE_SMOKE_SUBMIT_PATH,
  CHANNEL_APPROVAL_LIVE_SMOKE_THIRD_PARTY_CHANNELS,
  extractActionInboxItems,
  formatChannelApprovalLiveSmokePlan,
  normalizeChannelApprovalChecks,
  parseCapabilityApprovalCommand,
  startChannelApprovalLoopbackWebhookServer,
  validateChannelApprovalPendingCommand,
} from './xenesisChannelApprovalLiveSmoke.mjs';

function extractDeskActionPayload(prompt) {
  const match = String(prompt).match(/```xenesis-desk-action\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(match, 'expected fenced xenesis-desk-action block');
  return JSON.parse(match[1]);
}

function assertTextExcludes(text, values) {
  for (const value of values) {
    assert.equal(String(text).includes(value), false, `unexpected unsafe value: ${value}`);
  }
}

function capabilityItem(pathValue, status = 'pending', extra = {}) {
  return {
    id: `capability-xenesis-${pathValue}`,
    title: `Approve Xenesis Desk capability: ${pathValue}`,
    kind: 'capability-approval',
    command: JSON.stringify({
      type: 'desk-capability-call',
      path: pathValue,
      args:
        pathValue === 'xd.xenesis.channels.profileDrafts.apply'
          ? {
              channel: 'webhook',
              profile: 'slice04-channel-smoke',
              settings: {
                enabled: true,
                urlEnv: 'XENESIS_SLICE04_WEBHOOK_URL',
                approvalMode: 'safe',
              },
            }
          : {
              channel: 'webhook',
              profile: 'slice04-channel-smoke',
            },
      source: 'xenesis',
    }),
    description: `Capability requires approval: ${pathValue}`,
    source: 'Xenesis Desk Capability Registry',
    sessionId: 'xenesis-capability',
    approvalSessionKey: `capability:xenesis:${pathValue}`,
    requester: 'xenesis',
    risk: 'write',
    status,
    updatedAt: '2026-06-29T00:10:00.000Z',
    ...(status === 'approved'
      ? {
          result: `Capability call approved and executed: ${pathValue}`,
          resolvedAt: '2026-06-29T00:10:01.000Z',
        }
      : {}),
    ...extra,
  };
}

function capabilityCommand(pathValue, args) {
  return JSON.stringify({
    type: 'desk-capability-call',
    path: pathValue,
    args,
    source: 'xenesis',
  });
}

function smokeCaseFor(pathValue) {
  const smokeCase = CHANNEL_APPROVAL_LIVE_SMOKE_CASES.find((item) => item.expectedRequestPath === pathValue);
  assert.ok(smokeCase, `missing smoke case for ${pathValue}`);
  return smokeCase;
}

function validatePendingCommandArgs(pathValue, args) {
  const smokeCase = smokeCaseFor(pathValue);
  const pendingItem = capabilityItem(pathValue, 'pending', {
    command: capabilityCommand(pathValue, args),
  });

  return validateChannelApprovalPendingCommand(
    smokeCase,
    { ok: true, result: { actions: [pendingItem] } },
    '2026-06-29T00:09:59.000Z',
    'http://127.0.0.1:41234/slice04-channel-smoke',
  );
}

test('channel approval live smoke describes CR surfaces and isolated profile seed', () => {
  assert.equal(CHANNEL_APPROVAL_LIVE_SMOKE_SOURCE, 'xenesis-channel-approval-live-smoke');
  assert.equal(CHANNEL_APPROVAL_LIVE_SMOKE_SUBMIT_PATH, 'xd.testing.xenesisAgent.submitPrompt');
  assert.equal(CHANNEL_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR, '.btn-settings');

  assert.deepEqual(CHANNEL_APPROVAL_LIVE_SMOKE_OPEN_REQUEST, {
    path: 'xd.tools.core.xenesisAgent.open',
    source: 'xenesis-channel-approval-live-smoke',
    approved: true,
    args: {
      placement: 'tab',
    },
  });

  assert.deepEqual(CHANNEL_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST, {
    path: 'xd.mcp.actionInbox.list',
    source: 'xenesis-channel-approval-live-smoke',
    approved: true,
    args: {},
  });

  assert.deepEqual(CHANNEL_APPROVAL_LIVE_SMOKE_PROFILE_INSTALL_REQUEST, {
    path: 'xd.xenesis.profiles.install',
    source: 'xenesis-channel-approval-live-smoke',
    approved: true,
    args: { template: 'desk', name: 'slice04-channel-smoke', activate: true },
  });
});

test('channel approval live smoke uses fenced approved false prompts for apply and test-send', () => {
  assert.deepEqual(
    CHANNEL_APPROVAL_LIVE_SMOKE_CASES.map((smokeCase) => smokeCase.expectedRequestPath),
    ['xd.xenesis.channels.profileDrafts.apply', 'xd.xenesis.profiles.testChannel'],
  );

  const applyCase = CHANNEL_APPROVAL_LIVE_SMOKE_CASES.find(
    (smokeCase) => smokeCase.expectedRequestPath === 'xd.xenesis.channels.profileDrafts.apply',
  );
  const testSendCase = CHANNEL_APPROVAL_LIVE_SMOKE_CASES.find(
    (smokeCase) => smokeCase.expectedRequestPath === 'xd.xenesis.profiles.testChannel',
  );
  assert.ok(applyCase);
  assert.ok(testSendCase);

  const applyPayload = extractDeskActionPayload(applyCase.requestPrompt);
  assert.deepEqual(applyPayload, {
    path: 'xd.xenesis.channels.profileDrafts.apply',
    args: {
      channel: 'webhook',
      profile: 'slice04-channel-smoke',
      settings: {
        enabled: true,
        urlEnv: 'XENESIS_SLICE04_WEBHOOK_URL',
        approvalMode: 'safe',
      },
    },
    approved: false,
    reason: 'Apply Slice 04 loopback webhook channel profile draft',
  });

  const testSendPayload = extractDeskActionPayload(testSendCase.requestPrompt);
  assert.deepEqual(testSendPayload, {
    path: 'xd.xenesis.profiles.testChannel',
    args: {
      channel: 'webhook',
      profile: 'slice04-channel-smoke',
    },
    approved: false,
    reason: 'Send Slice 04 loopback webhook diagnostic',
  });
  assert.equal(Object.hasOwn(testSendPayload.args, 'channels'), false);

  const unsafePromptValues = [
    'http://127.0.0.1:41234/slice04',
    ...CHANNEL_APPROVAL_LIVE_SMOKE_RAW_TARGET_IDENTIFIERS,
    ...CHANNEL_APPROVAL_LIVE_SMOKE_FAKE_SECRET_MARKERS,
  ];
  for (const smokeCase of CHANNEL_APPROVAL_LIVE_SMOKE_CASES) {
    assert.match(smokeCase.requestPrompt, /```xenesis-desk-action/);
    assert.equal(extractDeskActionPayload(smokeCase.requestPrompt).approved, false);
    assertTextExcludes(smokeCase.requestPrompt, unsafePromptValues);
  }
});

test('channel approval live smoke submit calls drive the Agent pane testing path', () => {
  const smokeCase = CHANNEL_APPROVAL_LIVE_SMOKE_CASES[0];

  assert.deepEqual(buildChannelApprovalSubmitRequest(smokeCase, 'request', 42000), {
    path: 'xd.testing.xenesisAgent.submitPrompt',
    source: 'xenesis-channel-approval-live-smoke',
    approved: true,
    args: {
      prompt: smokeCase.requestPrompt,
      expectedText: 'Desk action approval required',
      expectedTextScope: 'anywhere',
      timeoutMs: 42000,
    },
  });

  assert.deepEqual(buildChannelApprovalSubmitRequest(smokeCase, 'approval', 42000), {
    path: 'xd.testing.xenesisAgent.submitPrompt',
    source: 'xenesis-channel-approval-live-smoke',
    approved: true,
    args: {
      prompt: '[approve pending Desk action]',
      expectedText: 'Desk action completed',
      expectedTextScope: 'anywhere',
      timeoutMs: 42000,
      approvePendingAction: true,
      approvalAction: 'once',
    },
  });
});

test('channel approval live smoke builds scrubbed Electron env for loopback-only delivery', () => {
  assert.deepEqual(CHANNEL_APPROVAL_LIVE_SMOKE_DEFAULT_DELIVERY_ENV_NAMES, [
    'TELEGRAM_BOT_TOKEN',
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_WEBHOOK_URL',
    'DISCORD_BOT_TOKEN',
    'DISCORD_WEBHOOK_URL',
    'XENESIS_WEBHOOK_URL',
  ]);
  assert.equal(CHANNEL_APPROVAL_LIVE_SMOKE_LOOPBACK_ENV_NAME, 'XENESIS_SLICE04_WEBHOOK_URL');

  const loopbackUrl = 'http://127.0.0.1:41234/slice04-channel-smoke';
  const env = buildChannelApprovalLiveSmokeEnv(
    {
      PATH: 'test-path',
      TELEGRAM_BOT_TOKEN: 'telegram-secret-token',
      SLACK_BOT_TOKEN: 'xoxb-slice04-secret',
      slack_signing_secret: 'slack-signing-secret',
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/slice04',
      slack_webhook_url: 'https://hooks.slack.com/services/lowercase',
      DISCORD_BOT_TOKEN: 'discord-secret-token',
      discord_bot_token: 'discord-secret-token-lowercase',
      DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/slice04',
      XENESIS_WEBHOOK_URL: 'https://slice04.invalid/default-webhook',
      xenesis_webhook_url: 'https://slice04.invalid/lowercase-default-webhook',
      xenesis_slice04_webhook_url: 'https://slice04.invalid/stale-lowercase-loopback',
      XENESIS_SLICE04_WEBHOOK_URL: 'https://slice04.invalid/stale-loopback',
    },
    'C:\\tmp\\xd-channel-home',
    'C:\\tmp\\xd-channel-user-data',
    loopbackUrl,
  );

  for (const name of CHANNEL_APPROVAL_LIVE_SMOKE_DEFAULT_DELIVERY_ENV_NAMES) {
    assert.equal(Object.hasOwn(env, name), false, `${name} should be removed`);
  }
  for (const name of ['slack_signing_secret', 'slack_webhook_url', 'discord_bot_token', 'xenesis_webhook_url']) {
    assert.equal(Object.hasOwn(env, name), false, `${name} should be removed case-insensitively`);
  }
  assert.equal(env.PATH, 'test-path');
  assert.equal(env.XENIS_HOME, 'C:\\tmp\\xd-channel-home');
  assert.equal(env.XENESIS_DESK_USER_DATA_DIR, 'C:\\tmp\\xd-channel-user-data');
  assert.equal(env.XENESIS_CHANNEL_APPROVAL_LIVE_SMOKE, '1');
  assert.equal(env.XENESIS_SLICE04_WEBHOOK_URL, loopbackUrl);
  assert.deepEqual(
    Object.entries(env)
      .filter(([, value]) => value === loopbackUrl)
      .map(([name]) => name),
    ['XENESIS_SLICE04_WEBHOOK_URL'],
  );
  assert.equal(Object.hasOwn(env, 'xenesis_slice04_webhook_url'), false);
});

test('channel approval live smoke rejects third-party delivery and unsafe approval commands', () => {
  assert.deepEqual(CHANNEL_APPROVAL_LIVE_SMOKE_THIRD_PARTY_CHANNELS, ['telegram', 'slack', 'discord']);

  const unsafeValues = [
    'http://127.0.0.1:41234/slice04',
    ...CHANNEL_APPROVAL_LIVE_SMOKE_DEFAULT_DELIVERY_ENV_NAMES,
    ...CHANNEL_APPROVAL_LIVE_SMOKE_RAW_TARGET_IDENTIFIERS,
    ...CHANNEL_APPROVAL_LIVE_SMOKE_FAKE_SECRET_MARKERS,
  ];
  const testSendCase = CHANNEL_APPROVAL_LIVE_SMOKE_CASES.find(
    (smokeCase) => smokeCase.expectedRequestPath === 'xd.xenesis.profiles.testChannel',
  );
  assert.ok(testSendCase);
  const command = capabilityItem(testSendCase.expectedRequestPath).command;
  const parsed = parseCapabilityApprovalCommand(command);

  assert.equal(parsed.path, 'xd.xenesis.profiles.testChannel');
  assert.deepEqual(parsed.args, { channel: 'webhook', profile: 'slice04-channel-smoke' });
  assertTextExcludes(command.toLowerCase(), CHANNEL_APPROVAL_LIVE_SMOKE_THIRD_PARTY_CHANNELS);
  assertTextExcludes(command, unsafeValues);
  assertChannelApprovalSmokeTextSafe(command, {
    loopbackUrl: 'http://127.0.0.1:41234/slice04',
    includeDefaultDeliveryEnvNames: true,
  });
});

test('channel approval live smoke redacts unsafe values from safety checker errors', () => {
  const unsafeUrl = 'http://127.0.0.1:41234/slice04-channel-smoke';
  assert.throws(
    () => assertChannelApprovalSmokeTextSafe(`leaked ${unsafeUrl}`, { loopbackUrl: unsafeUrl }),
    (error) => {
      assert.match(error.message, /loopback URL/i);
      assert.doesNotMatch(error.message, /127\.0\.0\.1/);
      assert.doesNotMatch(error.message, /41234/);
      return true;
    },
  );

  assert.throws(
    () => assertChannelApprovalSmokeTextSafe('leaked XENESIS_WEBHOOK_URL', { includeDefaultDeliveryEnvNames: true }),
    (error) => {
      assert.match(error.message, /default delivery env/i);
      assert.doesNotMatch(error.message, /XENESIS_WEBHOOK_URL/);
      return true;
    },
  );
});

test('channel approval live smoke rejects apply settings.url without echoing literal', () => {
  const unsafeUrl = 'https://attacker.example/apply-settings-only';
  const validation = validatePendingCommandArgs('xd.xenesis.channels.profileDrafts.apply', {
    channel: 'webhook',
    profile: 'slice04-channel-smoke',
    settings: {
      enabled: true,
      urlEnv: 'XENESIS_SLICE04_WEBHOOK_URL',
      approvalMode: 'safe',
      url: unsafeUrl,
    },
  });

  assert.equal(validation.ok, false);
  assert.match(String(validation.error || ''), /unexpected/i);
  assert.equal(String(validation.error || '').includes(unsafeUrl), false);
  assert.doesNotMatch(String(validation.error || ''), /attacker\.example/);
  assert.doesNotMatch(String(validation.error || ''), /https:\/\//);
});

test('channel approval live smoke rejects apply channels.webhook without echoing literal', () => {
  const unsafeUrl = 'https://attacker.example/apply-channels-only';
  const validation = validatePendingCommandArgs('xd.xenesis.channels.profileDrafts.apply', {
    channel: 'webhook',
    profile: 'slice04-channel-smoke',
    settings: {
      enabled: true,
      urlEnv: 'XENESIS_SLICE04_WEBHOOK_URL',
      approvalMode: 'safe',
    },
    channels: {
      webhook: unsafeUrl,
    },
  });

  assert.equal(validation.ok, false);
  assert.match(String(validation.error || ''), /unexpected/i);
  assert.equal(String(validation.error || '').includes(unsafeUrl), false);
  assert.doesNotMatch(String(validation.error || ''), /attacker\.example/);
  assert.doesNotMatch(String(validation.error || ''), /https:\/\//);
});

test('channel approval live smoke rejects each test-send extra field without echoing raw values', async (t) => {
  const unsafeFieldCases = [
    [
      'channels',
      { channels: { webhook: 'https://attacker.example/test-send-channels' } },
      'https://attacker.example/test-send-channels',
    ],
    ['message', { message: 'raw test-send diagnostic message' }, 'raw test-send diagnostic message'],
    ['settings', { settings: { target: 'raw-test-send-settings-target' } }, 'raw-test-send-settings-target'],
    ['id', { id: 'raw-test-send-id' }, 'raw-test-send-id'],
    ['name', { name: 'raw-test-send-name' }, 'raw-test-send-name'],
    ['url', { url: 'https://attacker.example/test-send-url' }, 'https://attacker.example/test-send-url'],
    ['target', { target: 'raw-test-send-target' }, 'raw-test-send-target'],
  ];

  for (const [fieldName, extraArgs, rawValue] of unsafeFieldCases) {
    await t.test(String(fieldName), () => {
      const validation = validatePendingCommandArgs('xd.xenesis.profiles.testChannel', {
        channel: 'webhook',
        profile: 'slice04-channel-smoke',
        ...extraArgs,
      });

      assert.equal(validation.ok, false);
      assert.match(String(validation.error || ''), /unexpected/i);
      assert.equal(String(validation.error || '').includes(String(rawValue)), false);
      assert.doesNotMatch(String(validation.error || ''), /attacker\.example/);
      assert.doesNotMatch(String(validation.error || ''), /https:\/\//);
    });
  }
});

test('channel approval live smoke rejects apply pending command extra raw fields before approval', () => {
  const loopbackUrl = 'http://127.0.0.1:41234/slice04-channel-smoke';
  const applyCase = CHANNEL_APPROVAL_LIVE_SMOKE_CASES.find(
    (smokeCase) => smokeCase.expectedRequestPath === 'xd.xenesis.channels.profileDrafts.apply',
  );
  assert.ok(applyCase);
  const unsafeUrl = 'https://attacker.example/hook';
  const pendingItem = capabilityItem(applyCase.expectedRequestPath, 'pending', {
    command: capabilityCommand(applyCase.expectedRequestPath, {
      channel: 'webhook',
      profile: 'slice04-channel-smoke',
      settings: {
        enabled: true,
        urlEnv: 'XENESIS_SLICE04_WEBHOOK_URL',
        approvalMode: 'safe',
        url: unsafeUrl,
      },
      channels: {
        webhook: unsafeUrl,
      },
    }),
  });

  const validation = validateChannelApprovalPendingCommand(
    applyCase,
    { ok: true, result: { actions: [pendingItem] } },
    '2026-06-29T00:09:59.000Z',
    loopbackUrl,
  );

  assert.equal(validation.ok, false);
  assert.match(String(validation.error || ''), /unexpected/i);
  assert.doesNotMatch(String(validation.error || ''), /attacker\.example/);
  assert.doesNotMatch(String(validation.error || ''), /https:\/\//);
});

test('channel approval live smoke rejects test-send pending command extra raw fields before approval', () => {
  const loopbackUrl = 'http://127.0.0.1:41234/slice04-channel-smoke';
  const testSendCase = CHANNEL_APPROVAL_LIVE_SMOKE_CASES.find(
    (smokeCase) => smokeCase.expectedRequestPath === 'xd.xenesis.profiles.testChannel',
  );
  assert.ok(testSendCase);
  const unsafeUrl = 'https://attacker.example/hook';
  const unsafeTarget = 'attacker-target';
  const pendingItem = capabilityItem(testSendCase.expectedRequestPath, 'pending', {
    command: capabilityCommand(testSendCase.expectedRequestPath, {
      channel: 'webhook',
      profile: 'slice04-channel-smoke',
      url: unsafeUrl,
      target: unsafeTarget,
    }),
  });

  const validation = validateChannelApprovalPendingCommand(
    testSendCase,
    { ok: true, result: { actions: [pendingItem] } },
    '2026-06-29T00:09:59.000Z',
    loopbackUrl,
  );

  assert.equal(validation.ok, false);
  assert.match(String(validation.error || ''), /unexpected/i);
  assert.doesNotMatch(String(validation.error || ''), /attacker\.example/);
  assert.doesNotMatch(String(validation.error || ''), /attacker-target/);
  assert.doesNotMatch(String(validation.error || ''), /https:\/\//);
});

test('channel approval live smoke accepts exact pending command args', () => {
  const loopbackUrl = 'http://127.0.0.1:41234/slice04-channel-smoke';

  for (const smokeCase of CHANNEL_APPROVAL_LIVE_SMOKE_CASES) {
    const validation = validateChannelApprovalPendingCommand(
      smokeCase,
      { ok: true, result: { actions: [capabilityItem(smokeCase.expectedRequestPath)] } },
      '2026-06-29T00:09:59.000Z',
      loopbackUrl,
    );

    assert.equal(validation.ok, true, validation.error);
  }
});

test('channel approval live smoke labels proof as structured CR approval evidence', () => {
  assert.equal(CHANNEL_APPROVAL_LIVE_SMOKE_PROOF_TYPE, 'structured-cr-approval-evidence');
  assert.equal(CHANNEL_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF, false);

  const plan = formatChannelApprovalLiveSmokePlan();
  assert.match(plan, /Proof type: structured-cr-approval-evidence/);
  assert.match(plan, /Provider natural-language CR tool-selection proof: false/);
  assert.match(plan, /Structured CR approval evidence: fenced xenesis-desk-action blocks plus Action Inbox readback/);
  assert.match(plan, /Loopback webhook env: XENESIS_SLICE04_WEBHOOK_URL/);
  assert.match(plan, /Third-party delivery disabled: telegram, slack, discord/);
  assert.doesNotMatch(plan, /natural-language provider routing proof/i);
});

test('channel approval live smoke normalizes Action Inbox approval and loopback checks', () => {
  const loopbackUrl = 'http://127.0.0.1:41234/slice04-channel-smoke';
  const [applyCase, testSendCase] = CHANNEL_APPROVAL_LIVE_SMOKE_CASES;
  const checks = normalizeChannelApprovalChecks({
    startedAt: '2026-06-29T00:09:59.000Z',
    loopbackUrl,
    requestSubmitResults: new Map([
      [
        applyCase.id,
        {
          ok: true,
          result: {
            ok: true,
            submitted: true,
            matchedExpectedText: true,
            responseTextPreview: `Desk action approval required\n${applyCase.expectedRequestPath}`,
          },
        },
      ],
      [
        testSendCase.id,
        {
          ok: true,
          result: {
            ok: true,
            submitted: true,
            matchedExpectedText: true,
            responseTextPreview: `Desk action approval required\n${testSendCase.expectedRequestPath}`,
          },
        },
      ],
    ]),
    approvalSubmitResults: new Map([
      [
        applyCase.id,
        {
          ok: true,
          result: {
            ok: true,
            submitted: true,
            approvalButtonClicked: true,
            approvalButtonText: '승인 후 실행',
            matchedExpectedText: true,
            responseTextPreview: `Desk action completed\n${applyCase.expectedRequestPath}`,
          },
        },
      ],
      [
        testSendCase.id,
        {
          ok: true,
          result: {
            ok: true,
            submitted: true,
            approvalButtonClicked: true,
            approvalButtonText: '승인 후 실행',
            matchedExpectedText: true,
            responseTextPreview: `Desk action completed\n${testSendCase.expectedRequestPath}`,
          },
        },
      ],
    ]),
    pendingActionInboxResults: new Map([
      [applyCase.id, { ok: true, result: { actions: [capabilityItem(applyCase.expectedRequestPath)] } }],
      [testSendCase.id, { ok: true, result: { actions: [capabilityItem(testSendCase.expectedRequestPath)] } }],
    ]),
    afterActionInboxResults: new Map([
      [applyCase.id, { ok: true, result: { actions: [capabilityItem(applyCase.expectedRequestPath, 'approved')] } }],
      [
        testSendCase.id,
        { ok: true, result: { actions: [capabilityItem(testSendCase.expectedRequestPath, 'approved')] } },
      ],
    ]),
    loopbackRequests: [
      {
        method: 'POST',
        body: {
          channel: 'webhook',
          conversationId: 'test',
          text: 'Xenesis Desk external bot test\nprofile: slice04-channel-smoke\nchannel: webhook',
        },
      },
    ],
  });

  assert.deepEqual(
    checks.map((check) => [check.id, check.ok]),
    [
      ['webhook-profile-draft-apply:request-submit', true],
      ['webhook-profile-draft-apply:pending-capability-approval', true],
      ['webhook-profile-draft-apply:approval-submit', true],
      ['webhook-profile-draft-apply:approved-capability-approval', true],
      ['webhook-test-send:request-submit', true],
      ['webhook-test-send:pending-capability-approval', true],
      ['webhook-test-send:test-send-command-sanitized', true],
      ['webhook-test-send:approval-submit', true],
      ['webhook-test-send:loopback-delivery', true],
      ['webhook-test-send:approved-capability-approval', true],
    ],
  );
});

test('channel approval live smoke rejects unsafe apply pending command before approval', () => {
  const loopbackUrl = 'http://127.0.0.1:41234/slice04-channel-smoke';
  const [applyCase] = CHANNEL_APPROVAL_LIVE_SMOKE_CASES;
  const unsafeApplyItem = capabilityItem(applyCase.expectedRequestPath, 'pending', {
    command: capabilityCommand(applyCase.expectedRequestPath, {
      channel: 'webhook',
      profile: 'slice04-channel-smoke',
      settings: {
        enabled: true,
        urlEnv: 'XENESIS_WEBHOOK_URL',
        approvalMode: 'safe',
      },
    }),
  });

  const checks = normalizeChannelApprovalChecks({
    startedAt: '2026-06-29T00:09:59.000Z',
    loopbackUrl,
    requestSubmitResults: new Map([
      [
        applyCase.id,
        {
          ok: true,
          result: {
            ok: true,
            submitted: true,
            matchedExpectedText: true,
            responseTextPreview: `Desk action approval required\n${applyCase.expectedRequestPath}`,
          },
        },
      ],
    ]),
    approvalSubmitResults: new Map([
      [
        applyCase.id,
        {
          ok: true,
          result: {
            ok: true,
            submitted: true,
            approvalButtonClicked: true,
            approvalButtonText: '승인 후 실행',
            matchedExpectedText: true,
            responseTextPreview: `Desk action completed\n${applyCase.expectedRequestPath}`,
          },
        },
      ],
    ]),
    pendingActionInboxResults: new Map([[applyCase.id, { ok: true, result: { actions: [unsafeApplyItem] } }]]),
    afterActionInboxResults: new Map([
      [applyCase.id, { ok: true, result: { actions: [capabilityItem(applyCase.expectedRequestPath, 'approved')] } }],
    ]),
    loopbackRequests: [],
  });

  const pendingCheck = checks.find((check) => check.id === 'webhook-profile-draft-apply:pending-capability-approval');
  assert.ok(pendingCheck);
  assert.equal(pendingCheck.ok, false);
  assert.match(pendingCheck.error, /default delivery env/i);
  assert.doesNotMatch(pendingCheck.error, /XENESIS_WEBHOOK_URL/);
});

test('channel approval live smoke validates pending command before approval in run flow', () => {
  const source = readFileSync('scripts/xenesisChannelApprovalLiveSmoke.mjs', 'utf8');
  const runStart = source.indexOf('export async function runChannelApprovalLiveSmoke');
  assert.notEqual(runStart, -1);
  const loopStart = source.indexOf('for (const promptCase of CHANNEL_APPROVAL_LIVE_SMOKE_CASES)', runStart);
  const loopEnd = source.indexOf('const normalizedChecks = normalizeChannelApprovalChecks', loopStart);
  assert.notEqual(loopStart, -1);
  assert.notEqual(loopEnd, -1);
  const loopSource = source.slice(loopStart, loopEnd);
  const pendingIndex = loopSource.indexOf('pendingActionInboxResults.set(promptCase.id, pendingActionInboxResult)');
  const validationIndex = loopSource.indexOf('validateChannelApprovalPendingCommand(');
  const approvalIndex = loopSource.indexOf("buildChannelApprovalSubmitRequest(promptCase, 'approval', timeout)");

  assert.ok(pendingIndex >= 0, 'pending Action Inbox result should be recorded');
  assert.ok(validationIndex > pendingIndex, 'pending command validation should run after pending readback');
  assert.ok(approvalIndex > validationIndex, 'approval submit should be built only after pending command validation');
});

test('channel approval live smoke approved Action Inbox readback must be fresh', () => {
  const loopbackUrl = 'http://127.0.0.1:41234/slice04-channel-smoke';
  const [applyCase] = CHANNEL_APPROVAL_LIVE_SMOKE_CASES;
  const checks = normalizeChannelApprovalChecks({
    startedAt: '2026-06-29T00:09:59.000Z',
    loopbackUrl,
    requestSubmitResults: new Map(),
    approvalSubmitResults: new Map(),
    pendingActionInboxResults: new Map([
      [applyCase.id, { ok: true, result: { actions: [capabilityItem(applyCase.expectedRequestPath)] } }],
    ]),
    afterActionInboxResults: new Map([
      [
        applyCase.id,
        {
          ok: true,
          result: {
            actions: [
              capabilityItem(applyCase.expectedRequestPath, 'approved', {
                updatedAt: '2026-06-29T00:09:00.000Z',
                resolvedAt: '2026-06-29T00:09:00.000Z',
              }),
            ],
          },
        },
      ],
    ]),
    loopbackRequests: [],
  });

  const approvedCheck = checks.find((check) => check.id === 'webhook-profile-draft-apply:approved-capability-approval');
  assert.ok(approvedCheck);
  assert.equal(approvedCheck.ok, false);
  assert.match(approvedCheck.error, /not refreshed/i);
});

test('channel approval live smoke temp dir helper cleans first temp dir when second allocation fails', async () => {
  assert.equal(typeof channelSmoke.createChannelApprovalTempStateDirs, 'function');
  const removed = [];

  await assert.rejects(
    () =>
      channelSmoke.createChannelApprovalTempStateDirs({
        options: {},
        mkdtempImpl: async (prefix) => {
          if (String(prefix).includes('user-data')) {
            throw new Error('second mkdtemp failed');
          }
          return 'C:\\tmp\\xenesis-channel-approval-first';
        },
        rmImpl: async (target, options) => {
          removed.push([target, options]);
        },
      }),
    /second mkdtemp failed/,
  );

  assert.deepEqual(removed, [['C:\\tmp\\xenesis-channel-approval-first', { recursive: true, force: true }]]);
});

test('channel approval live smoke loopback server records approved webhook test delivery', async () => {
  const server = await startChannelApprovalLoopbackWebhookServer();
  try {
    assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/slice04-channel-approval$/);
    const response = await fetch(server.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channel: 'webhook',
        conversationId: 'test',
        text: 'Xenesis Desk external bot test',
      }),
    });

    assert.equal(response.status, 204);
    await server.waitForRequests(1, 1000);
    assert.equal(server.requests.length, 1);
    assert.deepEqual(server.requests[0].body, {
      channel: 'webhook',
      conversationId: 'test',
      text: 'Xenesis Desk external bot test',
    });
  } finally {
    await server.close();
  }
});

test('channel approval live smoke extracts Action Inbox arrays from supported result shapes', () => {
  assert.deepEqual(extractActionInboxItems({ ok: true, result: { actions: [{ id: 'a' }] } }), [{ id: 'a' }]);
  assert.deepEqual(extractActionInboxItems({ ok: true, result: { items: [{ id: 'b' }] } }), [{ id: 'b' }]);
  assert.deepEqual(extractActionInboxItems({ ok: true, result: [{ id: 'c' }] }), [{ id: 'c' }]);
  assert.deepEqual(extractActionInboxItems({ ok: true, result: {} }), []);
});

test('channel approval live smoke report protects proof metadata and summarizes checks', () => {
  const report = buildChannelApprovalLiveSmokeReport(
    [
      { id: 'agent-open', ok: true },
      { id: 'loopback-delivery', ok: false, error: 'missing request' },
    ],
    new Date('2026-06-29T00:00:00.000Z'),
    {
      ok: true,
      proofType: 'provider-routing',
      providerNaturalLanguageToolSelectionProof: true,
      loopback: { received: 0 },
    },
  );

  assert.equal(report.ok, false);
  assert.equal(report.proofType, 'structured-cr-approval-evidence');
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
  assert.deepEqual(report.summary, { total: 2, passed: 1, failed: 1 });
  assert.deepEqual(report.loopback, { received: 0 });
});

test('channel approval live smoke package script is exposed explicitly', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['smoke:xenesis:channel-approval'],
    'node ./scripts/xenesisChannelApprovalLiveSmoke.mjs',
  );
});
