---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[module-capability-registry]]"
touches:
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "src/renderer/panes/SettingsPane.tsx"
  - "src/renderer/i18n/en.ts"
  - "src/renderer/i18n/ko.ts"
  - "docs/manual/12-agent-user-stories.md"
---

# Settings User Story Workflow Preview Request

## Context

`storyContract.workflowPreview` made user-story workflow preview metadata
available in the shared model. Settings still only displayed that metadata and
did not provide a CR action to validate the workflow preview payload.

## Change

This slice adds `buildXenesisUserStoryWorkflowPreviewRequest`, which accepts a
tool or channel `XenesisConnectionItem`, finds the user-story contract, and
builds a `xd.automation.workflow.preview` request. Settings now renders a
shared "Preview workflow" action for tool and channel user-story cards and
routes it through the existing `handleXenesisConnectionRequest` CR caller.

## Safety Boundary

The Settings action previews only. It passes `approved=false` and sends the
read/open workflow input to `xd.automation.workflow.preview`; it does not call
`xd.automation.workflow.run`, execute provider tools, send channel messages, or
invoke apply/test/send paths.

## Verification

- RED renderer: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed because the helper and Settings source references were missing.
- Helper GREEN / Settings RED: the helper test passed after adding
  `buildXenesisUserStoryWorkflowPreviewRequest`; Settings source assertion
  still failed.
- GREEN renderer: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed 67/67 after wiring Settings and i18n.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Touches [[module-capability-registry]]
