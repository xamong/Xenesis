# 2026-06-28 Channel Profile Draft Apply

## Objective

Add a CR-first, approval-gated apply path for implemented external messenger
channel profile drafts.

## Scope

- New CR path: `xd.xenesis.channels.profileDrafts.apply`
- Implemented channels only: `telegram`, `slack`, `discord`, `webhook`
- Writes only profile channel settings after CR approval.
- Does not store raw secrets, update secret stores, start gateways, send test
  messages, or mutate planned adapters.

## Implementation

- Registry and dispatcher added in `src/shared/deskBridgeCapabilities.ts`.
- Redacted merge/validation helper added in
  `src/shared/xenesisChannelProfileApply.ts`.
- Main-process adapter handler added in `src/main/index.ts`.
- Main apply handler merges against the requested target profile's current
  channel settings when `profile`/`profileName` is supplied.
- Connection Center apply request helper and Settings button added in renderer
  panes.
- Natural language route added so the Korean apply prompt for Telegram channel
  settings requests the apply CR path with approval.
- Live natural Desk routing smoke now includes
  `channel-profile-draft-apply-approval`.

## Verification

- `npx tsx --test src\shared\xenesisChannelProfileApply.test.ts src\shared\xenesisConnectionCapabilities.test.ts`
  passed 38/38.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed 77/77.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 38/38.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
  5/5.
- `npx biome check` on touched files exited 0 with warnings/infos only.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed: 767 nodes, 689 coverage path
  references.
- `npm run build` passed.
- `npm run smoke:xenesis:natural-desk-routing` passed 150/150, including the
  new channel profile draft apply approval prompt.
- After the target-profile merge fix, the combined focused TSX test command
  passed 153/153, `npm run build` passed, and live natural Desk routing smoke
  passed 150/150 again.

## Known Gap

Repo-wide `npx biome check . --max-diagnostics=50` still fails on existing
format/lint debt outside this slice: 1150 errors, 419 warnings, 93 infos.
