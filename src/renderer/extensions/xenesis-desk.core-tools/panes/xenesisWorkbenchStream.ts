import type { XenesisRunEvent, XenesisRunResult } from '../../../../shared/types';

export interface XenesisWorkbenchRawEntry {
  id: string;
  at: string;
  kind: string;
  summary: string;
  detail?: string;
  error?: boolean;
}

const GENERIC_RUN_COMPLETED_TEXT = 'Xenesis run completed.';
const GENERIC_RUN_FAILED_TEXT = 'Xenesis run failed.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nestedRecord(record: Record<string, unknown> | undefined, key: string): Record<string, unknown> | undefined {
  const value = record?.[key];
  return isRecord(value) ? value : undefined;
}

function stringField(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key];
  return typeof value === 'string' ? value : '';
}

function stripTerminalControlText(value: string): string {
  return value
    .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/←\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u009b[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '');
}

function sanitizeAssistantTextCandidate(value: string): string {
  return stripTerminalControlText(value);
}

function textFromContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textFromContent).filter(Boolean).join('');
  if (!isRecord(value)) return '';
  const text = value.text ?? value.content ?? value.output_text ?? value.value ?? value.doneContent ?? value.output;
  return textFromContent(text);
}

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

function extractToolName(event: XenesisRunEvent): string {
  const data = eventDataRecord(event);
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

function extractToolInput(event: XenesisRunEvent): Record<string, unknown> | undefined {
  const data = eventDataRecord(event);
  const toolCall = nestedRecord(data, 'toolCall');
  const runtimeEvent = nestedRecord(data, 'event');
  return nestedRecord(toolCall, 'input') || nestedRecord(data, 'input') || nestedRecord(runtimeEvent, 'input');
}

function summarizeToolTarget(name: string, input?: Record<string, unknown>): string {
  const path = stringField(input, 'path');
  if (!path) return name;
  return name === 'desk_call_capability' ? path : `${name} -> ${path}`;
}

function toolResultOk(event: XenesisRunEvent): boolean | undefined {
  const data = eventDataRecord(event);
  return typeof data?.ok === 'boolean' ? data.ok : undefined;
}

function valueText(record: Record<string, unknown> | undefined, key: string): string {
  if (!record) return '';
  const value = record[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createWorkbenchId(prefix: string): string {
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

export function extractWorkbenchAssistantDelta(event: XenesisRunEvent): string {
  const data = eventPayloadRecord(event);
  if (!isAssistantDeltaEventType(eventTypeFromPayload(event, data))) return '';
  const delta = textDeltaFromPayload(data);
  return delta ? sanitizeAssistantTextCandidate(delta) : '';
}

export function extractWorkbenchAssistantText(event: XenesisRunEvent): string {
  const data = eventPayloadRecord(event);
  const eventType = eventTypeFromPayload(event, data);
  if (isAssistantDeltaEventType(eventType)) return extractWorkbenchAssistantDelta(event);

  const message = nestedRecord(data, 'message');
  if (eventType === 'assistant_message') {
    return sanitizeAssistantTextCandidate(textFromContent(message?.content ?? data?.content ?? data?.text));
  }
  if (eventType === 'done') {
    return sanitizeAssistantTextCandidate(textFromContent(data?.content ?? data?.doneContent ?? data?.output));
  }
  if (eventType === 'output_text') {
    return sanitizeAssistantTextCandidate(textFromContent(data?.text ?? data?.content));
  }
  if (eventType === 'gateway_done') {
    return data ? resolveWorkbenchAssistantText(data as unknown as XenesisRunResult, '') : '';
  }

  return '';
}

export function resolveWorkbenchAssistantText(result: XenesisRunResult, fallback: string): string {
  const direct = sanitizeAssistantTextCandidate(textFromContent(result.doneContent ?? result.output)).trim();
  if (direct && direct !== GENERIC_RUN_COMPLETED_TEXT && direct !== GENERIC_RUN_FAILED_TEXT) return direct;

  if (Array.isArray(result.events)) {
    for (const event of [...result.events].reverse()) {
      const text = isRecord(event) ? extractWorkbenchAssistantText(event as unknown as XenesisRunEvent).trim() : '';
      if (text && text !== GENERIC_RUN_COMPLETED_TEXT && text !== GENERIC_RUN_FAILED_TEXT) return text;
    }
  }

  return fallback;
}

export function summarizeWorkbenchRunEvent(event: XenesisRunEvent): Omit<XenesisWorkbenchRawEntry, 'id' | 'at'> {
  const eventType = eventTypeFromPayload(event);
  const toolName = extractToolName(event);
  const toolInput = extractToolInput(event);
  const detail = stringifyDetail(event.data);

  if (eventType === 'run_state') {
    const data = eventDataRecord(event);
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
    return {
      kind: 'tool_call',
      summary: `Tool call: ${summarizeToolTarget(toolName, toolInput)}`,
      detail,
    };
  }

  if (eventType === 'tool_result' && toolName) {
    const ok = toolResultOk(event);
    return {
      kind: 'tool_result',
      summary: `Tool result: ${toolName}${ok === undefined ? '' : ` ${ok ? 'ok' : 'failed'}`}`,
      detail,
      error: ok === false,
    };
  }

  if (isAssistantDeltaEventType(eventType)) {
    const delta = extractWorkbenchAssistantDelta(event);
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
