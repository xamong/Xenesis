import type { AgentSession } from './agentSessions';
import { isVisibleSubagentTerminalMetadata } from './agentSessions';
import type { LocalTerminalCliSelection, McpBridgeTerminalMetadata } from './types';

export interface AgentSessionTerminalMatchInfo {
  id: string;
  kind?: unknown;
  cwd?: string;
  shellCwd?: string;
  localCliAgentId?: LocalTerminalCliSelection;
  terminalMetadata?: McpBridgeTerminalMetadata;
  metadata?: McpBridgeTerminalMetadata;
  mcpMetadata?: McpBridgeTerminalMetadata;
  lastSentCommand?: string;
  lastCommand?: string;
  active?: boolean;
  exited?: boolean;
  isAltBuffer?: boolean;
  shellContext?: {
    cwd?: string;
    lastSentCommand?: string;
    exited?: boolean;
  };
}

export interface AgentSessionResumeTargetPlan {
  target: 'existing' | 'new' | 'active';
  command: string;
  cwd: string;
  termId?: string;
  reason: string;
}

function normalizePath(value: string | undefined): string {
  return String(value ?? '')
    .replace(/[\\/]+$/, '')
    .toLowerCase();
}

function normalizeToken(value: string | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function terminalMetadata(terminal: AgentSessionTerminalMatchInfo): McpBridgeTerminalMetadata | undefined {
  return terminal.terminalMetadata ?? terminal.metadata ?? terminal.mcpMetadata;
}

function sourceMatches(session: AgentSession, terminal: AgentSessionTerminalMatchInfo): boolean {
  if (terminal.localCliAgentId === session.source) return true;
  const metadata = terminalMetadata(terminal);
  if (normalizeToken(metadata?.agentSessionSource) === normalizeToken(session.source)) return true;
  const metadataAgent = normalizeToken(metadata?.agent);
  return Boolean(
    metadataAgent && (metadataAgent === normalizeToken(session.sourceLabel) || metadataAgent === session.source),
  );
}

function projectMatches(session: AgentSession, terminal: AgentSessionTerminalMatchInfo): boolean {
  const sessionPath = normalizePath(session.projectPath);
  const metadataPath = normalizePath(terminalMetadata(terminal)?.projectPath);
  const terminalPath = normalizePath(terminal.cwd || terminal.shellCwd || terminal.shellContext?.cwd);
  return Boolean(sessionPath && (metadataPath === sessionPath || terminalPath === sessionPath));
}

function unsafeReuseReason(terminal: AgentSessionTerminalMatchInfo): string {
  const metadata = terminalMetadata(terminal);
  if (isVisibleSubagentTerminalMetadata(metadata))
    return 'Matched terminal is app-managed and cannot be reused safely.';
  if (terminal.isAltBuffer) return 'Matched terminal is in alternate buffer.';
  if (terminal.exited || terminal.shellContext?.exited) return 'Matched terminal has exited.';
  const lastCommand = terminal.lastSentCommand || terminal.lastCommand || terminal.shellContext?.lastSentCommand || '';
  if (lastCommand && terminal.active) return 'Matched terminal has a recent active command.';
  return '';
}

function linkedTermIds(session: AgentSession): string[] {
  return [session.terminalId, session.terminal?.termId].filter((value): value is string => Boolean(value));
}

function rankCandidate(session: AgentSession, terminal: AgentSessionTerminalMatchInfo): number {
  if (linkedTermIds(session).includes(terminal.id)) return 0;
  if (sourceMatches(session, terminal) && projectMatches(session, terminal)) return 1;
  if (projectMatches(session, terminal) && terminal.localCliAgentId === session.source) return 2;
  return 99;
}

export function planAgentSessionResumeTarget(
  session: AgentSession,
  terminals: AgentSessionTerminalMatchInfo[],
  options: { target?: 'smart' | 'new' | 'active'; termId?: string; activeTermId?: string } = {},
): AgentSessionResumeTargetPlan {
  const command = session.resumeCommand || '';
  const cwd = session.projectPath;
  if (options.target === 'new') return { target: 'new', command, cwd, reason: 'New terminal requested.' };

  const explicitTermId = options.termId || (options.target === 'active' ? options.activeTermId : '');
  if (explicitTermId) {
    const terminal = terminals.find((item) => item.id === explicitTermId);
    if (terminal)
      return { target: 'existing', termId: terminal.id, command, cwd, reason: 'Explicit terminal requested.' };
  }

  const candidates = terminals
    .map((terminal) => ({ terminal, rank: rankCandidate(session, terminal) }))
    .filter((entry) => entry.rank < 99)
    .sort((a, b) => a.rank - b.rank);
  let firstUnsafeReason = '';
  for (const { terminal } of candidates) {
    const reason = unsafeReuseReason(terminal);
    if (!reason)
      return { target: 'existing', termId: terminal.id, command, cwd, reason: 'Idle matching terminal selected.' };
    firstUnsafeReason ||= reason;
  }

  return { target: 'new', command, cwd, reason: firstUnsafeReason || 'No safe matching terminal found.' };
}
