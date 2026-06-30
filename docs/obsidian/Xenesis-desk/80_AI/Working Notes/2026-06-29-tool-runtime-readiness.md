# 2026-06-29 Tool Runtime Readiness

## Objective

Add a CR-first generic external tool runtime readiness surface before provider
tool execution. This complements the OAuth-specific runtime readiness surface
with a shared model for Fetch, Filesystem, GitHub, Notion, Linear, Google
Workspace, and Google Calendar.

## Scope

- Shared model: `toolRuntime` on external tool connection cards.
- CR paths:
  - `xd.xenesis.tools.runtime.status`
  - `xd.xenesis.tools.runtime.open`
  - `xd.xenesis.tools.runtime.request`
- Renderer focus: `tool-runtime` / `data-xenesis-tool-runtime`.
- Natural prompts:
  - `노션 tool runtime 상태 보여줘`
  - `깃허브 tool runtime 열어줘`
  - `구글 캘린더 tool runtime 검토 요청해줘`

## Safety Boundary

The runtime readiness surface is review-only. It does not execute provider
tools, install MCP servers, write MCP config, store credentials, complete
OAuth, store tokens, or mutate external systems.

## Source Links

- Shared model: `src/shared/xenesisConnections.ts`
- CR registry and dispatcher: `src/shared/deskBridgeCapabilities.ts`
- Main adapter: `src/main/index.ts`
- Renderer helpers: `src/renderer/panes/xenesisConnectionCenter.ts`
- Settings UI: `src/renderer/panes/SettingsPane.tsx`
- Natural routing: `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`
- Manual docs: `docs/manual/09-onboarding-connections.md`,
  `docs/manual/11-external-tool-integrations.md`

## Verification

Focused contract tests passed:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Result: 197 tests, 197 passed.

Broader gates passed:

- `npm run typecheck`
- `npm run docs:capabilities:audit`
- CR audit gap readback: missing registered paths 0, missing dispatched
  coverage paths 0, undispatched static callable methods 0, dispatcher paths
  missing from tree 0
- `npm run build`
- `npm run smoke:xenesis:natural-desk-routing` after build: 255/255 passed
- Focused changed-file Biome check: exit 0
- `git diff --check`

Known blocked gates:

- `npm run check:public-release` fails because this worktree is missing
  `.github/workflows/ci.yml`.
- Full `npm run lint` still reports repo-wide existing formatting/lint debt;
  focused changed-file Biome exits 0.

## Next

Review final diff/status and commit the slice.
