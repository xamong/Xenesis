---
type: agent-handoff
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
depends_on:
  - "[[Provider Model]]"
  - "[[module-provider-runtime]]"
  - "[[module-capability-registry]]"
---

# Provider Desk Natural Intent Catalog Removal

## Objective

Remove the remaining provider-package deterministic Desk natural intent catalog
after the renderer/shared natural Desk router was deleted. Provider runs should
use the lean MCP/CR system-message contract, discover capability paths with the
configured Desk MCP tools, inspect schemas on demand, and call the generic CR
caller.

## Change

- Deleted `packages/xenesis/src/providers/deskNaturalIntentCatalog.ts`.
- Removed `export * from "./deskNaturalIntentCatalog.js";` from
  `packages/xenesis/src/providers/index.ts`.
- Added a guard test in
  `packages/xenesis/src/providers/cliProvider.deskMcp.test.ts` so the file and
  barrel export cannot come back silently.

## Verification

- RED: focused provider test failed while the catalog file existed.
- GREEN: focused provider test passed after file/export deletion.
- Package tests passed: 367/367 across 79 files.
- Package build passed.
- Package and root typecheck passed.
- CR audit passed with all gap counters at 0.
- Source scan found no remaining provider/source references outside the guard
  test.

## Known Gaps

- This does not prove a live selected provider calls CR/MCP tools for a natural
  Desk-control prompt. That remains a separate live Agent-pane smoke.
- `provider:smoke` default is blocked without `OPENAI_API_KEY`; mock provider
  smoke reaches gateway but fails `/run` with `Unauthorized`, indicating the
  smoke client needs to authenticate when the gateway auto-generates a bearer
  token.

## Graph Links

- Depends on [[Provider Model]]
- Depends on [[module-provider-runtime]]
- Depends on [[module-capability-registry]]
