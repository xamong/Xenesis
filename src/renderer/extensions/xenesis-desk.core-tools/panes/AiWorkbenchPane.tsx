import React, { useEffect, useMemo, useState } from 'react';
import type {
  AppSettings,
  McpBridgeBotSession,
  McpBridgeStatus,
  OpenFileResult,
  RemoteFileProfile,
} from '../../../../shared/types';
import {
  buildExplorerContextBotMessage,
  buildExplorerRemoteSyncHandoff,
  clearExplorerContextItems,
  EXPLORER_CONTEXT_CHANGED_EVENT,
  EXPLORER_CONTEXT_STORAGE_KEY,
  type ExplorerContextItem,
  getExplorerContextItems,
  removeExplorerContextItem,
  setExplorerRemoteSyncHandoff,
} from '../../../utils/explorerContextStore';
import {
  buildWorkflowDraftHandoffFromCommandBundles,
  WORKFLOW_DRAFT_HANDOFF_EVENT,
  WORKFLOW_DRAFT_HANDOFF_STORAGE_KEY,
} from '../../../utils/workflowDraftHandoff';
import { sendXenesisAgentCommand } from '../../../utils/xenesisContextSend';
import type { ArtifactBundleMode, ArtifactCompareResult, BotArtifactCard } from '../deskIntelligence';
import {
  ARTIFACT_BUNDLE_MODES,
  buildAiWorkbenchContextBundleMessage,
  buildAiWorkbenchPrompt,
  buildArtifactBundlePreviewText,
  buildArtifactCompareBotMessage,
  buildArtifactCompareText,
  buildArtifactContextBundleMessage,
  collectBotArtifacts,
  selectArtifactsForBundleMode,
  summarizeRendererState,
  XENIS_INTELLIGENCE_AREAS,
} from '../deskIntelligence';
import { buildPaneVisualContextBotMessage, captureActivePaneVisualContext } from '../paneVisualContextUtils';
import {
  buildSafeFileEditHandoff,
  SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY,
  serializeSafeFileEditHandoff,
} from '../safeFileEditCenterUtils';

const CONTEXT_BUNDLE_MODE_LABELS = ['Light', 'Full', 'Artifact Review', 'Debug', 'Workflow Repair'];
const AI_WORKBENCH_BUNDLE_MODE_STORAGE_KEY = 'xenesis-ai-workbench-bundle-mode';
const TEXT_PREVIEW_LIMIT = 80000;

function isArtifactBundleMode(value: string): value is ArtifactBundleMode {
  return ARTIFACT_BUNDLE_MODES.some((mode) => mode.value === value);
}

function readStoredBundleMode(): ArtifactBundleMode {
  try {
    const value = window.localStorage.getItem(AI_WORKBENCH_BUNDLE_MODE_STORAGE_KEY) ?? '';
    return isArtifactBundleMode(value) ? value : 'light';
  } catch {
    return 'light';
  }
}

function persistBundleMode(mode: ArtifactBundleMode): void {
  try {
    window.localStorage.setItem(AI_WORKBENCH_BUNDLE_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}

function sendAgentCommand(text: string): void {
  sendXenesisAgentCommand(text, { source: 'ai-workbench' });
}

function explorerContextMeta(item: ExplorerContextItem): string {
  if (item.source === 'remote') {
    const protocol = item.profile?.protocol?.toUpperCase() || 'REMOTE';
    const host = item.profile?.host || item.profile?.name || 'remote';
    return `${protocol} ${host} - ${item.kind}`;
  }
  return `LOCAL - ${item.kind}`;
}

function profileList(settings: AppSettings | null): RemoteFileProfile[] {
  return settings?.remoteFiles?.profiles ?? [];
}

function isTextOpenFileResult(result: OpenFileResult | null): result is OpenFileResult {
  return Boolean(result && ['markdown', 'mermaid', 'code'].includes(result.contentType));
}

function explorerItemToArtifactCard(item: ExplorerContextItem, typeLabel: string): BotArtifactCard {
  return {
    id: item.id,
    sessionId: 'explorer-context',
    messageId: item.source,
    createdAt: item.addedAt,
    label: item.name,
    kindGroup: 'other',
    typeLabel,
    searchText: `${item.name} ${item.path} ${item.source}`.toLowerCase(),
    title: item.name,
    kind: 'explorer-context',
    filePath: item.path,
  };
}

export function AiWorkbenchPane() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [status, setStatus] = useState<McpBridgeStatus | null>(null);
  const [sessions, setSessions] = useState<McpBridgeBotSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [explorerActionLoading, setExplorerActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [bundleMode, setBundleMode] = useState<ArtifactBundleMode>(() => readStoredBundleMode());
  const [selectedWorkbenchArtifactIds, setSelectedWorkbenchArtifactIds] = useState<string[]>([]);
  const [explorerContextItems, setExplorerContextItems] = useState<ExplorerContextItem[]>(() =>
    getExplorerContextItems(),
  );
  const [selectedExplorerContextIds, setSelectedExplorerContextIds] = useState<string[]>([]);
  const [explorerPreview, setExplorerPreview] = useState<{ title: string; meta: string; content: string } | null>(null);
  const [explorerCompareResult, setExplorerCompareResult] = useState<ArtifactCompareResult | null>(null);

  async function refresh(): Promise<void> {
    setLoading(true);
    setError('');
    setActionStatus('');
    try {
      const next = await window.mcpBridgeAPI?.status();
      setStatus(next ?? null);
      const botSessions = await window.mcpBridgeAPI?.listBotSessions();
      setSessions(botSessions ?? []);
      const nextSettings = await window.terminalAPI.getSettings();
      setSettings(nextSettings);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const reloadExplorerContext = () => setExplorerContextItems(getExplorerContextItems());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === EXPLORER_CONTEXT_STORAGE_KEY) reloadExplorerContext();
    };
    window.addEventListener(EXPLORER_CONTEXT_CHANGED_EVENT, reloadExplorerContext);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EXPLORER_CONTEXT_CHANGED_EVENT, reloadExplorerContext);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const summary = useMemo(() => summarizeRendererState(status?.rendererState), [status?.rendererState]);
  const artifacts = useMemo(() => collectBotArtifacts(sessions), [sessions]);
  const remoteProfiles = useMemo(() => profileList(settings), [settings]);
  const commandBundles = settings?.terminalWorkBlocks ?? [];
  const selectedExplorerContextItems = useMemo(
    () => explorerContextItems.filter((item) => selectedExplorerContextIds.includes(item.id)),
    [explorerContextItems, selectedExplorerContextIds],
  );
  const explorerContextActionItems = selectedExplorerContextItems.length
    ? selectedExplorerContextItems
    : explorerContextItems;
  const remoteSyncHandoff = useMemo(
    () => buildExplorerRemoteSyncHandoff(explorerContextActionItems),
    [explorerContextActionItems],
  );
  const comparePair = useMemo(() => {
    const local = explorerContextActionItems.find((item) => item.source === 'local' && item.kind === 'file') ?? null;
    const remote = explorerContextActionItems.find((item) => item.source === 'remote' && item.kind === 'file') ?? null;
    return local && remote ? { local, remote } : null;
  }, [explorerContextActionItems]);
  const suggestedContextArtifacts = useMemo(
    () => selectArtifactsForBundleMode(artifacts, bundleMode),
    [artifacts, bundleMode],
  );
  const selectedContextArtifacts = useMemo(() => {
    const selected = artifacts.filter((artifact) => selectedWorkbenchArtifactIds.includes(artifact.id));
    return selected.length ? selected : suggestedContextArtifacts;
  }, [artifacts, selectedWorkbenchArtifactIds, suggestedContextArtifacts]);
  const bundlePreviewText = useMemo(
    () => buildArtifactBundlePreviewText(selectedContextArtifacts, bundleMode),
    [bundleMode, selectedContextArtifacts],
  );

  useEffect(() => {
    setSelectedWorkbenchArtifactIds((current) =>
      current.filter((id) => artifacts.some((artifact) => artifact.id === id)),
    );
  }, [artifacts]);

  useEffect(() => {
    setSelectedExplorerContextIds((current) =>
      current.filter((id) => explorerContextItems.some((item) => item.id === id)),
    );
  }, [explorerContextItems]);

  function toggleWorkbenchArtifactSelection(artifactId: string): void {
    setSelectedWorkbenchArtifactIds((current) =>
      !current.length
        ? suggestedContextArtifacts.map((artifact) => artifact.id).filter((id) => id !== artifactId)
        : current.includes(artifactId)
          ? current.filter((id) => id !== artifactId)
          : [...current, artifactId],
    );
  }

  function sendSelectedArtifactBundle(): void {
    sendAgentCommand(buildArtifactContextBundleMessage(selectedContextArtifacts, bundleMode));
    setActionStatus(`Selected artifact bundle sent to Xenesis Agent: ${selectedContextArtifacts.length} artifact(s).`);
  }

  async function createWorkflowDraftFromCommandBundles(): Promise<void> {
    const handoff = buildWorkflowDraftHandoffFromCommandBundles(commandBundles);
    if (!handoff.commandCount) {
      setActionStatus('No command bundle commands are available for a Workflow Runner draft.');
      return;
    }
    try {
      window.localStorage.setItem(WORKFLOW_DRAFT_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
    } catch {
      // The custom event still works for an already-open Workflow Runner pane.
    }
    await window.extensionAPI.runCommand('xenesis-desk.workflow-runner.open');
    window.dispatchEvent(new CustomEvent(WORKFLOW_DRAFT_HANDOFF_EVENT, { detail: handoff }));
    setActionStatus(
      `Workflow draft opened from ${handoff.commandCount} command(s) in ${handoff.bundleCount} command bundle(s).`,
    );
  }

  function clearExplorerContext(): void {
    clearExplorerContextItems();
    setExplorerContextItems([]);
    setSelectedExplorerContextIds([]);
    setExplorerPreview(null);
    setExplorerCompareResult(null);
    setActionStatus('Explorer context bundle cleared.');
  }

  function toggleExplorerContextSelection(itemId: string): void {
    setSelectedExplorerContextIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  }

  function sendExplorerContextToBot(item: ExplorerContextItem): void {
    sendAgentCommand(buildExplorerContextBotMessage(item));
    setActionStatus(`Explorer context sent to Xenesis Agent: ${item.name}`);
  }

  function removeExplorerContext(item: ExplorerContextItem): void {
    const next = removeExplorerContextItem(item.id);
    setExplorerContextItems(next);
    setSelectedExplorerContextIds((current) => current.filter((id) => id !== item.id));
    if (explorerPreview?.title === item.name) setExplorerPreview(null);
    setActionStatus(`Explorer context removed: ${item.name}`);
  }

  function openExplorerContextInSafeFileEdit(item: ExplorerContextItem): void {
    if (item.source !== 'local' || item.kind !== 'file') return;
    const handoff = buildSafeFileEditHandoff(item.path, item.name, 'ai-workbench-explorer-context');
    try {
      window.localStorage.setItem(SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY, serializeSafeFileEditHandoff(handoff));
    } catch {
      // localStorage can be unavailable in restricted webviews.
    }
    window.dispatchEvent(new CustomEvent('xenesis-safe-file-edit-handoff', { detail: handoff }));
    void window.extensionAPI.runCommand('xenesis-desk.core-tools.openSafeFileEditCenter');
    setActionStatus(`Safe File Edit Center opened for: ${item.name}`);
  }

  function fullRemoteProfile(item: ExplorerContextItem): RemoteFileProfile | null {
    if (item.source !== 'remote' || !item.profile?.id) return null;
    return remoteProfiles.find((profile) => profile.id === item.profile?.id) ?? null;
  }

  async function readExplorerContextText(
    item: ExplorerContextItem,
  ): Promise<{ item: ExplorerContextItem; content: string; meta: string }> {
    if (item.kind !== 'file') {
      throw new Error('Preview is available for files only.');
    }
    const result =
      item.source === 'remote'
        ? await (async () => {
            const profile = fullRemoteProfile(item);
            if (!profile) throw new Error(`Remote profile not found: ${item.profile?.name || item.profile?.id || '-'}`);
            return window.remoteFileAPI.readFile(profile, item.path);
          })()
        : await window.fileAPI.readFile(item.path);
    if (!isTextOpenFileResult(result)) {
      throw new Error('This item is not a text preview target.');
    }
    return {
      item,
      content: result.content,
      meta: `${item.source.toUpperCase()} / ${result.contentType} / ${item.path}`,
    };
  }

  async function previewExplorerContext(item: ExplorerContextItem): Promise<void> {
    setExplorerActionLoading(true);
    setError('');
    try {
      const nextPreview = await readExplorerContextText(item);
      const clipped =
        nextPreview.content.length > TEXT_PREVIEW_LIMIT
          ? `${nextPreview.content.slice(0, TEXT_PREVIEW_LIMIT)}\n\n... preview truncated at ${TEXT_PREVIEW_LIMIT} characters`
          : nextPreview.content;
      setExplorerPreview({
        title: nextPreview.item.name,
        meta: nextPreview.meta,
        content: clipped,
      });
      setActionStatus(`Explorer preview loaded: ${nextPreview.item.name}`);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : String(previewError));
    } finally {
      setExplorerActionLoading(false);
    }
  }

  async function compareExplorerContextPair(): Promise<void> {
    if (!comparePair) return;
    setExplorerActionLoading(true);
    setError('');
    try {
      const [left, right] = await Promise.all([
        readExplorerContextText(comparePair.local),
        readExplorerContextText(comparePair.remote),
      ]);
      const result = buildArtifactCompareText(
        explorerItemToArtifactCard(left.item, 'Local explorer file'),
        left.content,
        explorerItemToArtifactCard(right.item, 'Remote explorer file'),
        right.content,
      );
      setExplorerCompareResult(result);
      setActionStatus(`Explorer compare complete: ${result.summary}`);
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : String(compareError));
    } finally {
      setExplorerActionLoading(false);
    }
  }

  function sendExplorerCompareToBot(): void {
    if (!explorerCompareResult) return;
    sendAgentCommand(buildArtifactCompareBotMessage(explorerCompareResult));
    setActionStatus(`Explorer compare sent to Xenesis Agent: ${explorerCompareResult.summary}`);
  }

  function openRemoteSyncPlannerFromContext(): void {
    if (!remoteSyncHandoff) return;
    setExplorerRemoteSyncHandoff(remoteSyncHandoff);
    void window.extensionAPI.runCommand('xenesis-desk.core-tools.openRemoteSyncPlanner');
    setActionStatus(
      `Remote Sync Planner opened: ${remoteSyncHandoff.localDir} -> ${remoteSyncHandoff.profileName}:${remoteSyncHandoff.remotePath}`,
    );
  }

  async function capturePaneVisualContext(): Promise<void> {
    setLoading(true);
    setError('');
    setActionStatus('');
    try {
      const capture = await captureActivePaneVisualContext(status?.rendererState);
      sendAgentCommand(buildPaneVisualContextBotMessage(capture));
      setActionStatus(`Pane capture sent to Xenesis Agent: ${capture.artifact.fileName}`);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : String(captureError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="xd-ai-workbench">
      <header className="xd-intel-header">
        <div>
          <h2>Xenesis Desk AI Workbench</h2>
          <p>Context cockpit for AI, terminal, explorer, dashboard, and artifact workflows.</p>
        </div>
        <div className="xd-intel-actions">
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => void window.extensionAPI.runCommand('xenesis-desk.core-tools.openXenisBot')}
          >
            Open Bot
          </button>
          <label className="xd-context-bundle-mode">
            <span>Bundle</span>
            <select
              value={bundleMode}
              onChange={(event) => {
                const nextMode = event.target.value as ArtifactBundleMode;
                setBundleMode(nextMode);
                persistBundleMode(nextMode);
              }}
              aria-label={`Context Bundle mode (${CONTEXT_BUNDLE_MODE_LABELS.join(', ')})`}
            >
              {ARTIFACT_BUNDLE_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              sendAgentCommand(
                buildAiWorkbenchContextBundleMessage(
                  summary,
                  artifacts,
                  bundleMode,
                  explorerContextItems,
                  commandBundles,
                ),
              )
            }
          >
            Context Bundle
          </button>
          <button
            type="button"
            disabled={!commandBundles.length}
            onClick={() => void createWorkflowDraftFromCommandBundles()}
          >
            Create Workflow Draft
          </button>
        </div>
      </header>

      <section className="xd-intel-summary-grid" aria-label="Current Xenesis Desk context summary">
        <div className="xd-intel-stat">
          <span>Active</span>
          <strong>{summary.activeContentTitle || '-'}</strong>
          <small>{summary.activeContentType || 'No active content'}</small>
        </div>
        <div className="xd-intel-stat">
          <span>Open Files</span>
          <strong>{summary.openFileCount}</strong>
          <small>{summary.reportedAt || 'Not reported yet'}</small>
        </div>
        <div className="xd-intel-stat">
          <span>Terminals</span>
          <strong>{summary.terminalCount}</strong>
          <small>{status?.bridge.available ? 'Bridge available' : 'Bridge unavailable'}</small>
        </div>
        <div className="xd-intel-stat">
          <span>Artifacts</span>
          <strong>{artifacts.length}</strong>
          <small>from active bridge snapshot</small>
        </div>
        <div className="xd-intel-stat">
          <span>Explorer Context</span>
          <strong>{explorerContextItems.length}</strong>
          <small>from local and FTP explorers</small>
        </div>
        <div className="xd-intel-stat">
          <span>Command Bundles</span>
          <strong>{settings?.terminalWorkBlocks?.length ?? 0}</strong>
          <small>from Command Center</small>
        </div>
      </section>

      {error && <div className="xd-intel-error">{error}</div>}
      {actionStatus && <div className="xd-intel-status">{actionStatus}</div>}

      <section className="xd-ai-explorer-context-panel" aria-label="Explorer context bundle">
        <div className="xd-safe-file-section-head">
          <div>
            <strong>Explorer context</strong>
            <span>
              {explorerContextItems.length} item(s), {selectedExplorerContextIds.length || 'all'} active for bulk
              actions
            </span>
          </div>
          <div className="xd-table-actions">
            <button
              type="button"
              onClick={() => setSelectedExplorerContextIds(explorerContextItems.map((item) => item.id))}
              disabled={!explorerContextItems.length}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelectedExplorerContextIds([])}
              disabled={!selectedExplorerContextIds.length}
            >
              Clear selection
            </button>
            <button type="button" onClick={openRemoteSyncPlannerFromContext} disabled={!remoteSyncHandoff}>
              Sync Planner
            </button>
            <button
              type="button"
              onClick={() => void compareExplorerContextPair()}
              disabled={!comparePair || explorerActionLoading}
            >
              Compare L/R
            </button>
            <button type="button" onClick={clearExplorerContext} disabled={!explorerContextItems.length}>
              Clear
            </button>
          </div>
        </div>
        {!explorerContextItems.length ? (
          <div className="xd-intel-empty">No explorer context has been added yet.</div>
        ) : (
          <div className="xd-ai-explorer-context-list">
            {explorerContextItems.map((item) => (
              <div key={item.id} className="xd-ai-explorer-context-row">
                <input
                  type="checkbox"
                  checked={selectedExplorerContextIds.includes(item.id)}
                  onChange={() => toggleExplorerContextSelection(item.id)}
                  aria-label={`Select ${item.name}`}
                />
                <span>{item.source}</span>
                <strong title={item.name}>{item.name}</strong>
                <code title={item.path}>{item.path}</code>
                <small>{explorerContextMeta(item)}</small>
                <div className="xd-ai-explorer-context-actions">
                  <button type="button" onClick={() => sendExplorerContextToBot(item)}>
                    Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => void previewExplorerContext(item)}
                    disabled={item.kind !== 'file' || explorerActionLoading}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => openExplorerContextInSafeFileEdit(item)}
                    disabled={item.source !== 'local' || item.kind !== 'file'}
                  >
                    Safe Edit
                  </button>
                  <button type="button" className="is-danger" onClick={() => removeExplorerContext(item)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {(explorerPreview || explorerCompareResult) && (
          <div className="xd-ai-explorer-preview-grid">
            {explorerPreview && (
              <section className="xd-ai-explorer-preview" aria-label="Explorer context preview">
                <div className="xd-artifact-preview-toolbar">
                  <div>
                    <strong>Explorer Preview</strong>
                    <span>{explorerPreview.title}</span>
                  </div>
                  <button type="button" onClick={() => setExplorerPreview(null)}>
                    Close
                  </button>
                </div>
                <div className="xd-artifact-compare-summary">{explorerPreview.meta}</div>
                <pre>{explorerPreview.content}</pre>
              </section>
            )}
            {explorerCompareResult && (
              <section className="xd-ai-explorer-preview" aria-label="Explorer context compare">
                <div className="xd-artifact-preview-toolbar">
                  <div>
                    <strong>Explorer Compare</strong>
                    <span>
                      {explorerCompareResult.leftLabel} vs {explorerCompareResult.rightLabel}
                    </span>
                  </div>
                  <div className="xd-table-actions">
                    <button type="button" onClick={sendExplorerCompareToBot}>
                      Send to Agent
                    </button>
                    <button type="button" onClick={() => setExplorerCompareResult(null)}>
                      Close
                    </button>
                  </div>
                </div>
                <div className="xd-artifact-compare-summary">
                  {explorerCompareResult.summary}
                  <span>
                    {explorerCompareResult.leftPath || '-'} / {explorerCompareResult.rightPath || '-'}
                  </span>
                </div>
                <pre>{explorerCompareResult.diffText}</pre>
              </section>
            )}
          </div>
        )}
      </section>

      <section className="xd-ai-artifact-bundle-panel" aria-label="AI Workbench artifact bundle preview">
        <div className="xd-safe-file-section-head">
          <div>
            <strong>Suggested artifacts</strong>
            <span>
              {selectedContextArtifacts.length} selected for{' '}
              {ARTIFACT_BUNDLE_MODES.find((mode) => mode.value === bundleMode)?.label ?? 'Light'}
            </span>
          </div>
          <div className="xd-table-actions">
            <button
              type="button"
              onClick={() => setSelectedWorkbenchArtifactIds(suggestedContextArtifacts.map((artifact) => artifact.id))}
              disabled={!suggestedContextArtifacts.length}
            >
              Use suggested
            </button>
            <button
              type="button"
              onClick={() => setSelectedWorkbenchArtifactIds([])}
              disabled={!selectedWorkbenchArtifactIds.length}
            >
              Clear
            </button>
            <button type="button" onClick={sendSelectedArtifactBundle} disabled={!selectedContextArtifacts.length}>
              Send Selected Bundle
            </button>
          </div>
        </div>
        <div className="xd-ai-artifact-bundle-body">
          <div className="xd-ai-artifact-list" aria-label="Suggested artifacts">
            {!artifacts.length ? (
              <div className="xd-intel-empty">No artifacts are available for bundle preview.</div>
            ) : (
              suggestedContextArtifacts.map((artifact) => (
                <label key={artifact.id} className="xd-ai-artifact-row">
                  <input
                    type="checkbox"
                    checked={
                      selectedWorkbenchArtifactIds.length ? selectedWorkbenchArtifactIds.includes(artifact.id) : true
                    }
                    onChange={() => toggleWorkbenchArtifactSelection(artifact.id)}
                  />
                  <span>{artifact.typeLabel}</span>
                  <strong title={artifact.filePath || artifact.label}>{artifact.label}</strong>
                  <code>{artifact.filePath || 'File path missing'}</code>
                </label>
              ))
            )}
          </div>
          <div className="xd-ai-bundle-preview">
            <strong>Bundle Preview</strong>
            <pre>{bundlePreviewText}</pre>
          </div>
        </div>
      </section>

      <section className="xd-intel-area-grid" aria-label="Recommended intelligence workflows">
        {XENIS_INTELLIGENCE_AREAS.map((area) => (
          <article key={area.key} className="xd-intel-card">
            <div>
              <h3>{area.title}</h3>
              <p>{area.summary}</p>
            </div>
            <button type="button" onClick={() => sendAgentCommand(buildAiWorkbenchPrompt(area.key, summary))}>
              Send to Agent
            </button>
            {area.key === 'pane-visual-context' && (
              <button type="button" onClick={() => void capturePaneVisualContext()} disabled={loading}>
                Capture Pane
              </button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
