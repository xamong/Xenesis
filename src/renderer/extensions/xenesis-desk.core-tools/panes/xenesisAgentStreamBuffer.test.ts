import assert from 'node:assert/strict';
import test from 'node:test';
import {
  XenesisAssistantStreamBuffer,
  type XenesisAssistantStreamFlush,
  type XenesisStreamBufferScheduler,
} from './xenesisAgentStreamBuffer';

class ManualScheduler implements XenesisStreamBufferScheduler {
  callbacks: Array<() => void> = [];

  setTimeout(callback: () => void): number {
    this.callbacks.push(callback);
    return this.callbacks.length;
  }

  clearTimeout(handle: unknown): void {
    const index = Number(handle) - 1;
    if (index >= 0 && index < this.callbacks.length) {
      this.callbacks[index] = () => undefined;
    }
  }

  runNext(): void {
    this.callbacks.shift()?.();
  }
}

test('XenesisAssistantStreamBuffer coalesces small deltas into one flush', () => {
  const scheduler = new ManualScheduler();
  const flushed: XenesisAssistantStreamFlush[] = [];
  const buffer = new XenesisAssistantStreamBuffer((flush) => flushed.push(flush), 50, scheduler);

  buffer.push('message-1', '안녕');
  buffer.push('message-1', '하세요');
  buffer.push('message-1', '.');

  assert.equal(flushed.length, 0);
  assert.equal(scheduler.callbacks.length, 1);

  scheduler.runNext();

  assert.deepEqual(flushed, [
    {
      messageId: 'message-1',
      delta: '안녕하세요.',
      chunkCount: 3,
      charCount: 6,
    },
  ]);
});

test('XenesisAssistantStreamBuffer flushNow applies pending text before final replacement', () => {
  const scheduler = new ManualScheduler();
  const flushed: XenesisAssistantStreamFlush[] = [];
  const buffer = new XenesisAssistantStreamBuffer((flush) => flushed.push(flush), 50, scheduler);

  buffer.push('message-1', 'streaming ');
  buffer.push('message-2', 'other');
  buffer.flushNow();
  scheduler.runNext();

  assert.deepEqual(
    flushed.map((item) => [item.messageId, item.delta]),
    [
      ['message-1', 'streaming '],
      ['message-2', 'other'],
    ],
  );
});
