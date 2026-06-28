import type { McpBridgeActionInboxItem, XenesisRunResult, XenesisStatus } from '../../../../shared/types';
import type { AgentActionNeeded } from '../../../../shared/agentActionRecords';
import type { XenesisAgentAttachment } from './xenesisAgentAttachments';
import type { XenesisDeskActionExecutionResult, XenesisDeskActionRequest } from './xenesisAgentDeskControl';
import type { XenesisPolicyNotice, XenesisPolicySnapshot } from './xenesisPolicyNotices';

export const XENESIS_AGENT_STATE_STORAGE_KEY = 'xenesis:xenesis-agent-state:v1';
export const XENESIS_AGENT_STATUS_BAR_KEYS_STORAGE_KEY = 'xenesis:xenesis-agent-status-bar-keys:v1';
export const XENESIS_ARTIFACT_SESSION_STORAGE_KEY = 'xenesis:xenesis-artifact-sessions:v1';
export const XENESIS_ARTIFACT_SESSION_CHANGED_EVENT = 'xenesis-xenesis-artifacts-changed';
export const XENESIS_ARTIFACT_SESSION_LIMIT = 50;
export const XENESIS_CONTEXT_MESSAGE_LIMIT = 12;
export const XENESIS_CONTEXT_MESSAGE_MAX_CHARS = 2000;

export type XenesisMode = 'chat' | 'plan' | 'work';

/** Routing overrides carried through a prompt submission (also used by queued prompts). */
export interface XenesisAgentPromptRoutingOptions {
  bypassDirectDeskRouting?: boolean;
  bypassNaturalDeskRouting?: boolean;
}

/**
 * A prompt the user submitted while a run was active. Snapshotted at enqueue time
 * (mode/attachments/routing) so a later /mode change or attachment clear does not
 * retroactively alter the queued turn. Drained FIFO when the active run completes.
 */
export interface QueuedPrompt {
  id: string;
  at: string;
  input: string;
  attachments: XenesisAgentAttachment[];
  routingOptions: XenesisAgentPromptRoutingOptions;
  mode: XenesisMode;
}

export type XenesisSlashMenuPlacement = 'above' | 'below';
export type XenesisTerminalLineKind = 'message' | 'command' | 'tool' | 'approval' | 'status' | 'error';
export type XenesisStatusBarItemKey =
  | 'state'
  | 'runtime'
  | 'provider'
  | 'model'
  | 'mode'
  | 'working'
  | 'workspace'
  | 'gateway'
  | 'profile'
  | 'workflow'
  | 'approval'
  | 'context'
  | 'session'
  | 'policy'
  | 'artifact';

export interface XenesisChatMessage {
  id: string;
  at: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /**
   * Intermediate streamed narration preserved when the final answer replaces the
   * streamed content on turn completion. Rendered as a collapsible "thinking
   * process" block so the in-progress steps are not lost.
   */
  thinkingContent?: string;
  kind?: XenesisTerminalLineKind;
  error?: boolean;
  streaming?: boolean;
  deskActions?: XenesisDeskActionRequest[];
  deskActionStatus?: 'pending' | 'running' | 'applied' | 'failed' | 'cancelled';
  deskActionResults?: XenesisDeskActionExecutionResult[];
  mcpActionInboxItems?: McpBridgeActionInboxItem[];
  mcpActionInboxStatus?: 'pending' | 'running' | 'approved' | 'rejected' | 'failed' | 'expired';
  mcpActionInboxResult?: string;
  agentActionNeededItems?: AgentActionNeeded[];
}

export interface XenesisRawStreamEntry {
  id: string;
  at: string;
  kind: string;
  summary: string;
  detail?: string;
  error?: boolean;
}

export interface XenesisAgentState {
  status: XenesisStatus | null;
  prompt: string;
  mode: XenesisMode;
  loading: boolean;
  running: boolean;
  error: string;
  messages: XenesisChatMessage[];
  /** Type-ahead prompts submitted while a run was active; drained FIFO on completion. */
  promptQueue: QueuedPrompt[];
  rawStream: XenesisRawStreamEntry[];
  policyNotices: XenesisPolicyNotice[];
  policySnapshot: XenesisPolicySnapshot | null;
  rawStreamOpen: boolean;
  rawStreamFocusId?: string;
  activeSessionId: string;
  statusBarKeys: XenesisStatusBarItemKey[];
}

export interface XenesisSlashCommand {
  name: string;
  args: string[];
  rest: string;
}

export interface XenesisSlashCommandDescriptor {
  name: string;
  usage: string;
  description: string;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function stringifyDetail(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const GENERIC_RUN_COMPLETED_TEXT = 'Xenesis run completed.';
const GENERIC_RUN_FAILED_TEXT = 'Xenesis run failed.';

const CONTENT_TEXT_KEYS = ['text', 'content', 'output_text', 'value', 'doneContent', 'output'] as const;
const WRAPPER_RECORD_KEYS = ['result', 'payload', 'data', 'record', 'response'] as const;

export function stripTerminalControlText(value: string): string {
  return value
    .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/←\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u009b[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '');
}

const CLI_OUTPUT_BASE64_MARKER_NAMES = ['GOWOORI', 'KOURI', 'XENESIS'] as const;
const CLI_TRANSPORT_TOKENS = [
  '[Console]::OutputEncoding',
  'Get-Content -Raw',
  'codex exec',
  'claude -p',
  '--output-last-message',
  'LASTEXITCODE',
  'GOWOORI_CLI_OUTPUT_BASE64',
  'KOURI_CLI_OUTPUT_BASE64',
  'XENESIS_CLI_OUTPUT_BASE64',
  '.xenis-gowoori-prompts',
  '.xvdesk-kouri-prompts',
  'OpenAI Codex v',
  'workdir:',
  'approval:',
  'sandbox:',
  'session id:',
] as const;

const INTERNAL_PROMPT_TOKENS = [
  'MCP prompt pack',
  'Shared XCON Generation Contract',
  'Return sections in this order',
  'Do a final self-check before responding',
  'Generate a new Markdown + XCON/SKETCH artifact',
  'Every xcon-sketch block',
  'xcon-chain-fixture',
  'xcon-chain as alias',
  'xcon-demo block',
  'The original user request is the source of truth',
  'Prompt packs:',
  'Route goal:',
  'Kouri agent routing:',
  'Gowoori agent routing:',
  'XCON/SKETCH Hard Rules',
  'Output contract:',
  'Visual quality contract:',
  'User request:',
  'Previous Xenesis assistant answer:',
  'Current follow-up request:',
  'Automatic Gowoori repair request',
  'Automatic Kouri repair request',
  'Automatic XCON repair request',
  'Return a corrected Markdown + XCON/SKETCH artifact',
  'Validation diagnostics:',
  'Broken artifact:',
] as const;

const STREAM_CLASSIFICATION_MAX_CHARS = 24000;
const STREAM_CLASSIFICATION_MIN_CHARS = 48;
const STREAM_NOISE_HINT_PATTERNS = [
  /\[Console\]::OutputEncoding/i,
  /Get-\s*Content\s+-Raw/i,
  /codex\s+exec/i,
  /claude\s+-p/i,
  /LASTEXITCODE/i,
  /CurrentDir=/i,
  /OpenAI Codex v/i,
  /workdir:/i,
  /approval:/i,
  /sandbox:/i,
  /session id:/i,
  /GOWOORI_CLI_OUTPUT_BASE64/i,
  /KOURI_CLI_OUTPUT_BASE64/i,
  /XENESIS_CLI_OUTPUT_BASE64/i,
  /MCP prompt pack/i,
  /Return sections in this order/i,
  /Do a final self-check before responding/i,
  /Every xcon-sketch block/i,
  /xcon-chain-fixture/i,
  /User request:/i,
  /Automatic (?:Gowoori|Kouri|XCON) repair request/i,
  /Return a corrected Markdown \+ XCON\/SKETCH artifact/i,
  /Validation diagnostics:/i,
  /Broken artifact:/i,
] as const;

export interface XenesisAssistantStreamFilterState {
  pending: string;
  released: boolean;
  suppressingNoise: boolean;
}

export interface XenesisAssistantStreamFilterResult {
  delta: string;
  hold: boolean;
  suppressed: boolean;
}

function cliOutputBase64Markers(): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const name of CLI_OUTPUT_BASE64_MARKER_NAMES) {
    const baseBegin = `${name}_CLI_OUTPUT_BASE64_BEGIN`;
    const baseEnd = `${name}_CLI_OUTPUT_BASE64_END`;
    pairs.push([baseBegin, baseEnd], [`_${baseBegin}_`, `_${baseEnd}_`], [`__${baseBegin}__`, `__${baseEnd}__`]);
  }
  return pairs;
}

function decodeBase64Utf8(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9+/=]/g, '');
  if (normalized.length < 8) return '';
  try {
    if (typeof atob === 'function') {
      const binary = atob(normalized);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
  } catch {
    return '';
  }

  try {
    const bufferCtor = (
      globalThis as unknown as {
        Buffer?: { from(input: string, encoding: 'base64'): { toString(encoding: 'utf8'): string } };
      }
    ).Buffer;
    return bufferCtor?.from(normalized, 'base64').toString('utf8') || '';
  } catch {
    return '';
  }
}

export function createXenesisAssistantStreamFilterState(): XenesisAssistantStreamFilterState {
  return {
    pending: '',
    released: false,
    suppressingNoise: false,
  };
}

function appendStreamFilterPending(state: XenesisAssistantStreamFilterState, value: string): string {
  state.pending = `${state.pending}${value}`;
  if (state.pending.length > STREAM_CLASSIFICATION_MAX_CHARS) {
    state.pending = state.pending.slice(-STREAM_CLASSIFICATION_MAX_CHARS);
  }
  return state.pending;
}

function hasStreamNoiseHint(value: string): boolean {
  return STREAM_NOISE_HINT_PATTERNS.some((pattern) => pattern.test(value));
}

export function filterXenesisAssistantStreamDelta(
  state: XenesisAssistantStreamFilterState,
  delta: string,
): XenesisAssistantStreamFilterResult {
  const cleanedDelta = stripTerminalControlText(delta);
  if (!cleanedDelta.trim()) {
    return { delta: '', hold: false, suppressed: true };
  }

  if (state.released) {
    const cleaned = sanitizeXenesisAssistantTextCandidate(cleanedDelta);
    return {
      delta: cleaned,
      hold: false,
      suppressed: !cleaned,
    };
  }

  const pending = appendStreamFilterPending(state, cleanedDelta);
  const decoded = extractMarkedCliOutput(pending);
  if (decoded) {
    state.pending = '';
    state.released = true;
    state.suppressingNoise = false;
    return { delta: decoded, hold: false, suppressed: false };
  }

  if (
    state.suppressingNoise ||
    hasStreamNoiseHint(pending) ||
    isXenesisCliTransportNoise(pending) ||
    isXenesisInternalPromptNoise(pending)
  ) {
    state.suppressingNoise = true;
    return { delta: '', hold: true, suppressed: true };
  }

  if (pending.length < STREAM_CLASSIFICATION_MIN_CHARS && !pending.includes('\n')) {
    return { delta: '', hold: true, suppressed: false };
  }

  const cleaned = sanitizeXenesisAssistantTextCandidate(pending);
  state.pending = '';
  state.released = Boolean(cleaned);
  return {
    delta: cleaned,
    hold: false,
    suppressed: !cleaned,
  };
}

export function extractMarkedCliOutput(value: string): string {
  const cleaned = stripTerminalControlText(value);
  const lines = cleaned.split('\n');
  for (const [begin, end] of cliOutputBase64Markers()) {
    const beginIndex = lines.findLastIndex((line) => line.trim() === begin);
    if (beginIndex < 0) continue;
    const endIndex = lines.findIndex((line, index) => index > beginIndex && line.trim() === end);
    if (endIndex < 0) continue;
    const decoded = stripTerminalControlText(decodeBase64Utf8(lines.slice(beginIndex + 1, endIndex).join(''))).trim();
    if (decoded) return decoded;
  }
  return '';
}

export function isXenesisCliTransportNoise(value: string): boolean {
  const cleaned = stripTerminalControlText(value).trim();
  if (!cleaned) return false;
  if (extractMarkedCliOutput(cleaned)) return true;
  const tokenScore = CLI_TRANSPORT_TOKENS.reduce((score, token) => (cleaned.includes(token) ? score + 1 : score), 0);
  if (tokenScore >= 2) return true;
  return /(?:^|\n)PS\s+[A-Z]:\\/i.test(cleaned) && /(?:codex exec|claude -p|Get-Content -Raw)/i.test(cleaned);
}

export function isXenesisInternalPromptNoise(value: string): boolean {
  const cleaned = stripTerminalControlText(value).trim();
  if (!cleaned) return false;
  const tokenScore = INTERNAL_PROMPT_TOKENS.reduce((score, token) => (cleaned.includes(token) ? score + 1 : score), 0);
  if (tokenScore >= 2) return true;
  if (
    /Return sections in this order:/i.test(cleaned) &&
    /(?:xcon-sketch|xcon-chain-fixture|Do a final self-check)/i.test(cleaned)
  ) {
    return true;
  }
  if (/User request:/i.test(cleaned) && /Generate a new Markdown \+ XCON\/SKETCH artifact/i.test(cleaned)) {
    return true;
  }
  if (
    /Automatic (?:Gowoori|Kouri|XCON) repair request/i.test(cleaned) &&
    /(?:Return a corrected Markdown \+ XCON\/SKETCH artifact|Validation diagnostics:|Broken artifact:)/i.test(cleaned)
  ) {
    return true;
  }
  return false;
}

export function sanitizeXenesisAssistantTextCandidate(value: string): string {
  const decoded = extractMarkedCliOutput(value);
  if (decoded) return decoded;
  const cleaned = stripTerminalControlText(value);
  if (!cleaned.trim()) return '';
  if (isXenesisCliTransportNoise(cleaned)) return '';
  if (isXenesisInternalPromptNoise(cleaned)) return '';
  return cleaned;
}

function textFromContentInternal(value: unknown, depth: number): string {
  if (depth > 8) return '';
  if (typeof value === 'string') return stripTerminalControlText(value);
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return stripTerminalControlText(part);
        if (!isRecord(part)) return '';
        return textFromContentInternal(part, depth + 1);
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  if (!isRecord(value)) return '';

  for (const key of CONTENT_TEXT_KEYS) {
    const text = textFromContentInternal(value[key], depth + 1).trim();
    if (text) return text;
  }

  const message = nestedRecord(value, 'message');
  if (message) {
    const text = textFromContentInternal(
      message.content ?? message.text ?? message.output_text ?? message.value,
      depth + 1,
    ).trim();
    if (text) return text;
  }

  for (const key of WRAPPER_RECORD_KEYS) {
    const nested = nestedRecord(value, key);
    if (!nested) continue;
    const text = textFromContentInternal(nested, depth + 1).trim();
    if (text) return text;
  }

  return '';
}

export function textFromContent(value: unknown): string {
  return textFromContentInternal(value, 0);
}

export function assistantTextFromMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return '';
  const texts: string[] = [];
  for (const message of messages) {
    if (!isRecord(message)) continue;
    const nestedMessage = nestedRecord(message, 'message');
    const role = stringField(message, 'role') || stringField(nestedMessage, 'role');
    const type = stringField(message, 'type') || stringField(message, 'kind');
    const isAssistant = role === 'assistant' || type === 'assistant_message' || type === 'assistant';
    const content =
      message.content ??
      message.text ??
      message.output_text ??
      message.value ??
      nestedMessage?.content ??
      nestedMessage?.text;
    const text = sanitizeXenesisAssistantTextCandidate(textFromContent(content));
    if (isAssistant && text) texts.push(text);
  }
  return texts[texts.length - 1] || '';
}

export function extractTextFromGatewayRecord(record: Record<string, unknown>): string {
  const type = typeof record.type === 'string' ? record.type : '';
  const message = isRecord(record.message) ? record.message : undefined;
  const nestedData = nestedRecord(record, 'data');

  if (nestedData && (typeof record.event === 'string' || typeof nestedData.type === 'string')) {
    const nestedText = extractTextFromGatewayRecord(nestedData);
    if (nestedText) return nestedText;
  }

  for (const key of WRAPPER_RECORD_KEYS) {
    const nested = nestedRecord(record, key);
    if (!nested) continue;
    const nestedText = extractTextFromGatewayRecord(nested);
    if (nestedText) return nestedText;
  }

  const messagesText = assistantTextFromMessages(record.messages);
  if (messagesText) return messagesText;

  if (type === 'assistant_message' && message) {
    return sanitizeXenesisAssistantTextCandidate(textFromContent(message.content));
  }
  if (type === 'done') {
    return sanitizeXenesisAssistantTextCandidate(
      textFromContent(record.content ?? record.doneContent ?? record.output),
    );
  }
  if (type === 'output_text') {
    return sanitizeXenesisAssistantTextCandidate(textFromContent(record.text));
  }
  if (message && message.role === 'assistant') {
    return sanitizeXenesisAssistantTextCandidate(textFromContent(message.content));
  }
  return (
    sanitizeXenesisAssistantTextCandidate(textFromContent(record.output)) ||
    sanitizeXenesisAssistantTextCandidate(textFromContent(record.content))
  );
}

export function parseJsonRecords(value: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const trimmed = value.trim();
  if (!trimmed) return records;

  for (const line of trimmed.split(/\r?\n/)) {
    let candidate = line.trim();
    if (candidate.startsWith('data:')) candidate = candidate.slice(5).trim();
    if (candidate === '[DONE]') continue;
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (isRecord(parsed)) records.push(parsed);
    } catch {
      // Gateway output can also be plain assistant text; ignore malformed JSON fragments.
    }
  }

  if (records.length === 0 && trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (isRecord(parsed)) records.push(parsed);
    } catch {
      // Plain text fallback is handled by the caller.
    }
  }

  return records;
}

function assistantTextFromResultEvents(events: unknown): string {
  if (!Array.isArray(events)) return '';
  const texts: string[] = [];
  for (const event of events) {
    if (isRecord(event)) {
      const text = sanitizeXenesisAssistantTextCandidate(extractTextFromGatewayRecord(event));
      if (text) texts.push(text);
      continue;
    }
    if (typeof event === 'string') {
      for (const record of parseJsonRecords(event)) {
        const text = sanitizeXenesisAssistantTextCandidate(extractTextFromGatewayRecord(record));
        if (text) texts.push(text);
      }
    }
  }
  return texts[texts.length - 1] || '';
}

function nestedRunResultText(record: Record<string, unknown>, streamedContent: string, depth: number): string {
  if (depth > 6) return '';
  for (const key of WRAPPER_RECORD_KEYS) {
    const nested = nestedRecord(record, key);
    if (!nested) continue;
    const text = resolveXenesisAssistantText(nested as unknown as XenesisRunResult, streamedContent, depth + 1).trim();
    if (text && text !== GENERIC_RUN_COMPLETED_TEXT && text !== GENERIC_RUN_FAILED_TEXT) return text;
  }
  return '';
}

export function resolveXenesisAssistantText(result: XenesisRunResult, streamedContent = '', depth = 0): string {
  const resultRecord = isRecord(result) ? (result as unknown as Record<string, unknown>) : undefined;
  if (resultRecord) {
    const nestedText = nestedRunResultText(resultRecord, streamedContent, depth);
    if (nestedText) return nestedText;
  }

  if (result.ok === false) {
    return result.error || result.errors || GENERIC_RUN_FAILED_TEXT;
  }

  const streamedText = sanitizeXenesisAssistantTextCandidate(streamedContent);
  const doneContent = sanitizeXenesisAssistantTextCandidate(textFromContent(result.doneContent));
  const eventText = sanitizeXenesisAssistantTextCandidate(assistantTextFromResultEvents(result.events));
  const messageText = resultRecord
    ? sanitizeXenesisAssistantTextCandidate(assistantTextFromMessages(resultRecord.messages))
    : '';
  const directText = resultRecord
    ? sanitizeXenesisAssistantTextCandidate(
        textFromContent(resultRecord.content ?? resultRecord.text ?? resultRecord.output_text ?? resultRecord.value),
      )
    : '';
  const output = sanitizeXenesisAssistantTextCandidate(result.output || '');
  if (!output) {
    return (
      doneContent ||
      eventText ||
      messageText ||
      directText ||
      streamedText ||
      result.id ||
      result.traceId ||
      GENERIC_RUN_COMPLETED_TEXT
    );
  }

  const parsedRecords = parseJsonRecords(output);
  const parsedTexts = parsedRecords
    .map(extractTextFromGatewayRecord)
    .map(sanitizeXenesisAssistantTextCandidate)
    .filter(Boolean);
  if (parsedTexts.length > 0) {
    return parsedTexts[parsedTexts.length - 1];
  }
  if (parsedRecords.length > 0 && streamedText) {
    return streamedText;
  }
  if (parsedRecords.length > 0) {
    return (
      doneContent || eventText || messageText || directText || result.id || result.traceId || GENERIC_RUN_COMPLETED_TEXT
    );
  }

  return doneContent || eventText || messageText || directText || output || streamedText || GENERIC_RUN_COMPLETED_TEXT;
}

export function extractXenesisAssistantText(result: XenesisRunResult): string {
  return resolveXenesisAssistantText(result);
}

export function statusText(status: XenesisStatus | null): string {
  if (!status) return 'Unknown';
  if (!status.enabled) return 'Disabled';
  if (status.ok) return 'Ready';
  if (status.running) return 'Starting';
  return 'Stopped';
}

export function runtimeModeText(status: XenesisStatus | null): string {
  if (!status) return 'Unknown runtime';
  return status.runtimeMode === 'externalGateway' ? 'External gateway' : 'Embedded';
}

export function runtimeConnectionText(status: XenesisStatus | null): string {
  if (!status) return '-';
  if (status.runtimeMode === 'externalGateway') return status.url || 'Gateway not started';
  if (status.gateway?.running) {
    return `Direct library call · Gateway ${status.gateway.url || `${status.gateway.host}:${status.gateway.port}`}`;
  }
  if (status.gateway?.enabled) return 'Direct library call · Gateway stopped';
  return 'Direct library call';
}

export function nestedRecord(
  record: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined {
  if (!record) return undefined;
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

export function stringField(record: Record<string, unknown> | undefined, key: string): string {
  if (!record) return '';
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

export function compactContextText(value: string): string {
  if (value.length <= XENESIS_CONTEXT_MESSAGE_MAX_CHARS) return value;
  return `${value.slice(0, XENESIS_CONTEXT_MESSAGE_MAX_CHARS)}\n[truncated ${value.length - XENESIS_CONTEXT_MESSAGE_MAX_CHARS} chars]`;
}
