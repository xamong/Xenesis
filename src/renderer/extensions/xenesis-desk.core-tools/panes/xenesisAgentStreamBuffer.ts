export interface XenesisAssistantStreamFlush {
  messageId: string;
  delta: string;
  chunkCount: number;
  charCount: number;
}

export interface XenesisStreamBufferScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

function defaultScheduler(): XenesisStreamBufferScheduler {
  return {
    setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
}

interface PendingAssistantDelta {
  delta: string;
  chunkCount: number;
  charCount: number;
}

export class XenesisAssistantStreamBuffer {
  private readonly pending = new Map<string, PendingAssistantDelta>();
  private timer: unknown = null;

  constructor(
    private readonly onFlush: (flush: XenesisAssistantStreamFlush) => void,
    private readonly delayMs = 50,
    private readonly scheduler = defaultScheduler(),
  ) {}

  push(messageId: string, delta: string): void {
    if (!messageId || !delta) return;
    const current = this.pending.get(messageId) ?? {
      delta: '',
      chunkCount: 0,
      charCount: 0,
    };
    current.delta += delta;
    current.chunkCount += 1;
    current.charCount += delta.length;
    this.pending.set(messageId, current);
    this.schedule();
  }

  flushNow(): void {
    if (this.timer) {
      this.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pending.size === 0) return;
    const batch = [...this.pending.entries()];
    this.pending.clear();
    for (const [messageId, entry] of batch) {
      this.onFlush({
        messageId,
        delta: entry.delta,
        chunkCount: entry.chunkCount,
        charCount: entry.charCount,
      });
    }
  }

  cancel(): void {
    if (this.timer) {
      this.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = null;
      this.flushNow();
    }, this.delayMs);
  }
}
