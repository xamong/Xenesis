---
type: working-note
date: 2026-06-28
scope: xenesis-natural-routing
status: implemented
---

# Target Natural Routing Surface Specs

## Objective

Remove duplicated target-specific natural-language routing tables for provider
and connection open/status prompts while keeping the routing deterministic and
CR-first.

## Implemented

- Added provider target surface specs in
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
- Added connection target surface specs for diagnostics, setup requests, tool
  setup/OAuth/MCP/action-policy/install/user-story/view surfaces, channel
  setup/routing/safety/access/pairing/user-story/profile surfaces, messenger
  views, and connection-card fallback.
- Generated provider and connection target open/status descriptors and rules
  from the shared specs.
- Preserved existing CR paths, action ids, reasons, args kind, fallback
  behavior, required context groups, and rule priority.
- Added regression coverage in
  `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  that rejects returning to the old hand-listed descriptor object shapes.

## Verification

- RED:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed 1/40 before implementation because the target surface spec exports did
  not exist.
- `npm run typecheck` passed.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 40/40.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- `npm run smoke:xenesis:natural-desk-routing` passed 180/180.
- `npx biome check src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  checked 2 files with no fixes applied.
- `npm run docs:capabilities:audit` passed: 779 nodes, 689 coverage path
  references, and all missing/undispatched counts at 0.
- `git diff --check` exited 0 with LF/CRLF normalization warnings only.

## Boundary

This does not make natural-language behavior model reasoning. It keeps
deterministic routing, but moves target-specific duplication into data specs so
future connection/provider surfaces are added in one place.

## Next

Apply/review request descriptors and rules are still hand-listed. The next
larger slice should derive those from shared action request specs.

## Links

- [[00_System/AI Agent Rules]]
- [[00_System/Graph Schema]]
- [[10_Repo Map/Source of Truth Map]]
- [[80_AI/Working Notes/2026-06-28-natural-routing-surface-specs]]
