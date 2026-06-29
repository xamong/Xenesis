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
  - "[[Final Goal Slice Spec Index]]"
  - "[[Capability Registry Architecture]]"
  - "[[Approval Flow]]"
verified_by:
  - "[[Verification Map]]"
---

# Slice Spec 01 Live CR Baseline

## Goal

Prove the current CR-backed Connection Center and approval surfaces are live,
then create the reference adoption map that all later slices must update.

## Scope

- Add named live baseline checks to Connection Center smoke output.
- Label existing review-request approval smoke as structured CR approval
  regression, not provider natural-language tool-selection proof.
- Create draft `[[Reference Adoption Map]]`.
- Update CR and verification indexes with the development live proof surfaces.

## Reference Intake

- `F:\agent-anal\analysis\_xenesis-gap-shared-context.md`
- `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`
- `F:\agent-anal\analysis\hermes-agent-main\08-channels-ui.md`
- `F:\agent-anal\analysis\openclaw-main\12-channels-routing.md`

Original source anchors:

- `F:\agent-anal\hermes-agent-main\tui_gateway\server.py`
- `F:\agent-anal\hermes-agent-main\tui_gateway\ws.py`
- `F:\agent-anal\hermes-agent-main\apps\desktop\electron\main.cjs`
- `F:\agent-anal\openclaw-main\src\routing\resolve-route.ts`
- `F:\agent-anal\openclaw-main\src\routing\session-key.ts`
- `F:\agent-anal\openclaw-main\src\channels\allowlist-match.ts`

## Candidate Files

- `scripts/xenesisConnectionCenterLiveSmoke.mjs`
- `scripts/xenesisConnectionCenterLiveSmoke.test.mjs`
- `scripts/xenesisReviewRequestApprovalLiveSmoke.mjs`
- `scripts/xenesisReviewRequestApprovalLiveSmoke.test.mjs`
- `src/main/index.ts`
- `docs/obsidian/Xenesis-desk/20_Architecture/Reference Adoption Map.md`
- `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`
- `docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md`
- `handoff.md`

## Acceptance

- Connection Center smoke reports exact `reference-baseline:*` check ids.
- Review approval smoke text clearly states it is structured CR approval
  regression only.
- `[[Reference Adoption Map]]` records borrowed, adapted, and rejected
  OpenClaw/Hermes patterns.
- No provider natural-language CR claim is made from the fenced action smoke.

## Verification

```powershell
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs
npm run docs:capabilities:audit
npm run typecheck
npm run build
npm run smoke:xenesis:connection-center -- --json
npm run smoke:xenesis:review-request-approval -- --json
```

## Out Of Scope

- Provider setup fixes.
- Tool/OAuth implementation.
- Messenger channel implementation.
- Claiming natural-language provider CR behavior.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Final Goal Slice Spec Index]]
- Verified by [[Verification Map]]
