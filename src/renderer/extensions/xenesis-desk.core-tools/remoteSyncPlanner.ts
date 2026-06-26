import type {
  FsEntry,
  RemoteFileEntry,
  RemoteFileProfile,
  RemoteSyncAction,
  RemoteSyncPlan,
  RemoteSyncPlanEntry,
} from '../../../shared/types';

const REMOTE_SYNC_ACTIONS: RemoteSyncAction[] = [
  'upload',
  'download',
  'equal',
  'conflict',
  'local-only',
  'remote-only',
  'skip-directory',
];

export interface BuildRemoteSyncPlanRequest {
  localDir: string;
  remotePath: string;
  profile: RemoteFileProfile;
  localEntries: FsEntry[];
  remoteEntries: RemoteFileEntry[];
}

function joinLocalPath(base: string, name: string): string {
  const sep = base.includes('\\') ? '\\' : '/';
  return `${base.replace(/[\\/]+$/, '')}${sep}${name}`;
}

function joinRemotePath(base: string, name: string): string {
  const normalizedBase = base.trim() || '/';
  if (normalizedBase === '/') return `/${name}`;
  return `${normalizedBase.replace(/\/+$/, '')}/${name}`;
}

function emptyCounts(): Record<RemoteSyncAction, number> {
  return REMOTE_SYNC_ACTIONS.reduce(
    (counts, action) => {
      counts[action] = 0;
      return counts;
    },
    {} as Record<RemoteSyncAction, number>,
  );
}

function compareEntry(
  name: string,
  local: FsEntry | undefined,
  remote: RemoteFileEntry | undefined,
  localDir: string,
  remoteBasePath: string,
): RemoteSyncPlanEntry {
  const localPath = local?.path ?? joinLocalPath(localDir, name);
  const remotePath = remote?.path ?? joinRemotePath(remoteBasePath, name);

  if (local && !remote) {
    if (local.isDirectory) {
      return {
        name,
        localPath,
        isDirectory: true,
        action: 'local-only',
        reason: 'Local directory is not present remotely. Recursive sync is not enabled in this planner.',
      };
    }
    return {
      name,
      localPath,
      remotePath,
      isDirectory: false,
      action: 'upload',
      reason: 'Local file is not present remotely.',
    };
  }

  if (!local && remote) {
    if (remote.isDirectory) {
      return {
        name,
        remotePath,
        isDirectory: true,
        action: 'remote-only',
        reason: 'Remote directory is not present locally. Recursive sync is not enabled in this planner.',
      };
    }
    return {
      name,
      localPath,
      remotePath,
      isDirectory: false,
      action: 'download',
      reason: 'Remote file is not present locally.',
    };
  }

  if (!local || !remote) {
    return {
      name,
      localPath,
      remotePath,
      isDirectory: false,
      action: 'conflict',
      reason: 'Entry could not be compared.',
    };
  }

  if (local.isDirectory !== remote.isDirectory) {
    return {
      name,
      localPath,
      remotePath,
      isDirectory: local.isDirectory || remote.isDirectory,
      action: 'conflict',
      reason: 'One side is a directory and the other side is a file.',
    };
  }

  if (local.isDirectory) {
    return {
      name,
      localPath,
      remotePath,
      isDirectory: true,
      action: 'skip-directory',
      reason: 'Directory exists on both sides. Recursive comparison is not enabled in this planner.',
    };
  }

  return {
    name,
    localPath,
    remotePath,
    isDirectory: false,
    action: 'equal',
    reason: 'File name exists on both sides. Open a diff or queue an explicit transfer if contents differ.',
  };
}

export function buildRemoteSyncPlan(request: BuildRemoteSyncPlanRequest): RemoteSyncPlan {
  const localByName = new Map(request.localEntries.map((entry) => [entry.name, entry]));
  const remoteByName = new Map(request.remoteEntries.map((entry) => [entry.name, entry]));
  const names = Array.from(new Set([...localByName.keys(), ...remoteByName.keys()])).sort((left, right) =>
    left.localeCompare(right),
  );
  const counts = emptyCounts();
  const entries = names.map((name) => {
    const entry = compareEntry(
      name,
      localByName.get(name),
      remoteByName.get(name),
      request.localDir,
      request.remotePath,
    );
    counts[entry.action] += 1;
    return entry;
  });

  return {
    generatedAt: new Date().toISOString(),
    localDir: request.localDir,
    remotePath: request.remotePath,
    profileId: request.profile.id,
    profileName: request.profile.name,
    entries,
    counts,
  };
}
