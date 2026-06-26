import React, { useEffect, useMemo, useState } from 'react';
import type {
  AppSettings,
  RemoteFileProfile,
  RemoteSyncAction,
  RemoteSyncPlan,
  RemoteSyncPlanEntry,
} from '../../../../shared/types';
import {
  EXPLORER_REMOTE_SYNC_HANDOFF_EVENT,
  type ExplorerRemoteSyncHandoff,
  getExplorerRemoteSyncHandoff,
} from '../../../utils/explorerContextStore';
import { sendXenesisAgentCommand } from '../../../utils/xenesisContextSend';
import { buildRemoteSyncPlan } from '../remoteSyncPlanner';

const ACTION_LABELS: Record<RemoteSyncAction, string> = {
  upload: 'Upload',
  download: 'Download',
  equal: 'Same name',
  conflict: 'Conflict',
  'local-only': 'Local only',
  'remote-only': 'Remote only',
  'skip-directory': 'Directory',
};

function sendAgentCommand(text: string): void {
  sendXenesisAgentCommand(text, { source: 'remote-sync-planner' });
}

function profileList(settings: AppSettings | null): RemoteFileProfile[] {
  return settings?.remoteFiles?.profiles ?? [];
}

function planPrompt(plan: RemoteSyncPlan): string {
  const rows = plan.entries.slice(0, 30).map((entry) => `- ${entry.action}: ${entry.name} (${entry.reason})`);
  return [
    'Review this Xenesis Desk Remote Sync Planner result.',
    `Local directory: ${plan.localDir}`,
    `Remote profile: ${plan.profileName}`,
    `Remote path: ${plan.remotePath}`,
    `Generated: ${plan.generatedAt}`,
    '',
    'Counts:',
    `- upload: ${plan.counts.upload}`,
    `- download: ${plan.counts.download}`,
    `- equal: ${plan.counts.equal}`,
    `- conflict: ${plan.counts.conflict}`,
    `- local-only: ${plan.counts['local-only']}`,
    `- remote-only: ${plan.counts['remote-only']}`,
    `- skip-directory: ${plan.counts['skip-directory']}`,
    '',
    'Entries:',
    ...rows,
    plan.entries.length > rows.length ? `- ... ${plan.entries.length - rows.length} more` : '',
    '',
    'Recommend safe upload/download actions. Do not delete files automatically.',
  ]
    .filter(Boolean)
    .join('\n');
}

function actionClassName(entry: RemoteSyncPlanEntry): string {
  return `xd-sync-action is-${entry.action.replace(/[^a-z0-9]/g, '-')}`;
}

export function RemoteSyncPlannerPane() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [localDir, setLocalDir] = useState('');
  const [profileId, setProfileId] = useState('');
  const [remotePath, setRemotePath] = useState('/');
  const [plan, setPlan] = useState<RemoteSyncPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const profiles = useMemo(() => profileList(settings), [settings]);
  const selectedProfile = useMemo(
    () => (profileId ? (profiles.find((profile) => profile.id === profileId) ?? null) : (profiles[0] ?? null)),
    [profileId, profiles],
  );

  function applyExplorerHandoff(handoff: ExplorerRemoteSyncHandoff | null): void {
    if (!handoff) return;
    setLocalDir(handoff.localDir);
    setProfileId(handoff.profileId);
    setRemotePath(handoff.remotePath || '/');
    setPlan(null);
    setError('');
    setStatus(
      `Explorer context loaded: ${handoff.localDir} -> ${handoff.profileName || handoff.profileId}:${handoff.remotePath}`,
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setError('');
      try {
        const next = await window.terminalAPI.getSettings();
        if (cancelled) return;
        setSettings(next);
        const handoff = getExplorerRemoteSyncHandoff();
        if (handoff) {
          applyExplorerHandoff(handoff);
          return;
        }
        const firstProfile = next.remoteFiles?.profiles?.[0];
        if (firstProfile) {
          setProfileId((current) => current || firstProfile.id);
          setRemotePath((current) => (current === '/' && firstProfile.rootPath ? firstProfile.rootPath : current));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExplorerHandoff = (event: Event) => {
      const detail = (event as CustomEvent<ExplorerRemoteSyncHandoff>).detail;
      applyExplorerHandoff(detail ?? getExplorerRemoteSyncHandoff());
    };
    window.addEventListener(EXPLORER_REMOTE_SYNC_HANDOFF_EVENT, handleExplorerHandoff);
    return () => window.removeEventListener(EXPLORER_REMOTE_SYNC_HANDOFF_EVENT, handleExplorerHandoff);
  }, []);

  async function browseLocalDir(): Promise<void> {
    const selected = await window.fsAPI.selectDir();
    if (selected) setLocalDir(selected);
  }

  async function compare(): Promise<void> {
    setLoading(true);
    setStatus('');
    setError('');
    try {
      if (!localDir.trim()) {
        setError('Select a local directory first.');
        return;
      }
      if (!selectedProfile) {
        setError('Create or select a remote file profile first.');
        return;
      }
      const targetRemotePath = remotePath.trim() || selectedProfile.rootPath || '/';
      const [localEntries, remoteEntries] = await Promise.all([
        window.fsAPI.listDir(localDir.trim()),
        window.remoteFileAPI.list(selectedProfile, targetRemotePath),
      ]);
      const nextPlan = buildRemoteSyncPlan({
        localDir: localDir.trim(),
        remotePath: targetRemotePath,
        profile: selectedProfile,
        localEntries,
        remoteEntries,
      });
      setPlan(nextPlan);
      setStatus(`Compared ${nextPlan.entries.length} entries.`);
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : String(compareError));
    } finally {
      setLoading(false);
    }
  }

  function sendPlan(): void {
    if (!plan) return;
    sendAgentCommand(planPrompt(plan));
    setStatus('Remote sync plan sent to Xenesis Agent.');
  }

  return (
    <div className="xd-remote-sync-planner">
      <header className="xd-intel-header">
        <div>
          <h2>Remote Sync Planner</h2>
          <p>Compare local and remote folders before queuing explicit file transfers.</p>
        </div>
        <div className="xd-intel-actions">
          <button type="button" onClick={() => void compare()} disabled={loading}>
            {loading ? 'Comparing' : 'Compare'}
          </button>
          <button type="button" onClick={() => applyExplorerHandoff(getExplorerRemoteSyncHandoff())}>
            Use Explorer Context
          </button>
          <button type="button" onClick={sendPlan} disabled={!plan}>
            Send plan to Agent
          </button>
        </div>
      </header>

      <section className="xd-sync-form" aria-label="Remote sync planner inputs">
        <label>
          <span>Local directory</span>
          <div className="xd-sync-input-row">
            <input value={localDir} onChange={(event) => setLocalDir(event.target.value)} />
            <button type="button" onClick={() => void browseLocalDir()}>
              Browse
            </button>
          </div>
        </label>
        <label>
          <span>Remote profile</span>
          <select value={selectedProfile?.id ?? ''} onChange={(event) => setProfileId(event.target.value)}>
            {profiles.length === 0 ? (
              <option value="">No remote file profiles</option>
            ) : (
              profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.protocol})
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          <span>Remote path</span>
          <input value={remotePath} onChange={(event) => setRemotePath(event.target.value)} />
        </label>
      </section>

      {status && <div className="xd-intel-status">{status}</div>}
      {error && <div className="xd-intel-error">{error}</div>}

      {plan ? (
        <>
          <section className="xd-sync-counts" aria-label="Remote sync plan counts">
            {(Object.keys(ACTION_LABELS) as RemoteSyncAction[]).map((action) => (
              <div key={action} className={`xd-sync-count is-${action.replace(/[^a-z0-9]/g, '-')}`}>
                <span>{ACTION_LABELS[action]}</span>
                <strong>{plan.counts[action]}</strong>
              </div>
            ))}
          </section>

          <div className="xd-process-table-wrap">
            <table className="xd-process-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Name</th>
                  <th>Local</th>
                  <th>Remote</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {plan.entries.map((entry) => (
                  <tr key={`${entry.action}-${entry.name}-${entry.localPath || entry.remotePath || ''}`}>
                    <td>
                      <span className={actionClassName(entry)}>{ACTION_LABELS[entry.action]}</span>
                    </td>
                    <td>{entry.name}</td>
                    <td title={entry.localPath}>{entry.localPath || '-'}</td>
                    <td title={entry.remotePath}>{entry.remotePath || '-'}</td>
                    <td>{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="xd-intel-empty">Select a local folder, remote profile, and remote path, then run Compare.</div>
      )}
    </div>
  );
}
