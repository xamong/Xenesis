/**
 * Network monitor event collector.
 *
 * Captures HTTP/WebSocket requests from MCP bridge, Gateway,
 * Playwright, and external API calls for debugging and monitoring.
 */

export type NetworkRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
export type NetworkRequestSource =
  | 'mcp'
  | 'gateway'
  | 'playwright'
  | 'api'
  | 'gowoori'
  | 'meta'
  | 'connector'
  | 'xenesis'
  | 'terminal';

export interface NetworkRequestEntry {
  id: string;
  source: NetworkRequestSource;
  method: NetworkRequestMethod;
  url: string;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  error?: string;
  size?: number;
}

export interface NetworkMonitorCollector {
  record(entry: Omit<NetworkRequestEntry, 'id'>): string;
  complete(id: string, update: Partial<NetworkRequestEntry>): void;
  getEntries(options?: {
    source?: NetworkRequestSource;
    status?: number;
    since?: number;
    limit?: number;
  }): NetworkRequestEntry[];
  clear(): void;
  size(): number;
}

let entrySeq = 0;

export function createNetworkMonitorCollector(maxEntries = 500): NetworkMonitorCollector {
  const entries: NetworkRequestEntry[] = [];

  return {
    record(input): string {
      const id = `net-${Date.now()}-${++entrySeq}`;
      entries.push({ id, ...input });
      if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
      return id;
    },

    complete(id, update): void {
      const entry = entries.find((e) => e.id === id);
      if (entry) {
        Object.assign(entry, update);
        if (entry.startedAt && entry.completedAt) {
          entry.durationMs = entry.completedAt - entry.startedAt;
        }
      }
    },

    getEntries(options = {}): NetworkRequestEntry[] {
      let result = [...entries];
      if (options.source) result = result.filter((e) => e.source === options.source);
      if (options.status) result = result.filter((e) => e.status === options.status);
      if (options.since) result = result.filter((e) => e.startedAt >= options.since!);
      if (options.limit) result = result.slice(-options.limit);
      return result;
    },

    clear(): void {
      entries.length = 0;
    },

    size(): number {
      return entries.length;
    },
  };
}
