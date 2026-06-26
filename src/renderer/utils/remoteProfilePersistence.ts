import type {
  LocalTerminalProfile,
  RemoteFileProfile,
  RemoteFileSettings,
  RemoteTerminalProfile,
  RemoteTerminalSettings,
  TerminalProfileGroup,
} from '../../shared/types';

type ProfileWithId = { id: string };

function mergeById<T extends ProfileWithId>(
  incoming: T[] | undefined,
  existing: T[] | undefined,
  mergeItem: (saved: T, next: T) => T = (saved, next) => ({ ...saved, ...next }),
): T[] {
  const merged = Array.isArray(existing) ? [...existing] : [];
  const indexById = new Map(merged.map((item, index) => [item.id, index]));

  for (const item of Array.isArray(incoming) ? incoming : []) {
    const existingIndex = indexById.get(item.id);
    if (existingIndex === undefined) {
      indexById.set(item.id, merged.length);
      merged.push(item);
      continue;
    }
    merged[existingIndex] = mergeItem(merged[existingIndex], item);
  }

  return merged;
}

function mergeRemoteTerminalProfile(saved: RemoteTerminalProfile, next: RemoteTerminalProfile): RemoteTerminalProfile {
  return {
    ...saved,
    ...next,
    password: next.password || saved.password,
    passphrase: next.passphrase || saved.passphrase,
  };
}

function mergeRemoteFileProfile(saved: RemoteFileProfile, next: RemoteFileProfile): RemoteFileProfile {
  return {
    ...saved,
    ...next,
    password: next.password || saved.password,
    passphrase: next.passphrase || saved.passphrase,
  };
}

export function mergeWorkspaceRemoteTerminalSettings(
  incoming: RemoteTerminalSettings,
  existing: RemoteTerminalSettings,
): RemoteTerminalSettings {
  return {
    groups: mergeById<TerminalProfileGroup>(incoming.groups, existing.groups),
    profiles: mergeById<RemoteTerminalProfile>(incoming.profiles, existing.profiles, mergeRemoteTerminalProfile),
    localProfiles: mergeById<LocalTerminalProfile>(incoming.localProfiles, existing.localProfiles),
  };
}

export function mergeWorkspaceRemoteFileSettings(
  incoming: RemoteFileSettings,
  existing: RemoteFileSettings,
): RemoteFileSettings {
  return {
    groups: mergeById<TerminalProfileGroup>(incoming.groups, existing.groups),
    profiles: mergeById<RemoteFileProfile>(incoming.profiles, existing.profiles, mergeRemoteFileProfile),
  };
}
