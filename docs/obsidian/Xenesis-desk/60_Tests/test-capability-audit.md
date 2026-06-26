---
type: test
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
verified_by:
  - "[[Verification Map]]"
supports:
  - "[[Final Goal]]"
touches:
  - "scripts/capabilityCoverageAudit.mjs"
---

# test-capability-audit

## Purpose

Verifies CR coverage, registry paths, dispatcher wiring, and generated capability documentation.

## Commands

| Command | Expected Use |
|---|---|
| `npm run docs:capabilities:audit` | Verify missing registry paths, missing dispatch coverage, and undispatched static callable methods. |
| `npm run docs:capabilities` | Regenerate CR docs after registry changes. |

## Role In Final Goal

This test note verifies that the CR-first control plane remains complete enough
to trust as a release gate.

## Graph Links

- Verified by [[Verification Map]]
- Supports [[Final Goal]]
- Touches `scripts/capabilityCoverageAudit.mjs`
