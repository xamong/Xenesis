import { createId, nowIso, type XenesisRawStreamEntry } from './xenesisAgentTypes';

export interface RawStreamListOptions {
  createId?: (prefix: string) => string;
  nowIso?: () => string;
  limit?: number;
}

export interface MergeRawStreamEntryInput {
  mergeKey: string;
  kind: string;
  summary: string;
  detailDelta?: string;
  error?: boolean;
  chunkCount?: number;
  bytesReceived?: number;
  detailLimit?: number;
}

function listLimit(options?: RawStreamListOptions): number {
  return Math.max(1, options?.limit ?? 120);
}

function nextId(options?: RawStreamListOptions): string {
  return (options?.createId ?? createId)('xenesis-raw');
}

function nextAt(options?: RawStreamListOptions): string {
  return (options?.nowIso ?? nowIso)();
}

function truncateTail(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return value.slice(value.length - limit);
}

function streamSummary(input: MergeRawStreamEntryInput): string {
  if (typeof input.bytesReceived === 'number' && typeof input.chunkCount === 'number') {
    return `${input.summary} · ${input.bytesReceived.toLocaleString('en-US')} chars received · ${input.chunkCount.toLocaleString('en-US')} chunks`;
  }
  return input.summary;
}

export function appendRawStreamEntryToList(
  rawStream: XenesisRawStreamEntry[],
  entry: Omit<XenesisRawStreamEntry, 'id' | 'at'> & { at?: string },
  options?: RawStreamListOptions,
): XenesisRawStreamEntry[] {
  return [
    {
      id: nextId(options),
      at: entry.at || nextAt(options),
      kind: entry.kind,
      summary: entry.summary,
      detail: entry.detail,
      error: entry.error,
    },
    ...rawStream,
  ].slice(0, listLimit(options));
}

export function mergeRawStreamEntryToList(
  rawStream: XenesisRawStreamEntry[],
  input: MergeRawStreamEntryInput,
  options?: RawStreamListOptions,
): XenesisRawStreamEntry[] {
  const detailLimit = Math.max(1000, input.detailLimit ?? 12000);
  const existingIndex = rawStream.findIndex((entry) => entry.kind === input.kind && entry.id.includes(input.mergeKey));
  const summary = streamSummary(input);
  if (existingIndex < 0) {
    return [
      {
        id: `${nextId(options)}:${input.mergeKey}`,
        at: nextAt(options),
        kind: input.kind,
        summary,
        detail: input.detailDelta ? truncateTail(input.detailDelta, detailLimit) : '',
        error: input.error,
      },
      ...rawStream,
    ].slice(0, listLimit(options));
  }

  const existing = rawStream[existingIndex];
  const merged: XenesisRawStreamEntry = {
    ...existing,
    at: nextAt(options),
    summary,
    detail: truncateTail(`${existing.detail ?? ''}${input.detailDelta ?? ''}`, detailLimit),
    error: input.error ?? existing.error,
  };
  return [merged, ...rawStream.slice(0, existingIndex), ...rawStream.slice(existingIndex + 1)].slice(
    0,
    listLimit(options),
  );
}
