import { describe, expect, it } from 'vitest';
import { toAnthropicInput } from '../../src/providers/anthropicProvider.js';
import { toChatMessages } from '../../src/providers/openaiChatProvider.js';
import { toOpenAIInput } from '../../src/providers/openaiProvider.js';

const dataUrl = 'data:image/png;base64,AAA';

type OutputRecord = Record<string, any>;

function isRecord(value: unknown): value is OutputRecord {
  return typeof value === 'object' && value !== null;
}

function expectRecord(value: unknown): OutputRecord {
  expect(isRecord(value)).toBe(true);
  return value as OutputRecord;
}

function findRecord(items: readonly unknown[], predicate: (item: OutputRecord) => boolean): OutputRecord {
  const found = items.find((item): item is OutputRecord => isRecord(item) && predicate(item));
  expect(found).toBeDefined();
  return found!;
}

function contentParts(message: OutputRecord): OutputRecord[] {
  expect(Array.isArray(message.content)).toBe(true);
  return message.content as OutputRecord[];
}

function findContentBlock(parts: readonly unknown[], type: string): OutputRecord {
  return findRecord(parts, (block) => block.type === type);
}

describe('anthropic images', () => {
  it('emits image block on a user message with an image attachment (vision model)', () => {
    const out = toAnthropicInput(
      [{ role: 'user', content: 'look', attachments: [{ kind: 'image', name: 's', dataUrl }] }],
      { supportsVision: true } as any,
    ).messages;
    const user = findRecord(out, (m) => m.role === 'user');
    expect(Array.isArray(user.content)).toBe(true);
    const content = contentParts(user);
    const img = findContentBlock(content, 'image');
    expect(img.source).toEqual({ type: 'base64', media_type: 'image/png', data: 'AAA' });
    const text = findContentBlock(content, 'text');
    expect(text.text).toBe('look');
  });

  it('keeps text-only when model lacks vision', () => {
    const out = toAnthropicInput(
      [{ role: 'user', content: 'look', attachments: [{ kind: 'image', name: 's', dataUrl }] }],
      { supportsVision: false } as any,
    ).messages;
    const user = findRecord(out, (m) => m.role === 'user');
    expect(typeof user.content).toBe('string');
  });

  it('emits image block inside a tool_result (vision model)', () => {
    const out = toAnthropicInput(
      [
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc1', name: 'shot', input: {} }],
        },
        {
          role: 'tool',
          toolCallId: 'tc1',
          name: 'shot',
          content: 'captured',
          attachments: [{ kind: 'image', name: 's', dataUrl }],
        },
      ],
      { supportsVision: true } as any,
    ).messages;
    const userTurn = findRecord(
      out,
      (m) =>
        m.role === 'user' &&
        Array.isArray(m.content) &&
        (m.content as unknown[]).some((b) => isRecord(b) && b.type === 'tool_result'),
    );
    const toolResult = findContentBlock(contentParts(userTurn), 'tool_result');
    expect(Array.isArray(toolResult.content)).toBe(true);
    const toolResultContent = contentParts(toolResult);
    const img = findContentBlock(toolResultContent, 'image');
    expect(img.source).toEqual({ type: 'base64', media_type: 'image/png', data: 'AAA' });
    const text = findContentBlock(toolResultContent, 'text');
    expect(text.text).toBe('captured');
  });

  it('keeps tool_result content as a bare string when no image (no regression)', () => {
    const out = toAnthropicInput(
      [
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc1', name: 'shot', input: {} }],
        },
        { role: 'tool', toolCallId: 'tc1', name: 'shot', content: 'captured' },
      ],
      { supportsVision: true } as any,
    ).messages;
    const userTurn = findRecord(
      out,
      (m) =>
        m.role === 'user' &&
        Array.isArray(m.content) &&
        (m.content as unknown[]).some((b) => isRecord(b) && b.type === 'tool_result'),
    );
    const toolResult = findContentBlock(contentParts(userTurn), 'tool_result');
    expect(toolResult.content).toBe('captured');
  });

  it('keeps tool_result content as a bare string when model lacks vision', () => {
    const out = toAnthropicInput(
      [
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc1', name: 'shot', input: {} }],
        },
        {
          role: 'tool',
          toolCallId: 'tc1',
          name: 'shot',
          content: 'captured',
          attachments: [{ kind: 'image', name: 's', dataUrl }],
        },
      ],
      { supportsVision: false } as any,
    ).messages;
    const userTurn = findRecord(
      out,
      (m) =>
        m.role === 'user' &&
        Array.isArray(m.content) &&
        (m.content as unknown[]).some((b) => isRecord(b) && b.type === 'tool_result'),
    );
    const toolResult = findContentBlock(contentParts(userTurn), 'tool_result');
    expect(toolResult.content).toBe('captured');
  });
});

describe('openai responses images', () => {
  it('emits input_image on a user message with an image attachment (vision model)', () => {
    const out = toOpenAIInput(
      [{ role: 'user', content: 'look', attachments: [{ kind: 'image', name: 's', dataUrl }] }],
      { supportsVision: true } as any,
    );
    const user = findRecord(out, (m) => m.role === 'user');
    expect(Array.isArray(user.content)).toBe(true);
    const content = contentParts(user);
    const img = findContentBlock(content, 'input_image');
    expect(img.image_url).toBe(dataUrl);
    const text = findContentBlock(content, 'input_text');
    expect(text.text).toBe('look');
  });

  it('keeps user content as a string when model lacks vision', () => {
    const out = toOpenAIInput(
      [{ role: 'user', content: 'look', attachments: [{ kind: 'image', name: 's', dataUrl }] }],
      { supportsVision: false } as any,
    );
    const user = findRecord(out, (m) => m.role === 'user');
    expect(typeof user.content).toBe('string');
    expect(user.content).toBe('look');
  });

  it('emits a follow-on user input_image item after the function_call_output (vision model)', () => {
    const out = toOpenAIInput(
      [
        {
          role: 'tool',
          toolCallId: 'tc1',
          name: 'shot',
          content: 'captured',
          attachments: [{ kind: 'image', name: 's', dataUrl }],
        },
      ],
      { supportsVision: true } as any,
    );
    const outputIdx = out.findIndex((m: any) => m.type === 'function_call_output');
    expect(outputIdx).toBeGreaterThanOrEqual(0);
    expect((out[outputIdx] as any).output).toBe('captured');
    const followOn = expectRecord(out[outputIdx + 1]);
    expect(followOn.role).toBe('user');
    expect(Array.isArray(followOn.content)).toBe(true);
    const img = findContentBlock(contentParts(followOn), 'input_image');
    expect(img.image_url).toBe(dataUrl);
  });

  it('does not emit a follow-on item for a tool message without images (no regression)', () => {
    const out = toOpenAIInput([{ role: 'tool', toolCallId: 'tc1', name: 'shot', content: 'captured' }], {
      supportsVision: true,
    } as any);
    expect(out).toHaveLength(1);
    expect((out[0] as any).type).toBe('function_call_output');
  });

  it('does not emit a follow-on item when model lacks vision', () => {
    const out = toOpenAIInput(
      [
        {
          role: 'tool',
          toolCallId: 'tc1',
          name: 'shot',
          content: 'captured',
          attachments: [{ kind: 'image', name: 's', dataUrl }],
        },
      ],
      { supportsVision: false } as any,
    );
    expect(out).toHaveLength(1);
    expect((out[0] as any).type).toBe('function_call_output');
  });
});

describe('openai chat images', () => {
  it('emits image_url on a user message with an image attachment (vision model)', () => {
    const out = toChatMessages(
      [{ role: 'user', content: 'look', attachments: [{ kind: 'image', name: 's', dataUrl }] }],
      { supportsVision: true } as any,
    );
    const user = findRecord(out, (m) => m.role === 'user');
    expect(Array.isArray(user.content)).toBe(true);
    const content = contentParts(user);
    const img = findContentBlock(content, 'image_url');
    expect(img.image_url).toEqual({ url: dataUrl });
    const text = findContentBlock(content, 'text');
    expect(text.text).toContain('look');
  });

  it('keeps user content as a string when model lacks vision', () => {
    const out = toChatMessages(
      [{ role: 'user', content: 'look', attachments: [{ kind: 'image', name: 's', dataUrl }] }],
      { supportsVision: false } as any,
    );
    const user = findRecord(out, (m) => m.role === 'user');
    expect(typeof user.content).toBe('string');
    expect(user.content).toContain('look');
  });

  it('respects the image budget (max 3, most-recent wins) on a user message', () => {
    const attachments = Array.from({ length: 5 }, (_, i) => ({
      kind: 'image' as const,
      name: `n${i}`,
      dataUrl: `data:image/png;base64,A${i}`,
    }));
    const out = toChatMessages([{ role: 'user', content: 'look', attachments }], { supportsVision: true } as any);
    const user = findRecord(out, (m) => m.role === 'user');
    const imgs = contentParts(user).filter((b) => b.type === 'image_url');
    expect(imgs).toHaveLength(3);
    expect(imgs[imgs.length - 1].image_url).toEqual({ url: 'data:image/png;base64,A4' });
  });

  it('keeps the tool message text-only and emits a follow-on user image_url item (vision model)', () => {
    // The Chat Completions API rejects image content parts on a role:"tool" message
    // (ChatCompletionToolMessageParam.content is string | ChatCompletionContentPartText[]).
    // The screenshot must therefore arrive as a follow-on synthetic user message.
    const out = toChatMessages(
      [
        {
          role: 'tool',
          toolCallId: 'tc1',
          name: 'shot',
          content: 'captured',
          attachments: [{ kind: 'image', name: 's', dataUrl }],
        },
      ],
      { supportsVision: true } as any,
    );
    const toolIdx = out.findIndex((m: any) => m.role === 'tool');
    expect(toolIdx).toBeGreaterThanOrEqual(0);
    const tool = expectRecord(out[toolIdx]);
    // Tool message content stays text-only (string) — no image part inlined.
    expect(tool.content).toBe('captured');
    expect(Array.isArray(tool.content)).toBe(false);
    // Follow-on user message carries the image_url.
    const followOn = expectRecord(out[toolIdx + 1]);
    expect(followOn.role).toBe('user');
    expect(Array.isArray(followOn.content)).toBe(true);
    const img = findContentBlock(contentParts(followOn), 'image_url');
    expect(img.image_url).toEqual({ url: dataUrl });
  });

  it('does not emit a follow-on item for a tool message without images (no regression)', () => {
    const out = toChatMessages([{ role: 'tool', toolCallId: 'tc1', name: 'shot', content: 'captured' }], {
      supportsVision: true,
    } as any);
    expect(out).toHaveLength(1);
    const tool = expectRecord(out[0]);
    expect(tool.role).toBe('tool');
    expect(tool.content).toBe('captured');
  });

  it('does not emit a follow-on item when model lacks vision', () => {
    const out = toChatMessages(
      [
        {
          role: 'tool',
          toolCallId: 'tc1',
          name: 'shot',
          content: 'captured',
          attachments: [{ kind: 'image', name: 's', dataUrl }],
        },
      ],
      { supportsVision: false } as any,
    );
    expect(out).toHaveLength(1);
    const tool = expectRecord(out[0]);
    expect(tool.role).toBe('tool');
    expect(tool.content).toBe('captured');
  });
});
