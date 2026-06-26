import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CaptureItem,
  OpenFileResult,
  RemoteFileProfile,
  ShellDescriptor,
  ShellKind,
  TerminalProfileGroup,
} from '../../shared/types';
import { ContextMenu, type ContextMenuItem, useContextMenu } from '../components/ContextMenu';
import { useI18n } from '../i18n';
import { REMOTE_EXPLORER_ACTION_EVENT, REMOTE_EXPLORER_NAVIGATE_EVENT } from '../utils/explorerNavigationEvents';
import type { FavoriteItem, FavoriteKind } from '../utils/favoriteStore';
import { labelFromPath, labelFromUrl } from '../utils/favoriteStore';
import { RemoteFileExplorerPane } from './RemoteFileExplorerPane';

// ── 프롭 타입 ─────────────────────────────────────────────────────────────────

export interface FavoritesPaneProps {
  items: FavoriteItem[];
  /** 새 즐겨찾기 추가 (id·addedAt 제외) */
  onAdd: (draft: Omit<FavoriteItem, 'id' | 'addedAt'>) => void;
  onRemove: (id: string) => void;
  onOpen: (item: FavoriteItem) => void;
  onOpenInTerminal: (path: string, kind: ShellKind) => void;
  shells: ShellDescriptor[];
  /** 현재 활성 탭을 즐겨찾기에 추가 */
  onAddCurrentTab: () => void;
  /** 이미지 파일 열기 (더블클릭 시) */
  onOpenImage?: (filePath: string) => void;
  /** 화면 영역 캡처 시작 */
  onStartCapture?: () => void;
  remoteFileProfiles?: RemoteFileProfile[];
  remoteFileGroups?: TerminalProfileGroup[];
  onOpenRemoteFile?: (result: OpenFileResult | null, profile: RemoteFileProfile) => void;
  onOpenRemoteFileSettings?: () => void;
}

// ── 아이콘 & 배지 유틸 ───────────────────────────────────────────────────────

function getIcon(item: FavoriteItem): string {
  switch (item.kind) {
    case 'folder':
      return '📁';
    case 'url':
      return '🌐';
    case 'terminal-path':
      return '⚡';
    default: {
      const ext = item.path.split('.').pop()?.toLowerCase() ?? '';
      switch (ext) {
        case 'ts':
        case 'tsx':
          return '𝐓';
        case 'js':
        case 'jsx':
        case 'mjs':
          return '𝐉';
        case 'json':
          return '{ }';
        case 'md':
        case 'markdown':
          return '𝐌';
        case 'mmd':
          return '◈';
        case 'css':
        case 'scss':
          return '𝐒';
        case 'html':
        case 'htm':
          return '𝐇';
        case 'py':
          return '𝐏';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
        case 'svg':
        case 'ico':
          return '🖼';
        case 'sh':
        case 'bat':
        case 'ps1':
          return '⚡';
        default:
          return '📄';
      }
    }
  }
}

function getExtBadge(item: FavoriteItem, t: (key: string) => string): string {
  if (item.kind === 'url') return 'URL';
  if (item.kind === 'folder') return t('favorites.folder');
  if (item.kind === 'terminal-path') return t('favorites.path');
  const ext = item.path.split('.').pop()?.toLowerCase() ?? '';
  return ext ? `.${ext}` : t('favorites.file');
}

function getExtColorClass(item: FavoriteItem): string {
  if (item.kind === 'url') return 'fav-badge--url';
  if (item.kind === 'folder') return 'fav-badge--folder';
  if (item.kind === 'terminal-path') return 'fav-badge--terminal';
  const ext = item.path.split('.').pop()?.toLowerCase() ?? '';
  if (['ts', 'tsx'].includes(ext)) return 'fav-badge--ts';
  if (['js', 'jsx', 'mjs'].includes(ext)) return 'fav-badge--js';
  if (['json'].includes(ext)) return 'fav-badge--json';
  if (['md', 'mdx', 'markdown'].includes(ext)) return 'fav-badge--md';
  if (['css', 'scss', 'sass'].includes(ext)) return 'fav-badge--css';
  if (['html', 'htm', 'svg'].includes(ext)) return 'fav-badge--html';
  if (['py'].includes(ext)) return 'fav-badge--py';
  if (['sh', 'bat', 'ps1'].includes(ext)) return 'fav-badge--sh';
  return 'fav-badge--default';
}

// ── 드롭 영역 컴포넌트 ───────────────────────────────────────────────────────

interface DropZoneProps {
  onDrop: (path: string) => void;
  children: React.ReactNode;
}

function DropZone({ onDrop, children }: DropZoneProps) {
  const [over, setOver] = useState(false);
  const counterRef = useRef(0);

  return (
    <div
      className={`fav-dropzone${over ? ' is-over' : ''}`}
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('application/xamong-path') && !e.dataTransfer.types.includes('text/plain'))
          return;
        counterRef.current++;
        setOver(true);
      }}
      onDragLeave={() => {
        counterRef.current--;
        if (counterRef.current <= 0) {
          counterRef.current = 0;
          setOver(false);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/xamong-path') || e.dataTransfer.types.includes('text/plain')) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        counterRef.current = 0;
        setOver(false);
        const path = e.dataTransfer.getData('application/xamong-path') || e.dataTransfer.getData('text/plain');
        if (path) onDrop(path);
      }}
    >
      {children}
    </div>
  );
}

// ── 즐겨찾기 항목 행 ─────────────────────────────────────────────────────────

interface FavRowProps {
  item: FavoriteItem;
  onOpen: (item: FavoriteItem) => void;
  onRemove: (id: string) => void;
  onOpenInTerminal: (path: string, kind: ShellKind) => void;
  shells: ShellDescriptor[];
}

function FavRow({ item, onOpen, onRemove, onOpenInTerminal, shells }: FavRowProps) {
  const { t } = useI18n();
  const { menu, open: openCtx, close: closeCtx } = useContextMenu();

  const buildContextItems = (): ContextMenuItem[] => {
    const canOpenInTerminal = item.kind === 'folder' || item.kind === 'terminal-path';
    const availableShells = shells.filter((s) => s.available);

    const items: ContextMenuItem[] = [
      {
        kind: 'action',
        label: t('favorites.open'),
        icon: '↗',
        action: () => onOpen(item),
      },
    ];

    if (canOpenInTerminal && availableShells.length > 0) {
      items.push({
        kind: 'submenu',
        label: t('favorites.openInTerminal'),
        icon: '⚡',
        items: availableShells.map((s) => ({
          kind: 'action' as const,
          label: s.label,
          action: () => onOpenInTerminal(item.path, s.kind),
        })),
      });
    }

    items.push({
      kind: 'action',
      label: item.kind === 'url' ? t('favorites.copyUrl') : t('favorites.copyPath'),
      icon: '⎘',
      action: () => navigator.clipboard.writeText(item.path).catch(() => {}),
    });

    items.push({ kind: 'divider' });

    items.push({
      kind: 'action',
      label: t('favorites.removeFromFavorites'),
      icon: '✕',
      action: () => onRemove(item.id),
    });

    return items;
  };

  return (
    <>
      <div
        className="fav-row"
        title={item.path}
        onDoubleClick={() => onOpen(item)}
        onContextMenu={(e) => openCtx(e, buildContextItems())}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen(item);
        }}
      >
        <span className="fav-icon">{getIcon(item)}</span>
        <span className="fav-name" title={item.path}>
          {item.label}
        </span>
        <span className={`fav-badge ${getExtColorClass(item)}`}>{getExtBadge(item, t)}</span>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeCtx} />}
    </>
  );
}

// ── 캡처 날짜/크기 포맷 ───────────────────────────────────────────────────────

function formatDate(ts: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (isToday) return t('favorites.todayAt', { time: `${hh}:${mm}` });
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear().toString().slice(2)}.${mo}.${dd} ${hh}:${mm}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── 캡처 썸네일 훅 (nativeImage IPC 사용, lazy) ──────────────────────────────

function CaptureThumb({ filePath }: { filePath: string }) {
  const [src, setSrc] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadedRef.current) {
          loadedRef.current = true;
          obs.disconnect();
          window.captureAPI
            ?.getThumbnail?.(filePath)
            .then((dataUrl) => {
              if (dataUrl) setSrc(dataUrl);
            })
            .catch(() => {});
        }
      },
      { rootMargin: '80px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [filePath]);

  return (
    <div className="cap-thumb-wrap" ref={ref}>
      {src ? <img className="cap-thumb" src={src} alt="" /> : <span className="cap-thumb-placeholder">📷</span>}
    </div>
  );
}

// ── 캡처 항목 행 ─────────────────────────────────────────────────────────────

interface CaptureRowProps {
  item: CaptureItem;
  onOpen: (item: CaptureItem) => void;
  onDelete: (item: CaptureItem) => void;
  onReveal: (item: CaptureItem) => void;
}

function CaptureRow({ item, onOpen, onDelete, onReveal }: CaptureRowProps) {
  const { t } = useI18n();
  const { menu, open: openCtx, close: closeCtx } = useContextMenu();

  const buildContextItems = (): ContextMenuItem[] => [
    { kind: 'action', label: t('favorites.open'), icon: '↗', action: () => onOpen(item) },
    { kind: 'action', label: t('favorites.showInExplorer'), icon: '📂', action: () => onReveal(item) },
    {
      kind: 'action',
      label: t('favorites.copyPath'),
      icon: '⎘',
      action: () => navigator.clipboard.writeText(item.filePath).catch(() => {}),
    },
    { kind: 'divider' },
    { kind: 'action', label: t('favorites.delete'), icon: '✕', action: () => onDelete(item) },
  ];

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    window.captureAPI?.startFileDrag(item.filePath);
  };

  return (
    <>
      <div
        className="cap-row"
        title={item.filePath}
        onDoubleClick={() => onOpen(item)}
        onContextMenu={(e) => openCtx(e, buildContextItems())}
        draggable
        onDragStart={handleDragStart}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen(item);
        }}
      >
        <CaptureThumb filePath={item.filePath} />
        <div className="cap-info">
          <span className="cap-name" title={item.fileName}>
            {item.fileName}
          </span>
          <span className="cap-meta">
            {formatDate(item.createdAt, t)} · {formatSize(item.size)}
          </span>
        </div>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeCtx} />}
    </>
  );
}

// ── 캡처 패인 ─────────────────────────────────────────────────────────────────

interface CapturesPaneProps {
  onOpenImage?: (filePath: string) => void;
  onStartCapture?: () => void;
}

function CapturesPane({ onOpenImage, onStartCapture }: CapturesPaneProps) {
  const { t } = useI18n();
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCaptures = useCallback(async () => {
    try {
      const items = (await window.captureAPI?.listCaptures?.()) ?? [];
      setCaptures(items);
    } catch {
      setCaptures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaptures();

    const onCaptureDone = () => loadCaptures();
    window.addEventListener('capture-done', onCaptureDone);
    return () => window.removeEventListener('capture-done', onCaptureDone);
  }, [loadCaptures]);

  const handleOpen = useCallback(
    (item: CaptureItem) => {
      onOpenImage?.(item.filePath);
    },
    [onOpenImage],
  );

  const handleDelete = useCallback(async (item: CaptureItem) => {
    await window.captureAPI?.deleteCapture?.(item.filePath);
    setCaptures((prev) => prev.filter((c) => c.filePath !== item.filePath));
  }, []);

  const handleDeleteAll = useCallback(async () => {
    if (captures.length === 0) return;
    await window.captureAPI?.deleteAllCaptures?.();
    setCaptures([]);
  }, [captures.length]);

  const handleReveal = useCallback((item: CaptureItem) => {
    window.terminalAPI?.revealPath?.(item.filePath);
  }, []);

  if (loading) {
    return (
      <div className="cap-root">
        <div className="cap-toolbar">
          <button
            className="fav-btn"
            title={t('app.toolsCapture')}
            aria-label={t('app.toolsCapture')}
            onClick={onStartCapture}
            disabled={!onStartCapture}
          >
            📸
          </button>
          <span className="cap-toolbar-spacer" />
        </div>
        <div className="cap-empty">
          <span className="cap-empty-icon">⌛</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cap-root">
      <div className="cap-toolbar">
        <button
          className="fav-btn"
          title={t('app.toolsCapture')}
          aria-label={t('app.toolsCapture')}
          onClick={onStartCapture}
          disabled={!onStartCapture}
        >
          📸
        </button>
        <span className="cap-toolbar-spacer" />
        <button className="fav-btn" title={t('favorites.captureRefreshTitle')} onClick={loadCaptures}>
          ↺
        </button>
        {captures.length > 0 && (
          <button
            className="fav-btn cap-btn-danger"
            title={t('favorites.captureDeleteAllTitle')}
            onClick={handleDeleteAll}
          >
            ⊗
          </button>
        )}
      </div>

      {captures.length === 0 ? (
        <div className="cap-empty">
          <span className="cap-empty-icon">📷</span>
          <span className="cap-empty-text">
            {t('favorites.noCaptureImages')}
            <br />
            {t('favorites.captureHint')}
          </span>
        </div>
      ) : (
        <div className="cap-list" role="list">
          {captures.map((item) => (
            <CaptureRow
              key={item.filePath}
              item={item}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onReveal={handleReveal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 FavoritesPane ────────────────────────────────────────────────────────

type ActiveTab = 'favorites' | 'captures' | 'remote-files';
const FAVORITES_SHOW_TAB_EVENT = 'xenis:favorites-show-tab';

export function FavoritesPane({
  items,
  onAdd,
  onRemove,
  onOpen,
  onOpenInTerminal,
  shells,
  onAddCurrentTab,
  onOpenImage,
  onStartCapture,
  remoteFileProfiles = [],
  remoteFileGroups = [],
  onOpenRemoteFile,
  onOpenRemoteFileSettings,
}: FavoritesPaneProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<ActiveTab>('favorites');
  const [hasOpenedRemoteFilesTab, setHasOpenedRemoteFilesTab] = useState(false);

  useEffect(() => {
    if (activeTab === 'remote-files') setHasOpenedRemoteFilesTab(true);
  }, [activeTab]);

  useEffect(() => {
    const handler = () => {
      setHasOpenedRemoteFilesTab(true);
      setActiveTab('remote-files');
    };
    window.addEventListener(REMOTE_EXPLORER_NAVIGATE_EVENT, handler);
    window.addEventListener(REMOTE_EXPLORER_ACTION_EVENT, handler);
    return () => {
      window.removeEventListener(REMOTE_EXPLORER_NAVIGATE_EVENT, handler);
      window.removeEventListener(REMOTE_EXPLORER_ACTION_EVENT, handler);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: ActiveTab }>).detail?.tab;
      if (tab !== 'favorites' && tab !== 'captures' && tab !== 'remote-files') return;
      if (tab === 'remote-files') setHasOpenedRemoteFilesTab(true);
      setActiveTab(tab);
    };
    window.addEventListener(FAVORITES_SHOW_TAB_EVENT, handler);
    return () => window.removeEventListener(FAVORITES_SHOW_TAB_EVENT, handler);
  }, []);

  const handleDrop = useCallback(
    (path: string) => {
      const isUrl = /^https?:\/\//i.test(path);
      if (isUrl) {
        onAdd({ kind: 'url', path, label: labelFromUrl(path) });
        return;
      }
      const seg = path.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? '';
      const kind: FavoriteKind = seg.includes('.') ? 'file' : 'folder';
      onAdd({ kind, path, label: labelFromPath(path) });
    },
    [onAdd],
  );

  return (
    <div className="fav-root">
      {/* 탭 헤더 */}
      <div className="fav-tabs">
        <button
          className={`fav-tab${activeTab === 'favorites' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          {t('favorites.favoritesTab')}
        </button>
        <button
          className={`fav-tab${activeTab === 'captures' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('captures')}
        >
          {t('favorites.captureTabLabel')}
        </button>
        <button
          className={`fav-tab${activeTab === 'remote-files' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('remote-files')}
        >
          {t('favorites.ftpTabLabel')}
        </button>
      </div>

      {/* 즐겨찾기 탭 */}
      {activeTab === 'favorites' && (
        <>
          <div className="fav-toolbar">
            <button className="fav-btn" title={t('favorites.addCurrentTab')} onClick={onAddCurrentTab}>
              ⊹
            </button>
          </div>

          <DropZone onDrop={handleDrop}>
            {items.length === 0 ? (
              <div className="fav-empty">
                <span className="fav-empty-icon">☆</span>
                <span className="fav-empty-text">
                  {t('favorites.dragOrAdd')}
                  <br />
                  {t('favorites.addButtonHint')}
                </span>
              </div>
            ) : (
              <div className="fav-list" role="list">
                {items.map((item) => (
                  <FavRow
                    key={item.id}
                    item={item}
                    onOpen={onOpen}
                    onRemove={onRemove}
                    onOpenInTerminal={onOpenInTerminal}
                    shells={shells}
                  />
                ))}
              </div>
            )}
          </DropZone>
        </>
      )}

      {/* 캡처 탭 */}
      {activeTab === 'captures' && <CapturesPane onOpenImage={onOpenImage} onStartCapture={onStartCapture} />}

      {hasOpenedRemoteFilesTab && (
        <div className="fav-tab-panel fav-tab-panel--remote-files" hidden={activeTab !== 'remote-files'}>
          <RemoteFileExplorerPane
            profiles={remoteFileProfiles}
            groups={remoteFileGroups}
            onOpenRemoteFile={(result, profile) => onOpenRemoteFile?.(result, profile)}
            onOpenSettings={onOpenRemoteFileSettings}
          />
        </div>
      )}
    </div>
  );
}
