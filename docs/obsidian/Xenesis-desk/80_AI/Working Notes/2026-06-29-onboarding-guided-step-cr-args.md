# Onboarding Guided Step CR Args - 2026-06-29

## Objective

Expose structured `args` on Xenesis onboarding guided CR steps so Desk setup
readback names the exact Settings category, mode, section, visibility
requirement, or test channel needed for each guided action.

## Context

- Source files:
  - `src/shared/xenesisConnections.ts`
  - `src/renderer/panes/xenesisConnectionCenter.ts`
- Tests:
  - `src/shared/xenesisConnections.test.ts`
  - `src/renderer/panes/xenesisConnectionCenter.test.ts`
- The larger product goal remains a CR-first setup and connection experience
  for provider setup, MCP/tool connections, and external messenger channels.
- No external web browsing was used for this slice.

## Implemented

- Added optional `args` to `XenesisConnectionOnboardingGuidedStep`.
- Derived Settings-open args from existing connection Settings actions:
  `{ category, mode?, section?, ensureVisible: true }`.
- Added args to provider settings, local CLI settings, tool install/user-story
  opens, gateway settings, external bot settings, and sanitized test-send
  guided steps.
- Added an external bot Settings guided step before messenger profile update and
  channel test steps.
- Included `xd.panes.settings.open` in messenger setup control-path metadata
  where explicit Settings review/editing is part of the workflow.
- Connection Center guided step detail now prints args when present.

## Verification

- RED:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed before
    implementation because guided Settings steps did not expose args.
  - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
    before implementation because guided step detail did not include args.
- GREEN and broad checks:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` -> 41/41 passed.
  - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` ->
    54/54 passed.
  - `npm run typecheck` -> passed.
  - `npm run docs:capabilities:audit` -> passed, CR gap counters all 0.
  - `npm run smoke:xenesis:natural-desk-routing` -> 198/198 passed.
  - Changed-file Biome check -> passed.
  - `git diff --check` -> passed with line-ending normalization warnings only.

## Safety

- This slice does not execute OAuth, install MCP servers, mutate provider
  settings, send unsanitized messages, or change external tools.
- Channel test args only identify the selected channel; approval-gated CR send
  safety remains owned by `xd.xenesis.profiles.testChannel`.
