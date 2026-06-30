# 2026-06-29 Prompt Hint No Natural Routing

## Objective

Remove remaining Xenesis Agent prompt-hint wording that implied local deterministic prompt routing before provider execution.

## Changes

- Renamed the prompt-hint static section from `examples-and-natural-routing` to `explicit-desk-action-examples`.
- Replaced stale text saying common Desk requests map to CR paths before the LLM run.
- Kept explicit fenced `xenesis-desk-action` examples and Capability Registry discovery guidance.
- Added guard coverage so the built hint cannot reintroduce `Common natural Desk requests`, `before the LLM run`, `pre-provider`, or the old section id.

## Verification

- RED: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` failed as expected because the built hint still contained `Common natural Desk requests`.
- GREEN: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` passed 11/11.
- `npm run typecheck` passed.
- Focused Biome on `src/shared/xenesisDeskControlPromptHintCatalog.ts` and `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts` passed.
- `git diff --check` passed; Git printed LF/CRLF normalization warnings only.

## Known Gaps

- No CR registry or dispatcher paths changed, so CR audit was not required for this slice.
- No live Electron Agent-pane smoke was run for this prompt text cleanup.
