# 2026-06-29 Desk Core Natural Routing Surface Specs

## Objective

Derive core Desk natural-language action descriptors and rule groups from a shared Desk action spec.

## Changes

- Added `XENESIS_NATURAL_DESK_ACTION_SPECS`.
- Generated `XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS` from the Desk spec.
- Generated rule arrays for:
  - pane open
  - capture
  - file list/path actions
  - misc read actions
  - active dock focus/close
  - dock sizing
  - window size presets
  - explorer simple/filter/navigate actions
  - terminal list/many/run actions
  - dock arrange/merge actions
  - dock panes list
  - artifact target selection
- Preserved scoped dock close and dock merge rule priority.

## Verification

- RED: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` failed 42/43 before the Desk spec existed.
- GREEN: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` passed 43/43.
- `npm run typecheck` -> passed.
- `npx biome check src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts handoff.md` -> passed for changed files.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` -> passed 6/6.
- `npm run docs:capabilities:audit` -> passed.
- `npm run smoke:xenesis:natural-desk-routing` -> passed 180/180.
- `rg -n "Missing|Undispatched|Dispatcher paths missing" docs\capability-registry-audit.md` -> all audited gap counts are 0.
- `git diff --check` -> passed with CRLF warnings only.
- `npm run lint` -> failed on existing repo-wide Biome diagnostics outside this slice; scoped Biome check passed.

## Notes

- This reduces duplicated deterministic routing data; it does not make routing model reasoning.
- The exported rule array names remain stable for existing resolver call sites.
