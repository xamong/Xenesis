# Tool View Sections - 2026-06-29

## Objective

Make external tool views addressable down to internal Desk sections through the
existing `xd.xenesis.tools.views.status/open` Capability Registry surface.

## Context

- Source files:
  - `src/shared/xenesisConnections.ts`
  - `src/shared/deskBridgeCapabilities.ts`
  - `src/main/index.ts`
  - `src/renderer/panes/SettingsPane.tsx`
  - `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`
  - `src/shared/xenesisNaturalLanguageActionResolvers.ts`
- Tests:
  - `src/shared/xenesisConnections.test.ts`
  - `src/shared/xenesisConnectionCapabilities.test.ts`
  - `src/renderer/panes/xenesisConnectionCenter.test.ts`
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- Smoke inventory:
  - `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`
- No external web browsing was used for this slice.

## Implemented

- Added structured `toolView.viewSections` metadata for external tool cards.
- Section ids:
  - `connection-card`
  - `setup`
  - `connector`
  - `setup-plan`
  - `install-plan`
  - `mcp-template`
  - `oauth-draft`
  - `action-policy`
  - `user-stories`
- `xd.xenesis.tools.views.open` now accepts optional section aliases through
  `section`, `viewSection`, or `toolViewSection`.
- Section opens map to existing Connection Center detail focus values instead
  of introducing a new renderer subsystem.
- Settings renders section summaries and section open args in the Tool view
  detail block.
- Natural-language routing now maps prompts such as:
  - `노션 MCP 템플릿 뷰 열어줘`
  - `구글 캘린더 OAuth draft view 열어줘`
  to `xd.xenesis.tools.views.open` with `{ id, section, ensureVisible: true }`.

## Verification

- RED:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed before
    implementation because `toolView.viewSections` was absent.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    before implementation because the tool-view open schema had no `section`.
  - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
    before implementation because the section formatter was absent.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed before implementation because section prompts routed to older open
    paths or lacked section args.
- Focused GREEN before docs:
  - `src\shared\xenesisConnections.test.ts` -> 41/41 passed.
  - `src\shared\xenesisConnectionCapabilities.test.ts` -> 40/40 passed.
  - `src\renderer\panes\xenesisConnectionCenter.test.ts` -> 55/55 passed.
  - `src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    -> 45/45 passed.
  - `scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` -> 6/6 passed.
- Broad checks:
  - `npm run typecheck` initially failed because section `openArgs.ensureVisible`
    widened from literal `true` to `boolean`; adding an explicit helper return
    type fixed it.
  - `npm run typecheck` -> passed after the type fix.
  - `npm run docs:capabilities:audit` -> passed, CR gap counters all 0.
  - `npm run smoke:xenesis:natural-desk-routing` -> 204/204 passed, including
    the Notion MCP template and Google Calendar OAuth draft section prompts.
  - Changed-file Biome check -> passed with warnings/infos only after safe
    import-order fixes.
  - `git diff --check` -> passed with line-ending normalization warnings only.

## Known Gaps

- `npm run lint` is blocked by existing repo-wide Biome/CRLF and unrelated lint
  debt.
- `npm run check:public-release` cannot run in this worktree because
  `.github/workflows/ci.yml` is absent and not tracked by git.
- Natural-language behavior here is deterministic catalog routing, not model
  reasoning.

## Safety

- Tool-view sections are read/open planning metadata only.
- This slice does not execute provider tools, write MCP config, run package
  managers, complete OAuth, store tokens, mutate external systems, send
  messages, or bypass approval policy.
- Existing approval-gated CR paths remain the only place for ready write/apply
  actions.
