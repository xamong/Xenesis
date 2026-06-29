# Slice 02 Provider Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish provider onboarding/readback so Desk and `packages/xenesis` use an explicit provider-resolution contract: user setting/profile first, `auto` credential scan second, no mock reasoning provider, no silent keyed-provider fallback, local CLI selection separate from reasoning provider identity, and live Agent-pane evidence that the active provider can reach CR/MCP tools.

**Architecture:** Add a pure provider-resolution layer, use it from package core/CLI/connect paths and Desk runtime launch/readback paths, expose redacted resolution metadata through `XenesisStatus` and Connection Center provider cards, then verify with unit tests, package smokes, CR audit, and one live Electron Agent-pane prompt. This adapts the Hermes/OpenClaw pattern of declarative provider identity plus transport/runtime metadata, but keeps Xenesis Desk CR as the control source of truth.

**Tech Stack:** TypeScript, Node ESM, Vitest, `node:test`, Electron live smoke scripts, Xenesis Capability Registry, repo-local Obsidian working notes.

**Execution note:** Implementation kept provider construction in the existing
`packages/xenesis/src/core/AgentRuntimeFactory.ts` path instead of creating a
separate `runtimeProviderFactory.ts`, so registered external providers and
built-in provider readiness share one factory boundary. The CLI private helper
now delegates to that core factory. Renderer provider setup summaries were
updated through `src/renderer/panes/xenesisConnectionCenter.ts`.

---

### Task 1: Package Provider Resolution Contract

**Files:**
- Create: `packages/xenesis/src/providers/runtimeProviderResolution.ts`
- Create: `packages/xenesis/src/providers/runtimeProviderResolution.test.ts`
- Modify: `packages/xenesis/src/config/types.ts`
- Modify: `packages/xenesis/src/config/loadConfig.ts`
- Modify: `packages/xenesis/src/providers/registry.ts`
- Modify: `packages/xenesis/src/providers/index.ts`

- [x] **Step 1: Add RED tests for `auto`, mock blocking, and credential errors**

Add Vitest coverage proving:

- `providerNames` accepts `auto`.
- `resolveRuntimeProviderSelection({ provider: 'auto' })` scans in this order:
  1. `CODEX_HOME/auth.json` or home `.codex/auth.json` -> `codex-app-server`
  2. home `.claude/.credentials.json` -> `claude-interactive`
  3. `ANTHROPIC_API_KEY` -> `anthropic`
  4. `OPENAI_API_KEY` -> `openai`
  5. `GEMINI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `DASHSCOPE_API_KEY`
- `auto` with no credential returns a structured `missing-credentials` result and does not silently select `codex-cli`.
- explicit `openai` without `OPENAI_API_KEY` returns an honest missing credential result and does not select `codex`, `mock`, or another provider.
- explicit `mock` is rejected unless `XENESIS_ENABLE_TEST_MOCK_PROVIDER=true` is present.
- `localCli` is not an input to package provider resolution.

Run:

```powershell
npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts
```

Expected before implementation: FAIL because the file and resolver do not exist.

- [x] **Step 2: Implement the resolver**

Implement `runtimeProviderResolution.ts` exports:

- `RuntimeProviderName` excluding `auto` and `mock` for normal reasoning.
- `ProviderSelectionResult` with `requestedProvider`, `provider`, `source`, `authMode`, `credentialState`, `credentialSource`, `processModel`, `apiKeyEnv`, `baseURL`, `model`, `fallbackProvider`, `diagnostics`, and `safeForReasoning`.
- `resolveRuntimeProviderSelection(config, env, options)` with injected `existsSync`, `homedir`, and `allowTestMockProvider`.
- `assertRuntimeProviderReady(selection)` that throws clear credential/setup errors for `missing`, `blocked`, and `mock`.

Rules:

- `auto` never falls back to `codex-cli` without a Codex auth file.
- Codex ChatGPT login resolves to `codex-app-server`; `CodexAppServerProvider` remains responsible for one-shot `codex-cli` fallback only when app-server startup fails.
- Claude CLI login resolves to `claude-interactive` for persistent process behavior.
- Keyed providers require their configured API key unless the provider capability is `requiresApiKey:false`.
- Secret values never appear in result objects.

- [x] **Step 3: Update config schema/defaults**

Change `defaultConfig.provider` from `openai` to `auto`, allow `XENESIS_PROVIDER=auto`, and keep `mock` gated for test/dev only. Do not remove `MockProvider` implementation yet; make it unreachable from normal reasoning configuration.

- [x] **Step 4: Run GREEN**

Run:

```powershell
npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts
```

Expected: PASS.

### Task 2: Use One Provider Factory Across Core, CLI, and Connect

**Files:**
- Use existing: `packages/xenesis/src/core/AgentRuntimeFactory.ts`
- Modify: `packages/xenesis/src/core/AgentRuntimeFactory.ts`
- Modify: `packages/xenesis/src/cli/main.ts`
- Modify: `packages/xenesis/src/connect/report.ts`
- Modify: `packages/xenesis/src/providers/cliProvider.deskMcp.test.ts`
- Modify: `packages/xenesis/tests/s3s4/providerFactoryWiring.test.ts`
- Create: `packages/xenesis/tests/s3s4/connectProviderReadiness.test.ts`

- [x] **Step 1: Add RED tests for duplicate factory behavior**

Add focused tests proving:

- core `createProvider()` resolves `auto` with Codex auth to a `codex-app-server` provider.
- core `createProvider()` rejects `mock` without the explicit test env.
- CLI provider creation follows the same `auto` and keyed-missing rules as core.
- connect probe uses the same resolver and reports `missing credentials` instead of attempting OpenAI by default.
- `selectTools()` no longer uses `config.provider === 'mock'` as a runtime branch for normal reasoning.

Run:

```powershell
npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts tests/s3s4/providerFactoryWiring.test.ts tests/s3s4/connectProviderReadiness.test.ts
```

Expected before implementation: FAIL.

- [x] **Step 2: Implement shared factory**

Use the core provider factory as the shared provider construction path:

- `createProvider(config, env, options)` uses `resolveRuntimeProviderSelection()` and `assertRuntimeProviderReady()`.
- It constructs `CodexAppServerProvider`, `CodexCliProvider`, `ClaudeInteractiveProvider`, `ClaudeCliProvider`, `AnthropicProvider`, `OpenAIProvider`, and registered providers from one path.
- It passes resolved `apiKeyEnv`, `apiKey`, and `baseURL` only after the readiness check.
- It returns or attaches redacted `providerMetadata.runtimeSelection` for readback where useful.

Refactor core, CLI, and connect to call the shared resolver/factory path. Remove duplicate provider if/else blocks except thin wrappers needed for public exports.

- [x] **Step 3: Update package provider smoke defaults**

Change `packages/xenesis/scripts/provider-smoke.mjs` default provider from `openai` to `auto`, but keep the test-only mock smoke by setting `XENESIS_ENABLE_TEST_MOCK_PROVIDER=true` in `provider-smoke-gateway-auth.test.mjs`.

Run:

```powershell
node --test packages/xenesis/scripts/provider-smoke-gateway-auth.test.mjs
npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke
```

Expected: both PASS.

- [x] **Step 4: Run package provider tests**

Run:

```powershell
npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts tests/s3s4/providerFactoryWiring.test.ts tests/s3s4/connectProviderReadiness.test.ts tests/i5/loadProviders.test.ts tests/i5/integration.test.ts
```

Expected: PASS with no deterministic natural-language routing reintroduced.

### Task 3: Desk Runtime Resolution and Readback

**Files:**
- Modify: `src/main/xenesisService.mjs`
- Modify: `src/main/xenesisService.test.mjs`
- Modify: `src/shared/types.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentStatusBar.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentStatusBar.test.ts`

- [x] **Step 1: Add RED Desk resolver tests**

Extend `src/main/xenesisService.test.mjs` to prove:

- Desk `auto` with Codex auth resolves to `codex-app-server` with `processModel: 'persistent-process'`.
- Desk `auto` with Claude credentials resolves to `claude-interactive`.
- Desk `auto` with no credentials returns a blocked/missing result and does not return `codex-cli`.
- Explicit unknown provider returns a blocked/invalid provider result and does not fall back to `codex-cli`.
- Explicit keyed provider with no key preserves that provider and reports `credentialState: 'missing'`.

Run:

```powershell
node --test src\main\xenesisService.test.mjs
```

Expected before implementation: FAIL on no-credential/unknown-provider and Claude persistent expectations.

- [x] **Step 2: Extend provider runtime status**

Extend `XenesisProviderRuntimeStatus` with:

- `requestedProvider`
- `source`
- `authMode`
- `credentialState`
- `credentialSource`
- `processModel`
- `fallbackProvider`
- `safeForReasoning`
- `diagnostics`
- `localCliBoundary`

Update `buildXenesisProviderRuntimeOptions()` and `buildXenesisProviderRuntimeStatus()` to return the new redacted fields. Preserve existing fields `provider`, `model`, `profile`, `baseURL`, and `apiKeyEnv` for compatibility.

- [x] **Step 3: Keep local CLI orthogonal**

Ensure `buildLocalCliTerminalEnv()` and `localCli.selectedAgentId` do not decide reasoning provider identity. Add source guards in tests that `localCli.selectedAgentId` appears only in local terminal/MCP setup plumbing and not in provider resolution calls.

- [x] **Step 4: Update Agent status bar readback**

Keep the visible footer item concise, but ensure the status object includes process/source metadata so live smoke can assert `provider=codex-app-server`, `source=auto-detect`, and `processModel=persistent-process` without scraping private logs.

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentStatusBar.test.ts
```

Expected: PASS.

### Task 4: Connection Center Provider Metadata and CR Surface

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`

- [x] **Step 1: Add RED Connection Center tests**

Add tests proving provider setup/routing/profile draft readbacks include:

- active requested provider and resolved runtime provider
- route source `user-settings-profile` or `auto-detect`
- auto scan summary with no secret values
- credential state and credential source
- process model (`persistent-process`, `process-per-turn`, or `http-streaming`)
- local CLI boundary text
- no `mock` provider in Desk provider schema enums or provider cards

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected before implementation: FAIL where new fields/schema guards are missing.

- [x] **Step 2: Implement metadata propagation**

Update provider setup/routing templates to consume `xenesis.providerRuntime` metadata instead of re-deriving hidden assumptions. Keep profile draft apply approval-gated and do not expose raw API keys.

- [x] **Step 3: Update renderer summaries**

Update provider setup/routing formatting helpers and Connection Center tests so operator-visible summaries show:

- requested -> resolved provider when `auto` is selected
- credential state
- process model
- `localCli` separation

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: PASS.

### Task 5: Provider Evidence Smokes

**Files:**
- Create: `scripts/xenesisProviderOnboardingLiveSmoke.mjs`
- Create: `scripts/xenesisProviderOnboardingLiveSmoke.test.mjs`
- Modify: `package.json`
- Modify: `packages/xenesis/package.json`
- Modify: `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`
- Modify: `handoff.md`

- [x] **Step 1: Add RED live smoke contract test**

Add `scripts/xenesisProviderOnboardingLiveSmoke.test.mjs` with pure report-builder tests proving:

- computed report `ok`, `summary`, and `checks` cannot be overridden by `extra`
- report includes `naturalPrompt`, footer/readback provider, source, process model, and CR/MCP evidence fields
- report marks `providerNaturalLanguageToolSelectionProof` false unless an actual provider turn includes CR/MCP tool-call evidence and CR readback after the prompt

Run:

```powershell
node --test scripts\xenesisProviderOnboardingLiveSmoke.test.mjs
```

Expected before implementation: FAIL because script does not exist.

- [x] **Step 2: Implement structured live smoke**

The script should launch Electron with `_electron.launch`, use CR testing paths, and produce JSON. Required checks:

- `status-readback-provider`: `xd.xenesis.status` returns expected `providerRuntime.provider`
- `status-readback-source`: `providerRuntime.source` is visible
- `footer-provider`: Agent-pane footer/status bar exposes the same provider
- `natural-prompt-submitted`: exact natural prompt recorded, for example `프로바이더 라우팅 상태를 CR로 확인해줘`
- `provider-cr-mcp-evidence`: provider output/work-log contains a real CR/MCP tool call or MCP bridge call evidence
- `cr-readback-after-prompt`: a CR readback path returns consistent provider setup/routing status after the prompt
- `no-chat-only-approval`: no synthesized approval text is treated as completion

If credentials are missing, the script must fail with a clear `missing provider credentials` diagnostic and must not fall back to mock/codex.

- [x] **Step 3: Keep prompt smoke boundary honest**

Keep `provider-desk-mcp-prompt-smoke.mjs` as fake-runner prompt-boundary evidence. Do not make it claim live provider CR tool selection.

Run:

```powershell
npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke
```

Expected: JSON `ok: true`, still no deterministic natural intent catalog.

### Task 6: Obsidian and Reference Adoption Updates

**Files:**
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-02-provider-onboarding.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`
- Modify: `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`
- Modify: `handoff.md`

- [x] **Step 1: Record reference adoption**

Add Slice 02 record:

- Reference analysis:
  - `F:\agent-anal\analysis\hermes-agent-main\03-llm-provider-abstraction.md`
  - `F:\agent-anal\analysis\openclaw-main\05-provider-extensions.md`
  - `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`
- Borrowed pattern:
  - declarative provider identity
  - provider/runtime metadata readback
  - plugin/adapter boundary separation
  - credential scan/auth mode surfaced as data, not hidden fallback
- Rejected behavior:
  - deterministic prompt routing
  - mock reasoning provider
  - silent provider fallback
  - raw secret exposure

- [x] **Step 2: Update verification index**

Add the final Slice 02 commands with direct `node ... --json` where structured JSON is required. Do not use npm arg-forwarding examples for JSON evidence.

### Task 7: Full Verification and Review

**Files:**
- Modify: `handoff.md`

- [x] **Step 1: Run focused verification**

Run:

```powershell
node --test src\main\xenesisService.test.mjs
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test packages\xenesis-agent-core\src\embeddedAgentRuntime.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentStatusBar.test.ts
npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts tests/s3s4/providerFactoryWiring.test.ts tests/s3s4/connectProviderReadiness.test.ts tests/i5/loadProviders.test.ts tests/i5/integration.test.ts
node --test scripts\xenesisProviderOnboardingLiveSmoke.test.mjs
```

Expected: PASS.

- [x] **Step 2: Run package and root gates**

Run:

```powershell
npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke
npm --prefix packages/xenesis run provider:smoke
npm --prefix packages/xenesis run typecheck
npm --prefix packages/xenesis test
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
npm run typecheck
npm run build
git diff --check
```

Expected: PASS, except any pre-existing build warnings must be recorded exactly and not treated as failures.

- [x] **Step 3: Run live Agent-pane provider evidence**

Run:

```powershell
node .\scripts\xenesisProviderOnboardingLiveSmoke.mjs --json
```

Expected:

- JSON `ok: true`
- exact natural prompt included
- footer/readback provider matches resolved runtime provider
- provider source and process model visible
- real CR/MCP call evidence present
- no provider-natural-language claim if the provider did not actually call CR/MCP

- [x] **Step 4: Adversarial subagent review**

Request adversarial review focused on:

- provider fallback correctness
- mock provider reachability
- keyed credential failure behavior
- `auto` scan order
- localCli/provider separation
- CR readback completeness
- natural-language proof overclaim risk
- docs/Obsidian source-of-truth alignment

Fix blockers, rerun focused checks, and record final evidence in `handoff.md`.

- [x] **Step 5: Commit**

Commit after verification:

```powershell
git add docs\superpowers\plans\2026-06-29-slice-02-provider-onboarding.md handoff.md
git commit -m "Plan slice 02 provider onboarding"
```

Implementation commits should be task-sized and never mix unrelated workspace changes.
