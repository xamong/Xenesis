import type { XenesisChatMessage } from './xenesisAgentTypes';

export interface XenesisMarkdownSaveDraftInput {
  messages: XenesisChatMessage[];
  requestText: string;
  now?: Date;
}

export interface XenesisMarkdownSaveDraft {
  fileName: string;
  content: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function safeTimestamp(now = new Date()): string {
  return [
    now.getUTCFullYear(),
    pad2(now.getUTCMonth() + 1),
    pad2(now.getUTCDate()),
    '-',
    pad2(now.getUTCHours()),
    pad2(now.getUTCMinutes()),
    pad2(now.getUTCSeconds()),
  ].join('');
}

function cleanMarkdownText(value: string): string {
  return String(value || '')
    .replace(/```xcon-[\s\S]*?```/gi, '')
    .replace(/```sketch[\s\S]*?```/gi, '')
    .replace(/^XCON artifact:[^\n]*(?:\n|$)/gim, '')
    .replace(/^Opened a Gowoori pane[^\n]*(?:\n|$)/gim, '')
    .replace(/^Sent the artifact[^\n]*(?:\n|$)/gim, '')
    .replace(/^Rendered inside Xenesis Agent[^\n]*(?:\n|$)/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chronologicalMessages(messages: XenesisChatMessage[]): XenesisChatMessage[] {
  return [...messages].filter((message) => message.content.trim() && !message.streaming).reverse();
}

function mostRelevantAssistantText(messages: XenesisChatMessage[]): string {
  const assistant = messages.find(
    (message) => message.role === 'assistant' && !message.error && cleanMarkdownText(message.content),
  );
  return assistant ? cleanMarkdownText(assistant.content) : '';
}

export function buildXenesisMarkdownSaveDraft(input: XenesisMarkdownSaveDraftInput): XenesisMarkdownSaveDraft {
  const now = input.now || new Date();
  const fileName = `xenesis-agent-markdown-${safeTimestamp(now)}.md`;
  const recent = chronologicalMessages(input.messages).slice(-12);
  const assistantText = mostRelevantAssistantText(input.messages);
  const transcript = recent
    .map((message) => {
      const text = cleanMarkdownText(message.content);
      if (!text) return '';
      const label = message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Xenesis Agent' : 'System';
      return `## ${label}\n\n${text}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const content = [
    '# Xenesis Agent Markdown Export',
    '',
    `- Created: ${now.toISOString()}`,
    `- Save request: ${input.requestText.trim() || 'markdown file save'}`,
    '',
    assistantText ? '## Current Draft' : '',
    assistantText,
    transcript ? '## Conversation Context' : '',
    transcript,
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    fileName,
    content: content.endsWith('\n') ? content : `${content}\n`,
  };
}

function trimTrailingSeparators(value: string): string {
  return value.replace(/[\\/]+$/, '');
}

function sanitizeFileName(value: string): string {
  const base = String(value || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .trim();
  return base || 'xenesis-agent-markdown.md';
}

export function resolveXenesisMarkdownSavePath(workspace: string, fileName: string): string {
  const root = trimTrailingSeparators(String(workspace || '').trim());
  const safeName = sanitizeFileName(fileName);
  if (!root) return safeName;
  const separator = root.includes('\\') ? '\\' : '/';
  return `${root}${separator}exports${separator}${safeName}`;
}
