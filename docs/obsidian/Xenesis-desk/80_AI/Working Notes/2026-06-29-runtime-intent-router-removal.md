# Runtime Intent Router Removal

## Objective

Remove the remaining package-level prompt-intent router surface so natural
language is not routed by local keyword, catalog, or heuristic code before the
provider/runtime path.

## Changes

- Deleted `packages/xenesis/src/core/intentRouter.ts`.
- Deleted `packages/xenesis/src/core/intentRouter.test.ts`.
- Added `packages/xenesis/src/core/AgentRunPipeline.noHeuristicRouting.test.ts`
  as a guard that fails if `intentRouter`, `classifyPromptIntent`,
  `intent_route`, `IntentRouteEvent`, `AgentIntent`, `RunReportIntent`, or
  `report.intent` returns to production runtime files.
- Removed `classifyPromptIntent` from `AgentRunPipeline`.
- Removed `intent_route` from runtime events, workflow client filtering, CLI
  rendering, the public runtime contract snapshot, run-report intent summaries,
  trace report summaries, and capability-feedback target-file recommendations.

## Behavior

- Explicit `mode` selection still reaches the runner.
- Workflow-configured mode still reaches the runner.
- No prompt text is passed into a local package intent classifier.
- Desk control remains provider/CR-first through explicit CR discovery and
  explicit `xenesis-desk-action` blocks; ordinary natural language is not parsed
  as a direct Desk action.

## Verification

- RED:
  `npm --prefix packages/xenesis exec vitest run src/core/AgentRunPipeline.noHeuristicRouting.test.ts`
  failed while `src/core/intentRouter.ts` still existed.
- RED:
  The same guard failed after adding `report.intent`, catching the remaining
  gateway trace-summary field.
- GREEN:
  `npm --prefix packages/xenesis exec vitest run src/core/AgentRunPipeline.noHeuristicRouting.test.ts`
  passed.
- GREEN:
  `npm --prefix packages/xenesis exec vitest run src/core/AgentRunPipeline.noHeuristicRouting.test.ts src/core/AgentRunnerBuilder.test.ts src/core/AgentRuntimeFactory.modeMessages.test.ts src/providers/cliProvider.deskMcp.test.ts`
  passed 4 files / 7 tests.
- GREEN:
  `npm --prefix packages/xenesis run typecheck` passed.
- GREEN:
  `npm run typecheck` passed.
- GREEN:
  `npm --prefix packages/xenesis test` passed 81 files / 372 tests.
- GREEN:
  `npm --prefix packages/xenesis run build` passed.
- GREEN:
  `npm run build` passed with existing Vite warnings.
- GREEN:
  New guard test Biome check passed.
- Source scan:
  `rg -n "intent_route|intentRouter|classifyPromptIntent|IntentRouteEvent|AgentIntent|RunReportIntent|report\\.intent" packages/xenesis/src -g "*.ts" -g "!*.test.ts"`
  returned no production matches.

## Known Gap

Scoped Biome over all touched package files still fails due existing package
formatter churn and unrelated lint diagnostics. This slice avoided reformatting
large existing files.
