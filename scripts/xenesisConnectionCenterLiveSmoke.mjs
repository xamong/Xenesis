#!/usr/bin/env node
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const CONNECTION_CENTER_LIVE_SMOKE_TIMEOUT_MS = 30000;
export const CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';

export const CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST = {
  path: 'xd.xenesis.connections.open',
  source: 'xenesis-connection-center-live-smoke',
  approved: true,
  args: {
    ensureVisible: true,
  },
};

export const CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST = {
  path: 'xd.testing.connectionCenter.snapshot',
  source: 'xenesis-connection-center-live-smoke',
  approved: true,
  args: {
    maxTextLength: 1200,
    timeoutMs: 3000,
  },
};

export const CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS = Object.freeze([
  'reference-baseline:connection-center-root',
  'reference-baseline:connection-center-title',
  'reference-baseline:onboarding-guided-steps',
  'reference-baseline:provider-profile-review-steps',
  'reference-baseline:tool-profile-review-steps',
  'reference-baseline:tool-oauth-review-steps',
  'reference-baseline:tool-oauth-runtime-readback',
  'reference-baseline:external-tool-notion-mcp-readiness',
  'reference-baseline:external-tool-google-calendar-oauth-setup-packet',
  'reference-baseline:external-tool-google-calendar-oauth-runtime',
  'reference-baseline:external-tool-linear-mcp-oauth-readiness',
  'reference-baseline:external-tool-no-oauth-side-effect-boundary',
  'reference-baseline:channel-runtime-readback',
  'reference-baseline:channel-profile-review-steps',
  'slice04:messenger-implemented-set',
  'slice04:telegram-route-session-readback',
  'slice04:telegram-access-pairing-readback',
  'slice04:messenger-planned-channel-no-runtime',
  'slice04:messenger-test-send-approval-boundary',
]);

export function formatConnectionCenterLiveSmokePlan() {
  return [
    'Xenesis Connection Center live smoke plan',
    `CR open path: ${CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST.path}`,
    `CR args: ${JSON.stringify(CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST.args)}`,
    `CR snapshot path: ${CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST.path}`,
    `CR snapshot args: ${JSON.stringify(CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST.args)}`,
    `App shell readiness: ${CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR}`,
    'Renderer checks: returned by the CR snapshot result',
    'Required reference baseline checks:',
    ...CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS.map((id) => `- ${id}`),
  ].join('\n');
}

export function buildConnectionCenterLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map((check) => ({
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.label ? { label: String(check.label) } : {}),
    ...(check.selector ? { selector: String(check.selector) } : {}),
    ...(check.text ? { text: String(check.text) } : {}),
    ...(check.expectedText ? { expectedText: String(check.expectedText) } : {}),
    ...(check.actualText ? { actualText: String(check.actualText) } : {}),
    ...(check.error ? { error: String(check.error) } : {}),
  }));
  const passed = normalizedChecks.filter((check) => check.ok).length;
  const failed = normalizedChecks.length - passed;

  return {
    ...extra,
    ok: failed === 0,
    createdAt: startedAt.toISOString(),
    summary: {
      total: normalizedChecks.length,
      passed,
      failed,
    },
    checks: normalizedChecks,
  };
}

export function normalizeConnectionCenterSnapshotChecks(snapshotResult) {
  const checks = snapshotResult?.result?.checks;
  if (!Array.isArray(checks)) {
    return [
      {
        id: 'connection-center-snapshot',
        ok: false,
        error:
          snapshotResult?.error || snapshotResult?.result?.error || 'Connection Center snapshot returned no checks.',
      },
    ];
  }

  return checks.map((check) => {
    const present = check?.present === true;
    const textPresent = check?.textPresent !== false;
    return {
      id: String(check?.id || 'unknown-check'),
      ...(check?.selector ? { selector: String(check.selector) } : {}),
      ...(check?.expectedText ? { expectedText: String(check.expectedText) } : {}),
      ...(check?.text ? { actualText: String(check.text) } : {}),
      ok: present && textPresent,
      ...(!present || !textPresent ? { error: `present=${present} textPresent=${textPresent}` } : {}),
    };
  });
}

export function assertConnectionCenterReferenceBaselineChecks(checks) {
  const checksById = new Map(checks.map((check) => [String(check.id), check]));
  const missing = CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS.filter((id) => !checksById.has(id));
  const failing = CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS.filter((id) => checksById.get(id)?.ok !== true);

  if (missing.length > 0) throw new Error(`Missing reference baseline checks: ${missing.join(', ')}`);
  if (failing.length > 0) throw new Error(`Failing reference baseline checks: ${failing.join(', ')}`);
  return checks;
}

export function buildConnectionCenterReferenceBaselineReportChecks(checks) {
  try {
    assertConnectionCenterReferenceBaselineChecks(checks);
    return checks;
  } catch (error) {
    return [
      ...checks,
      {
        id: 'reference-baseline-contract',
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
    ];
  }
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
  await page.waitForSelector(CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(globalThis.deskBridgeAPI?.callCapability), undefined, { timeout });
}

export async function runConnectionCenterLiveSmoke(options = {}) {
  const timeout = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : CONNECTION_CENTER_LIVE_SMOKE_TIMEOUT_MS;
  const root = path.resolve(options.repoRoot ?? repoRoot);
  const appPath = path.resolve(options.appPath ?? process.env.XENESIS_CONNECTION_CENTER_ELECTRON_APP ?? root);
  const startedAt = new Date();
  const checkResults = [];
  let electronApp;
  let crResult;
  let snapshotResult;

  await assertBuiltElectronOutput(root);

  const { _electron } = await import('playwright');
  try {
    electronApp = await _electron.launch({
      args: [appPath, '--disable-gpu'],
      cwd: root,
      timeout,
      env: {
        ...process.env,
        XENESIS_CONNECTION_CENTER_LIVE_SMOKE: '1',
      },
    });

    const page = await electronApp.firstWindow({ timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    await waitForAppShellReady(page, timeout);

    crResult = await page.evaluate((request) => globalThis.deskBridgeAPI.callCapability(request), {
      ...CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST,
    });
    if (!crResult?.ok) {
      throw new Error(`CR open failed: ${crResult?.error || JSON.stringify(crResult)}`);
    }

    snapshotResult = await page.evaluate((request) => globalThis.deskBridgeAPI.callCapability(request), {
      ...CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST,
    });
    const snapshotChecks = normalizeConnectionCenterSnapshotChecks(snapshotResult);
    checkResults.push(...buildConnectionCenterReferenceBaselineReportChecks(snapshotChecks));
  } finally {
    if (electronApp) {
      await electronApp.close().catch(() => undefined);
    }
  }

  return buildConnectionCenterLiveSmokeReport(checkResults, startedAt, {
    cr: {
      path: CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST.path,
      ok: Boolean(crResult?.ok),
    },
    snapshot: {
      path: CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST.path,
      ok: Boolean(snapshotResult?.ok && snapshotResult?.result?.ok),
      summary: snapshotResult?.result?.summary,
      waitedMs: snapshotResult?.result?.waitedMs,
      timedOut: snapshotResult?.result?.timedOut,
    },
  });
}

function parseCliArgs(argv) {
  const args = {
    json: false,
    plan: false,
    timeoutMs: CONNECTION_CENTER_LIVE_SMOKE_TIMEOUT_MS,
  };

  for (const arg of argv) {
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--plan') {
      args.plan = true;
      continue;
    }
    if (arg.startsWith('--timeout=')) {
      args.timeoutMs = Number(arg.slice('--timeout='.length));
    }
  }

  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.plan) {
    console.log(formatConnectionCenterLiveSmokePlan());
    return;
  }

  const report = await runConnectionCenterLiveSmoke({ timeoutMs: args.timeoutMs });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `xenesis-connection-center-live-smoke: ${report.ok ? 'passed' : 'failed'} ${report.summary.passed}/${report.summary.total}`,
    );
    for (const check of report.checks) {
      console.log(
        `xenesis-connection-center-live-smoke: ${check.id} ${check.ok ? 'passed' : `failed - ${check.error}`}`,
      );
    }
  }
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(`xenesis-connection-center-live-smoke: failed - ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
