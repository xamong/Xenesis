import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { McpBridgeBotApprovalUi, McpBridgeBotArtifact, McpBridgeBotChannelName } from '../../../../shared/types';
import { StreamingXconMarkdown } from '../../../markdown/StreamingXconMarkdown';
import {
  getRendererPerformanceTraceDuration,
  getRendererPerformanceTraceNow,
  recordRendererPerformanceTrace,
} from '../../../utils/performanceTrace';
import { buildCurrentDeskBotContextMessage } from '../xenisBotContext';
import {
  getXenisBotSession,
  recordXenisBotEvent,
  recordXenisBotLocalMessage,
  subscribeXenisBotSession,
  type XenisBotMessage,
  type XenisBotSession,
} from '../xenisBotStore';

interface XenisBotPaneProps {
  sessionId?: string;
  inputUrl?: string;
  source?: string;
  channel?: McpBridgeBotChannelName;
}

interface BotStarterAction {
  label: string;
  title: string;
  message: string;
  commandId?: string;
}

const BOT_STARTER_ACTIONS: BotStarterAction[] = [
  {
    label: 'AI Workbench',
    title: 'Open the Xenesis Desk AI Workbench context cockpit',
    message: '',
    commandId: 'xenesis-desk.core-tools.openAiWorkbench',
  },
  {
    label: 'Artifact Library',
    title: 'Open generated Markdown, XCON, screenshot, and trace artifacts',
    message: '',
    commandId: 'xenesis-desk.core-tools.openArtifactLibrary',
  },
  {
    label: 'Pane Visual Context',
    title: 'Capture or inspect the active pane as visual AI context',
    message:
      'Use the active Xenesis Desk pane as visual context. If an image is needed, open Xenesis Desk AI Workbench and use Capture Pane to send the screenshot artifact before diagnosing layout, rendering, or clipped content.',
    commandId: 'xenesis-desk.core-tools.openAiWorkbench',
  },
  {
    label: 'Terminal Inspector',
    title: 'Open terminal state and AI inspection tools',
    message: '',
    commandId: 'xenesis-desk.core-tools.openTerminalInspector',
  },
  {
    label: 'Process Viewer',
    title: 'Open the guarded local process list',
    message: '',
    commandId: 'xenesis-desk.core-tools.openProcessViewer',
  },
  {
    label: 'Remote Sync Planner',
    title: 'Compare a local folder with a remote file profile',
    message: '',
    commandId: 'xenesis-desk.core-tools.openRemoteSyncPlanner',
  },
  {
    label: 'Run Task Panel',
    title: 'Run commands as inspectable jobs',
    message: '',
    commandId: 'xenesis-desk.core-tools.openRunTaskPanel',
  },
  {
    label: 'Safe File Edit Center',
    title: 'Review local text file changes with diff, backup, and restore',
    message: '',
    commandId: 'xenesis-desk.core-tools.openSafeFileEditCenter',
  },
  {
    label: 'Current Desk',
    title: 'Inspect the current Xenesis Desk state through MCP context tools',
    message: buildCurrentDeskBotContextMessage(),
  },
  {
    label: 'Active Terminal',
    title: 'Read the active terminal context before answering',
    message:
      'Use xenesis_desk_active_context to find the active terminal, then use xenesis_desk_terminal_tail for recent output before answering.',
  },
  {
    label: 'Safe File Write',
    title: 'Use diff preview, approval, backup, and restore tools for file changes',
    message:
      'When changing local text files, first call xenesis_desk_preview_text_file_write, explain the diff, wait for approval, then call xenesis_desk_apply_text_file_write. Include the backup path and restore with xenesis_desk_restore_text_file_backup if needed.',
  },
  {
    label: 'Context',
    title: 'Show current Xenesis Desk context',
    message: '/xd mobile',
  },
  {
    label: 'Dashboard',
    title: 'Create a dashboard artifact from the current Desk context',
    message: 'Create a dashboard-workflow XCON artifact from the current Xenesis Desk context.',
  },
  {
    label: 'Sketch',
    title: 'Create a sketch artifact from the current Desk context',
    message: 'Create an xcon-sketch UI artifact from the current Xenesis Desk context.',
  },
  {
    label: 'Repair',
    title: 'Review and repair the current XCON or Markdown artifact',
    message: 'Review and repair the current XCON or Markdown artifact using review-repair guidance.',
  },
];

const ACTIVE_BOT_STATUSES = new Set([
  'sent',
  'queued',
  'pending',
  'running',
  'thinking',
  'working',
  'streaming',
  'typing',
]);
const BOT_CHANNEL_LABELS: Record<McpBridgeBotChannelName, string> = {
  hermes: 'Hermes',
  telegram: 'Telegram',
  slack: 'Slack',
  discord: 'Discord',
  webhook: 'Webhook',
  agent: 'Agent',
  server: 'Server',
  external: 'External Bot',
};
const StableStreamingXconMarkdown = React.memo(StreamingXconMarkdown);
const DEFAULT_APPROVAL_CHOICES = ['once', 'session', 'always', 'deny'] as const;
const DEFAULT_APPROVAL_BUTTON_LABELS: Record<string, string> = {
  once: 'Approve Once',
  session: 'Approve Session',
  always: 'Always Approve',
  deny: 'Deny',
};

function nowIso(): string {
  return new Date().toISOString();
}

function cleanBotChannel(value?: string): McpBridgeBotChannelName | undefined {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!text) return undefined;
  const compact = text.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (compact in BOT_CHANNEL_LABELS) return compact as McpBridgeBotChannelName;
  if (/\bhermes\b/.test(text)) return 'hermes';
  if (/\btelegram\b|\btg\b/.test(text)) return 'telegram';
  if (/\bslack\b/.test(text)) return 'slack';
  if (/\bdiscord\b/.test(text)) return 'discord';
  if (/\bwebhook\b|\bweb-hook\b/.test(text)) return 'webhook';
  if (/\bagent\b|\bcli\b/.test(text)) return 'agent';
  if (/\bserver\b|\bgateway\b/.test(text)) return 'server';
  return 'external';
}

function botChannelLabel(channel?: McpBridgeBotChannelName, source?: string): string {
  if (channel && BOT_CHANNEL_LABELS[channel]) return BOT_CHANNEL_LABELS[channel];
  const cleanSource = source?.trim();
  return cleanSource || 'Xenesis Bot';
}

function normalizeApprovalChoice(choice: string): string {
  return choice.trim().toLowerCase();
}

function approvalChoicesForMessage(approvalUi?: McpBridgeBotApprovalUi): string[] {
  const seen = new Set<string>();
  const choices: string[] = [];
  const pushChoice = (choice: string) => {
    const normalized = normalizeApprovalChoice(choice);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    choices.push(normalized);
  };

  DEFAULT_APPROVAL_CHOICES.forEach(pushChoice);
  approvalUi?.choices?.forEach(pushChoice);

  return choices.filter((choice) => choice !== 'deny').concat(seen.has('deny') ? ['deny'] : []);
}

function approvalButtonLabel(choice: string, approvalUi?: McpBridgeBotApprovalUi): string {
  return approvalUi?.buttonLabels?.[choice] || DEFAULT_APPROVAL_BUTTON_LABELS[choice] || choice;
}

function approvalCommandForChoice(choice: string): string {
  return choice === 'deny' ? '/deny' : `/approve ${choice}`;
}

function quoteXdCommandArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function artifactOpenCommand(artifact: McpBridgeBotArtifact): string {
  const command = artifact.openCommand?.trim();
  if (command) return command;
  const filePath = artifact.filePath?.trim();
  return filePath ? `/xd open ${quoteXdCommandArg(filePath)}` : '';
}

function artifactFocusCommand(artifact: McpBridgeBotArtifact): string {
  const command = artifact.focusCommand?.trim();
  if (command) return command;
  return artifactOpenCommand(artifact);
}

function artifactLabel(artifact: McpBridgeBotArtifact, index: number): string {
  return artifact.title || artifact.filePath || artifact.kind || `Artifact ${index + 1}`;
}

function isNearScrollBottom(element: HTMLElement, thresholdPx = 80): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= thresholdPx;
}

function formatActivityDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`;
}

function activityPhaseLabel(
  status: string,
  hasStreamingMessage: boolean,
  pendingSendCount: number,
  channelLabel: string,
): string {
  const normalized = status.trim().toLowerCase();
  if (hasStreamingMessage || normalized === 'streaming') return 'Streaming response';
  if (pendingSendCount > 0 || normalized === 'sent') return 'Sending request';
  if (normalized === 'queued' || normalized === 'pending') return `Waiting for ${channelLabel}`;
  if (normalized === 'typing' || normalized === 'thinking' || normalized === 'running' || normalized === 'working') {
    return `${channelLabel} is working`;
  }
  return '';
}

interface XenisBotMessageArticleProps {
  message: XenisBotMessage;
  highlighted: boolean;
  effectiveInputUrl: string;
  bindMessageRef: (messageId: string) => (node: HTMLElement | null) => void;
  sendStarterMessage: (message: string) => void;
  sendArtifactCommand: (command: string, label: string, action: string) => void;
  revealArtifactPath: (artifact: McpBridgeBotArtifact, label: string) => void;
  copyArtifactPath: (artifact: McpBridgeBotArtifact, label: string) => void;
  channelLabel: string;
}

function sameArtifacts(left?: McpBridgeBotArtifact[], right?: McpBridgeBotArtifact[]): boolean {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return (
      item.title === other.title &&
      item.kind === other.kind &&
      item.filePath === other.filePath &&
      item.openCommand === other.openCommand &&
      item.focusCommand === other.focusCommand
    );
  });
}

function sameApprovalUi(left?: McpBridgeBotApprovalUi, right?: McpBridgeBotApprovalUi): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.title === right.title &&
    left.subjectLabel === right.subjectLabel &&
    left.reasonLabel === right.reasonLabel &&
    JSON.stringify(left.choices || []) === JSON.stringify(right.choices || []) &&
    JSON.stringify(left.buttonLabels || {}) === JSON.stringify(right.buttonLabels || {})
  );
}

interface XenisBotActivityProps {
  active: boolean;
  status: string;
  hasStreamingMessage: boolean;
  pendingSendCount: number;
  updatedAt: string;
  channelLabel: string;
}

function XenisBotActivity({
  active,
  status,
  hasStreamingMessage,
  pendingSendCount,
  updatedAt,
  channelLabel,
}: XenisBotActivityProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startedAtRef.current = null;
      return undefined;
    }

    const now = Date.now();
    if (startedAtRef.current === null) {
      startedAtRef.current = now;
    }
    setNowMs(now);
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;

  const phase = activityPhaseLabel(status, hasStreamingMessage, pendingSendCount, channelLabel);
  if (!phase) return null;

  const startedAt = startedAtRef.current ?? nowMs;
  const updatedAtMs = Date.parse(updatedAt);
  const lastUpdateAgeMs = Number.isFinite(updatedAtMs) ? Math.max(0, nowMs - updatedAtMs) : 0;

  return (
    <div className="xdbot-activity" role="status" aria-live="polite">
      <span className="xdbot-activity-dots" aria-hidden="true">
        <span className="xdbot-activity-dot" />
        <span className="xdbot-activity-dot" />
        <span className="xdbot-activity-dot" />
      </span>
      <span className="xdbot-activity-phase">{phase}</span>
      <span className="xdbot-activity-time">{formatActivityDuration(nowMs - startedAt)}</span>
      <span className="xdbot-activity-detail">last update {formatActivityDuration(lastUpdateAgeMs)} ago</span>
    </div>
  );
}

const XenisBotMessageArticle = React.memo(
  function XenisBotMessageArticle({
    message,
    highlighted,
    effectiveInputUrl,
    bindMessageRef,
    sendStarterMessage,
    sendArtifactCommand,
    revealArtifactPath,
    copyArtifactPath,
    channelLabel,
  }: XenisBotMessageArticleProps) {
    const messageRenderTraceStartedAt = getRendererPerformanceTraceNow();
    const contentChars = message.content.length;
    const artifactCount = message.artifacts?.length ?? 0;

    useEffect(() => {
      recordRendererPerformanceTrace({
        scope: 'xdbot',
        action: 'message-rendered',
        durationMs: getRendererPerformanceTraceDuration(messageRenderTraceStartedAt),
        details: {
          messageId: message.id,
          role: message.role,
          streaming: message.streaming,
          highlighted,
          contentChars,
          artifactCount,
        },
      });
    }, [
      artifactCount,
      contentChars,
      highlighted,
      message.id,
      message.role,
      message.streaming,
      messageRenderTraceStartedAt,
    ]);

    return (
      <article
        ref={bindMessageRef(message.id)}
        className={`xdbot-message is-${message.role}${message.streaming ? ' is-streaming' : ''}${highlighted ? ' is-highlighted' : ''}`}
      >
        <div className="xdbot-message-meta">
          <span>{message.role}</span>
          {message.streaming && <span>streaming</span>}
        </div>
        <StableStreamingXconMarkdown content={message.content} className="xdbot-markdown" deferRendering />
        {message.approvalUi && (
          <div className="xdbot-approval">
            <div className="xdbot-approval-title">{message.approvalUi.title || 'Approval required'}</div>
            <div className="xdbot-approval-actions">
              {approvalChoicesForMessage(message.approvalUi).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`xdbot-approval-button is-${choice === 'deny' ? 'deny' : 'approve'}`}
                  disabled={!effectiveInputUrl.trim()}
                  onClick={() => sendStarterMessage(approvalCommandForChoice(choice))}
                >
                  {approvalButtonLabel(choice, message.approvalUi)}
                </button>
              ))}
            </div>
          </div>
        )}
        {message.artifacts?.length ? (
          <div className="xdbot-artifacts" aria-label={`${channelLabel} artifacts`}>
            {message.artifacts.map((artifact, index) => {
              const openCommand = artifactOpenCommand(artifact);
              const focusCommand = artifactFocusCommand(artifact);
              const label = artifactLabel(artifact, index);
              const title = artifact.filePath || artifact.openCommand || label;
              return (
                <div key={`${message.id}-artifact-${index}`} className="xdbot-artifact-card">
                  <div className="xdbot-artifact-title" title={title}>
                    {artifact.kind ? `${label} (${artifact.kind})` : label}
                  </div>
                  <div className="xdbot-artifact-actions">
                    <button
                      type="button"
                      className="xdbot-artifact-button"
                      disabled={!openCommand || !effectiveInputUrl.trim()}
                      onClick={() => sendArtifactCommand(artifactOpenCommand(artifact), label, 'Open')}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="xdbot-artifact-button"
                      disabled={!focusCommand || !effectiveInputUrl.trim()}
                      onClick={() => sendArtifactCommand(artifactFocusCommand(artifact), label, 'Focus')}
                    >
                      Focus
                    </button>
                    <button
                      type="button"
                      className="xdbot-artifact-button"
                      disabled={!artifact.filePath}
                      onClick={() => revealArtifactPath(artifact, label)}
                    >
                      Reveal
                    </button>
                    <button
                      type="button"
                      className="xdbot-artifact-button"
                      disabled={!artifact.filePath}
                      onClick={() => copyArtifactPath(artifact, label)}
                    >
                      Copy path
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </article>
    );
  },
  (previous, next) =>
    previous.highlighted === next.highlighted &&
    previous.effectiveInputUrl === next.effectiveInputUrl &&
    previous.channelLabel === next.channelLabel &&
    previous.message.id === next.message.id &&
    previous.message.role === next.message.role &&
    previous.message.content === next.message.content &&
    previous.message.streaming === next.message.streaming &&
    sameApprovalUi(previous.message.approvalUi, next.message.approvalUi) &&
    sameArtifacts(previous.message.artifacts, next.message.artifacts),
);

export function XenisBotPane({ sessionId = 'xenesis-bot', inputUrl, source, channel }: XenisBotPaneProps) {
  const resolvedSessionId = sessionId.trim() || 'xenesis-bot';
  const [session, setSession] = useState<XenisBotSession>(() => getXenisBotSession(resolvedSessionId));
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const [artifactStatus, setArtifactStatus] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState('');
  const [pendingSendCount, setPendingSendCount] = useState(0);
  const [starterMenuOpen, setStarterMenuOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const starterMenuRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const shouldStickToBottomRef = useRef(true);
  const highlightTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => subscribeXenisBotSession(resolvedSessionId, setSession), [resolvedSessionId]);

  useEffect(() => {
    if (!inputUrl && !source && !channel) return;
    recordXenisBotEvent({
      type: 'session',
      sessionId: resolvedSessionId,
      messageId: `${resolvedSessionId}-session`,
      role: 'system',
      delta: '',
      content: '',
      title: 'Xenesis Bot',
      source: source ?? '',
      ...(channel ? { channel } : {}),
      status: '',
      inputUrl: inputUrl ?? '',
      at: nowIso(),
    });
  }, [channel, inputUrl, resolvedSessionId, source]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!shouldStickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [session.messages.length, session.updatedAt]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string; messageId?: string }>).detail;
      const targetSessionId =
        typeof detail?.sessionId === 'string' && detail.sessionId.trim() ? detail.sessionId.trim() : 'xenesis-bot';
      const messageId = typeof detail?.messageId === 'string' ? detail.messageId.trim() : '';
      if (!messageId || targetSessionId !== resolvedSessionId) return;

      setHighlightedMessageId(messageId);
      if (highlightTimerRef.current !== undefined) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedMessageId((current) => (current === messageId ? '' : current));
      }, 6000);
    };
    window.addEventListener('xenesis-bot-highlight-message', handler);
    return () => {
      window.removeEventListener('xenesis-bot-highlight-message', handler);
      if (highlightTimerRef.current !== undefined) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, [resolvedSessionId]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    const node = messageRefs.current.get(highlightedMessageId);
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightedMessageId, session.messages.length, session.updatedAt]);

  useEffect(() => {
    if (!starterMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const node = starterMenuRef.current;
      if (!node || node.contains(event.target as Node)) return;
      setStarterMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStarterMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [starterMenuOpen]);

  const bindMessageRef = useCallback((messageId: string) => {
    return (node: HTMLElement | null) => {
      if (node) {
        messageRefs.current.set(messageId, node);
      } else {
        messageRefs.current.delete(messageId);
      }
    };
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    shouldStickToBottomRef.current = isNearScrollBottom(el);
  }, []);

  const effectiveInputUrl = inputUrl || session.inputUrl;
  const channelName = cleanBotChannel(channel || session.channel || source || session.source);
  const channelLabel = botChannelLabel(channelName, source || session.source);
  const canSend = draft.trim().length > 0 && effectiveInputUrl.trim().length > 0;
  const normalizedSessionStatus = session.status.trim().toLowerCase();
  const hasStreamingMessage = useMemo(() => session.messages.some((message) => message.streaming), [session.messages]);
  const isBotBusy = pendingSendCount > 0 || hasStreamingMessage || ACTIVE_BOT_STATUSES.has(normalizedSessionStatus);

  const statusText = useMemo(() => {
    const parts = [session.source, session.status].map((item) => item.trim()).filter(Boolean);
    return parts.join(' / ');
  }, [session.source, session.status]);

  async function submitBotText(rawText: string, options: { clearDraft?: boolean } = {}) {
    const text = rawText.trim();
    if (!text || !effectiveInputUrl.trim()) return;
    if (options.clearDraft) setDraft('');
    shouldStickToBottomRef.current = true;
    setSendError('');
    recordXenisBotLocalMessage(resolvedSessionId, text);
    setPendingSendCount((count) => count + 1);
    try {
      const response = await fetch(effectiveInputUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: resolvedSessionId,
          text,
          userId: 'xenesis',
          userName: 'Xenesis Desk',
          xenesis_desk: {
            surface: 'bot',
            mode: 'visual-cockpit',
            artifactFormats: ['markdown', 'xcon', 'xcon-sketch'],
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSendError(message);
      recordXenisBotEvent({
        type: 'error',
        sessionId: resolvedSessionId,
        messageId: `${resolvedSessionId}-send-error-${Date.now()}`,
        role: 'system',
        delta: '',
        content: `Send failed: ${message}`,
        title: '',
        source: '',
        status: 'error',
        inputUrl: '',
        at: nowIso(),
      });
    } finally {
      setPendingSendCount((count) => Math.max(0, count - 1));
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitBotText(draft, { clearDraft: true });
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (!canSend) return;
    void submitBotText(draft, { clearDraft: true });
  }

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string; text?: string }>).detail;
      const targetSessionId =
        typeof detail?.sessionId === 'string' && detail.sessionId.trim() ? detail.sessionId.trim() : 'xenesis-bot';
      const text = typeof detail?.text === 'string' ? detail.text.trim() : '';
      if (!text || targetSessionId !== resolvedSessionId) return;
      void submitBotText(text);
    };
    window.addEventListener('xenesis-bot-run-command', handler);
    return () => window.removeEventListener('xenesis-bot-run-command', handler);
  }, [effectiveInputUrl, resolvedSessionId]);

  function sendStarterMessage(message: string) {
    void submitBotText(message);
  }

  function runStarterAction(action: BotStarterAction) {
    setStarterMenuOpen(false);
    if (action.commandId) {
      void window.extensionAPI.runCommand(action.commandId);
      return;
    }
    sendStarterMessage(action.message);
  }

  function sendArtifactCommand(command: string, label: string, action: string) {
    if (!command) return;
    setArtifactStatus(`${action}: ${label}`);
    sendStarterMessage(command);
  }

  async function revealArtifactPath(artifact: McpBridgeBotArtifact, label: string) {
    const filePath = artifact.filePath?.trim();
    if (!filePath) return;
    try {
      await window.terminalAPI?.revealPath(filePath);
      setArtifactStatus(`Reveal: ${label}`);
    } catch (error) {
      setArtifactStatus(`Reveal failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function copyArtifactPath(artifact: McpBridgeBotArtifact, label: string) {
    const filePath = artifact.filePath?.trim();
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
      setArtifactStatus(`Copied path: ${label}`);
    } catch (error) {
      setArtifactStatus(`Copy failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <div className="xdbot-pane">
      <header className="xdbot-header">
        <div className="xdbot-title">Xenesis Bot</div>
        <div className="xdbot-session">{session.id}</div>
        {statusText && <div className="xdbot-status">{statusText}</div>}
      </header>
      <div ref={listRef} className="xdbot-messages" onScroll={handleMessagesScroll}>
        {session.messages.map((message) => (
          <XenisBotMessageArticle
            key={message.id}
            message={message}
            highlighted={message.id === highlightedMessageId}
            effectiveInputUrl={effectiveInputUrl}
            bindMessageRef={bindMessageRef}
            sendStarterMessage={sendStarterMessage}
            sendArtifactCommand={sendArtifactCommand}
            revealArtifactPath={revealArtifactPath}
            copyArtifactPath={copyArtifactPath}
            channelLabel={channelLabel}
          />
        ))}
      </div>
      <div className="xdbot-starters" aria-label={`${channelLabel} starter actions`}>
        <div className="xdbot-starter-menu" ref={starterMenuRef}>
          <button
            type="button"
            className="xdbot-starter-menu-button"
            aria-haspopup="menu"
            aria-expanded={starterMenuOpen}
            onClick={() => setStarterMenuOpen((value) => !value)}
          >
            Tools ▾
          </button>
          {starterMenuOpen && (
            <div className="xdbot-starter-menu-panel" role="menu">
              {BOT_STARTER_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  className="xdbot-starter-menu-item"
                  title={action.title}
                  disabled={!action.commandId && !effectiveInputUrl.trim()}
                  onClick={() => runStarterAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <XenisBotActivity
        active={isBotBusy}
        status={session.status}
        hasStreamingMessage={hasStreamingMessage}
        pendingSendCount={pendingSendCount}
        updatedAt={session.updatedAt}
        channelLabel={channelLabel}
      />
      <form className="xdbot-composer" onSubmit={sendMessage}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          aria-label={`Message ${channelLabel}`}
          placeholder={`Message ${channelLabel}`}
          rows={3}
        />
        <button type="submit" disabled={!canSend}>
          Send
        </button>
      </form>
      {artifactStatus && <div className="xdbot-artifact-status">{artifactStatus}</div>}
      {sendError && <div className="xdbot-send-error">{sendError}</div>}
    </div>
  );
}
