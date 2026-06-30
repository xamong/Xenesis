# 2026-06-28 Gateway Lifecycle Natural Routing

## Objective

Wire existing Xenesis gateway lifecycle CR paths into deterministic Agent natural-language routing without adding unsafe broad live smoke prompts.

## Changes

- Added natural intent words and routing rules for:
  - `xd.xenesis.gateway.start`
  - `xd.xenesis.gateway.stop`
  - `xd.xenesis.gateway.restart`
- Added prompt hint coverage for those CR paths.
- Added gateway lifecycle visible text so lifecycle requests are reported as gateway control requests.
- Added Agent Desk Control regression tests for Korean/English start, stop, and restart prompts.

## Verification

- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` -> passed 41/41.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` -> passed 6/6.
- `npm run typecheck` -> passed.
- `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\shared\xenesisNaturalLanguagePlanResolvers.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` -> passed.
- `npm run docs:capabilities:audit` -> passed.
- `rg -n "Missing|Undispatched|Dispatcher paths missing" docs\capability-registry-audit.md` -> all four audited gap counts are 0.
- `npm run smoke:xenesis:natural-desk-routing` -> passed 180/180.

## Notes

- Temporary live smoke cases for gateway start/stop/restart were removed after debug evidence showed the current development CR `control` policy can execute the mutable gateway lifecycle paths instead of producing a safe approval stop.
- Keep broad smoke on non-mutating/read/open and existing safe approval cases until there is a dry-run or approval-gated lifecycle smoke path.
- This remains deterministic catalog routing, not model reasoning.
