---
status: implemented
slice: shared-aggregate-natural-catalog-actions
date: 2026-06-29
---

# Shared Aggregate Natural Catalog Actions

## Objective

Move provider, tool, and messenger aggregate catalog open/status action assembly
out of `src/shared/xenesisNaturalLanguageActionResolvers.ts` and into shared
natural capability catalog helpers.

## Implementation

- Added `findXenesisNaturalConnectionCenterAggregateOpenAction` in
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
- Added provider, tool, messenger, and messenger profile-draft aggregate status
  helper functions in the same shared catalog.
- Refactored `src/shared/xenesisNaturalLanguageActionResolvers.ts` so aggregate
  open/status routing delegates to the shared helpers.
- Updated source-ownership tests to block provider/tool/messenger aggregate rule
  imports and direct `ensureVisible()` aggregate action construction in the
  resolver.

## Verification

- RED:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed 50/52 before the shared aggregate helpers existed.
- GREEN focused:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 52/52.
- Focused Biome:
  `npx biome check --write --formatter-enabled=true --linter-enabled=true --assist-enabled=true src/shared/xenesisNaturalLanguageCapabilityCatalog.ts src/shared/xenesisNaturalLanguageActionResolvers.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  passed and fixed two files.
- Focused post-format:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 52/52.
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
