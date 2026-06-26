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
  - "[[test-provider-smoke]]"
decided_by:
  - "[[ADR-003-provider-selection-by-user-settings]]"
risk_of:
  - "[[High Risk Areas]]"
touches:
  - "packages/xenesis-agent-core/src/embeddedRuntime.ts"
  - "packages/xenesis/src/providers"
---

# module-provider-runtime

## Purpose

Selects and runs the configured reasoning provider while keeping local CLI choice separate from provider identity.

## Graph Links

- Depends on [[module-capability-registry]]
- Verified by [[test-provider-smoke]]
- Decided by [[ADR-003-provider-selection-by-user-settings]]
- Risk appears in [[High Risk Areas]]
- Touches `packages/xenesis-agent-core/src/embeddedRuntime.ts`
- Touches `packages/xenesis/src/providers`
