---
type: system
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
depends_on:
  - "[[AI Agent Rules]]"
  - "[[Review Policy]]"
verified_by:
  - "[[Verification Map]]"
---

# Graph Schema

## Purpose

Folders store notes by type. YAML properties and Obsidian wikilinks create the graph.

## Note Types

- system
- epo-overview
- rchitecture
- module
- capability
- pi
- data-store
- 	est
- dr
- 	ask
- gent-handoff
- eview
- isk
- index
- 	emplate

## Common Properties

`yaml
repo: xenesis-desk
status: active
risk: low | medium | high
ai_edit_policy: read_only | proposal_only | direct_edit_allowed
ai_generated: false
reviewed: true
confidence: high | medium | low
last_reviewed: 2026-06-26
`

## Relation Properties

`yaml
depends_on:
implements:
verified_by:
decided_by:
touches:
handoff_for:
risk_of:
supersedes:
exposes:
called_by:
reads:
writes:
owned_by:
blocked_by:
`

Repeat meaningful YAML relations in a ## Graph Links section.

## Graph Links

- Depends on [[AI Agent Rules]]
- Depends on [[Review Policy]]
- Verified by [[Verification Map]]
