import type { TransferQueueItem, WorkflowRunHistoryRecord } from '../../../shared/types';
import { type TerminalHostSessionInfo, terminalHost } from '../../terminal/terminalHost';
import type { WorkflowExecutionEvent, WorkflowRunResult, WorkflowTraceStep } from './workflowEngine';
import { WORKFLOW_RUN_HISTORY_LIMIT, WORKFLOW_SECRET_REF_PREFIX } from './workflowRunnerConstants';
import type {
  WorkflowCommandStatusFilter,
  WorkflowExecutionHistoryItem,
  WorkflowHistoryStatusFilter,
  WorkflowReportFormat,
  WorkflowRunProgress,
  WorkflowTerminalCommandStatus,
  WorkflowTerminalResponseComparison,
  WorkflowTerminalResponseGroup,
  WorkflowTerminalResultFilter,
  WorkflowTerminalResultSummary,
} from './workflowRunnerTypes';
import { normalizeCommandConcurrency, normalizeRunScope, normalizeTargetMode } from './workflowRunnerUtils';

export function resolveAvailableTerminalGroups(
  sessions: TerminalHostSessionInfo[],
): Array<{ id: string; name: string; count: number }> {
  const groups = new Map<string, { id: string; name: string; count: number }>();
  for (const session of sessions) {
    const groupId = session.groupId.trim();
    if (!groupId) continue;
    const previous = groups.get(groupId);
    groups.set(groupId, {
      id: groupId,
      name: session.groupName.trim() || groupId,
      count: (previous?.count ?? 0) + 1,
    });
  }
  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function createCommandStatusId(prefix: string, terminalId: string, index: number): string {
  return `${prefix || 'command'}-${terminalId}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

export function terminalLabelFor(termId: string): string {
  return terminalHost.listSessions().find((session) => session.id === termId)?.label ?? termId.slice(0, 8);
}

export function compactCommandResponse(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 180);
}

export function isWorkflowSecretRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(WORKFLOW_SECRET_REF_PREFIX);
}

export function maskWorkflowSecrets(value: unknown): unknown {
  if (isWorkflowSecretRef(value)) return '[secret-ref]';
  if (Array.isArray(value)) return value.map((item) => maskWorkflowSecrets(item));
  if (value && typeof value === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      masked[key] = maskWorkflowSecrets(item);
    }
    return masked;
  }
  return value;
}

export function collectFailedTerminalIds(statuses: WorkflowTerminalCommandStatus[]): string[] {
  return [
    ...new Set(
      statuses
        .filter((status) => status.state === 'failed')
        .map((status) => status.terminalId)
        .filter((termId) => terminalHost.has(termId)),
    ),
  ];
}

export function buildTerminalResultSummary(statuses: WorkflowTerminalCommandStatus[]): WorkflowTerminalResultSummary[] {
  const byTerminal = new Map<string, WorkflowTerminalResultSummary>();
  for (const status of statuses) {
    const current = byTerminal.get(status.terminalId) ?? {
      terminalId: status.terminalId,
      terminalLabel: status.terminalLabel,
      sent: 0,
      responded: 0,
      failed: 0,
      lastState: status.state,
      lastCommand: status.command,
      lastResponsePreview: status.responsePreview,
      lastError: status.error,
      updatedAt: status.updatedAt,
    };
    current.sent += status.state === 'sent' ? 1 : 0;
    current.responded += status.state === 'responded' ? 1 : 0;
    current.failed += status.state === 'failed' ? 1 : 0;
    if (Date.parse(status.updatedAt) >= Date.parse(current.updatedAt)) {
      current.lastState = status.state;
      current.lastCommand = status.command;
      current.lastResponsePreview = status.responsePreview;
      current.lastError = status.error;
      current.updatedAt = status.updatedAt;
      current.terminalLabel = status.terminalLabel;
    }
    byTerminal.set(status.terminalId, current);
  }
  return [...byTerminal.values()].sort((left, right) => {
    if (left.failed !== right.failed) return right.failed - left.failed;
    return left.terminalLabel.localeCompare(right.terminalLabel);
  });
}

export function filterTerminalResultSummary(
  summary: WorkflowTerminalResultSummary[],
  query: string,
  filter: WorkflowTerminalResultFilter,
): WorkflowTerminalResultSummary[] {
  const normalizedQuery = query.trim().toLowerCase();
  return summary.filter((item) => {
    if (filter === 'failed' && item.failed === 0) return false;
    if (filter === 'responded' && item.responded === 0) return false;
    if (filter === 'sent' && item.lastState !== 'sent') return false;
    if (!normalizedQuery) return true;
    return [item.terminalLabel, item.lastCommand, item.lastResponsePreview ?? '', item.lastError ?? ''].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });
}

export function filterCommandStatuses(
  statuses: WorkflowTerminalCommandStatus[],
  query: string,
  filter: WorkflowCommandStatusFilter,
): WorkflowTerminalCommandStatus[] {
  const normalizedQuery = query.trim().toLowerCase();
  return statuses.filter((status) => {
    if (filter !== 'all' && status.state !== filter) return false;
    if (!normalizedQuery) return true;
    return [status.terminalLabel, status.state, status.command, status.responsePreview ?? '', status.error ?? ''].some(
      (value) => value.toLowerCase().includes(normalizedQuery),
    );
  });
}

export function buildTerminalResponseComparison(
  summary: WorkflowTerminalResultSummary[],
): WorkflowTerminalResponseComparison[] {
  const baseline = summary.find((item) => item.lastResponsePreview)?.lastResponsePreview ?? '';
  return summary.map((item) => {
    const responsePreview = item.lastResponsePreview ?? '';
    return {
      terminalId: item.terminalId,
      terminalLabel: item.terminalLabel,
      status: responsePreview ? (baseline && responsePreview === baseline ? 'same' : 'different') : 'missing',
      responsePreview,
    };
  });
}

export function buildTerminalResponseGroups(
  comparison: WorkflowTerminalResponseComparison[],
): WorkflowTerminalResponseGroup[] {
  const groups = new Map<string, WorkflowTerminalResponseGroup>();
  for (const item of comparison) {
    const groupKey = item.responsePreview ? `${item.status}:${item.responsePreview}` : 'missing:no-response';
    const group = groups.get(groupKey) ?? {
      groupKey,
      status: item.status,
      responsePreview: item.responsePreview,
      terminalIds: [],
      terminalLabels: [],
      count: 0,
    };
    group.terminalIds.push(item.terminalId);
    group.terminalLabels.push(item.terminalLabel);
    group.count += 1;
    groups.set(groupKey, group);
  }
  return [...groups.values()].sort((left, right) => {
    if (left.status === 'missing' && right.status !== 'missing') return 1;
    if (right.status === 'missing' && left.status !== 'missing') return -1;
    if (left.count !== right.count) return right.count - left.count;
    return left.responsePreview.localeCompare(right.responsePreview);
  });
}

export function serializeWorkflowRunLog(
  result: WorkflowRunResult,
  metadata?: Partial<WorkflowExecutionHistoryItem>,
  commandStatuses: WorkflowTerminalCommandStatus[] = [],
): string {
  const lines = [
    'Workflow Summary',
    '================',
    `Workflow: ${result.workflow.name}`,
    `Status: ${result.success ? 'Success' : 'Failed'}`,
    `Started At: ${metadata?.startedAt ?? result.trace[0]?.startedAt ?? '-'}`,
    `Duration: ${metadata?.durationMs ?? totalTraceDuration(result.trace)}ms`,
    `Scope: ${metadata?.scope ?? '-'}`,
    `Target Mode: ${metadata?.targetMode ?? '-'}`,
    `Target Group: ${metadata?.targetGroupId ?? '-'}`,
    `Command Concurrency: ${metadata?.commandConcurrency ?? '-'}`,
    `Target Count: ${metadata?.targetCount ?? '-'}`,
    `Failed Targets: ${metadata?.failedTargetIds?.length ?? 0}`,
    `Actions: ${result.trace.length}`,
    `Diagnostics: ${result.diagnostics.length}`,
    `Execution Events: ${result.executionEvents.length}`,
    `Host Updates: ${result.hostUpdates.length}`,
    `Terminal Command Statuses: ${commandStatuses.length}`,
    '',
    'Diagnostics',
    '===========',
    formatLogValue(maskWorkflowSecrets(result.diagnostics)),
    '',
    'Execution Trace',
    '===============',
    formatLogValue(maskWorkflowSecrets(result.trace)),
    '',
    'Execution Events',
    '================',
    formatLogValue(maskWorkflowSecrets(result.executionEvents)),
    '',
    'Host Updates',
    '============',
    formatLogValue(maskWorkflowSecrets(result.hostUpdates)),
    '',
    'Terminal Command Statuses',
    '=========================',
    formatLogValue(maskWorkflowSecrets(commandStatuses)),
    '',
    'Terminal Result Summary',
    '=======================',
    formatLogValue(maskWorkflowSecrets(metadata?.terminalResultSummary ?? buildTerminalResultSummary(commandStatuses))),
    '',
    'Final Context',
    '=============',
    formatLogValue(maskWorkflowSecrets(result.context)),
  ];
  return lines.join('\n');
}

export function serializeWorkflowRunJsonReport(
  result: WorkflowRunResult,
  metadata: Partial<WorkflowExecutionHistoryItem> | undefined,
  commandStatuses: WorkflowTerminalCommandStatus[],
): string {
  return JSON.stringify(
    maskWorkflowSecrets({
      format: 'xenesis.workflow-report',
      version: 1,
      generatedAt: new Date().toISOString(),
      metadata: {
        workflowName: result.workflow.name,
        success: result.success,
        startedAt: metadata?.startedAt ?? result.trace[0]?.startedAt ?? null,
        durationMs: metadata?.durationMs ?? totalTraceDuration(result.trace),
        scope: metadata?.scope ?? null,
        targetMode: metadata?.targetMode ?? null,
        targetGroupId: metadata?.targetGroupId ?? null,
        commandConcurrency: metadata?.commandConcurrency ?? null,
        targetCount: metadata?.targetCount ?? null,
        failedTargetIds: metadata?.failedTargetIds ?? [],
      },
      workflow: result.workflow,
      diagnostics: result.diagnostics,
      trace: result.trace,
      executionEvents: result.executionEvents,
      hostUpdates: result.hostUpdates,
      terminalCommandStatuses: commandStatuses,
      terminalResultSummary: metadata?.terminalResultSummary ?? buildTerminalResultSummary(commandStatuses),
      failedTargetIds: metadata?.failedTargetIds ?? collectFailedTerminalIds(commandStatuses),
      context: result.context,
    }),
    null,
    2,
  );
}

export function serializeWorkflowRunCsvReport(
  result: WorkflowRunResult,
  metadata: Partial<WorkflowExecutionHistoryItem> | undefined,
  commandStatuses: WorkflowTerminalCommandStatus[],
): string {
  const rows = [
    [
      'section',
      'workflow',
      'status',
      'id',
      'type',
      'terminal',
      'command',
      'message',
      'startedAt',
      'endedAt',
      'durationMs',
    ],
  ];
  for (const step of result.trace) {
    rows.push([
      'trace',
      result.workflow.name,
      step.status,
      step.id,
      step.type,
      '',
      '',
      step.error ?? '',
      step.startedAt,
      step.endedAt ?? '',
      String(step.durationMs ?? ''),
    ]);
  }
  for (const status of commandStatuses) {
    rows.push([
      'terminalCommand',
      result.workflow.name,
      status.state,
      status.id,
      status.source,
      status.terminalLabel,
      status.command,
      status.error ?? status.responsePreview ?? '',
      status.sentAt,
      status.updatedAt,
      '',
    ]);
  }
  if (!result.trace.length && !commandStatuses.length) {
    rows.push([
      'summary',
      result.workflow.name,
      result.success ? 'success' : 'failed',
      '',
      '',
      '',
      '',
      '',
      metadata?.startedAt ?? '',
      '',
      String(metadata?.durationMs ?? ''),
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function csvCell(value: unknown): string {
  const text = String(maskWorkflowSecrets(value) ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createWorkflowReportFileName(
  workflowName: string,
  startedAt: string | undefined,
  format: WorkflowReportFormat,
): string {
  const safeWorkflowName = (workflowName || 'workflow')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  const stamp = (startedAt ? new Date(startedAt) : new Date())
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  return `${safeWorkflowName}-${stamp}.${format}`;
}

export function createWorkflowLogFileName(workflowName: string, startedAt?: string): string {
  return createWorkflowReportFileName(workflowName, startedAt, 'log');
}

export function createCommandLogFileName(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  return `terminal-command-log-${stamp}.log`;
}

export function createCommandStatusFileName(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  return `terminal-command-status-${stamp}.csv`;
}

export function formatCommandStatusesReport(statuses: WorkflowTerminalCommandStatus[]): string {
  const rows = [
    ['terminal', 'state', 'source', 'command', 'response', 'sentAt', 'updatedAt', 'retryable'],
    ...statuses.map((status) => [
      status.terminalLabel,
      status.state,
      status.source,
      status.command,
      status.error ?? status.responsePreview ?? '',
      status.sentAt,
      status.updatedAt,
      status.retryable ? 'yes' : 'no',
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function transferQueuePercent(item: TransferQueueItem): number {
  if (item.state === 'completed') return 100;
  if (!item.bytesTotal || item.bytesTotal <= 0) return item.state === 'running' ? 5 : 0;
  return Math.max(0, Math.min(100, Math.round((item.bytesTransferred / item.bytesTotal) * 100)));
}

export function formatTransferBytes(value: number): string {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function createWorkflowFileName(workflowName: string): string {
  const safeWorkflowName = (workflowName || 'workflow')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return `${safeWorkflowName || 'workflow'}.xcon-workflow`;
}

export function toWorkflowRunHistoryRecord(
  item: WorkflowExecutionHistoryItem,
  commandStatuses: WorkflowTerminalCommandStatus[],
): WorkflowRunHistoryRecord {
  return {
    version: 1,
    id: item.id,
    workflowName: item.workflowName,
    workflowSource: item.workflowSource ?? '',
    fixture: item.fixture ?? '',
    success: item.success,
    scope: item.scope,
    actionId: item.actionId,
    simulateApi: item.simulateApi,
    sequential: item.sequential,
    targetMode: item.targetMode,
    targetGroupId: item.targetGroupId,
    commandConcurrency: item.commandConcurrency,
    targetCount: item.targetCount,
    actionCount: item.actionCount,
    startedAt: item.startedAt,
    durationMs: item.durationMs,
    savedAt: item.savedAt ?? new Date().toISOString(),
    result: item.result,
    commandStatuses,
    failedTargetIds: item.failedTargetIds ?? collectFailedTerminalIds(commandStatuses),
    terminalResultSummary: item.terminalResultSummary ?? buildTerminalResultSummary(commandStatuses),
    ...(item.filePath ? { filePath: item.filePath } : {}),
  };
}

export function fromWorkflowRunHistoryRecord(record: WorkflowRunHistoryRecord): WorkflowExecutionHistoryItem | null {
  if (!record.result || typeof record.result !== 'object') return null;
  return {
    id: record.id,
    workflowName: record.workflowName,
    workflowSource: record.workflowSource,
    fixture: record.fixture,
    success: record.success,
    scope: normalizeRunScope(record.scope),
    actionId: typeof record.actionId === 'string' ? record.actionId : undefined,
    simulateApi: record.simulateApi === true,
    sequential: record.sequential === true,
    targetMode: normalizeTargetMode(record.targetMode),
    targetGroupId: typeof record.targetGroupId === 'string' ? record.targetGroupId : '',
    commandConcurrency: normalizeCommandConcurrency(record.commandConcurrency),
    targetCount: Number.isFinite(record.targetCount) ? record.targetCount : 0,
    actionCount: Number.isFinite(record.actionCount) ? record.actionCount : 0,
    startedAt: record.startedAt,
    durationMs: Number.isFinite(record.durationMs) ? record.durationMs : 0,
    result: record.result as WorkflowRunResult,
    savedAt: record.savedAt,
    filePath: record.filePath,
    persisted: true,
    commandStatuses: Array.isArray(record.commandStatuses)
      ? record.commandStatuses.filter(isWorkflowTerminalCommandStatus)
      : [],
    failedTargetIds: Array.isArray(record.failedTargetIds) ? record.failedTargetIds.map(String).filter(Boolean) : [],
    terminalResultSummary: Array.isArray(record.terminalResultSummary)
      ? record.terminalResultSummary.filter(isWorkflowTerminalResultSummary)
      : [],
  };
}

export function isWorkflowTerminalCommandStatus(value: unknown): value is WorkflowTerminalCommandStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<WorkflowTerminalCommandStatus>;
  return (
    typeof item.id === 'string' &&
    typeof item.terminalId === 'string' &&
    typeof item.command === 'string' &&
    (item.state === 'sent' || item.state === 'responded' || item.state === 'failed')
  );
}

export function isWorkflowTerminalResultSummary(value: unknown): value is WorkflowTerminalResultSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<WorkflowTerminalResultSummary>;
  return (
    typeof item.terminalId === 'string' &&
    typeof item.terminalLabel === 'string' &&
    Number.isFinite(Number(item.sent)) &&
    Number.isFinite(Number(item.responded)) &&
    Number.isFinite(Number(item.failed))
  );
}

export function mergeWorkflowRunHistory(items: WorkflowExecutionHistoryItem[]): WorkflowExecutionHistoryItem[] {
  const byId = new Map<string, WorkflowExecutionHistoryItem>();
  for (const item of items) {
    const previous = byId.get(item.id);
    byId.set(item.id, previous ? { ...previous, ...item } : item);
  }
  return [...byId.values()]
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))
    .slice(0, WORKFLOW_RUN_HISTORY_LIMIT);
}

export function filterWorkflowRunHistory(
  history: WorkflowExecutionHistoryItem[],
  query: string,
  statusFilter: WorkflowHistoryStatusFilter,
): WorkflowExecutionHistoryItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return history.filter((item) => {
    if (statusFilter === 'success' && !item.success) return false;
    if (statusFilter === 'failed' && item.success) return false;
    if (!normalizedQuery) return true;
    return [item.workflowName, item.scope, item.targetMode, item.startedAt, item.filePath ?? ''].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });
}

export function inferWorkflowNameFromText(source: string, fallback: string): string {
  const quoted = source.match(/^\s*workflow\s+["']([^"']+)["']/m);
  if (quoted?.[1]) return quoted[1];
  const bare = source.match(/^\s*workflow\s+([^\r\n]+)/m);
  return bare?.[1]?.trim() || fallback || 'workflow';
}

function totalTraceDuration(trace: WorkflowRunResult['trace']): number {
  return trace.reduce((sum, step) => sum + (step.durationMs ?? 0), 0);
}

export function formatLogValue(value: unknown): string {
  if (value === undefined) return '-';
  if (typeof value === 'string') return value || '-';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function createIdleWorkflowRunProgress(): WorkflowRunProgress {
  return {
    status: 'idle',
    currentActionId: '',
    currentActionType: '',
    currentScope: '',
    startedAt: '',
    updatedAt: '',
    completed: 0,
    failed: 0,
    total: 0,
    percent: 0,
    lastEventKind: '',
    lastError: '',
  };
}

export function createActiveWorkflowRunProgress(startedAt: string): WorkflowRunProgress {
  return {
    ...createIdleWorkflowRunProgress(),
    status: 'running',
    startedAt,
    updatedAt: startedAt,
  };
}

export function updateWorkflowRunProgressSnapshot(
  previous: WorkflowRunProgress,
  event: WorkflowExecutionEvent,
  trace: WorkflowTraceStep[],
): WorkflowRunProgress {
  const runningStep = [...trace].reverse().find((step) => step.status === 'running');
  const completed = trace.filter((step) => step.status === 'completed').length;
  const failed = trace.filter((step) => step.status === 'failed').length;
  const finished = completed + failed;
  const total = Math.max(previous.total, trace.length, finished + (runningStep ? 1 : 0));
  const percent = total ? Math.min(100, Math.round((finished / total) * 100)) : 0;
  return {
    ...previous,
    status: 'running',
    currentActionId: String(event.actionId ?? runningStep?.id ?? previous.currentActionId ?? ''),
    currentActionType: String(event.actionType ?? runningStep?.type ?? previous.currentActionType ?? ''),
    currentScope: String(event.scope ?? runningStep?.scope ?? previous.currentScope ?? ''),
    updatedAt: event.at,
    completed,
    failed,
    total,
    percent,
    lastEventKind: event.kind,
    lastError: String(event.error ?? previous.lastError ?? ''),
  };
}

export function finishWorkflowRunProgress(
  previous: WorkflowRunProgress,
  trace: WorkflowTraceStep[],
  success: boolean,
): WorkflowRunProgress {
  const completed = trace.filter((step) => step.status === 'completed').length;
  const failed = trace.filter((step) => step.status === 'failed').length;
  const total = Math.max(previous.total, trace.length, completed + failed);
  return {
    ...previous,
    status: success ? 'completed' : 'failed',
    updatedAt: new Date().toISOString(),
    completed,
    failed,
    total,
    percent: total ? 100 : previous.percent,
    lastEventKind: success ? 'workflow:completed' : 'workflow:failed',
  };
}

export function failWorkflowRunProgress(previous: WorkflowRunProgress, message: string): WorkflowRunProgress {
  return {
    ...previous,
    status: 'failed',
    updatedAt: new Date().toISOString(),
    lastEventKind: 'workflow:error',
    lastError: message,
  };
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
