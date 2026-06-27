import type { McpBridgeActionInboxItem } from '../../../../shared/types';

export type XenesisMcpActionInboxStatus = 'pending' | 'running' | 'approved' | 'rejected' | 'failed' | 'expired';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMcpActionInboxStatus(value: unknown): value is McpBridgeActionInboxItem['status'] {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'failed' || value === 'expired';
}

export function isMcpBridgeActionInboxItem(value: unknown): value is McpBridgeActionInboxItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    Boolean(value.id.trim()) &&
    typeof value.title === 'string' &&
    typeof value.kind === 'string' &&
    typeof value.command === 'string' &&
    isMcpActionInboxStatus(value.status)
  );
}

function collectActionInboxItemsInternal(
  value: unknown,
  items: McpBridgeActionInboxItem[],
  seenIds: Set<string>,
  seenObjects: WeakSet<object>,
  depth: number,
): void {
  if (depth > 8 || value === null || value === undefined) return;
  if (isMcpBridgeActionInboxItem(value)) {
    if (!seenIds.has(value.id)) {
      seenIds.add(value.id);
      items.push(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectActionInboxItemsInternal(entry, items, seenIds, seenObjects, depth + 1);
    return;
  }
  if (!isRecord(value)) return;
  if (seenObjects.has(value)) return;
  seenObjects.add(value);

  for (const entry of Object.values(value)) {
    collectActionInboxItemsInternal(entry, items, seenIds, seenObjects, depth + 1);
  }
}

export function collectXenesisMcpActionInboxItems(value: unknown): McpBridgeActionInboxItem[] {
  const items: McpBridgeActionInboxItem[] = [];
  collectActionInboxItemsInternal(value, items, new Set(), new WeakSet(), 0);
  return items;
}

export function xenesisMcpActionInboxStatus(items: McpBridgeActionInboxItem[]): XenesisMcpActionInboxStatus {
  if (items.some((item) => item.status === 'pending')) return 'pending';
  if (items.some((item) => item.status === 'failed')) return 'failed';
  if (items.some((item) => item.status === 'expired')) return 'expired';
  if (items.some((item) => item.status === 'rejected')) return 'rejected';
  if (items.some((item) => item.status === 'approved')) return 'approved';
  return 'pending';
}

export function buildXenesisMcpActionInboxPendingMessage(items: McpBridgeActionInboxItem[]): string {
  const count = items.length;
  const detail = count > 1 ? `${count}개의 작업에 데스크 승인이 필요합니다.` : '데스크 승인이 필요합니다.';
  return detail;
}
