---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
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

Original source anchors are selected during implementation from:

- `F:\agent-anal\hermes-agent-main\gateway\runtime_footer.py`
- `F:\agent-anal\hermes-agent-main\gateway\config.py`
- `F:\agent-anal\openclaw-main\src`

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
- `handoff.md`

## Acceptance

- Active provider is read from user settings/profile, not hardcoded.
- Keyed provider without credentials returns honest credential error.
- `localCli` and reasoning provider identity remain separate.
- Non-BYOK Codex prefers `codex-app-server` persistent process and documents
  one-shot `codex-cli` fallback conditions.
- Provider setup plan exposes read/open workflow preview only.
- Live Agent evidence records visible provider footer/work-log and does not
  claim unverified natural-language CR behavior.

## Verification

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npm --prefix packages/xenesis exec vitest run src/providers/cliProvider.deskMcp.test.ts src/core/AgentRuntimeFactory.modeMessages.test.ts src/core/AgentRunPipeline.noHeuristicRouting.test.ts
npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke
npm run docs:capabilities:audit
npm run typecheck
npm --prefix packages/xenesis run typecheck
```

Live Agent pane prompt evidence is required before claiming provider natural
language Desk control.

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
