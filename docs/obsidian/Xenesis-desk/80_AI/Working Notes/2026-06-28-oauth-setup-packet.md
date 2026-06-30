---
type: working-note
date: 2026-06-28
scope: xenesis-desk
tags:
  - xenesis
  - capability-registry
  - connection-center
  - oauth
---

# OAuth Setup Packet Slice

## Objective

Expose a review-only OAuth setup packet for planned Google Workspace and Google
Calendar tool connections so the Agent can inspect app registration, redirect
URI policy, credential refs, scopes, token-store readiness, and safety
boundaries through the Capability Registry.

## Result

- Added `toolOAuthDraft.setupPacket` to the Connection Center read model.
- Added read-only CR path `xd.xenesis.tools.oauthDrafts.setupPacket`.
- Wired main-process handler and adapter dispatch.
- Added Settings/Connection Center display and a read helper button.
- Routed `구글 캘린더 OAuth 설정 패킷 보여줘` to the setup-packet read path before
  generic open/show handling.
- Added live smoke inventory coverage for `google-calendar-oauth-setup-packet`.

## Safety Boundary

This remains review-only. It does not complete OAuth, start an OAuth callback
server, store tokens, return OAuth client secrets, write MCP config, execute
Google provider tools, send email, mutate documents, or mutate calendar events.

## Verification

- Focused tests passed:
  - `src/shared/xenesisConnections.test.ts` 37/37
  - `src/shared/xenesisConnectionCapabilities.test.ts` 37/37
  - `src/renderer/panes/xenesisConnectionCenter.test.ts` 46/46
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts` 38/38
  - `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs` 5/5
- Broad checks passed:
  - `npm run typecheck`
  - `npm run docs:capabilities:audit` with 770 nodes and no CR gaps
  - `npm run build`
  - `npm --prefix packages/xenesis test`
  - `npm --prefix packages/xenesis run typecheck`
  - `npm --prefix packages/xenesis run build`
  - `npm run smoke:xenesis:natural-desk-routing` 162/162
  - `git diff --check`

## Known Gaps

- Repo-wide `npm run lint` still fails on existing Biome/CRLF and legacy lint
  issues.
- `provider:smoke` still needs `OPENAI_API_KEY`.
- `check:public-release` still needs `.github/workflows/ci.yml` in this
  workspace.
