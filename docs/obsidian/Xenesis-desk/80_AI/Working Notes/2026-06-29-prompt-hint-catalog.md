# Prompt Hint Catalog Ownership

## Objective

Continue the larger hardcoding cleanup by moving Desk control prompt-hint policy,
examples, and discovery-prefix ownership out of the broad natural-language
catalog and into a focused prompt-hint catalog.

## Context

- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
  is a re-export facade.
- Prompt assembly now lives in `src/shared/xenesisDeskControlPromptHint.ts`.
- Prompt policy/examples/discovery prefixes now live in
  `src/shared/xenesisDeskControlPromptHintCatalog.ts`.
- Connection Center callable path summaries are still generated from the
  Capability Registry via `listDeskBridgeCapabilities()`.

## Files

- `src/shared/xenesisDeskControlPromptHintCatalog.ts`
- `src/shared/xenesisDeskControlPromptHint.ts`
- `src/shared/xenesisNaturalLanguageCatalog.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`
- `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
- `docs/manual/09-onboarding-connections.md`
- `handoff.md`

## Verification

- RED:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed before `xenesisDeskControlPromptHintCatalog.ts` existed.
- GREEN:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 45/45.
- Smoke inventory:
  `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- Typecheck:
  `npm run typecheck` passed.
- CR audit:
  `npm run docs:capabilities:audit` passed; missing registered paths, missing
  dispatched coverage paths, undispatched static callable methods, and
  dispatcher paths missing from tree are all 0.
- Live smoke:
  `npm run smoke:xenesis:natural-desk-routing` passed 219/219 and
  `npm run smoke:xenesis:connection-center` passed 6/6.
- Build:
  `npm run build` passed.
- Lint:
  changed-file Biome passed; full `npm run lint` remains blocked by existing
  repo-wide Biome diagnostics outside this slice.

## Boundaries

- This does not add OAuth execution, token storage, MCP install execution,
  provider tool execution, messenger delivery, or external-system mutation.
- Deterministic prompt policy remains deterministic catalog behavior, not model
  reasoning.
- The Capability Registry and dispatcher coverage remain executable truth.
