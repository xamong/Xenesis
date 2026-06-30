---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-28
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[module-capability-registry]]"
  - "[[module-xenesis-agent-pane]]"
touches:
  - "src/shared/xenesisConnections.ts"
  - "src/shared/deskBridgeCapabilities.ts"
  - "src/main/index.ts"
  - "src/renderer/panes/SettingsPane.tsx"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "src/shared/xenesisNaturalLanguageCapabilityCatalog.ts"
  - "src/shared/xenesisNaturalLanguageCatalog.ts"
  - "scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs"
---

# Provider Setup Plan Slice

## Objective

Add a CR-first setup-plan layer for AI provider setup. The provider card now
has an ordered plan that joins setup readback, routing readback, internal
provider view focus, provider profile draft review/apply reference,
diagnostic runbooks, and setup requests into one Desk-native checklist.

## Implemented Surface

- Model: `providerSetupPlan` on provider connection items.
- CR paths:
  - `xd.xenesis.providers.setupPlans.status`
  - `xd.xenesis.providers.setupPlans.open`
- Settings focus detail:
  - `provider-setup-plan`
  - `data-xenesis-provider-setup-plan`
- Natural prompts:
  - `AI provider 설정 플랜 전체 상태 보여줘`
  - `AI provider 설정 플랜 전체 열어줘`
  - `codex app-server provider 설정 플랜 상태 보여줘`
  - `codex app-server provider 설정 플랜 열어줘`

## Safety Boundary

Provider setup plans are read/open orchestration metadata. They do not change
active provider settings, store raw secrets, edit fallback chains, switch local
CLI selection, run provider prompts, or bypass approvals. Ready non-secret
profile writes remain on `xd.xenesis.providers.profileDrafts.apply` with
Capability Registry approval.

## Verification Notes

Focused tests added/updated:

- `src/shared/xenesisConnections.test.ts`
- `src/shared/xenesisConnectionCapabilities.test.ts`
- `src/renderer/panes/xenesisConnectionCenter.test.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

Focused verification passed:

- `npx tsx --test src\shared\xenesisConnections.test.ts` 40/40.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` 40/40.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` 52/52.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` 38/38.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` 6/6.

## Current Follow-Up

Run broader gates after formatting:

- `npm run typecheck`
- `npm run docs:capabilities:audit`
- `npm run build`
- `npm --prefix packages/xenesis test`
- `npm --prefix packages/xenesis run typecheck`
- `npm --prefix packages/xenesis run build`
- `npm run smoke:xenesis:natural-desk-routing`
- `git diff --check`

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[module-capability-registry]]
- Depends on [[module-xenesis-agent-pane]]
- Extends [[Xenesis Connection Center Working Note]]
