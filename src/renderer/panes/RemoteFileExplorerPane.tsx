import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  OpenFileResult,
  RemoteFileEntry,
  RemoteFileProfile,
  TerminalProfileGroup,
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
  makeRemoteExplorerContextItem,
  setExplorerCompareSelection,
  setExplorerRemoteSyncHandoff,
} from '../utils/explorerContextStore';
import {
  clearRemoteExplorerNavigateHandoff,
  dispatchLocalExplorerNavigate,
  dispatchOpenLocalFile,
  dispatchOpenRemoteFile,
  getRemoteExplorerNavigateHandoff,
  REMOTE_EXPLORER_ACTION_EVENT,
  REMOTE_EXPLORER_NAVIGATE_EVENT,
  type RemoteExplorerActionRequest,
  type RemoteExplorerNavigateRequest,
  setRemoteExplorerNavigateHandoff,
} from '../utils/explorerNavigationEvents';
import { sendXenesisContextMessage } from '../utils/xenesisContextSend';

export interface RemoteFileExplorerPaneProps {
  profiles: RemoteFileProfile[];
  groups: TerminalProfileGroup[];
  onOpenRemoteFile: (result: OpenFileResult | null, profile: RemoteFileProfile) => void;
  onOpenSettings?: () => void;
}

function normalizeRemotePath(input: string): string {
  const normalized = String(input || '/')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
  if (!normalized || normalized === '.') return '/';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function joinRemotePath(basePath: string, name: string): string {
  const base = normalizeRemotePath(basePath).replace(/\/+$/, '');
  const cleanName = String(name || '').replace(/^\/+/, '');
  return base ? `${base}/${cleanName}` : `/${cleanName}`;
}

function parentRemotePath(remotePath: string): string {
  const clean = normalizeRemotePath(remotePath).replace(/\/+$/, '');
  if (!clean || clean === '/') return '/';
  const index = clean.lastIndexOf('/');
  return index <= 0 ? '/' : clean.slice(0, index);
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

function fileIcon(entry: RemoteFileEntry): string {
  if (entry.isDirectory) return '▸';
  switch (entry.ext) {
    case 'pdf':
      return 'PDF';
    case 'doc':
    case 'docx':
      return 'DOC';
    case 'xls':
    case 'xlsx':
    case 'xlsm':
      return 'XLS';
    case 'ppt':
    case 'pptx':
      return 'PPT';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return 'IMG';
    default:
      return entry.ext ? entry.ext.toUpperCase().slice(0, 3) : 'FILE';
  }
}

interface UploadDraft {
  profile: RemoteFileProfile;
  localPath: string;
  fileName: string;
  targetRemotePath: string;
}

interface UploadConflictState extends UploadDraft {
  existingNames: string[];
  newName: string;
  error?: string;
}

function remoteNameExists(entries: RemoteFileEntry[], name: string): boolean {
  return entries.some((entry) => entry.name === name);
}

function suggestRemoteCopyName(fileName: string, existingNames: string[]): string {
  const dotIndex = fileName.lastIndexOf('.');
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '';
  const existing = new Set(existingNames);
  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${base} (${index})${ext}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
}

interface RemoteBreadcrumbSegment {
  label: string;
  path: string;
}

function remoteBreadcrumbSegments(remotePath: string): RemoteBreadcrumbSegment[] {
  const normalized = normalizeRemotePath(remotePath);
  const parts = normalized.split('/').filter(Boolean);
  const segments: RemoteBreadcrumbSegment[] = [{ label: '/', path: '/' }];
  let cursor = '';
  for (const part of parts) {
    cursor = `${cursor}/${part}`;
    segments.push({ label: part, path: cursor });
  }
  return segments;
}

function matchesRemoteQuery(entry: RemoteFileEntry, query: string): boolean {
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

function formatRemoteBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function RemoteFileExplorerPane({
  profiles,
  groups,
  onOpenRemoteFile,
  onOpenSettings,
}: RemoteFileExplorerPaneProps) {
  const { t } = useI18n();
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [pathEditActive, setPathEditActive] = useState(false);
  const [pathEditValue, setPathEditValue] = useState(currentPath);
  const [entries, setEntries] = useState<RemoteFileEntry[]>([]);
  const [selectedEntryPath, setSelectedEntryPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'info' | 'error'>('info');
  const [transferQueueItems, setTransferQueueItems] = useState<TransferQueueItem[]>([]);
  const [overwritePolicy, setOverwritePolicy] = useState<TransferOverwritePolicy>('ask');
  const [uploadConflict, setUploadConflict] = useState<UploadConflictState | null>(null);
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
  const completedTransferIdsRef = useRef<Set<string>>(new Set());
  const previewRequestIdRef = useRef(0);
  const compareRequestIdRef = useRef(0);
  const skipProfileAutoLoadRef = useRef('');
  const pathInputRef = useRef<HTMLInputElement>(null);
  const { menu, open: openContextMenu, close: closeContextMenu } = useContextMenu();

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  useEffect(() => {
    if (profiles.length === 0) {
      if (selectedProfileId) setSelectedProfileId('');
      setEntries([]);
      setCurrentPath('/');
      return;
    }
    if (!profiles.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (!selectedProfile) return;
    setCurrentPath(normalizeRemotePath(selectedProfile.rootPath || '/'));
    setSelectedEntryPath('');
  }, [selectedProfile?.id]);

  const selectedEntry = entries.find((entry) => entry.path === selectedEntryPath) ?? null;
  const breadcrumb = useMemo(() => remoteBreadcrumbSegments(currentPath), [currentPath]);
  const visibleEntries = useMemo(
    () => entries.filter((entry) => matchesRemoteQuery(entry, filterQuery)),
    [entries, filterQuery],
  );

  useEffect(() => {
    if (!pathEditActive) setPathEditValue(currentPath);
  }, [currentPath, pathEditActive]);

  useEffect(() => {
    previewRequestIdRef.current += 1;
    setPreviewResult(null);
    setPreviewError('');
    setPreviewLoading(false);
  }, [selectedEntryPath, selectedProfile?.id]);

  useEffect(() => {
    if (!selectedEntry || selectedEntry.isDirectory || !selectedProfile) return;
    setExplorerCompareSelection(
      makeRemoteExplorerContextItem({
        path: selectedEntry.path,
        name: selectedEntry.name,
        isDirectory: false,
        ext: selectedEntry.ext,
        profile: selectedProfile,
      }),
    );
  }, [selectedEntry, selectedProfile]);

  const visibleTransferQueueItems = useMemo(() => {
    if (!selectedProfile) return transferQueueItems;
    return transferQueueItems.filter((item) => item.profileId === selectedProfile.id).slice(0, 8);
  }, [selectedProfile, transferQueueItems]);
  const compareTransferItem = useMemo(
    () => (compareTransferId ? (transferQueueItems.find((item) => item.id === compareTransferId) ?? null) : null),
    [compareTransferId, transferQueueItems],
  );

  useEffect(() => {
    let alive = true;
    window.transferQueueAPI
      .list()
      .then((items) => {
        if (alive) setTransferQueueItems(items);
      })
      .catch(() => {});
    const unsubscribe = window.transferQueueAPI.onChanged((items) => setTransferQueueItems(items));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ExplorerCompareHistoryItem[]>).detail;
      setCompareHistory(Array.isArray(detail) ? detail : getExplorerCompareHistory());
    };
    setCompareHistory(getExplorerCompareHistory());
    window.addEventListener(EXPLORER_COMPARE_HISTORY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(EXPLORER_COMPARE_HISTORY_CHANGED_EVENT, handler);
  }, []);

  const profileLabel = useCallback(
    (profile: RemoteFileProfile): string => {
      const group = groups.find((item) => item.id === profile.groupId);
      const base = profile.name || profile.host || profile.protocol.toUpperCase();
      return group?.name ? `${group.name} / ${base}` : base;
    },
    [groups],
  );

  const loadPath = useCallback(async (profile: RemoteFileProfile, remotePath: string, selectPath = '') => {
    setLoading(true);
    setMessage('');
    setMessageKind('info');
    try {
      const list = await window.remoteFileAPI.list(profile, remotePath);
      setEntries(list);
      setCurrentPath(normalizeRemotePath(remotePath));
      setSelectedEntryPath(selectPath ? normalizeRemotePath(selectPath) : '');
    } catch (error) {
      setEntries([]);
      setMessageKind('error');
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  function startBreadcrumbPathEdit() {
    setPathEditValue(currentPath || '/');
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
      setPathEditValue(currentPath || '/');
      setPathEditActive(false);
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const nextPath = normalizeRemotePath(pathEditValue);
    setPathEditActive(false);
    setPathEditValue(nextPath);
    if (selectedProfile && nextPath !== normalizeRemotePath(currentPath)) {
      void loadPath(selectedProfile, nextPath);
    }
  }

  useEffect(() => {
    if (!selectedProfile) return;
    let shouldRefresh = false;
    const currentRemotePath = normalizeRemotePath(currentPath);
    for (const item of transferQueueItems) {
      if (item.state !== 'completed') continue;
      if (completedTransferIdsRef.current.has(item.id)) continue;
      completedTransferIdsRef.current.add(item.id);
      if (
        item.direction === 'upload' &&
        item.profileId === selectedProfile.id &&
        normalizeRemotePath(parentRemotePath(item.remotePath)) === currentRemotePath
      ) {
        shouldRefresh = true;
      }
    }
    if (shouldRefresh) void loadPath(selectedProfile, currentPath);
  }, [currentPath, loadPath, selectedProfile, transferQueueItems]);

  useEffect(() => {
    if (!selectedProfile) {
      setEntries([]);
      return;
    }
    if (skipProfileAutoLoadRef.current === selectedProfile.id) {
      skipProfileAutoLoadRef.current = '';
      return;
    }
    void loadPath(selectedProfile, normalizeRemotePath(selectedProfile.rootPath || '/'));
  }, [loadPath, selectedProfile?.id]);

  const navigateRemoteExplorer = useCallback(
    (request: RemoteExplorerNavigateRequest | null) => {
      if (!request?.profileId) return;
      if (profiles.length === 0) return;
      const profile = profiles.find((item) => item.id === request.profileId);
      if (!profile) {
        setMessageKind('error');
        setMessage(t('explorerCompare.missingProfile', { name: request.profileId }));
        clearRemoteExplorerNavigateHandoff();
        return;
      }
      if (selectedProfileId !== profile.id) {
        skipProfileAutoLoadRef.current = profile.id;
        setSelectedProfileId(profile.id);
      }
      void loadPath(profile, normalizeRemotePath(request.path || '/'), request.selectPath || '');
      clearRemoteExplorerNavigateHandoff();
    },
    [loadPath, profiles, selectedProfileId, t],
  );

  useEffect(() => {
    const handoff = getRemoteExplorerNavigateHandoff();
    if (handoff) navigateRemoteExplorer(handoff);
  }, [navigateRemoteExplorer]);

  useEffect(() => {
    const handler = (event: Event) => {
      navigateRemoteExplorer((event as CustomEvent<RemoteExplorerNavigateRequest>).detail);
    };
    window.addEventListener(REMOTE_EXPLORER_NAVIGATE_EVENT, handler);
    return () => window.removeEventListener(REMOTE_EXPLORER_NAVIGATE_EVENT, handler);
  }, [navigateRemoteExplorer]);

  const handleOpen = useCallback(
    async (entry: RemoteFileEntry) => {
      if (!selectedProfile) return;
      if (entry.isDirectory) {
        await loadPath(selectedProfile, entry.path);
        return;
      }

      setLoading(true);
      setMessage('');
      try {
        const result = await window.remoteFileAPI.readFile(selectedProfile, entry.path);
        onOpenRemoteFile(result, selectedProfile);
        if (!result) {
          setMessageKind('error');
          setMessage(t('remoteFileExplorer.readError'));
        }
      } catch (error) {
        setMessageKind('error');
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    },
    [loadPath, onOpenRemoteFile, selectedProfile, t],
  );

  const handleRefresh = useCallback(() => {
    if (!selectedProfile) return;
    void loadPath(selectedProfile, currentPath);
  }, [currentPath, loadPath, selectedProfile]);

  const handleUp = useCallback(() => {
    if (!selectedProfile) return;
    void loadPath(selectedProfile, parentRemotePath(currentPath));
  }, [currentPath, loadPath, selectedProfile]);

  const handleMkdir = useCallback(async () => {
    if (!selectedProfile) return;
    const name = window.prompt(t('remoteFileExplorer.newFolderPrompt'));
    if (!name?.trim()) return;
    setLoading(true);
    const result = await window.remoteFileAPI.mkdir(selectedProfile, joinRemotePath(currentPath, name.trim()));
    setLoading(false);
    if (!result.ok) {
      setMessageKind('error');
      setMessage(result.message || t('remoteFileExplorer.operationFailed'));
      return;
    }
    handleRefresh();
  }, [currentPath, handleRefresh, selectedProfile, t]);

  const handleRename = useCallback(async () => {
    if (!selectedProfile || !selectedEntry) return;
    const name = window.prompt(t('remoteFileExplorer.renamePrompt'), selectedEntry.name);
    if (!name?.trim() || name.trim() === selectedEntry.name) return;
    setLoading(true);
    const result = await window.remoteFileAPI.rename(
      selectedProfile,
      selectedEntry.path,
      joinRemotePath(currentPath, name.trim()),
    );
    setLoading(false);
    if (!result.ok) {
      setMessageKind('error');
      setMessage(result.message || t('remoteFileExplorer.operationFailed'));
      return;
    }
    handleRefresh();
  }, [currentPath, handleRefresh, selectedEntry, selectedProfile, t]);

  const handleDelete = useCallback(async () => {
    if (!selectedProfile || !selectedEntry) return;
    if (!window.confirm(t('remoteFileExplorer.deleteConfirm', { name: selectedEntry.name }))) return;
    setLoading(true);
    const result = await window.remoteFileAPI.delete(selectedProfile, selectedEntry.path, selectedEntry.isDirectory);
    setLoading(false);
    if (!result.ok) {
      setMessageKind('error');
      setMessage(result.message || t('remoteFileExplorer.operationFailed'));
      return;
    }
    handleRefresh();
  }, [handleRefresh, selectedEntry, selectedProfile, t]);

  const enqueueUpload = useCallback(
    async (draft: UploadDraft, policy: Exclude<TransferOverwritePolicy, 'ask'> = 'overwrite') => {
      const item = await window.transferQueueAPI.enqueue({
        direction: 'upload',
        profile: draft.profile,
        localPath: draft.localPath,
        remotePath: joinRemotePath(draft.targetRemotePath, draft.fileName),
        fileName: draft.fileName,
        overwritePolicy: policy,
      });
      setMessageKind('info');
      setMessage(t('transferQueue.queued', { name: item.fileName }));
      setUploadConflict(null);
    },
    [t],
  );

  const resolveUploadConflict = useCallback(
    async (draft: UploadDraft, policy: TransferOverwritePolicy = overwritePolicy) => {
      if (policy !== 'ask') {
        await enqueueUpload(draft, policy);
        return;
      }

      setLoading(true);
      setMessage('');
      setMessageKind('info');
      try {
        const targetPath = normalizeRemotePath(draft.targetRemotePath);
        const targetEntries = await window.remoteFileAPI.list(draft.profile, targetPath);
        if (targetPath === normalizeRemotePath(currentPath)) setEntries(targetEntries);

        if (!remoteNameExists(targetEntries, draft.fileName)) {
          await enqueueUpload(draft, 'overwrite');
          return;
        }

        const existingNames = targetEntries.map((entry) => entry.name);
        setUploadConflict({
          ...draft,
          targetRemotePath: targetPath,
          existingNames,
          newName: suggestRemoteCopyName(draft.fileName, existingNames),
        });
      } catch (error) {
        setMessageKind('error');
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    },
    [currentPath, enqueueUpload, overwritePolicy],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedProfile) return;
    const local = await window.fileAPI.openFile();
    if (!local) return;
    await resolveUploadConflict({
      profile: selectedProfile,
      localPath: local.filePath,
      fileName: local.fileName,
      targetRemotePath: currentPath,
    });
  }, [currentPath, resolveUploadConflict, selectedProfile]);

  const handleLocalPathDrop = useCallback(
    async (localPath: string, targetRemotePath: string) => {
      if (!selectedProfile || !localPath) return;
      try {
        const fileName = localPath.replace(/\\/g, '/').split('/').pop() || 'upload';
        await resolveUploadConflict({
          profile: selectedProfile,
          localPath,
          fileName,
          targetRemotePath,
        });
      } catch (error) {
        setMessageKind('error');
        setMessage(error instanceof Error ? error.message : String(error));
      }
    },
    [resolveUploadConflict, selectedProfile],
  );

  const handleConflictOverwrite = useCallback(() => {
    if (!uploadConflict) return;
    void enqueueUpload(uploadConflict, 'overwrite');
  }, [enqueueUpload, uploadConflict]);

  const handleConflictSaveAs = useCallback(() => {
    if (!uploadConflict) return;
    const newName = uploadConflict.newName.trim();
    if (!newName) {
      setUploadConflict({ ...uploadConflict, error: t('transferQueue.newNameRequired') });
      return;
    }
    if (uploadConflict.existingNames.includes(newName)) {
      setUploadConflict({ ...uploadConflict, error: t('transferQueue.nameAlreadyExists', { name: newName }) });
      return;
    }
    void enqueueUpload({ ...uploadConflict, fileName: newName }, 'overwrite');
  }, [enqueueUpload, t, uploadConflict]);

  const handleConflictCancel = useCallback(() => {
    setUploadConflict(null);
    setMessageKind('info');
    setMessage(t('transferQueue.conflictCanceled'));
  }, [t]);

  const handleLocalDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/xamong-path')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleLocalDrop = (e: React.DragEvent, targetRemotePath = currentPath) => {
    if (!e.dataTransfer.types.includes('application/xamong-path')) return;
    e.preventDefault();
    e.stopPropagation();
    const localPath = e.dataTransfer.getData('application/xamong-path') || e.dataTransfer.getData('text/plain');
    void handleLocalPathDrop(localPath, targetRemotePath);
  };

  const handleRemoteDragStart = (e: React.DragEvent, entry: RemoteFileEntry) => {
    if (!selectedProfile) return;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(
      'application/xamong-remote-file',
      JSON.stringify({
        profile: selectedProfile,
        path: entry.path,
        name: entry.name,
        isDirectory: entry.isDirectory,
      }),
    );
    e.dataTransfer.setData('text/plain', entry.path);
  };

  const makeContextItemForEntry = useCallback(
    (entry: RemoteFileEntry) => {
      if (!selectedProfile) return null;
      return makeRemoteExplorerContextItem({
        path: entry.path,
        name: entry.name,
        isDirectory: entry.isDirectory,
        ext: entry.ext,
        profile: selectedProfile,
      });
    },
    [selectedProfile],
  );

  const sendEntryToBot = useCallback(
    (entry: RemoteFileEntry) => {
      const item = makeContextItemForEntry(entry);
      if (!item) return;
      sendXenesisContextMessage(buildExplorerContextBotMessage(item), { source: 'remote-explorer' });
      setMessageKind('info');
      setMessage(t('remoteFileExplorer.sentToBot', { name: entry.name }));
    },
    [makeContextItemForEntry, t],
  );

  const addEntryToContextBundle = useCallback(
    (entry: RemoteFileEntry) => {
      const item = makeContextItemForEntry(entry);
      if (!item) return;
      addExplorerContextItem(item);
      setMessageKind('info');
      setMessage(t('remoteFileExplorer.addedToContextBundle', { name: entry.name }));
    },
    [makeContextItemForEntry, t],
  );

  const previewEntry = useCallback(
    async (entry: RemoteFileEntry) => {
      if (!selectedProfile || entry.isDirectory) return;
      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      setPreviewVisible(true);
      setPreviewLoading(true);
      setPreviewError('');
      setPreviewResult(null);
      try {
        const result = await window.remoteFileAPI.readFile(selectedProfile, entry.path);
        if (previewRequestIdRef.current !== requestId) return;
        if (!result) {
          setPreviewError(t('remoteFileExplorer.previewReadError', { name: entry.name }));
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
    [selectedProfile, t],
  );

  const compareEntry = useCallback(
    async (entry: RemoteFileEntry) => {
      if (entry.isDirectory) return;
      const item = makeContextItemForEntry(entry);
      if (!item) return;
      const requestId = compareRequestIdRef.current + 1;
      compareRequestIdRef.current = requestId;
      setCompareVisible(true);
      setCompareLoading(true);
      setCompareError('');
      setCompareResult(null);
      setComparePair(null);
      setCompareTransferId('');
      try {
        const { pair, result } = await compareExplorerItemWithLatestOpposite(item);
        if (compareRequestIdRef.current !== requestId) return;
        setComparePair(pair);
        setCompareResult(result);
        setMessageKind('info');
        setMessage(t('explorerCompare.done', { summary: result.summary }));
      } catch (compareErrorValue) {
        if (compareRequestIdRef.current !== requestId) return;
        setCompareError(formatExplorerCompareError(compareErrorValue, t));
      } finally {
        if (compareRequestIdRef.current === requestId) setCompareLoading(false);
      }
    },
    [makeContextItemForEntry, t],
  );

  const sendCompareToBot = useCallback(() => {
    if (!compareResult) return;
    sendXenesisContextMessage(buildArtifactCompareBotMessage(compareResult), { source: 'remote-explorer-compare' });
    setMessageKind('info');
    setMessage(t('explorerCompare.sentToBot'));
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
        setMessageKind('info');
        setMessage(t('explorerCompare.historyCompared', { name: item.pair.local.name }));
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
    setMessageKind('info');
    setMessage(t('explorerCompare.historyCleared'));
  }, [t]);

  const toggleCompareHistoryPin = useCallback(
    (item: ExplorerCompareHistoryItem) => {
      const nextPinned = !item.pinned;
      setCompareHistory(updateExplorerCompareHistoryItem(item.id, { pinned: nextPinned }));
      setMessageKind('info');
      setMessage(
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
      setMessageKind('info');
      setMessage(
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
        setMessageKind('info');
        setMessage(
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

  const openCompareSyncPlanner = useCallback(() => {
    if (!comparePair) return;
    addExplorerContextItem(comparePair.local);
    addExplorerContextItem(comparePair.remote);
    const handoff = buildExplorerRemoteSyncHandoff([comparePair.local, comparePair.remote]);
    if (!handoff) {
      setMessageKind('info');
      setMessage(t('remoteFileExplorer.syncPlannerNeedsPair'));
      return;
    }
    setExplorerRemoteSyncHandoff(handoff);
    void window.extensionAPI?.runCommand('xenesis-desk.core-tools.openRemoteSyncPlanner');
    setMessageKind('info');
    setMessage(t('explorerCompare.sentToSyncPlanner'));
  }, [comparePair, t]);

  const openCompareLocalFile = useCallback(() => {
    if (!comparePair) return;
    dispatchOpenLocalFile(comparePair.local.path);
    setMessageKind('info');
    setMessage(t('explorerCompare.openedLocalFile', { name: comparePair.local.name }));
  }, [comparePair, t]);

  const openCompareRemoteFile = useCallback(async () => {
    if (!comparePair) return;
    try {
      setCompareError('');
      const profile = await resolveExplorerCompareRemoteProfile(comparePair);
      dispatchOpenRemoteFile(profile, comparePair.remote.path);
      setMessageKind('info');
      setMessage(t('explorerCompare.openedRemoteFile', { name: comparePair.remote.name }));
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
    setMessageKind('info');
    setMessage(t('explorerCompare.revealedLocalFile', { name: comparePair.local.name }));
  }, [comparePair, t]);

  const revealCompareRemoteFile = useCallback(() => {
    if (!comparePair?.remote.profile?.id) return;
    setRemoteExplorerNavigateHandoff({
      profileId: comparePair.remote.profile.id,
      path: parentRemotePath(comparePair.remote.path),
      selectPath: comparePair.remote.path,
    });
    setMessageKind('info');
    setMessage(t('explorerCompare.revealedRemoteFile', { name: comparePair.remote.name }));
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
      setMessageKind('info');
      setMessage(t('explorerCompare.revealedLocalFile', { name: item.pair.local.name }));
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
      setMessageKind('info');
      setMessage(t('explorerCompare.revealedRemoteFile', { name: item.pair.remote.name }));
    },
    [t],
  );

  const openSyncPlannerForEntry = useCallback(
    (entry: RemoteFileEntry) => {
      const item = makeContextItemForEntry(entry);
      if (!item) return;
      const contextItems = addExplorerContextItem(item);
      const handoff = buildExplorerRemoteSyncHandoff(contextItems.length ? contextItems : getExplorerContextItems());
      if (!handoff) {
        setMessageKind('info');
        setMessage(t('remoteFileExplorer.syncPlannerNeedsPair'));
        return;
      }
      setExplorerRemoteSyncHandoff(handoff);
      void window.extensionAPI?.runCommand('xenesis-desk.core-tools.openRemoteSyncPlanner');
      setMessageKind('info');
      setMessage(t('remoteFileExplorer.openedSyncPlanner', { name: entry.name }));
    },
    [makeContextItemForEntry, t],
  );

  useEffect(() => {
    const resolveProfile = (request: RemoteExplorerActionRequest): RemoteFileProfile | null => {
      if (request.profileId) return profiles.find((profile) => profile.id === request.profileId) ?? null;
      return selectedProfile ?? profiles[0] ?? null;
    };

    const resolveEntry = (request: RemoteExplorerActionRequest): RemoteFileEntry | null => {
      const explicitPath = normalizeRemotePath(request.selectPath || request.path || '');
      if (explicitPath) return entries.find((entry) => normalizeRemotePath(entry.path) === explicitPath) ?? null;
      const requestedPath = normalizeRemotePath(selectedEntryPath || '');
      if (!requestedPath) return selectedEntry;
      return entries.find((entry) => normalizeRemotePath(entry.path) === requestedPath) ?? selectedEntry;
    };

    const selectRequestedPath = (profile: RemoteFileProfile | null, request: RemoteExplorerActionRequest): boolean => {
      const requestedPath = normalizeRemotePath(request.selectPath || request.path || '');
      if (!requestedPath) return false;
      if (profile && request.profileId && request.profileId !== selectedProfileId) {
        skipProfileAutoLoadRef.current = profile.id;
        setSelectedProfileId(profile.id);
      }
      setSelectedEntryPath(requestedPath);
      const parentPath = parentRemotePath(requestedPath);
      if (profile && parentPath && parentPath !== normalizeRemotePath(currentPath)) {
        void loadPath(profile, parentPath, requestedPath);
      }
      return true;
    };

    const handler = (event: Event) => {
      const request = (event as CustomEvent<RemoteExplorerActionRequest>).detail;
      if (!request?.action) return;

      if (request.action === 'setFilter') {
        setFilterQuery(String(request.query || ''));
        setMessageKind('info');
        setMessage(`Remote filter set: ${String(request.query || '')}`);
        return;
      }
      if (request.action === 'clearFilter') {
        setFilterQuery('');
        setMessageKind('info');
        setMessage('Remote filter cleared.');
        return;
      }
      if (request.action === 'toggleDetails') {
        setShowSelectionDetails((value) => !value);
        return;
      }

      const profile = resolveProfile(request);
      if (!profile) {
        setMessageKind('error');
        setMessage('Remote profile is required.');
        return;
      }
      if (request.profileId && request.profileId !== selectedProfileId) {
        skipProfileAutoLoadRef.current = profile.id;
        setSelectedProfileId(profile.id);
      }

      if (request.action === 'refresh') {
        void loadPath(profile, currentPath || normalizeRemotePath(profile.rootPath || '/'));
        return;
      }
      if (request.action === 'goUp') {
        void loadPath(profile, parentRemotePath(currentPath));
        return;
      }
      if (request.action === 'selectPath') {
        if (!selectRequestedPath(profile, request)) {
          setMessageKind('error');
          setMessage('Remote path is required.');
        }
        return;
      }

      const entry = resolveEntry(request);
      if (!entry) {
        if (selectRequestedPath(profile, request)) {
          setMessageKind('info');
          setMessage('Remote path selected. Run the action again after the folder loads.');
          return;
        }
        setMessageKind('error');
        setMessage('No remote item is selected.');
        return;
      }
      setSelectedEntryPath(entry.path);

      if (request.action === 'openSelected') {
        void handleOpen(entry);
        return;
      }
      if (request.action === 'previewSelected') {
        if (entry.isDirectory) {
          setMessageKind('error');
          setMessage('Remote folders cannot be previewed.');
          return;
        }
        setShowPreviewPane(true);
        void previewEntry(entry);
        return;
      }
      if (request.action === 'togglePreview') {
        setShowPreviewPane((value) => {
          const next = !value;
          if (next && !entry.isDirectory) void previewEntry(entry);
          return next;
        });
        return;
      }
      if (request.action === 'sendSelectedToBot') {
        sendEntryToBot(entry);
        return;
      }
      if (request.action === 'addSelectedToContext') {
        addEntryToContextBundle(entry);
        return;
      }
      if (request.action === 'copySelectedPath') {
        void navigator.clipboard.writeText(entry.path).catch(() => undefined);
        setMessageKind('info');
        setMessage(t('remoteFileExplorer.copyPath'));
        return;
      }
      if (request.action === 'openSelectedSyncPlanner') {
        openSyncPlannerForEntry(entry);
      }
    };

    window.addEventListener(REMOTE_EXPLORER_ACTION_EVENT, handler);
    return () => window.removeEventListener(REMOTE_EXPLORER_ACTION_EVENT, handler);
  }, [
    addEntryToContextBundle,
    currentPath,
    entries,
    handleOpen,
    loadPath,
    openSyncPlannerForEntry,
    previewEntry,
    profiles,
    selectedEntry,
    selectedEntryPath,
    selectedProfile,
    selectedProfileId,
    sendEntryToBot,
    t,
  ]);

  function buildRemoteOperationMenuItems(): ContextMenuItem[] {
    return [
      {
        kind: 'action',
        label: t('remoteFileExplorer.upload'),
        icon: '↑',
        disabled: !selectedProfile || loading,
        action: () => void handleUpload(),
      },
      {
        kind: 'action',
        label: t('remoteFileExplorer.newFolder'),
        icon: '+',
        disabled: !selectedProfile || loading,
        action: () => void handleMkdir(),
      },
      {
        kind: 'action',
        label: t('remoteFileExplorer.rename'),
        icon: '✎',
        disabled: !selectedEntry || loading,
        action: () => void handleRename(),
      },
      {
        kind: 'action',
        label: t('remoteFileExplorer.delete'),
        icon: '×',
        disabled: !selectedEntry || loading,
        action: () => void handleDelete(),
      },
    ];
  }

  function buildRemoteSelectionMenuItems(): ContextMenuItem[] {
    return [
      {
        kind: 'action',
        label: t('remoteFileExplorer.openSelected'),
        icon: '↗',
        disabled: !selectedEntry || loading,
        action: () => selectedEntry && void handleOpen(selectedEntry),
      },
      {
        kind: 'action',
        label: t('remoteFileExplorer.previewSelected'),
        icon: '◫',
        disabled: !selectedEntry || selectedEntry.isDirectory || loading || previewLoading,
        action: () => {
          if (!selectedEntry) return;
          setShowPreviewPane(true);
          void previewEntry(selectedEntry);
        },
      },
      {
        kind: 'action',
        label: t('explorerCompare.button'),
        icon: '⇄',
        disabled: !selectedEntry || selectedEntry.isDirectory || loading || compareLoading,
        action: () => selectedEntry && void compareEntry(selectedEntry),
      },
      {
        kind: 'action',
        label: 'Agent',
        icon: 'AI',
        disabled: !selectedEntry || loading,
        action: () => selectedEntry && sendEntryToBot(selectedEntry),
      },
      {
        kind: 'action',
        label: 'Context',
        icon: '+',
        disabled: !selectedEntry || loading,
        action: () => selectedEntry && addEntryToContextBundle(selectedEntry),
      },
      {
        kind: 'action',
        label: t('remoteFileExplorer.openSyncPlanner'),
        icon: '⇅',
        disabled: !selectedEntry || loading,
        action: () => selectedEntry && openSyncPlannerForEntry(selectedEntry),
      },
      { kind: 'divider' },
      {
        kind: 'action',
        label: t('remoteFileExplorer.details'),
        icon: showSelectionDetails ? '✓' : '□',
        action: () => setShowSelectionDetails((value) => !value),
      },
      {
        kind: 'action',
        label: t('remoteFileExplorer.previewPanel'),
        icon: showPreviewPane ? '✓' : '□',
        action: () => {
          const next = !showPreviewPane;
          setShowPreviewPane(next);
          if (next && selectedEntry && !selectedEntry.isDirectory && !previewVisible) {
            void previewEntry(selectedEntry);
          }
        },
      },
    ];
  }

  const handleEntryContextMenu = useCallback(
    (e: React.MouseEvent, entry: RemoteFileEntry) => {
      setSelectedEntryPath(entry.path);
      const items: ContextMenuItem[] = [
        {
          kind: 'action',
          label: t('remoteFileExplorer.open'),
          icon: entry.isDirectory ? '▸' : '↗',
          action: () => void handleOpen(entry),
        },
        {
          kind: 'action',
          label: t('remoteFileExplorer.copyPath'),
          icon: '⎘',
          action: () => navigator.clipboard.writeText(entry.path).catch(() => {}),
        },
        { kind: 'divider' },
        {
          kind: 'action',
          label: t('remoteFileExplorer.sendToBot'),
          icon: 'AI',
          action: () => sendEntryToBot(entry),
        },
        {
          kind: 'action',
          label: t('remoteFileExplorer.addToContextBundle'),
          icon: '+',
          action: () => addEntryToContextBundle(entry),
        },
      ];
      openContextMenu(e, items);
    },
    [addEntryToContextBundle, handleOpen, openContextMenu, sendEntryToBot, t],
  );

  const transferStateLabel = useCallback(
    (item: TransferQueueItem): string => {
      switch (item.state) {
        case 'queued':
          return t('transferQueue.queuedState');
        case 'running':
          return t('transferQueue.running');
        case 'completed':
          return t('transferQueue.completed');
        case 'failed':
          return t('transferQueue.failed');
        case 'canceled':
          return t('transferQueue.canceled');
        default:
          return item.state;
      }
    },
    [t],
  );

  const transferProgressPercent = (item: TransferQueueItem): number => {
    if (!item.bytesTotal) return item.state === 'completed' ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((item.bytesTransferred / item.bytesTotal) * 100)));
  };

  const handleRetryTransfer = useCallback((item: TransferQueueItem) => {
    void window.transferQueueAPI.retry(item.id);
  }, []);

  const handleCancelTransfer = useCallback((item: TransferQueueItem) => {
    void window.transferQueueAPI.cancel(item.id);
  }, []);

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

  const handleClearCompletedTransfers = useCallback(() => {
    void window.transferQueueAPI.clearCompleted();
  }, []);

  const handleClearAllTransfers = useCallback(() => {
    void window.transferQueueAPI.clearAll();
  }, []);

  return (
    <div className="rfe-root remote-file-explorer" data-kind="remote-file-explorer">
      <div className="rfe-header">
        <span className="rfe-title">{t('remoteFileExplorer.title')}</span>
        <button
          className="rfe-icon-btn"
          type="button"
          title={t('remoteFileExplorer.settings')}
          onClick={onOpenSettings}
        >
          ⚙
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="rfe-empty">
          <span>{t('remoteFileExplorer.noProfiles')}</span>
          <button className="rfe-link-btn" type="button" onClick={onOpenSettings}>
            {t('remoteFileExplorer.settings')}
          </button>
        </div>
      ) : (
        <>
          <div className="rfe-toolbar">
            <select
              className="rfe-select"
              value={selectedProfile?.id ?? ''}
              aria-label={t('remoteFileExplorer.selectProfile')}
              onChange={(e) => setSelectedProfileId(e.target.value)}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profileLabel(profile)}
                </option>
              ))}
            </select>
            <button
              className="rfe-icon-btn"
              type="button"
              title={t('remoteFileExplorer.up')}
              disabled={!selectedProfile || currentPath === '/'}
              onClick={handleUp}
            >
              ↑
            </button>
            <button
              className="rfe-icon-btn"
              type="button"
              title={t('remoteFileExplorer.refresh')}
              disabled={!selectedProfile || loading}
              onClick={handleRefresh}
            >
              ↻
            </button>
          </div>

          <div
            className={`rfe-breadcrumb${pathEditActive ? ' is-editing' : ''}`}
            aria-label={t('remoteFileExplorer.breadcrumb')}
            title={pathEditActive ? undefined : t('remoteFileExplorer.breadcrumbEditHint')}
            onClick={handleBreadcrumbBackgroundClick}
          >
            {pathEditActive ? (
              <input
                ref={pathInputRef}
                className="rfe-breadcrumb-input"
                value={pathEditValue}
                aria-label={t('remoteFileExplorer.pathAddress')}
                onChange={(event) => setPathEditValue(event.target.value)}
                onKeyDown={handleBreadcrumbPathKeyDown}
                onBlur={() => {
                  setPathEditValue(currentPath || '/');
                  setPathEditActive(false);
                }}
              />
            ) : (
              breadcrumb.map((segment, index) => (
                <React.Fragment key={`${segment.path}-${index}`}>
                  {index > 0 && <span className="rfe-crumb-sep">/</span>}
                  <button
                    type="button"
                    className="rfe-crumb"
                    title={segment.path}
                    disabled={!selectedProfile || loading}
                    onClick={() => selectedProfile && void loadPath(selectedProfile, segment.path)}
                  >
                    {segment.label}
                  </button>
                </React.Fragment>
              ))
            )}
          </div>

          <div className="rfe-actions">
            <button
              className="rfe-action-menu-btn"
              type="button"
              aria-haspopup="menu"
              onClick={(event) => openContextMenu(event, buildRemoteOperationMenuItems())}
            >
              {t('remoteFileExplorer.operationMenu')} ▾
            </button>
            <select
              className="rfe-transfer-policy"
              value={overwritePolicy}
              aria-label={t('transferQueue.overwritePolicy')}
              onChange={(e) => setOverwritePolicy(e.target.value as TransferOverwritePolicy)}
            >
              <option value="ask">{t('transferQueue.ask')}</option>
              <option value="overwrite">{t('transferQueue.overwrite')}</option>
              <option value="skip">{t('transferQueue.skip')}</option>
            </select>
          </div>

          <div className="rfe-filter-row">
            <input
              className="rfe-filter-input"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder={t('remoteFileExplorer.filterPlaceholder')}
              aria-label={t('remoteFileExplorer.filterPlaceholder')}
            />
            {filterQuery && (
              <button
                className="rfe-filter-clear"
                type="button"
                onClick={() => setFilterQuery('')}
                title={t('remoteFileExplorer.clearFilter')}
              >
                x
              </button>
            )}
          </div>

          <div className="rfe-action-bar" aria-label={t('remoteFileExplorer.actionBarLabel')}>
            <span className="rfe-action-summary" title={selectedEntry?.path || ''}>
              {selectedEntry?.name || t('remoteFileExplorer.noActionSelection')}
            </span>
            <button
              type="button"
              className="rfe-action-menu-btn"
              aria-haspopup="menu"
              onClick={(event) => openContextMenu(event, buildRemoteSelectionMenuItems())}
            >
              {t('remoteFileExplorer.actionMenu')} ▾
            </button>
          </div>

          <div
            className="rfe-list"
            role="tree"
            onDragOver={handleLocalDragOver}
            onDrop={(e) => handleLocalDrop(e, currentPath)}
          >
            {loading && <div className="rfe-status">{t('remoteFileExplorer.loading')}</div>}
            {!loading && message && (
              <div className={`rfe-status${messageKind === 'error' ? ' error' : ''}`}>{message}</div>
            )}
            {!loading && !message && entries.length === 0 && (
              <div className="rfe-status">{t('remoteFileExplorer.emptyFolder')}</div>
            )}
            {!loading && !message && entries.length > 0 && visibleEntries.length === 0 && (
              <div className="rfe-status">{t('remoteFileExplorer.noMatches')}</div>
            )}
            {!loading &&
              visibleEntries.map((entry) => (
                <button
                  key={entry.path}
                  className={`rfe-row${selectedEntryPath === entry.path ? ' selected' : ''}`}
                  type="button"
                  title={entry.path}
                  draggable
                  onClick={() => setSelectedEntryPath(entry.path)}
                  onDoubleClick={() => void handleOpen(entry)}
                  onDragStart={(e) => handleRemoteDragStart(e, entry)}
                  onDragOver={handleLocalDragOver}
                  onDrop={(e) => handleLocalDrop(e, entry.isDirectory ? entry.path : currentPath)}
                  onContextMenu={(e) => handleEntryContextMenu(e, entry)}
                >
                  <span className={`rfe-entry-icon${entry.isDirectory ? ' folder' : ''}`}>{fileIcon(entry)}</span>
                  <span className="rfe-entry-name">{entry.name}</span>
                  {!entry.isDirectory && <span className="rfe-entry-size">{formatRemoteBytes(entry.size)}</span>}
                </button>
              ))}
          </div>

          {showSelectionDetails && (
            <div className="rfe-details" aria-label={t('remoteFileExplorer.details')}>
              <div className="rfe-details-head">
                <span>{t('remoteFileExplorer.details')}</span>
                <span>
                  {visibleEntries.length} / {entries.length}
                </span>
              </div>
              {selectedEntry ? (
                <dl className="rfe-details-grid">
                  <dt>{t('remoteFileExplorer.kind')}</dt>
                  <dd>{selectedEntry.isDirectory ? t('remoteFileExplorer.folder') : t('remoteFileExplorer.file')}</dd>
                  <dt>{t('remoteFileExplorer.size')}</dt>
                  <dd>{selectedEntry.isDirectory ? '-' : formatRemoteBytes(selectedEntry.size)}</dd>
                  <dt>{t('remoteFileExplorer.modified')}</dt>
                  <dd>{selectedEntry.modifiedAt || '-'}</dd>
                  <dt>{t('remoteFileExplorer.profile')}</dt>
                  <dd>{selectedProfile ? profileLabel(selectedProfile) : '-'}</dd>
                  <dt>{t('remoteFileExplorer.protocol')}</dt>
                  <dd>{selectedProfile?.protocol?.toUpperCase() ?? '-'}</dd>
                  <dt>{t('remoteFileExplorer.encoding')}</dt>
                  <dd>{selectedProfile?.encoding ?? '-'}</dd>
                  <dt>{t('remoteFileExplorer.path')}</dt>
                  <dd title={selectedEntry.path}>{selectedEntry.path}</dd>
                </dl>
              ) : (
                <div className="rfe-details-empty">{t('remoteFileExplorer.nothingSelected')}</div>
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

          {visibleTransferQueueItems.length > 0 && (
            <div className="transfer-queue-panel">
              <div className="transfer-queue-header">
                <span>{t('transferQueue.title')}</span>
                <div className="transfer-queue-header-actions">
                  <button
                    className="transfer-queue-clear"
                    type="button"
                    onClick={handleClearCompletedTransfers}
                    title={t('transferQueue.clearCompleted')}
                  >
                    {t('transferQueue.clearCompleted')}
                  </button>
                  <button
                    className="transfer-queue-clear"
                    type="button"
                    onClick={handleClearAllTransfers}
                    title={t('transferQueue.clearAll')}
                  >
                    {t('transferQueue.clearAll')}
                  </button>
                </div>
              </div>
              {visibleTransferQueueItems.map((item) => {
                const percent = transferProgressPercent(item);
                return (
                  <div key={item.id} className={`transfer-queue-item state-${item.state}`}>
                    <div className="transfer-queue-row">
                      <span className="transfer-queue-direction">{item.direction === 'upload' ? '↑' : '↓'}</span>
                      <span className="transfer-queue-name" title={`${item.localPath} ↔ ${item.remotePath}`}>
                        {item.fileName}
                      </span>
                      <span className="transfer-queue-state">{transferStateLabel(item)}</span>
                    </div>
                    <div className="transfer-queue-progress" aria-label={`${percent}%`}>
                      <span style={{ width: `${percent}%` }} />
                    </div>
                    {item.error && <div className="transfer-queue-error">{item.error}</div>}
                    <div className="transfer-queue-actions">
                      {(item.state === 'failed' || item.state === 'canceled') && (
                        <button type="button" onClick={() => handleRetryTransfer(item)}>
                          {t('transferQueue.retry')}
                        </button>
                      )}
                      {(item.state === 'queued' || item.state === 'running') && (
                        <button type="button" onClick={() => handleCancelTransfer(item)}>
                          {t('transferQueue.cancel')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeContextMenu} />}

          {uploadConflict && (
            <div className="rfe-conflict-overlay" role="presentation">
              <div className="rfe-conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="rfe-conflict-title">
                <div className="rfe-conflict-title" id="rfe-conflict-title">
                  {t('transferQueue.conflictTitle')}
                </div>
                <div className="rfe-conflict-body">
                  <p>{t('transferQueue.conflictMessage', { name: uploadConflict.fileName })}</p>
                  <div
                    className="rfe-conflict-path"
                    title={joinRemotePath(uploadConflict.targetRemotePath, uploadConflict.fileName)}
                  >
                    {joinRemotePath(uploadConflict.targetRemotePath, uploadConflict.fileName)}
                  </div>
                  <label className="rfe-conflict-label">
                    <span>{t('transferQueue.newName')}</span>
                    <input
                      className="rfe-conflict-input"
                      value={uploadConflict.newName}
                      onChange={(e) =>
                        setUploadConflict({ ...uploadConflict, newName: e.target.value, error: undefined })
                      }
                    />
                  </label>
                  {uploadConflict.error && <div className="rfe-conflict-error">{uploadConflict.error}</div>}
                </div>
                <div className="rfe-conflict-actions">
                  <button type="button" className="rfe-btn" onClick={handleConflictOverwrite}>
                    {t('transferQueue.overwrite')}
                  </button>
                  <button type="button" className="rfe-btn" onClick={handleConflictSaveAs}>
                    {t('transferQueue.saveAs')}
                  </button>
                  <button type="button" className="rfe-btn" onClick={handleConflictCancel}>
                    {t('transferQueue.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
