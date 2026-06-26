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
  - "packages/xenesis/src/config/profiles.ts"
  - "packages/xenesis/src/config/types.ts"
  - "packages/xenesis/src/core/AgentRuntimeFactory.ts"
  - "src/main/index.ts"
---

# data-provider-profile

## Purpose

Documents provider profile data used to select the active Agent runtime provider
for Desk operations.

## Role In Final Goal

Provider profile data supports the Final Goal by keeping Agent-pane provider
identity tied to user settings and credential rules while preserving the same
CR-first Desk control surface.

## Source Files

| Source | Role |
|---|---|
| `packages/xenesis/src/config/types.ts` | Provider/profile config schema. |
| `packages/xenesis/src/core/AgentRuntimeFactory.ts` | Runtime provider resolution. |
| `src/main/index.ts` | Embedded Desk runtime option assembly. |

## Reads And Writes

- Reads active user profile and provider settings.
- Resolves `auto` according to credential/profile rules.
- Does not silently rewrite provider identity to hide credential failures.

## Risks

- Provider resolution can silently fall back to a different provider after a
  credential failure.
- Local CLI selection can collapse into provider identity instead of remaining a
  separate runtime choice.
- Profile settings and available credentials can drift, causing the Agent pane
  footer, work log, and runtime behavior to disagree.

## Verification

- Run `npm --prefix packages/xenesis run provider:smoke` for provider profile
  and runtime-provider wiring checks.
- Use live Agent pane provider checks to confirm the footer and work log show the
  intended provider during Desk-control prompts.

## Graph Links

- Read by [[module-provider-runtime]]
- Written by [[module-approval-system]]
- Verified by [[Verification Map]]
- Supports [[Final Goal]]
- Touches `packages/xenesis/src/config/profiles.ts`
- Touches `packages/xenesis/src/config/types.ts`
- Touches `packages/xenesis/src/core/AgentRuntimeFactory.ts`
- Touches `src/main/index.ts`
