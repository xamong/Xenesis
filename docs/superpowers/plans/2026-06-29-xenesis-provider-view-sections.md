# Xenesis Provider View Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add section-level CR open/read metadata for AI provider views, matching the tool and messenger view-section behavior already in Desk.

**Architecture:** Extend the shared provider view template with `viewSections`, each section mapping to an existing Connection Center detail focus. Extend the CR schema and main open handler to accept `section`, then add renderer rows and deterministic natural-language routing for provider view sections.

**Tech Stack:** TypeScript shared models, Electron main CR adapter, Node test runner with `tsx`, React Settings renderer, existing natural-language catalog and smoke inventory.

---

### Task 1: Shared Provider View Section Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write failing shared model tests**

Add assertions that the active provider view exposes section metadata:

```ts
assert.deepEqual(
  status.sections.provider.items[0].providerView?.viewSections.map((section) => section.id),
  ['connection-card', 'setup', 'runtime', 'fallback-policy', 'credential-boundary', 'profile-draft', 'setup-plan'],
);
assert.deepEqual(status.sections.provider.items[0].providerView?.viewSections.find((section) => section.id === 'runtime')?.openArgs, {
  provider: 'codex-app-server',
  section: 'runtime',
  ensureVisible: true,
});
assert.equal(
  status.sections.provider.items[0].providerView?.viewSections.find((section) => section.id === 'fallback-policy')?.focusConnectionDetail,
  'provider-routing',
);
```

- [x] **Step 2: Run RED shared test**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: fail because `providerView.viewSections` is absent.

- [x] **Step 3: Implement provider view sections**

Add:

```ts
export const XENESIS_CONNECTION_PROVIDER_VIEW_SECTION_IDS = [
  'connection-card',
  'setup',
  'runtime',
  'fallback-policy',
  'credential-boundary',
  'profile-draft',
  'setup-plan',
] as const;
```

Add `XenesisConnectionProviderViewSection`, `XenesisConnectionProviderViewSectionId`,
`isXenesisConnectionProviderViewSectionId`, and `xenesisProviderViewSectionDetailFocus`.
Populate `providerView.viewSections` from `providerViewTemplate(provider)`.

- [x] **Step 4: Run GREEN shared test**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: pass.

### Task 2: CR Schema And Main Open Dispatch

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Write failing CR tests**

Assert that `xd.xenesis.providers.views.open` exposes a `section` enum including
`runtime`, `fallback-policy`, and `credential-boundary`, and that dispatch passes
section args through to `openXenesisProviderView`.

- [x] **Step 2: Run RED CR test**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: fail because provider view open schema has no `section` enum and main open ignores provider sections.

- [x] **Step 3: Implement schema and dispatch**

Add `section`/`viewSection`/`providerViewSection` handling to `openXenesisProviderView`.
Reject unsupported sections with an explicit error and map supported sections via
`xenesisProviderViewSectionDetailFocus(section)`.

- [x] **Step 4: Run GREEN CR test**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: pass.

### Task 3: Renderer And Natural Routing

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`
- Modify: `src/shared/xenesisNaturalLanguageActionResolvers.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

- [x] **Step 1: Write failing renderer and natural-routing tests**

Add `formatXenesisProviderViewSectionSummary` coverage and natural prompt coverage:

```ts
assert.deepEqual(planXenesisDeskNaturalLanguageActions('codex app-server runtime view 열어줘').actions, [
  {
    id: 'natural-xenesis-provider-view-section-open-codex-app-server-runtime',
    path: 'xd.xenesis.providers.views.open',
    args: { provider: 'codex-app-server', section: 'runtime', ensureVisible: true },
    approved: false,
    reason: 'Open codex-app-server Runtime provider view section from natural language request.',
  },
]);
```

- [x] **Step 2: Run RED renderer and natural tests**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: fail because provider section formatter/routing/smoke inventory is absent.

- [x] **Step 3: Implement renderer rows and natural provider section routing**

Render provider view section summaries and open args in Settings. Add provider
view section natural targets and a resolver path that returns
`xd.xenesis.providers.views.open` with `{ provider, section, ensureVisible: true }`.

- [x] **Step 4: Run GREEN renderer and natural tests**

Run the same three focused commands. Expected: pass.

### Task 4: Docs, Audit, And Commit

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/capability-registry-audit.md`
- Modify: `handoff.md`
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-provider-view-sections.md`

- [x] **Step 1: Update docs**

Document provider view section ids and that sections are read/open surfaces only.

- [x] **Step 2: Run focused and broad verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
npm run typecheck
npm run docs:capabilities:audit
rg -n "Missing registered paths|Missing dispatched coverage paths|Undispatched static callable methods|Dispatcher paths missing from tree" docs\capability-registry-audit.md
npm run build
npm run smoke:xenesis:natural-desk-routing
git diff --check
```

- [x] **Step 3: Commit**

Commit with:

```powershell
git add -f -- docs\superpowers\plans\2026-06-29-xenesis-provider-view-sections.md
git add -- src\shared\xenesisConnections.ts src\shared\types.ts src\shared\xenesisConnections.test.ts src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\panes\SettingsPane.tsx src\renderer\i18n\en.ts src\renderer\i18n\ko.ts src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\shared\xenesisNaturalLanguageActionResolvers.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs docs\manual\09-onboarding-connections.md docs\capability-registry-audit.md handoff.md docs\obsidian\Xenesis-desk\80_AI\Working` Notes\2026-06-29-provider-view-sections.md
git commit -m "feat: add provider view sections"
```
