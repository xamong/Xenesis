import type {
  FsEntry,
  LocalCliAgentStatus,
  XenesisApprovalRequest,
  XenesisApprovalResolution,
  XenesisProviderRuntimeStatus,
  XenesisRunEvent,
  XenesisRunRequest,
  XenesisRunResult,
} from '../../../../shared/types';
import { XENESIS_AGENT_WORKBENCH_RUN_SOURCE } from '../../../../shared/xenesisRunEventScope';
import { createDemoPreviewMarkdown } from '../../xenesis-desk.workflow-runner/demoLabPreset';
import { XCON_WORKBENCH_EXAMPLES, type XconWorkbenchExample } from './xconAgentWorkbenchExamples';
import {
  createWorkbenchId,
  extractWorkbenchAssistantDelta,
  nowIso,
  resolveWorkbenchAssistantText,
  summarizeWorkbenchRunEvent,
  type XenesisWorkbenchRawEntry,
} from './xenesisWorkbenchStream';

export type XconWorkbenchMode = NonNullable<XenesisRunRequest['mode']>;
export const XCON_WORKBENCH_EXAMPLE_STREAM_DELAY_MS = 55;
export const XCON_WORKBENCH_EXAMPLE_DELTA_CHUNK_SIZE = 56;
export const XCON_WORKBENCH_PANEL_SPLITTER_WIDTH = 8;
export const XCON_WORKBENCH_SURFACE_POLICY = [
  'This request is running inside an inline chat workbench.',
  'Return generated Markdown/artifact content inline in the assistant message by default.',
  'Do not call file mutation tools such as write, edit, patch, json, or artifact creation tools unless the user explicitly asks to save, export, open, or create a file, tab, pane, or window.',
  'Do not call Desk open/focus tools unless the user explicitly asks to open a separate Desk surface.',
  'Validate before the final inline response when validation is necessary; do not validate after generated content has already been returned inline.',
].join('\n');

const XCON_WORKBENCH_RAIL_MIN_WIDTH = 180;
const XCON_WORKBENCH_RAIL_MAX_WIDTH = 420;
const XCON_WORKBENCH_RAW_MIN_WIDTH = 280;
const XCON_WORKBENCH_RAW_MAX_WIDTH = 560;
const XCON_WORKBENCH_CHAT_MIN_WIDTH = 420;

export const DEFAULT_XCON_WORKBENCH_PANEL_SIZES: XconWorkbenchPanelSizes = {
  railWidth: 220,
  rawWidth: 380,
};

export type XconWorkbenchPanelResizeTarget = 'rail' | 'raw';

export interface XconWorkbenchPanelSizes {
  railWidth: number;
  rawWidth: number;
}

export interface XconWorkbenchPanelResizeInput {
  clientX: number;
  containerRect: Pick<DOMRect, 'left' | 'width'>;
}

export interface XconWorkbenchPanelDragInput extends XconWorkbenchPanelResizeInput {
  startClientX: number;
}

export interface XconWorkbenchApprovalFilterInput {
  activeSessionId?: string;
  workspace?: string;
  runStartedAt?: string;
}

export interface XconWorkbenchProgressLabelInput {
  running: boolean;
  pendingApprovalCount: number;
  startedAt: string;
  now?: string;
  activityText?: string;
}

export interface XconWorkbenchMessage {
  id: string;
  at: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  streaming?: boolean;
  error?: boolean;
}

export type XconWorkbenchRawEntry = XenesisWorkbenchRawEntry;
export type { XconWorkbenchExample };

export function isXconWorkbenchRuntimeApproval(item: XenesisApprovalRequest, activeSessionId = ''): boolean {
  if (item.kind !== 'runtime-tool' || item.status !== 'pending') return false;
  const sessionId = activeSessionId.trim();
  return !sessionId || item.sessionId === sessionId;
}

export function isXconWorkbenchPendingApproval(
  item: XenesisApprovalRequest,
  input: XconWorkbenchApprovalFilterInput = {},
): boolean {
  if (item.status !== 'pending') return false;
  if (isXconWorkbenchRuntimeApproval(item, input.activeSessionId || '')) {
    const activeSessionId = String(input.activeSessionId || '').trim();
    const itemSessionId = String(item.sessionId || '').trim();
    return (
      item.sourceAgent === XENESIS_AGENT_WORKBENCH_RUN_SOURCE ||
      Boolean(activeSessionId && itemSessionId === activeSessionId)
    );
  }
  return isXconWorkbenchCapabilityApproval(item, input);
}

export function selectXconWorkbenchPendingApprovals(
  items: readonly XenesisApprovalRequest[],
  input: XconWorkbenchApprovalFilterInput = {},
): XenesisApprovalRequest[] {
  return items
    .filter((item) => isXconWorkbenchPendingApproval(item, input))
    .sort((left, right) => approvalMillis(right) - approvalMillis(left));
}

export function parseXconWorkbenchApprovalResolution(value: string): XenesisApprovalResolution | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/[.!?。]+$/g, '');
  if (!normalized) return null;
  const approve = new Set(['승인', '허용', '진행', '확인', 'approve', 'approved', 'allow', 'yes', 'y', 'ok']);
  const reject = new Set([
    '거절',
    '거부',
    '반려',
    '중단',
    '취소',
    'reject',
    'rejected',
    'deny',
    'denied',
    'no',
    'n',
    'cancel',
  ]);
  if (approve.has(normalized)) return 'approve';
  if (reject.has(normalized)) return 'reject';
  return null;
}

export function summarizeXconWorkbenchActivity(event: XenesisRunEvent): string {
  const data: Record<string, unknown> =
    event.data && typeof event.data === 'object' && !Array.isArray(event.data)
      ? (event.data as Record<string, unknown>)
      : {};
  const status = stringField(data, 'status');
  const toolName =
    stringField(data, 'toolName') ||
    stringField(data, 'name') ||
    stringField(data, 'tool') ||
    stringField(recordField(data, 'request'), 'name');
  const summary = stringField(data, 'summary') || stringField(data, 'message');
  const type = stringField(data, 'type') || event.event;

  if (status === 'awaiting_approval' || type === 'permission_request' || type === 'durable_approval_pending') {
    return `Awaiting approval: ${toolName || summary || 'Xenesis tool'}`;
  }
  if (type === 'durable_approval_resolved') {
    return data.approved === false ? 'Approval rejected.' : 'Approval approved.';
  }
  if (status === 'provider_request') return summary ? `Provider progress: ${summary}` : 'Provider progress';
  if (status === 'tool_call' && toolName) return `Tool call: ${toolName}`;
  if (status === 'tool_result' && toolName) return `Tool result: ${toolName}`;

  const rawSummary = summarizeWorkbenchRunEvent(event);
  return rawSummary.summary;
}

export function formatXconWorkbenchElapsedTime(startedAt: string, now = nowIso()): string {
  const startMillis = Date.parse(String(startedAt || ''));
  const nowMillis = Date.parse(String(now || ''));
  if (!Number.isFinite(startMillis) || !Number.isFinite(nowMillis)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor((nowMillis - startMillis) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
  return `${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
}

export function createXconWorkbenchProgressLabel(input: XconWorkbenchProgressLabelInput): string {
  if (input.pendingApprovalCount > 0) {
    return `Awaiting approval ... · ${formatXconWorkbenchElapsedTime(input.startedAt, input.now)}`;
  }
  if (input.running) {
    return `Streaming ... · ${formatXconWorkbenchElapsedTime(input.startedAt, input.now)}`;
  }
  return '';
}

export function createXconWorkbenchProgressLine(input: XconWorkbenchProgressLabelInput): string {
  const label = createXconWorkbenchProgressLabel(input);
  if (!label) return '';
  const activity = compactXconWorkbenchProgressActivity(input.activityText || '');
  return activity ? `${label} · ${activity}` : label;
}

function compactXconWorkbenchProgressActivity(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/^Awaiting approval:\s*/i, '')
    .replace(/^Provider progress:\s*/i, '')
    .trim();
}

export interface BuildXconWorkbenchRunRequestInput {
  prompt: string;
  mode: XconWorkbenchMode;
  workspace?: string;
  sessionId?: string;
  provider?: string;
  attachments?: XenesisRunRequest['attachments'];
  historyMessages?: XenesisRunRequest['historyMessages'];
  context?: Record<string, unknown>;
}

export interface XconWorkbenchProviderOption {
  value: string;
  label: string;
  title: string;
  kind: 'byok' | 'local-cli' | 'hermes';
  disabled?: boolean;
}

export interface BuildXconWorkbenchProviderOptionsInput {
  providerRuntime?: Pick<XenesisProviderRuntimeStatus, 'provider' | 'model'> | null;
  localCliAgents?: readonly LocalCliAgentStatus[];
  hermesEnabled?: boolean;
}

export interface BuildXconWorkbenchMarkdownFileExampleInput {
  filePath: string;
  fileName: string;
  content: string;
}

export function normalizeXconWorkbenchPrompt(value: string): string | null {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

export function hasXconWorkbenchExplicitPersistenceIntent(value: string): boolean {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  const negatedPersistence =
    /\b(?:do\s+not|don't|dont|never|no|without|not)\b[^.!?\n]{0,36}\b(?:save|export|open|file|tab|pane|window|download)\b/i.test(
      normalized,
    ) ||
    /\b(?:save|export|open|file|tab|pane|window|download)\b[^.!?\n]{0,36}\b(?:do\s+not|don't|dont|never|no|without|not)\b/i.test(
      normalized,
    ) ||
    /(?:저장|파일|문서|탭|창|패널|열어|열지|내보내|다운로드)[^.!?\n]{0,24}(?:하지\s*마|하지\s*말|하지\s*않|말고|금지|필요\s*없|안\s*(?:해|하|열|만들))/i.test(
      normalized,
    ) ||
    /(?:하지\s*마|하지\s*말|하지\s*않|말고|금지|필요\s*없|안\s*(?:해|하|열|만들)|없이)[^.!?\n]{0,24}(?:저장|파일|문서|탭|창|패널|열어|내보내|다운로드)/i.test(
      normalized,
    );
  if (negatedPersistence) return false;
  return (
    /\b(save|export|open|file|tab|pane|window|download)\b/i.test(normalized) ||
    /저장|파일|탭|창|패널|열어|내보내|다운로드|문서로/.test(normalized)
  );
}

function isXconWorkbenchCapabilityApproval(
  item: XenesisApprovalRequest,
  input: XconWorkbenchApprovalFilterInput,
): boolean {
  const kind = String(item.kind || '').toLowerCase();
  if (kind !== 'capability' && kind !== 'capability-approval') return false;
  const path = capabilityPathFromApproval(item);
  if (!path.startsWith('xd.')) return false;
  if (isApprovalCreatedDuringRun(item, input.runStartedAt)) return true;
  const workspace = normalizePathForCompare(input.workspace || '');
  const itemWorkspace = normalizePathForCompare(capabilityWorkspace(item));
  return Boolean(workspace && itemWorkspace && workspace === itemWorkspace);
}

function isApprovalCreatedDuringRun(item: XenesisApprovalRequest, runStartedAt: string | undefined): boolean {
  const startedAt = Date.parse(String(runStartedAt || ''));
  const createdAt = approvalMillis(item);
  if (!Number.isFinite(startedAt) || !Number.isFinite(createdAt)) return false;
  return createdAt >= startedAt - 10_000;
}

function approvalMillis(item: XenesisApprovalRequest): number {
  const value = Date.parse(item.createdAt || item.updatedAt || '');
  return Number.isFinite(value) ? value : 0;
}

function capabilityWorkspace(item: XenesisApprovalRequest): string {
  const args = item.capabilityArgs;
  if (args && typeof args === 'object' && !Array.isArray(args)) {
    const workspace = stringField(args as Record<string, unknown>, 'workspaceDir');
    if (workspace) return workspace;
  }
  const command = parseJsonRecord(item.command);
  const commandArgs = recordField(command, 'args');
  return stringField(commandArgs, 'workspaceDir');
}

function capabilityPathFromCommand(command: string): string {
  return stringField(parseJsonRecord(command), 'path');
}

function capabilityPathFromApproval(item: XenesisApprovalRequest): string {
  return (
    item.capabilityPath ||
    capabilityPathFromCommand(item.command) ||
    capabilityPathFromText(
      [item.approvalSessionKey, item.title, item.description, item.approveText, item.rejectText].join(' '),
    )
  );
}

function capabilityPathFromText(value: string): string {
  const match = String(value || '').match(/\bxd\.[A-Za-z0-9_.:-]+/);
  return match ? match[0].replace(/[.:;-]+$/g, '') : '';
}

function normalizePathForCompare(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+$/g, '')
    .toLowerCase();
}

function parseJsonRecord(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function recordField(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

export function createXconWorkbenchMessage(
  role: XconWorkbenchMessage['role'],
  content: string,
  extra: Partial<Omit<XconWorkbenchMessage, 'id' | 'at' | 'role' | 'content'>> = {},
): XconWorkbenchMessage {
  return {
    id: createWorkbenchId('agent-workbench-message'),
    at: nowIso(),
    role,
    content,
    ...extra,
  };
}

export function getXconWorkbenchExamples(): readonly XconWorkbenchExample[] {
  return XCON_WORKBENCH_EXAMPLES;
}

export function isXconWorkbenchMarkdownDemoFile(entry: Pick<FsEntry, 'name' | 'isDirectory' | 'ext'>): boolean {
  if (entry.isDirectory) return false;
  const ext = String(entry.ext || '').toLowerCase();
  const name = String(entry.name || '').toLowerCase();
  return ext === 'md' || name.endsWith('.md');
}

export function buildXconWorkbenchMarkdownFileExample(
  input: BuildXconWorkbenchMarkdownFileExampleInput,
): XconWorkbenchExample {
  const content = String(input.content || '');
  const title = extractMarkdownTitle(content) || stripMarkdownExtension(input.fileName) || input.fileName;
  const description = extractMarkdownDescription(content) || input.filePath;
  return {
    id: `file:${input.filePath}`,
    title,
    description,
    prompt: `Open Markdown demo: ${title}`,
    response: content,
    sourcePath: input.filePath,
  };
}

function stripMarkdownExtension(fileName: string): string {
  return String(fileName || '').replace(/(?:\.xcon)?\.md$/i, '');
}

function extractMarkdownTitle(content: string): string {
  const heading = content.match(/^\s*#\s+(.+?)\s*$/m);
  return heading?.[1]?.trim() || '';
}

function extractMarkdownDescription(content: string): string {
  let inFence = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !trimmed || trimmed.startsWith('#')) continue;
    return trimmed.replace(/\s+/g, ' ').slice(0, 140);
  }
  return '';
}

export function createXconWorkbenchExampleDeltaEvents(
  example: XconWorkbenchExample,
  chunkSize = XCON_WORKBENCH_EXAMPLE_DELTA_CHUNK_SIZE,
): XenesisRunEvent[] {
  const size = Math.max(1, Math.floor(chunkSize));
  const chunks: string[] = [];
  for (let index = 0; index < example.response.length; index += size) {
    chunks.push(example.response.slice(index, index + size));
  }

  return chunks.map((delta) => ({
    event: 'response.output_text.delta',
    source: XENESIS_AGENT_WORKBENCH_RUN_SOURCE,
    data: {
      type: 'response.output_text.delta',
      delta,
    },
  }));
}

export function appendXconWorkbenchAssistantDelta(markdown: string, event: XenesisRunEvent): string {
  const delta = extractWorkbenchAssistantDelta(event);
  return delta ? `${markdown}${delta}` : markdown;
}

export function appendXconWorkbenchRawEvent(
  entries: XconWorkbenchRawEntry[],
  event: XenesisRunEvent,
): XconWorkbenchRawEntry[] {
  const summary = summarizeWorkbenchRunEvent(event);
  if (summary.kind === 'assistant_delta') {
    const delta = extractWorkbenchAssistantDelta(event);
    const previous = entries.at(-1);
    const previousDelta = previous?.kind === 'assistant_delta' ? parseAssistantDeltaDetail(previous.detail) : '';
    const nextDelta = `${previousDelta}${delta}`;
    const nextEntry: XconWorkbenchRawEntry = {
      id: previous?.kind === 'assistant_delta' ? previous.id : createWorkbenchId('agent-workbench-raw'),
      at: nowIso(),
      kind: 'assistant_delta',
      summary: nextDelta ? `Assistant delta (${nextDelta.length} chars)` : 'Assistant delta',
      detail: stringifyAssistantDeltaDetail(nextDelta),
    };

    return previous?.kind === 'assistant_delta' ? [...entries.slice(0, -1), nextEntry] : [...entries, nextEntry];
  }

  return [
    ...entries,
    {
      id: createWorkbenchId('agent-workbench-raw'),
      at: nowIso(),
      ...summary,
    },
  ];
}

function stringifyAssistantDeltaDetail(delta: string): string {
  return JSON.stringify({ type: 'assistant_delta', delta }, null, 2);
}

function parseAssistantDeltaDetail(detail: string | undefined): string {
  if (!detail) return '';
  try {
    const parsed = JSON.parse(detail);
    return typeof parsed?.delta === 'string' ? parsed.delta : '';
  } catch {
    return '';
  }
}

export function resolveXconWorkbenchFinalMarkdown(result: XenesisRunResult, streamedMarkdown: string): string {
  const streamed = String(streamedMarkdown || '').trim();
  const finalText = resolveWorkbenchAssistantText(result, streamed).trim();
  if (shouldKeepStreamedWorkbenchMarkdown(finalText, streamed)) return streamed;
  return finalText || streamed;
}

export function resolveXconWorkbenchRenderableMarkdown(markdown: string): string {
  try {
    return createDemoPreviewMarkdown(markdown);
  } catch {
    return markdown;
  }
}

function shouldKeepStreamedWorkbenchMarkdown(finalText: string, streamedMarkdown: string): boolean {
  if (!finalText || !streamedMarkdown || finalText === streamedMarkdown) return false;
  const streamedHasSubstance = streamedMarkdown.length >= 160 || /```xcon(?:-[a-z]+)?/i.test(streamedMarkdown);
  if (!streamedHasSubstance) return false;
  const finalIsShorter = finalText.length < Math.max(180, streamedMarkdown.length * 0.65);
  if (!finalIsShorter) return false;
  return /다시[”"']?\s*라고|구체적으로\s*알려|조금\s*더\s*구체|어떤\s*(내용|부분|작업)|무엇을\s*(다시|원하)|please\s+clarify|could\s+you\s+clarify|what\s+would\s+you\s+like/i.test(
    finalText,
  );
}

export function normalizeXconWorkbenchPanelSizes(
  sizes: Partial<XconWorkbenchPanelSizes> = DEFAULT_XCON_WORKBENCH_PANEL_SIZES,
): XconWorkbenchPanelSizes {
  return {
    railWidth: clampNumber(sizes.railWidth, XCON_WORKBENCH_RAIL_MIN_WIDTH, XCON_WORKBENCH_RAIL_MAX_WIDTH),
    rawWidth: clampNumber(sizes.rawWidth, XCON_WORKBENCH_RAW_MIN_WIDTH, XCON_WORKBENCH_RAW_MAX_WIDTH),
  };
}

export function resizeXconWorkbenchPanelSizes(
  current: XconWorkbenchPanelSizes,
  target: XconWorkbenchPanelResizeTarget,
  input: XconWorkbenchPanelResizeInput,
): XconWorkbenchPanelSizes {
  const normalized = normalizeXconWorkbenchPanelSizes(current);
  const desiredWidth =
    target === 'rail'
      ? input.clientX - input.containerRect.left
      : input.containerRect.left + input.containerRect.width - input.clientX;
  return resizeXconWorkbenchPanelToWidth(normalized, target, desiredWidth, input.containerRect);
}

export function dragXconWorkbenchPanelSizes(
  current: XconWorkbenchPanelSizes,
  target: XconWorkbenchPanelResizeTarget,
  input: XconWorkbenchPanelDragInput,
): XconWorkbenchPanelSizes {
  const normalized = normalizeXconWorkbenchPanelSizes(current);
  const deltaX = input.clientX - input.startClientX;
  const desiredWidth = target === 'rail' ? normalized.railWidth + deltaX : normalized.rawWidth - deltaX;
  return resizeXconWorkbenchPanelToWidth(normalized, target, desiredWidth, input.containerRect);
}

function resizeXconWorkbenchPanelToWidth(
  normalized: XconWorkbenchPanelSizes,
  target: XconWorkbenchPanelResizeTarget,
  desiredWidth: number,
  containerRect: Pick<DOMRect, 'width'>,
): XconWorkbenchPanelSizes {
  const availableWidth = Math.max(0, containerRect.width - XCON_WORKBENCH_PANEL_SPLITTER_WIDTH * 2);

  if (target === 'rail') {
    const maxRailWidth = Math.max(
      XCON_WORKBENCH_RAIL_MIN_WIDTH,
      Math.min(XCON_WORKBENCH_RAIL_MAX_WIDTH, availableWidth - normalized.rawWidth - XCON_WORKBENCH_CHAT_MIN_WIDTH),
    );
    return {
      ...normalized,
      railWidth: clampNumber(desiredWidth, XCON_WORKBENCH_RAIL_MIN_WIDTH, maxRailWidth),
    };
  }

  const maxRawWidth = Math.max(
    XCON_WORKBENCH_RAW_MIN_WIDTH,
    Math.min(XCON_WORKBENCH_RAW_MAX_WIDTH, availableWidth - normalized.railWidth - XCON_WORKBENCH_CHAT_MIN_WIDTH),
  );
  return {
    ...normalized,
    rawWidth: clampNumber(desiredWidth, XCON_WORKBENCH_RAW_MIN_WIDTH, maxRawWidth),
  };
}

function clampNumber(value: number | undefined, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(Number(value))));
}

const XCON_WORKBENCH_LOCAL_CLI_PROVIDER_BY_AGENT_ID: Partial<Record<LocalCliAgentStatus['id'], string>> = {
  codex: 'codex-cli',
  claude: 'claude-cli',
};

export function buildXconWorkbenchProviderOptions(
  input: BuildXconWorkbenchProviderOptionsInput = {},
): XconWorkbenchProviderOption[] {
  const provider = compactProviderOptionPart(input.providerRuntime?.provider);
  const model = compactProviderOptionPart(input.providerRuntime?.model);
  const byokRuntime = [provider, model].filter(Boolean).join(' · ');
  const options: XconWorkbenchProviderOption[] = [
    {
      value: '',
      label: byokRuntime ? `BYOK (${byokRuntime})` : 'BYOK',
      kind: 'byok',
      title: 'Use the active API provider configured in Settings > AI Provider.',
    },
  ];

  const seenValues = new Set(options.map((option) => option.value));
  for (const agent of input.localCliAgents ?? []) {
    if (!agent.installed) continue;
    const value = XCON_WORKBENCH_LOCAL_CLI_PROVIDER_BY_AGENT_ID[agent.id];
    if (!value || seenValues.has(value)) continue;
    seenValues.add(value);
    options.push({
      value,
      label: agent.label,
      kind: 'local-cli',
      title: agent.commandPath
        ? `Use installed local CLI: ${agent.commandPath}`
        : `Use installed local CLI: ${agent.commands.join(', ')}`,
    });
  }

  const hermesAgent = (input.localCliAgents ?? []).find((agent) => agent.id === 'hermes');
  options.push({
    value: 'hermes',
    label: input.hermesEnabled ? 'Hermes' : 'Hermes (not available)',
    kind: 'hermes',
    ...(input.hermesEnabled ? {} : { disabled: true }),
    title: input.hermesEnabled
      ? 'Use Hermes as the Xenesis Agent runtime provider.'
      : hermesAgent?.installed
        ? 'Hermes is installed, but packages/xenesis does not expose a Hermes provider adapter yet.'
        : 'Hermes is shown for Settings parity, but no Hermes provider adapter is available yet.',
  });

  return options;
}

function compactProviderOptionPart(value: unknown): string {
  return String(value ?? '').trim();
}

export function buildXconWorkbenchRunRequest(input: BuildXconWorkbenchRunRequestInput): XenesisRunRequest {
  const context: Record<string, unknown> = {
    ...(input.context ?? {}),
    responseSurface: 'xcon-agent-workbench',
    persistencePolicy: 'explicit-user-request-only',
    allowPersistence: hasXconWorkbenchExplicitPersistenceIntent(input.prompt),
    validationPolicy: 'pre-final-inline-if-needed',
    surfacePolicy: XCON_WORKBENCH_SURFACE_POLICY,
  };
  return {
    prompt: input.prompt,
    mode: input.mode,
    workflow: 'default',
    stream: true,
    source: XENESIS_AGENT_WORKBENCH_RUN_SOURCE,
    workspace: input.workspace || undefined,
    context,
    ...(input.sessionId?.trim() ? { sessionId: input.sessionId.trim() } : {}),
    ...(input.provider?.trim() ? { provider: input.provider.trim() } : {}),
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    ...(input.historyMessages?.length ? { historyMessages: input.historyMessages } : {}),
  };
}
