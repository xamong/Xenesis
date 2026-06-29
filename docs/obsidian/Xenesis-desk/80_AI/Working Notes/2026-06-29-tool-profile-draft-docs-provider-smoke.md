# 2026-06-29 Tool Profile Draft Docs Provider Smoke

## Intent

Align the repo-local manuals and provider Desk MCP smoke with the new external
tool profile draft CR surface.

## Scope

- Manual docs:
  - `docs/manual/11-external-tool-integrations.md`
  - `docs/manual/12-agent-user-stories.md`
- Provider guidance:
  - `packages/xenesis/src/providers/cliProvider.ts`
  - `packages/xenesis/scripts/provider-desk-mcp-prompt-smoke.mjs`
- Guard tests:
  - `src/shared/xenesisConnections.test.ts`
  - `packages/xenesis/tests/s3s4/cliProviderDeskMcp.test.ts`
  - `packages/xenesis/scripts/provider-desk-mcp-prompt-smoke.test.mjs`

## Safety Boundary

No natural-language routing, keyword heuristic, exact-path provider shortcut,
OAuth completion, MCP install, MCP config write, credential/token storage, or
provider tool execution.

## Design Decision

Manual docs may name the exact review-only CR paths:

- `xd.xenesis.tools.profileDrafts.status`
- `xd.xenesis.tools.profileDrafts.open`
- `xd.xenesis.tools.profileDrafts.request`

Provider stdin must not embed these exact paths. The provider system message
only points the runtime at provider setup/profile draft, external tool
setup/profile draft, and messenger channel setup/profile draft capability
families, then requires discovery/inspection through the Desk MCP capabilities
tools before calling the generic CR caller.

## Verification Result

- `npx tsx --test src\shared\xenesisConnections.test.ts` -> 45/45 passed.
- `npm --prefix packages/xenesis test -- tests/s3s4/cliProviderDeskMcp.test.ts`
  -> 1/1 passed.
- `node --test packages\xenesis\scripts\provider-desk-mcp-prompt-smoke.test.mjs`
  -> 1/1 passed.
- `npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke` -> 8/8
  passed with provider `codex-cli`, including no deterministic natural catalog
  and no exact hardcoded tool profile draft CR paths in stdin.
- `npm run typecheck` -> passed.
- `npm --prefix packages/xenesis run typecheck` -> initially failed because
  the new package test import omitted the NodeNext `.js` extension; passed
  after changing the import to `../../src/providers/cliProvider.js`.
- `npm --prefix packages/xenesis test` -> 80 files / 368 tests passed.
- `git diff --check` -> passed with line-ending warnings only.
- `npm run lint` -> failed on existing repo-wide Biome findings outside this
  slice. No unrelated files were auto-fixed.
- Scoped Biome over changed provider smoke/test files -> passed after formatting
  the new additions.
- Manual route-expression scan over docs/manual 11 and 12 -> no matches for
  the old natural-prompt routing section names or route-through wording.
- Provider exact-path scan -> exact `xd.xenesis.tools.profileDrafts.*` strings
  appear only in guard tests/smoke checks, not provider source.
