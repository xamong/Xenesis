import React, { useEffect, useMemo, useState } from 'react';
import type { DiagnosticsLogEntry, McpBridgeStatus } from '../../../../shared/types';

type CheckState = 'idle' | 'checking' | 'ok' | 'warn' | 'error';

interface ListenerCheck {
  state: CheckState;
  message: string;
}

function statusText(value: CheckState): string {
  if (value === 'ok') return 'OK';
  if (value === 'warn') return 'Check';
  if (value === 'error') return 'Error';
  if (value === 'checking') return 'Checking';
  return 'Idle';
}

function bridgeState(status: McpBridgeStatus | null): CheckState {
  if (!status) return 'idle';
  if (!status.bridge.available) return 'warn';
  return status.bridge.tokenPresent ? 'ok' : 'warn';
}

function extractWindowsUser(bridgeStatePath: string): string {
  const match = bridgeStatePath.match(/\\Users\\([^\\]+)\\/i);
  return match?.[1] || 'user';
}

function buildHermesEnvSnippet(status: McpBridgeStatus | null, listenerUrl: string): string {
  const statePath = status?.bridge.bridgeStatePath || '%USERPROFILE%\\.xenis\\mcp\\bridge.json';
  const wslStatePath = statePath
    .replace(/^([A-Za-z]):\\/, (_match, drive) => `/mnt/${String(drive).toLowerCase()}/`)
    .replace(/\\/g, '/');
  return [
    `STATE="${wslStatePath}"`,
    "WIN_HOST_IP=$(awk '/nameserver/{print $2; exit}' /etc/resolv.conf)",
    "TOKEN=$(python3 -c \"import json, os; print(json.load(open(os.environ['STATE']))['bridgeToken'])\")",
    'export XENIS_MCP_STATE_FILE="$STATE"',
    'export XENIS_MCP_BRIDGE_URL="http://$WIN_HOST_IP:3847"',
    'export XENIS_MCP_BRIDGE_TOKEN="$TOKEN"',
    `export XENIS_BOT_INPUT_URL="${listenerUrl}"`,
    'export XENIS_BOT_ALLOWED_USERS="xenesis"',
  ].join('\n');
}

function defaultWslHermesRoot(status: McpBridgeStatus | null): string {
  const user = extractWindowsUser(status?.bridge.bridgeStatePath || '');
  return `\\\\wsl.localhost\\Ubuntu\\home\\${user}\\.hermes\\hermes-agent`;
}

function defaultArtifactPath(status: McpBridgeStatus | null): string {
  const item = status?.openFiles.find((entry): entry is { filePath: string; fileName?: string } =>
    Boolean(entry && typeof entry === 'object' && 'filePath' in entry && typeof entry.filePath === 'string'),
  );
  return item?.filePath || '';
}

function recentMcpEvents(items: DiagnosticsLogEntry[]): DiagnosticsLogEntry[] {
  return items
    .filter(
      (item) => item.scope === 'mcp' || /MCP|Bot|Hermes|xenesis_desk/i.test(`${item.message} ${item.detail || ''}`),
    )
    .slice(0, 8);
}

export function HermesStatusPane() {
  const [bridgeStatus, setBridgeStatus] = useState<McpBridgeStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsLogEntry[]>([]);
  const [listenerUrl, setListenerUrl] = useState('http://127.0.0.1:3859/message');
  const [listener, setListener] = useState<ListenerCheck>({ state: 'idle', message: 'Not checked' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const bridge = bridgeState(bridgeStatus);
  const events = useMemo(() => recentMcpEvents(diagnostics), [diagnostics]);
  const artifactPath = defaultArtifactPath(bridgeStatus);
  const envSnippet = useMemo(() => buildHermesEnvSnippet(bridgeStatus, listenerUrl), [bridgeStatus, listenerUrl]);
  const wslRoot = useMemo(() => defaultWslHermesRoot(bridgeStatus), [bridgeStatus]);

  async function checkBotListener(url: string) {
    setListener({ state: 'checking', message: url });
    try {
      const response = await fetch(url, { method: 'OPTIONS' });
      const ok = response.ok || response.status === 204;
      setListener({
        state: ok ? 'ok' : 'warn',
        message: `${response.status} ${response.statusText || ''}`.trim(),
      });
    } catch (error) {
      setListener({
        state: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function load() {
    setBusy(true);
    setNotice('');
    try {
      const [status, logs] = await Promise.all([window.mcpBridgeAPI?.status?.(), window.diagnosticsAPI.list()]);
      setBridgeStatus(status ?? null);
      setDiagnostics(logs);
      await checkBotListener(listenerUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function runSmokeTest() {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(listenerUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'xenesis-bot',
          text: '/xd status',
          userId: 'xenesis',
          userName: 'Xenesis Desk',
        }),
      });
      setNotice(response.ok ? 'Smoke request accepted' : `Smoke request failed: HTTP ${response.status}`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function copyEnv() {
    await navigator.clipboard.writeText(envSnippet);
    setNotice('Environment snippet copied');
  }

  async function openBot() {
    await window.extensionAPI.runCommand('xenesis-desk.core-tools.openXenisBot');
  }

  async function openLogs() {
    await window.diagnosticsAPI.revealLogFile();
  }

  async function revealArtifact() {
    if (!artifactPath) return;
    await window.terminalAPI.revealPath(artifactPath);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="xd-hermes-status">
      <header className="xd-hermes-status-header">
        <div>
          <h2>Hermes Status</h2>
          <span>{bridgeStatus?.generatedAt || 'No snapshot yet'}</span>
        </div>
        <div className="xd-hermes-status-actions">
          <button type="button" onClick={load} disabled={busy}>
            Check
          </button>
          <button type="button" onClick={openBot}>
            Open Bot
          </button>
          <button type="button" onClick={openLogs}>
            Open Logs
          </button>
          <button type="button" onClick={copyEnv}>
            Copy Env
          </button>
          <button type="button" onClick={runSmokeTest} disabled={busy}>
            Run Smoke Test
          </button>
        </div>
      </header>

      {notice && <div className="xd-hermes-status-notice">{notice}</div>}

      <section className="xd-hermes-status-grid">
        <article className={`xd-hermes-status-card is-${bridge}`}>
          <div className="xd-hermes-status-card-head">
            <span>Bridge</span>
            <strong>{statusText(bridge)}</strong>
          </div>
          <dl>
            <dt>URL</dt>
            <dd>{bridgeStatus?.bridge.bridgeUrl || '-'}</dd>
            <dt>Token</dt>
            <dd>{bridgeStatus?.bridge.tokenPresent ? 'present' : 'missing'}</dd>
            <dt>State</dt>
            <dd>{bridgeStatus?.bridge.bridgeStatePath || '-'}</dd>
          </dl>
        </article>

        <article className={`xd-hermes-status-card is-${listener.state}`}>
          <div className="xd-hermes-status-card-head">
            <span>Bot Listener</span>
            <strong>{statusText(listener.state)}</strong>
          </div>
          <label className="xd-hermes-status-input">
            <span>URL</span>
            <input value={listenerUrl} onChange={(event) => setListenerUrl(event.target.value)} />
          </label>
          <p>{listener.message}</p>
        </article>

        <article className="xd-hermes-status-card">
          <div className="xd-hermes-status-card-head">
            <span>Portproxy</span>
            <strong>WSL2</strong>
          </div>
          <dl>
            <dt>Bridge</dt>
            <dd>172.22.64.1:3847 -&gt; 127.0.0.1:3847</dd>
            <dt>Listener</dt>
            <dd>172.22.64.1:3859 -&gt; 127.0.0.1:3859</dd>
            <dt>Hermes root</dt>
            <dd>{wslRoot}</dd>
          </dl>
        </article>

        <article className="xd-hermes-status-card">
          <div className="xd-hermes-status-card-head">
            <span>Xenesis Desk</span>
            <strong>{bridgeStatus?.app.version || '-'}</strong>
          </div>
          <dl>
            <dt>Packaged</dt>
            <dd>{bridgeStatus ? String(bridgeStatus.app.packaged) : '-'}</dd>
            <dt>Open files</dt>
            <dd>{bridgeStatus?.openFiles.length ?? 0}</dd>
            <dt>Bot panes</dt>
            <dd>
              {bridgeStatus?.rendererState?.contents.filter((item) => item.contentType === 'xenesis-bot').length ?? 0}
            </dd>
          </dl>
        </article>
      </section>

      <section className="xd-hermes-status-lower">
        <article className="xd-hermes-status-panel">
          <div className="xd-hermes-status-panel-head">
            <h3>Recent Events</h3>
            <span>{events.length}</span>
          </div>
          <div className="xd-hermes-status-events">
            {events.length === 0 ? (
              <div className="xd-hermes-status-empty">No recent MCP or Hermes events.</div>
            ) : (
              events.map((item) => (
                <div key={item.id} className={`xd-hermes-status-event is-${item.level}`}>
                  <div>
                    <strong>{item.message}</strong>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {item.detail && <code>{item.detail}</code>}
                </div>
              ))
            )}
          </div>
        </article>

        <article className="xd-hermes-status-panel">
          <div className="xd-hermes-status-panel-head">
            <h3>Artifacts</h3>
            <button type="button" onClick={revealArtifact} disabled={!artifactPath}>
              Reveal
            </button>
          </div>
          <div className="xd-hermes-status-artifact">{artifactPath || 'No open artifact reported.'}</div>
          <pre>{envSnippet}</pre>
        </article>
      </section>
    </div>
  );
}
