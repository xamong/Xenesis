import type { AgentMessage, AgentMessageAttachment } from '../core/messages.js';

type UserAgentMessage = Extract<AgentMessage, { role: 'user' }>;

function formatAttachmentSize(size: number | undefined) {
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) return undefined;
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function previewText(text: string, maxLength = 2000) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function parseDataUrl(dataUrl?: string) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(String(dataUrl ?? ''));
  if (!match || !match[2]) return undefined;
  return {
    mediaType: match[1] || 'application/octet-stream',
    base64: match[3],
  };
}

const SUPPORTED_IMAGE_MIME_RE = /^(?:image\/png|image\/jpe?g|image\/gif|image\/webp)$/i;

/**
 * Single source of truth for the provider-supported image MIME allowlist.
 * Shared by multimodal data-url gating and MCP content splitting so the policy
 * cannot drift between the two call sites.
 */
export function isSupportedImageMime(mimeType: string): boolean {
  return SUPPORTED_IMAGE_MIME_RE.test(mimeType);
}

function isProviderSupportedImageDataUrl(dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return false;
  return isSupportedImageMime(parsed.mediaType);
}

export function imageDataUrlAttachments(attachments?: readonly AgentMessageAttachment[]) {
  return (attachments ?? []).filter(
    (attachment) =>
      attachment.kind === 'image' &&
      typeof attachment.dataUrl === 'string' &&
      isProviderSupportedImageDataUrl(attachment.dataUrl),
  );
}

export function attachmentsTextSummary(attachments?: readonly AgentMessageAttachment[]) {
  if (!attachments || attachments.length === 0) return '';
  const lines = ['Attached files:'];
  for (const [index, attachment] of attachments.entries()) {
    const details = [
      attachment.kind,
      attachment.mimeType,
      formatAttachmentSize(attachment.size),
      attachment.path ? `path=${attachment.path}` : undefined,
    ]
      .filter(Boolean)
      .join(', ');
    lines.push(`${index + 1}. ${attachment.name}${details ? ` (${details})` : ''}`);
    if (attachment.text) {
      lines.push('```text');
      lines.push(previewText(attachment.text));
      lines.push('```');
    }
  }
  return lines.join('\n');
}

export function userContentWithAttachmentSummary(message: UserAgentMessage) {
  const summary = attachmentsTextSummary(message.attachments);
  return summary ? `${message.content}\n\n${summary}` : message.content;
}

export const MAX_IMAGES_PER_REQUEST = 3;
export const MAX_IMAGE_BYTES = 1_500_000;

export interface ImageBlock {
  mediaType: string;
  base64: string;
  dataUrl: string;
  name?: string;
}

export function imageBlocksFor(
  attachments?: readonly AgentMessageAttachment[],
  opts?: { max?: number; maxBytes?: number },
): ImageBlock[] {
  const max = opts?.max ?? MAX_IMAGES_PER_REQUEST;
  const maxBytes = opts?.maxBytes ?? MAX_IMAGE_BYTES;
  const blocks: ImageBlock[] = [];
  for (const a of imageDataUrlAttachments(attachments)) {
    const parsed = parseDataUrl(a.dataUrl);
    if (!parsed) continue;
    if (parsed.base64.length > maxBytes) continue; // oversize → drop (caller may add a text note)
    blocks.push({ mediaType: parsed.mediaType, base64: parsed.base64, dataUrl: a.dataUrl as string, name: a.name });
  }
  return blocks.length > max ? blocks.slice(blocks.length - max) : blocks; // most-recent wins
}
