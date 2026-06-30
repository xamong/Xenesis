# Slice 01 Live CR Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the current CR-backed Connection Center and approval surfaces with repeatable checks, then record the OpenClaw/Hermes reference adoption map for later slices.

**Architecture:** Keep proof on existing CR paths and development smoke surfaces. Connection Center proof uses `xd.xenesis.connections.open` plus `xd.testing.connectionCenter.snapshot`, approval proof uses the existing fenced `xenesis-desk-action` regression flow and real Action Inbox records, and audit proof becomes an automated zero-counter gate. Do not add deterministic natural-language routing, provider shortcuts, or chat-only approval.

**Tech Stack:** Electron main/renderer, TypeScript, Xenesis Desk Capability Registry, Node ESM scripts, `node:test`, Playwright Electron live smokes, repo-local Obsidian Markdown.

---

## Source Of Truth

- Executable truth: repo code, tests, generated CR docs, CR audit counters, build output, live Electron smoke output.
- Reference context: `docs/obsidian`, `F:\agent-anal\analysis`, and the exact OpenClaw/Hermes files named below.
- This slice must not claim provider natural-language CR tool-selection proof. The review-request approval smoke uses a fenced action block and only proves structured CR approval regression.

## Boundaries

- No deterministic natural-language intent catalog, keyword router, prompt router, or heuristic desk-control routing.
- No provider-specific CR caller. Use the generic CR caller path.
- No mock provider fallback and no silent provider override.
- No secrets, OAuth tokens, bridge tokens, webhook URLs, provider keys, or raw approval internals in docs or smoke output.
- No external web browsing during this slice.

## File Structure

- Create `scripts/assertCapabilityAuditZero.mjs`: parse `docs/capability-registry-audit.md` and fail unless the four CR release-gate counters are present and zero.
- Create `scripts/assertCapabilityAuditZero.test.mjs`: unit and CLI tests for the audit-zero script.
- Modify `scripts/xenesisConnectionCenterLiveSmoke.mjs`: export exact `reference-baseline:*` ids, print them in `--plan`, and fail live smoke when any expected id is missing or failing.
- Modify `scripts/xenesisConnectionCenterLiveSmoke.test.mjs`: assert exact baseline ids, failure behavior, package script, and source wiring.
- Modify `src/main/index.ts`: rename Connection Center snapshot check ids to the exact `reference-baseline:*` contract.
- Modify `src/shared/xenesisConnectionCapabilities.test.ts`: update expected snapshot ids in CR capability tests.
- Modify `scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`: label report and plan as structured CR approval regression, not provider NL tool-selection proof.
- Modify `scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`: assert proof type, `approved=false`, Action Inbox readback, and one-time approval.
- Create `src/main/capabilityActionApproval.test.mjs`: verify command roundtrip, stable allow keys, request shape, and parse failures.
- Modify `src/main/mcpActionInbox.test.mjs`: verify approve/reject readback and hidden resolved items.
- Modify `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`: add Slice 01 borrowed/adapted/rejected reference record.
- Modify `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`: add audit-zero and live smoke commands.
- Modify `docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md`: add development live proof surfaces.
- Modify `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-1-live-cr-baseline-plan.md`: point to this plan file and the stricter Slice 01 scope.
- Modify `handoff.md`: update objective, touched files, commands, exact verification results, known gaps, and next step after every material change.

## Reference Intake Commands

Run these before the first code edit:

```powershell
Get-Content -LiteralPath 'F:\agent-anal\analysis\_xenesis-gap-shared-context.md' -TotalCount 260
Get-Content -LiteralPath 'F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md' -TotalCount 280
Get-Content -LiteralPath 'F:\agent-anal\analysis\openclaw-main\12-channels-routing.md' -TotalCount 260
Get-Content -LiteralPath 'F:\agent-anal\analysis\hermes-agent-main\08-channels-ui.md' -TotalCount 260
```

Expected: output describes OpenClaw route/session/allowlist patterns and Hermes gateway or desktop stream evidence patterns.

Confirm source anchors:

```powershell
$referencePaths = @(
  'F:\agent-anal\openclaw-main\src\routing\resolve-route.ts',
  'F:\agent-anal\openclaw-main\src\routing\session-key.ts',
  'F:\agent-anal\openclaw-main\src\channels\allowlist-match.ts',
  'F:\agent-anal\hermes-agent-main\tui_gateway\server.py',
  'F:\agent-anal\hermes-agent-main\tui_gateway\ws.py',
  'F:\agent-anal\hermes-agent-main\apps\desktop\electron\main.cjs'
)
foreach ($path in $referencePaths) { "$path`t$(Test-Path -LiteralPath $path)" }
```

Expected: every row ends with `True`.

---

### Task 1: CR Audit Zero Assertion

**Files:**
- Create: `scripts/assertCapabilityAuditZero.mjs`
- Create: `scripts/assertCapabilityAuditZero.test.mjs`
- Modify: `handoff.md`

- [ ] **Step 1: Record the slice start in handoff**

Add this section near the top of `handoff.md`:

```markdown
## Current Slice: Slice 01 Live CR Baseline

- Current objective:
  - Implement Slice 01 from `docs/superpowers/plans/2026-06-29-slice-01-live-cr-baseline.md`.
  - Add automated CR audit-zero assertion.
  - Add exact Connection Center `reference-baseline:*` live smoke ids.
  - Label review-request approval smoke as structured CR approval regression only.
  - Record Slice 01 OpenClaw/Hermes adoption map evidence in Obsidian.
- Scope boundary:
  - No deterministic natural-language routing, keyword catalogs, prompt routers, provider-specific CR shortcuts, chat-only approvals, or secret-bearing docs.
  - Obsidian is reference/context only; executable truth remains repo code, tests, generated CR docs, and live smoke output.
- Touched files so far:
  - `handoff.md`
- Commands run:
  - Reference intake commands from the Slice 01 implementation plan.
- Exact verification result:
  - Reference source path check returned `True` for every listed OpenClaw/Hermes source anchor.
- Known gaps:
  - Product code and smoke verification are not changed yet in this slice.
- Next intended step:
  - Add RED tests for `scripts/assertCapabilityAuditZero.mjs`.
```

- [ ] **Step 2: Write the failing audit-zero tests**

Create `scripts/assertCapabilityAuditZero.test.mjs` with this content:

```js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  REQUIRED_CAPABILITY_AUDIT_ZERO_COUNTERS,
  assertCapabilityAuditZero,
  parseCapabilityAuditCounters,
} from './assertCapabilityAuditZero.mjs';

const ZERO_AUDIT = `
# Xenesis Desk Capability Registry Audit

## Summary

- Registered nodes: 801
- Callable methods: 497
- Subscribable events: 54
- Coverage path references: 689
- Dispatcher paths: 477
- Missing registered paths: 0
- Missing dispatched coverage paths: 0
- Undispatched static callable methods: 0
- Dispatcher paths missing from tree: 0
`;

test('capability audit zero assertion names all release-gate counters', () => {
  assert.deepEqual(REQUIRED_CAPABILITY_AUDIT_ZERO_COUNTERS, [
    'Missing registered paths',
    'Missing dispatched coverage paths',
    'Undispatched static callable methods',
    'Dispatcher paths missing from tree',
  ]);
});

test('capability audit zero assertion parses generated summary counters', () => {
  const counters = parseCapabilityAuditCounters(ZERO_AUDIT);

  assert.equal(counters.get('Missing registered paths'), 0);
  assert.equal(counters.get('Missing dispatched coverage paths'), 0);
  assert.equal(counters.get('Undispatched static callable methods'), 0);
  assert.equal(counters.get('Dispatcher paths missing from tree'), 0);
});

test('capability audit zero assertion returns verified counters when all gates are zero', () => {
  assert.deepEqual(assertCapabilityAuditZero(ZERO_AUDIT), {
    ok: true,
    counters: {
      'Missing registered paths': 0,
      'Missing dispatched coverage paths': 0,
      'Undispatched static callable methods': 0,
      'Dispatcher paths missing from tree': 0,
    },
  });
});

test('capability audit zero assertion fails on nonzero counters', () => {
  assert.throws(
    () =>
      assertCapabilityAuditZero(
        ZERO_AUDIT.replace('- Missing dispatched coverage paths: 0', '- Missing dispatched coverage paths: 2'),
      ),
    /Missing dispatched coverage paths must be 0, got 2/,
  );
});

test('capability audit zero assertion fails when a required counter is absent', () => {
  assert.throws(
    () => assertCapabilityAuditZero(ZERO_AUDIT.replace('- Dispatcher paths missing from tree: 0', '')),
    /Missing required capability audit counter: Dispatcher paths missing from tree/,
  );
});

test('capability audit zero assertion cli exits nonzero on a failing audit file', () => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'xd-capability-audit-zero-'));
  const auditPath = path.join(tmpDir, 'audit.md');

  try {
    writeFileSync(auditPath, ZERO_AUDIT.replace('- Missing registered paths: 0', '- Missing registered paths: 1'));
    const result = spawnSync(process.execPath, ['scripts/assertCapabilityAuditZero.mjs', auditPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing registered paths must be 0, got 1/);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Run the RED test**

Run:

```powershell
node --test scripts\assertCapabilityAuditZero.test.mjs
```

Expected: FAIL with `Cannot find module` for `scripts/assertCapabilityAuditZero.mjs`.

- [ ] **Step 4: Implement the audit-zero script**

Create `scripts/assertCapabilityAuditZero.mjs` with this content:

```js
#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const DEFAULT_CAPABILITY_AUDIT_PATH = path.join(repoRoot, 'docs', 'capability-registry-audit.md');

export const REQUIRED_CAPABILITY_AUDIT_ZERO_COUNTERS = Object.freeze([
  'Missing registered paths',
  'Missing dispatched coverage paths',
  'Undispatched static callable methods',
  'Dispatcher paths missing from tree',
]);

export function parseCapabilityAuditCounters(markdown) {
  const counters = new Map();
  for (const line of String(markdown || '').split(/\r?\n/)) {
    const bullet = line.match(/^\s*-\s+([^:]+):\s+([0-9]+)\s*$/);
    if (bullet) {
      counters.set(bullet[1].trim(), Number(bullet[2]));
      continue;
    }

    const tableRow = line.match(/^\|\s*([^|]+?)\s*\|\s*([0-9]+)\s*\|/);
    if (tableRow) counters.set(tableRow[1].trim(), Number(tableRow[2]));
  }
  return counters;
}

export function assertCapabilityAuditZero(markdown, options = {}) {
  const requiredCounters = options.requiredCounters || REQUIRED_CAPABILITY_AUDIT_ZERO_COUNTERS;
  const counters = parseCapabilityAuditCounters(markdown);
  const verifiedCounters = {};

  for (const label of requiredCounters) {
    if (!counters.has(label)) {
      throw new Error(`Missing required capability audit counter: ${label}`);
    }
    const value = counters.get(label);
    if (value !== 0) {
      throw new Error(`${label} must be 0, got ${value}`);
    }
    verifiedCounters[label] = value;
  }

  return {
    ok: true,
    counters: verifiedCounters,
  };
}

async function main(argv = process.argv.slice(2)) {
  const auditPath = path.resolve(argv[0] || DEFAULT_CAPABILITY_AUDIT_PATH);
  const markdown = await readFile(auditPath, 'utf8');
  const result = assertCapabilityAuditZero(markdown);
  const relativeAuditPath = path.relative(repoRoot, auditPath) || auditPath;
  console.log(
    `capability-audit-zero: verified ${Object.keys(result.counters).length} counters in ${relativeAuditPath}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(`capability-audit-zero: failed - ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 5: Run focused tests and the generated audit gate**

Run:

```powershell
node --test scripts\assertCapabilityAuditZero.test.mjs
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
```

Expected:

```text
# node --test exits 0
# npm run docs:capabilities:audit exits 0 and writes docs/capability-registry-audit.md
capability-audit-zero: verified 4 counters in docs\capability-registry-audit.md
```

- [ ] **Step 6: Update handoff and commit**

Append the commands and exact pass/fail result to `handoff.md`, then run:

```powershell
git add scripts/assertCapabilityAuditZero.mjs scripts/assertCapabilityAuditZero.test.mjs handoff.md docs/capability-registry-audit.md
git commit -m "Add capability audit zero assertion"
```

Expected: commit succeeds. If `docs/capability-registry-audit.md` only changes its generated timestamp, include it because the command regenerated the audit used by this slice.

---

### Task 2: Connection Center Reference Baseline Contract

**Files:**
- Modify: `scripts/xenesisConnectionCenterLiveSmoke.mjs`
- Modify: `scripts/xenesisConnectionCenterLiveSmoke.test.mjs`
- Modify: `src/main/index.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `handoff.md`

- [ ] **Step 1: Write the failing Connection Center contract test**

In `scripts/xenesisConnectionCenterLiveSmoke.test.mjs`, extend the import:

```js
import {
  assertConnectionCenterReferenceBaselineChecks,
  buildConnectionCenterLiveSmokeReport,
  CONNECTION_CENTER_LIVE_SMOKE_APP_READY_SELECTOR,
  CONNECTION_CENTER_LIVE_SMOKE_OPEN_REQUEST,
  CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST,
  CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS,
  formatConnectionCenterLiveSmokePlan,
  normalizeConnectionCenterSnapshotChecks,
} from './xenesisConnectionCenterLiveSmoke.mjs';
```

Add these tests:

```js
test('connection center live smoke requires exact reference baseline check ids', () => {
  assert.deepEqual(CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS, [
    'reference-baseline:connection-center-root',
    'reference-baseline:connection-center-title',
    'reference-baseline:onboarding-guided-steps',
    'reference-baseline:provider-profile-review-steps',
    'reference-baseline:tool-profile-review-steps',
    'reference-baseline:tool-oauth-review-steps',
    'reference-baseline:tool-oauth-runtime-readback',
    'reference-baseline:channel-runtime-readback',
    'reference-baseline:channel-profile-review-steps',
  ]);

  const plan = formatConnectionCenterLiveSmokePlan();
  for (const id of CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS) assert.match(plan, new RegExp(id));

  const mainSource = readFileSync('src/main/index.ts', 'utf8');
  for (const id of CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS) assert.match(mainSource, new RegExp(id));
});

test('connection center live smoke fails when reference baseline checks are missing or failing', () => {
  const passingChecks = CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS.map((id) => ({ id, ok: true }));
  assert.equal(assertConnectionCenterReferenceBaselineChecks(passingChecks), passingChecks);

  assert.throws(
    () => assertConnectionCenterReferenceBaselineChecks(passingChecks.slice(1)),
    /Missing reference baseline checks: reference-baseline:connection-center-root/,
  );

  assert.throws(
    () =>
      assertConnectionCenterReferenceBaselineChecks(
        passingChecks.map((check) =>
          check.id === 'reference-baseline:tool-oauth-review-steps' ? { ...check, ok: false } : check,
        ),
      ),
    /Failing reference baseline checks: reference-baseline:tool-oauth-review-steps/,
  );
});
```

Update existing sample ids in the report and normalization tests from bare ids to prefixed ids:

```js
{ id: 'reference-baseline:connection-center-root', ok: true }
{ id: 'reference-baseline:tool-oauth-review-steps', ok: false, error: 'missing selector' }
```

and:

```js
{ id: 'reference-baseline:connection-center-root', selector: '[data-root]', present: true, textPresent: true }
{ id: 'reference-baseline:tool-oauth-review-steps', selector: '[data-tool]', expectedText: 'review step', present: true, textPresent: false }
```

- [ ] **Step 2: Run the RED test**

Run:

```powershell
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
```

Expected: FAIL because `CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS` and `assertConnectionCenterReferenceBaselineChecks` are not exported.

- [ ] **Step 3: Export baseline ids and assertion helper**

In `scripts/xenesisConnectionCenterLiveSmoke.mjs`, add this after `CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST`:

```js
export const CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS = Object.freeze([
  'reference-baseline:connection-center-root',
  'reference-baseline:connection-center-title',
  'reference-baseline:onboarding-guided-steps',
  'reference-baseline:provider-profile-review-steps',
  'reference-baseline:tool-profile-review-steps',
  'reference-baseline:tool-oauth-review-steps',
  'reference-baseline:tool-oauth-runtime-readback',
  'reference-baseline:channel-runtime-readback',
  'reference-baseline:channel-profile-review-steps',
]);
```

Add this function after `normalizeConnectionCenterSnapshotChecks`:

```js
export function assertConnectionCenterReferenceBaselineChecks(checks) {
  const checksById = new Map(checks.map((check) => [String(check.id), check]));
  const missing = CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS.filter((id) => !checksById.has(id));
  const failing = CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS.filter((id) => checksById.get(id)?.ok !== true);

  if (missing.length > 0) throw new Error(`Missing reference baseline checks: ${missing.join(', ')}`);
  if (failing.length > 0) throw new Error(`Failing reference baseline checks: ${failing.join(', ')}`);
  return checks;
}
```

Update `formatConnectionCenterLiveSmokePlan()` so the returned array includes:

```js
    'Required reference baseline checks:',
    ...CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS.map((id) => `- ${id}`),
```

Replace the snapshot push in `runConnectionCenterLiveSmoke()`:

```js
    const snapshotChecks = normalizeConnectionCenterSnapshotChecks(snapshotResult);
    assertConnectionCenterReferenceBaselineChecks(snapshotChecks);
    checkResults.push(...snapshotChecks);
```

- [ ] **Step 4: Rename snapshot ids in `src/main/index.ts`**

In `snapshotConnectionCenterForCapability`, change the check ids to this exact mapping:

```text
connection-center-root -> reference-baseline:connection-center-root
connection-center-title -> reference-baseline:connection-center-title
onboarding-guided-steps -> reference-baseline:onboarding-guided-steps
provider-profile-review-steps -> reference-baseline:provider-profile-review-steps
tool-profile-review-steps -> reference-baseline:tool-profile-review-steps
tool-oauth-review-steps -> reference-baseline:tool-oauth-review-steps
tool-oauth-runtime-readback -> reference-baseline:tool-oauth-runtime-readback
channel-runtime-readback -> reference-baseline:channel-runtime-readback
channel-profile-review-steps -> reference-baseline:channel-profile-review-steps
```

- [ ] **Step 5: Update shared CR capability test expectations**

In `src/shared/xenesisConnectionCapabilities.test.ts`, replace the snapshot sample:

```ts
checks: [{ id: 'connection-center-root', present: true }]
```

with:

```ts
checks: [{ id: 'reference-baseline:connection-center-root', present: true }]
```

Update any expected result in that test to the same prefixed id.

- [ ] **Step 6: Run focused Connection Center tests**

Run:

```powershell
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
npm run typecheck
```

Expected:

```text
# node --test exits 0
# npm run typecheck exits 0
```

- [ ] **Step 7: Update handoff and commit**

Append touched files, commands, and exact results to `handoff.md`, then run:

```powershell
git add scripts/xenesisConnectionCenterLiveSmoke.mjs scripts/xenesisConnectionCenterLiveSmoke.test.mjs src/main/index.ts src/shared/xenesisConnectionCapabilities.test.ts handoff.md
git commit -m "Enforce Connection Center reference baseline checks"
```

Expected: commit succeeds.

---

### Task 3: Review-Request Approval Scope Label

**Files:**
- Modify: `scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`
- Modify: `scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`
- Modify: `handoff.md`

- [ ] **Step 1: Write the failing proof-scope tests**

In `scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`, extend the import:

```js
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF,
  REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE,
```

Add this helper after imports:

```js
function extractDeskActionPayload(prompt) {
  const match = String(prompt).match(/```xenesis-desk-action\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(match, 'expected fenced xenesis-desk-action block');
  return JSON.parse(match[1]);
}
```

Add this test:

```js
test('review request approval live smoke is labeled as structured approval regression only', () => {
  assert.equal(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE, 'structured-cr-approval-regression');
  assert.equal(REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF, false);

  const plan = formatReviewRequestApprovalLiveSmokePlan();
  assert.match(plan, /Proof type: structured-cr-approval-regression/);
  assert.match(plan, /Provider natural-language CR tool-selection proof: false/);
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
```

Update the report test to assert the new metadata:

```js
  assert.equal(report.proofType, 'structured-cr-approval-regression');
  assert.equal(report.providerNaturalLanguageToolSelectionProof, false);
```

- [ ] **Step 2: Run the RED test**

Run:

```powershell
node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs
```

Expected: FAIL because the proof-scope constants are not exported.

- [ ] **Step 3: Add proof-scope constants and report metadata**

In `scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`, add after the submit path constant:

```js
export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE = 'structured-cr-approval-regression';
export const REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF = false;
```

Update `formatReviewRequestApprovalLiveSmokePlan()` so the `lines` array includes:

```js
    `Proof type: ${REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_PROOF_TYPE}`,
    `Provider natural-language CR tool-selection proof: ${REVIEW_REQUEST_APPROVAL_LIVE_SMOKE_NATURAL_LANGUAGE_TOOL_SELECTION_PROOF}`,
    'Structured action scope: fenced xenesis-desk-action blocks plus real Action Inbox readback',
```

Update `buildReviewRequestApprovalLiveSmokeReport()` return value:

```js
  return {
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
    ...extra,
  };
```

- [ ] **Step 4: Run focused approval smoke tests**

Run:

```powershell
node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs
```

Expected:

```text
# node --test exits 0
```

- [ ] **Step 5: Update handoff and commit**

Append touched files, commands, and exact results to `handoff.md`, then run:

```powershell
git add scripts/xenesisReviewRequestApprovalLiveSmoke.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs handoff.md
git commit -m "Label review approval smoke proof scope"
```

Expected: commit succeeds.

---

### Task 4: Approval Record Unit Coverage

**Files:**
- Create: `src/main/capabilityActionApproval.test.mjs`
- Modify: `src/main/mcpActionInbox.test.mjs`
- Modify: `handoff.md`

- [ ] **Step 1: Add capability approval command tests**

Create `src/main/capabilityActionApproval.test.mjs` with this content:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCapabilityApprovalAllowKey,
  createCapabilityApprovalCommand,
  createCapabilityApprovalRequest,
  isCapabilityApprovalItem,
  parseCapabilityApprovalCommand,
} from './capabilityActionApproval.mjs';

const REQUEST = {
  path: 'xd.xenesis.connections.setupRequests.request',
  source: 'xenesis',
  args: {
    z: 2,
    a: {
      c: 3,
      b: 1,
    },
  },
};

test('capability approval command roundtrips with stable argument ordering', () => {
  const command = createCapabilityApprovalCommand(REQUEST);

  assert.equal(
    command,
    '{"type":"desk-capability-call","path":"xd.xenesis.connections.setupRequests.request","args":{"a":{"b":1,"c":3},"z":2},"source":"xenesis"}',
  );
  assert.deepEqual(parseCapabilityApprovalCommand(command), {
    type: 'desk-capability-call',
    path: 'xd.xenesis.connections.setupRequests.request',
    args: {
      a: {
        b: 1,
        c: 3,
      },
      z: 2,
    },
    source: 'xenesis',
  });
});

test('capability approval allow key is stable for equivalent args', () => {
  const left = createCapabilityApprovalAllowKey({
    path: REQUEST.path,
    source: REQUEST.source,
    args: { b: 2, a: 1 },
  });
  const right = createCapabilityApprovalAllowKey({
    path: REQUEST.path,
    source: REQUEST.source,
    args: { a: 1, b: 2 },
  });

  assert.equal(left, right);
  assert.match(left, /^capability-always:xenesis:xd\.xenesis\.connections\.setupRequests\.request:[a-f0-9]{32}$/);
});

test('capability approval request creates Action Inbox record shape', () => {
  const item = createCapabilityApprovalRequest({
    path: REQUEST.path,
    args: { id: 'notion' },
    source: 'xenesis',
    result: {
      permission: 'control',
      error: 'Capability requires approval: xd.xenesis.connections.setupRequests.request',
    },
  });

  assert.equal(item.id, 'capability-xenesis-xd.xenesis.connections.setupRequests.request');
  assert.equal(item.title, 'Approve Xenesis Desk capability: xd.xenesis.connections.setupRequests.request');
  assert.equal(item.kind, 'capability-approval');
  assert.equal(item.source, 'Xenesis Desk Capability Registry');
  assert.equal(item.sessionId, 'xenesis-capability');
  assert.equal(item.approvalSessionKey, 'capability:xenesis:xd.xenesis.connections.setupRequests.request');
  assert.equal(item.requester, 'xenesis');
  assert.equal(item.risk, 'control');
  assert.equal(item.approveText, 'Approve xd.xenesis.connections.setupRequests.request');
  assert.equal(item.rejectText, 'Reject xd.xenesis.connections.setupRequests.request');
  assert.equal(isCapabilityApprovalItem(item), true);
  assert.deepEqual(parseCapabilityApprovalCommand(item.command), {
    type: 'desk-capability-call',
    path: REQUEST.path,
    args: { id: 'notion' },
    source: 'xenesis',
  });
});

test('capability approval parser rejects non-capability commands', () => {
  assert.throws(
    () => parseCapabilityApprovalCommand('{"type":"other","path":"xd.xenesis.connections.setupRequests.request"}'),
    /not a capability approval command/,
  );
  assert.throws(() => parseCapabilityApprovalCommand('{"type":"desk-capability-call"}'), /missing path/);
});
```

- [ ] **Step 2: Add Action Inbox resolve/readback tests**

Update the import in `src/main/mcpActionInbox.test.mjs`:

```js
import {
  applyMcpActionInboxRequest,
  createMcpActionInboxState,
  listMcpActionInboxItems,
  resolveMcpActionInboxItem,
} from './mcpActionInbox.mjs';
```

Append these tests:

```js
test('resolveMcpActionInboxItem approves pending capability records and hides resolved items by default filter', () => {
  const state = createMcpActionInboxState();
  applyMcpActionInboxRequest(
    state,
    capabilityApprovalRequest({
      createdAt: '2026-06-28T00:10:00.000Z',
      updatedAt: '2026-06-28T00:10:00.000Z',
      expiresAt: '2026-06-28T00:15:00.000Z',
    }),
  );

  const resolved = resolveMcpActionInboxItem(state, {
    id: CAPABILITY_APPROVAL_ID,
    resolution: 'approve',
    at: '2026-06-28T00:11:00.000Z',
    result: 'Capability call approved and executed: xd.xenesis.connections.setupRequests.request',
  });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.item.status, 'approved');
  assert.equal(resolved.item.resolvedAt, '2026-06-28T00:11:00.000Z');
  assert.equal(resolved.item.lastCallbackAt, '2026-06-28T00:11:00.000Z');
  assert.match(resolved.item.result, /approved and executed/);
  assert.deepEqual(listMcpActionInboxItems(state, { includeResolved: false }), []);
  assert.equal(listMcpActionInboxItems(state, { includeResolved: true })[0].status, 'approved');
});

test('resolveMcpActionInboxItem rejects pending capability records with readback error text', () => {
  const state = createMcpActionInboxState();
  applyMcpActionInboxRequest(
    state,
    capabilityApprovalRequest({
      createdAt: '2026-06-28T00:20:00.000Z',
      updatedAt: '2026-06-28T00:20:00.000Z',
      expiresAt: '2026-06-28T00:25:00.000Z',
    }),
  );

  const resolved = resolveMcpActionInboxItem(state, {
    id: CAPABILITY_APPROVAL_ID,
    resolution: 'reject',
    at: '2026-06-28T00:21:00.000Z',
    error: 'User rejected Desk capability approval.',
  });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.item.status, 'rejected');
  assert.equal(resolved.item.resolvedAt, '2026-06-28T00:21:00.000Z');
  assert.equal(resolved.item.error, 'User rejected Desk capability approval.');
  assert.equal(listMcpActionInboxItems(state, { includeResolved: true })[0].status, 'rejected');
});
```

- [ ] **Step 3: Run approval unit tests**

Run:

```powershell
node --test src\main\capabilityActionApproval.test.mjs
node --test src\main\mcpActionInbox.test.mjs
```

Expected:

```text
# both node --test commands exit 0
```

- [ ] **Step 4: Update handoff and commit**

Append touched files, commands, and exact results to `handoff.md`, then run:

```powershell
git add src/main/capabilityActionApproval.test.mjs src/main/mcpActionInbox.test.mjs handoff.md
git commit -m "Add approval record unit coverage"
```

Expected: commit succeeds.

---

### Task 5: Obsidian Reference And Verification Indexes

**Files:**
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`
- Modify: `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`
- Modify: `docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-1-live-cr-baseline-plan.md`
- Modify: `handoff.md`

- [ ] **Step 1: Add the Slice 01 adoption record**

In `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`, replace `- Slice 01: pending implementation evidence.` with:

```markdown
### Slice 01: Live CR Baseline

| Field | Record |
|---|---|
| Reference analysis | `F:\agent-anal\analysis\_xenesis-gap-shared-context.md`; `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`; `F:\agent-anal\analysis\openclaw-main\12-channels-routing.md`; `F:\agent-anal\analysis\hermes-agent-main\08-channels-ui.md` |
| Original source checked | `F:\agent-anal\openclaw-main\src\routing\resolve-route.ts`; `F:\agent-anal\openclaw-main\src\routing\session-key.ts`; `F:\agent-anal\openclaw-main\src\channels\allowlist-match.ts`; `F:\agent-anal\hermes-agent-main\tui_gateway\server.py`; `F:\agent-anal\hermes-agent-main\tui_gateway\ws.py`; `F:\agent-anal\hermes-agent-main\apps\desktop\electron\main.cjs` |
| Borrowed pattern | Stable explicit proof surfaces, session/readback evidence, and audit-backed routing coverage. |
| Xenesis adaptation | Use CR calls `xd.xenesis.connections.open`, `xd.testing.connectionCenter.snapshot`, `xd.testing.xenesisAgent.submitPrompt`, and `xd.mcp.actionInbox.list`; require exact `reference-baseline:*` checks and Action Inbox readback. |
| Rejected behavior | Prompt keyword routing, hidden provider fallbacks, provider-specific CR shortcuts, chat-only approval text, and treating fenced action smoke as provider NL tool-selection proof. |
| Verification | `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs`; `node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs`; `node --test src\main\capabilityActionApproval.test.mjs`; `node --test src\main\mcpActionInbox.test.mjs`; `npm run docs:capabilities:audit`; `node scripts\assertCapabilityAuditZero.mjs`; live smoke commands recorded in `handoff.md`. |
```

- [ ] **Step 2: Add verification map rows**

In `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`, add these rows to the `## Commands` table:

```markdown
| CR audit zero assertion | `node scripts\assertCapabilityAuditZero.mjs` |
| Connection Center live smoke JSON evidence | `node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json` |
| Review request approval live smoke JSON evidence | `node .\scripts\xenesisReviewRequestApprovalLiveSmoke.mjs --json` |
```

- [ ] **Step 3: Add CR proof surfaces**

In `docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md`, add this section before `## Graph Links`:

```markdown
## Development Live Proof Surfaces

These are verification surfaces, not user-facing product shortcuts.

| Surface | Purpose |
|---|---|
| `xd.xenesis.connections.open` | Opens the CR-backed Connection Center surface for live smoke setup. |
| `xd.testing.connectionCenter.snapshot` | Reads Connection Center renderer evidence and emits exact `reference-baseline:*` checks. |
| `xd.tools.core.xenesisAgent.open` | Opens the Agent pane before structured approval regression smoke. |
| `xd.testing.xenesisAgent.submitPrompt` | Development-only smoke driver for Agent pane prompts and approval button execution. |
| `xd.mcp.actionInbox.list` | Reads pending/approved/rejected Action Inbox records for approval evidence. |
| `xd.xenesis.connections.setupRequests.request` | Approval-required CR call used by the structured review-request regression smoke with `approved=false`. |
```

- [ ] **Step 4: Point the tracked Slice 1 note to this plan**

In `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-1-live-cr-baseline-plan.md`, add `docs/superpowers/plans/2026-06-29-slice-01-live-cr-baseline.md` to `touches` and replace the local detailed implementation plan sentence with:

```markdown
The current detailed implementation plan is stored at
`docs/superpowers/plans/2026-06-29-slice-01-live-cr-baseline.md`.
The older local plan
`docs/superpowers/plans/2026-06-29-slice-1-live-cr-baseline-reference-map.md`
is superseded by the stricter Slice 01 plan because it predates the adversarial
spec review.
```

- [ ] **Step 5: Run graph hygiene checks**

Run:

```powershell
$markers = @(
  'TB' + 'D',
  'TO' + 'DO',
  'fill' + ' in',
  'implement' + ' later',
  'Similar' + ' to Task',
  'place' + 'holder',
  'appropriate' + ' error',
  'edge' + ' cases'
) -join '|'
rg -n $markers docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-29-reference-adoption-map-proposal.md docs\obsidian\Xenesis-desk\_Indexes\Verification Map.md docs\obsidian\Xenesis-desk\_Indexes\CR Surface Index.md docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-29-slice-1-live-cr-baseline-plan.md
```

Expected: no matches and exit code `1` from `rg` because no lines matched.

- [ ] **Step 6: Update handoff and commit**

Append touched files, commands, and exact results to `handoff.md`, then run:

```powershell
git add "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md" "docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md" "docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md" "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-1-live-cr-baseline-plan.md" handoff.md
git commit -m "Document slice 01 live CR baseline proof surfaces"
```

Expected: commit succeeds.

---

### Task 6: Slice Verification And Live Smokes

**Files:**
- Modify: `handoff.md`
- Force-add if this plan should be committed: `docs/superpowers/plans/2026-06-29-slice-01-live-cr-baseline.md`

- [ ] **Step 1: Run focused test suite**

Run:

```powershell
node --test scripts\assertCapabilityAuditZero.test.mjs
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs
node --test src\main\capabilityActionApproval.test.mjs
node --test src\main\mcpActionInbox.test.mjs
```

Expected:

```text
# every node --test command exits 0
```

- [ ] **Step 2: Run CR audit and build gates**

Run:

```powershell
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
npm run typecheck
npm run build
```

Expected:

```text
# npm run docs:capabilities:audit exits 0
capability-audit-zero: verified 4 counters in docs\capability-registry-audit.md
# npm run typecheck exits 0
# npm run build exits 0
```

- [ ] **Step 3: Run live Electron smokes**

Run:

```powershell
node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json
node .\scripts\xenesisReviewRequestApprovalLiveSmoke.mjs --json
```

Expected Connection Center JSON includes:

```json
{
  "ok": true,
  "checks": [
    { "id": "reference-baseline:connection-center-root", "ok": true },
    { "id": "reference-baseline:connection-center-title", "ok": true },
    { "id": "reference-baseline:onboarding-guided-steps", "ok": true },
    { "id": "reference-baseline:provider-profile-review-steps", "ok": true },
    { "id": "reference-baseline:tool-profile-review-steps", "ok": true },
    { "id": "reference-baseline:tool-oauth-review-steps", "ok": true },
    { "id": "reference-baseline:tool-oauth-runtime-readback", "ok": true },
    { "id": "reference-baseline:channel-runtime-readback", "ok": true },
    { "id": "reference-baseline:channel-profile-review-steps", "ok": true }
  ]
}
```

Expected review-request approval JSON includes:

```json
{
  "ok": true,
  "proofType": "structured-cr-approval-regression",
  "providerNaturalLanguageToolSelectionProof": false
}
```

- [ ] **Step 4: Record exact verification in handoff**

Update `handoff.md` with:

```markdown
- Exact verification result:
  - `node --test scripts\assertCapabilityAuditZero.test.mjs`: PASS
  - `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs`: PASS
  - `node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs`: PASS
  - `node --test src\main\capabilityActionApproval.test.mjs`: PASS
  - `node --test src\main\mcpActionInbox.test.mjs`: PASS
  - `npm run docs:capabilities:audit`: PASS
  - `node scripts\assertCapabilityAuditZero.mjs`: PASS, verified 4 counters
  - `npm run typecheck`: PASS
  - `npm run build`: PASS
  - `npm run smoke:xenesis:connection-center`: PASS live smoke text output; PowerShell/npm 11.5.1 did not forward the attempted `--json` arg in this environment
  - `node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json`: PASS structured JSON, all nine `reference-baseline:*` checks passed
  - `npm run smoke:xenesis:review-request-approval`: PASS live smoke text output; PowerShell/npm 11.5.1 did not forward the attempted `--json` arg in this environment
  - `node .\scripts\xenesisReviewRequestApprovalLiveSmoke.mjs --json`: PASS structured JSON, proof type is structured CR approval regression and provider NL tool-selection proof is false
- Known gaps:
  - This slice does not prove provider natural-language CR tool selection. That remains part of provider/onboarding live verification in later slices.
- Next intended step:
  - Move to Slice 02 provider onboarding only after Slice 01 changes are committed and the worktree is clean.
```

If a live smoke fails because Electron cannot launch or built output is missing, record the exact command and error instead of the PASS line, then fix the launch/build issue before claiming Slice 01 completion.

- [ ] **Step 5: Final diff checks**

Run:

```powershell
git diff --check
git status --short
```

Expected:

```text
# git diff --check exits 0
# git status --short shows only intended Slice 01 files before commit
```

- [ ] **Step 6: Commit final verification record and plan**

If `docs/superpowers/` remains ignored and this plan is a deliverable, force-add it explicitly:

```powershell
git add handoff.md docs/capability-registry-audit.md
git add -f docs/superpowers/plans/2026-06-29-slice-01-live-cr-baseline.md
git commit -m "Record slice 01 live CR baseline verification"
```

Expected: commit succeeds and `git status --short` is clean.

## Self-Review Checklist

- Spec coverage: Tasks 1 and 6 cover audit-zero; Task 2 covers exact Connection Center `reference-baseline:*` ids; Tasks 3 and 4 cover structured approval regression and Action Inbox readback; Task 5 covers Obsidian reference/index updates.
- Routing boundary: no task adds deterministic natural-language routing, keyword routing, heuristic desk-control routing, provider-specific CR shortcuts, or chat-only approval.
- Proof boundary: the review-request approval smoke is explicitly labeled `structured-cr-approval-regression` with `providerNaturalLanguageToolSelectionProof: false`.
- Source-of-truth boundary: Obsidian updates are documentation/context only; the completion gate is focused tests, CR audit-zero, typecheck, build, and live smoke JSON.
