import type { XenesisAgentAttachment } from './xenesisAgentAttachments';
import {
  createId,
  nowIso,
  type QueuedPrompt,
  type XenesisAgentPromptRoutingOptions,
  type XenesisMode,
} from './xenesisAgentTypes';

/**
 * Pure, immutable, deterministic prompt-queue helpers. The React pane holds the
 * queue in xenesisAgentStateStore (state.promptQueue) and calls these inside
 * store.update(); none of this module touches the store or React.
 */

/** Snapshot a submitted prompt so a later /mode change or attachment-clear cannot alter the queued turn. */
export function makeQueuedPrompt(
  input: string,
  attachments: XenesisAgentAttachment[],
  routingOptions: XenesisAgentPromptRoutingOptions,
  mode: XenesisMode,
): QueuedPrompt {
  return {
    id: createId('xenesis-queue'),
    at: nowIso(),
    input,
    attachments: [...attachments],
    routingOptions: { ...routingOptions },
    mode,
  };
}

/** Append to the tail (FIFO). Returns a NEW array; input untouched. */
export function enqueueQueuedPrompt(queue: QueuedPrompt[], item: QueuedPrompt): QueuedPrompt[] {
  return [...queue, item];
}

/** FIFO shift. Returns {head, rest} without mutating the input array. */
export function dequeueQueuedPrompt(queue: QueuedPrompt[]): { head: QueuedPrompt | null; rest: QueuedPrompt[] } {
  if (queue.length === 0) return { head: null, rest: [] };
  const [head, ...rest] = queue;
  return { head, rest };
}

/** First queued item (or null) without removing it. */
export function peekQueuedPrompt(queue: QueuedPrompt[]): QueuedPrompt | null {
  return queue.length > 0 ? queue[0] : null;
}

/** Remove by id (e.g. user cancels a queued message). Always returns a new array. */
export function removeQueuedPrompt(queue: QueuedPrompt[], id: string): QueuedPrompt[] {
  return queue.filter((entry) => entry.id !== id);
}

/** Patch a queued item in place (id is preserved). Returns a new array. */
export function replaceQueuedPrompt(
  queue: QueuedPrompt[],
  id: string,
  patch: Partial<QueuedPrompt>,
): QueuedPrompt[] {
  return queue.map((entry) => (entry.id === id ? { ...entry, ...patch, id: entry.id } : entry));
}

// ── Drain decision (pure) ──────────────────────────────────────────────────────
// The pane's store-subscriber feeds the busy edge here. "busy" = running || loading
// || any streaming message (isXenesisAgentBusy). We drain only when the agent
// transitions from busy to fully idle, so a queued turn never starts mid progressive
// reveal. suppressNextDrain (set by cancel) is consumed once on the idle edge so a
// cancel does not auto-fire the next queued prompt while preserving the queue.

export interface DrainInput {
  prevBusy: boolean;
  nextBusy: boolean;
  queue: QueuedPrompt[];
  suppressNextDrain: boolean;
}

export interface DrainDecision {
  action: 'drain' | 'none';
  item: QueuedPrompt | null;
  /** true when the suppressNextDrain flag was consumed by this decision and should be cleared. */
  resetSuppress: boolean;
}

export function decideDrain(input: DrainInput): DrainDecision {
  const becameIdle = input.prevBusy && !input.nextBusy;
  if (!becameIdle) return { action: 'none', item: null, resetSuppress: false };
  if (input.suppressNextDrain) return { action: 'none', item: null, resetSuppress: true };
  if (input.queue.length === 0) return { action: 'none', item: null, resetSuppress: false };
  return { action: 'drain', item: input.queue[0], resetSuppress: false };
}
