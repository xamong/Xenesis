---
title: Remove Agent Input Heuristics
date: 2026-06-29
type: working-note
status: verified
tags:
  - xenesis-desk
  - agent-pane
  - capability-registry
  - dehardcoding
---

# Remove Agent Input Heuristics

## Objective

Remove the remaining hardcoded natural-language/regex routing in the Xenesis
Agent pane and related provider prompt guidance. Ordinary user text should reach
the configured provider. Desk execution before provider output is allowed only
for explicit structured `xenesis-desk-action` blocks or explicit UI/test
approval controls.

## Findings

- `xenesisAgentInputRouting.ts` still classified approval words, Markdown-save
  requests, artifact requests, greetings, language follow-ups, and general agent
  questions through regexes.
- `XenesisAgentPane.tsx` used `isXenesisApprovalIntent()` to auto-approve
  pending Desk actions and pending Markdown saves before provider execution.
- `src/main/index.ts` testing submit helper clicked approval buttons when the
  prompt matched a hardcoded approval-word regex.
- `packages/xenesis/src/core/AgentRuntimeFactory.ts` still had a system prompt
  line telling the provider to infer Desk surfaces from an ordinary-word list.

## Plan

- Add source guard tests that fail while the classifier/regex/prompt wording
  exists.
- Delete renderer input classifier usage and dead pending Markdown-save natural
  approval path.
- Replace smoke approval with explicit `approvePendingAction` test args.
- Replace provider prompt word-list guidance with CR discovery guidance.

## Verification

- RED guard:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed while `XenesisAgentPane.tsx` still imported
  `xenesisAgentInputRouting`.
- RED guard:
  `npm --prefix packages/xenesis exec vitest run src/core/AgentRuntimeFactory.modeMessages.test.ts`
  failed while `AgentRuntimeFactory.ts` still contained
  `Infer the intended Desk surface`.
- GREEN focused tests passed:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - `node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs`
  - `npm --prefix packages/xenesis exec vitest run src/core/AgentRuntimeFactory.modeMessages.test.ts`
- Broad checks passed:
  - `npm run typecheck`
  - `npm --prefix packages/xenesis run typecheck`
  - `npm --prefix packages/xenesis test` (367/367)
  - `npm run docs:capabilities:audit`; audit counters all 0
  - `npm --prefix packages/xenesis run build`
  - `npm run build`
  - `npm run smoke:xenesis:review-request-approval` (6/6)
  - `npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke` (6/6)
  - `$env:XENESIS_PROVIDER='mock'; npm --prefix packages/xenesis run provider:smoke` (6/6)
- Production/source scan excluding test files found no matches for the removed
  classifier, approval-word regex, ordinary-word prompt guidance, or
  prompt-specific visual/server regex gates.
