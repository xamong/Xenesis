---
type: task
repo: xenesis-desk
aliases:
  - Reference-Driven Final Goal Slices
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
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[Provider Model]]"
  - "[[Approval Flow]]"
touches:
  - "handoff.md"
  - "docs/superpowers/plans/2026-06-29-xenesis-reference-driven-final-goal-slices.md"
---

# Reference-Driven Final Goal Slices

## Context

The remaining Xenesis Desk final-goal work should be executed in larger slices,
but each slice needs concrete internal spec details. The plan uses local
reference material from `F:\agent-anal` only; it should not spend slice cycles
on repeated web research.

This slice plan is downstream of [[Final Goal Overall Spec]]. Treat it as a
draft implementation plan until the overall spec and [[Final Goal Slice Spec Index]]
are accepted.

The tracked scope contracts are [[Final Goal Slice Spec Index]] and the six
slice spec notes linked from it. The local
`docs/superpowers/plans/2026-06-29-xenesis-reference-driven-final-goal-slices.md`
artifact is ignored by Git and is not the canonical tracked breakdown.

## Reference Intake Rule

Every implementation slice must first read the matching analysis notes under
`F:\agent-anal\analysis`, then confirm the specific original OpenClaw or Hermes
source files before porting any pattern into Xenesis.

Concrete reference paths verified during this spec slice:

- `F:\agent-anal\openclaw-main\src\routing\resolve-route.ts`
- `F:\agent-anal\openclaw-main\src\routing\session-key.ts`
- `F:\agent-anal\openclaw-main\src\channels\allowlist-match.ts`
- `F:\agent-anal\openclaw-main\extensions\telegram\src\conversation-route.ts`
- `F:\agent-anal\hermes-agent-main\tui_gateway\server.py`
- `F:\agent-anal\hermes-agent-main\tui_gateway\ws.py`
- `F:\agent-anal\hermes-agent-main\apps\desktop\electron\main.cjs`

## Large Slices

1. Live CR baseline and reference adoption map.
2. Provider and first-run onboarding completion.
3. External tool connection and MCP/OAuth path.
4. External messenger and channel end-to-end.
5. User stories and guide workflows.
6. Obsidian knowledge graph and release hardening.

## Non-Negotiable Boundaries

- No deterministic natural-language keyword routing or intent catalogs.
- No provider shortcut that bypasses the user-selected provider setting.
- No chat-only approval text; approval-required actions must create real Desk
  approval records through CR calls with `approved=false`.
- No secrets or bridge tokens in docs, logs, or summaries.
- Typed wrappers may stay only as CR-backed convenience wrappers.

## Verification For This Spec Slice

- The master plan's open-ended text scan produced no matches for loose
  reference-root entries or incomplete implementation markers.
- `Test-Path` returned `True` for the master plan and each concrete OpenClaw or
  Hermes reference path listed above.
- `git check-ignore` confirmed `docs/superpowers/` is ignored by `.gitignore`.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Final Goal Overall Spec]]
- Depends on [[Final Goal Slice Spec Index]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Provider Model]]
- Depends on [[Approval Flow]]
