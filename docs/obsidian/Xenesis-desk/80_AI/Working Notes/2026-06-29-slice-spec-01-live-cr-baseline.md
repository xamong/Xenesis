---
type: task
repo: xenesis-desk
aliases:
  - Slice Spec 01 Live CR Baseline
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
- Create draft `[[Reference Adoption Map Proposal]]`.
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
- `scripts/assertCapabilityAuditZero.mjs`
- `src/main/capabilityActionApproval.mjs`
- `src/main/mcpActionInbox.mjs`
- `src/main/mcpActionInbox.test.mjs`
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
- `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`
- `docs/obsidian/Xenesis-desk/20_Architecture/Reference Adoption Map.md` (promotion target only after approval/verification)
- `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`
- `docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md`
- `handoff.md`

## Acceptance

- Connection Center smoke reports exact `reference-baseline:*` check ids.
- Review approval smoke text clearly states it is structured CR approval
  regression only.
- Unit and live smoke assertions fail unless the expected
  `reference-baseline:*` ids are present and passing.
- Approval baseline owns `capabilityActionApproval`, `mcpActionInbox`, preload
  APIs, and `XenesisAgentPane` inline approval cards for pending, approve,
  reject, redaction, and Action Inbox audit readback.
- Approval-required baseline calls create real records with `approved=false`;
  chat-only approval text is not evidence.
- `[[Reference Adoption Map Proposal]]` records borrowed, adapted, and rejected
  OpenClaw/Hermes patterns.
- No provider natural-language CR claim is made from the fenced action smoke.

## Verification

```powershell
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs
node --test src\main\mcpActionInbox.test.mjs
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
npm run typecheck
npm run build
node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json
node .\scripts\xenesisReviewRequestApprovalLiveSmoke.mjs --json
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
