import assert from 'node:assert/strict';
import test from 'node:test';
import type { XenesisAgentAttachment } from './xenesisAgentAttachments';
import type { QueuedPrompt } from './xenesisAgentTypes';
import {
  decideDrain,
  dequeueQueuedPrompt,
  enqueueQueuedPrompt,
  makeQueuedPrompt,
  peekQueuedPrompt,
  removeQueuedPrompt,
} from './xenesisPromptQueue';

const item = (id: string, input = id): QueuedPrompt => ({
  id,
  at: '2026-06-26T00:00:00.000Z',
  input,
  attachments: [],
  routingOptions: {},
  mode: 'chat',
});

test('makeQueuedPrompt snapshots input/routing/mode, copies attachments, and stamps id+at', () => {
  const atts = [{} as XenesisAgentAttachment];
  const q = makeQueuedPrompt('hello', atts, { bypassDirectDeskRouting: true }, 'plan');
  assert.equal(q.input, 'hello');
  assert.equal(q.mode, 'plan');
  assert.deepEqual(q.routingOptions, { bypassDirectDeskRouting: true });
  assert.ok(q.id.startsWith('xenesis-queue-'));
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(q.at));
  // attachments must be a COPY (snapshot), not the same reference that the pane clears after send
  assert.notEqual(q.attachments, atts);
  assert.deepEqual(q.attachments, atts);
});

test('enqueueQueuedPrompt appends FIFO and returns a new array (input unmutated)', () => {
  const a = [item('a')];
  const out = enqueueQueuedPrompt(a, item('b'));
  assert.deepEqual(out.map((q) => q.id), ['a', 'b']);
  assert.notEqual(out, a);
  assert.deepEqual(a.map((q) => q.id), ['a']); // original untouched
});

test('dequeueQueuedPrompt returns {head, rest} FIFO without mutating input', () => {
  const a = [item('a'), item('b'), item('c')];
  const { head, rest } = dequeueQueuedPrompt(a);
  assert.equal(head?.id, 'a');
  assert.deepEqual(rest.map((q) => q.id), ['b', 'c']);
  assert.deepEqual(a.map((q) => q.id), ['a', 'b', 'c']); // unmutated
});

test('dequeueQueuedPrompt on empty returns {head:null, rest:[]}', () => {
  const { head, rest } = dequeueQueuedPrompt([]);
  assert.equal(head, null);
  assert.deepEqual(rest, []);
});

test('peekQueuedPrompt returns the head without removing; null on empty', () => {
  assert.equal(peekQueuedPrompt([item('a'), item('b')])?.id, 'a');
  assert.equal(peekQueuedPrompt([]), null);
});

test('removeQueuedPrompt splices by id, preserves order; unknown id is a no-op copy', () => {
  const a = [item('a'), item('b'), item('c')];
  assert.deepEqual(removeQueuedPrompt(a, 'b').map((q) => q.id), ['a', 'c']);
  const noop = removeQueuedPrompt(a, 'zzz');
  assert.deepEqual(noop.map((q) => q.id), ['a', 'b', 'c']);
  assert.notEqual(noop, a); // still a new array
});

test('decideDrain: drains head on busy true->false edge with a non-empty, non-suppressed queue', () => {
  const d = decideDrain({ prevBusy: true, nextBusy: false, queue: [item('a'), item('b')], suppressNextDrain: false });
  assert.equal(d.action, 'drain');
  assert.equal(d.item?.id, 'a');
  assert.equal(d.resetSuppress, false);
});

test('decideDrain: suppressed edge consumes the flag once and does NOT drain (cancel semantics)', () => {
  const d = decideDrain({ prevBusy: true, nextBusy: false, queue: [item('a')], suppressNextDrain: true });
  assert.equal(d.action, 'none');
  assert.equal(d.item, null);
  assert.equal(d.resetSuppress, true);
});

test('decideDrain: empty queue on edge -> none', () => {
  const d = decideDrain({ prevBusy: true, nextBusy: false, queue: [], suppressNextDrain: false });
  assert.equal(d.action, 'none');
  assert.equal(d.resetSuppress, false);
});

test('decideDrain: still busy (no edge) -> none, and does not consume suppress', () => {
  const d = decideDrain({ prevBusy: true, nextBusy: true, queue: [item('a')], suppressNextDrain: true });
  assert.equal(d.action, 'none');
  assert.equal(d.resetSuppress, false);
});

test('decideDrain: was already idle (prevBusy false) -> none (no spurious drain on unrelated updates)', () => {
  const d = decideDrain({ prevBusy: false, nextBusy: false, queue: [item('a')], suppressNextDrain: false });
  assert.equal(d.action, 'none');
});
