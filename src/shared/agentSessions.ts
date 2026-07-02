import type { LocalCliAgentId, McpBridgeTerminalMetadata, ShellKind } from './types';

export type AgentSessionSource =
  | 'xenesis'
  | 'codex'
  | 'claude'
  | 'gemini'
  | 'cursor'
  | 'opencode'
  | 'hermes'
  | 'pi'
  | 'qwen'
  | 'qoder'
  | 'github-copilot'
  | 'devin'
  | 'kimi';

export type AgentSessionKind = 'conversation' | 'plan' | 'task' | 'subagent';
export type AgentSessionState = 'saved' | 'running' | 'linked' | 'hidden' | 'unavailable' | 'degraded';
export type AgentSessionStatus = 'active' | 'completed' | 'failed' | 'unknown';

export const AGENT_SESSION_PROVIDER_LABELS: Record<AgentSessionSource, string> = {
  xenesis: 'Xenesis',
  codex: 'Codex',
  claude: 'Claude',
  gemini: 'Gemini',
  cursor: 'Cursor',
  opencode: 'OpenCode',
  hermes: 'Hermes',
  pi: 'Pi',
  qwen: 'Qwen',
  qoder: 'Qoder',
  'github-copilot': 'GitHub Copilot',
  devin: 'Devin',
  kimi: 'Kimi',
};

export const AGENT_SESSION_KIND_LABELS: Record<AgentSessionKind, string> = {
  conversation: 'Conversation',
  plan: 'Plan',
  task: 'Task',
  subagent: 'Subagent',
};

export interface AgentSessionResumeMode {
  id: string;
  label: string;
  commandSuffix?: string;
  approvalHint?: 'safe' | 'auto' | 'dangerous';
}

export interface AgentSessionTerminalLink {
  termId: string;
  paneId?: string;
  cwd?: string;
  shell?: ShellKind | string;
  lastSentCommand?: string;
  active: boolean;
  isAltBuffer?: boolean;
  fitLocked?: boolean;
  linkedAt?: string;
}

export interface AgentSessionSourceDetails {
  sourcePaths: string[];
  scannerVersion: number;
  scanStatus: 'fresh' | 'stale' | 'scanning' | 'failed' | 'unsupported';
  scanError?: string;
  lastScannedAt?: string;
  skippedRecords?: number;
}

export interface AgentSessionResumeStatus {
  available: boolean;
  command?: string;
  reason?: string;
}

export interface AgentSession {
  id: string;
  source: AgentSessionSource;
  sourceLabel: string;
  provider: AgentSessionSource;
  providerLabel: string;
  sourceSessionId: string;
  kind: AgentSessionKind;
  kindLabel: string;
  projectName: string;
  projectPath: string;
  gitBranch?: string;
  title: string;
  summary: string;
  lastUserPrompt?: string;
  createdAt?: string;
  updatedAt: string;
  messageCount?: number;
  resumeCommand?: string;
  resumeModes: AgentSessionResumeMode[];
  resume: AgentSessionResumeStatus;
  state: AgentSessionState;
  status: AgentSessionStatus;
  pinned: boolean;
  hidden: boolean;
  terminal?: AgentSessionTerminalLink;
  terminalId?: string;
  sourceDetails: AgentSessionSourceDetails;
  metadata: Record<string, unknown>;
}

export type AgentSessionRecord = AgentSession;

export interface AgentSessionsStatus {
  ok: boolean;
  cacheVersion: number;
  overlayVersion: number;
  supportedSources: AgentSessionSource[];
  enabledSources: AgentSessionSource[];
  installedLocalCliAgents: LocalCliAgentId[];
  counts: Record<string, number>;
  diagnostics: AgentSessionDiagnostic[];
  lastScannedAt?: string;
}

export interface AgentSessionDiagnostic {
  source: AgentSessionSource | 'index';
  level: 'info' | 'warn' | 'error';
  message: string;
  detail?: string;
}

export interface AgentSessionsScanRequest {
  sources?: AgentSessionSource[];
  force?: boolean;
  includeUnsupported?: boolean;
}

export interface AgentSessionsListRequest {
  sources?: AgentSessionSource[];
  states?: AgentSessionState[];
  projectPath?: string;
  includeHidden?: boolean;
  limit?: number;
}

export interface AgentSessionsSearchRequest extends AgentSessionsListRequest {
  query: string;
}

export interface AgentSessionsResumeRequest {
  sessionId?: string;
  query?: string;
  source?: AgentSessionSource;
  mode?: string;
  target?: 'smart' | 'new' | 'active';
  termId?: string;
  previewOnly?: boolean;
}

export interface AgentSessionsResumePreview {
  session: AgentSession;
  command: string;
  target: 'smart' | 'new' | 'active';
  termId?: string;
  cwd?: string;
}

export interface AgentSessionsAttachRequest {
  sessionId: string;
  termId: string;
}

export interface AgentSessionsAttachResult {
  ok: boolean;
  session?: AgentSession;
  error?: string;
}

export interface AgentSessionsPinRequest {
  sessionId: string;
  pinned: boolean;
}

export interface AgentSessionsHideRequest {
  sessionId: string;
  hidden: boolean;
}

export interface AgentSessionsScanResult {
  ok: boolean;
  sessions: AgentSession[];
  diagnostics: AgentSessionDiagnostic[];
  scannedAt: string;
}

export interface AgentSessionsApi {
  status(): Promise<AgentSessionsStatus>;
  scan(request?: AgentSessionsScanRequest): Promise<AgentSessionsScanResult>;
  list(request?: AgentSessionsListRequest): Promise<AgentSession[]>;
  search(request: AgentSessionsSearchRequest): Promise<AgentSession[]>;
  attachTerminal(request: AgentSessionsAttachRequest): Promise<AgentSessionsAttachResult>;
  pin(request: AgentSessionsPinRequest): Promise<AgentSession[]>;
  hide(request: AgentSessionsHideRequest): Promise<AgentSession[]>;
}

export interface AgentSessionInput
  extends Partial<
    Omit<
      AgentSession,
      | 'id'
      | 'sourceLabel'
      | 'providerLabel'
      | 'kindLabel'
      | 'projectName'
      | 'resume'
      | 'state'
      | 'status'
      | 'sourceDetails'
    >
  > {
  source: AgentSessionSource;
  sourceSessionId: string;
  id?: string;
  provider?: AgentSessionSource;
  projectPath?: string;
  projectName?: string;
  state?: AgentSessionState;
  status?: AgentSessionStatus;
  sourceDetails?: Partial<AgentSessionSourceDetails>;
}

export interface AgentSessionSummary {
  title: string;
  subtitle: string;
  canResume: boolean;
}

export function createAgentSessionId(source: AgentSessionSource, sourceSessionId: string): string {
  return `${source}:${sourceSessionId.trim()}`;
}

export function compactAgentSessionText(value: unknown, maxLength = 220): string {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function normalizeAgentProjectName(projectPath: string, fallback = 'Unknown project'): string {
  const clean = String(projectPath || '').replace(/[\\/]+$/, '');
  const parts = clean.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || fallback;
}

export function isVisibleSubagentTerminalMetadata(metadata: McpBridgeTerminalMetadata | undefined): boolean {
  return metadata?.kind === 'xenesis-desk-subagent' || metadata?.kind === 'xenesis-desk-subagent-plan';
}

export function buildAgentSessionTerminalMetadata(
  session: AgentSession,
  command = session.resumeCommand,
): McpBridgeTerminalMetadata {
  const normalizedCommand = compactAgentSessionText(command, 2000);
  return {
    kind: 'agent-session-resume',
    agent: compactAgentSessionText(session.sourceLabel, 200),
    task: compactAgentSessionText(session.title, 2000),
    ...(normalizedCommand ? { command: normalizedCommand, resumeCommand: normalizedCommand } : {}),
    ...(session.projectPath ? { projectPath: compactAgentSessionText(session.projectPath, 200) } : {}),
    agentSessionId: compactAgentSessionText(session.id, 200),
    agentSessionSource: compactAgentSessionText(session.source, 200),
    sourceSessionId: compactAgentSessionText(session.sourceSessionId, 200),
  };
}

export function normalizeAgentSession(input: AgentSessionInput): AgentSession {
  const source = input.source;
  const provider = input.provider ?? source;
  const sourceLabel = AGENT_SESSION_PROVIDER_LABELS[source];
  const providerLabel = AGENT_SESSION_PROVIDER_LABELS[provider];
  const sourceSessionId = String(input.sourceSessionId || '').trim();
  const kind = input.kind ?? 'conversation';
  const projectPath = String(input.projectPath ?? '').trim();
  const resumeCommand = compactAgentSessionText(input.resumeCommand, 500);
  const terminalId = input.terminalId ?? input.terminal?.termId;
  const status = input.status ?? (input.state === 'running' || input.state === 'linked' ? 'active' : 'unknown');
  const state = input.state ?? stateFromStatus(status, input.hidden === true);

  return {
    id: input.id ?? createAgentSessionId(source, sourceSessionId),
    source,
    sourceLabel,
    provider,
    providerLabel,
    sourceSessionId,
    kind,
    kindLabel: AGENT_SESSION_KIND_LABELS[kind],
    projectName: input.projectName ?? normalizeAgentProjectName(projectPath, `${providerLabel} project`),
    projectPath,
    gitBranch: emptyToUndefined(input.gitBranch),
    title: compactAgentSessionText(input.title || makeFallbackTitle(providerLabel, source, sourceSessionId), 120),
    summary: compactAgentSessionText(input.summary, 500),
    lastUserPrompt: emptyToUndefined(compactAgentSessionText(input.lastUserPrompt, 500)),
    createdAt: emptyToUndefined(input.createdAt),
    updatedAt: normalizeDate(input.updatedAt),
    messageCount: input.messageCount,
    resumeCommand: resumeCommand || undefined,
    resumeModes:
      input.resumeModes && input.resumeModes.length > 0
        ? input.resumeModes
        : resumeCommand
          ? [{ id: 'default', label: 'Default resume' }]
          : [],
    resume: resumeCommand
      ? { available: true, command: resumeCommand }
      : { available: false, reason: 'No resume command is available for this session.' },
    state,
    status,
    pinned: input.pinned === true,
    hidden: input.hidden === true || state === 'hidden',
    terminal: input.terminal,
    terminalId,
    sourceDetails: {
      sourcePaths: input.sourceDetails?.sourcePaths ?? [],
      scannerVersion: input.sourceDetails?.scannerVersion ?? 1,
      scanStatus: input.sourceDetails?.scanStatus ?? 'fresh',
      scanError: input.sourceDetails?.scanError,
      lastScannedAt: input.sourceDetails?.lastScannedAt,
      skippedRecords: input.sourceDetails?.skippedRecords,
    },
    metadata: input.metadata ?? {},
  };
}

export function applyAgentSessionListFilters(
  sessions: AgentSession[],
  request: AgentSessionsListRequest = {},
): AgentSession[] {
  const sources = new Set(request.sources ?? []);
  const states = new Set(request.states ?? []);
  const projectPath = String(request.projectPath ?? '')
    .trim()
    .replace(/[\\/]+$/, '')
    .toLowerCase();
  const limit = Math.max(0, Math.min(500, Math.trunc(Number(request.limit ?? 100))));
  const filtered = sessions.filter((session) => {
    if (!request.includeHidden && session.hidden) return false;
    if (sources.size > 0 && !sources.has(session.source)) return false;
    if (states.size > 0 && !states.has(session.state)) return false;
    if (projectPath) {
      const sessionPath = session.projectPath.replace(/[\\/]+$/, '').toLowerCase();
      if (sessionPath !== projectPath) return false;
    }
    return true;
  });
  return limit > 0 ? filtered.slice(0, limit) : filtered;
}

export function rankAgentSessions(sessions: AgentSession[], query: string): AgentSession[] {
  return sessions
    .map((session) => ({ session, score: scoreAgentSession(session, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || compareUpdatedAt(b.session, a.session))
    .map((entry) => entry.session);
}

export function sortAgentSessions(sessions: AgentSession[]): AgentSession[] {
  return [...sessions].sort((a, b) => {
    const activeDelta = Number(isActiveSession(b)) - Number(isActiveSession(a));
    if (activeDelta !== 0) return activeDelta;
    const pinnedDelta = Number(b.pinned) - Number(a.pinned);
    if (pinnedDelta !== 0) return pinnedDelta;
    return compareUpdatedAt(b, a);
  });
}

export function summarizeAgentSessionCounts(sessions: AgentSession[]): Record<string, number> {
  const counts: Record<string, number> = { total: sessions.length };
  for (const session of sessions) {
    counts[`source:${session.source}`] = (counts[`source:${session.source}`] ?? 0) + 1;
    counts[`state:${session.state}`] = (counts[`state:${session.state}`] ?? 0) + 1;
    if (session.hidden) counts.hidden = (counts.hidden ?? 0) + 1;
    if (session.pinned) counts.pinned = (counts.pinned ?? 0) + 1;
  }
  return counts;
}

export function summarizeAgentSession(session: AgentSession): AgentSessionSummary {
  const parts = [
    session.providerLabel,
    session.projectName,
    session.messageCount == null ? '' : `${session.messageCount} messages`,
    session.terminalId ? `terminal ${session.terminalId}` : '',
  ].filter(Boolean);
  return {
    title: session.title,
    subtitle: parts.join(' · '),
    canResume: session.resume.available,
  };
}

function makeFallbackTitle(providerLabel: string, source: AgentSessionSource, sourceSessionId: string): string {
  const sourcePrefixPattern = new RegExp(`^${escapeRegExp(source)}[-_:]+`, 'i');
  const compactId = sourceSessionId
    .replace(sourcePrefixPattern, '')
    .replace(/^session[-_:]+/i, '')
    .replace(/_/g, ' ')
    .trim();
  return `${providerLabel} session ${compactId || 'untitled'}`;
}

function stateFromStatus(status: AgentSessionStatus, hidden: boolean): AgentSessionState {
  if (hidden) return 'hidden';
  if (status === 'active') return 'running';
  if (status === 'failed') return 'degraded';
  return 'saved';
}

function scoreAgentSession(session: AgentSession, query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return 1;
  const haystacks = [
    [session.title, 80],
    [session.lastUserPrompt, 70],
    [session.projectName, 45],
    [session.projectPath, 35],
    [session.summary, 25],
    [session.sourceLabel, 10],
    [session.sourceSessionId, 10],
  ] as const;
  let score = 0;
  for (const [value, weight] of haystacks) {
    const text = String(value ?? '').toLowerCase();
    if (!text) continue;
    if (text === needle) score += weight + 20;
    else if (text.includes(needle)) score += weight;
  }
  if (session.pinned) score += 15;
  if (session.state === 'running' || session.state === 'linked') score += 10;
  return score;
}

function compareUpdatedAt(a: AgentSession, b: AgentSession): number {
  return Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
}

function isActiveSession(session: AgentSession): boolean {
  return session.status === 'active' || session.state === 'running' || session.state === 'linked';
}

function normalizeDate(value: unknown): string {
  const timestamp = Date.parse(String(value ?? ''));
  if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  return new Date(0).toISOString();
}

function emptyToUndefined(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
