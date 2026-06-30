# Non-Package Xenesis Desk Parity Roadmap Design

## Objective

Bring over the remaining high-value features from the sibling project at
`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk` into this repo while keeping
`packages/xenesis` completely out of scope.

This document is the master roadmap. Each priority item has a separate slice
design so implementation can proceed one slice at a time with focused tests,
CR audit checks, and PR review.

## Hard Exclusions

- Do not edit, copy into, delete from, or refactor `packages/xenesis`.
- Do not use sibling `packages/xenesis` files as implementation source.
- Do not run broad package rewrites that create incidental `packages/xenesis`
  or package-lock churn.
- Do not wholesale copy generated outputs, `node_modules`, `out`, `release`,
  local SQLite databases, or temporary folders.

The only allowed `packages/xenesis` interaction during these slices is
read-only inspection if a public integration contract must be understood.

## Current Baseline

Already ported or covered in this repo:

- Obsidian vault extension and editable surface coverage.
- XD Blaster menu/tool surface.
- Base XCON Agent Workbench surface.
- Meta Management renderer UI and `xd.cr.metadata.*` bridge.
- Native tools packaging for Windows, Office, and macOS helper binaries.
- Input control mini slice.
- External app control baseline and Notepad smoke scaffolding.
- Current CR audit is green in the latest generated audit.

Remaining sibling-only feature groups outside `packages/xenesis`:

- Agent Sessions Hub.
- Meta Management local server stores and `/api/cr/*`, `/api/meta/*` routes.
- App Control Lab and extended external app adapters/actions.
- Office Control service and CR surface.
- XCON/SKETCH plugin packaging, selected MCP prompt/test assets, and docs.
- Workbench Subagent integration, intentionally last because the sibling work is
  still active.

## Priority Order

| Order | Slice | Reason |
| --- | --- | --- |
| 1 | Agent Sessions | Provides saved/running agent session discovery, search, resume, terminal attach, pin, and hide. It supports visible subagent workflows without depending on unfinished Workbench subagent UI. |
| 2 | Meta Local Server | Completes the local backend for the Meta Management UI already ported here. Adds durable CR snapshots, run records, validation runs, changelog, activity, and read-only query support. |
| 3 | App Control Lab / Extended Apps | Upgrades external app control from a thin Windows baseline into platform-adapter based control with observation, UI tree, element capture, richer pointer actions, and a test lab UI. |
| 4 | Office Control | Connects the already packaged Office helper tools to shared models, main services, CR paths, and settings. |
| 5 | Plugin / MCP / Docs | Adds XCON/SKETCH plugin packaging and selected MCP/documentation parity after core runtime surfaces are in place. |
| 6 | Workbench Subagent | Last by user direction. The sibling implementation is still changing, so this waits for stabilization before porting profiles, worker attach, assignment dispatch, and result collection. |

## Slice Boundaries

Each slice must be implemented independently:

- Add a focused implementation plan before code changes.
- Keep the patch scoped to that slice's files.
- Preserve existing current-repo behavior where it is more advanced than the
  sibling implementation.
- Run the narrowest relevant tests first, then broader gates.
- If the slice touches CR, run `npm run docs:capabilities:audit` and do not
  report completion unless the CR counters remain zero.
- If the slice touches Agent, external app control, Office automation, or live
  Desk control, add an Electron smoke where practical.

## Verification Matrix

| Slice | Required verification |
| --- | --- |
| Agent Sessions | Shared/main/renderer focused tests, root test suite, typecheck, CR audit, Electron smoke for opening the pane and calling `xd.agentSessions.list`. |
| Meta Local Server | Server store tests, CR metadata focused tests, Meta renderer focused tests, root tests, typecheck, CR audit, Electron smoke against local server routes. |
| App Control Lab / Extended Apps | External app shared/main tests, App Control Lab model tests, input-control regressions, typecheck, CR audit, Notepad live smoke when available. |
| Office Control | Shared Office tests, service adapter tests, native helper packaging tests, typecheck, CR audit, optional installed Office smoke only when host prerequisites exist. |
| Plugin / MCP / Docs | MCP focused tests, docs public safety, package resource path checks, typecheck if source changes, public release check. |
| Workbench Subagent | Subagent model tests, Workbench pane tests, terminal CR focused tests, typecheck, CR audit if paths change, Electron smoke after sibling stabilization. |

## Design Documents

- `2026-07-01-agent-sessions-slice-design.md`
- `2026-07-01-meta-local-server-slice-design.md`
- `2026-07-01-app-control-lab-slice-design.md`
- `2026-07-01-office-control-slice-design.md`
- `2026-07-01-plugin-mcp-docs-slice-design.md`
- `2026-07-01-workbench-subagent-slice-design.md`

## Completion Policy

The roadmap is complete only when each slice has:

- A committed implementation plan.
- A committed implementation.
- Focused tests for the slice.
- Relevant broader gates recorded in `handoff.md`.
- CR audit zero counters when CR is touched.
- Live smoke evidence when runtime Desk control behavior changes.

Workbench Subagent completion additionally requires a fresh sibling review before
starting implementation because its upstream surface is still moving.
