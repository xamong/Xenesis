import React, { useCallback, useEffect, useState } from 'react';

interface AgentMetrics {
  agentId: string;
  taskType: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  completionRate: number;
  avgResponseMs: number;
  avgTokens: number;
  correctionCount: number;
  approvalRate: number;
  lastUpdated: number;
}

interface SmartRouterRecommendation {
  agentId: string;
  score: number;
  reason: string;
  metrics: AgentMetrics;
}

export default function AgentPerformancePane() {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [taskType, setTaskType] = useState('');
  const [recommendations, setRecommendations] = useState<SmartRouterRecommendation[]>([]);

  const refresh = useCallback(() => {
    // Agent performance data will be populated when agentPerformanceTracker
    // is connected via CR (xd.evaluation.metrics). Currently shows empty state.
  }, [taskType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontSize: 12 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #333)' }}>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Agent Performance</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            placeholder="Filter by task type..."
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            style={{
              flex: 1,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--border, #444)',
              background: 'var(--bg3, #222)',
              color: 'var(--ink, #eee)',
              fontSize: 11,
            }}
          />
          <button
            type="button"
            onClick={refresh}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              border: 'none',
              background: 'var(--accent, #2563eb)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {recommendations.length > 0 && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              background: 'var(--bg3, #1a1f2e)',
              borderRadius: 8,
              border: '1px solid var(--border, #333)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6, color: 'var(--accent, #60a5fa)' }}>
              Smart Router Recommendation
            </div>
            {recommendations.map((r) => (
              <div key={r.agentId} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                <span style={{ fontWeight: 700, minWidth: 80 }}>{r.agentId}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-2, #aaa)' }}>Score: {r.score}</span>
                <span style={{ fontSize: 10, color: 'var(--ink-3, #888)' }}>{r.reason}</span>
              </div>
            ))}
          </div>
        )}
        {metrics.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3, #666)' }}>
            No performance data recorded yet. Agent tasks will appear here.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border, #333)' }}>
                {['Agent', 'Task Type', 'Total', 'Rate', 'Avg Time', 'Corrections'].map((h) => (
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
              {metrics.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border, #222)' }}>
                  <td style={{ padding: '4px 8px', fontWeight: 600 }}>{m.agentId}</td>
                  <td style={{ padding: '4px 8px' }}>{m.taskType}</td>
                  <td style={{ padding: '4px 8px' }}>{m.totalTasks}</td>
                  <td
                    style={{
                      padding: '4px 8px',
                      color: m.completionRate > 0.9 ? '#22c55e' : m.completionRate > 0.7 ? '#f59e0b' : '#ef4444',
                      fontWeight: 600,
                    }}
                  >
                    {(m.completionRate * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: '4px 8px', color: 'var(--ink-3, #888)' }}>
                    {(m.avgResponseMs / 1000).toFixed(1)}s
                  </td>
                  <td style={{ padding: '4px 8px' }}>{m.correctionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
