import type { MemoryConflict, MemorySupersedePatch } from './memoryTypes.js';
import type { MemoryInput, MemoryRecord } from './types.js';

const POSITIVE_PREFERENCE_PATTERNS = [/선호|좋아|허용|가능|prefer|like|allow|accept/i];
const NEGATIVE_PREFERENCE_PATTERNS = [/피한다|싫어|거부|금지|선호하지|avoid|dislike|reject|forbid|do not prefer/i];

function parseTime(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validSortTime(record: MemoryRecord): number {
  return parseTime(record.validFrom, parseTime(record.updatedAt, parseTime(record.createdAt, 0)));
}

function historicalSortTime(record: MemoryRecord): number {
  return parseTime(record.validTo, parseTime(record.updatedAt, parseTime(record.createdAt, 0)));
}

function hasPreferencePolarity(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function preferencePolarity(text: string): 'positive' | 'negative' | 'mixed' | 'unknown' {
  const positive = hasPreferencePolarity(text, POSITIVE_PREFERENCE_PATTERNS);
  const negative = hasPreferencePolarity(text, NEGATIVE_PREFERENCE_PATTERNS);
  if (positive && negative) return 'mixed';
  if (positive) return 'positive';
  if (negative) return 'negative';
  return 'unknown';
}

function tagsOverlap(left: readonly string[] | undefined, right: readonly string[] | undefined): boolean {
  const leftTags = new Set((left ?? []).map((tag) => tag.toLowerCase()));
  for (const tag of right ?? []) {
    if (leftTags.has(tag.toLowerCase())) return true;
  }
  return false;
}

function temporalWindowsOverlap(candidate: MemoryInput, existing: MemoryRecord, at: string): boolean {
  const candidateStart = parseTime(candidate.validFrom, Date.parse(at));
  const candidateEnd = parseTime(candidate.validTo, Number.POSITIVE_INFINITY);
  const existingStart = parseTime(existing.validFrom, parseTime(existing.createdAt, Number.NEGATIVE_INFINITY));
  const existingEnd = parseTime(existing.validTo, Number.POSITIVE_INFINITY);
  return candidateStart < existingEnd && existingStart < candidateEnd;
}

function boundedValidTo(baseValidTo: string | undefined, exceptionValidTo: string | undefined): string | undefined {
  if (!baseValidTo) return exceptionValidTo;
  if (!exceptionValidTo) return baseValidTo;
  const baseTime = Date.parse(baseValidTo);
  const exceptionTime = Date.parse(exceptionValidTo);
  if (!Number.isFinite(baseTime) || !Number.isFinite(exceptionTime)) return exceptionValidTo;
  return exceptionTime <= baseTime ? exceptionValidTo : baseValidTo;
}

export function isMemoryValidAt(record: MemoryRecord, at: string): boolean {
  const timestamp = Date.parse(at);
  if (!Number.isFinite(timestamp)) return false;
  const validFrom = parseTime(record.validFrom, Number.NEGATIVE_INFINITY);
  const validTo = parseTime(record.validTo, Number.POSITIVE_INFINITY);
  return timestamp >= validFrom && timestamp < validTo;
}

export function sortCurrentBeforeHistorical(records: MemoryRecord[], at: string): MemoryRecord[] {
  return [...records].sort((left, right) => {
    const leftCurrent = isMemoryValidAt(left, at);
    const rightCurrent = isMemoryValidAt(right, at);
    if (leftCurrent !== rightCurrent) return leftCurrent ? -1 : 1;
    const leftTime = leftCurrent ? validSortTime(left) : historicalSortTime(left);
    const rightTime = rightCurrent ? validSortTime(right) : historicalSortTime(right);
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
}

export function findTemporalConflicts(candidate: MemoryInput, active: MemoryRecord[], at: string): MemoryConflict[] {
  const candidatePolarity = preferencePolarity(candidate.text);
  if (candidatePolarity === 'unknown' || candidatePolarity === 'mixed') return [];

  return active.flatMap((existing) => {
    if (existing.id === candidate.id) return [];
    if ((existing.status ?? 'active') === 'archived') return [];
    if (!tagsOverlap(candidate.tags, existing.tags)) return [];
    if (!temporalWindowsOverlap(candidate, existing, at)) return [];

    const existingPolarity = preferencePolarity(existing.text);
    if (existingPolarity === 'unknown' || existingPolarity === 'mixed') return [];
    if (existingPolarity === candidatePolarity) return [];

    return [
      {
        candidateId: candidate.id,
        existingId: existing.id,
        severity: 'inferred' as const,
        reason: 'same-period opposite preference',
        at,
      },
    ];
  });
}

export function buildPartialSupersede(base: MemoryRecord, exception: MemoryInput): MemorySupersedePatch {
  const partialSupersededBy = Array.from(new Set([...(base.partialSupersededBy ?? []), exception.id]));
  const supersedes = Array.from(new Set([...(exception.supersedes ?? []), base.id]));
  return {
    mode: 'partial',
    basePatch: {
      id: base.id,
      partialSupersededBy,
    },
    nextInput: {
      ...exception,
      supersedes,
      ...(boundedValidTo(base.validTo, exception.validTo)
        ? { validTo: boundedValidTo(base.validTo, exception.validTo) }
        : {}),
      supersedeMode: 'partial',
    },
  };
}
