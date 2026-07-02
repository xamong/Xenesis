import type { DeskBridgeCapabilityCallResult } from '../../../../shared/deskBridgeCapabilities';

export type XenesisAgentSessionsSlashAction = 'status' | 'scan' | 'list' | 'search' | 'resume' | 'attach' | 'open';

export interface XenesisAgentSessionsSlashPlan {
  ok: true;
  action: XenesisAgentSessionsSlashAction;
  path: string;
  args: Record<string, unknown>;
  approved: boolean;
  pendingMessage: string;
}

export interface XenesisAgentSessionsSlashError {
  ok: false;
  error: string;
}

export type XenesisAgentSessionsSlashPlanResult = XenesisAgentSessionsSlashPlan | XenesisAgentSessionsSlashError;

export function buildXenesisAgentSessionsSlashPlan(input: string): XenesisAgentSessionsSlashPlanResult {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const subcommand = (tokens.shift() || 'status').toLowerCase();
  const rest = tokens.join(' ').trim();

  if (subcommand === 'status') {
    return {
      ok: true,
      action: 'status',
      path: 'xd.agentSessions.status',
      args: {},
      approved: false,
      pendingMessage: 'Reading Agent Sessions status...',
    };
  }

  if (subcommand === 'scan') {
    return {
      ok: true,
      action: 'scan',
      path: 'xd.agentSessions.scan',
      args: { force: true },
      approved: false,
      pendingMessage: 'Scanning Agent Sessions...',
    };
  }

  if (subcommand === 'list') {
    return {
      ok: true,
      action: 'list',
      path: 'xd.agentSessions.list',
      args: { includeHidden: false, limit: 12 },
      approved: false,
      pendingMessage: 'Listing Agent Sessions...',
    };
  }

  if (subcommand === 'search') {
    if (!rest) return { ok: false, error: 'usage: /agent-sessions search <query>' };
    return {
      ok: true,
      action: 'search',
      path: 'xd.agentSessions.search',
      args: { query: rest, includeHidden: true, limit: 12 },
      approved: false,
      pendingMessage: 'Searching Agent Sessions...',
    };
  }

  if (subcommand === 'resume') {
    if (!rest) return { ok: false, error: 'usage: /agent-sessions resume <query|session-id>' };
    return {
      ok: true,
      action: 'resume',
      path: 'xd.agentSessions.resume',
      args: rest.includes(':') ? { sessionId: rest, target: 'smart' } : { query: rest, target: 'smart' },
      approved: false,
      pendingMessage: 'Requesting Agent Session resume...',
    };
  }

  if (subcommand === 'attach') {
    const [sessionId = '', termId = ''] = tokens;
    if (!sessionId || !termId) return { ok: false, error: 'usage: /agent-sessions attach <session-id> <term-id>' };
    return {
      ok: true,
      action: 'attach',
      path: 'xd.agentSessions.attachTerminal',
      args: { sessionId, termId },
      approved: false,
      pendingMessage: 'Linking Agent Session to terminal...',
    };
  }

  if (subcommand === 'open') {
    return {
      ok: true,
      action: 'open',
      path: 'xd.tools.core.agentSessions.open',
      args: { placement: 'tab' },
      approved: true,
      pendingMessage: 'Opening Agent Sessions panel...',
    };
  }

  return { ok: false, error: 'usage: /agent-sessions [status|scan|list|search|resume|attach|open]' };
}

export function renderXenesisAgentSessionsSlashResult(
  plan: Pick<XenesisAgentSessionsSlashPlan, 'action'>,
  result: Pick<DeskBridgeCapabilityCallResult, 'ok' | 'path' | 'result' | 'error' | 'approvalRequired' | 'approval'>,
): string {
  if (result.approvalRequired) {
    if (plan.action === 'resume') return 'Desk approval is required before resuming the Agent Session.';
    if (plan.action === 'attach') return 'Desk approval is required before linking the Agent Session to a terminal.';
    return 'Desk approval is required before running this Agent Sessions command.';
  }
  if (!result.ok) return `Agent Sessions ${plan.action} failed: ${result.error || 'unknown error'}`;

  const payload = result.result;
  if (plan.action === 'status') return renderStatus(payload);
  if (plan.action === 'scan') return renderScan(payload);
  if (plan.action === 'list' || plan.action === 'search') return renderSessionList(plan.action, payload);
  if (plan.action === 'resume') return renderResume(payload);
  if (plan.action === 'attach') return renderAttach(payload);
  return 'Agent Sessions panel opened.';
}

function renderStatus(payload: unknown): string {
  const record = asRecord(payload);
  const counts = asRecord(record.counts);
  const total = numberText(counts.total);
  const linked = numberText(counts['state:linked']);
  const sources = arrayText(record.supportedSources);
  const lastScan = typeof record.lastScannedAt === 'string' && record.lastScannedAt ? record.lastScannedAt : '-';
  return [
    'Agent Sessions status:',
    `- total: ${total}`,
    `- linked: ${linked}`,
    `- sources: ${sources}`,
    `- last scan: ${lastScan}`,
  ].join('\n');
}

function renderScan(payload: unknown): string {
  const record = asRecord(payload);
  const sessions = Array.isArray(record.sessions) ? record.sessions.length : 0;
  const diagnostics = Array.isArray(record.diagnostics) ? record.diagnostics.length : 0;
  return ['Agent Sessions scan:', `- sessions: ${sessions}`, `- diagnostics: ${diagnostics}`].join('\n');
}

function renderSessionList(action: XenesisAgentSessionsSlashAction, payload: unknown): string {
  const sessions = Array.isArray(payload) ? payload : [];
  if (sessions.length === 0) return `Agent Sessions ${action}: none`;
  return [`Agent Sessions ${action}:`, ...sessions.slice(0, 12).map(renderSessionRow)].join('\n');
}

function renderResume(payload: unknown): string {
  const record = asRecord(payload);
  const session = asRecord(record.session);
  const title = typeof session.title === 'string' && session.title ? session.title : 'selected session';
  const termId =
    typeof record.termId === 'string' && record.termId
      ? record.termId
      : typeof asRecord(record.spawnResult).id === 'string'
        ? String(asRecord(record.spawnResult).id)
        : '-';
  return ['Agent Session resume requested:', `- session: ${title}`, `- terminal: ${termId}`].join('\n');
}

function renderAttach(payload: unknown): string {
  const record = asRecord(payload);
  const session = asRecord(record.session);
  const title = typeof session.title === 'string' && session.title ? session.title : 'selected session';
  const termId = typeof record.termId === 'string' && record.termId ? record.termId : String(session.terminalId || '-');
  return ['Agent Session terminal linked:', `- session: ${title}`, `- terminal: ${termId}`].join('\n');
}

function renderSessionRow(value: unknown): string {
  const record = asRecord(value);
  const source = textOr(record.sourceLabel, 'Agent');
  const title = textOr(record.title, 'Untitled session');
  const project = textOr(record.projectName, 'Unknown project');
  const state = textOr(record.state, 'unknown');
  const id = textOr(record.id, '-');
  return `- ${source} · ${title} · ${project} · ${state} · ${id}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberText(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '0';
}

function arrayText(value: unknown): string {
  return Array.isArray(value) && value.length > 0 ? value.map(String).join(', ') : '-';
}
