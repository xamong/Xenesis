import {
  XENESIS_CONTEXT_MESSAGE_LIMIT,
  XENESIS_CONTEXT_MESSAGE_MAX_CHARS,
  type XenesisChatMessage,
} from './xenesisAgentTypes';

export interface XenesisAgentHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface BuildXenesisAgentHistoryMessagesOptions {
  currentPrompt?: string;
  limit?: number;
  maxCharsPerMessage?: number;
}

function normalizeContent(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+$/g, '').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function shouldKeepHistoryMessage(message: XenesisChatMessage): boolean {
  if (message.streaming) return false;
  if (message.error) return false;
  if (message.role !== 'user' && message.role !== 'assistant') return false;
  return Boolean(message.content.trim());
}

export function buildXenesisAgentHistoryMessages(
  newestFirstMessages: XenesisChatMessage[],
  options: BuildXenesisAgentHistoryMessagesOptions = {},
): XenesisAgentHistoryMessage[] {
  const limit = Math.max(1, options.limit ?? XENESIS_CONTEXT_MESSAGE_LIMIT);
  const maxCharsPerMessage = Math.max(120, options.maxCharsPerMessage ?? XENESIS_CONTEXT_MESSAGE_MAX_CHARS);
  const currentPrompt = options.currentPrompt?.trim();
  const chronological = newestFirstMessages.filter(shouldKeepHistoryMessage).reverse();
  const history: XenesisAgentHistoryMessage[] = [];

  for (const message of chronological) {
    const content = normalizeContent(message.content, maxCharsPerMessage);
    if (!content) continue;
    if (
      currentPrompt &&
      message.role === 'user' &&
      content === currentPrompt &&
      history.length === chronological.length - 1
    ) {
      continue;
    }
    history.push({ role: message.role, content });
  }

  return history.slice(Math.max(0, history.length - limit));
}
