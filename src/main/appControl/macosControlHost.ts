import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  ExternalAppAction,
  ExternalAppActionName,
  ExternalAppApprovalLevel,
  ExternalAppBounds,
  ExternalAppWindowInfo,
} from '../../shared/externalAppControl';

export type MacosControlHostActionName = ExternalAppActionName | 'permissionStatus' | 'selfTest';

export type MacosControlHostAction = Partial<Omit<ExternalAppAction, 'action'>> & {
  action: MacosControlHostActionName;
  bundleId?: string;
  executable?: string;
};

export interface MacosControlHostResult {
  ok: boolean;
  action: MacosControlHostActionName | string;
  approvalLevel: ExternalAppApprovalLevel;
  windows: ExternalAppWindowInfo[];
  message: string;
  error?: string;
  code?: string;
  providers?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  target?: Record<string, unknown>;
  observationMode?: string;
  observation?: Record<string, unknown>;
  element?: Record<string, unknown>;
  tree?: Record<string, unknown>[];
  screenshotPath?: string;
  screenshot?: Record<string, unknown>;
  highlight?: Record<string, unknown>;
  truncated?: boolean;
  warnings?: string[];
}

export interface MacosControlHostPathOptions {
  appIsPackaged?: boolean;
  resourcesPath?: string;
  cwd?: string;
  existsSync?: (candidate: string) => boolean;
}

export interface MacosControlHostRunInput {
  hostPath: string;
  payload: unknown;
  timeoutMs: number;
}

export interface MacosControlHostClientOptions {
  hostPath?: string;
  appIsPackaged?: boolean;
  resourcesPath?: string;
  cwd?: string;
  timeoutMs?: number;
  runHost?: (input: MacosControlHostRunInput) => Promise<string>;
}

export interface MacosControlHostClient {
  run(action: MacosControlHostAction): Promise<MacosControlHostResult>;
}

type RuntimeProcess = NodeJS.Process & {
  defaultApp?: boolean;
  resourcesPath?: string;
};

export function resolveMacosControlHostPath(options: MacosControlHostPathOptions = {}): string {
  const existsSync = options.existsSync ?? fs.existsSync;
  const cwd = options.cwd ?? process.cwd();
  const runtimeProcess = process as RuntimeProcess;
  const resourcesPath = options.resourcesPath || runtimeProcess.resourcesPath || cwd;

  if (options.appIsPackaged) {
    const packagedCandidate = path.join(resourcesPath, 'macos-control-host', 'xenesis-macos-control-host');
    return existsSync(packagedCandidate) ? packagedCandidate : '';
  }

  const devCandidates = [
    path.join(cwd, 'tools', 'macos-control-host', '.build', 'debug', 'xenesis-macos-control-host'),
    path.join(cwd, 'tools', 'macos-control-host', '.build', 'release', 'xenesis-macos-control-host'),
    path.join(cwd, 'tools', 'macos-control-host', 'publish', 'xenesis-macos-control-host'),
  ];

  return devCandidates.find((candidate) => existsSync(candidate)) ?? '';
}

export function createMacosControlHostClient(options: MacosControlHostClientOptions = {}): MacosControlHostClient {
  const runtimeProcess = process as RuntimeProcess;
  const hostPath =
    options.hostPath ??
    resolveMacosControlHostPath({
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
        return failedResult(action.action, 'host_not_found', 'macOS control host executable was not found.');
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

export async function defaultRunHost(input: MacosControlHostRunInput): Promise<string> {
  return runHostProcess(input, spawn);
}

function runHostProcess(input: MacosControlHostRunInput, spawnHost: typeof spawn): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawnHost(input.hostPath, ['--json'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(hostError(`macOS control host timed out after ${input.timeoutMs}ms.`, 'host_timeout'));
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
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const output = stdout.trim();
      if (signal) {
        reject(new Error(`macOS control host exited with signal ${signal}.${outputPreview(stdout, stderr)}`));
        return;
      }
      if (output) {
        resolve(output);
        return;
      }
      reject(new Error(`macOS control host exited with code ${code}.${outputPreview(stdout, stderr)}`));
    });

    child.stdin?.end(JSON.stringify(input.payload));
  });
}

export const __macosControlHostTestInternals = {
  runHostProcess,
};

function buildHostPayload(action: MacosControlHostAction): unknown {
  return {
    action: action.action,
    target: withoutUndefined({
      appId: action.appId,
      bundleId: action.bundleId,
      executable: action.executable,
      path: action.path,
      processName: action.processName,
      titleContains: action.titleContains,
      windowId: action.windowId,
      elementRef: action.elementRef,
      x: normalizeHostCoordinate(action.x),
      y: normalizeHostCoordinate(action.y),
      startX: normalizeHostCoordinate(action.startX),
      startY: normalizeHostCoordinate(action.startY),
      endX: normalizeHostCoordinate(action.endX),
      endY: normalizeHostCoordinate(action.endY),
    }),
    options: withoutUndefined({
      args: action.args,
      cwd: action.cwd,
      text: action.text,
      keys: action.keys,
      width: normalizeHostCoordinate(action.width),
      height: normalizeHostCoordinate(action.height),
      mode: action.mode,
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

function normalizeHostResult(output: string, fallbackAction: MacosControlHostActionName): MacosControlHostResult {
  try {
    const parsed = JSON.parse(output.trim() || '{}') as Partial<MacosControlHostResult>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return invalidJsonResult(fallbackAction, output);
    }
    const action = typeof parsed.action === 'string' ? parsed.action : fallbackAction;
    if (typeof parsed.ok !== 'boolean') {
      return failedResult(action, 'host_invalid_json', 'macOS control host response is missing or invalid ok.');
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
      const windowId = String(item.windowId ?? item.id ?? '');
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

function isExternalAppApprovalLevel(value: unknown): value is ExternalAppApprovalLevel {
  return value === 'low' || value === 'medium' || value === 'high';
}

function invalidJsonResult(action: MacosControlHostActionName, output: string): MacosControlHostResult {
  return failedResult(action, 'host_invalid_json', `macOS control host returned invalid JSON: ${output.slice(0, 300)}`);
}

function failedResult(
  action: MacosControlHostActionName | string,
  code: 'host_not_found' | 'host_invalid_json' | 'host_failed' | 'host_timeout',
  error: string,
): MacosControlHostResult {
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

function defaultMessage(action: MacosControlHostActionName | string, ok: boolean): string {
  return ok ? `macOS control host ${action} completed.` : `macOS control host ${action} failed.`;
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
