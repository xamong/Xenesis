---
status: implemented
slice: shared-natural-workflow-preview-action
date: 2026-06-29
---

# Shared Natural Workflow Preview Action

## Objective

Remove local user-story workflow preview action object construction from
`src/shared/xenesisNaturalLanguageActionResolvers.ts` so natural-language CR
action shaping stays in the shared capability catalog.

## Implementation

- Added `buildXenesisNaturalUserStoryWorkflowPreviewAction` in
  `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`.
- Reused `buildXenesisConnectionUserStoryWorkflowPreviewArgs` for the workflow
  preview CR payload.
- Refactored
  `xenesisConnectionUserStoryWorkflowPreviewActionFromNaturalText` so the
  resolver resolves the preview target and delegates action construction.
- Added planner/source-ownership guards in
  `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  to prevent this action shaping from moving back into the resolver.

## Verification

- RED:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed 48/50 before the shared helper existed.
- GREEN focused:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 50/50.
- Smoke fixture:
  `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- Typecheck:
  `npm run typecheck` passed.
- CR audit:
  `npm run docs:capabilities:audit` passed with 796 nodes and 689 coverage path
  references; missing registered paths, missing dispatched coverage paths,
  undispatched static callable methods, and dispatcher paths missing from tree
  were all 0.
- Build:
  `npm run build` passed with existing Vite warnings.
- Live natural Desk routing smoke:
  `npm run smoke:xenesis:natural-desk-routing` passed 261/261.
- Focused Biome:
  `npx biome check --formatter-enabled=true --linter-enabled=true --assist-enabled=true src/shared/xenesisNaturalLanguageCapabilityCatalog.ts src/shared/xenesisNaturalLanguageActionResolvers.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
  passed.
