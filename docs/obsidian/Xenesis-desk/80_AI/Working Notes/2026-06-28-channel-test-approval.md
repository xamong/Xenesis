---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-28
touches:
  - "[[Capability Registry]]"
  - "[[Xenesis Agent Pane]]"
  - "[[Approval System]]"
verified_by:
  - "[[Verification Map]]"
---

# Channel Test Approval

## Summary

Implemented external messenger channel test sends are now treated as approval-gated CR writes.

- `xd.xenesis.profiles.testChannel` is a `write` capability with `approval: when-external`.
- Callers only need `{ channel }`; the main process infers the selected profile channel settings when `channels` is omitted.
- Test sends require the selected channel to be enabled and return redacted target readback.
- Connection Center exposes a ready implemented-messenger "send test" request button.
- Natural language such as `텔레그램 테스트 메시지 보내줘` maps to `xd.xenesis.profiles.testChannel` with `approved:false`.

## Source Links

- `src/shared/deskBridgeCapabilities.ts`
- `src/main/index.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `src/shared/xenesisNaturalLanguageCatalog.ts`
- `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`
- `src/shared/xenesisNaturalLanguageActionResolvers.ts`
- `src/shared/xenesisNaturalLanguagePlanResolvers.ts`
- `src/shared/xenesisNaturalLanguagePlanner.ts`
- `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`

## Verification

Passed:

- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
- `npm run typecheck`
- `npm run docs:capabilities:audit`
- `npm run build`
- `npm run smoke:xenesis:natural-desk-routing` (159/159, including `channel-test-send-approval`)
- `npm --prefix packages/xenesis test`
- `npm --prefix packages/xenesis run typecheck`
- `npm --prefix packages/xenesis run build`
- `git diff --check`

Known existing gaps:

- `npm run lint` fails repo-wide on existing Biome/CRLF diagnostics.
- `npm --prefix packages/xenesis run provider:smoke` requires `OPENAI_API_KEY`.
- `npm run check:public-release` fails because `.github/workflows/ci.yml` is absent.

## Graph Links

- Touches [[Capability Registry]]
- Touches [[Xenesis Agent Pane]]
- Touches [[Approval System]]
- Verified by [[Verification Map]]
