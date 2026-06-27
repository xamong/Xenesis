#!/usr/bin/env node
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const CONNECTION_CENTER_LIVE_SMOKE_TIMEOUT_MS = 30000;
export const CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const CONNECTION_CENTER_LIVE_SMOKE_SELECTOR_STATE = 'attached';

export const CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST = {
  path: 'xd.panes.settings.open',
  source: 'xenesis-connection-center-live-smoke',
  approved: true,
  args: {
    category: 'xenesis-agent',
    mode: 'connections',
    section: 'xenesis-connections',
    ensureVisible: true,
  },
};

export const CONNECTION_CENTER_LIVE_SMOKE_CHECKS = [
  {
    id: 'connection-center-root',
    label: 'Connection Center root',
    selector: '[data-settings-section="xenesis-connections"]',
  },
  {
    id: 'connection-center-title',
    label: 'Connection Center title',
    selector: '[data-settings-section="xenesis-connections"] h2',
    text: 'Connection Center',
  },
  {
    id: 'onboarding-guided-steps',
    label: 'Onboarding guided steps',
    selector: '[data-xenesis-onboarding-plan]',
    text: 'guided step',
  },
  {
    id: 'provider-profile-review-steps',
    label: 'Provider profile review steps',
    selector: '[data-xenesis-provider-profile-draft]',
    text: 'review step',
  },
  {
    id: 'tool-oauth-review-steps',
    label: 'Tool OAuth review steps',
    selector: '[data-xenesis-tool-oauth-draft]',
    text: 'review step',
  },
  {
    id: 'channel-profile-review-steps',
    label: 'Channel profile review steps',
    selector: '[data-xenesis-channel-profile-draft]',
    text: 'review step',
  },
];

export function formatConnectionCenterLiveSmokePlan() {
  return [
    'Xenesis Connection Center live smoke plan',
    `CR open path: ${CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST.path}`,
    `CR args: ${JSON.stringify(CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST.args)}`,
    `App shell readiness: ${CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR}`,
    `Connection Center selector state: ${CONNECTION_CENTER_LIVE_SMOKE_SELECTOR_STATE}`,
    'Renderer checks:',
    ...CONNECTION_CENTER_LIVE_SMOKE_CHECKS.map((check) => {
      const text = check.text ? ` / text "${check.text}"` : '';
      return `- ${check.id}: ${check.selector}${text}`;
    }),
  ].join('\n');
}

export function buildConnectionCenterLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map((check) => ({
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.label ? { label: String(check.label) } : {}),
    ...(check.selector ? { selector: String(check.selector) } : {}),
    ...(check.text ? { text: String(check.text) } : {}),
    ...(check.error ? { error: String(check.error) } : {}),
  }));
  const passed = normalizedChecks.filter((check) => check.ok).length;
  const failed = normalizedChecks.length - passed;

  return {
    ok: failed === 0,
    createdAt: startedAt.toISOString(),
    summary: {
      total: normalizedChecks.length,
      passed,
      failed,
    },
    checks: normalizedChecks,
    ...extra,
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
  await page.waitForSelector(CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(globalThis.deskBridgeAPI?.callCapability), undefined, { timeout });
}

async function waitForConnectionCenterCheck(page, check, timeout) {
  const locator = page.locator(check.selector).first();
  await locator.waitFor({ state: CONNECTION_CENTER_LIVE_SMOKE_SELECTOR_STATE, timeout });

  if (check.text) {
    const content = (await locator.textContent({ timeout })) ?? '';
    if (!content.toLowerCase().includes(check.text.toLowerCase())) {
      throw new Error(`Expected ${check.selector} to include "${check.text}", got "${content.trim()}".`);
    }
  }
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

    for (const check of CONNECTION_CENTER_LIVE_SMOKE_CHECKS) {
      try {
        await waitForConnectionCenterCheck(page, check, timeout);
        checkResults.push({ ...check, ok: true });
      } catch (error) {
        checkResults.push({
          ...check,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
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
