import type { AgentMessage, AgentMessageAttachment } from '../../messages.js';

function hasImage(message: AgentMessage): boolean {
  const attachments = (message as { attachments?: AgentMessageAttachment[] }).attachments;
  return Array.isArray(attachments) && attachments.some((a) => a.kind === 'image');
}

/**
 * Remove base64 image attachments from messages outside the recent keep-window,
 * except the single most-recent image-bearing turn (always retained). Replaces each
 * removed image with a "[image omitted: <name>]" note appended to content.
 * Returns a NEW array; clones only edited messages; never mutates inputs.
 */
export function stripStaleImageAttachments(
  messages: AgentMessage[],
  opts: { keepRecentTurns: number },
): AgentMessage[] {
  let lastImageIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (hasImage(messages[i]!)) {
      lastImageIndex = i;
      break;
    }
  }
  if (lastImageIndex === -1) return messages; // no images, fast path

  const windowStart = Math.max(0, messages.length - Math.max(0, opts.keepRecentTurns));

  return messages.map((message, index) => {
    if (!hasImage(message)) return message;
    if (index >= windowStart || index === lastImageIndex) return message; // keep
    const attachments = (message as { attachments?: AgentMessageAttachment[] }).attachments ?? [];
    const keptAttachments = attachments.filter((a) => a.kind !== 'image');
    const removed = attachments.filter((a) => a.kind === 'image');
    const notes = removed.map((a) => `[image omitted: ${a.name ?? 'image'}]`).join(' ');
    const baseContent = (message as { content?: string }).content ?? '';
    const content = baseContent ? `${baseContent}\n${notes}` : notes;
    const next: AgentMessage = { ...(message as AgentMessage), content } as AgentMessage;
    if (keptAttachments.length > 0) {
      (next as { attachments?: AgentMessageAttachment[] }).attachments = keptAttachments;
    } else {
      delete (next as { attachments?: AgentMessageAttachment[] }).attachments;
    }
    return next;
  });
}
