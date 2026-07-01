import { spawn } from 'node:child_process';
import type {
  OfficeAction,
  OfficeActionKind,
  OfficeActionResult,
  OfficeProviderStatus,
} from '../../shared/officeControl';
import type { InstalledOfficeAdapter } from './officeControlService';

export interface MacosOfficeAppleEventsRunInput {
  operation: OfficeActionKind;
  action: OfficeActionKind;
  args: Record<string, unknown>;
  timeoutMs: number;
}

export interface MacosOfficeAppleEventsAdapterOptions {
  platform?: NodeJS.Platform;
  timeoutMs?: number;
  runAppleEvents?: (input: MacosOfficeAppleEventsRunInput) => Promise<string>;
}

const VALID_OFFICE_ACTIONS = new Set<OfficeActionKind>([
  'status',
  'excel.openWorkbook',
  'excel.readRange',
  'excel.writeRange',
  'excel.saveWorkbook',
  'excel.closeWorkbook',
  'excel.exportPdf',
]);

export function createMacosOfficeAppleEventsAdapter(
  options: MacosOfficeAppleEventsAdapterOptions = {},
): InstalledOfficeAdapter {
  const platform = options.platform ?? process.platform;
  const timeoutMs = options.timeoutMs ?? 20000;
  const runAppleEvents = options.runAppleEvents ?? defaultRunAppleEvents;

  return {
    async status() {
      if (platform !== 'darwin') {
        return {
          id: 'macos-apple-events',
          available: false,
          apps: [],
          message: 'macOS Apple Events provider is only available on macOS.',
        };
      }
      try {
        const output = await runAppleEvents({
          operation: 'status',
          action: 'status',
          args: {},
          timeoutMs,
        });
        return normalizeStatus(output);
      } catch (error) {
        return {
          id: 'macos-apple-events',
          available: false,
          apps: [],
          message: errorMessage(error),
        };
      }
    },
    async run(action) {
      if (platform !== 'darwin') {
        return failed(action.kind, 'provider_unavailable', 'macOS Apple Events provider is only available on macOS.');
      }
      try {
        const output = await runAppleEvents({
          operation: action.kind,
          action: action.kind,
          args: buildActionArgs(action),
          timeoutMs,
        });
        return normalizeResult(output, action.kind);
      } catch (error) {
        return failed(action.kind, 'apple_events_failed', errorMessage(error));
      }
    },
  };
}

export async function defaultRunAppleEvents(input: MacosOfficeAppleEventsRunInput): Promise<string> {
  return runAppleEventsProcess(input, spawn);
}

function runAppleEventsProcess(input: MacosOfficeAppleEventsRunInput, spawnHost: typeof spawn): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawnHost('/usr/bin/osascript', ['-l', 'JavaScript', '-e', MACOS_OFFICE_JXA, JSON.stringify(input)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(
        Object.assign(new Error(`Apple Events Office automation timed out after ${input.timeoutMs}ms.`), {
          code: 'host_timeout',
        }),
      );
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
        reject(
          new Error(`Apple Events Office automation exited with signal ${signal}.${outputPreview(stdout, stderr)}`),
        );
        return;
      }
      if (code !== 0 && output && !isHandledFailureJsonOutput(output)) {
        reject(new Error(`Apple Events Office automation exited with code ${code}.${outputPreview(stdout, stderr)}`));
        return;
      }
      if (output) {
        resolve(output);
        return;
      }
      if (code !== 0) {
        reject(new Error(`Apple Events Office automation exited with code ${code}.${outputPreview(stdout, stderr)}`));
        return;
      }
      reject(new Error(stderr.trim() || 'Apple Events Office automation produced no output.'));
    });
  });
}

function buildActionArgs(action: OfficeAction): Record<string, unknown> {
  return {
    provider: 'macos-apple-events',
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
  const result = normalizeResult(output, 'status');
  if (result.ok && Array.isArray(result.providers)) {
    const status = result.providers.find((provider) => provider.id === 'macos-apple-events');
    if (status) return status;
  }
  if (result.ok) {
    return { id: 'macos-apple-events', available: true, apps: ['excel'], message: result.message };
  }
  return {
    id: 'macos-apple-events',
    available: false,
    apps: [],
    message: result.error || result.message,
  };
}

function normalizeResult(output: string, fallbackAction: OfficeActionKind): OfficeActionResult {
  try {
    const parsed = JSON.parse(output.trim() || '{}') as Partial<OfficeActionResult>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return invalidJsonResult(fallbackAction, output);
    }

    const action = isOfficeActionKind(parsed.action) ? parsed.action : fallbackAction;
    if (typeof parsed.ok !== 'boolean') {
      return failed(action, 'host_invalid_json', 'Apple Events Office response is missing or invalid ok.');
    }
    if (parsed.ok && (!isOfficeActionKind(parsed.action) || parsed.action !== fallbackAction)) {
      return failed(
        fallbackAction,
        'host_invalid_json',
        'Apple Events Office response has invalid or mismatched action.',
      );
    }
    if (!parsed.ok && !hasNonEmptyString(parsed.code)) {
      return {
        ok: false,
        action,
        provider: action === 'status' ? undefined : 'macos-apple-events',
        code: 'apple_events_failed',
        error:
          typeof parsed.error === 'string' ? parsed.error : 'Apple Events Office response is missing failure code.',
        message: typeof parsed.message === 'string' ? parsed.message : defaultMessage(action, false),
      };
    }

    return {
      ...parsed,
      ok: parsed.ok,
      action,
      provider: parsed.provider ?? (action === 'status' ? undefined : 'macos-apple-events'),
      message: typeof parsed.message === 'string' ? parsed.message : defaultMessage(action, parsed.ok),
    };
  } catch {
    return invalidJsonResult(fallbackAction, output);
  }
}

function invalidJsonResult(action: OfficeActionKind, output: string): OfficeActionResult {
  return failed(
    action,
    'host_invalid_json',
    `Apple Events Office automation returned invalid JSON: ${output.slice(0, 300)}`,
  );
}

function failed(action: OfficeActionKind, code: string, error: string): OfficeActionResult {
  return {
    ok: false,
    action,
    provider: action === 'status' ? undefined : 'macos-apple-events',
    code,
    error,
    message: defaultMessage(action, false),
  };
}

function defaultMessage(action: OfficeActionKind, ok: boolean): string {
  return ok ? `Apple Events Office ${action} completed.` : `Apple Events Office ${action} failed.`;
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

const MACOS_OFFICE_JXA = `
function run(argv) {
  const request = JSON.parse(argv[0] || "{}");
  try {
    return JSON.stringify(dispatch(request));
  } catch (error) {
    return JSON.stringify(failed(request.action || request.operation || "status", "apple_events_failed", String(error)));
  }
}

function dispatch(request) {
  const operation = request.operation || request.action;
  const args = request.args || {};
  if (operation === "status") return status();
  if (operation === "excel.openWorkbook") return openWorkbook(args);
  if (operation === "excel.readRange") return readRange(args);
  if (operation === "excel.writeRange") return writeRange(args);
  if (operation === "excel.saveWorkbook") return saveWorkbook(args);
  if (operation === "excel.closeWorkbook") return closeWorkbook(args);
  if (operation === "excel.exportPdf") return exportPdf(args);
  return failed(operation, "unsupported_action", "Unsupported Office Apple Events operation: " + operation);
}

function status() {
  ObjC.import("AppKit");
  const excelUrl = $.NSWorkspace.sharedWorkspace.URLForApplicationWithBundleIdentifier("com.microsoft.Excel");
  const excelAvailable = !excelUrl.isNil();
  return {
    ok: true,
    action: "status",
    providers: [{
      id: "macos-apple-events",
      available: excelAvailable,
      apps: excelAvailable ? ["excel"] : [],
      message: excelAvailable ? "Microsoft Excel is installed." : "Microsoft Excel is not installed.",
      details: {
        excel: { bundleId: "com.microsoft.Excel", installed: excelAvailable, supported: true },
        word: { bundleId: "com.microsoft.Word", supported: false },
        powerpoint: { bundleId: "com.microsoft.Powerpoint", supported: false }
      }
    }],
    message: "Office Apple Events provider status read."
  };
}

function excel() {
  const app = Application("Microsoft Excel");
  app.includeStandardAdditions = true;
  return app;
}

function openActiveWorkbook(args) {
  const app = excel();
  if (args.visible === true) app.activate();
  app.open(Path(args.path));
  return app.activeWorkbook();
}

function openWorkbook(args) {
  const workbook = openActiveWorkbook(args);
  const sheets = sheetSummaries(workbook);
  tryClose(workbook, false);
  return ok("excel.openWorkbook", args, { sheets: sheets, message: "Excel workbook opened." });
}

function readRange(args) {
  const workbook = openActiveWorkbook(args);
  const sheet = workbook.worksheets.byName(args.sheetName);
  const value = sheet.range(args.range).value();
  tryClose(workbook, false);
  return ok("excel.readRange", args, { rows: normalizeRows(value), message: "Excel range read." });
}

function writeRange(args) {
  const workbook = openActiveWorkbook(args);
  const sheet = workbook.worksheets.byName(args.sheetName);
  const height = args.rows.length;
  const width = args.rows.reduce(function(max, row) { return Math.max(max, row.length); }, 0);
  const target = sheet.range(args.startCell).resize({ rowSize: height, columnSize: width });
  target.value = args.rows;
  if (args.save === true) workbook.save();
  tryClose(workbook, args.save === true);
  return ok("excel.writeRange", args, { message: "Excel range written." });
}

function saveWorkbook(args) {
  const workbook = openActiveWorkbook(args);
  if (args.saveAsPath) {
    workbook.saveAs({ filename: args.saveAsPath });
  } else {
    workbook.save();
  }
  tryClose(workbook, true);
  return ok("excel.saveWorkbook", args, { path: args.saveAsPath || args.path, message: "Excel workbook saved." });
}

function closeWorkbook(args) {
  return ok("excel.closeWorkbook", args, { warnings: ["Stateless Apple Events provider has no persistent workbook session."], message: "Excel workbook close acknowledged." });
}

function exportPdf(args) {
  const workbook = openActiveWorkbook(args);
  workbook.exportAsFixedFormat({ type: 0, filename: args.outputPath });
  tryClose(workbook, false);
  return ok("excel.exportPdf", args, { outputPath: args.outputPath, message: "Excel workbook exported to PDF." });
}

function sheetSummaries(workbook) {
  const sheets = workbook.worksheets();
  const result = [];
  for (let i = 0; i < sheets.length; i += 1) {
    const sheet = sheets[i];
    result.push({ name: String(sheet.name()), rowCount: 0, columnCount: 0 });
  }
  return result;
}

function normalizeRows(value) {
  if (Array.isArray(value)) return value;
  return [[value]];
}

function tryClose(workbook, saving) {
  try {
    workbook.close({ saving: saving ? "yes" : "no" });
  } catch (_) {}
}

function ok(action, args, extra) {
  const result = extra || {};
  result.ok = true;
  result.action = action;
  result.documentType = "excel";
  result.provider = "macos-apple-events";
  result.path = result.path || args.path;
  result.message = result.message || "Office Apple Events action completed.";
  return result;
}

function failed(action, code, message) {
  return { ok: false, action: action, provider: "macos-apple-events", code: code, error: message, message: message };
}
`;
