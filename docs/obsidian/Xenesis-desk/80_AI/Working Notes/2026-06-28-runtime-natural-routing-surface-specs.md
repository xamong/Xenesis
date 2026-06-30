# 2026-06-28 Runtime Natural Routing Surface Specs

## Objective

Derive runtime natural-language action descriptors and rule groups from a shared runtime action spec.

## Changes

- Added `XENESIS_NATURAL_RUNTIME_ACTION_SPECS`.
- Generated `XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS` from the runtime spec.
- Generated rule arrays for:
  - Agent readback and submit
  - run start
  - workspace set
  - runtime support
  - gateway actions
  - runtime inventory
  - profile inventory
  - runtime control
- Preserved existing ids, CR paths, reasons, context words, blocked words, and route order, including gateway restart before start.

## Verification

- RED: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` failed 41/42 before the runtime spec existed.
- GREEN: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` passed 42/42.
- `npm run typecheck` -> passed.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` -> passed 6/6.
- `npm run docs:capabilities:audit` -> passed.
- `npm run smoke:xenesis:natural-desk-routing` -> passed 180/180.
- `rg -n "Missing|Undispatched|Dispatcher paths missing" docs\capability-registry-audit.md` -> all audited gap counts are 0.
- `git diff --check` -> passed with CRLF warnings only.

## Notes

- This reduces duplicated deterministic routing data; it does not make routing model reasoning.
- Gateway lifecycle prompts remain excluded from broad live smoke because current development CR control paths can mutate gateway state.
