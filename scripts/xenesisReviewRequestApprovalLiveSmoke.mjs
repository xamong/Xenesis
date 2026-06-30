#!/usr/bin/env node
import { access, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_TIMEOUT_MS = 30000;
export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR = '.btn-settings';
export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SOURCE = 'xenesis-review-request-approval-live-smoke';
export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SUBMIT_PATH = 'xd.testing.xenesisAgent.submitPrompt';
export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE = 'structured-cr-approval-regression';
export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF = false;

export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_OPEN_REQUEST = {
  path: 'xd.tools.core.xenesisAgent.open',
  source: REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {
    placement: 'tab',
  },
};

export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST = {
  path: 'xd.mcp.actionInbox.list',
  source: REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SOURCE,
  approved: true,
  args: {},
};

export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES = [
  {
    id: 'connection-setup-notion',
    requestPrompt: [
      'Review the Notion connection setup request.',
      '',
      '```xenesis-desk-action',
      '{"path":"xd.xenesis.connections.setupRequests.request","args":{"id":"notion"},"approved":false,"reason":"Review Notion setup request"}',
      '```',
    ].join('\n'),
    approvalPrompt: '[approve pending Desk action]',
    approvalAction: 'once',
    expectedRequestPath: 'xd.xenesis.connections.setupRequests.request',
    expectedRequestText: 'Desk action approval required',
    expectedApprovalText: 'Desk action completed',
    expectedCapabilityApprovalItem: {
      id: 'capability-xenesis-xd.xenesis.connections.setupRequests.request',
      title: 'Approve Xenesis Desk capability: xd.xenesis.connections.setupRequests.request',
      kind: 'capability-approval',
      status: 'pending',
      source: 'Xenesis Desk Capability Registry',
      sessionId: 'xenesis-capability',
      approvalSessionKey: 'capability:xenesis:xd.xenesis.connections.setupRequests.request',
    },
    expectedReviewItem: {
      title: 'Review Notion setup request',
      kind: 'xenesis-connection-setup',
      command: 'Review setup request for notion',
      status: 'pending',
      source: 'Xenesis Connection Center',
      sessionId: 'xenesis-connection-setup',
      approvalSessionKey: 'xenesis-connection-setup:notion',
    },
  },
];

export function buildReviewRequestApprovalSubmitRequest(promptCase, phase, timeoutMs) {
  const isApproval = phase === 'approval';
  return {
    path: REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SUBMIT_PATH,
    source: REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SOURCE,
    approved: true,
    args: {
      prompt: isApproval ? promptCase.approvalPrompt : promptCase.requestPrompt,
      expectedText: isApproval ? promptCase.expectedApprovalText : promptCase.expectedRequestText,
      expectedTextScope: 'anywhere',
      timeoutMs,
      ...(isApproval
        ? {
            approvePendingAction: true,
            approvalAction: promptCase.approvalAction || 'once',
          }
        : {}),
    },
  };
}

export function buildReviewRequestApprovalLiveSmokeEnv(baseEnv, xenisHome, userDataDir) {
  return {
    ...baseEnv,
    XENIS_HOME: xenisHome,
    XENESIS_DESK_USER_DATA_DIR: userDataDir,
    XENESIS_REVIEW_REQUEST_APPROVAL_LIVE_SMOKE: '1',
  };
}

export function formatReviewRequestApprovalLiveSmokePlan() {
  const lines = [
    'Xenesis review-request approval live smoke plan',
    `Proof type: ${REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE}`,
    `Provider natural-language CR tool-selection proof: ${REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF}`,
    'Structured action scope: fenced xenesis-desk-action blocks plus real Action Inbox readback',
    `CR open path: ${REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_OPEN_REQUEST.path}`,
    `CR submit path: ${REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SUBMIT_PATH}`,
    `CR Action Inbox list path: ${REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST.path}`,
    `App shell readiness: ${REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR}`,
    'Mutating explicit CR review requests:',
  ];

  for (const promptCase of REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES) {
    lines.push(`- ${promptCase.id} -> ${promptCase.expectedRequestPath} (${promptCase.expectedRequestText})`);
    lines.push(
      `  approve via explicit testing flag: approvePendingAction=true approvalAction=${promptCase.approvalAction || 'once'} (${promptCase.expectedApprovalText})`,
    );
    lines.push(`  expected review item: ${promptCase.expectedReviewItem.title}`);
  }

  return lines.join('\n');
}

export function buildReviewRequestApprovalLiveSmokeReport(checks, startedAt = new Date(), extra = {}) {
  const normalizedChecks = checks.map((check) => ({
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.prompt ? { prompt: String(check.prompt) } : {}),
    ...(check.expectedPath ? { expectedPath: String(check.expectedPath) } : {}),
    ...(check.text ? { text: String(check.text) } : {}),
    ...(check.error ? { error: String(check.error) } : {}),
  }));
  const passed = normalizedChecks.filter((check) => check.ok).length;
  const failed = normalizedChecks.length - passed;

  return {
    ...extra,
    ok: failed === 0,
    proofType: REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE,
    providerNaturalLanguageToolSelectionProof: REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF,
    createdAt: startedAt.toISOString(),
    summary: {
      total: normalizedChecks.length,
      passed,
      failed,
    },
    checks: normalizedChecks,
  };
}

function unwrapCapabilityResult(capabilityResult) {
  if (capabilityResult?.result && typeof capabilityResult.result === 'object') {
    return capabilityResult.result;
  }
  return capabilityResult || {};
}

function collectResultText(result) {
  return [
    result.responseTextPreview,
    result.bodyTextPreview,
    result.bodyTextTail,
    result.artifactStatusLine,
    result.expectedText,
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join('\n');
}

export function extractActionInboxItems(capabilityResult) {
  const result = unwrapCapabilityResult(capabilityResult);
  if (Array.isArray(result.actions)) return result.actions;
  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(result)) return result;
  return [];
}

function actionInboxItemMatches(item, expected) {
  if (!item || typeof item !== 'object') return false;
  for (const [key, value] of Object.entries(expected)) {
    if (String(item[key] ?? '') !== String(value)) return false;
  }
  return true;
}

function findActionInboxItem(items, expected) {
  return items.find((item) => actionInboxItemMatches(item, expected)) || null;
}

function updatedAfter(item, startedAt) {
  if (!startedAt) return true;
  const updatedAt = Date.parse(String(item?.updatedAt || item?.createdAt || ''));
  const startedMillis = Date.parse(String(startedAt));
  if (!Number.isFinite(updatedAt) || !Number.isFinite(startedMillis)) return false;
  return updatedAt >= startedMillis - 1000;
}

function normalizeSubmitCheck({
  id,
  prompt,
  capabilityResult,
  expectedPath,
  expectedText,
  requireApprovalClick = false,
}) {
  const result = unwrapCapabilityResult(capabilityResult);
  const text = collectResultText(result);
  const capabilityOk = capabilityResult?.ok === true;
  const resultOk = result.ok !== false;
  const submitted = result.submitted === true || Number(result.newLineCount || 0) > 0;
  const textMatched = result.matchedExpectedText === true || text.includes(expectedText);
  const pathMatched = text.includes(expectedPath);
  const approvalClickMatched = !requireApprovalClick || result.approvalButtonClicked === true;
  const approvalButtonText = String(result.approvalButtonText || '');
  const approvalButtonTextMatched =
    !requireApprovalClick || (approvalButtonText.length > 0 && !/(?:항상|always)/i.test(approvalButtonText));
  const ok =
    capabilityOk &&
    resultOk &&
    submitted &&
    textMatched &&
    pathMatched &&
    approvalClickMatched &&
    approvalButtonTextMatched;

  return {
    id,
    ok,
    prompt,
    expectedPath,
    text: expectedText,
    ...(!ok
      ? {
          error:
            capabilityResult?.error ||
            result.error ||
            (!approvalButtonTextMatched
              ? `Unexpected approval button: ${approvalButtonText || '<missing>'}`
              : `submitted=${submitted} textMatched=${textMatched} pathMatched=${pathMatched} approvalButtonClicked=${result.approvalButtonClicked}`),
        }
      : {}),
  };
}

export function normalizeReviewRequestApprovalChecks(promptCase, results) {
  const checks = [];
  const pendingItems = extractActionInboxItems(results.pendingActionInboxResult);
  const afterItems = extractActionInboxItems(results.afterActionInboxResult);
  const pendingCapabilityItem = findActionInboxItem(pendingItems, promptCase.expectedCapabilityApprovalItem);
  const approvedCapabilityItem = findActionInboxItem(afterItems, {
    ...promptCase.expectedCapabilityApprovalItem,
    status: 'approved',
  });
  const reviewItem = findActionInboxItem(afterItems, promptCase.expectedReviewItem);

  checks.push(
    normalizeSubmitCheck({
      id: `${promptCase.id}:request-submit`,
      prompt: promptCase.requestPrompt,
      capabilityResult: results.requestSubmitResult,
      expectedPath: promptCase.expectedRequestPath,
      expectedText: promptCase.expectedRequestText,
    }),
  );

  checks.push({
    id: `${promptCase.id}:pending-capability-approval`,
    ok:
      results.pendingActionInboxResult?.ok === true &&
      Boolean(pendingCapabilityItem) &&
      updatedAfter(pendingCapabilityItem, results.startedAt),
    text: promptCase.expectedCapabilityApprovalItem.title,
    ...(!pendingCapabilityItem
      ? { error: `Missing pending capability approval item: ${promptCase.expectedCapabilityApprovalItem.id}` }
      : !updatedAfter(pendingCapabilityItem, results.startedAt)
        ? { error: `Pending capability approval item was not refreshed: ${pendingCapabilityItem.updatedAt || ''}` }
        : {}),
  });

  checks.push(
    normalizeSubmitCheck({
      id: `${promptCase.id}:approval-submit`,
      prompt: promptCase.approvalPrompt,
      capabilityResult: results.approvalSubmitResult,
      expectedPath: promptCase.expectedRequestPath,
      expectedText: promptCase.expectedApprovalText,
      requireApprovalClick: true,
    }),
  );

  checks.push({
    id: `${promptCase.id}:approved-capability-approval`,
    ok:
      results.afterActionInboxResult?.ok === true &&
      Boolean(approvedCapabilityItem) &&
      String(approvedCapabilityItem?.result || '').includes(
        `Capability call approved and executed: ${promptCase.expectedRequestPath}`,
      ),
    text: promptCase.expectedCapabilityApprovalItem.title,
    ...(!approvedCapabilityItem
      ? { error: `Missing approved capability approval item: ${promptCase.expectedCapabilityApprovalItem.id}` }
      : !String(approvedCapabilityItem.result || '').includes(
            `Capability call approved and executed: ${promptCase.expectedRequestPath}`,
          )
        ? { error: `Capability approval result did not include executed path: ${approvedCapabilityItem.result || ''}` }
        : {}),
  });

  checks.push({
    id: `${promptCase.id}:review-item`,
    ok:
      results.afterActionInboxResult?.ok === true && Boolean(reviewItem) && updatedAfter(reviewItem, results.startedAt),
    text: promptCase.expectedReviewItem.title,
    ...(!reviewItem
      ? { error: `Missing review item: ${promptCase.expectedReviewItem.title}` }
      : !updatedAfter(reviewItem, results.startedAt)
        ? { error: `Review item was not refreshed: ${reviewItem.updatedAt || ''}` }
        : {}),
  });

  return checks;
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
  await page.waitForSelector(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR, { state: 'visible', timeout });
  await page.waitForFunction(() => Boolean(globalThis.deskBridgeAPI?.callCapability), undefined, { timeout });
}

export async function runReviewRequestApprovalLiveSmoke(options = {}) {
  const timeout = Number.isFinite(Number(options.timeoutMs))
    ? Number(options.timeoutMs)
    : REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_TIMEOUT_MS;
  const root = path.resolve(options.repoRoot ?? repoRoot);
  const appPath = path.resolve(options.appPath ?? process.env.XENESIS_REVIEW_REQUEST_APPROVAL_ELECTRON_APP ?? root);
  const startedAt = new Date();
  const checkResults = [];
  const caseResults = [];
  const xenisHome =
    typeof options.xenisHome === 'string' && options.xenisHome.trim()
      ? path.resolve(options.xenisHome)
      : await mkdtemp(path.join(os.tmpdir(), 'xenesis-review-request-approval-'));
  const userDataDir =
    typeof options.userDataDir === 'string' && options.userDataDir.trim()
      ? path.resolve(options.userDataDir)
      : await mkdtemp(path.join(os.tmpdir(), 'xenesis-review-request-approval-user-data-'));
  const shouldRemoveXenisHome = options.keepXenisHome === true ? false : !options.xenisHome;
  const shouldRemoveUserDataDir = options.keepUserDataDir === true ? false : !options.userDataDir;
  let electronApp;

  await assertBuiltElectronOutput(root);

  const { _electron } = await import('playwright');
  try {
    electronApp = await _electron.launch({
      args: [appPath, '--disable-gpu'],
      cwd: root,
      timeout,
      env: buildReviewRequestApprovalLiveSmokeEnv(process.env, xenisHome, userDataDir),
    });

    const page = await electronApp.firstWindow({ timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
    await waitForAppShellReady(page, timeout);

    const callCapability = (request) =>
      page.evaluate((innerRequest) => globalThis.deskBridgeAPI.callCapability(innerRequest), request);

    for (const promptCase of REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES) {
      const caseStartedAt = new Date().toISOString();
      const openResult = await callCapability({ ...REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_OPEN_REQUEST });
      checkResults.push({
        id: `${promptCase.id}:agent-open`,
        ok: openResult?.ok === true,
        expectedPath: REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_OPEN_REQUEST.path,
        ...(!(openResult?.ok === true) ? { error: openResult?.error || JSON.stringify(openResult) } : {}),
      });
      if (openResult?.ok !== true) continue;

      const beforeActionInboxResult = await callCapability({
        ...REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST,
      });
      const requestSubmitResult = await callCapability(
        buildReviewRequestApprovalSubmitRequest(promptCase, 'request', timeout),
      );
      const pendingActionInboxResult = await callCapability({
        ...REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST,
      });
      const approvalSubmitResult = await callCapability(
        buildReviewRequestApprovalSubmitRequest(promptCase, 'approval', timeout),
      );
      const afterActionInboxResult = await callCapability({
        ...REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST,
      });

      const beforeItems = extractActionInboxItems(beforeActionInboxResult);
      const afterItems = extractActionInboxItems(afterActionInboxResult);
      const normalizedChecks = normalizeReviewRequestApprovalChecks(promptCase, {
        startedAt: caseStartedAt,
        requestSubmitResult,
        pendingActionInboxResult,
        approvalSubmitResult,
        afterActionInboxResult,
      });
      checkResults.push(...normalizedChecks);
      caseResults.push({
        id: promptCase.id,
        ok: normalizedChecks.every((check) => check.ok),
        beforeActionInboxCount: beforeItems.length,
        afterActionInboxCount: afterItems.length,
      });
    }
  } finally {
    if (electronApp) {
      await electronApp.close().catch(() => undefined);
    }
    if (shouldRemoveXenisHome) {
      await rm(xenisHome, { recursive: true, force: true }).catch(() => undefined);
    }
    if (shouldRemoveUserDataDir) {
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  return buildReviewRequestApprovalLiveSmokeReport(checkResults, startedAt, {
    xenisHome: shouldRemoveXenisHome ? '<temp-removed>' : xenisHome,
    userDataDir: shouldRemoveUserDataDir ? '<temp-removed>' : userDataDir,
    cases: caseResults,
  });
}

function parseCliArgs(argv) {
  const args = {
    json: false,
    plan: false,
    timeoutMs: REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_TIMEOUT_MS,
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
    console.log(formatReviewRequestApprovalLiveSmokePlan());
    return;
  }

  const report = await runReviewRequestApprovalLiveSmoke({ timeoutMs: args.timeoutMs });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `xenesis-review-request-approval-live-smoke: ${report.ok ? 'passed' : 'failed'} ${report.summary.passed}/${report.summary.total}`,
    );
    for (const check of report.checks) {
      console.log(
        `xenesis-review-request-approval-live-smoke: ${check.id} ${check.ok ? 'passed' : `failed - ${check.error}`}`,
      );
    }
  }
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(
      `xenesis-review-request-approval-live-smoke: failed - ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  });
}
