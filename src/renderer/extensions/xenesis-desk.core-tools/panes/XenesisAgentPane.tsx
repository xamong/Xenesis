import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppSettings,
  GowooriChatSettings,
  XenesisApi,
  XenesisOperationalDiagnostics,
  XenesisProfileState,
  XenesisReportKind,
  XenesisReportQuery,
  XenesisReportStatus,
  XenesisReportSummary,
  XenesisRunEvent,
  XenesisStatus,
  XenesisTaskQuery,
  XenesisTaskStatus,
  XenesisTaskSummary,
} from '../../../../shared/types';
import {
  createXconArtifactDiagnosticTranscript,
  createXconArtifactTranscriptSummary,
  prepareXconArtifactResult,
  runXconArtifactAutomaticRepair,
  runXconArtifactProvider,
  type XconArtifactProviderExecutionOptions,
} from '../../../artifacts/xconArtifactEngine';
import { callGowooriDeskCapability, createDeskBridgeFacade, getDeskBridgeApi } from '../../../deskBridge';
import { StreamingXconMarkdown } from '../../../markdown/StreamingXconMarkdown';
import { createDefaultGowooriAgentTools } from '../../xenesis-desk.workflow-runner/gowoori/agent/gowooriAgentTools';
import { resolveGowooriDevByokRuntimeFromSettings } from '../../xenesis-desk.workflow-runner/gowoori/agent/gowooriChatE2e';
import type { GowooriPromptFileWriteRequest } from '../../xenesis-desk.workflow-runner/gowoori/agent/gowooriCliRunner';
import {
  GOWOORI_PROVIDER_DEFINITIONS,
  type GowooriProvider,
  getGowooriProviderDefinition,
} from '../../xenesis-desk.workflow-runner/gowoori/agent/gowooriProviders';
import {
  isGowooriProviderId,
  loadLegacyProviderSettings,
  normalizeProviderSettings,
} from '../../xenesis-desk.workflow-runner/gowoori/chat/gowooriChatState';
import {
  dispatchGowooriApply,
  dispatchGowooriOpenRequest,
  dispatchGowooriOverlayShow,
  GOWOORI_INSTANCE_EVENT,
  GOWOORI_INSTANCE_REQUEST_EVENT,
  type GowooriApplyDetail,
  type GowooriInstanceDetail,
  writePendingGowooriApply,
} from '../../xenesis-desk.workflow-runner/gowoori/shared/gowooriEvents';
import { createXdBlasterEventsForDeskActionActivity, dispatchXdBlasterEvents } from './xenesisActivityBlaster';
import { hasRenderableXconArtifact, shouldAutoOpenXenesisArtifactInGowoori } from './xenesisAgentArtifactActions';
import { buildXenesisArtifactPromptWithContext } from './xenesisAgentArtifactContext';
import {
  persistXenesisArtifactSession,
  readStoredXenesisArtifactSessions,
  recordXenesisRunDiagnostics,
} from './xenesisAgentArtifacts';
import {
  appendXenesisAttachmentPromptContext,
  classifyXenesisAttachment,
  dedupeXenesisAttachments,
  formatXenesisAttachmentSize,
  toXenesisProviderAttachments,
  type XenesisAgentAttachment,
} from './xenesisAgentAttachments';
import {
  createXenesisPaneAgentId,
  registerXenesisAgentBridgeAgent,
  type XenesisAgentBridgeEvent,
} from './xenesisAgentBridgeRegistry';
import {
  approveXenesisDeskActions,
  buildXenesisDeskActionCompletedMessage,
  buildXenesisDeskActionPendingMessage,
  parseXenesisDeskActionBlocks,
  pendingXenesisDeskActionsFromResults,
  planXenesisDeskNaturalLanguageActions,
  runXenesisDeskActions,
  shouldRunXenesisDeskActionsDirectly,
  summarizeXenesisDeskActionExecution,
  type XenesisDeskActionCallResult,
  type XenesisDeskActionExecutionResult,
  type XenesisDeskActionRequest,
} from './xenesisAgentDeskControl';
import {
  isXenesisApprovalIntent,
} from './xenesisAgentInputRouting';
import {
  buildXenesisMarkdownSaveDraft,
  resolveXenesisMarkdownSavePath,
  type XenesisMarkdownSaveDraft,
} from './xenesisAgentMarkdownSave';
import { buildDeskRunContext } from './xenesisAgentRunContext';
import {
  deskActionAuditEntries,
  extractAssistantDeltaFromRunEvent,
  extractAssistantTextFromRunEvent,
  summarizeXenesisRunEvent,
  taskLifecycleAuditEntries,
  terminalMessageFromRunEventSummary,
} from './xenesisAgentRunEvents';
import { buildXenesisAgentRunContextDetail, buildXenesisAgentRunRequest } from './xenesisAgentRunRequest';
import {
  appendAssistantStreamDeltaWithRawMerge,
  appendChatMessage,
  appendPolicyNotice,
  appendPolicyNotices,
  appendRawStreamEntry,
  clearChat,
  clearRawStream,
  focusRawStreamEntry,
  mergeRawStreamEntry,
  replaceChatMessage,
  setPolicySnapshot,
  isXenesisAgentBusy,
  setRawStreamOpen,
  useXenesisAgentState,
  xenesisAgentStateStore,
} from './xenesisAgentState';
import {
  buildXenesisStatusBarItems,
  normalizeXenesisStatusBarKeys,
  visibleXenesisStatusBarItems,
  XENESIS_STATUS_BAR_CHOICES,
  XENESIS_STATUS_BAR_DEFAULT_KEYS,
} from './xenesisAgentStatusBar';
import { XenesisAssistantStreamBuffer } from './xenesisAgentStreamBuffer';
import {
  extractXenesisChoiceOptions,
  getXenesisVisibleTranscriptMessages,
  summarizeXenesisTranscriptActivity,
  type XenesisChoiceOption,
} from './xenesisAgentTranscript';
import {
  createXenesisAssistantStreamFilterState,
  filterXenesisAssistantStreamDelta,
  isRecord,
  resolveXenesisAssistantText,
  runtimeConnectionText,
  runtimeModeText,
  sanitizeXenesisAssistantTextCandidate,
  statusText,
  stringifyDetail,
  XENESIS_CONTEXT_MESSAGE_LIMIT,
  XENESIS_CONTEXT_MESSAGE_MAX_CHARS,
  type XenesisAgentPromptRoutingOptions,
  type XenesisAssistantStreamFilterState,
  type XenesisChatMessage,
  type XenesisMode,
  type XenesisRawStreamEntry,
  type XenesisSlashCommand,
  type XenesisSlashCommandDescriptor,
  type XenesisSlashMenuPlacement,
  type XenesisStatusBarItemKey,
  type XenesisTerminalLineKind,
} from './xenesisAgentTypes';
import {
  decideDrain,
  dequeueQueuedPrompt,
  enqueueQueuedPrompt,
  makeQueuedPrompt,
  removeQueuedPrompt,
} from './xenesisPromptQueue';
import {
  buildXenesisControlDemoWorkArgsFromInput,
  buildXenesisVisibleSubagentsDemoWorkers,
  buildXenesisVisibleSubagentTerminalArgs,
  buildXenesisVisibleSubagentWorkWorkers,
  parseXenesisVisibleSubagentRunOptions,
  resolveXenesisVisibleSubagentWorkCwd,
  selectXenesisVisibleSubagentSessionIds,
  summarizeXenesisVisibleSubagentTail,
} from './xenesisAgentVisibleSubagentsDemo';
import {
  extractXenesisPolicyNotices,
  extractXenesisPolicySnapshot,
  xenesisPolicyNoticeFromRecord,
  xenesisPolicySnapshotFromRecord,
} from './xenesisPolicyNotices';

const XENESIS_API_UNAVAILABLE = 'Xenesis API is unavailable. Restart Xenesis Desk or check preload initialization.';
const XENESIS_OPERATING_ROLE = 'LLM orchestration steward';

/** Click-to-fill example prompts shown on the idle/onboarding empty state. */
const XENESIS_EXAMPLE_PROMPTS: readonly string[] = [
  '이 워크스페이스 구조를 간단히 설명해 줘',
  '최근 변경된 파일들을 요약해 줘',
  '지금 무엇을 도와줄 수 있어?',
];
const StableStreamingXconMarkdown = React.memo(StreamingXconMarkdown);
const SYNTHETIC_REVEAL_MIN_MS = 360;
const SYNTHETIC_REVEAL_MAX_MS = 1800;
const SYNTHETIC_REVEAL_MIN_CHUNKS = 8;
const SYNTHETIC_REVEAL_MAX_CHUNKS = 96;
const XENESIS_ATTACHMENT_IMAGE_PREVIEW_MAX_BYTES = 5 * 1024 * 1024;
const XENESIS_ATTACHMENT_TEXT_PREVIEW_MAX_BYTES = 1024 * 1024;
const XENESIS_ATTACHMENT_TEXT_PREVIEW_CHARS = 4000;
const XENESIS_TEXT_ATTACHMENT_EXTENSION_PATTERN =
  /\.(?:bat|cmd|css|csv|html?|ini|js|json|jsonc|jsx|log|md|markdown|mjs|ps1|py|sh|sketch|ts|tsx|tsv|txt|xcon|xconj|xcons|xcont|xconx|xml|ya?ml)$/i;
const xenesisDeskCapabilityClient = createDeskBridgeFacade('xenesis');
const xenesisInternalDeskCapabilityClient = createDeskBridgeFacade('internal');

type XenesisAgentAutomationArtifactSnapshot = {
  label: string;
  source: string;
  sourceLength: number;
  updatedAt: number;
};

interface AssistantStreamStats {
  chunkCount: number;
  charCount: number;
}

const assistantStreamStats = new Map<string, AssistantStreamStats>();
const assistantStreamFilterStates = new Map<string, XenesisAssistantStreamFilterState>();
const assistantSyntheticRevealTokens = new Map<string, string>();
const xenesisAssistantStreamBuffer = new XenesisAssistantStreamBuffer((flush) => {
  const stats = assistantStreamStats.get(flush.messageId) ?? { chunkCount: 0, charCount: 0 };
  stats.chunkCount += flush.chunkCount;
  stats.charCount += flush.charCount;
  assistantStreamStats.set(flush.messageId, stats);
  appendAssistantStreamDeltaWithRawMerge(flush.messageId, flush.delta, {
    mergeKey: `assistant:${flush.messageId}`,
    kind: 'assistant_delta',
    summary: 'Assistant streaming',
    detailDelta: flush.delta,
    chunkCount: stats.chunkCount,
    bytesReceived: stats.charCount,
    detailLimit: 24000,
  });
});

let xenesisRunEventApi: XenesisApi | null = null;
let xenesisRunEventUnsubscribe: (() => void) | null = null;
let xenesisRunEventSubscriberCount = 0;
let activeXenesisAssistantMessageId = '';

function setActiveXenesisAssistantMessage(messageId: string): void {
  activeXenesisAssistantMessageId = messageId;
}

function flushXenesisAssistantStream(): void {
  xenesisAssistantStreamBuffer.flushNow();
}

function pushFilteredXenesisAssistantStreamDelta(messageId: string, delta: string): void {
  const state = assistantStreamFilterStates.get(messageId) ?? createXenesisAssistantStreamFilterState();
  assistantStreamFilterStates.set(messageId, state);
  const filtered = filterXenesisAssistantStreamDelta(state, delta);
  if (!filtered.delta) return;
  assistantSyntheticRevealTokens.delete(messageId);
  xenesisAssistantStreamBuffer.push(messageId, filtered.delta);
}

function clearActiveXenesisAssistantMessage(messageId?: string): void {
  flushXenesisAssistantStream();
  const targetId = messageId || activeXenesisAssistantMessageId;
  if (!messageId || activeXenesisAssistantMessageId === messageId) {
    activeXenesisAssistantMessageId = '';
  }
  if (targetId) {
    assistantStreamStats.delete(targetId);
    assistantStreamFilterStates.delete(targetId);
    assistantSyntheticRevealTokens.delete(targetId);
  }
}

function waitForSyntheticReveal(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function revealAssistantMessageProgressively(
  messageId: string,
  content: string,
  role: 'assistant' | 'system',
  error: boolean,
  preserveExisting = false,
): Promise<void> {
  const cleaned = sanitizeXenesisAssistantTextCandidate(content);
  if (!cleaned) {
    assistantSyntheticRevealTokens.delete(messageId);
    replaceChatMessage(messageId, { role, content: '', error, streaming: false });
    return;
  }

  const revealToken = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  assistantSyntheticRevealTokens.set(messageId, revealToken);
  const existingContent = preserveExisting
    ? xenesisAgentStateStore.getSnapshot().messages.find((message) => message.id === messageId)?.content || ''
    : '';
  const revealFromIndex = existingContent && cleaned.startsWith(existingContent) ? existingContent.length : 0;
  replaceChatMessage(messageId, {
    role,
    content: revealFromIndex > 0 ? existingContent : '',
    error,
    streaming: true,
  });
  if (revealFromIndex >= cleaned.length) {
    if (assistantSyntheticRevealTokens.get(messageId) === revealToken) {
      replaceChatMessage(messageId, { role, content: cleaned, error, streaming: false });
      assistantSyntheticRevealTokens.delete(messageId);
    }
    return;
  }
  const chunkCount = Math.max(
    SYNTHETIC_REVEAL_MIN_CHUNKS,
    Math.min(SYNTHETIC_REVEAL_MAX_CHUNKS, Math.ceil(cleaned.length / (cleaned.length > 8000 ? 220 : 72))),
  );
  const chunkSize = Math.max(1, Math.ceil(cleaned.length / chunkCount));
  const totalMs = Math.min(SYNTHETIC_REVEAL_MAX_MS, Math.max(SYNTHETIC_REVEAL_MIN_MS, cleaned.length * 2));
  const delayMs = Math.max(8, Math.floor(totalMs / chunkCount));

  for (let index = revealFromIndex; index < cleaned.length; index += chunkSize) {
    if (assistantSyntheticRevealTokens.get(messageId) !== revealToken) return;
    xenesisAssistantStreamBuffer.push(messageId, cleaned.slice(index, index + chunkSize));
    flushXenesisAssistantStream();
    await waitForSyntheticReveal(delayMs);
  }

  if (assistantSyntheticRevealTokens.get(messageId) === revealToken) {
    replaceChatMessage(messageId, { role, content: cleaned, error, streaming: false });
    assistantSyntheticRevealTokens.delete(messageId);
  }
}

function getOrCreateActiveXenesisAssistantMessage(): string {
  if (activeXenesisAssistantMessageId) return activeXenesisAssistantMessageId;
  activeXenesisAssistantMessageId = appendChatMessage({ role: 'assistant', content: '', streaming: true });
  return activeXenesisAssistantMessageId;
}

function handleXenesisRunEvent(event: XenesisRunEvent): void {
  const delta = extractAssistantDeltaFromRunEvent(event);
  if (delta) {
    pushFilteredXenesisAssistantStreamDelta(getOrCreateActiveXenesisAssistantMessage(), delta);
    return;
  }

  const summarizedEvent = summarizeXenesisRunEvent(event);
  appendRawStreamEntry(summarizedEvent);
  const terminalEventMessage = terminalMessageFromRunEventSummary(summarizedEvent);
  if (terminalEventMessage && terminalEventMessage.kind !== 'tool') appendChatMessage(terminalEventMessage);

  const assistantText = extractAssistantTextFromRunEvent(event);
  if (assistantText) {
    const activeMessageId = getOrCreateActiveXenesisAssistantMessage();
    flushXenesisAssistantStream();
    assistantStreamFilterStates.delete(activeMessageId);
    const cleanedAssistantText = sanitizeXenesisAssistantTextCandidate(assistantText);
    const currentContent =
      xenesisAgentStateStore.getSnapshot().messages.find((message) => message.id === activeMessageId)?.content || '';
    if (!cleanedAssistantText) return;
    if (currentContent.trim() && cleanedAssistantText.startsWith(currentContent)) {
      const deltaText = cleanedAssistantText.slice(currentContent.length);
      if (deltaText) pushFilteredXenesisAssistantStreamDelta(activeMessageId, deltaText);
    } else {
      void revealAssistantMessageProgressively(activeMessageId, cleanedAssistantText, 'assistant', false);
    }
  }

  const notice = isRecord(event.data) ? xenesisPolicyNoticeFromRecord(event.data) : null;
  if (notice) appendPolicyNotice(notice);
  const snapshot = isRecord(event.data) ? xenesisPolicySnapshotFromRecord(event.data) : null;
  if (snapshot) setPolicySnapshot(snapshot);
}

function subscribeXenesisRunEvents(xenesisApi: XenesisApi): () => void {
  xenesisRunEventSubscriberCount += 1;
  if (xenesisRunEventApi !== xenesisApi) {
    xenesisRunEventUnsubscribe?.();
    xenesisRunEventApi = xenesisApi;
    xenesisRunEventUnsubscribe = null;
    xenesisRunEventSubscriberCount = 1;
  }
  if (!xenesisRunEventUnsubscribe) {
    xenesisRunEventUnsubscribe = xenesisApi.onRunEvent(handleXenesisRunEvent);
  }
  return () => {
    xenesisRunEventSubscriberCount = Math.max(0, xenesisRunEventSubscriberCount - 1);
    if (xenesisRunEventSubscriberCount > 0) return;
    xenesisRunEventUnsubscribe?.();
    xenesisRunEventUnsubscribe = null;
    xenesisRunEventApi = null;
    clearActiveXenesisAssistantMessage();
  };
}

function XenesisTerminalMessageBody({ content }: { content: string }): React.ReactElement | null {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [showPlainFallback, setShowPlainFallback] = useState(false);
  const trimmedContent = content.trim();

  useEffect(() => {
    setShowPlainFallback(false);
    if (!trimmedContent) return undefined;

    let disposed = false;
    let timeoutId = 0;

    const hasRenderedContent = (): boolean => {
      const host = hostRef.current;
      if (!host) return false;
      const renderedText = (host.textContent || '').replace(/\s+/g, '').trim();
      if (renderedText) return true;
      // Empty markdown nodes can be mounted before deferred rendering flushes.
      // Treat only genuinely non-text visual outputs as rendered content here.
      return Boolean(
        host.querySelector(
          ['[data-xcon-type]', '.md-xcon-block', '.md-mermaid-block', 'canvas', 'svg', 'table', 'img'].join(','),
        ),
      );
    };

    const updateFallback = () => {
      if (disposed) return;
      setShowPlainFallback(!hasRenderedContent());
    };

    const observer =
      typeof MutationObserver !== 'undefined' && hostRef.current ? new MutationObserver(updateFallback) : null;
    observer?.observe(hostRef.current as Node, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const frameId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(updateFallback, 220);
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      if (timeoutId) window.clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [trimmedContent]);

  if (!trimmedContent) return null;

  return (
    <div className="xd-xenesis-terminal-body">
      <div ref={hostRef} className="xd-xenesis-terminal-markdown-host">
        <StableStreamingXconMarkdown content={content} className="xd-xenesis-terminal-markdown" deferRendering />
      </div>
      {showPlainFallback && <pre className="xd-xenesis-terminal-plain-fallback">{content}</pre>}
    </div>
  );
}

const XENESIS_SLASH_COMMANDS: XenesisSlashCommandDescriptor[] = [
  { name: 'chat', usage: '/chat [prompt]', description: 'Set Chat mode or run a chat prompt.' },
  { name: 'plan', usage: '/plan [prompt]', description: 'Set Plan mode or run a planning prompt.' },
  { name: 'work', usage: '/work [prompt]', description: 'Set Work mode or run a work prompt.' },
  { name: 'mode', usage: '/mode chat|plan|work', description: 'Switch the current terminal mode.' },
  { name: 'status', usage: '/status', description: 'Show runtime, workspace, and active mode.' },
  { name: 'model', usage: '/model', description: 'Show the provider/model boundary used by Xenesis.' },
  {
    name: 'provider',
    usage: '/provider [mock|byok|codex|claude|hermes]',
    description: 'Show or switch the artifact provider used by /artifact.',
  },
  { name: 'tools', usage: '/tools', description: 'Show the active tool surfaces available to Xenesis.' },
  {
    name: 'reports',
    usage: '/reports [kind|passed|failed]',
    description: 'Show persisted smoke/scenario/connect reports.',
  },
  { name: 'tasks', usage: '/tasks [status] [handoff]', description: 'Show persisted agent task lifecycle state.' },
  { name: 'sessions', usage: '/sessions', description: 'Show the current embedded session summary.' },
  { name: 'resume', usage: '/resume [prompt]', description: 'Continue from the active embedded transcript context.' },
  { name: 'history', usage: '/history', description: 'Show recent terminal prompt history.' },
  { name: 'doctor', usage: '/doctor', description: 'Check the embedded Xenesis runtime connection.' },
  { name: 'diagnostics', usage: '/diagnostics', description: 'Show persisted operational diagnostics.' },
  { name: 'permissions', usage: '/permissions', description: 'Show approval and policy-check state.' },
  { name: 'memory', usage: '/memory', description: 'Show how memory is handled in the embedded runtime.' },
  { name: 'skills', usage: '/skills', description: 'Show skill-loading behavior for the active workflow.' },
  { name: 'plugins', usage: '/plugins', description: 'Show plugin/tool extension behavior for the active workflow.' },
  { name: 'compact', usage: '/compact', description: 'Show what transcript context is sent to the agent.' },
  { name: 'workspace', usage: '/workspace [path]', description: 'Show or switch the active Xenesis workspace.' },
  {
    name: 'profile',
    usage: '/profile [list|templates|install|use]',
    description: 'Show, install, or activate an operating profile.',
  },
  { name: 'artifact', usage: '/artifact <prompt>', description: 'Generate a Markdown + XCON/SKETCH artifact inline.' },
  { name: 'render', usage: '/render <prompt>', description: 'Render a Gowoori-style artifact from a prompt.' },
  {
    name: 'gowoori-smoke',
    usage: '/gowoori-smoke <prompt>',
    description: 'Use CR to size the window, open Gowoori/GowooriChat, generate an artifact, and capture the result.',
  },
  {
    name: 'control-demo',
    usage: '/control-demo [--keep-open]',
    description: 'Run the Xenesis-controlled Desk demo with four visible work subagents.',
  },
  {
    name: 'subagents-demo',
    usage: '/subagents-demo [--keep-open]',
    description: 'Use CR to start four visible Xenesis subagents, arrange them, verify markers, and stop them.',
  },
  {
    name: 'subagents-work',
    usage: '/subagents-work <task> [--keep-open]',
    description:
      'Use CR to start four visible Xenesis work subagents, arrange them, run checks, summarize, and clean up.',
  },
  {
    name: 'subagents-cleanup',
    usage: '/subagents-cleanup',
    description: 'Stop and close visible Xenesis subagent terminals left from a demo or work run.',
  },
  { name: 'approval', usage: '/approval', description: 'Show approval behavior for tool calls.' },
  { name: 'raw', usage: '/raw', description: 'Open the raw event stream.' },
  { name: 'clear', usage: '/clear', description: 'Clear the terminal transcript.' },
  { name: 'cancel', usage: '/cancel', description: 'Cancel the active run.' },
  { name: 'reset', usage: '/reset', description: 'Reset the embedded session.' },
  { name: 'help', usage: '/help', description: 'Show command help.' },
];

function parseXenesisSlashCommandLine(value: string): XenesisSlashCommand | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;
  const withoutSlash = trimmed.slice(1).trim();
  if (!withoutSlash) return { name: 'help', args: [], rest: '' };
  const [rawName = '', ...args] = withoutSlash.split(/\s+/);
  const name = rawName.toLowerCase();
  const rest = withoutSlash.slice(rawName.length).trim();
  return { name, args, rest };
}

function getXenesisSlashCommandSuggestions(value: string): XenesisSlashCommandDescriptor[] {
  const normalized = String(value || '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('/') || normalized.includes('\n')) return [];
  const withoutSlash = normalized.slice(1);
  if (/\s/.test(withoutSlash)) return [];
  const query = withoutSlash.toLowerCase();
  return XENESIS_SLASH_COMMANDS.filter(
    (command) => command.name.startsWith(query) || command.usage.toLowerCase().includes(query),
  );
}

function shouldCompleteSlashCommand(value: string, command: XenesisSlashCommandDescriptor): boolean {
  const withoutSlash = value.trimStart().slice(1);
  if (!withoutSlash || /\s/.test(withoutSlash)) return !withoutSlash;
  return withoutSlash.toLowerCase() !== command.name;
}

function slashModeFromName(name: string): XenesisMode | null {
  if (name === 'chat' || name === 'plan' || name === 'work') return name;
  return null;
}

function renderXenesisSlashHelp(): string {
  const commandLines = XENESIS_SLASH_COMMANDS.map((command) => `${command.usage.padEnd(16)} ${command.description}`);
  return [
    'Xenesis terminal commands:',
    '',
    '```text',
    ...commandLines,
    '```',
    '',
    'Enter runs the current line. Shift+Enter inserts a new line.',
  ].join('\n');
}

async function writeXenesisArtifactPromptFile(request: GowooriPromptFileWriteRequest): Promise<string> {
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

function renderXenesisArtifactProviderSummary(provider: GowooriProvider, settings: GowooriChatSettings): string {
  const lines = [
    `artifact provider: ${getGowooriProviderDefinition(provider).label}`,
    '',
    ...GOWOORI_PROVIDER_DEFINITIONS.map(
      (definition) =>
        `- ${definition.id}${definition.id === provider ? ' (active)' : ''}: ${definition.label} · ${definition.kind}`,
    ),
  ];
  if (provider !== 'mock') {
    lines.push('', `prompt mode: ${settings.promptMode}`);
    const timeout =
      Number.isFinite(settings.timeoutMs) && settings.timeoutMs > 0 ? `${settings.timeoutMs}ms` : 'default';
    lines.push(`timeout: ${timeout}`);
  }
  return lines.join('\n');
}

function collectOpenGowooriInstances(timeoutMs = 160): Promise<GowooriInstanceDetail[]> {
  return new Promise((resolve) => {
    const instances = new Map<string, GowooriInstanceDetail>();
    let settled = false;
    let timer = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener(GOWOORI_INSTANCE_EVENT, handleInstance);
      resolve([...instances.values()]);
    };
    const handleInstance = (event: Event) => {
      const detail = (event as CustomEvent<GowooriInstanceDetail>).detail;
      if (!detail?.id) return;
      instances.set(detail.id, detail);
    };
    window.addEventListener(GOWOORI_INSTANCE_EVENT, handleInstance);
    window.dispatchEvent(new Event(GOWOORI_INSTANCE_REQUEST_EVENT));
    timer = window.setTimeout(finish, Math.max(50, timeoutMs));
  });
}

async function applyXenesisArtifactToGowoori(source: string, label: string): Promise<'applied' | 'opened' | 'skipped'> {
  const trimmedSource = source.trim();
  if (!trimmedSource) return 'skipped';
  const instances = await collectOpenGowooriInstances();
  const detail: GowooriApplyDetail = {
    targetId: instances[0]?.id ?? 'pending',
    source: trimmedSource,
    label,
    mode: 'replace',
  };
  if (instances.length > 0) {
    dispatchGowooriApply(detail);
    return 'applied';
  }
  writePendingGowooriApply(detail);
  dispatchGowooriOpenRequest({ label });
  return 'opened';
}

function getXenesisArtifactLabelFromContent(content: string): string {
  const heading = /^#{1,3}\s+(.+)$/m.exec(content)?.[1]?.trim();
  if (heading) return heading.slice(0, 80);
  const screenTitle = /^\s*screen\s+["']([^"']+)["']/m.exec(content)?.[1]?.trim();
  if (screenTitle) return screenTitle.slice(0, 80);
  return 'Xenesis XCON artifact';
}

function showXenesisArtifactOverlay(source: string, label: string): boolean {
  const trimmedSource = source.trim();
  if (!trimmedSource) return false;
  const id = `xenesis-agent-overlay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  dispatchGowooriOverlayShow({
    id,
    title: label || 'Xenesis XCON artifact',
    label: 'Xenesis Agent',
    source: trimmedSource,
    zoom: 100,
  });
  return true;
}

function writeLatestXenesisArtifactSourceForAutomation(source: string, label: string): void {
  const trimmedSource = source.trim();
  if (!trimmedSource) return;
  const automationWindow = window as unknown as {
    __xenesisDeskXenesisAgentLatestArtifactSource?: XenesisAgentAutomationArtifactSnapshot;
  };
  automationWindow.__xenesisDeskXenesisAgentLatestArtifactSource = {
    label,
    source: trimmedSource,
    sourceLength: trimmedSource.length,
    updatedAt: Date.now(),
  };
}

function isTerminalFocusTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  return !target.closest(
    [
      'button',
      'input',
      'textarea',
      'select',
      'a[href]',
      'summary',
      '[role="button"]',
      '.xd-xenesis-terminal-body',
      '.xd-xenesis-terminal-markdown',
      '[data-xenesis-no-terminal-focus="true"]',
    ].join(','),
  );
}

function isXenesisTextAttachmentFile(file: File): boolean {
  const type = file.type.toLowerCase();
  return (
    type.startsWith('text/') ||
    [
      'application/javascript',
      'application/json',
      'application/typescript',
      'application/xml',
      'application/x-yaml',
      'application/yaml',
    ].includes(type) ||
    XENESIS_TEXT_ATTACHMENT_EXTENSION_PATTERN.test(file.name)
  );
}

function encodeXenesisBytesAsBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function readXenesisFileAsDataUrl(file: File): Promise<string> {
  if (typeof file.arrayBuffer === 'function') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return `data:${file.type || 'application/octet-stream'};base64,${encodeXenesisBytesAsBase64(bytes)}`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error(`Failed to read ${file.name}.`));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  });
}

async function createXenesisAttachmentFromFile(file: File): Promise<XenesisAgentAttachment> {
  const path = window.fileAPI?.getPathForFile?.(file) || '';
  const kind = classifyXenesisAttachment(file);
  const attachment: XenesisAgentAttachment = {
    id: `xenesis-attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    name: file.name || path.split(/[\\/]/).pop() || 'attachment',
    size: file.size || 0,
    type: file.type || '',
    path,
    lastModified: file.lastModified || undefined,
  };

  if (kind === 'image' && file.size <= XENESIS_ATTACHMENT_IMAGE_PREVIEW_MAX_BYTES) {
    attachment.dataUrl = await readXenesisFileAsDataUrl(file);
  } else if (
    kind === 'file' &&
    file.size <= XENESIS_ATTACHMENT_TEXT_PREVIEW_MAX_BYTES &&
    isXenesisTextAttachmentFile(file)
  ) {
    attachment.previewText = (await file.text()).slice(0, XENESIS_ATTACHMENT_TEXT_PREVIEW_CHARS);
  }

  return attachment;
}

function isXenesisFileDragEvent(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer?.types || []).includes('Files');
}

function xenesisTerminalLineKind(message: XenesisChatMessage): XenesisTerminalLineKind {
  if (message.error) return 'error';
  if (message.kind) return message.kind;
  const content = message.content.trim().toLowerCase();
  if (content.startsWith('tool:') || content.startsWith('tool call:') || content.startsWith('desk tool')) return 'tool';
  if (content.startsWith('approval') || content.startsWith('approve ') || content.includes('approval required'))
    return 'approval';
  if (content.startsWith('status:') || content.startsWith('mode:') || content.startsWith('session')) return 'status';
  if (message.role === 'user' && content.startsWith('/')) return 'command';
  return 'message';
}

function xenesisTerminalRoleLabel(message: XenesisChatMessage): string {
  if (message.role === 'user') return '요청';
  if (message.role === 'assistant') return '응답';
  return '시스템';
}

function xenesisTerminalSourceLabel(message: XenesisChatMessage, lineKind: XenesisTerminalLineKind): string {
  if (message.role === 'user') return lineKind === 'command' ? '사용자 명령' : '사용자 입력';
  if (message.role === 'assistant') return 'Xenesis Agent';
  if (lineKind === 'status') return '상태 알림';
  if (lineKind === 'approval') return '승인 요청';
  if (lineKind === 'tool') return '도구 이벤트';
  if (lineKind === 'error') return '오류';
  return '시스템 메시지';
}

function xenesisTerminalKindLabel(lineKind: XenesisTerminalLineKind): string {
  switch (lineKind) {
    case 'command':
      return '명령';
    case 'tool':
      return '도구';
    case 'approval':
      return '승인';
    case 'status':
      return '상태';
    case 'error':
      return '오류';
    default:
      return '';
  }
}

function xenesisDeskActionStatusLabel(status: XenesisChatMessage['deskActionStatus']): string {
  switch (status) {
    case 'pending':
      return '승인 대기';
    case 'running':
      return '실행 중';
    case 'applied':
      return '완료';
    case 'failed':
      return '실패';
    case 'cancelled':
      return '취소됨';
    default:
      return 'Desk action';
  }
}

function formatXenesisMessageTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function contextUsageText(messages: XenesisChatMessage[]): string {
  const used = Math.min(messages.length, XENESIS_CONTEXT_MESSAGE_LIMIT);
  return `ctx=${used}/${XENESIS_CONTEXT_MESSAGE_LIMIT}`;
}

function renderXenesisProfileState(state: XenesisProfileState): string {
  const channels = state.channels.map(
    (channel) =>
      `- ${channel.name}: ${channel.enabled ? 'enabled' : 'disabled'}, ${channel.configured ? 'configured' : 'not configured'}${channel.env.length > 0 ? ` (${channel.env.join(', ')})` : ''}`,
  );
  return [
    `profile: ${state.active || 'none'}`,
    `configured: ${state.configured || 'none'}`,
    `installed: ${state.installed.length > 0 ? state.installed.join(', ') : 'none'}`,
    ...renderXenesisProfilePolicy(state),
    'templates:',
    ...state.templates.map((template) => `- ${template.name}: ${template.summary}`),
    'channels:',
    ...(channels.length > 0 ? channels : ['- none']),
  ].join('\n');
}

function renderXenesisProfilePolicy(state: XenesisProfileState): string[] {
  return [
    'policy:',
    `- workflow: ${state.policy.workflow}`,
    `- approval: ${state.policy.approvalMode}`,
    `- maxTurns: ${state.policy.maxTurns || 'default'}`,
    `- providerRetries: ${state.policy.providerRetries}`,
    `- context: autoCompact=${state.policy.contextAutoCompact ? 'on' : 'off'}`,
    `- memory: ${state.policy.memoryEnabled ? 'enabled' : 'disabled'}`,
    `- subagents: ${state.policy.subagentsEnabled ? 'enabled' : 'disabled'}`,
    `- browser: ${state.policy.browserEnabled ? 'enabled' : 'disabled'}`,
    `- verification: autoRun=${state.policy.verificationAutoRun ? 'on' : 'off'}, autoFix=${state.policy.verificationAutoFix ? 'on' : 'off'}`,
  ];
}

const XENESIS_REPORT_KINDS = new Set<XenesisReportKind>(['smoke', 'scenario', 'connect', 'provider-live']);
const XENESIS_REPORT_STATUSES = new Set<XenesisReportStatus>(['passed', 'failed']);
const XENESIS_TASK_STATUSES = new Set<XenesisTaskStatus>([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'blocked',
]);

function parsePositiveSlashLimit(args: string[], fallback = 12): number {
  const numeric = args.map((value) => Number(value)).find((value) => Number.isInteger(value) && value > 0);
  return numeric ? Math.min(numeric, 50) : fallback;
}

function xenesisReportQueryFromArgs(args: string[]): XenesisReportQuery {
  const normalized = args.map((arg) => arg.toLowerCase());
  const kind = normalized.find((arg) => XENESIS_REPORT_KINDS.has(arg as XenesisReportKind)) as
    | XenesisReportKind
    | undefined;
  const status = normalized.find((arg) => XENESIS_REPORT_STATUSES.has(arg as XenesisReportStatus)) as
    | XenesisReportStatus
    | undefined;
  return {
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
    limit: parsePositiveSlashLimit(args),
  };
}

function xenesisTaskQueryFromArgs(args: string[]): XenesisTaskQuery {
  const normalized = args.map((arg) => arg.toLowerCase());
  const status = normalized.find((arg) => XENESIS_TASK_STATUSES.has(arg as XenesisTaskStatus)) as
    | XenesisTaskStatus
    | undefined;
  const filter = args
    .filter((arg) => !XENESIS_TASK_STATUSES.has(arg.toLowerCase() as XenesisTaskStatus))
    .filter((arg) => !Number.isInteger(Number(arg)))
    .join(' ')
    .trim();
  return {
    ...(status ? { status } : {}),
    ...(filter ? { handoffTitle: filter } : {}),
    limit: parsePositiveSlashLimit(args),
  };
}

function renderXenesisReportLine(report: XenesisReportSummary): string {
  const result = report.exitCode === 0 && report.failed === 0 ? 'passed' : 'failed';
  return `- ${report.kind} ${report.id}: ${result}, ${report.passed}/${report.total} passed, exit=${report.exitCode}${report.createdAt ? `, ${report.createdAt}` : ''}`;
}

function renderXenesisReportsResult(reports: XenesisReportSummary[]): string {
  return reports.length > 0 ? ['reports:', ...reports.map(renderXenesisReportLine)].join('\n') : 'reports: none';
}

function renderXenesisTaskLine(task: XenesisTaskSummary): string {
  const label = [task.label, task.handoffTitle, task.id].filter(Boolean).join(' / ');
  const detail = [
    task.updatedAt,
    task.error ? `error=${task.error}` : '',
    task.blockedReason ? `blocked=${task.blockedReason}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return `- ${task.status} ${label}: ${task.prompt}${detail ? ` (${detail})` : ''}`;
}

function renderXenesisTasksResult(tasks: XenesisTaskSummary[]): string {
  return tasks.length > 0 ? ['tasks:', ...tasks.map(renderXenesisTaskLine)].join('\n') : 'tasks: none';
}

function renderXenesisOperationalDiagnostics(diagnostics: XenesisOperationalDiagnostics): string {
  const taskSummary = diagnostics.tasks.summary;
  return [
    'diagnostics:',
    `updated: ${diagnostics.updatedAt}`,
    `workspace: ${diagnostics.workspace}`,
    `home: ${diagnostics.xenesisHome}`,
    `runtime: ${runtimeModeText(diagnostics.status)} / ${statusText(diagnostics.status)}`,
    `reports: total=${diagnostics.reports.summary.total}, passed=${diagnostics.reports.summary.passed}, failed=${diagnostics.reports.summary.failed}`,
    `tasks: total=${taskSummary.total}, queued=${taskSummary.queued}, running=${taskSummary.running}, completed=${taskSummary.completed}, failed=${taskSummary.failed}, blocked=${taskSummary.blocked}`,
    '',
    renderXenesisReportsResult(diagnostics.reports.reports.slice(0, 5)),
    '',
    renderXenesisTasksResult(diagnostics.tasks.tasks.slice(0, 5)),
  ].join('\n');
}

function shortSessionId(sessionId: string): string {
  const normalized = sessionId.trim();
  if (!normalized) return 'none';
  if (normalized.length <= 12) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

function formatRunElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

type XenesisHeaderStateTone = 'busy' | 'ready' | 'stopped';

/**
 * The pane header shows a single, accurate at-a-glance state. When the renderer
 * run state is live-busy we trust that over the backend status (which lags and
 * can read "Stopped" mid-run). Otherwise we derive Ready/Stopped from status.
 */
function headerLiveState(status: XenesisStatus | null, busy: boolean): { label: string; tone: XenesisHeaderStateTone } {
  if (busy) return { label: '실행 중', tone: 'busy' };
  const backend = statusText(status);
  if (backend === 'Ready' || backend === 'Starting') return { label: '준비됨', tone: 'ready' };
  return { label: '중지됨', tone: 'stopped' };
}

/** Short, human-readable workspace name for the header (basename of the path). */
function workspaceBasename(workspace: string | undefined | null): string {
  if (!workspace) return '';
  const normalized = workspace.replace(/[\\/]+$/, '');
  const segments = normalized.split(/[\\/]/).filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : normalized;
}

function unwrapDeskCapabilityValue(value: unknown): unknown {
  let current = value;
  for (let index = 0; index < 4; index += 1) {
    if (!isRecord(current) || !('result' in current)) return current;
    current = current.result;
  }
  return current;
}

function readDeskCapabilityString(value: unknown, keys: string[]): string {
  const current = unwrapDeskCapabilityValue(value);
  if (!isRecord(current)) return '';
  for (const key of keys) {
    const candidate = current[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '';
}

function readDeskCapabilityArtifact(value: unknown): Record<string, unknown> | null {
  const current = unwrapDeskCapabilityValue(value);
  if (!isRecord(current)) return null;
  if (isRecord(current.artifact)) return current.artifact;
  if (Array.isArray(current.captures) && isRecord(current.captures[0])) return current.captures[0];
  return null;
}

function readDeskCapabilitySessions(value: unknown): unknown[] {
  const current = unwrapDeskCapabilityValue(value);
  if (Array.isArray(current)) return current;
  if (!isRecord(current)) return [];
  if (Array.isArray(current.sessions)) return current.sessions;
  return [];
}

function readDeskCapabilityDockContents(value: unknown): unknown[] {
  const current = unwrapDeskCapabilityValue(value);
  if (!isRecord(current)) return [];
  const contents: unknown[] = [];
  if (Array.isArray(current.contents)) contents.push(...current.contents);
  if (Array.isArray(current.panes)) {
    current.panes.forEach((pane) => {
      if (!isRecord(pane) || !Array.isArray(pane.contents)) return;
      pane.contents.forEach((id) => {
        if (typeof id === 'string' && id.trim()) contents.push({ id: id.trim() });
      });
    });
  }
  const rendererState = isRecord(current.rendererState) ? current.rendererState : null;
  if (rendererState && Array.isArray(rendererState.contents)) contents.push(...rendererState.contents);
  return contents;
}

function readXenesisEventText(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function normalizeXenesisAgentEventAttachments(raw: unknown): XenesisAgentAttachment[] {
  if (!Array.isArray(raw)) return [];
  const normalized: XenesisAgentAttachment[] = [];
  raw.slice(0, 12).forEach((item, index) => {
    if (!isRecord(item)) return;
    const name = readXenesisEventText(item.name);
    if (!name) return;
    const type = readXenesisEventText(item.type) || readXenesisEventText(item.mimeType);
    const kind = item.kind === 'image' || item.kind === 'file' ? item.kind : classifyXenesisAttachment({ name, type });
    const attachment: XenesisAgentAttachment = {
      id: `event-${Date.now()}-${index}`,
      kind,
      name,
      size: typeof item.size === 'number' && Number.isFinite(item.size) && item.size >= 0 ? item.size : 0,
    };
    if (type) attachment.type = type;
    const path = readXenesisEventText(item.path);
    if (path) attachment.path = path;
    const dataUrl = readXenesisEventText(item.dataUrl);
    if (dataUrl) attachment.dataUrl = dataUrl;
    const previewText = readXenesisEventText(item.previewText) || readXenesisEventText(item.text);
    if (previewText) attachment.previewText = previewText;
    const lastModified =
      typeof item.lastModified === 'number' && Number.isFinite(item.lastModified) ? item.lastModified : undefined;
    if (lastModified !== undefined) attachment.lastModified = lastModified;
    normalized.push(attachment);
  });
  return normalized;
}

interface XenesisPendingMarkdownSave {
  requestText: string;
  filePath: string;
  draft: XenesisMarkdownSaveDraft;
}

export interface XenesisAgentPaneProps {
  contentId?: string;
}

export function XenesisAgentPane({ contentId }: XenesisAgentPaneProps = {}) {
  const xenesisApi = window.xenesisAPI;
  const apiUnavailable = !xenesisApi;
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const terminalRootRef = useRef<HTMLDivElement | null>(null);
  const terminalShellRef = useRef<HTMLElement | null>(null);
  const terminalViewportRef = useRef<HTMLDivElement | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const promptInputLineRef = useRef<HTMLFormElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentDragDepthRef = useRef(0);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const runTerminalInputRef = useRef<
    | ((
        input: string,
        inputAttachments?: XenesisAgentAttachment[],
        routingOptions?: XenesisAgentPromptRoutingOptions,
        modeOverride?: XenesisMode,
      ) => Promise<void>)
    | null
  >(null);
  const artifactAbortControllerRef = useRef<AbortController | null>(null);
  const settingsSnapshotRef = useRef<Partial<AppSettings> | null>(null);
  const promptHistoryRef = useRef<string[]>([]);
  const promptHistoryIndexRef = useRef<number | null>(null);
  const pendingMarkdownSaveRef = useRef<XenesisPendingMarkdownSave | null>(null);
  // Prompt-queue (Claude-Code-style type-ahead) drain bookkeeping.
  const suppressNextDrainRef = useRef(false);
  const drainPrevBusyRef = useRef(false);
  const initialProviderSettings = useMemo(() => normalizeProviderSettings(loadLegacyProviderSettings()), []);
  const [terminalFocused, setTerminalFocused] = useState(false);
  const [attachments, setAttachments] = useState<XenesisAgentAttachment[]>([]);
  const [attachmentDropActive, setAttachmentDropActive] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [artifactProvider, setArtifactProvider] = useState<GowooriProvider>(initialProviderSettings.provider);
  const [artifactProviderSettings, setArtifactProviderSettings] =
    useState<GowooriChatSettings>(initialProviderSettings);
  const [slashSelectionIndex, setSlashSelectionIndex] = useState(0);
  const [slashMenuPlacement, setSlashMenuPlacement] = useState<XenesisSlashMenuPlacement>('below');
  const [runStartedAtMs, setRunStartedAtMs] = useState<number | null>(null);
  const [runNowMs, setRunNowMs] = useState(Date.now());
  const state = useXenesisAgentState();
  const agentId = useMemo(() => createXenesisPaneAgentId(contentId), [contentId]);
  const {
    status,
    prompt,
    mode,
    loading,
    running,
    error,
    messages,
    promptQueue,
    rawStream,
    policyNotices,
    policySnapshot,
    rawStreamOpen,
    rawStreamFocusId,
    activeSessionId,
    statusBarKeys,
  } = state;
  const slashSuggestions = useMemo(() => getXenesisSlashCommandSuggestions(prompt), [prompt]);
  const latestTranscriptScrollSignature = useMemo(() => {
    const latest = messages[0];
    if (!latest) return `empty:${running ? 'running' : 'idle'}`;
    return [
      latest.id,
      latest.role,
      latest.kind ?? '',
      latest.content.length,
      latest.streaming ? 'streaming' : 'final',
      running ? 'running' : 'idle',
    ].join(':');
  }, [messages, running]);
  const selectedSlashIndex =
    slashSuggestions.length > 0 ? Math.min(slashSelectionIndex, slashSuggestions.length - 1) : -1;
  const selectedSlashSuggestion = selectedSlashIndex >= 0 ? slashSuggestions[selectedSlashIndex] : null;
  const artifactAgentTools = useMemo(
    () =>
      createDefaultGowooriAgentTools(undefined, {
        sports: {
          standingsEndpoint: artifactProviderSettings.sportsStandingsEndpoint,
        },
      }),
    [artifactProviderSettings.sportsStandingsEndpoint],
  );

  useEffect(() => {
    return registerXenesisAgentBridgeAgent({
      agentId,
      title: 'Xenesis Agent',
      provider: artifactProvider,
      getSnapshot: () => xenesisAgentStateStore.getSnapshot(),
      submitMessage: async (text: string) => {
        await runTerminalInputRef.current?.(text);
      },
      listEvents: ({ sinceEventId, limit } = {}) => {
        const snapshot = xenesisAgentStateStore.getSnapshot();
        const events: XenesisAgentBridgeEvent[] = snapshot.messages
          .filter(
            (message) =>
              message.role === 'assistant' && !message.streaming && !message.error && Boolean(message.content.trim()),
          )
          .slice()
          .reverse()
          .map((message) => ({
            id: message.id,
            agentId,
            kind: 'assistant_final',
            text: message.content,
            externalSafe: true,
            at: message.at,
          }));
        const sinceIndex = sinceEventId ? events.findIndex((event) => event.id === sinceEventId) : -1;
        const start = sinceIndex >= 0 ? sinceIndex + 1 : 0;
        const cappedLimit = Number.isInteger(limit) && limit && limit > 0 ? Math.min(limit, 100) : 50;
        return events.slice(start).slice(-cappedLimit);
      },
    });
  }, [agentId, artifactProvider]);

  function ensureTerminalEndVisible(): void {
    if (rawStreamOpen) return;
    const scrollToBottom = () => {
      if (rawStreamOpen) return;
      const viewport = terminalViewportRef.current;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      } else {
        chatEndRef.current?.scrollIntoView({ block: 'end', inline: 'nearest' });
      }
    };
    window.requestAnimationFrame(() => {
      scrollToBottom();
      window.requestAnimationFrame(scrollToBottom);
      window.setTimeout(scrollToBottom, 80);
    });
  }

  function resizePromptInput(): void {
    const input = promptInputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
    input.style.overflowY = 'hidden';
  }

  function ensureSelectedSlashOptionVisible(): void {
    if (!selectedSlashSuggestion) return;
    window.requestAnimationFrame(() => {
      const menu = slashMenuRef.current;
      if (!menu) return;
      const option = menu.querySelector<HTMLElement>(
        `#xd-xenesis-slash-option-${CSS.escape(selectedSlashSuggestion.name)}`,
      );
      option?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  function pushPromptHistory(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    const history = promptHistoryRef.current;
    if (history[history.length - 1] !== trimmed) {
      promptHistoryRef.current = [...history, trimmed].slice(-80);
    }
    promptHistoryIndexRef.current = null;
  }

  function recallPromptHistory(direction: -1 | 1): boolean {
    const history = promptHistoryRef.current;
    if (history.length === 0) return false;
    const currentIndex = promptHistoryIndexRef.current ?? history.length;
    const nextIndex = Math.max(0, Math.min(history.length, currentIndex + direction));
    promptHistoryIndexRef.current = nextIndex;
    xenesisAgentStateStore.update({ prompt: nextIndex >= history.length ? '' : history[nextIndex] });
    window.requestAnimationFrame(() => {
      resizePromptInput();
      focusTerminalInput();
    });
    return true;
  }

  function updateSlashMenuPlacement(): void {
    if (slashSuggestions.length === 0 || rawStreamOpen) return;
    const terminal = terminalShellRef.current || terminalViewportRef.current;
    const inputLine = promptInputLineRef.current;
    if (!terminal || !inputLine) return;

    const terminalRect = terminal.getBoundingClientRect();
    const inputRect = inputLine.getBoundingClientRect();
    const aboveSpace = Math.max(0, inputRect.top - terminalRect.top);
    const belowSpace = Math.max(0, terminalRect.bottom - inputRect.bottom);
    const estimatedMenuHeight = Math.min(260, Math.max(48, slashSuggestions.length * 34 + 10));
    const measuredMenuHeight = slashMenuRef.current?.offsetHeight || estimatedMenuHeight;
    const requiredSpace = Math.min(260, measuredMenuHeight);
    const nextPlacement: XenesisSlashMenuPlacement =
      belowSpace >= requiredSpace || belowSpace >= aboveSpace ? 'below' : 'above';

    setSlashMenuPlacement((current) => (current === nextPlacement ? current : nextPlacement));
  }

  function focusTerminalInput(): void {
    if (rawStreamOpen) return;
    window.requestAnimationFrame(() => {
      const input = promptInputRef.current;
      if (!input) return;
      resizePromptInput();
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
      ensureTerminalEndVisible();
      updateSlashMenuPlacement();
      ensureSelectedSlashOptionVisible();
    });
  }

  function handleTerminalMouseDown(event: React.MouseEvent<HTMLDivElement>): void {
    if (!isTerminalFocusTarget(event.target)) return;
    focusTerminalInput();
  }

  function handlePromptBlur(): void {
    window.setTimeout(() => {
      if (document.activeElement !== promptInputRef.current) {
        setTerminalFocused(false);
      }
    }, 0);
  }

  function completeSlashCommand(commandName: string): void {
    const nextPrompt = `/${commandName} `;
    xenesisAgentStateStore.update({ prompt: nextPrompt });
    setSlashSelectionIndex(0);
    window.requestAnimationFrame(() => {
      const input = promptInputRef.current;
      if (!input) return;
      resizePromptInput();
      input.focus();
      input.setSelectionRange(nextPrompt.length, nextPrompt.length);
      ensureTerminalEndVisible();
      updateSlashMenuPlacement();
      ensureSelectedSlashOptionVisible();
    });
  }

  /** Populate the prompt input with an example/onboarding prompt and focus it for editing. */
  function fillPromptInput(value: string): void {
    xenesisAgentStateStore.update({ prompt: value });
    setSlashSelectionIndex(0);
    window.requestAnimationFrame(() => {
      const input = promptInputRef.current;
      if (!input) return;
      resizePromptInput();
      input.focus();
      input.setSelectionRange(value.length, value.length);
      ensureTerminalEndVisible();
    });
  }

  function handlePromptChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    xenesisAgentStateStore.update({ prompt: event.target.value });
    setSlashSelectionIndex(0);
    window.requestAnimationFrame(() => {
      resizePromptInput();
      ensureTerminalEndVisible();
      updateSlashMenuPlacement();
      ensureSelectedSlashOptionVisible();
    });
  }

  async function addAttachmentFiles(files: Iterable<File>): Promise<void> {
    const fileList = Array.from(files).filter((file) => file instanceof File && file.name);
    if (fileList.length === 0) return;

    setAttachmentError('');
    try {
      const nextAttachments = await Promise.all(fileList.map(createXenesisAttachmentFromFile));
      setAttachments((current) => dedupeXenesisAttachments(current, nextAttachments));
    } catch (attachmentReadError) {
      const message = attachmentReadError instanceof Error ? attachmentReadError.message : String(attachmentReadError);
      setAttachmentError(`Attachment failed: ${message}`);
    } finally {
      attachmentDragDepthRef.current = 0;
      setAttachmentDropActive(false);
    }
  }

  function handleAttachmentInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = event.target.files;
    if (files) {
      void addAttachmentFiles(files);
    }
    event.target.value = '';
  }

  function removeAttachment(attachmentId: string): void {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  function clearAttachments(): void {
    setAttachments([]);
    setAttachmentError('');
  }

  function handleAttachmentDragEnter(event: React.DragEvent<HTMLElement>): void {
    if (!isXenesisFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current += 1;
    setAttachmentDropActive(true);
  }

  function handleAttachmentDragOver(event: React.DragEvent<HTMLElement>): void {
    if (!isXenesisFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setAttachmentDropActive(true);
  }

  function handleAttachmentDragLeave(event: React.DragEvent<HTMLElement>): void {
    if (!isXenesisFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current = Math.max(0, attachmentDragDepthRef.current - 1);
    if (attachmentDragDepthRef.current === 0) {
      setAttachmentDropActive(false);
    }
  }

  function handleAttachmentDrop(event: React.DragEvent<HTMLElement>): void {
    if (!isXenesisFileDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current = 0;
    setAttachmentDropActive(false);
    void addAttachmentFiles(event.dataTransfer.files);
  }

  function applySettingsSnapshot(snapshot: Partial<AppSettings> | null | undefined): void {
    if (!snapshot) return;
    const mergedSnapshot = {
      ...(settingsSnapshotRef.current ?? {}),
      ...snapshot,
    };
    settingsSnapshotRef.current = mergedSnapshot;
    const nextProviderSettings = normalizeProviderSettings({
      ...loadLegacyProviderSettings(),
      ...mergedSnapshot.gowooriChat,
    });
    setArtifactProviderSettings(nextProviderSettings);
    setArtifactProvider(nextProviderSettings.provider);
  }

  function selectArtifactProvider(nextProvider: GowooriProvider, announce = true): void {
    setArtifactProviderSettings((current) => {
      const nextSettings = normalizeProviderSettings({
        ...current,
        provider: nextProvider,
      });
      setArtifactProvider(nextSettings.provider);
      window.terminalAPI?.saveSettings?.({ gowooriChat: nextSettings }).catch((error) => {
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: `artifact provider save failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      });
      if (announce) {
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: `artifact provider: ${getGowooriProviderDefinition(nextSettings.provider).label}`,
        });
      }
      return nextSettings;
    });
  }

  function copyTranscriptMessage(content: string): void {
    void navigator.clipboard?.writeText(content).catch(() => {});
  }

  function applyChoiceOption(option: XenesisChoiceOption): void {
    const nextPrompt = option.input;
    xenesisAgentStateStore.update({ prompt: nextPrompt });
    window.requestAnimationFrame(() => {
      resizePromptInput();
      focusTerminalInput();
    });
  }

  async function openTranscriptArtifactInGowoori(source: string, label: string): Promise<void> {
    const trimmedSource = source.trim();
    if (!trimmedSource) return;
    const state = await applyXenesisArtifactToGowoori(trimmedSource, `Xenesis Agent: ${label}`);
    appendRawStreamEntry({
      kind: state === 'skipped' ? 'artifact_warning' : 'artifact_result',
      summary:
        state === 'opened'
          ? `Opened Gowoori artifact: ${label}`
          : state === 'applied'
            ? `Sent artifact to Gowoori: ${label}`
            : `Skipped Gowoori artifact: ${label}`,
      detail: trimmedSource,
      error: state === 'skipped',
    });
  }

  function openTranscriptArtifactOverlay(source: string, label: string): void {
    const opened = showXenesisArtifactOverlay(source, label);
    appendRawStreamEntry({
      kind: opened ? 'artifact_result' : 'artifact_warning',
      summary: opened ? `Opened overlay artifact: ${label}` : `Skipped overlay artifact: ${label}`,
      detail: source,
      error: !opened,
    });
  }

  async function resolveLatestArtifactApiRuntime() {
    const latestSettings = await window.terminalAPI?.getSettings?.().catch(() => settingsSnapshotRef.current);
    const latestSnapshot = latestSettings
      ? { ...(settingsSnapshotRef.current ?? {}), ...latestSettings, gowooriChat: artifactProviderSettings }
      : { ...(settingsSnapshotRef.current ?? {}), gowooriChat: artifactProviderSettings };
    const runtimeState = resolveGowooriDevByokRuntimeFromSettings(latestSnapshot);
    if (!runtimeState.ready) {
      throw new Error(runtimeState.diagnostics[0] ?? `AI profile "${runtimeState.profileName}" is not ready.`);
    }
    return {
      runtime: runtimeState.runtime,
      activeProfileName: runtimeState.profileName,
    };
  }

  async function cancelActiveRun(displayInput = ''): Promise<void> {
    // Cancel preserves the prompt queue but must NOT auto-fire the next queued prompt:
    // consume exactly one busy->idle drain edge.
    suppressNextDrainRef.current = true;
    if (displayInput) appendChatMessage({ role: 'user', content: displayInput, kind: 'command' });
    artifactAbortControllerRef.current?.abort();
    artifactAbortControllerRef.current = null;
    if (!xenesisApi) {
      appendChatMessage({ role: 'system', kind: 'error', content: XENESIS_API_UNAVAILABLE, error: true });
      return;
    }
    try {
      const next = await xenesisApi.cancel();
      xenesisAgentStateStore.update({ status: next, running: false });
      appendChatMessage({
        role: 'system',
        kind: 'status',
        content: `${displayInput ? 'cancel' : 'interrupt'}: ${statusText(next)}`,
      });
    } catch (cancelError) {
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: cancelError instanceof Error ? cancelError.message : String(cancelError),
        error: true,
      });
    }
  }

  async function refresh(): Promise<XenesisStatus | null> {
    if (!xenesisApi) {
      xenesisAgentStateStore.update({ error: XENESIS_API_UNAVAILABLE });
      appendRawStreamEntry({ kind: 'api_unavailable', summary: XENESIS_API_UNAVAILABLE, error: true });
      return null;
    }
    xenesisAgentStateStore.update({ loading: true, error: '' });
    try {
      const next = await xenesisApi.status();
      xenesisAgentStateStore.update({ status: next });
      appendRawStreamEntry({
        kind: 'status',
        summary: statusText(next),
        detail: stringifyDetail(next),
        error: Boolean(next.error),
      });
      return next;
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : String(refreshError);
      xenesisAgentStateStore.update({ error: message });
      appendRawStreamEntry({ kind: 'status_error', summary: message, error: true });
      return null;
    } finally {
      xenesisAgentStateStore.update({ loading: false });
    }
  }

  async function requestMarkdownSave(input: string): Promise<void> {
    const trimmedInput = input.trim();
    if (running) {
      appendChatMessage({ role: 'user', content: trimmedInput });
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: 'Xenesis is already running. Use /cancel before preparing a file save.',
        error: true,
      });
      return;
    }

    xenesisAgentStateStore.update({ prompt: '' });
    const currentStatus = status?.ok ? status : await refresh();
    const workspace = currentStatus?.workspace || status?.workspace || '';
    const requestMessage: XenesisChatMessage = {
      id: `pending-save-request-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      at: new Date().toISOString(),
    };
    const draft = buildXenesisMarkdownSaveDraft({
      messages: [requestMessage, ...messages],
      requestText: trimmedInput,
    });
    const filePath = resolveXenesisMarkdownSavePath(workspace, draft.fileName);
    pendingMarkdownSaveRef.current = {
      requestText: trimmedInput,
      filePath,
      draft,
    };

    appendChatMessage({ role: 'user', content: trimmedInput });
    appendChatMessage({
      role: 'assistant',
      kind: 'status',
      content: [
        'Markdown 파일 저장 준비가 되었습니다.',
        '',
        `대상: ${filePath}`,
        `크기: ${draft.content.length.toLocaleString()} chars`,
        '',
        '저장하려면 "승인"이라고 입력하세요. 취소하려면 /cancel 또는 다른 요청을 입력하세요.',
      ].join('\n'),
    });
    appendRawStreamEntry({
      kind: 'file_save_pending',
      summary: `Markdown save pending: ${draft.fileName}`,
      detail: filePath,
    });
  }

  async function applyPendingMarkdownSave(input: string): Promise<void> {
    const pending = pendingMarkdownSaveRef.current;
    const trimmedInput = input.trim();
    if (!pending) {
      appendChatMessage({ role: 'user', content: trimmedInput });
      appendChatMessage({
        role: 'system',
        kind: 'status',
        content: '승인할 대기 작업이 없습니다. 저장할 내용을 먼저 요청해 주세요.',
      });
      return;
    }

    pendingMarkdownSaveRef.current = null;
    appendChatMessage({ role: 'user', content: trimmedInput });
    try {
      const writtenPath = await writeXenesisArtifactPromptFile({
        filePath: pending.filePath,
        fileName: pending.draft.fileName,
        content: pending.draft.content,
        maxBytes: 220_000,
      });
      appendChatMessage({
        role: 'assistant',
        kind: 'status',
        content: [
          'Markdown 파일을 저장했습니다.',
          '',
          `대상: ${writtenPath}`,
          `요청: ${pending.requestText}`,
          `크기: ${pending.draft.content.length.toLocaleString()} chars`,
        ].join('\n'),
      });
      appendRawStreamEntry({
        kind: 'file_save_result',
        summary: `Markdown saved: ${pending.draft.fileName}`,
        detail: writtenPath,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      xenesisAgentStateStore.update({ error: message });
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: `Markdown 파일 저장에 실패했습니다.\n\n${message}`,
        error: true,
      });
      appendRawStreamEntry({
        kind: 'file_save_error',
        summary: message,
        detail: pending.filePath,
        error: true,
      });
    }
  }

  async function executeXenesisDeskActionRequests(
    actions: XenesisDeskActionRequest[],
  ): Promise<XenesisDeskActionExecutionResult[]> {
    return runXenesisDeskActions(
      actions,
      async (path, args, options): Promise<XenesisDeskActionCallResult> => {
        const client = options?.approved ? xenesisInternalDeskCapabilityClient : xenesisDeskCapabilityClient;
        const callResult = await client.call(path, args, options);
        return { ...callResult };
      },
      {
        onActivity(activity) {
          dispatchXdBlasterEvents(createXdBlasterEventsForDeskActionActivity(activity));
        },
      },
    );
  }

  function appendXenesisDeskActionResultsToLog(results: XenesisDeskActionExecutionResult[]): void {
    for (const actionResult of results) {
      appendRawStreamEntry({
        kind: 'desk_tool_result',
        summary: summarizeXenesisDeskActionExecution(actionResult),
        detail: stringifyDetail(actionResult),
        error: !actionResult.ok,
      });
    }
  }

  function latestPendingDeskActionMessage(): XenesisChatMessage | null {
    return (
      [...xenesisAgentStateStore.getSnapshot().messages]
        .reverse()
        .find(
          (message) =>
            (!message.deskActionStatus || message.deskActionStatus === 'pending') &&
            Array.isArray(message.deskActions) &&
            message.deskActions.length > 0,
        ) || null
    );
  }

  function settleXenesisDeskActionMessage(
    messageId: string,
    actions: XenesisDeskActionRequest[],
    results: XenesisDeskActionExecutionResult[],
    leadText = '',
  ): 'pending' | 'applied' | 'failed' {
    appendXenesisDeskActionResultsToLog(results);
    const pendingActions = pendingXenesisDeskActionsFromResults(actions, results);
    if (pendingActions.length > 0) {
      replaceChatMessage(messageId, {
        role: 'assistant',
        kind: 'approval',
        content: buildXenesisDeskActionPendingMessage(pendingActions, leadText),
        deskActions: pendingActions,
        deskActionStatus: 'pending',
        deskActionResults: results,
        error: false,
        streaming: false,
      });
      return 'pending';
    }

    const failed = results.some((result) => !result.ok);
    const completedMessage = buildXenesisDeskActionCompletedMessage(results);
    replaceChatMessage(messageId, {
      role: failed ? 'system' : 'assistant',
      kind: failed ? 'error' : 'status',
      content: [leadText.trim(), leadText.trim() ? '' : undefined, completedMessage]
        .filter((line): line is string => line !== undefined)
        .join('\n'),
      deskActions: actions,
      deskActionStatus: failed ? 'failed' : 'applied',
      deskActionResults: results,
      error: failed,
      streaming: false,
    });
    return failed ? 'failed' : 'applied';
  }

  async function approvePendingDeskActionMessage(messageId?: string, inputText = '승인'): Promise<boolean> {
    const pendingMessage = messageId
      ? xenesisAgentStateStore.getSnapshot().messages.find((message) => message.id === messageId) || null
      : latestPendingDeskActionMessage();
    const pendingActions = pendingMessage?.deskActions || [];
    if (
      !pendingMessage ||
      (pendingMessage.deskActionStatus && pendingMessage.deskActionStatus !== 'pending') ||
      pendingActions.length === 0
    ) {
      return false;
    }

    if (inputText.trim()) appendChatMessage({ role: 'user', content: inputText.trim() });
    const approvedActions = approveXenesisDeskActions(pendingActions);
    replaceChatMessage(pendingMessage.id, {
      role: 'assistant',
      kind: 'status',
      content: '승인된 Desk action을 실행하고 있습니다...',
      deskActions: approvedActions,
      deskActionStatus: 'running',
      error: false,
      streaming: true,
    });
    appendRawStreamEntry({
      kind: 'desk_tool_call',
      summary: `Approved Desk action(s): ${approvedActions.map((action) => action.path).join(', ')}`,
      detail: stringifyDetail(approvedActions),
    });

    try {
      const results = await executeXenesisDeskActionRequests(approvedActions);
      settleXenesisDeskActionMessage(pendingMessage.id, approvedActions, results);
      void refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      xenesisAgentStateStore.update({ error: message });
      appendRawStreamEntry({ kind: 'desk_tool_error', summary: message, error: true });
      replaceChatMessage(pendingMessage.id, {
        role: 'system',
        kind: 'error',
        content: message,
        deskActions: approvedActions,
        deskActionStatus: 'failed',
        error: true,
        streaming: false,
      });
    }
    return true;
  }

  async function approveAlwaysPendingDeskActionMessage(messageId: string): Promise<boolean> {
    const pendingMessage = xenesisAgentStateStore.getSnapshot().messages.find((message) => message.id === messageId);
    const pendingActions = pendingMessage?.deskActions || [];
    if (
      !pendingMessage ||
      (pendingMessage.deskActionStatus && pendingMessage.deskActionStatus !== 'pending') ||
      pendingActions.length === 0
    ) {
      return false;
    }

    // Persist a standing approval for each pending capability under the SAME
    // source the call actually used (read from the execution result), so the
    // identical action on a later turn clears the approval gate automatically.
    // Source is derived from runtime, not hardcoded, so it generalizes across
    // whatever provider/path produced the approval-required result.
    try {
      const api = getDeskBridgeApi();
      const sourceByActionId = new Map(
        (pendingMessage.deskActionResults || []).map((result) => [result.id, result.source]),
      );
      await api?.rememberCapabilityApprovals(
        pendingActions.map((action) => {
          const source = sourceByActionId.get(action.id);
          return {
            path: action.path,
            args: action.args,
            ...(source ? { source: source as 'internal' | 'mcp' | 'gowoori' | 'workflow' | 'xenesis' } : {}),
          };
        }),
      );
    } catch (error) {
      appendRawStreamEntry({
        kind: 'desk_tool_error',
        summary: `항상 승인 저장 실패: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
      });
    }
    return approvePendingDeskActionMessage(messageId, '항상 승인');
  }

  function cancelPendingDeskActionMessage(messageId: string): void {
    const pendingMessage = xenesisAgentStateStore.getSnapshot().messages.find((message) => message.id === messageId);
    if (!pendingMessage || pendingMessage.deskActionStatus !== 'pending') return;
    replaceChatMessage(messageId, {
      role: 'system',
      kind: 'status',
      content: 'Desk action 요청을 취소했습니다.',
      deskActions: pendingMessage.deskActions || [],
      deskActionStatus: 'cancelled',
      error: false,
      streaming: false,
    });
  }

  async function runPrompt(
    input = prompt,
    runMode: XenesisMode = mode,
    displayInput = input,
    runAttachments: XenesisAgentAttachment[] = [],
    contextMessages = xenesisAgentStateStore.getSnapshot().messages,
    routingOptions: XenesisAgentPromptRoutingOptions = {},
  ): Promise<void> {
    const trimmedPrompt = input.trim();
    if (!trimmedPrompt) {
      xenesisAgentStateStore.update({ error: 'Enter a prompt before running Xenesis.' });
      return;
    }
    if (running) {
      appendChatMessage({ role: 'user', content: displayInput.trim() || trimmedPrompt });
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: 'Xenesis is already running. Use /cancel to stop the active run.',
        error: true,
      });
      return;
    }

    const directDeskActionRequest = routingOptions.bypassDirectDeskRouting
      ? null
      : parseXenesisDeskActionBlocks(trimmedPrompt);
    if (directDeskActionRequest && shouldRunXenesisDeskActionsDirectly(directDeskActionRequest)) {
      xenesisAgentStateStore.update({ running: true, error: '', prompt: '' });
      appendChatMessage({
        role: 'user',
        content: directDeskActionRequest.visibleText || 'Desk action request',
        kind: 'command',
      });
      const assistantMessageId = appendChatMessage({
        role: 'assistant',
        content: 'Applying Desk action...',
        streaming: true,
      });
      setActiveXenesisAssistantMessage(assistantMessageId);
      appendRawStreamEntry({
        kind: 'desk_tool_call',
        summary: 'Direct Desk action prompt',
        detail: trimmedPrompt,
      });
      for (const error of directDeskActionRequest.errors) {
        appendRawStreamEntry({
          kind: 'desk_action_parse_error',
          summary: error,
          error: true,
        });
      }
      try {
        const deskActionResults = await executeXenesisDeskActionRequests(directDeskActionRequest.actions);
        settleXenesisDeskActionMessage(
          assistantMessageId,
          directDeskActionRequest.actions,
          deskActionResults,
          directDeskActionRequest.visibleText,
        );
        void refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        xenesisAgentStateStore.update({ error: message });
        appendRawStreamEntry({ kind: 'desk_tool_error', summary: message, error: true });
        replaceChatMessage(assistantMessageId, {
          role: 'system',
          content: message,
          error: true,
          streaming: false,
        });
      } finally {
        clearActiveXenesisAssistantMessage(assistantMessageId);
        xenesisAgentStateStore.update({ running: false });
      }
      return;
    }

    const naturalDeskActionRequest = routingOptions.bypassNaturalDeskRouting
      ? null
      : planXenesisDeskNaturalLanguageActions(trimmedPrompt);
    if (naturalDeskActionRequest && shouldRunXenesisDeskActionsDirectly(naturalDeskActionRequest)) {
      xenesisAgentStateStore.update({ running: true, error: '', prompt: '' });
      appendChatMessage({
        role: 'user',
        content: naturalDeskActionRequest.visibleText || displayInput.trim() || trimmedPrompt,
        kind: 'command',
      });
      const assistantMessageId = appendChatMessage({
        role: 'assistant',
        content: 'Applying Desk action...',
        streaming: true,
      });
      setActiveXenesisAssistantMessage(assistantMessageId);
      appendRawStreamEntry({
        kind: 'desk_tool_call',
        summary: 'Direct natural Desk action prompt',
        detail: trimmedPrompt,
      });
      try {
        const deskActionResults = await executeXenesisDeskActionRequests(naturalDeskActionRequest.actions);
        settleXenesisDeskActionMessage(
          assistantMessageId,
          naturalDeskActionRequest.actions,
          deskActionResults,
          naturalDeskActionRequest.visibleText,
        );
        void refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        xenesisAgentStateStore.update({ error: message });
        appendRawStreamEntry({ kind: 'desk_tool_error', summary: message, error: true });
        replaceChatMessage(assistantMessageId, {
          role: 'system',
          content: message,
          error: true,
          streaming: false,
        });
      } finally {
        clearActiveXenesisAssistantMessage(assistantMessageId);
        xenesisAgentStateStore.update({ running: false });
      }
      return;
    }

    if (!xenesisApi) {
      xenesisAgentStateStore.update({ error: XENESIS_API_UNAVAILABLE });
      appendRawStreamEntry({ kind: 'api_unavailable', summary: XENESIS_API_UNAVAILABLE, error: true });
      return;
    }

    xenesisAgentStateStore.update({ running: true, error: '', prompt: '' });
    appendChatMessage({ role: 'user', content: displayInput.trim() || trimmedPrompt });
    const assistantMessageId = appendChatMessage({ role: 'assistant', content: '', streaming: true });
    setActiveXenesisAssistantMessage(assistantMessageId);
    appendRawStreamEntry({
      kind: 'run',
      summary: trimmedPrompt.split(/\r?\n/)[0]?.slice(0, 120) || 'Xenesis run started',
      detail: trimmedPrompt,
    });
    const runContextDetail = buildXenesisAgentRunContextDetail({
      prompt: trimmedPrompt,
      contextMessages,
    });
    if (runContextDetail) {
      appendRawStreamEntry({
        kind: 'chat_context',
        summary: 'Recent conversation context attached to follow-up prompt',
        detail: runContextDetail,
      });
    }
    const runSessionId = xenesisAgentStateStore.getSnapshot().activeSessionId.trim();
    const providerAttachments = toXenesisProviderAttachments(runAttachments);

    try {
      const currentStatus = status?.ok ? status : await refresh();
      const result = await xenesisApi.run(
        buildXenesisAgentRunRequest({
          prompt: trimmedPrompt,
          mode: runMode,
          workspace: currentStatus?.workspace || undefined,
          source: 'xenesis-xenesis-agent',
          context: await buildDeskRunContext(messages, currentStatus),
          activeSessionId: runSessionId,
          contextMessages,
          attachments: providerAttachments,
        }),
      );
      const artifactCount = await persistXenesisArtifactSession(trimmedPrompt, runMode, result);
      recordXenesisRunDiagnostics(result, artifactCount, currentStatus);
      if (result.sessionId || result.id) {
        xenesisAgentStateStore.update({ activeSessionId: result.sessionId || result.id || '' });
      }
      appendRawStreamEntry({
        kind: result.ok ? 'result' : 'run_error',
        summary: result.ok ? 'Run completed' : 'Run failed',
        detail: stringifyDetail(result),
        error: !result.ok,
      });
      appendPolicyNotices(extractXenesisPolicyNotices(result));
      setPolicySnapshot(extractXenesisPolicySnapshot(result));
      flushXenesisAssistantStream();
      const streamedAssistantText =
        xenesisAgentStateStore.getSnapshot().messages.find((message) => message.id === assistantMessageId)?.content ||
        '';
      const finalAssistantText = resolveXenesisAssistantText(result, streamedAssistantText);
      const parsedFinalAssistantText = parseXenesisDeskActionBlocks(finalAssistantText);
      const parsedStreamedAssistantText = parseXenesisDeskActionBlocks(
        sanitizeXenesisAssistantTextCandidate(streamedAssistantText),
      );
      const visibleFinalAssistantText =
        parsedFinalAssistantText.visibleText || (parsedFinalAssistantText.actions.length > 0 ? '' : finalAssistantText);
      const safeVisibleFinalAssistantText = visibleFinalAssistantText.trim()
        ? visibleFinalAssistantText
        : result.ok && parsedFinalAssistantText.actions.length > 0
          ? ''
          : result.ok
            ? '응답을 완료했지만 표시할 내용이 없습니다. Raw 로그를 확인해 주세요.'
            : 'Xenesis run failed.';
      if (parsedFinalAssistantText.errors.length > 0) {
        appendRawStreamEntry({
          kind: 'desk_action_parse_error',
          summary: `${parsedFinalAssistantText.errors.length} Desk action parse issue(s)`,
          detail: parsedFinalAssistantText.errors.join('\n'),
          error: true,
        });
      }
      if (result.ok && safeVisibleFinalAssistantText) {
        await revealAssistantMessageProgressively(
          assistantMessageId,
          safeVisibleFinalAssistantText,
          'assistant',
          false,
          Boolean(parsedStreamedAssistantText.visibleText),
        );
      } else {
        replaceChatMessage(assistantMessageId, {
          role: result.ok ? 'assistant' : 'system',
          content: safeVisibleFinalAssistantText,
          error: !result.ok,
          streaming: false,
        });
      }
      if (result.ok && parsedFinalAssistantText.actions.length > 0) {
        for (const action of parsedFinalAssistantText.actions) {
          appendRawStreamEntry({
            kind: 'desk_tool_call',
            summary: `Native Desk action: ${action.path}`,
            detail: stringifyDetail(action),
          });
        }
        const deskActionResults = await executeXenesisDeskActionRequests(parsedFinalAssistantText.actions);
        settleXenesisDeskActionMessage(
          assistantMessageId,
          parsedFinalAssistantText.actions,
          deskActionResults,
          safeVisibleFinalAssistantText,
        );
      }
      if (!result.ok) {
        xenesisAgentStateStore.update({ error: result.error || result.errors || 'Xenesis run failed.' });
      }
      void refresh();
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : String(runError);
      xenesisAgentStateStore.update({ error: message });
      appendRawStreamEntry({ kind: 'run_error', summary: message, error: true });
      flushXenesisAssistantStream();
      replaceChatMessage(assistantMessageId, {
        role: 'system',
        content: message,
        error: true,
        streaming: false,
      });
    } finally {
      clearActiveXenesisAssistantMessage(assistantMessageId);
      xenesisAgentStateStore.update({ running: false });
    }
  }

  async function runArtifactPrompt(
    input: string,
    displayInput = input,
    contextMessages = xenesisAgentStateStore.getSnapshot().messages,
  ): Promise<void> {
    const trimmedPrompt = input.trim();
    if (!trimmedPrompt) {
      appendChatMessage({ role: 'system', kind: 'error', content: 'usage: /artifact <prompt>', error: true });
      return;
    }
    if (running) {
      appendChatMessage({ role: 'user', content: displayInput.trim() || trimmedPrompt });
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: 'Xenesis is already running. Use /cancel to stop the active run.',
        error: true,
      });
      return;
    }

    const startedAt = Date.now();
    const artifactPromptContext = buildXenesisArtifactPromptWithContext({
      prompt: trimmedPrompt,
      messages: contextMessages,
    });
    const providerPrompt = artifactPromptContext.prompt;
    const providerLabel = getGowooriProviderDefinition(artifactProvider).label;
    const streamMergeKey = `artifact-stream-${startedAt}-${providerLabel.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'provider'}`;
    let streamChunkCount = 0;
    let streamCharsReceived = 0;
    let artifactStreamStarted = false;
    xenesisAgentStateStore.update({ running: true, error: '', prompt: '' });
    appendChatMessage({ role: 'user', content: displayInput.trim() || trimmedPrompt });
    const assistantMessageId = appendChatMessage({ role: 'assistant', content: '', streaming: true });
    setActiveXenesisAssistantMessage(assistantMessageId);
    appendRawStreamEntry({
      kind: 'artifact',
      summary: trimmedPrompt.split(/\r?\n/)[0]?.slice(0, 120) || 'XCON artifact generation started',
      detail: providerPrompt,
    });
    if (artifactPromptContext.contextApplied) {
      appendRawStreamEntry({
        kind: 'artifact_context',
        summary: 'Artifact follow-up context applied',
        detail: [
          `displayPrompt: ${trimmedPrompt}`,
          `previousUserPrompt: ${artifactPromptContext.previousUserPrompt || '-'}`,
          'previousAssistantText:',
          artifactPromptContext.previousAssistantText,
        ].join('\n'),
      });
    }

    try {
      let lastStatusAt = 0;
      const replaceArtifactStatusMessage = (content: string) => {
        if (artifactStreamStarted || streamChunkCount > 0) return;
        replaceChatMessage(assistantMessageId, {
          role: 'assistant',
          content,
          streaming: true,
        });
      };
      const artifactExecution: XconArtifactProviderExecutionOptions = {
        providerSettings: artifactProviderSettings,
        terminalApi: window.terminalAPI,
        resolveApiRuntime: resolveLatestArtifactApiRuntime,
        createAbortController: () => new AbortController(),
        onAbortController: (controller: AbortController) => {
          artifactAbortControllerRef.current = controller;
        },
        onStatus: (statusMessage: string) => {
          const now = Date.now();
          if (now - lastStatusAt < 650) return;
          lastStatusAt = now;
          replaceArtifactStatusMessage(`${providerLabel}: ${statusMessage}`);
        },
        onChunk: (chunk: string) => {
          if (!chunk) return;
          if (!artifactStreamStarted) {
            artifactStreamStarted = true;
            replaceChatMessage(assistantMessageId, {
              role: 'assistant',
              content: '',
              streaming: true,
            });
          }
          streamChunkCount += 1;
          streamCharsReceived += chunk.length;
          pushFilteredXenesisAssistantStreamDelta(assistantMessageId, chunk);
          mergeRawStreamEntry({
            mergeKey: streamMergeKey,
            kind: 'artifact_stream',
            summary: `${providerLabel} streaming`,
            detailDelta: chunk,
            chunkCount: streamChunkCount,
            bytesReceived: streamCharsReceived,
          });
        },
        onProgress: (event) => {
          const elapsed =
            event.elapsedMs >= 1000
              ? `${(event.elapsedMs / 1000).toFixed(1)}s`
              : `${Math.max(0, Math.round(event.elapsedMs))}ms`;
          replaceArtifactStatusMessage(`${providerLabel}: ${event.phase} · ${elapsed} · ${event.outputBytes} bytes`);
        },
        onToolProgress: (progress) => {
          const toolLabel = progress.call?.name ?? 'gowoori-agent-tools';
          appendRawStreamEntry({
            kind: 'artifact_tool',
            summary: `${toolLabel}: ${progress.phase}`,
            detail: stringifyDetail(progress),
            error: progress.phase === 'failed',
          });
        },
        onToolApprovalsRequired: (approvals) => {
          appendRawStreamEntry({
            kind: 'artifact_tool_approval',
            summary: `${approvals.length} tool approval(s) required`,
            detail: stringifyDetail(approvals),
            error: approvals.length > 0,
          });
        },
        cliStatus: (command: string) => `${command} is generating a renderable XCON/SKETCH artifact...`,
        apiStatus: (profileName: string) => `${profileName} is generating a renderable XCON/SKETCH artifact...`,
        agentTools: artifactAgentTools,
        writePromptFile: writeXenesisArtifactPromptFile,
      };
      const { plan, providerResult } = await runXconArtifactProvider({
        surface: 'xenesis',
        provider: artifactProvider,
        mode: 'generate',
        prompt: providerPrompt,
        semanticPrompt: trimmedPrompt,
        execution: artifactExecution,
      });
      if (providerResult.kind !== 'artifact') {
        throw new Error(
          `${providerResult.provider} returned a ${providerResult.kind} plan instead of a renderable artifact.`,
        );
      }
      const applyLabel = artifactPromptContext.applyLabel || plan.route.description || trimmedPrompt;
      const resultInput = {
        surface: 'xenesis',
        provider: providerResult.provider,
        mode: 'generate',
        prompt: providerPrompt,
        semanticPrompt: trimmedPrompt,
        applyLabel,
        source: providerResult.source,
        summary: providerResult.summary,
        autoApply: true,
        startedAt,
        completedAt: Date.now(),
      } as const;
      const initialArtifact = prepareXconArtifactResult(resultInput);
      const repairOutcome = await runXconArtifactAutomaticRepair({
        initialArtifact,
        resultInput,
        execution: {
          ...artifactExecution,
          cliStatus: (command) => `${command} is repairing the XCON/SKETCH artifact...`,
          apiStatus: (profileName) => `${profileName} is repairing the XCON/SKETCH artifact...`,
        },
        onRepairPrompt: (repairPrompt) => {
          appendRawStreamEntry({
            kind: 'artifact_repair',
            summary: 'Automatic XCON repair request',
            detail: repairPrompt.slice(0, 8000),
          });
        },
        onRepairProviderResult: (repairResult) => {
          appendRawStreamEntry({
            kind: repairResult.kind === 'artifact' ? 'artifact_repair' : 'artifact_warning',
            summary:
              repairResult.kind === 'artifact'
                ? `Automatic repair returned ${repairResult.source.length} chars`
                : `Automatic repair returned ${repairResult.kind}`,
            detail: stringifyDetail(repairResult),
            error: repairResult.kind !== 'artifact',
          });
        },
      });
      const artifact = repairOutcome.finalArtifact;
      writeLatestXenesisArtifactSourceForAutomation(artifact.finalSource, applyLabel);
      if (repairOutcome.autoRepairAttempted) {
        appendRawStreamEntry({
          kind: repairOutcome.autoRepairSucceeded ? 'artifact_result' : 'artifact_warning',
          summary: repairOutcome.autoRepairSucceeded
            ? `Automatic repair fixed diagnostics (${repairOutcome.repairBeforeDiagnosticsCount} -> ${repairOutcome.repairAfterDiagnosticsCount})`
            : `Automatic repair attempted (${repairOutcome.repairBeforeDiagnosticsCount} -> ${repairOutcome.repairAfterDiagnosticsCount})`,
          detail: artifact.finalSource,
          error: !repairOutcome.autoRepairSucceeded,
        });
      }
      const transcriptSummary = createXconArtifactTranscriptSummary(artifact);
      const diagnosticTranscript = createXconArtifactDiagnosticTranscript(artifact);
      const shouldOpenGowoori =
        shouldAutoOpenXenesisArtifactInGowoori(displayInput) || shouldAutoOpenXenesisArtifactInGowoori(trimmedPrompt);
      const gowooriApplyState: 'applied' | 'opened' | 'skipped' | 'inline' =
        artifact.actionState.canPreview && shouldOpenGowoori
          ? await applyXenesisArtifactToGowoori(artifact.finalSource, applyLabel)
          : 'inline';
      appendRawStreamEntry({
        kind: artifact.validationOk ? 'artifact_result' : 'artifact_warning',
        summary:
          gowooriApplyState === 'inline' || gowooriApplyState === 'skipped'
            ? transcriptSummary
            : `${transcriptSummary} · Gowoori ${gowooriApplyState}`,
        detail: artifact.finalSource,
        error: !artifact.actionState.canPreview,
      });
      if (diagnosticTranscript) {
        appendRawStreamEntry({
          kind: 'artifact_warning',
          summary: 'XCON diagnostics',
          detail: diagnosticTranscript,
          error: !artifact.validationOk,
        });
      }
      flushXenesisAssistantStream();
      replaceChatMessage(assistantMessageId, {
        role: 'assistant',
        content: [
          `XCON artifact: ${transcriptSummary}`,
          gowooriApplyState === 'opened'
            ? 'Opened a Gowoori pane and sent the artifact.'
            : gowooriApplyState === 'applied'
              ? 'Sent the artifact to open Gowoori panes.'
              : 'Rendered inside Xenesis Agent. Use the action buttons below to open this result in Gowoori or overlay.',
          artifact.finalSource,
        ]
          .filter(Boolean)
          .join('\n\n'),
        streaming: false,
      });
    } catch (artifactError) {
      const message = artifactError instanceof Error ? artifactError.message : String(artifactError);
      xenesisAgentStateStore.update({ error: message });
      appendRawStreamEntry({ kind: 'artifact_error', summary: message, error: true });
      flushXenesisAssistantStream();
      replaceChatMessage(assistantMessageId, {
        role: 'system',
        content: message,
        error: true,
        streaming: false,
      });
    } finally {
      clearActiveXenesisAssistantMessage(assistantMessageId);
      artifactAbortControllerRef.current = null;
      xenesisAgentStateStore.update({ running: false });
    }
  }

  async function runGowooriCrOrchestration(input: string, displayInput = `/gowoori-smoke ${input}`): Promise<void> {
    const trimmedPrompt = input.trim();
    if (!trimmedPrompt) {
      appendChatMessage({ role: 'system', kind: 'error', content: 'usage: /gowoori-smoke <prompt>', error: true });
      return;
    }
    if (running) {
      appendChatMessage({ role: 'user', content: displayInput.trim() || trimmedPrompt, kind: 'command' });
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: 'Xenesis is already running. Use /cancel to stop the active run.',
        error: true,
      });
      return;
    }

    const providerLabel = getGowooriProviderDefinition(artifactProvider).label;
    xenesisAgentStateStore.update({ running: true, error: '', prompt: '' });
    appendChatMessage({
      role: 'user',
      content: displayInput.trim() || `/gowoori-smoke ${trimmedPrompt}`,
      kind: 'command',
    });
    const assistantMessageId = appendChatMessage({
      role: 'assistant',
      content: 'Preparing Gowoori CR orchestration...',
      streaming: true,
    });
    setActiveXenesisAssistantMessage(assistantMessageId);

    const callCr = async (path: string, args: Record<string, unknown> = {}) => {
      appendRawStreamEntry({
        kind: 'desk_tool_call',
        summary: `Desk tool call: ${path}`,
        detail: stringifyDetail(args),
      });
      replaceChatMessage(assistantMessageId, {
        role: 'assistant',
        content: `Calling ${path}...`,
        streaming: true,
      });
      const result = await callGowooriDeskCapability(path, args, { approved: true });
      appendRawStreamEntry({
        kind: result.ok ? 'desk_tool_result' : 'desk_tool_error',
        summary: `Desk tool result: ${path} ${result.ok ? 'ok' : 'failed'}`,
        detail: stringifyDetail(result),
        error: !result.ok,
      });
      if (!result.ok) {
        throw new Error(result.error || `${path} failed`);
      }
      return result;
    };

    try {
      await callCr('xd.window.sizer.applyPreset', { presetId: 'qhd' });
      await callCr('xd.dock.sizes.set', { right: 720, bottom: 180 });
      const gowooriOpen = await callCr('xd.views.open', { kind: 'gowoori', placement: 'tab' });
      const gowooriContentId = readDeskCapabilityString(gowooriOpen, ['contentId', 'id']);
      await callCr(
        'xd.dock.artifactTarget.set',
        gowooriContentId ? { contentId: gowooriContentId } : { useActive: true },
      );
      await callCr('xd.views.open', { kind: 'gowooriChat', placement: 'right' });
      await callCr('xd.gowoori.chat.run', {
        prompt: trimmedPrompt,
        provider: artifactProvider,
        requestMode: 'generate',
        targetMode: gowooriContentId ? 'selected' : 'new',
        ...(gowooriContentId ? { targetContentId: gowooriContentId } : {}),
        autoApply: true,
        timeoutMs: Math.max(120000, Number(artifactProviderSettings.timeoutMs || 0)),
      });
      const captureResult = await callCr('xd.capture.activePane', {
        ...(gowooriContentId ? { contentId: gowooriContentId } : {}),
        preferArtifactPane: true,
      });
      const captureArtifact = readDeskCapabilityArtifact(captureResult);
      const captureFilePath = typeof captureArtifact?.filePath === 'string' ? captureArtifact.filePath : '';
      const captureFileName = typeof captureArtifact?.fileName === 'string' ? captureArtifact.fileName : '';
      const captureList = await callCr('xd.capture.list');
      const listedCapture = readDeskCapabilityArtifact(captureList);
      const thumbnailArgs = {
        filePath: captureFilePath || (typeof listedCapture?.filePath === 'string' ? listedCapture.filePath : ''),
        fileName: captureFileName || (typeof listedCapture?.fileName === 'string' ? listedCapture.fileName : ''),
      };
      const thumbnailResult = await callCr('xd.capture.thumbnail', thumbnailArgs);
      const thumbnailDataUrl = readDeskCapabilityString(thumbnailResult, ['dataUrl', 'thumbnail']);

      replaceChatMessage(assistantMessageId, {
        role: 'assistant',
        content: [
          'Gowoori CR orchestration completed.',
          '',
          `- provider: ${providerLabel}`,
          `- prompt: ${trimmedPrompt}`,
          `- Gowoori content: ${gowooriContentId || 'active artifact pane'}`,
          `- capture: ${captureFilePath || captureFileName || 'created'}`,
          `- thumbnail: ${thumbnailDataUrl ? `${thumbnailDataUrl.length} chars` : 'available through capture list'}`,
        ].join('\n'),
        streaming: false,
      });
    } catch (orchestrationError) {
      const message = orchestrationError instanceof Error ? orchestrationError.message : String(orchestrationError);
      xenesisAgentStateStore.update({ error: message });
      appendRawStreamEntry({ kind: 'desk_tool_error', summary: message, error: true });
      replaceChatMessage(assistantMessageId, {
        role: 'system',
        content: `Gowoori CR orchestration failed: ${message}`,
        error: true,
        streaming: false,
      });
    } finally {
      clearActiveXenesisAssistantMessage(assistantMessageId);
      xenesisAgentStateStore.update({ running: false });
    }
  }

  async function runVisibleSubagentsDemo(input: string, displayInput = '/subagents-demo'): Promise<void> {
    if (running) {
      appendChatMessage({ role: 'user', content: displayInput.trim() || '/subagents-demo', kind: 'command' });
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: 'Xenesis is already running. Use /cancel to stop the active run.',
        error: true,
      });
      return;
    }

    const { keepOpen, closeAfter, showMs, sleepSeconds } = parseXenesisVisibleSubagentRunOptions(input);
    const workers = buildXenesisVisibleSubagentsDemoWorkers({ sleepSeconds });
    const workspace = status?.workspace || undefined;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, Math.max(0, ms));
      });

    xenesisAgentStateStore.update({ running: true, error: '', prompt: '' });
    appendChatMessage({ role: 'user', content: displayInput.trim() || '/subagents-demo', kind: 'command' });
    const assistantMessageId = appendChatMessage({
      role: 'assistant',
      content: 'Starting four visible Xenesis subagents through Capability Registry...',
      streaming: true,
    });
    setActiveXenesisAssistantMessage(assistantMessageId);

    const callCr = async (path: string, args: Record<string, unknown> = {}, message?: string) => {
      appendRawStreamEntry({
        kind: 'desk_tool_call',
        summary: `Desk tool call: ${path}`,
        detail: stringifyDetail(args),
      });
      if (message) {
        replaceChatMessage(assistantMessageId, {
          role: 'assistant',
          content: message,
          streaming: true,
        });
      }
      const result = await callGowooriDeskCapability(path, args, { approved: true });
      appendRawStreamEntry({
        kind: result.ok ? 'desk_tool_result' : 'desk_tool_error',
        summary: `Desk tool result: ${path} ${result.ok ? 'ok' : 'failed'}`,
        detail: stringifyDetail(result),
        error: !result.ok,
      });
      if (!result.ok) throw new Error(result.error || `${path} failed`);
      return result;
    };

    const waitForWorkerMarker = async (worker: (typeof workers)[number], timeoutMs = 15000) => {
      const started = Date.now();
      let lastResult: unknown = null;
      while (Date.now() - started <= timeoutMs) {
        const result = await callGowooriDeskCapability(
          'xd.terminals.tail',
          { id: worker.id, maxBytes: 12000 },
          { approved: false },
        );
        lastResult = result;
        const summary = summarizeXenesisVisibleSubagentTail(worker, result);
        if (result.ok !== false && summary.markerFound) {
          appendRawStreamEntry({
            kind: 'desk_tool_result',
            summary: `Desk tool result: xd.terminals.tail marker ok ${worker.id}`,
            detail: stringifyDetail(summary),
          });
          return { ...summary, ok: true };
        }
        await wait(500);
      }
      const summary = summarizeXenesisVisibleSubagentTail(worker, lastResult);
      appendRawStreamEntry({
        kind: 'desk_tool_error',
        summary: `Desk tool result: xd.terminals.tail marker missing ${worker.id}`,
        detail: stringifyDetail(summary),
        error: true,
      });
      return { ...summary, ok: false };
    };

    try {
      await callCr(
        'xd.dock.sizes.set',
        { right: 760, bottom: 170 },
        'Preparing a readable Xenesis subagent workspace...',
      );

      for (const [index, worker] of workers.entries()) {
        const args = buildXenesisVisibleSubagentTerminalArgs(worker, {
          cwd: workspace,
          shell: 'powershell',
          parentTermId: 'xenesis-agent-default',
        });
        await callCr(
          'xd.terminals.run',
          args as unknown as Record<string, unknown>,
          `Starting visible subagent ${index + 1}/${workers.length}: ${worker.title}`,
        );
      }

      await callCr(
        'xd.dock.window.arrange',
        { windowState: 'document', mode: 'grid' },
        'Arranging document terminals as a grid...',
      );

      replaceChatMessage(assistantMessageId, {
        role: 'assistant',
        content: 'Verifying subagent terminal markers...',
        streaming: true,
      });
      const markerResults = [];
      for (const worker of workers) {
        markerResults.push(await waitForWorkerMarker(worker));
      }

      if (showMs > 0) {
        replaceChatMessage(assistantMessageId, {
          role: 'assistant',
          content: `Visible subagents are running in the document grid. Waiting ${showMs}ms before cleanup...`,
          streaming: true,
        });
        await wait(showMs);
      }

      const stopped: Array<{ id: string; ok: boolean }> = [];
      if (!keepOpen) {
        for (const worker of workers) {
          const result = await callCr(
            'xd.terminals.stop',
            { id: worker.id },
            `Stopping visible subagent: ${worker.title}`,
          );
          stopped.push({ id: worker.id, ok: result.ok !== false });
          if (closeAfter) {
            await callCr('xd.dock.close', { contentId: worker.id }, `Closing subagent tab: ${worker.title}`);
          }
        }
      }

      const passedMarkers = markerResults.filter((result) => result.ok).length;
      const stoppedCount = stopped.filter((result) => result.ok).length;
      const workerSummaryLines = markerResults.map((result) => `- ${result.title}: ${result.summary}`);
      const finalLines = [
        'Visible Xenesis subagent demo completed.',
        '',
        `- started: ${workers.length}`,
        `- marker checks: ${passedMarkers}/${workers.length}`,
        '- layout: document grid',
        keepOpen ? '- cleanup: kept open by request' : `- stopped: ${stoppedCount}/${workers.length}`,
      ];
      if (closeAfter && !keepOpen) finalLines.push('- tabs: closed after stop');
      finalLines.push('', 'worker summaries:', ...workerSummaryLines);
      replaceChatMessage(assistantMessageId, {
        role: 'assistant',
        content: finalLines.join('\n'),
        streaming: false,
      });
    } catch (demoError) {
      const message = demoError instanceof Error ? demoError.message : String(demoError);
      xenesisAgentStateStore.update({ error: message });
      appendRawStreamEntry({ kind: 'desk_tool_error', summary: message, error: true });
      replaceChatMessage(assistantMessageId, {
        role: 'system',
        content: `Visible Xenesis subagent demo failed: ${message}`,
        error: true,
        streaming: false,
      });
    } finally {
      clearActiveXenesisAssistantMessage(assistantMessageId);
      xenesisAgentStateStore.update({ running: false });
    }
  }

  async function runVisibleSubagentsWork(input: string, displayInput = '/subagents-work'): Promise<void> {
    if (running) {
      appendChatMessage({ role: 'user', content: displayInput.trim() || '/subagents-work', kind: 'command' });
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: 'Xenesis is already running. Use /cancel to stop the active run.',
        error: true,
      });
      return;
    }

    const { keepOpen, closeAfter, showMs, sleepSeconds, taskInput } = parseXenesisVisibleSubagentRunOptions(input, {
      defaultTask: 'Inspect the current Xenesis Desk workspace and report status.',
    });
    const workers = buildXenesisVisibleSubagentWorkWorkers(taskInput, { sleepSeconds });
    let workspace = status?.workspace || undefined;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, Math.max(0, ms));
      });

    xenesisAgentStateStore.update({ running: true, error: '', prompt: '' });
    appendChatMessage({ role: 'user', content: displayInput.trim() || '/subagents-work', kind: 'command' });
    const assistantMessageId = appendChatMessage({
      role: 'assistant',
      content: 'Starting four visible Xenesis work subagents through Capability Registry...',
      streaming: true,
    });
    setActiveXenesisAssistantMessage(assistantMessageId);

    const callCr = async (path: string, args: Record<string, unknown> = {}, message?: string) => {
      appendRawStreamEntry({
        kind: 'desk_tool_call',
        summary: `Desk tool call: ${path}`,
        detail: stringifyDetail(args),
      });
      if (message) {
        replaceChatMessage(assistantMessageId, {
          role: 'assistant',
          content: message,
          streaming: true,
        });
      }
      const result = await callGowooriDeskCapability(path, args, { approved: true });
      appendRawStreamEntry({
        kind: result.ok ? 'desk_tool_result' : 'desk_tool_error',
        summary: `Desk tool result: ${path} ${result.ok ? 'ok' : 'failed'}`,
        detail: stringifyDetail(result),
        error: !result.ok,
      });
      if (!result.ok) throw new Error(result.error || `${path} failed`);
      return result;
    };

    const waitForWorkerMarker = async (worker: (typeof workers)[number], timeoutMs = 120000) => {
      const started = Date.now();
      let lastResult: unknown = null;
      while (Date.now() - started <= timeoutMs) {
        const result = await callGowooriDeskCapability(
          'xd.terminals.tail',
          { id: worker.id, maxBytes: 20000 },
          { approved: false },
        );
        lastResult = result;
        const summary = summarizeXenesisVisibleSubagentTail(worker, result);
        if (result.ok !== false && summary.markerFound) {
          appendRawStreamEntry({
            kind: 'desk_tool_result',
            summary: `Desk tool result: xd.terminals.tail marker ok ${worker.id}`,
            detail: stringifyDetail(summary),
          });
          return { ...summary, ok: true };
        }
        await wait(750);
      }
      const summary = summarizeXenesisVisibleSubagentTail(worker, lastResult);
      appendRawStreamEntry({
        kind: 'desk_tool_error',
        summary: `Desk tool result: xd.terminals.tail marker missing ${worker.id}`,
        detail: stringifyDetail(summary),
        error: true,
      });
      return { ...summary, ok: false };
    };

    try {
      const appStatusResult = await callCr('xd.app.status', {}, 'Resolving Desk work directory for subagents...');
      workspace = resolveXenesisVisibleSubagentWorkCwd(workspace, appStatusResult);
      await callCr(
        'xd.dock.sizes.set',
        { right: 760, bottom: 170 },
        'Preparing a readable Xenesis work-subagent workspace...',
      );

      for (const [index, worker] of workers.entries()) {
        const args = buildXenesisVisibleSubagentTerminalArgs(worker, {
          cwd: workspace,
          shell: 'powershell',
          parentTermId: 'xenesis-agent-default',
        });
        await callCr(
          'xd.terminals.run',
          args as unknown as Record<string, unknown>,
          `Starting work subagent ${index + 1}/${workers.length}: ${worker.title}`,
        );
      }

      await callCr(
        'xd.dock.window.arrange',
        { windowState: 'document', mode: 'grid' },
        'Arranging work subagents as a document grid...',
      );

      replaceChatMessage(assistantMessageId, {
        role: 'assistant',
        content: 'Waiting for visible work subagent results...',
        streaming: true,
      });
      const markerResults = [];
      for (const worker of workers) {
        markerResults.push(await waitForWorkerMarker(worker));
      }

      if (showMs > 0) {
        replaceChatMessage(assistantMessageId, {
          role: 'assistant',
          content: `Visible work subagents completed. Holding the grid for ${showMs}ms before cleanup...`,
          streaming: true,
        });
        await wait(showMs);
      }

      const stopped: Array<{ id: string; ok: boolean }> = [];
      if (!keepOpen) {
        for (const worker of workers) {
          const result = await callCr(
            'xd.terminals.stop',
            { id: worker.id },
            `Stopping work subagent: ${worker.title}`,
          );
          stopped.push({ id: worker.id, ok: result.ok !== false });
          if (closeAfter) {
            await callCr('xd.dock.close', { contentId: worker.id }, `Closing work subagent tab: ${worker.title}`);
          }
        }
      }

      const passedMarkers = markerResults.filter((result) => result.ok).length;
      const stoppedCount = stopped.filter((result) => result.ok).length;
      const workerSummaryLines = markerResults.map((result) => `- ${result.title}: ${result.summary}`);
      const finalLines = [
        'Visible Xenesis subagent work completed.',
        '',
        `- task: ${taskInput}`,
        `- cwd: ${workspace || '-'}`,
        `- started: ${workers.length}`,
        `- marker checks: ${passedMarkers}/${workers.length}`,
        '- layout: document grid',
        keepOpen ? '- cleanup: kept open by request' : `- stopped: ${stoppedCount}/${workers.length}`,
      ];
      if (closeAfter && !keepOpen) finalLines.push('- tabs: closed after stop');
      finalLines.push('', 'worker summaries:', ...workerSummaryLines);
      replaceChatMessage(assistantMessageId, {
        role: 'assistant',
        content: finalLines.join('\n'),
        streaming: false,
      });
    } catch (workError) {
      const message = workError instanceof Error ? workError.message : String(workError);
      xenesisAgentStateStore.update({ error: message });
      appendRawStreamEntry({ kind: 'desk_tool_error', summary: message, error: true });
      replaceChatMessage(assistantMessageId, {
        role: 'system',
        content: `Visible Xenesis subagent work failed: ${message}`,
        error: true,
        streaming: false,
      });
    } finally {
      clearActiveXenesisAssistantMessage(assistantMessageId);
      xenesisAgentStateStore.update({ running: false });
    }
  }

  async function runXenesisControlDemo(input: string, displayInput = '/control-demo'): Promise<void> {
    await runVisibleSubagentsWork(buildXenesisControlDemoWorkArgsFromInput(input), displayInput);
  }

  async function runVisibleSubagentsCleanup(displayInput = '/subagents-cleanup'): Promise<void> {
    if (running) {
      appendChatMessage({ role: 'user', content: displayInput.trim() || '/subagents-cleanup', kind: 'command' });
      appendChatMessage({
        role: 'system',
        kind: 'error',
        content: 'Xenesis is already running. Use /cancel to stop the active run.',
        error: true,
      });
      return;
    }

    xenesisAgentStateStore.update({ running: true, error: '', prompt: '' });
    appendChatMessage({ role: 'user', content: displayInput.trim() || '/subagents-cleanup', kind: 'command' });
    const assistantMessageId = appendChatMessage({
      role: 'assistant',
      content: 'Finding visible Xenesis subagent terminals...',
      streaming: true,
    });
    setActiveXenesisAssistantMessage(assistantMessageId);

    const callCr = async (path: string, args: Record<string, unknown> = {}, message?: string) => {
      appendRawStreamEntry({
        kind: 'desk_tool_call',
        summary: `Desk tool call: ${path}`,
        detail: stringifyDetail(args),
      });
      if (message) {
        replaceChatMessage(assistantMessageId, {
          role: 'assistant',
          content: message,
          streaming: true,
        });
      }
      const result = await callGowooriDeskCapability(path, args, { approved: true });
      appendRawStreamEntry({
        kind: result.ok ? 'desk_tool_result' : 'desk_tool_error',
        summary: `Desk tool result: ${path} ${result.ok ? 'ok' : 'failed'}`,
        detail: stringifyDetail(result),
        error: !result.ok,
      });
      if (!result.ok) throw new Error(result.error || `${path} failed`);
      return result;
    };

    try {
      const listResult = await callCr('xd.terminals.list', {}, 'Listing visible Xenesis subagent terminals...');
      const dockResult = await callCr('xd.dock.panes.list', {}, 'Listing visible Xenesis subagent dock tabs...');
      const targetIds = [
        ...new Set([
          ...selectXenesisVisibleSubagentSessionIds(readDeskCapabilitySessions(listResult)),
          ...selectXenesisVisibleSubagentSessionIds(readDeskCapabilityDockContents(dockResult)),
        ]),
      ];
      if (targetIds.length === 0) {
        replaceChatMessage(assistantMessageId, {
          role: 'assistant',
          content: 'Visible Xenesis subagent cleanup completed.\n\n- targets: 0\n- nothing to stop or close',
          streaming: false,
        });
        return;
      }

      let stopped = 0;
      let stopSkipped = 0;
      let closed = 0;
      const failures: string[] = [];
      for (const id of targetIds) {
        try {
          const stopResult = await callCr('xd.terminals.stop', { id }, `Stopping visible subagent terminal: ${id}`);
          if (stopResult.ok !== false) stopped += 1;
        } catch (stopError) {
          const message = stopError instanceof Error ? stopError.message : String(stopError);
          if (/terminal session not found/i.test(message)) {
            stopSkipped += 1;
          } else {
            failures.push(`${id} stop: ${message}`);
          }
        }
        try {
          const closeResult = await callCr('xd.dock.close', { contentId: id }, `Closing visible subagent tab: ${id}`);
          if (closeResult.ok !== false) closed += 1;
        } catch (closeError) {
          failures.push(`${id} close: ${closeError instanceof Error ? closeError.message : String(closeError)}`);
        }
      }

      const finalLines = [
        'Visible Xenesis subagent cleanup completed.',
        '',
        `- targets: ${targetIds.length}`,
        `- stopped: ${stopped}/${targetIds.length}`,
        stopSkipped > 0 ? `- stop skipped: ${stopSkipped} already absent` : '',
        `- closed: ${closed}/${targetIds.length}`,
      ].filter(Boolean);
      if (failures.length > 0) finalLines.push('', 'failures:', ...failures.map((failure) => `- ${failure}`));
      replaceChatMessage(assistantMessageId, {
        role: failures.length > 0 ? 'system' : 'assistant',
        kind: failures.length > 0 ? 'error' : undefined,
        content: finalLines.join('\n'),
        error: failures.length > 0,
        streaming: false,
      });
    } catch (cleanupError) {
      const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      xenesisAgentStateStore.update({ error: message });
      appendRawStreamEntry({ kind: 'desk_tool_error', summary: message, error: true });
      replaceChatMessage(assistantMessageId, {
        role: 'system',
        content: `Visible Xenesis subagent cleanup failed: ${message}`,
        error: true,
        streaming: false,
      });
    } finally {
      clearActiveXenesisAssistantMessage(assistantMessageId);
      xenesisAgentStateStore.update({ running: false });
    }
  }

  async function runSlashCommand(
    line: string,
    displayLine = line,
    contextMessages = xenesisAgentStateStore.getSnapshot().messages,
  ): Promise<void> {
    const command = parseXenesisSlashCommandLine(line);
    if (!command) {
      await runPrompt(line, mode, displayLine, [], contextMessages);
      return;
    }

    switch (command.name) {
      case 'chat':
      case 'plan':
      case 'work': {
        const commandMode = slashModeFromName(command.name)!;
        if (command.rest) {
          xenesisAgentStateStore.update({ mode: commandMode, prompt: '' });
          await runPrompt(command.rest, commandMode, displayLine, [], contextMessages);
          return;
        }
        appendChatMessage({ role: 'user', content: displayLine });
        xenesisAgentStateStore.update({ mode: commandMode, prompt: '' });
        appendChatMessage({ role: 'system', content: `mode: ${commandMode}` });
        return;
      }
      case 'mode': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        const nextMode = slashModeFromName(command.args[0] || '');
        if (!nextMode) {
          appendChatMessage({ role: 'system', kind: 'error', content: 'usage: /mode chat|plan|work', error: true });
          return;
        }
        xenesisAgentStateStore.update({ mode: nextMode, prompt: '' });
        appendChatMessage({ role: 'system', kind: 'status', content: `mode: ${nextMode}` });
        return;
      }
      case 'help':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({ role: 'system', kind: 'status', content: renderXenesisSlashHelp() });
        return;
      case 'status': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        const next = await refresh();
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            `status: ${statusText(next || status)}`,
            `runtime: ${runtimeModeText(next || status)}`,
            `connection: ${runtimeConnectionText(next || status)}`,
            `role: ${XENESIS_OPERATING_ROLE}`,
            `workspace: ${(next || status)?.workspace || '-'}`,
            `profile: ${(next || status)?.profile?.active || 'none'}`,
            `workflow: ${(next || status)?.profile?.policy?.workflow || 'xenis'}`,
            `approval: ${(next || status)?.profile?.policy?.approvalMode || 'safe'}`,
            `mode: ${mode}`,
            contextUsageText(messages),
            `session: ${shortSessionId(activeSessionId)}`,
          ].join('\n'),
        });
        return;
      }
      case 'model':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            'model: managed by the embedded Xenesis runtime',
            `role: ${XENESIS_OPERATING_ROLE}`,
            'purpose: coordinate LLM providers, tools, Desk context, verification, and handoff',
            `artifact provider: ${getGowooriProviderDefinition(artifactProvider).label}`,
            `runtime: ${runtimeModeText(status)}`,
            `connection: ${runtimeConnectionText(status)}`,
          ].join('\n'),
        });
        return;
      case 'provider': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        const requestedProvider = (command.args[0] || '').trim();
        if (!requestedProvider) {
          appendChatMessage({
            role: 'system',
            kind: 'status',
            content: renderXenesisArtifactProviderSummary(artifactProvider, artifactProviderSettings),
          });
          return;
        }
        if (!isGowooriProviderId(requestedProvider)) {
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: `usage: /provider ${GOWOORI_PROVIDER_DEFINITIONS.map((definition) => definition.id).join('|')}`,
            error: true,
          });
          return;
        }
        selectArtifactProvider(requestedProvider);
        return;
      }
      case 'tools':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            'tools:',
            '- Xenesis runtime tools selected by workflow',
            '- Xenesis Desk context/capability tools',
            `- XCON artifact generation via ${getGowooriProviderDefinition(artifactProvider).label}`,
            '- MCP/plugin tools when configured',
            'Use /raw after a run to inspect full tool payloads.',
          ].join('\n'),
        });
        return;
      case 'reports': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        if (!xenesisApi) {
          appendChatMessage({ role: 'system', kind: 'error', content: XENESIS_API_UNAVAILABLE, error: true });
          return;
        }
        try {
          const result = await xenesisApi.reports(xenesisReportQueryFromArgs(command.args));
          appendChatMessage({ role: 'system', kind: 'status', content: renderXenesisReportsResult(result.reports) });
        } catch (reportsError) {
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: reportsError instanceof Error ? reportsError.message : String(reportsError),
            error: true,
          });
        }
        return;
      }
      case 'tasks': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        if (!xenesisApi) {
          appendChatMessage({ role: 'system', kind: 'error', content: XENESIS_API_UNAVAILABLE, error: true });
          return;
        }
        try {
          const result = await xenesisApi.tasks(xenesisTaskQueryFromArgs(command.args));
          appendChatMessage({ role: 'system', kind: 'status', content: renderXenesisTasksResult(result.tasks) });
        } catch (tasksError) {
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: tasksError instanceof Error ? tasksError.message : String(tasksError),
            error: true,
          });
        }
        return;
      }
      case 'sessions':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            `session: ${shortSessionId(activeSessionId)}`,
            `artifact sessions: ${readStoredXenesisArtifactSessions().length}`,
            'Use /reset to reset the embedded runtime session.',
          ].join('\n'),
        });
        return;
      case 'resume':
        if (command.rest) {
          await runPrompt(command.rest, mode, displayLine, [], contextMessages);
          return;
        }
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            `session: ${shortSessionId(activeSessionId)}`,
            `context: ${contextUsageText(messages)}`,
            'Run /resume <prompt> to continue with the current transcript context.',
          ].join('\n'),
        });
        return;
      case 'history': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        const history = promptHistoryRef.current.slice(-10);
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content:
            history.length > 0
              ? ['history:', ...history.map((item, index) => `${index + 1}. ${item}`)].join('\n')
              : 'history: none',
        });
        return;
      }
      case 'doctor': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        const next = await refresh();
        appendChatMessage({
          role: 'system',
          kind: next?.ok ? 'status' : 'error',
          error: !next?.ok,
          content: [
            `doctor: ${next?.ok ? 'ok' : 'error'}`,
            `status: ${statusText(next || status)}`,
            `runtime: ${runtimeModeText(next || status)}`,
            `connection: ${runtimeConnectionText(next || status)}`,
            `workspace: ${(next || status)?.workspace || '-'}`,
            ...((next || status)?.error ? [`error: ${(next || status)?.error}`] : []),
          ].join('\n'),
        });
        return;
      }
      case 'diagnostics': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        if (!xenesisApi) {
          appendChatMessage({ role: 'system', kind: 'error', content: XENESIS_API_UNAVAILABLE, error: true });
          return;
        }
        try {
          const diagnostics = await xenesisApi.diagnostics();
          appendChatMessage({
            role: 'system',
            kind: 'status',
            content: renderXenesisOperationalDiagnostics(diagnostics),
          });
        } catch (diagnosticsError) {
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: diagnosticsError instanceof Error ? diagnosticsError.message : String(diagnosticsError),
            error: true,
          });
        }
        return;
      }
      case 'permissions':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'approval',
          content: [
            'permissions:',
            'approval: governed by Xenesis runtime configuration',
            `activePolicy=${policySnapshot?.policyName || 'none'}`,
            `active policy: ${policySnapshot?.policyName || 'none'}`,
            `policy checks shown: ${policyNotices.length}`,
            ...(policyNotices[0]?.nextAction ? [`next action: ${policyNotices[0].nextAction}`] : []),
            'Desk capability calls are surfaced in the policy/check transcript and raw stream.',
          ].join('\n'),
        });
        return;
      case 'memory':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            'memory:',
            'long-term memory is owned by the embedded Xenesis runtime and active workflow configuration.',
            `transcript context: ${contextUsageText(messages)}`,
            'Use natural language in chat/work mode when you want Xenesis to remember or use project context.',
          ].join('\n'),
        });
        return;
      case 'skills':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            'skills:',
            'skills are loaded by the active Xenesis workflow before agent execution.',
            'The embedded Desk workflow prioritizes Xenesis Desk context, Markdown/XCON rendering, and workspace operations.',
          ].join('\n'),
        });
        return;
      case 'plugins':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            'plugins:',
            'plugin and MCP tools are registered by the embedded Xenesis runtime.',
            'Use /tools to see the active tool surfaces and /raw to inspect exact tool events after a run.',
          ].join('\n'),
        });
        return;
      case 'compact':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'status',
          content: [
            `context: ${contextUsageText(messages)}`,
            `messages retained for agent context: ${Math.min(messages.length, XENESIS_CONTEXT_MESSAGE_LIMIT)}`,
            `max chars per message: ${XENESIS_CONTEXT_MESSAGE_MAX_CHARS}`,
          ].join('\n'),
        });
        return;
      case 'workspace': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        const nextWorkspace = command.rest.trim();
        if (!nextWorkspace) {
          appendChatMessage({ role: 'system', kind: 'status', content: `workspace: ${status?.workspace || '-'}` });
          return;
        }
        if (!xenesisApi) {
          appendChatMessage({ role: 'system', kind: 'error', content: XENESIS_API_UNAVAILABLE, error: true });
          return;
        }
        try {
          const next = await xenesisApi.setWorkspace(nextWorkspace);
          xenesisAgentStateStore.update({ status: next });
          appendChatMessage({
            role: 'system',
            kind: 'status',
            content: `workspace: ${next.workspace || nextWorkspace}`,
          });
        } catch (workspaceError) {
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: workspaceError instanceof Error ? workspaceError.message : String(workspaceError),
            error: true,
          });
        }
        return;
      }
      case 'profile': {
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        if (!xenesisApi) {
          appendChatMessage({ role: 'system', kind: 'error', content: XENESIS_API_UNAVAILABLE, error: true });
          return;
        }
        const subcommand = (command.args[0] || 'list').toLowerCase();
        try {
          if (subcommand === 'list' || subcommand === 'templates') {
            const state = await xenesisApi.profiles();
            appendChatMessage({ role: 'system', kind: 'status', content: renderXenesisProfileState(state) });
            return;
          }
          if (subcommand === 'install') {
            const template = command.args[1] || '';
            const name = command.args[2];
            if (!template) {
              appendChatMessage({
                role: 'system',
                kind: 'error',
                content: 'usage: /profile install <template> [name]',
                error: true,
              });
              return;
            }
            const state = await xenesisApi.installProfile({ template, name, activate: true });
            xenesisAgentStateStore.update({ status: status ? { ...status, profile: state } : status });
            appendChatMessage({ role: 'system', kind: 'status', content: renderXenesisProfileState(state) });
            return;
          }
          if (subcommand === 'use') {
            const name = command.args[1] || '';
            if (!name) {
              appendChatMessage({ role: 'system', kind: 'error', content: 'usage: /profile use <name>', error: true });
              return;
            }
            const state = await xenesisApi.useProfile(name);
            xenesisAgentStateStore.update({ status: status ? { ...status, profile: state } : status });
            appendChatMessage({ role: 'system', kind: 'status', content: renderXenesisProfileState(state) });
            return;
          }
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: 'usage: /profile [list|templates|install|use]',
            error: true,
          });
        } catch (profileError) {
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: profileError instanceof Error ? profileError.message : String(profileError),
            error: true,
          });
        }
        return;
      }
      case 'artifact':
      case 'render': {
        if (!command.rest) {
          appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: `usage: /${command.name} <prompt>`,
            error: true,
          });
          return;
        }
        await runArtifactPrompt(command.rest, line, contextMessages);
        return;
      }
      case 'gowoori-smoke': {
        if (!command.rest) {
          appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: 'usage: /gowoori-smoke <prompt>',
            error: true,
          });
          return;
        }
        await runGowooriCrOrchestration(command.rest, line);
        return;
      }
      case 'control-demo': {
        await runXenesisControlDemo(command.rest, line);
        return;
      }
      case 'subagents-demo': {
        await runVisibleSubagentsDemo(command.rest, line);
        return;
      }
      case 'subagents-work': {
        if (!command.rest) {
          appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: 'usage: /subagents-work <task> [--keep-open]',
            error: true,
          });
          return;
        }
        await runVisibleSubagentsWork(command.rest, line);
        return;
      }
      case 'subagents-cleanup': {
        await runVisibleSubagentsCleanup(line);
        return;
      }
      case 'approval':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'approval',
          content: [
            'approval: governed by Xenesis runtime configuration',
            'safe mode asks before high-impact tool calls.',
            'readonly mode limits tools to inspection.',
          ].join('\n'),
        });
        return;
      case 'raw':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        setRawStreamOpen(true);
        return;
      case 'clear':
        clearChat();
        return;
      case 'cancel':
        await cancelActiveRun(line);
        return;
      case 'reset':
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        if (!xenesisApi) {
          appendChatMessage({ role: 'system', kind: 'error', content: XENESIS_API_UNAVAILABLE, error: true });
          return;
        }
        try {
          const next = await xenesisApi.resetSession();
          xenesisAgentStateStore.update({ status: next, running: false, activeSessionId: '' });
          appendChatMessage({ role: 'system', kind: 'status', content: `session reset: ${statusText(next)}` });
        } catch (resetError) {
          appendChatMessage({
            role: 'system',
            kind: 'error',
            content: resetError instanceof Error ? resetError.message : String(resetError),
            error: true,
          });
        }
        return;
      default:
        appendChatMessage({ role: 'user', content: displayLine, kind: 'command' });
        appendChatMessage({
          role: 'system',
          kind: 'error',
          content: `Unknown command: /${command.name}\n\n${renderXenesisSlashHelp()}`,
          error: true,
        });
    }
  }

  async function runTerminalInput(
    input: string,
    inputAttachments?: XenesisAgentAttachment[],
    routingOptions: XenesisAgentPromptRoutingOptions = {},
    modeOverride?: XenesisMode,
  ): Promise<void> {
    const effectiveMode = modeOverride ?? mode;
    const trimmedInput = input.trim();
    const submittedAttachments = inputAttachments ?? attachments;
    const hasAttachments = submittedAttachments.length > 0;
    if (!trimmedInput && !hasAttachments) {
      xenesisAgentStateStore.update({ prompt: '' });
      window.requestAnimationFrame(() => resizePromptInput());
      return;
    }
    const baseInput = trimmedInput || 'Please inspect the attached files and respond.';
    const attachmentDisplayText = hasAttachments
      ? `${baseInput}\n\n[attachments: ${submittedAttachments.map((attachment) => attachment.name).join(', ')}]`
      : baseInput;
    const providerInput = appendXenesisAttachmentPromptContext(baseInput, submittedAttachments);
    const contextMessages = xenesisAgentStateStore.getSnapshot().messages;

    pushPromptHistory(baseInput);
    xenesisAgentStateStore.update({ prompt: '' });
    if (isXenesisApprovalIntent(baseInput) && pendingMarkdownSaveRef.current) {
      await applyPendingMarkdownSave(baseInput);
      return;
    }
    if (isXenesisApprovalIntent(baseInput) && (await approvePendingDeskActionMessage(undefined, baseInput))) {
      return;
    }
    if (!isXenesisApprovalIntent(baseInput)) {
      pendingMarkdownSaveRef.current = null;
    }
    // Claude-Code-style type-ahead: while a run/stream is active, QUEUE this prompt
    // (FIFO) instead of rejecting it; the drain watcher runs it on completion.
    if (isXenesisAgentBusy(xenesisAgentStateStore.getSnapshot())) {
      const queued = makeQueuedPrompt(
        baseInput,
        hasAttachments ? submittedAttachments : [],
        routingOptions,
        effectiveMode,
      );
      xenesisAgentStateStore.update((current) => ({
        ...current,
        promptQueue: enqueueQueuedPrompt(current.promptQueue, queued),
      }));
      if (hasAttachments) clearAttachments();
      return;
    }
    if (baseInput.startsWith('/')) {
      if (hasAttachments) clearAttachments();
      await runSlashCommand(baseInput, attachmentDisplayText, contextMessages);
      return;
    }
    // Structured Desk-action blocks are executed before provider runs; clear
    // natural Desk commands are planned in runPrompt unless explicitly bypassed.
    const directDeskActionRequest = routingOptions.bypassDirectDeskRouting
      ? null
      : parseXenesisDeskActionBlocks(baseInput);
    if (directDeskActionRequest && shouldRunXenesisDeskActionsDirectly(directDeskActionRequest)) {
      if (hasAttachments) clearAttachments();
      await runPrompt(
        providerInput,
        effectiveMode,
        directDeskActionRequest.visibleText || attachmentDisplayText || 'Desk action request',
        submittedAttachments,
        contextMessages,
        routingOptions,
      );
      return;
    }
    if (hasAttachments) clearAttachments();
    await runPrompt(providerInput, effectiveMode, attachmentDisplayText, submittedAttachments, contextMessages, routingOptions);
  }
  runTerminalInputRef.current = runTerminalInput;

  // Prompt-queue drain: when the agent transitions busy -> fully idle, auto-run the
  // next queued prompt (FIFO). suppressNextDrainRef (set by cancel) skips exactly one
  // idle edge so a cancel preserves the queue without auto-firing it.
  useEffect(() => {
    drainPrevBusyRef.current = isXenesisAgentBusy(xenesisAgentStateStore.getSnapshot());
    return xenesisAgentStateStore.subscribe(() => {
      const snapshot = xenesisAgentStateStore.getSnapshot();
      const nextBusy = isXenesisAgentBusy(snapshot);
      const decision = decideDrain({
        prevBusy: drainPrevBusyRef.current,
        nextBusy,
        queue: snapshot.promptQueue,
        suppressNextDrain: suppressNextDrainRef.current,
      });
      drainPrevBusyRef.current = nextBusy;
      if (decision.resetSuppress) suppressNextDrainRef.current = false;
      if (decision.action !== 'drain') return;
      queueMicrotask(() => {
        const snap = xenesisAgentStateStore.getSnapshot();
        if (isXenesisAgentBusy(snap) || snap.promptQueue.length === 0) return;
        const { head, rest } = dequeueQueuedPrompt(snap.promptQueue);
        if (!head) return;
        xenesisAgentStateStore.update((current) => ({ ...current, promptQueue: rest }));
        void runTerminalInputRef.current?.(head.input, head.attachments, head.routingOptions, head.mode);
      });
    });
  }, []);

  useEffect(() => {
    const root = terminalRootRef.current;
    if (!root) return undefined;
    const handleSubmitPrompt = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          prompt?: unknown;
          attachments?: unknown;
          bypassDirectDeskRouting?: unknown;
          bypassNaturalDeskRouting?: unknown;
        }>
      ).detail;
      const eventPrompt = typeof detail?.prompt === 'string' ? detail.prompt : '';
      const eventAttachments = Array.isArray(detail?.attachments)
        ? normalizeXenesisAgentEventAttachments(detail.attachments)
        : undefined;
      const routingOptions: XenesisAgentPromptRoutingOptions = {
        bypassDirectDeskRouting: detail?.bypassDirectDeskRouting === true,
        bypassNaturalDeskRouting: detail?.bypassNaturalDeskRouting === true,
      };
      if (!eventPrompt.trim()) return;
      event.preventDefault();
      event.stopPropagation();
      void runTerminalInputRef.current?.(eventPrompt, eventAttachments, routingOptions);
    };
    root.addEventListener('xenesis-agent-submit-prompt', handleSubmitPrompt as EventListener);
    return () => root.removeEventListener('xenesis-agent-submit-prompt', handleSubmitPrompt as EventListener);
  }, []);

  useEffect(() => {
    if (!xenesisApi) return;
    void refresh();
    return subscribeXenesisRunEvents(xenesisApi);
  }, [xenesisApi]);

  useEffect(() => {
    let disposed = false;
    const handleSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AppSettings>>).detail;
      applySettingsSnapshot(detail);
    };
    window.addEventListener('app-settings-changed', handleSettingsChanged as EventListener);
    window.terminalAPI
      ?.getSettings?.()
      .then((snapshot) => {
        if (!disposed) applySettingsSnapshot(snapshot);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      window.removeEventListener('app-settings-changed', handleSettingsChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    ensureTerminalEndVisible();
  }, [latestTranscriptScrollSignature, messages.length, rawStreamOpen]);

  useEffect(() => {
    resizePromptInput();
    ensureTerminalEndVisible();
    updateSlashMenuPlacement();
  }, [prompt, slashSuggestions.length, rawStreamOpen]);

  useEffect(() => {
    if (slashSuggestions.length === 0) return undefined;
    const handleResize = () => updateSlashMenuPlacement();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [slashSuggestions.length, rawStreamOpen]);

  useEffect(() => {
    if (!running) {
      setRunStartedAtMs(null);
      return undefined;
    }
    const startedAt = Date.now();
    setRunStartedAtMs(startedAt);
    setRunNowMs(startedAt);
    const timer = window.setInterval(() => setRunNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (slashSelectionIndex < slashSuggestions.length) return;
    setSlashSelectionIndex(Math.max(0, slashSuggestions.length - 1));
  }, [slashSelectionIndex, slashSuggestions.length]);

  useEffect(() => {
    ensureSelectedSlashOptionVisible();
  }, [selectedSlashSuggestion?.name, slashSuggestions.length, slashMenuPlacement]);

  useEffect(() => {
    if (!rawStreamOpen || !rawStreamFocusId) return;
    const selector = `[data-xenesis-raw-entry-id="${CSS.escape(rawStreamFocusId)}"]`;
    document.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [rawStreamOpen, rawStreamFocusId, rawStream.length]);

  function handlePromptKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    const nativeEvent = event.nativeEvent as KeyboardEvent;
    if (event.ctrlKey && event.key.toLowerCase() === 'c' && running) {
      event.preventDefault();
      void cancelActiveRun();
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      clearChat();
      return;
    }
    if (event.key === 'Escape' && running) {
      event.preventDefault();
      void cancelActiveRun();
      return;
    }
    if (slashSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashSelectionIndex((index) => (index + 1) % slashSuggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashSelectionIndex((index) => (index - 1 + slashSuggestions.length) % slashSuggestions.length);
        return;
      }
      if (event.key === 'Tab' && selectedSlashSuggestion) {
        event.preventDefault();
        completeSlashCommand(selectedSlashSuggestion.name);
        return;
      }
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        !nativeEvent.isComposing &&
        selectedSlashSuggestion &&
        shouldCompleteSlashCommand(prompt, selectedSlashSuggestion)
      ) {
        event.preventDefault();
        completeSlashCommand(selectedSlashSuggestion.name);
        return;
      }
    }
    if (event.key === 'ArrowUp' && !prompt.includes('\n')) {
      if (recallPromptHistory(-1)) event.preventDefault();
      return;
    }
    if (event.key === 'ArrowDown' && !prompt.includes('\n')) {
      if (recallPromptHistory(1)) event.preventDefault();
      return;
    }
    if (event.key !== 'Enter' || nativeEvent.isComposing) return;
    if (event.shiftKey) return;
    event.preventDefault();
    if (!prompt.trim()) {
      xenesisAgentStateStore.update({ prompt: '' });
      window.requestAnimationFrame(() => resizePromptInput());
      return;
    }
    void runTerminalInput(prompt);
  }

  const unavailableError = apiUnavailable ? XENESIS_API_UNAVAILABLE : '';
  const chatMessages = useMemo(() => getXenesisVisibleTranscriptMessages(messages.slice().reverse()), [messages]);
  const transcriptActivity = useMemo(() => summarizeXenesisTranscriptActivity(rawStream), [rawStream]);
  const deskAuditEntries = useMemo(() => deskActionAuditEntries(rawStream), [rawStream]);
  const taskAuditEntries = useMemo(() => taskLifecycleAuditEntries(rawStream), [rawStream]);
  const runElapsedText = running && runStartedAtMs !== null ? formatRunElapsed(runNowMs - runStartedAtMs) : '0s';
  const selectedStatusBarKeys = useMemo(() => normalizeXenesisStatusBarKeys(statusBarKeys), [statusBarKeys]);
  const statusItems = useMemo(
    () =>
      visibleXenesisStatusBarItems(
        buildXenesisStatusBarItems({
          status,
          mode,
          running,
          runElapsedText,
          messages,
          activeSessionId,
          policyName: policySnapshot?.policyName || 'none',
          artifactProvider,
        }),
        selectedStatusBarKeys,
      ),
    [
      activeSessionId,
      artifactProvider,
      messages,
      mode,
      policySnapshot?.policyName,
      runElapsedText,
      running,
      selectedStatusBarKeys,
      status,
    ],
  );

  function setStatusBarKey(key: XenesisStatusBarItemKey, visible: boolean): void {
    xenesisAgentStateStore.update((current) => {
      const normalized = normalizeXenesisStatusBarKeys(current.statusBarKeys);
      const nextKeys = visible
        ? normalizeXenesisStatusBarKeys([...normalized, key])
        : normalizeXenesisStatusBarKeys(normalized.filter((item) => item !== key));
      return {
        ...current,
        statusBarKeys: nextKeys,
      };
    });
  }

  function resetStatusBarKeys(): void {
    xenesisAgentStateStore.update({
      statusBarKeys: [...XENESIS_STATUS_BAR_DEFAULT_KEYS],
    });
  }

  return (
    <div
      ref={terminalRootRef}
      className={`xd-xenesis-agent ${terminalFocused ? 'is-terminal-focused' : 'is-terminal-blurred'}`}
      onMouseDownCapture={handleTerminalMouseDown}
    >
      <header className="xd-xenesis-terminal-header">
        <div>
          <h2>Xenesis Agent</h2>
          <p className="xd-xenesis-terminal-status" title={runtimeConnectionText(status)}>
            {(() => {
              const headerState = headerLiveState(status, isXenesisAgentBusy(state));
              const workspaceName = workspaceBasename(status?.workspace);
              return (
                <>
                  <span
                    className={`xd-xenesis-header-state is-${headerState.tone}`}
                    role="status"
                    aria-label={`상태: ${headerState.label}`}
                  >
                    {headerState.label}
                  </span>
                  {workspaceName && (
                    <span className="xd-xenesis-header-workspace" title={status?.workspace || undefined}>
                      {workspaceName}
                    </span>
                  )}
                </>
              );
            })()}
          </p>
        </div>
        <label className="xd-xenesis-artifact-provider" data-xenesis-no-terminal-focus="true">
          <span>Artifact provider</span>
          <select
            value={artifactProvider}
            disabled={running}
            onChange={(event) => {
              const nextProvider = event.target.value;
              if (isGowooriProviderId(nextProvider)) selectArtifactProvider(nextProvider, false);
            }}
          >
            {GOWOORI_PROVIDER_DEFINITIONS.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {unavailableError && <div className="xd-intel-error">{unavailableError}</div>}
      {error && <div className="xd-intel-error">{error}</div>}
      {status?.error && <div className="xd-intel-error">{status.error}</div>}

      {rawStreamOpen ? (
        <section
          className="xd-xenesis-raw-screen xd-xenesis-raw-stream"
          aria-label="Xenesis raw stream"
          data-xenesis-no-terminal-focus="true"
        >
          <div className="xd-xenesis-view-head">
            <div>
              <strong>Raw stream</strong>
              <span>Gateway events and raw response payloads</span>
            </div>
            <div>
              <button type="button" aria-label="Close raw stream" onClick={() => setRawStreamOpen(false)}>
                ← Back to chat
              </button>
              <button type="button" onClick={clearRawStream} disabled={rawStream.length === 0 || running}>
                Clear
              </button>
            </div>
          </div>
          {rawStream.length === 0 ? (
            <div className="xd-intel-empty">No raw stream events yet.</div>
          ) : (
            <>
              {rawStream.map((entry) => (
                <article
                  key={entry.id}
                  className={`xd-xenesis-raw-entry${entry.error ? ' is-error' : ''}${entry.id === rawStreamFocusId ? ' is-focused' : ''}`}
                  data-xenesis-raw-entry-id={entry.id}
                  aria-current={entry.id === rawStreamFocusId ? 'true' : undefined}
                >
                  <div>
                    <strong>{entry.kind}</strong>
                    <span>{entry.at}</span>
                  </div>
                  <p>{entry.summary}</p>
                  {entry.detail && <pre>{entry.detail}</pre>}
                </article>
              ))}
              <div className="xd-xenesis-raw-footer">
                <span>
                  {rawStream.length} raw event{rawStream.length === 1 ? '' : 's'}
                </span>
                <button type="button" onClick={() => setRawStreamOpen(false)}>
                  ← Back to chat
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          {(policySnapshot ||
            policyNotices.length > 0 ||
            deskAuditEntries.length > 0 ||
            taskAuditEntries.length > 0) &&
            (() => {
              const diagnosticsActivity =
                policyNotices.length + deskAuditEntries.length + taskAuditEntries.length;
              return (
                <details className="xd-xenesis-terminal-diagnostics" aria-label="Xenesis diagnostics">
                  <summary>
                    <span>Diagnostics</span>
                    <small>
                      {diagnosticsActivity > 0 ? (
                        <>
                          {policyNotices.length > 0 && <>{policyNotices.length} policy checks</>}
                          {policyNotices.length > 0 && deskAuditEntries.length + taskAuditEntries.length > 0 && ' · '}
                          {deskAuditEntries.length > 0 && <>{deskAuditEntries.length} Desk actions</>}
                          {deskAuditEntries.length > 0 && taskAuditEntries.length > 0 && ' · '}
                          {taskAuditEntries.length > 0 && <>{taskAuditEntries.length} task events</>}
                        </>
                      ) : (
                        '특이사항 없음'
                      )}
                    </small>
                  </summary>

              {policySnapshot && (
                <section className="xd-xenesis-policy-active" aria-label="Xenesis active tool policy">
                  <div>
                    <strong>Active guard policy</strong>
                    <span>{policySnapshot.policyName}</span>
                  </div>
                  <p>
                    Priority:{' '}
                    {policySnapshot.priorityTools.length > 0 ? policySnapshot.priorityTools.join(' -> ') : 'none'}
                  </p>
                  {(policySnapshot.allowCount !== undefined ||
                    policySnapshot.denyCount !== undefined ||
                    policySnapshot.nextActions?.length) && (
                    <small>
                      {policySnapshot.allowCount !== undefined ? `allowed ${policySnapshot.allowCount}` : ''}
                      {policySnapshot.allowCount !== undefined && policySnapshot.denyCount !== undefined ? ' · ' : ''}
                      {policySnapshot.denyCount !== undefined ? `blocked ${policySnapshot.denyCount}` : ''}
                      {policySnapshot.nextActions?.length ? ` · next: ${policySnapshot.nextActions[0]}` : ''}
                    </small>
                  )}
                </section>
              )}

              {policyNotices.length > 0 && (
                <section className="xd-xenesis-policy-strip" aria-label="Xenesis policy checks">
                  <div>
                    <strong>Policy checks</strong>
                    <span>{policyNotices.length} recent checks</span>
                  </div>
                  <div>
                    {policyNotices.slice(0, 4).map((notice) => (
                      <article key={notice.id} className={`xd-xenesis-policy-notice is-${notice.status}`}>
                        <div>
                          <strong>{notice.status === 'deny' ? 'Blocked' : 'Allowed'}</strong>
                          <span>{notice.policyName}</span>
                        </div>
                        <p>
                          {notice.toolName}: {notice.reason}
                        </p>
                        {(notice.missingBefore.length > 0 || notice.priorityTools.length > 0) && (
                          <small>
                            {notice.missingBefore.length > 0
                              ? `Missing: ${notice.missingBefore.join(', ')}`
                              : `Priority: ${notice.priorityTools.join(' -> ')}`}
                          </small>
                        )}
                        {notice.nextAction && (
                          <small className="xd-xenesis-policy-next">Next action: {notice.nextAction}</small>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {deskAuditEntries.length > 0 && (
                <section className="xd-xenesis-action-audit" aria-label="Xenesis Desk action audit">
                  <div>
                    <strong>Desk actions</strong>
                    <span>{deskAuditEntries.length} recent Desk tool events</span>
                  </div>
                  <div>
                    {deskAuditEntries.map((entry) => (
                      <article
                        key={entry.id}
                        className={`xd-xenesis-action-audit-entry${entry.error ? ' is-error' : ''}`}
                      >
                        <strong>{entry.kind === 'desk_tool_call' ? 'Call' : 'Result'}</strong>
                        <span title={entry.summary}>{entry.summary}</span>
                        <small title={entry.at}>{formatXenesisMessageTime(entry.at)}</small>
                        <button type="button" onClick={() => focusRawStreamEntry(entry.id)}>
                          Detail
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {taskAuditEntries.length > 0 && (
                <section className="xd-xenesis-task-audit" aria-label="Xenesis task lifecycle audit">
                  <div>
                    <strong>Task lifecycle</strong>
                    <span>{taskAuditEntries.length} recent task events</span>
                  </div>
                  <div>
                    {taskAuditEntries.map((entry) => (
                      <article
                        key={entry.id}
                        className={`xd-xenesis-task-audit-entry${entry.error ? ' is-error' : ''}`}
                      >
                        <strong>{entry.error ? 'Issue' : 'Task'}</strong>
                        <span title={entry.summary}>{entry.summary}</span>
                        <small title={entry.at}>{formatXenesisMessageTime(entry.at)}</small>
                        <button type="button" onClick={() => focusRawStreamEntry(entry.id)}>
                          Detail
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
                </details>
              );
            })()}

          <section
            ref={terminalShellRef}
            className={`xd-xenesis-terminal ${terminalFocused ? 'is-focused' : 'is-blurred'}${attachmentDropActive ? ' is-attachment-drag-over' : ''}`}
            aria-label="Xenesis terminal"
            onDragEnter={handleAttachmentDragEnter}
            onDragOver={handleAttachmentDragOver}
            onDragLeave={handleAttachmentDragLeave}
            onDrop={handleAttachmentDrop}
          >
            {attachmentDropActive && (
              <div className="xd-xenesis-attachment-drop-hint" data-xenesis-no-terminal-focus="true">
                <strong>Drop files to attach</strong>
                <span>Images and text files will be added to the next Xenesis request.</span>
              </div>
            )}
            <div
              ref={terminalViewportRef}
              className="xd-xenesis-terminal-transcript"
              aria-label="Xenesis terminal transcript"
            >
              {running && (
                <div className="xd-xenesis-terminal-working" role="status">
                  <strong>• Working</strong>
                  <span>({runElapsedText} • esc to interrupt)</span>
                </div>
              )}
              {chatMessages.length === 0 ? (
                <div className="xd-xenesis-terminal-empty" role="group" aria-label="Xenesis 시작하기">
                  <p className="xd-xenesis-terminal-empty-greeting">Xenesis Agent가 준비됐어요. 무엇을 도와드릴까요?</p>
                  <div className="xd-xenesis-terminal-empty-chips">
                    {XENESIS_EXAMPLE_PROMPTS.map((example) => (
                      <button
                        key={example}
                        type="button"
                        className="xd-xenesis-terminal-empty-chip"
                        data-xenesis-no-terminal-focus="true"
                        title="입력창에 채우기"
                        onClick={() => fillPromptInput(example)}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  <p className="xd-xenesis-terminal-empty-hint">
                    <span className="xd-xenesis-terminal-prompt-token">{'>'}</span>
                    <span>/help 로 사용할 수 있는 명령을 볼 수 있어요</span>
                  </p>
                </div>
              ) : (
                chatMessages.map((message) => {
                  const lineKind = xenesisTerminalLineKind(message);
                  const choiceOptions = message.streaming ? [] : extractXenesisChoiceOptions(message.content);
                  const roleLabel = xenesisTerminalRoleLabel(message);
                  const sourceLabel = xenesisTerminalSourceLabel(message, lineKind);
                  const kindLabel = xenesisTerminalKindLabel(lineKind);
                  const hasXconArtifact = message.role === 'assistant' && hasRenderableXconArtifact(message.content);
                  const artifactLabel = hasXconArtifact ? getXenesisArtifactLabelFromContent(message.content) : '';
                  const deskActions = message.deskActions || [];
                  const hasDeskActions = deskActions.length > 0;
                  const deskActionStatus = message.deskActionStatus || (hasDeskActions ? 'pending' : undefined);
                  return (
                    <article
                      key={message.id}
                      className={`xd-xenesis-terminal-line is-${message.role} is-${lineKind}${message.error ? ' is-error' : ''}${message.streaming ? ' is-streaming' : ''}`}
                      aria-label={`${roleLabel}: ${message.content.slice(0, 80)}`}
                    >
                      <div className="xd-xenesis-terminal-meta">
                        <span className="xd-xenesis-terminal-role-badge">
                          <span className="xd-xenesis-terminal-role-glyph" aria-hidden="true">
                            {message.role === 'user' ? '나' : message.role === 'assistant' ? 'AI' : 'SYS'}
                          </span>
                          {roleLabel}
                        </span>
                        <strong className="xd-xenesis-terminal-source">{sourceLabel}</strong>
                        {kindLabel && <span className="xd-xenesis-terminal-kind">{kindLabel}</span>}
                        <time dateTime={message.at} title={message.at}>
                          {formatXenesisMessageTime(message.at)}
                        </time>
                        <div className="xd-xenesis-terminal-message-actions" data-xenesis-no-terminal-focus="true">
                          <button
                            type="button"
                            onClick={() => copyTranscriptMessage(message.content)}
                            title="Copy message"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                      {message.thinkingContent &&
                        message.thinkingContent.trim() &&
                        message.thinkingContent.trim() !== message.content.trim() && (
                          <details className="xd-xenesis-thinking-panel" data-xenesis-no-terminal-focus="true">
                            <summary>
                              <span>사고 과정</span>
                              <small>{message.thinkingContent.trim().length}자</small>
                            </summary>
                            <div className="xd-xenesis-thinking-content">
                              <XenesisTerminalMessageBody content={message.thinkingContent} />
                            </div>
                          </details>
                        )}
                      <XenesisTerminalMessageBody content={message.content} />
                      {hasDeskActions && (
                        <section
                          className={`xd-xenesis-desk-action-card is-${deskActionStatus || 'pending'}`}
                          data-xenesis-no-terminal-focus="true"
                        >
                          <div>
                            <span>Capability Registry</span>
                            <strong>{xenesisDeskActionStatusLabel(deskActionStatus)}</strong>
                            <small>{deskActions.map((action) => action.path).join(', ')}</small>
                          </div>
                          {deskActionStatus === 'pending' && (
                            <>
                              <button
                                type="button"
                                data-xenesis-agent-desk-action-approve="true"
                                onClick={() => void approvePendingDeskActionMessage(message.id, '')}
                              >
                                승인 후 실행
                              </button>
                              <button
                                type="button"
                                data-xenesis-agent-desk-action-approve-always="true"
                                title="같은 작업을 항상 승인"
                                onClick={() => void approveAlwaysPendingDeskActionMessage(message.id)}
                              >
                                항상 승인
                              </button>
                              <button
                                type="button"
                                className="is-secondary"
                                data-xenesis-agent-desk-action-cancel="true"
                                onClick={() => cancelPendingDeskActionMessage(message.id)}
                              >
                                취소
                              </button>
                            </>
                          )}
                        </section>
                      )}
                      {hasXconArtifact && (
                        <section className="xd-xenesis-artifact-actions" data-xenesis-no-terminal-focus="true">
                          <div>
                            <span>XCON result</span>
                            <strong>{artifactLabel}</strong>
                            <small>이 응답의 결과를 거울이 아티팩트나 전체 오버레이로 다시 볼 수 있습니다.</small>
                          </div>
                          <button
                            type="button"
                            onClick={() => void openTranscriptArtifactInGowoori(message.content, artifactLabel)}
                          >
                            아티팩트로 보기
                          </button>
                          <button
                            type="button"
                            onClick={() => openTranscriptArtifactOverlay(message.content, artifactLabel)}
                          >
                            오버레이로 보기
                          </button>
                        </section>
                      )}
                      {choiceOptions.length > 0 && (
                        <div className="xd-xenesis-choice-row" data-xenesis-no-terminal-focus="true">
                          {choiceOptions.map((option) => (
                            <button
                              key={`${message.id}-${option.index}`}
                              type="button"
                              onClick={() => applyChoiceOption(option)}
                              title={`Use option ${option.index}`}
                            >
                              <span>{option.index}</span>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {message.streaming && (
                        <span className="xd-xenesis-terminal-waiting" aria-label="Waiting for Xenesis response">
                          <span>.</span>
                          <span>.</span>
                          <span>.</span>
                        </span>
                      )}
                    </article>
                  );
                })
              )}
              {transcriptActivity.items.length > 0 && (
                <details className="xd-xenesis-activity-panel">
                  <summary>
                    <span>Work log</span>
                    <small>{transcriptActivity.summary}</small>
                  </summary>
                  <div className="xd-xenesis-activity-list">
                    {transcriptActivity.items.map((item) => (
                      <article key={item.id} className={`xd-xenesis-activity-row is-${item.status}`}>
                        <span className="xd-xenesis-activity-status">{item.status}</span>
                        <strong>{item.label}</strong>
                        <span title={item.summary}>{item.summary}</span>
                        <time dateTime={item.at} title={item.at}>
                          {formatXenesisMessageTime(item.at)}
                        </time>
                        <button
                          type="button"
                          disabled={!item.detail}
                          onClick={() => focusRawStreamEntry(item.id)}
                          data-xenesis-no-terminal-focus="true"
                        >
                          Detail
                        </button>
                      </article>
                    ))}
                  </div>
                </details>
              )}
              <div ref={chatEndRef} className="xd-xenesis-terminal-end" aria-hidden="true" />
            </div>
            <div className="xd-xenesis-terminal-command-dock">
              <div className="xd-xenesis-terminal-action-row" data-xenesis-no-terminal-focus="true">
                <div className="xd-xenesis-mode-segment" role="group" aria-label="Xenesis mode">
                  {(['chat', 'plan', 'work'] as const).map((nextMode) => (
                    <button
                      key={nextMode}
                      type="button"
                      className={mode === nextMode ? 'is-active' : ''}
                      disabled={running}
                      onClick={() => xenesisAgentStateStore.update({ mode: nextMode })}
                    >
                      {nextMode}
                    </button>
                  ))}
                </div>
                <div className="xd-xenesis-command-actions">
                  <button type="button" onClick={() => void runSlashCommand('/status')} disabled={running}>
                    Status
                  </button>
                  <button type="button" onClick={() => setRawStreamOpen(true)} disabled={rawStream.length === 0}>
                    Raw
                  </button>
                  <button type="button" onClick={clearChat} disabled={messages.length === 0 || running}>
                    Clear
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => void cancelActiveRun()}
                    disabled={!running}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {(attachments.length > 0 || attachmentError) && (
                <div className="xd-xenesis-attachments" data-xenesis-no-terminal-focus="true">
                  {attachments.length > 0 && (
                    <div className="xd-xenesis-attachment-list" aria-label="Attached files">
                      {attachments.map((attachment) => (
                        <span
                          key={attachment.id}
                          className="xd-xenesis-attachment-chip"
                          title={attachment.path || attachment.name}
                        >
                          {attachment.kind === 'image' && attachment.dataUrl ? (
                            <img src={attachment.dataUrl} alt="" />
                          ) : (
                            <span className="xd-xenesis-attachment-icon">
                              {attachment.kind === 'image' ? 'IMG' : 'FILE'}
                            </span>
                          )}
                          <span className="xd-xenesis-attachment-info">
                            <strong>{attachment.name}</strong>
                            <small>{formatXenesisAttachmentSize(attachment.size)}</small>
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${attachment.name}`}
                            onClick={() => removeAttachment(attachment.id)}
                            disabled={running}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {attachmentError && <p className="xd-xenesis-attachment-error">{attachmentError}</p>}
                  {attachments.length > 0 && (
                    <button
                      type="button"
                      className="xd-xenesis-attachment-clear"
                      onClick={clearAttachments}
                      disabled={running}
                    >
                      Clear attachments
                    </button>
                  )}
                </div>
              )}
              {promptQueue.length > 0 && (
                <div className="xd-xenesis-prompt-queue" data-xenesis-no-terminal-focus="true">
                  {promptQueue.map((queued, index) => (
                    <section key={queued.id} className="xd-xenesis-desk-action-card is-pending">
                      <div>
                        <span>대기 중 {index + 1}</span>
                        <strong>다음에 자동 실행</strong>
                        <small>{queued.input}</small>
                      </div>
                      <button
                        type="button"
                        className="is-secondary"
                        title="대기 중인 메시지 취소"
                        onClick={() =>
                          xenesisAgentStateStore.update((current) => ({
                            ...current,
                            promptQueue: removeQueuedPrompt(current.promptQueue, queued.id),
                          }))
                        }
                      >
                        취소
                      </button>
                    </section>
                  ))}
                </div>
              )}
              <form
                ref={promptInputLineRef}
                className="xd-xenesis-terminal-input-line"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runTerminalInput(prompt);
                }}
              >
                <input
                  ref={attachmentInputRef}
                  className="xd-xenesis-attachment-input"
                  type="file"
                  multiple
                  onChange={handleAttachmentInputChange}
                  tabIndex={-1}
                />
                <span className="xd-xenesis-terminal-input-prefix">{'>'}</span>
                <span className="xd-xenesis-terminal-input-wrap">
                  <textarea
                    ref={promptInputRef}
                    className="xd-xenesis-terminal-input"
                    value={prompt}
                    onChange={handlePromptChange}
                    onKeyDown={handlePromptKeyDown}
                    onFocus={() => setTerminalFocused(true)}
                    onBlur={handlePromptBlur}
                    rows={1}
                    spellCheck={false}
                    aria-label="Xenesis terminal prompt"
                    aria-keyshortcuts="Enter Shift+Enter Ctrl+C Ctrl+L ArrowUp ArrowDown Tab Escape"
                    aria-expanded={slashSuggestions.length > 0}
                    aria-controls={slashSuggestions.length > 0 ? 'xd-xenesis-slash-menu' : undefined}
                    aria-activedescendant={
                      selectedSlashSuggestion ? `xd-xenesis-slash-option-${selectedSlashSuggestion.name}` : undefined
                    }
                    placeholder="Type a prompt or /help"
                  />
                  <span className="xd-xenesis-terminal-input-ghost" aria-hidden="true">
                    {prompt || '\u00a0'}
                    <span className="xd-xenesis-terminal-cursor" />
                  </span>
                </span>
                <button
                  type="button"
                  className="xd-xenesis-attachment-button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={running}
                  data-xenesis-no-terminal-focus="true"
                  title="Attach images or files"
                >
                  Attach
                </button>
                {slashSuggestions.length > 0 && (
                  <div
                    ref={slashMenuRef}
                    className={`xd-xenesis-slash-menu is-${slashMenuPlacement}`}
                    id="xd-xenesis-slash-menu"
                    role="listbox"
                  >
                    {slashSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.name}
                        id={`xd-xenesis-slash-option-${suggestion.name}`}
                        className={`xd-xenesis-slash-option${index === selectedSlashIndex ? ' is-selected' : ''}`}
                        type="button"
                        role="option"
                        aria-selected={index === selectedSlashIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => completeSlashCommand(suggestion.name)}
                      >
                        <span className="xd-xenesis-slash-usage">{suggestion.usage}</span>
                        <span className="xd-xenesis-slash-desc">{suggestion.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
              <footer className="xd-xenesis-terminal-statusbar" aria-label="Xenesis terminal status">
                <div className="xd-xenesis-statusbar-items">
                  {statusItems.map((item) => (
                    <span key={item.key} className="xd-xenesis-statusbar-chip" title={`${item.label}: ${item.value}`}>
                      <b>{item.label}</b>
                      <span>{item.value}</span>
                    </span>
                  ))}
                </div>
                <details className="xd-xenesis-statusbar-picker" data-xenesis-no-terminal-focus="true">
                  <summary>상태 표시</summary>
                  <div className="xd-xenesis-statusbar-menu">
                    <div className="xd-xenesis-statusbar-menu-head">
                      <strong>하단 상태바 항목</strong>
                      <button type="button" onClick={resetStatusBarKeys}>
                        기본값
                      </button>
                    </div>
                    {XENESIS_STATUS_BAR_CHOICES.map((choice) => (
                      <label key={choice.key} className="xd-xenesis-statusbar-choice">
                        <input
                          type="checkbox"
                          checked={selectedStatusBarKeys.includes(choice.key)}
                          onChange={(event) => setStatusBarKey(choice.key, event.currentTarget.checked)}
                        />
                        <span>
                          <b>{choice.label}</b>
                          <small>{choice.description}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </details>
              </footer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
