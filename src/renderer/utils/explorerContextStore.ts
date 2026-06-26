import type { RemoteFileProfile } from '../../shared/types';

export type ExplorerContextSource = 'local' | 'remote';
export type ExplorerContextKind = 'file' | 'folder';

export interface ExplorerContextItem {
  id: string;
  source: ExplorerContextSource;
  kind: ExplorerContextKind;
  name: string;
  path: string;
  ext?: string;
  profile?: {
    id: string;
    name: string;
    protocol: string;
    host: string;
    encoding?: string;
  };
  addedAt: string;
}

export const EXPLORER_CONTEXT_STORAGE_KEY = 'xenesis-explorer-context-items';
export const EXPLORER_CONTEXT_CHANGED_EVENT = 'xenesis-explorer-context-changed';
export const EXPLORER_REMOTE_SYNC_HANDOFF_STORAGE_KEY = 'xenesis-remote-sync-planner-handoff';
export const EXPLORER_REMOTE_SYNC_HANDOFF_EVENT = 'xenesis-remote-sync-planner-handoff';
export const EXPLORER_COMPARE_SELECTION_STORAGE_KEY = 'xenesis-explorer-compare-selection';
export const EXPLORER_COMPARE_SELECTION_CHANGED_EVENT = 'xenesis-explorer-compare-selection-changed';

const MAX_EXPLORER_CONTEXT_ITEMS = 24;

export interface ExplorerRemoteSyncHandoff {
  localDir: string;
  remotePath: string;
  profileId: string;
  profileName: string;
  localItemId: string;
  remoteItemId: string;
  createdAt: string;
}

export interface ExplorerCompareSelectionState {
  local?: ExplorerContextItem;
  remote?: ExplorerContextItem;
  updatedAt: string;
}

function cleanText(value: unknown, maxLength = 1000): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function itemKey(item: Pick<ExplorerContextItem, 'source' | 'path'>): string {
  return `${item.source}:${item.path}`.toLowerCase();
}

function parentLocalPath(filePath: string): string {
  const clean = String(filePath || '').replace(/[\\/]+$/, '');
  const index = Math.max(clean.lastIndexOf('\\'), clean.lastIndexOf('/'));
  return index > 0 ? clean.slice(0, index) : clean;
}

function parentRemotePath(remotePath: string): string {
  const clean = String(remotePath || '/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/+$/, '');
  if (!clean || clean === '/') return '/';
  const index = clean.lastIndexOf('/');
  return index <= 0 ? '/' : clean.slice(0, index);
}

function readRawItems(): ExplorerContextItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EXPLORER_CONTEXT_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): ExplorerContextItem | null => {
        if (!item || typeof item !== 'object') return null;
        const candidate = item as Partial<ExplorerContextItem>;
        const source = candidate.source === 'remote' ? 'remote' : 'local';
        const kind = candidate.kind === 'folder' ? 'folder' : 'file';
        const path = cleanText(candidate.path, 2000);
        if (!path) return null;
        return {
          id: cleanText(candidate.id) || `${source}-${Date.now()}`,
          source,
          kind,
          name: cleanText(candidate.name) || path.split(/[\\/]/).filter(Boolean).pop() || path,
          path,
          ext: cleanText(candidate.ext, 100),
          profile:
            candidate.profile && typeof candidate.profile === 'object'
              ? {
                  id: cleanText(candidate.profile.id),
                  name: cleanText(candidate.profile.name),
                  protocol: cleanText(candidate.profile.protocol),
                  host: cleanText(candidate.profile.host),
                  encoding: cleanText(candidate.profile.encoding),
                }
              : undefined,
          addedAt: cleanText(candidate.addedAt) || new Date().toISOString(),
        };
      })
      .filter((item): item is ExplorerContextItem => Boolean(item));
  } catch {
    return [];
  }
}

function writeItems(items: ExplorerContextItem[]): void {
  try {
    window.localStorage.setItem(
      EXPLORER_CONTEXT_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_EXPLORER_CONTEXT_ITEMS)),
    );
    window.dispatchEvent(new CustomEvent(EXPLORER_CONTEXT_CHANGED_EVENT));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}

export function getExplorerContextItems(): ExplorerContextItem[] {
  return readRawItems();
}

export function clearExplorerContextItems(): void {
  writeItems([]);
}

export function removeExplorerContextItem(itemId: string): ExplorerContextItem[] {
  const next = readRawItems().filter((item) => item.id !== itemId);
  writeItems(next);
  return next;
}

export function addExplorerContextItem(item: ExplorerContextItem): ExplorerContextItem[] {
  const existing = readRawItems().filter((current) => itemKey(current) !== itemKey(item));
  const next = [item, ...existing].slice(0, MAX_EXPLORER_CONTEXT_ITEMS);
  writeItems(next);
  return next;
}

function sanitizeExplorerContextItem(value: unknown): ExplorerContextItem | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<ExplorerContextItem>;
  const source = candidate.source === 'remote' ? 'remote' : candidate.source === 'local' ? 'local' : undefined;
  if (!source) return undefined;
  const path = cleanText(candidate.path, 2000);
  if (!path) return undefined;
  return {
    id: cleanText(candidate.id) || `${source}-${Date.now()}`,
    source,
    kind: candidate.kind === 'folder' ? 'folder' : 'file',
    name: cleanText(candidate.name) || path.split(/[\\/]/).filter(Boolean).pop() || path,
    path,
    ext: cleanText(candidate.ext, 100),
    profile:
      candidate.profile && typeof candidate.profile === 'object'
        ? {
            id: cleanText(candidate.profile.id),
            name: cleanText(candidate.profile.name),
            protocol: cleanText(candidate.profile.protocol),
            host: cleanText(candidate.profile.host),
            encoding: cleanText(candidate.profile.encoding),
          }
        : undefined,
    addedAt: cleanText(candidate.addedAt) || new Date().toISOString(),
  };
}

export function getExplorerCompareSelection(): ExplorerCompareSelectionState {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(EXPLORER_COMPARE_SELECTION_STORAGE_KEY) || '{}',
    ) as Partial<ExplorerCompareSelectionState>;
    return {
      local: sanitizeExplorerContextItem(parsed.local),
      remote: sanitizeExplorerContextItem(parsed.remote),
      updatedAt: cleanText(parsed.updatedAt) || new Date().toISOString(),
    };
  } catch {
    return { updatedAt: new Date().toISOString() };
  }
}

export function setExplorerCompareSelection(item: ExplorerContextItem): ExplorerCompareSelectionState {
  const current = getExplorerCompareSelection();
  const next: ExplorerCompareSelectionState = {
    ...current,
    [item.source]: item,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(EXPLORER_COMPARE_SELECTION_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EXPLORER_COMPARE_SELECTION_CHANGED_EVENT, { detail: next }));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
  return next;
}

export function makeLocalExplorerContextItem(input: {
  path: string;
  name: string;
  isDirectory: boolean;
  ext?: string;
}): ExplorerContextItem {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'local',
    kind: input.isDirectory ? 'folder' : 'file',
    name: cleanText(input.name) || cleanText(input.path),
    path: cleanText(input.path, 2000),
    ext: cleanText(input.ext, 100),
    addedAt: new Date().toISOString(),
  };
}

export function makeRemoteExplorerContextItem(input: {
  path: string;
  name: string;
  isDirectory: boolean;
  ext?: string;
  profile: RemoteFileProfile;
}): ExplorerContextItem {
  return {
    id: `remote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'remote',
    kind: input.isDirectory ? 'folder' : 'file',
    name: cleanText(input.name) || cleanText(input.path),
    path: cleanText(input.path, 2000),
    ext: cleanText(input.ext, 100),
    profile: {
      id: cleanText(input.profile.id),
      name: cleanText(input.profile.name || input.profile.host),
      protocol: cleanText(input.profile.protocol),
      host: cleanText(input.profile.host),
      encoding: cleanText(input.profile.encoding),
    },
    addedAt: new Date().toISOString(),
  };
}

export function buildExplorerContextBotMessage(item: ExplorerContextItem): string {
  const remoteNote =
    item.source === 'remote'
      ? 'This is a remote file reference. Ask before writing, and prefer Xenesis Desk remote file APIs or the existing FTP editor save flow.'
      : 'This is a local file reference. Preview writes with xenesis_desk_preview_text_file_write before applying changes.';

  return [
    `Use this Xenesis Desk explorer ${item.kind} as context: ${item.name}`,
    '',
    '```xenesis-explorer-context',
    JSON.stringify(
      {
        type: 'xenesis-explorer-context',
        source: item.source,
        kind: item.kind,
        name: item.name,
        path: item.path,
        ext: item.ext,
        profile: item.profile,
        addedAt: item.addedAt,
      },
      null,
      2,
    ),
    '```',
    '',
    remoteNote,
  ].join('\n');
}

export function buildExplorerRemoteSyncHandoff(items: ExplorerContextItem[]): ExplorerRemoteSyncHandoff | null {
  const localItem = items.find((item) => item.source === 'local');
  const remoteItem = items.find((item) => item.source === 'remote' && item.profile?.id);
  if (!localItem || !remoteItem?.profile?.id) return null;
  return {
    localDir: localItem.kind === 'folder' ? localItem.path : parentLocalPath(localItem.path),
    remotePath: remoteItem.kind === 'folder' ? remoteItem.path : parentRemotePath(remoteItem.path),
    profileId: remoteItem.profile.id,
    profileName: remoteItem.profile.name || remoteItem.profile.host || remoteItem.profile.id,
    localItemId: localItem.id,
    remoteItemId: remoteItem.id,
    createdAt: new Date().toISOString(),
  };
}

export function setExplorerRemoteSyncHandoff(handoff: ExplorerRemoteSyncHandoff): void {
  try {
    window.localStorage.setItem(EXPLORER_REMOTE_SYNC_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
    window.dispatchEvent(new CustomEvent(EXPLORER_REMOTE_SYNC_HANDOFF_EVENT, { detail: handoff }));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}

export function getExplorerRemoteSyncHandoff(): ExplorerRemoteSyncHandoff | null {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(EXPLORER_REMOTE_SYNC_HANDOFF_STORAGE_KEY) || 'null',
    ) as Partial<ExplorerRemoteSyncHandoff> | null;
    if (!parsed?.localDir || !parsed.remotePath || !parsed.profileId) return null;
    return {
      localDir: cleanText(parsed.localDir, 2000),
      remotePath: cleanText(parsed.remotePath, 2000) || '/',
      profileId: cleanText(parsed.profileId),
      profileName: cleanText(parsed.profileName),
      localItemId: cleanText(parsed.localItemId),
      remoteItemId: cleanText(parsed.remoteItemId),
      createdAt: cleanText(parsed.createdAt) || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
