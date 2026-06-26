import type {
  McpBridgeExplorerActionPayload,
  McpBridgeRemoteExplorerActionPayload,
  RemoteFileProfile,
} from '../../shared/types';

export const OPEN_LOCAL_FILE_EVENT = 'xenesis-open-local-file';
export const OPEN_REMOTE_FILE_EVENT = 'xenesis-open-remote-file';
export const LOCAL_EXPLORER_NAVIGATE_EVENT = 'xenesis-local-explorer-navigate';
export const LOCAL_EXPLORER_ACTION_EVENT = 'xenesis-local-explorer-action';
export const REMOTE_EXPLORER_NAVIGATE_EVENT = 'xenesis-remote-explorer-navigate';
export const REMOTE_EXPLORER_ACTION_EVENT = 'xenesis-remote-explorer-action';
export const REMOTE_EXPLORER_NAVIGATE_STORAGE_KEY = 'xenesis-remote-explorer-navigate-handoff';

export interface OpenLocalFileRequest {
  path: string;
}

export interface OpenRemoteFileRequest {
  profile: RemoteFileProfile;
  path: string;
}

export interface LocalExplorerNavigateRequest {
  path: string;
  selectPath?: string;
}

export type LocalExplorerActionName = Exclude<
  McpBridgeExplorerActionPayload['action'],
  'show' | 'hide' | 'toggle' | 'navigate'
>;

export interface LocalExplorerActionRequest {
  action: LocalExplorerActionName;
  path?: string;
  selectPath?: string;
  query?: string;
  shell?: McpBridgeExplorerActionPayload['shell'];
}

export interface RemoteExplorerNavigateRequest {
  profileId: string;
  path: string;
  selectPath?: string;
}

export type RemoteExplorerActionName = Exclude<McpBridgeRemoteExplorerActionPayload['action'], 'show' | 'navigate'>;

export interface RemoteExplorerActionRequest {
  action: RemoteExplorerActionName;
  profileId?: string;
  path?: string;
  selectPath?: string;
  query?: string;
}

function cleanText(value: unknown, maxLength = 2000): string {
  return String(value ?? '')
    .trim()
    .slice(0, maxLength);
}

export function dispatchOpenLocalFile(path: string): void {
  window.dispatchEvent(
    new CustomEvent<OpenLocalFileRequest>(OPEN_LOCAL_FILE_EVENT, {
      detail: { path },
    }),
  );
}

export function dispatchOpenRemoteFile(profile: RemoteFileProfile, path: string): void {
  window.dispatchEvent(
    new CustomEvent<OpenRemoteFileRequest>(OPEN_REMOTE_FILE_EVENT, {
      detail: { profile, path },
    }),
  );
}

export function dispatchLocalExplorerNavigate(request: LocalExplorerNavigateRequest): void {
  window.dispatchEvent(
    new CustomEvent<LocalExplorerNavigateRequest>(LOCAL_EXPLORER_NAVIGATE_EVENT, {
      detail: request,
    }),
  );
}

export function dispatchLocalExplorerAction(request: LocalExplorerActionRequest): void {
  window.dispatchEvent(
    new CustomEvent<LocalExplorerActionRequest>(LOCAL_EXPLORER_ACTION_EVENT, {
      detail: request,
    }),
  );
}

export function dispatchRemoteExplorerAction(request: RemoteExplorerActionRequest): void {
  window.dispatchEvent(
    new CustomEvent<RemoteExplorerActionRequest>(REMOTE_EXPLORER_ACTION_EVENT, {
      detail: request,
    }),
  );
}

export function setRemoteExplorerNavigateHandoff(request: RemoteExplorerNavigateRequest): void {
  const normalized: RemoteExplorerNavigateRequest = {
    profileId: cleanText(request.profileId),
    path: cleanText(request.path) || '/',
    selectPath: cleanText(request.selectPath),
  };
  try {
    window.localStorage.setItem(REMOTE_EXPLORER_NAVIGATE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
  window.dispatchEvent(
    new CustomEvent<RemoteExplorerNavigateRequest>(REMOTE_EXPLORER_NAVIGATE_EVENT, {
      detail: normalized,
    }),
  );
}

export function getRemoteExplorerNavigateHandoff(): RemoteExplorerNavigateRequest | null {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(REMOTE_EXPLORER_NAVIGATE_STORAGE_KEY) || 'null',
    ) as Partial<RemoteExplorerNavigateRequest> | null;
    if (!parsed?.profileId || !parsed.path) return null;
    return {
      profileId: cleanText(parsed.profileId),
      path: cleanText(parsed.path) || '/',
      selectPath: cleanText(parsed.selectPath),
    };
  } catch {
    return null;
  }
}

export function clearRemoteExplorerNavigateHandoff(): void {
  try {
    window.localStorage.removeItem(REMOTE_EXPLORER_NAVIGATE_STORAGE_KEY);
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}
