import React, { useCallback, useState } from 'react';
import { type ArtifactSnapshot, createArtifactVersionStore } from '../../../artifacts/artifactVersionStore';

const store = createArtifactVersionStore();

export default function ArtifactVersionPane() {
  const [snapshots, setSnapshots] = useState<ArtifactSnapshot[]>(() => store.list());
  const [compareA, setCompareA] = useState<string>('');
  const [compareB, setCompareB] = useState<string>('');
  const [diffResult, setDiffResult] = useState<string>('');

  const refresh = useCallback(() => setSnapshots(store.list()), []);

  const handleCompare = useCallback(() => {
    if (!compareA || !compareB) return;
    const diff = store.compare(compareA, compareB);
    if (!diff) {
      setDiffResult('Snapshot not found.');
      return;
    }
    setDiffResult(
      `Source changed: ${diff.sourceChanged ? 'YES' : 'no'} (${diff.sourceDiffLines} lines diff)\n` +
        `Fixture changed: ${diff.fixtureChanged ? 'YES' : 'no'}\n` +
        (diff.fixtureDiffKeys.length > 0 ? `Changed keys: ${diff.fixtureDiffKeys.join(', ')}` : ''),
    );
  }, [compareA, compareB]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontSize: 12 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #333)' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Artifact Versions</div>
        <span style={{ fontSize: 10, color: 'var(--ink-3, #888)' }}>{snapshots.length} snapshots</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {snapshots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3, #666)' }}>
            No snapshots saved. Use "Save Snapshot" from the artifact menu.
          </div>
        ) : (
          snapshots.map((snap) => (
            <div
              key={snap.id}
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid var(--border, #222)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{snap.name}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3, #888)' }}>
                  {new Date(snap.createdAt).toLocaleString()} · {snap.source.length} chars
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  store.remove(snap.id);
                  refresh();
                }}
                style={{
                  padding: '2px 8px',
                  borderRadius: 3,
                  border: '1px solid var(--border, #444)',
                  background: 'transparent',
                  color: 'var(--ink-3, #888)',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
        {snapshots.length >= 2 && (
          <div style={{ marginTop: 12, padding: 10, background: 'var(--bg3, #1a1f2e)', borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Compare</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <select
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
                style={{
                  flex: 1,
                  padding: '3px 6px',
                  borderRadius: 4,
                  border: '1px solid var(--border, #444)',
                  background: 'var(--bg3, #222)',
                  color: 'var(--ink, #eee)',
                  fontSize: 10,
                }}
              >
                <option value="">Select A</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
                style={{
                  flex: 1,
                  padding: '3px 6px',
                  borderRadius: 4,
                  border: '1px solid var(--border, #444)',
                  background: 'var(--bg3, #222)',
                  color: 'var(--ink, #eee)',
                  fontSize: 10,
                }}
              >
                <option value="">Select B</option>
                {snapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCompare}
                style={{
                  padding: '3px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'var(--accent, #2563eb)',
                  color: '#fff',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Diff
              </button>
            </div>
            {diffResult && (
              <pre style={{ fontSize: 10, color: 'var(--ink-2, #aaa)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {diffResult}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
