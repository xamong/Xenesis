# 2026-06-29 Remove Runtime Heuristics

## Intent

User direction: no heuristic natural-language processing. Ordinary language
should reach the configured provider; local code must not use hardcoded
keywords, regexes, aliases, or scoring to decide Desk actions, workflow
policies, or run modes.

## Found Surfaces

- `packages/xenesis/src/core/intentRouter.ts`
  - Prompt keywords/regex set run intent, mode, and readonly approval mode.
- `packages/xenesis/src/workflows/xenisPolicy.ts`
  - Prompt keywords/regex set Xenis workflow policy and priority tools.
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentControlScenarios.ts`
  - Scenario alias/capability scoring emits executable Desk-control prompt hints.

## Decision

Keep explicit behavior only:

- Explicit mode selection may select mode.
- Explicit workflow selection may select the workflow.
- Explicit Desk action protocol blocks may execute through the existing runner.
- Provider-visible CR/MCP tools remain available for the model to reason over.

Do not replace removed heuristics with a smaller catalog.

## Verification Notes

Add guard tests before production edits, then run focused package/renderer tests,
typechecks, package full tests, and CR audit.

## Result

- Removed prompt keyword/regex run-mode inference from
  `packages/xenesis/src/core/intentRouter.ts`; only explicit mode now changes
  mode/intent.
- Removed keyword/regex policy selection from
  `packages/xenesis/src/workflows/xenisPolicy.ts`; ordinary prompts now use the
  general Desk orchestration policy.
- Kept explicit `/xd` and leading `xd.*` command handling.
- Deleted unused `xenesisAgentControlScenarios.ts` and its test.
- Added guard tests covering the no-heuristic contract.

Passed:

- Focused runtime/renderer tests.
- Root and package typechecks.
- `npm --prefix packages/xenesis test`.
- CR audit and zero counter readback.
- Package build, root build, provider Desk MCP prompt smoke, mock provider
  smoke.
- Focused touched-file lint and `git diff --check`.

Known gap:

- Full `npm run lint` still fails on existing repo-wide Biome formatting/style
  backlog unrelated to this slice.
- `npm run check:public-release` cannot run in this repo state because
  `.github/workflows/ci.yml` is not tracked in HEAD; the script exits with
  `ENOENT` before performing checks.
