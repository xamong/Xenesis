# Shared Runtime Dynamic Natural Actions

Date: 2026-06-29

## Objective

Move dynamic runtime natural action argument assembly out of
`src/shared/xenesisNaturalLanguageActionResolvers.ts` and into shared capability
catalog helpers.

## Changes

- Added shared helper functions in
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`:
  - `findXenesisNaturalAgentReadbackAction`
  - `findXenesisNaturalAgentSubmitAction`
  - `findXenesisNaturalRunStartAction`
  - `findXenesisNaturalWorkspaceSetAction`
- Updated `src/shared/xenesisNaturalLanguageActionResolvers.ts` so it only
  extracts quoted text or local paths for these dynamic runtime requests, then
  delegates CR action construction to the shared catalog.
- Updated source-ownership tests in
  `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  to block resolver imports of the dynamic runtime rule sets and
  `XENESIS_NATURAL_DESK_ACTION_ARGS`.

## Verification

- RED focused test failed 51/53 before implementation because the helper
  exports did not exist and resolver still owned the dynamic action assembly.
- GREEN focused test passed 53/53 after implementation.
- `npx biome check --write --formatter-enabled=true --linter-enabled=true --assist-enabled=true src/shared/xenesisNaturalLanguageCapabilityCatalog.ts src/shared/xenesisNaturalLanguageActionResolvers.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  passed and fixed two files.
- Post-format focused test passed 53/53.
- `npm run typecheck` passed.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- Focused Biome check passed with no fixes.
- `npm run docs:capabilities:audit` passed; audit counters remained 0 for
  missing registered paths, missing dispatched coverage paths, undispatched
  static callable methods, and dispatcher paths missing from tree.
- `npm run build` passed with existing Vite warnings.
- `npm run smoke:xenesis:natural-desk-routing` passed 261/261.

## Notes

- The Agent status helper test uses this repo's actual runtime descriptor path:
  `xd.xenesis.agents.status`.
- The natural resolver still owns prompt text extraction for these paths; CR
  descriptor and args construction are catalog-owned.
