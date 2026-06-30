# Remove Remaining Runtime Heuristics

## Objective

Remove deterministic keyword/regex/score-based prompt classification that still
routes ordinary user text before provider reasoning.

## Non-goals

- Do not remove explicit `xenesis-desk-action` protocol block execution.
- Do not remove explicit CLI/UI mode selection.
- Do not remove explicit `/xd` or typed CR handling where the user provides a
  literal control command.
- Do not add replacement natural-language catalogs, aliases, or keyword maps.

## Current Heuristic Surfaces

- `packages/xenesis/src/core/intentRouter.ts`
  - Selects `debug`, `work`, `plan`, `research`, approval mode, and reason from
    prompt words and regex.
- `packages/xenesis/src/workflows/xenisPolicy.ts`
  - Selects workflow policy/tool priority/system prompt from prompt words and
    regex.
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentControlScenarios.ts`
  - Scores scenario matches from aliases/capability words and emits executable
    action-block guidance.

## RED Tests

1. `intentRouter` should only honor explicit mode. Without explicit mode, varied
   prompt content must return default intent with no mode or approval override.
2. `xenisPolicy` should return one general policy for ordinary prompt text,
   without keyword-based specialized policy selection.
3. Renderer guard should assert scenario prompt matching helpers/files are
   absent from the Agent control surface.

## Implementation Plan

1. Replace `classifyPromptIntent` with explicit-mode-only logic.
2. Replace `resolveXenisTaskPolicy` with a single general CR-first policy, or an
   explicit-command-only branch if an existing caller needs it.
3. Delete the unused scenario matcher and its tests.
4. Update tests and source guards to block reintroduction of natural/keyword
   routing helpers.

## Verification

- Focused tests:
  - `npm --prefix packages/xenesis exec vitest run src/core/intentRouter.test.ts`
  - `npm --prefix packages/xenesis exec vitest run src/workflows/xenisPolicy.test.ts`
  - `npx tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- Broader gates:
  - `npm --prefix packages/xenesis run typecheck`
  - `npm run typecheck`
  - `npm --prefix packages/xenesis test`
  - `npm run docs:capabilities:audit`

## Result

- `intentRouter.ts` now honors only explicit mode; ordinary prompt text returns
  the default route.
- `xenisPolicy.ts` now uses one general Desk orchestration policy for ordinary
  prompts. Literal `/xd` and leading `xd.*` remain explicit command handling.
- The unused scenario prompt matcher and tests were deleted.
- Focused tests, root/package typechecks, package tests, CR audit/counters,
  provider smokes, live approval smoke, package build, root build, focused lint,
  and diff whitespace passed.
- `npm run lint` still fails on the existing repository-wide Biome backlog
  outside this change.
- `npm run check:public-release` exits before checks because
  `.github/workflows/ci.yml` is not tracked in this repo/worktree.
