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
  - "src/shared/types.ts"
  - "src/main/index.ts"
  - "src/preload/index.ts"
  - "src/renderer/App.tsx"
  - "src/renderer/panes/SettingsPane.tsx"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "src/renderer/panes/xenesisConnectionCenter.test.ts"
  - "src/renderer/styles.css"
  - "src/renderer/i18n/en.ts"
  - "src/renderer/i18n/ko.ts"
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

## Current MCP Tool Templates Slice

- Reuse `packages/xenesis/src/extensions/recommendedMcpServers.ts` as the
  source of truth for Fetch, Filesystem, GitHub, Notion, and Linear setup
  metadata.
- Add `mcpTemplate` to actionable tool cards in `xd.xenesis.connections.status`.
- Render server name, transport, command/URL, default tool filters, and
  copy-ready JSON/Codex TOML snippets in Settings > Xenesis Agent >
  Connections.
- Keep Google Workspace and Google Calendar as planned cards with no template or
  install action until a verified OAuth/MCP template is selected.

## Current Messenger Channel Catalog Slice

- Add `channelTemplate` metadata to messenger cards in
  `xd.xenesis.connections.status`.
- Implemented runtime channels remain Telegram, Slack, Discord, and webhook.
  These keep CR write/test actions and Settings targets.
- Planned catalog now includes OpenClaw/Hermes-style channels such as WhatsApp,
  Signal, Microsoft Teams, Google Chat, iMessage, Matrix, IRC, Mattermost,
  Nextcloud Talk, Nostr, Raft, Tlon, Synology Chat, Twitch, LINE, WeChat, QQ
  Bot, Feishu/Lark, Yuanbao, Zalo, Email, SMS, Home Assistant, and ntfy.
- Settings > Xenesis Agent > Connections renders category, adapter, auth/setup
  mode, capabilities, and safety controls for messenger cards.
- Planned cards intentionally expose no CR mutation path until Xenesis gateway
  adapters, auth flows, allowlists, diagnostics, and live verification exist.

## Current Connection Focus Capability Slice

- Add `xd.xenesis.connections.open` as a CR control path with no approval
  requirement. It opens Settings > Xenesis Agent > Connections and focuses a
  specific card by `id`.
- Reuse the existing built-in settings pane IPC bridge with `focusConnectionId`
  instead of adding a parallel renderer control channel.
- Add a renderer helper, card-level `Focus` action, and temporary
  `.is-focused` card state so live smoke can prove the requested
  `data-xenesis-connection="<id>"` card is visible.
- This path is UI control only. It does not mutate provider, MCP, gateway, or
  messenger settings.

## Current Messenger Views Slice

- Add `messengerView` metadata to implemented and planned messenger cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.messengers.views.status` as a read/no-approval CR path for
  internal Desk messenger surfaces, runtime support, setup surface, CR
  open/read/control paths, diagnostics, and safety boundaries.
- Add `xd.xenesis.messengers.views.open` as a control/no-approval CR path that
  opens Settings > Xenesis Agent > Connections and focuses the requested
  messenger card.
- Implemented Telegram, Slack, Discord, and webhook views point back to the
  existing channel update/test CR paths and gateway diagnostics.
- Planned messenger views are planning/readiness surfaces only. They expose no
  gateway adapter, pairing flow, delivery action, or approval bypass until the
  runtime support exists and is verified.
- Settings renders the same read model with
  `data-xenesis-messenger-view="<id>"` for live smoke and agent readback.

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
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed after adding the MCP template read model.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/types.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts`
  passed for touched TS/TSX/i18n files. `src/renderer/styles.css` still has
  existing file-wide Biome specificity/`!important` diagnostics.
- `npm run typecheck`, `npm run docs:capabilities:audit`, `npm run build`, and
  `npm --prefix packages/xenesis run build` passed for the MCP template slice.
- Capability audit counters stayed at 0 for missing registered paths, missing
  dispatched coverage paths, undispatched static callable methods, and
  dispatcher paths missing from tree.
- Live Electron smoke verified Notion `mcpTemplate`, Google Calendar planned/no
  template, five rendered `data-xenesis-mcp-template` blocks, `xd.xenesis.connections.status`
  `ok=true`, and Agent-pane fenced CR execution matching `Desk action completed.`
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed after adding the messenger channel catalog.
- `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/types.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 60`
  passed for touched TS/TSX/i18n files after the channel catalog slice.
- `npm run typecheck`, `npm run docs:capabilities:audit`, and
  `npm run build` passed for the channel catalog slice. CR audit counters
  remained 0.
- Live Electron smoke verified 28 messenger cards, 28 rendered
  `data-xenesis-channel-template` blocks, Signal bridge/pairing metadata,
  Google Chat workspace metadata, `xd.xenesis.connections.status` `ok=true`,
  and Agent-pane fenced CR execution matching `Desk action completed.`
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
  first because `xd.xenesis.connections.open` was not registered/dispatched,
  then passed after implementation with 4/4 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first because `buildXenesisConnectionOpenRequest` did not exist, then passed
  after implementation with 5/5 tests.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first for provider inline ` ```xenesis-desk-action {json}` output,
  then passed after parser support with 20/20 tests.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  passed after adding the connection-card prompt example with 29/29 tests.
- `npm run build` passed after the final parser and Agent prompt-hint updates.
- `npm run docs:capabilities:audit` passed with registered nodes 683,
  callable methods 415, subscribable events 54, dispatcher paths 395, and all
  CR release-gate counters at 0.
- Live Electron smoke passed for direct `xd.xenesis.connections.open`, Agent
  direct fenced action, and provider-only `codex-app-server` Agent prompt. The
  final provider run matched `Desk action completed`, logged
  `xd.xenesis.connections.open`, and left the Notion connection card with
  `sp-info-card is-focused`.

## Current Channel Routing Read Model Slice

- Add `channelTemplate.routing` for implemented Telegram, Slack, Discord, and
  Webhook cards.
- Add `xd.xenesis.channels.routing.status` as a read/no-approval CR path for
  route binding, allowlist fields, pairing/auth, default agent, session scope,
  diagnostics, and delivery features.
- Render the same routing metadata in Settings > Xenesis Agent > Connections
  with `data-xenesis-channel-routing="<id>"`.
- Keep mutation and test-send behavior on the existing profile channel CR
  paths: `xd.xenesis.profiles.updateChannels` and
  `xd.xenesis.profiles.testChannel`.
- `npx tsx --test src\shared\xenesisConnections.test.ts`,
  `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`, and
  `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first for missing routing metadata/path/helper and then passed after
  implementation with 9/9, 5/5, and 6/6 tests respectively.
- Combined targeted tests passed with 20/20 tests.
- Scoped Biome passed after sorting the `src/shared/types.ts` export names.
- `npm run typecheck` passed after narrowing the CR test schema properties.
- `npm run docs:capabilities:audit` passed with registered nodes 686,
  callable methods 416, subscribable events 54, dispatcher paths 396, and all
  CR release-gate counters at 0.
- `npm run build` passed.
- Live Electron smoke passed for direct `xd.xenesis.channels.routing.status`
  (`total=4`), filtered Telegram routing (`routeBinding=telegram.allowedChatIds`),
  Settings DOM `[data-xenesis-channel-routing="telegram"]`, and Agent-pane
  fenced CR execution matching `Desk action completed`.

## Current Tool Setup Read Model Slice

- Add `toolSetup` metadata to Fetch, Filesystem, GitHub, Notion, Linear,
  Google Workspace, and Google Calendar connection cards.
- Add `xd.xenesis.tools.setup.status` as a read/no-approval CR path derived
  from `xd.xenesis.connections.status`.
- Render auth mode, data scopes, write scopes, credential storage,
  verification steps, CR readback paths, and risk controls in Settings >
  Xenesis Agent > Connections with `data-xenesis-tool-setup="<id>"`.
- Keep Google Workspace and Google Calendar planned: no install action and no
  bundled MCP template until OAuth scopes, token storage, and a verified MCP
  server template are tested.
- `npx tsx --test src\shared\xenesisConnections.test.ts`,
  `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`, and
  `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first for missing `toolSetup`, CR path, and helper, then passed after
  implementation.
- Combined targeted tests passed with 23/23 tests.
- Scoped Biome passed after import/export ordering was fixed.
- `npm run typecheck`, `npm run docs:capabilities:audit`, and
  `npm run build` passed. CR audit counters stayed at 0 for missing registered
  paths, missing dispatched coverage paths, undispatched static callable
  methods, and dispatcher paths missing from tree.
- Live Electron smoke passed for direct `xd.xenesis.tools.setup.status`,
  filtered Google Calendar setup, Settings DOM
  `[data-xenesis-tool-setup="google-calendar"]`, and Agent-pane fenced CR
  execution matching `Desk action completed`.
- `npm run check:public-release` still fails because
  `.github/workflows/ci.yml` is absent in this worktree.

## Current Provider Setup Read Model Slice

- Add `providerSetup` metadata to the active provider card in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.providers.setup.status` as a read/no-approval CR path derived
  from the Connection Center provider section.
- Render provider identity, model, auth mode, credential state, endpoint,
  runtime profile, retry/fallback policy, local CLI boundary, verification, CR
  readback paths, and risk controls in Settings > Xenesis Agent > Connections
  with `data-xenesis-provider-setup="<id>"`.
- Preserve the provider policy from [[Provider Model]]: user settings choose
  provider identity, keyed providers do not silently fall back when credentials
  are missing, and local CLI selection remains separate from provider identity.
- `npx tsx --test src\shared\xenesisConnections.test.ts`,
  `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`, and
  `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first for missing provider setup metadata/path/helper, then the combined
  targeted run passed with 26/26 tests.

## Current Provider Views Slice

- Add `providerView` metadata to the active provider card in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.providers.views.status` as a read/no-approval CR path for
  internal Desk provider view surfaces, setup surface, CR open/read/control
  paths, diagnostics, and safety boundaries.
- Add `xd.xenesis.providers.views.open` as a control/no-approval CR path that
  opens Settings > Xenesis Agent > Connections and focuses the active provider
  card.
- Settings renders the same read model with
  `data-xenesis-provider-view="<provider-card-id>"` for live smoke and agent
  readback.
- This slice is setup/readiness visibility only. It does not mutate provider
  selection, credentials, model selection, runtime routing, fallback policy, or
  local CLI behavior.
- `npx tsx --test src\shared\xenesisConnections.test.ts`,
  `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`, and
  `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first for missing provider view metadata/path/helper, then the combined
  targeted run passed with 35/35 tests.

## Current Provider Routing Read Model Slice

- Add `providerRouting` metadata to the active provider card in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.providers.routing.status` as a read/no-approval CR path for
  route source, active provider/model, runtime provider/model, retry policy,
  configured fallback chain, credential-pool state, diagnostics, and safety
  boundaries.
- Main process reads the active Xenesis profile's configured
  `providerFallbacks` and passes them to the Connection Center builder.
- Settings renders the same read model with
  `data-xenesis-provider-routing="<provider-card-id>"`.
- This slice is read-only. It does not mutate provider selection, model
  selection, runtime routing, fallback policy, credentials, or local CLI
  selection. Credential-pool output exposes env var names and configured/missing
  state only, never secret values.
- `npx tsx --test src\shared\xenesisConnections.test.ts` failed first because
  `providerRouting` was undefined, then passed after implementation with 15/15
  tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
  first because `xd.xenesis.providers.routing.status` was not registered, then
  passed after CR registration/dispatch.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first because `formatXenesisProviderRoutingSummary` was not exported, then
  passed after renderer helper implementation with 12/12 tests.

## Current Guide Catalog CR Surface Slice

- Add `guideCatalog` metadata to guide cards in
  `xd.xenesis.connections.status`.
- Add `agent-user-stories` as a Hermes-style user-story guide card covering AI
  providers, external tools, messengers, and CR-controlled Desk workflows.
- Add `xd.xenesis.guides.status` as a read/no-approval CR path for setup
  playbooks, integration guides, user-story templates, validation checks,
  read/control paths, and safety boundaries.
- Add `xd.xenesis.guides.open` as a control/no-approval CR path that focuses
  the matching Settings guide card by default. Passing `openFile: true` also
  opens the repo-local guide file when available.
- Settings renders the same model with
  `data-xenesis-guide-catalog="<guide-id>"`.
- This slice is guide/readiness only. It does not install MCP servers, create
  OAuth flows, send messages, enable planned adapters, or mutate provider/tool
  or channel settings.
- `npx tsx --test src\shared\xenesisConnections.test.ts` failed first because
  `guideCatalog` was undefined, then passed after implementation with 17/17
  tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
  first because `xd.xenesis.guides.status` was not registered, then passed
  after CR registration/dispatch with 13/13 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first because `formatXenesisGuideCatalogSummary` was not exported, then
  passed after renderer helper implementation with 14/14 tests.
- The combined focused run passed with 44/44 tests.

## Current Channel Safety Read Model Slice

- Add `channelTemplate.safety` metadata to implemented Telegram, Slack,
  Discord, and Webhook cards in `xd.xenesis.connections.status`.
- Add `xd.xenesis.channels.safety.status` as a read/no-approval CR path for
  access-group allowlist fields, inbound/outbound boundaries, bot-loop
  protection, approval guardrails, troubleshooting, read/control paths, and
  safety boundaries.
- Settings renders the same read model with
  `data-xenesis-channel-safety="<channel-id>"`.
- This slice is read-only. It does not create OpenClaw access-group runtime,
  mutate channel settings, enable planned adapters, send test messages, or
  bypass approval paths. OpenClaw-style access groups are represented by the
  runtime's actual allowlist fields such as `allowedChatIds`,
  `allowedChannelIds`, `allowedGuildIds`, and `urlEnv`.
- `npx tsx --test src\shared\xenesisConnections.test.ts` failed first because
  `channelTemplate.safety` was undefined, then passed after implementation with
  16/16 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
  first because `xd.xenesis.channels.safety.status` was not registered, then
  passed after CR registration/dispatch with 12/12 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first because `formatXenesisChannelSafetySummary` was not exported, then
  passed after renderer helper implementation with 13/13 tests.

## Current External Tool Views Slice

- Add `toolView` metadata to Fetch, Filesystem, GitHub, Notion, Linear, Google
  Workspace, and Google Calendar cards in `xd.xenesis.connections.status`.
- Add `xd.xenesis.tools.views.status` as a read/no-approval CR path derived
  from the Connection Center tool section.
- Add `xd.xenesis.tools.views.open` as a control/no-approval CR path that opens
  Settings > Xenesis Agent > Connections and focuses the requested tool card.
- Render internal Desk view surface, setup surface, open path, readback paths,
  control paths, diagnostics, and safety boundaries in Settings with
  `data-xenesis-tool-view="<id>"`.
- Keep planned Google Workspace and Google Calendar as internal setup/readiness
  views only: no fake MCP install action, OAuth completion, or tool execution is
  exposed until a verified template exists.
- `npx tsx --test src\shared\xenesisConnections.test.ts`,
  `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`, and
  `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first for missing tool view metadata/path/helper, then the combined targeted
  run passed with 29/29 tests.

## Current Channel Access Groups Read Model Slice

- Add `channelTemplate.accessGroups` metadata to implemented Telegram, Slack,
  Discord, and Webhook cards in `xd.xenesis.connections.status`.
- Add `xd.xenesis.channels.accessGroups.status` as a read/no-approval CR path
  for profile allowlist bindings, redacted value states, fail-closed
  diagnostics, read/control paths, and safety boundaries.
- Settings renders the same model with
  `data-xenesis-channel-access-groups="<channel-id>"`.
- The model maps OpenClaw-style access groups to existing Xenesis profile
  fields: `allowedChatIds`, `allowedChannelIds`, `allowedGuildIds`, and
  `urlEnv`. It does not create a separate OpenClaw runtime.
- Raw chat IDs, channel IDs, guild IDs, endpoint values, and secrets are not
  returned. CR status reports only `configured`, `empty`, or `unknown` value
  states.
- Empty required allowlists are fail-closed diagnostics. Channel writes remain
  on `xd.xenesis.profiles.updateChannels`, and delivery tests remain on
  `xd.xenesis.profiles.testChannel`.
- `npx tsx --test src\shared\xenesisConnections.test.ts` failed first because
  `channelTemplate.accessGroups` was undefined, then passed after
  implementation with 18/18 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
  first because `xd.xenesis.channels.accessGroups.status` was not registered,
  then passed after CR registration/dispatch with 14/14 tests.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  first because `formatXenesisChannelAccessGroupsSummary` was not exported,
  then passed after renderer helper implementation with 15/15 tests.

## Current Tool Connectors Read Model Slice

- Add `toolConnector` metadata to Fetch, Filesystem, GitHub, Notion, Linear,
  Google Workspace, and Google Calendar cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.tools.connectors.status` as a read/no-approval CR path for
  connector type, auth mode, runtime support, redacted credential refs/states,
  scopes, validation checks, diagnostics, read/control paths, and safety
  boundaries.
- Settings renders the same model with
  `data-xenesis-tool-connector="<tool-id>"`.
- Credential refs expose names and states only: `configured`, `missing`,
  `not-required`, or `planned`. Raw token values are not returned.
- Google Workspace and Google Calendar remain `planned-oauth` connectors until
  a verified OAuth/MCP template, token store, and live read verification exist.
  This slice does not install MCP servers, complete OAuth, store tokens, or add
  tool write actions.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed first for missing connector metadata, missing CR path, and missing
  renderer helper.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed after implementation with 70/70 tests.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[MCP Bridge Architecture]]
- Depends on [[Provider Model]]
