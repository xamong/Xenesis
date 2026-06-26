import type { ActivityEvent, ActivitySource } from '../../../observability/activityTimelineStore';

export const ACTIVITY_TIMELINE_FRAME_MS = 500;

export interface ActivityTimelineClipTag {
  eventId: string;
  source: ActivitySource;
  status: ActivityEvent['status'];
  startedAt: number;
  endedAt?: number;
}

export interface ActivityTimelineClip {
  name: string;
  start: number;
  length: number;
  color: string;
  textColor: string;
  selected: boolean;
  tag: ActivityTimelineClipTag;
}

export interface ActivityTimelineTrack {
  name: string;
  clips: ActivityTimelineClip[];
  height: number;
  trackColor: string;
  tag: {
    source: ActivitySource;
  };
}

export interface ActivityPomeloTimelineModel {
  tracks: ActivityTimelineTrack[];
  frameCount: number;
  frameMs: number;
  startedAt: number;
  endedAt: number;
  summary: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
}

export interface ActivityPomeloTimelineModelOptions {
  now?: number;
  frameMs?: number;
}

export const ACTIVITY_SOURCE_LABELS: Record<ActivitySource, string> = {
  agent: 'Agent',
  terminal: 'Terminal',
  workflow: 'Workflow',
  gateway: 'Gateway',
  mcp: 'MCP',
  gowoori: 'Gowoori',
  meta: 'Meta',
  connector: 'Connector',
  xenesis: 'Xenesis',
};

const ACTIVITY_SOURCE_ORDER: ActivitySource[] = [
  'agent',
  'terminal',
  'workflow',
  'gateway',
  'mcp',
  'gowoori',
  'meta',
  'connector',
  'xenesis',
];

const TRACK_COLORS = ['#0b1220', '#101827'];

function eventEnd(event: ActivityEvent, now: number): number {
  if (event.endedAt !== undefined) return Math.max(event.startedAt, event.endedAt);
  return Math.max(event.startedAt, now);
}

function eventClipColor(event: ActivityEvent): string {
  if (event.status === 'failed') return '#ef4444';
  if (event.status === 'running') return event.color || '#60a5fa';
  return event.color || '#38bdf8';
}

function eventTextColor(event: ActivityEvent): string {
  return event.status === 'failed' ? '#fff1f2' : '#f8fafc';
}

function sourceSortIndex(source: ActivitySource): number {
  const index = ACTIVITY_SOURCE_ORDER.indexOf(source);
  return index >= 0 ? index : ACTIVITY_SOURCE_ORDER.length;
}

function createSummary(events: ActivityEvent[]): ActivityPomeloTimelineModel['summary'] {
  return {
    total: events.length,
    running: events.filter((event) => event.status === 'running').length,
    completed: events.filter((event) => event.status === 'completed').length,
    failed: events.filter((event) => event.status === 'failed').length,
  };
}

export function createActivityPomeloTimelineModel(
  events: ActivityEvent[],
  options: ActivityPomeloTimelineModelOptions = {},
): ActivityPomeloTimelineModel {
  const now = options.now ?? Date.now();
  const frameMs = Math.max(50, options.frameMs ?? ACTIVITY_TIMELINE_FRAME_MS);
  const sortedEvents = [...events].sort((a, b) => a.startedAt - b.startedAt || a.label.localeCompare(b.label));

  if (sortedEvents.length === 0) {
    return {
      tracks: [],
      frameCount: 12,
      frameMs,
      startedAt: now,
      endedAt: now,
      summary: createSummary([]),
    };
  }

  const startedAt = Math.min(...sortedEvents.map((event) => event.startedAt));
  const endedAt = Math.max(...sortedEvents.map((event) => eventEnd(event, now)));
  const sources = [...new Set(sortedEvents.map((event) => event.source))].sort(
    (a, b) => sourceSortIndex(a) - sourceSortIndex(b) || a.localeCompare(b),
  );

  const tracks: ActivityTimelineTrack[] = sources.map((source, index) => ({
    name: ACTIVITY_SOURCE_LABELS[source] ?? source,
    clips: [],
    height: 38,
    trackColor: TRACK_COLORS[index % TRACK_COLORS.length],
    tag: { source },
  }));

  const trackBySource = new Map<ActivitySource, ActivityTimelineTrack>();
  for (const track of tracks) trackBySource.set(track.tag.source, track);

  let maxFrame = 0;
  for (const event of sortedEvents) {
    const start = Math.max(0, Math.floor((event.startedAt - startedAt) / frameMs));
    const length = Math.max(1, Math.ceil((eventEnd(event, now) - event.startedAt) / frameMs));
    maxFrame = Math.max(maxFrame, start + length);
    trackBySource.get(event.source)?.clips.push({
      name: event.label,
      start,
      length,
      color: eventClipColor(event),
      textColor: eventTextColor(event),
      selected: false,
      tag: {
        eventId: event.id,
        source: event.source,
        status: event.status,
        startedAt: event.startedAt,
        endedAt: event.endedAt,
      },
    });
  }

  return {
    tracks,
    frameCount: Math.max(12, maxFrame + 2),
    frameMs,
    startedAt,
    endedAt,
    summary: createSummary(sortedEvents),
  };
}
