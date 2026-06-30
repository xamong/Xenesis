// src/extensions/curator/tierA.ts
// P5b-2: Curator Tier-A — PURE garbage collection of memory lifecycle state.
//
// Mirrors Hermes' curator.apply_automatic_transitions (agent/curator.py:255-310): a time-based,
// no-LLM pass that moves records active→stale→archived based on the latest activity anchor.
//
// Strict invariants (mirror Hermes):
//   - Pinned records are NEVER touched (pin-protect).
//   - Archive is the terminal state; archiving NEVER deletes (the apply step in SqliteMemoryStore
//     MOVES archived rows into a separate `memory_archive` table — recoverable).
//   - This function is PURE: it only computes the transitions; it does not mutate anything.
//
// TODO P5c: Tier-B LLM umbrella consolidation on aux model (dry-run/approval gated). The
// autonomous LLM consolidation pass (Hermes' CURATOR_REVIEW_PROMPT umbrella-ification) is
// DEFERRED — see curator/README note. Do NOT wire an aux model here; Tier-A stays pure/no-LLM.
import type { MemoryRecord, MemoryStatus } from '../types.js';

export interface TierAThresholds {
  /** Days of inactivity after which an active record becomes stale. */
  staleAfterDays?: number;
  /** Days of inactivity after which any non-archived record is archived. */
  archiveAfterDays?: number;
}

export interface MemoryTransition {
  id: string;
  from: MemoryStatus;
  to: MemoryStatus;
}

export const DEFAULT_STALE_AFTER_DAYS = 30;
export const DEFAULT_ARCHIVE_AFTER_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A record with no explicit status is treated as "active". */
function currentStatus(record: MemoryRecord): MemoryStatus {
  return record.status ?? 'active';
}

/**
 * The curation anchor = the most recent real activity timestamp.
 * Priority: lastAccessedAt ?? createdAt ?? updatedAt. updatedAt is always present so the anchor
 * is well-defined for every record. An unparseable anchor yields NaN, which makes both cutoff
 * comparisons false — i.e. the record is left untouched rather than wrongly archived.
 */
function anchorMs(record: MemoryRecord): number {
  const anchor = record.lastAccessedAt ?? record.createdAt ?? record.updatedAt;
  return Date.parse(anchor);
}

/**
 * Compute lifecycle transitions for a set of memory records given the current time.
 *
 * Rules (evaluated per record; at most one transition each):
 *   - skip if record.pinned (pin-protect).
 *   - any non-archived → "archived" when anchor ≤ now − archiveAfterDays.
 *   - active → "stale" when anchor ≤ now − staleAfterDays (and not already archive-eligible).
 *
 * Returns the list of {id, from, to} transitions. PURE — no mutation, no I/O.
 */
export function computeMemoryTransitions(
  records: MemoryRecord[],
  now: Date,
  thresholds: TierAThresholds = {},
): MemoryTransition[] {
  const staleAfterDays = thresholds.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;
  const archiveAfterDays = thresholds.archiveAfterDays ?? DEFAULT_ARCHIVE_AFTER_DAYS;
  const nowMs = now.getTime();
  const staleCutoff = nowMs - staleAfterDays * MS_PER_DAY;
  const archiveCutoff = nowMs - archiveAfterDays * MS_PER_DAY;

  const transitions: MemoryTransition[] = [];
  for (const record of records) {
    if (record.pinned) continue; // pin-protect
    const from = currentStatus(record);
    const anchor = anchorMs(record);
    if (Number.isNaN(anchor)) continue; // undatable → leave alone

    if (anchor <= archiveCutoff && from !== 'archived') {
      transitions.push({ id: record.id, from, to: 'archived' });
    } else if (anchor <= staleCutoff && from === 'active') {
      transitions.push({ id: record.id, from, to: 'stale' });
    }
  }
  return transitions;
}
