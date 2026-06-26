---
type: architecture
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
  - "[[module-approval-system]]"
decided_by:
  - "[[ADR-002-approval-records-not-chat-text]]"
---

# Approval Flow

## Purpose

Approval-required actions create real approval records. Chat text alone is not approval evidence.

## Role In Final Goal

Approval flow is the safety layer for CR-first Desk control. Approval-required
actions must create real approval records that the UI can render and resolve.

## Source Files

| Source | Role |
|---|---|
| `src/main/capabilityActionApproval.mjs` | Capability approval records and policy support. |
| `src/main/mcpActionInbox.mjs` | Action Inbox record storage/backstop. |
| `src/preload/index.ts` | Renderer-facing approval/action APIs. |
| `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx` | Inline approval card rendering and user resolution surface. |

## Control Flow

1. External or risky CR call arrives without sufficient approval.
2. Registry returns an approval-required result.
3. Main process creates an approval/action-inbox record.
4. Agent pane renders a user-facing approval card.
5. User approves once, always approves, or rejects.
6. Approved calls re-enter the CR path with approval metadata.

## Risks

- Chat-only approval text is treated as approval evidence.
- Internal action IDs or raw approval payloads leak into normal user responses.
- Outside-workspace operations fail without offering the CR approval path.

## Verification

- Live Agent pane prompt that requires approval.
- `npm run docs:capabilities:audit` for approval metadata coverage.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-approval-system]]
- Decided by [[ADR-002-approval-records-not-chat-text]]
