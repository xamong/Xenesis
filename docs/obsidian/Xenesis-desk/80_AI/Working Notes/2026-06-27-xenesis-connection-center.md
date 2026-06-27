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

## Current Onboarding Status Read Model Slice

- Add `onboardingPlan` metadata to each onboarding checklist card in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.onboarding.status` as a read/no-approval CR path for initial
  setup phase, setup surface, validation checks, diagnostics, readback paths,
  control paths, and safety boundaries.
- Add `xd.xenesis.onboarding.open` as a control/no-approval CR path that opens
  Settings > Xenesis Agent > Connections and focuses the requested onboarding
  checklist step.
- Settings renders the same read model with
  `data-xenesis-onboarding-plan="<step-id>"` for live smoke and agent readback.
- This surface is read/open only. It does not mutate provider, MCP, external
  tool, gateway, messenger, profile, credential, or channel settings.

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

## Current Connection Setup Requests Slice

- Add `setupRequest` metadata to Connection Center cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.connections.setupRequests.status` as a read/no-approval CR
  path for setup request type, readiness, setup surface, review surface, steps,
  read/control paths, diagnostics, blocked actions, and safety boundaries.
- Add `xd.xenesis.connections.setupRequests.open` as a control/no-approval CR
  path that opens Settings > Xenesis Agent > Connections and focuses the
  requested card.
- Add `xd.xenesis.connections.setupRequests.request` as a write/when-external CR
  path that records a local Desk Action Inbox item of kind
  `xenesis-connection-setup`.
- Settings renders the same read model with
  `data-xenesis-connection-setup-request="<id>"` and a card-level setup request
  action.
- This surface records setup-review requests only. It does not install MCP
  servers, complete OAuth, store tokens, execute provider tools, send messages,
  mutate provider/tool/channel settings, update allowlists, or bypass approvals.

## Current Setup Request Review Status Slice

- Join existing `xenesis-connection-setup` Action Inbox items back into
  Connection Center setup request cards by deterministic
  `xenesis-connection-setup:<connection-id>` approval session keys.
- Add `setupRequest.review` to `xd.xenesis.connections.status` and
  `xd.xenesis.connections.setupRequests.status` so agents can read the current
  request lifecycle without opening Action Inbox separately.
- Render the same review state in Settings >
  Xenesis Agent > Connections with
  `data-xenesis-connection-setup-review="<connection-id>"`.
- Reuse existing CR paths only:
  `xd.xenesis.connections.setupRequests.status`,
  `xd.xenesis.connections.setupRequests.request`, and
  `xd.mcp.actionInbox.resolve`.
- This slice is readback/enrichment only. It does not approve/reject setup
  requests, install MCP servers, complete OAuth, store tokens, execute provider
  tools, send messages, mutate provider/tool/channel settings, update
  allowlists, or bypass approvals.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff/code as the gap map; refresh external docs
  only as a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed first for missing review enrichment and renderer formatter, then
  passed after implementation with 52/52 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
  after preserving review fields through the setup request dispatcher contract
  with 22/22 tests.

## Current MCP Install Drafts Slice

- Add `mcpInstallDraft` metadata to Connection Center tool cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.tools.mcpInstallDrafts.status` as a read/no-approval CR path
  for draft status, server name, transport, missing env names, config targets,
  copy snippets, read/control paths, diagnostics, blocked actions, and safety
  boundaries.
- Add `xd.xenesis.tools.mcpInstallDrafts.open` as a control/no-approval CR path
  that opens Settings > Xenesis Agent > Connections and focuses the owning tool
  card.
- Add `xd.xenesis.tools.mcpInstallDrafts.request` as a write/when-external CR
  path that records a local Desk Action Inbox item of kind
  `xenesis-mcp-install-draft`.
- Fetch, Filesystem, GitHub, Notion, and Linear use the existing recommended MCP
  templates. GitHub/Notion report `missing-env` when their env-token names are
  absent; Linear stays an OAuth hosted endpoint draft.
- Google Workspace and Google Calendar remain `planned` with no fake server
  name or config snippet until a verified MCP/OAuth template exists.
- Settings renders the same read model with
  `data-xenesis-mcp-install-draft="<tool-id>"` and a card-level MCP draft
  review request action.
- This surface records review-only draft requests. It does not write MCP
  config, run shell commands, complete OAuth, store tokens, execute provider
  tools, send messages, mutate settings, or bypass approvals.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff/code as the gap map; refresh external docs
  only as a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first with 5 expected RED failures, then passed after implementation
  with 98/98 tests.
- Live Electron smoke verified `xd.xenesis.tools.mcpInstallDrafts.status` for
  Notion, `xd.xenesis.tools.mcpInstallDrafts.request` for Linear, Action Inbox
  readback for `xenesis-mcp-install-draft:linear`, rendered Settings selector
  `data-xenesis-mcp-install-draft="notion"`, and Agent-pane fenced CR execution
  matching `Desk action completed`.

## Current Channel Profile Drafts Slice

- Add `channelProfileDraft` metadata to implemented messenger cards in
  `xd.xenesis.connections.status`; planned messenger cards stay without this
  draft surface.
- Add `xd.xenesis.channels.profileDrafts.status` as a read/no-approval CR path
  for profile field readiness, missing required fields, guardrails,
  diagnostics, blocked actions, and safety boundaries.
- Add `xd.xenesis.channels.profileDrafts.open` as a control/no-approval CR path
  that opens Settings > Xenesis Agent > Connections and focuses the requested
  implemented channel card.
- Add `xd.xenesis.channels.profileDrafts.request` as a write/when-external CR
  path that records a local Desk Action Inbox item of kind
  `xenesis-channel-profile-draft`.
- Telegram, Slack, Discord, and Webhook expose field states only:
  `configured`, `empty`, `missing-env`, `not-required`, or `unknown`. The draft
  does not return raw env secret values.
- Settings renders the same read model with
  `data-xenesis-channel-profile-draft="<channel-id>"` and a card-level channel
  draft review request action.
- This surface records review-only draft requests. It does not mutate channel
  settings, update allowlists, write profiles, send test messages, start the
  gateway, store secrets, or bypass approvals.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff/code as the gap map; refresh external docs
  only as a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first with 5 expected RED failures, then passed after implementation
  with 102/102 tests.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed with registered nodes 742, callable
  methods 450, coverage path references 689, dispatcher paths 430, and all CR
  gap counters at 0.

## Current Verification

- Channel profile draft slice focused test:
  `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed with 102/102 tests after implementation and formatting.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first with 5 expected RED failures for missing setup request metadata,
  CR paths, renderer helper/formatter, and Agent hint coverage, then passed
  after implementation with 92/92 tests.
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

## Current Channel Pairing Read Model Slice

- Add `channelTemplate.pairing` metadata to implemented Telegram, Slack,
  Discord, and Webhook cards in `xd.xenesis.connections.status`.
- Add planned pairing metadata for WhatsApp, Signal, Teams, Google Chat,
  iMessage, Matrix, IRC, Mattermost, Nextcloud Talk, Nostr, Raft, Tlon,
  Synology Chat, Twitch, LINE, WeChat, QQ Bot, Feishu/Lark, Yuanbao, Zalo,
  Email, SMS, Home Assistant, and ntfy without claiming runtime support.
- Add `xd.xenesis.channels.pairing.status` as a read/no-approval CR path for
  pairing model, runtime support, account scope, redacted credential refs,
  validation checks, read/control paths, diagnostics, and safety boundaries.
- Settings renders the same model with
  `data-xenesis-channel-pairing="<channel-id>"`.
- Implemented channel credential refs expose state only:
  `configured`, `missing`, `not-required`, `planned`, or `unknown`. Raw token,
  webhook, account, chat, QR, OAuth, and device-link values are not returned.
- Planned channels are pairing requirement notes only. This slice does not
  create QR sessions, OAuth flows, desktop bridge sessions, channel adapters,
  channel setting mutations, or message delivery tests.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed first for missing pairing metadata, missing CR path, and missing
  renderer helper.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed after implementation with 73/73 tests.

## Current Tool User Stories Read Model Slice

- Add `toolUserStory` metadata to Fetch, Filesystem, GitHub, Notion, Linear,
  Google Workspace, and Google Calendar cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.tools.userStories.status` as a read/no-approval CR path for
  workflow type, runtime support, user-story templates, prerequisite
  connectors, required scopes, read/control paths, diagnostics, and safety
  boundaries.
- Add `xd.xenesis.tools.userStories.open` as a control/no-approval CR path that
  opens Settings > Xenesis Agent > Connections and focuses the requested tool
  card.
- Settings renders the same model with
  `data-xenesis-tool-user-story="<tool-id>"`.
- Google Workspace and Google Calendar remain `planned-oauth` workflow
  planning surfaces. This slice does not install MCP servers, complete OAuth,
  store tokens, execute provider tools, send email, update documents/tasks, or
  create/update/delete calendar events.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff as the gap map; refresh external docs only as
  a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed first for missing user-story metadata, missing CR paths, and missing
  renderer helper, then passed after implementation with 56/56 tests.

## Current Tool Install Plans Read Model Slice

- Add `toolInstallPlan` metadata to Fetch, Filesystem, GitHub, Notion, Linear,
  Google Workspace, and Google Calendar cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.tools.installPlans.status` as a read/no-approval CR path for
  install mode, runtime support, setup/install surfaces, copy/OAuth actions,
  install steps, config targets, required env, read/control paths, diagnostics,
  and safety boundaries.
- Add `xd.xenesis.tools.installPlans.open` as a control/no-approval CR path
  that opens Settings > Xenesis Agent > Connections and focuses the requested
  tool card.
- Settings renders the same model with
  `data-xenesis-tool-install-plan="<tool-id>"`.
- This is an on-demand setup/readiness surface only. It does not install MCP
  servers, complete OAuth, store tokens, mutate MCP/provider settings, execute
  provider tools, send email, update documents/tasks, or mutate calendar
  events.
- Google Workspace and Google Calendar remain `planned-oauth` install plans
  until a verified OAuth/MCP template and token storage path exist.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff as the gap map; refresh external docs only as
  a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first for missing install-plan metadata, missing CR paths, missing
  renderer helper, and missing prompt-hint paths, then passed after
  implementation with 79/79 tests.

## Current Channel User Stories Read Model Slice

- Add `channelTemplate.userStory` metadata to implemented Telegram, Slack,
  Discord, Webhook, and planned messenger cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.channels.userStories.status` as a read/no-approval CR path
  for workflow type, runtime support, user-story templates, prerequisite setup,
  read/control paths, diagnostics, and safety boundaries.
- Add `xd.xenesis.channels.userStories.open` as a control/no-approval CR path
  that opens Settings > Xenesis Agent > Connections and focuses the requested
  messenger card.
- Settings renders the same model with
  `data-xenesis-channel-user-story="<messenger-id>"`.
- Telegram, Slack, Discord, and Webhook user stories point to existing gateway,
  channel routing, safety, access-group, pairing, and channel test paths.
- Planned messenger user stories are planning surfaces only. They do not enable
  delivery, send replies, install adapters, create pairing flows, mutate
  allowlists, or bypass approval guardrails.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff as the gap map; refresh external docs only as
  a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first for missing channel user-story metadata, missing CR paths,
  missing renderer helper, and missing prompt-hint paths, then passed after
  implementation with 85/85 tests.

## Current Connection Diagnostic Runbooks Read Model Slice

- Add `diagnosticRunbook` metadata to Connection Center cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.connections.diagnostics.status` as a read/no-approval CR path
  for unified per-card runbooks. The runbook combines connection status,
  setup/connector/view/user-story/readback/control/diagnostic/safety metadata
  already exposed by the card.
- Add `xd.xenesis.connections.diagnostics.open` as a control/no-approval CR
  path that opens Settings > Xenesis Agent > Connections and focuses the
  requested card.
- Settings renders the same model with
  `data-xenesis-connection-diagnostic-runbook="<connection-id>"`.
- Tool runbooks aggregate tool setup, connector, internal view, user-story, and
  install-plan diagnostics. Messenger runbooks aggregate routing, safety,
  access-group, pairing, user-story, and internal messenger view diagnostics.
- Diagnostic runbooks are planning/readiness surfaces only. They do not run
  checks, install MCP servers, complete OAuth, store tokens, execute provider
  tools, send messages, mutate provider/tool/channel settings, or bypass
  approvals.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff as the gap map; refresh external docs only as
  a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first for missing runbook metadata, missing CR paths, missing renderer
  helper, and missing prompt-hint paths, then passed after implementation with
  88/88 tests.

## Current Tool Action Catalog Slice

- Add `toolActionCatalog` metadata to Fetch, Filesystem, GitHub, Notion,
  Linear, Google Workspace, and Google Calendar cards in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.tools.actions.status` as a read/no-approval CR path for
  review-only action groups, tool names, data scopes, approval policies,
  read/control paths, diagnostics, blocked actions, and safety boundaries.
- Add `xd.xenesis.tools.actions.open` as a control/no-approval CR path that
  opens Settings > Xenesis Agent > Connections and focuses the requested tool
  card.
- Add `xd.xenesis.tools.actions.request` as a write/approval-gated CR path that
  records a local `xenesis-tool-action-policy` Action Inbox item for review.
- Settings renders the same model with
  `data-xenesis-tool-action-catalog="<tool-id>"`.
- This is a review-only policy/readiness surface. It does not execute provider
  MCP tools, complete OAuth, store tokens, write MCP config, send email, update
  documents/tasks/issues, create/update/delete calendar events, mutate external
  systems, or bypass approvals.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff as the gap map; refresh external docs only as
  a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first for missing action-catalog metadata, missing CR paths, missing
  renderer helper, and missing prompt-hint paths, then passed after
  implementation with 106/106 tests.

## Current Provider Profile Drafts Slice

- Add `providerProfileDraft` metadata to the active AI provider card in
  `xd.xenesis.connections.status`.
- Add `xd.xenesis.providers.profileDrafts.status` as a read/no-approval CR path
  for provider field state, missing required fields, guardrails, read/control
  paths, diagnostics, blocked actions, and safety boundaries.
- Add `xd.xenesis.providers.profileDrafts.open` as a control/no-approval CR path
  that opens Settings > Xenesis Agent > Connections and focuses the provider
  draft card.
- Add `xd.xenesis.providers.profileDrafts.request` as a write/approval-gated CR
  path that records a local `xenesis-provider-profile-draft` Action Inbox item
  for review.
- Settings renders the same model with
  `data-xenesis-provider-profile-draft="<provider-id>"`.
- This is a review-only setup/readiness surface. It does not mutate provider
  settings, model settings, fallback chains, credentials, local CLI selection,
  or run provider prompts. Secret values are never returned.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff as the gap map; refresh external docs only as
  a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first for missing provider draft metadata, missing CR paths, missing
  renderer helper, and missing prompt-hint paths, then passed after
  implementation with 110/110 tests.

## Current Tool OAuth Drafts Slice

- Add `toolOAuthDraft` metadata to Google Workspace and Google Calendar cards
  in `xd.xenesis.connections.status`.
- Add `xd.xenesis.tools.oauthDrafts.status` as a read/no-approval CR path for
  review-only OAuth app/client fields, redirect URI readiness, proposed scopes,
  token-store intent, consent mode, diagnostics, blocked actions, and safety
  boundaries.
- Add `xd.xenesis.tools.oauthDrafts.open` as a control/no-approval CR path that
  opens Settings > Xenesis Agent > Connections and focuses the requested
  Google tool card.
- Add `xd.xenesis.tools.oauthDrafts.request` as a write/when-external CR path
  that records a local `xenesis-tool-oauth-draft` Action Inbox item for review.
- Settings renders the same read model with
  `data-xenesis-tool-oauth-draft="<tool-id>"`.
- This is a review-only setup surface. It does not complete OAuth, store
  tokens, write MCP config, execute provider tools, send email, mutate
  documents/tasks, create/update/delete calendar events, mutate settings, or
  bypass approvals.
- External documentation handling for this slice: no per-slice web browsing.
  Use local Obsidian/docs/handoff/code/tests as the gap map; refresh external
  docs only as a batched documentation pass if needed.
- `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
  failed first for missing OAuth draft metadata and renderer helpers, then
  passed after implementation with 67/67 tests.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  failed first for missing OAuth draft CR paths and prompt-hint coverage, then
  passed after implementation with 47/47 tests.
- Full focused regression after formatting passed with 114/114 tests. Root
  typecheck, Xenesis package typecheck/test/build, CR audit, and app build
  passed. Public-release check still fails on the known missing
  `.github/workflows/ci.yml` gap.
- Live Electron smoke passed: direct Google Calendar OAuth draft status returned
  `planned-template`/`planned-oauth` with `calendar.events.readonly`; request
  created `xenesis-tool-oauth-draft:google-calendar`; open rendered
  `data-xenesis-tool-oauth-draft="google-calendar"`; Agent-pane fenced CR prompt
  matched `Desk action completed`.

## Current Agent CR Hint Parity Slice

- Align Xenesis Agent's Desk-control prompt hint with existing Connection
  Center CR surfaces that were already registered and dispatched but not all
  listed in the high-value hint.
- Added hint/test coverage for `xd.xenesis.guides.status/open`,
  `xd.xenesis.providers.setup.status`, `xd.xenesis.providers.routing.status`,
  `xd.xenesis.providers.views.status/open`, `xd.xenesis.tools.setup.status`,
  `xd.xenesis.tools.views.status/open`, `xd.xenesis.channels.routing.status`,
  `xd.xenesis.channels.safety.status`, and
  `xd.xenesis.messengers.views.status/open`.
- This slice adds no runtime mutation path, no external calls, no settings
  writes, and no new registry node. It only improves model-visible CR guidance
  so Agent-pane responses can choose the already-available Desk-native control
  paths.
- TDD check: focused prompt-hint test failed first on missing
  `xd.xenesis.guides.status`, then passed after implementation with 20/20
  tests.

## Current Natural Connection Actions Slice

- Add deterministic natural-language routing for clear Connection Center
  requests before provider execution.
- `노션 연결 카드 열어줘` maps to `xd.xenesis.connections.open` with
  `id=notion`.
- `구글 캘린더 OAuth 초안 보여줘` maps to
  `xd.xenesis.tools.oauthDrafts.open` with `id=google-calendar`.
- `온보딩 가이드 열어줘` maps to `xd.xenesis.guides.open` with
  `id=onboarding-connections`.
- `텔레그램 메신저 설정 보여줘` maps to
  `xd.xenesis.messengers.views.open` with `id=telegram`.
- This is deterministic routing, not agent reasoning. It emits existing CR
  actions only and does not mutate settings, execute external tools, send
  messages, complete OAuth, or add registry nodes.
- TDD check: focused natural planner test failed first with no action for
  `노션 연결 카드 열어줘`, then passed after implementation with 21/21 tests.

## Current Natural Connection Readback Actions Slice

- Add deterministic natural-language routing for clear Connection Center
  readback requests before provider execution.
- `연결 상태 보여줘` maps to `xd.xenesis.connections.status`.
- `노션 연결 진단 보여줘` maps to
  `xd.xenesis.connections.diagnostics.status` with `id=notion`.
- `구글 캘린더 OAuth 상태 보여줘` maps to
  `xd.xenesis.tools.oauthDrafts.status` with `id=google-calendar`.
- `텔레그램 라우팅 상태 보여줘` maps to
  `xd.xenesis.channels.routing.status` with `channel=telegram`.
- Readback intent is intentionally narrower than open/show intent:
  `구글 캘린더 OAuth 초안 보여줘` still opens
  `xd.xenesis.tools.oauthDrafts.open` instead of reading status.
- This is deterministic routing, not agent reasoning. It emits existing
  read-only CR actions only and does not mutate settings, execute external
  tools, send messages, complete OAuth, or add registry nodes.
- External documentation handling: no per-slice web browsing. Use local
  Obsidian/docs/handoff/code/tests as the gap map; refresh external docs only
  as a batched documentation pass if needed.
- TDD check: focused natural planner test failed first with `연결 상태 보여줘`
  falling through to generic `xd.app.status`, then passed after implementation
  with 22/22 tests.

## Current Natural Connection Review Requests Slice

- Add deterministic natural-language routing for clear Connection Center review
  requests before provider execution.
- `노션 연결 검토 요청해줘` maps to
  `xd.xenesis.connections.setupRequests.request` with `id=notion`.
- `노션 MCP 설치 검토 요청해줘` maps to
  `xd.xenesis.tools.mcpInstallDrafts.request` with `id=notion`.
- `구글 캘린더 OAuth 검토 요청해줘` maps to
  `xd.xenesis.tools.oauthDrafts.request` with `id=google-calendar`.
- `리니어 액션 정책 검토 요청해줘` maps to
  `xd.xenesis.tools.actions.request` with `id=linear`.
- `텔레그램 채널 프로필 검토 요청해줘` maps to
  `xd.xenesis.channels.profileDrafts.request` with `channel=telegram`.
- `AI provider profile 검토 요청해줘` maps to
  `xd.xenesis.providers.profileDrafts.request` with `provider=auto`.
- This is deterministic routing, not agent reasoning. It emits existing
  review-only CR request actions and records Desk Action Inbox review requests
  through the existing CR paths. It does not mutate settings, execute external
  tools, write MCP config, send messages, complete OAuth, or add registry
  nodes.
- External documentation handling: no per-slice web browsing. Use local
  Obsidian/docs/handoff/code/tests as the gap map; refresh external docs only
  as a batched documentation pass if needed.
- TDD check: focused natural planner test failed first with `노션 연결 검토
  요청해줘` returning no action, then passed after implementation with 23/23
  tests.

## Current Natural Detailed Readbacks Slice

- Add deterministic natural-language routing for detailed Connection Center
  readback requests before provider execution.
- `AI provider setup 상태 보여줘` maps to
  `xd.xenesis.providers.setup.status` with `provider=auto`.
- `codex app-server provider routing 상태 보여줘` maps to
  `xd.xenesis.providers.routing.status` with `provider=codex-app-server`.
- `노션 connector 상태 보여줘` maps to
  `xd.xenesis.tools.connectors.status` with `tool=notion`.
- `구글 캘린더 setup 상태 보여줘` maps to
  `xd.xenesis.tools.setup.status` with `id=google-calendar`.
- `노션 설치 계획 상태 보여줘` maps to
  `xd.xenesis.tools.installPlans.status` with `tool=notion`.
- `구글 캘린더 사용자 스토리 상태 보여줘` maps to
  `xd.xenesis.tools.userStories.status` with `tool=google-calendar`.
- `텔레그램 접근 그룹 상태 보여줘` maps to
  `xd.xenesis.channels.accessGroups.status` with `channel=telegram`.
- `텔레그램 페어링 상태 보여줘` maps to
  `xd.xenesis.channels.pairing.status` with `channel=telegram`.
- `텔레그램 사용자 스토리 상태 보여줘` maps to
  `xd.xenesis.channels.userStories.status` with `id=telegram`.
- This is deterministic routing, not agent reasoning. It emits existing
  read-only CR status actions only and does not mutate settings, execute
  external tools, write MCP config, send messages, complete OAuth, or add
  registry nodes.
- External documentation handling: no per-slice web browsing. Use local
  Obsidian/docs/handoff/code/tests as the gap map; refresh external docs only
  as a batched documentation pass if needed.
- TDD check: focused natural planner test failed first with `AI provider setup
  상태 보여줘` falling through to generic `xd.app.status`, then passed after
  implementation with 24/24 tests.

## Current Natural Detailed Opens Slice

- Add deterministic natural-language routing for detailed Connection Center
  open requests before provider execution.
- `codex app-server provider view 열어줘` maps to
  `xd.xenesis.providers.views.open` with `provider=codex-app-server`.
- `AI provider profile draft 열어줘` maps to
  `xd.xenesis.providers.profileDrafts.open` with `provider=auto`.
- `노션 설치 계획 열어줘` maps to
  `xd.xenesis.tools.installPlans.open` with `id=notion`.
- `노션 MCP 설치 초안 열어줘` maps to
  `xd.xenesis.tools.mcpInstallDrafts.open` with `id=notion`.
- `구글 캘린더 사용자 스토리 열어줘` maps to
  `xd.xenesis.tools.userStories.open` with `id=google-calendar`.
- `리니어 액션 정책 열어줘` maps to
  `xd.xenesis.tools.actions.open` with `id=linear`.
- `텔레그램 사용자 스토리 열어줘` maps to
  `xd.xenesis.channels.userStories.open` with `id=telegram`.
- `텔레그램 채널 프로필 열어줘` maps to
  `xd.xenesis.channels.profileDrafts.open` with `channel=telegram`.
- `노션 진단 runbook 열어줘` maps to
  `xd.xenesis.connections.diagnostics.open` with `id=notion`.
- `노션 setup request 열어줘` maps to
  `xd.xenesis.connections.setupRequests.open` with `id=notion`.
- This is deterministic routing, not agent reasoning. It emits existing
  no-approval CR open actions only and does not mutate settings, execute
  external tools, write MCP config, send messages, complete OAuth, or add
  registry nodes.
- Explicit `열어/open` is evaluated before readback so diagnostic runbooks can
  open. Review-request intent is narrowed so `setup request 열어줘` opens the
  card instead of recording a new review item.
- External documentation handling: no per-slice web browsing. Use local
  Obsidian/docs/handoff/code/tests as the gap map; refresh external docs only
  as a batched documentation pass if needed.
- TDD check: focused natural planner test failed first with `codex app-server
  provider view 열어줘` returning no action, then passed after implementation
  with 25/25 tests.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[MCP Bridge Architecture]]
- Depends on [[Provider Model]]
