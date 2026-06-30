---
type: agent-handoff
repo: xenesis-desk
status: verified-known-gaps
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: high
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[module-capability-registry]]"
touches:
  - "src/shared/xenesisConnections.ts"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "src/renderer/panes/SettingsPane.tsx"
  - "docs/manual/09-onboarding-connections.md"
---

# Onboarding Workflow Preview

## Objective

Expose first-run onboarding plans as read/open-only workflow previews in the
Connection Center.

## Scope Boundary

- Reuses the existing `xd.automation.workflow.preview` /
  `xd.automation.workflow.run` contract.
- Adds preview metadata to onboarding plan read models only.
- Preview steps include only guided steps whose kind is `read` or `open`.
- `control` guided steps remain separate explicit CR actions.
- No natural-language routing, keyword matching, prompt heuristics, provider
  settings mutation, MCP install/config writes, OAuth completion, token storage,
  gateway lifecycle execution, profile mutation, message sending, provider tool
  execution, external system mutation, or approval bypass.

## Implementation Notes

- `XenesisConnectionOnboardingPlanTemplate` now exposes
  `workflowPreview: XenesisConnectionWorkflowPreview`.
- The preview is built from the existing onboarding `guidedSteps` metadata, not
  from user prompt text.
- Gateway start/restart, profile channel updates, and sanitized test sends are
  excluded because they are `control` steps.
- Settings renders a `Preview onboarding` / `온보딩 미리보기` button when a card
  exposes onboarding workflow preview metadata.
- Commit: `Add onboarding workflow previews`.

## Verification So Far

- RED: `npx tsx --test src\shared\xenesisConnections.test.ts` failed because
  onboarding plans did not expose `workflowPreview`.
- GREEN: `npx tsx --test src\shared\xenesisConnections.test.ts` passed 45/45.
- RED: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed because `buildXenesisOnboardingWorkflowPreviewRequest` was missing.
- GREEN: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed 74/74.
- GREEN: scoped Biome check passed for changed TS/TSX/i18n files.
- GREEN: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 11/11.
- GREEN: `npm --prefix packages/xenesis exec vitest run src/core/intentRouter.test.ts src/workflows/xenisPolicy.test.ts`
  passed 2 files / 6 tests.
- GREEN: `npm run typecheck` passed.
- GREEN: `npm --prefix packages/xenesis run typecheck` passed.
- GREEN: `npm --prefix packages/xenesis test` passed 81 files / 372 tests.
- GREEN: `npm --prefix packages/xenesis run build` passed.
- GREEN: `npm run build` passed, with existing Vite warnings.
- GREEN: `git diff --check` exited 0 with LF/CRLF normalization warnings only.

## Known Verification Gaps

- Repo-wide `npm run lint` has existing Biome diagnostics outside this slice;
  scoped Biome check for changed TS/TSX/i18n files passes.
- `npm run check:public-release` is still expected to fail in this worktree
  because `.github/workflows/ci.yml` is missing.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Touches [[module-capability-registry]]
