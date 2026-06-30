# Xenesis External Tool Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CR-readable and CR-openable internal Desk views for external tool connections.

**Architecture:** Extend the existing Connection Center tool cards with `toolView` metadata rather than creating a separate source of truth. `xd.xenesis.tools.views.status` reads the Connection Center tool section and returns the internal Desk surface, setup surface, CR open path, readback paths, diagnostics, and safety boundaries. `xd.xenesis.tools.views.open` reuses the existing Settings pane open bridge to focus the target connection card.

**Tech Stack:** TypeScript, Xenesis Capability Registry, React Settings pane, Node test runner, Biome, Electron live smoke.

---

### Task 1: Shared Tool View Model

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`

- [x] **Step 1: Write the failing test**

Add a test that asserts the Notion tool card exposes:

```ts
assert.deepEqual(notion?.toolView, {
  viewType: 'connection-detail',
  primarySurface: 'Settings > Xenesis Agent > Connections',
  setupSurface: 'Settings > AI Provider > Local CLI MCP',
  openPath: 'xd.xenesis.tools.views.open',
  openArgs: { id: 'notion' },
  connectionCardId: 'notion',
  internalViews: ['connection-card', 'setup-recipe', 'mcp-template'],
  readPaths: [
    'xd.xenesis.connections.status',
    'xd.xenesis.tools.views.status',
    'xd.xenesis.tools.setup.status',
    'xd.mcp.settings.status',
  ],
  controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
  diagnostics: ['mcp-settings-status', 'missing-env', 'template-snippet'],
  safetyBoundaries: [
    'view opens internal setup/readiness surfaces only',
    'tool execution remains behind provider MCP tools and CR approval paths',
  ],
});
```

Also assert Google Calendar has `internalViews: ['connection-card', 'setup-recipe']` and no `mcp-template` view.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because `toolView` does not exist.

- [x] **Step 3: Implement minimal model**

Add:

```ts
export interface XenesisConnectionToolViewTemplate {
  viewType: 'connection-detail';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.tools.views.open';
  openArgs: { id: string };
  connectionCardId: string;
  internalViews: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}
```

Then add `toolView?: XenesisConnectionToolViewTemplate` to `XenesisConnectionItem`, export the type from `src/shared/types.ts`, and populate it for every item in `TOOL_CONNECTIONS`.

- [x] **Step 4: Run test to verify it passes**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

### Task 2: CR Tool View Status And Open Paths

**Files:**
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Write the failing test**

Add assertions that:

- `xd.xenesis.tools.views.status` is registered as read/no-approval.
- `xd.xenesis.tools.views.open` is registered as control/no-approval.
- Both schemas accept optional or required `id`/`tool` enum values including `fetch`, `notion`, and `google-calendar`.
- Status dispatch calls `getXenesisToolViewsStatus(args)`.
- Open dispatch calls `openXenesisToolView(args)`.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: FAIL because the paths and adapter methods do not exist.

- [x] **Step 3: Implement registry and dispatch**

Add optional adapter methods:

```ts
getXenesisToolViewsStatus?: (args?: unknown) => Promise<unknown> | unknown;
openXenesisToolView?: (args?: unknown) => Promise<unknown> | unknown;
```

Register:

- `xd.xenesis.tools.views.status`
- `xd.xenesis.tools.views.open`

Dispatch each path to its adapter method.

- [x] **Step 4: Implement main adapters**

In `src/main/index.ts`, add:

```ts
const XENESIS_TOOL_VIEW_IDS = ['fetch', 'filesystem', 'github', 'notion', 'linear', 'google-workspace', 'google-calendar'] as const;
```

`getXenesisToolViewsStatus(args)` should return tool cards with `toolView`, optionally filtered by `id`, `tool`, or `name`. Unsupported ids return `{ ok: false, error, allowedTools }`.

`openXenesisToolView(args)` should validate the id, then call the existing built-in pane opener with:

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
  formatXenesisToolViewSummary({
    viewType: 'connection-detail',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > AI Provider > Local CLI MCP',
    openPath: 'xd.xenesis.tools.views.open',
    openArgs: { id: 'notion' },
    connectionCardId: 'notion',
    internalViews: ['connection-card', 'setup-recipe', 'mcp-template'],
    readPaths: ['xd.xenesis.connections.status'],
    controlPaths: ['xd.xenesis.tools.views.open'],
    diagnostics: ['mcp-settings-status'],
    safetyBoundaries: ['view opens internal setup/readiness surfaces only'],
  }),
  'Settings > Xenesis Agent > Connections / connection-detail',
);
```

Expected: FAIL because `formatXenesisToolViewSummary` does not exist.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: FAIL.

- [x] **Step 3: Implement helper and render block**

Export `formatXenesisToolViewSummary`. In `SettingsPane`, render `toolView` with:

- Tool view summary
- Setup surface
- Open path and args
- Internal views
- Readback paths
- Control paths
- Diagnostics
- Safety boundaries

Use `data-xenesis-tool-view={item.id}` for live smoke.

- [x] **Step 4: Update docs and working notes**

Document `xd.xenesis.tools.views.status` and `xd.xenesis.tools.views.open`, explain that the open path focuses internal Desk setup/readiness views and does not execute the external tool or create fake OAuth/install flows.

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

- [x] **Step 6: Live smoke**

Launch the Electron app and verify:

- `xd.xenesis.tools.views.status` returns `ok=true`.
- `xd.xenesis.tools.views.open` focuses a tool card.
- Settings renders `[data-xenesis-tool-view="<id>"]`.
- A live Agent-pane fenced CR prompt for `xd.xenesis.tools.views.open` returns `Desk action completed.`

- [x] **Step 7: Commit**

Run:

```powershell
git add -f docs/superpowers/plans/2026-06-27-xenesis-external-tool-views.md
git add src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts docs/manual/09-onboarding-connections.md "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md"
git commit -m "feat: add xenesis external tool views"
```
