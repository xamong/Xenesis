---
type: index
repo: xenesis-desk
status: active
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
depends_on:
  - "[[Capability Registry Architecture]]"
  - "[[Final Goal]]"
---

# CR Surface Index

## Purpose

Lists CR and MCP entrypoints for the Desk control surface. Use this index when a
task mentions `xd.*`, MCP tools, Capability Registry, dispatcher coverage, or
approval-required Desk control.

## Development Live Proof Surfaces

These are verification surfaces, not user-facing product shortcuts.

| Surface | Purpose |
|---|---|
| `xd.xenesis.connections.open` | Opens the CR-backed Connection Center surface for live smoke setup. |
| `xd.testing.connectionCenter.snapshot` | Reads Connection Center renderer evidence and emits exact `reference-baseline:*` checks. |
| `xd.tools.core.xenesisAgent.open` | Opens the Agent pane before structured approval regression smoke. |
| `xd.testing.xenesisAgent.submitPrompt` | Development-only smoke driver for Agent pane prompts and approval button execution. |
| `xd.mcp.actionInbox.list` | Reads pending/approved/rejected Action Inbox records for approval evidence. |
| `xd.xenesis.connections.setupRequests.request` | Approval-required CR call used by the structured review-request regression smoke with `approved=false`. |

## Graph Links

- Depends on [[Capability Registry Architecture]]
- Depends on [[Final Goal]]
- Includes [[capability-index]]
- Includes [[mcp-tool-index]]
- Includes [[http-bridge-index]]
- Includes [[ipc-surface-index]]
- Includes [[capability-high-risk-paths]]
