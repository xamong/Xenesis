import { useEffect, useMemo, useState } from 'react';

import type { AgentSession, AgentSessionsStatus } from '../../../../shared/agentSessions';
import { deskBridge } from '../../../deskBridge';
import {
  buildAgentSessionPanelCounts,
  formatAgentSessionTerminalLink,
  getAgentSessionActionState,
} from './agentSessionsPanelModel';

type SourceFilter = 'all' | AgentSession['source'];
type StateFilter = 'all' | AgentSession['state'];

export function AgentSessionsPane() {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [status, setStatus] = useState<AgentSessionsStatus | null>(null);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [state, setState] = useState<StateFilter>('all');
  const [includeHidden, setIncludeHidden] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState('');

  async function refresh(scan = false): Promise<void> {
    setLoading(true);
    setError('');
    try {
      if (scan) await window.agentSessionsAPI?.scan({ force: true });
      const nextStatus = (await window.agentSessionsAPI?.status()) ?? null;
      const request = {
        includeHidden,
        sources: source === 'all' ? undefined : [source],
        states: state === 'all' ? undefined : [state],
        limit: 200,
      };
      const nextSessions = query.trim()
        ? ((await window.agentSessionsAPI?.search({ ...request, query: query.trim() })) ?? [])
        : ((await window.agentSessionsAPI?.list(request)) ?? []);
      setStatus(nextStatus);
      setSessions(nextSessions);
      if (!selectedId && nextSessions[0]) setSelectedId(nextSessions[0].id);
      if (selectedId && !nextSessions.some((item) => item.id === selectedId) && nextSessions[0]) {
        setSelectedId(nextSessions[0].id);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh(false);
  }, [source, state, includeHidden]);

  const counts = useMemo(() => buildAgentSessionPanelCounts(sessions), [sessions]);
  const selected = sessions.find((item) => item.id === selectedId) ?? sessions[0];
  const actionState = selected ? getAgentSessionActionState(selected) : null;

  async function pinSelected(pinned: boolean): Promise<void> {
    if (!selected) return;
    await window.agentSessionsAPI?.pin({ sessionId: selected.id, pinned });
    setLastAction(pinned ? 'Pinned' : 'Unpinned');
    await refresh(false);
  }

  async function hideSelected(hidden: boolean): Promise<void> {
    if (!selected) return;
    await window.agentSessionsAPI?.hide({ sessionId: selected.id, hidden });
    setLastAction(hidden ? 'Hidden' : 'Restored');
    await refresh(false);
  }

  async function previewResume(): Promise<void> {
    if (!selected) return;
    const result = await deskBridge.call(
      'xd.agentSessions.resume',
      { sessionId: selected.id, previewOnly: true },
      { approved: true },
    );
    setLastAction(result.ok ? 'Preview ready' : result.error || 'Preview failed');
  }

  async function resumeSelected(): Promise<void> {
    if (!selected) return;
    const result = await deskBridge.call(
      'xd.agentSessions.resume',
      { sessionId: selected.id, target: 'smart' },
      { approved: false },
    );
    if (result.approvalRequired) {
      setLastAction('Desk approval required');
    } else {
      setLastAction(result.ok ? 'Resume requested' : result.error || 'Resume failed');
    }
    await refresh(false);
  }

  async function attachSelectedToActiveTerminal(): Promise<void> {
    if (!selected) return;
    const listResult = await deskBridge.call('xd.terminals.list', {}, { approved: false });
    if (!listResult.ok) {
      setLastAction(listResult.error || 'Terminal list failed');
      return;
    }
    const payload = listResult.result && typeof listResult.result === 'object' ? listResult.result : {};
    const terminalSessions = Array.isArray((payload as { sessions?: unknown }).sessions)
      ? (payload as { sessions: Array<Record<string, unknown>> }).sessions
      : Array.isArray(listResult.result)
        ? (listResult.result as Array<Record<string, unknown>>)
        : [];
    const terminal =
      terminalSessions.find((item) => item.active === true) ??
      terminalSessions.find((item) => typeof item.id === 'string' && item.id);
    const termId = typeof terminal?.id === 'string' ? terminal.id : '';
    if (!termId) {
      setLastAction('No terminal is available to attach');
      return;
    }
    const result = await deskBridge.call(
      'xd.agentSessions.attachTerminal',
      { sessionId: selected.id, termId },
      { approved: false },
    );
    if (result.approvalRequired) {
      setLastAction('Desk approval required');
    } else {
      setLastAction(result.ok ? `Linked terminal ${termId}` : result.error || 'Attach failed');
    }
    await refresh(false);
  }

  return (
    <div className="xd-agent-sessions">
      <header className="xd-agent-sessions-head">
        <div>
          <h2>Agent Sessions</h2>
          <p>Saved sessions, running terminals, and subagent resumes.</p>
        </div>
        <div className="xd-agent-sessions-actions">
          <button type="button" onClick={() => void refresh(true)} disabled={loading}>
            {loading ? 'Scanning' : 'Rescan'}
          </button>
        </div>
      </header>

      <div className="xd-agent-sessions-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void refresh(false);
          }}
          placeholder="Search"
          spellCheck={false}
        />
        <select value={source} onChange={(event) => setSource(event.target.value as SourceFilter)}>
          <option value="all">All sources</option>
          {status?.supportedSources.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={state} onChange={(event) => setState(event.target.value as StateFilter)}>
          <option value="all">All states</option>
          <option value="saved">Saved</option>
          <option value="running">Running</option>
          <option value="linked">Linked</option>
          <option value="hidden">Hidden</option>
          <option value="unavailable">Unavailable</option>
          <option value="degraded">Degraded</option>
        </select>
        <label>
          <input type="checkbox" checked={includeHidden} onChange={(event) => setIncludeHidden(event.target.checked)} />
          Hidden
        </label>
        <button type="button" onClick={() => void refresh(false)}>
          Search
        </button>
      </div>

      {error && <div className="xd-agent-sessions-error">{error}</div>}
      {lastAction && <div className="xd-agent-sessions-status">{lastAction}</div>}

      <div className="xd-agent-sessions-counts">
        <span>Total {counts.total}</span>
        <span>Running {counts.running}</span>
        <span>Linked {counts.linked}</span>
        <span>Pinned {counts.pinned}</span>
        <span>Hidden {counts.hidden}</span>
        <span>Degraded {counts.degraded}</span>
      </div>

      <div className="xd-agent-sessions-layout">
        <section className="xd-agent-sessions-list" aria-label="Agent session list">
          {sessions.length === 0 ? (
            <div className="xd-agent-sessions-empty">No sessions</div>
          ) : (
            sessions.map((session) => (
              <button
                type="button"
                key={session.id}
                className={`xd-agent-session-row${selected?.id === session.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(session.id)}
              >
                <span className="xd-agent-session-badge">{session.sourceLabel}</span>
                <strong>{session.title}</strong>
                <small>{session.projectName}</small>
                <small>{session.state}</small>
              </button>
            ))
          )}
        </section>

        <aside className="xd-agent-session-detail" aria-label="Selected session detail">
          {selected ? (
            <>
              <div>
                <span className="xd-agent-session-badge">{selected.sourceLabel}</span>
                <h3>{selected.title}</h3>
                <p>{selected.summary || selected.lastUserPrompt || 'No summary'}</p>
              </div>
              <dl>
                <dt>Project</dt>
                <dd>{selected.projectPath || selected.projectName}</dd>
                <dt>Updated</dt>
                <dd>{selected.updatedAt}</dd>
                <dt>Source</dt>
                <dd>{selected.sourceDetails.scanStatus}</dd>
                <dt>Resume</dt>
                <dd>{selected.resumeCommand || actionState?.resumeReason}</dd>
                <dt>Terminal</dt>
                <dd>{formatAgentSessionTerminalLink(selected)}</dd>
              </dl>
              <div className="xd-agent-session-detail-actions">
                <button type="button" disabled={!actionState?.canResume} onClick={() => void previewResume()}>
                  Preview
                </button>
                <button type="button" disabled={!actionState?.canResume} onClick={() => void resumeSelected()}>
                  Resume
                </button>
                <button
                  type="button"
                  disabled={!actionState?.canAttach}
                  onClick={() => void attachSelectedToActiveTerminal()}
                >
                  Attach Active Terminal
                </button>
                <button
                  type="button"
                  disabled={!actionState?.canPin}
                  onClick={() => void pinSelected(!selected.pinned)}
                >
                  {selected.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  disabled={!actionState?.canHide}
                  onClick={() => void hideSelected(!selected.hidden)}
                >
                  {selected.hidden ? 'Unhide' : 'Hide'}
                </button>
              </div>
              <pre>{JSON.stringify(selected.sourceDetails, null, 2)}</pre>
            </>
          ) : (
            <div className="xd-agent-sessions-empty">Select a session</div>
          )}
        </aside>
      </div>
    </div>
  );
}
