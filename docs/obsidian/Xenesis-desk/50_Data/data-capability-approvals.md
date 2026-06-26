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
supports:
  - "[[Final Goal]]"
touches:
  - "src/main/capabilityActionApproval.mjs"
  - "src/main/index.ts"
  - "src/shared/deskBridgeCapabilities.ts"
---

# data-capability-approvals

## Purpose

Describes capability approval records and the metadata that determines when Desk
actions require user consent.

## Role In Final Goal

Capability approvals support the Final Goal by ensuring CR-routed Desk control
uses real approval records for sensitive actions instead of chat-only consent.

## Source Files

| Source | Role |
|---|---|
| `src/main/capabilityActionApproval.mjs` | Owns capability approval record behavior and policy support. |
| `src/shared/deskBridgeCapabilities.ts` | Defines permission and approval metadata used before records are created. |

## Reads And Writes

- Reads CR node permission and approval metadata.
- Writes approval records for actions requiring user consent.
- Returns structured approval-required results to the caller.

## Risks

- Chat-only approval text can be mistaken for a real approval record.
- Approval metadata can drift from CR node behavior or dispatcher wiring.
- Outside-workspace paths can fail without routing through the approval flow.

## Verification

- Use live Agent pane approval-required prompts to confirm real approval records
  are created and resolved through Desk UX.
- Run `npm run docs:capabilities:audit` after CR or approval metadata changes to
  confirm registry and dispatch coverage remain aligned.

## Graph Links

- Read by [[module-provider-runtime]]
- Written by [[module-approval-system]]
- Verified by [[Verification Map]]
- Supports [[Final Goal]]
- Touches `src/main/capabilityActionApproval.mjs`
- Touches `src/main/index.ts`
- Touches `src/shared/deskBridgeCapabilities.ts`
