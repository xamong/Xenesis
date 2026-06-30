/**
 * P6 (e): Commitment extraction — a HIDDEN background classifier.
 *
 * Extracts INFERRED future follow-ups from a completed interactive turn. It MUST SKIP
 * explicit "remind me" / "schedule this" / "check in at 3" requests — those are cron-owned.
 * The extractor NEVER schedules cron itself; it only proposes candidate commitment records.
 *
 * - {@link buildCommitmentExtractionPrompt}  builds the hidden classifier prompt.
 * - {@link parseCommitmentExtractionOutput}  tolerant JSON parser (whole-object or fragments).
 * - {@link validateCommitmentCandidates}     applies confidence floors, future-due check, per-day cap.
 *
 * Adapted from OpenClaw `src/commitments/extraction.ts` (no heartbeat/embedded-agent coupling).
 */
import { type ResolvedCommitmentsConfig, resolveCommitmentsConfig } from './config.js';
import type {
  CommitmentCandidate,
  CommitmentExtractionBatchResult,
  CommitmentExtractionItem,
  CommitmentKind,
  CommitmentSensitivity,
  CommitmentSource,
} from './types.js';

const KIND_VALUES = new Set<CommitmentKind>(['event_check_in', 'deadline_check', 'care_check_in', 'open_loop']);
const SENSITIVITY_VALUES = new Set<CommitmentSensitivity>(['routine', 'personal', 'care']);
const SOURCE_VALUES = new Set<CommitmentSource>(['inferred_user_context', 'agent_promise']);

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseCandidate(raw: unknown): CommitmentCandidate | undefined {
  if (!isRecord(raw)) return undefined;
  if (raw.action === 'skip') return undefined;
  const itemId = asString(raw.itemId);
  const kind = asString(raw.kind);
  const sensitivity = asString(raw.sensitivity);
  const source = asString(raw.source) ?? 'inferred_user_context';
  const reason = asString(raw.reason);
  const suggestedText = asString(raw.suggestedText);
  const dedupeKey = asString(raw.dedupeKey);
  const confidence = asNumber(raw.confidence);
  const dueWindow = isRecord(raw.dueWindow) ? raw.dueWindow : undefined;
  const earliest = asString(dueWindow?.earliest);
  const latest = asString(dueWindow?.latest);
  const timezone = asString(dueWindow?.timezone);
  if (
    !itemId ||
    !kind ||
    !KIND_VALUES.has(kind as CommitmentKind) ||
    !sensitivity ||
    !SENSITIVITY_VALUES.has(sensitivity as CommitmentSensitivity) ||
    !SOURCE_VALUES.has(source as CommitmentSource) ||
    !reason ||
    !suggestedText ||
    !dedupeKey ||
    confidence === undefined ||
    !earliest
  ) {
    return undefined;
  }
  return {
    itemId,
    kind: kind as CommitmentKind,
    sensitivity: sensitivity as CommitmentSensitivity,
    source: source as CommitmentSource,
    reason,
    suggestedText,
    dedupeKey,
    confidence,
    dueWindow: {
      earliest,
      ...(latest ? { latest } : {}),
      ...(timezone ? { timezone } : {}),
    },
  };
}

/** Scans for top-level balanced `{...}` JSON objects, ignoring braces inside strings. */
function extractJsonObjectCandidates(raw: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let idx = 0; idx < raw.length; idx += 1) {
    const char = raw[idx] ?? '';
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      if (inString) escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') {
      if (depth === 0) start = idx;
      depth += 1;
      continue;
    }
    if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        out.push(raw.slice(start, idx + 1));
        start = -1;
      }
    }
  }
  return out;
}

/** Tolerant parser: accepts a clean JSON object, or recovers `{...}` fragments from prose/fences. */
export function parseCommitmentExtractionOutput(raw: string): CommitmentExtractionBatchResult {
  const candidates: CommitmentCandidate[] = [];
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { candidates };
  const records: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (isRecord(parsed)) records.push(parsed);
  } catch {
    for (const fragment of extractJsonObjectCandidates(trimmed)) {
      try {
        const parsed = JSON.parse(fragment) as unknown;
        if (isRecord(parsed)) records.push(parsed);
      } catch {
        // Ignore malformed fragments.
      }
    }
  }
  for (const record of records) {
    const rawCandidates = Array.isArray(record.candidates) ? record.candidates : [];
    for (const candidate of rawCandidates) {
      const parsed = parseCandidate(candidate);
      if (parsed) candidates.push(parsed);
    }
  }
  return { candidates };
}

function isoString(valueMs: number): string {
  const date = new Date(valueMs);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function formatExistingPending(item: CommitmentExtractionItem) {
  return item.existingPending.flatMap((commitment) => {
    if (!Number.isFinite(commitment.earliestMs) || !Number.isFinite(commitment.latestMs)) {
      return [];
    }
    return [
      {
        kind: commitment.kind,
        reason: commitment.reason,
        dedupeKey: commitment.dedupeKey,
        earliest: isoString(commitment.earliestMs),
        latest: isoString(commitment.latestMs),
      },
    ];
  });
}

/**
 * Builds the hidden commitment-extractor prompt. The extractor sees only itemId + text +
 * existing-pending context — never the routing scope. It is told, in no uncertain terms, to
 * SKIP explicit reminder/scheduling requests (cron owns those).
 */
export function buildCommitmentExtractionPrompt(params: { items: CommitmentExtractionItem[] }): string {
  const items = params.items.map((item) => ({
    itemId: item.itemId,
    now: isoString(item.nowMs),
    timezone: item.timezone,
    latestUserMessage: item.userText,
    assistantResponse: item.assistantText ?? '',
    existingPendingCommitments: formatExistingPending(item),
  }));
  return `You are Xenesis's internal commitment extractor. This is a hidden background classification run. Do not address the user.

Create inferred follow-up commitments only. Exact user requests such as "remind me tomorrow", "schedule this", or "check in at 3" belong to cron/reminders and MUST be skipped.

Use these categories: event_check_in, deadline_check, care_check_in, open_loop.

Create a candidate only when the latest exchange creates a useful future check-in opportunity that the user did not explicitly schedule. Prefer no candidate over weak candidates.

Rules:
- Output JSON only, with top-level {"candidates":[...]}.
- Each candidate must include itemId, kind, sensitivity, source, dueWindow, reason, suggestedText, confidence, and dedupeKey.
- kind is one of event_check_in, deadline_check, care_check_in, open_loop.
- sensitivity is routine, personal, or care.
- source is inferred_user_context or agent_promise.
- dueWindow.earliest and dueWindow.latest must be ISO timestamps in the future relative to that item's now.
- Skip explicit reminders/scheduling requests; those are cron-owned.
- Skip if the assistant already clearly says a cron reminder was scheduled.
- Skip if the topic is already resolved in the assistant response.
- Care check-ins must be gentle, rare, and high confidence. Avoid interrogating language.
- Suggested text should be short, natural, and suitable to send in the same channel.
- Dedupe keys should be stable within a session, like "interview:2026-04-29" or "sleep:2026-04-29".

Items:
${JSON.stringify(items, null, 2)}`;
}

function parseDueMs(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface ValidatedCommitment {
  item: CommitmentExtractionItem;
  candidate: CommitmentCandidate;
  earliestMs: number;
  latestMs: number;
  timezone: string;
}

/**
 * Applies, per candidate:
 *  1. confidence floor (care floor is higher than routine),
 *  2. future-due check (earliest must be strictly after the item's now),
 *  3. a per-day cap (at most `maxPerDay` accepted candidates total this batch).
 *
 * Returns the accepted candidates with normalized due windows.
 */
export function validateCommitmentCandidates(params: {
  cfg?: Parameters<typeof resolveCommitmentsConfig>[0];
  items: CommitmentExtractionItem[];
  result: CommitmentExtractionBatchResult;
  resolved?: ResolvedCommitmentsConfig;
}): ValidatedCommitment[] {
  const resolved = params.resolved ?? resolveCommitmentsConfig(params.cfg);
  const itemsById = new Map(params.items.map((item) => [item.itemId, item]));
  const validated: ValidatedCommitment[] = [];
  for (const candidate of params.result.candidates) {
    if (validated.length >= resolved.maxPerDay) break; // per-day cap
    const item = itemsById.get(candidate.itemId);
    if (!item) continue;
    const threshold =
      candidate.kind === 'care_check_in' || candidate.sensitivity === 'care'
        ? resolved.extraction.careConfidenceThreshold
        : resolved.extraction.confidenceThreshold;
    if (candidate.confidence < threshold) continue;
    const earliestMs = parseDueMs(candidate.dueWindow.earliest);
    if (earliestMs === undefined || earliestMs <= item.nowMs) continue; // must be future-due
    const latestRawMs = parseDueMs(candidate.dueWindow.latest);
    const latestMs =
      latestRawMs !== undefined && latestRawMs >= earliestMs ? latestRawMs : earliestMs + TWELVE_HOURS_MS;
    validated.push({
      item,
      candidate,
      earliestMs,
      latestMs,
      timezone: candidate.dueWindow.timezone ?? item.timezone,
    });
  }
  return validated;
}
