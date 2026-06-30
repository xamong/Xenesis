import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RunStateEvent, SessionEvent } from '../core/events.js';
import type { AgentMessage, ToolCall } from '../core/messages.js';
import { isResumableRunState, type ResumableRunState } from '../core/resume/ResumableRunState.js';

export const HISTORY_PAGE_SIZE = 100;

export type SessionLogRecord = SessionEvent & {
  sessionId: string;
  traceId?: string;
  timestamp: string;
  seq?: number;
};

export interface SessionHistoryPage<TEvent = AgentMessage> {
  events: TEvent[];
  firstId: string | null;
  hasMore: boolean;
}

export interface RemoteSessionHistoryPageRequest {
  endpoint: string;
  headers: Record<string, string>;
  params: Record<string, string | number | boolean>;
}

export interface RemoteSessionHistoryPageResponse {
  status: number;
  body?: {
    data?: unknown;
    has_more?: unknown;
    first_id?: unknown;
  };
}

export interface RemoteSessionHistorySource<TEvent = AgentMessage> {
  endpoint: string;
  headers: Record<string, string>;
  fetchPage(request: RemoteSessionHistoryPageRequest): Promise<RemoteSessionHistoryPageResponse>;
  decodeEvent(raw: unknown): TEvent | undefined;
}

export interface RemoteSessionHistorySourceOptions<TEvent = AgentMessage> {
  endpoint: string;
  headers?: Record<string, string>;
  fetchPage(request: RemoteSessionHistoryPageRequest): Promise<RemoteSessionHistoryPageResponse>;
  decodeEvent?: (raw: unknown) => TEvent | undefined;
}

type UserMessage = Extract<AgentMessage, { role: 'user' }>;
type AssistantMessage = Extract<AgentMessage, { role: 'assistant' }>;
type ToolMessage = Extract<AgentMessage, { role: 'tool' }>;

function sessionPath(xenesisHome: string, sessionId: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(sessionId)) {
    throw new Error(`Invalid session id: ${sessionId}`);
  }
  return resolve(xenesisHome, 'sessions', `${sessionId}.jsonl`);
}

function isMessageEvent(record: SessionLogRecord): record is SessionLogRecord & {
  type: 'user_message' | 'assistant_message' | 'tool_result';
  message: AgentMessage;
} {
  return record.type === 'user_message' || record.type === 'assistant_message' || record.type === 'tool_result';
}

function isRunStateEvent(record: SessionLogRecord): record is SessionLogRecord & RunStateEvent {
  return record.type === 'run_state';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isToolCall(value: unknown): value is ToolCall {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && 'input' in value;
}

function decodeAgentMessage(raw: unknown): AgentMessage | undefined {
  if (!isRecord(raw) || typeof raw.role !== 'string') return undefined;

  if (raw.role === 'user' && typeof raw.content === 'string') {
    return { role: 'user', content: raw.content } satisfies UserMessage;
  }

  if (raw.role === 'assistant' && typeof raw.content === 'string') {
    const toolCalls = Array.isArray(raw.toolCalls) ? raw.toolCalls.filter(isToolCall) : undefined;
    return {
      role: 'assistant',
      content: raw.content,
      ...(toolCalls && toolCalls.length > 0 ? { toolCalls } : {}),
    } satisfies AssistantMessage;
  }

  if (
    raw.role === 'tool' &&
    typeof raw.toolCallId === 'string' &&
    typeof raw.name === 'string' &&
    typeof raw.content === 'string'
  ) {
    return {
      role: 'tool',
      toolCallId: raw.toolCallId,
      name: raw.name,
      content: raw.content,
    } satisfies ToolMessage;
  }

  return undefined;
}

export function createRemoteSessionHistorySource<TEvent = AgentMessage>(
  options: RemoteSessionHistorySourceOptions<TEvent>,
): RemoteSessionHistorySource<TEvent> {
  return {
    endpoint: options.endpoint,
    headers: { ...(options.headers ?? {}) },
    fetchPage: options.fetchPage,
    decodeEvent: options.decodeEvent ?? (decodeAgentMessage as (raw: unknown) => TEvent | undefined),
  };
}

function firstIdFromBody(body: RemoteSessionHistoryPageResponse['body']) {
  return typeof body?.first_id === 'string' ? body.first_id : null;
}

async function fetchRemoteSessionEvents<TEvent>(
  source: RemoteSessionHistorySource<TEvent>,
  params: Record<string, string | number | boolean>,
): Promise<SessionHistoryPage<TEvent> | null> {
  const response = await source
    .fetchPage({
      endpoint: source.endpoint,
      headers: { ...source.headers },
      params,
    })
    .catch(() => null);

  if (!response || response.status !== 200) return null;

  const rawEvents = Array.isArray(response.body?.data) ? response.body.data : [];
  return {
    events: rawEvents
      .map((rawEvent) => source.decodeEvent(rawEvent))
      .filter((event): event is TEvent => event !== undefined),
    firstId: firstIdFromBody(response.body),
    hasMore: response.body?.has_more === true,
  };
}

export async function fetchLatestSessionEvents<TEvent = AgentMessage>(
  source: RemoteSessionHistorySource<TEvent>,
  limit = HISTORY_PAGE_SIZE,
): Promise<SessionHistoryPage<TEvent> | null> {
  return await fetchRemoteSessionEvents(source, { limit, anchor_to_latest: true });
}

export async function fetchOlderSessionEvents<TEvent = AgentMessage>(
  source: RemoteSessionHistorySource<TEvent>,
  beforeId: string,
  limit = HISTORY_PAGE_SIZE,
): Promise<SessionHistoryPage<TEvent> | null> {
  return await fetchRemoteSessionEvents(source, { limit, before_id: beforeId });
}

export async function collectRemoteSessionMessages<TEvent = AgentMessage>(
  source: RemoteSessionHistorySource<TEvent>,
  limit = HISTORY_PAGE_SIZE,
): Promise<TEvent[]> {
  const latest = await fetchLatestSessionEvents(source, limit);
  if (!latest) return [];

  let events = latest.events;
  let cursor = latest.firstId;
  let hasMore = latest.hasMore;

  while (hasMore && cursor) {
    const older = await fetchOlderSessionEvents(source, cursor, limit);
    if (!older) break;
    events = [...older.events, ...events];
    cursor = older.firstId;
    hasMore = older.hasMore;
  }

  return events;
}

export async function readSessionLog(xenesisHome: string, sessionId: string): Promise<SessionLogRecord[]> {
  const raw = await readFile(sessionPath(xenesisHome, sessionId), 'utf8');
  const records: SessionLogRecord[] = [];
  for (const line of raw.trimEnd().split(/\r?\n/)) {
    if (!line) continue;
    try {
      records.push(JSON.parse(line) as SessionLogRecord);
    } catch {
      // Tolerate a crash-truncated / partial line (typically the trailing one).
    }
  }
  return records;
}

export function eventsToMessages(records: SessionLogRecord[]): AgentMessage[] {
  return records.filter(isMessageEvent).map((record, index) => {
    const message = record.message;
    return message.id ? message : { ...message, id: `${record.sessionId}:r${index}` };
  });
}

export function rewindSessionEvents(records: SessionLogRecord[], eventCount: number): SessionLogRecord[] {
  if (!Number.isInteger(eventCount) || eventCount <= 0) {
    throw new Error(`rewind event count must be a positive integer, got ${eventCount}`);
  }
  return records.slice(0, eventCount);
}

function lastContent(records: SessionLogRecord[], type: 'user_message' | 'assistant_message') {
  const record = records
    .filter(
      (
        candidate,
      ): candidate is SessionLogRecord & {
        type: typeof type;
        message: Extract<AgentMessage, { role: 'user' | 'assistant' }>;
      } => candidate.type === type,
    )
    .at(-1);
  return record?.message.content;
}

export function latestRunState(records: SessionLogRecord[]) {
  return records.filter(isRunStateEvent).at(-1);
}

/**
 * S7 — return the most recent valid `run_snapshot.state` from a session log, or
 * `undefined` if none is present / valid. A malformed snapshot (older / hand-edited
 * / partially-written log) is skipped via `isResumableRunState` so resume can
 * degrade gracefully to a message-only run rather than crashing.
 */
export function latestRunSnapshot(records: SessionLogRecord[]): ResumableRunState | undefined {
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const record = records[i];
    if (record.type === 'run_snapshot' && isResumableRunState((record as { state?: unknown }).state)) {
      return (record as { state: ResumableRunState }).state;
    }
  }
  return undefined;
}

/**
 * S6 — idempotency probe for durable HITL resume. Returns `true` when the log
 * already contains an `approval_resolved` event for `toolCallId`, meaning the
 * pending approval was already applied (its stored tool either executed or was
 * denied). A repeated resume keyed by the same `toolCallId` is then a no-op for
 * that tool, guaranteeing exactly-once execution (Global Constraint #1).
 */
export function hasApprovalResolved(records: SessionLogRecord[], toolCallId: string): boolean {
  return records.some(
    (record) => record.type === 'approval_resolved' && (record as { toolCallId?: string }).toolCallId === toolCallId,
  );
}

/**
 * S7 — return the most recent `user_message` from a session log (the triggering
 * user turn), used by `resumeAgentPipeline` for constraint derivation on resume.
 */
export function lastUserMessage(records: SessionLogRecord[]): AgentMessage | undefined {
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const record = records[i];
    if (record.type === 'user_message') {
      return (record as { message: AgentMessage }).message;
    }
  }
  return undefined;
}

export function compactSessionEvents(records: SessionLogRecord[]) {
  const first = records[0];
  const sessionId = first?.sessionId ?? 'unknown';
  const traceId = records.find((record) => typeof record.traceId === 'string' && record.traceId.trim())?.traceId;
  const messageCount = records.filter(isMessageEvent).length;
  const toolCount = records.filter((record) => record.type === 'tool_call' || record.type === 'tool_result').length;
  const toolChoiceAudits = records.filter((record) => record.type === 'tool_choice_audit');
  const followedToolChoiceCount = toolChoiceAudits.filter(
    (record) => record.type === 'tool_choice_audit' && record.status === 'followed_priority',
  ).length;
  const missedToolChoiceCount = toolChoiceAudits.filter(
    (record) => record.type === 'tool_choice_audit' && record.status === 'missed_priority',
  ).length;
  const state = latestRunState(records);
  const artifact = records
    .filter(
      (
        record,
      ): record is SessionLogRecord & {
        type: 'artifact';
        artifactId: string;
        title: string;
      } => record.type === 'artifact',
    )
    .at(-1);
  const done = records.find(
    (record): record is SessionLogRecord & { type: 'done'; content: string } => record.type === 'done',
  );
  const selfReview = records.find(
    (
      record,
    ): record is SessionLogRecord & {
      type: 'run_self_review';
      status: string;
      score: number;
      findings: unknown[];
    } => record.type === 'run_self_review',
  );

  return [
    `session: ${sessionId}`,
    traceId ? `trace: ${traceId}` : undefined,
    `events: ${records.length}`,
    state ? `state: ${state.status} (${state.phase})` : undefined,
    state ? `state summary: ${state.summary}` : undefined,
    artifact ? `artifact: ${artifact.artifactId} - ${artifact.title}` : undefined,
    `messages: ${messageCount}`,
    `tools: ${toolCount}`,
    toolChoiceAudits.length > 0
      ? `tool choice: followed ${followedToolChoiceCount}/${toolChoiceAudits.length}, missed ${missedToolChoiceCount}`
      : undefined,
    selfReview
      ? `self review: ${selfReview.status} score=${selfReview.score} findings=${selfReview.findings.length}`
      : undefined,
    `last user: ${lastContent(records, 'user_message') ?? ''}`,
    `last assistant: ${lastContent(records, 'assistant_message') ?? ''}`,
    done ? `done: ${done.content}` : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}
