---
type: task
repo: xenesis-desk
aliases:
  - Slice Spec 02 Provider Onboarding
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: low
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal Overall Spec]]"
  - "[[Final Goal Slice Spec Index]]"
  - "[[Provider Model]]"
  - "[[Xenesis Agent Runtime]]"
verified_by:
  - "[[Verification Map]]"
---

# Slice Spec 02 Provider Onboarding

## Goal

Finish provider setup and first-run onboarding so the active reasoning provider,
model, auth mode, credential state, runtime profile, local CLI boundary, and
first Agent run evidence are visible through CR-backed surfaces.

## Scope

- Provider setup/status readback.
- Provider profile draft and setup plan surfaces.
- First-chat onboarding plan and workflow preview.
- Provider runtime prompt guards and no-heuristic routing checks.
- Live Agent pane evidence boundary: footer/work-log provider proof before
  claiming provider-controlled Desk behavior.

## Reference Intake

- `F:\agent-anal\analysis\hermes-agent-main\03-llm-provider-abstraction.md`
- `F:\agent-anal\analysis\openclaw-main\05-provider-extensions.md`
- `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`

Original source anchors:

- `F:\agent-anal\hermes-agent-main\gateway\runtime_footer.py`
- `F:\agent-anal\hermes-agent-main\gateway\config.py`
- `F:\agent-anal\hermes-agent-main\providers\base.py`
- `F:\agent-anal\hermes-agent-main\providers\__init__.py`
- `F:\agent-anal\hermes-agent-main\agent\chat_completion_helpers.py`
- `F:\agent-anal\openclaw-main\src\llm\providers\register-builtins.ts`
- `F:\agent-anal\openclaw-main\src\plugin-sdk\provider-entry.ts`
- `F:\agent-anal\openclaw-main\extensions\openai\openai-provider.ts`
- `F:\agent-anal\openclaw-main\extensions\google\provider-registration.ts`
- `F:\agent-anal\openclaw-main\packages\model-catalog-core\src\provider-id.ts`

## Candidate Files

- `src/shared/xenesisConnections.ts`
- `src/shared/xenesisConnections.test.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/shared/xenesisConnectionCapabilities.test.ts`
- `src/main/index.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `src/renderer/panes/xenesisConnectionCenter.test.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
- `packages/xenesis/src/core/AgentRuntimeFactory.ts`
- `packages/xenesis/src/providers/cliProvider.ts`
- `packages/xenesis/src/providers/cliProvider.deskMcp.test.ts`
- `scripts/assertCapabilityAuditZero.mjs`
- `handoff.md`

## Acceptance

- Active provider is read from user settings/profile, not hardcoded.
- Active `~/.xenis` profile source and `auto` resolution order are explicit:
  Codex auth, Claude credentials, then env keys.
- Keyed provider without credentials returns honest credential error.
- Mock provider is not reachable from the agent reasoning path.
- No keyed-provider failure silently falls back to codex, mock, or another
  provider.
- `localCli` and reasoning provider identity remain separate.
- Non-BYOK Codex prefers `codex-app-server` persistent process and documents
  one-shot `codex-cli` fallback conditions.
- Provider setup plan exposes read/open workflow preview only.
- Live Agent evidence records exact natural-language prompt text, visible
  provider footer/work-log, provider source readback, generic
  `desk_call_capability` or `xenesis_desk_call_capability` evidence, and CR
  readback or approval result.
- Reference adoption map proposal is updated with borrowed, adapted, rejected,
  and verified provider/reference patterns.

## Verification

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
node --test src\main\xenesisService.test.mjs
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentStatusBar.test.ts
npx tsx --test packages\xenesis-agent-core\src\embeddedAgentRuntime.test.ts
npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts tests/s3s4/providerFactoryWiring.test.ts tests/s3s4/connectProviderReadiness.test.ts tests/i5/loadProviders.test.ts tests/i5/integration.test.ts
node --test scripts\xenesisProviderOnboardingLiveSmoke.test.mjs
node .\scripts\xenesisProviderOnboardingLiveSmoke.mjs --json
npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke
npm --prefix packages/xenesis run provider:smoke
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
npm run typecheck
npm --prefix packages/xenesis run typecheck
```

`provider:desk-mcp-prompt-smoke` is prompt-construction coverage, not live
provider proof. Live Electron Agent-pane prompt evidence is mandatory before
claiming provider natural-language Desk control.

## Out Of Scope

- External tool OAuth flow completion.
- Messenger channel test-send.
- Provider plugin SDK or broad provider registry redesign unless required by
  this slice's provider setup acceptance.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Provider Model]]
- Depends on [[Xenesis Agent Runtime]]
- Verified by [[Verification Map]]
