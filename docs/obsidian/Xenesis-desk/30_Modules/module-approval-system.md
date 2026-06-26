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
  - "[[test-live-agent-pane]]"
decided_by:
  - "[[ADR-002-approval-records-not-chat-text]]"
risk_of:
  - "[[High Risk Areas]]"
touches:
  - "src/main/capabilityActionApproval.mjs"
  - "src/main/mcpActionInbox.mjs"
  - "src/preload/index.ts"
---

# module-approval-system

## Purpose

Creates and resolves real approval records for actions that cross risk or workspace boundaries.

## Graph Links

- Depends on [[module-capability-registry]]
- Verified by [[test-live-agent-pane]]
- Decided by [[ADR-002-approval-records-not-chat-text]]
- Risk appears in [[High Risk Areas]]
- Touches `src/main/capabilityActionApproval.mjs`
- Touches `src/main/mcpActionInbox.mjs`
- Touches `src/preload/index.ts`
