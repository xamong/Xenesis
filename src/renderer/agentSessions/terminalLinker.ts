import type { AgentSession } from '../../shared/agentSessions';
import type { TerminalHostSessionInfo } from '../terminal/terminalHost';

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

function sourceMatches(session: AgentSession, terminal: TerminalHostSessionInfo): boolean {
  if (terminal.localCliAgentId === session.source) return true;
  const metadataAgent = normalizeToken(terminal.terminalMetadata?.agent);
  return Boolean(
    metadataAgent && (metadataAgent === normalizeToken(session.sourceLabel) || metadataAgent === session.source),
  );
}

function projectMatches(session: AgentSession, terminal: TerminalHostSessionInfo): boolean {
  const sessionPath = normalizePath(session.projectPath);
  const terminalPath = normalizePath(terminal.cwd || terminal.shellContext.cwd);
  return Boolean(sessionPath && terminalPath && sessionPath === terminalPath);
}

function unsafeReuseReason(terminal: TerminalHostSessionInfo): string {
  if (terminal.isAltBuffer) return 'Matched terminal is in alternate buffer.';
  if (terminal.shellContext.exited) return 'Matched terminal has exited.';
  if (terminal.lastSentCommand && terminal.active) return 'Matched terminal has a recent active command.';
  return '';
}

export function planAgentSessionResumeTarget(
  session: AgentSession,
  terminals: TerminalHostSessionInfo[],
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

  const candidates = terminals.filter(
    (terminal) => sourceMatches(session, terminal) && projectMatches(session, terminal),
  );
  for (const terminal of candidates) {
    const reason = unsafeReuseReason(terminal);
    if (!reason)
      return { target: 'existing', termId: terminal.id, command, cwd, reason: 'Idle matching terminal selected.' };
    return { target: 'new', command, cwd, reason };
  }

  return { target: 'new', command, cwd, reason: 'No safe matching terminal found.' };
}
