---
type: adr
repo: xenesis-desk
status: accepted
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
date: 2026-06-26
touches:
  - "[[module-provider-runtime]]"
verified_by:
  - "[[test-provider-smoke]]"
---

# ADR-003 provider selection by user settings

## Context

Provider selection must reflect user settings/profile and must not silently fall
back to a hardcoded provider.

## Decision

Provider selection comes from user settings/profile; local CLI selection is
separate from provider identity.

## Consequences

- BYOK is one provider mode, not the provider system itself.
- Missing credentials should produce honest credential errors.
- Local CLI selection and provider enum must stay orthogonal.

## Graph Links

- Decides [[module-provider-runtime]]
- Verified by [[test-provider-smoke]]
