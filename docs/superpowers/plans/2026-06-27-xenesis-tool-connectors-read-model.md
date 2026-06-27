# Xenesis Tool Connectors Read Model

## Goal

Add a CR-first, read-only connector readiness model for external tools in the
Xenesis Connection Center. The model must expose connector type, auth mode,
runtime support, credential state, scopes, diagnostics, and safety boundaries
without returning raw secrets or pretending planned Google OAuth connectors are
installed.

## Scope

- Add `toolConnector` metadata to Fetch, Filesystem, GitHub, Notion, Linear,
  Google Workspace, and Google Calendar tool cards.
- Add a read-only CR path: `xd.xenesis.tools.connectors.status`.
- Render connector readiness in Settings > Xenesis Agent > Connections with a
  stable DOM marker for live smoke.
- Update the onboarding guide and repo-local Obsidian working note.

## Non-Goals

- Do not install MCP servers.
- Do not run OAuth or store OAuth tokens.
- Do not add write actions for external tools.
- Do not expose raw environment variable values or token material.

## Tests

1. RED: shared connection status exposes expected connector metadata for Notion
   and planned Google Calendar.
2. RED: CR capability registration/dispatch exists for
   `xd.xenesis.tools.connectors.status`.
3. RED: renderer helper summarizes connector type/auth/runtime support.
4. GREEN: implement metadata, CR adapter wiring, Settings rendering, docs, and
   live smoke coverage.

## Verification

- Focused tests:
  `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
- Scoped Biome on touched core files.
- `npm run typecheck`
- `npm run docs:capabilities:audit`
- `npm run build`
- `npm run check:public-release` (expected known gap if `.github/workflows/ci.yml`
  is still absent)
- Live Electron smoke:
  direct connector status, Settings marker, and Agent-pane CR prompt.
