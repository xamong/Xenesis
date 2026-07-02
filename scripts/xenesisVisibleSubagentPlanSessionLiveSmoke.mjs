#!/usr/bin/env node
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_TIMEOUT_MS = 30000;
export const VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SOURCE = 'xenesis-visible-subagent-plan-live-smoke';
export const VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SUBMIT_PATH = 'xd.testing.xenesisAgent.submitPrompt';
export const VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_EXPECTED_TEXT = 'Visible Subagent Plan Session';
export const VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_DEFAULT_TASK =
  'Plan visible subagents for the current Xenesis Desk workspace and wait for selection.';

export const VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_OPEN_REQUEST = {
  path: 'xd.tools.core.xenesisAgent.open',
  source: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {
    placement: 'tab',
  },
};

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function takeOptionValue(argv, index, prefix) {
  const arg = argv[index];
  if (arg.startsWith(`${prefix}=`)) return { value: arg.slice(prefix.length + 1), nextIndex: index };
  if (arg === prefix && index + 1 < argv.length) return { value: argv[index + 1], nextIndex: index + 1 };
  return { value: '', nextIndex: index };
}

export function parseVisibleSubagentPlanLiveSmokeCliArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    manual: true,
    keepOpen: false,
    closeAfter: false,
    task: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_DEFAULT_TASK,
    showMs: 6000,
    sleepSeconds: 45,
    rightWidth: 760,
    timeoutMs: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_TIMEOUT_MS,
  };
  const taskParts = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = String(argv[index] || '');
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--manual') {
      args.manual = true;
      continue;
    }
    if (arg === '--no-manual') {
      args.manual = false;
      continue;
    }
    if (arg === '--keep-open') {
      args.keepOpen = true;
      continue;
    }
    if (arg === '--close-after') {
      args.closeAfter = true;
      continue;
    }
    if (arg === '--task' || arg.startsWith('--task=')) {
      const option = takeOptionValue(argv, index, '--task');
      args.task = option.value.trim() || args.task;
      index = option.nextIndex;
      continue;
    }
    if (arg === '--show-ms' || arg.startsWith('--show-ms=')) {
      const option = takeOptionValue(argv, index, '--show-ms');
      args.showMs = boundedInteger(option.value, args.showMs, 0, 60000);
      index = option.nextIndex;
      continue;
    }
    if (arg === '--sleep' || arg === '--sleep-sec' || arg.startsWith('--sleep=') || arg.startsWith('--sleep-sec=')) {
      const option = arg.startsWith('--sleep-sec')
        ? takeOptionValue(argv, index, '--sleep-sec')
        : takeOptionValue(argv, index, '--sleep');
      args.sleepSeconds = boundedInteger(option.value, args.sleepSeconds, 1, 300);
      index = option.nextIndex;
      continue;
    }
    if (arg === '--right-width' || arg.startsWith('--right-width=')) {
      const option = takeOptionValue(argv, index, '--right-width');
      args.rightWidth = boundedInteger(option.value, args.rightWidth, 480, 1400);
      index = option.nextIndex;
      continue;
    }
    if (arg === '--timeout-ms' || arg.startsWith('--timeout-ms=')) {
      const option = takeOptionValue(argv, index, '--timeout-ms');
      args.timeoutMs = boundedInteger(option.value, args.timeoutMs, 1000, 180000);
      index = option.nextIndex;
      continue;
    }
    if (arg && !arg.startsWith('--')) taskParts.push(arg);
  }

  if (taskParts.length > 0) args.task = taskParts.join(' ').trim();
  return args;
}

export function buildVisibleSubagentPlanLiveSmokePrompt(options = {}) {
  const task = String(options.task || VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_DEFAULT_TASK).trim();
  const showMs = boundedInteger(options.showMs, 6000, 0, 60000);
  const sleepSeconds = boundedInteger(options.sleepSeconds, 45, 1, 300);
  return [
    '/subagents-plan',
    task,
    options.manual === false ? '' : '--manual',
    `--show-ms ${showMs}`,
    `--sleep ${sleepSeconds}`,
    options.keepOpen ? '--keep-open' : '',
    !options.keepOpen && options.closeAfter ? '--close-after' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildVisibleSubagentPlanSubmitRequest(prompt, timeoutMs) {
  return {
    path: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SUBMIT_PATH,
    source: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SOURCE,
    approved: true,
    args: {
      prompt,
      expectedText: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_EXPECTED_TEXT,
      expectedTextScope: 'anywhere',
      timeoutMs,
    },
  };
}

export function buildVisibleSubagentPlanDockSizeRequest(rightWidth) {
  return {
    path: 'xd.dock.sizes.set',
    source: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SOURCE,
    approved: true,
    args: {
      right: boundedInteger(rightWidth, 760, 480, 1400),
      bottom: 170,
    },
  };
}

export function formatVisibleSubagentPlanLiveSmokePlan(options = {}) {
  const prompt = buildVisibleSubagentPlanLiveSmokePrompt(options);
  const rightWidth = boundedInteger(options.rightWidth, 760, 480, 1400);

  return [
    'Xenesis visible subagent plan-session live smoke plan',
    `CR open path: ${VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_OPEN_REQUEST.path}`,
    `CR submit path: ${VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SUBMIT_PATH}`,
    `App shell readiness: ${VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_APP_READY_SELECTOR}`,
    `Prompt: ${prompt}`,
    `Expected text: ${VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_EXPECTED_TEXT}`,
    `Dock right width: ${rightWidth}`,
    'Mode: manual plan session; workers are not started until a selection is made.',
    'Primary surface: Xenesis Agent pane.',
  ].join('\n');
}

export function buildVisibleSubagentPlanLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map((check) => ({
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.path ? { path: String(check.path) } : {}),
    ...(check.prompt ? { prompt: String(check.prompt) } : {}),
    ...(check.expectedText ? { expectedText: String(check.expectedText) } : {}),
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
  await page.waitForSelector(VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(globalThis.deskBridgeAPI?.callCapability), undefined, { timeout });
}

function submitResultOk(result) {
  if (!result || result.ok === false) return false;
  if (result.result?.ok === false) return false;
  if (result.result && Object.hasOwn(result.result, 'matchedExpectedText'))
    return result.result.matchedExpectedText === true;
  return true;
}

export async function runVisibleSubagentPlanLiveSmoke(options = {}) {
  const timeout = boundedInteger(options.timeoutMs, VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_TIMEOUT_MS, 1000, 180000);
  const root = path.resolve(options.repoRoot ?? repoRoot);
  const appPath = path.resolve(options.appPath ?? process.env.XENESIS_VISIBLE_SUBAGENT_PLAN_ELECTRON_APP ?? root);
  const startedAt = new Date();
  const prompt = buildVisibleSubagentPlanLiveSmokePrompt(options);
  const checkResults = [];
  let electronApp;

  if (options.dryRun) {
    return buildVisibleSubagentPlanLiveSmokeReport(
      [
        { id: 'dry-run:open-request', ok: true, path: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_OPEN_REQUEST.path },
        { id: 'dry-run:plan-submit', ok: true, path: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SUBMIT_PATH, prompt },
      ],
      startedAt,
      {
        dryRun: true,
        plan: formatVisibleSubagentPlanLiveSmokePlan(options),
        prompt,
      },
    );
  }

  await assertBuiltElectronOutput(root);

  const { _electron } = await import('playwright');
  try {
    electronApp = await _electron.launch({
      args: [appPath, '--disable-gpu'],
      cwd: root,
      timeout,
      env: {
        ...process.env,
        XENESIS_VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE: '1',
      },
    });

    const page = await electronApp.firstWindow({ timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    await waitForAppShellReady(page, timeout);

    const openResult = await page.evaluate((request) => globalThis.deskBridgeAPI.callCapability(request), {
      ...VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_OPEN_REQUEST,
    });
    checkResults.push({
      id: 'agent-open',
      ok: openResult?.ok !== false,
      path: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_OPEN_REQUEST.path,
      ...(openResult?.ok === false ? { error: openResult.error || JSON.stringify(openResult) } : {}),
    });
    if (openResult?.ok === false)
      throw new Error(`Agent pane open failed: ${openResult.error || JSON.stringify(openResult)}`);

    const dockResult = await page.evaluate((request) => globalThis.deskBridgeAPI.callCapability(request), {
      ...buildVisibleSubagentPlanDockSizeRequest(options.rightWidth),
    });
    checkResults.push({
      id: 'dock-size',
      ok: dockResult?.ok !== false,
      path: 'xd.dock.sizes.set',
      ...(dockResult?.ok === false ? { error: dockResult.error || JSON.stringify(dockResult) } : {}),
    });

    const submitRequest = buildVisibleSubagentPlanSubmitRequest(prompt, timeout);
    const submitResult = await page.evaluate(
      (request) => globalThis.deskBridgeAPI.callCapability(request),
      submitRequest,
    );
    const submitOk = submitResultOk(submitResult);
    checkResults.push({
      id: 'plan-submit',
      ok: submitOk,
      path: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SUBMIT_PATH,
      prompt,
      expectedText: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_EXPECTED_TEXT,
      ...(!submitOk
        ? { error: submitResult?.error || submitResult?.result?.error || JSON.stringify(submitResult) }
        : {}),
    });
    if (!submitOk)
      throw new Error(`Visible plan submit failed: ${submitResult?.error || JSON.stringify(submitResult)}`);

    if (!options.keepOpen) {
      const cleanupRequest = buildVisibleSubagentPlanSubmitRequest('/subagents-cleanup', timeout);
      cleanupRequest.args.expectedText = 'Visible Xenesis subagent cleanup completed';
      const cleanupResult = await page.evaluate(
        (request) => globalThis.deskBridgeAPI.callCapability(request),
        cleanupRequest,
      );
      checkResults.push({
        id: 'cleanup-submit',
        ok: submitResultOk(cleanupResult),
        path: VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SUBMIT_PATH,
        prompt: '/subagents-cleanup',
        expectedText: 'Visible Xenesis subagent cleanup completed',
        ...(submitResultOk(cleanupResult)
          ? {}
          : { error: cleanupResult?.error || cleanupResult?.result?.error || JSON.stringify(cleanupResult) }),
      });
    }
  } finally {
    if (electronApp) {
      await electronApp.close().catch(() => undefined);
    }
  }

  return buildVisibleSubagentPlanLiveSmokeReport(checkResults, startedAt, {
    prompt,
    plan: formatVisibleSubagentPlanLiveSmokePlan(options),
  });
}

async function main() {
  const options = parseVisibleSubagentPlanLiveSmokeCliArgs(process.argv.slice(2));
  const report = await runVisibleSubagentPlanLiveSmoke(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.dryRun) {
    console.log(report.plan);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
