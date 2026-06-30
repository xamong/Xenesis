# 2026-06-29 Tool Profile Drafts

## Intent

Add a CR-first external tool profile draft surface to close the gap between
provider/channel profile drafts and external tool connection setup.

## Scope

- Tools: Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, Google
  Calendar, and any existing `XENESIS_CONNECTION_TOOL_IDS`.
- CR paths:
  - `xd.xenesis.tools.profileDrafts.status`
  - `xd.xenesis.tools.profileDrafts.open`
  - `xd.xenesis.tools.profileDrafts.request`
- Connection Center focus: `tool-profile-draft`.

## Safety Boundary

Review-only. No apply path in this slice. Do not install MCP servers, write MCP
config, complete OAuth, store tokens, store credentials, execute provider tools,
mutate settings, send email, mutate documents, or mutate calendar events.

## Source Links

- Shared model: `src/shared/xenesisConnections.ts`
- CR registry and dispatcher: `src/shared/deskBridgeCapabilities.ts`
- Main adapter: `src/main/index.ts`
- Renderer helpers: `src/renderer/panes/xenesisConnectionCenter.ts`
- Settings UI: `src/renderer/panes/SettingsPane.tsx`

## Verification Plan

Use TDD:

- RED shared model test.
- RED CR capability dispatch test.
- RED renderer formatter/request/focus test.
- Then focused tests, typechecks, CR audit, builds, and diff whitespace.

## Implemented

- Removed remaining `naturalWords` and `XENESIS_CONNECTION_NATURAL_*` metadata
  from connection/settings catalog surfaces; natural-language aliases are now
  guarded out by tests.
- Added review-only `toolProfileDraft` templates for external tool connection
  items, derived from connector/OAuth/runtime/install metadata.
- Registered `xd.xenesis.tools.profileDrafts.status/open/request` in the CR
  registry and main adapter.
- Added Connection Center focus/formatter/request builder, Settings UI panel,
  i18n labels, and live snapshot coverage for
  `data-xenesis-tool-profile-draft`.

## Verification Result

- `npx tsx --test src\shared\xenesisConnections.test.ts` -> 44/44 passed.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` -> 45/45
  passed.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` -> 71/71
  passed.
- `npx tsx --test src\renderer\panes\settingsCatalog.test.mjs` -> 2/2 passed.
- `npm run typecheck` -> passed.
- `npm --prefix packages/xenesis run typecheck` -> passed.
- `npm run docs:capabilities:audit` -> passed; CR audit counters all 0.
- `npm run build` -> passed with existing Vite warnings.
- `npm run smoke:xenesis:connection-center` -> passed 9/9, including
  `tool-profile-review-steps`.
- `npm run smoke:xenesis:review-request-approval` -> passed 6/6.
- `git diff --check` -> passed, with line-ending warnings only.
