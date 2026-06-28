import {
  type ComputerUseActionRecord,
  createComputerUseState,
  normalizeComputerUseAction,
  recordComputerUseAction,
} from '../../shared/computerUseControl';

export interface ComputerUseAdapter {
  capture?(args: unknown): Promise<ComputerUseAdapterCaptureResult> | ComputerUseAdapterCaptureResult;
  listApps?(): Promise<ComputerUseAdapterListAppsResult> | ComputerUseAdapterListAppsResult;
  act?(kind: string, args: unknown): Promise<ComputerUseAdapterActionResult> | ComputerUseAdapterActionResult;
}

export interface ComputerUseAdapterCaptureResult {
  ok: boolean;
  text?: string;
  elements?: unknown[];
  screenshot?: string;
  error?: string;
}

export interface ComputerUseAdapterListAppsResult {
  ok: boolean;
  apps?: unknown[];
  error?: string;
}

export interface ComputerUseAdapterActionResult {
  ok: boolean;
  readback?: string;
  error?: string;
}

export interface ComputerUseCallResult {
  ok: boolean;
  path: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
}

export interface ComputerUseCallOptions {
  approved?: boolean;
}

export interface ComputerUseService {
  call(path: string, args?: unknown, options?: ComputerUseCallOptions): Promise<ComputerUseCallResult>;
}

export function createComputerUseService(options: { adapter?: ComputerUseAdapter } = {}): ComputerUseService {
  const state = createComputerUseState();
  const adapter = options.adapter;

  return {
    async call(path, args = {}, options = {}) {
      if (path === 'xd.computer.actions.list') {
        return { ok: true, path, result: { records: [...state.records] } };
      }

      if (path === 'xd.computer.actions.get') {
        const id = readString(args, 'id');
        return {
          ok: true,
          path,
          result: { record: state.records.find((record) => record.id === id) || null },
        };
      }

      if (!path.startsWith('xd.computer.')) {
        return { ok: false, path, error: `Unsupported computer-use capability path: ${path}` };
      }

      const actionName = path.slice('xd.computer.'.length);
      let record: ComputerUseActionRecord;
      try {
        const action = normalizeComputerUseAction({ ...normalizeArgs(args), action: actionName });
        record = recordComputerUseAction(state, action);
        if (!record.policy.allowed) {
          return { ok: false, path, result: { record }, error: record.policy.reason };
        }
        if (!hasNativeAdapter(adapter, action.action)) {
          return nativeUnavailable(path, record);
        }
        if (record.result === 'approval_required' && options.approved !== true) {
          return {
            ok: false,
            path,
            result: { record },
            approvalRequired: true,
            error: 'Computer use action requires approval.',
          };
        }

        if (action.action === 'capture') {
          if (!adapter?.capture) return nativeUnavailable(path, record);
          const capture = await adapter.capture(args);
          return {
            ok: capture.ok,
            path,
            result: { ...capture, record },
            ...(capture.error ? { error: capture.error } : {}),
          };
        }

        if (action.action === 'list_apps') {
          if (!adapter?.listApps) return nativeUnavailable(path, record);
          const apps = await adapter.listApps();
          return {
            ok: apps.ok,
            path,
            result: { ...apps, record },
            ...(apps.error ? { error: apps.error } : {}),
          };
        }

        if (action.action === 'stop') {
          return { ok: true, path, result: { record } };
        }

        if (!adapter?.act) return nativeUnavailable(path, record);
        const result = await adapter.act(action.action, args);
        record.result = result.ok ? 'executed' : 'failed';
        record.executedAt = new Date().toISOString();
        if (typeof result.readback === 'string' && result.readback.trim()) record.readback = result.readback;
        return {
          ok: result.ok,
          path,
          result: { ...result, record },
          ...(result.error ? { error: result.error } : {}),
        };
      } catch (error) {
        return { ok: false, path, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

function nativeUnavailable(path: string, record: ComputerUseActionRecord): ComputerUseCallResult {
  record.result = 'failed';
  record.policy.reason = 'Native computer-use is not available.';
  return {
    ok: false,
    path,
    result: { record },
    error: 'Native computer-use is not available.',
  };
}

function hasNativeAdapter(adapter: ComputerUseAdapter | undefined, action: string): boolean {
  if (action === 'stop') return true;
  if (action === 'capture') return Boolean(adapter?.capture);
  if (action === 'list_apps') return Boolean(adapter?.listApps);
  return Boolean(adapter?.act);
}

function normalizeArgs(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown, key: string): string {
  const args = normalizeArgs(value);
  const candidate = args[key];
  return typeof candidate === 'string' ? candidate.trim() : '';
}
