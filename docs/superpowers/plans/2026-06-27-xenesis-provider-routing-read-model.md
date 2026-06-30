# Xenesis Provider Routing Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only, CR-first provider routing status surface for Xenesis Agent provider retries, fallback providers, credential-pool metadata, and safety boundaries.

**Architecture:** Extend the existing `XenesisConnectionItem` provider card with a `providerRouting` template derived from current Desk AI provider settings and Xenesis profile/runtime status. Register `xd.xenesis.providers.routing.status` beside the existing provider setup/view CR paths, and render the same read model in the Settings Connection Center.

**Tech Stack:** TypeScript, Electron main/renderer, Xenesis shared CR registry, `node:test`, Playwright live Electron smoke.

---

### Task 1: Shared Provider Routing Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [ ] **Step 1: Write the failing shared-model test**

Add this test after the provider setup/view tests:

```ts
test('buildXenesisConnectionsStatus exposes provider routing fallback and credential-pool metadata', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'openai',
      model: 'gpt-5.4-mini',
      apiKey: 'desk-secret',
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
    providerFallbacks: [
      { provider: 'anthropic', model: 'claude-sonnet-4-5', apiKeyEnv: 'ANTHROPIC_API_KEY' },
      { provider: 'ollama', model: 'llama3.1', baseURL: 'http://127.0.0.1:11434/v1' },
    ],
    env: { ANTHROPIC_API_KEY: 'configured-secret' },
    xenesis: {
      ok: true,
      running: true,
      managed: true,
      enabled: true,
      runtimeMode: 'embedded',
      url: 'http://127.0.0.1:3846',
      runtimePath: 'embedded',
      xenesisHome: 'C:/Users/example/.xenis',
      workspace: 'E:/workspace/project',
      providerRuntime: {
        provider: 'openai',
        model: 'gpt-5.4-mini',
        profile: 'desk',
        baseURL: '',
        apiKeyEnv: 'OPENAI_API_KEY',
      },
      error: '',
      updatedAt: '2026-06-27T00:00:00.000Z',
      gateway: {
        enabled: true,
        running: false,
        managed: true,
        url: 'http://127.0.0.1:3846',
        host: '127.0.0.1',
        port: 3846,
        workspace: 'E:/workspace/project',
        error: '',
        updatedAt: '2026-06-27T00:00:00.000Z',
        channels: { total: 0, enabled: 0, ready: 0, blocked: 0, disabled: 0, items: [] },
      },
      profile: {
        active: 'desk',
        configured: 'desk',
        installed: ['desk'],
        templates: [],
        channels: [],
        channelSettings: emptyChannelSettings,
        policy: {
          workflow: 'default',
          approvalMode: 'safe',
          maxTurns: 4,
          providerRetries: 2,
          contextAutoCompact: true,
          memoryEnabled: true,
          subagentsEnabled: true,
          browserEnabled: true,
          verificationAutoRun: false,
          verificationAutoFix: false,
        },
      },
    },
  });

  assert.deepEqual(status.sections.provider.items[0].providerRouting, {
    routeSource: 'user-settings-profile',
    activeProvider: 'openai',
    activeModel: 'gpt-5.4-mini',
    runtimeProfile: 'desk',
    runtimeProvider: 'openai',
    runtimeModel: 'gpt-5.4-mini',
    retryPolicy: { maxRetries: 2, source: 'profile.policy.providerRetries' },
    fallbackPolicy: 'configured-providerFallbacks',
    fallbackChainSource: 'xenesis-runtime-config',
    fallbackChainVisible: true,
    fallbackChain: [
      {
        index: 1,
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        baseURLState: 'default',
        apiKeyEnv: 'ANTHROPIC_API_KEY',
        credentialState: 'configured',
      },
      {
        index: 2,
        provider: 'ollama',
        model: 'llama3.1',
        baseURLState: 'custom',
        apiKeyEnv: '',
        credentialState: 'not-required',
      },
    ],
    credentialPools: [
      { provider: 'openai', apiKeyEnv: 'OPENAI_API_KEY', credentialState: 'configured', source: 'runtime' },
      { provider: 'anthropic', apiKeyEnv: 'ANTHROPIC_API_KEY', credentialState: 'configured', source: 'fallback' },
      { provider: 'ollama', apiKeyEnv: '', credentialState: 'not-required', source: 'fallback' },
    ],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.providers.routing.status',
      'xd.xenesis.status',
    ],
    diagnostics: ['provider-footer', 'work-log-provider', 'provider_retry', 'provider_fallback', 'cr-readback'],
    safetyBoundaries: [
      'routing status is read-only',
      'provider identity comes from user settings and profile',
      'fallback entries expose env names and credential state only, never secret values',
      'local CLI selection remains separate from provider identity',
      'missing keyed-provider credentials must not silently fall back',
    ],
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: FAIL because `providerRouting` and the new input fields are not implemented.

- [ ] **Step 3: Add the shared types and builder input**

Add `ProviderFallbackConfig`-shaped local types, `providerRouting?: XenesisConnectionProviderRoutingTemplate`, and builder input fields `providerFallbacks?: XenesisConnectionProviderFallbackInput[]` and `env?: Record<string, string | undefined>`.

- [ ] **Step 4: Implement the minimal routing template**

Implement helpers that classify fallback credential state from provider/auth mode and env presence. Use only env var names and configured/missing/not-required states.

- [ ] **Step 5: Run the shared test and verify GREEN**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: PASS.

### Task 2: Provider Routing CR Capability

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`
- Test: `src/shared/xenesisConnectionCapabilities.test.ts`

- [ ] **Step 1: Write the failing CR dispatch test**

Add a test asserting `xd.xenesis.providers.routing.status` is registered as read/no-approval, accepts the provider enum, and dispatches to `getXenesisProviderRoutingStatus`.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: FAIL because the capability and adapter method are missing.

- [ ] **Step 3: Register the CR path and adapter method**

Add `getXenesisProviderRoutingStatus?: (args?: unknown) => Promise<unknown> | unknown` to `DeskBridgeCapabilityAdapter`, add a routing group under `xd.xenesis.providers`, reuse the provider status schema, and dispatch the path to the adapter.

- [ ] **Step 4: Add main-process routing status helper**

Add `readActiveXenesisProfileConfig()` that resolves `settings.xenesis.profile || profiles.active || 'desk'`, falls back to the desk operating profile when appropriate, and returns profile config. Pass `activeProfile.providerFallbacks ?? []` and `process.env` into `buildXenesisConnectionsStatus()`. Add `getXenesisProviderRoutingStatus()` that maps provider connection items to routing payloads.

- [ ] **Step 5: Wire the adapter**

Add `getXenesisProviderRoutingStatus: (args: unknown) => getXenesisProviderRoutingStatus(args)` to the main adapter object.

- [ ] **Step 6: Run the CR test and verify GREEN**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: PASS.

### Task 3: Renderer Summary And Settings Surface

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`

- [ ] **Step 1: Write the failing renderer helper test**

Add a test for `formatXenesisProviderRoutingSummary()` that expects `openai -> 2 fallback(s) / retries 2`.

- [ ] **Step 2: Run the renderer test and verify RED**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: FAIL because the helper is missing.

- [ ] **Step 3: Add the summary helper**

Implement `formatXenesisProviderRoutingSummary(routing)` using `activeProvider`, `fallbackChain.length`, and `retryPolicy.maxRetries`.

- [ ] **Step 4: Render provider routing in Settings**

Read `const providerRouting = item.providerRouting;` in `renderXenesisConnectionItem()` and render a compact block with `data-xenesis-provider-routing={item.id}`. Include summary, fallback chain, credential pools, read paths, diagnostics, and safety boundaries.

- [ ] **Step 5: Run renderer test and focused shared tests**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts src\shared\xenesisConnections.test.ts`

Expected: PASS.

### Task 4: Documentation And Obsidian

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [ ] **Step 1: Update the manual**

Document `providerRouting`, `xd.xenesis.providers.routing.status`, fallback-chain visibility, credential-pool safety, and the read-only boundary.

- [ ] **Step 2: Update the Obsidian working note**

Append the Provider Routing Read Model slice with files, CR paths, and remaining gaps.

- [ ] **Step 3: Update `handoff.md`**

Record implementation progress, RED/GREEN evidence, docs changed, known gaps, and next intended step.

### Task 5: Verification And Commit

**Files:**
- Verify changed files and generated docs.

- [ ] **Step 1: Run focused tests**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: PASS.

- [ ] **Step 2: Run scoped Biome**

Run: `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`

Expected: PASS for the scoped files.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Run CR audit**

Run: `npm run docs:capabilities:audit`

Expected: PASS with missing registered paths, missing dispatched coverage paths, undispatched static callable methods, and dispatcher paths missing from tree all equal to 0. Remove generated `docs/capability-registry-audit.md` after recording counters.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS, allowing already-known Vite warnings.

- [ ] **Step 6: Run public release check**

Run: `npm run check:public-release`

Expected: FAIL only if the known `.github/workflows/ci.yml` infra gap remains.

- [ ] **Step 7: Run live Electron smoke**

Launch Electron with Playwright `_electron.launch({ args: ['.'], cwd })`. Verify direct `xd.xenesis.providers.routing.status`, DOM marker `[data-xenesis-provider-routing="<provider-card-id>"]`, and an Agent-pane fenced CR prompt for the same path returning `Desk action completed`.

- [ ] **Step 8: Commit**

Stage the ignored plan with `git add -f docs/superpowers/plans/2026-06-27-xenesis-provider-routing-read-model.md`, stage changed implementation/docs, and commit with:

```bash
git commit -m "feat: add xenesis provider routing status"
```
