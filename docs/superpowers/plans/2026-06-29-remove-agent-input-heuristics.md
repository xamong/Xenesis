# Remove Agent Input Heuristics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove remaining hardcoded natural-language and regex-based Agent input routing so ordinary prompts reach the configured provider, with CR execution limited to explicit protocol payloads or explicit UI/test actions.

**Architecture:** Delete the renderer input classifier and the testing helper's approval-word matcher. Keep explicit `xenesis-desk-action` blocks and inline approval buttons because they are structured UI/protocol actions, not natural-language routing. Replace provider prompt wording that listed ordinary surface words with a CR discovery contract.

**Tech Stack:** Electron renderer TypeScript/React, main-process CR testing helper, Vitest/node tests, Biome, TypeScript.

---

### Task 1: Add Failing Guards

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- Modify: `packages/xenesis/src/core/AgentRuntimeFactory.modeMessages.test.ts`

- [ ] **Step 1: Write the failing tests**

Add assertions that block:
- `xenesisAgentInputRouting` imports and module files.
- `isXenesisApprovalIntent`.
- approval-word regexes in `src/main/index.ts`.
- provider system prompt phrases such as `Infer the intended Desk surface` and `ordinary wording`.

- [ ] **Step 2: Run RED**

Run:

```bash
npx tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts
npm --prefix packages/xenesis exec vitest run src/core/AgentRuntimeFactory.modeMessages.test.ts
```

Expected: both fail because the classifier, approval regex, and prompt wording still exist.

### Task 2: Remove Renderer Input Classifier

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
- Delete: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentInputRouting.ts`
- Delete: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentInputRouting.test.ts`

- [ ] **Step 1: Remove production imports and branches**

Remove `isXenesisApprovalIntent` and the pending Markdown save natural approval path. Ordinary prompts should continue to provider unless they are slash commands or explicit `xenesis-desk-action` blocks.

- [ ] **Step 2: Remove dead pending-save state**

Delete the unused pending Markdown save ref and helper functions from `XenesisAgentPane.tsx`.

### Task 3: Make Approval Smoke Explicit

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`
- Modify: `scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`

- [ ] **Step 1: Replace approval-word matching**

Add testing-only `approvePendingAction` plus `approvalAction` args. The helper clicks an inline approval button only when the explicit flag is present.

- [ ] **Step 2: Update smoke requests**

Change approval submit requests to use a neutral marker prompt and `approvePendingAction: true` instead of `prompt: "승인"`.

### Task 4: Remove Provider Prompt Heuristic Wording

**Files:**
- Modify: `packages/xenesis/src/core/AgentRuntimeFactory.ts`

- [ ] **Step 1: Replace ordinary-word instruction**

Replace the surface-word inference instruction with a provider reasoning contract: classify Desk-control requests as `operate-desk`, then discover and inspect CR capabilities instead of relying on a built-in natural-language table or word list.

### Task 5: Verify and Commit

**Files:**
- Modify: `handoff.md`
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-remove-agent-input-heuristics.md`

- [ ] **Step 1: Run GREEN and focused checks**

Run:

```bash
npx tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts
node --test scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs
npm --prefix packages/xenesis exec vitest run src/core/AgentRuntimeFactory.modeMessages.test.ts
npm run typecheck
```

- [ ] **Step 2: Run source scan**

Run:

```bash
rg -n "xenesisAgentInputRouting|isXenesisApprovalIntent|Infer the intended Desk surface|ordinary wording|approval word|APPROVAL_WORD_PATTERN" src packages scripts
```

Expected: no production matches.

- [ ] **Step 3: Update logs and commit**

Update `handoff.md` and the Obsidian working note with exact command results, then commit the slice.
