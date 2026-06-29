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
  - "[[Final Goal Overall Spec]]"
  - "[[Final Goal Slice Spec Index]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[Capability Registry Architecture]]"
verified_by:
  - "[[Verification Map]]"
---

# Slice Spec 05 User Stories Guides

## Goal

Turn provider, tool, messenger, onboarding, and troubleshooting work into
user-facing guide workflows and CR-backed user-story contracts without executing
unsafe actions during preview.

## Scope

- Manual docs for onboarding, external tools, OpenClaw-style channel setup, and
  agent user stories.
- User-story contracts for tools and channels.
- Setup-plan and user-story workflow preview metadata.
- Settings UI action buttons that trigger preview requests only.
- Completion evidence, approval boundaries, readback paths, open paths, and
  safety boundaries.

## Reference Intake

- `F:\agent-anal\analysis\_xenesis-gap-shared-context.md`
- `F:\agent-anal\analysis\openclaw-main\11-gateway-ui.md`
- `F:\agent-anal\analysis\hermes-agent-main\08-channels-ui.md`
- `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`

Original source anchors are selected per guide from the matching OpenClaw or
Hermes source files referenced by the active tool/channel slice.

## Candidate Files

- `src/shared/xenesisConnections.ts`
- `src/shared/xenesisConnections.test.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `src/renderer/panes/xenesisConnectionCenter.test.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `src/renderer/i18n/en.ts`
- `src/renderer/i18n/ko.ts`
- `docs/manual/09-onboarding-connections.md`
- `docs/manual/10-openclaw-channel-setup.md`
- `docs/manual/11-external-tool-integrations.md`
- `docs/manual/12-agent-user-stories.md`
- `handoff.md`

## Acceptance

- Each user-story contract exposes open path, open args, readback paths,
  approval boundaries, completion evidence, safety boundary, and workflow
  preview metadata.
- Workflow preview uses `xd.automation.workflow.preview` and includes read/open
  steps only.
- Preview steps use `approved=false`.
- Preview does not run provider tools, send messages, mutate external systems,
  store tokens, write MCP config, start gateways, mutate profiles, or bypass
  approvals.
- Manual docs describe verified CR surfaces and known gaps without claiming
  unverified natural-language behavior.

## Verification

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npm run typecheck
git diff --check
```

If CR paths or dispatcher behavior change:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npm run docs:capabilities:audit
```

## Out Of Scope

- Running workflow previews as real workflows.
- Adding deterministic natural-language workflow selection.
- Real external system mutation.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Capability Registry Architecture]]
- Verified by [[Verification Map]]
