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
  - "[[Provider Model]]"
verified_by:
  - "[[test-provider-smoke]]"
decided_by:
  - "[[ADR-003-provider-selection-by-user-settings]]"
risk_of:
  - "[[High Risk Areas]]"
touches:
  - "packages/xenesis-agent-core/src/embeddedRuntime.ts"
  - "packages/xenesis/src/core/AgentRuntimeFactory.ts"
  - "packages/xenesis/src/providers"
  - "packages/xenesis/src/config/types.ts"
---

# module-provider-runtime

## Purpose

Selects and runs the configured reasoning provider while keeping local CLI choice separate from provider identity.

## Role In Final Goal

This module supports [[Final Goal]] by keeping reasoning-provider selection
attached to the CR-first control plane instead of drifting into
provider-specific, renderer-only, or chat-only behavior.

## Owned Source Files

| Source | Responsibility |
|---|---|
| `packages/xenesis-agent-core/src/embeddedRuntime.ts` | Embedded runtime entrypoint. |
| `packages/xenesis/src/core/AgentRuntimeFactory.ts` | Runtime construction and provider creation. |
| `packages/xenesis/src/providers` | Provider implementations and registry. |
| `packages/xenesis/src/config/types.ts` | Provider/profile config schema. |

## Depends On

- [[Final Goal]]
- [[module-capability-registry]]
- [[Provider Model]]

## Risks

- Behavior bypasses CR and becomes invisible to discovery/audit.
- Provider or UI convenience behavior diverges from the generic CR caller.
- Approval-required behavior does not create a real approval record.
- Verification relies on unit tests but misses live Agent-pane behavior.

## Verification

- `npm --prefix packages/xenesis test`
- `npm --prefix packages/xenesis run provider:smoke`
- `npm --prefix packages/xenesis run typecheck`

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-capability-registry]]
- Depends on [[Provider Model]]
- Verified by [[test-provider-smoke]]
- Decided by [[ADR-003-provider-selection-by-user-settings]]
- Risk appears in [[High Risk Areas]]
- Touches `packages/xenesis-agent-core/src/embeddedRuntime.ts`
- Touches `packages/xenesis/src/core/AgentRuntimeFactory.ts`
- Touches `packages/xenesis/src/providers`
- Touches `packages/xenesis/src/config/types.ts`
