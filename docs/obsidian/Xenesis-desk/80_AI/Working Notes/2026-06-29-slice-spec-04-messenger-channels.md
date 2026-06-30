---
type: task
repo: xenesis-desk
aliases:
  - Slice Spec 04 Messenger Channels
status: verification_passed
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

# Slice Spec 04 Messenger Channels

## Goal

Finish CR-backed external messenger setup so Telegram/Discord-style channels
have profile drafts, routing, allowlist/access group state, runtime readiness,
pairing state, safety boundaries, and approval-gated test-send behavior.

## Scope

- Channel setup plans and profile drafts.
- Route binding, stable session key, allowlist/access group model.
- Pairing state and runtime readiness.
- Sanitized test-send path with approval boundary.
- Messenger and channel user-story contracts.

## Reference Intake

- `F:\agent-anal\analysis\openclaw-main\12-channels-routing.md`
- `F:\agent-anal\analysis\openclaw-main\11-gateway-ui.md`
- `F:\agent-anal\analysis\hermes-agent-main\08-channels-ui.md`

Original source anchors:

- `F:\agent-anal\openclaw-main\src\routing\resolve-route.ts`
- `F:\agent-anal\openclaw-main\src\routing\session-key.ts`
- `F:\agent-anal\openclaw-main\src\channels\allowlist-match.ts`
- `F:\agent-anal\openclaw-main\extensions\telegram\src\conversation-route.ts`
- `F:\agent-anal\openclaw-main\extensions\discord\src\target-parsing.ts`
- `F:\agent-anal\hermes-agent-main\gateway\platforms\telegram.py`
- `F:\agent-anal\hermes-agent-main\gateway\platforms\slack.py`

## Candidate Files

- `src/shared/xenesisConnections.ts`
- `src/shared/xenesisConnections.test.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/shared/xenesisConnectionCapabilities.test.ts`
- `src/main/index.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `src/renderer/panes/xenesisConnectionCenter.test.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `docs/manual/10-openclaw-channel-setup.md`
- `scripts/assertCapabilityAuditZero.mjs`
- `handoff.md`

## Acceptance

- Implemented channels expose setup plan, profile draft, route binding, safety,
  access groups, pairing, runtime readiness, and user-story metadata.
- Route/session behavior uses explicit profile/config/readback state rather
  than prompt keyword routing.
- Initial shipped channel set is declared before implementation; reference-only
  channels remain documented as not-ready until CR status and live verification
  exist.
- Profile apply and test-send actions create real approval records with
  `approved=false`.
- Channel approval evidence covers pending, approved, and review-item readback
  for profile apply and test-send.
- Test-send output is sanitized and does not leak tokens, webhook URLs, or raw
  channel identifiers beyond user-approved diagnostics.
- Channel readback can be verified through CR status paths.
- Reference adoption map proposal is updated with borrowed, adapted, rejected,
  and verified channel/reference patterns.

## Verification

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npx tsx --test src\main\xenesisChannelSafety.test.ts
node --test scripts\xenesisChannelApprovalLiveSmoke.test.mjs
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
node --test scripts\xenesisChannelNaturalLanguageLiveSmoke.test.mjs
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
npm run typecheck
npm run build
node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json
node .\scripts\xenesisReviewRequestApprovalLiveSmoke.mjs --json
node .\scripts\xenesisChannelApprovalLiveSmoke.mjs --json
node .\scripts\xenesisChannelNaturalLanguageLiveSmoke.mjs --json
```

The approval smoke must be extended or paired with a channel-specific smoke
before this slice is accepted; a Notion-only approval scenario is not enough for
messenger test-send/profile apply coverage.

Current implementation evidence:

- Task 1 added exact shared read-model aliases for channel routing, safety,
  access groups, pairing, user stories, and setup-preview boundaries.
- Task 2 guarded renderer apply/test-send request builders so they only emit
  approval-gated CR requests for implemented, ready messenger drafts.
- Task 3 added shared dispatcher approval and no-side-effect coverage, including
  profile-install schema parity for `template/name/activate`.
- Task 4 extracted test-send sanitization into
  `src/main/xenesisChannelSafety.ts` and redacts secrets plus raw channel
  targets on error paths.
- Task 5 added the loopback-only channel approval live-smoke harness for
  webhook profile apply and test-send. It validates pending commands before
  approving and rejects unsafe literal target or extra-argument shapes.
- Task 6 added Slice 04 Connection Center snapshot baselines for implemented
  messenger cards, Telegram route/session and access/pairing readbacks, planned
  channel boundaries, and test-send approval controls.
- Task 7 added a natural-language Agent-pane smoke that uses a Korean prompt and
  requires Telegram-scoped provider raw CR/MCP read evidence for
  `xd.xenesis.channels.routing.status` and
  `xd.xenesis.channels.runtime.status`.
- Final live evidence passed after a fresh package/root build:
  `node .\scripts\xenesisChannelNaturalLanguageLiveSmoke.mjs --json` passed
  17/17 with provider `codex-app-server`, process model
  `persistent-process`, provider raw CR/MCP channel evidence present,
  deterministic recovery absent, provider web search absent,
  shell/command fallback absent, no profile mutation, and no test-send or
  delivery path.

Known verification gaps:

- `npm run lint` still has pre-existing repo-wide Biome debt outside this
  slice.
- `npm run check:public-release` is still expected to fail in this worktree
  because `.github/workflows/ci.yml` is missing.

## Out Of Scope

- Natural-language router for channel target selection.
- Real production bot deployment or vendor account provisioning.
- External OAuth tool setup.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Approval Flow]]
- Verified by [[Verification Map]]
