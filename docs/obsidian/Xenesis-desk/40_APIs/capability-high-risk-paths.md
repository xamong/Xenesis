---
type: capability
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
depends_on:
  - "[[Final Goal]]"
  - "[[capability-index]]"
  - "[[mcp-tool-index]]"
verified_by:
  - "[[test-capability-audit]]"
touches:
  - "src/shared/deskBridgeCapabilities.ts"
  - "docs/capability-registry-list.md"
---

# capability-high-risk-paths

## Purpose

Tracks high-risk Capability Registry paths that deserve extra review when
agents, MCP callers, UI commands, or automation invoke Desk control.

## Role In Final Goal

The final goal requires Desk actions to be discoverable, approvable, auditable,
and verifiable through CR paths. High-risk paths are the places where that rule
matters most because they can write files, execute processes, cross workspace
boundaries, or mutate agent/provider state.

## Split Criteria

Create or expand individual path notes when a CR path meets one or more of
these criteria:

- Permission is `write`, `execute`, or `danger`.
- Approval is `when-external` or `always`.
- The path can cross a workspace boundary.
- The path writes, restores, deletes, opens externally, or reveals local files.
- The path starts, writes to, stops, or kills a terminal or process.
- The path creates or resolves approval/action-inbox state.
- The path starts or controls an Agent/provider run.

## Current High-Risk Seed Groups

This table is a curated seed list for Phase 1 navigation, not the complete
high-risk inventory. For the complete current inventory, inspect
`docs/capability-registry-list.md` and run `npm run docs:capabilities:audit`
after registry changes.

| Group | Why It Is High Risk | Source |
|---|---|---|
| `xd.files.*` | Local file open, safe-write, restore, reveal, and external-open operations. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.fs.*` | Raw directory and base64 file transfer primitives. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.remoteFiles.*` | Remote write, mkdir, delete, rename, upload, and download behavior. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.terminals.*` | Terminal launch, command execution, write, image injection, stop, and kill behavior. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.processes.*` | OS process listing and termination behavior. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.xenesis.*` | Agent gateway, workspace, profile, run, cancel, and session-control behavior. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.services.xenesis.*` | Legacy sidecar gateway and workspace control surface. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.automation.*` | Structured workflow execution and terminal automation controls. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.mcp.*` | MCP bridge status, action inbox, and external agent control records. | `src/shared/deskBridgeCapabilities.ts` |
| `xd.control.*` | Multi-agent control lock acquisition, release, and force-release behavior. | `src/shared/deskBridgeCapabilities.ts` |

## Verification

- `npm run docs:capabilities:audit`
- `npm run docs:capabilities`
- Live Agent pane prompt for the touched behavior when CR/Agent/provider/approval code changes.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[capability-index]]
- Depends on [[mcp-tool-index]]
- Verified by [[test-capability-audit]]
- Risk appears in [[High Risk Areas]]
