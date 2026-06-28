---
status: implemented
slice: shared-user-story-workflow-preview-args
date: 2026-06-29
---

# Shared User Story Workflow Preview Args

## Objective

Remove duplicate workflow preview payload shaping from Settings and Agent
natural-language routing. Both entry points now call one shared Connection
catalog helper before invoking `xd.automation.workflow.preview`.

## Implementation

- Shared helper:
  - [src/shared/xenesisConnections.ts](../../../../../src/shared/xenesisConnections.ts)
  - `buildXenesisConnectionUserStoryWorkflowPreviewArgs(preview)` returns only
    the CR workflow preview input fields: `name`, `description`, `delayMs`,
    `stopOnFail`, and cloned `steps`.
- Settings request:
  - [src/renderer/panes/xenesisConnectionCenter.ts](../../../../../src/renderer/panes/xenesisConnectionCenter.ts)
  - `buildXenesisUserStoryWorkflowPreviewRequest(item)` now delegates payload
    shaping to the shared helper.
- Natural routing:
  - [src/shared/xenesisNaturalLanguageActionResolvers.ts](../../../../../src/shared/xenesisNaturalLanguageActionResolvers.ts)
  - `xenesisConnectionUserStoryWorkflowPreviewActionFromNaturalText(value)` now
    uses the same shared helper.

## Safety Boundary

The shared helper intentionally does not pass `previewPath`, `runPath`, or
`safetyBoundary` into `xd.automation.workflow.preview`. Step args are cloned so
the generated request cannot mutate the catalog-owned workflow preview
contract.

## Verification

- RED:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Failed 110/112 because the shared args builder did not exist and local
    duplicate builders still existed.
- GREEN:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  - Passed 112/112.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Passed 48/48.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
  - Passed 6/6.
  - `npm run typecheck`
  - Passed.
  - `npm run build`
  - Passed with existing Vite warnings.
  - `npm run docs:capabilities:audit`
  - Passed; audit counters remained all 0.
  - `npm run smoke:xenesis:natural-desk-routing`
  - Passed 261/261.
