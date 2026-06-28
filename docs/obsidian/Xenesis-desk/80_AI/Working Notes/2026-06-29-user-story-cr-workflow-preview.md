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
  - "src/shared/xenesisConnections.ts"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "docs/manual/12-agent-user-stories.md"
---

# User Story CR Workflow Preview

## Context

Tool and channel user-story contracts already exposed readback paths, open
paths, approval boundaries, completion evidence, and safety boundaries. They did
not expose a structured CR workflow payload that could be passed to the workflow
preview surface for review.

## Change

This slice adds `storyContract.workflowPreview` to tool and channel user-story
templates. The preview payload names `xd.automation.workflow.preview` and
`xd.automation.workflow.run`, then provides a `DeskBridgeWorkflowInput`-shaped
read/open step list:

- Read each `storyContract.readbackPaths` capability.
- Open the existing user-story Settings surface with `ensureVisible=true`.
- Keep every step `approved=false`.

## Safety Boundary

The preview is metadata only. It must not include approval boundary paths,
apply/send/test-channel paths, provider tool execution, or external system
mutation. Workflow execution remains a separate CR approval-gated action.

## Verification

- RED shared: `npx tsx --test src\shared\xenesisConnections.test.ts` failed
  because `workflowPreview` did not exist.
- GREEN shared: `npx tsx --test src\shared\xenesisConnections.test.ts` passed
  41/41 after deriving previews from `userStoryContract`.
- RED renderer: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed because contract formatters did not surface workflow preview metadata.
- GREEN renderer: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed 66/66 after formatter updates.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Touches [[module-capability-registry]]
