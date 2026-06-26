---
type: module
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
  - "[[module-capability-registry]]"
  - "[[MCP Bridge Architecture]]"
verified_by:
  - "[[test-capability-audit]]"
decided_by:
  - "[[ADR-001-cr-first-control-plane]]"
risk_of:
  - "[[High Risk Areas]]"
touches:
  - "mcp/xenesis-desk-mcp-server.mjs"
---

# module-mcp-bridge

## Purpose

Exposes Desk control and context to external agents through MCP while preserving CR-first behavior.

## Role In Final Goal

This module supports [[Final Goal]] by keeping external agent access attached to
the CR-first control plane instead of drifting into provider-specific,
renderer-only, or chat-only behavior.

## Owned Source Files

| Source | Responsibility |
|---|---|
| `mcp/xenesis-desk-mcp-server.mjs` | MCP server, tool schemas, CR wrapper calls, Playwright worker bridge, file safety tool wrappers. |

## Depends On

- [[Final Goal]]
- [[module-capability-registry]]
- [[MCP Bridge Architecture]]

## Risks

- Behavior bypasses CR and becomes invisible to discovery/audit.
- Provider or UI convenience behavior diverges from the generic CR caller.
- Approval-required behavior does not create a real approval record.
- Verification relies on unit tests but misses live Agent-pane behavior.

## Verification

- `npm run docs:capabilities:audit`
- Live MCP/Agent prompt proving `xenesis_desk_call_capability` can reach Desk CR.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-capability-registry]]
- Depends on [[MCP Bridge Architecture]]
- Verified by [[test-capability-audit]]
- Decided by [[ADR-001-cr-first-control-plane]]
- Risk appears in [[High Risk Areas]]
- Touches `mcp/xenesis-desk-mcp-server.mjs`
