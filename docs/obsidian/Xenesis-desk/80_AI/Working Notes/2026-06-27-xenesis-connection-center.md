---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-27
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[MCP Bridge Architecture]]"
  - "[[Provider Model]]"
touches:
  - "src/shared/xenesisConnections.ts"
  - "src/shared/xenesisConnections.test.ts"
  - "src/shared/deskBridgeCapabilities.ts"
  - "src/main/index.ts"
  - "src/renderer/panes/SettingsPane.tsx"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "src/renderer/panes/xenesisConnectionCenter.test.ts"
  - "docs/manual/09-onboarding-connections.md"
---

# Xenesis Connection Center Working Note

## Objective

Add a CR-first Connection Center for Xenesis Agent onboarding, provider setup,
MCP/tool readiness, gateway status, external messenger readiness, and guide docs.

## Direction

This work supports [[Final Goal]] by making setup state discoverable through the
Capability Registry instead of only through separate renderer settings panels.

## Current First Slice

- Add `xd.xenesis.connections.status`.
- Add shared status aggregation.
- Add a Settings Connection Center tab.
- Add public manual docs.
- Keep mutating behavior on existing CR paths.

## Current Recipe Slice

- Add setup recipe metadata to connection cards.
- Add CR-first Settings actions for provider, MCP, gateway, and messenger setup
  targets.
- Add guide-card action requests for repo-local docs.
- Keep Fetch, Filesystem, GitHub, Notion, Linear, Telegram, Slack, Discord, and
  webhook as manual/actionable setup recipes.
- Keep Google Workspace, Google Calendar, Google Chat, Microsoft Teams, and
  WhatsApp as planned/manual cards until verified runtime or MCP templates are
  selected.

## Current Onboarding Checklist Slice

- Add a first-class `onboarding` section to `xd.xenesis.connections.status`.
- Keep the checklist derived from the same provider, local CLI, MCP, tool,
  gateway, messenger, and guide cards so it is not a parallel source of truth.
- Ordered checklist items: first chat, local CLI and MCP, recommended tools,
  gateway, messenger routing, and end-to-end test send.
- Checklist cards reuse existing CR-backed settings and guide actions.

## Current Channel Guardrails Slice

- Expose implemented per-channel routing guardrails for Telegram, Slack,
  Discord, and webhook: `approvalMode`, `maxTurns`, and `maxTokens`.
- Keep CR writes on `xd.xenesis.profiles.updateChannels`; the schema now shows
  the guardrail fields for each implemented channel.
- Add Settings > Xenesis Agent > External bots controls for the same guardrails.
- Treat OpenClaw-style richer route bindings/default-agent concepts as not yet
  implemented until Xenesis runtime config, dispatcher behavior, and live
  verification exist.

## Current Verification

- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed for the recipe model, absolute guide-open path regression, and renderer
  request helpers.
- `npm run typecheck` passed after the Settings pane action wiring.
- `npm run docs:capabilities:audit` passed with missing registered paths,
  missing dispatched coverage paths, undispatched static callable methods, and
  dispatcher paths missing from tree all at 0.
- `npm run build`, `npm --prefix packages/xenesis run build`, and
  `npm --prefix packages/xenesis test` passed.
- Live Electron smoke verified Connection Center status summary `4/22 ready`,
  planned cards, Notion setup recipe, guide card opening the manual through
  `xd.files.open`, and setup-card navigation to local CLI settings.
- Live Agent pane prompt executed fenced CR action
  `xd.xenesis.connections.status` and rendered summary `total=22`.
- `npm run lint` still fails repo-wide with existing Biome/CRLF/style findings.
- `npm run check:public-release` fails in this worktree because
  `.github/workflows/ci.yml` is absent.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed for the onboarding checklist shared model and renderer section order.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts`
  passed after adding channel guardrail schema/type coverage.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[MCP Bridge Architecture]]
- Depends on [[Provider Model]]
