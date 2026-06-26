---
type: data-store
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
reads:
  - "[[module-provider-runtime]]"
writes:
  - "[[module-approval-system]]"
verified_by:
  - "[[Verification Map]]"
touches:
  - "packages/xenesis/src/sessions"
---

# data-session-logs

## Purpose

Describes what state is stored and which Desk behavior depends on it.

## Graph Links

- Read by [[module-provider-runtime]]
- Written by [[module-approval-system]]
- Verified by [[Verification Map]]
- Touches `packages/xenesis/src/sessions`
