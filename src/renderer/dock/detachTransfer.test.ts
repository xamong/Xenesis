import assert from 'node:assert/strict';
import test from 'node:test';
import type { DetachPayload } from '../../shared/types';
import { runDockTransfer } from './detachTransfer';

const payload: DetachPayload = {
  id: 'detach-test',
  title: 'Test',
  html: 'Test',
  contentType: 'html',
};

function labels(success = 'Transfer succeeded') {
  return {
    unavailable: 'Transfer unavailable',
    success,
    failure: (error: unknown) => `Transfer failed: ${(error as Error)?.message ?? String(error)}`,
  };
}

test('successful detach releases terminal and closes source content after IPC succeeds', async () => {
  const events: string[] = [];

  const result = await runDockTransfer({
    mode: 'detach',
    payload,
    contentId: 'content-1',
    terminalTermId: 'term-1',
    api: {
      detachTab: async () => {
        events.push('ipc');
      },
    },
    closeContent: (contentId) => events.push(`close:${contentId}`),
    releaseTerminal: (termId) => events.push(`release:${termId}`),
    closeCurrentWindowIfEmpty: () => events.push('close-window-if-empty'),
    onStatus: (message) => events.push(`status:${message}`),
    labels: labels('Detached'),
  });

  assert.equal(result, true);
  assert.deepEqual(events, ['ipc', 'release:term-1', 'close:content-1', 'status:Detached', 'close-window-if-empty']);
});

test('failed detach leaves source content and terminal owner intact', async () => {
  const events: string[] = [];

  const result = await runDockTransfer({
    mode: 'detach',
    payload,
    contentId: 'content-1',
    terminalTermId: 'term-1',
    api: {
      detachTab: async () => {
        throw new Error('boom');
      },
    },
    closeContent: (contentId) => events.push(`close:${contentId}`),
    releaseTerminal: (termId) => events.push(`release:${termId}`),
    closeCurrentWindowIfEmpty: () => events.push('close-window-if-empty'),
    onStatus: (message) => events.push(`status:${message}`),
    labels: labels(),
  });

  assert.equal(result, false);
  assert.deepEqual(events, ['status:Transfer failed: boom']);
});

test('failed reattach and failed merge leave source content open', async () => {
  const events: string[] = [];

  const reattachResult = await runDockTransfer({
    mode: 'reattach',
    payload,
    contentId: 'content-1',
    api: {
      reattachDrop: async () => {
        throw new Error('reattach failed');
      },
    },
    closeContent: (contentId) => events.push(`close:${contentId}`),
    releaseTerminal: (termId) => events.push(`release:${termId}`),
    closeCurrentWindowIfEmpty: () => events.push('close-window-if-empty'),
    onStatus: (message) => events.push(`status:${message}`),
    labels: labels(),
  });

  const mergeResult = await runDockTransfer({
    mode: 'merge-to-detached',
    targetWindowId: 42,
    payload,
    contentId: 'content-2',
    api: {
      mergeTabToDetached: async () => {
        throw new Error('merge failed');
      },
    },
    closeContent: (contentId) => events.push(`close:${contentId}`),
    releaseTerminal: (termId) => events.push(`release:${termId}`),
    closeCurrentWindowIfEmpty: () => events.push('close-window-if-empty'),
    onStatus: (message) => events.push(`status:${message}`),
    labels: labels(),
  });

  assert.equal(reattachResult, false);
  assert.equal(mergeResult, false);
  assert.deepEqual(events, ['status:Transfer failed: reattach failed', 'status:Transfer failed: merge failed']);
});
