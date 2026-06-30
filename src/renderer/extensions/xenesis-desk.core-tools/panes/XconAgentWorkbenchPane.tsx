import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  FsEntry,
  LocalCliAgentStatus,
  OpenFileResult,
  XenesisApprovalRequest,
  XenesisApprovalResolution,
  XenesisRunResult,
  XenesisStatus,
} from '../../../../shared/types';
import {
  shouldConsumeXenesisRunEvent,
  XENESIS_AGENT_WORKBENCH_RUN_SOURCE,
} from '../../../../shared/xenesisRunEventScope';
import { StreamingXconMarkdown } from '../../../markdown/StreamingXconMarkdown';
import {
  appendXconWorkbenchAssistantDelta,
  appendXconWorkbenchRawEvent,
  buildXconWorkbenchMarkdownFileExample,
  buildXconWorkbenchProviderOptions,
  buildXconWorkbenchRunRequest,
  createXconWorkbenchExampleDeltaEvents,
  createXconWorkbenchMessage,
  createXconWorkbenchProgressLine,
  DEFAULT_XCON_WORKBENCH_PANEL_SIZES,
  dragXconWorkbenchPanelSizes,
  getXconWorkbenchExamples,
  isXconWorkbenchMarkdownDemoFile,
  normalizeXconWorkbenchPanelSizes,
  normalizeXconWorkbenchPrompt,
  parseXconWorkbenchApprovalResolution,
  resolveXconWorkbenchFinalMarkdown,
  resolveXconWorkbenchRenderableMarkdown,
  selectXconWorkbenchPendingApprovals,
  summarizeXconWorkbenchActivity,
  XCON_WORKBENCH_EXAMPLE_DELTA_CHUNK_SIZE,
  XCON_WORKBENCH_EXAMPLE_STREAM_DELAY_MS,
  type XconWorkbenchExample,
  type XconWorkbenchMessage,
  type XconWorkbenchMode,
  type XconWorkbenchPanelResizeTarget,
  type XconWorkbenchPanelSizes,
  type XconWorkbenchRawEntry,
} from './xconAgentWorkbenchModel';
import {
  appendXenesisAttachmentPromptContext,
  classifyXenesisAttachment,
  dedupeXenesisAttachments,
  formatXenesisAttachmentSize,
  getXenesisLocalExplorerDropPath,
  hasXenesisAttachmentDropPayload,
  toXenesisProviderAttachments,
  type XenesisAgentAttachment,
} from './xenesisAgentAttachments';
import { createWorkbenchId, nowIso } from './xenesisWorkbenchStream';

const HISTORY_MESSAGE_LIMIT = 12;
const RAW_ENTRY_LIMIT = 160;
const MARKDOWN_DEMO_SCAN_LIMIT = 160;
const MARKDOWN_DEMO_SCAN_DEPTH_LIMIT = 6;
const SKIPPED_MARKDOWN_DEMO_DIRS = new Set(['.git', '.hg', '.svn', 'node_modules', 'dist', 'out', 'build']);
const XCON_WORKBENCH_ATTACHMENT_IMAGE_PREVIEW_MAX_BYTES = 5 * 1024 * 1024;
const XCON_WORKBENCH_ATTACHMENT_TEXT_PREVIEW_MAX_BYTES = 1024 * 1024;
const XCON_WORKBENCH_ATTACHMENT_TEXT_PREVIEW_CHARS = 4000;
const XCON_WORKBENCH_TEXT_ATTACHMENT_EXTENSION_PATTERN =
  /\.(?:bat|cmd|css|csv|html?|ini|js|json|jsonc|jsx|log|md|markdown|mjs|ps1|py|sh|sketch|ts|tsx|tsv|txt|xcon|xconj|xcons|xcont|xconx|xml|ya?ml)$/i;
const XCON_WORKBENCH_IMAGE_MIME_BY_EXT: Record<string, string> = {
  apng: 'image/apng',
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};
const XCON_WORKBENCH_TEXT_MIME_BY_EXT: Record<string, string> = {
  css: 'text/css',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
  js: 'application/javascript',
  json: 'application/json',
  jsonc: 'application/json',
  log: 'text/plain',
  markdown: 'text/markdown',
  md: 'text/markdown',
  mjs: 'application/javascript',
  mmd: 'text/markdown',
  sketch: 'text/plain',
  ts: 'application/typescript',
  tsx: 'application/typescript',
  txt: 'text/plain',
  xcon: 'text/plain',
  xconj: 'application/json',
  xml: 'application/xml',
  yaml: 'application/yaml',
  yml: 'application/yaml',
};

interface MarkdownDemoFileItem {
  filePath: string;
  fileName: string;
  relativePath: string;
}

interface XconAgentWorkbenchPaneCacheState {
  panelSizes: XconWorkbenchPanelSizes;
  railVisible: boolean;
  rawVisible: boolean;
  status: XenesisStatus | null;
  mode: XconWorkbenchMode;
  selectedProvider: string;
  prompt: string;
  messages: XconWorkbenchMessage[];
  rawEntries: XconWorkbenchRawEntry[];
  activeSessionId: string;
  running: boolean;
  error: string;
  approvalItems: XenesisApprovalRequest[];
  approvalNotice: string;
  runStartedAt: string;
  activityText: string;
  progressNow: string;
  markdownDemoFolder: string;
  markdownDemoFiles: MarkdownDemoFileItem[];
  markdownDemoError: string;
  activeAssistantId: string;
  streamedMarkdown: string;
  attachments: XenesisAgentAttachment[];
  attachmentError: string;
}

type ComposerContextAction = 'cut' | 'copy' | 'paste' | 'selectAll';

interface ComposerContextMenuState {
  x: number;
  y: number;
  canEdit: boolean;
  hasSelection: boolean;
}

function createDefaultXconAgentWorkbenchPaneState(): XconAgentWorkbenchPaneCacheState {
  return {
    panelSizes: normalizeXconWorkbenchPanelSizes(DEFAULT_XCON_WORKBENCH_PANEL_SIZES),
    railVisible: false,
    rawVisible: false,
    status: null,
    mode: 'chat',
    selectedProvider: '',
    prompt: '',
    messages: [],
    rawEntries: [],
    activeSessionId: '',
    running: false,
    error: '',
    approvalItems: [],
    approvalNotice: '',
    runStartedAt: '',
    activityText: '',
    progressNow: nowIso(),
    markdownDemoFolder: '',
    markdownDemoFiles: [],
    markdownDemoError: '',
    activeAssistantId: '',
    streamedMarkdown: '',
    attachments: [],
    attachmentError: '',
  };
}

function cloneXconAgentWorkbenchPaneState(state: XconAgentWorkbenchPaneCacheState): XconAgentWorkbenchPaneCacheState {
  return {
    ...state,
    panelSizes: normalizeXconWorkbenchPanelSizes(state.panelSizes),
    status: state.status ? { ...state.status } : null,
    messages: state.messages.map((message) => ({ ...message })),
    rawEntries: state.rawEntries.map((entry) => ({ ...entry })),
    approvalItems: state.approvalItems.map((item) => ({ ...item })),
    markdownDemoFiles: state.markdownDemoFiles.map((item) => ({ ...item })),
    attachments: state.attachments.map((item) => ({ ...item })),
  };
}

let xconAgentWorkbenchPaneState = createDefaultXconAgentWorkbenchPaneState();

function restoreXconAgentWorkbenchPaneState(): XconAgentWorkbenchPaneCacheState {
  return cloneXconAgentWorkbenchPaneState(xconAgentWorkbenchPaneState);
}

function saveXconAgentWorkbenchPaneState(state: XconAgentWorkbenchPaneCacheState): void {
  xconAgentWorkbenchPaneState = cloneXconAgentWorkbenchPaneState(state);
}

function statusLabel(status: XenesisStatus | null, running: boolean): string {
  if (running) return 'Streaming';
  if (!status) return 'Unknown';
  if (status.error) return 'Error';
  if (status.enabled === false) return 'Disabled';
  if (status.running) return 'Ready';
  return 'Stopped';
}

function compactWorkspace(status: XenesisStatus | null): string {
  const workspace = status?.workspace?.trim();
  if (!workspace) return '-';
  const normalized = workspace.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts.slice(-2).join('/') || workspace;
}

function toHistoryMessages(messages: XconWorkbenchMessage[]) {
  return messages
    .filter((message) => message.content.trim())
    .slice(-HISTORY_MESSAGE_LIMIT)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function createRawEntry(kind: string, summary: string, detail?: string, error?: boolean): XconWorkbenchRawEntry {
  return {
    id: createWorkbenchId('agent-workbench-raw'),
    at: nowIso(),
    kind,
    summary,
    detail,
    error,
  };
}

function splitProgressLine(line: string): { label: string; meta: string } {
  const parts = line
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean);
  const label = (parts.shift() || line).replace(/\s*\.\.\.\s*$/, '').trim();
  return {
    label: label || line,
    meta: parts.join(' · '),
  };
}

function responseFileName(message: XconWorkbenchMessage): string {
  const stamp = message.at.replace(/[:.]/g, '-').replace(/[TZ]/g, '_').replace(/_$/, '');
  return `xenesis-response-${stamp}.md`;
}

function resultDetail(result: XenesisRunResult): string {
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function approvalPreview(item: XenesisApprovalRequest): string {
  const legacy = item.legacy || {};
  const preview = typeof legacy.preview === 'string' ? legacy.preview.trim() : '';
  if (preview) return preview;
  if (item.capabilityArgs !== undefined) {
    try {
      return JSON.stringify(item.capabilityArgs, null, 2);
    } catch {
      return String(item.capabilityArgs);
    }
  }
  const input = legacy.input;
  if (input !== undefined) {
    try {
      return JSON.stringify(input, null, 2);
    } catch {
      return String(input);
    }
  }
  return item.command;
}

async function writeComposerClipboardText(text: string): Promise<boolean> {
  if (!text) return false;
  if (!navigator.clipboard?.writeText) return document.execCommand('copy');
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return document.execCommand('copy');
  }
}

async function readComposerClipboardText(): Promise<string> {
  if (!navigator.clipboard?.readText) return '';
  try {
    return (await navigator.clipboard.readText()) || '';
  } catch {
    return '';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function sortFsEntries(entries: FsEntry[]): FsEntry[] {
  return [...entries].sort((left, right) => {
    if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  });
}

function relativeMarkdownDemoPath(rootPath: string, filePath: string, fileName: string): string {
  const normalizedRoot = rootPath.replace(/[\\/]+$/, '');
  const normalizedFile = filePath.replace(/\\/g, '/');
  const normalizedRootSlash = normalizedRoot.replace(/\\/g, '/');
  const prefix = `${normalizedRootSlash}/`;
  return normalizedFile.startsWith(prefix) ? normalizedFile.slice(prefix.length) : fileName;
}

function shouldSkipMarkdownDemoDir(entry: FsEntry): boolean {
  return SKIPPED_MARKDOWN_DEMO_DIRS.has(entry.name.toLowerCase());
}

function workbenchPanelStyle(sizes: XconWorkbenchPanelSizes): React.CSSProperties {
  return {
    '--xd-agent-workbench-rail-width': `${sizes.railWidth}px`,
    '--xd-agent-workbench-raw-width': `${sizes.rawWidth}px`,
  } as React.CSSProperties;
}

function isXconWorkbenchTextAttachmentFile(file: File): boolean {
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
    XCON_WORKBENCH_TEXT_ATTACHMENT_EXTENSION_PATTERN.test(file.name)
  );
}

function encodeXconWorkbenchBytesAsBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function readXconWorkbenchFileAsDataUrl(file: File): Promise<string> {
  if (typeof file.arrayBuffer === 'function') {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return `data:${file.type || 'application/octet-stream'};base64,${encodeXconWorkbenchBytesAsBase64(bytes)}`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error(`Failed to read ${file.name}.`));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  });
}

async function createXconWorkbenchAttachmentFromFile(file: File): Promise<XenesisAgentAttachment> {
  const path = window.fileAPI?.getPathForFile?.(file) || '';
  const kind = classifyXenesisAttachment(file);
  const attachment: XenesisAgentAttachment = {
    id: `xcon-workbench-attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    name: file.name || path.split(/[\\/]/).pop() || 'attachment',
    size: file.size || 0,
    type: file.type || '',
    path,
    lastModified: file.lastModified || undefined,
  };

  if (kind === 'image' && file.size <= XCON_WORKBENCH_ATTACHMENT_IMAGE_PREVIEW_MAX_BYTES) {
    attachment.dataUrl = await readXconWorkbenchFileAsDataUrl(file);
  } else if (
    kind === 'file' &&
    file.size <= XCON_WORKBENCH_ATTACHMENT_TEXT_PREVIEW_MAX_BYTES &&
    isXconWorkbenchTextAttachmentFile(file)
  ) {
    attachment.previewText = (await file.text()).slice(0, XCON_WORKBENCH_ATTACHMENT_TEXT_PREVIEW_CHARS);
  }

  return attachment;
}

async function createXconWorkbenchAttachmentFromLocalPath(filePath: string): Promise<XenesisAgentAttachment> {
  const normalizedPath = filePath.trim();
  if (!normalizedPath) throw new Error('Attachment path is empty.');

  const [fileResult, transferPayload] = await Promise.all([
    (window.fileAPI?.readFile?.(normalizedPath) ?? Promise.resolve(null)).catch(() => null),
    (window.fsAPI?.readFileBase64?.(normalizedPath) ?? Promise.resolve(null)).catch(() => null),
  ]);

  if (transferPayload?.isDirectory) {
    throw new Error('Folders cannot be attached to Xenesis Agent Workbench.');
  }
  if (!fileResult && !transferPayload) {
    throw new Error(`Failed to read attachment: ${normalizedPath}`);
  }

  const name =
    fileResult?.fileName?.trim() ||
    transferPayload?.fileName?.trim() ||
    getXconWorkbenchPathFileName(normalizedPath) ||
    'attachment';
  const ext = (fileResult?.ext || getXconWorkbenchFileExtension(name)).toLowerCase();
  const type = inferXconWorkbenchAttachmentMime(name, ext, fileResult);
  const size =
    transferPayload?.size ??
    fileResult?.totalBytes ??
    estimateXconWorkbenchContentBytes(fileResult?.content || transferPayload?.contentBase64 || '');
  const kind = classifyXenesisAttachment({ name, type, size });
  const attachment: XenesisAgentAttachment = {
    id: `xcon-workbench-attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    name,
    size,
    type,
    path: normalizedPath,
  };

  if (kind === 'image' && size <= XCON_WORKBENCH_ATTACHMENT_IMAGE_PREVIEW_MAX_BYTES) {
    if (fileResult?.content?.startsWith('data:')) {
      attachment.dataUrl = fileResult.content;
    } else if (transferPayload?.contentBase64) {
      attachment.dataUrl = `data:${type || 'application/octet-stream'};base64,${transferPayload.contentBase64}`;
    }
  } else if (
    kind === 'file' &&
    size <= XCON_WORKBENCH_ATTACHMENT_TEXT_PREVIEW_MAX_BYTES &&
    isXconWorkbenchTextAttachmentResult(fileResult, name, type)
  ) {
    attachment.previewText = (fileResult?.content || '').slice(0, XCON_WORKBENCH_ATTACHMENT_TEXT_PREVIEW_CHARS);
  }

  return attachment;
}

function getXconWorkbenchPathFileName(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() || '';
}

function getXconWorkbenchFileExtension(fileName: string): string {
  const compoundMatch = /\.(xcon\.(?:json|xml|tagless)|xcon-workflow)$/i.exec(fileName);
  if (compoundMatch) return compoundMatch[1].toLowerCase();
  const match = /\.([^.\\/]+)$/.exec(fileName);
  return match?.[1]?.toLowerCase() || '';
}

function inferXconWorkbenchAttachmentMime(fileName: string, ext: string, fileResult: OpenFileResult | null): string {
  if (XCON_WORKBENCH_IMAGE_MIME_BY_EXT[ext]) return XCON_WORKBENCH_IMAGE_MIME_BY_EXT[ext];
  if (XCON_WORKBENCH_TEXT_MIME_BY_EXT[ext]) return XCON_WORKBENCH_TEXT_MIME_BY_EXT[ext];
  if (fileResult?.contentType === 'markdown' || fileResult?.contentType === 'mermaid') return 'text/markdown';
  if (fileResult?.contentType === 'code') return 'text/plain';
  if (fileResult?.contentType === 'document-preview' && ext === 'pdf') return 'application/pdf';
  if (XCON_WORKBENCH_TEXT_ATTACHMENT_EXTENSION_PATTERN.test(fileName)) return 'text/plain';
  return '';
}

function isXconWorkbenchTextAttachmentResult(
  fileResult: OpenFileResult | null,
  fileName: string,
  mimeType: string,
): boolean {
  if (!fileResult?.content) return false;
  if (
    fileResult.contentType === 'markdown' ||
    fileResult.contentType === 'mermaid' ||
    fileResult.contentType === 'code'
  )
    return true;
  if (mimeType.startsWith('text/')) return true;
  return XCON_WORKBENCH_TEXT_ATTACHMENT_EXTENSION_PATTERN.test(fileName);
}

function estimateXconWorkbenchContentBytes(content: string): number {
  if (!content) return 0;
  const base64 = content.includes(',') ? content.slice(content.indexOf(',') + 1) : content;
  const clean = base64.replace(/\s/g, '');
  if (!clean || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return new Blob([content]).size;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function isXconWorkbenchAttachmentDragEvent(event: React.DragEvent): boolean {
  return hasXenesisAttachmentDropPayload(event.dataTransfer);
}

export function XconAgentWorkbenchPane() {
  const xenesisApi = window.xenesisAPI;
  const apiUnavailable = !xenesisApi;
  const examples = useMemo(() => getXconWorkbenchExamples(), []);
  const restoredPaneState = restoreXconAgentWorkbenchPaneState();
  const [panelSizes, setPanelSizes] = useState<XconWorkbenchPanelSizes>(() => restoredPaneState.panelSizes);
  const [railVisible, setRailVisible] = useState(restoredPaneState.railVisible);
  const [rawVisible, setRawVisible] = useState(restoredPaneState.rawVisible);
  const [resizeTarget, setResizeTarget] = useState<XconWorkbenchPanelResizeTarget | null>(null);
  const [status, setStatus] = useState<XenesisStatus | null>(restoredPaneState.status);
  const [localCliAgents, setLocalCliAgents] = useState<LocalCliAgentStatus[]>([]);
  const [mode, setMode] = useState<XconWorkbenchMode>(restoredPaneState.mode);
  const [selectedProvider, setSelectedProvider] = useState(restoredPaneState.selectedProvider);
  const [prompt, setPrompt] = useState(restoredPaneState.prompt);
  const [messages, setMessages] = useState<XconWorkbenchMessage[]>(() => restoredPaneState.messages);
  const [rawEntries, setRawEntries] = useState<XconWorkbenchRawEntry[]>(() => restoredPaneState.rawEntries);
  const [activeSessionId, setActiveSessionId] = useState(restoredPaneState.activeSessionId);
  const [running, setRunning] = useState(restoredPaneState.running);
  const [error, setError] = useState(restoredPaneState.error);
  const [approvalItems, setApprovalItems] = useState<XenesisApprovalRequest[]>(() => restoredPaneState.approvalItems);
  const [approvalNotice, setApprovalNotice] = useState(restoredPaneState.approvalNotice);
  const [resolvingApprovalId, setResolvingApprovalId] = useState('');
  const [runStartedAt, setRunStartedAt] = useState(restoredPaneState.runStartedAt);
  const [activityText, setActivityText] = useState(restoredPaneState.activityText);
  const [progressNow, setProgressNow] = useState(() => restoredPaneState.progressNow || nowIso());
  const [markdownDemoFolder, setMarkdownDemoFolder] = useState(restoredPaneState.markdownDemoFolder);
  const [markdownDemoFiles, setMarkdownDemoFiles] = useState<MarkdownDemoFileItem[]>(
    () => restoredPaneState.markdownDemoFiles,
  );
  const [markdownDemoLoading, setMarkdownDemoLoading] = useState(false);
  const [markdownDemoError, setMarkdownDemoError] = useState(restoredPaneState.markdownDemoError);
  const [attachments, setAttachments] = useState<XenesisAgentAttachment[]>(() => restoredPaneState.attachments);
  const [attachmentError, setAttachmentError] = useState(restoredPaneState.attachmentError);
  const [attachmentDropActive, setAttachmentDropActive] = useState(false);
  const [composerContextMenu, setComposerContextMenu] = useState<ComposerContextMenuState | null>(null);
  const runningRef = useRef(restoredPaneState.running);
  const exampleRunningRef = useRef(false);
  const exampleRunTokenRef = useRef(0);
  const activeAssistantIdRef = useRef(restoredPaneState.activeAssistantId);
  const streamedMarkdownRef = useRef(restoredPaneState.streamedMarkdown);
  const refsRestoredRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const panelSizesRef = useRef(panelSizes);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const rawEndRef = useRef<HTMLDivElement>(null);
  const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const attachmentDragDepthRef = useRef(0);

  if (!refsRestoredRef.current) {
    activeAssistantIdRef.current = restoredPaneState.activeAssistantId;
    streamedMarkdownRef.current = restoredPaneState.streamedMarkdown;
    refsRestoredRef.current = true;
  }

  const pendingWorkbenchApprovals = useMemo(
    () =>
      selectXconWorkbenchPendingApprovals(approvalItems, {
        activeSessionId,
        runStartedAt,
        workspace: status?.workspace || '',
      }),
    [activeSessionId, approvalItems, runStartedAt, status?.workspace],
  );
  const pendingApprovalCount = pendingWorkbenchApprovals.length;
  const effectiveStatus = useMemo(
    () => (pendingApprovalCount > 0 ? 'Awaiting approval' : statusLabel(status, running)),
    [pendingApprovalCount, running, status],
  );
  const normalizedPromptForUi = normalizeXconWorkbenchPrompt(prompt);
  const hasAttachmentsForUi = attachments.length > 0;
  const promptApprovalResolution = useMemo(() => parseXconWorkbenchApprovalResolution(prompt), [prompt]);
  const canSubmitApprovalInput = Boolean(promptApprovalResolution && pendingApprovalCount > 0);
  const composerDisabled = apiUnavailable || (running && pendingApprovalCount === 0);
  const submitDisabled =
    apiUnavailable || (!normalizedPromptForUi && !hasAttachmentsForUi) || (running && !canSubmitApprovalInput);
  const submitLabel =
    pendingApprovalCount > 0 && promptApprovalResolution
      ? promptApprovalResolution === 'approve'
        ? 'Approve'
        : 'Reject'
      : 'Send';
  const statusDetail =
    pendingApprovalCount > 0
      ? `${pendingApprovalCount} approval request${pendingApprovalCount === 1 ? '' : 's'} pending`
      : activityText;
  const progressLine = createXconWorkbenchProgressLine({
    running,
    pendingApprovalCount,
    startedAt: runStartedAt,
    now: progressNow,
    activityText,
  });
  const progressParts = progressLine ? splitProgressLine(progressLine) : null;
  const providerOptions = useMemo(
    () =>
      buildXconWorkbenchProviderOptions({
        providerRuntime: status?.providerRuntime ?? null,
        localCliAgents,
      }),
    [localCliAgents, status?.providerRuntime],
  );
  const selectedProviderOption =
    providerOptions.find((option) => option.value === selectedProvider && !option.disabled) ?? providerOptions[0];

  async function refreshStatus(): Promise<XenesisStatus | null> {
    if (!xenesisApi) return null;
    try {
      const next = await xenesisApi.status();
      setStatus(next);
      return next;
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
      return status;
    }
  }

  async function refreshLocalCliAgents(): Promise<LocalCliAgentStatus[]> {
    if (!window.localCliAPI?.scan) return localCliAgents;
    try {
      const agents = await window.localCliAPI.scan();
      const next = Array.isArray(agents) ? agents : [];
      setLocalCliAgents(next);
      return next;
    } catch {
      return localCliAgents;
    }
  }

  async function refreshApprovals(): Promise<XenesisApprovalRequest[]> {
    if (!window.mcpBridgeAPI?.listApprovals) return approvalItems;
    try {
      const items = await window.mcpBridgeAPI.listApprovals();
      setApprovalItems(items);
      setApprovalNotice('');
      return items;
    } catch (approvalError) {
      setApprovalNotice(approvalError instanceof Error ? approvalError.message : String(approvalError));
      return approvalItems;
    }
  }

  useEffect(() => {
    void refreshStatus();
    void refreshLocalCliAgents();
  }, []);

  useEffect(() => {
    if (!selectedProvider) return;
    if (providerOptions.some((option) => option.value === selectedProvider && !option.disabled)) return;
    setSelectedProvider('');
  }, [providerOptions, selectedProvider]);

  useEffect(() => {
    void refreshApprovals();
    if (!window.mcpBridgeAPI?.onApprovalsChanged) return undefined;
    return window.mcpBridgeAPI.onApprovalsChanged((items) => {
      setApprovalItems(items);
      setApprovalNotice('');
    });
  }, []);

  useEffect(() => {
    saveXconAgentWorkbenchPaneState({
      panelSizes,
      railVisible,
      rawVisible,
      status,
      mode,
      selectedProvider,
      prompt,
      messages,
      rawEntries,
      activeSessionId,
      running,
      error,
      approvalItems,
      approvalNotice,
      runStartedAt,
      activityText,
      progressNow,
      markdownDemoFolder,
      markdownDemoFiles,
      markdownDemoError,
      activeAssistantId: activeAssistantIdRef.current,
      streamedMarkdown: streamedMarkdownRef.current,
      attachments,
      attachmentError,
    });

    return () =>
      saveXconAgentWorkbenchPaneState({
        panelSizes,
        railVisible,
        rawVisible,
        status,
        mode,
        selectedProvider,
        prompt,
        messages,
        rawEntries,
        activeSessionId,
        running,
        error,
        approvalItems,
        approvalNotice,
        runStartedAt,
        activityText,
        progressNow,
        markdownDemoFolder,
        markdownDemoFiles,
        markdownDemoError,
        activeAssistantId: activeAssistantIdRef.current,
        streamedMarkdown: streamedMarkdownRef.current,
        attachments,
        attachmentError,
      });
  }, [
    activeSessionId,
    activityText,
    attachmentError,
    attachments,
    approvalItems,
    approvalNotice,
    error,
    markdownDemoError,
    markdownDemoFiles,
    markdownDemoFolder,
    messages,
    mode,
    panelSizes,
    progressNow,
    prompt,
    railVisible,
    rawEntries,
    rawVisible,
    runStartedAt,
    running,
    selectedProvider,
    status,
  ]);

  useEffect(() => {
    panelSizesRef.current = panelSizes;
  }, [panelSizes]);

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  useEffect(() => {
    if (!xenesisApi) return undefined;
    return xenesisApi.onRunEvent((event) => {
      if (!runningRef.current) return;
      if (!shouldConsumeXenesisRunEvent(event, XENESIS_AGENT_WORKBENCH_RUN_SOURCE)) return;
      setActivityText(summarizeXconWorkbenchActivity(event));
      setRawEntries((current) => appendXconWorkbenchRawEvent(current, event).slice(-RAW_ENTRY_LIMIT));

      const nextMarkdown = appendXconWorkbenchAssistantDelta(streamedMarkdownRef.current, event);
      if (nextMarkdown === streamedMarkdownRef.current) return;
      streamedMarkdownRef.current = nextMarkdown;
      const assistantId = activeAssistantIdRef.current;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? { ...message, content: nextMarkdown, streaming: true } : message,
        ),
      );
    });
  }, [xenesisApi]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (!runStartedAt || (!running && pendingApprovalCount === 0)) return undefined;
    setProgressNow(nowIso());
    const timer = window.setInterval(() => setProgressNow(nowIso()), 1000);
    return () => window.clearInterval(timer);
  }, [pendingApprovalCount, runStartedAt, running]);

  useEffect(() => {
    rawEndRef.current?.scrollIntoView({ block: 'end' });
  }, [rawEntries]);

  useLayoutEffect(() => {
    const textarea = promptTextAreaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const styles = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 18;
    const padding = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
    const minHeight = lineHeight * 2 + padding;
    const maxHeight = lineHeight * 5 + padding;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [prompt]);

  useEffect(() => {
    if (!composerContextMenu) return undefined;

    const closeMenu = () => setComposerContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('pointerdown', closeMenu);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', closeMenu);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [composerContextMenu]);

  const addAttachmentFiles = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      const fileList = Array.from(files).filter(Boolean);
      if (!fileList.length || running) return;
      try {
        setAttachmentError('');
        const nextAttachments = await Promise.all(fileList.map(createXconWorkbenchAttachmentFromFile));
        setAttachments((current) => dedupeXenesisAttachments(current, nextAttachments));
      } catch (attachError) {
        setAttachmentError(attachError instanceof Error ? attachError.message : String(attachError));
      } finally {
        attachmentDragDepthRef.current = 0;
        setAttachmentDropActive(false);
      }
    },
    [running],
  );

  const addAttachmentPaths = useCallback(
    async (paths: string[]): Promise<void> => {
      const filePaths = paths.map((path) => path.trim()).filter(Boolean);
      if (!filePaths.length || running) return;
      try {
        setAttachmentError('');
        const nextAttachments = await Promise.all(filePaths.map(createXconWorkbenchAttachmentFromLocalPath));
        setAttachments((current) => dedupeXenesisAttachments(current, nextAttachments));
      } catch (attachError) {
        setAttachmentError(attachError instanceof Error ? attachError.message : String(attachError));
      } finally {
        attachmentDragDepthRef.current = 0;
        setAttachmentDropActive(false);
      }
    },
    [running],
  );

  function handleAttachmentInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = event.currentTarget.files;
    if (files?.length) void addAttachmentFiles(files);
    event.currentTarget.value = '';
  }

  function removeAttachment(attachmentId: string): void {
    setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  }

  function clearAttachments(): void {
    setAttachments([]);
    setAttachmentError('');
  }

  function handleAttachmentDragEnter(event: React.DragEvent<HTMLElement>): void {
    if (!isXconWorkbenchAttachmentDragEvent(event) || running) return;
    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current += 1;
    setAttachmentDropActive(true);
  }

  function handleAttachmentDragOver(event: React.DragEvent<HTMLElement>): void {
    if (!isXconWorkbenchAttachmentDragEvent(event) || running) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setAttachmentDropActive(true);
  }

  function handleAttachmentDragLeave(event: React.DragEvent<HTMLElement>): void {
    if (!isXconWorkbenchAttachmentDragEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current = Math.max(0, attachmentDragDepthRef.current - 1);
    if (attachmentDragDepthRef.current === 0) {
      setAttachmentDropActive(false);
    }
  }

  function handleAttachmentDrop(event: React.DragEvent<HTMLElement>): void {
    if (!isXconWorkbenchAttachmentDragEvent(event) || running) return;
    event.preventDefault();
    event.stopPropagation();
    attachmentDragDepthRef.current = 0;
    setAttachmentDropActive(false);
    const localExplorerPath = getXenesisLocalExplorerDropPath(event.dataTransfer);
    if (event.dataTransfer.files?.length) {
      void addAttachmentFiles(event.dataTransfer.files);
    } else if (localExplorerPath) {
      void addAttachmentPaths([localExplorerPath]);
    }
  }

  function handleComposerContextMenu(event: React.MouseEvent<HTMLTextAreaElement>): void {
    const textarea = event.currentTarget;
    event.preventDefault();
    event.stopPropagation();
    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    setComposerContextMenu({
      x: event.clientX,
      y: event.clientY,
      canEdit: !textarea.disabled && !textarea.readOnly,
      hasSelection: selectionEnd > selectionStart,
    });
    textarea.focus();
  }

  async function runComposerContextAction(action: ComposerContextAction): Promise<void> {
    const textarea = promptTextAreaRef.current;
    setComposerContextMenu(null);
    if (!textarea) return;

    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const selectedText = textarea.value.slice(selectionStart, selectionEnd);
    const canEdit = !textarea.disabled && !textarea.readOnly;
    textarea.focus();

    if (action === 'selectAll') {
      textarea.select();
      return;
    }

    if (action === 'copy') {
      if (selectedText) await writeComposerClipboardText(selectedText);
      return;
    }

    if (action === 'cut') {
      if (!selectedText || !canEdit) return;
      await writeComposerClipboardText(selectedText);
      const nextPrompt = `${textarea.value.slice(0, selectionStart)}${textarea.value.slice(selectionEnd)}`;
      setPrompt(nextPrompt);
      window.requestAnimationFrame(() => {
        promptTextAreaRef.current?.setSelectionRange(selectionStart, selectionStart);
        promptTextAreaRef.current?.focus();
      });
      return;
    }

    if (action === 'paste') {
      if (!canEdit) return;
      const clipboardText = await readComposerClipboardText();
      if (!clipboardText) return;
      const nextPrompt = `${textarea.value.slice(0, selectionStart)}${clipboardText}${textarea.value.slice(
        selectionEnd,
      )}`;
      const nextCaret = selectionStart + clipboardText.length;
      setPrompt(nextPrompt);
      window.requestAnimationFrame(() => {
        promptTextAreaRef.current?.setSelectionRange(nextCaret, nextCaret);
        promptTextAreaRef.current?.focus();
      });
    }
  }

  async function runPrompt(): Promise<void> {
    const normalizedPrompt = normalizeXconWorkbenchPrompt(prompt);
    const submittedAttachments = attachments;
    const hasAttachments = submittedAttachments.length > 0;
    if (!normalizedPrompt && !hasAttachments) return;

    const approvalResolution = normalizedPrompt ? parseXconWorkbenchApprovalResolution(normalizedPrompt) : null;
    if (approvalResolution) {
      const approvalPrompt = normalizedPrompt || '';
      const latestApprovals = await refreshApprovals();
      const pendingApprovals = selectXconWorkbenchPendingApprovals(latestApprovals, {
        activeSessionId,
        runStartedAt,
        workspace: status?.workspace || '',
      });
      if (pendingApprovals.length) {
        const item = pendingApprovals[0];
        const userMessage = createXconWorkbenchMessage('user', approvalPrompt);
        setPrompt('');
        setMessages((current) => [...current, userMessage]);
        setActivityText(`${approvalResolution === 'approve' ? 'Approving' : 'Rejecting'} ${item.title}`);
        setRawEntries((current) =>
          [
            ...current,
            createRawEntry(
              'approval_input',
              `${approvalResolution === 'approve' ? 'Approve' : 'Reject'} requested: ${item.title}`,
              item.id,
            ),
          ].slice(-RAW_ENTRY_LIMIT),
        );
        await resolveApproval(item, approvalResolution);
        return;
      }
      if (running) {
        setApprovalNotice('No pending Workbench approval to resolve.');
        return;
      }
    }

    if (running || !xenesisApi) return;

    const basePrompt = normalizedPrompt || 'Please inspect the attached files and respond.';
    const providerPrompt = appendXenesisAttachmentPromptContext(basePrompt, submittedAttachments);
    const providerAttachments = toXenesisProviderAttachments(submittedAttachments);
    const userDisplayText = hasAttachments
      ? `${basePrompt}\n\n[attachments: ${submittedAttachments.map((attachment) => attachment.name).join(', ')}]`
      : basePrompt;
    const historyMessages = toHistoryMessages(messages);
    const userMessage = createXconWorkbenchMessage('user', userDisplayText);
    const assistantMessage = createXconWorkbenchMessage('assistant', '', { streaming: true });
    const startedAt = nowIso();
    activeAssistantIdRef.current = assistantMessage.id;
    streamedMarkdownRef.current = '';
    runningRef.current = true;
    setRunning(true);
    setError('');
    setActivityText('Starting Xenesis run');
    setRunStartedAt(startedAt);
    setProgressNow(startedAt);
    setPrompt('');
    if (hasAttachments) clearAttachments();
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setRawEntries([createRawEntry('run', basePrompt.split('\n')[0] || 'Run started', providerPrompt)]);

    try {
      const latestStatus = (await refreshStatus()) || status;
      const result = await xenesisApi.run(
        buildXconWorkbenchRunRequest({
          prompt: providerPrompt,
          mode,
          workspace: latestStatus?.workspace || undefined,
          sessionId: activeSessionId,
          provider: selectedProvider,
          attachments: providerAttachments,
          historyMessages,
        }),
      );
      if (result.sessionId) setActiveSessionId(result.sessionId);
      setRawEntries((current) =>
        [
          ...current,
          createRawEntry(
            result.ok ? 'run_result' : 'run_error',
            result.ok ? 'Run completed' : 'Run failed',
            resultDetail(result),
            !result.ok,
          ),
        ].slice(-RAW_ENTRY_LIMIT),
      );

      const resultError = result.ok ? '' : result.error || result.errors || 'Xenesis run failed.';
      const finalMarkdown = resultError || resolveXconWorkbenchFinalMarkdown(result, streamedMarkdownRef.current);
      streamedMarkdownRef.current = finalMarkdown;
      const assistantId = activeAssistantIdRef.current;
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: finalMarkdown || resultError, streaming: false, error: Boolean(resultError) }
            : message,
        ),
      );
      if (resultError) setError(resultError);
      setActivityText(resultError ? 'Run failed' : 'Run completed');
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : String(runError);
      setError(message);
      setActivityText('Run failed');
      setRawEntries((current) =>
        [...current, createRawEntry('run_error', 'Run failed', message, true)].slice(-RAW_ENTRY_LIMIT),
      );
      const assistantId = activeAssistantIdRef.current;
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId ? { ...entry, content: message, streaming: false, error: true } : entry,
        ),
      );
    } finally {
      runningRef.current = false;
      activeAssistantIdRef.current = '';
      setRunning(false);
      void refreshStatus();
      void refreshApprovals();
    }
  }

  async function copyAssistantMessage(message: XconWorkbenchMessage): Promise<void> {
    const content = message.content.trim();
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setActivityText('Response copied');
      setRawEntries((current) =>
        [...current, createRawEntry('message_action', 'Copied assistant response', message.id)].slice(-RAW_ENTRY_LIMIT),
      );
    } catch (copyError) {
      const detail = copyError instanceof Error ? copyError.message : String(copyError);
      setError(`Copy failed: ${detail}`);
      setRawEntries((current) =>
        [...current, createRawEntry('message_action_error', 'Copy response failed', detail, true)].slice(
          -RAW_ENTRY_LIMIT,
        ),
      );
    }
  }

  async function saveAssistantMessage(message: XconWorkbenchMessage): Promise<void> {
    const content = message.content.trim();
    if (!content) return;

    if (!window.fileAPI?.saveTextAs) {
      setError('Save response is unavailable in this runtime.');
      return;
    }

    try {
      const result = await window.fileAPI.saveTextAs({
        defaultName: responseFileName(message),
        content,
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      });
      if (!result.saved) return;
      setActivityText(result.path ? `Response saved: ${result.path}` : 'Response saved');
      setRawEntries((current) =>
        [...current, createRawEntry('message_action', 'Saved assistant response', result.path || message.id)].slice(
          -RAW_ENTRY_LIMIT,
        ),
      );
    } catch (saveError) {
      const detail = saveError instanceof Error ? saveError.message : String(saveError);
      setError(`Save failed: ${detail}`);
      setRawEntries((current) =>
        [...current, createRawEntry('message_action_error', 'Save response failed', detail, true)].slice(
          -RAW_ENTRY_LIMIT,
        ),
      );
    }
  }

  function rerunFromAssistantMessage(message: XconWorkbenchMessage): void {
    if (running) return;
    const messageIndex = messages.findIndex((item) => item.id === message.id);
    const previousUser = messages
      .slice(0, Math.max(messageIndex, 0))
      .reverse()
      .find((item) => item.role === 'user' && item.content.trim());
    if (!previousUser) return;
    setPrompt(previousUser.content);
    setActivityText('Previous prompt restored');
    window.setTimeout(() => promptTextAreaRef.current?.focus(), 0);
  }

  async function cancelRun(): Promise<void> {
    if (exampleRunningRef.current) {
      exampleRunTokenRef.current += 1;
      exampleRunningRef.current = false;
      runningRef.current = false;
      const assistantId = activeAssistantIdRef.current;
      activeAssistantIdRef.current = '';
      setRunning(false);
      setRawEntries((current) =>
        [...current, createRawEntry('example_cancel', 'Example playback cancelled')].slice(-RAW_ENTRY_LIMIT),
      );
      setMessages((current) =>
        current.map((message) => (message.id === assistantId ? { ...message, streaming: false } : message)),
      );
      return;
    }

    if (!xenesisApi || !running) return;
    try {
      await xenesisApi.cancel();
      setRawEntries((current) => [...current, createRawEntry('cancel', 'Cancel requested')].slice(-RAW_ENTRY_LIMIT));
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : String(cancelError));
    }
  }

  async function runExample(example: XconWorkbenchExample): Promise<void> {
    if (running) return;

    const token = exampleRunTokenRef.current + 1;
    exampleRunTokenRef.current = token;
    exampleRunningRef.current = true;
    runningRef.current = true;

    const startedAt = nowIso();
    const userMessage = createXconWorkbenchMessage('user', example.prompt);
    const assistantMessage = createXconWorkbenchMessage('assistant', '', { streaming: true });
    activeAssistantIdRef.current = assistantMessage.id;
    streamedMarkdownRef.current = '';
    setRunning(true);
    setError('');
    setActivityText(`Playing example: ${example.title}`);
    setRunStartedAt(startedAt);
    setProgressNow(startedAt);
    setPrompt('');
    setMessages([userMessage, assistantMessage]);
    setRawEntries([createRawEntry('example', `Example: ${example.title}`, example.prompt)]);

    try {
      for (const event of createXconWorkbenchExampleDeltaEvents(example, XCON_WORKBENCH_EXAMPLE_DELTA_CHUNK_SIZE)) {
        if (exampleRunTokenRef.current !== token) return;
        await sleep(XCON_WORKBENCH_EXAMPLE_STREAM_DELAY_MS);
        if (exampleRunTokenRef.current !== token) return;

        setRawEntries((current) => appendXconWorkbenchRawEvent(current, event).slice(-RAW_ENTRY_LIMIT));
        const nextMarkdown = appendXconWorkbenchAssistantDelta(streamedMarkdownRef.current, event);
        streamedMarkdownRef.current = nextMarkdown;
        const assistantId = activeAssistantIdRef.current;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: nextMarkdown, streaming: true } : message,
          ),
        );
      }

      setRawEntries((current) =>
        [...current, createRawEntry('example_done', 'Example playback completed', example.id)].slice(-RAW_ENTRY_LIMIT),
      );
      setActivityText('Example playback completed');
      const assistantId = activeAssistantIdRef.current;
      setMessages((current) =>
        current.map((message) => (message.id === assistantId ? { ...message, streaming: false } : message)),
      );
    } finally {
      if (exampleRunTokenRef.current === token) {
        exampleRunningRef.current = false;
        runningRef.current = false;
        activeAssistantIdRef.current = '';
        setRunning(false);
      }
    }
  }

  async function scanMarkdownDemoFolder(folderPath: string): Promise<MarkdownDemoFileItem[]> {
    const files: MarkdownDemoFileItem[] = [];

    async function visit(dirPath: string, depth: number): Promise<void> {
      if (files.length >= MARKDOWN_DEMO_SCAN_LIMIT || depth > MARKDOWN_DEMO_SCAN_DEPTH_LIMIT) return;
      const entries = sortFsEntries(await window.fsAPI.listDir(dirPath));

      for (const entry of entries) {
        if (files.length >= MARKDOWN_DEMO_SCAN_LIMIT) return;
        if (isXconWorkbenchMarkdownDemoFile(entry)) {
          files.push({
            filePath: entry.path,
            fileName: entry.name,
            relativePath: relativeMarkdownDemoPath(folderPath, entry.path, entry.name),
          });
        }
      }

      for (const entry of entries) {
        if (files.length >= MARKDOWN_DEMO_SCAN_LIMIT) return;
        if (!entry.isDirectory || shouldSkipMarkdownDemoDir(entry)) continue;
        await visit(entry.path, depth + 1);
      }
    }

    await visit(folderPath, 0);
    return files;
  }

  async function loadMarkdownDemoFolder(folderPath: string): Promise<void> {
    if (!folderPath || running) return;
    setMarkdownDemoLoading(true);
    setMarkdownDemoError('');
    try {
      const files = await scanMarkdownDemoFolder(folderPath);
      setMarkdownDemoFolder(folderPath);
      setMarkdownDemoFiles(files);
    } catch (scanError) {
      setMarkdownDemoError(scanError instanceof Error ? scanError.message : String(scanError));
      setMarkdownDemoFiles([]);
    } finally {
      setMarkdownDemoLoading(false);
    }
  }

  async function chooseMarkdownDemoFolder(): Promise<void> {
    if (running) return;
    const folderPath = await window.fsAPI.selectDir();
    if (!folderPath) return;
    await loadMarkdownDemoFolder(folderPath);
  }

  async function runMarkdownDemoFile(item: MarkdownDemoFileItem): Promise<void> {
    if (running) return;
    setMarkdownDemoError('');
    try {
      const file = await window.fileAPI.readFile(item.filePath);
      if (!file) throw new Error(`Unable to read Markdown file: ${item.filePath}`);
      await runExample(
        buildXconWorkbenchMarkdownFileExample({
          filePath: file.filePath || item.filePath,
          fileName: file.fileName || item.fileName,
          content: file.content || '',
        }),
      );
    } catch (readError) {
      setMarkdownDemoError(readError instanceof Error ? readError.message : String(readError));
    }
  }

  async function resolveApproval(item: XenesisApprovalRequest, resolution: XenesisApprovalResolution): Promise<void> {
    if (!window.mcpBridgeAPI?.resolveApproval || item.status !== 'pending') return;
    setResolvingApprovalId(item.id);
    setApprovalNotice('');
    try {
      const result = await window.mcpBridgeAPI.resolveApproval({ id: item.id, resolution });
      if (!result.ok) setApprovalNotice(result.error || 'Approval request failed.');
      if (result.ok) {
        setActivityText(`${item.title} ${resolution === 'approve' ? 'approved' : 'rejected'}.`);
        setRawEntries((current) =>
          [
            ...current,
            createRawEntry(
              'approval',
              `${resolution === 'approve' ? 'Approved' : 'Rejected'}: ${item.title}`,
              resultDetail(result),
              false,
            ),
          ].slice(-RAW_ENTRY_LIMIT),
        );
      }
      await refreshApprovals();
    } catch (approvalError) {
      setApprovalNotice(approvalError instanceof Error ? approvalError.message : String(approvalError));
    } finally {
      setResolvingApprovalId('');
    }
  }

  function clearConversation(): void {
    if (running) return;
    setMessages([]);
    setRawEntries([]);
    setError('');
    setActivityText('');
    setRunStartedAt('');
    streamedMarkdownRef.current = '';
    activeAssistantIdRef.current = '';
  }

  function handlePromptKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void runPrompt();
  }

  const beginPanelResize = useCallback(
    (target: XconWorkbenchPanelResizeTarget) => (event: React.PointerEvent<HTMLDivElement>) => {
      const shell = shellRef.current;
      if (!shell || window.matchMedia('(max-width: 1100px)').matches) return;

      event.preventDefault();
      resizeCleanupRef.current?.();
      setResizeTarget(target);
      const startClientX = event.clientX;
      const startPanelSizes = panelSizesRef.current;

      const updateFromPointer = (clientX: number) => {
        const containerRect = shell.getBoundingClientRect();
        setPanelSizes(dragXconWorkbenchPanelSizes(startPanelSizes, target, { startClientX, clientX, containerRect }));
      };

      const move = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        updateFromPointer(moveEvent.clientX);
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
        resizeCleanupRef.current = null;
        setResizeTarget(null);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
      resizeCleanupRef.current = stop;
    },
    [],
  );

  return (
    <div
      ref={shellRef}
      className={[
        'xd-agent-workbench',
        railVisible ? 'is-rail-visible' : '',
        rawVisible ? 'is-raw-visible' : '',
        resizeTarget ? 'is-resizing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={workbenchPanelStyle(panelSizes)}
    >
      {railVisible ? (
        <aside className="xd-agent-workbench-rail">
          <div className="xd-agent-workbench-brand">
            <span>X</span>
            <div>
              <strong>Xenesis Agent</strong>
              <small>Workbench</small>
            </div>
          </div>
          <div className="xd-agent-workbench-rail-card">
            <span>Status</span>
            <strong>{effectiveStatus}</strong>
            <small>
              {apiUnavailable ? 'Xenesis API unavailable' : statusDetail || status?.providerRuntime?.provider || '-'}
            </small>
          </div>
          <div className="xd-agent-workbench-rail-card">
            <span>Workspace</span>
            <strong title={status?.workspace || ''}>{compactWorkspace(status)}</strong>
            <small>{status?.providerRuntime?.model || '-'}</small>
          </div>
          <div className="xd-agent-workbench-rail-card is-session">
            <span>Session</span>
            <strong>{activeSessionId ? activeSessionId.slice(0, 12) : '-'}</strong>
            <small>{messages.length} message(s)</small>
          </div>
          <section className="xd-agent-workbench-examples" aria-label="Workbench examples">
            <div className="xd-agent-workbench-examples-head">
              <strong>Examples</strong>
              <small>built-in</small>
            </div>
            {examples.map((example) => (
              <button
                type="button"
                key={example.id}
                className="xd-agent-workbench-example"
                onClick={() => void runExample(example)}
                disabled={running}
                title={example.prompt}
              >
                <strong>{example.title}</strong>
                <span>{example.description}</span>
              </button>
            ))}
            <div className="xd-agent-workbench-examples-head">
              <strong>Markdown files</strong>
              <div className="xd-agent-workbench-example-actions">
                {markdownDemoFolder ? (
                  <button
                    type="button"
                    onClick={() => void loadMarkdownDemoFolder(markdownDemoFolder)}
                    disabled={running || markdownDemoLoading}
                  >
                    Refresh
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void chooseMarkdownDemoFolder()}
                  disabled={running || markdownDemoLoading}
                >
                  Choose
                </button>
              </div>
            </div>
            {markdownDemoFolder ? (
              <small className="xd-agent-workbench-example-path" title={markdownDemoFolder}>
                {markdownDemoFolder}
              </small>
            ) : null}
            {markdownDemoError ? (
              <div className="xd-agent-workbench-example-empty is-error">{markdownDemoError}</div>
            ) : null}
            {markdownDemoLoading ? (
              <div className="xd-agent-workbench-example-empty">Scanning Markdown files...</div>
            ) : markdownDemoFiles.length ? (
              <div className="xd-agent-workbench-example-list">
                {markdownDemoFiles.map((item) => (
                  <button
                    type="button"
                    key={item.filePath}
                    className="xd-agent-workbench-example is-file"
                    onClick={() => void runMarkdownDemoFile(item)}
                    disabled={running}
                    title={item.filePath}
                  >
                    <strong>{item.fileName}</strong>
                    <span>{item.relativePath}</span>
                  </button>
                ))}
              </div>
            ) : markdownDemoFolder ? (
              <div className="xd-agent-workbench-example-empty">No Markdown files found.</div>
            ) : (
              <div className="xd-agent-workbench-example-empty">Choose a folder to list Markdown demos.</div>
            )}
          </section>
          <button
            type="button"
            onClick={() => {
              void refreshStatus();
              void refreshLocalCliAgents();
            }}
            disabled={apiUnavailable || running}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={clearConversation}
            disabled={running || (!messages.length && !rawEntries.length)}
          >
            Clear
          </button>
        </aside>
      ) : null}

      {railVisible ? (
        <div
          className={`xd-agent-workbench-panel-splitter${resizeTarget === 'rail' ? ' is-active' : ''}`}
          role="separator"
          aria-label="Resize Workbench examples panel"
          aria-orientation="vertical"
          onPointerDown={beginPanelResize('rail')}
        />
      ) : null}

      <main
        className={`xd-agent-workbench-chat-shell${attachmentDropActive ? ' is-attachment-drag-over' : ''}`}
        onDragEnter={handleAttachmentDragEnter}
        onDragOver={handleAttachmentDragOver}
        onDragLeave={handleAttachmentDragLeave}
        onDrop={handleAttachmentDrop}
      >
        <header className="xd-agent-workbench-topbar">
          <div className="xd-agent-workbench-title-row">
            <button
              type="button"
              className={`xd-agent-workbench-panel-toggle is-left${railVisible ? ' is-active' : ''}`}
              aria-pressed={railVisible}
              aria-label={railVisible ? 'Hide left panel' : 'Show left panel'}
              title={railVisible ? 'Hide left panel' : 'Show left panel'}
              onClick={() => setRailVisible((visible) => !visible)}
            >
              <svg className="xd-agent-workbench-panel-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M9 5v14" />
                <path d="M6.8 12h-3" />
                <path d="M5 10.2 3.2 12 5 13.8" />
              </svg>
            </button>
            <div className="xd-agent-workbench-title-text">
              <h2>Xenesis Agent Workbench</h2>
              <p>Live Xenesis stream rendered as Markdown, with raw runtime events kept beside the conversation.</p>
              <div className="xd-agent-workbench-status-line">
                {statusDetail ? (
                  <div className={`xd-agent-workbench-activity${pendingApprovalCount ? ' is-approval' : ''}`}>
                    {statusDetail}
                  </div>
                ) : (
                  <span aria-hidden="true" />
                )}
                <div className="xd-agent-workbench-status-actions">
                  {running ? (
                    <button type="button" className="is-danger" onClick={() => void cancelRun()}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="xd-agent-workbench-top-actions">
              <button
                type="button"
                className={`xd-agent-workbench-panel-toggle is-right${rawVisible ? ' is-active' : ''}`}
                aria-pressed={rawVisible}
                aria-label={rawVisible ? 'Hide raw stream panel' : 'Show raw stream panel'}
                title={rawVisible ? 'Hide raw stream panel' : 'Show raw stream panel'}
                onClick={() => setRawVisible((visible) => !visible)}
              >
                <svg className="xd-agent-workbench-panel-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                  <path d="M15 5v14" />
                  <path d="M17.2 12h3" />
                  <path d="m19 10.2 1.8 1.8L19 13.8" />
                  <path d="M7 9h5" />
                  <path d="M7 12h5" />
                  <path d="M7 15h5" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {attachmentDropActive ? (
          <div className="xd-agent-workbench-attachment-drop-hint">Drop images or files to attach them.</div>
        ) : null}

        {error ? <div className="xd-agent-workbench-error">{error}</div> : null}

        <section className="xd-agent-workbench-chat" aria-label="Xenesis Agent Workbench conversation">
          {!messages.length ? (
            <div className="xd-agent-workbench-empty">
              <strong>Ask Xenesis for a Markdown answer.</strong>
              <span>Workbench runs are isolated from Desk pane routing and render provider shortcuts.</span>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={[
                  'xd-agent-workbench-message',
                  `is-${message.role}`,
                  message.streaming ? 'is-streaming' : '',
                  message.error ? 'is-error' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="xd-agent-workbench-message-head">
                  <span>{message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Xenesis' : 'System'}</span>
                  {message.streaming ? (
                    <small>streaming</small>
                  ) : (
                    <small>{new Date(message.at).toLocaleTimeString()}</small>
                  )}
                </div>
                {message.role === 'assistant' ? (
                  <>
                    <StreamingXconMarkdown
                      content={resolveXconWorkbenchRenderableMarkdown(
                        message.content || (message.streaming ? ' ' : ''),
                      )}
                      className="xd-agent-workbench-markdown"
                      deferRendering={message.streaming}
                    />
                    {!message.streaming && message.content.trim() ? (
                      <div className="xd-agent-workbench-message-actions" aria-label="Assistant response actions">
                        <button
                          type="button"
                          className="xd-agent-workbench-action-button"
                          title="Copy response"
                          aria-label="Copy response"
                          onClick={() => void copyAssistantMessage(message)}
                        >
                          ⧉
                        </button>
                        <button
                          type="button"
                          className="xd-agent-workbench-action-button"
                          title="Save response"
                          aria-label="Save response"
                          onClick={() => void saveAssistantMessage(message)}
                        >
                          ⇩
                        </button>
                        <button
                          type="button"
                          className="xd-agent-workbench-action-button"
                          title="Regenerate response"
                          aria-label="Regenerate response"
                          disabled={running}
                          onClick={() => rerunFromAssistantMessage(message)}
                        >
                          ↻
                        </button>
                        <button
                          type="button"
                          className="xd-agent-workbench-action-button"
                          title="More response actions"
                          aria-label="More response actions"
                          onClick={() => setActivityText('Available actions: copy, save, regenerate')}
                        >
                          ...
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="xd-agent-workbench-user-text">{message.content}</div>
                )}
              </article>
            ))
          )}
          <div ref={chatEndRef} />
        </section>

        {(approvalNotice || pendingWorkbenchApprovals.length > 0) && (
          <section className="xd-agent-workbench-approvals" aria-label="Pending Xenesis approvals">
            {approvalNotice ? <div className="xd-agent-workbench-approval-notice">{approvalNotice}</div> : null}
            {pendingWorkbenchApprovals.map((item) => {
              const preview = approvalPreview(item);
              const subject = item.capabilityPath || item.permission || item.kind;
              return (
                <article key={item.id} className={`xd-agent-workbench-approval is-${item.risk || 'unknown'}`}>
                  <div className="xd-agent-workbench-approval-head">
                    <div>
                      <span>
                        {item.risk || 'unknown'} {item.kind === 'runtime-tool' ? 'runtime' : 'capability'}
                      </span>
                      <strong>{item.title}</strong>
                    </div>
                    <small title={subject}>{subject}</small>
                  </div>
                  {item.description ? <p>{item.description}</p> : null}
                  {preview ? (
                    <details>
                      <summary>Preview</summary>
                      <pre>{preview}</pre>
                    </details>
                  ) : null}
                  <div className="xd-agent-workbench-approval-actions">
                    <button
                      type="button"
                      className="is-approve"
                      disabled={resolvingApprovalId === item.id}
                      onClick={() => void resolveApproval(item, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="is-reject"
                      disabled={resolvingApprovalId === item.id}
                      onClick={() => void resolveApproval(item, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section
          className={`xd-agent-workbench-progress-bar${pendingApprovalCount ? ' is-approval' : ''}`}
          aria-live="polite"
        >
          <div className="xd-agent-workbench-progress-status">
            {progressLine ? (
              <>
                <span aria-hidden="true" className="xd-agent-workbench-dot-spinner">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="xd-agent-workbench-progress-label">{progressParts?.label || progressLine}</span>
                {progressParts?.meta ? (
                  <span className="xd-agent-workbench-progress-meta" title={progressLine}>
                    {progressParts.meta}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="xd-agent-workbench-run-controls">
            <select
              className="xd-agent-workbench-provider-control"
              aria-label="Workbench provider"
              value={selectedProvider}
              onChange={(event) => setSelectedProvider(event.target.value)}
              disabled={running}
              title={selectedProviderOption?.title || 'Use the active API provider configured in Settings.'}
            >
              {providerOptions.map((option) => (
                <option key={option.value || 'byok'} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="xd-agent-workbench-mode-control"
              aria-label="Workbench mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as XconWorkbenchMode)}
              disabled={running}
              title={`Mode: ${mode}`}
            >
              <option value="chat">Chat</option>
              <option value="plan">Plan</option>
              <option value="work">Work</option>
            </select>
          </div>
        </section>

        {(attachments.length > 0 || attachmentError) && (
          <section className="xd-agent-workbench-attachments" aria-label="Attached files">
            {attachments.length > 0 ? (
              <div className="xd-agent-workbench-attachment-list">
                {attachments.map((attachment) => (
                  <span
                    key={attachment.id}
                    className="xd-agent-workbench-attachment-chip"
                    title={attachment.path || attachment.name}
                  >
                    {attachment.kind === 'image' && attachment.dataUrl ? (
                      <img src={attachment.dataUrl} alt="" />
                    ) : (
                      <span className="xd-agent-workbench-attachment-icon">
                        {attachment.kind === 'image' ? 'IMG' : 'FILE'}
                      </span>
                    )}
                    <span className="xd-agent-workbench-attachment-info">
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
            ) : null}
            {attachmentError ? <p className="xd-agent-workbench-attachment-error">{attachmentError}</p> : null}
            {attachments.length > 0 ? (
              <button
                type="button"
                className="xd-agent-workbench-attachment-clear"
                onClick={clearAttachments}
                disabled={running}
              >
                Clear attachments
              </button>
            ) : null}
          </section>
        )}

        <form
          className="xd-agent-workbench-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void runPrompt();
          }}
        >
          <input
            ref={attachmentInputRef}
            className="xd-agent-workbench-attachment-input"
            type="file"
            multiple
            onChange={handleAttachmentInputChange}
            tabIndex={-1}
          />
          <textarea
            ref={promptTextAreaRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handlePromptKeyDown}
            onContextMenu={handleComposerContextMenu}
            placeholder={
              pendingApprovalCount > 0
                ? 'Type 승인 or 거절, or use the approval buttons...'
                : 'Ask Xenesis to explain, inspect, or reason about the current task...'
            }
            disabled={composerDisabled}
            rows={2}
          />
          {composerContextMenu
            ? createPortal(
                <div
                  className="xd-agent-workbench-context-menu"
                  role="menu"
                  style={{ left: composerContextMenu.x, top: composerContextMenu.y }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!composerContextMenu.canEdit || !composerContextMenu.hasSelection}
                    onClick={() => void runComposerContextAction('cut')}
                  >
                    Cut
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!composerContextMenu.hasSelection}
                    onClick={() => void runComposerContextAction('copy')}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!composerContextMenu.canEdit}
                    onClick={() => void runComposerContextAction('paste')}
                  >
                    Paste
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!prompt}
                    onClick={() => void runComposerContextAction('selectAll')}
                  >
                    Select all
                  </button>
                </div>,
                document.body,
              )
            : null}
          <button
            type="button"
            className="xd-agent-workbench-attachment-button is-attach"
            onClick={() => attachmentInputRef.current?.click()}
            disabled={running}
            title="Attach images or files"
          >
            Attach
          </button>
          <button type="submit" className="xd-agent-workbench-send-button" disabled={submitDisabled}>
            {submitLabel}
          </button>
        </form>
      </main>

      {rawVisible ? (
        <div
          className={`xd-agent-workbench-panel-splitter${resizeTarget === 'raw' ? ' is-active' : ''}`}
          role="separator"
          aria-label="Resize Workbench raw stream panel"
          aria-orientation="vertical"
          onPointerDown={beginPanelResize('raw')}
        />
      ) : null}

      {rawVisible ? (
        <aside className="xd-agent-workbench-raw" aria-label="Raw response stream">
          <header>
            <strong>Raw response stream</strong>
            <span>{rawEntries.length ? `${rawEntries.length} event(s)` : 'waiting'}</span>
          </header>
          <div className="xd-agent-workbench-raw-list">
            {!rawEntries.length ? (
              <div className="xd-agent-workbench-raw-empty">No stream events yet.</div>
            ) : (
              rawEntries.map((entry) => (
                <details
                  key={entry.id}
                  className={entry.error ? 'is-error' : undefined}
                  open={entry.kind === 'run_error'}
                >
                  <summary>
                    <span>{entry.kind}</span>
                    <strong>{entry.summary}</strong>
                  </summary>
                  {entry.detail ? <pre>{entry.detail}</pre> : null}
                </details>
              ))
            )}
            <div ref={rawEndRef} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
