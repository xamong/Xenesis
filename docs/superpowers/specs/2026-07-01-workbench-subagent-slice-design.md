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

Current run readiness:

- User explicitly approved taking the current sibling state on 2026-07-01.
- Sibling source commit range inspected for this slice:
  `d5dadef feat: add workbench subagent profiles` through
  `676baf1 Recover Workbench subagent results from scrollback`.
- `packages/xenesis` remains excluded. Any sibling behavior that requires
  package runtime changes is treated as out of scope.

## Architecture

The slice stays centered on the renderer Workbench and terminal bridge. It does
not add provider runtime behavior. Profiles describe worker roles, permissions,
preferred CLI kinds, and result schema. Attached terminals become visible
workers with explicit state. Assignments are persisted to Xenesis home task
files when the filesystem bridge is available, then a short terminal instruction
points the worker to that file. The fallback is direct terminal envelope input.
Workers return a required fenced `xenesis-subagent-result` JSON block.

CR-first control is included through `xd.workbench.subagents.*` paths. Those
paths dispatch to main-process bridge code, which sends a request to the
renderer Workbench pane and waits for a sanitized result. This makes subagent
state and control discoverable through the Capability Registry without adding a
hidden background subagent runtime.

The Workbench owns:

- Profile loading and merging.
- Worker attach/detach/status.
- Managed local CLI terminal spawning for installed `codex`, `claude`, and
  `gemini` CLI agents.
- Assignment plan creation.
- Assignment dispatch through file-backed transport when possible.
- Tail/result parsing.
- Approval decision envelopes sent back to worker terminals.
- Result summaries in the Workbench UI.

## Data Flow

1. User attaches one or more visible terminal sessions as workers.
2. Workbench selects a profile for each worker.
3. User prompt is converted into bounded assignment envelopes.
4. Workbench writes each assignment envelope under
   `<XENIS_HOME>/xenesis/subagents/tasks` when possible.
5. Workbench dispatches a short instruction to each terminal session.
6. Worker output is streamed or recovered from terminal scrollback.
7. Result blocks are parsed and reflected in worker state and summaries.
8. CR callers can read status, attach/start workers, plan, dispatch, stop, and
   resolve worker approval requests through `xd.workbench.subagents.*`.

## Error Handling

- Invalid profile JSON records produce diagnostics and fall back to built-ins.
- Missing terminals remain detached rather than crashing the pane.
- Invalid result JSON becomes a failed worker result with a visible error.
- Any write or risky action requested by a worker remains a request in
  `requiresApproval`; Workbench does not execute it automatically.
- Missing renderer, terminal, or filesystem bridge APIs return explicit error
  results rather than silently falling back to hidden behavior.
- Managed worker terminal exits mark the worker failed unless it had already
  completed.

## Tests

Focused tests:

- Subagent profile normalization and merging.
- Managed worker spawn plan construction.
- Worker attach/detach/status transitions.
- Assignment envelope creation.
- File-backed assignment transport path and terminal input.
- Result block parsing.
- Scrollback result recovery.
- CR path listing and dispatcher routing to the `workbenchSubagentAction`
  adapter.
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
