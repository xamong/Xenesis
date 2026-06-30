# Xenesis Setup Request Review Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the Action Inbox review lifecycle for each Connection Center setup request through existing CR status/readback surfaces.

**Architecture:** Keep setup request creation on `xd.xenesis.connections.setupRequests.request` and Action Inbox resolution on `xd.mcp.actionInbox.resolve`. Add a pure shared enrichment helper that joins `XenesisConnectionsStatus` setup-request templates to Action Inbox items by `approvalSessionKey`, then use that helper in the main-process `getXenesisConnectionsStatus()` and `xd.xenesis.connections.setupRequests.status` projection. Renderer Settings displays the joined review status without exposing raw command payloads.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Electron main-process CR adapter, React Settings pane, existing MCP Action Inbox storage, Biome.

---

### Task 1: RED Tests For Review Status Join

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`

- [ ] **Step 1: Add shared review-state test**

Add a test after the setup request template test:

```ts
test('withXenesisConnectionSetupRequestReviews joins Action Inbox review state by approval session key', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: { provider: 'codex', apiKey: 'set' },
    mcp: readyMcp,
    providerIntegration: readyProviderIntegration,
    xenesis: readyXenesis,
    env: {},
    repoRoot,
  });

  const enriched = withXenesisConnectionSetupRequestReviews(status, [
    {
      id: 'setup-notion',
      kind: 'xenesis-connection-setup',
      title: 'Review setup request for Notion',
      approvalSessionKey: 'xenesis-connection-setup:notion',
      requester: 'tester',
      source: 'Xenesis Connection Center',
      status: 'pending',
      createdAt: '2026-06-27T01:00:00.000Z',
      updatedAt: '2026-06-27T01:00:00.000Z',
      expiresAt: '2026-06-27T01:05:00.000Z',
      resolvedAt: '',
      result: '',
      error: '',
    },
  ]);

  const notion = enriched.sections.tools.items.find((item) => item.id === 'notion');
  const linear = enriched.sections.tools.items.find((item) => item.id === 'linear');

  assert.equal(notion?.setupRequest?.review?.status, 'pending');
  assert.equal(notion?.setupRequest?.review?.actionInboxItemId, 'setup-notion');
  assert.equal(notion?.setupRequest?.review?.requester, 'tester');
  assert.equal(notion?.setupRequest?.review?.approvalSessionKey, 'xenesis-connection-setup:notion');
  assert.equal(linear?.setupRequest?.review?.status, 'not-requested');
  assert.equal(linear?.setupRequest?.review?.approvalSessionKey, 'xenesis-connection-setup:linear');
});
```

Expected failure before implementation: `withXenesisConnectionSetupRequestReviews` is not exported and `setupRequest.review` does not exist.

- [ ] **Step 2: Add renderer review summary test**

Add a formatter test:

```ts
test('formatXenesisConnectionSetupReviewSummary describes Action Inbox review state', () => {
  assert.equal(
    formatXenesisConnectionSetupReviewSummary({
      status: 'pending',
      actionInboxItemId: 'setup-notion',
      approvalSessionKey: 'xenesis-connection-setup:notion',
      requester: 'tester',
      source: 'Xenesis Connection Center',
      createdAt: '2026-06-27T01:00:00.000Z',
      updatedAt: '2026-06-27T01:00:00.000Z',
      expiresAt: '2026-06-27T01:05:00.000Z',
      resolvedAt: '',
      result: '',
      error: '',
    }),
    'pending / setup-notion / tester',
  );
});
```

Expected failure before implementation: formatter and review type are missing.

- [ ] **Step 3: Run RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: FAIL for missing review helper/type/formatter.

### Task 2: Shared Review Enrichment

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add review types**

Add near `XenesisConnectionSetupRequestTemplate`:

```ts
export type XenesisConnectionSetupRequestReviewStatus =
  | 'not-requested'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'expired';

export interface XenesisConnectionSetupRequestReview {
  status: XenesisConnectionSetupRequestReviewStatus;
  approvalSessionKey: string;
  actionInboxItemId?: string;
  requester?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  resolvedAt?: string;
  result?: string;
  error?: string;
}

export interface XenesisConnectionSetupRequestReviewInput {
  id?: string;
  kind?: string;
  approvalSessionKey?: string;
  requester?: string;
  source?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  resolvedAt?: string;
  result?: string;
  error?: string;
}
```

Add `review?: XenesisConnectionSetupRequestReview` to `XenesisConnectionSetupRequestTemplate`.

- [ ] **Step 2: Add shared key and join helpers**

Add:

```ts
export function buildXenesisConnectionSetupApprovalSessionKey(id: string): string {
  return `xenesis-connection-setup:${id}`;
}
```

Add `withXenesisConnectionSetupRequestReviews(status, inboxItems)` that:

- Builds a latest-item map by `approvalSessionKey`.
- Only accepts statuses in the review-status union.
- Clones every section and item instead of mutating the input.
- Adds `{ status: 'not-requested', approvalSessionKey }` when no matching inbox item exists.
- Adds a review with `actionInboxItemId`, requester/source/timestamps/result/error when a matching item exists.

- [ ] **Step 3: Re-export new types/helpers**

Update `src/shared/types.ts` exports for:

```ts
XenesisConnectionSetupRequestReview
XenesisConnectionSetupRequestReviewInput
XenesisConnectionSetupRequestReviewStatus
buildXenesisConnectionSetupApprovalSessionKey
withXenesisConnectionSetupRequestReviews
```

- [ ] **Step 4: Run GREEN for shared tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

### Task 3: Main-Process Wiring And CR Projection

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`

- [ ] **Step 1: Add CR projection test for review state**

Extend the setup request capability test adapter expectation so the status result can include:

```ts
items: [{ id: 'notion', review: { status: 'pending', actionInboxItemId: 'setup-notion' } }]
```

This verifies the dispatcher preserves the status payload shape.

- [ ] **Step 2: Enrich main `getXenesisConnectionsStatus()`**

Change `getXenesisConnectionsStatus()` to:

```ts
const status = buildXenesisConnectionsStatus(...);
return withXenesisConnectionSetupRequestReviews(status, listMcpActionInboxSnapshot());
```

This makes `window.xenesisAPI.connectionsStatus()` and direct CR reads agree.

- [ ] **Step 3: Include review in setup request status item**

Update `xenesisConnectionSetupRequestStatusItem()`:

```ts
review: item.setupRequest?.review,
```

- [ ] **Step 4: Reuse the shared approval session key**

Update `requestXenesisConnectionSetup()` to call:

```ts
approvalSessionKey: buildXenesisConnectionSetupApprovalSessionKey(item.id),
```

- [ ] **Step 5: Run focused CR tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: PASS.

### Task 4: Renderer And Documentation

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`

- [ ] **Step 1: Add renderer formatter**

Add:

```ts
export function formatXenesisConnectionSetupReviewSummary(
  review: XenesisConnectionSetupRequestReview,
): string {
  return `${review.status} / ${review.actionInboxItemId ?? review.approvalSessionKey} / ${review.requester || 'unknown requester'}`;
}
```

- [ ] **Step 2: Render review state**

In the setup request block, render:

```tsx
{setupRequest.review ? (
  <div data-xenesis-connection-setup-review={item.id}>
    <span>{t('settings.xenesisConnectionsSetupRequestReviewStatus')}</span>
    <strong>{formatXenesisConnectionSetupReviewSummary(setupRequest.review)}</strong>
  </div>
) : null}
```

- [ ] **Step 3: Add i18n labels**

Add English:

```ts
xenesisConnectionsSetupRequestReviewStatus: 'Review status',
```

Add Korean:

```ts
xenesisConnectionsSetupRequestReviewStatus: '검토 상태',
```

- [ ] **Step 4: Update docs**

Document that setup request status now joins Action Inbox review state by `approvalSessionKey`, and that the readback does not execute setup work or expose raw command payloads.

- [ ] **Step 5: Run renderer tests**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: PASS.

### Task 5: Verification, Live Smoke, Commit

**Files:**
- Modify: `handoff.md` (ignored work log)

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run CR and build gates**

Run:

```powershell
npm run typecheck
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Expected: typecheck, CR audit, and build pass. `check:public-release` may still fail with the known `.github/workflows/ci.yml` gap; record the exact result.

- [ ] **Step 3: Live Electron smoke**

Use Playwright `_electron.launch` with a fresh `XENIS_HOME`.

Verify:

- Direct `xd.xenesis.connections.setupRequests.status` for `notion` initially returns review `not-requested`.
- Direct approved `xd.xenesis.connections.setupRequests.request` for `notion` records an Action Inbox item.
- A second `setupRequests.status` for `notion` returns review `pending` with the Action Inbox item id.
- Settings renders `[data-xenesis-connection-setup-review="notion"]`.
- Agent-pane fenced CR prompt for `xd.xenesis.connections.setupRequests.status` matches `Desk action completed`.

- [ ] **Step 4: Commit**

Stage tracked files and force-add the plan:

```powershell
git add -u
git add -f docs\superpowers\plans\2026-06-27-xenesis-setup-request-review-status.md
git commit -m "feat: show xenesis setup request review status"
```

Expected: one commit on `agent/upcoming-work-20260627`.

---

## Self-Review

- Spec coverage: The plan covers shared model, CR projection, Settings rendering, docs, tests, live smoke, and commit.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: Review status/type/helper names are consistent across shared, main, renderer, and tests.
