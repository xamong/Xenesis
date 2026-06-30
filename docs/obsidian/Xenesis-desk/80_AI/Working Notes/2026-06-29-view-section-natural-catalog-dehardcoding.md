---
type: working-note
date: 2026-06-29
scope: xenesis-desk
tags:
  - xenesis
  - capability-registry
  - connection-center
  - natural-language
---

# View Section Natural Catalog De-hardcoding

## Objective

Make external tool, external messenger, and AI provider view-section natural
targets derive from the Connection Center section definitions instead of
maintaining separate manual target arrays.

## Result

- Added Connection Center view-section definitions for tool, messenger, and
  provider surfaces in `src/shared/xenesisConnections.ts`.
- Each definition owns the section id, display label, natural-language words,
  and Connection Center detail focus.
- Derived section id arrays and detail-focus maps from those definitions.
- Updated the tool, messenger, and provider view-section read model builders to
  use the shared section definitions for labels and focus targets.
- Removed the manual `XENESIS_NATURAL_*_VIEW_SECTION_TARGET_SPECS` arrays from
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
- Added a regression test that compares natural section targets to the shared
  Connection Center definitions and blocks reintroducing manual section target
  arrays.

## Safety Boundary

This is a catalog ownership refactor only. It does not add CR paths, execute
provider tools, complete OAuth, write MCP config, store tokens, mutate provider
profiles, start gateways, or send messages.

## Verification

- RED: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed before the shared definitions existed.
- Focused tests passed:
  - `npx tsx --test src\shared\xenesisConnections.test.ts`
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
  - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
- Broad checks passed:
  - `npm run typecheck`
  - `npm run docs:capabilities:audit`
  - CR audit gap counters: all 0.
  - `npm run build`
  - `npm run smoke:xenesis:natural-desk-routing`
  - Changed-file `npx biome check ... --max-diagnostics 100`
  - `git diff --check`

## Known Gap

`npm run check:public-release` remains blocked before public-release checks
because `.github/workflows/ci.yml` is missing in this worktree.
