export type ExternalAppPlatform = 'windows';
export type ExternalAppActionName = 'launch' | 'find' | 'focus' | 'resize' | 'typeText' | 'hotkey' | 'close' | 'status';
export type ExternalAppApprovalLevel = 'low' | 'medium' | 'high';

export interface ExternalAppProfile {
  id: string;
  label: string;
  platform: ExternalAppPlatform;
  executable: string;
  defaultArgs?: string[];
  defaultCwd?: string;
  allowedActions: ExternalAppActionName[];
  approvalLevel: ExternalAppApprovalLevel;
  enabled: boolean;
}

export interface ExternalAppSettings {
  enabled: boolean;
  profiles: ExternalAppProfile[];
}

export type ExternalAppSettingsInput = Partial<Omit<ExternalAppSettings, 'profiles'>> & {
  profiles?: Partial<ExternalAppProfile>[];
};

export interface ExternalAppAction {
  action: ExternalAppActionName;
  appId?: string;
  path?: string;
  args?: string[];
  cwd?: string;
  processName?: string;
  titleContains?: string;
  windowId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  keys?: string[];
  mode?: 'window' | 'process';
}

export interface ExternalAppWindowInfo {
  windowId: string;
  processId?: number;
  title: string;
  bounds?: { x: number; y: number; width: number; height: number };
  isForeground?: boolean;
}

export interface ExternalAppActionResult {
  ok: boolean;
  action: ExternalAppActionName;
  appId?: string;
  path?: string;
  approvalLevel: ExternalAppApprovalLevel;
  processId?: number;
  windows: ExternalAppWindowInfo[];
  message: string;
  error?: string;
}

export const EXTERNAL_APP_ACTIONS: ExternalAppActionName[] = [
  'launch',
  'focus',
  'resize',
  'typeText',
  'hotkey',
  'close',
  'status',
  'find',
];

export const BUILTIN_EXTERNAL_APP_PROFILES: ExternalAppProfile[] = [
  {
    id: 'notepad',
    label: 'Notepad',
    platform: 'windows',
    executable: 'notepad.exe',
    allowedActions: EXTERNAL_APP_ACTIONS,
    approvalLevel: 'medium',
    enabled: true,
  },
];

export const EXTERNAL_APP_PROFILE_TEMPLATES: ExternalAppProfile[] = [
  {
    id: 'paint',
    label: 'Paint',
    platform: 'windows',
    executable: 'mspaint.exe',
    allowedActions: ['launch', 'focus', 'resize', 'hotkey', 'close', 'status', 'find'],
    approvalLevel: 'medium',
    enabled: true,
  },
  {
    id: 'powershell',
    label: 'PowerShell',
    platform: 'windows',
    executable: 'powershell.exe',
    allowedActions: ['launch', 'focus', 'resize', 'typeText', 'hotkey', 'close', 'status', 'find'],
    approvalLevel: 'high',
    enabled: true,
  },
  {
    id: 'cmd',
    label: 'Command Prompt',
    platform: 'windows',
    executable: 'cmd.exe',
    allowedActions: ['launch', 'focus', 'resize', 'typeText', 'hotkey', 'close', 'status', 'find'],
    approvalLevel: 'high',
    enabled: true,
  },
];

const VALID_ACTIONS = new Set<ExternalAppActionName>(EXTERNAL_APP_ACTIONS);

export function normalizeExternalAppSettings(raw: ExternalAppSettingsInput | undefined): ExternalAppSettings {
  const builtInIds = new Set(BUILTIN_EXTERNAL_APP_PROFILES.map((profile) => profile.id));
  const customProfiles = Array.isArray(raw?.profiles) ? raw.profiles : [];
  const customProfilesById = new Map<string, ExternalAppProfile>();
  for (const profile of customProfiles) {
    if (!profile?.id || !profile.executable) continue;
    const normalized = normalizeExternalAppProfile(profile);
    customProfilesById.set(normalized.id, normalized);
  }

  return {
    enabled: raw?.enabled !== false,
    profiles: [
      ...BUILTIN_EXTERNAL_APP_PROFILES.map((profile) => ({ ...profile, allowedActions: [...profile.allowedActions] })),
      ...[...customProfilesById.values()].filter((profile) => !builtInIds.has(profile.id)),
    ],
  };
}

export function normalizeExternalAppProfile(profile: Partial<ExternalAppProfile>): ExternalAppProfile {
  const allowedActions = Array.isArray(profile.allowedActions)
    ? profile.allowedActions.filter((action): action is ExternalAppActionName =>
        VALID_ACTIONS.has(action as ExternalAppActionName),
      )
    : [];

  return {
    id: String(profile.id || '').trim(),
    label: String(profile.label || profile.id || '').trim(),
    platform: 'windows',
    executable: String(profile.executable || '').trim(),
    defaultArgs: Array.isArray(profile.defaultArgs) ? profile.defaultArgs.map(String) : undefined,
    defaultCwd: typeof profile.defaultCwd === 'string' ? profile.defaultCwd.trim() : undefined,
    allowedActions: allowedActions.length ? allowedActions : ['launch', 'focus', 'status', 'find'],
    approvalLevel:
      profile.approvalLevel === 'low' || profile.approvalLevel === 'high' ? profile.approvalLevel : 'medium',
    enabled: profile.enabled !== false,
  };
}

export function createExternalAppProfileFromTemplate(
  templateId: string,
  existingIds: readonly string[] = [],
): ExternalAppProfile | null {
  const template = EXTERNAL_APP_PROFILE_TEMPLATES.find((profile) => profile.id === templateId);
  if (!template) return null;
  const existing = new Set(existingIds.map((id) => id.trim()).filter(Boolean));
  const id = uniqueExternalAppProfileId(template.id, existing);
  return {
    ...template,
    id,
    allowedActions: [...template.allowedActions],
    defaultArgs: template.defaultArgs ? [...template.defaultArgs] : undefined,
  };
}

function uniqueExternalAppProfileId(baseId: string, existingIds: Set<string>): string {
  const cleanBaseId = normalizeExternalAppProfileId(baseId) || 'external-app';
  if (!existingIds.has(cleanBaseId)) return cleanBaseId;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${cleanBaseId}-${index}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return `${cleanBaseId}-${Date.now().toString(36)}`;
}

function normalizeExternalAppProfileId(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function normalizeExternalAppAction(raw: unknown): ExternalAppAction {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const action = String(input.action || '').trim() as ExternalAppActionName;
  if (!VALID_ACTIONS.has(action)) {
    throw new Error(`Unsupported external app action: ${action || '(missing)'}`);
  }

  const appId = typeof input.appId === 'string' ? input.appId.trim() : undefined;
  const path = typeof input.path === 'string' ? input.path.trim() : undefined;
  const windowId = typeof input.windowId === 'string' ? input.windowId.trim() : undefined;
  const hasTarget = Boolean(appId || path || windowId);

  if (action === 'launch' && !appId && !path) {
    throw new Error('appId or path is required for launch.');
  }
  if (['focus', 'resize', 'typeText', 'hotkey', 'close'].includes(action) && !hasTarget) {
    throw new Error(`appId, path, or windowId is required for ${action}.`);
  }

  const text = typeof input.text === 'string' ? input.text : undefined;
  if (action === 'typeText' && !text) {
    throw new Error('text is required for typeText.');
  }

  const keys = Array.isArray(input.keys) ? input.keys.map(String).filter(Boolean) : undefined;
  if (action === 'hotkey' && (!keys || keys.length === 0)) {
    throw new Error('keys are required for hotkey.');
  }

  return {
    action,
    ...(appId ? { appId } : {}),
    ...(path ? { path } : {}),
    ...(Array.isArray(input.args) ? { args: input.args.map(String) } : {}),
    ...(typeof input.cwd === 'string' && input.cwd.trim() ? { cwd: input.cwd.trim() } : {}),
    ...(typeof input.processName === 'string' && input.processName.trim()
      ? { processName: input.processName.trim() }
      : {}),
    ...(typeof input.titleContains === 'string' && input.titleContains.trim()
      ? { titleContains: input.titleContains.trim() }
      : {}),
    ...(windowId ? { windowId } : {}),
    ...(Number.isFinite(Number(input.x)) ? { x: Number(input.x) } : {}),
    ...(Number.isFinite(Number(input.y)) ? { y: Number(input.y) } : {}),
    ...(Number.isFinite(Number(input.width)) ? { width: Number(input.width) } : {}),
    ...(Number.isFinite(Number(input.height)) ? { height: Number(input.height) } : {}),
    ...(text !== undefined ? { text } : {}),
    ...(keys ? { keys } : {}),
    ...(input.mode === 'process'
      ? { mode: 'process' as const }
      : input.mode === 'window'
        ? { mode: 'window' as const }
        : {}),
  };
}

export function classifyExternalAppApproval(
  action: ExternalAppAction,
  registeredProfile: boolean,
): ExternalAppApprovalLevel {
  if (!registeredProfile || action.path) return 'high';
  if (['status', 'find', 'focus', 'resize'].includes(action.action)) return 'low';
  if (action.action === 'typeText' && (action.text?.length ?? 0) > 5000) return 'high';
  return 'medium';
}
