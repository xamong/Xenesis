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
  - "[[module-provider-runtime]]"
  - "[[module-approval-system]]"
verified_by:
  - "[[test-live-agent-pane]]"
decided_by:
  - "[[ADR-002-approval-records-not-chat-text]]"
risk_of:
  - "[[High Risk Areas]]"
touches:
  - "src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx"
---

# module-xenesis-agent-pane

## Purpose

Native agent surface where user prompts, provider runtime results, work logs, approval UI, and Desk actions meet.

## Graph Links

- Depends on [[module-provider-runtime]]
- Depends on [[module-approval-system]]
- Verified by [[test-live-agent-pane]]
- Decided by [[ADR-002-approval-records-not-chat-text]]
- Risk appears in [[High Risk Areas]]
- Touches `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
