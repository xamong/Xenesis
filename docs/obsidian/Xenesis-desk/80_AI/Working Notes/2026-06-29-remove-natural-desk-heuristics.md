# Remove Natural Desk Heuristics

## Objective

Remove deterministic pre-provider natural-language Desk routing from Xenesis Agent.
Ordinary natural Desk-control prompts now proceed to the provider path; only explicit
`xenesis-desk-action(s)` CR payloads can run directly before provider execution.

## Changes

- Removed Agent-pane natural routing branch and `bypassNaturalDeskRouting` plumbing.
- Deleted the natural-language heuristic modules under `src/shared/xenesisNaturalLanguage*`.
- Split explicit Desk action block parsing, summaries, approvals, and protocol constants into
  `src/shared/xenesisDeskActionProtocol.ts`.
- Deleted `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`, its test, and the
  `smoke:xenesis:natural-desk-routing` package script.
- Reworked review-request approval smoke to submit an explicit fenced CR action block.

## Verification

- `npm run typecheck` passed.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 10/10.
- `node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs` passed 7/7.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` passed 69/69.
- `npm run docs:capabilities:audit` passed, 796 nodes and 689 coverage path references.
- Scoped Biome check for the new/small changed files passed.
- Source scan for natural heuristic router names/options in `src`, `scripts`, and `package.json` returned no matches
  outside the guard test.
- `npm run smoke:xenesis:review-request-approval` passed 6/6 with explicit CR block prompt.
- `git diff --check` passed with line-ending warnings only.

## Known Gaps

- Provider-live natural prompt verification is still separate. This slice removes the deterministic router; it does not
  prove the selected provider calls CR/MCP tools for natural Desk-control prompts.
- Full repo lint remains blocked by existing repo-wide Biome diagnostics.
- Public release check remains blocked by missing `.github/workflows/ci.yml` in this repo/worktree.

## Follow-up: Remove Remaining Local Heuristics

### Objective

Tighten the no-heuristics boundary after review feedback: ordinary natural text
and plain raw JSON must not be locally promoted into Desk actions, and queued
handoff priority must not be derived from prompt/label keywords.

### Changes

- Removed the raw JSON fallback in `src/shared/xenesisDeskActionProtocol.ts`.
  Only explicit fenced `xenesis-desk-action(s)` blocks are parsed as local
  direct CR actions.
- Added Agent pane protocol coverage proving plain raw JSON text remains visible
  chat text and does not run directly.
- Removed `packages/xenesis/src/orchestration/handoffPriority.ts` keyword arrays,
  `includes()` matching, and legacy heuristic policy fields.
- Simplified `xenisHandoffPriority` to a uniform `defaultPriority` only.
- Added package coverage proving task priority honors explicit priority first,
  otherwise only the uniform default, regardless of natural task text.

### Verification

- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 11/11.
- `npm --prefix packages/xenesis test -- tests/orchestration/handoffPriority.test.ts`
  passed 4/4.
- `npx biome check ...changed TS files... --max-diagnostics 40` passed after
  one import-order autofix.
- `npm --prefix packages/xenesis run typecheck` passed.
- `npm --prefix packages/xenesis test` passed 81 files / 372 tests.
- `npm run typecheck` passed.
- `git diff --check` passed with line-ending warnings only.
- Source scan for removed natural router names, handoff priority keyword
  classifiers, and raw JSON action fallback markers returned matches only in
  guard tests, not runtime source.
