import type { AgentMessage } from '../messages.js';
import { repairToolResultPairing } from '../messages.js';
import type { LedgerEntry } from './messageTypes.js';

export interface ProviderMessageMapperOptions {
  repair?: boolean;
}

export function toAgentMessage(entry: LedgerEntry): AgentMessage | undefined {
  if (entry.kind === 'user_message') return { role: 'user', content: entry.content };
  if (entry.kind === 'assistant_message') {
    return {
      role: 'assistant',
      content: entry.content,
      ...(entry.toolCalls && entry.toolCalls.length > 0 ? { toolCalls: entry.toolCalls } : {}),
    };
  }
  if (entry.kind === 'tool_result') {
    return {
      role: 'tool',
      toolCallId: entry.toolCallId,
      name: entry.name,
      content: entry.content,
      ...(entry.attachments && entry.attachments.length > 0 ? { attachments: entry.attachments } : {}),
    };
  }
  if (entry.kind === 'recovery_overlay') return { role: 'user', content: entry.content };
  return undefined;
}

export function providerMessagesFromLedger(
  entries: readonly LedgerEntry[],
  options: ProviderMessageMapperOptions = {},
): AgentMessage[] {
  const messages = entries.flatMap((entry) => {
    const message = toAgentMessage(entry);
    return message ? [message] : [];
  });
  return options.repair ? repairToolResultPairing(messages) : messages;
}
