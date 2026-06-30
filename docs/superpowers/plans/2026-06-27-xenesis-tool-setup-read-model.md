# Xenesis Tool Setup Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and Settings-visible setup model for external tool connections, including planned Google Workspace and Google Calendar.

**Architecture:** Extend the existing Connection Center item model with `toolSetup` metadata instead of creating a separate source of truth. `xd.xenesis.tools.setup.status` reads the current Connection Center tool cards and returns auth, scope, credential, verification, setup-surface, and CR readback metadata. Settings renders the same data inside each tool card.

**Tech Stack:** TypeScript, Xenesis Capability Registry, React Settings pane, Node test runner, Biome, Electron live smoke.

---

### Task 1: Shared Tool Setup Model

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`

- [x] **Step 1: Write the failing test**

Add a test that finds `notion`, `google-workspace`, and `google-calendar` in `status.sections.tools.items` and asserts:

```ts
assert.deepEqual(notion?.toolSetup, {
  connection: 'mcp',
  authMode: 'env-token',
  dataScopes: ['notion:search', 'notion:read-pages', 'notion:read-databases'],
  writeScopes: ['notion:writes-disabled-until-approved'],
  credentialStorage: 'NOTION_TOKEN environment variable',
  setupSurface: 'Settings > AI Provider > Local CLI MCP',
  verification: ['mcp-server-listed', 'notion-search-read', 'cr-readback'],
  crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
  riskControls: ['share only required pages/databases', 'verify read tools before writes'],
});
assert.equal(googleWorkspace?.toolSetup?.authMode, 'oauth');
assert.ok(googleWorkspace?.toolSetup?.dataScopes.includes('google-drive.readonly'));
assert.ok(googleWorkspace?.toolSetup?.writeScopes.includes('google-writes-disabled-until-template-verified'));
assert.equal(googleCalendar?.toolSetup?.authMode, 'oauth');
assert.ok(googleCalendar?.toolSetup?.dataScopes.includes('calendar.events.readonly'));
assert.ok(googleCalendar?.toolSetup?.verification.includes('calendar-list-read'));
assert.equal(googleCalendar?.mcpTemplate, undefined);
assert.equal(googleCalendar?.settingsAction, undefined);
```

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because `toolSetup` does not exist.

- [x] **Step 3: Implement minimal model**

Add:

```ts
export interface XenesisConnectionToolSetupTemplate {
  connection: 'mcp' | 'oauth-mcp' | 'local';
  authMode: 'none' | 'env-token' | 'oauth';
  dataScopes: string[];
  writeScopes: string[];
  credentialStorage: string;
  setupSurface: string;
  verification: string[];
  crReadPaths: string[];
  riskControls: string[];
}
```

Then add `toolSetup?: XenesisConnectionToolSetupTemplate` to `XenesisConnectionItem`, export the type from `src/shared/types.ts`, and populate setup metadata for Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, and Google Calendar.

- [x] **Step 4: Run test to verify it passes**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

### Task 2: CR Tool Setup Status Capability

**Files:**
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Write the failing test**

Add assertions that:

- `xd.xenesis.tools.setup.status` exists under a tool setup group.
- Permission is `read`, approval is `never`.
- The schema accepts optional `id` with enum `fetch`, `filesystem`, `github`, `notion`, `linear`, `google-workspace`, `google-calendar`.
- Dispatch calls a new adapter `getXenesisToolSetupStatus` with the original args.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: FAIL because the path and adapter do not exist.

- [x] **Step 3: Implement minimal registry, dispatch, and main adapter**

Add optional adapter method:

```ts
getXenesisToolSetupStatus?: (args?: unknown) => Promise<unknown> | unknown;
```

Register `xd.xenesis.tools.setup.status`. Dispatch it to the adapter. In `src/main/index.ts`, implement the adapter by reading `getXenesisConnectionsStatus()` and returning tool cards with `toolSetup`, optionally filtered by `id`. Unsupported IDs should return `{ ok: false, error, allowedTools }`.

- [x] **Step 4: Run test to verify it passes**

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

Add `formatXenesisToolSetupSummary(template)` expectation:

```ts
assert.equal(
  formatXenesisToolSetupSummary({
    connection: 'mcp',
    authMode: 'env-token',
    dataScopes: ['notion:search'],
    writeScopes: ['notion:writes-disabled-until-approved'],
    credentialStorage: 'NOTION_TOKEN environment variable',
    setupSurface: 'Settings > AI Provider > Local CLI MCP',
    verification: ['notion-search-read'],
    crReadPaths: ['xd.xenesis.connections.status'],
    riskControls: ['share only required pages/databases'],
  }),
  'mcp / env-token / Settings > AI Provider > Local CLI MCP',
);
```

Expected: FAIL because `formatXenesisToolSetupSummary` does not exist.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: FAIL.

- [x] **Step 3: Implement helper and render block**

Export `formatXenesisToolSetupSummary`. In `SettingsPane`, render `toolSetup` with:

- Setup summary
- Data scopes
- Write scopes
- Credential storage
- Verification
- CR readback
- Risk controls

Use `data-xenesis-tool-setup={item.id}` for live smoke.

- [x] **Step 4: Update docs and working notes**

Document `xd.xenesis.tools.setup.status`, clarify that Google Workspace and Google Calendar are planned OAuth setup cards with no install action, and record verification in the Obsidian working note and `handoff.md`.

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

- `xd.xenesis.tools.setup.status` returns `ok=true`.
- `xd.xenesis.tools.setup.status` with `{ "id": "google-calendar" }` returns one planned OAuth setup item.
- Settings > Xenesis Agent > Connections renders `[data-xenesis-tool-setup="google-calendar"]`.
- A live Agent-pane fenced CR prompt for `xd.xenesis.tools.setup.status` returns `Desk action completed.`

- [x] **Step 7: Commit**

Run:

```powershell
git add -f docs/superpowers/plans/2026-06-27-xenesis-tool-setup-read-model.md
git add src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts docs/manual/09-onboarding-connections.md "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md"
git commit -m "feat: add xenesis tool setup read model"
```
