/**
 * Activity timeline event collector.
 *
 * Collects events from AgentRunner, terminals, Workflow, Gateway, MCP,
 * and Gowoori into a unified timeline that @pomelo-suite/timeline renders.
 *
 * Each event becomes a colored bar on the time axis:
 *   Agent=blue, Terminal=green, Workflow=purple, Gateway=orange, MCP=cyan, Gowoori=pink
 */

export type ActivitySource =
  | 'agent'
  | 'terminal'
  | 'workflow'
  | 'gateway'
  | 'mcp'
  | 'gowoori'
  | 'meta'
  | 'connector'
  | 'xenesis';

export interface ActivityEvent {
  id: string;
  source: ActivitySource;
  label: string;
  detail?: string;
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'completed' | 'failed';
  color: string;
}

export interface ActivityTimelineCollector {
  record(event: Omit<ActivityEvent, 'id' | 'color'>): string;
  complete(id: string, status?: 'completed' | 'failed'): void;
  getEvents(options?: { since?: number; source?: ActivitySource; limit?: number }): ActivityEvent[];
  clear(): void;
  size(): number;
}

const SOURCE_COLORS: Record<ActivitySource, string> = {
  agent: '#3b82f6',
  terminal: '#22c55e',
  workflow: '#8b5cf6',
  gateway: '#f59e0b',
  mcp: '#06b6d4',
  gowoori: '#ec4899',
  meta: '#14b8a6',
  connector: '#10b981',
  xenesis: '#a3e635',
};

let idSeq = 0;

export function createActivityTimelineCollector(maxEvents = 1000): ActivityTimelineCollector {
  const events: ActivityEvent[] = [];

  return {
    record(input): string {
      const id = `activity-${Date.now()}-${++idSeq}`;
      const event: ActivityEvent = {
        id,
        source: input.source,
        label: input.label,
        detail: input.detail,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        status: input.status,
        color: SOURCE_COLORS[input.source] || '#94a3b8',
      };
      events.push(event);
      if (events.length > maxEvents) events.splice(0, events.length - maxEvents);
      return id;
    },

    complete(id, status = 'completed'): void {
      const event = events.find((e) => e.id === id);
      if (event) {
        event.endedAt = Date.now();
        event.status = status;
      }
    },

    getEvents(options = {}): ActivityEvent[] {
      let result = [...events];
      if (options.since) result = result.filter((e) => e.startedAt >= options.since!);
      if (options.source) result = result.filter((e) => e.source === options.source);
      if (options.limit) result = result.slice(-options.limit);
      return result;
    },

    clear(): void {
      events.length = 0;
    },

    size(): number {
      return events.length;
    },
  };
}
