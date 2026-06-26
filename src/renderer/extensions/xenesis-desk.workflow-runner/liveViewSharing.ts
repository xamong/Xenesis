/**
 * Live View Sharing (Sprint 9-3).
 *
 * Shares XCON rendered output via URL for real-time collaboration.
 * Phase 1: read-only sharing via Gateway /live/:sessionId route.
 */

export interface LiveViewSession {
  id: string;
  title: string;
  source: string;
  fixtureJson?: string;
  createdAt: number;
  expiresAt?: number;
  viewerCount: number;
}

const sessions = new Map<string, LiveViewSession>();

export function createLiveViewSession(
  title: string,
  source: string,
  fixtureJson?: string,
  ttlMs = 3600000,
): LiveViewSession {
  const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session: LiveViewSession = {
    id,
    title,
    source,
    fixtureJson,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
    viewerCount: 0,
  };
  sessions.set(id, session);
  return session;
}

export function getLiveViewSession(id: string): LiveViewSession | undefined {
  const session = sessions.get(id);
  if (session?.expiresAt && Date.now() > session.expiresAt) {
    sessions.delete(id);
    return undefined;
  }
  return session;
}

export function updateLiveViewSource(id: string, source: string, fixtureJson?: string): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  session.source = source;
  if (fixtureJson !== undefined) session.fixtureJson = fixtureJson;
  return true;
}

export function closeLiveViewSession(id: string): boolean {
  return sessions.delete(id);
}

export function listLiveViewSessions(): LiveViewSession[] {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt && now > session.expiresAt) sessions.delete(id);
  }
  return Array.from(sessions.values());
}

export function getLiveViewUrl(sessionId: string, gatewayUrl: string): string {
  return `${gatewayUrl}/live/${sessionId}`;
}
