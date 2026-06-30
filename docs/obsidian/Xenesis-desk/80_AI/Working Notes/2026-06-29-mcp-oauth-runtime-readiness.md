---
type: working-note
date: 2026-06-29
scope: xenesis-desk
tags:
  - xenesis
  - capability-registry
  - connection-center
  - mcp
  - oauth
---

# MCP OAuth Runtime Readiness

## Objective

Expose OAuth-capable recommended MCP tools as a Desk-native, CR-first readiness
surface without starting OAuth, storing tokens, writing MCP config, or executing
provider tools.

## Result

- Added `toolMcpOAuth` to the Connection Center shared read model.
- Added CR paths:
  - `xd.xenesis.tools.mcpOAuth.status`
  - `xd.xenesis.tools.mcpOAuth.open`
  - `xd.xenesis.tools.mcpOAuth.request`
- Added renderer support for the `tool-mcp-oauth` detail focus and
  `mcp-oauth` tool view section.
- Added Settings Connection Center rendering for MCP OAuth readiness details.
- Added natural routing for Linear MCP OAuth status, open, and review-request
  prompts.
- Added smoke inventory cases for the new natural prompts.

## Source Links

- `src/shared/xenesisConnections.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/main/index.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`
- `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`
- `docs/manual/11-external-tool-integrations.md`

## Safety Boundary

This is review and navigation only. It does not complete OAuth, start an OAuth
browser flow, create OAuth clients, store tokens, return credential values,
write MCP config, execute provider tools, mutate Linear, or mutate any external
system.

## Verification

Focused verification passed before broad verification:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

Broad verification is recorded in root `handoff.md` for this slice.
