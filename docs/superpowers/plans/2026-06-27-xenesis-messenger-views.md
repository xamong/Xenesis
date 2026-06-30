# Xenesis Messenger Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CR-readable and CR-openable internal Desk views for external messenger connections.

**Architecture:** Extend existing Connection Center messenger cards with `messengerView` metadata instead of creating a separate channel registry. `xd.xenesis.messengers.views.status` reads the Connection Center messenger section and returns the internal Desk surface, setup surface, runtime support state, CR open/read/control paths, diagnostics, and safety boundaries. `xd.xenesis.messengers.views.open` opens Settings > Xenesis Agent > Connections and focuses the requested messenger card.

**Tech Stack:** TypeScript, Xenesis Capability Registry, React Settings pane, Node test runner, Biome, Electron live smoke.

---

### Task 1: Shared Messenger View Model

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`

- [x] **Step 1: Write the failing test**

Add a test that asserts the Telegram messenger card exposes:

```ts
assert.deepEqual(telegram?.messengerView, {
  viewType: 'messenger-detail',
  runtimeSupport: 'implemented',
  primarySurface: 'Settings > Xenesis Agent > Connections',
  setupSurface: 'Settings > Xenesis Agent > External bots',
  openPath: 'xd.xenesis.messengers.views.open',
  openArgs: { id: 'telegram' },
  connectionCardId: 'telegram',
  internalViews: ['connection-card', 'channel-template', 'routing', 'external-bot-settings'],
  readPaths: [
    'xd.xenesis.connections.status',
    'xd.xenesis.messengers.views.status',
    'xd.xenesis.channels.routing.status',
    'xd.xenesis.gateway.status',
  ],
  controlPaths: [
    'xd.xenesis.messengers.views.open',
    'xd.xenesis.connections.open',
    'xd.xenesis.profiles.updateChannels',
    'xd.xenesis.profiles.testChannel',
    'xd.panes.settings.open',
  ],
  diagnostics: ['gateway-status', 'missing-env', 'allowlist', 'last-error'],
  safetyBoundaries: [
    'implemented channels still require gateway readiness before delivery',
    'channel writes and test sends stay on existing profile CR paths',
  ],
});
```

Also assert Signal has `runtimeSupport: 'planned'`, `internalViews: ['connection-card', 'channel-template', 'planning-card']`, and no `xd.xenesis.profiles.testChannel` control path.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because `messengerView` does not exist.

- [x] **Step 3: Implement minimal model**

Add:

```ts
export interface XenesisConnectionMessengerViewTemplate {
  viewType: 'messenger-detail';
  runtimeSupport: 'implemented' | 'planned';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.messengers.views.open';
  openArgs: { id: string };
  connectionCardId: string;
  internalViews: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}
```

Then add `messengerView?: XenesisConnectionMessengerViewTemplate` to `XenesisConnectionItem`, export the type from `src/shared/types.ts`, and populate implemented and planned messenger cards.

- [x] **Step 4: Run test to verify it passes**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

### Task 2: CR Messenger View Status And Open Paths

**Files:**
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Write the failing test**

Add assertions that:

- `xd.xenesis.messengers.views.status` is registered as read/no-approval.
- `xd.xenesis.messengers.views.open` is registered as control/no-approval.
- Both schemas accept `id`/`messenger` enum values including `telegram`, `signal`, and `google-chat`.
- Status dispatch calls `getXenesisMessengerViewsStatus(args)`.
- Open dispatch calls `openXenesisMessengerView(args)`.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: FAIL because the paths and adapter methods do not exist.

- [x] **Step 3: Implement registry and dispatch**

Add optional adapter methods:

```ts
getXenesisMessengerViewsStatus?: (args?: unknown) => Promise<unknown> | unknown;
openXenesisMessengerView?: (args?: unknown) => Promise<unknown> | unknown;
```

Register:

- `xd.xenesis.messengers.views.status`
- `xd.xenesis.messengers.views.open`

Dispatch each path to its adapter method.

- [x] **Step 4: Implement main adapters**

In `src/main/index.ts`, add a messenger id list that includes implemented channels and planned channel ids currently present in `xd.xenesis.connections.status`.

`getXenesisMessengerViewsStatus(args)` should return messenger cards with `messengerView`, optionally filtered by `id`, `messenger`, `channel`, or `name`. Unsupported ids return `{ ok: false, error, allowedMessengers }`.

`openXenesisMessengerView(args)` should validate the id, then call the existing built-in pane opener with:

```ts
{
  kind: 'settings',
  category: 'xenesis-agent',
  mode: 'connections',
  section: 'xenesis-connections',
  focusConnectionId: id,
  ensureVisible: true,
}
```

Return the renderer result plus the selected item metadata.

- [x] **Step 5: Run test to verify it passes**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: PASS.

### Task 3: Settings Rendering And Docs

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Write the failing renderer helper test**

Add:

```ts
assert.equal(
  formatXenesisMessengerViewSummary({
    viewType: 'messenger-detail',
    runtimeSupport: 'implemented',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > Xenesis Agent > External bots',
    openPath: 'xd.xenesis.messengers.views.open',
    openArgs: { id: 'telegram' },
    connectionCardId: 'telegram',
    internalViews: ['connection-card', 'channel-template', 'routing', 'external-bot-settings'],
    readPaths: ['xd.xenesis.connections.status'],
    controlPaths: ['xd.xenesis.messengers.views.open'],
    diagnostics: ['gateway-status'],
    safetyBoundaries: ['implemented channels still require gateway readiness before delivery'],
  }),
  'Settings > Xenesis Agent > Connections / implemented',
);
```

Expected: FAIL because `formatXenesisMessengerViewSummary` does not exist.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: FAIL.

- [x] **Step 3: Implement helper and render block**

Export `formatXenesisMessengerViewSummary`. In `SettingsPane`, render `messengerView` with:

- Messenger view summary
- Setup surface
- Open path and args
- Runtime support
- Internal views
- Readback paths
- Control paths
- Diagnostics
- Safety boundaries

Use `data-xenesis-messenger-view={item.id}` for live smoke.

- [x] **Step 4: Update docs and working notes**

Document `xd.xenesis.messengers.views.status` and `xd.xenesis.messengers.views.open`, explain that planned channels open setup/readiness planning views only and do not create gateway adapters, pairing flows, or delivery actions.

- [x] **Step 5: Run targeted and broad verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80
npm run typecheck
npm run docs:capabilities:audit
npm run build
```

Expected: targeted tests, scoped Biome, typecheck, CR audit, and build pass. Remove generated audit docs after recording counters.

Actual: targeted tests, scoped Biome for shared/renderer/i18n files, typecheck,
CR audit, and build passed. Including `src/main/index.ts` and
`src/shared/deskBridgeCapabilities.ts` in Biome check still reports existing
file-wide diagnostics and formatter churn outside this slice.

- [x] **Step 6: Live smoke**

Launch the Electron app and verify:

- `xd.xenesis.messengers.views.status` returns `ok=true`.
- `xd.xenesis.messengers.views.open` focuses an implemented channel card.
- Settings renders `[data-xenesis-messenger-view="<id>"]`.
- A live Agent-pane fenced CR prompt for `xd.xenesis.messengers.views.open` returns `Desk action completed.`

- [x] **Step 7: Commit**

Run:

```powershell
git add -f docs/superpowers/plans/2026-06-27-xenesis-messenger-views.md
git add src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts docs/manual/09-onboarding-connections.md "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md"
git commit -m "feat: add xenesis messenger views"
```
