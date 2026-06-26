import React, { useCallback, useEffect, useState } from 'react';
import {
  type NetworkRequestEntry,
  type NetworkRequestSource,
  networkMonitorStore,
} from '../../../observability/networkMonitorStore';

const SOURCE_COLORS: Record<NetworkRequestSource, string> = {
  mcp: '#06b6d4',
  gateway: '#f59e0b',
  playwright: '#8b5cf6',
  api: '#3b82f6',
  gowoori: '#ec4899',
  meta: '#14b8a6',
  connector: '#10b981',
  xenesis: '#a3e635',
  terminal: '#22c55e',
};

export default function NetworkMonitorPane() {
  const [entries, setEntries] = useState<NetworkRequestEntry[]>([]);
  const [sourceFilter, setSourceFilter] = useState<NetworkRequestSource | 'all'>('all');

  const refresh = useCallback(() => {
    const opts = sourceFilter === 'all' ? { limit: 200 } : { source: sourceFilter as NetworkRequestSource, limit: 200 };
    setEntries(networkMonitorStore.getEntries(opts));
  }, [sourceFilter]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [refresh]);

  const statusColor = (status?: number) => {
    if (!status) return '#666';
    if (status < 300) return '#22c55e';
    if (status < 400) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--border, #333)' }}>
        {(
          ['all', 'mcp', 'gateway', 'api', 'connector', 'xenesis', 'terminal', 'gowoori', 'meta', 'playwright'] as const
        ).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSourceFilter(s as any)}
            style={{
              padding: '3px 8px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
              background: sourceFilter === s ? 'var(--accent, #2563eb)' : 'var(--bg3, #222)',
              color: sourceFilter === s ? '#fff' : 'var(--ink-2, #aaa)',
            }}
          >
            {s === 'all' ? 'All' : s.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            networkMonitorStore.clear();
            refresh();
          }}
          style={{
            marginLeft: 'auto',
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--border, #444)',
            background: 'transparent',
            color: 'var(--ink-3, #888)',
            cursor: 'pointer',
            fontSize: 10,
          }}
        >
          Clear
        </button>
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
              {['Source', 'Method', 'URL', 'Status', 'Duration', 'Size'].map((h) => (
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
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3, #666)' }}>
                  No requests captured.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border, #222)' }}>
                  <td style={{ padding: '4px 8px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: SOURCE_COLORS[entry.source],
                        marginRight: 4,
                      }}
                    />
                    {entry.source}
                  </td>
                  <td style={{ padding: '4px 8px', fontWeight: 600 }}>{entry.method}</td>
                  <td
                    style={{
                      padding: '4px 8px',
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.url}
                  </td>
                  <td style={{ padding: '4px 8px', color: statusColor(entry.status), fontWeight: 600 }}>
                    {entry.status || '...'}
                  </td>
                  <td style={{ padding: '4px 8px', color: 'var(--ink-3, #888)' }}>
                    {entry.durationMs ? `${entry.durationMs}ms` : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', color: 'var(--ink-3, #888)' }}>
                    {entry.size ? `${(entry.size / 1024).toFixed(1)}KB` : '—'}
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
