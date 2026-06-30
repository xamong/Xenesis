# 2026-06-29 Messenger View Sections

## Objective

Make `xd.xenesis.messengers.views.status/open` address external messenger views
down to internal Desk sections without creating a new UI subsystem.

## Context

- Canonical code remains the repo source and CR audit output.
- This note records AI working context only.
- No external web research was used for this slice.

## Implemented

- Added shared messenger view section ids and detail-focus mapping:
  `connection-card`, `setup`, `channel-template`, `routing`, `safety`,
  `access-groups`, `pairing`, `setup-plan`, `profile-draft`, `user-stories`.
- Added `messengerView.viewSections` to the Connection Center read model.
- Added optional `section` args to `xd.xenesis.messengers.views.open`.
- Mapped valid sections to existing Connection Center detail-focus blocks.
- Rendered messenger section summaries and exact open args in Settings.
- Routed prompts such as `텔레그램 routing view 열어줘` and
  `슬랙 profile draft view 열어줘` to messenger view section opens.

## Safety

Messenger view sections are read/open planning surfaces only. They do not start
gateways, create pairing or device-link sessions, store secrets, mutate channel
profiles, update allowlists, execute provider tools, or send messages.

## Verification

- `npx tsx --test src\shared\xenesisConnections.test.ts`
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
- `npm run typecheck`
- `npm run docs:capabilities:audit`
- `rg -n "Missing registered paths|Missing dispatched coverage paths|Undispatched static callable methods|Dispatcher paths missing from tree" docs\capability-registry-audit.md`
- `npm run build`
- `npm run smoke:xenesis:natural-desk-routing`
- Changed-file `npx biome check ... --max-diagnostics 100`
- `git diff --check`

Results: focused tests passed, typecheck passed, CR audit gap counters were all
0, build passed, natural Desk routing smoke passed 210/210, changed-file Biome
exited 0 with existing warnings/infos only, and diff check reported only Git
LF/CRLF normalization warnings.
