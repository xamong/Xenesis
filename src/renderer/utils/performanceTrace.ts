export const RENDERER_PERFORMANCE_TRACE_STORAGE_KEY = 'xenis:performance-trace';
export const MAX_RENDERER_PERFORMANCE_TRACE_ITEMS = 200;

export interface RendererPerformanceTraceEntry {
  scope: string;
  action: string;
  durationMs?: number;
  at?: number;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export interface RendererPerformanceTraceSummaryItem {
  scope: string;
  action: string;
  count: number;
  averageDurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
}

type RendererPerformanceTraceListener = (items: RendererPerformanceTraceEntry[]) => void;

const ENABLED_TRACE_VALUES = new Set(['1', 'true', 'yes', 'on', 'all', '*']);
const rendererPerformanceTraceItems: RendererPerformanceTraceEntry[] = [];
const rendererPerformanceTraceListeners = new Set<RendererPerformanceTraceListener>();

function normalizeTraceToken(value: string): string {
  return value.trim().toLowerCase();
}

export function getRendererPerformanceTraceSetting(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage?.getItem(RENDERER_PERFORMANCE_TRACE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setRendererPerformanceTraceSetting(value: string): string {
  if (typeof window === 'undefined') return '';
  const normalized = value.trim();
  try {
    if (normalized) {
      window.localStorage?.setItem(RENDERER_PERFORMANCE_TRACE_STORAGE_KEY, normalized);
    } else {
      window.localStorage?.removeItem(RENDERER_PERFORMANCE_TRACE_STORAGE_KEY);
    }
  } catch {
    return '';
  }
  return normalized;
}

function currentTraceTime(): number {
  if (typeof window !== 'undefined' && typeof window.performance?.now === 'function') {
    return window.performance.now();
  }
  return Date.now();
}

export function getRendererPerformanceTraceNow(): number {
  return currentTraceTime();
}

export function getRendererPerformanceTraceDuration(startedAt: number): number {
  const start = Number(startedAt);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, currentTraceTime() - start);
}

function cloneRendererPerformanceTraceEntry(entry: RendererPerformanceTraceEntry): RendererPerformanceTraceEntry {
  return {
    ...entry,
    details: entry.details ? { ...entry.details } : undefined,
  };
}

export function getRendererPerformanceTraceSnapshot(): RendererPerformanceTraceEntry[] {
  return rendererPerformanceTraceItems.map(cloneRendererPerformanceTraceEntry);
}

export function createRendererPerformanceTraceSummary(
  items: RendererPerformanceTraceEntry[],
): RendererPerformanceTraceSummaryItem[] {
  const buckets = new Map<string, RendererPerformanceTraceSummaryItem>();

  for (const item of items) {
    const durationMs = Number(item.durationMs);
    if (!Number.isFinite(durationMs)) continue;
    const scope = item.scope.trim() || 'unknown';
    const action = item.action.trim() || 'unknown';
    const key = `${scope}\n${action}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalDurationMs += durationMs;
      existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);
      existing.averageDurationMs = existing.totalDurationMs / existing.count;
    } else {
      buckets.set(key, {
        scope,
        action,
        count: 1,
        averageDurationMs: durationMs,
        maxDurationMs: durationMs,
        totalDurationMs: durationMs,
      });
    }
  }

  return [...buckets.values()].sort(
    (left, right) => right.totalDurationMs - left.totalDurationMs || right.maxDurationMs - left.maxDurationMs,
  );
}

function notifyRendererPerformanceTraceListeners(): void {
  const snapshot = getRendererPerformanceTraceSnapshot();
  rendererPerformanceTraceListeners.forEach((listener) => listener(snapshot));
}

export function subscribeRendererPerformanceTrace(listener: RendererPerformanceTraceListener): () => void {
  rendererPerformanceTraceListeners.add(listener);
  listener(getRendererPerformanceTraceSnapshot());
  return () => {
    rendererPerformanceTraceListeners.delete(listener);
  };
}

export function clearRendererPerformanceTrace(): RendererPerformanceTraceEntry[] {
  rendererPerformanceTraceItems.splice(0, rendererPerformanceTraceItems.length);
  notifyRendererPerformanceTraceListeners();
  return [];
}

export function isRendererPerformanceTraceEnabled(scope = ''): boolean {
  const raw = normalizeTraceToken(getRendererPerformanceTraceSetting());
  if (!raw) return false;
  if (ENABLED_TRACE_VALUES.has(raw)) return true;

  const requestedScope = normalizeTraceToken(scope);
  if (!requestedScope) return false;
  return raw
    .split(/[,\s]+/)
    .map(normalizeTraceToken)
    .filter(Boolean)
    .includes(requestedScope);
}

function emitRendererPerformanceTrace(entry: RendererPerformanceTraceEntry): void {
  if (typeof window === 'undefined') return;
  const normalized: RendererPerformanceTraceEntry = {
    ...entry,
    at: Number.isFinite(entry.at) ? entry.at : currentTraceTime(),
    timestamp: entry.timestamp || new Date().toISOString(),
    details: entry.details ? { ...entry.details } : undefined,
  };

  rendererPerformanceTraceItems.push(normalized);
  if (rendererPerformanceTraceItems.length > MAX_RENDERER_PERFORMANCE_TRACE_ITEMS) {
    rendererPerformanceTraceItems.splice(
      0,
      rendererPerformanceTraceItems.length - MAX_RENDERER_PERFORMANCE_TRACE_ITEMS,
    );
  }
  notifyRendererPerformanceTraceListeners();

  if (typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('xenesis-performance-trace', { detail: normalized }));
  }
  window.console?.debug?.('[Xenesis Desk perf]', normalized);
}

export function recordRendererPerformanceTrace(entry: RendererPerformanceTraceEntry): void {
  if (!isRendererPerformanceTraceEnabled(entry.scope)) return;
  emitRendererPerformanceTrace(entry);
}

export function measureRendererPerformanceTrace<T>(
  entry: Omit<RendererPerformanceTraceEntry, 'durationMs' | 'at'>,
  callback: () => T,
): T {
  if (!isRendererPerformanceTraceEnabled(entry.scope)) return callback();

  const performanceApi = typeof window !== 'undefined' ? window.performance : undefined;
  const canMark = typeof performanceApi?.mark === 'function' && typeof performanceApi?.measure === 'function';
  const traceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const startMark = `xenis:${entry.scope}:${entry.action}:start:${traceId}`;
  const endMark = `xenis:${entry.scope}:${entry.action}:end:${traceId}`;
  const measureName = `xenis:${entry.scope}:${entry.action}`;
  const start = currentTraceTime();

  if (canMark) performanceApi.mark(startMark);

  try {
    const result = callback();
    const end = currentTraceTime();
    if (canMark) {
      performanceApi.mark(endMark);
      performanceApi.measure(measureName, startMark, endMark);
      performanceApi.clearMarks?.(startMark);
      performanceApi.clearMarks?.(endMark);
    }
    emitRendererPerformanceTrace({
      ...entry,
      durationMs: Math.max(0, end - start),
      at: end,
    });
    return result;
  } catch (error) {
    const end = currentTraceTime();
    emitRendererPerformanceTrace({
      ...entry,
      durationMs: Math.max(0, end - start),
      at: end,
      details: {
        ...entry.details,
        failed: true,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
