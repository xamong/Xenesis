---
type: adr
repo: xenesis-desk
status: accepted
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
date: 2026-06-26
touches:
  - "[[module-capability-registry]]"
verified_by:
  - "[[test-capability-audit]]"
---

# ADR-001 CR-first control plane

## Context

Desk operations, automation, and agent-to-Desk control need one stable contract.

## Decision

The Capability Registry is the source of truth for controllable Desk behavior.
Typed tools and UI shortcuts are wrappers that must map back to CR behavior.

## Consequences

- CR coverage is a release gate.
- New control surfaces require a registry decision.
- Agents should discover and call CR paths before using ad hoc paths.

## Graph Links

- Decides [[module-capability-registry]]
- Verified by [[test-capability-audit]]
