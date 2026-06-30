# Xenesis Provider Setup Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and Settings-visible setup model for the active Xenesis AI provider.

**Architecture:** Extend the existing Connection Center provider card with `providerSetup` metadata instead of creating a parallel provider source of truth. `xd.xenesis.providers.setup.status` reads the current Connection Center provider section and returns provider identity, model, auth mode, credential state, endpoint, runtime profile, retry/fallback policy, verification, CR readback, and risk controls. Settings renders the same metadata inside the provider connection card.

**Tech Stack:** TypeScript, Xenesis Capability Registry, React Settings pane, Node test runner, Biome, Electron live smoke.

---

### Task 1: Shared Provider Setup Model

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`

- [x] **Step 1: Write the failing test**

Add a test that builds a ready `codex-app-server` status with a Xenesis runtime snapshot and asserts the provider card exposes:

```ts
assert.deepEqual(provider?.providerSetup, {
  source: 'user-settings',
  provider: 'codex-app-server',
  model: 'gpt-5-codex',
  authMode: 'local-login',
  credentialState: 'not-required',
  credentialStorage: 'local CLI login or app-server session',
  endpoint: 'default',
  runtimeProfile: 'desk',
  runtimeProvider: 'codex-app-server',
  runtimeModel: 'gpt-5-codex',
  providerRetries: 0,
  fallbackPolicy: 'configured-providerFallbacks',
  localCliBoundary: 'provider identity is separate from local CLI integration',
  verification: ['normal-chat', 'provider-footer', 'cr-readback'],
  crReadPaths: ['xd.xenesis.connections.status', 'xd.xenesis.providers.setup.status', 'xd.xenesis.status'],
  riskControls: [
    'do not silently switch keyed providers when credentials are missing',
    'keep local CLI selection separate from provider identity',
    'verify live Agent pane provider before Desk-control claims',
  ],
});
```

Also assert an OpenAI card with an API key does not serialize the secret and reports `credentialState: 'configured'`.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because `providerSetup` does not exist.

- [x] **Step 3: Implement minimal model**

Add:

```ts
export interface XenesisConnectionProviderSetupTemplate {
  source: 'user-settings' | 'auto-detect' | 'local-cli' | 'byok';
  provider: string;
  model: string;
  authMode: 'auto-detect' | 'local-login' | 'api-key' | 'none';
  credentialState: 'configured' | 'missing' | 'not-required';
  credentialStorage: string;
  endpoint: string;
  runtimeProfile: string;
  runtimeProvider: string;
  runtimeModel: string;
  providerRetries: number;
  fallbackPolicy: string;
  localCliBoundary: string;
  verification: string[];
  crReadPaths: string[];
  riskControls: string[];
}
```

Then add `providerSetup?: XenesisConnectionProviderSetupTemplate` to `XenesisConnectionItem`, export the type from `src/shared/types.ts`, and populate provider setup metadata from `aiProvider` plus optional Xenesis runtime/profile state.

- [x] **Step 4: Run test to verify it passes**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

### Task 2: CR Provider Setup Status Capability

**Files:**
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Write the failing test**

Add assertions that:

- `xd.xenesis.providers.setup.status` exists under a provider setup group.
- Permission is `read`, approval is `never`.
- The schema accepts optional `provider` with enum values including `auto`, `openai`, `anthropic`, `gemini`, `codex-app-server`, `codex-cli`, `claude-cli`, and `ollama`.
- Dispatch calls a new adapter `getXenesisProviderSetupStatus` with the original args.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: FAIL because the path and adapter do not exist.

- [x] **Step 3: Implement minimal registry, dispatch, and main adapter**

Add optional adapter method:

```ts
getXenesisProviderSetupStatus?: (args?: unknown) => Promise<unknown> | unknown;
```

Register `xd.xenesis.providers.setup.status`. Dispatch it to the adapter. In `src/main/index.ts`, implement the adapter by reading `getXenesisConnectionsStatus()` and returning provider cards with `providerSetup`, optionally filtered by `provider`. Unsupported providers should return `{ ok: false, error, allowedProviders }`.

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

Add `formatXenesisProviderSetupSummary(template)` expectation:

```ts
assert.equal(
  formatXenesisProviderSetupSummary({
    source: 'user-settings',
    provider: 'codex-app-server',
    model: 'gpt-5-codex',
    authMode: 'local-login',
    credentialState: 'not-required',
    credentialStorage: 'local CLI login or app-server session',
    endpoint: 'default',
    runtimeProfile: 'desk',
    runtimeProvider: 'codex-app-server',
    runtimeModel: 'gpt-5-codex',
    providerRetries: 0,
    fallbackPolicy: 'configured-providerFallbacks',
    localCliBoundary: 'provider identity is separate from local CLI integration',
    verification: ['normal-chat'],
    crReadPaths: ['xd.xenesis.connections.status'],
    riskControls: ['verify live Agent pane provider before Desk-control claims'],
  }),
  'codex-app-server / gpt-5-codex / local-login',
);
```

Expected: FAIL because `formatXenesisProviderSetupSummary` does not exist.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: FAIL.

- [x] **Step 3: Implement helper and render block**

Export `formatXenesisProviderSetupSummary`. In `SettingsPane`, render `providerSetup` with:

- Provider summary
- Credential state
- Endpoint
- Runtime profile
- Retry/fallback policy
- Local CLI boundary
- Verification
- CR readback
- Risk controls

Use `data-xenesis-provider-setup={item.id}` for live smoke.

- [x] **Step 4: Update docs and working notes**

Document `xd.xenesis.providers.setup.status`, clarify provider identity vs local CLI selection, credential state without secret leakage, fallback/retry policy, and live provider verification in the onboarding manual and working notes.

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

- `xd.xenesis.providers.setup.status` returns `ok=true`.
- Settings > Xenesis Agent > Connections renders `[data-xenesis-provider-setup]`.
- A live Agent-pane fenced CR prompt for `xd.xenesis.providers.setup.status` returns `Desk action completed.`

- [x] **Step 7: Commit**

Run:

```powershell
git add -f docs/superpowers/plans/2026-06-27-xenesis-provider-setup-read-model.md
git add src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts docs/manual/09-onboarding-connections.md "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md"
git commit -m "feat: add xenesis provider setup read model"
```
