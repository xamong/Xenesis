---
type: test
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
verified_by:
  - "[[Verification Map]]"
depends_on:
  - "[[Final Goal]]"
---

# test-provider-smoke

## Purpose

Verifies provider runtime configuration, credentials, and provider selection behavior.

## Commands

| Command | Expected Use |
|---|---|
| `npm --prefix packages/xenesis run provider:smoke` | Verify provider profiles and runtime provider wiring. |
| `npm --prefix packages/xenesis run typecheck` | Verify package-level TypeScript correctness for provider changes. |

## Role In Final Goal

Provider smoke verifies that provider identity follows settings/profile rules
while Desk behavior still reaches the same CR-first surface.

## Graph Links

- Verified by [[Verification Map]]
- Depends on [[Final Goal]]
- Covers [[module-provider-runtime]]
