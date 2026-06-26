import type {
  DeskBridgeCapabilityCallRequest,
  DeskBridgeCapabilityCallResult,
  DeskBridgeCapabilitySource,
} from '../deskBridgeCapabilities';
import { type ActivitySource, completeActivityEvent, recordActivityEvent } from './activityTimelineStore';
import { completeNetworkEntry, type NetworkRequestSource, recordNetworkEntry } from './networkMonitorStore';

interface DeskBridgeCapabilityObservation {
  complete(result?: DeskBridgeCapabilityCallResult, error?: unknown): void;
}

const SECRET_KEY_PATTERN = /token|secret|password|passphrase|apikey|apiKey|authorization/i;

function mapActivitySource(path: string, source?: DeskBridgeCapabilitySource): ActivitySource {
  if (path.startsWith('xd.terminals.')) return 'terminal';
  if (path.startsWith('xd.meta.')) return 'meta';
  if (path.startsWith('xd.gateway.')) return 'gateway';
  if (source === 'gowoori') return 'gowoori';
  if (source === 'workflow') return 'workflow';
  if (source === 'xenesis') return 'agent';
  return 'mcp';
}

function mapNetworkSource(path: string, source?: DeskBridgeCapabilitySource): NetworkRequestSource {
  if (path.startsWith('xd.meta.')) return 'meta';
  if (path.startsWith('xd.gateway.')) return 'gateway';
  if (source === 'gowoori') return 'gowoori';
  if (source === 'workflow' || source === 'xenesis') return 'gateway';
  return 'mcp';
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[MaxDepth]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactValue(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : redactValue(item, depth + 1);
  }
  return result;
}

function summarizeJson(value: unknown, maxLength = 1200): string | undefined {
  if (value === undefined) return undefined;
  try {
    const serialized = JSON.stringify(redactValue(value));
    if (!serialized) return undefined;
    return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}...` : serialized;
  } catch {
    const fallback = String(value);
    return fallback.length > maxLength ? `${fallback.slice(0, maxLength)}...` : fallback;
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? 'Unknown error');
}

export function startDeskBridgeCapabilityObservation(
  request: DeskBridgeCapabilityCallRequest,
): DeskBridgeCapabilityObservation {
  const startedAt = Date.now();
  let activityId: string | null = null;
  let networkId: string | null = null;

  try {
    const activitySource = mapActivitySource(request.path, request.source);
    activityId = recordActivityEvent({
      source: activitySource,
      label: request.path,
      detail: summarizeJson(
        {
          source: request.source ?? 'internal',
          approved: request.approved,
          args: request.args,
        },
        600,
      ),
      startedAt,
      status: 'running',
    });
  } catch {
    activityId = null;
  }

  try {
    networkId = recordNetworkEntry({
      source: mapNetworkSource(request.path, request.source),
      method: 'POST',
      url: `cr://${request.path}`,
      requestBody: summarizeJson(request.args),
      startedAt,
    });
  } catch {
    networkId = null;
  }

  return {
    complete(result?: DeskBridgeCapabilityCallResult, error?: unknown): void {
      const completedAt = Date.now();
      const failed = Boolean(error) || result?.ok === false;
      if (activityId) {
        try {
          completeActivityEvent(activityId, failed ? 'failed' : 'completed');
        } catch {
          // Observability must not affect capability calls.
        }
      }
      if (networkId) {
        try {
          completeNetworkEntry(networkId, {
            completedAt,
            status: failed ? 500 : 200,
            statusText: failed ? (result?.error ?? describeError(error)) : 'OK',
            responseBody: error ? describeError(error) : summarizeJson(result),
            error: failed ? (result?.error ?? describeError(error)) : undefined,
          });
        } catch {
          // Observability must not affect capability calls.
        }
      }
    },
  };
}
