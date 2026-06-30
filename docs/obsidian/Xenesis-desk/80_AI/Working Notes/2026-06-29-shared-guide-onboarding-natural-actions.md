---
status: implemented
slice: shared-guide-onboarding-natural-actions
date: 2026-06-29
---

# Shared Guide And Onboarding Natural Actions

## Objective

Move guide and onboarding natural action assembly out of
`src/shared/xenesisNaturalLanguageActionResolvers.ts` and into shared capability
catalog helpers.

## Implementation

- Added `findXenesisNaturalGuideOpenAction` and
  `findXenesisNaturalGuideStatusAction` in
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
- Added `findXenesisNaturalOnboardingOpenAction` and
  `findXenesisNaturalOnboardingStatusAction` in the same shared catalog.
- Refactored `src/shared/xenesisNaturalLanguageActionResolvers.ts` so guide and
  onboarding flows resolve natural targets, then delegate action assembly to the
  shared catalog.
- Updated source-ownership tests to block direct guide/onboarding action builder
  imports, guide/onboarding rule imports, and stale resolver-owned rule
  expectations.

## Verification

- RED:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed 49/51 before the shared helpers existed and while the resolver still
  owned direct action assembly.
- GREEN focused:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 51/51.
- Focused Biome:
  `npx biome check --write --formatter-enabled=true --linter-enabled=true --assist-enabled=true src/shared/xenesisNaturalLanguageCapabilityCatalog.ts src/shared/xenesisNaturalLanguageActionResolvers.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  passed with no fixes.
- Focused post-format:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 51/51.
- Typecheck:
  `npm run typecheck` passed.
- Smoke fixture:
  `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- CR audit:
  `npm run docs:capabilities:audit` passed with 796 nodes and 689 coverage path
  references; missing registered paths, missing dispatched coverage paths,
  undispatched static callable methods, and dispatcher paths missing from tree
  were all 0.
- Build:
  `npm run build` passed with existing Vite warnings.
- Live natural Desk routing smoke:
  `npm run smoke:xenesis:natural-desk-routing` passed 261/261.
