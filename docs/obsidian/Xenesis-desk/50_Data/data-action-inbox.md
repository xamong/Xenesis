---
type: data-store
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
reads:
  - "[[module-provider-runtime]]"
writes:
  - "[[module-approval-system]]"
verified_by:
  - "[[Verification Map]]"
depends_on:
  - "[[Final Goal]]"
touches:
  - "src/main/mcpActionInbox.mjs"
  - "src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx"
---

# data-action-inbox

## Purpose

Tracks approval-related Action Inbox records used when Desk actions require a
user decision.

## Role In Final Goal

The Action Inbox supports the Final Goal by preserving an auditable backstop for
approval-required Desk actions while the Agent pane presents the normal inline
approval UX.

## Source Files

| Source | Role |
|---|---|
| `src/main/mcpActionInbox.mjs` | Stores and resolves Action Inbox records used as audit/backstop for approval-required actions. |
| `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx` | Renders inline approval cards as the primary approval UX. |

## Reads And Writes

- Writes records when external or risky actions need user decision.
- Reads records for audit/backstop surfaces.
- Resolves records when the user approves once, always approves, or rejects.

## Risks

- Raw internal IDs can leak into normal user-facing Agent pane responses.
- Action Inbox can become the primary approval UX instead of an audit/backstop
  surface.
- Approval records can fail to resolve after approve-once, always-approve, or
  reject decisions.

## Verification

- Use a live Agent pane approval-required prompt to confirm inline approval cards
  appear and resolve through product UX.
- Confirm normal Agent pane responses describe approval stops in product
  language without exposing internal Action Inbox fields.

## Graph Links

- Read by [[module-provider-runtime]]
- Written by [[module-approval-system]]
- Verified by [[Verification Map]]
- Depends on [[Final Goal]]
- Touches `src/main/mcpActionInbox.mjs`
- Touches `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
