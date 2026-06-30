#!/usr/bin/env node
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_TIMEOUT_MS = 45000;
export const EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_SOURCE = 'xenesis-external-app-notepad-live-smoke';
export const EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_TEXT = 'hello xenesis external app smoke';
export const EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_PLACEMENT = { x: 80, y: 80, width: 820, height: 560 };
export const EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_REQUEST_PATHS = [
  'xd.apps.launch',
  'xd.apps.find',
  'xd.apps.status',
  'xd.apps.focus',
  'xd.apps.resize',
  'xd.apps.typeText',
  'xd.apps.hotkey',
  'xd.apps.close',
];

export function buildExternalAppNotepadLiveSmokeRequests(filePath) {
  const fileName = path.basename(String(filePath || 'xenesis-notepad-smoke.txt'));
  const target = { appId: 'notepad', titleContains: fileName };
  const common = {
    source: EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_SOURCE,
    approved: true,
  };

  return [
    {
      ...common,
      id: 'launch',
      path: 'xd.apps.launch',
      args: {
        appId: 'notepad',
        args: [String(filePath)],
        placement: { ...EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_PLACEMENT },
      },
    },
    { ...common, id: 'find', path: 'xd.apps.find', args: { ...target } },
    { ...common, id: 'status', path: 'xd.apps.status', args: { ...target } },
    { ...common, id: 'focus', path: 'xd.apps.focus', args: { ...target } },
    {
      ...common,
      id: 'resize',
      path: 'xd.apps.resize',
      args: { ...target, ...EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_PLACEMENT },
    },
    {
      ...common,
      id: 'typeText',
      path: 'xd.apps.typeText',
      args: { ...target, text: EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_TEXT },
    },
    {
      ...common,
      id: 'hotkey',
      path: 'xd.apps.hotkey',
      args: { ...target, keys: ['CTRL', 'S'] },
    },
    { ...common, id: 'close', path: 'xd.apps.close', args: { ...target } },
  ];
}

export function formatExternalAppNotepadLiveSmokePlan() {
  const lines = [
    'Xenesis external app Notepad live smoke plan',
    'Proof type: registered-profile-visible-window-control',
    'Uses registered appId=notepad only; arbitrary executable path launch is intentionally excluded.',
    `App shell readiness: ${EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_APP_READY_SELECTOR}`,
    'CR sequence:',
  ];
  for (const request of buildExternalAppNotepadLiveSmokeRequests('<temp-notepad-file>')) {
    lines.push(`- ${request.path} ${JSON.stringify(request.args)}`);
  }
  return lines.join('\n');
}

export function buildExternalAppNotepadLiveSmokeEnv(baseEnv, xenisHome, userDataDir) {
  return {
    ...baseEnv,
    XENIS_HOME: xenisHome,
    XENESIS_DESK_USER_DATA_DIR: userDataDir,
    XENESIS_EXTERNAL_APP_NOTEPAD_LIVE_SMOKE: '1',
  };
}

export function buildExternalAppNotepadLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map((check) => ({
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.path ? { path: String(check.path) } : {}),
    ...(check.error ? { error: String(check.error) } : {}),
  }));
  const passed = normalizedChecks.filter((check) => check.ok).length;
  const failed = normalizedChecks.length - passed;
  return {
    ...extra,
    ok: failed === 0,
    proofType: 'registered-profile-visible-window-control',
    createdAt: startedAt.toISOString(),
    summary: { total: normalizedChecks.length, passed, failed },
    checks: normalizedChecks,
  };
}

function unwrapCapabilityResult(capabilityResult) {
  if (capabilityResult?.result && typeof capabilityResult.result === 'object') return capabilityResult.result;
  return capabilityResult || {};
}

function normalizeCapabilityCheck(request, capabilityResult) {
  const result = unwrapCapabilityResult(capabilityResult);
  const capabilityOk = capabilityResult?.ok === true;
  const resultOk = result.ok !== false;
  const approvalClear = capabilityResult?.approvalRequired !== true && result.approvalRequired !== true;
  const windows =
    Array.isArray(result.windows) || Array.isArray(capabilityResult?.windows)
      ? (result.windows ?? capabilityResult.windows)
      : [];
  const expectsWindow = request.path !== 'xd.apps.close';
  const windowOk = !expectsWindow || request.path === 'xd.apps.launch' || windows.length > 0;
  const ok = capabilityOk && resultOk && approvalClear && windowOk;
  return {
    id: request.id,
    path: request.path,
    ok,
    ...(!ok
      ? {
          error:
            capabilityResult?.error ||
            result.error ||
            `capabilityOk=${capabilityOk} resultOk=${resultOk} approvalClear=${approvalClear} windows=${windows.length}`,
        }
      : {}),
  };
}

async function assertBuiltElectronOutput(root) {
  const requiredPaths = [path.join(root, 'out', 'main', 'index.js'), path.join(root, 'out', 'renderer', 'index.html')];
  for (const requiredPath of requiredPaths) {
    try {
      await access(requiredPath);
    } catch {
      throw new Error(`Missing built Electron output: ${path.relative(root, requiredPath)}. Run npm run build first.`);
    }
  }
}

async function waitForAppShellReady(page, timeout) {
  await page.waitForSelector(EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(globalThis.deskBridgeAPI?.callCapability), undefined, { timeout });
}

export async function runExternalAppNotepadLiveSmoke(options = {}) {
  const timeout = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_TIMEOUT_MS;
  const root = path.resolve(options.repoRoot ?? repoRoot);
  const appPath = path.resolve(options.appPath ?? process.env.XENESIS_EXTERNAL_APP_NOTEPAD_ELECTRON_APP ?? root);
  const startedAt = new Date();
  const checks = [];
  const xenisHome =
    typeof options.xenisHome === 'string' && options.xenisHome.trim()
      ? path.resolve(options.xenisHome)
      : await mkdtemp(path.join(os.tmpdir(), 'xenesis-notepad-smoke-home-'));
  const userDataDir =
    typeof options.userDataDir === 'string' && options.userDataDir.trim()
      ? path.resolve(options.userDataDir)
      : await mkdtemp(path.join(os.tmpdir(), 'xenesis-notepad-smoke-user-data-'));
  const shouldRemoveXenisHome = options.keepXenisHome === true ? false : !options.xenisHome;
  const shouldRemoveUserDataDir = options.keepUserDataDir === true ? false : !options.userDataDir;
  const smokeFile = path.join(xenisHome, 'xenesis-notepad-smoke.txt');
  let electronApp;

  await assertBuiltElectronOutput(root);
  await writeFile(smokeFile, '', 'utf8');

  const { _electron } = await import('playwright');
  try {
    electronApp = await _electron.launch({
      args: [appPath, '--disable-gpu'],
      cwd: root,
      timeout,
      env: buildExternalAppNotepadLiveSmokeEnv(process.env, xenisHome, userDataDir),
    });

    const page = await electronApp.firstWindow({ timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    await waitForAppShellReady(page, timeout);
    const callCapability = (request) =>
      page.evaluate((innerRequest) => globalThis.deskBridgeAPI.callCapability(innerRequest), request);

    for (const request of buildExternalAppNotepadLiveSmokeRequests(smokeFile)) {
      const result = await callCapability(request);
      checks.push(normalizeCapabilityCheck(request, result));
    }
  } finally {
    if (electronApp) await electronApp.close().catch(() => undefined);
    if (shouldRemoveXenisHome) await rm(xenisHome, { recursive: true, force: true }).catch(() => undefined);
    if (shouldRemoveUserDataDir) await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }

  return buildExternalAppNotepadLiveSmokeReport(checks, startedAt, {
    xenisHome: shouldRemoveXenisHome ? '<temp-removed>' : xenisHome,
    userDataDir: shouldRemoveUserDataDir ? '<temp-removed>' : userDataDir,
  });
}

function parseCliArgs(argv) {
  const args = { json: false, plan: false, timeoutMs: EXTERNAL_APP_NOTEPAD_LIVE_SMOKE_TIMEOUT_MS };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    else if (arg === '--plan') args.plan = true;
    else if (arg.startsWith('--timeout=')) args.timeoutMs = Number(arg.slice('--timeout='.length));
  }
  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.plan) {
    console.log(formatExternalAppNotepadLiveSmokePlan());
    return;
  }
  const report = await runExternalAppNotepadLiveSmoke({ timeoutMs: args.timeoutMs });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `xenesis-external-app-notepad-live-smoke: ${report.ok ? 'passed' : 'failed'} ${report.summary.passed}/${report.summary.total}`,
    );
    for (const check of report.checks) {
      console.log(
        `xenesis-external-app-notepad-live-smoke: ${check.id} ${check.ok ? 'passed' : `failed - ${check.error}`}`,
      );
    }
  }
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(
      `xenesis-external-app-notepad-live-smoke: failed - ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  });
}
