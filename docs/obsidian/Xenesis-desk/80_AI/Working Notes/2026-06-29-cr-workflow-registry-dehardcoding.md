# 2026-06-29 CR Workflow Registry De-hardcoding

## Objective

Remove the standalone hardcoded CR workflow default path registry from
`src/shared/deskBridgeWorkflow.ts`.

## Result

- `src/shared/deskBridgeCapabilities.ts` exports
  `buildDeskBridgeWorkflowRegistry`.
- Workflow preview/run tests now pass that Capability Registry-derived registry
  explicitly.
- `src/shared/deskBridgeWorkflow.ts` no longer maintains a `defaultRegistry`
  list of individual `xd.*` paths.
- Workflow safety still rejects recursive workflow paths plus `write` and
  `danger` permission steps.

## Safety Boundary

This is a registry ownership refactor only. It does not add CR paths, execute
workflows, relax workflow approval, allow write/danger steps, or bypass
Capability Registry dispatch.

## Verification

- RED:
  `npx tsx --test src\shared\deskBridgeWorkflow.test.ts` failed because
  `buildDeskBridgeWorkflowRegistry` was not exported and `defaultRegistry`
  still existed.
- GREEN:
  `npx tsx --test src\shared\deskBridgeWorkflow.test.ts` passed 9/9.
- Focused Biome:
  changed workflow files exit 0 after formatting; it still reports two
  existing warnings in `src/shared/deskBridgeCapabilities.ts`.
- Typecheck:
  `npm run typecheck` passed.
- CR audit:
  `npm run docs:capabilities:audit` passed; gap counters are all 0.
- Diff hygiene:
  `git diff --check` passed with LF/CRLF normalization warnings only.

## Next

Review final diff/status and commit the slice.
