import type { ApprovalRequest, SessionEvent } from '../events.js';

export function durableApprovalPendingEvent(request: ApprovalRequest): SessionEvent {
  return { type: 'durable_approval_pending', request };
}

export function durableApprovalResolvedEvent(toolCallId: string, approved: boolean): SessionEvent {
  return { type: 'durable_approval_resolved', toolCallId, approved };
}

export function findPendingDurableApproval(events: readonly SessionEvent[]): ApprovalRequest | undefined {
  const laterResolved = new Set<string>();

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === 'durable_approval_resolved') {
      laterResolved.add(event.toolCallId);
      continue;
    }
    if (event.type !== 'durable_approval_pending') continue;
    if (laterResolved.has(event.request.toolCallId)) continue;
    return event.request;
  }
  return undefined;
}
