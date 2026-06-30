import { describe, expect, it } from 'vitest';
import {
  assertProviderMessagesReady,
  assistantToolCallIds,
  orphanToolResultIds,
  unresolvedToolCallIds,
} from '../../src/core/messageIntegrity.js';
import type { AgentMessage } from '../../src/core/messages.js';
import { repairToolResultPairing, SYNTHETIC_TOOL_RESULT_PLACEHOLDER } from '../../src/core/messages.js';

function userMessage(content = 'run echo'): AgentMessage {
  return { role: 'user', content };
}

function assistantToolCall(id = 'call-1'): AgentMessage {
  return {
    role: 'assistant',
    content: '',
    toolCalls: [{ id, name: 'echo', input: { value: 'hello' } }],
  };
}

function toolResult(id = 'call-1', content = 'ok'): AgentMessage {
  return {
    role: 'tool',
    toolCallId: id,
    name: 'echo',
    content,
  };
}

describe('message integrity helpers', () => {
  it('collects assistant tool call ids', () => {
    const ids = assistantToolCallIds([userMessage(), assistantToolCall('call-a'), assistantToolCall('call-b')]);

    expect([...ids]).toEqual(['call-a', 'call-b']);
  });

  it('detects unresolved assistant tool calls', () => {
    const messages = [userMessage(), assistantToolCall('missing-result')];

    expect(unresolvedToolCallIds(messages)).toEqual(['missing-result']);
    expect(() => assertProviderMessagesReady(messages)).toThrow(
      'Provider request contains unresolved tool calls: missing-result',
    );
  });

  it('detects orphan tool results', () => {
    const messages = [userMessage(), toolResult('missing-call')];

    expect(orphanToolResultIds(messages)).toEqual(['missing-call']);
    expect(() => assertProviderMessagesReady(messages)).toThrow(
      'Provider request contains orphan tool results: missing-call',
    );
  });

  it('accepts paired assistant tool calls and tool results', () => {
    const messages = [userMessage(), assistantToolCall('call-1'), toolResult('call-1')];

    expect(unresolvedToolCallIds(messages)).toEqual([]);
    expect(orphanToolResultIds(messages)).toEqual([]);
    expect(() => assertProviderMessagesReady(messages)).not.toThrow();
  });

  it('treats repaired histories as provider-ready', () => {
    const repaired = repairToolResultPairing([
      userMessage(),
      toolResult('orphan-call', 'orphan'),
      assistantToolCall('call-1'),
    ]);

    const synthesized = repaired.find(
      (message): message is Extract<AgentMessage, { role: 'tool' }> =>
        message.role === 'tool' && message.toolCallId === 'call-1',
    );

    expect(synthesized).toBeDefined();
    expect(synthesized!.content).toBe(SYNTHETIC_TOOL_RESULT_PLACEHOLDER);
    expect(orphanToolResultIds(repaired)).toEqual([]);
    expect(unresolvedToolCallIds(repaired)).toEqual([]);
    expect(() => assertProviderMessagesReady(repaired)).not.toThrow();
  });
});
