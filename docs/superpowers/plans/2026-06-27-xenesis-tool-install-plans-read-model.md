# Xenesis Tool Install Plans Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and CR-openable on-demand install-plan surface for Xenesis external tool setup.

**Architecture:** Extend existing `XenesisConnectionItem` tool metadata with a `toolInstallPlan` read model. Derive `xd.xenesis.tools.installPlans.status` and `xd.xenesis.tools.installPlans.open` from `xd.xenesis.connections.status`; the open path focuses the matching Connection Center card and never installs MCP servers, completes OAuth, stores tokens, executes provider tools, or enables writes.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Electron CR adapter, Settings React pane.

---

### Task 1: RED Tests For Tool Install Plans

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [ ] **Step 1: Write failing shared model test**

Add a test asserting Notion exposes a copy-ready MCP install plan and Google Calendar exposes a planned OAuth install plan through `buildXenesisConnectionsStatus()`.

- [ ] **Step 2: Write failing CR capability test**

Add a test asserting `xd.xenesis.tools.installPlans.status` is read/no-approval, `xd.xenesis.tools.installPlans.open` is control/no-approval, both accept `notion`, `google-workspace`, and `google-calendar`, and both dispatch to adapter methods.

- [ ] **Step 3: Write failing renderer summary and prompt-hint tests**

Add a test for `formatXenesisToolInstallPlanSummary()` returning `copy-template / ready-template / 3 step(s)`, and assert the Agent prompt hint lists both install-plan CR paths.

- [ ] **Step 4: Run RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: failures for missing `toolInstallPlan`, missing CR paths, missing renderer helper, and missing prompt hint paths.

### Task 2: Implement Shared Model And CR Paths

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Add install-plan types**

Add `XenesisConnectionToolInstallPlanTemplate` with install mode, runtime support, surfaces, actions, steps, config targets, required env, read paths, control paths, diagnostics, and safety boundaries.

- [ ] **Step 2: Add install-plan metadata to tool cards**

Cover Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, and Google Calendar. Fetch/Filesystem/GitHub/Notion are copy-template plans, Linear is OAuth-template, and Google Workspace/Google Calendar are planned OAuth.

- [ ] **Step 3: Register and dispatch CR paths**

Add `xd.xenesis.tools.installPlans.status` and `xd.xenesis.tools.installPlans.open` with tool/id aliases and no approval.

- [ ] **Step 4: Add main-process status/open adapters**

Status filters tool cards with `toolInstallPlan`. Open focuses Settings > Xenesis Agent > Connections using the existing built-in pane capability.

- [ ] **Step 5: Run GREEN tests**

Run the RED command again and expect all tests to pass.

### Task 3: Render, Document, And Verify

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [ ] **Step 1: Render install plans in Settings**

Add `data-xenesis-tool-install-plan="<tool-id>"` and show summary, surfaces, actions, steps, config targets, required env, readback, controls, diagnostics, and safety boundaries.

- [ ] **Step 2: Update docs and Obsidian working note**

Document that install plans are read/open planning surfaces and do not install MCP servers, complete OAuth, store tokens, or execute tools.

- [ ] **Step 3: Verify**

Run focused tests, scoped Biome check for touched small files, `npm run typecheck`, `npm run docs:capabilities:audit`, `npm run build`, `npm run check:public-release`, and live Electron smoke for status/open/Agent-pane execution.

- [ ] **Step 4: Commit**

Commit as:

```powershell
git commit -m "feat: add xenesis tool install plans"
```
