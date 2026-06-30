---
type: review
repo: xenesis-desk
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
---

# Final Goal Slice Spec Adversarial Review

This review treats Obsidian as a reference/context layer only. Completion
evidence remains code, tests, generated CR docs, CR audit counters, and live
Agent-pane proof.

## Review Axes

- CR, provider, approval policy.
- Goal coverage and OpenClaw/Hermes reference adoption.
- Verification gates and test adequacy.
- Obsidian graph integrity and placement policy.

## Findings Applied To Specs

- Fixed graph discoverability by linking [[Final Goal Slice Spec Index]] from
  the vault entrypoint.
- Added aliases and corrected note types/confidence for the slice spec set.
- Replaced broad reference anchors with exact `F:\agent-anal` source files.
- Added [[Reference Adoption Map Proposal]] so the map starts in a direct-write
  working area before any `20_Architecture` promotion.
- Made reference adoption proposal updates required for implementation slices.
- Required CR audit-zero assertion instead of `rg` label checks or audit exit
  code alone.
- Required provider live evidence to include exact prompt, footer/work-log
  provider, generic CR/MCP tool-call evidence, and CR readback/approval result.
- Required provider `auto` source/credential order, no mock reasoning path, and
  no silent fallback to codex/mock.
- Made external-tool negative side-effect tests mandatory and kept Linear in
  scope unless explicitly moved to a follow-up slice.
- Made messenger profile apply/test-send approval evidence real-record based
  with `approved=false`, pending/approved/readback checks, and channel-specific
  smoke coverage.
- Added all-contract invariant tests for user-story workflow previews.
- Made final hardening require lint, public-release check, graph/handoff
  validation, and live Agent-pane natural-language proof.

## Known Remaining Work

- `scripts/assertCapabilityAuditZero.mjs` is now a required future slice
  deliverable; it was not implemented in this review-only turn.
- `scripts/obsidianGraphCheck.mjs` is now a Slice 06 candidate deliverable; it
  was not implemented in this review-only turn.
- A repeatable live Electron Agent-pane natural-language proof script is still
  a known gap. Until it exists, `handoff.md` must record exact manual driver
  evidence.
- Product code, tests, CR docs, and live smokes were not run or changed in this
  adversarial spec review.

## Local Verification

- Alias-aware wikilink check over `2026-06-29` Working Notes: no unresolved
  links.
- Exact `F:\agent-anal` source path check: all referenced paths exist.
- Broad reference-anchor scan: no remaining `Original source anchors are
  selected` or root-only `F:\agent-anal\openclaw-main\src` anchors in checked
  slice specs.
- `git diff --check`: no whitespace errors; Git reported LF/CRLF normalization
  warnings only.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Final Goal Slice Spec Index]]
- Depends on [[Review Policy]]
- Related to [[Reference Adoption Map Proposal]]
