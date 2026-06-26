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
  - "[[Source of Truth Map]]"
verified_by:
  - "[[test-capability-audit]]"
  - "[[Verification Gates]]"
decided_by:
  - "[[ADR-001-cr-first-control-plane]]"
risk_of:
  - "[[High Risk Areas]]"
touches:
  - "src/shared/deskBridgeCapabilities.ts"
  - "docs/capability-registry.md"
---

# module-capability-registry

## Purpose

Owns the stable `xd.*` Desk control contract, capability metadata, dispatch mapping, approval policy, and CR audit expectations.

## Graph Links

- Depends on [[Source of Truth Map]]
- Verified by [[test-capability-audit]]
- Verified by [[Verification Gates]]
- Decided by [[ADR-001-cr-first-control-plane]]
- Risk appears in [[High Risk Areas]]
- Touches `src/shared/deskBridgeCapabilities.ts`
- Touches `docs/capability-registry.md`
