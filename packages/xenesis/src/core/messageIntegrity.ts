import type { AgentMessage } from './messages.js';

function toolResultIds(messages: readonly AgentMessage[]): string[] {
  return messages
    .filter((message): message is Extract<AgentMessage, { role: 'tool' }> => message.role === 'tool')
    .map((message) => message.toolCallId);
}

export function assistantToolCallIds(messages: readonly AgentMessage[]): Set<string> {
  const ids = new Set<string>();
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const toolCall of message.toolCalls ?? []) {
      ids.add(toolCall.id);
    }
  }
  return ids;
}

export function unresolvedToolCallIds(messages: readonly AgentMessage[]): string[] {
  const resolved = new Set(toolResultIds(messages));
  const unresolved: string[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const toolCall of message.toolCalls ?? []) {
      if (!resolved.has(toolCall.id)) unresolved.push(toolCall.id);
    }
  }
  return unresolved;
}

export function orphanToolResultIds(messages: readonly AgentMessage[]): string[] {
  const knownToolCallIds = new Set<string>();
  const consumedToolCallIds = new Set<string>();
  const orphans: string[] = [];

  for (const message of messages) {
    if (message.role === 'assistant') {
      for (const toolCall of message.toolCalls ?? []) {
        knownToolCallIds.add(toolCall.id);
      }
      continue;
    }

    if (message.role !== 'tool') continue;

    if (!knownToolCallIds.has(message.toolCallId) || consumedToolCallIds.has(message.toolCallId)) {
      orphans.push(message.toolCallId);
      continue;
    }

    consumedToolCallIds.add(message.toolCallId);
  }

  return orphans;
}

export function assertProviderMessagesReady(messages: readonly AgentMessage[]): void {
  const unresolved = unresolvedToolCallIds(messages);
  if (unresolved.length > 0) {
    throw new Error(`Provider request contains unresolved tool calls: ${unresolved.join(', ')}`);
  }

  const orphans = orphanToolResultIds(messages);
  if (orphans.length > 0) {
    throw new Error(`Provider request contains orphan tool results: ${orphans.join(', ')}`);
  }
}
