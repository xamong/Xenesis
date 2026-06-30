# Xenesis Guide Catalog CR Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and CR-openable Xenesis guide catalog for onboarding, provider/tool setup, external messenger setup, and user-story style Desk workflows.

**Architecture:** Extend existing `XENESIS_CONNECTION_GUIDES` guide cards with structured `guideCatalog` metadata. Register `xd.xenesis.guides.status` and `xd.xenesis.guides.open` beside the existing connection CR paths; derive the payload from `getXenesisConnectionsStatus()` and reuse the existing Settings/file-open behavior. Render the same metadata inside Settings > Xenesis Agent > Connections.

**Tech Stack:** TypeScript, Electron main/renderer, Xenesis shared Capability Registry, `node:test`, Playwright live Electron smoke.

---

### Task 1: Shared Guide Catalog Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write the failing shared-model test**

Add a test named `buildXenesisConnectionsStatus exposes guide catalog metadata for onboarding playbooks`.

```ts
test('buildXenesisConnectionsStatus exposes guide catalog metadata for onboarding playbooks', () => {
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
    repoRoot: 'E:\\xenesis-desk',
  });

  const onboarding = status.sections.guides.items.find((item) => item.id === 'onboarding-connections');
  const userStories = status.sections.guides.items.find((item) => item.id === 'agent-user-stories');

  assert.deepEqual(onboarding?.guideCatalog, {
    guideType: 'setup-playbook',
    audience: 'operator',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    coveredSurfaces: ['providers', 'mcp-tools', 'gateway', 'messengers', 'guides'],
    prerequisites: ['choose AI provider', 'configure MCP bridge', 'review external bot gateway'],
    validationChecks: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.tools.setup.status',
      'xd.xenesis.messengers.views.status',
    ],
    readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.guides.status'],
    controlPaths: ['xd.xenesis.guides.open', 'xd.xenesis.connections.open', 'xd.files.open'],
    userStoryTemplates: [
      'first-run provider and MCP setup',
      'connect a planned external tool without pretending it is installed',
      'verify messenger routing before remote prompts',
    ],
    safetyBoundaries: [
      'guide catalog is read-only',
      'guide open may open a repo-local file or focus a Settings card',
      'actual provider, tool, and channel mutations stay on their existing CR paths',
    ],
  });
  assert.equal(onboarding?.guideOpenPath, 'E:\\xenesis-desk\\docs\\manual\\09-onboarding-connections.md');
  assert.equal(userStories?.guideCatalog?.guideType, 'user-story-catalog');
  assert.equal(userStories?.guideCatalog?.readPaths.includes('xd.xenesis.guides.status'), true);
});
```

- [x] **Step 2: Run the shared test and verify RED**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: FAIL because `guideCatalog` is undefined and `agent-user-stories` does not exist.

- [x] **Step 3: Add shared type**

Add:

```ts
export interface XenesisConnectionGuideCatalogTemplate {
  guideType: 'setup-playbook' | 'integration-guide' | 'user-story-catalog';
  audience: 'operator' | 'agent' | 'developer';
  primarySurface: string;
  coveredSurfaces: string[];
  prerequisites: string[];
  validationChecks: string[];
  readPaths: string[];
  controlPaths: string[];
  userStoryTemplates: string[];
  safetyBoundaries: string[];
}
```

Add `guideCatalog?: XenesisConnectionGuideCatalogTemplate;` to `XenesisConnectionItem`.

Export `XenesisConnectionGuideCatalogTemplate` from `src/shared/types.ts`.

- [x] **Step 4: Add guide catalog metadata**

Extend existing guide cards:

- `onboarding-connections`: exact object from the test.
- `cr-mcp-gateway-bots`: `guideType: 'integration-guide'`, `audience: 'developer'`, covers `capability-registry`, `mcp-bridge`, `gateway`, `bot-sessions`, validates `xd.xenesis.connections.status`, `xd.xenesis.gateway.status`, `xd.xenesis.channels.routing.status`, `xd.xenesis.channels.safety.status`.

Add new guide card:

```ts
{
  id: 'agent-user-stories',
  kind: 'guide',
  label: 'Agent user stories',
  status: 'ready',
  summary: 'Hermes-style user story templates for provider setup, external tools, messenger ingress, and CR-controlled Desk workflows.',
  guidePath: 'docs/manual/09-onboarding-connections.md',
  sourceDocs: [
    { label: 'Hermes user stories', url: 'https://hermes-agent.nousresearch.com/docs/user-stories' },
    { label: 'Hermes MCP feature', url: 'https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp' },
    { label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' },
  ],
  guideCatalog: {
    guideType: 'user-story-catalog',
    audience: 'agent',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    coveredSurfaces: ['ai-providers', 'external-tools', 'messengers', 'capability-registry'],
    prerequisites: ['connection catalog readback', 'provider routing readback', 'tool view readback', 'messenger view readback'],
    validationChecks: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.routing.status',
      'xd.xenesis.tools.views.status',
      'xd.xenesis.messengers.views.status',
    ],
    readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.guides.status'],
    controlPaths: [
      'xd.xenesis.guides.open',
      'xd.xenesis.providers.views.open',
      'xd.xenesis.tools.views.open',
      'xd.xenesis.messengers.views.open',
    ],
    userStoryTemplates: [
      'inspect active provider routing before running a task',
      'connect Notion or Google Calendar as a planned MCP/OAuth workflow',
      'open a messenger setup view and verify routing/safety before remote prompts',
      'drive Desk actions through CR and verify readback',
    ],
    safetyBoundaries: [
      'guide catalog does not execute workflows',
      'planned integrations remain setup/readiness views until runtime support exists',
      'CR readback must verify any guide-driven action',
    ],
  },
}
```

- [x] **Step 5: Run the shared test and verify GREEN**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: PASS.

### Task 2: Guide Catalog CR Capability

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`
- Test: `src/shared/xenesisConnectionCapabilities.test.ts`

- [x] **Step 1: Write the failing CR dispatch test**

Add a test named `xenesis guide catalog capabilities are registered and dispatch to the adapter`.

```ts
test('xenesis guide catalog capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.guides.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.guides.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.deepEqual(openCapability?.schema?.required, ['id']);
  for (const guide of ['onboarding-connections', 'cr-mcp-gateway-bots', 'agent-user-stories']) {
    assert.equal(statusSchemaProperties.id?.enum.includes(guide), true, `${guide} should be accepted by status`);
    assert.equal(openSchemaProperties.id?.enum.includes(guide), true, `${guide} should be accepted by open`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisGuidesStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'agent-user-stories', guideType: 'user-story-catalog' }],
      };
    },
    openXenesisGuide: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'agent-user-stories' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.guides.status',
    args: { id: 'agent-user-stories' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.guides.open',
    args: { id: 'agent-user-stories' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'agent-user-stories' } },
    { method: 'open', args: { id: 'agent-user-stories' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'agent-user-stories', guideType: 'user-story-catalog' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'agent-user-stories' },
  });
});
```

- [x] **Step 2: Run the CR test and verify RED**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: FAIL because `xd.xenesis.guides.status` and `xd.xenesis.guides.open` are not registered.

- [x] **Step 3: Add adapter methods and schemas**

Add adapter methods:

```ts
getXenesisGuidesStatus?: (args?: unknown) => Promise<unknown> | unknown;
openXenesisGuide?: (args?: unknown) => Promise<unknown> | unknown;
```

Add guide id schemas with enum `['onboarding-connections', 'cr-mcp-gateway-bots', 'agent-user-stories']`.
`xd.xenesis.guides.open` also has `openFile: { type: 'boolean', default: false }` so Settings focus remains stable unless the caller explicitly opens the repo-local file.

- [x] **Step 4: Register and dispatch guide CR paths**

Add under `xd.xenesis`:

- `xd.xenesis.guides.status`, read/no-approval, schema accepts optional `id`.
- `xd.xenesis.guides.open`, control/no-approval, schema requires `id`.

Dispatch:

```ts
if (path === 'xd.xenesis.guides.status') {
  return callAdapter(path, api?.getXenesisGuidesStatus, request.args);
}
if (path === 'xd.xenesis.guides.open') {
  return callAdapter(path, api?.openXenesisGuide, request.args);
}
```

- [x] **Step 5: Add main-process read/open helpers**

Implement:

- `getXenesisGuidesStatus(args?: unknown)`
- `openXenesisGuide(args?: unknown)`
- `xenesisGuideStatusItem(item: XenesisConnectionItem)`

Behavior:

- `status` filters `status.sections.guides.items` by `id`, returns `total`, `items`, `guideCatalog`, `guideOpenPath`, source docs, read/control paths, validation checks, and safety boundaries.
- `open` requires `id`.
- Always focus the Settings card via `openMcpBuiltinPaneCapability({ kind:'settings', category:'xenesis-agent', mode:'connections', section:'xenesis-connections', focusConnectionId:id, ensureVisible:true })` so the in-Desk guide card is visible.
- If `openFile` is true and the guide has `guideOpenPath` or `guidePath`, also call `openMcpFileCapability({ filePath, placement: 'tab' })`.
- Return `{ ok, id, item, file, renderer }`.

- [x] **Step 6: Wire the main adapter and verify GREEN**

Add adapter entries:

```ts
getXenesisGuidesStatus: (args: unknown) => getXenesisGuidesStatus(args),
openXenesisGuide: (args: unknown) => openXenesisGuide(args),
```

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: PASS.

### Task 3: Renderer Guide Catalog Summary

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Test: `src/renderer/panes/xenesisConnectionCenter.test.ts`

- [x] **Step 1: Write the failing renderer helper test**

Add:

```ts
test('formatXenesisGuideCatalogSummary describes guide type, audience, and surface count', () => {
  assert.equal(
    formatXenesisGuideCatalogSummary({
      guideType: 'user-story-catalog',
      audience: 'agent',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['ai-providers', 'external-tools', 'messengers', 'capability-registry'],
      prerequisites: ['connection catalog readback'],
      validationChecks: ['xd.xenesis.connections.status'],
      readPaths: ['xd.xenesis.guides.status'],
      controlPaths: ['xd.xenesis.guides.open'],
      userStoryTemplates: ['inspect active provider routing before running a task'],
      safetyBoundaries: ['guide catalog does not execute workflows'],
    }),
    'user-story-catalog / agent / 4 surface(s)',
  );
});
```

- [x] **Step 2: Run the renderer test and verify RED**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: FAIL because `formatXenesisGuideCatalogSummary` is not exported.

- [x] **Step 3: Add renderer helper**

Add import for `XenesisConnectionGuideCatalogTemplate` and:

```ts
export function formatXenesisGuideCatalogSummary(guide: XenesisConnectionGuideCatalogTemplate): string {
  return `${guide.guideType} / ${guide.audience} / ${guide.coveredSurfaces.length} surface(s)`;
}
```

- [x] **Step 4: Render guide catalog metadata in Settings**

Import the helper and add, inside `renderXenesisConnectionCard`, when `item.guideCatalog` exists:

```tsx
<div className="sp-info-list sp-info-list-compact" data-xenesis-guide-catalog={item.id}>
  <div>
    <span>{t('settings.xenesisConnectionsGuideCatalog')}</span>
    <strong>{formatXenesisGuideCatalogSummary(item.guideCatalog)}</strong>
  </div>
  <div>
    <span>{t('settings.xenesisConnectionsGuideSurfaces')}</span>
    <strong>{item.guideCatalog.coveredSurfaces.join(', ')}</strong>
  </div>
  <div>
    <span>{t('settings.xenesisConnectionsGuidePrerequisites')}</span>
    <strong>{item.guideCatalog.prerequisites.join(', ')}</strong>
  </div>
  <div>
    <span>{t('settings.xenesisConnectionsGuideValidation')}</span>
    <strong>{item.guideCatalog.validationChecks.join(', ')}</strong>
  </div>
  <div>
    <span>{t('settings.xenesisConnectionsGuideUserStories')}</span>
    <strong>{item.guideCatalog.userStoryTemplates.join(', ')}</strong>
  </div>
  <div>
    <span>{t('settings.xenesisConnectionsGuideReadback')}</span>
    <strong>{item.guideCatalog.readPaths.join(', ')}</strong>
  </div>
  <div>
    <span>{t('settings.xenesisConnectionsGuideControls')}</span>
    <strong>{item.guideCatalog.controlPaths.join(', ')}</strong>
  </div>
  <div>
    <span>{t('settings.xenesisConnectionsGuideBoundaries')}</span>
    <strong>{item.guideCatalog.safetyBoundaries.join(', ')}</strong>
  </div>
</div>
```

Add English/Korean labels for the eight new keys.

- [x] **Step 5: Run renderer and focused shared tests**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: PASS.

### Task 4: Documentation And Obsidian

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update the manual**

Add a section near the Guides text:

```md
Guide cards also expose a structured `guideCatalog` read model. Use
`xd.xenesis.guides.status` to inspect setup playbooks, integration guides, and
user-story templates for provider setup, MCP/external tools, gateway/channel
readiness, and CR-controlled Desk workflows. Use `xd.xenesis.guides.open` with
`{ "id": "<guide-id>" }` to focus the matching Settings guide card. Add
`"openFile": true` when the caller also wants to open the repo-local guide file.
This surface is read-only except for opening the guide/view; it does not install
tools, create OAuth flows, send messages, or mutate provider/channel settings.
```

- [x] **Step 2: Update the Obsidian working note**

Add a `Current Guide Catalog CR Surface Slice` section describing:

- `guideCatalog` metadata on guide cards.
- `xd.xenesis.guides.status`.
- `xd.xenesis.guides.open`.
- Settings DOM marker `data-xenesis-guide-catalog="<guide-id>"`.
- Read-only boundaries and verification results.

- [x] **Step 3: Update `handoff.md`**

Record objective, touched files, RED/GREEN results, audit counters, build/public-release/live-smoke results, known gaps, and next step.

### Task 5: Verification And Commit

**Files:**
- Verify touched source/docs.
- Commit all tracked changes plus this plan file.

- [x] **Step 1: Run focused tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: PASS.

- [x] **Step 2: Run scoped Biome**

Run:

```powershell
npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80
```

Expected: PASS.

- [x] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 4: Run CR audit**

Run: `npm run docs:capabilities:audit`

Expected: PASS with:

- Missing registered paths: 0
- Missing dispatched coverage paths: 0
- Undispatched static callable methods: 0
- Dispatcher paths missing from tree: 0

Record the counters, then remove generated `docs/capability-registry-audit.md`.

- [x] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [x] **Step 6: Run public release check**

Run: `npm run check:public-release`

Expected current known infra gap: fails because `.github/workflows/ci.yml` is absent. Record the exact result.

- [x] **Step 7: Run live Electron smoke**

Launch Electron with Playwright `_electron.launch({ args: ['.'], cwd })` after `npm run build`.

Verify:

- Direct `xd.xenesis.guides.status` returns `ok=true`, `result.ok=true`, `total=3`.
- Filtered `xd.xenesis.guides.status` with `{ id: 'agent-user-stories' }` returns `total=1`, `guideType='user-story-catalog'`.
- Direct `xd.xenesis.guides.open` with `{ id: 'agent-user-stories' }` returns `ok=true` and keeps the Settings card focused.
- Direct `xd.xenesis.guides.open` with `{ id: 'agent-user-stories', openFile: true }` returns `ok=true` and `file.ok=true`.
- Settings renders `[data-xenesis-guide-catalog="agent-user-stories"]`.
- Agent-pane fenced CR prompt for `xd.xenesis.guides.status` renders `Desk action completed`.

- [x] **Step 8: Commit**

Stage:

```powershell
git add docs/manual/09-onboarding-connections.md "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md" src/main/index.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts src/renderer/panes/SettingsPane.tsx src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/xenesisConnectionCenter.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnections.ts
git add -f docs/superpowers/plans/2026-06-27-xenesis-guide-catalog-cr-surface.md
```

Commit:

```powershell
git commit -m "feat: add xenesis guide catalog status"
```
