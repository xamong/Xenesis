import { useEffect, useMemo, useState } from 'react';
import type { RenderOptions, RenderStreamingOptions } from '../../shared/types';

const DEFAULT_INTERVAL_MS = 24;
const DEFAULT_CHUNK_SIZE = 80;
const DEFAULT_INITIAL_DELAY_MS = 0;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

export function normalizeRenderStreamingOptions(
  options?: RenderOptions | RenderStreamingOptions | null,
): Required<RenderStreamingOptions> | null {
  const candidate = options as (RenderOptions & RenderStreamingOptions) | null | undefined;
  const source: RenderStreamingOptions | undefined =
    candidate?.streaming ??
    (candidate?.enabled !== undefined ||
    candidate?.intervalMs !== undefined ||
    candidate?.chunkSize !== undefined ||
    candidate?.initialDelayMs !== undefined
      ? candidate
      : undefined);
  if (!source || source.enabled !== true) return null;
  return {
    enabled: true,
    intervalMs: clampNumber(source.intervalMs, DEFAULT_INTERVAL_MS, 1, 2000),
    chunkSize: clampNumber(source.chunkSize, DEFAULT_CHUNK_SIZE, 1, 20000),
    initialDelayMs: clampNumber(source.initialDelayMs, DEFAULT_INITIAL_DELAY_MS, 0, 10000),
  };
}

export function useStreamingText(
  source: string,
  renderOptions?: RenderOptions,
  disabled = false,
): { text: string; isStreaming: boolean } {
  const streamingOptions = useMemo(
    () => (disabled ? null : normalizeRenderStreamingOptions(renderOptions)),
    [disabled, renderOptions],
  );
  const [text, setText] = useState(() => (streamingOptions && source.length > 0 ? '' : source));
  const [isStreaming, setIsStreaming] = useState(() => Boolean(streamingOptions && source.length > 0));

  useEffect(() => {
    if (!streamingOptions || source.length === 0) {
      setText(source);
      setIsStreaming(false);
      return;
    }

    let cancelled = false;
    let offset = 0;
    let timer: number | undefined;

    const step = () => {
      if (cancelled) return;
      offset = Math.min(source.length, offset + streamingOptions.chunkSize);
      setText(source.slice(0, offset));
      if (offset >= source.length) {
        setIsStreaming(false);
        return;
      }
      timer = window.setTimeout(step, streamingOptions.intervalMs);
    };

    setText('');
    setIsStreaming(true);
    timer = window.setTimeout(step, streamingOptions.initialDelayMs);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [
    source,
    streamingOptions?.enabled,
    streamingOptions?.intervalMs,
    streamingOptions?.chunkSize,
    streamingOptions?.initialDelayMs,
  ]);

  return { text, isStreaming };
}
