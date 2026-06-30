# Xenesis Channel Pairing Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-first, read-only pairing readiness model for implemented and planned external messenger channels.

**Architecture:** Extend the existing Connection Center channel template model with `pairing` metadata, then expose it through a new read-only CR path. Runtime status resolves implemented-channel env references into redacted configured/missing states while planned channels remain planning surfaces.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Electron Capability Registry, React Settings pane.

---

### Task 1: Shared Pairing Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [ ] Write failing tests for Telegram env-token pairing readiness and Signal planned device pairing.
- [ ] Run `npx tsx --test src\shared\xenesisConnections.test.ts` and confirm the new tests fail because `channelTemplate.pairing` is missing.
- [ ] Add `XenesisConnectionChannelPairingTemplate` and attach pairing metadata to implemented and planned messenger cards.
- [ ] Resolve implemented-channel credential refs from profile env fields and `input.env` without returning secret values.
- [ ] Re-run the shared test and confirm it passes.

### Task 2: CR Path

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`
- Test: `src/shared/xenesisConnectionCapabilities.test.ts`

- [ ] Write a failing CR registration/dispatch test for `xd.xenesis.channels.pairing.status`.
- [ ] Run `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` and confirm it fails for the missing path.
- [ ] Register the path under `xd.xenesis.channels.pairing` with read permission and no approval.
- [ ] Add main-process adapter projection for implemented and planned messenger pairing status.
- [ ] Re-run the CR test and confirm it passes.

### Task 3: Settings Rendering

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`

- [ ] Write a failing renderer helper test for `formatXenesisChannelPairingSummary`.
- [ ] Run `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` and confirm it fails for the missing helper.
- [ ] Add the helper, i18n labels, and Settings rendering with `data-xenesis-channel-pairing`.
- [ ] Re-run the renderer test and confirm it passes.

### Task 4: Docs, Verification, Commit

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [ ] Document the pairing path and read-only/redacted boundary.
- [ ] Run focused tests for shared, CR, renderer, and Agent Desk-control hint coverage if touched.
- [ ] Run scoped Biome, `npm run typecheck`, `npm run docs:capabilities:audit`, `npm run build`, and `npm run check:public-release`.
- [ ] Run live Electron smoke for direct pairing status, Settings marker, and Agent-pane fenced CR prompt.
- [ ] Commit with `feat: add xenesis channel pairing status`.
