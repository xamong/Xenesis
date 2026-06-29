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
