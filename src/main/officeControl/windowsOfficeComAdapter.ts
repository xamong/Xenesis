import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  OfficeAction,
  OfficeActionKind,
  OfficeActionResult,
  OfficeProviderStatus,
} from '../../shared/officeControl';
import type { InstalledOfficeAdapter } from './officeControlService';

export interface WindowsOfficeControlHostPathOptions {
  appIsPackaged?: boolean;
  resourcesPath?: string;
  cwd?: string;
  existsSync?: (candidate: string) => boolean;
}

export interface WindowsOfficeControlHostRunInput {
  hostPath: string;
  payload: unknown;
  timeoutMs: number;
}

export interface WindowsOfficeComAdapterOptions {
  hostPath?: string;
  appIsPackaged?: boolean;
  resourcesPath?: string;
  cwd?: string;
  platform?: NodeJS.Platform;
  timeoutMs?: number;
  runHost?: (input: WindowsOfficeControlHostRunInput) => Promise<string>;
}

type RuntimeProcess = NodeJS.Process & {
  defaultApp?: boolean;
  resourcesPath?: string;
};

const VALID_OFFICE_ACTIONS = new Set<OfficeActionKind>([
  'status',
  'excel.createWorkbook',
  'excel.inspectWorkbook',
  'excel.openWorkbook',
  'excel.readRange',
  'excel.writeRange',
  'excel.saveWorkbook',
  'excel.closeWorkbook',
  'excel.exportPdf',
]);

export function resolveWindowsOfficeControlHostPath(options: WindowsOfficeControlHostPathOptions = {}): string {
  const existsSync = options.existsSync ?? fs.existsSync;
  const cwd = options.cwd ?? process.cwd();
  const runtimeProcess = process as RuntimeProcess;
  const resourcesPath = options.resourcesPath || runtimeProcess.resourcesPath || cwd;

  if (options.appIsPackaged) {
    const packagedCandidate = path.join(resourcesPath, 'office-control-host', 'Xenesis.OfficeControlHost.exe');
    return existsSync(packagedCandidate) ? packagedCandidate : '';
  }

  const devCandidates = [
    path.join(
      cwd,
      'tools',
      'office-control-host',
      'bin',
      'Debug',
      'net8.0-windows',
      'win-x64',
      'Xenesis.OfficeControlHost.exe',
    ),
    path.join(cwd, 'tools', 'office-control-host', 'bin', 'Debug', 'net8.0-windows', 'Xenesis.OfficeControlHost.exe'),
    path.join(
      cwd,
      'tools',
      'office-control-host',
      'bin',
      'Release',
      'net8.0-windows',
      'win-x64',
      'Xenesis.OfficeControlHost.exe',
    ),
    path.join(cwd, 'tools', 'office-control-host', 'bin', 'Release', 'net8.0-windows', 'Xenesis.OfficeControlHost.exe'),
    path.join(cwd, 'tools', 'office-control-host', 'publish', 'Xenesis.OfficeControlHost.exe'),
  ];

  return devCandidates.find((candidate) => existsSync(candidate)) ?? '';
}

export function createWindowsOfficeComAdapter(options: WindowsOfficeComAdapterOptions = {}): InstalledOfficeAdapter {
  const runtimeProcess = process as RuntimeProcess;
  const hostPath =
    options.hostPath ??
    resolveWindowsOfficeControlHostPath({
      appIsPackaged:
        options.appIsPackaged ?? Boolean(runtimeProcess.resourcesPath && runtimeProcess.defaultApp !== true),
      resourcesPath: options.resourcesPath ?? runtimeProcess.resourcesPath,
      cwd: options.cwd,
    });
  const platform = options.platform ?? process.platform;
  const timeoutMs = options.timeoutMs ?? 20000;
  const runHost = options.runHost ?? defaultRunHost;

  return {
    async status() {
      if (platform !== 'win32' && !hostPath) {
        return {
          id: 'windows-com',
          available: false,
          apps: [],
          message: 'Windows COM provider is only available on Windows.',
        };
      }
      if (!hostPath) {
        return {
          id: 'windows-com',
          available: false,
          apps: [],
          message: 'Office control host executable was not found.',
        };
      }
      try {
        const output = await runHost({ hostPath, payload: { action: 'status' }, timeoutMs });
        return normalizeStatus(output);
      } catch (error) {
        return {
          id: 'windows-com',
          available: false,
          apps: [],
          message: errorMessage(error),
        };
      }
    },
    async run(action) {
      if (!hostPath) {
        return failed(action.kind, 'host_not_found', 'Office control host executable was not found.');
      }
      try {
        const output = await runHost({
          hostPath,
          payload: buildHostPayload(action),
          timeoutMs,
        });
        return normalizeHostResult(output, action.kind);
      } catch (error) {
        return failed(action.kind, hostFailureCode(error), errorMessage(error));
      }
    },
  };
}

export async function defaultRunHost(input: WindowsOfficeControlHostRunInput): Promise<string> {
  return runHostProcess(input, spawn);
}

function runHostProcess(input: WindowsOfficeControlHostRunInput, spawnHost: typeof spawn): Promise<string> {
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
      reject(hostError(`Office control host timed out after ${input.timeoutMs}ms.`, 'host_timeout'));
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
        reject(new Error(`Office control host exited with signal ${signal}.${outputPreview(stdout, stderr)}`));
        return;
      }
      if (code !== 0 && output && !isHandledFailureJsonOutput(output)) {
        reject(new Error(`Office control host exited with code ${code}.${outputPreview(stdout, stderr)}`));
        return;
      }
      if (output) {
        resolve(output);
        return;
      }
      if (code !== 0) {
        reject(new Error(`Office control host exited with code ${code}.${outputPreview(stdout, stderr)}`));
        return;
      }
      reject(new Error(stderr.trim() || 'Office control host produced no output.'));
    });

    child.stdin?.end(JSON.stringify(input.payload));
  });
}

function buildHostPayload(action: OfficeAction): unknown {
  return {
    action: action.kind,
    provider: 'windows-com',
    documentType: action.documentType,
    path: action.path,
    outputPath: action.outputPath,
    overwrite: action.overwrite === true,
    visible: action.visible === true,
    readOnly: action.readOnly === true,
    reuseExisting: action.reuseExisting === true,
    save: action.save === true,
    sheetName: action.sheetName,
    range: action.range,
    startCell: action.startCell,
    rows: action.rows,
    saveAsPath: action.saveAsPath,
  };
}

function normalizeStatus(output: string): OfficeProviderStatus {
  const result = normalizeHostResult(output, 'status');
  if (result.ok && Array.isArray(result.providers)) {
    const status = result.providers.find((provider) => provider.id === 'windows-com');
    if (status) return status;
  }
  if (result.ok) {
    return { id: 'windows-com', available: true, apps: ['excel'], message: result.message };
  }
  return {
    id: 'windows-com',
    available: false,
    apps: [],
    message: result.error || result.message,
  };
}

function normalizeHostResult(output: string, fallbackAction: OfficeActionKind): OfficeActionResult {
  try {
    const parsed = JSON.parse(output.trim() || '{}') as Partial<OfficeActionResult>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return invalidJsonResult(fallbackAction, output);
    }

    const action = isOfficeActionKind(parsed.action) ? parsed.action : fallbackAction;
    if (typeof parsed.ok !== 'boolean') {
      return failed(action, 'host_invalid_json', 'Office control host response is missing or invalid ok.');
    }
    if (parsed.ok && (!isOfficeActionKind(parsed.action) || parsed.action !== fallbackAction)) {
      return failed(
        fallbackAction,
        'host_invalid_json',
        'Office control host response has invalid or mismatched action.',
      );
    }
    if (!parsed.ok && !hasNonEmptyString(parsed.code)) {
      return {
        ok: false,
        action,
        code: 'host_failed',
        error:
          typeof parsed.error === 'string' ? parsed.error : 'Office control host response is missing failure code.',
        message: typeof parsed.message === 'string' ? parsed.message : defaultMessage(action, false),
      };
    }

    return {
      ...parsed,
      ok: parsed.ok,
      action,
      provider: parsed.provider ?? (action === 'status' ? undefined : 'windows-com'),
      message: typeof parsed.message === 'string' ? parsed.message : defaultMessage(action, parsed.ok),
    };
  } catch {
    return invalidJsonResult(fallbackAction, output);
  }
}

function invalidJsonResult(action: OfficeActionKind, output: string): OfficeActionResult {
  return failed(action, 'host_invalid_json', `Office control host returned invalid JSON: ${output.slice(0, 300)}`);
}

function failed(action: OfficeActionKind, code: string, error: string): OfficeActionResult {
  return {
    ok: false,
    action,
    provider: action === 'status' ? undefined : 'windows-com',
    code,
    error,
    message: defaultMessage(action, false),
  };
}

function defaultMessage(action: OfficeActionKind, ok: boolean): string {
  return ok ? `Office control host ${action} completed.` : `Office control host ${action} failed.`;
}

function isOfficeActionKind(value: unknown): value is OfficeActionKind {
  return typeof value === 'string' && VALID_OFFICE_ACTIONS.has(value as OfficeActionKind);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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

function isHandledFailureJsonOutput(output: string): boolean {
  try {
    const parsed = JSON.parse(output);
    return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.ok === false);
  } catch {
    return false;
  }
}
