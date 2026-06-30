import { describe, expect, it } from 'vitest';
import { stripStaleImageAttachments } from '../../src/core/context/compaction/stripStaleImages.js';
import type { AgentMessage } from '../../src/core/messages.js';

const img = (name: string) => ({
  kind: 'image' as const,
  name,
  mimeType: 'image/png',
  dataUrl: 'data:image/png;base64,AAA',
});
const toolImg = (id: string, name: string): AgentMessage => ({
  role: 'tool',
  toolCallId: id,
  name: 'screenshot',
  content: 'shot',
  attachments: [img(name)],
});

describe('stripStaleImageAttachments', () => {
  it('strips images outside the keep window, adds a placeholder note, keeps the most-recent image turn', () => {
    const msgs: AgentMessage[] = [
      toolImg('a', 'old.png'), // 0 - old, should strip
      { role: 'assistant', content: 'x' },
      { role: 'user', content: 'y' },
      { role: 'assistant', content: 'z' },
      toolImg('b', 'recent.png'), // 4 - within keep window AND most-recent image
    ];
    const out = stripStaleImageAttachments(msgs, { keepRecentTurns: 3 });
    const old = out[0] as any;
    expect(old.attachments).toBeUndefined();
    expect(old.content).toContain('[image omitted: old.png]');
    const recent = out[4] as any;
    expect(recent.attachments).toHaveLength(1); // kept
  });

  it('keeps the single most-recent image turn even if it is older than keepRecentTurns', () => {
    const msgs: AgentMessage[] = [
      toolImg('a', 'only.png'), // 0 - the only image, older than window
      { role: 'assistant', content: 'x' },
      { role: 'user', content: 'y' },
      { role: 'assistant', content: 'z' },
    ];
    const out = stripStaleImageAttachments(msgs, { keepRecentTurns: 2 });
    expect((out[0] as any).attachments).toHaveLength(1);
  });

  it('never mutates the input objects (clone proof)', () => {
    const original = toolImg('a', 'old.png');
    const msgs: AgentMessage[] = [
      original,
      { role: 'user', content: '1' },
      { role: 'user', content: '2' },
      { role: 'user', content: '3' },
      toolImg('b', 'new.png'),
    ];
    stripStaleImageAttachments(msgs, { keepRecentTurns: 2 });
    expect((original as any).attachments).toHaveLength(1); // input untouched
    expect((original as any).content).toBe('shot');
  });

  it('returns the same array contents (count/order preserved) and is a no-op with no images', () => {
    const msgs: AgentMessage[] = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ];
    const out = stripStaleImageAttachments(msgs, { keepRecentTurns: 3 });
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(msgs[0]); // untouched messages returned by reference
  });
});
