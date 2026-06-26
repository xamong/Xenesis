import React, { useEffect, useMemo, useState } from 'react';
import type { McpBridgeActionInboxItem } from '../../../../shared/types';
import type { ArtifactLibraryTimelineEvent } from '../deskIntelligence';
import {
  ARTIFACT_TIMELINE_STORAGE_KEY,
  mergeArtifactTimelineEvents,
  parseArtifactTimelineEvents,
  serializeArtifactTimelineEvents,
} from '../deskIntelligence';
import {
  buildHermesTimelineItems,
  buildHermesTimelineMarkdownFromItems,
  buildHermesTimelineWorkPacketMarkdown,
  buildHermesWorkPacketHistoryItems,
  buildHermesWorkPacketReceiptItems,
  filterHermesTimelineItems,
  type HermesTimelineItem,
  type HermesWorkPacketHistoryItem,
  type HermesWorkPacketReceiptAction,
  type HermesWorkPacketReceiptItem,
  timelineArtifactFocusCommand,
  timelineArtifactOpenCommand,
} from '../hermesTimeline.mjs';
import {
  getXenisBotSession,
  getXenisBotSessionsSnapshot,
  recordXenisBotLocalMessage,
  subscribeXenisBotSessions,
  type XenisBotSession,
} from '../xenisBotStore';

function readStoredArtifactTimelineEvents(): ArtifactLibraryTimelineEvent[] {
  try {
    return parseArtifactTimelineEvents(window.localStorage.getItem(ARTIFACT_TIMELINE_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistArtifactTimelineEvents(events: ArtifactLibraryTimelineEvent[]): void {
  try {
    window.localStorage.setItem(ARTIFACT_TIMELINE_STORAGE_KEY, serializeArtifactTimelineEvents(events));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}

function formatTime(value: string): string {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) return value || '';
  return new Date(millis).toLocaleString();
}

function focusBotMessage(item: HermesTimelineItem) {
  if (!item.messageId) return;
  window.dispatchEvent(
    new CustomEvent('xenesis-bot-focus-message', {
      detail: {
        sessionId: item.sessionId || 'xenesis-bot',
        messageId: item.messageId,
      },
    }),
  );
}

function focusWorkPacketMessage(packet: HermesWorkPacketHistoryItem) {
  window.dispatchEvent(
    new CustomEvent('xenesis-bot-focus-message', {
      detail: {
        sessionId: packet.sessionId || 'xenesis-bot',
        messageId: packet.messageId,
      },
    }),
  );
}

function focusWorkPacketReceiptMessage(receipt: HermesWorkPacketReceiptItem) {
  window.dispatchEvent(
    new CustomEvent('xenesis-bot-focus-message', {
      detail: {
        sessionId: receipt.sessionId || 'xenesis-bot',
        messageId: receipt.messageId,
      },
    }),
  );
}

function focusWorkPacketReceiptActionMessage(
  receipt: HermesWorkPacketReceiptItem,
  action: HermesWorkPacketReceiptAction,
) {
  window.dispatchEvent(
    new CustomEvent('xenesis-bot-focus-message', {
      detail: {
        sessionId: receipt.sessionId || 'xenesis-bot',
        messageId: action.messageId,
      },
    }),
  );
}

function itemBadge(item: HermesTimelineItem): string {
  if (item.type === 'artifact') return item.kind || 'artifact';
  return item.status || 'approval';
}

function findSessionForItem(item: HermesTimelineItem, sessions: XenisBotSession[]): XenisBotSession | undefined {
  const sessionId = item.sessionId || 'xenesis-bot';
  return sessions.find((session) => session.id === sessionId);
}

function findWorkPacketTargetSession(items: HermesTimelineItem[], sessions: XenisBotSession[]): XenisBotSession {
  const sessionId = items.find((item) => item.sessionId)?.sessionId || 'xenesis-bot';
  return (
    sessions.find((session) => session.id === sessionId) ??
    sessions.find((session) => session.inputUrl?.trim()) ??
    getXenisBotSession(sessionId)
  );
}

export function HermesTimelinePane() {
  const [sessions, setSessions] = useState<XenisBotSession[]>(() => getXenisBotSessionsSnapshot());
  const [actionInbox, setActionInbox] = useState<McpBridgeActionInboxItem[]>([]);
  const [notice, setNotice] = useState('');
  const [timelineQuery, setTimelineQuery] = useState('');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<'all' | HermesTimelineItem['type']>('all');
  const [timelineSessionFilter, setTimelineSessionFilter] = useState('all');
  const [selectedTimelineItemIds, setSelectedTimelineItemIds] = useState<Set<string>>(() => new Set());
  const [artifactTimelineEvents, setArtifactTimelineEvents] = useState<ArtifactLibraryTimelineEvent[]>(() =>
    readStoredArtifactTimelineEvents(),
  );

  async function loadActions() {
    if (!window.mcpBridgeAPI) return;
    try {
      setActionInbox(await window.mcpBridgeAPI.listActionInbox());
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => subscribeXenisBotSessions(setSessions), []);

  useEffect(() => {
    void loadActions();
    if (!window.mcpBridgeAPI) return undefined;
    return window.mcpBridgeAPI.onActionInboxChanged(setActionInbox);
  }, []);

  useEffect(() => {
    function onArtifactTimelineEvent(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (!detail?.id) return;
      setArtifactTimelineEvents((current) => {
        const next = mergeArtifactTimelineEvents(current, [detail], 200);
        persistArtifactTimelineEvents(next);
        return next;
      });
    }
    window.addEventListener('xenesis-artifact-timeline-event', onArtifactTimelineEvent);
    return () => window.removeEventListener('xenesis-artifact-timeline-event', onArtifactTimelineEvent);
  }, []);

  const items = useMemo(
    () => buildHermesTimelineItems({ actionInbox, sessions, artifactEvents: artifactTimelineEvents }),
    [actionInbox, artifactTimelineEvents, sessions],
  );
  const workPacketHistoryItems = useMemo(() => buildHermesWorkPacketHistoryItems(sessions), [sessions]);
  const workPacketReceiptItems = useMemo(() => buildHermesWorkPacketReceiptItems(sessions), [sessions]);

  const sessionOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.sessionId).filter(Boolean))).sort(),
    [items],
  );

  const filteredItems = useMemo(
    () =>
      filterHermesTimelineItems(items, {
        type: timelineTypeFilter,
        sessionId: timelineSessionFilter,
        query: timelineQuery,
      }),
    [items, timelineQuery, timelineSessionFilter, timelineTypeFilter],
  );

  const artifactCount = useMemo(() => filteredItems.filter((item) => item.type === 'artifact').length, [filteredItems]);
  const approvalCount = useMemo(() => filteredItems.filter((item) => item.type === 'approval').length, [filteredItems]);
  const artifactActionCount = useMemo(
    () => filteredItems.filter((item) => item.type === 'artifact-control').length,
    [filteredItems],
  );
  const selectedTimelineItems = useMemo(
    () => items.filter((item) => selectedTimelineItemIds.has(item.id)),
    [items, selectedTimelineItemIds],
  );
  const workPacketItems = selectedTimelineItems.length ? selectedTimelineItems : filteredItems;

  function toggleTimelineItemSelection(itemId: string) {
    setSelectedTimelineItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function selectVisibleTimelineItems() {
    setSelectedTimelineItemIds((current) => {
      const next = new Set(current);
      for (const item of filteredItems) next.add(item.id);
      return next;
    });
  }

  function clearTimelineSelection() {
    setSelectedTimelineItemIds(new Set());
  }

  async function revealFile(item: HermesTimelineItem) {
    if (!item.filePath) return;
    try {
      await window.terminalAPI?.revealPath(item.filePath);
      setNotice(`Reveal: ${item.filePath}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function copyFilePath(item: HermesTimelineItem) {
    if (!item.filePath) return;
    try {
      await navigator.clipboard.writeText(item.filePath);
      setNotice(`Copied: ${item.filePath}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function exportMarkdown() {
    if (!window.fileAPI?.saveTextAs) {
      setNotice('File save API is not available.');
      return;
    }
    try {
      const content = buildHermesTimelineMarkdownFromItems(filteredItems, { generatedAt: new Date().toISOString() });
      const result = await window.fileAPI?.saveTextAs({
        defaultName: `hermes-timeline-${new Date().toISOString().slice(0, 10)}.md`,
        content,
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      });
      setNotice(result?.saved ? `Exported: ${result.path || 'Hermes timeline Markdown'}` : 'Export cancelled.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function exportWorkPacket() {
    if (!window.fileAPI?.saveTextAs) {
      setNotice('File save API is not available.');
      return;
    }
    try {
      const content = buildHermesTimelineWorkPacketMarkdown(workPacketItems, { generatedAt: new Date().toISOString() });
      const result = await window.fileAPI?.saveTextAs({
        defaultName: `hermes-work-packet-${new Date().toISOString().slice(0, 10)}.md`,
        content,
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Text', extensions: ['txt'] },
        ],
      });
      const countLabel = selectedTimelineItems.length
        ? `${selectedTimelineItems.length} selected item(s)`
        : `${filteredItems.length} visible item(s)`;
      setNotice(
        result?.saved ? `Exported work packet for ${countLabel}: ${result.path || 'Markdown'}` : 'Export cancelled.',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  }

  async function sendWorkPacketToBot() {
    if (!workPacketItems.length) {
      setNotice('No Work Packet items to send.');
      return;
    }

    const targetSession = findWorkPacketTargetSession(workPacketItems, sessions);
    const sessionId = targetSession.id || 'xenesis-bot';
    const inputUrl = targetSession.inputUrl?.trim() || '';
    if (!inputUrl) {
      setNotice(`Send unavailable: Bot input URL is missing for ${sessionId}.`);
      return;
    }

    const text = buildHermesTimelineWorkPacketMarkdown(workPacketItems, { generatedAt: new Date().toISOString() });
    const message = recordXenisBotLocalMessage(sessionId, text);
    window.dispatchEvent(
      new CustomEvent('xenesis-bot-focus-message', {
        detail: { sessionId, messageId: message.id },
      }),
    );

    try {
      const response = await fetch(inputUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text,
          userId: 'xenesis',
          userName: 'Xenesis Desk',
          xenesis_desk: {
            surface: 'timeline',
            mode: 'work-packet',
            workPacketItemCount: workPacketItems.length,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const countLabel = selectedTimelineItems.length
        ? `${selectedTimelineItems.length} selected item(s)`
        : `${filteredItems.length} visible item(s)`;
      setNotice(`Sent work packet to Bot for ${countLabel}.`);
    } catch (error) {
      setNotice(`Send work packet failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function resendWorkPacket(packet: HermesWorkPacketHistoryItem) {
    const targetSession =
      sessions.find((session) => session.id === packet.sessionId) ?? getXenisBotSession(packet.sessionId);
    const sessionId = targetSession.id || packet.sessionId || 'xenesis-bot';
    const inputUrl = targetSession.inputUrl?.trim() || '';
    if (!inputUrl) {
      setNotice(`Resend unavailable: Bot input URL is missing for ${sessionId}.`);
      focusWorkPacketMessage(packet);
      return;
    }

    const message = recordXenisBotLocalMessage(sessionId, packet.content);
    window.dispatchEvent(
      new CustomEvent('xenesis-bot-focus-message', {
        detail: { sessionId, messageId: message.id },
      }),
    );

    try {
      const response = await fetch(inputUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text: packet.content,
          userId: 'xenesis',
          userName: 'Xenesis Desk',
          xenesis_desk: {
            surface: 'timeline',
            mode: 'work-packet-history',
            sourceMessageId: packet.messageId,
            workPacketItemCount: packet.itemCount,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setNotice(`Resent ${packet.title} to Bot.`);
    } catch (error) {
      setNotice(`Resend work packet failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function submitWorkPacketReceiptCommand(receipt: HermesWorkPacketReceiptItem, command: string, action: string) {
    const text = command.trim();
    if (!text) return;
    const targetSession =
      sessions.find((session) => session.id === receipt.sessionId) ?? getXenisBotSession(receipt.sessionId);
    const sessionId = targetSession.id || receipt.sessionId || 'xenesis-bot';
    const inputUrl = targetSession.inputUrl?.trim() || '';
    if (!inputUrl) {
      setNotice(`${action} unavailable: Bot input URL is missing for ${sessionId}.`);
      focusWorkPacketReceiptMessage(receipt);
      return;
    }

    const xenesisDesk = {
      surface: 'timeline',
      mode: 'work-packet-receipt',
      sourceMessageId: receipt.messageId,
      packetCommand: text,
      workPacketItemCount: receipt.itemCount,
    };
    const message = recordXenisBotLocalMessage(sessionId, text, xenesisDesk);
    window.dispatchEvent(
      new CustomEvent('xenesis-bot-focus-message', {
        detail: { sessionId, messageId: message.id },
      }),
    );

    try {
      const response = await fetch(inputUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text,
          userId: 'xenesis',
          userName: 'Xenesis Desk',
          xenesis_desk: xenesisDesk,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setNotice(`${action}: ${text}`);
    } catch (error) {
      setNotice(`${action} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function submitTimelineBotCommand(item: HermesTimelineItem, command: string, action: string) {
    const text = command.trim();
    if (!text) return;
    const sessionId = item.sessionId || 'xenesis-bot';
    const inputUrl = findSessionForItem(item, sessions)?.inputUrl?.trim() || '';
    if (!inputUrl) {
      setNotice(`${action} unavailable: Bot input URL is missing for ${sessionId}.`);
      focusBotMessage(item);
      return;
    }

    const message = recordXenisBotLocalMessage(sessionId, text);
    window.dispatchEvent(
      new CustomEvent('xenesis-bot-focus-message', {
        detail: { sessionId, messageId: message.id },
      }),
    );

    try {
      const response = await fetch(inputUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text,
          userId: 'xenesis',
          userName: 'Xenesis Desk',
          xenesis_desk: {
            surface: 'timeline',
            mode: 'artifact-control',
            artifactAction: action.toLowerCase(),
            artifactTitle: item.title,
            artifactPath: item.filePath,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setNotice(`${action}: ${item.title || text}`);
    } catch (error) {
      setNotice(`${action} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <div className="xd-hermes-timeline">
      <header className="xd-hermes-timeline-header">
        <div>
          <h2>Hermes Timeline</h2>
          <span>
            {artifactCount} artifacts / {approvalCount} approvals / {artifactActionCount} artifact actions /{' '}
            {filteredItems.length} shown / {items.length} total
          </span>
        </div>
        <div className="xd-hermes-timeline-header-actions">
          <button type="button" onClick={selectVisibleTimelineItems} disabled={!filteredItems.length}>
            Select visible
          </button>
          <button type="button" onClick={clearTimelineSelection} disabled={!selectedTimelineItemIds.size}>
            Clear selection
          </button>
          <button
            type="button"
            onClick={() => {
              void exportWorkPacket();
            }}
            disabled={!workPacketItems.length}
          >
            Export Work Packet
          </button>
          <button
            type="button"
            onClick={() => {
              void sendWorkPacketToBot();
            }}
            disabled={!workPacketItems.length}
          >
            Send Work Packet to Bot
          </button>
          <button
            type="button"
            onClick={() => {
              void exportMarkdown();
            }}
          >
            Export Markdown
          </button>
          <button
            type="button"
            onClick={() => {
              void loadActions();
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="xd-hermes-timeline-filters" aria-label="Hermes timeline filters">
        <label className="xd-hermes-timeline-search">
          <span>Search</span>
          <input
            type="search"
            value={timelineQuery}
            aria-label="Search Hermes timeline"
            placeholder="Title, command, file path, result..."
            onChange={(event) => setTimelineQuery(event.target.value)}
          />
        </label>
        <div className="xd-hermes-timeline-segmented" aria-label="Filter Hermes timeline by type">
          <button
            type="button"
            className={timelineTypeFilter === 'all' ? 'is-active' : ''}
            onClick={() => setTimelineTypeFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={timelineTypeFilter === 'artifact' ? 'is-active' : ''}
            onClick={() => setTimelineTypeFilter('artifact')}
          >
            artifact
          </button>
          <button
            type="button"
            className={timelineTypeFilter === 'artifact-control' ? 'is-active' : ''}
            onClick={() => setTimelineTypeFilter('artifact-control')}
          >
            Artifact actions
          </button>
          <button
            type="button"
            className={timelineTypeFilter === 'approval' ? 'is-active' : ''}
            onClick={() => setTimelineTypeFilter('approval')}
          >
            approval
          </button>
        </div>
        <label className="xd-hermes-timeline-session">
          <span>Session</span>
          <select
            value={timelineSessionFilter}
            aria-label="Filter Hermes timeline by session"
            onChange={(event) => setTimelineSessionFilter(event.target.value)}
          >
            <option value="all">All sessions</option>
            {sessionOptions.map((sessionId) => (
              <option key={sessionId} value={sessionId}>
                {sessionId}
              </option>
            ))}
          </select>
        </label>
      </section>

      {notice && <div className="xd-hermes-timeline-notice">{notice}</div>}

      {selectedTimelineItemIds.size > 0 && (
        <div className="xd-hermes-timeline-selection">
          {selectedTimelineItemIds.size} selected. Work Packet export will use selected items.
        </div>
      )}

      {workPacketReceiptItems.length > 0 && (
        <section className="xd-hermes-work-packet-receipts" aria-label="Work Packet Receipts">
          <div className="xd-hermes-work-packet-receipts-head">
            <h3>Work Packet Receipts</h3>
            <span>{workPacketReceiptItems.length} received from Hermes</span>
          </div>
          <div className="xd-hermes-work-packet-receipts-list">
            {workPacketReceiptItems.map((receipt) => (
              <article key={receipt.id} className="xd-hermes-work-packet-receipt">
                <div className="xd-hermes-work-packet-receipt-main">
                  <strong>{receipt.title}</strong>
                  <span>
                    {formatTime(receipt.at)} / {receipt.sessionId}
                  </span>
                  {receipt.summary && <p>{receipt.summary}</p>}
                  {receipt.actions.length > 0 && (
                    <div className="xd-hermes-work-packet-action-statuses" aria-label="Receipt action status">
                      {receipt.actions.map((action) => (
                        <div key={action.id} className={`xd-hermes-work-packet-action-status is-${action.status}`}>
                          <div>
                            <span>{action.status}</span>
                            <code>{action.command}</code>
                            {action.summary && <p>{action.summary}</p>}
                          </div>
                          <button type="button" onClick={() => focusWorkPacketReceiptActionMessage(receipt, action)}>
                            Open result
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="xd-hermes-work-packet-receipt-actions">
                  <button type="button" onClick={() => focusWorkPacketReceiptMessage(receipt)}>
                    Open in Bot
                  </button>
                  {receipt.artifactPaths.map((artifact) => (
                    <button
                      key={`${receipt.id}:open:${artifact.index}`}
                      type="button"
                      onClick={() => {
                        void submitWorkPacketReceiptCommand(receipt, artifact.command, `Open #${artifact.index}`);
                      }}
                      title={artifact.path}
                    >
                      Open #{artifact.index}
                    </button>
                  ))}
                  {receipt.replayCommands.map((command) => (
                    <button
                      key={`${receipt.id}:replay:${command.index}`}
                      type="button"
                      onClick={() => {
                        void submitWorkPacketReceiptCommand(receipt, command.command, `Replay #${command.index}`);
                      }}
                      title={command.label}
                    >
                      Replay #{command.index}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {workPacketHistoryItems.length > 0 && (
        <section className="xd-hermes-work-packets" aria-label="Pinned Work Packets">
          <div className="xd-hermes-work-packets-head">
            <h3>Pinned Work Packets</h3>
            <span>{workPacketHistoryItems.length} saved from Bot history</span>
          </div>
          <div className="xd-hermes-work-packets-list">
            {workPacketHistoryItems.map((packet) => (
              <article key={packet.id} className="xd-hermes-work-packet">
                <div>
                  <strong>{packet.title}</strong>
                  <span>
                    {formatTime(packet.at)} / {packet.sessionId}
                  </span>
                  {packet.summary && <p>{packet.summary}</p>}
                </div>
                <div className="xd-hermes-work-packet-actions">
                  <button type="button" onClick={() => focusWorkPacketMessage(packet)}>
                    Open in Bot
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void resendWorkPacket(packet);
                    }}
                  >
                    Resend
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="xd-hermes-timeline-list" aria-label="Hermes timeline">
        {!filteredItems.length ? (
          <div className="xd-hermes-timeline-empty">
            {items.length ? 'No Hermes activity matches the current filters.' : 'No Hermes activity yet.'}
          </div>
        ) : null}
        {filteredItems.map((item) => {
          const openCommand = timelineArtifactOpenCommand(item);
          const focusCommand = timelineArtifactFocusCommand(item);
          const selected = selectedTimelineItemIds.has(item.id);
          return (
            <article key={item.id} className={`xd-hermes-timeline-item is-${item.type}`}>
              <div className="xd-hermes-timeline-marker" aria-hidden="true" />
              <div className="xd-hermes-timeline-card">
                <div className="xd-hermes-timeline-card-head">
                  <div className="xd-hermes-timeline-title-row">
                    <label className="xd-hermes-timeline-select">
                      <input
                        type="checkbox"
                        checked={selected}
                        aria-label={`Select timeline item ${item.title}`}
                        onChange={() => toggleTimelineItemSelection(item.id)}
                      />
                    </label>
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {formatTime(item.at)} / {item.sessionId}
                      </span>
                    </div>
                  </div>
                  <span className="xd-hermes-timeline-badge">{itemBadge(item)}</span>
                </div>
                {item.summary && <p>{item.summary}</p>}
                {item.command && <pre>{item.command}</pre>}
                {(item.result || item.error) && (
                  <div className="xd-hermes-timeline-result">{item.error || item.result}</div>
                )}
                <div className="xd-hermes-timeline-actions">
                  <button type="button" onClick={() => focusBotMessage(item)}>
                    Open in Bot
                  </button>
                  {item.type === 'artifact' && (
                    <>
                      <button
                        type="button"
                        disabled={!openCommand}
                        onClick={() => {
                          void submitTimelineBotCommand(item, timelineArtifactOpenCommand(item), 'Open');
                        }}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        disabled={!focusCommand}
                        onClick={() => {
                          void submitTimelineBotCommand(item, timelineArtifactFocusCommand(item), 'Focus');
                        }}
                      >
                        Focus
                      </button>
                    </>
                  )}
                  {item.filePath && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          void revealFile(item);
                        }}
                      >
                        Reveal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void copyFilePath(item);
                        }}
                      >
                        Copy path
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
