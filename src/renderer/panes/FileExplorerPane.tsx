import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  FsEntry,
  OpenFileResult,
  RemoteFileProfile,
  ShellDescriptor,
  ShellKind,
  TransferOverwritePolicy,
  TransferQueueItem,
} from '../../shared/types';
import { ContextMenu, type ContextMenuItem, useContextMenu } from '../components/ContextMenu';
import { ExplorerComparePanel, type ExplorerCompareTransferPolicy } from '../components/ExplorerComparePanel';
import { ExplorerPreview } from '../components/ExplorerPreview';
import {
  type ArtifactCompareResult,
  buildArtifactCompareBotMessage,
} from '../extensions/xenesis-desk.core-tools/deskIntelligence';
import {
  buildSafeFileEditHandoff,
  SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY,
  serializeSafeFileEditHandoff,
} from '../extensions/xenesis-desk.core-tools/safeFileEditCenterUtils';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useI18n } from '../i18n';
import {
  clearExplorerCompareHistory,
  compareExplorerItemWithLatestOpposite,
  compareExplorerPair,
  EXPLORER_COMPARE_HISTORY_CHANGED_EVENT,
  type ExplorerCompareHistoryItem,
  type ExplorerComparePair,
  formatExplorerCompareError,
  getExplorerCompareHistory,
  resolveExplorerCompareRemoteProfile,
  updateExplorerCompareHistoryItem,
} from '../utils/explorerCompareUtils';
import {
  addExplorerContextItem,
  buildExplorerContextBotMessage,
  buildExplorerRemoteSyncHandoff,
  getExplorerContextItems,
  makeLocalExplorerContextItem,
  setExplorerCompareSelection,
  setExplorerRemoteSyncHandoff,
} from '../utils/explorerContextStore';
import {
  dispatchLocalExplorerNavigate,
  dispatchOpenLocalFile,
  dispatchOpenRemoteFile,
  LOCAL_EXPLORER_ACTION_EVENT,
  LOCAL_EXPLORER_NAVIGATE_EVENT,
  type LocalExplorerActionRequest,
  type LocalExplorerNavigateRequest,
  setRemoteExplorerNavigateHandoff,
} from '../utils/explorerNavigationEvents';
import { sendXenesisContextMessage } from '../utils/xenesisContextSend';

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface ExplorerNode extends FsEntry {
  /** null = 아직 로드 안 됨, 배열 = 로드 완료 */
  children: ExplorerNode[] | null;
  expanded: boolean;
  loading: boolean;
}

export interface FileExplorerPaneProps {
  /** 탐색 시작 루트 경로 */
  rootDir: string;
  /** 파일 더블클릭 시 호출 */
  onOpenFile: (filePath: string) => void;
  /** 폴더를 Obsidian Vault Viewer로 열기 */
  onOpenVault?: (folderPath: string) => void;
  /** 루트 디렉터리 변경 시 부모에게 알림 */
  onChangeRoot?: (dir: string) => void;
  /** 항목 선택 시 부모에게 알림 (단순 클릭) */
  onSelectPath?: (path: string, isDirectory: boolean) => void;
  /** 우클릭 → 즐겨찾기에 추가 */
  onAddToFavorites?: (path: string, isDirectory: boolean) => void;
  /** 우클릭 → 터미널에서 열기 */
  onOpenInTerminal?: (path: string, isDirectory: boolean, kind: ShellKind) => void;
  /** 사용 가능한 셸 목록 */
  shells?: ShellDescriptor[];
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function entryToNode(e: FsEntry): ExplorerNode {
  return {
    ...e,
    children: e.isDirectory ? null : (undefined as unknown as null),
    expanded: false,
    loading: false,
  };
}

/** 트리를 순회하며 targetPath 노드를 updater로 교체 */
function updateNode(
  nodes: ExplorerNode[],
  targetPath: string,
  updater: (n: ExplorerNode) => ExplorerNode,
): ExplorerNode[] {
  return nodes.map((n) => {
    if (n.path === targetPath) return updater(n);
    if (n.children && n.expanded) {
      return { ...n, children: updateNode(n.children, targetPath, updater) };
    }
    return n;
  });
}

/** 파일 확장자 → 아이콘 문자 */
function fileIcon(ext: string): string {
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
    case 'sass':
      return '𝐒';
    case 'html':
    case 'htm':
      return '𝐇';
    case 'py':
      return '𝐏';
    case 'rs':
      return '𝐑';
    case 'go':
      return '𝐆';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'ico':
    case 'bmp':
      return '🖼';
    case 'log':
    case 'txt':
      return '📄';
    case 'sh':
    case 'bat':
    case 'ps1':
      return '⚡';
    default:
      return '📄';
  }
}

/** 파일 확장자 → CSS 색상 클래스 */
function fileColorClass(ext: string): string {
  if (['ts', 'tsx'].includes(ext)) return 'fe-color-ts';
  if (['js', 'jsx', 'mjs'].includes(ext)) return 'fe-color-js';
  if (['json'].includes(ext)) return 'fe-color-json';
  if (['md', 'markdown'].includes(ext)) return 'fe-color-md';
  if (['mmd'].includes(ext)) return 'fe-color-mmd';
  if (['css', 'scss', 'sass'].includes(ext)) return 'fe-color-css';
  if (['html', 'htm', 'svg'].includes(ext)) return 'fe-color-html';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp'].includes(ext)) return 'fe-color-img';
  if (['py'].includes(ext)) return 'fe-color-py';
  if (['sh', 'bat', 'ps1'].includes(ext)) return 'fe-color-sh';
  return 'fe-color-default';
}

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p;
}

function dirnameLocal(p: string): string {
  const clean = String(p || '').replace(/[\\/]+$/, '');
  const index = Math.max(clean.lastIndexOf('\\'), clean.lastIndexOf('/'));
  return index > 0 ? clean.slice(0, index) : clean;
}

function joinLocalPath(base: string, name: string): string {
  const cleanBase = String(base || '').replace(/[\\/]+$/, '');
  const cleanName = String(name || '').replace(/^[\\/]+/, '');
  if (!cleanBase) return cleanName;
  const separator = cleanBase.includes('/') && !cleanBase.includes('\\') ? '/' : '\\';
  return `${cleanBase}${separator}${cleanName}`;
}

function normalizeRemotePath(input: string): string {
  const normalized = String(input || '/')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
  if (!normalized || normalized === '.') return '/';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function parentRemotePath(remotePath: string): string {
  const clean = normalizeRemotePath(remotePath).replace(/\/+$/, '');
  if (!clean || clean === '/') return '/';
  const index = clean.lastIndexOf('/');
  return index <= 0 ? '/' : clean.slice(0, index);
}

function joinRemotePath(basePath: string, name: string): string {
  const base = normalizeRemotePath(basePath).replace(/\/+$/, '');
  const cleanName = String(name || '').replace(/^\/+/, '');
  return base ? `${base}/${cleanName}` : `/${cleanName}`;
}

function normalizeLocalComparable(pathValue: string): string {
  return String(pathValue || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function localNameExists(entries: FsEntry[], name: string): boolean {
  const target = String(name || '').toLowerCase();
  return entries.some((entry) => entry.name.toLowerCase() === target);
}

interface BreadcrumbSegment {
  label: string;
  path: string;
}

function localBreadcrumbSegments(pathValue: string): BreadcrumbSegment[] {
  const raw = String(pathValue || '').trim();
  if (!raw) return [];
  const useBackslash = raw.includes('\\') || /^[a-z]:/i.test(raw);
  const sep = useBackslash ? '\\' : '/';
  const normalized = raw.replace(/[\\/]+/g, sep);
  const parts = normalized.split(sep).filter(Boolean);
  if (!parts.length) return [{ label: sep, path: sep }];

  const segments: BreadcrumbSegment[] = [];
  let cursor = '';

  if (/^[a-z]:$/i.test(parts[0])) {
    cursor = `${parts[0]}${sep}`;
    segments.push({ label: parts[0], path: cursor });
    for (const part of parts.slice(1)) {
      cursor = `${cursor.replace(/[\\/]+$/, '')}${sep}${part}`;
      segments.push({ label: part, path: cursor });
    }
    return segments;
  }

  if (normalized.startsWith(sep)) {
    cursor = sep;
    segments.push({ label: sep, path: sep });
  }

  for (const part of parts) {
    cursor = cursor && cursor !== sep ? `${cursor}${sep}${part}` : `${cursor}${part}`;
    segments.push({ label: part, path: cursor });
  }
  return segments;
}

function matchesExplorerQuery(entry: FsEntry, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const ext = entry.ext.toLowerCase();
  const haystack = [entry.name, entry.path, entry.ext].map((value) => String(value || '').toLowerCase());

  return tokens.every((token) => {
    if (token.startsWith('*.')) return ext === token.slice(2);
    if (token.startsWith('.')) return ext === token.slice(1);
    const compact = token.replace(/\*/g, '');
    return haystack.some((value) => value.includes(compact));
  });
}

function filterExplorerNodes(nodes: ExplorerNode[], query: string): ExplorerNode[] {
  if (!query.trim()) return nodes;
  return nodes.flatMap((node) => {
    const filteredChildren = node.children ? filterExplorerNodes(node.children, query) : null;
    const selfMatches = matchesExplorerQuery(node, query);
    if (!selfMatches && (!filteredChildren || filteredChildren.length === 0)) return [];
    return [
      {
        ...node,
        children: filteredChildren ?? node.children,
        expanded: filteredChildren && filteredChildren.length > 0 ? true : node.expanded,
      },
    ];
  });
}

function findExplorerNode(nodes: ExplorerNode[], targetPath: string): ExplorerNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const child = findExplorerNode(node.children, targetPath);
      if (child) return child;
    }
  }
  return null;
}

function countVisibleNodes(nodes: ExplorerNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + (node.expanded && node.children ? countVisibleNodes(node.children) : 0),
    0,
  );
}

function suggestLocalCopyName(fileName: string, existingNames: string[]): string {
  const dotIndex = fileName.lastIndexOf('.');
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '';
  const existing = new Set(existingNames.map((name) => name.toLowerCase()));
  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${base} (${index})${ext}`;
    if (!existing.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
}

function isLocalPathInsideDir(filePath: string, dirPath: string): boolean {
  const file = normalizeLocalComparable(filePath);
  const dir = normalizeLocalComparable(dirPath);
  if (!file || !dir) return false;
  return file === dir || file.startsWith(`${dir}/`);
}

interface RemoteDragPayload {
  profile: RemoteFileProfile;
  path: string;
  name: string;
  isDirectory: boolean;
}

interface DownloadDraft {
  profile: RemoteFileProfile;
  remotePath: string;
  localPath: string;
  fileName: string;
  targetDir: string;
}

interface DownloadConflictState extends DownloadDraft {
  existingNames: string[];
  newName: string;
  error?: string;
}

function parseRemoteDragPayload(raw: string): RemoteDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<RemoteDragPayload>;
    if (!parsed?.profile || !parsed.path || !parsed.name) return null;
    return {
      profile: parsed.profile as RemoteFileProfile,
      path: String(parsed.path),
      name: String(parsed.name),
      isDirectory: parsed.isDirectory === true,
    };
  } catch {
    return null;
  }
}

// ── 개별 노드 행 컴포넌트 ─────────────────────────────────────────────────────

interface NodeRowProps {
  node: ExplorerNode;
  depth: number;
  selected: string;
  onSelect: (path: string, isDirectory: boolean) => void;
  onToggle: (node: ExplorerNode) => void;
  onOpen: (node: ExplorerNode) => void;
  onAddToFavorites?: (path: string, isDirectory: boolean) => void;
  onOpenInTerminal?: (path: string, isDirectory: boolean, kind: ShellKind) => void;
  onOpenVault?: (folderPath: string) => void;
  onRemoteFileDrop?: (payload: RemoteDragPayload, targetNode: ExplorerNode | null) => void;
  onSendToBot?: (node: ExplorerNode) => void;
  onAddToContextBundle?: (node: ExplorerNode) => void;
  onOpenSafeFileEditCenter?: (node: ExplorerNode) => void;
  shells?: ShellDescriptor[];
}

function NodeRow({
  node,
  depth,
  selected,
  onSelect,
  onToggle,
  onOpen,
  onAddToFavorites,
  onOpenInTerminal,
  onOpenVault,
  onRemoteFileDrop,
  onSendToBot,
  onAddToContextBundle,
  onOpenSafeFileEditCenter,
  shells,
}: NodeRowProps) {
  const { t } = useI18n();
  const isSelected = node.path === selected;
  const indent = depth * 14;
  const { menu, open: openCtx, close: closeCtx } = useContextMenu();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path, node.isDirectory);
    if (node.isDirectory) onToggle(node);
  };

  const handleDblClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(node);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/xamong-path', node.path);
    e.dataTransfer.setData('application/xamong-is-directory', node.isDirectory ? 'true' : 'false');
    e.dataTransfer.setData('text/plain', node.path);
  };

  const handleRemoteDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/xamong-remote-file')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleRemoteDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/xamong-remote-file')) return;
    e.preventDefault();
    e.stopPropagation();
    const payload = parseRemoteDragPayload(e.dataTransfer.getData('application/xamong-remote-file'));
    if (payload) onRemoteFileDrop?.(payload, node);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const availableShells = (shells ?? []).filter((s) => s.available);
    const items: ContextMenuItem[] = [];

    if (!node.isDirectory) {
      items.push({
        kind: 'action',
        label: t('fileExplorer.open'),
        icon: '↗',
        action: () => onOpen(node),
      });
    } else {
      items.push({
        kind: 'action',
        label: t('fileExplorer.setAsRoot'),
        icon: '📁',
        action: () => onOpen(node),
      });
    }

    if (node.isDirectory && onOpenVault) {
      items.push({
        kind: 'action',
        label: t('fileExplorer.openAsVault'),
        icon: '▤',
        action: () => onOpenVault(node.path),
      });
    }

    if (availableShells.length > 0 && onOpenInTerminal) {
      if (availableShells.length === 1) {
        items.push({
          kind: 'action',
          label: t('fileExplorer.openInTerminal', { shell: availableShells[0].label }),
          icon: '⚡',
          action: () => onOpenInTerminal(node.path, node.isDirectory, availableShells[0].kind),
        });
      } else {
        items.push({
          kind: 'submenu',
          label: t('fileExplorer.openInTerminalDefault'),
          icon: '⚡',
          items: availableShells.map((s) => ({
            kind: 'action' as const,
            label: s.label,
            action: () => onOpenInTerminal!(node.path, node.isDirectory, s.kind),
          })),
        });
      }
    }

    items.push({
      kind: 'action',
      label: t('fileExplorer.showInExplorer'),
      icon: '📂',
      action: () => window.terminalAPI.revealPath(node.path).catch(() => {}),
    });

    items.push({
      kind: 'action',
      label: t('fileExplorer.copyPath'),
      icon: '⎘',
      action: () => navigator.clipboard.writeText(node.path).catch(() => {}),
    });

    if (onSendToBot || onAddToContextBundle || (!node.isDirectory && onOpenSafeFileEditCenter)) {
      items.push({ kind: 'divider' });
    }

    if (onSendToBot) {
      items.push({
        kind: 'action',
        label: t('fileExplorer.sendToBot'),
        icon: 'AI',
        action: () => onSendToBot(node),
      });
    }

    if (onAddToContextBundle) {
      items.push({
        kind: 'action',
        label: t('fileExplorer.addToContextBundle'),
        icon: '+',
        action: () => onAddToContextBundle(node),
      });
    }

    if (!node.isDirectory && onOpenSafeFileEditCenter) {
      items.push({
        kind: 'action',
        label: t('fileExplorer.openSafeFileEditCenter'),
        icon: 'E',
        action: () => onOpenSafeFileEditCenter(node),
      });
    }

    if (onAddToFavorites) {
      items.push({ kind: 'divider' });
      items.push({
        kind: 'action',
        label: t('fileExplorer.addToFavorites'),
        icon: '☆',
        action: () => onAddToFavorites(node.path, node.isDirectory),
      });
    }

    openCtx(e, items);
  };

  return (
    <>
      <div
        className={`fe-row${isSelected ? ' is-selected' : ''}`}
        draggable
        style={{ paddingLeft: 8 + indent }}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        onDragStart={handleDragStart}
        onDragOver={handleRemoteDragOver}
        onDrop={handleRemoteDrop}
        onContextMenu={handleContextMenu}
        title={node.path}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={node.isDirectory ? node.expanded : undefined}
      >
        {/* 폴더 열림/닫힘 화살표 */}
        <span className="fe-arrow" aria-hidden="true">
          {node.isDirectory ? (node.loading ? '⋯' : node.expanded ? '▾' : '▸') : '\u00A0'}
        </span>

        {/* 아이콘 */}
        <span className={`fe-icon${node.isDirectory ? ' fe-icon-dir' : ` ${fileColorClass(node.ext)}`}`}>
          {node.isDirectory ? (node.expanded ? '📂' : '📁') : fileIcon(node.ext)}
        </span>

        {/* 이름 */}
        <span className="fe-name">{node.name}</span>

        {/* 확장자 배지 */}
        {!node.isDirectory && node.ext && <span className={`fe-ext ${fileColorClass(node.ext)}`}>.{node.ext}</span>}
      </div>

      {/* 자식 노드 */}
      {node.isDirectory && node.expanded && node.children && (
        <div className="fe-children" role="group">
          {node.children.length === 0 ? (
            <div className="fe-empty-dir" style={{ paddingLeft: 8 + indent + 14 }}>
              {t('fileExplorer.emptyFolder')}
            </div>
          ) : (
            node.children.map((child) => (
              <NodeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                selected={selected}
                onSelect={onSelect}
                onToggle={onToggle}
                onOpen={onOpen}
                onAddToFavorites={onAddToFavorites}
                onOpenInTerminal={onOpenInTerminal}
                onOpenVault={onOpenVault}
                onRemoteFileDrop={onRemoteFileDrop}
                onSendToBot={onSendToBot}
                onAddToContextBundle={onAddToContextBundle}
                onOpenSafeFileEditCenter={onOpenSafeFileEditCenter}
                shells={shells}
              />
            ))
          )}
        </div>
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeCtx} />}
    </>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function FileExplorerPane({
  rootDir,
  onOpenFile,
  onOpenVault,
  onChangeRoot,
  onSelectPath,
  onAddToFavorites,
  onOpenInTerminal,
  shells,
}: FileExplorerPaneProps) {
  const { t } = useI18n();
  const [currentRoot, setCurrentRoot] = useState(rootDir || '');
  const [pathEditActive, setPathEditActive] = useState(false);
  const [pathEditValue, setPathEditValue] = useState(currentRoot);
  const [nodes, setNodes] = useState<ExplorerNode[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [transferQueueItems, setTransferQueueItems] = useState<TransferQueueItem[]>([]);
  const [downloadConflict, setDownloadConflict] = useState<DownloadConflictState | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [previewResult, setPreviewResult] = useState<OpenFileResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [showSelectionDetails, setShowSelectionDetails] = useState(false);
  const [showPreviewPane, setShowPreviewPane] = useState(false);
  const [compareResult, setCompareResult] = useState<ArtifactCompareResult | null>(null);
  const [comparePair, setComparePair] = useState<ExplorerComparePair | null>(null);
  const [compareTransferId, setCompareTransferId] = useState('');
  const [compareTransferPolicy, setCompareTransferPolicy] = useState<ExplorerCompareTransferPolicy>('overwrite');
  const [compareHistory, setCompareHistory] = useState<ExplorerCompareHistoryItem[]>(() => getExplorerCompareHistory());
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [compareVisible, setCompareVisible] = useState(false);

  const loadingRootRef = useRef('');
  const completedTransferIdsRef = useRef<Set<string>>(new Set());
  const previewRequestIdRef = useRef(0);
  const compareRequestIdRef = useRef(0);
  const pathInputRef = useRef<HTMLInputElement>(null);
  const { menu: actionMenu, open: openCtx, close: closeActionMenu } = useContextMenu();

  const loadRoot = useCallback(
    async (dir: string) => {
      if (!dir) return;
      loadingRootRef.current = dir;
      setLoading(true);
      setError('');
      try {
        const entries = await window.fsAPI.listDir(dir);
        if (loadingRootRef.current !== dir) return; // stale
        setNodes(entries.map(entryToNode));
      } catch (err) {
        if (loadingRootRef.current === dir)
          setError(t('fileExplorer.readError', { e: String((err as Error).message) }));
      } finally {
        if (loadingRootRef.current === dir) setLoading(false);
      }
    },
    [t],
  );

  // rootDir prop 변경 시 재로드
  useEffect(() => {
    setCurrentRoot(rootDir || '');
  }, [rootDir]);

  // workspace-changed 이벤트 수신 → 파일 탐색기 루트 이동
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ path?: string; selectedPath?: string; selectPath?: string }>;
      const newPath = ev.detail?.path;
      if (typeof newPath === 'string' && newPath) {
        setCurrentRoot(newPath);
        setNodes([]);
        setSelected(ev.detail?.selectedPath || ev.detail?.selectPath || '');
        onChangeRoot?.(newPath);
      }
    };
    window.addEventListener('workspace-changed', handler);
    return () => window.removeEventListener('workspace-changed', handler);
  }, [onChangeRoot]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LocalExplorerNavigateRequest>).detail;
      if (!detail?.path) return;
      setCurrentRoot(detail.path);
      setNodes([]);
      setSelected(detail.selectPath || '');
      onChangeRoot?.(detail.path);
    };
    window.addEventListener(LOCAL_EXPLORER_NAVIGATE_EVENT, handler);
    return () => window.removeEventListener(LOCAL_EXPLORER_NAVIGATE_EVENT, handler);
  }, [onChangeRoot]);

  useEffect(() => {
    if (currentRoot) loadRoot(currentRoot);
  }, [currentRoot, loadRoot]);

  useEffect(() => {
    if (!pathEditActive) setPathEditValue(currentRoot);
  }, [currentRoot, pathEditActive]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ExplorerCompareHistoryItem[]>).detail;
      setCompareHistory(Array.isArray(detail) ? detail : getExplorerCompareHistory());
    };
    setCompareHistory(getExplorerCompareHistory());
    window.addEventListener(EXPLORER_COMPARE_HISTORY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(EXPLORER_COMPARE_HISTORY_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!currentRoot) return;
    const handleTransferQueueChanged = (items: TransferQueueItem[]) => {
      setTransferQueueItems(items);
      let shouldRefresh = false;
      for (const item of items) {
        if (item.state !== 'completed') continue;
        if (completedTransferIdsRef.current.has(item.id)) continue;
        completedTransferIdsRef.current.add(item.id);
        if (item.direction === 'download' && isLocalPathInsideDir(item.localPath, currentRoot)) {
          shouldRefresh = true;
        }
      }
      if (shouldRefresh) void loadRoot(currentRoot);
    };

    window.transferQueueAPI
      .list()
      .then(handleTransferQueueChanged)
      .catch(() => {});
    const unsubscribe = window.transferQueueAPI.onChanged(handleTransferQueueChanged);
    return unsubscribe;
  }, [currentRoot, loadRoot]);

  const handleSelect = useCallback(
    (path: string, isDirectory: boolean) => {
      setSelected(path);
      onSelectPath?.(path, isDirectory);
    },
    [onSelectPath],
  );

  useEffect(() => {
    previewRequestIdRef.current += 1;
    setPreviewResult(null);
    setPreviewError('');
    setPreviewLoading(false);
  }, [selected]);

  const changeRoot = useCallback(
    (dir: string) => {
      if (!dir) return;
      setCurrentRoot(dir);
      setNodes([]);
      setSelected('');
      onChangeRoot?.(dir);
    },
    [onChangeRoot],
  );

  function startBreadcrumbPathEdit() {
    setPathEditValue(currentRoot || '');
    setPathEditActive(true);
    window.setTimeout(() => {
      const input = pathInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    }, 0);
  }

  function handleBreadcrumbBackgroundClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || pathEditActive) return;
    startBreadcrumbPathEdit();
  }

  function handleBreadcrumbPathKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setPathEditValue(currentRoot || '');
      setPathEditActive(false);
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const nextPath = pathEditValue.trim();
    setPathEditActive(false);
    if (nextPath && nextPath !== currentRoot) {
      changeRoot(nextPath);
    }
  }

  const enqueueDownload = useCallback(
    async (draft: DownloadDraft, policy: Exclude<TransferOverwritePolicy, 'ask'> = 'overwrite') => {
      const item = await window.transferQueueAPI.enqueue({
        direction: 'download',
        profile: draft.profile,
        remotePath: draft.remotePath,
        localPath: draft.localPath,
        fileName: draft.fileName,
        overwritePolicy: policy,
      });
      setTransferMessage(t('transferQueue.queued', { name: item.fileName }));
      setDownloadConflict(null);
    },
    [t],
  );

  const resolveDownloadConflict = useCallback(
    async (draft: DownloadDraft, policy: TransferOverwritePolicy = 'ask') => {
      if (policy !== 'ask') {
        await enqueueDownload(draft, policy);
        return;
      }

      setError('');
      setTransferMessage('');
      try {
        const targetEntries = await window.fsAPI.listDir(draft.targetDir);
        if (!localNameExists(targetEntries, draft.fileName)) {
          await enqueueDownload(draft, 'overwrite');
          return;
        }

        const existingNames = targetEntries.map((entry) => entry.name);
        setDownloadConflict({
          ...draft,
          existingNames,
          newName: suggestLocalCopyName(draft.fileName, existingNames),
        });
      } catch (err) {
        setError(String((err as Error).message || err));
      }
    },
    [enqueueDownload],
  );

  const handleRemoteFileDrop = useCallback(
    async (payload: RemoteDragPayload, targetNode: ExplorerNode | null) => {
      if (!currentRoot) return;
      if (payload.isDirectory) {
        setError(t('remoteFileExplorer.directoryTransferUnsupported'));
        return;
      }

      const targetDir = targetNode
        ? targetNode.isDirectory
          ? targetNode.path
          : dirnameLocal(targetNode.path)
        : currentRoot;
      if (!targetDir) return;

      setError('');
      setTransferMessage('');
      try {
        const targetPath = joinLocalPath(targetDir, payload.name);
        await resolveDownloadConflict({
          profile: payload.profile,
          remotePath: payload.path,
          localPath: targetPath,
          fileName: payload.name,
          targetDir,
        });
      } catch (err) {
        setError(String((err as Error).message || err));
      }
    },
    [currentRoot, resolveDownloadConflict, t],
  );

  const handleDownloadConflictOverwrite = useCallback(() => {
    if (!downloadConflict) return;
    void enqueueDownload(downloadConflict, 'overwrite');
  }, [downloadConflict, enqueueDownload]);

  const handleDownloadConflictSaveAs = useCallback(() => {
    if (!downloadConflict) return;
    const newName = downloadConflict.newName.trim();
    if (!newName) {
      setDownloadConflict({ ...downloadConflict, error: t('transferQueue.newNameRequired') });
      return;
    }
    if (downloadConflict.existingNames.map((name) => name.toLowerCase()).includes(newName.toLowerCase())) {
      setDownloadConflict({ ...downloadConflict, error: t('transferQueue.nameAlreadyExists', { name: newName }) });
      return;
    }
    void enqueueDownload(
      {
        ...downloadConflict,
        fileName: newName,
        localPath: joinLocalPath(downloadConflict.targetDir, newName),
      },
      'overwrite',
    );
  }, [downloadConflict, enqueueDownload, t]);

  const handleDownloadConflictCancel = useCallback(() => {
    setDownloadConflict(null);
    setTransferMessage(t('transferQueue.conflictCanceled'));
  }, [t]);

  const handleTreeDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/xamong-remote-file')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleTreeDrop = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('application/xamong-remote-file')) return;
      e.preventDefault();
      const payload = parseRemoteDragPayload(e.dataTransfer.getData('application/xamong-remote-file'));
      if (payload) void handleRemoteFileDrop(payload, null);
    },
    [handleRemoteFileDrop],
  );

  const handleToggle = useCallback(async (node: ExplorerNode) => {
    if (!node.isDirectory) return;

    if (!node.expanded && node.children === null) {
      // 첫 번째 열기 — 자식 로드
      setNodes((prev) => updateNode(prev, node.path, (n) => ({ ...n, loading: true, expanded: true })));
      const entries = await window.fsAPI.listDir(node.path);
      setNodes((prev) =>
        updateNode(prev, node.path, (n) => ({
          ...n,
          loading: false,
          children: entries.map(entryToNode),
        })),
      );
    } else {
      // 이미 로드된 경우 — 단순 토글
      setNodes((prev) => updateNode(prev, node.path, (n) => ({ ...n, expanded: !n.expanded })));
    }
  }, []);

  const handleOpen = useCallback(
    (node: ExplorerNode) => {
      if (node.isDirectory) {
        // 폴더 더블클릭 → 루트 변경
        changeRoot(node.path);
      } else {
        onOpenFile(node.path);
      }
    },
    [changeRoot, onOpenFile],
  );

  const handleRefresh = useCallback(() => {
    setNodes([]);
    loadRoot(currentRoot);
  }, [currentRoot, loadRoot]);

  const { isRefreshing, refresh } = usePaneRefresh({ onRefresh: handleRefresh });

  const handleSelectDir = useCallback(async () => {
    const dir = await window.fsAPI.selectDir();
    if (dir) {
      changeRoot(dir);
    }
  }, [changeRoot]);

  const handleGoUp = useCallback(() => {
    const parent = currentRoot.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
    if (parent) {
      const newRoot = currentRoot.includes('\\') ? parent.replace(/\//g, '\\') : parent;
      changeRoot(newRoot || currentRoot);
    }
  }, [changeRoot, currentRoot]);

  const makeContextItemForNode = useCallback(
    (node: ExplorerNode) =>
      makeLocalExplorerContextItem({
        path: node.path,
        name: node.name,
        isDirectory: node.isDirectory,
        ext: node.ext,
      }),
    [],
  );

  const sendNodeToBot = useCallback(
    (node: ExplorerNode) => {
      const item = makeContextItemForNode(node);
      sendXenesisContextMessage(buildExplorerContextBotMessage(item), { source: 'local-explorer' });
      setTransferMessage(t('fileExplorer.sentToBot', { name: node.name }));
    },
    [makeContextItemForNode, t],
  );

  const addNodeToContextBundle = useCallback(
    (node: ExplorerNode) => {
      addExplorerContextItem(makeContextItemForNode(node));
      setTransferMessage(t('fileExplorer.addedToContextBundle', { name: node.name }));
    },
    [makeContextItemForNode, t],
  );

  const previewNode = useCallback(
    async (node: ExplorerNode) => {
      if (node.isDirectory) return;
      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      setPreviewVisible(true);
      setPreviewLoading(true);
      setPreviewError('');
      setPreviewResult(null);
      try {
        const result = await window.fileAPI.readFile(node.path);
        if (previewRequestIdRef.current !== requestId) return;
        if (!result) {
          setPreviewError(t('fileExplorer.previewReadError', { name: node.name }));
          return;
        }
        setPreviewResult(result);
      } catch (previewErrorValue) {
        if (previewRequestIdRef.current !== requestId) return;
        setPreviewError(previewErrorValue instanceof Error ? previewErrorValue.message : String(previewErrorValue));
      } finally {
        if (previewRequestIdRef.current === requestId) setPreviewLoading(false);
      }
    },
    [t],
  );

  const compareNode = useCallback(
    async (node: ExplorerNode) => {
      if (node.isDirectory) return;
      const requestId = compareRequestIdRef.current + 1;
      compareRequestIdRef.current = requestId;
      setCompareVisible(true);
      setCompareLoading(true);
      setCompareError('');
      setCompareResult(null);
      setComparePair(null);
      setCompareTransferId('');
      try {
        const { pair, result } = await compareExplorerItemWithLatestOpposite(makeContextItemForNode(node));
        if (compareRequestIdRef.current !== requestId) return;
        setComparePair(pair);
        setCompareResult(result);
        setTransferMessage(t('explorerCompare.done', { summary: result.summary }));
      } catch (compareErrorValue) {
        if (compareRequestIdRef.current !== requestId) return;
        setCompareError(formatExplorerCompareError(compareErrorValue, t));
      } finally {
        if (compareRequestIdRef.current === requestId) setCompareLoading(false);
      }
    },
    [makeContextItemForNode, t],
  );

  const sendCompareToBot = useCallback(() => {
    if (!compareResult) return;
    sendXenesisContextMessage(buildArtifactCompareBotMessage(compareResult), { source: 'local-explorer-compare' });
    setTransferMessage(t('explorerCompare.sentToBot'));
  }, [compareResult, t]);

  const runCompareHistoryItem = useCallback(
    async (item: ExplorerCompareHistoryItem) => {
      const requestId = compareRequestIdRef.current + 1;
      compareRequestIdRef.current = requestId;
      setCompareVisible(true);
      setCompareLoading(true);
      setCompareError('');
      setCompareResult(null);
      setComparePair(item.pair);
      setCompareTransferId('');
      try {
        const { pair, result } = await compareExplorerPair(item.pair);
        if (compareRequestIdRef.current !== requestId) return;
        setComparePair(pair);
        setCompareResult(result);
        setTransferMessage(t('explorerCompare.historyCompared', { name: item.pair.local.name }));
      } catch (historyError) {
        if (compareRequestIdRef.current !== requestId) return;
        setCompareError(formatExplorerCompareError(historyError, t));
      } finally {
        if (compareRequestIdRef.current === requestId) setCompareLoading(false);
      }
    },
    [t],
  );

  const clearCompareHistory = useCallback(() => {
    setCompareHistory(clearExplorerCompareHistory());
    setTransferMessage(t('explorerCompare.historyCleared'));
  }, [t]);

  const toggleCompareHistoryPin = useCallback(
    (item: ExplorerCompareHistoryItem) => {
      const nextPinned = !item.pinned;
      setCompareHistory(updateExplorerCompareHistoryItem(item.id, { pinned: nextPinned }));
      setTransferMessage(
        t(nextPinned ? 'explorerCompare.historyPinned' : 'explorerCompare.historyUnpinned', {
          name: item.label || item.pair.local.name,
        }),
      );
    },
    [t],
  );

  const renameCompareHistoryItem = useCallback(
    (item: ExplorerCompareHistoryItem) => {
      const nextLabel = window.prompt(t('explorerCompare.renameHistoryPrompt'), item.label || '');
      if (nextLabel === null) return;
      setCompareHistory(updateExplorerCompareHistoryItem(item.id, { label: nextLabel.trim() }));
      setTransferMessage(
        nextLabel.trim()
          ? t('explorerCompare.historyRenamed', { name: nextLabel.trim() })
          : t('explorerCompare.historyNameCleared', { name: item.pair.local.name }),
      );
    },
    [t],
  );

  const queueComparePairTransfer = useCallback(
    async (pair: ExplorerComparePair, direction: 'upload' | 'download', resetCurrentResult = false) => {
      setCompareVisible(true);
      setComparePair(pair);
      setCompareTransferId('');
      if (resetCurrentResult) setCompareResult(null);
      let localPath = pair.local.path;
      let remotePath = pair.remote.path;
      let fileName = direction === 'upload' ? pair.remote.name : pair.local.name;
      let overwritePolicy: Exclude<TransferOverwritePolicy, 'ask'> =
        compareTransferPolicy === 'skip' ? 'skip' : 'overwrite';

      if (compareTransferPolicy === 'save-as') {
        const nextName = window.prompt(t('explorerCompare.saveAsPrompt'), fileName)?.trim();
        if (!nextName) return;
        fileName =
          nextName
            .split(/[\\/]+/)
            .filter(Boolean)
            .pop() || '';
        if (!fileName) return;
        overwritePolicy = 'skip';
        if (direction === 'upload') {
          remotePath = joinRemotePath(parentRemotePath(pair.remote.path), fileName);
        } else {
          localPath = joinLocalPath(dirnameLocal(pair.local.path), fileName);
        }
      }

      const confirmed = window.confirm(
        t('explorerCompare.confirmTransfer', {
          direction: t(direction === 'upload' ? 'explorerCompare.upload' : 'explorerCompare.download'),
          policy: t(
            `explorerCompare.policy${compareTransferPolicy === 'save-as' ? 'SaveAs' : compareTransferPolicy === 'skip' ? 'Skip' : 'Overwrite'}`,
          ),
          local: localPath,
          remote: remotePath,
        }),
      );
      if (!confirmed) return;

      try {
        setCompareError('');
        const profile = await resolveExplorerCompareRemoteProfile(pair);
        const item = await window.transferQueueAPI.enqueue({
          direction,
          profile,
          localPath,
          remotePath,
          fileName,
          overwritePolicy,
        });
        setCompareTransferId(item.id);
        setTransferMessage(
          t('explorerCompare.transferQueued', {
            direction: t(direction === 'upload' ? 'explorerCompare.upload' : 'explorerCompare.download'),
            name: item.fileName,
          }),
        );
      } catch (queueError) {
        setCompareError(formatExplorerCompareError(queueError, t));
      }
    },
    [compareTransferPolicy, t],
  );

  const queueCompareTransfer = useCallback(
    async (direction: 'upload' | 'download') => {
      if (!comparePair) return;
      await queueComparePairTransfer(comparePair, direction);
    },
    [comparePair, queueComparePairTransfer],
  );

  const queueHistoryCompareTransfer = useCallback(
    async (item: ExplorerCompareHistoryItem, direction: 'upload' | 'download') => {
      await queueComparePairTransfer(item.pair, direction, true);
    },
    [queueComparePairTransfer],
  );

  const retryCompareTransfer = useCallback(async (item: TransferQueueItem) => {
    try {
      setCompareError('');
      const retried = await window.transferQueueAPI.retry(item.id);
      if (retried) setCompareTransferId(retried.id);
    } catch (retryError) {
      setCompareError(retryError instanceof Error ? retryError.message : String(retryError));
    }
  }, []);

  const cancelCompareTransfer = useCallback(async (item: TransferQueueItem) => {
    try {
      setCompareError('');
      await window.transferQueueAPI.cancel(item.id);
    } catch (cancelError) {
      setCompareError(cancelError instanceof Error ? cancelError.message : String(cancelError));
    }
  }, []);

  const openCompareSyncPlanner = useCallback(() => {
    if (!comparePair) return;
    addExplorerContextItem(comparePair.local);
    addExplorerContextItem(comparePair.remote);
    const handoff = buildExplorerRemoteSyncHandoff([comparePair.local, comparePair.remote]);
    if (!handoff) {
      setTransferMessage(t('fileExplorer.syncPlannerNeedsPair'));
      return;
    }
    setExplorerRemoteSyncHandoff(handoff);
    void window.extensionAPI?.runCommand('xenesis-desk.core-tools.openRemoteSyncPlanner');
    setTransferMessage(t('explorerCompare.sentToSyncPlanner'));
  }, [comparePair, t]);

  const openCompareLocalFile = useCallback(() => {
    if (!comparePair) return;
    dispatchOpenLocalFile(comparePair.local.path);
    setTransferMessage(t('explorerCompare.openedLocalFile', { name: comparePair.local.name }));
  }, [comparePair, t]);

  const openCompareRemoteFile = useCallback(async () => {
    if (!comparePair) return;
    try {
      setCompareError('');
      const profile = await resolveExplorerCompareRemoteProfile(comparePair);
      dispatchOpenRemoteFile(profile, comparePair.remote.path);
      setTransferMessage(t('explorerCompare.openedRemoteFile', { name: comparePair.remote.name }));
    } catch (openError) {
      setCompareError(formatExplorerCompareError(openError, t));
    }
  }, [comparePair, t]);

  const revealCompareLocalFile = useCallback(() => {
    if (!comparePair) return;
    dispatchLocalExplorerNavigate({
      path: dirnameLocal(comparePair.local.path),
      selectPath: comparePair.local.path,
    });
    setTransferMessage(t('explorerCompare.revealedLocalFile', { name: comparePair.local.name }));
  }, [comparePair, t]);

  const revealCompareRemoteFile = useCallback(() => {
    if (!comparePair?.remote.profile?.id) return;
    setRemoteExplorerNavigateHandoff({
      profileId: comparePair.remote.profile.id,
      path: parentRemotePath(comparePair.remote.path),
      selectPath: comparePair.remote.path,
    });
    setTransferMessage(t('explorerCompare.revealedRemoteFile', { name: comparePair.remote.name }));
  }, [comparePair, t]);

  const revealHistoryLocalFile = useCallback(
    (item: ExplorerCompareHistoryItem) => {
      setCompareVisible(true);
      setComparePair(item.pair);
      setCompareResult(null);
      setCompareTransferId('');
      dispatchLocalExplorerNavigate({
        path: dirnameLocal(item.pair.local.path),
        selectPath: item.pair.local.path,
      });
      setTransferMessage(t('explorerCompare.revealedLocalFile', { name: item.pair.local.name }));
    },
    [t],
  );

  const revealHistoryRemoteFile = useCallback(
    (item: ExplorerCompareHistoryItem) => {
      if (!item.pair.remote.profile?.id) return;
      setCompareVisible(true);
      setComparePair(item.pair);
      setCompareResult(null);
      setCompareTransferId('');
      setRemoteExplorerNavigateHandoff({
        profileId: item.pair.remote.profile.id,
        path: parentRemotePath(item.pair.remote.path),
        selectPath: item.pair.remote.path,
      });
      setTransferMessage(t('explorerCompare.revealedRemoteFile', { name: item.pair.remote.name }));
    },
    [t],
  );

  const openSyncPlannerForNode = useCallback(
    (node: ExplorerNode) => {
      const item = makeContextItemForNode(node);
      const contextItems = addExplorerContextItem(item);
      const handoff = buildExplorerRemoteSyncHandoff(contextItems.length ? contextItems : getExplorerContextItems());
      if (!handoff) {
        setTransferMessage(t('fileExplorer.syncPlannerNeedsPair'));
        return;
      }
      setExplorerRemoteSyncHandoff(handoff);
      void window.extensionAPI?.runCommand('xenesis-desk.core-tools.openRemoteSyncPlanner');
      setTransferMessage(t('fileExplorer.openedSyncPlanner', { name: node.name }));
    },
    [makeContextItemForNode, t],
  );

  const openNodeInSafeFileEditCenter = useCallback(
    (node: ExplorerNode) => {
      if (node.isDirectory) return;
      const handoff = buildSafeFileEditHandoff(node.path, node.name, 'file-explorer');
      try {
        window.localStorage.setItem(SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY, serializeSafeFileEditHandoff(handoff));
      } catch {
        // localStorage can be unavailable in restricted webviews.
      }
      window.dispatchEvent(new CustomEvent('xenesis-safe-file-edit-handoff', { detail: handoff }));
      void window.extensionAPI?.runCommand('xenesis-desk.core-tools.openSafeFileEditCenter');
      setTransferMessage(t('fileExplorer.openedSafeFileEditCenter', { name: node.name }));
    },
    [t],
  );

  const rootName = basename(currentRoot) || currentRoot;
  const breadcrumb = useMemo(() => localBreadcrumbSegments(currentRoot), [currentRoot]);
  const visibleNodes = useMemo(() => filterExplorerNodes(nodes, filterQuery), [filterQuery, nodes]);
  const selectedNode = useMemo(() => findExplorerNode(nodes, selected), [nodes, selected]);
  const visibleCount = useMemo(() => countVisibleNodes(visibleNodes), [visibleNodes]);
  const compareTransferItem = useMemo(
    () => (compareTransferId ? (transferQueueItems.find((item) => item.id === compareTransferId) ?? null) : null),
    [compareTransferId, transferQueueItems],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LocalExplorerActionRequest>).detail;
      if (!detail?.action) return;

      const targetPath = detail.selectPath || detail.path || '';
      const targetNode = targetPath ? findExplorerNode(nodes, targetPath) : selectedNode;
      const activeNode = targetNode || selectedNode;

      if (detail.action === 'refresh') {
        handleRefresh();
        return;
      }

      if (detail.action === 'goUp') {
        handleGoUp();
        return;
      }

      if (detail.action === 'setFilter') {
        setFilterQuery(String(detail.query || ''));
        return;
      }

      if (detail.action === 'clearFilter') {
        setFilterQuery('');
        return;
      }

      if (detail.action === 'selectPath') {
        if (targetPath) {
          setSelected(targetPath);
          if (targetNode) onSelectPath?.(targetNode.path, targetNode.isDirectory);
        }
        return;
      }

      if (detail.action === 'toggleDetails') {
        setShowSelectionDetails((value) => !value);
        return;
      }

      if (detail.action === 'togglePreview') {
        const next = !showPreviewPane;
        setShowPreviewPane(next);
        if (next && activeNode && !activeNode.isDirectory && !previewVisible) {
          void previewNode(activeNode);
        }
        return;
      }

      if (!activeNode) {
        setTransferMessage(t('fileExplorer.noActionSelection'));
        return;
      }

      if (targetPath && targetNode) {
        setSelected(targetNode.path);
        onSelectPath?.(targetNode.path, targetNode.isDirectory);
      }

      if (detail.action === 'openSelected') {
        handleOpen(activeNode);
        return;
      }

      if (detail.action === 'previewSelected') {
        if (!activeNode.isDirectory) {
          setShowPreviewPane(true);
          void previewNode(activeNode);
        }
        return;
      }

      if (detail.action === 'sendSelectedToBot') {
        sendNodeToBot(activeNode);
        return;
      }

      if (detail.action === 'addSelectedToContext') {
        addNodeToContextBundle(activeNode);
        return;
      }

      if (detail.action === 'copySelectedPath') {
        void navigator.clipboard.writeText(activeNode.path);
        setTransferMessage(t('fileExplorer.copyPath'));
        return;
      }

      if (detail.action === 'addSelectedToFavorites') {
        onAddToFavorites?.(activeNode.path, activeNode.isDirectory);
        setTransferMessage(t('fileExplorer.addToFavorites'));
        return;
      }

      if (detail.action === 'openSelectedInTerminal') {
        const availableShells = (shells ?? []).filter((shell) => shell.available);
        const requestedShell =
          detail.shell && availableShells.some((shell) => shell.kind === detail.shell)
            ? detail.shell
            : availableShells[0]?.kind;
        if (requestedShell) onOpenInTerminal?.(activeNode.path, activeNode.isDirectory, requestedShell);
        return;
      }

      if (detail.action === 'openSelectedSafeEdit') {
        openNodeInSafeFileEditCenter(activeNode);
        return;
      }

      if (detail.action === 'openSelectedSyncPlanner') {
        openSyncPlannerForNode(activeNode);
      }
    };
    window.addEventListener(LOCAL_EXPLORER_ACTION_EVENT, handler);
    return () => window.removeEventListener(LOCAL_EXPLORER_ACTION_EVENT, handler);
  }, [
    addNodeToContextBundle,
    handleGoUp,
    handleOpen,
    handleRefresh,
    nodes,
    onAddToFavorites,
    onOpenInTerminal,
    onSelectPath,
    openNodeInSafeFileEditCenter,
    openSyncPlannerForNode,
    previewNode,
    previewVisible,
    selectedNode,
    sendNodeToBot,
    shells,
    showPreviewPane,
    t,
  ]);

  function buildFileExplorerActionMenuItems(): ContextMenuItem[] {
    return [
      {
        kind: 'action',
        label: t('fileExplorer.openSelected'),
        icon: '↗',
        disabled: !selectedNode,
        action: () => selectedNode && handleOpen(selectedNode),
      },
      {
        kind: 'action',
        label: t('fileExplorer.previewSelected'),
        icon: '◫',
        disabled: !selectedNode || selectedNode.isDirectory || previewLoading,
        action: () => {
          if (!selectedNode) return;
          setShowPreviewPane(true);
          void previewNode(selectedNode);
        },
      },
      {
        kind: 'action',
        label: t('fileExplorer.openAsVault'),
        icon: '▤',
        disabled: !selectedNode || !selectedNode.isDirectory || !onOpenVault,
        action: () => selectedNode && onOpenVault?.(selectedNode.path),
      },
      {
        kind: 'action',
        label: t('explorerCompare.button'),
        icon: '⇄',
        disabled: !selectedNode || selectedNode.isDirectory || compareLoading,
        action: () => selectedNode && void compareNode(selectedNode),
      },
      {
        kind: 'action',
        label: 'Agent',
        icon: 'AI',
        disabled: !selectedNode,
        action: () => selectedNode && sendNodeToBot(selectedNode),
      },
      {
        kind: 'action',
        label: 'Context',
        icon: '+',
        disabled: !selectedNode,
        action: () => selectedNode && addNodeToContextBundle(selectedNode),
      },
      {
        kind: 'action',
        label: 'Safe Edit',
        icon: '✎',
        disabled: !selectedNode || selectedNode.isDirectory,
        action: () => selectedNode && openNodeInSafeFileEditCenter(selectedNode),
      },
      {
        kind: 'action',
        label: t('fileExplorer.openSyncPlanner'),
        icon: '⇅',
        disabled: !selectedNode,
        action: () => selectedNode && openSyncPlannerForNode(selectedNode),
      },
      { kind: 'divider' },
      {
        kind: 'action',
        label: t('fileExplorer.details'),
        icon: showSelectionDetails ? '✓' : '□',
        action: () => setShowSelectionDetails((value) => !value),
      },
      {
        kind: 'action',
        label: t('fileExplorer.previewPanel'),
        icon: showPreviewPane ? '✓' : '□',
        action: () => {
          const next = !showPreviewPane;
          setShowPreviewPane(next);
          if (next && selectedNode && !selectedNode.isDirectory && !previewVisible) {
            void previewNode(selectedNode);
          }
        },
      },
    ];
  }

  useEffect(() => {
    if (!selectedNode || selectedNode.isDirectory) return;
    setExplorerCompareSelection(makeContextItemForNode(selectedNode));
  }, [makeContextItemForNode, selectedNode]);

  return (
    <div className="fe-root">
      {/* 툴바 */}
      <div className="fe-toolbar">
        <button className="fe-btn" onClick={handleGoUp} title={t('fileExplorer.upFolder')}>
          ↑
        </button>
        <span className="fe-path" title={currentRoot}>
          {rootName || t('fileExplorer.noFolderSelected')}
        </span>
        <button
          className={`fe-btn pane-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
          onClick={refresh}
          disabled={isRefreshing}
          title={t('fileExplorer.refreshTitle')}
        >
          ↺
        </button>
        <button className="fe-btn" onClick={handleSelectDir} title={t('fileExplorer.selectFolderTitle')}>
          📁
        </button>
      </div>

      <div
        className={`fe-breadcrumb${pathEditActive ? ' is-editing' : ''}`}
        aria-label={t('fileExplorer.breadcrumb')}
        title={pathEditActive ? undefined : t('fileExplorer.breadcrumbEditHint')}
        onClick={handleBreadcrumbBackgroundClick}
      >
        {pathEditActive ? (
          <input
            ref={pathInputRef}
            className="fe-breadcrumb-input"
            value={pathEditValue}
            aria-label={t('fileExplorer.pathAddress')}
            onChange={(event) => setPathEditValue(event.target.value)}
            onKeyDown={handleBreadcrumbPathKeyDown}
            onBlur={() => {
              setPathEditValue(currentRoot || '');
              setPathEditActive(false);
            }}
          />
        ) : breadcrumb.length === 0 ? (
          <span className="fe-crumb-empty">{t('fileExplorer.noFolderSelected')}</span>
        ) : (
          breadcrumb.map((segment, index) => (
            <React.Fragment key={`${segment.path}-${index}`}>
              {index > 0 && <span className="fe-crumb-sep">/</span>}
              <button type="button" className="fe-crumb" title={segment.path} onClick={() => changeRoot(segment.path)}>
                {segment.label}
              </button>
            </React.Fragment>
          ))
        )}
      </div>

      <div className="fe-filter-row">
        <input
          className="fe-filter-input"
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder={t('fileExplorer.filterPlaceholder')}
          aria-label={t('fileExplorer.filterPlaceholder')}
        />
        {filterQuery && (
          <button
            className="fe-filter-clear"
            type="button"
            onClick={() => setFilterQuery('')}
            title={t('fileExplorer.clearFilter')}
          >
            x
          </button>
        )}
      </div>

      <div className="fe-action-bar" aria-label={t('fileExplorer.actionBarLabel')}>
        <span className="fe-action-summary" title={selectedNode?.path || ''}>
          {selectedNode?.name || t('fileExplorer.noActionSelection')}
        </span>
        <button
          type="button"
          className="fe-action-menu-btn"
          aria-haspopup="menu"
          onClick={(event) => openCtx(event, buildFileExplorerActionMenuItems())}
        >
          {t('fileExplorer.actionMenu')} ▾
        </button>
      </div>

      {actionMenu && (
        <ContextMenu x={actionMenu.x} y={actionMenu.y} items={actionMenu.items} onClose={closeActionMenu} />
      )}

      {/* 트리 */}
      <div
        className="fe-tree"
        role="tree"
        aria-label={t('fileExplorer.ariaLabel')}
        onDragOver={handleTreeDragOver}
        onDrop={handleTreeDrop}
      >
        {loading && <div className="fe-status">{t('common.loading')}</div>}
        {error && <div className="fe-status fe-status--error">⚠ {error}</div>}
        {!error && transferMessage && <div className="fe-status">{transferMessage}</div>}
        {!loading && !error && nodes.length === 0 && currentRoot && (
          <div className="fe-status">{t('fileExplorer.folderEmpty')}</div>
        )}
        {!loading && !error && nodes.length > 0 && visibleNodes.length === 0 && (
          <div className="fe-status">{t('fileExplorer.noMatches')}</div>
        )}
        {!loading && !error && !currentRoot && <div className="fe-status">{t('fileExplorer.selectFolderHint')}</div>}
        {visibleNodes.map((node) => (
          <NodeRow
            key={node.path}
            node={node}
            depth={0}
            selected={selected}
            onSelect={handleSelect}
            onToggle={handleToggle}
            onOpen={handleOpen}
            onAddToFavorites={onAddToFavorites}
            onOpenInTerminal={onOpenInTerminal}
            onOpenVault={onOpenVault}
            onRemoteFileDrop={handleRemoteFileDrop}
            onSendToBot={sendNodeToBot}
            onAddToContextBundle={addNodeToContextBundle}
            onOpenSafeFileEditCenter={openNodeInSafeFileEditCenter}
            shells={shells}
          />
        ))}
      </div>

      {showSelectionDetails && (
        <div className="fe-details" aria-label={t('fileExplorer.details')}>
          <div className="fe-details-head">
            <span>{t('fileExplorer.details')}</span>
            <span>{visibleCount}</span>
          </div>
          {selectedNode ? (
            <dl className="fe-details-grid">
              <dt>{t('fileExplorer.kind')}</dt>
              <dd>{selectedNode.isDirectory ? t('fileExplorer.folder') : t('fileExplorer.file')}</dd>
              <dt>{t('fileExplorer.extension')}</dt>
              <dd>{selectedNode.isDirectory ? '-' : selectedNode.ext || '-'}</dd>
              <dt>{t('fileExplorer.path')}</dt>
              <dd title={selectedNode.path}>{selectedNode.path}</dd>
            </dl>
          ) : (
            <div className="fe-details-empty">{t('fileExplorer.nothingSelected')}</div>
          )}
        </div>
      )}

      {showPreviewPane && previewVisible && (
        <ExplorerPreview
          result={previewResult}
          loading={previewLoading}
          error={previewError}
          onClose={() => {
            setShowPreviewPane(false);
            setPreviewVisible(false);
            setPreviewResult(null);
            setPreviewError('');
          }}
        />
      )}

      {compareVisible && (
        <ExplorerComparePanel
          result={compareResult}
          loading={compareLoading}
          error={compareError}
          onSendToBot={sendCompareToBot}
          onQueueUpload={() => void queueCompareTransfer('upload')}
          onQueueDownload={() => void queueCompareTransfer('download')}
          onOpenSyncPlanner={openCompareSyncPlanner}
          onOpenLocalFile={openCompareLocalFile}
          onOpenRemoteFile={() => void openCompareRemoteFile()}
          onRevealLocalFile={revealCompareLocalFile}
          onRevealRemoteFile={revealCompareRemoteFile}
          transferItem={compareTransferItem}
          transferPolicy={compareTransferPolicy}
          onTransferPolicyChange={setCompareTransferPolicy}
          onRetryTransfer={retryCompareTransfer}
          onCancelTransfer={cancelCompareTransfer}
          compareHistory={compareHistory}
          onRunHistory={(item) => void runCompareHistoryItem(item)}
          onClearHistory={clearCompareHistory}
          onQueueHistoryUpload={(item) => void queueHistoryCompareTransfer(item, 'upload')}
          onQueueHistoryDownload={(item) => void queueHistoryCompareTransfer(item, 'download')}
          onRevealHistoryLocal={revealHistoryLocalFile}
          onRevealHistoryRemote={revealHistoryRemoteFile}
          onToggleHistoryPin={toggleCompareHistoryPin}
          onRenameHistory={renameCompareHistoryItem}
          onClose={() => {
            setCompareVisible(false);
            setCompareResult(null);
            setComparePair(null);
            setCompareTransferId('');
            setCompareError('');
          }}
        />
      )}

      {downloadConflict && (
        <div className="rfe-conflict-overlay" role="presentation">
          <div
            className="rfe-conflict-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fe-download-conflict-title"
          >
            <div className="rfe-conflict-title" id="fe-download-conflict-title">
              {t('transferQueue.conflictTitle')}
            </div>
            <div className="rfe-conflict-body">
              <p>{t('transferQueue.conflictMessage', { name: downloadConflict.fileName })}</p>
              <div className="rfe-conflict-path" title={downloadConflict.localPath}>
                {downloadConflict.localPath}
              </div>
              <label className="rfe-conflict-label">
                <span>{t('transferQueue.newName')}</span>
                <input
                  className="rfe-conflict-input"
                  value={downloadConflict.newName}
                  onChange={(e) =>
                    setDownloadConflict({ ...downloadConflict, newName: e.target.value, error: undefined })
                  }
                />
              </label>
              {downloadConflict.error && <div className="rfe-conflict-error">{downloadConflict.error}</div>}
            </div>
            <div className="rfe-conflict-actions">
              <button type="button" className="rfe-btn" onClick={handleDownloadConflictOverwrite}>
                {t('transferQueue.overwrite')}
              </button>
              <button type="button" className="rfe-btn" onClick={handleDownloadConflictSaveAs}>
                {t('transferQueue.saveAs')}
              </button>
              <button type="button" className="rfe-btn" onClick={handleDownloadConflictCancel}>
                {t('transferQueue.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
