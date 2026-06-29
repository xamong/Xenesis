---
type: task
repo: xenesis-desk
aliases:
  - Slice 1 Live CR Baseline Plan
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: low
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal]]"
  - "[[Final Goal Overall Spec]]"
  - "[[Final Goal Slice Spec Index]]"
  - "[[Slice Spec 01 Live CR Baseline]]"
  - "[[Reference-Driven Final Goal Slices]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[Approval Flow]]"
touches:
  - "docs/superpowers/plans/2026-06-29-slice-01-live-cr-baseline.md"
  - "docs/superpowers/plans/2026-06-29-slice-1-live-cr-baseline-reference-map.md"
  - "handoff.md"
---

# Slice 1 Live CR Baseline Plan

## Context

Slice 1 turns the broad reference-driven final-goal plan into an executable
implementation plan for live CR baseline evidence and the OpenClaw/Hermes
reference adoption map.

This Slice 1 plan is downstream of [[Final Goal Overall Spec]]. Do not execute
it as the next implementation step until [[Slice Spec 01 Live CR Baseline]] has
been reviewed for scope.

The current detailed implementation plan is stored at
`docs/superpowers/plans/2026-06-29-slice-01-live-cr-baseline.md`.
The older local plan
`docs/superpowers/plans/2026-06-29-slice-1-live-cr-baseline-reference-map.md`
is superseded by the stricter Slice 01 plan because it predates the adversarial
spec review.

`docs/superpowers/` is ignored by Git unless force-added. This note is the
tracked Obsidian graph pointer to the current plan.

## Planned Work

1. Record Slice 1 reference intake in `handoff.md`.
2. Add named `reference-baseline:*` checks to the Connection Center live smoke.
3. Label the review-request approval live smoke as a structured CR approval
   regression, not provider natural-language CR tool-selection proof.
4. Create or update `[[Reference Adoption Map Proposal]]` first; promote to
   `20_Architecture/Reference Adoption Map.md` only after verification or
   explicit approval.
5. Verify approval baseline ownership across `capabilityActionApproval`,
   `mcpActionInbox`, preload APIs, and `XenesisAgentPane` inline cards.
6. Run focused source tests, CR audit-zero assertion, typecheck, build, and both
   live smokes.

## Boundary

The slice must not add deterministic natural-language routing, prompt intent
catalogs, provider shortcuts, chat-only approval, or secret-bearing docs/logs.

The existing explicit fenced `xenesis-desk-action` approval smoke remains useful
for approval regression coverage, but it must not be reported as provider
reasoning evidence.

## Verification Planned

- `node --test scripts\assertCapabilityAuditZero.test.mjs`
- `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs`
- `node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs`
- `node --test src\main\capabilityActionApproval.test.mjs`
- `node --test src\main\mcpActionInbox.test.mjs`
- `npm run docs:capabilities:audit`
- `node scripts\assertCapabilityAuditZero.mjs`
- `npm run typecheck`
- `npm run build`
- `node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json`
- `node .\scripts\xenesisReviewRequestApprovalLiveSmoke.mjs --json`

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Final Goal Overall Spec]]
- Depends on [[Final Goal Slice Spec Index]]
- Depends on [[Slice Spec 01 Live CR Baseline]]
- Depends on [[Reference-Driven Final Goal Slices]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Approval Flow]]
