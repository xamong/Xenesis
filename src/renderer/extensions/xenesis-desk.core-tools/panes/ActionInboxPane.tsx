import React, { useEffect, useMemo, useState } from 'react';
import type { McpBridgeActionInboxItem, McpBridgeActionInboxResolution } from '../../../../shared/types';

interface CapabilityApprovalCommand {
  type: 'desk-capability-call';
  path: string;
  args?: unknown;
  source?: string;
}

function formatTime(value: string): string {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) return value || '';
  return new Date(millis).toLocaleString();
}

function statusLabel(item: McpBridgeActionInboxItem): string {
  const label = item.status === 'expired' ? 'expired' : item.status;
  if (item.error) return `${label} / ${item.error}`;
  if (item.result) return `${label} / ${item.result}`;
  return label;
}

function parseCapabilityApprovalCommand(item: McpBridgeActionInboxItem): CapabilityApprovalCommand | null {
  if (item.kind !== 'capability-approval') return null;
  try {
    const parsed = JSON.parse(item.command) as Partial<CapabilityApprovalCommand>;
    if (parsed?.type !== 'desk-capability-call') return null;
    if (typeof parsed.path !== 'string' || !parsed.path.trim()) return null;
    return {
      type: 'desk-capability-call',
      path: parsed.path.trim(),
      args: parsed.args,
      source: typeof parsed.source === 'string' ? parsed.source : undefined,
    };
  } catch {
    return null;
  }
}

function isCapabilityApproval(item: McpBridgeActionInboxItem): boolean {
  return item.kind === 'capability-approval' && Boolean(parseCapabilityApprovalCommand(item));
}

function formatJson(value: unknown): string {
  if (value === undefined) return '{}';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ActionInboxPane() {
  const [items, setItems] = useState<McpBridgeActionInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [resolvingId, setResolvingId] = useState('');

  async function load() {
    if (!window.mcpBridgeAPI) {
      setLoading(false);
      setNotice('MCP bridge API is not available.');
      return;
    }
    setLoading(true);
    try {
      const next = await window.mcpBridgeAPI.listActionInbox();
      setItems(next);
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    if (!window.mcpBridgeAPI) return undefined;
    return window.mcpBridgeAPI.onActionInboxChanged((next) => {
      setItems(next);
      setLoading(false);
    });
  }, []);

  const pendingCount = useMemo(() => items.filter((item) => item.status === 'pending').length, [items]);
  const expiredCount = useMemo(() => items.filter((item) => item.status === 'expired').length, [items]);

  async function resolve(item: McpBridgeActionInboxItem, resolution: McpBridgeActionInboxResolution) {
    if (!window.mcpBridgeAPI || item.status !== 'pending') return;
    setResolvingId(item.id);
    setNotice('');
    try {
      const result = await window.mcpBridgeAPI.resolveActionInboxItem({ id: item.id, resolution });
      if (!result.ok) {
        setNotice(result.error || 'Action request failed.');
      }
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setResolvingId('');
    }
  }

  function openInBot(item: McpBridgeActionInboxItem) {
    const messageId = item.id.trim();
    if (!messageId) return;
    const sessionId = item.sessionId.trim() || 'xenesis-bot';
    window.dispatchEvent(
      new CustomEvent('xenesis-bot-focus-message', {
        detail: {
          sessionId,
          messageId: item.id,
        },
      }),
    );
  }

  return (
    <div className="xd-action-inbox">
      <header className="xd-action-inbox-header">
        <div>
          <h2>Action Inbox</h2>
          <span>
            {pendingCount} pending / {expiredCount} expired / {items.length} total
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          disabled={loading}
        >
          {loading ? 'Checking' : 'Refresh'}
        </button>
      </header>

      {notice && <div className="xd-action-inbox-notice">{notice}</div>}

      <section className="xd-action-inbox-list" aria-label="Action requests">
        {!items.length && !loading ? <div className="xd-action-inbox-empty">No action requests.</div> : null}
        {items.map((item) => {
          const capability = parseCapabilityApprovalCommand(item);
          const capabilityRequest = isCapabilityApproval(item);
          return (
            <article
              key={item.id}
              className={`xd-action-card is-${item.status}${capabilityRequest ? ' is-capability-approval' : ''}`}
            >
              <div className="xd-action-card-head">
                <div>
                  <span className="xd-action-kind-pill">{capabilityRequest ? 'Capability request' : item.kind}</span>
                  <strong>{item.title}</strong>
                  <span>
                    {item.source} / {item.sessionId} / {item.kind}
                  </span>
                </div>
                <span className="xd-action-status">{statusLabel(item)}</span>
              </div>
              {capability ? (
                <div className="xd-action-capability">
                  <dl className="xd-action-capability-grid">
                    <div>
                      <dt>Path</dt>
                      <dd>{capability.path}</dd>
                    </div>
                    <div>
                      <dt>Permission</dt>
                      <dd>{item.risk || 'unknown'}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{capability.source || item.requester || 'external'}</dd>
                    </div>
                    <div>
                      <dt>Approval key</dt>
                      <dd>{item.approvalSessionKey}</dd>
                    </div>
                  </dl>
                  <div className="xd-action-capability-args">
                    <span>Arguments</span>
                    <pre>{formatJson(capability.args)}</pre>
                  </div>
                </div>
              ) : item.command ? (
                <pre className="xd-action-command">{item.command}</pre>
              ) : null}
              {item.description && <p className="xd-action-description">{item.description}</p>}
              <dl className="xd-action-meta">
                <div>
                  <dt>Created</dt>
                  <dd>{formatTime(item.createdAt)}</dd>
                </div>
                {item.resolvedAt && (
                  <div>
                    <dt>Resolved</dt>
                    <dd>{formatTime(item.resolvedAt)}</dd>
                  </div>
                )}
                {item.expiresAt && (
                  <div>
                    <dt>Expires</dt>
                    <dd>{formatTime(item.expiresAt)}</dd>
                  </div>
                )}
                {item.lastCallbackAt && (
                  <div>
                    <dt>Callback</dt>
                    <dd>{formatTime(item.lastCallbackAt)}</dd>
                  </div>
                )}
                {item.requester && (
                  <div>
                    <dt>Requester</dt>
                    <dd>{item.requester}</dd>
                  </div>
                )}
              </dl>
              <div className="xd-action-card-actions">
                {!capabilityRequest && (
                  <button type="button" className="is-open-bot" onClick={() => openInBot(item)}>
                    Open in Bot
                  </button>
                )}
                {item.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="is-approve"
                      disabled={resolvingId === item.id}
                      onClick={() => {
                        void resolve(item, 'approve');
                      }}
                    >
                      {capabilityRequest ? 'Approve capability' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="is-reject"
                      disabled={resolvingId === item.id}
                      onClick={() => {
                        void resolve(item, 'reject');
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
