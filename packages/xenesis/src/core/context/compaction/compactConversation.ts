import type { AgentMessage } from '../../messages.js';

type SystemMessage = Extract<AgentMessage, { role: 'system' }>;
type AssistantMessage = Extract<AgentMessage, { role: 'assistant' }>;
type ToolMessage = Extract<AgentMessage, { role: 'tool' }>;

export interface CompactionInput {
  messages: AgentMessage[];
  keepRecentTokens: number;
  summarize: (older: AgentMessage[]) => Promise<string>;
  estimateTokens: (messages: AgentMessage[]) => number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  /** Optional deterministic prune pass applied to the older slice before summarizing. */
  pruneOlder?: (older: AgentMessage[]) => AgentMessage[];
}

export interface CompactionResult {
  messages: AgentMessage[];
  savedRatio: number;
  summarized: boolean;
  /** The summary text produced by the summarizer, if summarization occurred. */
  summary?: string;
}

const DEFAULT_TIMEOUT_MS = 180_000;

function cloneMessage(message: AgentMessage): AgentMessage {
  return { ...message };
}

function toolResultCallIds(messages: readonly AgentMessage[]) {
  return new Set(
    messages.filter((message): message is ToolMessage => message.role === 'tool').map((message) => message.toolCallId),
  );
}

function assistantToolCallIds(messages: readonly AgentMessage[]) {
  const ids = new Set<string>();
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const toolCall of message.toolCalls ?? []) ids.add(toolCall.id);
  }
  return ids;
}

function missingToolCallIds(messages: readonly AgentMessage[]) {
  const resultIds = toolResultCallIds(messages);
  const callIds = assistantToolCallIds(messages);
  return Array.from(resultIds).filter((id) => !callIds.has(id));
}

function findAssistantIndexForToolCalls(
  messages: readonly AgentMessage[],
  beforeIndex: number,
  toolCallIds: readonly string[],
) {
  const missing = new Set(toolCallIds);
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== 'assistant') continue;
    if ((message.toolCalls ?? []).some((toolCall) => missing.has(toolCall.id))) return index;
  }
  return -1;
}

function dropOrphanToolResults(messages: readonly AgentMessage[]) {
  const callIds = assistantToolCallIds(messages);
  return messages.filter((message) => message.role !== 'tool' || callIds.has(message.toolCallId));
}

function compactMessagePartsByTokens(
  historyMessages: readonly AgentMessage[],
  keepRecentTokens: number,
  estimateTokens: (messages: AgentMessage[]) => number,
) {
  let splitIndex = historyMessages.length;
  let tokens = 0;
  while (splitIndex > 0) {
    const previous = historyMessages[splitIndex - 1]!;
    const previousTokens = estimateTokens([previous]);
    if (tokens > 0 && tokens + previousTokens > keepRecentTokens) break;
    tokens += previousTokens;
    splitIndex -= 1;
  }

  while (splitIndex > 0) {
    const missingIds = missingToolCallIds(historyMessages.slice(splitIndex));
    if (missingIds.length === 0) break;
    const assistantIndex = findAssistantIndexForToolCalls(historyMessages, splitIndex, missingIds);
    if (assistantIndex === -1) break;
    splitIndex = assistantIndex;
  }

  return {
    olderMessages: historyMessages.slice(0, splitIndex).map(cloneMessage),
    recentMessages: dropOrphanToolResults(historyMessages.slice(splitIndex)).map(cloneMessage),
  };
}

function summarizeLine(message: AgentMessage, index: number) {
  if (message.role === 'tool') return `${index + 1}. tool ${message.name}: ${message.content}`;
  return `${index + 1}. ${message.role}: ${message.content}`;
}

function fallbackSummary(messages: readonly AgentMessage[]) {
  return messages.map((message, index) => summarizeLine(message, index)).join('\n');
}

function summaryMessage(summary: string): SystemMessage {
  return {
    role: 'system',
    content: [
      'Xenesis compacted session context:',
      '[REFERENCE ONLY — respond only to the latest user message after this summary. Topic overlap with this summary does NOT mean resume its task.]',
      '',
      summary.trim(),
      '',
      '--- END OF CONTEXT SUMMARY ---',
      'Recent messages are preserved after this summary.',
    ].join('\n'),
  };
}

function isThinkingBlock(value: unknown) {
  return (
    typeof value === 'object' && value !== null && 'type' in value && (value as { type?: unknown }).type === 'thinking'
  );
}

function stripAssistantThinkingSignature(message: AssistantMessage): AssistantMessage {
  const content = message.providerMetadata?.anthropic?.content;
  if (!content) return cloneMessage(message) as AssistantMessage;
  const nextContent = content.filter((block) => !isThinkingBlock(block));
  if (nextContent.length === content.length) return cloneMessage(message) as AssistantMessage;

  return {
    ...message,
    providerMetadata: {
      ...message.providerMetadata,
      anthropic: {
        ...message.providerMetadata?.anthropic,
        content: nextContent,
      },
    },
  };
}

export function stripAnthropicThinkingSignatures(messages: AgentMessage[]): AgentMessage[] {
  return messages.map((message) =>
    message.role === 'assistant' ? stripAssistantThinkingSignature(message) : cloneMessage(message),
  );
}

async function withTimeout<T>(task: () => Promise<T>, timeoutMs: number, abortSignal?: AbortSignal): Promise<T> {
  if (abortSignal?.aborted) throw new Error('Compaction aborted.');

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;
  try {
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Compaction timed out.')), timeoutMs);
        abortHandler = () => reject(new Error('Compaction aborted.'));
        abortSignal?.addEventListener('abort', abortHandler, { once: true });
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (abortHandler) abortSignal?.removeEventListener('abort', abortHandler);
  }
}

function savedRatio(beforeTokens: number, afterTokens: number) {
  if (beforeTokens <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - afterTokens / beforeTokens));
}

export async function compactConversation(input: CompactionInput): Promise<CompactionResult> {
  const beforeTokens = input.estimateTokens(input.messages);
  const { olderMessages, recentMessages } = compactMessagePartsByTokens(
    input.messages,
    Math.max(0, input.keepRecentTokens),
    input.estimateTokens,
  );
  const retained = stripAnthropicThinkingSignatures(recentMessages);

  if (olderMessages.length === 0) {
    return {
      messages: retained,
      savedRatio: 0,
      summarized: false,
    };
  }

  const olderForSummary = input.pruneOlder ? input.pruneOlder(olderMessages) : olderMessages;

  let summary: string;
  try {
    summary = await withTimeout(
      () => input.summarize(olderForSummary),
      input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      input.abortSignal,
    );
  } catch {
    summary = fallbackSummary(olderForSummary);
  }

  const messages = [summaryMessage(summary), ...retained];
  return {
    messages,
    savedRatio: savedRatio(beforeTokens, input.estimateTokens(messages)),
    summarized: true,
    summary,
  };
}

export function shouldThrash(recentSavedRatios: number[]) {
  if (recentSavedRatios.length < 2) return false;
  const recent = recentSavedRatios.slice(-2);
  return recent.every((ratio) => ratio < 0.1);
}
