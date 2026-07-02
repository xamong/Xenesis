import type { XenesisRunEvent, XenesisRunResult } from '../../../../shared/types';
import { shouldConsumeXenesisRunEvent, XENESIS_AGENT_RUN_SOURCE } from '../../../../shared/xenesisRunEventScope';
import {
  isRecord,
  isXenesisCliTransportNoise,
  nestedRecord,
  resolveXenesisAssistantText,
  sanitizeXenesisAssistantTextCandidate,
  stringField,
  stringifyDetail,
  textFromContent,
  type XenesisChatMessage,
  type XenesisRawStreamEntry,
} from './xenesisAgentTypes';

function eventDataRecord(event: XenesisRunEvent): Record<string, unknown> | undefined {
  return isRecord(event.data) ? event.data : undefined;
}

function eventPayloadRecord(event: XenesisRunEvent): Record<string, unknown> | undefined {
  const data = eventDataRecord(event);
  const nestedData = nestedRecord(data, 'data');
  if (nestedData && (stringField(data, 'event') || stringField(nestedData, 'type'))) return nestedData;
  return data;
}

function eventTypeFromPayload(event: XenesisRunEvent, payload = eventPayloadRecord(event)): string {
  const rawData = eventDataRecord(event);
  return stringField(payload, 'type') || stringField(rawData, 'event') || event.event;
}

function isAssistantDeltaEventType(eventType: string): boolean {
  return /(?:^|[._-])assistant[_-]?delta$|output_text[._-]delta|response\.output_text\.delta|content_block_delta|message_delta|text_delta/i.test(
    eventType,
  );
}

function textDeltaFromPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) return '';
  const direct = textFromContent(payload.delta ?? payload.text ?? payload.output_text ?? payload.content);
  if (direct) return direct;
  const delta = nestedRecord(payload, 'delta');
  const nestedDelta = textFromContent(delta?.text ?? delta?.delta ?? delta?.content ?? delta?.output_text);
  if (nestedDelta) return nestedDelta;
  const nestedData = nestedRecord(payload, 'data');
  const dataDelta = textDeltaFromPayload(nestedData);
  if (dataDelta) return dataDelta;
  return '';
}

function extractXenesisToolName(event: XenesisRunEvent): string {
  const data = isRecord(event.data) ? event.data : undefined;
  const toolCall = nestedRecord(data, 'toolCall');
  const message = nestedRecord(data, 'message');
  const runtimeEvent = nestedRecord(data, 'event');

  return (
    stringField(data, 'toolName') ||
    stringField(data, 'name') ||
    stringField(toolCall, 'name') ||
    stringField(message, 'name') ||
    stringField(runtimeEvent, 'toolName') ||
    stringField(runtimeEvent, 'name')
  );
}

export function extractAssistantDeltaFromRunEvent(event: XenesisRunEvent): string {
  const data = eventPayloadRecord(event);
  if (!isAssistantDeltaEventType(eventTypeFromPayload(event, data))) return '';
  const delta = textDeltaFromPayload(data);
  if (!delta || isXenesisCliTransportNoise(delta)) return '';
  return sanitizeXenesisAssistantTextCandidate(delta);
}

export function shouldXenesisAgentPaneConsumeRunEvent(event: XenesisRunEvent): boolean {
  return shouldConsumeXenesisRunEvent(event, XENESIS_AGENT_RUN_SOURCE, { allowUnscoped: true });
}

export function extractAssistantTextFromRunEvent(event: XenesisRunEvent): string {
  const data = eventPayloadRecord(event);
  const eventType = eventTypeFromPayload(event, data);
  if (isAssistantDeltaEventType(eventType)) return extractAssistantDeltaFromRunEvent(event);

  const message = nestedRecord(data, 'message');
  if (eventType === 'assistant_message') {
    return sanitizeXenesisAssistantTextCandidate(textFromContent(message?.content ?? data?.content ?? data?.text));
  }
  if (eventType === 'done') {
    return sanitizeXenesisAssistantTextCandidate(textFromContent(data?.content ?? data?.doneContent ?? data?.output));
  }
  if (eventType === 'output_text') {
    return sanitizeXenesisAssistantTextCandidate(textFromContent(data?.text ?? data?.content));
  }
  if (eventType === 'gateway_done') {
    return data
      ? sanitizeXenesisAssistantTextCandidate(resolveXenesisAssistantText(data as unknown as XenesisRunResult))
      : '';
  }

  return '';
}

function extractXenesisToolInput(event: XenesisRunEvent): Record<string, unknown> | undefined {
  const data = isRecord(event.data) ? event.data : undefined;
  const toolCall = nestedRecord(data, 'toolCall');
  const runtimeEvent = nestedRecord(data, 'event');
  return nestedRecord(toolCall, 'input') || nestedRecord(data, 'input') || nestedRecord(runtimeEvent, 'input');
}

function isDeskToolName(name: string, input?: Record<string, unknown>): boolean {
  const normalized = name.toLowerCase();
  const path = stringField(input, 'path');
  return (
    normalized.startsWith('desk_') ||
    normalized.startsWith('xenesis_desk') ||
    normalized.includes('xenesis_desk') ||
    path.startsWith('xd.')
  );
}

function summarizeToolTarget(name: string, input?: Record<string, unknown>): string {
  const path = stringField(input, 'path');
  if (!path) return name;
  if (name === 'desk_call_capability') return path;
  return `${name} -> ${path}`;
}

function eventTypeFromData(event: XenesisRunEvent): string {
  return eventTypeFromPayload(event);
}

function toolResultOk(event: XenesisRunEvent): boolean | undefined {
  const data = isRecord(event.data) ? event.data : undefined;
  return typeof data?.ok === 'boolean' ? data.ok : undefined;
}

function valueText(record: Record<string, unknown> | undefined, key: string): string {
  if (!record) return '';
  const value = record[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function turnLedgerStatusLabel(status: string): string {
  if (status === 'waiting_for_approval') return 'Desk approval needed';
  if (status === 'failed') return 'Run failed';
  if (status === 'completed') return 'Run completed';
  return 'Run in progress';
}

function taskLifecycleRecordFromRunEvent(event: XenesisRunEvent): Record<string, unknown> | undefined {
  const data = isRecord(event.data) ? event.data : undefined;
  const runtimeEvent = nestedRecord(data, 'event');
  if (stringField(data, 'kind') === 'task') return data;
  if (stringField(runtimeEvent, 'kind') === 'task') return runtimeEvent;
  if ((event.event === 'task' || event.event === 'task_lifecycle') && data) return data;
  return undefined;
}

function summarizeTaskLifecycleEvent(record: Record<string, unknown>): string {
  const phase = valueText(record, 'phase') || 'task';
  const status = valueText(record, 'taskStatus') || valueText(record, 'status');
  const label = valueText(record, 'label') || valueText(record, 'handoffTitle') || valueText(record, 'taskId');
  const attempt = valueText(record, 'attempt');
  const maxAttempts = valueText(record, 'maxAttempts');
  const attemptLabel = attempt ? `attempt ${attempt}${maxAttempts ? `/${maxAttempts}` : ''}` : '';
  const detail = [label, status, attemptLabel].filter(Boolean).join(' - ');
  return `Task lifecycle: ${phase}${detail ? ` (${detail})` : ''}`;
}

function isTaskLifecycleError(record: Record<string, unknown>): boolean {
  const status = `${valueText(record, 'phase')} ${valueText(record, 'taskStatus')} ${valueText(record, 'status')}`;
  return /failed|blocked|cancelled|canceled|error/i.test(status);
}

export function summarizeXenesisRunEvent(event: XenesisRunEvent): Omit<XenesisRawStreamEntry, 'id' | 'at'> {
  const eventType = eventTypeFromData(event);
  const toolName = extractXenesisToolName(event);
  const toolInput = extractXenesisToolInput(event);
  const isDeskTool = toolName ? isDeskToolName(toolName, toolInput) : false;
  const detail = stringifyDetail(event.data);
  const taskLifecycleRecord = taskLifecycleRecordFromRunEvent(event);

  if (eventType === 'turn_ledger') {
    const data = isRecord(event.data) ? event.data : undefined;
    const status = valueText(data, 'status');
    return {
      kind: 'turn_ledger',
      summary: valueText(data, 'summary') || turnLedgerStatusLabel(status),
      detail,
      error: status === 'failed',
    };
  }

  if (taskLifecycleRecord) {
    return {
      kind: 'task_lifecycle',
      summary: summarizeTaskLifecycleEvent(taskLifecycleRecord),
      detail,
      error: isTaskLifecycleError(taskLifecycleRecord),
    };
  }

  if (eventType === 'run_state') {
    const data = isRecord(event.data) ? event.data : undefined;
    const status = valueText(data, 'status');
    const summary = valueText(data, 'summary') || event.event;
    const reason = valueText(data, 'reason');
    const errorText = valueText(data, 'error');
    const isProviderProgress = status === 'provider_request';
    return {
      kind: isProviderProgress ? 'provider_progress' : 'run_state',
      summary: isProviderProgress ? `Provider progress: ${summary}` : `${status || 'run_state'}: ${summary}`,
      detail,
      error:
        Boolean(errorText) ||
        (!isProviderProgress && /failed|failure|cancelled|canceled|error/i.test(`${status} ${summary} ${reason}`)),
    };
  }

  if (eventType === 'tool_call' && toolName) {
    const label = isDeskTool ? 'Desk tool call:' : 'Tool call:';
    return {
      kind: isDeskTool ? 'desk_tool_call' : 'tool_call',
      summary: `${label} ${summarizeToolTarget(toolName, toolInput)}`,
      detail,
    };
  }

  if (eventType === 'tool_result' && toolName) {
    const ok = toolResultOk(event);
    const label = isDeskTool ? 'Desk tool result:' : 'Tool result:';
    return {
      kind: isDeskTool ? 'desk_tool_result' : 'tool_result',
      summary: `${label} ${toolName}${ok === undefined ? '' : ` ${ok ? 'ok' : 'failed'}`}`,
      detail,
      error: ok === false,
    };
  }

  if (isAssistantDeltaEventType(eventType)) {
    const delta = extractAssistantDeltaFromRunEvent(event);
    return {
      kind: 'assistant_delta',
      summary: delta ? `Assistant delta (${delta.length} chars)` : 'Assistant delta',
      detail,
    };
  }

  if (/approval|ask/i.test(eventType)) {
    return {
      kind: 'approval',
      summary: eventType,
      detail,
      error: /denied|rejected|failed/i.test(detail),
    };
  }

  return {
    kind: event.event,
    summary: event.event,
    detail,
    error: /error|failed|failure/i.test(event.event),
  };
}

export function terminalMessageFromRunEventSummary(
  entry: Omit<XenesisRawStreamEntry, 'id' | 'at'>,
): Pick<XenesisChatMessage, 'role' | 'content' | 'kind' | 'error'> | null {
  if (entry.kind === 'tool_call' || entry.kind === 'desk_tool_call') {
    return {
      role: 'system',
      kind: 'tool',
      content: entry.summary.replace(/^Desk tool call:\s*/i, 'tool: ').replace(/^Tool call:\s*/i, 'tool: '),
    };
  }
  if (entry.kind === 'tool_result' || entry.kind === 'desk_tool_result') {
    return {
      role: 'system',
      kind: entry.error ? 'error' : 'tool',
      content: entry.summary.replace(/^Desk tool result:\s*/i, 'tool: ').replace(/^Tool result:\s*/i, 'tool: '),
      error: entry.error,
    };
  }
  if (/approval|ask/i.test(`${entry.kind} ${entry.summary}`)) {
    return {
      role: 'system',
      kind: 'approval',
      content: `approval: ${entry.summary}`,
      error: entry.error,
    };
  }
  if (entry.kind === 'provider_progress') {
    return null;
  }
  if (entry.error) {
    return {
      role: 'system',
      kind: 'error',
      content: `error: ${entry.summary}`,
      error: true,
    };
  }
  return null;
}

function isDeskActionAuditEntry(entry: XenesisRawStreamEntry): boolean {
  return entry.kind === 'desk_tool_call' || entry.kind === 'desk_tool_result';
}

export function deskActionAuditEntries(rawStream: XenesisRawStreamEntry[]): XenesisRawStreamEntry[] {
  return rawStream.filter(isDeskActionAuditEntry).slice(0, 6);
}

function isTaskLifecycleAuditEntry(entry: XenesisRawStreamEntry): boolean {
  return entry.kind === 'task_lifecycle';
}

export function taskLifecycleAuditEntries(rawStream: XenesisRawStreamEntry[]): XenesisRawStreamEntry[] {
  return rawStream.filter(isTaskLifecycleAuditEntry).slice(0, 6);
}
