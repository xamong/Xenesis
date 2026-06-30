# Xenesis Connection Focus Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR path that opens Xenesis Desk Settings > Xenesis Agent > Connections and focuses a specific connection card by ID.

**Architecture:** Register `xd.xenesis.connections.open` as a control capability that reuses the existing built-in settings pane open path with extra focus metadata. The renderer accepts `focusConnectionId`, switches to the Connection Center, scrolls the matching `data-xenesis-connection` card into view, and applies a temporary highlight.

**Tech Stack:** TypeScript, Electron IPC bridge, React Settings pane, Node test runner, Biome, Xenesis Capability Registry audit.

---

### Task 1: Capability Contract

**Files:**
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/types.ts`

- [x] **Step 1: Write the failing test**

Add assertions that `xd.xenesis.connections.open` is registered as `control`/`never`, has required schema field `id`, and dispatches to the built-in pane adapter with:

```ts
{
  kind: 'settings',
  category: 'xenesis-agent',
  mode: 'connections',
  section: 'xenesis-connections',
  focusConnectionId: 'notion',
  ensureVisible: true,
}
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: FAIL because the new capability path is not registered or dispatched yet.

- [x] **Step 3: Implement minimal registry and dispatch**

Add optional `focusConnectionId?: string` to `McpBridgeOpenBuiltinPanePayload` and result types. Register `xd.xenesis.connections.open` under the existing connections group, and dispatch it to `api.openBuiltinPane` with the settings target payload above.

- [x] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: PASS.

### Task 2: Renderer Request and Focus Behavior

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/styles.css`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`

- [x] **Step 1: Write the failing renderer helper test**

Add `buildXenesisConnectionOpenRequest(item)` expectation:

```ts
{
  path: 'xd.xenesis.connections.open',
  args: { id: 'signal', ensureVisible: true },
  source: 'xenesis',
  approved: true,
}
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: FAIL because the helper does not exist.

- [x] **Step 3: Implement minimal renderer helper and UI**

Export `buildXenesisConnectionOpenRequest`. In `SettingsPane`, add a compact card action using that helper for every connection card. Extend settings-open-target handling to read `focusConnectionId`, scroll the matching `data-xenesis-connection` element into view, and set a temporary focused state.

- [x] **Step 4: Add focused card styling**

Add a scoped `.sp-info-card.is-focused` style that preserves layout dimensions and makes the focused card discoverable during live smoke.

- [x] **Step 5: Run renderer tests**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: PASS.

### Task 3: Documentation and Verification

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update docs**

Document `xd.xenesis.connections.open` with the `id` argument and the visible Settings Connection Center behavior.

- [x] **Step 2: Run targeted and broad verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
npx biome check src/shared/deskBridgeCapabilities.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80
npm run typecheck
npm run docs:capabilities:audit
npm run build
```

Expected: targeted tests, Biome, typecheck, CR audit, and build pass. Remove generated audit docs after recording the CR audit counters.

- [x] **Step 3: Live smoke**

Launch the Electron app and verify:

- `xd.xenesis.connections.open` with `{ "id": "signal" }` returns `ok=true`.
- Settings > Xenesis Agent > Connections is visible.
- `[data-xenesis-connection="signal"]` exists and gets `is-focused`.
- A live Agent-pane fenced CR prompt for `xd.xenesis.connections.open` returns `Desk action completed.`

- [x] **Step 4: Commit**

Run:

```powershell
git add -f docs/superpowers/plans/2026-06-27-xenesis-connection-focus-capability.md
git add src/shared/deskBridgeCapabilities.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/styles.css src/renderer/i18n/en.ts src/renderer/i18n/ko.ts docs/manual/09-onboarding-connections.md docs/obsidian/Xenesis-desk/80_AI/Working\ Notes/2026-06-27-xenesis-connection-center.md
git commit -m "feat: add xenesis connection focus capability"
```
