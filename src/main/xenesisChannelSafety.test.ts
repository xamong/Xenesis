import assert from 'node:assert/strict';
import { test } from 'node:test';

import { redactXenesisChannelTargetList, sanitizeXenesisChannelSendError } from './xenesisChannelSafety';

test('redactXenesisChannelTargetList hides configured channel targets', () => {
  assert.equal(redactXenesisChannelTargetList('12345, C012345'), '<configured>');
});

test('sanitizeXenesisChannelSendError redacts secrets, webhook URLs, and channel targets', () => {
  const telegramToken = 'telegram-secret-token';
  const slackWebhookUrl = 'https://hooks.slack.com/services/T000/B000/secret';
  const discordWebhookUrl = 'https://discord.com/api/webhooks/1234567890/discord-secret';
  const directWebhookUrl = 'https://example.invalid/direct-webhook-secret';
  const telegramChatId = '12345';
  const slackChannelId = 'C012345';
  const discordChannelId = '987654321012345678';
  const discordGuildId = '111122223333444455';
  const webhookTarget = 'test';

  const sanitized = sanitizeXenesisChannelSendError(
    'Telegram test send failed',
    new Error(
      [
        'Telegram test send failed:',
        `token=${telegramToken}`,
        `slackWebhook=${slackWebhookUrl}`,
        `discordWebhook=${discordWebhookUrl}`,
        `url=${directWebhookUrl}`,
        `telegramChat=${telegramChatId}`,
        `slackChannel=${slackChannelId}`,
        `discordChannel=${discordChannelId}`,
        `guild=${discordGuildId}`,
        `target=${webhookTarget}`,
      ].join(' '),
    ),
    {
      secrets: [telegramToken, slackWebhookUrl, discordWebhookUrl, directWebhookUrl],
      targets: [telegramChatId, slackChannelId, discordChannelId, discordGuildId, webhookTarget],
    },
  );

  assert.match(sanitized.message, /^Telegram test send failed/);
  const detail = sanitized.message.slice('Telegram test send failed'.length);
  assert.doesNotMatch(sanitized.message, /telegram-secret-token/);
  assert.doesNotMatch(sanitized.message, /hooks\.slack\.com/);
  assert.doesNotMatch(sanitized.message, /discord\.com\/api\/webhooks/);
  assert.doesNotMatch(sanitized.message, /example\.invalid\/direct-webhook-secret/);
  assert.doesNotMatch(sanitized.message, /\b12345\b/);
  assert.doesNotMatch(sanitized.message, /\bC012345\b/);
  assert.doesNotMatch(sanitized.message, /\b987654321012345678\b/);
  assert.doesNotMatch(sanitized.message, /\b111122223333444455\b/);
  assert.doesNotMatch(detail, /\btest\b/);
});

test('sanitizeXenesisChannelSendError preserves operation label', () => {
  const sanitized = sanitizeXenesisChannelSendError(
    'Telegram test send failed',
    new Error('Telegram test send failed: token=telegram-secret-token'),
    { secrets: ['telegram-secret-token'], targets: [] },
  );

  assert.match(sanitized.message, /^Telegram test send failed/);
});

test('sanitizeXenesisChannelSendError ignores empty sensitive values', () => {
  const sanitized = sanitizeXenesisChannelSendError(
    'Webhook test send failed',
    new Error('Webhook test send failed: target=test token=webhook-secret'),
    { secrets: ['', 'webhook-secret'], targets: ['', 'test'] },
  );

  assert.match(sanitized.message, /^Webhook test send failed/);
  const detail = sanitized.message.slice('Webhook test send failed'.length);
  assert.doesNotMatch(sanitized.message, /webhook-secret/);
  assert.doesNotMatch(detail, /\btest\b/);
});
