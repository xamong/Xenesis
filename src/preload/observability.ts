import {
  isRendererObservabilityOperationEvent,
  MAIN_OBSERVABILITY_IPC_CHANNEL,
  RENDERER_OBSERVABILITY_EVENT,
  type RendererObservabilityActivityPayload,
  type RendererObservabilityNetworkPayload,
  type RendererObservabilityOperationEvent,
} from '../shared/observabilityEvents';

export interface PreloadObservationDescriptor {
  activity?: RendererObservabilityActivityPayload;
  network?: RendererObservabilityNetworkPayload;
}

export interface PreloadIpcEventSource {
  on(channel: string, listener: (event: unknown, payload: unknown) => void): void;
  removeListener(channel: string, listener: (event: unknown, payload: unknown) => void): void;
}

let operationSeq = 0;

function nextOperationId(): string {
  operationSeq += 1;
  return `preload-operation-${Date.now()}-${operationSeq}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function summarizeResult(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) return undefined;
    return serialized.length > 1200 ? `${serialized.slice(0, 1200)}...` : serialized;
  } catch {
    const fallback = String(value);
    return fallback.length > 1200 ? `${fallback.slice(0, 1200)}...` : fallback;
  }
}

function dispatchOperationEvent(target: EventTarget, payload: RendererObservabilityOperationEvent): void {
  try {
    target.dispatchEvent(new CustomEvent(RENDERER_OBSERVABILITY_EVENT, { detail: payload }));
  } catch {
    // Observability must not affect preload API calls.
  }
}

export function installMainObservabilityForwarder(target: EventTarget, ipc: PreloadIpcEventSource): () => void {
  const listener = (_event: unknown, payload: unknown) => {
    if (!isRendererObservabilityOperationEvent(payload)) return;
    dispatchOperationEvent(target, payload);
  };
  ipc.on(MAIN_OBSERVABILITY_IPC_CHANNEL, listener);
  return () => ipc.removeListener(MAIN_OBSERVABILITY_IPC_CHANNEL, listener);
}

function startOperation(target: EventTarget, descriptor: PreloadObservationDescriptor): string {
  const id = nextOperationId();
  dispatchOperationEvent(target, {
    id,
    phase: 'start',
    activity: descriptor.activity,
    network: descriptor.network,
  });
  return id;
}

function completeOperation(target: EventTarget, id: string, ok: boolean, result?: unknown, error?: unknown): void {
  dispatchOperationEvent(target, {
    id,
    phase: 'complete',
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : errorMessage(error),
    responseBody: ok ? summarizeResult(result) : undefined,
    error: ok ? undefined : errorMessage(error),
  });
}

export function observeAsyncMethod<T extends Record<string, unknown>, K extends keyof T>(
  target: EventTarget,
  api: T,
  key: K,
  describe: (...args: unknown[]) => PreloadObservationDescriptor,
): void {
  const original = api[key];
  if (typeof original !== 'function') return;
  api[key] = (async (...args: unknown[]) => {
    const id = startOperation(target, describe(...args));
    try {
      const result = await Reflect.apply(original, api, args);
      completeOperation(target, id, true, result);
      return result;
    } catch (error) {
      completeOperation(target, id, false, undefined, error);
      throw error;
    }
  }) as T[K];
}

export function observeSyncMethod<T extends Record<string, unknown>, K extends keyof T>(
  target: EventTarget,
  api: T,
  key: K,
  describe: (...args: unknown[]) => PreloadObservationDescriptor,
): void {
  const original = api[key];
  if (typeof original !== 'function') return;
  api[key] = ((...args: unknown[]) => {
    const id = startOperation(target, describe(...args));
    try {
      const result = Reflect.apply(original, api, args);
      completeOperation(target, id, true, result);
      return result;
    } catch (error) {
      completeOperation(target, id, false, undefined, error);
      throw error;
    }
  }) as T[K];
}
