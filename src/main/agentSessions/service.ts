import os from 'node:os';

import {
  type AgentSession,
  type AgentSessionDiagnostic,
  type AgentSessionSource,
  type AgentSessionsAttachRequest,
  type AgentSessionsAttachResult,
  type AgentSessionsHideRequest,
  type AgentSessionsListRequest,
  type AgentSessionsPinRequest,
  type AgentSessionsScanRequest,
  type AgentSessionsScanResult,
  type AgentSessionsSearchRequest,
  type AgentSessionsStatus,
  applyAgentSessionListFilters,
  rankAgentSessions,
  summarizeAgentSessionCounts,
} from '../../shared/agentSessions';
import type { LocalCliAgentId } from '../../shared/types';
import { type AgentSessionAdapter, createAgentSessionAdapters } from './adapters';
import { AGENT_SESSION_CACHE_VERSION, AGENT_SESSION_OVERLAY_VERSION, createAgentSessionIndexStore } from './indexStore';

export interface AgentSessionServiceOptions {
  homeDir?: string;
  xenisHomeDir: string;
  adapters?: AgentSessionAdapter[];
  installedLocalCliAgents?: LocalCliAgentId[];
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function applyOverlay(
  sessions: AgentSession[],
  pinned: string[],
  hidden: string[],
  links: Record<string, { termId: string; linkedAt: string }>,
): AgentSession[] {
  const pinnedSet = new Set(pinned);
  const hiddenSet = new Set(hidden);
  return sessions.map((session) => {
    const link = links[session.id];
    const linkedSession = link
      ? {
          ...session,
          terminalId: link.termId,
          terminal: {
            termId: link.termId,
            cwd: session.projectPath,
            active: false,
            linkedAt: link.linkedAt,
          },
          state: 'linked' as const,
        }
      : session;
    return {
      ...linkedSession,
      pinned: pinnedSet.has(session.id),
      hidden: hiddenSet.has(session.id),
      state: hiddenSet.has(session.id) ? ('hidden' as const) : linkedSession.state,
    };
  });
}

export function createAgentSessionService(options: AgentSessionServiceOptions) {
  const homeDir = options.homeDir || os.homedir();
  const xenisHomeDir = options.xenisHomeDir;
  const adapters = options.adapters ?? createAgentSessionAdapters();
  const store = createAgentSessionIndexStore(xenisHomeDir);
  const installedLocalCliAgents = options.installedLocalCliAgents ?? [];

  async function loadOverlay() {
    return store.loadOverlay();
  }

  async function currentSessions(): Promise<{
    sessions: AgentSession[];
    diagnostics: AgentSessionDiagnostic[];
    savedAt: string;
  }> {
    const cache = await store.loadCache();
    const overlay = await loadOverlay();
    return {
      sessions: applyOverlay(cache.sessions, overlay.pinned, overlay.hidden, overlay.links),
      diagnostics: cache.diagnostics,
      savedAt: cache.savedAt,
    };
  }

  async function status(): Promise<AgentSessionsStatus> {
    const current = await currentSessions();
    return {
      ok: true,
      cacheVersion: AGENT_SESSION_CACHE_VERSION,
      overlayVersion: AGENT_SESSION_OVERLAY_VERSION,
      supportedSources: adapters.map((adapter) => adapter.id),
      enabledSources: adapters.map((adapter) => adapter.id),
      installedLocalCliAgents,
      counts: summarizeAgentSessionCounts(current.sessions),
      diagnostics: current.diagnostics,
      lastScannedAt: current.savedAt,
    };
  }

  async function scan(request: AgentSessionsScanRequest = {}): Promise<AgentSessionsScanResult> {
    const requested = new Set<AgentSessionSource>(request.sources ?? []);
    const selectedAdapters = requested.size ? adapters.filter((adapter) => requested.has(adapter.id)) : adapters;
    const diagnostics: AgentSessionDiagnostic[] = [];
    const sessions: AgentSession[] = [];
    const now = new Date();

    for (const adapter of selectedAdapters) {
      try {
        const result = await adapter.scan({ homeDir, xenisHomeDir, now });
        sessions.push(...result.sessions);
        diagnostics.push(...result.diagnostics);
      } catch (error) {
        diagnostics.push({
          source: adapter.id,
          level: 'error',
          message: `${adapter.label} scan failed.`,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const scannedAt = new Date().toISOString();
    await store.saveCache({ version: AGENT_SESSION_CACHE_VERSION, savedAt: scannedAt, sessions, diagnostics });
    const overlay = await loadOverlay();
    return {
      ok: true,
      sessions: applyOverlay(sessions, overlay.pinned, overlay.hidden, overlay.links),
      diagnostics,
      scannedAt,
    };
  }

  async function list(request: AgentSessionsListRequest = {}): Promise<AgentSession[]> {
    const current = await currentSessions();
    return applyAgentSessionListFilters(current.sessions, request);
  }

  async function search(request: AgentSessionsSearchRequest): Promise<AgentSession[]> {
    const listed = await list(request);
    return rankAgentSessions(listed, request.query);
  }

  async function attachTerminal(request: AgentSessionsAttachRequest): Promise<AgentSessionsAttachResult> {
    const sessionId = String(request.sessionId || '').trim();
    const termId = String(request.termId || '').trim();
    if (!sessionId) return { ok: false, error: 'sessionId is required.' };
    if (!termId) return { ok: false, error: 'termId is required.' };

    const overlay = await loadOverlay();
    const current = await currentSessions();
    const session = current.sessions.find((item) => item.id === sessionId);
    if (!session) return { ok: false, error: `Agent session not found: ${sessionId}` };

    const links = { ...overlay.links, [sessionId]: { termId, linkedAt: new Date().toISOString() } };
    await store.saveOverlay({ ...overlay, links });
    const [linkedSession] = applyOverlay([session], overlay.pinned, overlay.hidden, links);
    return { ok: true, session: linkedSession };
  }

  async function pin(request: AgentSessionsPinRequest): Promise<AgentSession[]> {
    const overlay = await loadOverlay();
    const pinned = request.pinned
      ? uniq([...overlay.pinned, request.sessionId])
      : overlay.pinned.filter((id) => id !== request.sessionId);
    await store.saveOverlay({ ...overlay, pinned });
    return list({ includeHidden: true });
  }

  async function hide(request: AgentSessionsHideRequest): Promise<AgentSession[]> {
    const overlay = await loadOverlay();
    const hidden = request.hidden
      ? uniq([...overlay.hidden, request.sessionId])
      : overlay.hidden.filter((id) => id !== request.sessionId);
    await store.saveOverlay({ ...overlay, hidden });
    return list({ includeHidden: true });
  }

  return { status, scan, list, search, attachTerminal, pin, hide };
}

export type AgentSessionService = ReturnType<typeof createAgentSessionService>;
