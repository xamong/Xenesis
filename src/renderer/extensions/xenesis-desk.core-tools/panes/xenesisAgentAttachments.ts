export type XenesisAgentAttachmentKind = 'image' | 'file';

export interface XenesisAgentAttachment {
  id: string;
  kind: XenesisAgentAttachmentKind;
  name: string;
  size: number;
  type?: string;
  path?: string;
  lastModified?: number;
  previewText?: string;
  dataUrl?: string;
}

export interface XenesisProviderAttachment {
  kind: XenesisAgentAttachmentKind;
  name: string;
  mimeType?: string;
  size?: number;
  path?: string;
  dataUrl?: string;
  text?: string;
}

export interface XenesisAttachmentLikeFile {
  name: string;
  type?: string;
  size?: number;
}

const IMAGE_EXTENSION_PATTERN = /\.(?:apng|avif|bmp|gif|jpe?g|png|svg|webp)$/i;
const MAX_PROMPT_PREVIEW_CHARS = 4000;

export function classifyXenesisAttachment(file: XenesisAttachmentLikeFile): XenesisAgentAttachmentKind {
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (IMAGE_EXTENSION_PATTERN.test(file.name || '')) return 'image';
  return 'file';
}

export function formatXenesisAttachmentSize(bytes: number): string {
  const value = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (value < 1024) return `${Math.round(value)} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${formatOneDecimal(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${formatOneDecimal(mb)} MB`;
  return `${formatOneDecimal(mb / 1024)} GB`;
}

function formatOneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function attachmentIdentity(attachment: XenesisAgentAttachment): string {
  const path = attachment.path?.trim().toLowerCase();
  if (path) return `path:${path}`;
  return ['file', attachment.name.trim().toLowerCase(), attachment.size, attachment.lastModified ?? ''].join(':');
}

export function dedupeXenesisAttachments(
  existing: XenesisAgentAttachment[],
  incoming: XenesisAgentAttachment[],
): XenesisAgentAttachment[] {
  const seen = new Set<string>();
  const output: XenesisAgentAttachment[] = [];
  for (const attachment of [...existing, ...incoming]) {
    const key = attachmentIdentity(attachment);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(attachment);
  }
  return output;
}

export function buildXenesisAttachmentPromptContext(attachments: XenesisAgentAttachment[]): string {
  const normalized = attachments.filter((attachment) => attachment.name.trim());
  if (normalized.length === 0) return '';

  const lines = [
    'Attached files:',
    'Use these user-provided attachments as context. If a path is available, you may refer to it as the source location. Do not invent file contents beyond the included preview.',
  ];

  normalized.forEach((attachment, index) => {
    const type = attachment.type?.trim() || 'unknown type';
    lines.push(
      `${index + 1}. [${attachment.kind}] ${attachment.name} (${type}, ${formatXenesisAttachmentSize(attachment.size)})`,
    );
    if (attachment.path?.trim()) {
      lines.push(`   path: ${attachment.path.trim()}`);
    }
    if (attachment.previewText?.trim()) {
      lines.push('   preview:');
      lines.push(limitPreviewText(attachment.previewText));
    }
  });

  return lines.join('\n');
}

export function appendXenesisAttachmentPromptContext(prompt: string, attachments: XenesisAgentAttachment[]): string {
  const context = buildXenesisAttachmentPromptContext(attachments);
  if (!context) return prompt;
  return `${context}\n\nUser request:\n${prompt}`;
}

export function toXenesisProviderAttachments(
  attachments: readonly XenesisAgentAttachment[],
): XenesisProviderAttachment[] {
  return attachments
    .filter((attachment) => attachment.name.trim())
    .map((attachment) => ({
      kind: attachment.kind,
      name: attachment.name,
      ...(attachment.type ? { mimeType: attachment.type } : {}),
      size: attachment.size,
      ...(attachment.path ? { path: attachment.path } : {}),
      ...(attachment.dataUrl ? { dataUrl: attachment.dataUrl } : {}),
      ...(attachment.previewText ? { text: attachment.previewText } : {}),
    }));
}

function limitPreviewText(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (normalized.length <= MAX_PROMPT_PREVIEW_CHARS) return normalized;
  return `${normalized.slice(0, MAX_PROMPT_PREVIEW_CHARS)}\n[truncated ${normalized.length - MAX_PROMPT_PREVIEW_CHARS} chars]`;
}
