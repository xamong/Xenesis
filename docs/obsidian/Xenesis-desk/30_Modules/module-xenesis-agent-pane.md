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
  - "[[module-provider-runtime]]"
  - "[[module-approval-system]]"
  - "[[Xenesis Agent Runtime]]"
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

## Role In Final Goal

This module supports [[Final Goal]] by keeping user-facing Agent interaction
attached to the CR-first control plane instead of drifting into
provider-specific, renderer-only, or chat-only behavior.

## Owned Source Files

| Source | Responsibility |
|---|---|
| `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx` | User prompt surface, response/work-log rendering, status display, approval card UX. |

## Depends On

- [[Final Goal]]
- [[module-provider-runtime]]
- [[module-approval-system]]
- [[Xenesis Agent Runtime]]

## Risks

- Behavior bypasses CR and becomes invisible to discovery/audit.
- Provider or UI convenience behavior diverges from the generic CR caller.
- Approval-required behavior does not create a real approval record.
- Verification relies on unit tests but misses live Agent-pane behavior.

## Verification

- Live Electron Agent pane prompt for normal conversation.
- Live Electron Agent pane prompt for natural-language Desk control.
- Live Electron Agent pane prompt for approval-required Desk action when approval behavior changes.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-provider-runtime]]
- Depends on [[module-approval-system]]
- Depends on [[Xenesis Agent Runtime]]
- Verified by [[test-live-agent-pane]]
- Decided by [[ADR-002-approval-records-not-chat-text]]
- Risk appears in [[High Risk Areas]]
- Touches `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
