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
  - "[[module-capability-registry]]"
verified_by:
  - "[[test-capability-audit]]"
decided_by:
  - "[[ADR-001-cr-first-control-plane]]"
---

# Capability Registry Architecture

## Purpose

The CR is the graph center for controllable Desk behavior. Typed tools and UI shortcuts must map back to CR behavior.

## Role In Final Goal

The CR is the control-plane center required by [[Final Goal]]. It prevents Desk
automation from splitting into provider-specific or UI-only shortcuts.

## Source Files

| Source | Role |
|---|---|
| `src/shared/deskBridgeCapabilities.ts` | Registry node definitions, dynamic path support, dispatch, approval decision, and coverage maps. |
| `docs/capability-registry.md` | Human guide and CR policy. |
| `docs/capability-registry-list.md` | Generated path inventory. |
| `scripts/capabilityCoverageAudit.mjs` | Release gate for coverage and dispatch consistency. |

## Control Flow

1. Caller discovers a path with registry list/describe behavior.
2. Caller invokes a path through the generic CR caller.
3. Registry resolves static or dynamic path metadata.
4. Approval policy checks source, permission, approval metadata, and user approval.
5. Dispatcher calls the owning adapter.
6. Audit/result data returns to the caller.

## Risks

- New Desk behavior bypasses CR and cannot be discovered or audited.
- A callable path exists without dispatcher coverage.
- Static callable methods drift from registered paths.
- Approval-required behavior returns chat text instead of a real approval record.

## Verification

- `npm run docs:capabilities:audit`
- `npm run docs:capabilities`

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-capability-registry]]
- Verified by [[test-capability-audit]]
- Decided by [[ADR-001-cr-first-control-plane]]
