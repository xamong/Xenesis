import type { AiProviderSettings, AppSettings, SecretVaultSettings } from '../../../../../shared/types';
import type { GowooriApplyDetail, GowooriApplyMode } from '../shared/gowooriEvents';
import type { GowooriApiFormat } from './gowooriApiRunner';
import { prepareGowooriGeneratedArtifact, resolveGowooriArtifactActionState } from './gowooriArtifactPipeline';
import { resolveGowooriApiRuntimeSettings } from './gowooriProviderRuntime';
import type { GowooriProvider, GowooriRequestMode } from './gowooriProviders';

export interface GowooriDevByokRuntime {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  apiFormat: GowooriApiFormat;
  apiKeyRequired: boolean;
}

export interface GowooriDevByokSafeSummary {
  gowooriProvider: string;
  profileId: string;
  profileName: string;
  provider: string;
  model: string;
  baseUrlConfigured: boolean;
  endpoint: string;
  secretReference: boolean;
  secretHasValue: boolean;
  apiKeyPreview: 'configured' | 'missing' | 'not required';
}

export interface GowooriDevByokRuntimeResult {
  ready: boolean;
  profileId: string;
  profileName: string;
  runtime: GowooriDevByokRuntime;
  safeSummary: GowooriDevByokSafeSummary;
  diagnostics: string[];
}

export interface GowooriChatE2eApplyInput {
  provider: GowooriProvider;
  mode: GowooriRequestMode;
  prompt: string;
  applyLabel: string;
  source: string;
  summary: string;
  targetId: string;
  applyMode?: GowooriApplyMode;
  startedAt?: number;
  completedAt?: number;
}

export function resolveGowooriDevByokRuntimeFromSettings(settings: Partial<AppSettings>): GowooriDevByokRuntimeResult {
  const profiles = Array.isArray(settings.aiProviderProfiles) ? settings.aiProviderProfiles : [];
  const activeProfileId = String(settings.activeAiProviderProfileId || profiles[0]?.id || '').trim();
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? null;
  const aiSettings = activeProfile?.settings ?? settings.aiProvider ?? null;
  const profileId = activeProfile?.id ?? activeProfileId;
  const profileName =
    activeProfile?.name ||
    (aiSettings ? `${aiSettings.provider} / ${aiSettings.model || 'model not set'}` : 'No AI profile');
  const diagnostics: string[] = [];

  if (!aiSettings) {
    diagnostics.push('AI provider profile is missing.');
  }

  const provider = String(aiSettings?.provider || 'openai');
  const rawApiKey = String(aiSettings?.apiKey || '');
  const resolvedApiKey = resolveXconSecretReference(rawApiKey, settings.secretVault);
  const runtime = resolveGowooriApiRuntimeSettings({
    provider,
    model: aiSettings?.model,
    baseUrl: aiSettings?.baseUrl,
    apiKey: resolvedApiKey.value,
    apiBaseUrlOverride: settings.gowooriChat?.apiBaseUrl,
    apiModelOverride: settings.gowooriChat?.apiModel,
    fallbackModel: 'gpt-4o',
  });

  if (!runtime.baseUrl) diagnostics.push(`AI profile "${profileName}" is missing an API endpoint.`);
  if (!runtime.model) diagnostics.push(`AI profile "${profileName}" is missing a model.`);
  if (runtime.apiKeyRequired && !runtime.apiKey) diagnostics.push(`AI profile "${profileName}" is missing an API key.`);
  if (rawApiKey.startsWith('xcon-secret:') && !resolvedApiKey.found) {
    diagnostics.push(`Secret reference "${resolvedApiKey.secretId}" is missing from the local vault.`);
  }

  const ready = diagnostics.length === 0;
  const endpoint = runtime.baseUrl;
  return {
    ready,
    profileId,
    profileName,
    runtime: {
      provider,
      model: runtime.model,
      baseUrl: runtime.baseUrl,
      apiKey: runtime.apiKey,
      apiFormat: runtime.apiFormat,
      apiKeyRequired: runtime.apiKeyRequired,
    },
    safeSummary: {
      gowooriProvider: String(settings.gowooriChat?.provider || 'byok'),
      profileId,
      profileName,
      provider,
      model: runtime.model,
      baseUrlConfigured: Boolean(
        String(aiSettings?.baseUrl || '').trim() || String(settings.gowooriChat?.apiBaseUrl || '').trim(),
      ),
      endpoint,
      secretReference: rawApiKey.startsWith('xcon-secret:'),
      secretHasValue: Boolean(runtime.apiKey),
      apiKeyPreview: runtime.apiKeyRequired ? (runtime.apiKey ? 'configured' : 'missing') : 'not required',
    },
    diagnostics,
  };
}

export function createGowooriChatE2eApplyDetail(input: GowooriChatE2eApplyInput) {
  const pipeline = prepareGowooriGeneratedArtifact({
    provider: input.provider,
    mode: input.mode,
    prompt: input.prompt,
    applyLabel: input.applyLabel,
    source: input.source,
    summary: input.summary,
    autoApply: true,
    startedAt: input.startedAt ?? Date.now(),
    completedAt: input.completedAt ?? Date.now(),
  });
  const actionState = resolveGowooriArtifactActionState({
    hasSource: Boolean(pipeline.finalArtifact.source),
    preflightOk: pipeline.validationOk,
    applied: pipeline.willApply,
    autoRepairAttempted: false,
    autoRepairSucceeded: false,
    hasPrompt: Boolean(input.prompt.trim()),
    renderableBlockCount: pipeline.acceptanceGate.renderableBlockCount,
  });
  const applyDetail: GowooriApplyDetail = {
    targetId: input.targetId,
    source: pipeline.finalArtifact.source,
    label: input.applyLabel,
    mode: input.applyMode ?? 'replace',
  };

  return {
    ...pipeline,
    actionState,
    applyDetail,
  };
}

function resolveXconSecretReference(
  rawValue: string,
  vault?: SecretVaultSettings,
): { value: string; secretId: string; found: boolean } {
  const prefix = 'xcon-secret:';
  if (!rawValue.startsWith(prefix)) {
    return { value: rawValue, secretId: '', found: Boolean(rawValue) };
  }
  const secretId = rawValue.slice(prefix.length);
  const item = vault?.items?.find((candidate) => candidate.secretId === secretId);
  return {
    value: item?.value ? String(item.value) : '',
    secretId,
    found: Boolean(item?.value),
  };
}
