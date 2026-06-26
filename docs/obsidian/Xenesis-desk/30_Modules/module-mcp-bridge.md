---
type: module
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
depends_on:
  - "[[module-capability-registry]]"
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

## Graph Links

- Depends on [[module-capability-registry]]
- Verified by [[test-capability-audit]]
- Decided by [[ADR-001-cr-first-control-plane]]
- Risk appears in [[High Risk Areas]]
- Touches `mcp/xenesis-desk-mcp-server.mjs`
