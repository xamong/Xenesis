import type {
  AiProviderSettings,
  AppSettings,
  GowooriChatSettings,
  McpBridgeGowooriChatRunPayload,
} from '../../../../../shared/types';
import type { GowooriArtifactActionState } from '../agent/gowooriArtifactPipeline';
import { validateGowooriArtifactSource } from '../agent/gowooriArtifactValidation';
import type { GowooriChatRunOverrides, GowooriTargetMode } from '../agent/gowooriChatRunController';
import type { GowooriProvider, GowooriRequestMode } from '../agent/gowooriProviders';
import {
  createRestoredQualityArtifactReviewNote,
  type RestoredQualityArtifactDrilldown,
} from '../agent/gowooriQualityPackageDiff';
import { GOWOORI_INSTANCE_EVENT, type GowooriInstanceDetail } from '../shared/gowooriEvents';
import {
  DEFAULT_PROVIDER_SETTINGS,
  GOWOORI_CHAT_PROVIDER_SETTINGS_STORAGE_KEY,
  GOWOORI_CHAT_UI_MODE_STORAGE_KEY,
  GOWOORI_PROVIDER_IDS,
  GOWOORI_REQUEST_MODES,
  GOWOORI_SIMPLE_PROGRESS_STEP_LABELS,
  RESTORED_REVIEW_REPAIR_PROMPT_PREFIX,
} from './gowooriChatConstants';
import type {
  ActiveAiProviderProfileState,
  GowooriChatMessage,
  GowooriChatUiMode,
  GowooriSimpleProgressInput,
  GowooriSimpleProgressStep,
  GowooriSimpleProgressStepState,
  GowooriSimpleResultSummary,
  GowooriSimpleResultSummaryInput,
  GowooriSimpleSetupChecklistInput,
  GowooriSimpleSetupStep,
} from './gowooriChatTypes';

export function canApplyGowooriSourceBestEffort(source: string, preflightOk?: boolean): boolean {
  if (preflightOk === true) return true;
  if (!String(source || '').trim()) return false;
  return validateGowooriArtifactSource(source).renderableBlockCount > 0;
}

export function waitForNewGowooriInstance(
  existingTargetIds: Set<string>,
  timeoutMs = 2200,
): Promise<GowooriInstanceDetail | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (detail: GowooriInstanceDetail | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener(GOWOORI_INSTANCE_EVENT, handleInstance);
      resolve(detail);
    };
    const handleInstance = (event: Event) => {
      const detail = (event as CustomEvent<GowooriInstanceDetail>).detail;
      if (!detail?.id || existingTargetIds.has(detail.id)) return;
      finish(detail);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    window.addEventListener(GOWOORI_INSTANCE_EVENT, handleInstance);
  });
}

export function createMessageId(): string {
  return `gowoori-chat-${crypto.randomUUID()}`;
}

export function loadLegacyProviderSettings(): Partial<GowooriChatSettings> {
  try {
    const raw = window.localStorage.getItem(GOWOORI_CHAT_PROVIDER_SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<GowooriChatSettings>;
  } catch {
    return {};
  }
}

export function loadGowooriChatUiMode(): GowooriChatUiMode {
  try {
    const storedMode = window.localStorage.getItem(GOWOORI_CHAT_UI_MODE_STORAGE_KEY);
    return storedMode === 'advanced' ? 'advanced' : storedMode === 'simple' ? 'simple' : 'user';
  } catch {
    return 'user';
  }
}

export function getLatestGowooriAssistantSourceState(
  messages: GowooriChatMessage[],
): GowooriArtifactActionState | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant' && message.sourceState) {
      return message.sourceState;
    }
  }
  return null;
}

export function getLatestGowooriAssistantSourceMessage(messages: GowooriChatMessage[]): GowooriChatMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant' && message.source) {
      return message;
    }
  }
  return null;
}

export function getRecentGowooriAssistantSourceMessages(
  messages: GowooriChatMessage[],
  limit = 3,
): GowooriChatMessage[] {
  const recent: GowooriChatMessage[] = [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'assistant' && message.source && message.sourceState) {
      recent.push(message);
      if (recent.length >= limit) break;
    }
  }
  return recent;
}

export function createGowooriSimpleSetupSteps(input: GowooriSimpleSetupChecklistInput): GowooriSimpleSetupStep[] {
  return [
    {
      id: 'provider',
      label: input.providerReady ? 'Provider ready' : 'Provider needs setup',
      detail: input.providerReady ? `${input.providerLabel} is ready for artifact generation.` : input.providerDetail,
      state: input.providerReady ? 'ready' : 'warning',
    },
    {
      id: 'target',
      label: input.targetReady ? 'Target ready' : 'Target missing',
      detail: input.targetReady
        ? `Gowoori will send output to ${input.targetLabel}.`
        : 'Selected Gowoori target is unavailable. Use New Gowoori or refresh open panes.',
      state: input.targetReady ? 'ready' : 'warning',
    },
    {
      id: 'safety',
      label: 'Safety ready',
      detail: input.autoApply
        ? input.livePreview
          ? 'Auto apply and live preview are on; preflight records diagnostics without blocking renderable artifacts.'
          : 'Auto apply is on; renderable artifacts are applied while preflight diagnostics stay available.'
        : 'Auto apply is off; preview and apply manually after checking the result.',
      state: input.autoApply ? 'ready' : 'safe',
    },
  ];
}

export function createGowooriSimpleProgressSteps(input: GowooriSimpleProgressInput): GowooriSimpleProgressStep[] {
  const latestSourceState = input.latestSourceState;
  const hasStream = input.rawStream.trim().length > 0;
  const hasCompletedArtifact = Boolean(latestSourceState && latestSourceState.tone !== 'empty');
  const isBlocked = latestSourceState?.tone === 'blocked';
  const isApplied = latestSourceState?.tone === 'applied';
  const isReady = latestSourceState?.tone === 'ready';

  const promptState: GowooriSimpleProgressStepState = input.hasPrompt ? 'done' : 'pending';
  const streamingState: GowooriSimpleProgressStepState = input.isGenerating
    ? 'active'
    : hasCompletedArtifact
      ? 'done'
      : 'pending';
  const preflightState: GowooriSimpleProgressStepState = isBlocked
    ? 'blocked'
    : hasCompletedArtifact
      ? 'done'
      : input.isGenerating && hasStream
        ? 'active'
        : 'pending';
  const applyState: GowooriSimpleProgressStepState = isBlocked
    ? 'blocked'
    : isApplied
      ? 'done'
      : isReady
        ? 'active'
        : 'pending';

  return [
    { id: 'prompt', label: GOWOORI_SIMPLE_PROGRESS_STEP_LABELS.prompt, state: promptState },
    { id: 'streaming', label: GOWOORI_SIMPLE_PROGRESS_STEP_LABELS.streaming, state: streamingState },
    { id: 'preflight', label: GOWOORI_SIMPLE_PROGRESS_STEP_LABELS.preflight, state: preflightState },
    { id: 'apply', label: GOWOORI_SIMPLE_PROGRESS_STEP_LABELS.apply, state: applyState },
  ];
}

export function createGowooriSimpleResultSummary(input: GowooriSimpleResultSummaryInput): GowooriSimpleResultSummary {
  const statusText = input.status.trim() || 'Ready';
  const latestTone = input.latestSourceState?.tone;

  if (input.isGenerating) {
    return {
      tone: 'generating',
      title: 'Generating artifact',
      description: 'Gowoori is streaming Markdown, data bindings, and XCON/SKETCH for the current request.',
      nextActionLabel: 'Next: wait for preflight',
      statusText,
    };
  }

  if (latestTone === 'blocked') {
    return {
      tone: 'blocked',
      title: 'No renderable artifact',
      description: 'Gowoori could not find a renderable XCON/SKETCH block. Ask again or repair the source.',
      nextActionLabel: 'Next: retry or repair',
      statusText,
    };
  }

  if (latestTone === 'applied') {
    return {
      tone: 'applied',
      title: 'Applied to Gowoori',
      description:
        'The latest artifact has been applied to the selected Gowoori target. Diagnostics remain available when warnings exist.',
      nextActionLabel: 'Next: refine or ask again',
      statusText,
    };
  }

  if (latestTone === 'ready') {
    return {
      tone: 'ready',
      title: 'Ready to apply',
      description: 'The latest artifact passed preflight. Review it, then apply or ask Gowoori for a refinement.',
      nextActionLabel: 'Next: apply latest artifact',
      statusText,
    };
  }

  if (input.hasPrompt) {
    return {
      tone: 'waiting',
      title: 'Waiting for artifact',
      description: 'Gowoori has a prompt in the conversation but no renderable artifact is available yet.',
      nextActionLabel: 'Next: retry or send a follow-up',
      statusText,
    };
  }

  return {
    tone: 'idle',
    title: 'Ready for first artifact',
    description: 'Choose a quick start or describe the document, dashboard, or workflow view you want.',
    nextActionLabel: 'Next: choose a quick start',
    statusText,
  };
}

export function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function isGowooriProviderId(value: unknown): value is GowooriProvider {
  return typeof value === 'string' && GOWOORI_PROVIDER_IDS.has(value as GowooriProvider);
}

export function isGowooriRequestMode(value: unknown): value is GowooriRequestMode {
  return typeof value === 'string' && GOWOORI_REQUEST_MODES.has(value as GowooriRequestMode);
}

export function normalizeGowooriChatRunOverrides(payload: McpBridgeGowooriChatRunPayload): GowooriChatRunOverrides {
  const targetContentId = typeof payload.targetContentId === 'string' ? payload.targetContentId.trim() : '';
  const targetMode =
    targetContentId ||
    (typeof payload.targetMode === 'string' && payload.targetMode.trim() ? payload.targetMode.trim() : '');
  return {
    bridgeRequestId: payload.requestId,
    ...(isGowooriProviderId(payload.provider) ? { provider: payload.provider } : {}),
    ...(isGowooriRequestMode(payload.requestMode) ? { requestMode: payload.requestMode } : {}),
    ...(targetMode ? { targetMode: targetMode as GowooriTargetMode } : {}),
    ...(typeof payload.autoApply === 'boolean' ? { autoApply: payload.autoApply } : {}),
    ...(typeof payload.sportsStandingsEndpoint === 'string' && payload.sportsStandingsEndpoint.trim()
      ? { sportsStandingsEndpoint: payload.sportsStandingsEndpoint.trim() }
      : {}),
  };
}

export function normalizeProviderSettings(input: Partial<GowooriChatSettings> | undefined): GowooriChatSettings {
  const candidate = input ?? {};
  return {
    ...DEFAULT_PROVIDER_SETTINGS,
    ...candidate,
    provider: isGowooriProviderId(candidate.provider) ? candidate.provider : DEFAULT_PROVIDER_SETTINGS.provider,
    promptMode: candidate.promptMode === 'argument' ? 'argument' : 'stdin',
    commandArgs: String(candidate.commandArgs ?? ''),
    timeoutMs:
      typeof candidate.timeoutMs === 'number' && Number.isFinite(candidate.timeoutMs)
        ? Math.max(5000, Math.round(candidate.timeoutMs))
        : DEFAULT_PROVIDER_SETTINGS.timeoutMs,
    livePreview: candidate.livePreview !== false,
    commandOverrides:
      candidate.commandOverrides && typeof candidate.commandOverrides === 'object' ? candidate.commandOverrides : {},
    apiBaseUrl: String(candidate.apiBaseUrl ?? ''),
    apiModel: String(candidate.apiModel ?? ''),
    sportsStandingsEndpoint: String(candidate.sportsStandingsEndpoint ?? ''),
  };
}

export function resolveActiveAiProviderProfile(
  settings: Partial<AppSettings> | null | undefined,
): ActiveAiProviderProfileState {
  const profiles = Array.isArray(settings?.aiProviderProfiles) ? settings.aiProviderProfiles : [];
  const activeAiProviderProfileId = String(settings?.activeAiProviderProfileId || profiles[0]?.id || '').trim();
  const activeProfile = profiles.find((profile) => profile.id === activeAiProviderProfileId) ?? profiles[0] ?? null;
  const activeSettings = activeProfile?.settings ?? settings?.aiProvider ?? null;
  const activeAiProviderProfileName =
    activeProfile?.name ||
    (activeSettings ? `${activeSettings.provider} / ${activeSettings.model || 'model not set'}` : 'Default AI profile');

  return {
    activeAiProviderProfileId,
    activeAiProviderProfileName,
    profiles,
    settings: activeSettings,
  };
}

export function getAiProviderSummary(settings: AiProviderSettings | null): string {
  if (!settings) return 'No AI provider settings loaded';
  const model = settings.model?.trim() || 'model not set';
  return `${settings.provider} / ${model}`;
}

export function createRestoredDrilldownReviewPrompt(drilldown: RestoredQualityArtifactDrilldown): {
  report: string;
  reviewPrompt: string;
} {
  const report = createRestoredQualityArtifactReviewNote(drilldown);
  return {
    report,
    reviewPrompt: [
      RESTORED_REVIEW_REPAIR_PROMPT_PREFIX,
      'Use the line diff and diagnostics to preserve valid Markdown + XCON/SKETCH structure.',
      'Return only the repaired Markdown + XCON/SKETCH artifact.',
      '',
      report,
    ].join('\n'),
  };
}
