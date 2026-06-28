---
status: implemented
slice: natural-user-story-workflow-preview-routing
date: 2026-06-29
---

# Natural User Story Workflow Preview Routing

## Objective

Extend the Settings user-story workflow preview contract to Agent
natural-language Desk control. Prompts such as `Notion user story workflow
preview` and `Telegram 사용자 스토리 워크플로 미리보기` should call
`xd.automation.workflow.preview` with the same read/open-only preview metadata
already exposed by the Connection Center.

## Implementation

- Shared resolver:
  - [src/shared/xenesisConnections.ts](../../../../../src/shared/xenesisConnections.ts)
  - `findXenesisConnectionUserStoryWorkflowPreviewTarget(id)` resolves tool and
    messenger ids from the existing Connection Center catalogs and returns a
    cloned `storyContract.workflowPreview`.
- Natural routing:
  - [src/shared/xenesisNaturalLanguageActionResolvers.ts](../../../../../src/shared/xenesisNaturalLanguageActionResolvers.ts)
  - [src/shared/xenesisNaturalLanguagePlanResolvers.ts](../../../../../src/shared/xenesisNaturalLanguagePlanResolvers.ts)
  - [src/shared/xenesisNaturalLanguagePlanner.ts](../../../../../src/shared/xenesisNaturalLanguagePlanner.ts)
  - The route requires both user-story context and workflow-preview context so
    ordinary user-story status prompts continue to read
    `xd.xenesis.tools.userStories.status` or
    `xd.xenesis.channels.userStories.status`.
- Smoke coverage:
  - [scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs](../../../../../scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs)
  - Added Notion tool and Telegram channel workflow preview prompts.

## Safety Boundary

The workflow preview action copies only:

- `name`
- `description`
- `delayMs`
- `stopOnFail`
- `steps`

The preview steps remain `approved=false` and read/open-only. They must not
include provider tool execution, channel tests, sends, request paths, apply
paths, creates, updates, or deletes.

## Verification

- RED:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Failed because the shared workflow preview resolver and natural route did
    not exist.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
  - Failed because the smoke expected fixture was stale.
- GREEN:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - Passed 90/90.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
  - Passed 6/6.
