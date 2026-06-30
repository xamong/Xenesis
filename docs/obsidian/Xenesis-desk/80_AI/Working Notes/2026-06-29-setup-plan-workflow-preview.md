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
  - "docs/manual/10-openclaw-channel-setup.md"
  - "docs/manual/11-external-tool-integrations.md"
---

# Setup Plan Workflow Preview

## Objective

Expose provider, external tool, and external messenger setup plans as
read/open-only workflow previews in the Connection Center.

## Scope Boundary

- Reuses the existing `xd.automation.workflow.preview` /
  `xd.automation.workflow.run` contract.
- Adds preview metadata to setup-plan read models only.
- Preview steps include only setup-plan steps whose kind is `read` or `open`.
- Request/apply steps remain separate explicit CR actions.
- No natural-language routing, keyword matching, prompt heuristics, OAuth
  completion, token storage, MCP config writes, provider tool execution,
  message sending, gateway lifecycle action, profile mutation, external system
  mutation, or approval bypass.

## Implementation Notes

- Shared connection models now use a generic
  `XenesisConnectionWorkflowPreview`/`XenesisConnectionWorkflowStep` shape.
- User-story workflow preview types remain compatible aliases.
- Setup-plan previews are built from the existing ordered setup-plan step
  metadata, not from user prompt text.
- Settings renders a `Preview setup workflow` / `설정 워크플로 미리보기` button
  when a card exposes setup-plan workflow preview metadata.
- Commit: `Add setup plan workflow previews`.

## Verification So Far

- RED: `npx tsx --test src\shared\xenesisConnections.test.ts` failed because
  setup plans did not expose `workflowPreview`.
- GREEN: `npx tsx --test src\shared\xenesisConnections.test.ts` passed 45/45.
- RED: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed because `buildXenesisSetupPlanWorkflowPreviewRequest` was missing.
- GREEN: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed 73/73.
- GREEN: `npm run typecheck` passed.
- GREEN: `npm --prefix packages/xenesis run typecheck` passed.
- GREEN: `npm --prefix packages/xenesis test` passed 81 files / 372 tests.
- GREEN: `npm --prefix packages/xenesis run build` passed.
- GREEN: `npm run build` passed, with existing Vite warnings.
- GREEN: `git diff --check` exited 0 with LF/CRLF normalization warnings only.
- GREEN: scoped Biome check passed for changed TS/TSX/i18n files.
- GREEN:
  `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 11/11.
- GREEN:
  `npm --prefix packages/xenesis exec vitest run src/core/intentRouter.test.ts src/workflows/xenisPolicy.test.ts`
  passed 2 files / 6 tests.
- GREEN:
  `npm --prefix packages/xenesis exec vitest run src/providers/cliProvider.deskMcp.test.ts src/core/AgentRuntimeFactory.modeMessages.test.ts`
  passed 2 files / 4 tests.

## Known Verification Gaps

- `npm run lint` fails repo-wide with existing Biome diagnostics outside this
  slice; scoped Biome check for changed TS/TSX/i18n files passes.
- `npm run check:public-release` fails because
  `.github/workflows/ci.yml` is missing in this public-release worktree.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Touches [[module-capability-registry]]
