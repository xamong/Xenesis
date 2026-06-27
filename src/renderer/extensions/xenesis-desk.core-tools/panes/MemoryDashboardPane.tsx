import { useCallback, useEffect, useMemo, useState } from 'react';
import { deskBridge } from '../../../deskBridge';
import {
  buildMemoryCorrectionProposalArgs,
  buildMemoryDashboardModel,
  type MemoryDashboardModel,
  type MemoryDashboardRecord,
} from './memoryDashboardModel';

type MemoryDashboardTab = 'recent' | 'projects' | 'people' | 'decisions' | 'conflicts' | 'sensitive' | 'frequent';

interface ProjectionResult {
  path?: string;
  counts?: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function unwrapCapabilityPayload(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  if (record.result && typeof record.result === 'object') return unwrapCapabilityPayload(record.result);
  return record;
}

function readArrayPayload(result: unknown, key: string): Record<string, unknown>[] {
  const payload = unwrapCapabilityPayload(result);
  const value = payload[key];
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as Record<string, unknown>[] : [];
}

function formatTime(value: string | undefined): string {
  if (!value) return '-';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Date(timestamp).toLocaleString();
}

function capabilityError(result: unknown): string {
  const record = asRecord(result);
  return typeof record.error === 'string' && record.error.trim() ? record.error : 'Capability call failed.';
}

function recordsForTab(model: MemoryDashboardModel, tab: MemoryDashboardTab): MemoryDashboardRecord[] {
  if (tab === 'recent') return model.recent;
  if (tab === 'decisions') return model.decisions;
  if (tab === 'conflicts') return model.conflicts;
  if (tab === 'sensitive') return model.sensitive;
  if (tab === 'frequent') return model.frequentUse;
  if (tab === 'projects') return model.projects.flatMap((group) => group.records);
  if (tab === 'people') return model.people.flatMap((group) => group.records);
  return model.recent;
}

export function MemoryDashboardPane() {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [proposals, setProposals] = useState<Record<string, unknown>[]>([]);
  const [evidence, setEvidence] = useState<Record<string, unknown>[]>([]);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState<MemoryDashboardTab>('recent');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [correctionText, setCorrectionText] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  const model = useMemo(
    () => buildMemoryDashboardModel({ records, proposals, evidence, events }),
    [records, proposals, evidence, events],
  );
  const visibleRecords = useMemo(() => recordsForTab(model, activeTab), [model, activeTab]);
  const selected = selectedId ? model.recordsById[selectedId] : undefined;
  const selectedEvidence = selected ? model.evidenceByMemory[selected.id] ?? [] : [];

  const load = useCallback(async () => {
    setLoading(true);
    setNotice('');
    try {
      const [ledgerResult, proposalResult, evidenceResult, historyResult] = await Promise.all([
        deskBridge.call('xd.memory.ledger.list', { includeArchived: true }),
        deskBridge.call('xd.memory.proposals.list', { status: 'pending' }),
        deskBridge.call('xd.memory.evidence.list', {}),
        deskBridge.call('xd.memory.ledger.history', {}),
      ]);
      for (const result of [ledgerResult, proposalResult, evidenceResult, historyResult]) {
        if (!asRecord(result).ok) throw new Error(capabilityError(result));
      }
      setRecords(readArrayPayload(ledgerResult, 'records'));
      setProposals(readArrayPayload(proposalResult, 'proposals'));
      setEvidence(readArrayPayload(evidenceResult, 'evidence'));
      setEvents(readArrayPayload(historyResult, 'events'));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId && model.recordsById[selectedId]) return;
    setSelectedId(visibleRecords[0]?.id ?? model.recent[0]?.id ?? '');
  }, [model.recordsById, model.recent, selectedId, visibleRecords]);

  useEffect(() => {
    setCorrectionText(selected?.displayText && !selected.redacted ? selected.displayText : '');
    setCorrectionReason(selected ? `memory dashboard correction for ${selected.id}` : '');
  }, [selected]);

  async function requestProposalResolution(path: 'xd.memory.proposals.accept' | 'xd.memory.proposals.reject', id: string) {
    setBusyId(id);
    setNotice('');
    try {
      const result = await deskBridge.requestApproval(path, { id });
      const record = asRecord(result);
      if (record.ok && record.approvalRequired) {
        setNotice('Approval request created.');
      } else if (record.ok) {
        setNotice('Proposal request submitted.');
      } else {
        setNotice(capabilityError(result));
      }
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId('');
    }
  }

  async function createCorrectionProposal() {
    if (!selected || !correctionText.trim()) return;
    setBusyId(selected.id);
    setNotice('');
    try {
      const result = await deskBridge.call(
        'xd.memory.proposals.create',
        buildMemoryCorrectionProposalArgs({
          base: selected,
          correctedText: correctionText,
          reason: correctionReason,
        }),
      );
      if (!asRecord(result).ok) {
        setNotice(capabilityError(result));
      } else {
        setNotice('Correction proposal created.');
        await load();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId('');
    }
  }

  async function projectToObsidian() {
    setBusyId('obsidian');
    setNotice('');
    try {
      const result = await deskBridge.call('xd.memory.obsidian.project', {
        area: 'outputs',
        fileName: 'memory-dashboard.md',
      });
      const payload = unwrapCapabilityPayload(result) as ProjectionResult;
      if (!asRecord(result).ok && !payload.path) {
        setNotice(capabilityError(result));
      } else {
        setNotice(`Projected to ${payload.path ?? 'Obsidian output'}.`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId('');
    }
  }

  const tabs: Array<{ id: MemoryDashboardTab; label: string; count: number }> = [
    { id: 'recent', label: 'Recent', count: model.recent.length },
    { id: 'projects', label: 'Projects', count: model.projects.length },
    { id: 'people', label: 'People', count: model.people.length },
    { id: 'decisions', label: 'Decisions', count: model.decisions.length },
    { id: 'conflicts', label: 'Conflicts', count: model.conflicts.length },
    { id: 'sensitive', label: 'Sensitive', count: model.sensitive.length },
    { id: 'frequent', label: 'Frequent', count: model.frequentUse.length },
  ];

  return (
    <div className="xd-memory-dashboard">
      <header className="xd-memory-dashboard-header">
        <div className="xd-memory-dashboard-title">
          <strong>Memory Dashboard</strong>
          <span>{loading ? 'Loading' : `${model.counts.records} memories / ${model.counts.pendingProposals} pending`}</span>
        </div>
        <div className="xd-memory-dashboard-actions">
          <button type="button" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={() => void projectToObsidian()} disabled={busyId === 'obsidian'}>
            Project
          </button>
        </div>
      </header>

      {notice ? <div className="xd-memory-dashboard-notice">{notice}</div> : null}

      <section className="xd-memory-dashboard-stats" aria-label="Memory counts">
        <span>{model.counts.records} records</span>
        <span>{model.counts.evidence} evidence</span>
        <span>{model.counts.conflicts} conflicts</span>
        <span>{model.counts.sensitive} sensitive</span>
      </section>

      <nav className="xd-memory-dashboard-tabs" aria-label="Memory dashboard sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'is-active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            <strong>{tab.count}</strong>
          </button>
        ))}
      </nav>

      <main className="xd-memory-dashboard-body">
        <section className="xd-memory-dashboard-list" aria-label="Memory records">
          <div className="xd-memory-dashboard-list-head">
            <span>ID</span>
            <span>Kind</span>
            <span>Updated</span>
          </div>
          <div className="xd-memory-dashboard-rows">
            {!visibleRecords.length && !loading ? <div className="xd-memory-dashboard-empty">No records.</div> : null}
            {visibleRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                className={`xd-memory-dashboard-row${selectedId === record.id ? ' is-active' : ''}${
                  record.redacted ? ' is-redacted' : ''
                }`}
                onClick={() => setSelectedId(record.id)}
              >
                <span className="xd-memory-dashboard-row-id">{record.id}</span>
                <span>{record.kind || '-'}</span>
                <span>{formatTime(record.updatedAt || record.createdAt)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="xd-memory-dashboard-detail" aria-label="Selected memory">
          {selected ? (
            <>
              <div className="xd-memory-dashboard-detail-head">
                <div>
                  <strong>{selected.id}</strong>
                  <span>{selected.kind || 'memory'} / {selected.sensitivity || 'unknown'}</span>
                </div>
                {selected.redacted ? <span className="xd-memory-dashboard-pill is-redacted">redacted</span> : null}
              </div>
              <p className="xd-memory-dashboard-text">{selected.displayText}</p>
              <dl className="xd-memory-dashboard-meta">
                <div>
                  <dt>Source</dt>
                  <dd>{selected.source || '-'}</dd>
                </div>
                <div>
                  <dt>Valid</dt>
                  <dd>{selected.validFrom || '-'}{selected.validTo ? ` -> ${selected.validTo}` : ''}</dd>
                </div>
                <div>
                  <dt>Tags</dt>
                  <dd>{selected.tags.join(', ') || '-'}</dd>
                </div>
                <div>
                  <dt>Use</dt>
                  <dd>{selected.useCount}</dd>
                </div>
              </dl>

              <div className="xd-memory-dashboard-evidence">
                <strong>Evidence</strong>
                {selectedEvidence.length ? (
                  selectedEvidence.map((item) => (
                    <div key={item.id} className="xd-memory-dashboard-evidence-row">
                      <span>{item.id}</span>
                      <span>{item.source || '-'}</span>
                      <span>{item.summary || '-'}</span>
                    </div>
                  ))
                ) : (
                  <span>No linked evidence.</span>
                )}
              </div>

              <div className="xd-memory-dashboard-correction">
                <label>
                  Correction
                  <textarea
                    value={correctionText}
                    onChange={(event) => setCorrectionText(event.target.value)}
                    disabled={selected.redacted}
                  />
                </label>
                <label>
                  Reason
                  <input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} />
                </label>
                <button
                  type="button"
                  onClick={() => void createCorrectionProposal()}
                  disabled={selected.redacted || busyId === selected.id || !correctionText.trim()}
                >
                  Propose
                </button>
              </div>
            </>
          ) : (
            <div className="xd-memory-dashboard-empty">No selected memory.</div>
          )}
        </section>

        <aside className="xd-memory-dashboard-proposals" aria-label="Pending proposals">
          <header>
            <strong>Pending</strong>
            <span>{model.pendingProposals.length}</span>
          </header>
          <div className="xd-memory-dashboard-proposal-list">
            {model.pendingProposals.length === 0 ? <div className="xd-memory-dashboard-empty">No pending proposals.</div> : null}
            {model.pendingProposals.map((proposal) => (
              <article key={proposal.id} className={proposal.redacted ? 'is-redacted' : ''}>
                <div className="xd-memory-dashboard-proposal-head">
                  <strong>{proposal.id}</strong>
                  <span>{proposal.decision.sensitivity || 'unknown'} / {proposal.decision.reason || 'pending'}</span>
                </div>
                <p>{proposal.displayText}</p>
                <div className="xd-memory-dashboard-proposal-actions">
                  <button
                    type="button"
                    onClick={() => void requestProposalResolution('xd.memory.proposals.accept', proposal.id)}
                    disabled={busyId === proposal.id}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestProposalResolution('xd.memory.proposals.reject', proposal.id)}
                    disabled={busyId === proposal.id}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
