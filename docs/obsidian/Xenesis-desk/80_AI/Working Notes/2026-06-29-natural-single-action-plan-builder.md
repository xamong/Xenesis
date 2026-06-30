---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[module-capability-registry]]"
touches:
  - "src/shared/xenesisNaturalLanguageCatalog.ts"
  - "src/shared/xenesisNaturalLanguagePlanResolvers.ts"
  - "src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts"
---

# Natural Single Action Plan Builder

## Context

`xenesisAgentDeskControl.ts` is already a renderer facade. The remaining
hardcoding cleanup in this area is in shared natural-language planning modules,
where many simple resolvers repeated the same null-check and single-action plan
construction.

## Change

This slice adds `buildXenesisNaturalSingleActionPlan` to the shared natural
language catalog. Simple plan resolvers now pass their action candidate to that
helper instead of repeating `if (!action) return null` plus
`buildXenesisNaturalLanguagePlan(..., [action])`.

## Safety Boundary

This is a structural refactor. It does not add new CR paths, change natural
language routing priority, bypass approval, execute workflows, or alter action
arguments. Existing deterministic routing tests remain the behavior contract.

## Verification

- RED: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed because the helper was missing and resolver boilerplate still existed.
- GREEN: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 47/47 after the helper and refactor.
- Combined focused tests passed 88/88.
- `npm run typecheck` passed.
- `npm run smoke:xenesis:natural-desk-routing` passed 255/255.
- `npm run docs:capabilities:audit` passed with all four CR gap counters at 0.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Touches [[module-capability-registry]]
