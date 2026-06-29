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
  - "[[Final Goal Overall Spec]]"
  - "[[Reference-Driven Final Goal Slices]]"
  - "[[Final Goal]]"
touches:
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-spec-01-live-cr-baseline.md"
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-spec-02-provider-onboarding.md"
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-spec-03-external-tools-mcp-oauth.md"
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-spec-04-messenger-channels.md"
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-spec-05-user-stories-guides.md"
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-spec-06-graph-release-hardening.md"
---

# Final Goal Slice Spec Index

## Purpose

This index splits [[Final Goal Overall Spec]] into concrete slice specs. Each
slice spec is a scope contract, not an implementation plan. Implementation
plans must be written under each accepted slice spec before product code edits.

## Slice Order

| Slice | Spec | Primary outcome |
|---|---|---|
| 01 | [[Slice Spec 01 Live CR Baseline]] | Live CR baseline and reference adoption map. |
| 02 | [[Slice Spec 02 Provider Onboarding]] | Provider setup, first-run onboarding, and provider evidence. |
| 03 | [[Slice Spec 03 External Tools MCP OAuth]] | External tool connection, MCP templates, OAuth setup packets, runtime readiness. |
| 04 | [[Slice Spec 04 Messenger Channels]] | External messenger profile, routing, runtime, approval-gated test-send. |
| 05 | [[Slice Spec 05 User Stories Guides]] | User-story contracts, manuals, preview-only workflows. |
| 06 | [[Slice Spec 06 Graph Release Hardening]] | Obsidian graph, release gates, audit docs, final evidence. |

## Execution Rule

Do not execute a slice directly from this index. For each slice:

1. Read the slice spec.
2. Confirm local reference analysis and original source anchors.
3. Write a detailed implementation plan for that slice.
4. Execute with focused tests first.
5. Broaden to CR audit, typecheck, build, and live smoke according to changed scope.
6. Record exact evidence in `handoff.md`.

## Shared Boundaries

- No deterministic natural-language keyword routing.
- No provider-specific CR shortcut.
- No chat-only approval.
- No secrets or tokens in docs, logs, smoke output, or Obsidian notes.
- No external web research by default.
- No claim of provider natural-language CR behavior without live provider/tool-call evidence.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Reference-Driven Final Goal Slices]]
- Guides [[Slice Spec 01 Live CR Baseline]]
- Guides [[Slice Spec 02 Provider Onboarding]]
- Guides [[Slice Spec 03 External Tools MCP OAuth]]
- Guides [[Slice Spec 04 Messenger Channels]]
- Guides [[Slice Spec 05 User Stories Guides]]
- Guides [[Slice Spec 06 Graph Release Hardening]]
