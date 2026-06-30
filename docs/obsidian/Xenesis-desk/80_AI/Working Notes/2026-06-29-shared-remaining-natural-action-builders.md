---
title: Shared Remaining Natural Action Builders
date: 2026-06-29
type: working-note
status: verified
tags:
  - xenesis-desk
  - capability-registry
  - natural-language-routing
  - dehardcoding
---

# Shared Remaining Natural Action Builders

## Objective

Move the remaining direct natural action builder usage out of
`src/shared/xenesisNaturalLanguageActionResolvers.ts` and into named helpers in
`src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.

## Changes

- Added catalog-owned helpers for:
  - core tool open actions
  - provider/tool/messenger view-section open actions
  - user-story workflow preview actions
- Extended guide open/status helpers so they can resolve guide targets and
  repo-local file-open intent from natural text.
- Removed the resolver's direct imports of:
  - core/view-section/workflow action builders
  - guide file-open rules
  - guide/core/view-section/workflow preview target selectors
- Kept resolver responsibility limited to high-level action ordering plus
  runtime quoted text/path extraction.

## Verification

- RED focused test failed 51/55 as expected before the remaining named helpers
  existed and before resolver ownership was moved.
- GREEN focused test passed 55/55 after the helpers were added and resolver
  delegation was updated.
- Source guard found no remaining direct builder/rule/target-selector imports
  in `xenesisNaturalLanguageActionResolvers.ts`.
- Focused Biome write passed and fixed one file.
- Post-format focused test passed 55/55.
- Natural routing fixture passed 6/6.
- `npm run typecheck` initially found an over-broad helper signature; after
  narrowing helper inputs to `id`, `label`, and `kind`, typecheck passed.
- Focused Biome recheck passed.
- `npm run docs:capabilities:audit` passed; audit counters remained all 0.
- `npm run build` passed with existing Vite warnings only.
- `npm run smoke:xenesis:natural-desk-routing` passed 261/261.

## Notes

The natural resolver still owns ordered flow control and runtime extraction for
quoted Agent/run/workspace prompts. Natural CR action payload construction is now
catalog-owned for this slice's core tool, guide, workflow preview, and
view-section actions.
