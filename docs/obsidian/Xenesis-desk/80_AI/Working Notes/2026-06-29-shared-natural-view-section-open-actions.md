---
status: implemented
slice: shared-natural-view-section-open-actions
date: 2026-06-29
---

# Shared Natural View Section Open Actions

## Objective

Remove direct provider/tool/messenger view-section CR path construction from
the natural-language action resolver. The resolver now identifies the target
and section, then delegates action id/path/args/reason shaping to the shared
natural capability catalog.

## Implementation

- Shared catalog:
  - [src/shared/xenesisNaturalLanguageCapabilityCatalog.ts](../../../../../src/shared/xenesisNaturalLanguageCapabilityCatalog.ts)
  - Added `XENESIS_NATURAL_VIEW_SECTION_OPEN_ACTION_DESCRIPTORS`.
  - Added `buildXenesisNaturalProviderViewSectionOpenAction`.
  - Added `buildXenesisNaturalToolViewSectionOpenAction`.
  - Added `buildXenesisNaturalMessengerViewSectionOpenAction`.
- Natural resolver:
  - [src/shared/xenesisNaturalLanguageActionResolvers.ts](../../../../../src/shared/xenesisNaturalLanguageActionResolvers.ts)
  - Provider/tool/messenger view-section resolvers now call the shared
    builders instead of constructing CR action objects locally.
- Tests:
  - [src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts](../../../../../src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts)
  - Added source-ownership guard so the natural resolver cannot reintroduce
    `xd.xenesis.providers.views.open`, `xd.xenesis.tools.views.open`, or
    `xd.xenesis.messengers.views.open` literals.

## Verification

- RED:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Failed 47/49 because the shared builders did not exist and the resolver
    still owned direct view-section CR path literals.
- GREEN:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Passed 49/49.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
  - Passed 6/6.
  - `npm run typecheck`
  - Passed after aligning test fixtures to the builder input contract.
  - `npm run docs:capabilities:audit`
  - Passed; CR audit counters remained all 0.
  - `npm run build`
  - Passed with existing Vite warnings.
  - `npm run smoke:xenesis:natural-desk-routing`
  - Passed 261/261.
