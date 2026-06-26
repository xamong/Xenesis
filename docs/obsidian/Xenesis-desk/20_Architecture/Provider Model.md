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
  - "[[module-provider-runtime]]"
decided_by:
  - "[[ADR-003-provider-selection-by-user-settings]]"
---

# Provider Model

## Purpose

Provider identity comes from user settings/profile. Local CLI selection remains separate from provider identity.

## Graph Links

- Depends on [[module-provider-runtime]]
- Decided by [[ADR-003-provider-selection-by-user-settings]]
