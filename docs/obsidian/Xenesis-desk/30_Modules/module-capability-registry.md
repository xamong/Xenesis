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
  - "[[Capability Registry Architecture]]"
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
  - "docs/capability-registry-list.md"
  - "scripts/capabilityCoverageAudit.mjs"
---

# module-capability-registry

## Purpose

Owns the stable `xd.*` Desk control contract, capability metadata, dispatch mapping, approval policy, and CR audit expectations.

## Role In Final Goal

This module supports [[Final Goal]] by keeping Desk control metadata and
dispatch attached to the CR-first control plane instead of drifting into
provider-specific, renderer-only, or chat-only behavior.

## Owned Source Files

| Source | Responsibility |
|---|---|
| `src/shared/deskBridgeCapabilities.ts` | CR metadata, path tree, approval decision, dispatch, dynamic path parsing, coverage maps. |
| `docs/capability-registry.md` | Human guide for CR operation. |
| `docs/capability-registry-list.md` | Generated path inventory. |
| `scripts/capabilityCoverageAudit.mjs` | CR release gate audit. |

## Depends On

- [[Final Goal]]
- [[Capability Registry Architecture]]
- [[Source of Truth Map]]

## Risks

- Behavior bypasses CR and becomes invisible to discovery/audit.
- Provider or UI convenience behavior diverges from the generic CR caller.
- Approval-required behavior does not create a real approval record.
- Verification relies on unit tests but misses live Agent-pane behavior.

## Verification

- `npm run docs:capabilities:audit`
- `npm run docs:capabilities`

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Source of Truth Map]]
- Verified by [[test-capability-audit]]
- Verified by [[Verification Gates]]
- Decided by [[ADR-001-cr-first-control-plane]]
- Risk appears in [[High Risk Areas]]
- Touches `src/shared/deskBridgeCapabilities.ts`
- Touches `docs/capability-registry.md`
- Touches `docs/capability-registry-list.md`
- Touches `scripts/capabilityCoverageAudit.mjs`
