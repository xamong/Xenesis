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
  - "[[module-capability-registry]]"
  - "[[Approval Flow]]"
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
  - "src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx"
---

# module-approval-system

## Purpose

Creates and resolves real approval records for actions that cross risk or workspace boundaries.

## Role In Final Goal

This module supports [[Final Goal]] by keeping safety and approval records
attached to the CR-first control plane instead of drifting into
provider-specific, renderer-only, or chat-only behavior.

## Owned Source Files

| Source | Responsibility |
|---|---|
| `src/main/capabilityActionApproval.mjs` | Approval records and policy support. |
| `src/main/mcpActionInbox.mjs` | Action Inbox audit/backstop records. |
| `src/preload/index.ts` | Renderer-safe approval APIs. |
| `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx` | Inline approval card display and user resolution path. |

## Depends On

- [[Final Goal]]
- [[module-capability-registry]]
- [[Approval Flow]]

## Risks

- Behavior bypasses CR and becomes invisible to discovery/audit.
- Provider or UI convenience behavior diverges from the generic CR caller.
- Approval-required behavior does not create a real approval record.
- Verification relies on unit tests but misses live Agent-pane behavior.

## Verification

- Live Agent pane approval prompt.
- `npm run docs:capabilities:audit`

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-capability-registry]]
- Depends on [[Approval Flow]]
- Verified by [[test-live-agent-pane]]
- Decided by [[ADR-002-approval-records-not-chat-text]]
- Risk appears in [[High Risk Areas]]
- Touches `src/main/capabilityActionApproval.mjs`
- Touches `src/main/mcpActionInbox.mjs`
- Touches `src/preload/index.ts`
- Touches `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
