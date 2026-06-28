# Xenesis Review Request Approval Live Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove a natural-language Xenesis review request creates a real approval stop, can be approved from the Agent pane, and records the expected local Action Inbox review item.

**Architecture:** Fix the Action Inbox persistence layer so repeated capability approval requests reset resolved/expired items back to a fresh pending request. Add a dedicated, mutating live smoke script separate from the broad natural routing smoke so the broad smoke can remain approval-stop only.

**Tech Stack:** Node test runner, Playwright Electron, Xenesis Desk Capability Registry, existing `xd.testing.xenesisAgent.submitPrompt` test capability.

---

### Task 1: Refresh Expired Capability Approval Items

**Files:**
- Create: `src/main/mcpActionInbox.test.mjs`
- Modify: `src/main/mcpActionInbox.mjs`

- [x] **Step 1: Write the failing test**

Add a node:test case that records an expired capability approval item, records the same approval session again without an explicit status, and expects the stored item to be pending with fresh timestamps and cleared resolution fields.

- [x] **Step 2: Run the RED test**

Run: `node --test src/main/mcpActionInbox.test.mjs`

Expected: FAIL because `applyMcpActionInboxRequest` currently preserves the expired status from the existing item.

- [x] **Step 3: Implement the minimal persistence fix**

In `src/main/mcpActionInbox.mjs`, when a matching existing item is not pending and the incoming request did not explicitly provide `status`, treat it as a new request: set status from the normalized incoming item, use the incoming `createdAt`/`expiresAt`, and clear `resolvedAt`, `lastCallbackAt`, `result`, and `error`.

- [x] **Step 4: Run the GREEN test**

Run: `node --test src/main/mcpActionInbox.test.mjs`

Expected: PASS.

### Task 2: Add Mutating Review-Request Approval Live Smoke

**Files:**
- Create: `scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`
- Create: `scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`
- Modify: `package.json`

- [x] **Step 1: Write failing script tests**

Add tests that import the new smoke script and assert the single safe case:
`노션 연결해줘` -> `xd.xenesis.connections.setupRequests.request` -> `승인` -> pending `Review Notion setup request` Action Inbox item.

- [x] **Step 2: Run the RED script tests**

Run: `node --test scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`

Expected: FAIL because the script does not exist yet.

- [x] **Step 3: Implement the smoke script**

Create an Electron Playwright smoke that opens Xenesis Agent, snapshots Action Inbox, submits the request prompt, verifies the capability approval item is pending, submits `승인`, verifies the approval button was clicked and `Desk action completed` appeared, then verifies the local review item fields.

- [x] **Step 4: Expose the package script**

Add `smoke:xenesis:review-request-approval` mapped to `node ./scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`.

- [x] **Step 5: Run GREEN script tests**

Run: `node --test scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`

Expected: PASS.

### Task 3: Verify and Record the Slice

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`

- [x] **Step 1: Format and scoped lint**

Run:
`npx biome format --write src/main/mcpActionInbox.mjs src/main/mcpActionInbox.test.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs package.json`

Run:
`npx biome check src/main/mcpActionInbox.mjs src/main/mcpActionInbox.test.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs package.json --max-diagnostics 80`

- [x] **Step 2: Run focused tests**

Run:
`node --test src/main/mcpActionInbox.test.mjs scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`

- [x] **Step 3: Run the live smoke**

Run:
`npm run smoke:xenesis:review-request-approval -- --json --timeout=45000`

Expected: all checks pass. This creates or refreshes local Action Inbox review records only.

- [x] **Step 4: Run broad checks**

Run:
`npm run typecheck`

Run:
`git diff --check`

Skip `npm run docs:capabilities:audit` unless CR schemas or dispatchers changed; this slice changes storage and smoke coverage, not registry schema.

- [x] **Step 5: Update working docs and commit**

Update `handoff.md` and the Obsidian working note with exact commands/results, then commit the slice.
