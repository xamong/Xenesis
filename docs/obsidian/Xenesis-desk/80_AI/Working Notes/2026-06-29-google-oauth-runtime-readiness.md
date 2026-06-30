# 2026-06-29 Google OAuth Runtime Readiness

## Objective

Make planned Google Workspace and Google Calendar OAuth runtime readiness a
first-class Connection Center and Capability Registry surface without making
OAuth executable.

## Added Surface

- Shared read model: `toolOAuthRuntime`
- Detail focus: `tool-oauth-runtime`
- Tool view section: `oauth-runtime`
- CR paths:
  - `xd.xenesis.tools.oauthRuntime.status`
  - `xd.xenesis.tools.oauthRuntime.open`
  - `xd.xenesis.tools.oauthRuntime.request`
- Action Inbox kind: `xenesis-tool-oauth-runtime`

## Runtime Readiness Fields

- Callback policy and callback URI candidates
- Token-store owner and token-store readiness
- Credential references by name only
- Runtime readback checks
- CR read/control paths
- Diagnostics
- Blocked actions
- Safety boundaries

## Safety Boundary

This surface is review-only. It does not start OAuth, host callback servers,
store tokens, write MCP config, execute provider tools, send email, mutate
documents, mutate calendar events, or bypass approvals.

Generic `OAuth 상태` and `OAuth 검토` prompts remain routed to OAuth draft
surfaces. Prompts that include `OAuth runtime` or `OAuth 런타임` route to the
runtime readiness CR paths.

## Verification

- RED before implementation:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - 191 tests executed, 180 passed, 11 failed as expected.
- GREEN after implementation:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - 46/46 passed.
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - 191/191 passed.
- Final broad checks:
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed: 788 nodes, 689 coverage path
    references.
  - CR audit gap counters: missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, dispatcher paths
    missing from tree 0.
  - `npm run build` passed with existing non-blocking Vite warnings.
  - `npm run smoke:xenesis:natural-desk-routing` passed 237/237, including the
    Google OAuth runtime status/open/request cases.
  - Formatter-only Biome check passed after scoped formatting. Full
    changed-file Biome lint still reports pre-existing unrelated debt in
    `src/main/index.ts` and `src/shared/deskBridgeCapabilities.ts`.
  - `git diff --check` passed with LF/CRLF normalization warnings only.
  - `npm run check:public-release` remains blocked by missing
    `.github/workflows/ci.yml`.

## Next Step

Commit the Google OAuth runtime readiness slice, then continue with the next
Connection Center/OpenClaw/Hermes gap slice.
