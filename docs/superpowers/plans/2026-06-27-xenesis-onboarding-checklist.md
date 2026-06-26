# Xenesis Onboarding Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and Settings-visible onboarding checklist that turns provider, MCP, tool, gateway, messenger routing, and final test readiness into one ordered setup journey.

**Architecture:** Keep `xd.xenesis.connections.status` as the single read model and add a first-class `onboarding` section derived from existing connection state. Each checklist item remains read-only and routes users to existing CR-backed settings or guide actions instead of inventing new mutating paths.

**Tech Stack:** TypeScript shared model, Node `tsx --test`, React SettingsPane generic connection cards, Electron live smoke.

---

### Task 1: Shared Onboarding Read Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write failing tests**

Add a test proving the status includes `sections.onboarding` before provider/local CLI/MCP/tool/gateway/messenger/guide sections. Assert it contains ordered items for `first-chat`, `local-cli-mcp`, `recommended-tools`, `gateway`, `messenger-routing`, and `test-send`.

- [x] **Step 2: Run RED**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`
Expected: FAIL because `sections.onboarding` is not defined.

- [x] **Step 3: Implement onboarding section**

Add `onboarding` to `XenesisConnectionsStatus.sections`, include `'onboarding'` in `XenesisConnectionKind`, derive checklist item statuses from provider, local CLI, MCP, tool, gateway, and messenger items, and keep actions routed through `settingsAction` or `guidePath`.

- [x] **Step 4: Run GREEN**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`
Expected: PASS.

### Task 2: Renderer Ordering And Guide Copy

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Test: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `docs/manual/09-onboarding-connections.md`

- [x] **Step 1: Write failing renderer-order test**

Update the section-order test so `onboarding` is the first section returned by `listXenesisConnectionSections`.

- [x] **Step 2: Run RED**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
Expected: FAIL because `onboarding` is not yet listed.

- [x] **Step 3: Implement renderer ordering and docs**

Add `status.sections.onboarding` to the section order and update the manual with the checklist semantics, routing/readback expectation, and planned-vs-actionable boundaries.

- [x] **Step 4: Run GREEN**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
Expected: PASS.

### Task 3: Verification And Commit

**Files:**
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Verify**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
npm run typecheck
npm run docs:capabilities:audit
npm run build
```

Expected: targeted tests, typecheck, CR audit, and build pass; CR audit counters stay 0.

- [x] **Step 2: Live smoke**

Launch Electron with Playwright and verify `xd.xenesis.connections.status` returns an onboarding section, the Settings Connection Center renders the checklist, and an Agent-pane fenced CR action can read it.

- [x] **Step 3: Commit**

```powershell
git add src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts docs/manual/09-onboarding-connections.md "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md"
git add -f docs/superpowers/plans/2026-06-27-xenesis-onboarding-checklist.md
git commit -m "feat: add xenesis onboarding checklist"
```
