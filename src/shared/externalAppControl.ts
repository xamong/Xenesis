export type ExternalAppPlatform = 'windows' | 'macos';
export type ExternalAppActionName =
  | 'launch'
  | 'find'
  | 'focus'
  | 'resize'
  | 'typeText'
  | 'hotkey'
  | 'close'
  | 'status'
  | 'click'
  | 'doubleClick'
  | 'tripleClick'
  | 'middleClick'
  | 'rightClick'
  | 'move'
  | 'mouseDown'
  | 'mouseUp'
  | 'dragAndDrop'
  | 'screenshot'
  | 'inspect'
  | 'elementFromPoint'
  | 'tree'
  | 'menuExplore'
  | 'highlight'
  | 'captureElement';
export type ExternalAppApprovalLevel = 'low' | 'medium' | 'high';
export type ExternalAppActionApproval = 'never' | 'once' | 'always';

export interface ExternalAppActionPolicy {
  allowed: boolean;
  approval: ExternalAppActionApproval;
  sensitivity: ExternalAppApprovalLevel;
}

export interface ExternalAppActionDecision {
  allowed: boolean;
  approvalLevel: ExternalAppApprovalLevel;
  approval: ExternalAppActionApproval;
  reason: string;
}

export interface ExternalAppProfile {
  id: string;
  label: string;
  platform: ExternalAppPlatform;
  bundleId?: string;
  executable: string;
  defaultArgs?: string[];
  defaultCwd?: string;
  allowedActions: ExternalAppActionName[];
  approvalLevel: ExternalAppApprovalLevel;
  enabled: boolean;
}

export interface ExternalAppPlacement {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ExternalAppBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ExternalAppObservationProvider =
  | 'uia'
  | 'msaa'
  | 'win32'
  | 'workspace'
  | 'cgwindow'
  | 'ax'
  | 'cg-event'
  | 'screencapturekit'
  | 'apple-events';

export type ExternalAppObservationMode =
  | 'inspect'
  | 'tree'
  | 'menuExplore'
  | 'captureElement'
  | 'highlight'
  | 'elementFromPoint';

export interface ExternalAppElementInfo {
  elementRef?: string;
  provider?: ExternalAppObservationProvider;
  name?: string;
  role?: string;
  value?: string;
  automationId?: string;
  className?: string;
  controlType?: string;
  state?: string[];
  bounds?: ExternalAppBounds;
  children?: ExternalAppElementInfo[];
  childCount?: number;
  truncated?: boolean;
  source?: ExternalAppObservationProvider;
  confidence?: number;
}

export interface ExternalAppObservationTarget {
  appId?: string;
  windowId?: string;
  processId?: number;
  processName?: string;
  title?: string;
  className?: string;
  bounds?: ExternalAppBounds;
}

export interface ExternalAppScreenshotInfo {
  path?: string;
  dataUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  bounds?: ExternalAppBounds;
  elementRef?: string;
  source?: ExternalAppObservationProvider;
  confidence?: number;
}

export interface ExternalAppHighlightInfo {
  bounds?: ExternalAppBounds;
  elementRef?: string;
  durationMs?: number;
  source?: ExternalAppObservationProvider;
  confidence?: number;
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
  bundleId?: string;
  args?: string[];
  cwd?: string;
  processName?: string;
  titleContains?: string;
  windowId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  placement?: ExternalAppPlacement;
  text?: string;
  keys?: string[];
  screenshotPath?: string;
  mode?: 'window' | 'process';
  elementRef?: string;
  depth?: number;
  limit?: number;
  includeValues?: boolean;
  includeFullTree?: boolean;
  includeTreePreview?: boolean;
  durationMs?: number;
}

export interface ExternalAppWindowInfo {
  windowId: string;
  processId?: number;
  title: string;
  bounds?: ExternalAppBounds;
  isForeground?: boolean;
}

export interface ExternalAppProfileStatusInfo {
  id: string;
  label: string;
  enabled: boolean;
  approvalLevel: ExternalAppApprovalLevel;
  allowedActions: ExternalAppActionName[];
}

export interface ExternalAppActionResult {
  ok: boolean;
  action: ExternalAppActionName;
  appId?: string;
  path?: string;
  controlEnabled?: boolean;
  approvalLevel: ExternalAppApprovalLevel;
  profiles?: ExternalAppProfileStatusInfo[];
  policy?: {
    approval: ExternalAppActionApproval;
    reason: string;
  };
  processId?: number;
  windows: ExternalAppWindowInfo[];
  screenshotPath?: string;
  message: string;
  error?: string;
  code?: string;
  target?: ExternalAppObservationTarget;
  observationMode?: ExternalAppObservationMode;
  observation?: Record<string, unknown> | ExternalAppElementInfo;
  element?: ExternalAppElementInfo;
  tree?: ExternalAppElementInfo | ExternalAppElementInfo[];
  screenshot?: ExternalAppScreenshotInfo;
  highlight?: ExternalAppHighlightInfo;
  truncated?: boolean;
  nextHint?: string;
  warnings?: string[];
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
  'click',
  'doubleClick',
  'tripleClick',
  'middleClick',
  'rightClick',
  'move',
  'mouseDown',
  'mouseUp',
  'dragAndDrop',
  'screenshot',
  'inspect',
  'elementFromPoint',
  'tree',
  'menuExplore',
  'highlight',
  'captureElement',
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
    allowedActions: [
      'launch',
      'focus',
      'resize',
      'hotkey',
      'close',
      'status',
      'find',
      'screenshot',
      'inspect',
      'elementFromPoint',
      'tree',
      'menuExplore',
      'highlight',
      'captureElement',
    ],
    approvalLevel: 'medium',
    enabled: true,
  },
  {
    id: 'powershell',
    label: 'PowerShell',
    platform: 'windows',
    executable: 'powershell.exe',
    allowedActions: [
      'launch',
      'focus',
      'resize',
      'typeText',
      'hotkey',
      'close',
      'status',
      'find',
      'screenshot',
      'inspect',
      'elementFromPoint',
      'tree',
      'menuExplore',
      'highlight',
      'captureElement',
    ],
    approvalLevel: 'high',
    enabled: true,
  },
  {
    id: 'cmd',
    label: 'Command Prompt',
    platform: 'windows',
    executable: 'cmd.exe',
    allowedActions: [
      'launch',
      'focus',
      'resize',
      'typeText',
      'hotkey',
      'close',
      'status',
      'find',
      'screenshot',
      'inspect',
      'elementFromPoint',
      'tree',
      'menuExplore',
      'highlight',
      'captureElement',
    ],
    approvalLevel: 'high',
    enabled: true,
  },
  {
    id: 'kakaotalk',
    label: 'KakaoTalk',
    platform: 'windows',
    executable: 'KakaoTalk.exe',
    allowedActions: ['launch', 'focus', 'resize', 'status', 'find'],
    approvalLevel: 'high',
    enabled: false,
  },
];

const VALID_ACTIONS = new Set<ExternalAppActionName>(EXTERNAL_APP_ACTIONS);

const ACTION_POLICY_DEFAULTS: Record<ExternalAppActionName, ExternalAppActionPolicy> = {
  launch: { allowed: true, approval: 'once', sensitivity: 'medium' },
  find: { allowed: true, approval: 'never', sensitivity: 'low' },
  focus: { allowed: true, approval: 'never', sensitivity: 'low' },
  resize: { allowed: true, approval: 'never', sensitivity: 'low' },
  typeText: { allowed: true, approval: 'always', sensitivity: 'medium' },
  hotkey: { allowed: true, approval: 'always', sensitivity: 'medium' },
  close: { allowed: true, approval: 'once', sensitivity: 'medium' },
  status: { allowed: true, approval: 'never', sensitivity: 'low' },
  click: { allowed: true, approval: 'once', sensitivity: 'medium' },
  doubleClick: { allowed: true, approval: 'once', sensitivity: 'medium' },
  tripleClick: { allowed: true, approval: 'once', sensitivity: 'medium' },
  middleClick: { allowed: true, approval: 'once', sensitivity: 'medium' },
  rightClick: { allowed: true, approval: 'once', sensitivity: 'medium' },
  move: { allowed: true, approval: 'once', sensitivity: 'medium' },
  mouseDown: { allowed: true, approval: 'once', sensitivity: 'medium' },
  mouseUp: { allowed: true, approval: 'once', sensitivity: 'medium' },
  dragAndDrop: { allowed: true, approval: 'once', sensitivity: 'medium' },
  screenshot: { allowed: true, approval: 'never', sensitivity: 'low' },
  inspect: { allowed: true, approval: 'never', sensitivity: 'low' },
  elementFromPoint: { allowed: true, approval: 'never', sensitivity: 'low' },
  tree: { allowed: true, approval: 'never', sensitivity: 'low' },
  menuExplore: { allowed: true, approval: 'never', sensitivity: 'low' },
  highlight: { allowed: true, approval: 'once', sensitivity: 'low' },
  captureElement: { allowed: true, approval: 'never', sensitivity: 'low' },
};

const TARGETED_OBSERVATION_ACTIONS = new Set<ExternalAppActionName>(['inspect', 'tree', 'menuExplore']);
const ELEMENT_TARGET_ACTIONS = new Set<ExternalAppActionName>(['highlight', 'captureElement']);
const POINTER_ACTIONS = new Set<ExternalAppActionName>([
  'click',
  'doubleClick',
  'tripleClick',
  'middleClick',
  'rightClick',
  'move',
  'mouseDown',
  'mouseUp',
]);
const TARGET_REQUIRED_ACTIONS = new Set<ExternalAppActionName>([
  'focus',
  'resize',
  'typeText',
  'hotkey',
  'close',
  'click',
  'doubleClick',
  'tripleClick',
  'middleClick',
  'rightClick',
  'move',
  'mouseDown',
  'mouseUp',
  'dragAndDrop',
  'screenshot',
]);

const TERMINAL_KEYBOARD_PROFILE_IDS = new Set(['powershell', 'pwsh', 'cmd', 'windows-terminal']);
const TERMINAL_KEYBOARD_EXECUTABLES = new Set([
  'powershell.exe',
  'pwsh.exe',
  'cmd.exe',
  'wt.exe',
  'windowsterminal.exe',
]);

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
  const bundleId = typeof profile.bundleId === 'string' ? profile.bundleId.trim() : '';

  return {
    id: String(profile.id || '').trim(),
    label: String(profile.label || profile.id || '').trim(),
    platform: normalizeExternalAppPlatform(profile.platform),
    ...(bundleId ? { bundleId } : {}),
    executable: String(profile.executable || '').trim(),
    defaultArgs: Array.isArray(profile.defaultArgs) ? profile.defaultArgs.map(String) : undefined,
    defaultCwd: typeof profile.defaultCwd === 'string' ? profile.defaultCwd.trim() : undefined,
    allowedActions: allowedActions.length ? allowedActions : ['launch', 'focus', 'status', 'find'],
    approvalLevel:
      profile.approvalLevel === 'low' || profile.approvalLevel === 'high' ? profile.approvalLevel : 'medium',
    enabled: profile.enabled !== false,
  };
}

function normalizeExternalAppPlatform(value: unknown): ExternalAppPlatform {
  return value === 'macos' || value === 'darwin' ? 'macos' : 'windows';
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

  const appId = trimString(input.appId);
  const path = trimString(input.path);
  const bundleId = trimString(input.bundleId);
  const windowId = trimString(input.windowId);
  const processName = trimString(input.processName);
  const titleContains = trimString(input.titleContains);
  const elementRef = trimString(input.elementRef);
  const hasTarget = Boolean(appId || path || bundleId || processName || titleContains || windowId);
  const hasElementTarget = Boolean(hasTarget || elementRef);

  if (action === 'launch' && !appId && !path && !bundleId) {
    throw new Error('appId or path is required for launch.');
  }
  if (TARGETED_OBSERVATION_ACTIONS.has(action) && !hasTarget) {
    throw new Error(`target is required for ${action}.`);
  }
  if (ELEMENT_TARGET_ACTIONS.has(action) && !hasElementTarget) {
    throw new Error(`target is required for ${action}.`);
  }
  if (TARGET_REQUIRED_ACTIONS.has(action) && !hasTarget) {
    throw new Error(`appId, path, or windowId is required for ${action}.`);
  }

  const x = normalizeOptionalCoordinate(input.x, 'x');
  const y = normalizeOptionalCoordinate(input.y, 'y');
  const width = normalizeOptionalNumber(input.width, 'width');
  const height = normalizeOptionalNumber(input.height, 'height');
  const startX = normalizeOptionalCoordinate(input.startX, 'startX');
  const startY = normalizeOptionalCoordinate(input.startY, 'startY');
  const endX = normalizeOptionalCoordinate(input.endX, 'endX');
  const endY = normalizeOptionalCoordinate(input.endY, 'endY');

  if (action === 'elementFromPoint' && (x === undefined || y === undefined)) {
    throw new Error('x and y are required for elementFromPoint.');
  }
  if (POINTER_ACTIONS.has(action) && (x === undefined || y === undefined)) {
    throw new Error(`x and y are required for ${action}.`);
  }
  if (action === 'dragAndDrop' && [startX, startY, endX, endY].some((value) => value === undefined)) {
    throw new Error('startX, startY, endX, and endY are required for dragAndDrop.');
  }

  const text = typeof input.text === 'string' ? input.text : undefined;
  if (action === 'typeText' && !text) {
    throw new Error('text is required for typeText.');
  }

  const keys = Array.isArray(input.keys) ? input.keys.map(String).filter(Boolean) : undefined;
  if (action === 'hotkey' && (!keys || keys.length === 0)) {
    throw new Error('keys are required for hotkey.');
  }

  const screenshotPath = trimString(input.screenshotPath);
  if (input.screenshotPath !== undefined && !screenshotPath) {
    throw new Error('screenshotPath must be a non-empty string when provided.');
  }

  const depth = normalizeClampedInteger(input.depth, 'depth', 1, 20);
  const limit = normalizeClampedInteger(input.limit, 'limit', 1, 1000);
  const durationMs = normalizeStrictInteger(input.durationMs, 'durationMs', 100, 10000);
  validateOptionalBoolean(input.includeValues, 'includeValues');
  validateOptionalBoolean(input.includeFullTree, 'includeFullTree');
  validateOptionalBoolean(input.includeTreePreview, 'includeTreePreview');
  const placement = normalizeExternalAppPlacement(input.placement);

  return {
    action,
    ...(appId ? { appId } : {}),
    ...(path ? { path } : {}),
    ...(bundleId ? { bundleId } : {}),
    ...(Array.isArray(input.args) ? { args: input.args.map(String) } : {}),
    ...(typeof input.cwd === 'string' && input.cwd.trim() ? { cwd: input.cwd.trim() } : {}),
    ...(processName ? { processName } : {}),
    ...(titleContains ? { titleContains } : {}),
    ...(windowId ? { windowId } : {}),
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(startX !== undefined ? { startX } : {}),
    ...(startY !== undefined ? { startY } : {}),
    ...(endX !== undefined ? { endX } : {}),
    ...(endY !== undefined ? { endY } : {}),
    ...(placement ? { placement } : {}),
    ...(text !== undefined ? { text } : {}),
    ...(keys ? { keys } : {}),
    ...(screenshotPath ? { screenshotPath } : {}),
    ...(input.mode === 'process'
      ? { mode: 'process' as const }
      : input.mode === 'window'
        ? { mode: 'window' as const }
        : {}),
    ...(elementRef ? { elementRef } : {}),
    ...(depth !== undefined ? { depth } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(typeof input.includeValues === 'boolean' ? { includeValues: input.includeValues } : {}),
    ...(typeof input.includeFullTree === 'boolean' ? { includeFullTree: input.includeFullTree } : {}),
    ...(typeof input.includeTreePreview === 'boolean' ? { includeTreePreview: input.includeTreePreview } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
  };
}

function trimString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeExternalAppPlacement(raw: unknown): ExternalAppPlacement | undefined {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const placement: ExternalAppPlacement = {};
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const value = Number(input[key]);
    if (Number.isFinite(value)) placement[key] = value;
  }
  return Object.keys(placement).length > 0 ? placement : undefined;
}

function normalizeOptionalCoordinate(
  value: unknown,
  fieldName: 'x' | 'y' | 'startX' | 'startY' | 'endX' | 'endY',
): number | undefined {
  const number = normalizeOptionalNumber(value, fieldName);
  return number === undefined ? undefined : Math.trunc(number);
}

function normalizeOptionalNumber(
  value: unknown,
  fieldName: 'x' | 'y' | 'width' | 'height' | 'startX' | 'startY' | 'endX' | 'endY',
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    throw new Error(`${fieldName} must be a valid number.`);
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} must be a valid number.`);
  }
  const normalized = Number(value);
  if (Number.isFinite(normalized)) return normalized;
  throw new Error(`${fieldName} must be a valid number.`);
}

function validateOptionalBoolean(
  value: unknown,
  fieldName: 'includeValues' | 'includeFullTree' | 'includeTreePreview',
): void {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean.`);
  }
}

function normalizeClampedInteger(
  value: unknown,
  fieldName: 'depth' | 'limit',
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) {
    throw new Error(`${fieldName} must be an integer from ${min} to ${max}.`);
  }
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error(`${fieldName} must be an integer from ${min} to ${max}.`);
  }
  return Math.min(max, Math.max(min, Math.trunc(normalized)));
}

function normalizeStrictInteger(value: unknown, fieldName: 'durationMs', min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) {
    throw new Error(`${fieldName} must be an integer from ${min} to ${max}.`);
  }
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new Error(`${fieldName} must be an integer from ${min} to ${max}.`);
  }
  return normalized;
}

export function classifyExternalAppApproval(
  action: ExternalAppAction,
  registeredProfile: boolean,
): ExternalAppApprovalLevel {
  if (action.action === 'captureElement') {
    if (action.path) return 'high';
    if (action.screenshotPath) return 'medium';
    return 'low';
  }
  if (action.action === 'inspect' || action.action === 'elementFromPoint') {
    return action.path ? 'high' : 'low';
  }
  if (action.action === 'tree') {
    if (action.path) return 'high';
    if (action.includeFullTree) return 'medium';
    return 'low';
  }
  if (action.action === 'menuExplore' || action.action === 'highlight') {
    return action.path ? 'high' : 'low';
  }
  if (!registeredProfile || action.path) return 'high';
  if (['status', 'find', 'focus', 'resize', 'screenshot'].includes(action.action)) return 'low';
  if (action.action === 'typeText' && (action.text?.length ?? 0) > 5000) return 'high';
  return 'medium';
}

export function strongestExternalAppApprovalLevel(
  first: ExternalAppApprovalLevel,
  second: ExternalAppApprovalLevel | undefined,
): ExternalAppApprovalLevel {
  const rank: Record<ExternalAppApprovalLevel, number> = { low: 0, medium: 1, high: 2 };
  return second && rank[second] > rank[first] ? second : first;
}

export function externalAppActionDecision(
  action: ExternalAppAction,
  profile: ExternalAppProfile | undefined,
): ExternalAppActionDecision {
  if (action.appId && !profile) {
    return {
      allowed: false,
      approvalLevel: 'high',
      approval: 'always',
      reason: `External app profile not found: ${action.appId}`,
    };
  }
  if (action.appId && profile && action.appId !== profile.id) {
    return {
      allowed: false,
      approvalLevel: 'high',
      approval: 'always',
      reason: `External app profile mismatch: ${action.appId} resolved to ${profile.id}`,
    };
  }
  if (profile && !profile.enabled) {
    const approvalLevel = externalAppApprovalLevel(action, profile);
    return {
      allowed: false,
      approvalLevel,
      approval: externalAppApproval(action, approvalLevel),
      reason: `External app profile is disabled: ${profile.id}`,
    };
  }
  if (profile && !profile.allowedActions.includes(action.action)) {
    const approvalLevel = externalAppApprovalLevel(action, profile);
    return {
      allowed: false,
      approvalLevel,
      approval: externalAppApproval(action, approvalLevel),
      reason: `External app action is not allowed for ${profile.id}: ${action.action}`,
    };
  }

  const approvalLevel = externalAppApprovalLevel(action, profile);
  return {
    allowed: ACTION_POLICY_DEFAULTS[action.action].allowed,
    approvalLevel,
    approval: externalAppApproval(action, approvalLevel),
    reason: `External app action allowed: ${action.action}`,
  };
}

function externalAppApprovalLevel(
  action: ExternalAppAction,
  profile: ExternalAppProfile | undefined,
): ExternalAppApprovalLevel {
  const base = ACTION_POLICY_DEFAULTS[action.action];
  const registeredProfile = Boolean(profile);
  const classifiedApproval = classifyExternalAppApproval(action, registeredProfile);
  const profileApproval = isTerminalKeyboardAction(action, profile) ? 'high' : profile?.approvalLevel;
  return strongestExternalAppApprovalLevel(
    strongestExternalAppApprovalLevel(classifiedApproval, base.sensitivity),
    profileApproval,
  );
}

function externalAppApproval(
  action: ExternalAppAction,
  approvalLevel: ExternalAppApprovalLevel,
): ExternalAppActionApproval {
  const base = ACTION_POLICY_DEFAULTS[action.action];
  if (base.approval === 'never') return 'never';
  if (approvalLevel === 'high') return 'always';
  if (base.approval === 'always') return 'always';
  return base.approval;
}

function isTerminalKeyboardAction(action: ExternalAppAction, profile: ExternalAppProfile | undefined) {
  if (action.action !== 'typeText' && action.action !== 'hotkey') return false;
  const id = profile?.id.toLowerCase() ?? '';
  const executable = profile?.executable.toLowerCase() ?? '';
  const executableName = executable.replace(/\\/g, '/').split('/').pop() ?? executable;
  return TERMINAL_KEYBOARD_PROFILE_IDS.has(id) || TERMINAL_KEYBOARD_EXECUTABLES.has(executableName);
}
