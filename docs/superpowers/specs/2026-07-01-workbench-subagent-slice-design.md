# Workbench Subagent Slice Design

## Priority

Order 6 in the non-package parity roadmap. This slice is intentionally last
because the sibling implementation is still active and not treated as stable
input yet.

## Goal

After sibling stabilization, port Workbench-level subagent support into the
already ported XCON Agent Workbench. This adds subagent profiles, terminal worker
attachment, assignment envelopes, dispatch, result parsing, and result
collection.

## Source Surface

Sibling files to evaluate and adapt after stabilization:

- `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/XconAgentWorkbenchPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchModel.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchModel.test.ts`
- Related sibling commits:
  - `feat: add workbench subagent profiles`
  - `feat: add workbench subagent worker model`
  - `feat: add workbench subagent protocol`
  - `feat: attach workbench terminal workers`
  - `feat: dispatch workbench subagent assignments`
  - `feat: collect workbench subagent results`
  - `test: guard workbench subagent metadata`

## Readiness Gate

Do not start implementation until:

- The sibling Workbench subagent series stops changing materially, or the user
  explicitly approves taking the current sibling state.
- The exact source commit range is recorded in `handoff.md`.
- Existing Workbench tests in this repo are green before porting.

## Architecture

The slice stays renderer-focused and uses existing terminal CR paths rather than
adding provider runtime behavior. Profiles describe worker roles, permissions,
preferred CLI kinds, and result schema. Attached terminals become visible
workers with explicit state. Assignments are sent as text envelopes with a
required fenced `xenesis-subagent-result` JSON block.

The Workbench owns:

- Profile loading and merging.
- Worker attach/detach/status.
- Assignment plan creation.
- Assignment dispatch to terminal input.
- Tail/result parsing.
- Result summaries in the Workbench UI.

## Data Flow

1. User attaches one or more visible terminal sessions as workers.
2. Workbench selects a profile for each worker.
3. User prompt is converted into bounded assignment envelopes.
4. Workbench dispatches envelopes to terminal sessions.
5. Worker output is tailed or pasted back into the Workbench.
6. Result blocks are parsed and reflected in worker state and summaries.

## Error Handling

- Invalid profile JSON records produce diagnostics and fall back to built-ins.
- Missing terminals remain detached rather than crashing the pane.
- Invalid result JSON becomes a failed worker result with a visible error.
- Any write or risky action requested by a worker remains a request in
  `requiresApproval`; Workbench does not execute it automatically.

## Tests

Focused tests:

- Subagent profile normalization and merging.
- Worker attach/detach/status transitions.
- Assignment envelope creation.
- Result block parsing.
- Workbench model tests for response preservation and subagent metadata guards.

Broader gates:

- `npm test`
- `npm run typecheck`
- Electron smoke after stabilization, ideally attaching a fake terminal worker
  and collecting a result block.

## Non-Goals

- Do not change `packages/xenesis`.
- Do not add hidden background workers.
- Do not implement provider-backed subagent runtime inside this repo slice.
