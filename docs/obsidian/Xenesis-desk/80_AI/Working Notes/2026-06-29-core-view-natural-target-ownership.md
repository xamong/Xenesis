# Core Tool/View Natural Target Ownership

## Objective

Move remaining CR-path-bearing core tool targets and built-in view targets out
of the base natural-language text catalog and into the capability/action catalog
ownership boundary.

## Why

`xenesisAgentDeskControl.ts` is now a re-export facade. The remaining
hardcoded natural-routing surface for this slice was in shared catalogs:
`XENESIS_NATURAL_CORE_TOOL_TARGETS` and `XENESIS_NATURAL_VIEW_TARGETS` lived in
`src/shared/xenesisNaturalLanguageCatalog.ts` even though they own CR paths and
`xd.views.open` kinds.

## Implemented

- Added capability-owned core tool target specs and targets:
  - `XENESIS_NATURAL_CORE_TOOL_TARGET_SPECS`
  - `XENESIS_NATURAL_CORE_TOOL_TARGETS`
- Added capability-owned view target specs and targets:
  - `XENESIS_NATURAL_VIEW_TARGET_SPECS`
  - `XENESIS_NATURAL_VIEW_TARGETS`
- Moved `findXenesisNaturalCoreToolTarget` and
  `findXenesisNaturalViewTarget` into
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
- Removed the core tool CR path array and view `kind` array from
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Updated action resolvers to import those finders from the capability catalog.
- Strengthened source-ownership guards in the Agent Desk Control test.

## Verification

- RED:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed 43/44 before the capability-owned specs existed.
- GREEN:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 44/44.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
  6/6.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed with 779 nodes and 689 coverage path
  references.
- CR audit gap scan reported all 0 for missing registered paths, missing
  dispatched coverage paths, undispatched static callable methods, and
  dispatcher paths missing from tree.
- `npm run smoke:xenesis:natural-desk-routing` passed 186/186.
- Changed-file Biome check passed for the touched TypeScript files.
- `git diff --check` passed with line-ending warnings only.

## Safety

- Route order, CR paths, action args, reasons, and smoke prompts were kept
  unchanged.
- This remains deterministic natural-language catalog routing, not model
  reasoning.
