import {
  isRendererObservabilityOperationEvent,
  MAIN_OBSERVABILITY_IPC_CHANNEL,
  type RendererObservabilityActivityPayload,
  type RendererObservabilityNetworkPayload,
  type RendererObservabilityOperationEvent,
} from '../shared/observabilityEvents';

export interface MainObservabilityWindow {
  isDestroyed(): boolean;
  webContents: {
    send(channel: string, payload: unknown): void;
  };
}

export interface MainObservationDescriptor {
  activity?: RendererObservabilityActivityPayload;
  network?: RendererObservabilityNetworkPayload;
}

export interface MainInstantObservationResult {
  ok?: boolean;
  status?: number;
  statusText?: string;
  responseBody?: unknown;
  error?: unknown;
}

let mainOperationSeq = 0;

function nextMainOperationId(): string {
  mainOperationSeq += 1;
  return `main-operation-${Date.now()}-${mainOperationSeq}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSensitiveKey(key: string): boolean {
  return /authorization|token|secret|password|api[-_ ]?key|apikey/i.test(key);
}

function redactForSummary(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth-limit]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactForSummary(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
    output[key] = isSensitiveKey(key) ? '[redacted]' : redactForSummary(item, depth + 1);
  }
  return output;
}

export function summarizeMainObservabilityPayload(value: unknown, maxLength = 600): string {
  try {
    const serialized = JSON.stringify(redactForSummary(value));
    if (!serialized) return '';
    return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}...` : serialized;
  } catch {
    const fallback = String(value);
    return fallback.length > maxLength ? `${fallback.slice(0, maxLength)}...` : fallback;
  }
}

export function emitMainObservabilityOperation(
  targetWindow: MainObservabilityWindow | null | undefined,
  payload: RendererObservabilityOperationEvent,
): void {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  if (!isRendererObservabilityOperationEvent(payload)) return;
  try {
    targetWindow.webContents.send(MAIN_OBSERVABILITY_IPC_CHANNEL, payload);
  } catch {
    // Observability must not affect the producer path.
  }
}

export async function observeMainAsyncOperation<T>(
  targetWindow: MainObservabilityWindow | null | undefined,
  descriptor: MainObservationDescriptor,
  operation: () => Promise<T>,
): Promise<T> {
  const id = nextMainOperationId();
  emitMainObservabilityOperation(targetWindow, {
    id,
    phase: 'start',
    activity: descriptor.activity,
    network: descriptor.network,
  });

  try {
    const result = await operation();
    emitMainObservabilityOperation(targetWindow, {
      id,
      phase: 'complete',
      ok: true,
      status: 200,
      statusText: 'OK',
      responseBody: summarizeMainObservabilityPayload(result, 1200),
    });
    return result;
  } catch (error) {
    emitMainObservabilityOperation(targetWindow, {
      id,
      phase: 'complete',
      ok: false,
      status: 500,
      statusText: errorMessage(error),
      error: errorMessage(error),
    });
    throw error;
  }
}

export function emitMainInstantOperation(
  targetWindow: MainObservabilityWindow | null | undefined,
  descriptor: MainObservationDescriptor,
  result: MainInstantObservationResult = {},
): void {
  const id = nextMainOperationId();
  emitMainObservabilityOperation(targetWindow, {
    id,
    phase: 'start',
    activity: descriptor.activity,
    network: descriptor.network,
  });
  const ok = result.ok !== false;
  const error = result.error;
  emitMainObservabilityOperation(targetWindow, {
    id,
    phase: 'complete',
    ok,
    status: result.status ?? (ok ? 200 : 500),
    statusText: result.statusText ?? (ok ? 'OK' : errorMessage(error)),
    responseBody: ok ? summarizeMainObservabilityPayload(result.responseBody, 1200) : undefined,
    error: ok ? undefined : errorMessage(error),
  });
}
