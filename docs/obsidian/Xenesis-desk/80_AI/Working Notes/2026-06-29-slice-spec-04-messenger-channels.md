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
- `handoff.md`

## Acceptance

- Implemented channels expose setup plan, profile draft, route binding, safety,
  access groups, pairing, runtime readiness, and user-story metadata.
- Route/session behavior uses explicit profile/config/readback state rather
  than prompt keyword routing.
- Profile apply and test-send actions are approval-gated.
- Test-send output is sanitized and does not leak tokens, webhook URLs, or raw
  channel identifiers beyond user-approved diagnostics.
- Channel readback can be verified through CR status paths.

## Verification

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npm run docs:capabilities:audit
npm run typecheck
npm run smoke:xenesis:connection-center -- --json
```

If test-send or approval behavior changes:

```powershell
npm run smoke:xenesis:review-request-approval -- --json
```

## Out Of Scope

- Natural-language router for channel target selection.
- Real production bot deployment or vendor account provisioning.
- External OAuth tool setup.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Approval Flow]]
- Verified by [[Verification Map]]
