import type {
  XenesisApprovalMode,
  XenesisDiscordChannelSettings,
  XenesisProfileChannelName,
  XenesisProfileChannelSettings,
  XenesisSlackChannelSettings,
  XenesisTelegramChannelSettings,
  XenesisWebhookChannelSettings,
} from './types';

const APPLY_CHANNELS = ['telegram', 'slack', 'discord', 'webhook'] as const;
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

type ApplyChannel = (typeof APPLY_CHANNELS)[number];
type ApplyArgs = Record<string, unknown>;

export interface XenesisChannelProfileDraftApplyBuildInput {
  channel: XenesisProfileChannelName;
  currentChannels: XenesisProfileChannelSettings;
  args?: ApplyArgs;
}

export interface XenesisChannelProfileDraftApplyBuildResult {
  channel: ApplyChannel;
  channels: XenesisProfileChannelSettings;
  missingRequiredFields: string[];
}

export function isXenesisChannelProfileDraftApplyChannel(value: unknown): value is ApplyChannel {
  return typeof value === 'string' && APPLY_CHANNELS.includes(value as ApplyChannel);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function own(record: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(record, key);
}

function settingsRecord(args?: ApplyArgs): Record<string, unknown> {
  if (isRecord(args?.settings)) return args.settings;
  if (!isRecord(args)) return {};
  return args;
}

function normalizeApprovalMode(value: unknown, fallback: XenesisApprovalMode): XenesisApprovalMode {
  return value === 'readonly' || value === 'safe' || value === 'auto' ? value : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value.trim())) return Number(value.trim());
  return fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validEnvRef(value: unknown): string | undefined {
  const text = normalizeText(value);
  if (!text || !ENV_NAME_PATTERN.test(text)) return undefined;
  return text;
}

function normalizeListText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(',');
  }
  return normalizeText(value);
}

function hasListValue(value: unknown): boolean {
  return normalizeListText(value).length > 0;
}

function missingRequiredEnv(
  settings: Record<string, unknown>,
  key: string,
  fallback: string,
  missing: string[],
): string {
  if (!own(settings, key)) {
    if (validEnvRef(fallback)) return fallback;
    missing.push(`${key}:env-ref`);
    return fallback;
  }

  const next = validEnvRef(settings[key]);
  if (next) return next;
  missing.push(`${key}:env-ref`);
  return fallback;
}

function optionalEnv(settings: Record<string, unknown>, key: string, fallback: string): string {
  if (!own(settings, key)) return fallback;
  return validEnvRef(settings[key]) ?? fallback;
}

function requiredList(settings: Record<string, unknown>, key: string, fallback: string, missing: string[]): string {
  if (!own(settings, key)) {
    if (hasListValue(fallback)) return fallback;
    missing.push(key);
    return fallback;
  }

  const next = normalizeListText(settings[key]);
  if (next) return next;
  missing.push(key);
  return fallback;
}

function withGuardrails<T extends { approvalMode: XenesisApprovalMode; maxTurns: number; maxTokens: number }>(
  current: T,
  settings: Record<string, unknown>,
): Pick<T, 'approvalMode' | 'maxTurns' | 'maxTokens'> {
  return {
    approvalMode: normalizeApprovalMode(settings.approvalMode, current.approvalMode),
    maxTurns: normalizePositiveInteger(settings.maxTurns, current.maxTurns),
    maxTokens: normalizePositiveInteger(settings.maxTokens, current.maxTokens),
  };
}

function buildTelegram(
  current: XenesisTelegramChannelSettings,
  settings: Record<string, unknown>,
  missing: string[],
): XenesisTelegramChannelSettings {
  return {
    enabled: normalizeBoolean(settings.enabled, current.enabled),
    tokenEnv: missingRequiredEnv(settings, 'tokenEnv', current.tokenEnv, missing),
    allowedChatIds: requiredList(settings, 'allowedChatIds', current.allowedChatIds, missing),
    ...withGuardrails(current, settings),
  };
}

function buildSlack(
  current: XenesisSlackChannelSettings,
  settings: Record<string, unknown>,
  missing: string[],
): XenesisSlackChannelSettings {
  return {
    enabled: normalizeBoolean(settings.enabled, current.enabled),
    botTokenEnv: missingRequiredEnv(settings, 'botTokenEnv', current.botTokenEnv, missing),
    signingSecretEnv: missingRequiredEnv(settings, 'signingSecretEnv', current.signingSecretEnv, missing),
    webhookUrlEnv: optionalEnv(settings, 'webhookUrlEnv', current.webhookUrlEnv),
    allowedChannelIds: requiredList(settings, 'allowedChannelIds', current.allowedChannelIds, missing),
    ...withGuardrails(current, settings),
  };
}

function buildDiscord(
  current: XenesisDiscordChannelSettings,
  settings: Record<string, unknown>,
  missing: string[],
): XenesisDiscordChannelSettings {
  return {
    enabled: normalizeBoolean(settings.enabled, current.enabled),
    botTokenEnv: missingRequiredEnv(settings, 'botTokenEnv', current.botTokenEnv, missing),
    webhookUrlEnv: optionalEnv(settings, 'webhookUrlEnv', current.webhookUrlEnv),
    allowedChannelIds: requiredList(settings, 'allowedChannelIds', current.allowedChannelIds, missing),
    allowedGuildIds: requiredList(settings, 'allowedGuildIds', current.allowedGuildIds, missing),
    ...withGuardrails(current, settings),
  };
}

function buildWebhook(
  current: XenesisWebhookChannelSettings,
  settings: Record<string, unknown>,
  missing: string[],
): XenesisWebhookChannelSettings {
  return {
    enabled: normalizeBoolean(settings.enabled, current.enabled),
    urlEnv: missingRequiredEnv(settings, 'urlEnv', current.urlEnv, missing),
    ...withGuardrails(current, settings),
  };
}

export function buildXenesisChannelProfileDraftApplyChannels(
  input: XenesisChannelProfileDraftApplyBuildInput,
): XenesisChannelProfileDraftApplyBuildResult {
  if (!isXenesisChannelProfileDraftApplyChannel(input.channel)) {
    throw new Error(`Unsupported Xenesis channel profile draft apply channel: ${String(input.channel)}`);
  }

  const settings = settingsRecord(input.args);
  const missingRequiredFields: string[] = [];
  const channels: XenesisProfileChannelSettings = {
    telegram: input.currentChannels.telegram,
    slack: input.currentChannels.slack,
    discord: input.currentChannels.discord,
    webhook: input.currentChannels.webhook,
  };

  if (input.channel === 'telegram') {
    channels.telegram = buildTelegram(input.currentChannels.telegram, settings, missingRequiredFields);
  } else if (input.channel === 'slack') {
    channels.slack = buildSlack(input.currentChannels.slack, settings, missingRequiredFields);
  } else if (input.channel === 'discord') {
    channels.discord = buildDiscord(input.currentChannels.discord, settings, missingRequiredFields);
  } else {
    channels.webhook = buildWebhook(input.currentChannels.webhook, settings, missingRequiredFields);
  }

  return {
    channel: input.channel,
    channels,
    missingRequiredFields,
  };
}
