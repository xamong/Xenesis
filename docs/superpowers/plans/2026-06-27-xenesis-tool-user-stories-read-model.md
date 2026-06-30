# Xenesis Tool User Stories Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and CR-openable Hermes-style user-story workflow model for external tools, especially inbox, calendar, Notion knowledge, and task workflows.

**Architecture:** Extend existing `XenesisConnectionItem` tool metadata with a `toolUserStory` read model. Derive `xd.xenesis.tools.userStories.status` and `xd.xenesis.tools.userStories.open` from `xd.xenesis.connections.status`; the open path focuses the matching Connection Center card and never installs tools, completes OAuth, stores tokens, or executes provider MCP tools.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Electron CR adapter, Settings React pane.

---

### Task 1: RED Tests For Shared Tool User Stories

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`

- [ ] **Step 1: Write failing shared model test**

Add a test asserting Notion exposes a ready-template knowledge workflow and Google Calendar exposes a planned OAuth calendar workflow through `buildXenesisConnectionsStatus()`.

- [ ] **Step 2: Write failing CR capability test**

Add a test asserting `xd.xenesis.tools.userStories.status` is read/no-approval, `xd.xenesis.tools.userStories.open` is control/no-approval, both accept `google-calendar`, and both dispatch to adapter methods.

- [ ] **Step 3: Write failing renderer summary test**

Add a test for `formatXenesisToolUserStorySummary()` returning `calendar-context / planned-oauth / 3 user story/stories`.

- [ ] **Step 4: Run RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: failures for missing `toolUserStory`, missing CR paths, and missing renderer helper.

### Task 2: Implement Shared Model And CR Paths

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Add `XenesisConnectionToolUserStoryTemplate` types**

Add workflow type, runtime support, user stories, scopes, read paths, control paths, diagnostics, and safety boundaries.

- [ ] **Step 2: Add `toolUserStory` metadata to tool cards**

Cover Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, and Google Calendar. Keep Google Workspace and Google Calendar as planned OAuth read models.

- [ ] **Step 3: Register and dispatch CR paths**

Add `xd.xenesis.tools.userStories.status` and `xd.xenesis.tools.userStories.open` with tool/id aliases and no approval.

- [ ] **Step 4: Add main-process read/open adapters**

Status filters tool cards with `toolUserStory`. Open focuses Settings > Xenesis Agent > Connections using the existing built-in pane capability.

- [ ] **Step 5: Run GREEN tests**

Run the RED command again and expect all tests to pass.

### Task 3: Render, Document, And Verify

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [ ] **Step 1: Render `toolUserStory` in Settings**

Add `data-xenesis-tool-user-story="<tool-id>"` and show workflow summary, user stories, scopes, readback, controls, diagnostics, and safety boundaries.

- [ ] **Step 2: Update docs and Obsidian working note**

Document that user-story workflows are read/open planning surfaces and do not run tool actions.

- [ ] **Step 3: Verify**

Run focused tests, scoped Biome check for touched small files, `npm run typecheck`, `npm run docs:capabilities:audit`, `npm run build`, `npm run check:public-release`, and live Electron smoke for status/open/Agent-pane execution.

- [ ] **Step 4: Commit**

Commit as:

```powershell
git commit -m "feat: add xenesis tool user story workflows"
```
