import type { AiProviderKind, AiProviderSettings, AiReasoningEffort } from './types';
import { XENESIS_CONNECTION_PROVIDER_IDS } from './xenesisConnections';

const XENESIS_PROVIDER_PROFILE_DRAFT_SECRET_ARG_KEYS = ['apiKey', 'secret', 'token'] as const;
const XENESIS_PROVIDER_PROFILE_DRAFT_STRING_SETTING_KEYS = [
  'model',
  'baseUrl',
  'xcAgentApiUrl',
  'xcApiUrl',
  'labApiUrl',
] as const satisfies readonly (keyof AiProviderSettings)[];
const XENESIS_PROVIDER_PROFILE_DRAFT_REASONING_EFFORTS = [
  'default',
  'low',
  'medium',
  'high',
  'xhigh',
] as const satisfies readonly AiReasoningEffort[];

const XENESIS_PROVIDER_PROFILE_DRAFT_PROVIDER_SET = new Set<string>(XENESIS_CONNECTION_PROVIDER_IDS);
const XENESIS_PROVIDER_PROFILE_DRAFT_REASONING_SET = new Set<string>(XENESIS_PROVIDER_PROFILE_DRAFT_REASONING_EFFORTS);

export interface XenesisProviderProfileDraftApplyInput {
  current: AiProviderSettings;
  args?: unknown;
}

export interface XenesisProviderProfileDraftApplySuccess {
  ok: true;
  provider: AiProviderKind;
  settings: AiProviderSettings;
  appliedFields: string[];
}

export interface XenesisProviderProfileDraftApplyFailure {
  ok: false;
  error: string;
  allowedProviders?: readonly string[];
  allowedReasoningEfforts?: readonly string[];
}

export type XenesisProviderProfileDraftApplyResult =
  | XenesisProviderProfileDraftApplySuccess
  | XenesisProviderProfileDraftApplyFailure;

export interface RedactedXenesisProviderProfileDraftApplySettings {
  provider: AiProviderKind;
  model: string;
  baseUrlState: 'configured' | 'missing';
  xcAgentApiUrlState: 'configured' | 'missing';
  xcApiUrlState: 'configured' | 'missing';
  labApiUrlState: 'configured' | 'missing';
  reasoningEffort?: AiReasoningEffort;
  apiKeyState: 'configured' | 'missing';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function hasNonEmptyString(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0;
}

function stringState(value: string): 'configured' | 'missing' {
  return value.trim() ? 'configured' : 'missing';
}

export function buildXenesisProviderProfileDraftApplySettings(
  input: XenesisProviderProfileDraftApplyInput,
): XenesisProviderProfileDraftApplyResult {
  const args = asRecord(input.args);
  const provider = readString(args, ['provider', 'id', 'name']);
  if (!provider) {
    return { ok: false, error: 'Provider is required.' };
  }
  if (!XENESIS_PROVIDER_PROFILE_DRAFT_PROVIDER_SET.has(provider)) {
    return {
      ok: false,
      error: `Unsupported Xenesis provider: ${provider}`,
      allowedProviders: XENESIS_CONNECTION_PROVIDER_IDS,
    };
  }

  for (const key of XENESIS_PROVIDER_PROFILE_DRAFT_SECRET_ARG_KEYS) {
    if (hasNonEmptyString(args, key)) {
      return {
        ok: false,
        error: 'Raw provider secrets are not accepted by provider profile draft apply.',
      };
    }
  }

  const settings: AiProviderSettings = {
    ...input.current,
    provider: provider as AiProviderKind,
  };
  const appliedFields = ['provider'];

  for (const key of XENESIS_PROVIDER_PROFILE_DRAFT_STRING_SETTING_KEYS) {
    const value = readString(args, [key]);
    if (!value) continue;
    settings[key] = value;
    appliedFields.push(key);
  }

  const reasoningEffort = readString(args, ['reasoningEffort']);
  if (reasoningEffort) {
    if (!XENESIS_PROVIDER_PROFILE_DRAFT_REASONING_SET.has(reasoningEffort)) {
      return {
        ok: false,
        error: `Unsupported reasoning effort: ${reasoningEffort}`,
        allowedReasoningEfforts: XENESIS_PROVIDER_PROFILE_DRAFT_REASONING_EFFORTS,
      };
    }
    settings.reasoningEffort = reasoningEffort as AiReasoningEffort;
    appliedFields.push('reasoningEffort');
  }

  return {
    ok: true,
    provider: settings.provider,
    settings,
    appliedFields,
  };
}

export function redactXenesisProviderProfileDraftApplySettings(
  settings: AiProviderSettings,
): RedactedXenesisProviderProfileDraftApplySettings {
  return {
    provider: settings.provider,
    model: settings.model,
    baseUrlState: stringState(settings.baseUrl),
    xcAgentApiUrlState: stringState(settings.xcAgentApiUrl),
    xcApiUrlState: stringState(settings.xcApiUrl),
    labApiUrlState: stringState(settings.labApiUrl),
    reasoningEffort: settings.reasoningEffort,
    apiKeyState: stringState(settings.apiKey),
  };
}
