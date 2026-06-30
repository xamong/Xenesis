# Xenesis Connection Recipes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Connection Center cards actionable by attaching setup recipes, target settings, CR actions, and guide links for MCP tools and external messenger channels.

**Architecture:** Keep the current aggregate `xd.xenesis.connections.status` path as the read model and enrich each `XenesisConnectionItem` with setup recipe fields. Renderer helpers translate recipe targets into CR `xd.panes.settings.open` calls so the UI remains CR-first. Unsupported Google/Calendar/extra messenger integrations stay explicit planned/manual recipes until a verified runtime or MCP template exists.

**Tech Stack:** TypeScript shared models, Node `tsx --test`, React SettingsPane, Electron preload `deskBridgeAPI`.

---

### Task 1: Shared Recipe Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write failing tests**

Add assertions that Notion carries setup steps and settings target metadata, and Google Calendar carries planned/manual setup steps with no fake CR install action.

- [x] **Step 2: Run RED**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`
Expected: FAIL because `setupSteps`, `sourceDocs`, and `supportLevel` are not yet present.

- [x] **Step 3: Implement model**

Add `supportLevel`, `setupSteps`, `sourceDocs`, and optional `settingsAction` to `XenesisConnectionItem`, then enrich MCP tools and messenger cards.

- [x] **Step 4: Run GREEN**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`
Expected: PASS.

### Task 2: Renderer Recipe Actions

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Test: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`

- [x] **Step 1: Write failing helper test**

Add a test proving a `settingsTarget`/`settingsAction` maps to a CR settings-open request.

- [x] **Step 2: Run RED**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
Expected: FAIL because the helper does not exist.

- [x] **Step 3: Implement helper and UI**

Add a renderer helper that builds `xd.panes.settings.open` requests and wire card buttons for setup/guide actions through `window.deskBridgeAPI.callCapability`.

- [x] **Step 4: Run GREEN**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
Expected: PASS.

### Task 3: Docs And Verification

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update docs**

Document setup recipe support, planned Google/Calendar status, and the CR-first settings action.

- [x] **Step 2: Verify**

Run targeted tests, `npm run typecheck`, and `npm run docs:capabilities:audit`.

- [x] **Step 3: Commit**

Commit with message `feat: add xenesis connection setup recipes`.
