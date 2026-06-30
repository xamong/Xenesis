# Xenesis Provider Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and CR-openable internal Desk provider view for the active Xenesis AI provider setup.

**Architecture:** Extend the existing Connection Center read model with a `providerView` object that mirrors the current tool and messenger view patterns. Register `xd.xenesis.providers.views.status` and `xd.xenesis.providers.views.open` as CR-first paths that read the active provider card and open Settings > Xenesis Agent > Connections focused on that card. Keep this strictly as setup/readiness metadata; it must not change providers, credentials, models, or fallback behavior.

**Tech Stack:** TypeScript, Node test runner through `tsx --test`, Electron main/renderer bridge, Xenesis Desk Capability Registry, React Settings pane.

---

### Task 1: Shared Provider View Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Write the failing shared-model test**

Add a test after the existing provider setup test in `src/shared/xenesisConnections.test.ts`:

```ts
test('buildXenesisConnectionsStatus exposes an internal Desk provider view', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'codex-app-server',
      model: 'gpt-5-codex',
      apiKey: '',
      baseUrl: '',
    },
    mcp: {
      available: true,
      serverPath: 'E:/xenesis/mcp/xenesis-desk-mcp-server.mjs',
      bridgeUrl: 'http://127.0.0.1:3845',
      bridgeStatePath: 'C:/Users/example/.xenis/mcp/bridge.json',
      configFilePath: 'C:/Users/example/.xenis/mcp/xenesis-mcp-config.json',
    },
    providerIntegration: {
      cliTargets: [],
      hermes: {
        assetRoot: '',
        hermesRoot: '',
        assetAvailable: false,
        rootConfigured: false,
        pluginsInstalled: false,
        items: [],
      },
    },
    xenesis: null,
  });

  assert.deepEqual(status.sections.provider.items[0].providerView, {
    viewType: 'provider-detail',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > AI Provider',
    openPath: 'xd.xenesis.providers.views.open',
    openArgs: { provider: 'codex-app-server' },
    connectionCardId: 'provider-codex-app-server',
    internalViews: ['connection-card', 'provider-setup', 'provider-runtime', 'fallback-policy', 'credential-boundary'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.providers.views.status',
      'xd.xenesis.status',
    ],
    controlPaths: ['xd.xenesis.providers.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
    diagnostics: ['provider-footer', 'work-log-provider', 'credential-state', 'runtime-profile', 'fallback-policy'],
    safetyBoundaries: [
      'provider view opens internal setup/readiness surfaces only',
      'provider identity comes from user settings and profile',
      'local CLI selection remains separate from provider identity',
      'missing keyed-provider credentials must not silently fall back',
    ],
  });
});
```

- [ ] **Step 2: Run the RED test**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: FAIL because `providerView` is undefined on the provider item.

- [ ] **Step 3: Implement the minimal shared model**

In `src/shared/xenesisConnections.ts`, add:

```ts
export interface XenesisConnectionProviderViewTemplate {
  viewType: 'provider-detail';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.providers.views.open';
  openArgs: { provider: string };
  connectionCardId: string;
  internalViews: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}
```

Add `providerView?: XenesisConnectionProviderViewTemplate;` to `XenesisConnectionItem`.

Add a `providerViewTemplate(provider: string)` helper returning the exact object asserted in Step 1, using `connectionCardId: provider-${provider}`.

In `providerItem()`, set `providerView: providerViewTemplate(aiProvider.provider)`.

In `src/shared/types.ts`, re-export `XenesisConnectionProviderViewTemplate`.

- [ ] **Step 4: Run the GREEN test**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: PASS.

### Task 2: Provider View CR Registration And Dispatch

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`

- [ ] **Step 1: Write the failing CR contract test**

Add a test after the provider setup status test in `src/shared/xenesisConnectionCapabilities.test.ts`:

```ts
test('xenesis provider view capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.providers.views.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.providers.views.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.deepEqual(openCapability?.schema?.required, ['provider']);
  for (const provider of ['auto', 'openai', 'codex-app-server', 'codex-cli', 'ollama']) {
    assert.equal(statusSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
    assert.equal(openSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisProviderViewsStatus: (args) => {
      calls.push({ method: 'status', args });
      return { ok: true, items: [{ id: 'provider-codex-app-server' }] };
    },
    openXenesisProviderView: (args) => {
      calls.push({ method: 'open', args });
      return { ok: true, item: { id: 'provider-codex-app-server' } };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.views.status',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.views.open',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { provider: 'codex-app-server' } },
    { method: 'open', args: { provider: 'codex-app-server' } },
  ]);
});
```

- [ ] **Step 2: Run the RED test**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: FAIL because the two provider view CR paths are not registered or dispatched.

- [ ] **Step 3: Implement CR schemas, adapter methods, tree nodes, and dispatch**

In `src/shared/deskBridgeCapabilities.ts`:

1. Add provider view status/open schemas that reuse the provider enum from `XENESIS_PROVIDER_SETUP_STATUS_SCHEMA`.
2. Add adapter methods:

```ts
getXenesisProviderViewsStatus?: (args?: unknown) => Promise<unknown> | unknown;
openXenesisProviderView?: (args?: unknown) => Promise<unknown> | unknown;
```

3. Under `xd.xenesis.providers`, add a `views` group with:
   - `xd.xenesis.providers.views.status` as `read`
   - `xd.xenesis.providers.views.open` as `control`
4. In `callDeskBridgeCapability`, dispatch those paths to the new adapter methods.

- [ ] **Step 4: Run the GREEN test**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: PASS.

### Task 3: Main-Process Provider View Read/Open

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Implement provider view payload helpers**

Add a helper near `getXenesisProviderSetupStatus()`:

```ts
function xenesisProviderViewStatusItem(item: XenesisConnectionItem): Record<string, unknown> {
  return {
    id: item.id,
    label: item.label,
    status: item.status,
    supportLevel: item.supportLevel,
    summary: item.summary,
    provider: item.providerSetup?.provider,
    providerSetup: item.providerSetup,
    providerView: item.providerView,
    settingsAction: item.settingsAction,
    warnings: item.warnings ?? [],
  };
}
```

- [ ] **Step 2: Implement read/open functions**

Add:

```ts
async function getXenesisProviderViewsStatus(args?: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const provider = readCapabilityString(body, ['provider', 'id', 'name']);
  if (provider && !isXenesisProviderSetupId(provider) && !provider.startsWith('provider-')) {
    return { ok: false, error: `Unsupported Xenesis provider: ${provider}`, allowedProviders: XENESIS_PROVIDER_SETUP_IDS };
  }
  const status = await getXenesisConnectionsStatus();
  const items = status.sections.provider.items
    .filter((item) => item.providerView)
    .filter((item) => !provider || item.providerSetup?.provider === provider || item.id === provider)
    .map((item) => xenesisProviderViewStatusItem(item));
  return { ok: true, updatedAt: status.updatedAt, ...(provider ? { provider } : {}), total: items.length, items };
}
```

Add `openXenesisProviderView(args)` that requires `provider`, finds the provider item by provider name or `provider-*` id, then calls:

```ts
openMcpBuiltinPaneCapability({
  kind: 'settings',
  category: 'xenesis-agent',
  mode: 'connections',
  section: 'xenesis-connections',
  focusConnectionId: item.id,
  ensureVisible: body.ensureVisible !== false,
})
```

Return `{ ok, provider, id, item, renderer }`.

- [ ] **Step 3: Wire the adapter**

In `createMcpBridgeCapabilityAdapter`, map:

```ts
getXenesisProviderViewsStatus: (args: unknown) => getXenesisProviderViewsStatus(args),
openXenesisProviderView: (args: unknown) => openXenesisProviderView(args),
```

- [ ] **Step 4: Run typecheck after main wiring**

Run: `npm run typecheck`

Expected: PASS, unless unrelated baseline errors appear; record any unrelated gap in `handoff.md`.

### Task 4: Renderer Provider View Surface

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`

- [ ] **Step 1: Write the failing renderer helper test**

Add to `src/renderer/panes/xenesisConnectionCenter.test.ts`:

```ts
test('formatXenesisProviderViewSummary describes internal Desk provider view surface and type', () => {
  assert.equal(
    formatXenesisProviderViewSummary({
      viewType: 'provider-detail',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider',
      openPath: 'xd.xenesis.providers.views.open',
      openArgs: { provider: 'codex-app-server' },
      connectionCardId: 'provider-codex-app-server',
      internalViews: ['connection-card', 'provider-setup', 'provider-runtime'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.providers.views.open'],
      diagnostics: ['provider-footer'],
      safetyBoundaries: ['provider view opens internal setup/readiness surfaces only'],
    }),
    'Settings > Xenesis Agent > Connections / provider-detail',
  );
});
```

- [ ] **Step 2: Run the RED test**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: FAIL because `formatXenesisProviderViewSummary` is not exported.

- [ ] **Step 3: Implement helper and Settings rendering**

In `xenesisConnectionCenter.ts`, import `XenesisConnectionProviderViewTemplate` and export:

```ts
export function formatXenesisProviderViewSummary(view: XenesisConnectionProviderViewTemplate): string {
  return `${view.primarySurface} / ${view.viewType}`;
}
```

In `SettingsPane.tsx`, add `const providerView = item.providerView;` and render a `data-xenesis-provider-view={item.id}` block after `providerSetup`, using the same field pattern as tool/messenger views.

Add English/Korean i18n labels:

```ts
xenesisConnectionsProviderView
xenesisConnectionsProviderViewSetupSurface
xenesisConnectionsProviderViewOpen
xenesisConnectionsProviderViewInternalViews
xenesisConnectionsProviderViewReadback
xenesisConnectionsProviderViewControls
xenesisConnectionsProviderViewDiagnostics
xenesisConnectionsProviderViewSafety
```

- [ ] **Step 4: Run the GREEN renderer test**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: PASS.

### Task 5: Docs, Obsidian, Verification, Commit

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [ ] **Step 1: Update docs**

Document that:
- `providerView` appears in `xd.xenesis.connections.status`.
- `xd.xenesis.providers.views.status` reads internal provider view metadata.
- `xd.xenesis.providers.views.open` opens the Connection Center focused on the active provider card.
- This view does not mutate provider settings, credentials, model routing, or fallback policy.

- [ ] **Step 2: Run focused verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80
npm run typecheck
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Expected:
- Targeted tests pass.
- Scoped Biome passes for the smaller changed files.
- Typecheck passes.
- CR audit passes with all release-gate counters at 0, then remove generated `docs/capability-registry-audit.md`.
- Build passes.
- `check:public-release` may fail with the known `.github/workflows/ci.yml` infra gap; record the exact result.

- [ ] **Step 3: Run live Electron smoke**

Launch the Electron app with Playwright `_electron.launch`, then:
- Call `xd.xenesis.connections.status` and read the active provider card.
- Call `xd.xenesis.providers.views.status` with the active provider.
- Call `xd.xenesis.providers.views.open` with the active provider.
- Confirm `[data-xenesis-provider-view="<provider-card-id>"]` exists.
- Submit an Agent-pane fenced `xenesis-desk-action` for `xd.xenesis.providers.views.open` and match `Desk action completed`.

- [ ] **Step 4: Commit**

Stage the ignored plan with `git add -f docs/superpowers/plans/2026-06-27-xenesis-provider-views.md`, stage changed source/docs files, then commit:

```powershell
git commit -m "feat: add xenesis provider views"
```
