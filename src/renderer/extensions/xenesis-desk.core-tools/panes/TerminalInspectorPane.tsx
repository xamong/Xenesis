import React, { useEffect, useMemo, useState } from 'react';
import type { McpBridgeStatus } from '../../../../shared/types';
import { sendXenesisAgentCommand } from '../../../utils/xenesisContextSend';
import { buildAiWorkbenchPrompt, summarizeRendererState, terminalContentFromState } from '../deskIntelligence';

function sendAgentCommand(text: string): void {
  sendXenesisAgentCommand(text, { source: 'terminal-inspector' });
}

function compactTerminalMetadataText(value: string | undefined, maxLength = 140): string {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function TerminalInspectorPane() {
  const [status, setStatus] = useState<McpBridgeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function refresh(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const next = await window.mcpBridgeAPI?.status();
      setStatus(next ?? null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const summary = useMemo(() => summarizeRendererState(status?.rendererState), [status?.rendererState]);
  const terminals = useMemo(() => terminalContentFromState(status?.rendererState), [status?.rendererState]);

  return (
    <div className="xd-terminal-inspector">
      <header className="xd-intel-header">
        <div>
          <h2>Terminal Inspector</h2>
          <p>Inspect terminal sessions, send recent output to AI, and prepare safe diagnostic commands.</p>
        </div>
        <div className="xd-intel-actions">
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <button type="button" onClick={() => sendAgentCommand(buildAiWorkbenchPrompt('terminal-inspector', summary))}>
            Inspect Active
          </button>
        </div>
      </header>

      {error && <div className="xd-intel-error">{error}</div>}

      <section className="xd-terminal-list" aria-label="Terminal sessions">
        {terminals.length === 0 ? (
          <div className="xd-intel-empty">No terminal content is currently reported by the bridge.</div>
        ) : (
          terminals.map((terminal, index) => {
            const metadata = terminal.terminalMetadata;
            const isDeskSubagent = metadata?.kind === 'xenesis-desk-subagent';
            const metadataParts = [
              metadata?.agent ? `agent ${metadata.agent}` : '',
              metadata?.subagentId ? `subagent ${metadata.subagentId}` : '',
              metadata?.parentTermId ? `parent ${metadata.parentTermId}` : '',
            ].filter(Boolean);
            const task = compactTerminalMetadataText(metadata?.task);
            return (
              <article key={terminal.id} className="xd-terminal-card">
                <div>
                  <div className="xd-terminal-title-line">
                    <strong>{terminal.title || `Terminal ${index + 1}`}</strong>
                    {isDeskSubagent && <span className="xd-terminal-badge">Subagent</span>}
                  </div>
                  <span>{terminal.termId || terminal.id}</span>
                  <small>
                    {terminal.state || 'document'} / {terminal.paneId || 'no pane'}
                  </small>
                  {metadataParts.length > 0 && <small className="xd-terminal-meta">{metadataParts.join(' / ')}</small>}
                  {terminal.terminalImageAddonLoaded !== undefined && (
                    <small className="xd-terminal-meta" title={terminal.terminalImageAddonUnavailableReason}>
                      Image addon {terminal.terminalImageAddonLoaded ? 'loaded' : 'unavailable'}
                      {!terminal.terminalImageAddonLoaded && terminal.terminalImageAddonUnavailableReason
                        ? ` (${terminal.terminalImageAddonUnavailableReason})`
                        : ''}
                    </small>
                  )}
                  {isDeskSubagent && task && (
                    <small className="xd-terminal-task" title={metadata?.task}>
                      {task}
                    </small>
                  )}
                </div>
                <div className="xd-terminal-actions">
                  <button
                    type="button"
                    disabled={!terminal.termId}
                    onClick={() =>
                      sendAgentCommand(
                        `Use xenesis_desk_terminal_tail for terminal ${terminal.termId}, summarize recent output, and identify errors.`,
                      )
                    }
                  >
                    Tail to Agent
                  </button>
                  <button
                    type="button"
                    disabled={!terminal.termId}
                    onClick={() =>
                      sendAgentCommand(
                        `Prepare a safe next command for terminal ${terminal.termId}. Preview the command and ask before execution.`,
                      )
                    }
                  >
                    Next Command
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
