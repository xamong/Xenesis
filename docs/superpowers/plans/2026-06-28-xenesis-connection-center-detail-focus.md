# Xenesis Connection Center Detail Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Connection Center CR open paths focus the exact internal detail block they represent, not only the parent connection card.

**Architecture:** Add a shared `focusConnectionDetail` argument owned by the Xenesis connection catalog, propagate it through the MCP built-in-pane payload/result path, and let the Settings renderer resolve the detail to existing `data-xenesis-*` blocks inside the focused card. Keep open paths read/control-only; this slice only opens and focuses existing internal Desk surfaces.

**Tech Stack:** TypeScript, Electron main/renderer bridge, node:test, Biome, Capability Registry audit.

---

### Task 1: Shared Focus Arg and Schema

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`

- [x] **Step 1: Write the failing shared tests**

Add assertions that `buildXenesisConnectionCenterOpenArgs({ focusConnectionId: 'notion', focusConnectionDetail: 'tool-oauth-draft' })` returns `focusConnectionDetail: 'tool-oauth-draft'`, and that CR schemas expose a `focusConnectionDetail` enum on `xd.xenesis.connections.open`, `xd.xenesis.tools.oauthDrafts.open`, `xd.xenesis.providers.profileDrafts.open`, and `xd.xenesis.channels.routing.open`.

Run: `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts`

Expected: FAIL because `focusConnectionDetail` is not defined.

- [x] **Step 2: Implement the shared arg**

Add `XENESIS_CONNECTION_CENTER_DETAIL_FOCUS_VALUES`, `XenesisConnectionCenterDetailFocus`, `isXenesisConnectionCenterDetailFocus`, and extend `XenesisConnectionCenterOpenArgs`, `buildXenesisConnectionCenterOpenArgs`, `McpBridgeOpenBuiltinPanePayload`, and `McpBridgeOpenBuiltinPaneResult` with `focusConnectionDetail`.

- [x] **Step 3: Extend CR schemas**

Add `focusConnectionDetail` schema property to the generic Connection Center open schema and subtype open schemas. Use enum values such as `tool-oauth-draft`, `provider-profile-draft`, `channel-routing`, `channel-safety`, `channel-access-groups`, `channel-pairing`, `diagnostic-runbook`, `setup-request`, `onboarding-plan`, and `guide-catalog`.

- [x] **Step 4: Verify shared tests pass**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts`

Expected: PASS.

### Task 2: Main/App Propagation

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`

- [x] **Step 1: Write failing propagation guards**

Add source guards that main sanitizes, logs, returns, and sends `focusConnectionDetail`, and that renderer `App.tsx` includes it in `openSettingsTarget` and `resultBase`.

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: FAIL because propagation does not exist.

- [x] **Step 2: Propagate the field through main and App**

In `openMcpBuiltinPaneCapability`, sanitize `body.focusConnectionDetail`; include it in `sendMcpOpenBuiltinPaneToRenderer`, diagnostics detail, and the returned result. In `sendMcpOpenBuiltinPaneToRenderer` and `sanitizeMcpOpenBuiltinPaneResult`, preserve it. In `App.tsx`, include it in `Window.__xenesisSettingsOpenTarget`, `openSettingsTarget`, `resultBase`, and the settings target dispatch.

- [x] **Step 3: Add default detail values to open handlers**

Set `focusConnectionDetail` for existing focused CR open handlers: diagnostics -> `diagnostic-runbook`, setup requests -> `setup-request`, onboarding -> `onboarding-plan`, guides -> `guide-catalog`, tool setup/connectors/views/user stories/install plans/MCP drafts/OAuth/action catalog -> their matching detail values, provider setup/routing/views/profile drafts -> their matching detail values, and channel routing/safety/access groups/pairing/profile drafts/user stories/messenger views -> their matching detail values.

- [x] **Step 4: Verify propagation tests pass**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: PASS.

### Task 3: Renderer Detail Resolution

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/styles.css`

- [x] **Step 1: Write failing renderer helper tests**

Add tests for `xenesisConnectionDetailFocusSelector('tool-oauth-draft') === '[data-xenesis-tool-oauth-draft]'`, `xenesisConnectionDetailFocusSelector('channel-routing') === '[data-xenesis-channel-routing]'`, and invalid/empty input returning `null`.

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: FAIL because the helper does not exist.

- [x] **Step 2: Implement renderer detail mapping**

Export `XENESIS_CONNECTION_DETAIL_FOCUS_DATA_ATTRIBUTES` and `xenesisConnectionDetailFocusSelector` from `src/renderer/panes/xenesisConnectionCenter.ts`. The helper should use the shared `XenesisConnectionCenterDetailFocus` type and map detail values to existing `data-xenesis-*` attributes.

- [x] **Step 3: Focus detail blocks in SettingsPane**

Add `focusConnectionDetail` to `SettingsOpenTargetDetail`, store `focusedXenesisConnectionDetail`, clear it with the same timeout as card focus, and update scroll logic to prefer the detail block inside the focused card before falling back to the card or section. Apply `is-focused` to the matching detail list.

- [x] **Step 4: Add detail-list focus CSS**

Add `.sp-info-list.is-focused > div` styling that mirrors the existing focused card border/background without changing layout dimensions.

- [x] **Step 5: Verify renderer tests pass**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: PASS.

### Task 4: Broad Verification and Commit

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md` if the slice materially changes the gap map.

- [x] **Step 1: Format and focused test**

Run:

```powershell
npx biome format --write src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\shared\types.ts src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\App.tsx src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\panes\SettingsPane.tsx src\renderer\styles.css
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: PASS.

- [x] **Step 2: Typecheck and CR audit**

Run:

```powershell
npm run typecheck
npm run docs:capabilities:audit
```

Expected: PASS with missing registry paths, missing dispatched coverage paths, and undispatched static callable methods all 0. Remove generated audit docs if the repo does not track them.

- [x] **Step 3: Optional live smoke after build**

If time and build output are current, run:

```powershell
npm run build
node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json --timeout=45000
```

Expected: build exits 0; smoke reports all snapshot checks passed.

- [x] **Step 4: Commit**

Run:

```powershell
git add src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/shared/xenesisConnectionCapabilities.test.ts src/main/index.ts src/renderer/App.tsx src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/styles.css handoff.md
git add -f docs/superpowers/plans/2026-06-28-xenesis-connection-center-detail-focus.md
git commit -m "feat: focus xenesis connection detail surfaces"
```
