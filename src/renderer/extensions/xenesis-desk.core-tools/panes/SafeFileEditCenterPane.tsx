import { useEffect, useMemo, useRef, useState } from 'react';
import type { SafeFileApplyResult, SafeFilePreviewResult, SafeFileRestoreResult } from '../../../../shared/types';
import { createNativeTextAdapter } from '../../../editing/nativeTextAdapter';
import { useEditableSurface } from '../../../editing/useEditableSurface';
import { sendXenesisAgentCommand } from '../../../utils/xenesisContextSend';
import {
  buildSafeFileBotPrompt,
  buildSafeFileEditHandoff,
  countDiffLines,
  formatBackupSummary,
  parseSafeFileEditHandoff,
  SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY,
  type SafeFileEditHandoff,
} from '../safeFileEditCenterUtils';

function sendAgentCommand(text: string): void {
  sendXenesisAgentCommand(text, { source: 'safe-file-edit-center' });
}

function isEditableTextContentType(contentType: string): boolean {
  return contentType === 'code' || contentType === 'markdown' || contentType === 'mermaid';
}

function readStoredSafeFileEditHandoff(): SafeFileEditHandoff | null {
  try {
    return parseSafeFileEditHandoff(window.localStorage.getItem(SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY));
  } catch {
    return null;
  }
}

function consumeStoredSafeFileEditHandoff(): SafeFileEditHandoff | null {
  const handoff = readStoredSafeFileEditHandoff();
  try {
    window.localStorage.removeItem(SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
  return handoff;
}

function normalizeSafeFileEditHandoff(detail: unknown): SafeFileEditHandoff | null {
  if (!detail || typeof detail !== 'object') return null;
  const candidate = detail as Partial<SafeFileEditHandoff>;
  if (!candidate.filePath || typeof candidate.filePath !== 'string') return null;
  return buildSafeFileEditHandoff(candidate.filePath, candidate.label ?? '', candidate.source ?? 'artifact-library');
}

export function SafeFileEditCenterPane() {
  const [filePath, setFilePath] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [preview, setPreview] = useState<SafeFilePreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<SafeFileApplyResult | null>(null);
  const [restoreResult, setRestoreResult] = useState<SafeFileRestoreResult | null>(null);
  const [backupPath, setBackupPath] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const draftTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const diffCounts = useMemo(
    () => (preview ? countDiffLines(preview.diff) : { additions: 0, deletions: 0 }),
    [preview],
  );

  const safeFileDraftAdapter = useMemo(
    () =>
      createNativeTextAdapter({
        id: 'safe-file-draft',
        label: 'Safe file draft',
        getElement: () => draftTextAreaRef.current,
      }),
    [],
  );
  const safeFileDraftSurface = useEditableSurface({ adapter: safeFileDraftAdapter, includeSave: false });

  async function loadFile(pathOverride?: string, options: { preserveRestoreResult?: boolean } = {}): Promise<void> {
    const targetPath = (pathOverride ?? filePath).trim();
    if (!targetPath) {
      setError('Select or enter a file path first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await window.fileAPI.readFile(targetPath);
      if (!result) {
        setError('File could not be read.');
        return;
      }
      if (!isEditableTextContentType(result.contentType)) {
        setError(`Only text-like files are supported. This file opened as ${result.contentType}.`);
        return;
      }
      setFilePath(result.filePath);
      setOriginalContent(result.content);
      setDraftContent(result.content);
      setPreview(null);
      setApplyResult(null);
      if (!options.preserveRestoreResult) setRestoreResult(null);
      setStatus(`Loaded ${result.fileName}.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handoff = consumeStoredSafeFileEditHandoff();
    if (handoff?.filePath) {
      setStatus(`Artifact handoff: ${handoff.label || handoff.filePath}`);
      void loadFile(handoff.filePath);
    }

    function onSafeFileEditHandoff(event: Event): void {
      const nextHandoff = normalizeSafeFileEditHandoff((event as CustomEvent).detail);
      if (!nextHandoff?.filePath) return;
      setStatus(`Artifact handoff: ${nextHandoff.label || nextHandoff.filePath}`);
      void loadFile(nextHandoff.filePath);
    }

    window.addEventListener('xenesis-safe-file-edit-handoff', onSafeFileEditHandoff);
    return () => window.removeEventListener('xenesis-safe-file-edit-handoff', onSafeFileEditHandoff);
  }, []);

  async function openFile(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const result = await window.fileAPI.openFile();
      if (!result) return;
      if (!isEditableTextContentType(result.contentType)) {
        setError(`Only text-like files are supported. This file opened as ${result.contentType}.`);
        return;
      }
      setFilePath(result.filePath);
      setOriginalContent(result.content);
      setDraftContent(result.content);
      setPreview(null);
      setApplyResult(null);
      setRestoreResult(null);
      setStatus(`Opened ${result.fileName}.`);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : String(openError));
    } finally {
      setLoading(false);
    }
  }

  async function previewDiff(): Promise<void> {
    if (!filePath.trim()) {
      setError('File path is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await window.safeFileAPI.previewTextWrite({
        filePath: filePath.trim(),
        content: draftContent,
      });
      setPreview(result);
      setStatus(result.wouldChange ? 'Preview ready.' : 'Preview ready. No changes detected.');
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : String(previewError));
    } finally {
      setLoading(false);
    }
  }

  async function applyWrite(): Promise<void> {
    if (!filePath.trim()) {
      setError('File path is required.');
      return;
    }
    const confirmed = window.confirm('Apply this text write with backup when needed?');
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      const result = await window.safeFileAPI.applyTextWrite({
        filePath: filePath.trim(),
        content: draftContent,
      });
      setApplyResult(result);
      setPreview(result);
      setOriginalContent(draftContent);
      if (result.backupPath) setBackupPath(result.backupPath);
      setStatus(result.backupCreated ? 'Applied with backup.' : 'Applied. No backup was needed.');
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : String(applyError));
    } finally {
      setLoading(false);
    }
  }

  async function restoreBackup(): Promise<void> {
    const targetBackupPath = backupPath.trim() || applyResult?.backupPath || '';
    if (!targetBackupPath) {
      setError('Backup path is required.');
      return;
    }
    const confirmed = window.confirm('Restore the file from this backup?');
    if (!confirmed) return;
    setLoading(true);
    setError('');
    try {
      const result = await window.safeFileAPI.restoreTextBackup({
        backupPath: targetBackupPath,
        filePath: filePath.trim() || undefined,
      });
      setRestoreResult(result);
      setFilePath(result.filePath);
      setBackupPath(result.backupPath);
      setStatus('Backup restored.');
      await loadFile(result.filePath, { preserveRestoreResult: true });
      setRestoreResult(result);
      setStatus('Backup restored.');
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : String(restoreError));
    } finally {
      setLoading(false);
    }
  }

  function sendToBot(): void {
    sendAgentCommand(buildSafeFileBotPrompt(filePath, draftContent, preview, applyResult));
    setStatus('Safe file edit context sent to Xenesis Agent.');
  }

  return (
    <div className="xd-safe-file-edit-center">
      <header className="xd-intel-header">
        <div>
          <h2>Safe File Edit Center</h2>
          <p>Preview text diffs, apply with backup, and restore recent safe-write backups.</p>
        </div>
        <div className="xd-intel-actions">
          <button type="button" onClick={() => void openFile()} disabled={loading}>
            Open File
          </button>
          <button type="button" onClick={() => sendToBot()} disabled={!filePath.trim()}>
            Send to Agent
          </button>
        </div>
      </header>

      <section className="xd-safe-file-form" aria-label="Safe file edit inputs">
        <label>
          <span>File path</span>
          <div className="xd-safe-file-input-row">
            <input value={filePath} onChange={(event) => setFilePath(event.target.value)} />
            <button type="button" onClick={() => void loadFile()} disabled={loading}>
              Load
            </button>
          </div>
        </label>
        <label>
          <span>Backup path</span>
          <div className="xd-safe-file-input-row">
            <input
              value={backupPath}
              onChange={(event) => setBackupPath(event.target.value)}
              placeholder="Last .bak path"
            />
            <button type="button" onClick={() => void restoreBackup()} disabled={loading}>
              Restore
            </button>
          </div>
        </label>
      </section>

      {status && <div className="xd-intel-status">{status}</div>}
      {error && <div className="xd-intel-error">{error}</div>}

      <section className="xd-safe-file-layout">
        <div className="xd-safe-file-editor">
          <div className="xd-safe-file-section-head">
            <strong>Draft</strong>
            <div className="xd-table-actions">
              <button type="button" onClick={() => void previewDiff()} disabled={loading}>
                Preview Diff
              </button>
              <button type="button" onClick={() => void applyWrite()} disabled={loading || !filePath.trim()}>
                Apply With Backup
              </button>
              <button type="button" onClick={() => setDraftContent(originalContent)}>
                Reset Draft
              </button>
            </div>
          </div>
          <textarea
            ref={draftTextAreaRef}
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            spellCheck={false}
            placeholder="Open a text file or paste draft content here."
            onFocusCapture={safeFileDraftSurface.onFocusCapture}
            onPointerDownCapture={safeFileDraftSurface.onPointerDownCapture}
            onContextMenu={safeFileDraftSurface.onContextMenu}
            onKeyDown={safeFileDraftSurface.onKeyDown}
          />
        </div>

        <div className="xd-safe-file-preview">
          <div className="xd-safe-file-section-head">
            <strong>diff preview</strong>
            <span>
              +{diffCounts.additions} / -{diffCounts.deletions}
            </span>
          </div>
          <dl className="xd-safe-file-summary">
            <dt>Would change</dt>
            <dd>{preview ? String(preview.wouldChange) : '-'}</dd>
            <dt>Backup</dt>
            <dd title={formatBackupSummary(applyResult)}>{formatBackupSummary(applyResult)}</dd>
            <dt>Restore</dt>
            <dd title={restoreResult?.backupPath}>{restoreResult ? 'recent backup restored' : '-'}</dd>
          </dl>
          <pre>{preview?.diff || 'Run Preview Diff to inspect the pending safe write.'}</pre>
        </div>
      </section>
      {safeFileDraftSurface.menuElement}
    </div>
  );
}
