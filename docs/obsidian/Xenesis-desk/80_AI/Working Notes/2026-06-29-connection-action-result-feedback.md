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
  - "src/renderer/panes/xenesisConnectionCenter.test.ts"
  - "src/renderer/panes/SettingsPane.tsx"
  - "src/renderer/i18n/en.ts"
  - "src/renderer/i18n/ko.ts"
  - "docs/manual/12-agent-user-stories.md"
---

# Connection Action Result Feedback

## Context

Settings user-story cards can now call `xd.automation.workflow.preview`, but the
shared Connection Center CR handler previously surfaced only failures. A
successful preview call could validate the workflow payload without leaving a
visible result in the Settings surface.

## Change

This slice adds `formatXenesisConnectionActionResultSummary` and stores the last
Connection Center CR action result in `SettingsPane`. Workflow preview responses
show the CR path, status, workflow step count, and rejected-step count. Generic
failures show the CR path, failed status, and error/message detail. Settings
renders the last result near the Connection Center status summary.

## Safety Boundary

This is a renderer feedback change. It does not add a new CR path, change
workflow allowlists, run workflows, send external messages, or apply setup
drafts. Existing approval boundaries remain unchanged.

## Verification

- RED renderer: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed because the formatter and Settings state/render wiring were missing.
- GREEN renderer: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed 68/68 after adding the formatter and Settings last-action display.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Touches [[module-capability-registry]]
