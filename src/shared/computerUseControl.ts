export type ComputerUseActionKind =
  | 'capture'
  | 'list_apps'
  | 'focus_app'
  | 'click'
  | 'type'
  | 'key'
  | 'scroll'
  | 'drag'
  | 'set_value'
  | 'stop';

export interface ComputerUseAction {
  action: ComputerUseActionKind;
  app?: string;
  element?: number;
  from?: number;
  to?: number;
  text?: string;
  keys?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
}

export interface ComputerUseActionRecord {
  id: string;
  kind: ComputerUseActionKind;
  requestedAt: string;
  executedAt?: string;
  policy: {
    allowed: boolean;
    approval: 'none' | 'required' | 'denied';
    reason: string;
  };
  result: 'executed' | 'approval_required' | 'denied' | 'failed';
  readback?: string;
}

export interface ComputerUseState {
  stopped: boolean;
  records: ComputerUseActionRecord[];
}

const COMPUTER_USE_ACTIONS = new Set<ComputerUseActionKind>([
  'capture',
  'list_apps',
  'focus_app',
  'click',
  'type',
  'key',
  'scroll',
  'drag',
  'set_value',
  'stop',
]);

const SECRET_PATTERNS = [
  /\b[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD)\s*=\s*\S+/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
  /\bsk-[A-Za-z0-9_-]{6,}\b/,
  /\b(?:\d[ -]?){13,19}\b/,
  /\bpassword\s*[:=]\s*\S+/i,
];

export function shouldBlockComputerUseText(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

export function createComputerUseState(): ComputerUseState {
  return { stopped: false, records: [] };
}

export function normalizeComputerUseAction(raw: unknown): ComputerUseAction {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const action = String(input.action || '').trim() as ComputerUseActionKind;
  if (!COMPUTER_USE_ACTIONS.has(action)) {
    throw new Error(`Unsupported computer use action: ${action || '(missing)'}`);
  }

  const direction =
    input.direction === 'up' || input.direction === 'down' || input.direction === 'left' || input.direction === 'right'
      ? input.direction
      : undefined;

  return {
    action,
    ...(typeof input.app === 'string' && input.app.trim() ? { app: input.app.trim() } : {}),
    ...(Number.isInteger(input.element) ? { element: Number(input.element) } : {}),
    ...(Number.isInteger(input.from) ? { from: Number(input.from) } : {}),
    ...(Number.isInteger(input.to) ? { to: Number(input.to) } : {}),
    ...(typeof input.text === 'string' ? { text: input.text } : {}),
    ...(typeof input.keys === 'string' && input.keys.trim() ? { keys: input.keys.trim() } : {}),
    ...(direction ? { direction } : {}),
    ...(Number.isInteger(input.amount) ? { amount: Number(input.amount) } : {}),
  };
}

export function recordComputerUseAction(
  state: ComputerUseState,
  action: ComputerUseAction,
  now = new Date().toISOString(),
): ComputerUseActionRecord {
  let record: ComputerUseActionRecord;
  if (state.stopped && action.action !== 'stop') {
    record = deniedRecord(state, action, now, 'Computer use is stopped.');
  } else if (
    (action.action === 'type' || action.action === 'set_value') &&
    shouldBlockComputerUseText(action.text || '')
  ) {
    record = deniedRecord(state, action, now, 'Computer use refused secret-shaped text.');
  } else {
    const readOnly = action.action === 'capture' || action.action === 'list_apps' || action.action === 'stop';
    record = {
      id: `cu-${state.records.length + 1}`,
      kind: action.action,
      requestedAt: now,
      policy: {
        allowed: true,
        approval: readOnly ? 'none' : 'required',
        reason: 'Computer use action accepted.',
      },
      result: readOnly ? 'executed' : 'approval_required',
    };
  }

  if (action.action === 'stop') state.stopped = true;
  state.records.push(record);
  return record;
}

function deniedRecord(
  state: ComputerUseState,
  action: ComputerUseAction,
  now: string,
  reason: string,
): ComputerUseActionRecord {
  return {
    id: `cu-${state.records.length + 1}`,
    kind: action.action,
    requestedAt: now,
    policy: { allowed: false, approval: 'denied', reason },
    result: 'denied',
  };
}
