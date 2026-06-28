import { sanitizeAgentProductMessage, type AgentActionNeeded } from '../../../../shared/agentActionRecords';
import type { McpBridgeActionInboxItem } from '../../../../shared/types';

export type XenesisAgentActionNeededStatus = AgentActionNeeded['status'] | 'mixed';

export function isAgentActionNeededRecord(value: unknown): value is AgentActionNeeded {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Partial<AgentActionNeeded>;
  return (
    typeof record.id === 'string' &&
    typeof record.turnId === 'string' &&
    typeof record.kind === 'string' &&
    typeof record.status === 'string' &&
    typeof record.title === 'string' &&
    typeof record.productMessage === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

export function collectAgentActionNeededFromCapabilityResult(value: unknown): AgentActionNeeded[] {
  const resultRecord = toRecord(value);
  const payload = toRecord(resultRecord?.result) || resultRecord;
  const records = Array.isArray(payload?.actionNeeded) ? payload.actionNeeded : [];
  return records.filter(isAgentActionNeededRecord);
}

export function filterAgentActionNeededForInboxItems(
  records: AgentActionNeeded[],
  inboxItems: McpBridgeActionInboxItem[],
): AgentActionNeeded[] {
  const inboxIds = new Set(inboxItems.map((item) => item.id).filter(Boolean));
  if (inboxIds.size === 0) return [];
  return records.filter((record) => {
    const refs = toRecord(record.refs);
    return typeof refs?.actionInboxItemId === 'string' && inboxIds.has(refs.actionInboxItemId);
  });
}

export function mergeXenesisAgentActionNeeded(
  existing: AgentActionNeeded[] | undefined,
  next: AgentActionNeeded[],
): AgentActionNeeded[] {
  const byId = new Map<string, AgentActionNeeded>();
  for (const record of existing || []) byId.set(record.id, record);
  for (const record of next) byId.set(record.id, record);
  return [...byId.values()];
}

export function xenesisAgentActionNeededStatus(records: AgentActionNeeded[]): XenesisAgentActionNeededStatus | undefined {
  if (records.length === 0) return undefined;
  const statuses = new Set(records.map((record) => record.status));
  return statuses.size === 1 ? records[0]?.status : 'mixed';
}

export function xenesisAgentActionNeededStatusLabel(status: XenesisAgentActionNeededStatus | undefined): string {
  switch (status) {
    case 'open':
      return '추가 확인 필요';
    case 'resolved':
      return '해결됨';
    case 'dismissed':
      return '닫힘';
    case 'mixed':
      return '일부 처리됨';
    default:
      return '확인 필요';
  }
}

export function summarizeAgentActionNeededForCard(records: AgentActionNeeded[]): string {
  return records
    .map((record) =>
      [sanitizeAgentProductMessage(record.title), sanitizeAgentProductMessage(record.productMessage)]
        .filter(Boolean)
        .join(' - '),
    )
    .filter(Boolean)
    .join(', ');
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
