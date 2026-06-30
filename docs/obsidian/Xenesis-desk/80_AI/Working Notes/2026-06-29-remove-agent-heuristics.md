# 2026-06-29 Remove Agent Heuristics

## Objective

Remove deterministic natural-language and keyword heuristic processing from Xenesis Agent-adjacent paths so ordinary user text is handled by the selected provider/runtime.

## Scope

- Removed natural prompt routing helpers for visible subagent demos and control-demo suite selection.
- Removed natural artifact auto-routing from the XCON artifact engine.
- Removed prompt keyword based max-turn extension from `packages/xenesis/src/core/AgentRunnerBuilder.ts`.
- Removed local follow-up classification and contextual prompt rewriting from Agent chat history, artifact context, run request construction, and pane stream logging.
- Kept explicit slash commands, explicit fenced `xenesis-desk-action` CR payloads, and explicit `--flag` slash-option parsing.

## Touched Areas

- `packages/xenesis/src/core/AgentRunnerBuilder.ts`
- `packages/xenesis/src/core/AgentRunnerBuilder.test.ts`
- `src/renderer/artifacts/xconArtifactEngine.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentArtifactContext.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentChatHistory.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentRunRequest.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentVisibleSubagentsDemo.ts`

## Verification

- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentVisibleSubagentsDemo.test.ts src\renderer\artifacts\xconArtifactEngine.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentArtifactContext.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentChatHistory.test.ts` -> passed 45/45.
- `npx vitest run src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentRunRequest.test.ts` -> passed 1 file / 2 tests.
- `npm --prefix packages/xenesis exec vitest run src/core/AgentRunnerBuilder.test.ts src/core/intentRouter.test.ts src/workflows/xenisPolicy.test.ts src/core/AgentRuntimeFactory.modeMessages.test.ts` -> passed 4 files / 10 tests.
- `npm run typecheck` -> passed.
- `npm --prefix packages/xenesis run typecheck` -> passed.
- `npm --prefix packages/xenesis test` -> passed 81 files / 372 tests.
- `npm --prefix packages/xenesis run build` -> passed.
- `npm run build` -> passed; existing Vite warnings remained for `hwp.js` browser `fs` externalization and mixed dynamic/static import of `src/renderer/deskBridge.ts`.
- Focused changed-file Biome check -> exit 0 with two existing optional-chain warnings in `XenesisAgentPane.tsx`.
- `git diff --check` -> passed; Git printed LF/CRLF normalization warnings only.
- Additional tightening after review: unprefixed visible-subagent option aliases such as `keep-open`, `show-ms`, and `sleep` are no longer parsed as options. `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentVisibleSubagentsDemo.test.ts` -> passed 20/20; focused Biome on the two changed visible-subagent files -> passed; `npm run typecheck` -> passed.

## Known Gaps

- No CR registry or dispatcher paths changed, so CR audit was not rerun for this slice.
- No live Electron Agent-pane smoke was run in this slice; the change removes local pre-provider heuristics and is covered by source guards, focused Agent tests, typechecks, package tests, and builds.
- Explicit Gowoori artifact generation internals still contain their own semantic artifact planning. That path is behind explicit `/artifact` and `/render` entry points, not Agent natural Desk routing.
