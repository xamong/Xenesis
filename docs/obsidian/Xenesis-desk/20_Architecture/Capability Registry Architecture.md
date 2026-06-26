---
type: architecture
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
---

# Capability Registry Architecture

## Purpose

The CR is the graph center for controllable Desk behavior. Typed tools and UI shortcuts must map back to CR behavior.

## Graph Links

- Depends on [[module-capability-registry]]
- Verified by [[test-capability-audit]]
- Decided by [[ADR-001-cr-first-control-plane]]
