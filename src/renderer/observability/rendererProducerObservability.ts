import {
  isRendererObservabilityOperationEvent,
  RENDERER_OBSERVABILITY_EVENT,
  type RendererObservabilityOperationEvent,
} from '../../shared/observabilityEvents';
import { type ActivitySource, completeActivityEvent, recordActivityEvent } from './activityTimelineStore';
import {
  completeNetworkEntry,
  type NetworkRequestMethod,
  type NetworkRequestSource,
  recordNetworkEntry,
} from './networkMonitorStore';

interface ProducerInstallState {
  listener: EventListener;
  originalFetch?: typeof fetch;
  operations: Map<string, { activityId?: string; networkId?: string }>;
}

const installStates = new WeakMap<EventTarget, ProducerInstallState>();

const ACTIVITY_SOURCES = new Set<ActivitySource>([
  'agent',
  'terminal',
  'workflow',
  'gateway',
  'mcp',
  'gowoori',
  'meta',
  'connector',
  'xenesis',
]);
const NETWORK_SOURCES = new Set<NetworkRequestSource>([
  'mcp',
  'gateway',
  'playwright',
  'api',
  'gowoori',
  'meta',
  'connector',
  'xenesis',
  'terminal',
]);
const NETWORK_METHODS = new Set<NetworkRequestMethod>(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']);

function normalizeActivitySource(value: unknown): ActivitySource {
  return ACTIVITY_SOURCES.has(value as ActivitySource) ? (value as ActivitySource) : 'mcp';
}

function normalizeNetworkSource(value: unknown): NetworkRequestSource {
  return NETWORK_SOURCES.has(value as NetworkRequestSource) ? (value as NetworkRequestSource) : 'api';
}

function normalizeNetworkMethod(value: unknown): NetworkRequestMethod {
  const method = String(value || 'GET').toUpperCase();
  return NETWORK_METHODS.has(method as NetworkRequestMethod) ? (method as NetworkRequestMethod) : 'GET';
}

function now(): number {
  return Date.now();
}

function eventDetail(event: Event): unknown {
  return event instanceof CustomEvent ? event.detail : undefined;
}

function handleProducerEvent(
  operations: Map<string, { activityId?: string; networkId?: string }>,
  payload: RendererObservabilityOperationEvent,
): void {
  if (payload.phase === 'start') {
    const startedAt = now();
    const state: { activityId?: string; networkId?: string } = {};
    if (payload.activity) {
      state.activityId = recordActivityEvent({
        source: normalizeActivitySource(payload.activity.source),
        label: payload.activity.label || payload.id,
        detail: payload.activity.detail,
        startedAt,
        status: 'running',
      });
    }
    if (payload.network) {
      state.networkId = recordNetworkEntry({
        source: normalizeNetworkSource(payload.network.source),
        method: normalizeNetworkMethod(payload.network.method),
        url: payload.network.url,
        requestBody: payload.network.requestBody,
        startedAt,
      });
    }
    operations.set(payload.id, state);
    return;
  }

  const state = operations.get(payload.id);
  if (!state) return;
  operations.delete(payload.id);
  const failed = payload.ok === false || Boolean(payload.error);
  if (state.activityId) {
    completeActivityEvent(state.activityId, failed ? 'failed' : 'completed');
  }
  if (state.networkId) {
    completeNetworkEntry(state.networkId, {
      completedAt: now(),
      status: payload.status ?? (failed ? 500 : 200),
      statusText: payload.statusText ?? (failed ? (payload.error ?? 'Error') : 'OK'),
      responseBody: payload.responseBody,
      error: failed ? (payload.error ?? payload.statusText ?? 'Operation failed') : undefined,
    });
  }
}

function fetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function fetchMethod(input: RequestInfo | URL, init?: RequestInit): NetworkRequestMethod {
  if (init?.method) return normalizeNetworkMethod(init.method);
  if (typeof Request !== 'undefined' && input instanceof Request) return normalizeNetworkMethod(input.method);
  return 'GET';
}

function fetchSource(url: string): NetworkRequestSource {
  try {
    const parsed = new URL(url);
    if (parsed.port === '3338' || parsed.pathname.startsWith('/run') || parsed.pathname.startsWith('/runs')) {
      return 'gateway';
    }
  } catch {
    // Fall through to generic API.
  }
  return 'api';
}

function summarizeFetchBody(init?: RequestInit): string | undefined {
  if (!init?.body) return undefined;
  if (typeof init.body === 'string') return init.body.length > 1200 ? `${init.body.slice(0, 1200)}...` : init.body;
  return `[${Object.prototype.toString.call(init.body).slice(8, -1)}]`;
}

function installFetchObservation(target: EventTarget & typeof globalThis): typeof fetch | undefined {
  if (typeof target.fetch !== 'function') return undefined;
  const originalFetch = target.fetch.bind(target);
  target.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const startedAt = now();
    const url = fetchUrl(input);
    const networkId = recordNetworkEntry({
      source: fetchSource(url),
      method: fetchMethod(input, init),
      url,
      requestBody: summarizeFetchBody(init),
      startedAt,
    });
    try {
      const response = await originalFetch(input, init);
      completeNetworkEntry(networkId, {
        completedAt: now(),
        status: response.status,
        statusText: response.statusText,
      });
      return response;
    } catch (error) {
      completeNetworkEntry(networkId, {
        completedAt: now(),
        status: 500,
        statusText: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
  return originalFetch;
}

export function installRendererProducerObservability(target: EventTarget & typeof globalThis = window): void {
  if (installStates.has(target)) return;
  const operations = new Map<string, { activityId?: string; networkId?: string }>();
  const listener = (event: Event) => {
    const detail = eventDetail(event);
    if (!isRendererObservabilityOperationEvent(detail)) return;
    handleProducerEvent(operations, detail);
  };
  target.addEventListener(RENDERER_OBSERVABILITY_EVENT, listener);
  const originalFetch = installFetchObservation(target);
  installStates.set(target, { listener, originalFetch, operations });
}

export function uninstallRendererProducerObservability(target: EventTarget & typeof globalThis = window): void {
  const state = installStates.get(target);
  if (!state) return;
  target.removeEventListener(RENDERER_OBSERVABILITY_EVENT, state.listener);
  if (state.originalFetch) target.fetch = state.originalFetch;
  installStates.delete(target);
}
