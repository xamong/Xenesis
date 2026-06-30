# Xenesis Messenger Channel Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Xenesis Connection Center from a few planned messenger cards into an OpenClaw/Hermes-inspired channel catalog that CR callers and Settings can inspect without falsely enabling unsupported runtimes.

**Architecture:** Keep `xd.xenesis.connections.status` as the single read model. Add a compact `channelTemplate` field to messenger connection cards with channel category, adapter type, auth/setup mode, known capabilities, and required safety controls. Current runtime channels remain implemented and CR-controllable; all other OpenClaw/Hermes-style channels stay planned until runtime adapters exist.

**Tech Stack:** TypeScript shared models, Node `tsx --test`, React SettingsPane, CSS, Markdown docs.

---

### Task 1: Shared Channel Template Contract

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write failing tests**

Add assertions that the messenger section includes implemented Telegram with a `channelTemplate`, planned Google Chat and Signal cards, and at least a broad OpenClaw-inspired channel set including WhatsApp, Microsoft Teams, Matrix, LINE, WeChat, Feishu/Lark, and Email.

- [x] **Step 2: Run RED**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`
Expected: FAIL because `channelTemplate` and the expanded channel catalog are not implemented.

- [x] **Step 3: Implement shared catalog**

Add `XenesisConnectionChannelTemplate`, attach it to existing implemented messenger cards, and expand planned messenger cards with setup/safety metadata. Keep `settingsAction` and CR write actions only on implemented channels.

- [x] **Step 4: Run GREEN**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`
Expected: PASS.

### Task 2: Settings UI Channel Template Display

**Files:**
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/renderer/styles.css`

- [x] **Step 1: Render channel metadata**

On messenger cards, show channel category, adapter type, auth/setup mode, capabilities, and required safety controls.

- [x] **Step 2: Focused UI/type checks**

Run focused tests and Biome on touched TS/TSX/i18n files. Record existing CSS file-wide diagnostics separately if unchanged.

### Task 3: Docs, Handoff, And Verification

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update docs**

Document the channel catalog, implemented-vs-planned boundary, and safety controls.

- [x] **Step 2: Verify**

Run targeted tests, `npm run typecheck`, `npm run docs:capabilities:audit`, `npm run build`, and live Connection Center/Agent-pane smoke.

- [x] **Step 3: Commit**

Commit with message `feat: expand xenesis messenger channel catalog`.
