# Shared Provider And Target Natural Rule Wrappers

Date: 2026-06-29

## Objective

Move provider and connection-target natural action rule selection out of
`src/shared/xenesisNaturalLanguageActionResolvers.ts` and into named shared
capability catalog wrapper helpers.

## Changes

- Added shared provider helpers in
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`:
  - `findXenesisNaturalProviderStatusAction`
  - `findXenesisNaturalProviderOpenAction`
  - `findXenesisNaturalReviewRequestProviderAction`
  - `findXenesisNaturalProviderProfileDraftApplyAction`
- Added shared connection-target helpers:
  - `findXenesisNaturalConnectionTargetStatusAction`
  - `findXenesisNaturalConnectionTargetOpenAction`
  - `findXenesisNaturalOAuthSetupPacketAction`
  - `findXenesisNaturalMcpInstallDraftApplyAction`
  - `findXenesisNaturalChannelProfileDraftApplyAction`
  - `findXenesisNaturalChannelTestAction`
  - `findXenesisNaturalConnectionSetupApplyAction`
  - `findXenesisNaturalReviewRequestTargetAction`
- Updated `src/shared/xenesisNaturalLanguageActionResolvers.ts` so provider and
  connection target routes delegate action construction to the shared helpers.
- Updated source-ownership tests to block resolver imports of the provider/
  connection-target rule sets and the generic provider/target rule-action
  helpers.

## Verification

- RED focused test failed 52/54 before implementation because the helper
  exports did not exist and resolver still imported the rule sets directly.
- GREEN focused test passed 54/54 after implementation.
- `npx biome check --write --formatter-enabled=true --linter-enabled=true --assist-enabled=true src/shared/xenesisNaturalLanguageCapabilityCatalog.ts src/shared/xenesisNaturalLanguageActionResolvers.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  passed and fixed two files.
- Post-format focused test passed 54/54.
- `npm run typecheck` passed.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- Focused Biome check passed with no fixes.
- `npm run docs:capabilities:audit` passed; audit counters remained 0 for
  missing registered paths, missing dispatched coverage paths, undispatched
  static callable methods, and dispatcher paths missing from tree.
- `npm run build` passed with existing Vite warnings.
- `npm run smoke:xenesis:natural-desk-routing` passed 261/261.

## Notes

- Resolver still owns intent gates and target discovery. The shared catalog now
  owns CR action selection and argument construction for provider and
  connection-target rule groups.
- Helper unit tests use normalized values for English fragments such as `mcp`
  and `oauth`, matching the value shape the natural resolver passes.
