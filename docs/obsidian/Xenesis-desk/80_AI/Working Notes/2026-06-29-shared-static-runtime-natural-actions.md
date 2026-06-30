---
title: Shared Static Runtime Natural Actions
date: 2026-06-29
type: working-note
status: verified
tags:
  - xenesis-desk
  - capability-registry
  - natural-language-routing
  - dehardcoding
---

# Shared Static Runtime Natural Actions

## Objective

Move static runtime natural action rule selection out of
`src/shared/xenesisNaturalLanguageActionResolvers.ts` and into named helpers in
`src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.

## Changes

- Added catalog-owned helpers for:
  - local CLI/MCP support actions
  - gateway actions
  - runtime inventory actions
  - profile inventory actions
  - runtime control actions
- Updated the natural resolver to call the named catalog helpers instead of
  importing static runtime rule arrays or `findXenesisNaturalCatalogRuleAction`.
- Added source-ownership guards and direct helper behavior checks in
  `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`.

## Verification

- RED focused test failed 53/55 as expected before helper exports existed.
- GREEN focused test passed 55/55 after moving static runtime action selection
  into the shared catalog helpers.
- Focused Biome write passed and fixed two files.
- Post-format focused test passed 55/55.
- Natural routing fixture passed 6/6.
- `npm run typecheck` passed.
- Focused Biome check passed.
- Source guard found no direct static runtime rule imports or generic catalog
  rule-action helper usage in the resolver.
- `npm run docs:capabilities:audit` passed; audit counters remained all 0.
- `npm run build` passed with existing Vite warnings only.
- `npm run smoke:xenesis:natural-desk-routing` passed 261/261.

## Notes

The resolver still owns text extraction for quoted Agent/run/workspace prompts.
Static runtime CR action selection is now catalog-owned and covered by source
guards.
