---
type: task
repo: xenesis-desk
aliases:
  - Slice 02 Provider Onboarding Implementation
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
depends_on:
  - "[[Slice Spec 02 Provider Onboarding]]"
  - "[[Reference Adoption Map Proposal]]"
  - "[[Provider Model]]"
  - "[[Xenesis Agent Runtime]]"
verified_by:
  - "[[Verification Map]]"
touches:
  - "src/main/xenesisService.mjs"
  - "src/main/index.ts"
  - "src/shared/xenesisConnections.ts"
  - "src/shared/deskBridgeCapabilities.ts"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "packages/xenesis/src/providers/runtimeProviderResolution.ts"
  - "packages/xenesis/src/core/AgentRuntimeFactory.ts"
  - "packages/xenesis/src/cli/main.ts"
  - "packages/xenesis-agent-core/src/embeddedAgentRuntime.ts"
---

# Slice 02 Provider Onboarding Implementation

## Scope

Implement provider onboarding/readback without hardcoded natural-language
routing or silent provider fallback.

## Reference Adoption

- Reference analysis:
  - `F:\agent-anal\analysis\hermes-agent-main\03-llm-provider-abstraction.md`
  - `F:\agent-anal\analysis\openclaw-main\05-provider-extensions.md`
  - `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`
- Borrowed:
  - Declarative provider identity.
  - Provider runtime metadata as readback data.
  - Adapter/plugin boundary separation.
  - Credential scan results surfaced as status, not hidden fallback.
- Adapted for Xenesis:
  - Desk and package runtime status expose `requestedProvider`, resolved
    provider, source, auth mode, credential state/source, process model,
    diagnostics, and local CLI boundary.
  - `auto` scans Codex auth, Claude credentials, then API-key env providers.
  - Non-BYOK Codex prefers `codex-app-server` for persistent-process runtime.
  - Connection Center provider setup/routing reads the CR provider runtime
    metadata instead of re-deriving assumptions.
- Rejected:
  - Mock reasoning provider in normal runtime.
  - Silent keyed-provider fallback.
  - Raw secret exposure in status, docs, or reports.
  - Deterministic natural-language intent catalog or provider-specific CR
    shortcuts.

## Implemented Paths

- `src/main/xenesisService.mjs`
- `src/main/index.ts`
- `src/shared/types.ts`
- `src/shared/xenesisConnections.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `packages/xenesis/src/providers/runtimeProviderResolution.ts`
- `packages/xenesis/src/core/AgentRuntimeFactory.ts`
- `packages/xenesis/src/connect/report.ts`
- `packages/xenesis/src/cli/main.ts`
- `packages/xenesis-agent-core/src/embeddedAgentRuntime.ts`
- `scripts/xenesisProviderOnboardingLiveSmoke.mjs`

## Verification Evidence So Far

- `node --test src\main\xenesisService.test.mjs` -> pass 11/11.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts packages\xenesis-agent-core\src\embeddedAgentRuntime.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentStatusBar.test.ts` -> pass 181/181.
- `npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts tests/s3s4/providerFactoryWiring.test.ts tests/s3s4/connectProviderReadiness.test.ts tests/i5/loadProviders.test.ts tests/i5/integration.test.ts` -> pass 5 files / 46 tests.
- `npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts tests/s3s4/providerFactoryWiring.test.ts tests/s3s4/connectProviderReadiness.test.ts tests/i5/loadProviders.test.ts tests/i5/integration.test.ts tests/s3s4/providerFactory.test.ts src/providers/cliProvider.deskMcp.test.ts` -> pass 7 files / 53 tests.
- `node --test scripts\xenesisProviderOnboardingLiveSmoke.test.mjs` -> pass 17/17.
- `node --test packages\xenesis\scripts\provider-smoke-gateway-auth.test.mjs` -> pass 2/2.
- `npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke` -> pass JSON `ok: true`, 8/8.
- `npm --prefix packages/xenesis run provider:smoke` -> pass 6/6, report `C:\Users\great\.xenesis\reports\provider-live-20260629T122031899Z.json`.
- `npm --prefix packages/xenesis run typecheck` -> pass.
- `npm --prefix packages/xenesis test` -> pass 82 files / 389 tests.
- `npm run typecheck` -> pass.
- `npm run docs:capabilities:audit; node scripts\assertCapabilityAuditZero.mjs` -> pass, 801 nodes, 689 coverage path references, audit-zero verified 4 counters.
- `npm run build` -> pass with existing Vite warnings: browser-externalized `hwp.js` `fs`; mixed static/dynamic `src/renderer/deskBridge.ts` import chunk warning.
- `git diff --check` -> pass with LF/CRLF working-copy normalization warnings only.
- `node .\scripts\xenesisProviderOnboardingLiveSmoke.mjs --json --timeout=180000` -> pass JSON `ok: true`, 9/9; provider runtime `codex-app-server`, requested `auto`, source `auto-detect`, process model `persistent-process`, proof boundary `providerNaturalLanguageToolSelectionProof=true`, `hasCrMcpToolEvidence=true`, `hasCrReadbackAfterPrompt=true`, `usedProviderDeskMcpRecovery=false`.
- Adversarial subagent review -> no blockers.
- Follow-up test gaps closed:
  - `developerInstructions` directly asserts the output contract.
  - App-server turn input directly asserts dynamic system/recovery message preservation while excluding fixed provider instructions.
- `npm --prefix packages/xenesis exec vitest run src/providers/cliProvider.deskMcp.test.ts` -> pass 3/3 after the follow-up test additions.
- `npm --prefix packages/xenesis test` -> pass 82 files / 389 tests after the follow-up test additions.

## Evidence Boundary

`provider:desk-mcp-prompt-smoke` remains fake-runner prompt-boundary evidence,
not live provider natural-language CR tool-selection proof. The live provider
onboarding smoke may only set `providerNaturalLanguageToolSelectionProof: true`
when provider output/work-log evidence and CR readback both prove CR/MCP tool
use.

## Remaining Gate

No remaining Slice 02 verification gate. The next slice can start from the
local Slice 02 commit boundary.

## Graph Links

- Depends on [[Slice Spec 02 Provider Onboarding]]
- Depends on [[Reference Adoption Map Proposal]]
- Depends on [[Provider Model]]
- Depends on [[Xenesis Agent Runtime]]
- Verified by [[Verification Map]]
