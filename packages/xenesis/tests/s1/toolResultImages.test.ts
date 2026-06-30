import { describe, expect, it } from 'vitest';
import type { LedgerEntry } from '../../src/core/messages/messageTypes.js';
import { toAgentMessage } from '../../src/core/messages/providerMessageMapper.js';

const dataUrl = 'data:image/png;base64,AAA';

describe('tool-result attachment plumbing', () => {
  it('emits a tool message carrying attachments from a tool_result ledger entry', () => {
    const entry: LedgerEntry = {
      kind: 'tool_result',
      id: 'run:tool_result:call_1',
      toolCallId: 'call_1',
      name: 'screenshot',
      content: 'captured',
      attachments: [{ kind: 'image', name: 'screenshot', dataUrl }],
    };
    const message = toAgentMessage(entry);
    expect(message).toBeDefined();
    expect(message!.role).toBe('tool');
    const tool = message as Extract<typeof message, { role: 'tool' }>;
    expect(tool.content).toBe('captured');
    expect(tool.attachments).toEqual([{ kind: 'image', name: 'screenshot', dataUrl }]);
  });

  it('omits attachments when the tool_result entry has none', () => {
    const entry: LedgerEntry = {
      kind: 'tool_result',
      id: 'run:tool_result:call_2',
      toolCallId: 'call_2',
      name: 'read',
      content: 'text only',
    };
    const message = toAgentMessage(entry);
    const tool = message as Extract<typeof message, { role: 'tool' }>;
    expect(tool.attachments).toBeUndefined();
  });
});
