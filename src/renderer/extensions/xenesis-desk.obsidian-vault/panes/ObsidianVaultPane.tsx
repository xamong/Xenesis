import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ObsidianVaultContentState, VaultScanFile } from '../../../../shared/types';
import type { DockEngine } from '../../../dock/engine';
import { createNativeTextAdapter } from '../../../editing/nativeTextAdapter';
import { useEditableSurface } from '../../../editing/useEditableSurface';
import { createVaultIndex } from '../vaultIndex';
import { normalizeVaultPanelSizes, resizeVaultPanelSizes, type VaultPanelResizeTarget } from '../vaultPanelLayout';
import type { VaultIndex, VaultIssueFilter, VaultViewerState } from '../vaultTypes';
import { ObsidianVaultGraphView } from './ObsidianVaultGraphView';
import { ObsidianVaultMarkdownPreview } from './ObsidianVaultMarkdownPreview';

interface ObsidianVaultPaneProps {
  contentId: string;
  engine: DockEngine;
  initialState?: ObsidianVaultContentState;
  onOpenMarkdown(filePath: string): void;
}

export function ObsidianVaultPane({ contentId, engine, initialState, onOpenMarkdown }: ObsidianVaultPaneProps) {
  const [state, setState] = useState<VaultViewerState>({
    vaultRootPath: initialState?.vaultRootPath || '',
    selectedNoteId: initialState?.selectedNoteId || '',
    query: initialState?.query || '',
    tag: initialState?.tag || '',
    issue: initialState?.issue || '',
    graphScope: initialState?.graphScope || 'local',
    panelSizes: normalizeVaultPanelSizes(initialState?.panelSizes),
  });
  const [index, setIndex] = useState<VaultIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resizeTarget, setResizeTarget] = useState<VaultPanelResizeTarget | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const persist = useCallback(
    (next: VaultViewerState) => {
      const normalized = { ...next, panelSizes: normalizeVaultPanelSizes(next.panelSizes) };
      setState(normalized);
      engine.updateContentPayload(contentId, { obsidianVault: normalized });
    },
    [contentId, engine],
  );

  const beginPanelResize = useCallback(
    (target: VaultPanelResizeTarget) => (event: React.PointerEvent<HTMLDivElement>) => {
      const shell = shellRef.current;
      const main = mainRef.current;
      if (!shell || !main || window.matchMedia('(max-width: 980px)').matches) return;

      event.preventDefault();
      resizeCleanupRef.current?.();
      setResizeTarget(target);

      const updateFromPointer = (clientX: number, clientY: number) => {
        const shellRect = shell.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        const panelSizes = resizeVaultPanelSizes(state.panelSizes, target, {
          clientX,
          clientY,
          shellRect,
          mainRect,
        });
        persist({ ...state, panelSizes });
      };

      const move = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        updateFromPointer(moveEvent.clientX, moveEvent.clientY);
      };
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
        resizeCleanupRef.current = null;
        setResizeTarget(null);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
      resizeCleanupRef.current = stop;
      updateFromPointer(event.clientX, event.clientY);
    },
    [persist, state],
  );

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const scan = useCallback(
    async (rootPath: string, seedState = state) => {
      if (!rootPath) return;
      setLoading(true);
      setError('');
      const result = await window.vaultAPI.scanLocal({ rootPath });
      if (!result.ok) {
        setError(result.error || 'Vault scan failed.');
        setLoading(false);
        return;
      }
      const vault = {
        id: result.vaultId,
        source: 'local' as const,
        rootPath: result.rootPath,
        displayName: result.displayName,
      };
      const nextIndex = createVaultIndex(vault, result.files.map(toVaultFileRecord));
      for (const warning of result.warnings) {
        nextIndex.diagnostics.push({
          code: 'read-warning',
          severity: 'warning',
          path: warning.path,
          message: warning.message,
        });
      }
      setIndex(nextIndex);
      const selectedNoteId =
        seedState.selectedNoteId && nextIndex.notes.has(seedState.selectedNoteId)
          ? seedState.selectedNoteId
          : nextIndex.notes.keys().next().value || '';
      persist({ ...seedState, vaultRootPath: result.rootPath, selectedNoteId });
      setLoading(false);
    },
    [persist, state],
  );

  useEffect(() => {
    if (state.vaultRootPath) void scan(state.vaultRootPath);
    // Initial restore scan should run once for the restored root.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ filePath?: string }>).detail;
      if (!detail?.filePath || !state.vaultRootPath) return;
      const normalizedFile = detail.filePath.replace(/\\/g, '/').toLowerCase();
      const normalizedRoot = state.vaultRootPath.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
      if (!normalizedFile.startsWith(`${normalizedRoot}/`)) return;
      void scan(state.vaultRootPath, state);
    };
    window.addEventListener('xenesis-vault-file-saved', handler);
    return () => window.removeEventListener('xenesis-vault-file-saved', handler);
  }, [scan, state]);

  const selected = index?.notes.get(state.selectedNoteId) || null;
  const notes = useMemo(
    () => filterNotes(index, state.query, state.tag, state.issue),
    [index, state.query, state.tag, state.issue],
  );
  const vaultSearchAdapter = useMemo(
    () =>
      createNativeTextAdapter({
        id: `obsidian-search:${contentId}`,
        label: 'Vault search',
        getElement: () => searchRef.current,
        canSave: () => false,
      }),
    [contentId],
  );
  const vaultSearchSurface = useEditableSurface({ adapter: vaultSearchAdapter, includeSave: false });

  const chooseVault = async () => {
    const rootPath = await window.fsAPI.selectDir();
    if (rootPath) await scan(rootPath, { ...state, vaultRootPath: rootPath, selectedNoteId: '' });
  };

  if (!state.vaultRootPath) {
    return (
      <div className="obsidian-vault-pane">
        <div className="obsidian-vault-empty">
          <h2>Obsidian Vault Viewer</h2>
          <button className="ov-primary" type="button" onClick={chooseVault}>
            Choose Vault Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      className={`obsidian-vault-pane ov-shell${resizeTarget ? ' is-resizing' : ''}`}
      style={vaultPanelStyle(state.panelSizes)}
    >
      <aside className="ov-sidebar">
        <div className="ov-title-row">
          <strong>{index?.vault.displayName || 'Vault'}</strong>
          <button type="button" onClick={() => scan(state.vaultRootPath, state)}>
            Refresh
          </button>
        </div>
        <input
          ref={searchRef}
          className="ov-search"
          value={state.query}
          aria-label="Search notes"
          onChange={(event) => persist({ ...state, query: event.currentTarget.value })}
          onFocusCapture={vaultSearchSurface.onFocusCapture}
          onPointerDownCapture={vaultSearchSurface.onPointerDownCapture}
          onContextMenu={vaultSearchSurface.onContextMenu}
          onKeyDown={vaultSearchSurface.onKeyDown}
        />
        <div className="ov-chip-row">
          {Array.from(index?.tags.keys() || [])
            .sort()
            .map((tag) => (
              <button
                key={tag}
                className={state.tag === tag ? 'is-active' : ''}
                type="button"
                onClick={() => persist({ ...state, tag: state.tag === tag ? '' : tag })}
              >
                #{tag}
              </button>
            ))}
          <button
            type="button"
            className={state.issue === 'unresolved' ? 'is-active' : ''}
            onClick={() => persist({ ...state, issue: state.issue === 'unresolved' ? '' : 'unresolved' })}
          >
            Unresolved
          </button>
          <button
            type="button"
            className={state.issue === 'orphan' ? 'is-active' : ''}
            onClick={() => persist({ ...state, issue: state.issue === 'orphan' ? '' : 'orphan' })}
          >
            Orphans
          </button>
        </div>
        <div className="ov-note-list">
          {notes.map((note) => (
            <button
              key={note.id}
              className={note.id === state.selectedNoteId ? 'is-active' : ''}
              type="button"
              onClick={() => persist({ ...state, selectedNoteId: note.id })}
              onDoubleClick={() => onOpenMarkdown(note.absolutePath)}
            >
              <span>{note.title}</span>
              <small>{note.path}</small>
            </button>
          ))}
        </div>
      </aside>
      <div
        className={`ov-panel-splitter ov-panel-splitter--vertical${resizeTarget === 'sidebar' ? ' is-active' : ''}`}
        role="separator"
        aria-label="Resize vault sidebar"
        aria-orientation="vertical"
        onPointerDown={beginPanelResize('sidebar')}
      />
      <main ref={mainRef} className="ov-main">
        {loading && <div className="ov-status">Indexing vault...</div>}
        {error && <div className="ov-error">{error}</div>}
        {selected && index && (
          <section className="ov-preview">
            <header>
              <h2>{selected.title}</h2>
              <button type="button" onClick={() => onOpenMarkdown(selected.absolutePath)}>
                Edit
              </button>
            </header>
            <ObsidianVaultMarkdownPreview
              note={selected}
              index={index}
              onSelectNote={(selectedNoteId) => persist({ ...state, selectedNoteId })}
              onOpenAttachment={(path) => {
                if (path) onOpenMarkdown(joinVaultPath(state.vaultRootPath, path));
              }}
            />
          </section>
        )}
        {index && selected && (
          <div
            className={`ov-panel-splitter ov-panel-splitter--horizontal${resizeTarget === 'graph' ? ' is-active' : ''}`}
            role="separator"
            aria-label="Resize vault graph"
            aria-orientation="horizontal"
            onPointerDown={beginPanelResize('graph')}
          />
        )}
        {index && selected && (
          <section className="ov-graph">
            <div className="ov-title-row">
              <strong>Graph</strong>
              <div>
                <button
                  type="button"
                  className={state.graphScope === 'local' ? 'is-active' : ''}
                  onClick={() => persist({ ...state, graphScope: 'local' })}
                >
                  Local
                </button>
                <button
                  type="button"
                  className={state.graphScope === 'global' ? 'is-active' : ''}
                  onClick={() => persist({ ...state, graphScope: 'global' })}
                >
                  Global
                </button>
              </div>
            </div>
            <ObsidianVaultGraphView
              index={index}
              selectedNoteId={selected.id}
              query={state.query}
              tag={state.tag}
              issue={state.issue}
              scope={state.graphScope}
              onSelectNote={(selectedNoteId) => persist({ ...state, selectedNoteId })}
            />
          </section>
        )}
      </main>
      <div
        className={`ov-panel-splitter ov-panel-splitter--vertical${resizeTarget === 'inspector' ? ' is-active' : ''}`}
        role="separator"
        aria-label="Resize vault inspector"
        aria-orientation="vertical"
        onPointerDown={beginPanelResize('inspector')}
      />
      <aside className="ov-inspector">
        {selected && index && (
          <>
            <h3>Metadata</h3>
            <p>{selected.path}</p>
            <h3>Backlinks</h3>
            {(index.backlinks.get(selected.id) || []).map((link) => (
              <button
                key={`${link.source}:${link.target}`}
                type="button"
                onClick={() => persist({ ...state, selectedNoteId: link.source })}
              >
                from {index.notes.get(link.source)?.title || link.source}
              </button>
            ))}
            <h3>Diagnostics</h3>
            {index.diagnostics.length === 0 && <p className="ov-muted">No diagnostics.</p>}
            {index.diagnostics.map((item, indexNumber) => (
              <p key={`${item.code}:${indexNumber}`} className="ov-diagnostic">
                {item.message}
              </p>
            ))}
          </>
        )}
      </aside>
      {vaultSearchSurface.menuElement}
    </div>
  );
}

function vaultPanelStyle(panelSizes: VaultViewerState['panelSizes']): React.CSSProperties {
  const normalized = normalizeVaultPanelSizes(panelSizes);
  return {
    '--ov-sidebar-width': `${normalized.sidebar}px`,
    '--ov-inspector-width': `${normalized.inspector}px`,
    '--ov-graph-height': `${normalized.graph}px`,
  } as React.CSSProperties;
}

function toVaultFileRecord(file: VaultScanFile) {
  return file;
}

function filterNotes(index: VaultIndex | null, query: string, tag: string, issue: VaultIssueFilter) {
  if (!index) return [];
  const needle = query.trim().toLowerCase();
  return Array.from(index.notes.values()).filter((note) => {
    if (needle && !`${note.title} ${note.path} ${note.body}`.toLowerCase().includes(needle)) return false;
    if (tag && !note.tags.map((item) => item.toLowerCase()).includes(tag.toLowerCase())) return false;
    if (issue === 'orphan' && !index.orphanNoteIds.has(note.id)) return false;
    if (issue === 'unresolved' && !index.unresolvedLinks.some((link) => link.source === note.id)) return false;
    return true;
  });
}

function joinVaultPath(rootPath: string, relativePath: string): string {
  return `${rootPath.replace(/[\\/]$/, '')}/${relativePath.replace(/^[\\/]/, '')}`;
}
