---
type: working-note
status: implemented
updated: 2026-06-28
tags:
  - xenesis-desk
  - capability-registry
  - connection-center
  - setup
---

# Connection Setup Apply

## Objective

Add a CR-first setup request apply orchestrator for generic connection setup
requests such as `Notion 연결 설정 적용해줘`.

## Implemented

- Added `xd.xenesis.connections.setupRequests.apply` as a write capability with
  `when-external` approval.
- Exposed setup apply only when a Connection Center item already has a ready
  delegated apply path.
- Added a main-process handler that delegates to existing safe paths:
  `xd.xenesis.tools.mcpInstallDrafts.apply`,
  `xd.xenesis.channels.profileDrafts.apply`, or
  `xd.xenesis.providers.profileDrafts.apply`.
- Added a renderer helper and Settings button for approval-gated setup apply.
- Routed generic setup apply natural language to the setup apply path while
  keeping explicit MCP/channel/provider draft apply prompts on their specialized
  paths.
- Kept planned OAuth tools such as Google Calendar without setup apply.

## Safety Boundaries

- Setup apply does not create new writer logic; it delegates to existing
  approval-gated apply handlers.
- Planned OAuth, token storage, provider tool execution, messages, and external
  system mutations remain blocked.
- Setup apply returns a redacted orchestration readback and selected delegate
  path.

## Focused Verification

- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
  36/36.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed 80/80.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed 38/38.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
  5/5.

## Broad Verification

- Combined focused tests passed 154/154.
- Natural Desk routing live smoke passed 156/156, including
  `connection-setup-apply-approval`.
- `npm run typecheck`, `npm run docs:capabilities:audit`, `npm run build`,
  `npm --prefix packages/xenesis test`, `npm --prefix packages/xenesis run
  typecheck`, `npm --prefix packages/xenesis run build`, and `git diff --check`
  passed.

## Known Gaps

- Repo-wide `npm run lint` still fails on existing Biome diagnostics outside
  this slice; touched-file Biome check passed.
- `npm --prefix packages/xenesis run provider:smoke` is blocked by missing
  `OPENAI_API_KEY`.
- `npm run check:public-release` is blocked by the existing missing
  `.github/workflows/ci.yml` infra gap.
