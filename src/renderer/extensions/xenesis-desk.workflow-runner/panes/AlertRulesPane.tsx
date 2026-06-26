import React, { useCallback, useMemo, useState } from 'react';
import { type AlertRule, type AlertSeverity, createAlertRulesEngine } from '../alertRules';

const engine = createAlertRulesEngine();

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
};

export default function AlertRulesPane() {
  const [rules, setRules] = useState<AlertRule[]>(() => engine.listRules());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    condition: '',
    severity: 'warning' as AlertSeverity,
    message: '',
    cooldownMs: 300000,
  });

  const refresh = useCallback(() => setRules(engine.listRules()), []);

  const addRule = useCallback(() => {
    if (!draft.name || !draft.condition) return;
    engine.addRule({
      id: `rule-${Date.now()}`,
      name: draft.name,
      condition: draft.condition,
      severity: draft.severity,
      message: draft.message || `Alert: ${draft.name}`,
      channels: ['toast'],
      cooldownMs: draft.cooldownMs,
      enabled: true,
    });
    setDraft({ name: '', condition: '', severity: 'warning', message: '', cooldownMs: 300000 });
    refresh();
  }, [draft, refresh]);

  const removeRule = useCallback(
    (id: string) => {
      engine.removeRule(id);
      refresh();
    },
    [refresh],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontSize: 12 }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border, #333)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Alert Rules</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input
            placeholder="Rule name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--border, #444)',
              background: 'var(--bg3, #222)',
              color: 'var(--ink, #eee)',
              fontSize: 11,
            }}
          />
          <input
            placeholder="= $.cpu > 90"
            value={draft.condition}
            onChange={(e) => setDraft((d) => ({ ...d, condition: e.target.value }))}
            style={{
              flex: 2,
              minWidth: 160,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--border, #444)',
              background: 'var(--bg3, #222)',
              color: 'var(--ink, #eee)',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          />
          <select
            value={draft.severity}
            onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value as AlertSeverity }))}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--border, #444)',
              background: 'var(--bg3, #222)',
              color: 'var(--ink, #eee)',
              fontSize: 11,
            }}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <button
            type="button"
            onClick={addRule}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              background: 'var(--accent, #2563eb)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {rules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3, #666)' }}>
            No alert rules defined. Add a rule above.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderBottom: '1px solid var(--border, #222)',
              }}
            >
              <div
                style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: SEVERITY_COLORS[rule.severity] }}
              />
              <span style={{ fontWeight: 600, minWidth: 100 }}>{rule.name}</span>
              <code style={{ flex: 1, fontSize: 10, color: 'var(--ink-2, #aaa)', fontFamily: 'monospace' }}>
                {rule.condition}
              </code>
              <span style={{ fontSize: 10, color: 'var(--ink-3, #888)' }}>{rule.cooldownMs / 1000}s cooldown</span>
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                style={{
                  padding: '2px 8px',
                  borderRadius: 3,
                  border: '1px solid #ef4444',
                  background: 'transparent',
                  color: '#ef4444',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
