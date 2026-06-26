import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AiProviderProfile,
  AiProviderSettings,
  AppSettings,
  GowooriChatSettings,
  McpBridgeGowooriChatRunPayload,
  McpBridgeGowooriChatRunProgress,
  McpBridgeGowooriChatRunProgressPhase,
  McpBridgeGowooriChatRunResult,
  McpBridgeGowooriChatRunStatus,
} from '../../../../../../shared/types';
import { callGowooriDeskCapability, getDeskBridgeApi } from '../../../../../deskBridge';
import { createDefaultGowooriAgentTools, type GowooriAgentToolCall } from '../../agent/gowooriAgentTools';
import { runGowooriApiPreflight } from '../../agent/gowooriApiRunner';
import { createGowooriArtifactComparison, type GowooriArtifactComparison } from '../../agent/gowooriArtifactComparison';
import {
  type GowooriArtifactRepairDiagnostic,
  normalizeGowooriArtifactSource,
} from '../../agent/gowooriArtifactRepair';
import { validateGowooriArtifactSource } from '../../agent/gowooriArtifactValidation';
import { runGowooriAutomaticRepairAttempt } from '../../agent/gowooriAutomaticRepairRunner';
import { resolveGowooriDevByokRuntimeFromSettings } from '../../agent/gowooriChatE2e';
import {
  GowooriAgentToolApprovalRequiredError,
  type GowooriChatRunCompletion,
  type GowooriChatRunOverrides,
  type GowooriTargetMode,
  parseCommandArgs,
  runGowooriProviderArtifact,
} from '../../agent/gowooriChatRunController';
import {
  type GowooriCliProgressEvent,
  type GowooriPromptFileWriteRequest,
  normalizeTerminalArtifactOutput,
  runGowooriCliPreflight,
} from '../../agent/gowooriCliRunner';
import { finishGowooriGeneratedArtifact } from '../../agent/gowooriGeneratedArtifactFinalizer';
import { runGowooriArtifactAcceptanceGate } from '../../agent/gowooriGenerationAcceptance';
import { runGowooriProviderAcceptanceBenchmark } from '../../agent/gowooriProviderBenchmarkRunner';
import {
  GOWOORI_PROVIDER_DEFINITIONS,
  type GowooriArtifactResult,
  type GowooriCliPlanResult,
  type GowooriProvider,
  type GowooriRequestMode,
  getGowooriProviderDefinition,
  safeGowooriTitleFromPrompt,
} from '../../agent/gowooriProviders';
import {
  createGowooriBridgeMatrixSummary,
  createGowooriProviderBenchmark,
  createGowooriProviderBenchmarkComparison,
  createGowooriProviderHealthDashboard,
  createGowooriProviderReadinessReport,
  createGowooriProviderScorecard,
  createGowooriProviderTimeline,
  createGowooriQualityFilterOptions,
  createGowooriQualityLogEntry,
  exportGowooriProviderBenchmarkCsv,
  exportGowooriProviderBenchmarkJson,
  exportGowooriQualityLog,
  filterGowooriQualityLog,
  type GowooriProviderBenchmarkReport,
  type GowooriProviderReadinessItem,
  type GowooriQualityLogEntry,
  importGowooriBridgeMatrixReport,
  importGowooriProviderBenchmark,
  importGowooriQualityLog,
  mergeGowooriQualityLogs,
  summarizeGowooriQualityLog,
} from '../../agent/gowooriQualityLog';
import {
  GOWOORI_CHAT_QUALITY_LOG_LIMIT,
  GOWOORI_QUALITY_LOG_CHANGED_EVENT,
  loadGowooriQualityLogFromStorage,
  notifyGowooriQualityLogChanged,
  persistGowooriQualityLogToStorage,
} from '../../agent/gowooriQualityLogStorage';
import {
  createRestoredPackageDiffReport,
  createRestoredQualityArtifactDrilldown,
  createRestoredQualityArtifactReviewNote,
  createRestoredQualityPackageDiff,
  createRestoredQualityPackageSummary,
  type RestoredQualityArtifactDrilldown,
  type RestoredQualityArtifactDrilldownRequest,
  type RestoredQualityPackageDiffHistoryItem,
  type RestoredQualityPackageState,
} from '../../agent/gowooriQualityPackageDiff';
import {
  createFilteredQualityReport,
  createQualityReportPackage,
  parseQualityReportPackage,
} from '../../agent/gowooriQualityReportActions';
import {
  dispatchGowooriApply,
  dispatchGowooriOpenRequest,
  GOWOORI_INSTANCE_EVENT,
  GOWOORI_INSTANCE_REQUEST_EVENT,
  type GowooriApplyMode,
  type GowooriInstanceDetail,
  writePendingGowooriApply,
} from '../../shared/gowooriEvents';
import {
  createGowooriProviderLongRunningHint,
  GOWOORI_CHAT_UI_MODE_STORAGE_KEY,
  GOWOORI_MASCOT_SRC,
  GOWOORI_PROVIDER_SMOKE_PROMPT,
  GOWOORI_PROVIDER_SMOKE_REQUIRED_TEXT,
  GOWOORI_SIMPLE_FIRST_RUN_STEPS,
  type GowooriProviderTimeoutProfile,
  RESTORED_REVIEW_REPAIR_PROMPT_PREFIX,
  resolveGowooriProviderTimeoutProfile,
} from '../gowooriChatConstants';
import { createGowooriProviderFailureAssistantMessage } from '../gowooriChatFailureMessages';
import {
  areGowooriQualityFiltersActive,
  createGowooriBenchmarkProviderOptions,
  createGowooriQualityCaseMatrix,
  createGowooriQualityFilterSummary,
  createSelectedGowooriQualityCaseDiff,
} from '../gowooriChatQualityState';
import {
  canApplyGowooriSourceBestEffort,
  createGowooriSimpleProgressSteps,
  createGowooriSimpleResultSummary,
  createGowooriSimpleSetupSteps,
  createMessageId,
  createRestoredDrilldownReviewPrompt,
  downloadTextFile,
  getAiProviderSummary,
  getLatestGowooriAssistantSourceMessage,
  getLatestGowooriAssistantSourceState,
  getRecentGowooriAssistantSourceMessages,
  isGowooriProviderId,
  loadGowooriChatUiMode,
  loadLegacyProviderSettings,
  normalizeGowooriChatRunOverrides,
  normalizeProviderSettings,
  resolveActiveAiProviderProfile,
  waitForNewGowooriInstance,
} from '../gowooriChatState';
import { createGowooriSimpleArtifactSummary, getGowooriArtifactTitleFromSource } from '../gowooriChatSummaries';
import {
  createGowooriApplyDetail,
  createGowooriTargetOptions,
  createGowooriUserTargetPreferenceLabel,
  getGowooriTargetLabel,
  isGowooriTargetAvailable,
  normalizeGowooriTargetMode,
  resolveStickyGowooriUserTarget,
  shouldClearGowooriUserTargetPreference,
} from '../gowooriChatTargetState';
import type {
  GowooriChatInspectorTab,
  GowooriChatMessage,
  GowooriChatRepairDiagnostic,
  GowooriChatUiMode,
  GowooriSimplePromptPreset,
  GowooriSimpleRefinementPromptPreset,
  GowooriUserTargetPreference,
} from '../gowooriChatTypes';
import { GowooriChatDeveloperInspectorPanel } from './GowooriChatDeveloperInspectorPanel';
import { GowooriChatSimpleModePanel } from './GowooriChatSimpleModePanel';
import type { GowooriChatToolApproval } from './GowooriChatTranscriptPanel';
import { GowooriChatUserMessagesPanel } from './GowooriChatUserMessagesPanel';
import type { GowooriRestoredPackageRepairResult } from './GowooriRestoredPackagePanel';

type GowooriChatAutomationArtifactSnapshot = {
  id: string;
  text: string;
  source: string;
  sourceLength: number;
  updatedAt: number;
};

async function writeGowooriCliPromptFile(request: GowooriPromptFileWriteRequest): Promise<string> {
  const args = {
    filePath: request.filePath,
    content: request.content,
    maxBytes: request.maxBytes,
  };
  const capabilityResult = await callGowooriDeskCapability('xd.files.applyTextWrite', args, { approved: true }).catch(
    () => null,
  );
  const capabilityFilePath =
    capabilityResult?.ok &&
    capabilityResult.result &&
    typeof capabilityResult.result === 'object' &&
    'filePath' in capabilityResult.result
      ? (capabilityResult.result as { filePath?: unknown }).filePath
      : null;
  if (typeof capabilityFilePath === 'string' && capabilityFilePath.trim()) {
    return capabilityFilePath;
  }

  if (!window.safeFileAPI?.applyTextWrite) return request.filePath;
  const result = await window.safeFileAPI.applyTextWrite(args);
  return result.filePath;
}

function createGowooriUserProgressMessage(
  event: GowooriCliProgressEvent,
  providerLabel: string,
  timeoutProfile: GowooriProviderTimeoutProfile,
): string {
  const elapsed =
    event.elapsedMs >= 1000
      ? `${(event.elapsedMs / 1000).toFixed(1)}초`
      : `${Math.max(0, Math.round(event.elapsedMs))}ms`;
  const received = event.outputBytes > 0 ? ` ${event.outputBytes.toLocaleString()} bytes 수신` : '';
  const longRunningHint = createGowooriProviderLongRunningHint(timeoutProfile);
  const shouldShowLongRunningHint = event.elapsedMs >= timeoutProfile.longRunningAfterMs;
  if (event.phase === 'starting') return `${providerLabel} 실행을 준비하고 있습니다.`;
  if (event.phase === 'spawned') return `${providerLabel} 터미널을 열었습니다.`;
  if (event.phase === 'sending-prompt') return `${providerLabel}에게 요청을 전달하고 있습니다.`;
  if (event.phase === 'receiving-output') {
    return shouldShowLongRunningHint
      ? `응답을 받고 있습니다.${received} (${elapsed}) ${longRunningHint}`
      : `응답을 받고 있습니다.${received}`;
  }
  if (event.phase === 'waiting' && event.outputBytes > 0) {
    return shouldShowLongRunningHint
      ? `응답을 계속 받고 있습니다.${received} (${elapsed}) ${longRunningHint}`
      : `응답을 계속 받고 있습니다.${received} (${elapsed})`;
  }
  if (event.phase === 'waiting') {
    return shouldShowLongRunningHint
      ? `모델이 답변을 준비 중입니다. 첫 출력을 기다리는 중입니다. (${elapsed}) ${longRunningHint}`
      : `모델이 답변을 준비 중입니다. 첫 출력을 기다리는 중입니다. (${elapsed})`;
  }
  if (event.phase === 'completed') return `${providerLabel} 응답을 정리하고 거울이에 표시하고 있습니다.`;
  if (event.phase === 'timeout')
    return `${providerLabel} 응답 시간이 초과되었습니다. 최대 ${timeoutProfile.timeoutLabel}까지 기다렸지만 완료되지 않았습니다.`;
  if (event.phase === 'cancelled') return '요청을 취소했습니다.';
  return event.message;
}

function createGowooriToolApprovalSummaries(calls: GowooriAgentToolCall[]): GowooriChatToolApproval[] {
  return calls.map((call) => ({
    id: call.id,
    name: call.name,
    reason: call.reason,
    inputSummary: summarizeGowooriToolApprovalInput(call.input),
  }));
}

function summarizeGowooriToolApprovalInput(input: Record<string, unknown>): string {
  const filePath = typeof input.filePath === 'string' ? input.filePath.trim() : '';
  if (filePath) return `filePath=${filePath}`;
  const path = typeof input.path === 'string' ? input.path.trim() : '';
  if (path) return `path=${path}`;
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  if (query) return `query=${query.slice(0, 120)}`;
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (prompt) return `prompt=${prompt.slice(0, 120)}`;
  return 'No additional input';
}

function createGowooriToolApprovalDetail(approvals: GowooriChatToolApproval[]): string {
  return approvals
    .map((approval) =>
      [`${approval.name} (${approval.id})`, `Reason: ${approval.reason}`, `Input: ${approval.inputSummary}`].join('\n'),
    )
    .join('\n\n');
}

interface GowooriChatPaneProps {
  contentId?: string;
}

export function GowooriChatPane({ contentId }: GowooriChatPaneProps = {}) {
  const [provider, setProvider] = useState<GowooriProvider>(
    () => normalizeProviderSettings(loadLegacyProviderSettings()).provider,
  );
  const [requestMode, setRequestMode] = useState<GowooriRequestMode>('generate');
  const [targetMode, setTargetMode] = useState<GowooriTargetMode>('new');
  const [applyMode, setApplyMode] = useState<GowooriApplyMode>('replace');
  const [autoApply, setAutoApply] = useState(true);
  const [providerSettings, setProviderSettings] = useState<GowooriChatSettings>(() =>
    normalizeProviderSettings(loadLegacyProviderSettings()),
  );
  const [aiProviderSettings, setAiProviderSettings] = useState<AiProviderSettings | null>(null);
  const [aiProviderProfiles, setAiProviderProfiles] = useState<AiProviderProfile[]>([]);
  const [activeAiProviderProfileId, setActiveAiProviderProfileId] = useState('');
  const [activeAiProviderProfileName, setActiveAiProviderProfileName] = useState('Default AI profile');
  const [inspectorTab, setInspectorTab] = useState<GowooriChatInspectorTab>('chat');
  const [gowooriChatUiMode, setGowooriChatUiMode] = useState<GowooriChatUiMode>(() => loadGowooriChatUiMode());
  const [rawStream, setRawStream] = useState('');
  const [repairDiagnostics, setRepairDiagnostics] = useState<GowooriChatRepairDiagnostic[]>([]);
  const [repairComparisons, setRepairComparisons] = useState<GowooriArtifactComparison[]>([]);
  const [qualityLog, setQualityLog] = useState<GowooriQualityLogEntry[]>(() => loadGowooriQualityLogFromStorage());
  const [selectedQualityProvider, setSelectedQualityProvider] = useState('all');
  const [selectedQualityMode, setSelectedQualityMode] = useState('all');
  const [selectedQualityCase, setSelectedQualityCase] = useState('all');
  const [selectedQualityEntryId, setSelectedQualityEntryId] = useState('');
  const [benchmarkBaseline, setBenchmarkBaseline] = useState<GowooriProviderBenchmarkReport | null>(null);
  const [benchmarkBaselineName, setBenchmarkBaselineName] = useState('');
  const [restoredQualityPackage, setRestoredQualityPackage] = useState<RestoredQualityPackageState | null>(null);
  const [restoredPackageDrilldownRequest, setRestoredPackageDrilldownRequest] =
    useState<RestoredQualityArtifactDrilldownRequest | null>(null);
  const [restoredPackageRepairResult, setRestoredPackageRepairResult] =
    useState<GowooriRestoredPackageRepairResult | null>(null);
  const [showRestoredPackageDiff, setShowRestoredPackageDiff] = useState(false);
  const [restoredPackageDiffHistory, setRestoredPackageDiffHistory] = useState<RestoredQualityPackageDiffHistoryItem[]>(
    [],
  );
  const [input, setInput] = useState('');
  const [pendingUserPrompt, setPendingUserPrompt] = useState('');
  const [userTargetPreference, setUserTargetPreference] = useState<GowooriUserTargetPreference | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreflighting, setIsPreflighting] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkProviders, setBenchmarkProviders] = useState<GowooriProvider[]>(() => [
    normalizeProviderSettings(loadLegacyProviderSettings()).provider,
  ]);
  const [isRepairingQualityEntry, setIsRepairingQualityEntry] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [generationProgress, setGenerationProgress] = useState('');
  const [targets, setTargets] = useState<GowooriInstanceDetail[]>([]);
  const [messages, setMessages] = useState<GowooriChatMessage[]>([
    {
      id: createMessageId(),
      role: 'system',
      text: 'GowooriChat is ready. Ask for a Markdown + XCON/SKETCH artifact and apply it to Gowoori.',
    },
  ]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const qualityImportInputRef = useRef<HTMLInputElement | null>(null);
  const matrixReportImportInputRef = useRef<HTMLInputElement | null>(null);
  const benchmarkBaselineInputRef = useRef<HTMLInputElement | null>(null);
  const qualityReportPackageInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const livePreviewTargetRef = useRef<GowooriTargetMode | null>(null);
  const settingsSnapshotRef = useRef<Partial<AppSettings> | null>(null);
  const isGeneratingRef = useRef(false);
  const setGenerationBusy = (nextBusy: boolean) => {
    isGeneratingRef.current = nextBusy;
    setIsGenerating(nextBusy);
  };
  const isGowooriChatUserMode = gowooriChatUiMode === 'user';
  const isGowooriChatSimpleMode = gowooriChatUiMode === 'simple';
  const isGowooriChatAdvancedMode = gowooriChatUiMode === 'advanced';
  const agentTools = useMemo(
    () =>
      createDefaultGowooriAgentTools(undefined, {
        sports: {
          standingsEndpoint: providerSettings.sportsStandingsEndpoint,
        },
      }),
    [providerSettings.sportsStandingsEndpoint],
  );

  useEffect(() => {
    let cancelled = false;
    const applySettingsSnapshot = (settings: Partial<AppSettings>) => {
      const nextSnapshot = {
        ...(settingsSnapshotRef.current ?? {}),
        ...settings,
      };
      settingsSnapshotRef.current = nextSnapshot;
      const profileState = resolveActiveAiProviderProfile(nextSnapshot);
      setAiProviderSettings(profileState.settings);
      setAiProviderProfiles(profileState.profiles);
      setActiveAiProviderProfileId(profileState.activeAiProviderProfileId);
      setActiveAiProviderProfileName(profileState.activeAiProviderProfileName);
      const nextProviderSettings = normalizeProviderSettings({
        ...loadLegacyProviderSettings(),
        ...nextSnapshot.gowooriChat,
      });
      setProviderSettings(nextProviderSettings);
      setProvider(nextProviderSettings.provider);
    };
    const handleSettingsChanged = (event: Event) => {
      if (cancelled) return;
      const detail = (event as CustomEvent<Partial<AppSettings>>).detail;
      if (!detail || typeof detail !== 'object') return;
      applySettingsSnapshot(detail);
    };

    window.addEventListener('app-settings-changed', handleSettingsChanged);
    window.terminalAPI
      .getSettings()
      .then((settings) => {
        if (cancelled) return;
        applySettingsSnapshot(settings);
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(`Settings load failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    return () => {
      cancelled = true;
      window.removeEventListener('app-settings-changed', handleSettingsChanged);
    };
  }, []);

  useEffect(() => {
    persistGowooriQualityLogToStorage(qualityLog);
  }, [qualityLog]);

  useEffect(() => {
    try {
      window.localStorage.setItem(GOWOORI_CHAT_UI_MODE_STORAGE_KEY, gowooriChatUiMode);
    } catch {
      // Non-critical preference persistence can fail in restricted storage contexts.
    }
  }, [gowooriChatUiMode]);

  useEffect(() => {
    const handleQualityLogChanged = () => {
      setQualityLog(loadGowooriQualityLogFromStorage());
    };
    window.addEventListener(GOWOORI_QUALITY_LOG_CHANGED_EVENT, handleQualityLogChanged);
    return () => window.removeEventListener(GOWOORI_QUALITY_LOG_CHANGED_EVENT, handleQualityLogChanged);
  }, []);

  useEffect(() => {
    const handleInstance = (event: Event) => {
      const detail = (event as CustomEvent<GowooriInstanceDetail>).detail;
      if (!detail?.id) return;
      setTargets((current) => {
        const next = current.filter((item) => item.id !== detail.id);
        return [...next, detail].sort((a, b) => a.title.localeCompare(b.title));
      });
    };
    window.addEventListener(GOWOORI_INSTANCE_EVENT, handleInstance);
    window.dispatchEvent(new CustomEvent(GOWOORI_INSTANCE_REQUEST_EVENT));
    return () => window.removeEventListener(GOWOORI_INSTANCE_EVENT, handleInstance);
  }, []);

  useEffect(() => {
    const normalizedTargetMode = normalizeGowooriTargetMode(targetMode, targets);
    if (normalizedTargetMode !== targetMode) setTargetMode(normalizedTargetMode);
  }, [targetMode, targets]);

  useEffect(() => {
    if (!isGowooriChatAdvancedMode && (inspectorTab === 'stream' || inspectorTab === 'quality')) {
      setInspectorTab('chat');
    }
  }, [inspectorTab, isGowooriChatAdvancedMode]);

  const targetOptions = useMemo(() => createGowooriTargetOptions(targets), [targets]);
  const userTargetPreferenceLabel = useMemo(
    () => createGowooriUserTargetPreferenceLabel(userTargetPreference),
    [userTargetPreference],
  );

  useEffect(() => {
    if (shouldClearGowooriUserTargetPreference(userTargetPreference, targets)) setUserTargetPreference(null);
  }, [targets, userTargetPreference]);

  const hasGowooriSimplePrompt = useMemo(() => messages.some((message) => message.role === 'user'), [messages]);
  const latestGowooriSimpleSourceMessage = useMemo(() => getLatestGowooriAssistantSourceMessage(messages), [messages]);
  useEffect(() => {
    const automationWindow = window as unknown as {
      __xenesisDeskGowooriChatLatestArtifactSource?: GowooriChatAutomationArtifactSnapshot;
    };
    if (latestGowooriSimpleSourceMessage?.source) {
      automationWindow.__xenesisDeskGowooriChatLatestArtifactSource = {
        id: latestGowooriSimpleSourceMessage.id,
        text: latestGowooriSimpleSourceMessage.text,
        source: latestGowooriSimpleSourceMessage.source,
        sourceLength: latestGowooriSimpleSourceMessage.source.length,
        updatedAt: Date.now(),
      };
    } else if (messages.length === 0) {
      delete automationWindow.__xenesisDeskGowooriChatLatestArtifactSource;
    }
  }, [latestGowooriSimpleSourceMessage, messages.length]);
  const recentGowooriSimpleSourceMessages = useMemo(
    () => getRecentGowooriAssistantSourceMessages(messages),
    [messages],
  );
  const latestGowooriSimpleSourceState = useMemo(
    () => latestGowooriSimpleSourceMessage?.sourceState ?? getLatestGowooriAssistantSourceState(messages),
    [latestGowooriSimpleSourceMessage, messages],
  );
  const gowooriSimpleProgressSteps = useMemo(
    () =>
      createGowooriSimpleProgressSteps({
        hasPrompt: hasGowooriSimplePrompt,
        isGenerating,
        rawStream,
        latestSourceState: latestGowooriSimpleSourceState,
      }),
    [hasGowooriSimplePrompt, isGenerating, latestGowooriSimpleSourceState, rawStream],
  );
  const gowooriSimpleResultSummary = useMemo(
    () =>
      createGowooriSimpleResultSummary({
        hasPrompt: hasGowooriSimplePrompt,
        isGenerating,
        rawStream,
        latestSourceState: latestGowooriSimpleSourceState,
        status,
      }),
    [hasGowooriSimplePrompt, isGenerating, latestGowooriSimpleSourceState, rawStream, status],
  );
  const gowooriSimpleArtifactSummary = useMemo(
    () => createGowooriSimpleArtifactSummary(latestGowooriSimpleSourceMessage),
    [latestGowooriSimpleSourceMessage],
  );
  const isGowooriSimpleFirstRun = isGowooriChatSimpleMode && !hasGowooriSimplePrompt && !isGenerating;

  const qualitySummary = useMemo(() => summarizeGowooriQualityLog(qualityLog), [qualityLog]);
  const bridgeMatrixSummary = useMemo(() => createGowooriBridgeMatrixSummary(qualityLog), [qualityLog]);
  const qualityBenchmark = useMemo(() => createGowooriProviderBenchmark(qualityLog), [qualityLog]);
  const qualityScorecard = useMemo(() => createGowooriProviderScorecard(qualityBenchmark), [qualityBenchmark]);
  const benchmarkComparison = useMemo(
    () => (benchmarkBaseline ? createGowooriProviderBenchmarkComparison(qualityBenchmark, benchmarkBaseline) : null),
    [benchmarkBaseline, qualityBenchmark],
  );
  const qualityHealth = useMemo(() => createGowooriProviderHealthDashboard(qualityLog), [qualityLog]);
  const providerReadiness = useMemo(
    () =>
      createGowooriProviderReadinessReport(
        qualityLog,
        GOWOORI_PROVIDER_DEFINITIONS.map((definition) => definition.id),
      ),
    [qualityLog],
  );
  const activeProviderReadiness = useMemo(
    () => providerReadiness.providers.find((item) => item.provider === provider) ?? null,
    [provider, providerReadiness],
  );
  const qualityFilterOptions = useMemo(() => createGowooriQualityFilterOptions(qualityLog), [qualityLog]);
  const filteredQualityLog = useMemo(
    () =>
      filterGowooriQualityLog(qualityLog, {
        provider: selectedQualityProvider,
        mode: selectedQualityMode,
        caseTitle: selectedQualityCase,
      }),
    [qualityLog, selectedQualityCase, selectedQualityMode, selectedQualityProvider],
  );
  const qualityFiltersActive = areGowooriQualityFiltersActive(
    selectedQualityProvider,
    selectedQualityMode,
    selectedQualityCase,
  );
  const qualityFilterSummary = useMemo(
    () =>
      createGowooriQualityFilterSummary({
        selectedQualityProvider,
        selectedQualityMode,
        selectedQualityCase,
        filteredQualityLog,
        totalQualityLogCount: qualityLog.length,
      }),
    [filteredQualityLog, qualityLog.length, selectedQualityCase, selectedQualityMode, selectedQualityProvider],
  );
  const restoredPackageSummary = useMemo(
    () =>
      restoredQualityPackage
        ? createRestoredQualityPackageSummary(restoredQualityPackage, qualityLog, qualityBenchmark)
        : null,
    [qualityBenchmark, qualityLog, restoredQualityPackage],
  );
  const restoredPackageDiff = useMemo(
    () =>
      restoredQualityPackage
        ? createRestoredQualityPackageDiff(restoredQualityPackage, qualityLog, qualityBenchmark)
        : null,
    [qualityBenchmark, qualityLog, restoredQualityPackage],
  );
  const restoredPackageDrilldown = useMemo(
    () =>
      restoredQualityPackage && restoredPackageDrilldownRequest
        ? createRestoredQualityArtifactDrilldown(
            restoredQualityPackage,
            qualityLog,
            restoredPackageDrilldownRequest,
            qualityBenchmark,
          )
        : null,
    [qualityBenchmark, qualityLog, restoredPackageDrilldownRequest, restoredQualityPackage],
  );
  const selectedQualityEntry = useMemo(
    () => filteredQualityLog.find((entry) => entry.id === selectedQualityEntryId) ?? filteredQualityLog[0] ?? null,
    [filteredQualityLog, selectedQualityEntryId],
  );
  const benchmarkBestProvider = useMemo(() => {
    const bestProvider = qualityScorecard.recommendedProvider ?? qualityBenchmark.bestProvider;
    return isGowooriProviderId(bestProvider) ? bestProvider : null;
  }, [qualityBenchmark.bestProvider, qualityScorecard.recommendedProvider]);
  const qualityCaseMatrix = useMemo(
    () => createGowooriQualityCaseMatrix(qualityLog, qualityBenchmark),
    [qualityBenchmark, qualityLog],
  );
  const selectedQualityCaseDiff = useMemo(
    () => createSelectedGowooriQualityCaseDiff(qualityLog, qualityBenchmark, selectedQualityEntry),
    [qualityBenchmark, qualityLog, selectedQualityEntry],
  );
  const qualityTimeline = useMemo(() => createGowooriProviderTimeline(filteredQualityLog, 24), [filteredQualityLog]);
  const benchmarkProviderOptions = useMemo(
    () => createGowooriBenchmarkProviderOptions(GOWOORI_PROVIDER_DEFINITIONS, benchmarkProviders, provider),
    [benchmarkProviders, provider],
  );

  useEffect(() => {
    if (!qualityFilterOptions.providers.includes(selectedQualityProvider)) {
      setSelectedQualityProvider('all');
    }
    if (!qualityFilterOptions.modes.includes(selectedQualityMode)) {
      setSelectedQualityMode('all');
    }
    if (!qualityFilterOptions.caseTitles.includes(selectedQualityCase)) {
      setSelectedQualityCase('all');
    }
  }, [qualityFilterOptions, selectedQualityCase, selectedQualityMode, selectedQualityProvider]);

  useEffect(() => {
    if (filteredQualityLog.length === 0) {
      if (selectedQualityEntryId) setSelectedQualityEntryId('');
      return;
    }
    if (!filteredQualityLog.some((entry) => entry.id === selectedQualityEntryId)) {
      setSelectedQualityEntryId(filteredQualityLog[0].id);
    }
  }, [filteredQualityLog, selectedQualityEntryId]);

  const resetQualityFilters = () => {
    setSelectedQualityProvider('all');
    setSelectedQualityMode('all');
    setSelectedQualityCase('all');
  };

  const addRestoredPackageDiffHistoryItem = (
    packageState: RestoredQualityPackageState,
    currentEntries: GowooriQualityLogEntry[],
  ) => {
    const benchmark = createGowooriProviderBenchmark(currentEntries);
    const summary = createRestoredQualityPackageSummary(packageState, currentEntries, benchmark);
    const diff = createRestoredQualityPackageDiff(packageState, currentEntries, benchmark);
    const report = createRestoredPackageDiffReport(summary, diff);
    const historyItem: RestoredQualityPackageDiffHistoryItem = {
      id: `package-diff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      packageState,
      summary,
      diff,
      report,
      drilldownRequest: null,
      repairResult: null,
    };

    setRestoredPackageDiffHistory((current) => [historyItem, ...current].slice(0, 8));
  };

  const reopenRestoredPackageDiffHistoryItem = (item: RestoredQualityPackageDiffHistoryItem) => {
    setRestoredQualityPackage(item.packageState);
    setSelectedQualityProvider(item.summary.provider);
    setSelectedQualityMode(item.summary.mode);
    setSelectedQualityCase(item.summary.caseTitle);
    setSelectedQualityEntryId(item.summary.selectedEntryId);
    setRestoredPackageDrilldownRequest(item.drilldownRequest ?? null);
    setRestoredPackageRepairResult(item.repairResult ?? null);
    setShowRestoredPackageDiff(true);
    setInspectorTab('quality');
    setStatus(`Reopened package diff for ${item.summary.name}.`);
  };

  const openRestoredPackageRepairComparison = (item: RestoredQualityPackageDiffHistoryItem) => {
    if (!item.repairResult) {
      setStatus(`No repaired artifact is captured for ${item.summary.name}.`);
      return;
    }
    const request: RestoredQualityArtifactDrilldownRequest = item.drilldownRequest ?? {
      provider: item.repairResult.provider,
      caseTitle: item.repairResult.caseTitle,
    };
    setRestoredQualityPackage(item.packageState);
    setSelectedQualityProvider(request.provider);
    setSelectedQualityMode(item.summary.mode);
    setSelectedQualityCase(request.caseTitle ?? item.repairResult.caseTitle);
    setSelectedQualityEntryId(item.summary.selectedEntryId);
    setRestoredPackageDrilldownRequest(request);
    setRestoredPackageRepairResult(item.repairResult);
    setShowRestoredPackageDiff(true);
    setInspectorTab('quality');
    setStatus(`Opened repaired comparison for ${item.repairResult.provider} / ${item.repairResult.caseTitle}.`);
  };

  const updateRestoredPackageDiffHistoryDrilldownRequest = (request: RestoredQualityArtifactDrilldownRequest) => {
    if (!restoredQualityPackage) return;
    setRestoredPackageDiffHistory((current) =>
      current.map((item) =>
        item.packageState.importedAt === restoredQualityPackage.importedAt
          ? { ...item, drilldownRequest: request }
          : item,
      ),
    );
  };

  const updateRestoredPackageDiffHistoryRepairResult = (repairResult: GowooriRestoredPackageRepairResult) => {
    if (!restoredQualityPackage) return;
    setRestoredPackageDiffHistory((current) =>
      current.map((item) =>
        item.packageState.importedAt === restoredQualityPackage.importedAt
          ? {
              ...item,
              repairResult,
              report: createRestoredPackageDiffReport(item.summary, item.diff, repairResult),
            }
          : item,
      ),
    );
  };

  const copyRestoredPackageDiffHistoryReport = async (item: RestoredQualityPackageDiffHistoryItem) => {
    const report = item.repairResult
      ? createRestoredPackageDiffReport(item.summary, item.diff, item.repairResult)
      : item.report;
    try {
      await navigator.clipboard.writeText(report);
      setStatus(`Copied history package diff report for ${item.summary.name}.`);
    } catch {
      setStatus('Clipboard access is unavailable. Select the history package diff report and copy it manually.');
    }
  };

  const saveRestoredPackageDiffHistoryReport = (item: RestoredQualityPackageDiffHistoryItem) => {
    const report = item.repairResult
      ? createRestoredPackageDiffReport(item.summary, item.diff, item.repairResult)
      : item.report;
    const fileSuffix = new Date(item.summary.importedAt).toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`gowoori-quality-package-diff-${fileSuffix}.md`, report, 'text/markdown');
    setStatus(`Saved history package diff report for ${item.summary.name}.`);
  };

  const copyFilteredQualityReport = async () => {
    const report = createFilteredQualityReport(qualityFilterSummary, filteredQualityLog, selectedQualityEntry);
    try {
      await navigator.clipboard.writeText(report);
      setStatus(`Copied filtered quality report for ${filteredQualityLog.length} run(s).`);
    } catch {
      setStatus('Clipboard access is unavailable. Select the filtered report and copy it manually.');
    }
  };

  const saveFilteredQualityReport = () => {
    const report = createFilteredQualityReport(qualityFilterSummary, filteredQualityLog, selectedQualityEntry);
    const fileSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`gowoori-quality-filtered-report-${fileSuffix}.md`, report, 'text/markdown');
    setStatus(`Saved filtered quality report for ${filteredQualityLog.length} run(s).`);
  };

  const copyRestoredPackageDiffReport = async () => {
    if (!restoredPackageSummary || !restoredPackageDiff) {
      setStatus('No restored package diff to copy.');
      return;
    }
    const report = createRestoredPackageDiffReport(
      restoredPackageSummary,
      restoredPackageDiff,
      restoredPackageRepairResult,
    );
    try {
      await navigator.clipboard.writeText(report);
      setStatus(`Copied package diff report for ${restoredPackageSummary.name}.`);
    } catch {
      setStatus('Clipboard access is unavailable. Select the package diff report and copy it manually.');
    }
  };

  const saveRestoredPackageDiffReport = () => {
    if (!restoredPackageSummary || !restoredPackageDiff) {
      setStatus('No restored package diff to save.');
      return;
    }
    const report = createRestoredPackageDiffReport(
      restoredPackageSummary,
      restoredPackageDiff,
      restoredPackageRepairResult,
    );
    const fileSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`gowoori-quality-package-diff-${fileSuffix}.md`, report, 'text/markdown');
    setStatus(`Saved package diff report for ${restoredPackageSummary.name}.`);
  };

  const copyRestoredDrilldownReviewNote = async () => {
    if (!restoredPackageDrilldown) {
      setStatus('No restored package artifact drilldown is selected.');
      return;
    }
    const report = createRestoredQualityArtifactReviewNote(restoredPackageDrilldown);
    try {
      await navigator.clipboard.writeText(report);
      setStatus(
        `Copied restored package artifact review note for ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}.`,
      );
    } catch {
      setStatus(
        'Clipboard access is unavailable. Select the restored package artifact review note and copy it manually.',
      );
    }
  };

  const saveRestoredDrilldownReviewNote = () => {
    if (!restoredPackageDrilldown) {
      setStatus('No restored package artifact drilldown is selected.');
      return;
    }
    const report = createRestoredQualityArtifactReviewNote(restoredPackageDrilldown);
    const fileSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`gowoori-restored-artifact-review-${fileSuffix}.md`, report, 'text/markdown');
    setStatus(
      `Saved restored package artifact review note for ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}.`,
    );
  };

  const insertRestoredDrilldownReviewNote = () => {
    if (!restoredPackageDrilldown) {
      setStatus('No restored package artifact drilldown is selected.');
      return;
    }
    const { report, reviewPrompt } = createRestoredDrilldownReviewPrompt(restoredPackageDrilldown);
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: 'system',
        text: `Review note: ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}`,
        prompt: reviewPrompt,
        detail: report,
        status: 'review note',
      },
    ]);
    setInspectorTab('chat');
    setStatus(
      `Inserted restored package artifact review note into the transcript for ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}.`,
    );
  };

  const repairRestoredDrilldownNow = () => {
    if (!restoredPackageDrilldown) {
      setStatus('No restored package artifact drilldown is selected.');
      return;
    }
    if (isGeneratingRef.current) {
      setStatus('GowooriChat is already generating. Wait for the current request to finish.');
      return;
    }
    const { reviewPrompt } = createRestoredDrilldownReviewPrompt(restoredPackageDrilldown);
    setInspectorTab('stream');
    setStatus(
      `Started restored package artifact repair from review note for ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}.`,
    );
    void sendPrompt(reviewPrompt, { requestMode: 'repair' });
  };

  const saveQualityReportPackage = () => {
    const payload = createQualityReportPackage({
      qualityFilterSummary,
      entries: filteredQualityLog,
      selectedEntry: selectedQualityEntry,
      bridgeMatrixSummary,
      providerBenchmark: qualityBenchmark,
      providerScorecard: qualityScorecard,
      providerCaseMatrix: qualityBenchmark.caseMatrix,
      benchmarkProviders,
      caseDiff: selectedQualityCaseDiff,
    });
    const fileSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`gowoori-quality-report-package-${fileSuffix}.json`, payload, 'application/json');
    setStatus(`Saved Quality report package for ${filteredQualityLog.length} filtered run(s).`);
  };

  const exportQualityLog = async () => {
    if (qualityLog.length === 0) {
      setStatus('No Gowoori quality log entries to export.');
      return;
    }
    const payload = exportGowooriQualityLog(qualityLog);
    const fileSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`gowoori-quality-log-${fileSuffix}.json`, payload, 'application/json');
    try {
      await navigator.clipboard.writeText(payload);
      setStatus(`Exported ${qualityLog.length} quality log entries and copied JSON to the clipboard.`);
    } catch {
      setStatus(`Exported ${qualityLog.length} quality log entries. Clipboard access is unavailable.`);
    }
  };

  const exportBenchmarkJson = async () => {
    if (qualityBenchmark.providers.length === 0) {
      setStatus('No Gowoori provider benchmark to export.');
      return;
    }
    const payload = exportGowooriProviderBenchmarkJson(qualityBenchmark);
    const fileSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    const caseRunCount = qualityBenchmark.caseMatrix.reduce((sum, item) => sum + item.total, 0);
    downloadTextFile(`gowoori-provider-benchmark-${fileSuffix}.json`, payload, 'application/json');
    try {
      await navigator.clipboard.writeText(payload);
      setStatus(
        `Exported benchmark JSON for ${qualityBenchmark.providers.length} provider(s) and ${caseRunCount} case-level provider run(s).`,
      );
    } catch {
      setStatus(
        `Exported benchmark JSON for ${qualityBenchmark.providers.length} provider(s) and ${caseRunCount} case-level provider run(s). Clipboard access is unavailable.`,
      );
    }
  };

  const exportBenchmarkCsv = async () => {
    if (qualityBenchmark.providers.length === 0) {
      setStatus('No Gowoori provider benchmark to export.');
      return;
    }
    const payload = exportGowooriProviderBenchmarkCsv(qualityBenchmark);
    const fileSuffix = new Date().toISOString().replace(/[:.]/g, '-');
    const caseRunCount = qualityBenchmark.caseMatrix.reduce((sum, item) => sum + item.total, 0);
    downloadTextFile(`gowoori-provider-benchmark-${fileSuffix}.csv`, payload, 'text/csv');
    try {
      await navigator.clipboard.writeText(payload);
      setStatus(
        `Exported benchmark CSV for ${qualityBenchmark.providers.length} provider(s) and ${caseRunCount} case-level provider run(s).`,
      );
    } catch {
      setStatus(
        `Exported benchmark CSV for ${qualityBenchmark.providers.length} provider(s) and ${caseRunCount} case-level provider run(s). Clipboard access is unavailable.`,
      );
    }
  };

  const importQualityLog = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = importGowooriQualityLog(await file.text());
      if (result.entries.length === 0) {
        setStatus(`No quality log entries imported. Dropped ${result.dropped} invalid item(s).`);
        return;
      }
      setQualityLog((current) => mergeGowooriQualityLogs(current, result.entries, GOWOORI_CHAT_QUALITY_LOG_LIMIT));
      setInspectorTab('quality');
      setStatus(`Imported ${result.entries.length} quality log entries. Dropped ${result.dropped} invalid item(s).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to import Gowoori quality log JSON.');
    }
  };

  const importMatrixReport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = importGowooriBridgeMatrixReport(await file.text());
      if (result.entries.length === 0) {
        setStatus(`No Bridge smoke matrix entries imported. Dropped ${result.dropped} invalid item(s).`);
        return;
      }
      setQualityLog((current) => mergeGowooriQualityLogs(current, result.entries, GOWOORI_CHAT_QUALITY_LOG_LIMIT));
      setSelectedQualityProvider('all');
      setSelectedQualityMode('bridge-matrix');
      setSelectedQualityCase('all');
      setInspectorTab('quality');
      const summary = result.summary ? ` Matrix summary ${result.summary.passed}/${result.summary.total} passed.` : '';
      setStatus(
        `Imported ${result.entries.length} Bridge smoke matrix run(s). Dropped ${result.dropped} invalid item(s).${summary}`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to import Gowoori bridge matrix report JSON.');
    }
  };

  const importQualityReportPackage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const packageImport = parseQualityReportPackage(await file.text());
      if (packageImport.entries.length === 0) {
        setStatus(`No Quality report package entries imported. Dropped ${packageImport.dropped} invalid item(s).`);
        return;
      }
      const nextQualityLog = mergeGowooriQualityLogs(qualityLog, packageImport.entries, GOWOORI_CHAT_QUALITY_LOG_LIMIT);
      const restoredPackageState: RestoredQualityPackageState = {
        name: file.name || 'Quality report package',
        importedAt: Date.now(),
        entries: packageImport.entries,
        entryIds: packageImport.entries.map((entry) => entry.id),
        selectedEntryId: packageImport.selectedEntryId || packageImport.entries[0].id,
        provider: packageImport.provider,
        mode: packageImport.mode,
        caseTitle: packageImport.caseTitle,
        benchmarkTotal: packageImport.benchmark?.total ?? packageImport.entries.length,
        benchmarkProviderCount:
          packageImport.benchmark?.providers.length ??
          new Set(packageImport.entries.map((entry) => entry.provider)).size,
        scorecard: packageImport.scorecard,
        caseMatrix: packageImport.caseMatrix,
        benchmarkProviders: packageImport.benchmarkProviders,
      };
      setQualityLog(nextQualityLog);
      setSelectedQualityProvider(packageImport.provider);
      setSelectedQualityMode(packageImport.mode);
      setSelectedQualityCase(packageImport.caseTitle);
      setSelectedQualityEntryId(packageImport.selectedEntryId || packageImport.entries[0].id);
      if (packageImport.benchmark) {
        setBenchmarkBaseline(packageImport.benchmark);
        setBenchmarkBaselineName('Quality report package');
      }
      setRestoredQualityPackage(restoredPackageState);
      setRestoredPackageDrilldownRequest(null);
      setRestoredPackageRepairResult(null);
      addRestoredPackageDiffHistoryItem(restoredPackageState, nextQualityLog);
      setShowRestoredPackageDiff(true);
      setInspectorTab('quality');
      setStatus(
        `Imported Quality report package with ${packageImport.entries.length} run(s). Dropped ${packageImport.dropped} invalid item(s).`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to import Gowoori quality report package JSON.');
    }
  };

  const importBenchmarkBaseline = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = importGowooriProviderBenchmark(await file.text());
      if (!result.benchmark) {
        setStatus(result.error ?? `No benchmark baseline imported. Dropped ${result.dropped} invalid item(s).`);
        return;
      }
      setBenchmarkBaseline(result.benchmark);
      setBenchmarkBaselineName(file.name);
      setInspectorTab('quality');
      setStatus(`Imported benchmark baseline "${file.name}" with ${result.benchmark.providers.length} provider(s).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to import Gowoori benchmark baseline JSON.');
    }
  };

  const clearBenchmarkBaseline = () => {
    setBenchmarkBaseline(null);
    setBenchmarkBaselineName('');
    setStatus('Benchmark baseline cleared.');
  };

  const clearQualityLog = () => {
    setQualityLog([]);
    persistGowooriQualityLogToStorage([]);
    notifyGowooriQualityLogChanged();
    setRestoredQualityPackage(null);
    setRestoredPackageDrilldownRequest(null);
    setRestoredPackageRepairResult(null);
    setShowRestoredPackageDiff(false);
    setStatus('Gowoori quality log cleared.');
  };

  const createByokRuntimeSnapshot = (settingsOverride?: Partial<AppSettings> | null): Partial<AppSettings> => ({
    ...(settingsSnapshotRef.current ?? {}),
    ...(settingsOverride ?? {}),
    aiProvider: aiProviderSettings ?? settingsOverride?.aiProvider ?? settingsSnapshotRef.current?.aiProvider,
    aiProviderProfiles:
      aiProviderProfiles.length > 0
        ? aiProviderProfiles
        : (settingsOverride?.aiProviderProfiles ?? settingsSnapshotRef.current?.aiProviderProfiles),
    activeAiProviderProfileId:
      activeAiProviderProfileId ||
      settingsOverride?.activeAiProviderProfileId ||
      settingsSnapshotRef.current?.activeAiProviderProfileId,
    gowooriChat: providerSettings,
    secretVault: settingsOverride?.secretVault ?? settingsSnapshotRef.current?.secretVault,
  });

  const providerDiagnostic = useMemo(() => {
    if (provider !== 'byok') {
      return `AI profile "${activeAiProviderProfileName}" is loaded for BYOK API runs. Current provider uses its own local/CLI runtime.`;
    }
    const runtimeState = resolveGowooriDevByokRuntimeFromSettings(createByokRuntimeSnapshot());
    if (!activeAiProviderProfileId) {
      return 'AI profile is not selected. Open Settings > Provider and select or create a profile.';
    }
    if (!runtimeState.ready)
      return runtimeState.diagnostics[0] ?? `AI profile "${runtimeState.profileName}" is not ready.`;
    return `AI profile "${activeAiProviderProfileName}" is ready: ${getAiProviderSummary(aiProviderSettings)}.`;
  }, [
    activeAiProviderProfileId,
    activeAiProviderProfileName,
    aiProviderSettings,
    aiProviderProfiles,
    provider,
    providerSettings,
  ]);

  const gowooriSimpleProviderReady = useMemo(() => {
    if (provider !== 'byok') return true;
    return resolveGowooriDevByokRuntimeFromSettings(createByokRuntimeSnapshot()).ready;
  }, [activeAiProviderProfileId, aiProviderSettings, aiProviderProfiles, provider, providerSettings]);

  const gowooriSimpleTargetLabel = useMemo(
    () => getGowooriTargetLabel(targetMode, targetOptions),
    [targetOptions, targetMode],
  );

  const gowooriSimpleTargetReady = useMemo(() => isGowooriTargetAvailable(targetMode, targets), [targetMode, targets]);

  const gowooriSimpleSetupSteps = useMemo(
    () =>
      createGowooriSimpleSetupSteps({
        providerLabel: getGowooriProviderDefinition(provider).label,
        providerReady: gowooriSimpleProviderReady,
        providerDetail: providerDiagnostic,
        targetLabel: gowooriSimpleTargetLabel,
        targetReady: gowooriSimpleTargetReady,
        autoApply,
        livePreview: providerSettings.livePreview,
      }),
    [
      autoApply,
      gowooriSimpleProviderReady,
      gowooriSimpleTargetLabel,
      gowooriSimpleTargetReady,
      provider,
      providerDiagnostic,
      providerSettings.livePreview,
    ],
  );

  const updateProviderSettings = (updater: (current: GowooriChatSettings) => GowooriChatSettings) => {
    setProviderSettings((current) => {
      const next = normalizeProviderSettings(updater(current));
      window.terminalAPI.saveSettings({ gowooriChat: next }).catch((error) => {
        setStatus(`Gowoori settings save failed: ${error instanceof Error ? error.message : String(error)}`);
      });
      return next;
    });
  };

  const selectProvider = (nextProvider: GowooriProvider) => {
    setProvider(nextProvider);
    updateProviderSettings((current) => ({
      ...current,
      provider: nextProvider,
    }));
  };

  const toggleBenchmarkProvider = (providerId: string) => {
    if (!isGowooriProviderId(providerId)) return;
    setBenchmarkProviders((current) => {
      if (current.includes(providerId)) {
        return current.filter((item) => item !== providerId);
      }
      const selected = new Set<GowooriProvider>([...current, providerId]);
      return GOWOORI_PROVIDER_DEFINITIONS.map((definition) => definition.id).filter((item) => selected.has(item));
    });
  };

  const selectAllBenchmarkProviders = () => {
    setBenchmarkProviders(GOWOORI_PROVIDER_DEFINITIONS.map((definition) => definition.id));
  };

  const selectActiveBenchmarkProvider = () => {
    setBenchmarkProviders([provider]);
  };

  const useBestBenchmarkProvider = () => {
    const recommendedProvider = qualityScorecard.recommendedProvider ?? qualityBenchmark.bestProvider;
    if (!recommendedProvider) {
      setStatus('No benchmark provider is available yet.');
      return;
    }
    if (!benchmarkBestProvider) {
      setStatus(
        `Unsupported benchmark provider: ${recommendedProvider}. Import or run a benchmark for a GowooriChat provider.`,
      );
      return;
    }
    if (benchmarkBestProvider === provider) {
      setStatus(`${getGowooriProviderDefinition(benchmarkBestProvider).label} is already the active provider.`);
      return;
    }
    selectProvider(benchmarkBestProvider);
    setStatus(`Using recommended benchmark provider: ${getGowooriProviderDefinition(benchmarkBestProvider).label}.`);
  };

  const selectAiProviderProfile = (profileId: string) => {
    const profile = aiProviderProfiles.find((item) => item.id === profileId);
    if (!profile) return;
    const updatedSettings: Partial<AppSettings> = {
      activeAiProviderProfileId: profile.id,
      aiProvider: profile.settings,
    };
    settingsSnapshotRef.current = {
      ...(settingsSnapshotRef.current ?? {}),
      ...updatedSettings,
    };
    setActiveAiProviderProfileId(profile.id);
    setActiveAiProviderProfileName(profile.name);
    setAiProviderSettings(profile.settings);
    setStatus(`AI profile selected: ${profile.name}`);
    window.terminalAPI
      .saveSettings(updatedSettings)
      .then(() => {
        window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: updatedSettings }));
      })
      .catch((error) => {
        setStatus(`AI profile save failed: ${error instanceof Error ? error.message : String(error)}`);
      });
  };

  const runProviderPreflight = async () => {
    if (isPreflighting) return;
    window.dispatchEvent(new CustomEvent(GOWOORI_INSTANCE_REQUEST_EVENT));
    const checks: string[] = [];
    const providerDefinition = getGowooriProviderDefinition(provider);
    checks.push(`Provider: ${providerDefinition.label}`);
    checks.push(`AI profile: ${activeAiProviderProfileName}`);
    checks.push(`Target: ${getGowooriTargetLabel(targetMode, targetOptions)}`);

    if (!isGowooriTargetAvailable(targetMode, targets)) {
      checks.push('Target pane: missing');
      setStatus(`Preflight warning. ${checks.join(' | ')}`);
      return;
    }

    setIsPreflighting(true);
    setStatus(`Preflight running. ${checks.join(' | ')}`);
    try {
      if (provider === 'byok') {
        const runtimeState = resolveGowooriDevByokRuntimeFromSettings(createByokRuntimeSnapshot());
        const runtime = runtimeState.runtime;
        checks.push(`Model: ${runtime.model || 'missing'}`);
        checks.push(`Endpoint: ${runtime.baseUrl ? 'ready' : 'missing'}`);
        checks.push(`API key: ${runtime.apiKeyRequired ? (runtime.apiKey ? 'ready' : 'missing') : 'not required'}`);
        if (!runtimeState.ready) {
          setStatus(`Preflight warning. ${checks.join(' | ')}`);
          return;
        }
        const result = await runGowooriApiPreflight({
          baseUrl: runtime.baseUrl,
          apiKey: runtime.apiKey,
          model: runtime.model,
          apiFormat: runtime.apiFormat,
          apiKeyRequired: runtime.apiKeyRequired,
        });
        checks.push(`API ping: HTTP ${result.status}`);
        setStatus(`${result.ok ? 'Preflight ready' : 'Preflight warning'}. ${checks.join(' | ')}`);
        return;
      }

      if (providerDefinition.kind === 'cli') {
        const command = providerSettings.commandOverrides[provider]?.trim() || providerDefinition.command || provider;
        const cliPlan: GowooriCliPlanResult = {
          kind: 'cli-plan',
          provider,
          command,
          defaultArgs: providerDefinition.defaultArgs ?? [],
          promptMode: providerSettings.promptMode,
          prompt: '',
          summary: `${providerDefinition.label} preflight`,
        };
        checks.push(`CLI command: ${command}`);
        checks.push(`Prompt handoff: ${providerSettings.promptMode}`);
        const result = await runGowooriCliPreflight(cliPlan, window.terminalAPI, {
          timeoutMs: Math.min(providerSettings.timeoutMs, 15000),
          versionArgs: ['--version'],
        });
        checks.push(`CLI ping: ${result.ok ? 'ready' : `exit ${result.exitCode ?? 'unknown'}`}`);
        if (result.output) {
          checks.push(`Version: ${result.output.split(/\r?\n/)[0]?.slice(0, 80)}`);
        }
        if (!result.ok) {
          setQualityLog((current) =>
            mergeGowooriQualityLogs(
              current,
              [
                createGowooriQualityLogEntry({
                  id: createMessageId(),
                  provider,
                  mode: 'settings-test',
                  promptTitle: `${providerDefinition.label} CLI preflight`,
                  startedAt: Date.now(),
                  completedAt: Date.now(),
                  source: normalizeTerminalArtifactOutput(result.output),
                  normalizedChanged: false,
                  preflightOk: false,
                  autoRepairAttempted: false,
                  autoRepairSucceeded: false,
                  applyRequested: false,
                  applied: false,
                  providerError: true,
                  diagnostics: [{ severity: 'error', message: result.message }],
                  summary: `${providerDefinition.label} CLI preflight failed.`,
                }),
              ],
              GOWOORI_CHAT_QUALITY_LOG_LIMIT,
            ),
          );
          notifyGowooriQualityLogChanged();
          setStatus(`Preflight warning. ${checks.join(' | ')}`);
          return;
        }

        const smokeStartedAt = Date.now();
        checks.push('Smoke artifact: running');
        setStatus(`Preflight smoke running. ${checks.join(' | ')}`);
        appendRawStream(
          ['', `[Provider smoke] ${providerDefinition.label}`, GOWOORI_PROVIDER_SMOKE_PROMPT, ''].join('\n'),
        );
        const smokeArtifact = await runGowooriProviderArtifact({
          provider,
          mode: 'generate',
          prompt: GOWOORI_PROVIDER_SMOKE_PROMPT,
          telemetryTarget: window,
          providerSettings,
          terminalApi: window.terminalAPI,
          resolveApiRuntime: resolveLatestApiRuntime,
          agentTools,
          writePromptFile: writeGowooriCliPromptFile,
          onAbortController: (controller) => {
            abortControllerRef.current = controller;
          },
          onChunk: appendRawStream,
          onStatus: (statusText) => setStatus(`Preflight smoke: ${statusText}`),
          cliStatus: (cliCommand) => `Preflight smoke running through ${cliCommand}...`,
        });
        abortControllerRef.current = null;
        const smokeFinal = prepareGowooriArtifactSource(
          smokeArtifact.source,
          false,
          `${providerDefinition.label} provider smoke`,
        );
        const smokeAcceptance = runGowooriArtifactAcceptanceGate({
          provider,
          prompt: GOWOORI_PROVIDER_SMOKE_PROMPT,
          title: `${providerDefinition.label} provider smoke`,
          source: smokeFinal.source,
          requiredText: GOWOORI_PROVIDER_SMOKE_REQUIRED_TEXT,
          validate: validateGowooriArtifactSource,
        });
        const smokeDiagnostics = [...smokeFinal.diagnostics, ...smokeAcceptance.diagnostics];
        setQualityLog((current) =>
          mergeGowooriQualityLogs(
            current,
            [
              createGowooriQualityLogEntry({
                id: createMessageId(),
                provider,
                mode: 'settings-test',
                promptTitle: `${providerDefinition.label} provider smoke`,
                startedAt: smokeStartedAt,
                completedAt: Date.now(),
                source: smokeFinal.source,
                normalizedChanged: smokeFinal.changed,
                preflightOk: smokeAcceptance.ok,
                autoRepairAttempted: false,
                autoRepairSucceeded: false,
                applyRequested: false,
                applied: false,
                diagnostics: smokeDiagnostics,
                summary: smokeAcceptance.ok
                  ? `${providerDefinition.label} generated a valid Gowoori smoke artifact.`
                  : `${providerDefinition.label} smoke artifact failed Gowoori acceptance.`,
              }),
            ],
            GOWOORI_CHAT_QUALITY_LOG_LIMIT,
          ),
        );
        notifyGowooriQualityLogChanged();
        checks.push(`Smoke artifact: ${smokeAcceptance.ok ? 'valid' : 'blocked'}`);
        setInspectorTab('quality');
        setStatus(`${smokeAcceptance.ok ? 'Preflight ready' : 'Preflight warning'}. ${checks.join(' | ')}`);
        return;
      }

      checks.push('Local mock provider: ready');
      setStatus(`Preflight ready. ${checks.join(' | ')}`);
    } catch (error) {
      checks.push(error instanceof Error ? error.message : String(error));
      setStatus(`Preflight failed. ${checks.join(' | ')}`);
    } finally {
      abortControllerRef.current = null;
      setIsPreflighting(false);
    }
  };

  const prepareGowooriArtifactSource = (source: string, allowPartial = false, context = 'Gowoori artifact') => {
    const repaired = normalizeGowooriArtifactSource(normalizeTerminalArtifactOutput(source), { allowPartial });
    if (repaired.changed || repaired.diagnostics.length > 0) {
      setRepairDiagnostics((current) =>
        [
          {
            id: createMessageId(),
            context,
            changed: repaired.changed,
            renderable: repaired.renderable,
            diagnostics:
              repaired.diagnostics.length > 0
                ? repaired.diagnostics
                : [{ severity: 'info' as const, message: 'Normalized provider output for Gowoori rendering.' }],
          },
          ...current,
        ].slice(0, 16),
      );
    }
    return repaired;
  };

  const applySourceToGowoori = async (
    source: string,
    label: string,
    targetOverride?: GowooriTargetMode,
    silent = false,
    allowPartial = false,
  ) => {
    const resolvedTarget = targetOverride ?? targetMode;
    const repaired = prepareGowooriArtifactSource(source, allowPartial, label);
    const detail = createGowooriApplyDetail({
      source: repaired.source,
      label,
      targetMode: resolvedTarget,
      applyMode,
    });

    if (resolvedTarget === 'new') {
      const existingTargetIds = new Set(targets.map((target) => target.id));
      const nextTargetPromise = waitForNewGowooriInstance(existingTargetIds);
      writePendingGowooriApply(detail);
      dispatchGowooriOpenRequest({ label });
      const nextTarget = await nextTargetPromise;
      if (!nextTarget) {
        if (!silent) setStatus('Failed to open a new Gowoori pane.');
        return;
      }
      if (!silent) setStatus('Opened a new Gowoori pane and sent the generated artifact.');
      return;
    }

    dispatchGowooriApply(detail);
    if (!silent) {
      setStatus(
        resolvedTarget === 'all'
          ? 'Sent the generated artifact to all open Gowoori panes.'
          : 'Sent the generated artifact to the selected Gowoori pane.',
      );
    }
  };

  const openLivePreviewTarget = async (label: string): Promise<GowooriTargetMode> => {
    if (targetMode !== 'new') return targetMode;
    const existingTargetIds = new Set(targets.map((target) => target.id));
    const placeholder = ['# Gowoori stream', '', 'The provider is streaming a Markdown + XCON/SKETCH artifact...'].join(
      '\n',
    );
    const nextTargetId = await new Promise<string | null>((resolve) => {
      let settled = false;
      const finish = (id: string | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.removeEventListener(GOWOORI_INSTANCE_EVENT, handleInstance);
        resolve(id);
      };
      const handleInstance = (event: Event) => {
        const detail = (event as CustomEvent<GowooriInstanceDetail>).detail;
        if (!detail?.id || existingTargetIds.has(detail.id)) return;
        finish(detail.id);
      };
      const timer = window.setTimeout(() => finish(null), 1800);
      window.addEventListener(GOWOORI_INSTANCE_EVENT, handleInstance);
      void applySourceToGowoori(placeholder, label, 'new', true);
    });
    return nextTargetId ?? 'all';
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setGenerationBusy(false);
    setGenerationProgress('');
    setStatus('Generation cancelled.');
  };

  const appendRawStream = (chunk: string) => {
    setRawStream((current) => `${current}${chunk}`.slice(-50000));
  };

  const reportBridgeRunProgress = (
    bridgeRequestId: string | undefined,
    progress: Omit<McpBridgeGowooriChatRunProgress, 'requestId' | 'at'>,
  ) => {
    if (!bridgeRequestId) return;
    void getDeskBridgeApi()
      ?.reportGowooriChatRunProgress?.({
        requestId: bridgeRequestId,
        ...progress,
        at: new Date().toISOString(),
      })
      .catch(() => undefined);
  };

  const toBridgeRunStatus = (phase: McpBridgeGowooriChatRunProgressPhase): McpBridgeGowooriChatRunStatus => {
    if (phase === 'completed') return 'completed';
    if (phase === 'timeout') return 'timeout';
    if (phase === 'cancelled') return 'cancelled';
    if (phase === 'error') return 'failed';
    if (phase === 'queued') return 'queued';
    return 'running';
  };

  const recordArtifactDiagnostics = (
    context: string,
    changed: boolean,
    renderable: boolean,
    diagnostics: GowooriArtifactRepairDiagnostic[],
  ) => {
    if (diagnostics.length === 0) return;
    setRepairDiagnostics((current) =>
      [
        {
          id: createMessageId(),
          context,
          changed,
          renderable,
          diagnostics,
        },
        ...current,
      ].slice(0, 16),
    );
  };

  const resolveLatestApiRuntime = async () => {
    const latestSettings = await window.terminalAPI.getSettings().catch(() => settingsSnapshotRef.current);
    const latestSnapshot = latestSettings
      ? { ...(settingsSnapshotRef.current ?? {}), ...latestSettings }
      : settingsSnapshotRef.current;
    const runtimeState = resolveGowooriDevByokRuntimeFromSettings(createByokRuntimeSnapshot(latestSnapshot));
    if (!runtimeState.ready)
      throw new Error(runtimeState.diagnostics[0] ?? `AI profile "${runtimeState.profileName}" is not ready.`);
    return {
      runtime: runtimeState.runtime,
      activeProfileName: runtimeState.profileName,
    };
  };

  async function runAutomaticRepairAttempt(
    originalPrompt: string,
    source: string,
    diagnostics: GowooriArtifactRepairDiagnostic[],
    repairProvider: GowooriProvider = provider,
  ): Promise<GowooriArtifactResult | null> {
    return runGowooriAutomaticRepairAttempt({
      originalPrompt,
      source,
      diagnostics,
      repairProvider,
      providerSettings,
      terminalApi: window.terminalAPI,
      resolveApiRuntime: resolveLatestApiRuntime,
      appendRawStream,
      appendSystemMessage: (text, detail) => {
        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: 'system',
            text,
            detail,
          },
        ]);
      },
      setStatus,
      setAbortController: (controller) => {
        abortControllerRef.current = controller;
      },
      writePromptFile: writeGowooriCliPromptFile,
    });
  }

  const selectQualityEntry = (entryId: string) => {
    setSelectedQualityEntryId(entryId);
  };

  const drillIntoQualityEntry = (entry: GowooriQualityLogEntry) => {
    setSelectedQualityProvider(entry.provider);
    setSelectedQualityMode(entry.mode);
    setSelectedQualityCase(entry.promptTitle);
    setSelectedQualityEntryId(entry.id);
    setInspectorTab('quality');
    setStatus(`Filtered quality log to ${entry.provider} / ${entry.mode} / ${entry.promptTitle}.`);
  };

  const drillIntoBridgeProvider = (providerName: string) => {
    const latestBridgeEntry = qualityLog
      .filter((entry) => entry.provider === providerName && entry.mode === 'bridge-matrix')
      .sort((a, b) => b.completedAt - a.completedAt || b.startedAt - a.startedAt || a.id.localeCompare(b.id))[0];

    setSelectedQualityProvider(providerName);
    setSelectedQualityMode('bridge-matrix');
    setSelectedQualityCase('all');
    if (latestBridgeEntry) setSelectedQualityEntryId(latestBridgeEntry.id);
    setInspectorTab('quality');
    setStatus(`Filtered Bridge Matrix Summary to ${providerName}.`);
  };

  const drillIntoProviderReadiness = (entry: GowooriProviderReadinessItem) => {
    setSelectedQualityProvider(entry.provider);
    setSelectedQualityMode('settings-test');
    setSelectedQualityCase('all');
    if (entry.latestEntry) {
      selectQualityEntry(entry.latestEntry.id);
    }
    setInspectorTab('quality');
    setStatus(`Opened provider readiness log for ${entry.provider}.`);
  };

  const openRestoredScorecardDrilldown = (providerName: string) => {
    if (!restoredQualityPackage) return;
    const request: RestoredQualityArtifactDrilldownRequest = { provider: providerName };
    const drilldown = createRestoredQualityArtifactDrilldown(
      restoredQualityPackage,
      qualityLog,
      request,
      qualityBenchmark,
    );
    setRestoredPackageDrilldownRequest(request);
    setRestoredPackageRepairResult(null);
    updateRestoredPackageDiffHistoryDrilldownRequest(request);
    setSelectedQualityProvider(providerName);
    setSelectedQualityMode('all');
    setSelectedQualityCase('all');
    const entryId = drilldown.currentEntry?.id ?? drilldown.packageEntry?.id;
    if (entryId) setSelectedQualityEntryId(entryId);
    setShowRestoredPackageDiff(true);
    setInspectorTab('quality');
    setStatus(`Opened restored package scorecard drilldown for ${providerName}.`);
  };

  const openRestoredMatrixDrilldown = (providerName: string, caseTitle: string) => {
    if (!restoredQualityPackage) return;
    const request: RestoredQualityArtifactDrilldownRequest = { provider: providerName, caseTitle };
    const drilldown = createRestoredQualityArtifactDrilldown(
      restoredQualityPackage,
      qualityLog,
      request,
      qualityBenchmark,
    );
    setRestoredPackageDrilldownRequest(request);
    setRestoredPackageRepairResult(null);
    updateRestoredPackageDiffHistoryDrilldownRequest(request);
    setSelectedQualityProvider(providerName);
    setSelectedQualityMode('all');
    setSelectedQualityCase(caseTitle);
    const entryId = drilldown.currentEntry?.id ?? drilldown.packageEntry?.id;
    if (entryId) setSelectedQualityEntryId(entryId);
    setShowRestoredPackageDiff(true);
    setInspectorTab('quality');
    setStatus(`Opened restored package matrix drilldown for ${providerName} / ${caseTitle}.`);
  };

  const copyRestoredDrilldownArtifactSource = async (side: 'package' | 'current' | 'repaired') => {
    if (!restoredPackageDrilldown) {
      setStatus('No restored package artifact drilldown is selected.');
      return;
    }
    const source =
      side === 'repaired'
        ? (restoredPackageRepairResult?.source ?? '')
        : side === 'package'
          ? restoredPackageDrilldown.packageSource
          : restoredPackageDrilldown.currentSource;
    if (!source) {
      setStatus(`No ${side} artifact source is available for this restored package drilldown.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(source);
      setStatus(
        `Copied ${side} restored package artifact source for ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}.`,
      );
    } catch {
      setStatus('Clipboard access is unavailable. Select the restored package artifact source and copy it manually.');
    }
  };

  const copyRestoredDrilldownArtifactLine = async (
    side: 'package' | 'current' | 'repaired',
    text: string,
    lineNumber: number | null,
  ) => {
    if (!restoredPackageDrilldown || lineNumber === null) {
      setStatus(`No ${side} line is available for this restored package artifact drilldown.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      const statusPrefix =
        side === 'repaired'
          ? 'Copied repaired line'
          : side === 'package'
            ? 'Copied package line'
            : 'Copied current line';
      setStatus(
        `${statusPrefix} ${lineNumber} for ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}.`,
      );
    } catch {
      setStatus('Clipboard access is unavailable. Select the restored package artifact line and copy it manually.');
    }
  };

  const applyRestoredDrilldownArtifactSource = async (side: 'package' | 'current' | 'repaired') => {
    if (!restoredPackageDrilldown) {
      setStatus('No restored package artifact drilldown is selected.');
      return;
    }
    const source =
      side === 'repaired'
        ? (restoredPackageRepairResult?.source ?? '')
        : side === 'package'
          ? restoredPackageDrilldown.packageSource
          : restoredPackageDrilldown.currentSource;
    const entry =
      side === 'repaired'
        ? null
        : side === 'package'
          ? restoredPackageDrilldown.packageEntry
          : restoredPackageDrilldown.currentEntry;
    if (!source) {
      setStatus(`No ${side} artifact source is available for this restored package drilldown.`);
      return;
    }
    if (entry && !canApplyGowooriSourceBestEffort(source, entry.preflightOk)) {
      setStatus(
        `${side} restored package artifact does not include a renderable XCON/SKETCH block. Repair it or retry generation.`,
      );
      return;
    }
    await applySourceToGowoori(
      source,
      `Restored package ${side} artifact: ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}`,
    );
    setStatus(
      `Applied ${side} restored package artifact for ${restoredPackageDrilldown.provider} / ${restoredPackageDrilldown.caseTitle}.`,
    );
  };

  const copySelectedQualitySource = async () => {
    const source = selectedQualityEntry?.artifactSource;
    if (!source) {
      setStatus('Selected quality entry does not include artifact source.');
      return;
    }
    try {
      await navigator.clipboard.writeText(source);
      setStatus(`Copied artifact source for ${selectedQualityEntry.promptTitle}.`);
    } catch {
      setStatus('Clipboard access is unavailable. Select the source preview and copy it manually.');
    }
  };

  const applySelectedQualityEntry = async () => {
    if (!selectedQualityEntry?.artifactSource) {
      setStatus('Selected quality entry does not include artifact source.');
      return;
    }
    if (!canApplyGowooriSourceBestEffort(selectedQualityEntry.artifactSource, selectedQualityEntry.preflightOk)) {
      setStatus(
        'Selected quality entry does not include a renderable XCON/SKETCH block. Repair it or retry generation.',
      );
      return;
    }
    await applySourceToGowoori(selectedQualityEntry.artifactSource, `Quality log: ${selectedQualityEntry.promptTitle}`);
    setStatus(`Applied quality log artifact: ${selectedQualityEntry.promptTitle}.`);
  };

  const repairSelectedQualityEntry = async () => {
    if (!selectedQualityEntry?.artifactSource) {
      setStatus('Selected quality entry does not include artifact source.');
      return;
    }
    setIsRepairingQualityEntry(true);
    try {
      const diagnostics =
        selectedQualityEntry.diagnosticMessages.length > 0
          ? selectedQualityEntry.diagnosticMessages
          : [{ severity: 'error' as const, message: 'Quality log entry needs review before apply.' }];
      const repairedAttempt = await runAutomaticRepairAttempt(
        selectedQualityEntry.promptTitle,
        selectedQualityEntry.artifactSource,
        diagnostics,
      );
      if (!repairedAttempt) {
        setStatus('Selected quality artifact repair did not return a renderable response.');
        return;
      }
      const repairedArtifact = prepareGowooriArtifactSource(
        repairedAttempt.source,
        false,
        `Quality log repair: ${selectedQualityEntry.promptTitle}`,
      );
      const acceptanceGate = runGowooriArtifactAcceptanceGate({
        provider,
        prompt: selectedQualityEntry.promptTitle,
        title: `Quality log repair: ${selectedQualityEntry.promptTitle}`,
        source: repairedArtifact.source,
        validate: validateGowooriArtifactSource,
      });
      setRepairComparisons((current) =>
        [
          createGowooriArtifactComparison({
            context: `Quality log repair: ${selectedQualityEntry.promptTitle}`,
            originalSource: selectedQualityEntry.artifactSource ?? '',
            originalRenderable: selectedQualityEntry.preflightOk,
            originalDiagnostics: selectedQualityEntry.diagnosticMessages,
            repairedSource: repairedArtifact.source,
            repairedRenderable: acceptanceGate.ok,
            repairedDiagnostics: acceptanceGate.diagnostics,
          }),
          ...current,
        ].slice(0, 8),
      );
      setInspectorTab('repair');
      setStatus(
        acceptanceGate.ok
          ? 'Selected quality artifact repair is renderable. Review the repaired artifact before applying.'
          : 'Selected quality artifact repair still needs review.',
      );
    } finally {
      abortControllerRef.current = null;
      setIsRepairingQualityEntry(false);
    }
  };

  async function finishGeneratedArtifact(
    rawSource: string,
    summary: string,
    originalPrompt: string,
    applyLabel: string,
    successStatus: string,
    liveTarget?: GowooriTargetMode | null,
    allowAutomaticRepair = true,
    startedAt = Date.now(),
    qualityProvider: GowooriProvider = provider,
    qualityMode: GowooriRequestMode = requestMode,
    autoApplyOverride?: boolean,
    semanticPrompt?: string,
  ): Promise<GowooriChatRunCompletion> {
    return finishGowooriGeneratedArtifact({
      rawSource,
      summary,
      originalPrompt,
      semanticPrompt,
      applyLabel,
      successStatus,
      targetMode,
      liveTarget,
      allowAutomaticRepair,
      startedAt,
      qualityProvider,
      qualityMode,
      autoApply: autoApplyOverride ?? autoApply,
      prepareArtifactSource: prepareGowooriArtifactSource,
      recordArtifactDiagnostics,
      runAutomaticRepairAttempt,
      applySourceToGowoori,
      appendQualityLogEntry: (entry) => {
        setQualityLog((current) => mergeGowooriQualityLogs(current, [entry], GOWOORI_CHAT_QUALITY_LOG_LIMIT));
      },
      appendAssistantMessage: (message) => {
        setMessages((current) => [...current, message]);
        if (
          restoredPackageDrilldown &&
          originalPrompt.includes(RESTORED_REVIEW_REPAIR_PROMPT_PREFIX) &&
          message.source
        ) {
          const repairResult: GowooriRestoredPackageRepairResult = {
            id: message.id,
            provider: restoredPackageDrilldown.provider,
            caseTitle: restoredPackageDrilldown.caseTitle,
            source: message.source,
            summary: message.text,
            createdAt: Date.now(),
            prompt: originalPrompt,
          };
          setRestoredPackageRepairResult(repairResult);
          updateRestoredPackageDiffHistoryRepairResult(repairResult);
        }
      },
      appendRepairComparison: (comparison) => {
        setRepairComparisons((current) => [comparison, ...current].slice(0, 8));
      },
      setInspectorTab,
      setIsGenerating: setGenerationBusy,
      setStatus,
      clearAbortController: () => {
        abortControllerRef.current = null;
      },
      clearLivePreviewTarget: () => {
        livePreviewTargetRef.current = null;
      },
      createMessageId,
      telemetryTarget: window,
    });
  }

  async function runProviderAcceptanceBenchmark() {
    if (isGenerating || isBenchmarking) return;
    const selectedProviderSet = new Set<GowooriProvider>(benchmarkProviders);
    const selectedProviders = GOWOORI_PROVIDER_DEFINITIONS.map((definition) => definition.id).filter(
      (benchmarkProvider) => selectedProviderSet.has(benchmarkProvider),
    );
    if (selectedProviders.length === 0) {
      setStatus('Select at least one benchmark provider.');
      return;
    }

    setIsBenchmarking(true);
    setInspectorTab('quality');
    setRawStream('');

    let passedTotal = 0;
    let caseTotal = 0;

    try {
      setStatus(`Benchmarking ${selectedProviders.length} selected provider(s)...`);
      appendRawStream(`[Benchmark matrix] ${selectedProviders.join(', ')}\n`);

      for (const benchmarkProvider of selectedProviders) {
        const providerDefinition = getGowooriProviderDefinition(benchmarkProvider);
        const result = await runGowooriProviderAcceptanceBenchmark({
          provider: benchmarkProvider,
          providerLabel: providerDefinition.label,
          providerSettings,
          terminalApi: window.terminalAPI,
          resolveApiRuntime: resolveLatestApiRuntime,
          prepareArtifactSource: prepareGowooriArtifactSource,
          runAutomaticRepairAttempt,
          appendRawStream,
          setStatus,
          setAbortController: (controller) => {
            abortControllerRef.current = controller;
          },
          writePromptFile: writeGowooriCliPromptFile,
          appendSystemMessage: (text, detail) => {
            setMessages((current) => [
              ...current,
              {
                id: createMessageId(),
                role: 'system',
                text,
                detail,
              },
            ]);
          },
          createMessageId,
        });
        passedTotal += result.passed;
        caseTotal += result.total;
        setQualityLog((current) => mergeGowooriQualityLogs(current, result.entries, GOWOORI_CHAT_QUALITY_LOG_LIMIT));
        notifyGowooriQualityLogChanged();
      }

      setStatus(
        `Multi-provider benchmark completed: ${passedTotal}/${caseTotal} checks passed across ${selectedProviders.length} provider(s).`,
      );
    } finally {
      abortControllerRef.current = null;
      setIsBenchmarking(false);
    }
  }

  const sendPrompt = async (
    promptOverride?: string,
    overrides: GowooriChatRunOverrides = {},
  ): Promise<GowooriChatRunCompletion | null> => {
    const prompt = (promptOverride ?? input).trim();
    if (!prompt) return null;
    if (isGeneratingRef.current) {
      return {
        ok: false,
        prompt,
        applied: false,
        error: 'GowooriChat is already generating.',
      };
    }
    const effectiveProvider = overrides.provider ?? provider;
    const effectiveRequestMode = overrides.requestMode ?? requestMode;
    const effectiveTargetMode = overrides.targetMode ?? targetMode;
    const effectiveAutoApply = overrides.autoApply ?? autoApply;
    const effectiveSportsStandingsEndpoint =
      overrides.sportsStandingsEndpoint?.trim() || providerSettings.sportsStandingsEndpoint;
    const effectiveAgentTools =
      effectiveSportsStandingsEndpoint === providerSettings.sportsStandingsEndpoint
        ? agentTools
        : createDefaultGowooriAgentTools(undefined, {
            sports: {
              standingsEndpoint: effectiveSportsStandingsEndpoint,
            },
          });
    const bridgeRequestId = overrides.bridgeRequestId;
    const shouldSyncDeveloperControls = !isGowooriChatUserMode;
    if (overrides.provider && shouldSyncDeveloperControls) setProvider(effectiveProvider);
    if (overrides.requestMode && shouldSyncDeveloperControls) setRequestMode(effectiveRequestMode);
    if (overrides.targetMode && shouldSyncDeveloperControls) setTargetMode(effectiveTargetMode);
    if (typeof overrides.autoApply === 'boolean' && shouldSyncDeveloperControls) setAutoApply(effectiveAutoApply);
    const generationStartedAt = Date.now();
    const activeProvider = effectiveProvider;
    const activeMode = effectiveRequestMode;
    const activeTimeoutProfile = resolveGowooriProviderTimeoutProfile(activeProvider, providerSettings.timeoutMs);
    setInput('');
    setGenerationBusy(true);
    setRawStream('');
    const providerDefinition = getGowooriProviderDefinition(effectiveProvider);
    setStatus(`${providerDefinition.label} is preparing a Gowoori artifact...`);
    setGenerationProgress(`${providerDefinition.label} 실행을 준비하고 있습니다.`);
    reportBridgeRunProgress(bridgeRequestId, {
      status: 'running',
      phase: 'starting',
      message: `${providerDefinition.label} is preparing a Gowoori artifact.`,
      provider: effectiveProvider,
      prompt,
      elapsedMs: 0,
    });
    const userMessage: GowooriChatMessage = {
      id: createMessageId(),
      role: 'user',
      text: prompt,
    };
    setMessages((current) => [...current, userMessage]);

    await new Promise((resolve) => window.setTimeout(resolve, effectiveProvider === 'mock' ? 520 : 900));
    const allowStreamingLivePreview =
      !isGowooriChatUserMode &&
      effectiveAutoApply &&
      providerSettings.livePreview &&
      providerDefinition.kind !== 'local';
    try {
      livePreviewTargetRef.current = allowStreamingLivePreview
        ? await openLivePreviewTarget(
            providerDefinition.kind === 'api'
              ? `GowooriChat API: ${safeGowooriTitleFromPrompt(prompt)}`
              : `GowooriChat streaming: ${safeGowooriTitleFromPrompt(prompt)}`,
          )
        : null;
      const streamedChunks: string[] = [];
      let lastPreviewAt = 0;
      const artifact = await runGowooriProviderArtifact({
        provider: effectiveProvider,
        mode: effectiveRequestMode,
        prompt,
        telemetryTarget: window,
        providerSettings,
        terminalApi: window.terminalAPI,
        resolveApiRuntime: resolveLatestApiRuntime,
        agentTools: effectiveAgentTools,
        writePromptFile: writeGowooriCliPromptFile,
        approvedAgentToolCallIds: overrides.approvedAgentToolCallIds,
        onAbortController: (controller) => {
          abortControllerRef.current = controller;
        },
        onChunk: (chunk) => {
          appendRawStream(chunk);
          streamedChunks.push(chunk);
          const streamedSource = streamedChunks.join('');
          const streamLabel = providerDefinition.kind === 'api' ? 'BYOK API' : providerDefinition.label;
          setStatus(`${streamLabel} streaming... ${streamedSource.length.toLocaleString()} chars`);
          setGenerationProgress(`응답을 받고 있습니다. ${streamedSource.length.toLocaleString()} chars 수신`);
          reportBridgeRunProgress(bridgeRequestId, {
            status: 'running',
            phase: 'receiving-output',
            message: `${streamLabel} streaming... ${streamedSource.length.toLocaleString()} chars`,
            provider: effectiveProvider,
            prompt,
            elapsedMs: Date.now() - generationStartedAt,
            receivedBytes: streamedSource.length,
          });
          const now = Date.now();
          if (allowStreamingLivePreview && livePreviewTargetRef.current && now - lastPreviewAt > 550) {
            lastPreviewAt = now;
            const partialSource = normalizeTerminalArtifactOutput(streamedSource);
            if (partialSource) {
              void applySourceToGowoori(
                partialSource,
                providerDefinition.kind === 'api'
                  ? `GowooriChat live API: ${safeGowooriTitleFromPrompt(prompt)}`
                  : `GowooriChat live: ${safeGowooriTitleFromPrompt(prompt)}`,
                livePreviewTargetRef.current,
                true,
                true,
              );
            }
          }
        },
        onStatus: (nextStatus) => {
          setStatus(nextStatus);
          if (providerDefinition.kind !== 'cli' || nextStatus.startsWith('Gowoori tools:')) {
            setGenerationProgress(nextStatus);
          }
          reportBridgeRunProgress(bridgeRequestId, {
            status: 'running',
            phase: 'waiting',
            message: nextStatus,
            provider: effectiveProvider,
            prompt,
            elapsedMs: Date.now() - generationStartedAt,
          });
        },
        onProgress: (event) => {
          setStatus(event.message);
          setGenerationProgress(
            createGowooriUserProgressMessage(event, providerDefinition.label, activeTimeoutProfile),
          );
          const bridgePhase = event.phase as McpBridgeGowooriChatRunProgressPhase;
          reportBridgeRunProgress(bridgeRequestId, {
            status: toBridgeRunStatus(bridgePhase),
            phase: bridgePhase,
            message: event.message,
            provider: effectiveProvider,
            prompt,
            elapsedMs: event.elapsedMs,
            receivedBytes: event.outputBytes,
          });
        },
      });
      reportBridgeRunProgress(bridgeRequestId, {
        status: 'running',
        phase: 'applying',
        message: 'Gowoori artifact generated. Applying to target.',
        provider: effectiveProvider,
        prompt,
        elapsedMs: Date.now() - generationStartedAt,
        sourceLength: artifact.source.length,
      });
      const labelPrefix =
        providerDefinition.kind === 'api'
          ? 'GowooriChat BYOK'
          : providerDefinition.kind === 'cli'
            ? 'GowooriChat CLI'
            : 'GowooriChat';
      const successStatus =
        providerDefinition.kind === 'api'
          ? 'BYOK artifact generated. Applying to Gowoori.'
          : providerDefinition.kind === 'cli'
            ? `${providerDefinition.label} artifact generated. Applying to Gowoori.`
            : 'Generated and queued for Gowoori. Applying to Gowoori.';
      const completion = await finishGeneratedArtifact(
        artifact.source,
        artifact.summary,
        prompt,
        `${labelPrefix}: ${safeGowooriTitleFromPrompt(prompt)}`,
        successStatus,
        livePreviewTargetRef.current ?? effectiveTargetMode,
        true,
        generationStartedAt,
        activeProvider,
        activeMode,
        effectiveAutoApply,
      );
      reportBridgeRunProgress(bridgeRequestId, {
        status: completion.ok ? 'completed' : 'failed',
        phase: completion.ok ? 'completed' : 'error',
        message: completion.ok ? 'Gowoori artifact applied.' : completion.error || 'Gowoori artifact failed.',
        provider: effectiveProvider,
        prompt,
        elapsedMs: Date.now() - generationStartedAt,
        sourceLength: completion.sourceLength,
      });
      setGenerationProgress('');
      return completion;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof GowooriAgentToolApprovalRequiredError) {
        const toolApprovals = createGowooriToolApprovalSummaries(error.approvals);
        reportBridgeRunProgress(bridgeRequestId, {
          status: 'running',
          phase: 'waiting',
          message: 'Gowoori agent tool approval required.',
          provider: effectiveProvider,
          prompt,
          elapsedMs: Date.now() - generationStartedAt,
        });
        setMessages((current) => [
          ...current,
          {
            id: createMessageId(),
            role: 'assistant',
            text: '이 요청은 로컬 작업 승인이 필요합니다. 승인하면 같은 요청을 이어서 실행합니다.',
            prompt,
            status: 'approval required',
            toolApprovals,
            targetMode: String(effectiveTargetMode),
            detail: createGowooriToolApprovalDetail(toolApprovals),
          },
        ]);
        setGenerationBusy(false);
        setGenerationProgress('');
        abortControllerRef.current = null;
        livePreviewTargetRef.current = null;
        setStatus('Gowoori agent tool approval required.');
        return {
          ok: false,
          prompt,
          applied: false,
          targetMode: effectiveTargetMode,
          error: 'Gowoori agent tool approval required.',
        };
      }
      reportBridgeRunProgress(bridgeRequestId, {
        status: 'failed',
        phase: 'error',
        message,
        provider: effectiveProvider,
        prompt,
        elapsedMs: Date.now() - generationStartedAt,
      });
      setQualityLog((current) =>
        mergeGowooriQualityLogs(
          current,
          [
            createGowooriQualityLogEntry({
              id: createMessageId(),
              provider: activeProvider,
              mode: activeMode,
              promptTitle: safeGowooriTitleFromPrompt(prompt),
              startedAt: generationStartedAt,
              completedAt: Date.now(),
              source: '',
              normalizedChanged: false,
              preflightOk: false,
              autoRepairAttempted: false,
              autoRepairSucceeded: false,
              applyRequested: false,
              applied: false,
              providerError: true,
              diagnostics: [{ severity: 'error', message }],
              summary: 'Provider failed before Gowoori artifact validation.',
            }),
          ],
          GOWOORI_CHAT_QUALITY_LOG_LIMIT,
        ),
      );
      notifyGowooriQualityLogChanged();
      setMessages((current) => [
        ...current,
        createGowooriProviderFailureAssistantMessage({
          id: createMessageId(),
          prompt,
          providerLabel: providerDefinition.label,
          errorMessage: message,
        }),
      ]);
      setGenerationBusy(false);
      setGenerationProgress('');
      abortControllerRef.current = null;
      livePreviewTargetRef.current = null;
      setStatus(`Provider error: ${message}`);
      return {
        ok: false,
        prompt,
        applied: false,
        targetMode: effectiveTargetMode,
        error: message,
      };
    }
  };

  const runSimplePromptPreset = (preset: GowooriSimplePromptPreset) => {
    setInspectorTab('chat');
    setStatus(`Starting ${preset.label} quick start...`);
    void sendPrompt(preset.prompt, { requestMode: 'generate' });
  };

  const runSimpleRefinementPrompt = (preset: GowooriSimpleRefinementPromptPreset) => {
    const currentSource = latestGowooriSimpleSourceMessage?.source?.trim();
    const refinementPrompt = [
      preset.prompt,
      '',
      currentSource
        ? ['Current artifact source:', '```markdown', currentSource, '```'].join('\n')
        : 'No current artifact source is available. Create the best revised artifact from the conversation context.',
    ].join('\n');
    setInspectorTab('chat');
    setStatus(`Refining result: ${preset.label}...`);
    void sendPrompt(refinementPrompt, { requestMode: preset.requestMode });
  };

  const sendPromptRef = useRef(sendPrompt);
  useEffect(() => {
    sendPromptRef.current = sendPrompt;
  });

  const runUserPromptWithTarget = (
    prompt: string,
    target: GowooriTargetMode,
    preference?: GowooriUserTargetPreference | null,
  ) => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || isGenerating) return;
    if (preference !== undefined) setUserTargetPreference(preference);
    setPendingUserPrompt('');
    setStatus('Gowoori is generating for the selected mirror.');
    void sendPrompt(normalizedPrompt, {
      requestMode: 'generate',
      targetMode: target,
      autoApply: true,
    });
  };

  const getStickyUserTarget = (): GowooriTargetMode | null => {
    return resolveStickyGowooriUserTarget(userTargetPreference, targets);
  };

  const handleComposerSend = () => {
    const prompt = input.trim();
    if (!prompt || isGenerating) return;

    if (!isGowooriChatUserMode) {
      void sendPrompt();
      return;
    }

    const stickyTarget = getStickyUserTarget();
    if (stickyTarget) {
      runUserPromptWithTarget(prompt, stickyTarget);
      return;
    }

    setInput('');
    setPendingUserPrompt(prompt);
    setStatus('Choose where Gowoori should show the next artifact.');
  };

  useEffect(() => {
    return getDeskBridgeApi()?.onGowooriChatRun?.((payload) => {
      void (async () => {
        const prompt = String(payload.prompt || '').trim();
        let result: GowooriChatRunCompletion | null = null;
        try {
          result = await sendPromptRef.current(prompt, normalizeGowooriChatRunOverrides(payload));
        } catch (error) {
          result = {
            ok: false,
            prompt,
            applied: false,
            diagnostics: [
              {
                severity: 'error',
                message: error instanceof Error ? error.message : String(error),
              },
            ],
            error: error instanceof Error ? error.message : String(error),
          };
        }
        const report: McpBridgeGowooriChatRunResult = {
          requestId: payload.requestId,
          ok: result?.ok === true,
          prompt,
          sourceLength: result?.sourceLength,
          source: result?.source,
          summary: result?.summary,
          label: result?.label,
          applied: result?.applied,
          targetMode: result?.targetMode,
          diagnostics: result?.diagnostics,
          autoRepairAttempted: result?.autoRepairAttempted,
          autoRepairSucceeded: result?.autoRepairSucceeded,
          error: result?.error,
        };
        await getDeskBridgeApi()
          ?.reportGowooriChatRunResult(report)
          .catch(() => undefined);
      })();
    });
  }, []);

  useEffect(() => {
    return getDeskBridgeApi()?.onGowooriChatRunCancel?.((payload) => {
      const requestId = String(payload.requestId || '').trim();
      if (!requestId) return;
      stopGeneration();
      void getDeskBridgeApi()
        ?.reportGowooriChatRunProgress?.({
          requestId,
          status: 'cancelled',
          phase: 'cancelled',
          message: 'GowooriChat generation cancelled.',
          at: new Date().toISOString(),
        })
        .catch(() => undefined);
    });
  }, []);

  const retryMessagePrompt = (message: GowooriChatMessage) => {
    const prompt = (message.prompt || message.text || '').trim();
    if (!prompt || isGenerating) return;
    void sendPrompt(prompt, message.status === 'review note' ? { requestMode: 'repair' } : {});
  };

  const approveToolMessage = (message: GowooriChatMessage) => {
    const prompt = (message.prompt || message.text || '').trim();
    const approvedAgentToolCallIds = message.toolApprovals?.map((approval) => approval.id).filter(Boolean) ?? [];
    if (!prompt || approvedAgentToolCallIds.length === 0 || isGenerating) return;
    setStatus('Approved Gowoori agent tools. Continuing the request...');
    void sendPrompt(prompt, {
      requestMode: 'generate',
      targetMode: (message.targetMode || targetMode) as GowooriTargetMode,
      autoApply: true,
      approvedAgentToolCallIds,
    });
  };

  const repairMessageArtifact = async (message: GowooriChatMessage) => {
    if (!message.source || isGenerating) return;
    const prompt = (message.prompt || message.text || 'Repair Gowoori artifact').trim();
    const startedAt = Date.now();
    setGenerationBusy(true);
    try {
      const repairedAttempt = await runAutomaticRepairAttempt(prompt, message.source, [
        { severity: 'error', message: 'Manual repair requested for a blocked Gowoori artifact.' },
      ]);
      if (!repairedAttempt) {
        setStatus('Gowoori repair did not return a renderable response.');
        setGenerationBusy(false);
        return;
      }
      await finishGeneratedArtifact(
        repairedAttempt.source,
        repairedAttempt.summary,
        prompt,
        `GowooriChat repaired: ${safeGowooriTitleFromPrompt(prompt)}`,
        'Repaired artifact generated. Applying to Gowoori.',
        undefined,
        false,
        startedAt,
        provider,
        'repair',
        true,
      );
    } catch (error) {
      setGenerationBusy(false);
      abortControllerRef.current = null;
      setStatus(`Repair failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleComposerSend();
    }
  };

  const focusGowooriChatInput = () => {
    inputRef.current?.focus();
  };

  const previewLatestGowooriSimpleArtifact = () => {
    const sourceMessage = latestGowooriSimpleSourceMessage;
    const sourceState = sourceMessage?.sourceState;
    if (!sourceMessage?.source || !sourceState || !sourceState.canPreview) return;
    void applySourceToGowoori(sourceMessage.source, `GowooriChat preview: ${sourceMessage.text}`, 'new');
  };

  const previewGowooriSimpleHistoryArtifact = (message: GowooriChatMessage) => {
    const sourceState = message.sourceState;
    if (!message.source || !sourceState || !sourceState.canPreview) return;
    void applySourceToGowoori(message.source, `GowooriChat history preview: ${message.text}`, 'new');
  };

  const applyGowooriSimpleHistoryArtifact = (message: GowooriChatMessage) => {
    const sourceState = message.sourceState;
    if (!message.source || !sourceState || !sourceState.canApply) return;
    void applySourceToGowoori(message.source, `GowooriChat history: ${message.text}`);
  };

  const showGowooriUserHistoryArtifact = (message: GowooriChatMessage) => {
    const sourceState = message.sourceState;
    if (!message.source || !sourceState || !sourceState.canPreview) return;
    const target = getStickyUserTarget() ?? 'new';
    void applySourceToGowoori(
      message.source,
      `GowooriChat history: ${getGowooriArtifactTitleFromSource(message.source, message.text)}`,
      target,
    );
  };

  const retryGowooriSimpleHistoryPrompt = (message: GowooriChatMessage) => {
    const sourceState = message.sourceState;
    if (!sourceState || !sourceState.canRetry || isGenerating) return;
    retryMessagePrompt(message);
  };

  const applyLatestGowooriSimpleArtifact = () => {
    const sourceMessage = latestGowooriSimpleSourceMessage;
    const sourceState = sourceMessage?.sourceState;
    if (!sourceMessage?.source || !sourceState || !sourceState.canApply) return;
    void applySourceToGowoori(sourceMessage.source, `GowooriChat: ${sourceMessage.text}`);
  };

  const repairLatestGowooriSimpleArtifact = () => {
    const sourceMessage = latestGowooriSimpleSourceMessage;
    const sourceState = sourceMessage?.sourceState;
    if (!sourceMessage || !sourceState || !sourceState.canRepair || isGenerating) return;
    void repairMessageArtifact(sourceMessage);
  };

  const retryLatestGowooriSimplePrompt = () => {
    const sourceMessage = latestGowooriSimpleSourceMessage;
    const sourceState = sourceMessage?.sourceState;
    if (!sourceMessage || !sourceState || !sourceState.canRetry || isGenerating) return;
    retryMessagePrompt(sourceMessage);
  };

  return (
    <section
      className={`wfr-gowoori-chat${isGowooriChatUserMode ? ' wfr-gowoori-chat--user' : ''}`}
      aria-label="GowooriChat"
    >
      <header className="wfr-gowoori-chat__header">
        <div className="wfr-gowoori-chat__brand">
          <img src={GOWOORI_MASCOT_SRC} alt="Gowoori mascot" />
          <div>
            <strong>GowooriChat</strong>
            <span>{isGowooriChatUserMode ? 'Gowoori is ready' : 'LLM request bridge for Gowoori / 거울이'}</span>
          </div>
        </div>
        <div className="wfr-gowoori-chat__header-actions">
          {!isGowooriChatUserMode && (
            <div className="wfr-gowoori-chat__profile" title={activeAiProviderProfileId || undefined}>
              <span>AI profile</span>
              <strong>{activeAiProviderProfileName}</strong>
              <small>{getAiProviderSummary(aiProviderSettings)}</small>
            </div>
          )}
          {isGowooriChatUserMode && (
            <div className="wfr-gowoori-chat__user-model" title={getAiProviderSummary(aiProviderSettings)}>
              <span>
                {provider === 'byok' ? activeAiProviderProfileName : getGowooriProviderDefinition(provider).label}
              </span>
            </div>
          )}
          {isGowooriChatUserMode ? (
            <button type="button" className="wfr-gowoori-chat__ghost" onClick={() => setGowooriChatUiMode('simple')}>
              Developer Mode
            </button>
          ) : (
            <>
              <button type="button" className="wfr-gowoori-chat__ghost" onClick={() => setGowooriChatUiMode('user')}>
                User Mode
              </button>
              <button
                type="button"
                className="wfr-gowoori-chat__ghost"
                onClick={() => window.dispatchEvent(new CustomEvent(GOWOORI_INSTANCE_REQUEST_EVENT))}
              >
                Refresh Gowoori
              </button>
            </>
          )}
        </div>
      </header>

      <div className="wfr-gowoori-chat__mode-panel">
        <div>
          <strong>{isGowooriChatUserMode ? 'Gowoori User Mode' : 'Gowoori Developer Mode'}</strong>
          <span>
            {isGowooriChatUserMode
              ? 'Ask for a document, dashboard, workflow monitor, or UI. Gowoori renders it in the selected mirror.'
              : isGowooriChatAdvancedMode
                ? 'Advanced Mode exposes provider settings, raw stream logs, quality benchmarks, and package drilldowns.'
                : 'Developer Simple Mode keeps generation, preview, apply, and repair in front.'}
          </span>
        </div>
        <div className="wfr-gowoori-chat__mode-toggle" role="group" aria-label="GowooriChat mode">
          <button
            type="button"
            className={isGowooriChatUserMode ? 'is-active' : ''}
            onClick={() => setGowooriChatUiMode('user')}
          >
            User Mode
          </button>
          <button
            type="button"
            className={isGowooriChatSimpleMode ? 'is-active' : ''}
            onClick={() => setGowooriChatUiMode('simple')}
          >
            Dev Simple
          </button>
          <button
            type="button"
            className={isGowooriChatAdvancedMode ? 'is-active' : ''}
            onClick={() => setGowooriChatUiMode('advanced')}
          >
            Dev Advanced
          </button>
        </div>
      </div>

      {isGowooriChatSimpleMode && (
        <GowooriChatSimpleModePanel
          provider={provider}
          targetMode={targetMode}
          targetOptions={targetOptions}
          autoApply={autoApply}
          isGenerating={isGenerating}
          isPreflighting={isPreflighting}
          setupSteps={gowooriSimpleSetupSteps}
          progressSteps={gowooriSimpleProgressSteps}
          resultSummary={gowooriSimpleResultSummary}
          artifactSummary={gowooriSimpleArtifactSummary}
          latestSourceMessage={latestGowooriSimpleSourceMessage}
          recentSourceMessages={recentGowooriSimpleSourceMessages}
          onSelectProvider={selectProvider}
          onTargetModeChange={setTargetMode}
          onAutoApplyChange={setAutoApply}
          onRunProviderPreflight={runProviderPreflight}
          onRunPromptPreset={runSimplePromptPreset}
          onRunRefinementPrompt={runSimpleRefinementPrompt}
          onPreviewLatestArtifact={previewLatestGowooriSimpleArtifact}
          onApplyLatestArtifact={applyLatestGowooriSimpleArtifact}
          onRepairLatestArtifact={repairLatestGowooriSimpleArtifact}
          onRetryLatestPrompt={retryLatestGowooriSimplePrompt}
          onFocusInput={focusGowooriChatInput}
          onPreviewHistoryArtifact={previewGowooriSimpleHistoryArtifact}
          onApplyHistoryArtifact={applyGowooriSimpleHistoryArtifact}
          onRetryHistoryPrompt={retryGowooriSimpleHistoryPrompt}
        />
      )}

      {isGowooriChatUserMode && (
        <section className="wfr-gowoori-chat__user-target-status" aria-label="Gowoori user render target">
          <div>
            <span>Render target</span>
            <strong>{userTargetPreferenceLabel}</strong>
          </div>
          {userTargetPreference && (
            <button type="button" disabled={isGenerating} onClick={() => setUserTargetPreference(null)}>
              Change
            </button>
          )}
        </section>
      )}

      {!isGowooriChatUserMode && (
        <GowooriChatDeveloperInspectorPanel
          isAdvancedMode={isGowooriChatAdvancedMode}
          inspectorTab={inspectorTab}
          rawStream={rawStream}
          qualityLogLength={qualityLog.length}
          qualitySummary={qualitySummary}
          isSimpleFirstRun={isGowooriSimpleFirstRun}
          firstRunSteps={GOWOORI_SIMPLE_FIRST_RUN_STEPS}
          onInspectorTabChange={setInspectorTab}
          providerSettingsPanelProps={{
            activeAiProviderProfileId,
            activeAiProviderProfileName,
            aiProviderProfiles,
            aiProviderSettings,
            provider,
            requestMode,
            targetMode,
            targetOptions,
            applyMode,
            autoApply,
            providerSettings,
            providerDiagnostic,
            providerReadinessItem: activeProviderReadiness,
            isGenerating,
            isPreflighting,
            onSelectAiProviderProfile: selectAiProviderProfile,
            onSelectProvider: selectProvider,
            onRequestModeChange: setRequestMode,
            onTargetModeChange: setTargetMode,
            onApplyModeChange: setApplyMode,
            onAutoApplyChange: setAutoApply,
            onUpdateProviderSettings: updateProviderSettings,
            onRunProviderPreflight: runProviderPreflight,
            onOpenProviderReadiness: drillIntoProviderReadiness,
          }}
          qualityActionsProps={{
            qualityLogLength: qualityLog.length,
            benchmarkProviderCount: qualityBenchmark.providers.length,
            benchmarkProviderOptions,
            hasBenchmarkBaseline: Boolean(benchmarkBaseline),
            isGenerating,
            isBenchmarking,
            qualityImportInputRef,
            matrixReportImportInputRef,
            qualityReportPackageInputRef,
            benchmarkBaselineInputRef,
            onExportQualityLog: exportQualityLog,
            onImportQualityLog: importQualityLog,
            onImportMatrixReport: importMatrixReport,
            onImportQualityReportPackage: importQualityReportPackage,
            onClearQualityLog: clearQualityLog,
            onRunProviderAcceptanceBenchmark: runProviderAcceptanceBenchmark,
            onToggleBenchmarkProvider: toggleBenchmarkProvider,
            onSelectAllBenchmarkProviders: selectAllBenchmarkProviders,
            onSelectActiveBenchmarkProvider: selectActiveBenchmarkProvider,
            onExportBenchmarkJson: exportBenchmarkJson,
            onExportBenchmarkCsv: exportBenchmarkCsv,
            onImportBenchmarkBaseline: importBenchmarkBaseline,
            onClearBenchmarkBaseline: clearBenchmarkBaseline,
          }}
          restoredPackagePanelProps={{
            restoredPackageSummary,
            restoredPackageDiff,
            restoredPackageDrilldown,
            restoredPackageRepairResult,
            restoredPackageDiffHistory,
            showRestoredPackageDiff,
            onToggleRestoredPackageDiff: () => setShowRestoredPackageDiff((value) => !value),
            onCopyRestoredPackageDiffReport: copyRestoredPackageDiffReport,
            onSaveRestoredPackageDiffReport: saveRestoredPackageDiffReport,
            onSelectProviderDiff: (provider) => {
              setSelectedQualityProvider(provider);
              setSelectedQualityMode('all');
              setSelectedQualityCase('all');
            },
            onSelectCaseDiff: (caseTitle) => {
              setSelectedQualityProvider('all');
              setSelectedQualityMode('all');
              setSelectedQualityCase(caseTitle);
            },
            onSelectScorecardDiff: openRestoredScorecardDrilldown,
            onSelectMatrixDiff: openRestoredMatrixDrilldown,
            onCopyRestoredArtifactSource: copyRestoredDrilldownArtifactSource,
            onCopyRestoredArtifactLine: copyRestoredDrilldownArtifactLine,
            onApplyRestoredArtifactSource: applyRestoredDrilldownArtifactSource,
            onCopyRestoredArtifactReviewNote: copyRestoredDrilldownReviewNote,
            onSaveRestoredArtifactReviewNote: saveRestoredDrilldownReviewNote,
            onInsertRestoredArtifactReviewNote: insertRestoredDrilldownReviewNote,
            onRepairRestoredArtifactNow: repairRestoredDrilldownNow,
            onReopenRestoredPackageDiffHistoryItem: reopenRestoredPackageDiffHistoryItem,
            onOpenRestoredPackageRepairComparison: openRestoredPackageRepairComparison,
            onCopyRestoredPackageDiffHistoryReport: copyRestoredPackageDiffHistoryReport,
            onSaveRestoredPackageDiffHistoryReport: saveRestoredPackageDiffHistoryReport,
          }}
          qualityInsightsPanelProps={{
            bridgeMatrixSummary,
            qualityHealth,
            providerReadiness,
            qualitySummaryProviders: qualitySummary.providers,
            qualityBenchmark,
            qualityScorecard,
            benchmarkBestProvider,
            activeProvider: provider,
            qualityCaseMatrix,
            benchmarkComparison,
            benchmarkBaselineName,
            qualityTimeline,
            selectedQualityProvider,
            onDrillIntoBridgeProvider: drillIntoBridgeProvider,
            onDrillIntoQualityEntry: drillIntoQualityEntry,
            onDrillIntoProviderReadiness: drillIntoProviderReadiness,
            onUseBestBenchmarkProvider: useBestBenchmarkProvider,
          }}
          qualityLogBrowserProps={{
            qualityLog,
            filteredQualityLog,
            qualityFilterOptions,
            selectedQualityProvider,
            selectedQualityMode,
            selectedQualityCase,
            selectedQualityEntry,
            selectedQualityCaseDiff,
            qualityFilterSummary,
            qualityFiltersActive,
            isRepairingQualityEntry,
            onSelectedQualityProviderChange: setSelectedQualityProvider,
            onSelectedQualityModeChange: setSelectedQualityMode,
            onSelectedQualityCaseChange: setSelectedQualityCase,
            onResetQualityFilters: resetQualityFilters,
            onSelectQualityEntry: selectQualityEntry,
            onApplySelectedQualityEntry: applySelectedQualityEntry,
            onCopySelectedQualitySource: copySelectedQualitySource,
            onRepairSelectedQualityEntry: repairSelectedQualityEntry,
            onCopyFilteredQualityReport: copyFilteredQualityReport,
            onSaveFilteredQualityReport: saveFilteredQualityReport,
            onSaveQualityReportPackage: saveQualityReportPackage,
          }}
          repairDiagnosticsPanelProps={{
            repairComparisons,
            repairDiagnostics,
            onApplySourceToGowoori: applySourceToGowoori,
          }}
          transcriptPanelProps={{
            messages,
            isGenerating,
            autoApply,
            showSimpleRepairGuidance: isGowooriChatSimpleMode,
            providerLabel: getGowooriProviderDefinition(provider).label,
            onApplySourceToGowoori: applySourceToGowoori,
            onRepairMessageArtifact: repairMessageArtifact,
            onRetryMessagePrompt: retryMessagePrompt,
            onApproveToolMessage: approveToolMessage,
          }}
        />
      )}

      {isGowooriChatUserMode && (
        <div className="wfr-gowoori-chat__user-messages" aria-live="polite">
          <GowooriChatUserMessagesPanel
            provider={provider}
            messages={messages}
            pendingUserPrompt={pendingUserPrompt}
            targets={targets}
            isGenerating={isGenerating}
            generationProgress={generationProgress || status}
            onSelectProvider={setProvider}
            onRunPromptWithTarget={runUserPromptWithTarget}
            onShowHistoryArtifact={showGowooriUserHistoryArtifact}
            onApproveToolMessage={approveToolMessage}
          />
        </div>
      )}

      <footer
        className={`wfr-gowoori-chat__composer${isGowooriChatUserMode ? ' wfr-gowoori-chat__composer--user' : ''}`}
      >
        {!isGowooriChatUserMode && (
          <div className="wfr-gowoori-chat__status">
            <span>{status}</span>
            <span>AI profile: {activeAiProviderProfileName}</span>
            <span>{targets.length} Gowoori pane(s)</span>
          </div>
        )}
        <div className="wfr-gowoori-chat__input-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isGowooriChatUserMode
                ? 'Ask Gowoori to create a UI, report, dashboard, workflow monitor, or document...'
                : 'Describe a weather card, KPI dashboard, workflow monitor, report, or document UI...'
            }
            spellCheck={false}
          />
          {isGenerating ? (
            <button type="button" onClick={stopGeneration}>
              Cancel
            </button>
          ) : (
            <button type="button" onClick={handleComposerSend} disabled={!input.trim()}>
              Send
            </button>
          )}
        </div>
        {!isGowooriChatUserMode && (
          <span className="wfr-gowoori-chat__hint">Enter sends. Shift+Enter inserts a new line.</span>
        )}
      </footer>
    </section>
  );
}
