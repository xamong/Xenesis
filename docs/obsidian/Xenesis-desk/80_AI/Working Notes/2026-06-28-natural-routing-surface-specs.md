---
type: working-note
date: 2026-06-28
scope: xenesis-natural-routing
status: implemented
---

# Natural Routing Surface Specs

## Objective

Reduce repeated hardcoded aggregate natural-language routing descriptors for
the Xenesis Connection Center.

## Implemented

- Added shared aggregate surface specs in
  [[10_Repo Map/Source of Truth Map]] code path:
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
- Generated aggregate open/status descriptors and rules for:
  - connection catalog surfaces
  - external tool catalog surfaces
  - external messenger catalog surfaces
  - AI provider catalog surfaces
- Preserved existing CR paths, reasons, fallback behavior, and route priority.
- Added regression coverage in
  `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`.

## Verification

- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 39/39 after implementation and formatting.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- `npm run typecheck` passed.
- `npm run smoke:xenesis:natural-desk-routing` passed 180/180.

## Boundary

This does not remove deterministic routing. It makes the deterministic routing
source more explicit and data-driven. Natural-language behavior must still be
reported as verified deterministic routing, not model reasoning.

## Links

- [[00_System/AI Agent Rules]]
- [[00_System/Graph Schema]]
- [[10_Repo Map/Repo Overview]]
- [[80_AI/Working Notes/2026-06-28-provider-setup-plan]]
