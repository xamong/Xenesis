import type {
  LocalTerminalCliSelection,
  LocalTerminalProfile,
  ShellKind,
  TerminalSessionKind,
} from '../../shared/types';

const LOCAL_SHELLS = new Set<ShellKind>(['powershell', 'cmd', 'pwsh', 'wsl', 'zsh', 'bash', 'sh']);

export interface TerminalProfileSnapshotSession {
  id: string;
  kind: TerminalSessionKind;
  label?: string;
  title?: string;
  shell?: ShellKind;
  cwd?: string;
  lastSentCommand?: string;
  initialCommand?: string;
  localCliAgentId?: LocalTerminalCliSelection;
  environmentText?: string;
  groupId?: string;
}

export interface TerminalProfileSnapshotOptions {
  id?: string;
  now?: number;
  existingProfiles?: LocalTerminalProfile[];
}

export interface TerminalProfileSettingsTarget {
  category: 'remote-terminals';
  section: 'remote-terminals';
  selectedTerminalProfileId: string;
  pendingLocalTerminalProfile: LocalTerminalProfile;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function lastPathSegment(path: string): string {
  const segments = path.split(/[\\/]+/).filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

function compactCommand(command: string): string {
  const singleLine = command.replace(/\s+/g, ' ').trim();
  return singleLine.length > 42 ? `${singleLine.slice(0, 39)}...` : singleLine;
}

function uniqueProfileName(baseName: string, existingProfiles: LocalTerminalProfile[]): string {
  const names = new Set(existingProfiles.map((profile) => profile.name.trim()).filter(Boolean));
  if (!names.has(baseName)) return baseName;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseName} (${index})`;
    if (!names.has(candidate)) return candidate;
  }
  return `${baseName} (${Date.now()})`;
}

export function getTerminalProfileSnapshotMenuLabel(locale: string): string {
  return locale === 'ko' ? '터미널 프로필로 저장' : 'Save as Terminal Profile';
}

export function buildTerminalProfileSettingsTarget(profile: LocalTerminalProfile): TerminalProfileSettingsTarget {
  return {
    category: 'remote-terminals',
    section: 'remote-terminals',
    selectedTerminalProfileId: `local:${profile.id}`,
    pendingLocalTerminalProfile: profile,
  };
}

export function mergePendingLocalTerminalProfile(
  profiles: LocalTerminalProfile[],
  pendingProfile: LocalTerminalProfile | null | undefined,
): LocalTerminalProfile[] {
  if (!pendingProfile?.id) return profiles;
  if (profiles.some((profile) => profile.id === pendingProfile.id)) {
    return profiles;
  }
  return [...profiles, pendingProfile];
}

export function buildLocalTerminalProfileFromSession(
  session: TerminalProfileSnapshotSession | undefined,
  options: TerminalProfileSnapshotOptions = {},
): LocalTerminalProfile | null {
  if (!session || session.kind !== 'shell' || !session.shell || !LOCAL_SHELLS.has(session.shell)) {
    return null;
  }

  const now = options.now ?? Date.now();
  const cwd = normalizeText(session.cwd);
  const command = normalizeText(session.lastSentCommand) || normalizeText(session.initialCommand);
  const folder = lastPathSegment(cwd) || normalizeText(session.label) || normalizeText(session.title) || session.shell;
  const commandSuffix = command ? ` - ${compactCommand(command)}` : '';
  const name = uniqueProfileName(`${folder}${commandSuffix}`, options.existingProfiles ?? []);

  return {
    id: options.id || crypto.randomUUID(),
    name,
    groupId: normalizeText(session.groupId),
    shell: session.shell,
    cwd,
    localCliAgentId: session.localCliAgentId ?? 'default',
    environmentText: typeof session.environmentText === 'string' ? session.environmentText : '',
    initialCommand: command,
    createdAt: now,
    updatedAt: now,
  };
}
