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

### Slice 01: Live CR Baseline

| Field | Record |
|---|---|
| Reference analysis | `F:\agent-anal\analysis\_xenesis-gap-shared-context.md`; `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`; `F:\agent-anal\analysis\openclaw-main\12-channels-routing.md`; `F:\agent-anal\analysis\hermes-agent-main\08-channels-ui.md` |
| Original source checked | `F:\agent-anal\openclaw-main\src\routing\resolve-route.ts`; `F:\agent-anal\openclaw-main\src\routing\session-key.ts`; `F:\agent-anal\openclaw-main\src\channels\allowlist-match.ts`; `F:\agent-anal\hermes-agent-main\tui_gateway\server.py`; `F:\agent-anal\hermes-agent-main\tui_gateway\ws.py`; `F:\agent-anal\hermes-agent-main\apps\desktop\electron\main.cjs` |
| Borrowed pattern | Stable explicit proof surfaces, session/readback evidence, and audit-backed routing coverage. |
| Xenesis adaptation | Use CR calls `xd.xenesis.connections.open`, `xd.testing.connectionCenter.snapshot`, `xd.testing.xenesisAgent.submitPrompt`, and `xd.mcp.actionInbox.list`; require exact `reference-baseline:*` checks and Action Inbox readback. |
| Rejected behavior | Prompt keyword routing, hidden provider fallbacks, provider-specific CR shortcuts, chat-only approval text, and treating fenced action smoke as provider NL tool-selection proof. |
| Verification | `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs`; `node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs`; `node --test src\main\capabilityActionApproval.test.mjs`; `node --test src\main\mcpActionInbox.test.mjs`; `npm run docs:capabilities:audit`; `node scripts\assertCapabilityAuditZero.mjs`; live smoke commands recorded in `handoff.md`. |

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
