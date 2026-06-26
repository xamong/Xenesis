import React, { useEffect, useMemo, useState } from 'react';
import type { ProcessInfo } from '../../../../shared/types';
import { sendXenesisAgentCommand } from '../../../utils/xenesisContextSend';

function sendAgentCommand(text: string): void {
  sendXenesisAgentCommand(text, { source: 'process-viewer' });
}

function formatBytes(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '-';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let next = value / 1024;
  let unitIndex = 0;
  while (next >= 1024 && unitIndex < units.length - 1) {
    next /= 1024;
    unitIndex += 1;
  }
  return `${next.toFixed(next >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function processPrompt(processInfo: ProcessInfo): string {
  return [
    'Inspect this Xenesis Desk process context.',
    `PID: ${processInfo.pid}`,
    `PPID: ${processInfo.ppid ?? '-'}`,
    `Name: ${processInfo.name}`,
    `Memory: ${formatBytes(processInfo.memoryBytes)}`,
    `Path: ${processInfo.path || '-'}`,
    `Command: ${processInfo.command || processInfo.name}`,
    '',
    'Explain what this process likely does and what should be checked before any terminate action.',
  ].join('\n');
}

export function ProcessViewerPane() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function refresh(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const next = await window.processViewerAPI.list();
      setProcesses(next);
      setStatus(`Loaded ${next.length} processes.`);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredProcesses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return processes;
    return processes.filter((processInfo) =>
      [processInfo.pid, processInfo.ppid, processInfo.name, processInfo.command, processInfo.path].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(needle),
      ),
    );
  }, [processes, query]);

  async function terminate(processInfo: ProcessInfo): Promise<void> {
    const ok = window.confirm(`Terminate process ${processInfo.pid} (${processInfo.name})?`);
    if (!ok) return;
    setStatus('');
    setError('');
    try {
      const result = await window.processViewerAPI.kill(processInfo.pid, false);
      if (!result.ok) {
        setError(result.error || result.message || `Failed to terminate ${processInfo.pid}.`);
        return;
      }
      setStatus(result.message || `Termination requested for ${processInfo.pid}.`);
      await refresh();
    } catch (terminateError) {
      setError(terminateError instanceof Error ? terminateError.message : String(terminateError));
    }
  }

  return (
    <div className="xd-process-viewer">
      <header className="xd-intel-header">
        <div>
          <h2>Process Viewer</h2>
          <p>Read-only local process list with guarded terminate and Agent handoff.</p>
        </div>
        <div className="xd-intel-actions">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter pid, name, command"
          />
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </header>

      {status && <div className="xd-intel-status">{status}</div>}
      {error && <div className="xd-intel-error">{error}</div>}

      <div className="xd-process-table-wrap">
        <table className="xd-process-table">
          <thead>
            <tr>
              <th>PID</th>
              <th>PPID</th>
              <th>Name</th>
              <th>Memory</th>
              <th>Command</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProcesses.length === 0 ? (
              <tr>
                <td colSpan={6}>No processes found.</td>
              </tr>
            ) : (
              filteredProcesses.map((processInfo) => (
                <tr key={`${processInfo.pid}-${processInfo.name}`}>
                  <td>{processInfo.pid}</td>
                  <td>{processInfo.ppid ?? '-'}</td>
                  <td title={processInfo.path || processInfo.name}>{processInfo.name}</td>
                  <td>{formatBytes(processInfo.memoryBytes)}</td>
                  <td title={processInfo.command}>{processInfo.command || '-'}</td>
                  <td>
                    <div className="xd-table-actions">
                      <button type="button" onClick={() => sendAgentCommand(processPrompt(processInfo))}>
                        Send to Agent
                      </button>
                      <button type="button" className="is-danger" onClick={() => void terminate(processInfo)}>
                        Terminate
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
