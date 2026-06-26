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
implements:
  - "[[module-capability-registry]]"
depends_on:
  - "[[Final Goal]]"
  - "[[capability-high-risk-paths]]"
verified_by:
  - "[[test-capability-audit]]"
touches:
  - "src/shared/deskBridgeCapabilities.ts"
  - "docs/capability-registry-list.md"
---

# capability-index

## Purpose

Indexes the Capability Registry surface and points agents to source-of-truth repo files.

## Role In Final Goal

The Capability Registry is the stable control surface required by [[Final Goal]].
It is where agents discover Desk behavior, inspect schemas, call actions, and
trigger approval/audit behavior.

## Source Files

| Source | Role |
|---|---|
| `src/shared/deskBridgeCapabilities.ts` | Registry tree, metadata, dynamic path parsing, call dispatch, approval decision, and coverage constants. |
| `docs/capability-registry.md` | Human registry guide and CR operating rules. |
| `docs/capability-registry-list.md` | Generated registry list and permission/approval inventory. |
| `scripts/generateCapabilityRegistryDocs.mjs` | Generates registry documentation. |
| `scripts/capabilityCoverageAudit.mjs` | Audits missing paths, missing dispatch coverage, and static callable coverage. |

## Callable Surface

Agents should prefer the generic CR caller for Desk behavior:

| Surface | Caller |
|---|---|
| Embedded Desk/Xenesis runtime | `desk_call_capability` |
| External MCP callers | `xenesis_desk_call_capability` |
| CLI/dev inspection | `node scripts/xd.mjs capabilities`, `node scripts/xd.mjs capability <path>`, `node scripts/xd.mjs call <path> <json>` |

## High-Risk Mapping

Use [[capability-high-risk-paths]] before changing write, execute, danger,
workspace, terminal, process, approval, or Agent-control paths.

## Graph Links

- Implements [[module-capability-registry]]
- Depends on [[Final Goal]]
- Depends on [[capability-high-risk-paths]]
- Verified by [[test-capability-audit]]
- Touches `src/shared/deskBridgeCapabilities.ts`
- Touches `docs/capability-registry-list.md`
