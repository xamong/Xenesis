---
type: working-note
date: 2026-06-28
scope: xenesis-natural-routing
status: implemented
---

# Action Request Natural Routing Specs

## Objective

Remove duplicated approval-style natural-language routing tables for provider
and connection-target request/apply/test actions while preserving existing CR
behavior.

## Implemented

- Added `XENESIS_NATURAL_PROVIDER_ACTION_REQUEST_SPECS` for provider profile
  draft review request and apply actions.
- Added `XENESIS_NATURAL_CONNECTION_TARGET_ACTION_REQUEST_SPECS` for:
  - tool install plan review requests
  - MCP install draft review/apply
  - OAuth draft review
  - tool action policy review
  - channel profile draft review/apply
  - channel test-send
  - connection setup request/apply
- Generated descriptor maps and rule arrays from the specs while keeping the
  existing exported constant names as compatibility aliases.
- Preserved existing CR paths, action ids, reasons, args kind, fallback
  behavior, required context groups, and rule priority.
- Added regression coverage in
  `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  that rejects the old hand-listed descriptor object shapes.

## Verification

- RED:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed 1/41 before implementation because the action request spec exports did
  not exist.
- Final `npm run typecheck` passed.
- Final
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 41/41.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- `npm run smoke:xenesis:natural-desk-routing` passed 180/180.
- `npx biome check src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  checked 2 files with no fixes applied.
- `npm run docs:capabilities:audit` passed: 779 nodes, 689 coverage path
  references, and all missing/undispatched counts at 0.

## Boundary

This is still deterministic natural-language routing. The change removes
duplicated routing data; it does not convert routing into model reasoning.

## Links

- [[00_System/AI Agent Rules]]
- [[00_System/Graph Schema]]
- [[10_Repo Map/Source of Truth Map]]
- [[80_AI/Working Notes/2026-06-28-target-natural-routing-surface-specs]]
