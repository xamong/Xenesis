---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal]]"
  - "[[Final Goal Overall Spec]]"
  - "[[Reference-Driven Final Goal Slices]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[Approval Flow]]"
touches:
  - "docs/superpowers/plans/2026-06-29-slice-1-live-cr-baseline-reference-map.md"
  - "handoff.md"
---

# Slice 1 Live CR Baseline Plan

## Context

Slice 1 turns the broad reference-driven final-goal plan into an executable
implementation plan for live CR baseline evidence and the OpenClaw/Hermes
reference adoption map.

This Slice 1 plan is downstream of [[Final Goal Overall Spec]]. Do not execute
it as the next implementation step until the overall spec has been reviewed for
scope.

The detailed implementation plan is stored at
`docs/superpowers/plans/2026-06-29-slice-1-live-cr-baseline-reference-map.md`.
That directory is ignored by Git, so this note is the tracked Obsidian graph
pointer.

## Planned Work

1. Record Slice 1 reference intake in `handoff.md`.
2. Add named `reference-baseline:*` checks to the Connection Center live smoke.
3. Label the review-request approval live smoke as a structured CR approval
   regression, not provider natural-language CR tool-selection proof.
4. Create the draft `[[Reference Adoption Map]]` architecture note and update
   verification/CR surface indexes.
5. Run focused source tests, CR audit, typecheck, build, and both live smokes.

## Boundary

The slice must not add deterministic natural-language routing, prompt intent
catalogs, provider shortcuts, chat-only approval, or secret-bearing docs/logs.

The existing explicit fenced `xenesis-desk-action` approval smoke remains useful
for approval regression coverage, but it must not be reported as provider
reasoning evidence.

## Verification Planned

- `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs`
- `node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs`
- `npm run docs:capabilities:audit`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:xenesis:connection-center -- --json`
- `npm run smoke:xenesis:review-request-approval -- --json`

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Final Goal Overall Spec]]
- Depends on [[Reference-Driven Final Goal Slices]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Approval Flow]]
