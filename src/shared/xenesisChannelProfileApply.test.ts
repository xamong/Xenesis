import assert from 'node:assert/strict';
import test from 'node:test';
import type { XenesisProfileChannelSettings } from './types';
import {
  buildXenesisChannelProfileDraftApplyChannels,
  isXenesisChannelProfileDraftApplyChannel,
} from './xenesisChannelProfileApply';

const CURRENT_CHANNELS: XenesisProfileChannelSettings = {
  telegram: {
    enabled: false,
    tokenEnv: 'TELEGRAM_BOT_TOKEN',
    allowedChatIds: '',
    approvalMode: 'safe',
    maxTurns: 12,
    maxTokens: 120000,
  },
  slack: {
    enabled: false,
    botTokenEnv: 'SLACK_BOT_TOKEN',
    signingSecretEnv: 'SLACK_SIGNING_SECRET',
    webhookUrlEnv: 'SLACK_WEBHOOK_URL',
    allowedChannelIds: 'COLD',
    approvalMode: 'safe',
    maxTurns: 12,
    maxTokens: 120000,
  },
  discord: {
    enabled: false,
    botTokenEnv: 'DISCORD_BOT_TOKEN',
    webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
    allowedChannelIds: '',
    allowedGuildIds: '',
    approvalMode: 'safe',
    maxTurns: 12,
    maxTokens: 120000,
  },
  webhook: {
    enabled: false,
    urlEnv: 'XENESIS_WEBHOOK_URL',
    approvalMode: 'safe',
    maxTurns: 12,
    maxTokens: 120000,
  },
};

test('isXenesisChannelProfileDraftApplyChannel allows implemented messenger channels only', () => {
  for (const channel of ['telegram', 'slack', 'discord', 'webhook']) {
    assert.equal(isXenesisChannelProfileDraftApplyChannel(channel), true, channel);
  }

  for (const channel of ['signal', 'google-chat', 'zalo', '', undefined]) {
    assert.equal(isXenesisChannelProfileDraftApplyChannel(channel), false, String(channel));
  }
});

test('buildXenesisChannelProfileDraftApplyChannels merges one telegram draft without exposing secret values', () => {
  const result = buildXenesisChannelProfileDraftApplyChannels({
    channel: 'telegram',
    currentChannels: CURRENT_CHANNELS,
    args: {
      settings: {
        enabled: true,
        tokenEnv: 'TELEGRAM_BOT_TOKEN',
        allowedChatIds: '12345,67890',
        approvalMode: 'readonly',
        maxTurns: 4,
        maxTokens: 32000,
      },
    },
  });

  assert.deepEqual(result.missingRequiredFields, []);
  assert.equal(result.channels.telegram.enabled, true);
  assert.equal(result.channels.telegram.tokenEnv, 'TELEGRAM_BOT_TOKEN');
  assert.equal(result.channels.telegram.allowedChatIds, '12345,67890');
  assert.equal(result.channels.telegram.approvalMode, 'readonly');
  assert.equal(result.channels.telegram.maxTurns, 4);
  assert.equal(result.channels.telegram.maxTokens, 32000);
  assert.deepEqual(result.channels.slack, CURRENT_CHANNELS.slack);
  assert.equal(JSON.stringify(result).includes('secret-token-value'), false);
});

test('buildXenesisChannelProfileDraftApplyChannels reports missing required channel fields before profile writes', () => {
  const result = buildXenesisChannelProfileDraftApplyChannels({
    channel: 'slack',
    currentChannels: CURRENT_CHANNELS,
    args: {
      settings: {
        botTokenEnv: 'not an env var',
        signingSecretEnv: '',
        allowedChannelIds: '',
      },
    },
  });

  assert.deepEqual(result.missingRequiredFields, [
    'botTokenEnv:env-ref',
    'signingSecretEnv:env-ref',
    'allowedChannelIds',
  ]);
  assert.equal(result.channels.slack.botTokenEnv, 'SLACK_BOT_TOKEN');
  assert.equal(result.channels.slack.allowedChannelIds, 'COLD');
});
