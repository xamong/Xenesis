import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReviewRequestApprovalLiveSmokeEnv,
  buildReviewRequestApprovalLiveSmokeReport,
  buildReviewRequestApprovalSubmitRequest,
  formatReviewRequestApprovalLiveSmokePlan,
  normalizeReviewRequestApprovalChecks,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_OPEN_REQUEST,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SOURCE,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SUBMIT_PATH,
} from './xenesisReviewRequestApprovalLiveSmoke.mjs';

function extractDeskActionPayload(prompt) {
  const match = String(prompt).match(/```xenesis-desk-action\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(match, 'expected fenced xenesis-desk-action block');
  return JSON.parse(match[1]);
}

test('review request approval live smoke describes one safe mutating case', () => {
  assert.equal(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SOURCE, 'xenesis-review-request-approval-live-smoke');
  assert.equal(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_SUBMIT_PATH, 'xd.testing.xenesisAgent.submitPrompt');
  assert.equal(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_APP_READY_SELECTOR, '.btn-settings');

  assert.deepEqual(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_OPEN_REQUEST, {
    path: 'xd.tools.core.xenesisAgent.open',
    source: 'xenesis-review-request-approval-live-smoke',
    approved: true,
    args: {
      placement: 'tab',
    },
  });

  assert.deepEqual(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_ACTION_INBOX_LIST_REQUEST, {
    path: 'xd.mcp.actionInbox.list',
    source: 'xenesis-review-request-approval-live-smoke',
    approved: true,
    args: {},
  });

  assert.deepEqual(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES, [
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
  ]);
});

test('review request approval live smoke labels structured CR approval proof scope', () => {
  assert.equal(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE, 'structured-cr-approval-regression');
  assert.equal(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF, false);

  const plan = formatReviewRequestApprovalLiveSmokePlan();
  assert.match(plan, /Proof type: structured-cr-approval-regression/);
  assert.match(plan, /Provider natural-language CR tool-selection proof: false/);
  assert.match(
    plan,
    /Structured action scope: fenced xenesis-desk-action blocks plus real Action Inbox readback/,
  );
  assert.doesNotMatch(plan, /provider reasoning proof: true/i);

  for (const smokeCase of REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES) {
    const payload = extractDeskActionPayload(smokeCase.requestPrompt);
    assert.equal(payload.path, smokeCase.expectedRequestPath);
    assert.equal(payload.approved, false);
    assert.equal(smokeCase.approvalAction, 'once');
    assert.equal(smokeCase.expectedCapabilityApprovalItem.kind, 'capability-approval');
    assert.equal(smokeCase.expectedCapabilityApprovalItem.status, 'pending');
  }
});

test('review request approval live smoke builds request and approval submit calls', () => {
  const smokeCase = REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES[0];

  assert.deepEqual(buildReviewRequestApprovalSubmitRequest(smokeCase, 'request', 42000), {
    path: 'xd.testing.xenesisAgent.submitPrompt',
    source: 'xenesis-review-request-approval-live-smoke',
    approved: true,
    args: {
      prompt: [
        'Review the Notion connection setup request.',
        '',
        '```xenesis-desk-action',
        '{"path":"xd.xenesis.connections.setupRequests.request","args":{"id":"notion"},"approved":false,"reason":"Review Notion setup request"}',
        '```',
      ].join('\n'),
      expectedText: 'Desk action approval required',
      expectedTextScope: 'anywhere',
      timeoutMs: 42000,
    },
  });

  assert.deepEqual(buildReviewRequestApprovalSubmitRequest(smokeCase, 'approval', 42000), {
    path: 'xd.testing.xenesisAgent.submitPrompt',
    source: 'xenesis-review-request-approval-live-smoke',
    approved: true,
    args: {
      prompt: '[approve pending Desk action]',
      expectedText: 'Desk action completed',
      expectedTextScope: 'anywhere',
      timeoutMs: 42000,
      approvePendingAction: true,
      approvalAction: 'once',
    },
  });
});

test('review request approval live smoke builds isolated state env', () => {
  assert.deepEqual(
    buildReviewRequestApprovalLiveSmokeEnv(
      { PATH: 'test-path', XENIS_HOME: 'old-home' },
      'C:\\tmp\\xd-smoke-home',
      'C:\\tmp\\xd-smoke-user-data',
    ),
    {
      PATH: 'test-path',
      XENIS_HOME: 'C:\\tmp\\xd-smoke-home',
      XENESIS_DESK_USER_DATA_DIR: 'C:\\tmp\\xd-smoke-user-data',
      XENESIS_REVIEW_REQUEST_APPROVAL_LIVE_SMOKE: '1',
    },
  );
});

test('review request approval live smoke normalizes approval and Action Inbox checks', () => {
  const smokeCase = REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES[0];
  const capabilityApprovalPending = {
    ...smokeCase.expectedCapabilityApprovalItem,
    command:
      '{"type":"desk-capability-call","path":"xd.xenesis.connections.setupRequests.request","args":{"id":"notion"},"source":"xenesis"}',
    updatedAt: '2026-06-28T00:10:00.000Z',
  };
  const capabilityApprovalApproved = {
    ...capabilityApprovalPending,
    status: 'approved',
    result: 'Capability call approved and executed: xd.xenesis.connections.setupRequests.request',
    updatedAt: '2026-06-28T00:10:01.000Z',
  };
  const reviewItem = {
    id: 'xd-action-review-notion',
    ...smokeCase.expectedReviewItem,
    updatedAt: '2026-06-28T00:10:01.000Z',
  };

  const checks = normalizeReviewRequestApprovalChecks(smokeCase, {
    requestSubmitResult: {
      ok: true,
      result: {
        ok: true,
        submitted: true,
        matchedExpectedText: true,
        expectedText: smokeCase.expectedRequestText,
        responseTextPreview: `${smokeCase.expectedRequestText}\n${smokeCase.expectedRequestPath}`,
      },
    },
    pendingActionInboxResult: {
      ok: true,
      result: {
        ok: true,
        actions: [capabilityApprovalPending],
      },
    },
    approvalSubmitResult: {
      ok: true,
      result: {
        ok: true,
        submitted: true,
        approvalButtonClicked: true,
        approvalButtonText: '승인 후 실행',
        matchedExpectedText: true,
        expectedText: smokeCase.expectedApprovalText,
        responseTextPreview: `${smokeCase.expectedApprovalText}\n${smokeCase.expectedRequestPath}`,
      },
    },
    afterActionInboxResult: {
      ok: true,
      result: {
        ok: true,
        actions: [reviewItem, capabilityApprovalApproved],
      },
    },
  });

  assert.deepEqual(
    checks.map((check) => [check.id, check.ok]),
    [
      ['connection-setup-notion:request-submit', true],
      ['connection-setup-notion:pending-capability-approval', true],
      ['connection-setup-notion:approval-submit', true],
      ['connection-setup-notion:approved-capability-approval', true],
      ['connection-setup-notion:review-item', true],
    ],
  );
});

test('review request approval live smoke rejects always-approval button clicks', () => {
  const smokeCase = REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_CASES[0];
  const capabilityApprovalPending = {
    ...smokeCase.expectedCapabilityApprovalItem,
    updatedAt: '2026-06-28T00:10:00.000Z',
  };
  const capabilityApprovalApproved = {
    ...capabilityApprovalPending,
    status: 'approved',
    result: 'Capability call approved and executed: xd.xenesis.connections.setupRequests.request',
    updatedAt: '2026-06-28T00:10:01.000Z',
  };

  const checks = normalizeReviewRequestApprovalChecks(smokeCase, {
    requestSubmitResult: {
      ok: true,
      result: {
        ok: true,
        submitted: true,
        matchedExpectedText: true,
        responseTextPreview: `${smokeCase.expectedRequestText}\n${smokeCase.expectedRequestPath}`,
      },
    },
    pendingActionInboxResult: {
      ok: true,
      result: {
        ok: true,
        actions: [capabilityApprovalPending],
      },
    },
    approvalSubmitResult: {
      ok: true,
      result: {
        ok: true,
        submitted: true,
        approvalButtonClicked: true,
        approvalButtonText: '항상 승인',
        matchedExpectedText: true,
        responseTextPreview: `${smokeCase.expectedApprovalText}\n${smokeCase.expectedRequestPath}`,
      },
    },
    afterActionInboxResult: {
      ok: true,
      result: {
        ok: true,
        actions: [
          {
            id: 'xd-action-review-notion',
            ...smokeCase.expectedReviewItem,
            updatedAt: '2026-06-28T00:10:01.000Z',
          },
          capabilityApprovalApproved,
        ],
      },
    },
  });

  const approvalCheck = checks.find((check) => check.id === 'connection-setup-notion:approval-submit');
  assert.ok(approvalCheck);
  assert.equal(approvalCheck.ok, false);
  assert.match(approvalCheck.error, /Unexpected approval button/);
});

test('review request approval live smoke plan and package script are explicit', () => {
  const plan = formatReviewRequestApprovalLiveSmokePlan();
  assert.match(plan, /Mutating explicit CR review requests/);
  assert.match(plan, /connection-setup-notion/);
  assert.match(plan, /approvePendingAction=true/);
  assert.match(plan, /xd\.xenesis\.connections\.setupRequests\.request/);
  assert.match(plan, /Review Notion setup request/);

  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(
    packageJson.scripts['smoke:xenesis:review-request-approval'],
    'node ./scripts/xenesisReviewRequestApprovalLiveSmoke.mjs',
  );
});

test('review request approval live smoke report summarizes all checks', () => {
  const report = buildReviewRequestApprovalLiveSmokeReport([
    { id: 'agent-open', ok: true },
    { id: 'review-item', ok: false, error: 'missing review item' },
  ]);

  assert.equal(report.ok, false);
  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.passed, 1);
  assert.equal(report.summary.failed, 1);
  assert.equal(report.proofType, 'structured-cr-approval-regression');
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
  assert.equal(report.checks[1].error, 'missing review item');
});

test('review request approval live smoke report proof metadata cannot be overridden by extra fields', () => {
  const report = buildReviewRequestApprovalLiveSmokeReport(
    [{ id: 'agent-open', ok: true }],
    new Date('2026-06-29T00:00:00.000Z'),
    {
      proofType: 'provider-natural-language-tool-selection',
      providerNaturalLanguageToolSelectionProof: true,
      extraField: 'kept',
    },
  );

  assert.equal(report.proofType, 'structured-cr-approval-regression');
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
  assert.equal(report.extraField, 'kept');
});
