import type { XenesisRunResult, XenesisToolPolicySummary } from '../../../../shared/types';

export interface XenesisPolicyNotice {
  id: string;
  at: string;
  status: 'allow' | 'deny';
  policyName: string;
  toolName: string;
  reason: string;
  nextAction?: string;
  requiredBefore: string[];
  missingBefore: string[];
  priorityTools: string[];
}

export type XenesisPolicySnapshot = XenesisToolPolicySummary;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonRecords(value: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const trimmed = value.trim();
  if (!trimmed) return records;

  for (const line of trimmed.split(/\r?\n/)) {
    const candidate = line.trim();
    if (!candidate.startsWith('{') || !candidate.endsWith('}')) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (isRecord(parsed)) records.push(parsed);
    } catch {
      // Gateway output can also be plain assistant text; ignore malformed JSON fragments.
    }
  }

  if (records.length === 0 && trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (isRecord(parsed)) records.push(parsed);
    } catch {
      // Plain text fallback is handled by the caller.
    }
  }

  return records;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function stringArrayRecord(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [key, item] of Object.entries(value)) {
    const values = stringArray(item);
    if (values.length > 0) result[key] = values;
  }
  return result;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function xenesisPolicyNoticeKey(notice: XenesisPolicyNotice): string {
  return [
    notice.policyName,
    notice.toolName,
    notice.status,
    notice.reason,
    notice.requiredBefore.join(','),
    notice.missingBefore.join(','),
  ].join('|');
}

export function xenesisPolicyNoticeFromRecord(record: Record<string, unknown>): XenesisPolicyNotice | null {
  if (record.type !== 'tool_policy_audit') return null;
  const status = record.status === 'deny' ? 'deny' : 'allow';
  const policyName =
    typeof record.policyName === 'string' && record.policyName.trim() ? record.policyName : 'tool-policy';
  const toolName = typeof record.name === 'string' && record.name.trim() ? record.name : 'tool';
  const reason =
    typeof record.reason === 'string' && record.reason.trim()
      ? record.reason
      : status === 'deny'
        ? 'Tool policy denied this call.'
        : 'Tool policy requirements satisfied.';
  const nextAction = optionalString(record.nextAction);
  const toolCallId =
    typeof record.toolCallId === 'string' && record.toolCallId.trim()
      ? record.toolCallId
      : createId('xenesis-policy-call');

  return {
    id: `xenesis-policy-${toolCallId}-${status}`,
    at: typeof record.timestamp === 'string' && record.timestamp.trim() ? record.timestamp : nowIso(),
    status,
    policyName,
    toolName,
    reason,
    ...(nextAction ? { nextAction } : {}),
    requiredBefore: stringArray(record.requiredBefore),
    missingBefore: stringArray(record.missingBefore),
    priorityTools: stringArray(record.priorityTools),
  };
}

export function xenesisPolicySnapshotFromRecord(record: Record<string, unknown>): XenesisPolicySnapshot | null {
  if (record.type !== 'tool_policy_snapshot') return null;
  const policyName = optionalString(record.policyName);
  if (!policyName) return null;
  return {
    policyName,
    priorityTools: stringArray(record.priorityTools),
    requiredBefore: stringArrayRecord(record.requiredBefore),
    requiredBeforeAny: stringArrayRecord(record.requiredBeforeAny),
  };
}

function xenesisPolicyNoticeFromRunEvent(value: unknown): XenesisPolicyNotice | null {
  if (!isRecord(value)) return null;
  const direct = xenesisPolicyNoticeFromRecord(value);
  if (direct) return direct;
  return isRecord(value.data) ? xenesisPolicyNoticeFromRecord(value.data) : null;
}

function xenesisPolicyNoticeFromIssue(value: unknown, index: number): XenesisPolicyNotice | null {
  if (!isRecord(value)) return null;
  const policyName = typeof value.policyName === 'string' && value.policyName.trim() ? value.policyName : 'tool-policy';
  const toolName = typeof value.name === 'string' && value.name.trim() ? value.name : 'tool';
  const reason =
    typeof value.reason === 'string' && value.reason.trim() ? value.reason : 'Tool policy denied this call.';
  const nextAction = optionalString(value.nextAction);
  const toolCallId =
    typeof value.toolCallId === 'string' && value.toolCallId.trim() ? value.toolCallId : `issue-${index}`;

  return {
    id: `xenesis-policy-${toolCallId}-deny`,
    at: typeof value.timestamp === 'string' && value.timestamp.trim() ? value.timestamp : nowIso(),
    status: 'deny',
    policyName,
    toolName,
    reason,
    ...(nextAction ? { nextAction } : {}),
    requiredBefore: stringArray(value.requiredBefore),
    missingBefore: stringArray(value.missingBefore),
    priorityTools: stringArray(value.priorityTools),
  };
}

function xenesisPolicySnapshotFromRunEvent(value: unknown): XenesisPolicySnapshot | null {
  if (!isRecord(value)) return null;
  const direct = xenesisPolicySnapshotFromRecord(value);
  if (direct) return direct;
  return isRecord(value.data) ? xenesisPolicySnapshotFromRecord(value.data) : null;
}

function xenesisPolicySnapshotFromSummary(value: unknown): XenesisPolicySnapshot | null {
  if (!isRecord(value)) return null;
  const policyName = optionalString(value.policyName);
  if (!policyName) return null;
  const allowCount = optionalNumber(value.allowCount);
  const denyCount = optionalNumber(value.denyCount);
  const nextActions = stringArray(value.nextActions);
  return {
    policyName,
    priorityTools: stringArray(value.priorityTools),
    requiredBefore: stringArrayRecord(value.requiredBefore),
    requiredBeforeAny: stringArrayRecord(value.requiredBeforeAny),
    ...(allowCount !== undefined ? { allowCount } : {}),
    ...(denyCount !== undefined ? { denyCount } : {}),
    ...(nextActions.length > 0 ? { nextActions } : {}),
  };
}

function toolPolicyIssuesFromResult(result: XenesisRunResult): unknown[] {
  const diagnostics = isRecord(result.diagnostics) ? result.diagnostics : undefined;
  return [
    ...(Array.isArray(result.toolPolicyIssues) ? result.toolPolicyIssues : []),
    ...(Array.isArray(diagnostics?.toolPolicyIssues) ? diagnostics.toolPolicyIssues : []),
  ];
}

export function extractXenesisPolicyNotices(result: XenesisRunResult): XenesisPolicyNotice[] {
  const output = result.output?.trim() || '';
  const outputNotices = output
    ? parseJsonRecords(output)
        .map(xenesisPolicyNoticeFromRecord)
        .filter((notice): notice is XenesisPolicyNotice => notice !== null)
    : [];
  const eventNotices = (Array.isArray(result.events) ? result.events : [])
    .map(xenesisPolicyNoticeFromRunEvent)
    .filter((notice): notice is XenesisPolicyNotice => notice !== null);
  const issueNotices = toolPolicyIssuesFromResult(result)
    .map(xenesisPolicyNoticeFromIssue)
    .filter((notice): notice is XenesisPolicyNotice => notice !== null);

  return [...outputNotices, ...eventNotices, ...issueNotices];
}

export function extractXenesisPolicySnapshot(result: XenesisRunResult): XenesisPolicySnapshot | null {
  const summary = xenesisPolicySnapshotFromSummary(result.toolPolicy);
  if (summary) return summary;

  const eventSnapshots = (Array.isArray(result.events) ? result.events : [])
    .map(xenesisPolicySnapshotFromRunEvent)
    .filter((snapshot): snapshot is XenesisPolicySnapshot => snapshot !== null);
  return eventSnapshots.at(-1) ?? null;
}
