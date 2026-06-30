---
type: working-note
date: 2026-06-29
scope: xenesis-desk
tags:
  - xenesis
  - capability-registry
  - connection-center
  - oauth
---

# OAuth Setup Packet Open Slice

## Objective

Make planned Google tool OAuth setup packets directly openable and focusable in
the Desk Connection Center through the Capability Registry and natural language.

## Result

- Added the dedicated open path `xd.xenesis.tools.oauthDrafts.setupPacket.open`.
- Added the `oauth-setup-packet` tool view section and
  `tool-oauth-setup-packet` detail focus.
- Added renderer focus data plus an "Open OAuth setup packet" button.
- Routed explicit natural-language open prompts such as
  `google calendar oauth setup packet open` to the setup packet open path.
- Kept the existing read path `xd.xenesis.tools.oauthDrafts.setupPacket`
  unchanged.

## Safety Boundary

This remains read/open navigation only. It does not complete OAuth, start an
OAuth callback server, create OAuth clients, store tokens, return client
secrets, write MCP config, execute Google provider tools, send email, mutate
documents, or mutate calendar events.

## Verification

Focused verification passed before broad verification:

- `npx tsx --test src\shared\xenesisConnections.test.ts`
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

Broad verification is recorded in root `handoff.md` for this slice.
