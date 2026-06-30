import type { AgentSession } from '../../../../shared/agentSessions';

export interface AgentSessionPanelCounts {
  total: number;
  running: number;
  linked: number;
  pinned: number;
  hidden: number;
  degraded: number;
}

export function buildAgentSessionPanelCounts(sessions: AgentSession[]): AgentSessionPanelCounts {
  return {
    total: sessions.length,
    running: sessions.filter((item) => item.state === 'running').length,
    linked: sessions.filter((item) => item.state === 'linked').length,
    pinned: sessions.filter((item) => item.pinned).length,
    hidden: sessions.filter((item) => item.hidden).length,
    degraded: sessions.filter((item) => item.state === 'degraded' || item.sourceDetails.scanStatus === 'failed').length,
  };
}

export function getAgentSessionActionState(session: AgentSession): {
  canResume: boolean;
  resumeReason: string;
  canAttach: boolean;
  canPin: boolean;
  canHide: boolean;
} {
  if (!session.resumeCommand) {
    return {
      canResume: false,
      resumeReason: 'This session has no resume command.',
      canAttach: true,
      canPin: true,
      canHide: true,
    };
  }

  if (session.state === 'unavailable') {
    return {
      canResume: false,
      resumeReason: 'The original session source is unavailable.',
      canAttach: true,
      canPin: true,
      canHide: true,
    };
  }

  return {
    canResume: true,
    resumeReason: 'Ready to resume.',
    canAttach: true,
    canPin: true,
    canHide: true,
  };
}
