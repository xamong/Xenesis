import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXTERNAL_APP_ACTIONS,
  type ExternalAppAction,
  type ExternalAppActionName,
  type ExternalAppActionResult,
  type ExternalAppApprovalLevel,
  type ExternalAppBounds,
  type ExternalAppWindowInfo,
} from '../../shared/externalAppControl';

export interface WindowsControlHostPathOptions {
  appIsPackaged?: boolean;
  resourcesPath?: string;
  cwd?: string;
  existsSync?: (candidate: string) => boolean;
}

export interface WindowsControlHostRunInput {
  hostPath: string;
  payload: unknown;
  timeoutMs: number;
}

export interface WindowsControlHostClientOptions {
  hostPath?: string;
  appIsPackaged?: boolean;
  resourcesPath?: string;
  cwd?: string;
  timeoutMs?: number;
  runHost?: (input: WindowsControlHostRunInput) => Promise<string>;
}

export interface WindowsControlHostClient {
  run(action: ExternalAppAction & { executable?: string }): Promise<ExternalAppActionResult>;
}

type RuntimeProcess = NodeJS.Process & {
  defaultApp?: boolean;
  resourcesPath?: string;
};

const VALID_ACTIONS = new Set<ExternalAppActionName>(EXTERNAL_APP_ACTIONS);

export function resolveWindowsControlHostPath(options: WindowsControlHostPathOptions = {}): string {
  const existsSync = options.existsSync ?? fs.existsSync;
  const cwd = options.cwd ?? process.cwd();
  const runtimeProcess = process as RuntimeProcess;
  const resourcesPath = options.resourcesPath || runtimeProcess.resourcesPath || cwd;

  if (options.appIsPackaged) {
    const packagedCandidate = path.join(resourcesPath, 'windows-control-host', 'Xenesis.WindowsControlHost.exe');
    return existsSync(packagedCandidate) ? packagedCandidate : '';
  }

  const devCandidates = [
    path.join(
      cwd,
      'tools',
      'windows-control-host',
      'bin',
      'Debug',
      'net8.0-windows',
      'win-x64',
      'Xenesis.WindowsControlHost.exe',
    ),
    path.join(cwd, 'tools', 'windows-control-host', 'bin', 'Debug', 'net8.0-windows', 'Xenesis.WindowsControlHost.exe'),
    path.join(
      cwd,
      'tools',
      'windows-control-host',
      'bin',
      'Release',
      'net8.0-windows',
      'win-x64',
      'Xenesis.WindowsControlHost.exe',
    ),
    path.join(
      cwd,
      'tools',
      'windows-control-host',
      'bin',
      'Release',
      'net8.0-windows',
      'Xenesis.WindowsControlHost.exe',
    ),
    path.join(cwd, 'tools', 'windows-control-host', 'publish', 'Xenesis.WindowsControlHost.exe'),
  ];

  return devCandidates.find((candidate) => existsSync(candidate)) ?? '';
}

export function createWindowsControlHostClient(
  options: WindowsControlHostClientOptions = {},
): WindowsControlHostClient {
  const runtimeProcess = process as RuntimeProcess;
  const hostPath =
    options.hostPath ??
    resolveWindowsControlHostPath({
      appIsPackaged:
        options.appIsPackaged ?? Boolean(runtimeProcess.resourcesPath && runtimeProcess.defaultApp !== true),
      resourcesPath: options.resourcesPath ?? runtimeProcess.resourcesPath,
      cwd: options.cwd,
    });
  const timeoutMs = options.timeoutMs ?? 10000;
  const runHost = options.runHost ?? defaultRunHost;

  return {
    async run(action) {
      if (!hostPath) {
        return failedResult(action.action, 'host_not_found', 'Windows control host executable was not found.');
      }

      try {
        const output = await runHost({ hostPath, payload: buildHostPayload(action), timeoutMs });
        return normalizeHostResult(output, action.action);
      } catch (error) {
        return failedResult(action.action, hostFailureCode(error), errorMessage(error));
      }
    },
  };
}

export async function defaultRunHost(input: WindowsControlHostRunInput): Promise<string> {
  return runHostProcess(input, spawn);
}

function runHostProcess(input: WindowsControlHostRunInput, spawnHost: typeof spawn): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawnHost(input.hostPath, ['--json'], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(hostError(`Windows control host timed out after ${input.timeoutMs}ms.`, 'host_timeout'));
    }, input.timeoutMs);

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.stdin?.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const output = stdout.trim();
      if (signal) {
        reject(new Error(`Windows control host exited with signal ${signal}.${outputPreview(stdout, stderr)}`));
        return;
      }
      if (output) {
        resolve(output);
        return;
      }
      reject(new Error(`Windows control host exited with code ${code}.${outputPreview(stdout, stderr)}`));
    });

    child.stdin?.end(JSON.stringify(input.payload));
  });
}

export const __windowsControlHostTestInternals = {
  runHostProcess,
};

function buildHostPayload(action: ExternalAppAction & { executable?: string }): unknown {
  return {
    action: action.action,
    target: withoutUndefined({
      appId: action.appId,
      executable: action.executable,
      path: action.path,
      processName: action.processName,
      titleContains: action.titleContains,
      windowId: action.windowId,
      elementRef: action.elementRef,
      x: normalizeHostCoordinate(action.x),
      y: normalizeHostCoordinate(action.y),
    }),
    options: withoutUndefined({
      depth: action.depth,
      limit: action.limit,
      includeValues: action.includeValues,
      includeFullTree: action.includeFullTree,
      includeTreePreview: action.includeTreePreview,
      durationMs: action.durationMs,
      screenshotPath: action.screenshotPath,
    }),
  };
}

function withoutUndefined<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function normalizeHostCoordinate(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const rounded = Math.round(value);
  return Math.min(2147483647, Math.max(-2147483648, rounded));
}

function normalizeHostResult(output: string, fallbackAction: ExternalAppAction['action']): ExternalAppActionResult {
  try {
    const parsed = JSON.parse(output.trim() || '{}') as Partial<ExternalAppActionResult>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return invalidJsonResult(fallbackAction, output);
    }
    const action = isExternalAppActionName(parsed.action) ? parsed.action : fallbackAction;
    if (typeof parsed.ok !== 'boolean') {
      return failedResult(action, 'host_invalid_json', 'Windows control host response is missing or invalid ok.');
    }
    if (parsed.ok && (!isExternalAppActionName(parsed.action) || parsed.action !== fallbackAction)) {
      return failedResult(
        fallbackAction,
        'host_invalid_json',
        'Windows control host response has invalid or mismatched action.',
      );
    }
    const approvalLevel = isExternalAppApprovalLevel(parsed.approvalLevel) ? parsed.approvalLevel : 'low';
    const windows = normalizeWindows(parsed.windows);
    const message = typeof parsed.message === 'string' ? parsed.message : defaultMessage(action, parsed.ok);
    return {
      ...parsed,
      ok: parsed.ok,
      action,
      approvalLevel,
      windows,
      message,
      ...(parsed.ok ? {} : { code: parsed.code ?? 'host_failed' }),
    };
  } catch {
    return invalidJsonResult(fallbackAction, output);
  }
}

function normalizeWindows(raw: unknown): ExternalAppWindowInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => {
      const windowId = String(item.windowId ?? item.handle ?? '');
      const processId = normalizeOptionalNumber(item.processId);
      const bounds = normalizeBounds(item.bounds);
      return {
        windowId,
        ...(processId !== undefined ? { processId } : {}),
        title: String(item.title ?? ''),
        ...(bounds ? { bounds } : {}),
        ...(typeof item.isForeground === 'boolean' ? { isForeground: item.isForeground } : {}),
      };
    })
    .filter((item) => item.windowId);
}

function normalizeBounds(raw: unknown): ExternalAppBounds | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const bounds = raw as Record<string, unknown>;
  return {
    x: normalizeNumber(bounds.x),
    y: normalizeNumber(bounds.y),
    width: normalizeNumber(bounds.width),
    height: normalizeNumber(bounds.height),
  };
}

function normalizeOptionalNumber(raw: unknown): number | undefined {
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function normalizeNumber(raw: unknown): number {
  return normalizeOptionalNumber(raw) ?? 0;
}

function isExternalAppActionName(value: unknown): value is ExternalAppActionName {
  return typeof value === 'string' && VALID_ACTIONS.has(value as ExternalAppActionName);
}

function isExternalAppApprovalLevel(value: unknown): value is ExternalAppApprovalLevel {
  return value === 'low' || value === 'medium' || value === 'high';
}

function invalidJsonResult(action: ExternalAppAction['action'], output: string): ExternalAppActionResult {
  return failedResult(
    action,
    'host_invalid_json',
    `Windows control host returned invalid JSON: ${output.slice(0, 300)}`,
  );
}

function failedResult(
  action: ExternalAppAction['action'],
  code: 'host_not_found' | 'host_invalid_json' | 'host_failed' | 'host_timeout',
  error: string,
): ExternalAppActionResult {
  return {
    ok: false,
    action,
    approvalLevel: 'low',
    windows: [],
    code,
    error,
    message: defaultMessage(action, false),
  };
}

function defaultMessage(action: ExternalAppAction['action'], ok: boolean): string {
  return ok ? `Windows control host ${action} completed.` : `Windows control host ${action} failed.`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hostFailureCode(error: unknown): 'host_failed' | 'host_timeout' {
  return error && typeof error === 'object' && (error as { code?: unknown }).code === 'host_timeout'
    ? 'host_timeout'
    : 'host_failed';
}

function hostError(message: string, code: 'host_timeout'): Error & { code: 'host_timeout' } {
  return Object.assign(new Error(message), { code });
}

function outputPreview(stdout: string, stderr: string): string {
  const parts: string[] = [];
  const stdoutPreview = stdout.trim().slice(0, 300);
  const stderrPreview = stderr.trim().slice(0, 300);
  if (stdoutPreview) parts.push(`stdout: ${stdoutPreview}`);
  if (stderrPreview) parts.push(`stderr: ${stderrPreview}`);
  return parts.length ? ` ${parts.join(' ')}` : '';
}
