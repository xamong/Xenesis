import React, { useCallback, useEffect, useState } from 'react';

interface AuditEntry {
  timestamp: string;
  path: string;
  source: string;
  sourceAgent?: string;
  permission: string;
  approved: boolean;
  resultOk: boolean;
  durationMs: number;
}

export default function AuditLogPane() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [permFilter, setPermFilter] = useState<string>('all');

  const loadEntries = useCallback(async () => {
    try {
      const bridge = (window as any).deskBridgeAPI;
      if (!bridge) return;
      const result = await bridge.callCapability({ path: 'xd.audit.list', args: { limit: 200 }, source: 'renderer' });
      if (result?.ok && Array.isArray(result.result)) setEntries(result.result);
    } catch {
      /* audit not yet wired */
    }
  }, []);

  useEffect(() => {
    loadEntries();
    const timer = setInterval(loadEntries, 5000);
    return () => clearInterval(timer);
  }, [loadEntries]);

  const filtered = permFilter === 'all' ? entries : entries.filter((e) => e.permission === permFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--border, #333)' }}>
        {['all', 'read', 'control', 'write', 'execute', 'danger'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPermFilter(p)}
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
              background: permFilter === p ? 'var(--accent, #2563eb)' : 'var(--bg3, #222)',
              color: permFilter === p ? '#fff' : 'var(--ink-2, #aaa)',
            }}
          >
            {p}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--ink-3, #666)', fontSize: 11 }}>{filtered.length} records</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border, #333)',
                position: 'sticky',
                top: 0,
                background: 'var(--bg2, #161616)',
              }}
            >
              {['Time', 'Path', 'Source', 'Permission', 'Result', 'Duration'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '6px 8px',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: 10,
                    color: 'var(--ink-3, #888)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3, #666)' }}>
                  No audit records.
                </td>
              </tr>
            ) : (
              filtered.map((entry, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border, #222)' }}>
                  <td style={{ padding: '4px 8px', fontSize: 10, color: 'var(--ink-3, #888)' }}>
                    {entry.timestamp?.slice(11, 19)}
                  </td>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10 }}>{entry.path}</td>
                  <td style={{ padding: '4px 8px' }}>{entry.sourceAgent || entry.source}</td>
                  <td style={{ padding: '4px 8px' }}>
                    <span
                      style={{
                        fontSize: 9,
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontWeight: 700,
                        background:
                          entry.permission === 'danger'
                            ? '#7f1d1d'
                            : entry.permission === 'execute'
                              ? '#1e3a5f'
                              : '#1e293b',
                        color: entry.permission === 'danger' ? '#fca5a5' : '#94a3b8',
                      }}
                    >
                      {entry.permission}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', color: entry.resultOk ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                    {entry.resultOk ? 'OK' : 'ERR'}
                  </td>
                  <td style={{ padding: '4px 8px', color: 'var(--ink-3, #888)' }}>{entry.durationMs}ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
