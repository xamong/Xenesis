import type { ChannelsConfig } from '../config/index.js';
import type { ApprovalMode } from '../config/types.js';
import { buildChannelOperationPolicy } from '../core/agentCapabilityPolicy.js';

export interface ChannelDiagnostic {
  name: 'telegram' | 'slack' | 'discord' | 'webhook';
  enabled: boolean;
  ready: boolean;
  missingEnv: string[];
  warnings: string[];
  requiredTraceFields: string[];
  secretPolicy: string;
  safeToDeliver: boolean;
  approvalMode: ApprovalMode;
  maxTurns: number;
  maxTokens: number;
}

export interface ChannelDiagnosticsSummary {
  total: number;
  enabled: number;
  ready: number;
  blocked: number;
  disabled: number;
  channels: ChannelDiagnostic[];
}

function hasEnv(env: NodeJS.ProcessEnv, name: string | undefined) {
  return Boolean(name && String(env[name] ?? '').trim());
}

const ENV_REFERENCE_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

function isEnvReference(value: string | undefined): value is string {
  return Boolean(value && ENV_REFERENCE_PATTERN.test(value));
}

function missingEnv(env: NodeJS.ProcessEnv, names: string[]) {
  return names.filter((name) => isEnvReference(name) && !hasEnv(env, name));
}

function credentialReferenceWarnings(reference: string | undefined) {
  return reference && reference.trim() ? [] : ['credential is empty'];
}

function channelReady(enabled: boolean, missing: string[], warnings: string[]) {
  return enabled && missing.length === 0 && warnings.length === 0;
}

function channelOperationFields(ready: boolean) {
  const policy = buildChannelOperationPolicy();
  return {
    requiredTraceFields: policy.requiredTraceFields,
    secretPolicy: policy.secretPolicy,
    safeToDeliver: ready,
  };
}

function telegramDiagnostics(channels: ChannelsConfig, env: NodeJS.ProcessEnv): ChannelDiagnostic | undefined {
  const config = channels.telegram;
  if (!config) return undefined;
  const missing = config.enabled ? missingEnv(env, [config.tokenEnv]) : [];
  const warnings = config.enabled
    ? [
        ...(config.allowedChatIds.length === 0 ? ['allowedChatIds is empty'] : []),
        ...credentialReferenceWarnings(config.tokenEnv),
      ]
    : [];
  const ready = channelReady(config.enabled, missing, warnings);
  return {
    name: 'telegram',
    enabled: config.enabled,
    ready,
    missingEnv: missing,
    warnings,
    ...channelOperationFields(ready),
    approvalMode: config.approvalMode,
    maxTurns: config.maxTurns,
    maxTokens: config.maxTokens,
  };
}

function slackDiagnostics(channels: ChannelsConfig, env: NodeJS.ProcessEnv): ChannelDiagnostic | undefined {
  const config = channels.slack;
  if (!config) return undefined;
  const required = [config.botTokenEnv, config.signingSecretEnv];
  const missing = config.enabled ? missingEnv(env, required) : [];
  const warnings = config.enabled
    ? [
        ...(config.allowedChannelIds.length === 0 ? ['allowedChannelIds is empty'] : []),
        ...required.flatMap(credentialReferenceWarnings),
      ]
    : [];
  const ready = channelReady(config.enabled, missing, warnings);
  return {
    name: 'slack',
    enabled: config.enabled,
    ready,
    missingEnv: missing,
    warnings,
    ...channelOperationFields(ready),
    approvalMode: config.approvalMode,
    maxTurns: config.maxTurns,
    maxTokens: config.maxTokens,
  };
}

function discordDiagnostics(channels: ChannelsConfig, env: NodeJS.ProcessEnv): ChannelDiagnostic | undefined {
  const config = channels.discord;
  if (!config) return undefined;
  const missing = config.enabled ? missingEnv(env, [config.botTokenEnv]) : [];
  const warnings = config.enabled
    ? [
        ...(config.allowedChannelIds.length === 0 && config.allowedGuildIds.length === 0
          ? ['allowedChannelIds and allowedGuildIds are empty']
          : []),
        ...credentialReferenceWarnings(config.botTokenEnv),
      ]
    : [];
  const ready = channelReady(config.enabled, missing, warnings);
  return {
    name: 'discord',
    enabled: config.enabled,
    ready,
    missingEnv: missing,
    warnings,
    ...channelOperationFields(ready),
    approvalMode: config.approvalMode,
    maxTurns: config.maxTurns,
    maxTokens: config.maxTokens,
  };
}

function webhookDiagnostics(channels: ChannelsConfig, env: NodeJS.ProcessEnv): ChannelDiagnostic | undefined {
  const config = channels.webhook;
  if (!config) return undefined;
  const missing = config.enabled ? missingEnv(env, [config.urlEnv]) : [];
  const warnings = config.enabled ? credentialReferenceWarnings(config.urlEnv) : [];
  const ready = channelReady(config.enabled, missing, warnings);
  return {
    name: 'webhook',
    enabled: config.enabled,
    ready,
    missingEnv: missing,
    warnings,
    ...channelOperationFields(ready),
    approvalMode: config.approvalMode,
    maxTurns: config.maxTurns,
    maxTokens: config.maxTokens,
  };
}

export function summarizeChannelDiagnostics(
  channels: ChannelsConfig,
  env: NodeJS.ProcessEnv = process.env,
): ChannelDiagnosticsSummary {
  const diagnostics = [
    telegramDiagnostics(channels, env),
    slackDiagnostics(channels, env),
    discordDiagnostics(channels, env),
    webhookDiagnostics(channels, env),
  ].filter((item): item is ChannelDiagnostic => item !== undefined);
  const enabled = diagnostics.filter((channel) => channel.enabled).length;
  const ready = diagnostics.filter((channel) => channel.ready).length;
  return {
    total: diagnostics.length,
    enabled,
    ready,
    blocked: diagnostics.filter((channel) => channel.enabled && !channel.ready).length,
    disabled: diagnostics.filter((channel) => !channel.enabled).length,
    channels: diagnostics,
  };
}
