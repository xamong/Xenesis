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
  - "[[module-provider-runtime]]"
decided_by:
  - "[[ADR-003-provider-selection-by-user-settings]]"
---

# Provider Model

## Purpose

Provider identity comes from user settings/profile. Local CLI selection remains separate from provider identity.

## Role In Final Goal

Provider selection controls the reasoning engine but not the Desk control
contract. Codex, Claude, BYOK, or future providers should all reach the same CR
surface.

## Source Files

| Source | Role |
|---|---|
| `packages/xenesis/src/providers` | Provider implementations and registry. |
| `packages/xenesis/src/config/types.ts` | Provider/profile configuration types. |
| `packages/xenesis/src/core/AgentRuntimeFactory.ts` | Runtime provider creation path for embedded Desk. |
| `src/main/index.ts` | Electron main wiring for embedded runtime options. |

## Control Flow

1. Active `~/.xenis` profile and Desk settings choose the provider.
2. `auto` resolves by credentials and profile rules.
3. Runtime creates the matching provider without collapsing provider identity
   into local CLI selection.
4. Provider reasoning uses Desk tools that map back to CR.

## Risks

- A keyed provider without credentials silently falls back to a different provider.
- Local CLI selection is treated as the provider identity.
- Provider-specific CR implementations duplicate the generic CR caller.

## Verification

- `npm --prefix packages/xenesis run provider:smoke`
- `npm --prefix packages/xenesis run typecheck`
- Live Agent pane footer/work-log provider check.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-provider-runtime]]
- Decided by [[ADR-003-provider-selection-by-user-settings]]
