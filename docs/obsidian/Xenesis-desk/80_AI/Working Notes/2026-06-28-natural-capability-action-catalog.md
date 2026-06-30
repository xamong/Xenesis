---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-28
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
touches:
  - "src/shared/xenesisNaturalLanguageCapabilityCatalog.ts"
  - "src/shared/xenesisNaturalLanguageCatalog.ts"
  - "src/shared/xenesisNaturalLanguageActionResolvers.ts"
  - "src/shared/xenesisNaturalLanguagePlanResolvers.ts"
  - "src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts"
---

# Natural Capability Action Catalog Slice

## Objective

Continue the hardcoding cleanup by separating natural-language CR action
inventory from the broad natural-language text catalog.

## Ownership Boundary

- `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts` owns CR action args,
  CR path descriptors, action-rule tables, and action-builder/rule lookup
  helpers.
- `src/shared/xenesisNaturalLanguageCatalog.ts` remains the source for protocol
  parsing, text normalization, predicates, and target metadata.
- `src/shared/xenesisNaturalLanguageActionResolvers.ts` and
  `src/shared/xenesisNaturalLanguagePlanResolvers.ts` import capability action
  inventory from the capability catalog.
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
  remains a facade/shared re-export surface.

## Scope Boundary

- Source ownership refactor only.
- Preserve route order, CR paths, args, visible text, approval state, and action
  reasons.
- Do not change CR schemas, dispatchers, provider runtime selection, settings
  writes, OAuth/MCP execution, messenger delivery, Action Inbox semantics, or
  capability behavior.

## Verification

- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed with 38/38.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed with 74/74.
- `npm run typecheck` passed.
- `npm run build` passed with existing Vite warnings only.
- `npm run smoke:xenesis:natural-desk-routing` passed with 144/144.
- `git diff --check` passed with LF-to-CRLF working-copy warnings only.
