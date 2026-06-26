export type XdBlasterClassName =
  | 'greencircle'
  | 'redcircle'
  | 'yellowcircle'
  | 'bluecircle'
  | 'limecircle'
  | 'orangecircle'
  | 'fuchsiacircle'
  | 'whitecircle';

export type XdBlasterEventType = 'start' | 'end' | 'init' | 'hide' | 'reset';

export interface XdBlasterEvent {
  type: XdBlasterEventType;
  name?: string;
  className?: XdBlasterClassName;
  source?: 'xenesis-json' | 'xenesis-text' | 'legacy-monitor' | 'xenesis-activity' | 'ui';
}

export interface XdBlasterStarter {
  label: string;
  event: XdBlasterEvent;
}

export interface XdBlasterStyle {
  fill: string;
  stroke: string;
  glow: string;
}

export interface XdBlasterBubble {
  id: string;
  name: string;
  className: XdBlasterClassName;
  state: 'idle' | 'active' | 'hiding';
  x: number;
  y: number;
  radius: number;
  vx: number;
  shrink: number;
  style: XdBlasterStyle;
}

export interface XdBlasterState {
  width: number;
  height: number;
  poolSize: number;
  activeCount: number;
  bubbles: XdBlasterBubble[];
  random: () => number;
}

export interface XdBlasterStateOptions {
  width: number;
  height: number;
  poolSize?: number;
  random?: () => number;
}

export const XD_BLASTER_DEFAULT_POOL_SIZE = 300;
export const XD_BLASTER_RADIUS = 20;
export const XD_BLASTER_VX = -15;
export const XD_BLASTER_SHRINK = 2;

export const XD_BLASTER_CLASS_STYLES: Record<XdBlasterClassName, XdBlasterStyle> = {
  greencircle: {
    fill: 'rgba(34, 197, 94, 0.82)',
    stroke: '#bbf7d0',
    glow: 'rgba(34, 197, 94, 0.34)',
  },
  redcircle: {
    fill: 'rgba(239, 68, 68, 0.86)',
    stroke: '#fecaca',
    glow: 'rgba(239, 68, 68, 0.36)',
  },
  yellowcircle: {
    fill: 'rgba(245, 158, 11, 0.86)',
    stroke: '#fde68a',
    glow: 'rgba(245, 158, 11, 0.34)',
  },
  bluecircle: {
    fill: 'rgba(59, 130, 246, 0.84)',
    stroke: '#bfdbfe',
    glow: 'rgba(59, 130, 246, 0.34)',
  },
  limecircle: {
    fill: 'rgba(132, 204, 22, 0.84)',
    stroke: '#d9f99d',
    glow: 'rgba(132, 204, 22, 0.32)',
  },
  orangecircle: {
    fill: 'rgba(249, 115, 22, 0.86)',
    stroke: '#fed7aa',
    glow: 'rgba(249, 115, 22, 0.34)',
  },
  fuchsiacircle: {
    fill: 'rgba(217, 70, 239, 0.84)',
    stroke: '#f5d0fe',
    glow: 'rgba(217, 70, 239, 0.34)',
  },
  whitecircle: {
    fill: 'rgba(248, 250, 252, 0.88)',
    stroke: '#ffffff',
    glow: 'rgba(248, 250, 252, 0.28)',
  },
};

export const XD_BLASTER_STARTERS: XdBlasterStarter[] = [
  { label: 'XG', event: { type: 'start', name: 'xenesis-agent', className: 'limecircle', source: 'ui' } },
  { label: 'CR', event: { type: 'start', name: 'capability-registry', className: 'greencircle', source: 'ui' } },
  { label: 'TERM', event: { type: 'start', name: 'terminal-run', className: 'bluecircle', source: 'ui' } },
  { label: 'DOCK', event: { type: 'start', name: 'dock-layout', className: 'fuchsiacircle', source: 'ui' } },
  { label: 'FILE', event: { type: 'start', name: 'workspace-file', className: 'yellowcircle', source: 'ui' } },
  { label: 'ERR', event: { type: 'start', name: 'attention-required', className: 'redcircle', source: 'ui' } },
];

const LEGACY_MONITOR_CLASS_BY_KIND: Record<string, XdBlasterClassName> = {
  KIS: 'greencircle',
  SER: 'redcircle',
  LNK: 'fuchsiacircle',
  GET: 'yellowcircle',
  SQL: 'whitecircle',
  DDL: 'bluecircle',
};

function normalizeClassName(value: unknown): XdBlasterClassName | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized in XD_BLASTER_CLASS_STYLES) return normalized as XdBlasterClassName;
  return undefined;
}

function normalizeName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function eventTypeFromXenesisType(value: unknown): XdBlasterEventType | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  const prefix = 'xd.blaster.';
  if (!normalized.startsWith(prefix)) return undefined;
  const tail = normalized.slice(prefix.length);
  if (tail === 'start' || tail === 'end' || tail === 'init' || tail === 'hide' || tail === 'reset') return tail;
  return undefined;
}

function createParsedEvent(event: XdBlasterEvent): XdBlasterEvent {
  return {
    type: event.type,
    ...(event.name ? { name: event.name } : {}),
    ...(event.className ? { className: event.className } : {}),
    ...(event.source ? { source: event.source } : {}),
  };
}

function parseXenesisJsonMessage(input: string): XdBlasterEvent | null {
  if (!input.trim().startsWith('{')) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;
  const type = eventTypeFromXenesisType(record.type ?? record.event ?? record.command);
  if (!type) return null;
  return createParsedEvent({
    type,
    name: normalizeName(record.name),
    className: normalizeClassName(record.className ?? record.class ?? record.color),
    source: 'xenesis-json',
  });
}

function parseXenesisTextMessage(input: string): XdBlasterEvent | null {
  const parts = input.trim().split(/\s+/);
  const type = eventTypeFromXenesisType(parts[0]);
  if (!type) return null;
  return createParsedEvent({
    type,
    name: normalizeName(parts[1]),
    className: normalizeClassName(parts[2]),
    source: 'xenesis-text',
  });
}

function parseLegacyMonitorMessage(input: string): XdBlasterEvent | null {
  const parts = input.trim().split(':');
  if (parts[0] !== 'MONITOR') return null;
  const command = parts[1]?.trim();
  if (!command) return null;

  if (command === 'BUBBLE_INIT') {
    return createParsedEvent({
      type: 'init',
      name: normalizeName(parts[2]),
      className: normalizeClassName(parts[3]) ?? 'greencircle',
      source: 'legacy-monitor',
    });
  }

  if (command === 'BUBBLE_HIDE') {
    return createParsedEvent({
      type: 'hide',
      name: normalizeName(parts[2]),
      source: 'legacy-monitor',
    });
  }

  const match = /^([A-Z]+)_(START|END)$/.exec(command);
  if (!match) return null;
  const [, kind, action] = match;
  const className = LEGACY_MONITOR_CLASS_BY_KIND[kind];
  if (!className) return null;

  return createParsedEvent({
    type: action === 'START' ? 'start' : 'end',
    name: normalizeName(parts[2]),
    className: action === 'START' ? className : undefined,
    source: 'legacy-monitor',
  });
}

export function parseXdBlasterMessage(input: string): XdBlasterEvent | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return parseXenesisJsonMessage(trimmed) ?? parseXenesisTextMessage(trimmed) ?? parseLegacyMonitorMessage(trimmed);
}

function inactiveBubble(id: string): XdBlasterBubble {
  return {
    id,
    name: '',
    className: 'greencircle',
    state: 'idle',
    x: 0,
    y: 0,
    radius: 0,
    vx: XD_BLASTER_VX,
    shrink: XD_BLASTER_SHRINK,
    style: XD_BLASTER_CLASS_STYLES.greencircle,
  };
}

function withActiveCount(state: Omit<XdBlasterState, 'activeCount'>): XdBlasterState {
  return {
    ...state,
    activeCount: state.bubbles.filter((bubble) => bubble.state !== 'idle').length,
  };
}

export function createXdBlasterState(options: XdBlasterStateOptions): XdBlasterState {
  const poolSize = Math.max(1, Math.floor(options.poolSize ?? XD_BLASTER_DEFAULT_POOL_SIZE));
  return withActiveCount({
    width: Math.max(1, Math.floor(options.width)),
    height: Math.max(1, Math.floor(options.height)),
    poolSize,
    random: options.random ?? Math.random,
    bubbles: Array.from({ length: poolSize }, (_, index) => inactiveBubble(`xd-blaster-${index}`)),
  });
}

export function resizeXdBlasterState(state: XdBlasterState, width: number, height: number): XdBlasterState {
  return {
    ...state,
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  };
}

function allocateBubble(state: XdBlasterState, event: XdBlasterEvent): XdBlasterState {
  const name = normalizeName(event.name);
  if (!name) return state;
  const className = event.className ?? 'greencircle';
  const existingIndex = state.bubbles.findIndex((bubble) => bubble.name === name && bubble.state !== 'idle');
  const availableIndex = state.bubbles.findIndex((bubble) => bubble.state === 'idle');
  const index = existingIndex >= 0 ? existingIndex : availableIndex >= 0 ? availableIndex : 0;
  const radius = XD_BLASTER_RADIUS;
  const yRange = Math.max(0, state.height - radius * 2);
  const y = Math.round(state.random() * yRange + radius / 2);
  const nextBubble: XdBlasterBubble = {
    id: state.bubbles[index]?.id ?? `xd-blaster-${index}`,
    name,
    className,
    state: 'active',
    x: Math.max(0, state.width - radius * 2),
    y,
    radius,
    vx: XD_BLASTER_VX,
    shrink: XD_BLASTER_SHRINK,
    style: XD_BLASTER_CLASS_STYLES[className],
  };
  const bubbles = state.bubbles.map((bubble, bubbleIndex) => (bubbleIndex === index ? nextBubble : bubble));
  return withActiveCount({ ...state, bubbles });
}

function hideBubble(state: XdBlasterState, name?: string): XdBlasterState {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return state;
  const bubbles = state.bubbles.map((bubble) => {
    if (bubble.name !== normalizedName || bubble.state === 'idle') return bubble;
    return { ...bubble, state: 'hiding' as const };
  });
  return withActiveCount({ ...state, bubbles });
}

function resetXdBlasterState(state: XdBlasterState): XdBlasterState {
  return withActiveCount({
    ...state,
    bubbles: state.bubbles.map((bubble) => inactiveBubble(bubble.id)),
  });
}

export function applyXdBlasterEvent(state: XdBlasterState, event: XdBlasterEvent): XdBlasterState {
  if (event.type === 'reset') return resetXdBlasterState(state);
  if (event.type === 'start' || event.type === 'init') return allocateBubble(state, event);
  if (event.type === 'end' || event.type === 'hide') return hideBubble(state, event.name);
  return state;
}

function tickBubble(bubble: XdBlasterBubble): XdBlasterBubble {
  if (bubble.state === 'idle') return bubble;
  if (bubble.state === 'hiding') {
    const radius = Math.max(0, bubble.radius - bubble.shrink);
    if (radius <= 0) return inactiveBubble(bubble.id);
    return {
      ...bubble,
      radius,
      x: bubble.x + bubble.vx,
    };
  }
  if (bubble.x + bubble.radius * 2 <= 0) return inactiveBubble(bubble.id);
  return {
    ...bubble,
    x: bubble.x + bubble.vx,
  };
}

export function tickXdBlasterState(state: XdBlasterState): XdBlasterState {
  return withActiveCount({
    ...state,
    bubbles: state.bubbles.map(tickBubble),
  });
}
