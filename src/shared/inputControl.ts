export type InputControlEnvironment = 'browser' | 'desktop';
export type InputTargetKind = 'active' | 'browser' | 'desktop' | 'app' | 'pane' | 'content';
export type InputRunSupport = 'full' | 'partial' | 'none';

export const INPUT_ACTION_TYPES = [
  'click',
  'double_click',
  'right_click',
  'move',
  'mouse_down',
  'mouse_up',
  'drag_and_drop',
  'type',
  'press_key',
  'key_down',
  'key_up',
  'hotkey',
  'scroll',
  'wait',
  'take_screenshot',
  'navigate',
  'go_back',
  'go_forward',
] as const;

export type InputActionType = (typeof INPUT_ACTION_TYPES)[number];

export interface InputControlTarget {
  kind: InputTargetKind;
  contentId?: string;
  paneId?: string;
  appId?: string;
  windowId?: string;
  url?: string;
  title?: string;
}

export interface InputControlAction {
  type: InputActionType;
  intent?: string;
  x?: number;
  y?: number;
  start_x?: number;
  start_y?: number;
  end_x?: number;
  end_y?: number;
  text?: string;
  pressEnter?: boolean;
  key?: string;
  keys?: string[];
  seconds?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  magnitudeInPixels?: number;
  url?: string;
}

export interface InputRunRequest {
  environment: InputControlEnvironment;
  target: InputControlTarget;
  actions: InputControlAction[];
  continueOnError: boolean;
}

export interface InputBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface InputPoint {
  x: number;
  y: number;
}

const INPUT_ACTION_SET = new Set<InputActionType>(INPUT_ACTION_TYPES);
const TARGET_KINDS = new Set<InputTargetKind>(['active', 'browser', 'desktop', 'app', 'pane', 'content']);
const COORDINATE_ACTIONS = new Set<InputActionType>([
  'click',
  'double_click',
  'right_click',
  'move',
  'mouse_down',
  'mouse_up',
]);
const DRAG_ACTIONS = new Set<InputActionType>(['drag_and_drop']);

const SECRET_PATTERNS = [
  /\b[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD)\s*=\s*\S+/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-[A-Za-z0-9_-]{6,}\b/,
  /\b(?:\d[ -]?){13,19}\b/,
  /\bpassword\s*[:=]\s*\S+/i,
];

export function normalizeInputTarget(raw: unknown): InputControlTarget {
  const input = record(raw);
  const kind = readString(input.kind) as InputTargetKind;
  if (!TARGET_KINDS.has(kind)) {
    throw new Error(`Unsupported input target kind: ${kind || '(missing)'}`);
  }

  const target: InputControlTarget = { kind };
  copyString(input, target, 'contentId');
  copyString(input, target, 'paneId');
  copyString(input, target, 'appId');
  copyString(input, target, 'windowId');
  copyString(input, target, 'url');
  copyString(input, target, 'title');

  if (kind === 'app' && !target.appId) {
    throw new Error('appId is required for app input targets.');
  }

  return target;
}

export function normalizeInputAction(raw: unknown): InputControlAction {
  const input = record(raw);
  const type = readString(input.type) as InputActionType;
  if (!INPUT_ACTION_SET.has(type)) {
    throw new Error(`Unsupported input action: ${type || '(missing)'}`);
  }

  const action: InputControlAction = { type };
  copyString(input, action, 'intent');

  if (COORDINATE_ACTIONS.has(type)) {
    action.x = readRequiredNormalizedCoordinate(input.x, 'x', type);
    action.y = readRequiredNormalizedCoordinate(input.y, 'y', type);
  }

  if (DRAG_ACTIONS.has(type)) {
    action.start_x = readRequiredNormalizedCoordinate(input.start_x, 'start_x', type);
    action.start_y = readRequiredNormalizedCoordinate(input.start_y, 'start_y', type);
    action.end_x = readRequiredNormalizedCoordinate(input.end_x, 'end_x', type);
    action.end_y = readRequiredNormalizedCoordinate(input.end_y, 'end_y', type);
  }

  if (type === 'type') {
    const text = typeof input.text === 'string' ? input.text : '';
    if (!text) throw new Error('text is required for type.');
    action.text = text;
    if (input.pressEnter === true) action.pressEnter = true;
  }

  if (type === 'hotkey') {
    const keys = normalizeInputKeys(input.keys);
    if (!keys.length) throw new Error('keys are required for hotkey.');
    action.keys = keys;
  }

  if (type === 'press_key' || type === 'key_down' || type === 'key_up') {
    const key = readString(input.key);
    if (!key) throw new Error(`key is required for ${type}.`);
    action.key = key;
  }

  if (type === 'wait') {
    action.seconds = normalizeWaitSeconds(input.seconds);
  }

  if (type === 'scroll') {
    const direction = readString(input.direction);
    if (direction !== 'up' && direction !== 'down' && direction !== 'left' && direction !== 'right') {
      throw new Error('direction must be up, down, left, or right for scroll.');
    }
    action.direction = direction;
    action.magnitudeInPixels = normalizePositiveInteger(input.magnitudeInPixels, 'magnitudeInPixels', 300, 3000);
  }

  if (type === 'navigate') {
    const url = readString(input.url);
    if (!url) throw new Error('url is required for navigate.');
    action.url = url;
  }

  return action;
}

export function normalizeInputRunRequest(raw: unknown): InputRunRequest {
  const input = record(raw);
  const environment = readString(input.environment);
  if (environment !== 'browser' && environment !== 'desktop') {
    throw new Error('environment must be browser or desktop.');
  }
  const actions = Array.isArray(input.actions) ? input.actions.map(normalizeInputAction) : [];
  if (!actions.length) throw new Error('actions must contain at least one input action.');
  return {
    environment,
    target: normalizeInputTarget(input.target),
    actions,
    continueOnError: input.continueOnError === true,
  };
}

export function normalizedPointToPixel(point: InputPoint, bounds: InputBounds): InputPoint {
  if (!Number.isFinite(bounds.width) || bounds.width <= 0) throw new Error('bounds.width must be positive.');
  if (!Number.isFinite(bounds.height) || bounds.height <= 0) throw new Error('bounds.height must be positive.');
  const originX = Number.isFinite(bounds.x) ? Number(bounds.x) : 0;
  const originY = Number.isFinite(bounds.y) ? Number(bounds.y) : 0;
  return {
    x: originX + Math.round((point.x / 999) * Math.max(0, bounds.width - 1)),
    y: originY + Math.round((point.y / 999) * Math.max(0, bounds.height - 1)),
  };
}

export function supportedInputActionsForTarget(
  environment: InputControlEnvironment,
  target: InputControlTarget,
): InputActionType[] {
  if (environment === 'desktop' && target.kind === 'app' && target.appId) {
    return ['type', 'hotkey', 'wait'];
  }
  return [];
}

export function inputRunSupportForTarget(
  environment: InputControlEnvironment,
  target: InputControlTarget,
): InputRunSupport {
  return supportedInputActionsForTarget(environment, target).length ? 'partial' : 'none';
}

export function looksSecretShapedInputText(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

export function looksDangerousInputHotkey(keys: readonly string[]): boolean {
  const normalized = keys.map(normalizeKeyToken).filter(Boolean);
  const joined = normalized.join('+');
  return (
    joined === 'win+l' || joined === 'meta+l' || joined === 'ctrl+alt+delete' || joined === 'ctrl+alt+del'
  );
}

export function redactInputAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactInputAuditValue);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (/^(text|value|keys)$/i.test(key)) {
      result[key] = '[redacted: input-control audit]';
    } else {
      result[key] = redactInputAuditValue(nestedValue);
    }
  }
  return result;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function copyString(source: Record<string, unknown>, target: object, key: string): void {
  const value = readString(source[key]);
  if (value) (target as Record<string, unknown>)[key] = value;
}

function readRequiredNormalizedCoordinate(value: unknown, field: string, action: InputActionType): number {
  if (value === undefined || value === null || value === '') throw new Error(`${field} is required for ${action}.`);
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0 || numberValue > 999) {
    throw new Error(`${field} must be an integer from 0 to 999.`);
  }
  return numberValue;
}

function normalizeInputKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split('+')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeWaitSeconds(value: unknown): number {
  const numberValue = Number(value ?? 1);
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 5) {
    throw new Error('seconds must be from 0 to 5 for wait.');
  }
  return numberValue;
}

function normalizePositiveInteger(value: unknown, field: string, fallback: number, max: number): number {
  const numberValue = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > max) {
    throw new Error(`${field} must be an integer from 1 to ${max}.`);
  }
  return numberValue;
}

function normalizeKeyToken(value: string): string {
  const token = value.trim().toLowerCase();
  if (token === 'control') return 'ctrl';
  if (token === 'cmd' || token === 'command' || token === 'windows') return 'win';
  if (token === 'return') return 'enter';
  if (token === 'escape') return 'esc';
  return token;
}
