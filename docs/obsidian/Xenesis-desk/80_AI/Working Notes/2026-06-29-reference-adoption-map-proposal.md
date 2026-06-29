---
type: task
repo: xenesis-desk
aliases:
  - Reference Adoption Map Proposal
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: low
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal Overall Spec]]"
  - "[[Final Goal Slice Spec Index]]"
  - "[[Review Policy]]"
  - "[[Source of Truth Map]]"
---

# Reference Adoption Map Proposal

This is the proposal-stage reference adoption map for the final-goal slices.
It is not the executable source of truth, and it is not yet the canonical
`20_Architecture/Reference Adoption Map.md`.

Promote this into `20_Architecture` only after the relevant implementation
slice is verified or explicitly approved.

## Required Record Shape

| Field | Required content |
|---|---|
| Reference analysis | Exact analysis note path under `F:\agent-anal\analysis`. |
| Original source checked | Exact source files under `F:\agent-anal\openclaw-main` or `F:\agent-anal\hermes-agent-main`. |
| Borrowed pattern | Behavior or verification idea being adapted. |
| Xenesis adaptation | CR path, renderer surface, provider/runtime boundary, approval model, and readback. |
| Rejected behavior | Anything not ported, especially prompt keyword routing or chat-only approval. |
| Verification | Focused tests, CR audit, live smoke, or manual live prompt evidence. |

## Slice Records

- Slice 01: pending implementation evidence.
- Slice 02: pending implementation evidence.
- Slice 03: pending implementation evidence.
- Slice 04: pending implementation evidence.
- Slice 05: pending implementation evidence.
- Slice 06: pending final graph/release evidence.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Final Goal Slice Spec Index]]
- Depends on [[Review Policy]]
- Depends on [[Source of Truth Map]]
