# Onboarding and Connections

This page explains the recommended first-run setup order for Xenesis Agent,
provider settings, MCP tools, the Xenesis Gateway, and external bot channels.

## Setup Order

1. Configure the AI provider in Settings > AI Provider.
2. Verify Xenesis Agent can answer a normal chat prompt.
3. Install local CLI integration for Codex, Claude, or Cursor when needed.
4. Verify Xenesis Desk MCP status.
5. Connect recommended MCP tools.
6. Start or verify the Xenesis Gateway.
7. Configure external bot channels.
8. Send a channel test message.

## Connection Center

Open Settings > Xenesis Agent > Connections to inspect setup readiness in one
place. The Connection Center summarizes:

- AI provider readiness.
- Local CLI integration readiness.
- Xenesis Desk MCP readiness.
- Recommended tool connections.
- Gateway readiness.
- External messenger readiness.
- Relevant setup guides.

The same state is available through the Capability Registry at
`xd.xenesis.connections.status`. Agents can also open the Connection Center and
focus one card with `xd.xenesis.connections.open`, for example:

```json
{ "id": "notion" }
```

Connection cards can include setup recipes, missing environment variables,
source documentation labels, and CR-first actions. `Open setup` routes through
`xd.panes.settings.open` to the relevant Settings surface. Guide cards route
through `xd.files.open` so the same action path is available to the Agent pane
and the renderer. The card-level `Focus` action routes through
`xd.xenesis.connections.open` and highlights the matching
`data-xenesis-connection="<id>"` card inside Settings.

Cards with onboarding plans, provider setup plans, provider profile drafts,
OAuth drafts, or channel profile drafts also render detail rows in Settings.
These rows show the
expected state, required fields where applicable, CR read/control paths,
diagnostics, and safety boundary for each guided or review step. Use the rows
as an operator checklist; they are not executable shortcuts and do not perform
external work by themselves.

Guide cards also expose a structured `guideCatalog` read model. Use
`xd.xenesis.guides.status` to inspect setup playbooks, integration guides, and
user-story templates for provider setup, MCP/external tools, gateway/channel
readiness, and CR-controlled Desk workflows. Use `xd.xenesis.guides.open` with
`{ "id": "<guide-id>" }` to focus the matching Settings guide card. Add
`"openFile": true` when the caller also wants to open the repo-local guide file.
This surface is read-only except for opening the guide/view; it does not install
tools, create OAuth flows, send messages, or mutate provider/channel settings.

Guide cards also include a `guideFile` readback. This reports whether the
repo-local manual file is `available`, `missing`, or `unresolved`, plus the
resolved open path, diagnostics, and safe open/read control paths. The readback
checks file availability only; it does not read file contents. Use it before
claiming that a guide target is backed by an actual repo-local manual page.

Connection cards also expose a `diagnosticRunbook` read model. Use
`xd.xenesis.connections.diagnostics.status` to inspect the unified runbook for a
card, or filter by `{ "id": "<connection-id>" }` or `{ "kind": "tool" }`.
Runbooks combine the card status with its setup, connector, view, user-story,
readback, control, diagnostic, and safety metadata so the Agent/operator can see
what to inspect next without jumping across separate CR surfaces. Use
`xd.xenesis.connections.diagnostics.open` with `{ "id": "<connection-id>" }` to
focus the owning Connection Center card. This is a read/open planning surface
only: it does not run checks, install MCP servers, complete OAuth, store tokens,
execute provider tools, send messages, mutate settings, or bypass approvals.

Connection cards also expose a `setupRequest` template. Use
`xd.xenesis.connections.setupRequests.status` to inspect setup request
metadata, or filter by `{ "id": "<connection-id>" }` or `{ "kind": "tool" }`.
Use `xd.xenesis.connections.setupRequests.open` with
`{ "id": "<connection-id>" }` to focus the owning card, and
`xd.xenesis.connections.setupRequests.request` with
`{ "id": "<connection-id>" }` to record a local Desk Action Inbox item for
review. The status readback joins the latest matching Action Inbox item by the
setup request `approvalSessionKey`, so `xd.xenesis.connections.status`,
`xd.xenesis.connections.setupRequests.status`, and Settings can show whether
the request is not requested, pending, approved, rejected, failed, or expired.
Approval and rejection still use the existing Action Inbox resolve path. The
request path records the request, steps, diagnostics, blocked actions, and
safety boundaries only. It does not install MCP servers, complete OAuth, store
tokens, execute provider tools, send messages, mutate provider/tool/channel
settings, update allowlists, or bypass approvals.

Provider cards also expose a `providerProfileDraft` read model. Use
`xd.xenesis.providers.profileDrafts.status` to inspect review-only provider
field state, missing required fields, guardrails, diagnostics, blocked actions,
and safety boundaries. Use `xd.xenesis.providers.profileDrafts.open` with
`{ "provider": "<provider-id>" }` to focus the active provider card, and
`xd.xenesis.providers.profileDrafts.request` with
`{ "provider": "<provider-id>" }` to record a local
`xenesis-provider-profile-draft` Action Inbox item for review. Drafts return
field readiness states only; they do not mutate provider settings, model
settings, fallback chains, credentials, local CLI selection, or run provider
prompts.

Provider profile drafts include review steps for provider identity,
model/credential readiness, runtime routing, and local CLI boundary checks.
Settings renders these as `Review steps` so an operator can inspect exactly
which CR paths and diagnostics should be checked before approving profile work.

Provider cards also expose a `providerSetupPlan` read model. Use
`xd.xenesis.providers.setupPlans.status` to inspect the ordered provider setup
plan and `xd.xenesis.providers.setupPlans.open` to focus the plan in Settings.
The plan joins provider setup, routing, internal provider views, profile draft
review/apply references, diagnostic runbooks, and setup requests into one
operator checklist. Setup plans are read/open orchestration metadata only: they
do not change provider settings, store raw secrets, edit fallback chains, change
local CLI selection, run provider prompts, or bypass approvals. Ready profile
setting writes remain on the existing approval-gated
`xd.xenesis.providers.profileDrafts.apply` path.

Tool cards with recommended MCP metadata also expose an `mcpInstallDraft` read
model. Use `xd.xenesis.tools.mcpInstallDrafts.status` to inspect review-only
install drafts for Fetch, Filesystem, GitHub, Notion, Linear, and planned
Google tool cards. Use `xd.xenesis.tools.mcpInstallDrafts.open` with
`{ "id": "<tool-id>" }` to focus the owning card, and
`xd.xenesis.tools.mcpInstallDrafts.request` with `{ "id": "<tool-id>" }` to
record a local `xenesis-mcp-install-draft` Action Inbox item for review. These
drafts expose server name, transport, missing env names, config targets, copy
snippets, diagnostics, blocked actions, and safety boundaries. They do not
write MCP config, run shell commands, complete OAuth, store tokens, execute
provider tools, send messages, mutate settings, or bypass approvals. Google
Workspace and Google Calendar remain planned until a verified MCP/OAuth
template exists.

Planned Google tool cards also expose a `toolOAuthDraft` read model. Use
`xd.xenesis.tools.oauthDrafts.status` to inspect review-only OAuth app,
redirect URI, scope, consent, token-store, diagnostics, blocked action, and
safety-boundary metadata for Google Workspace and Google Calendar. Use
`xd.xenesis.tools.oauthDrafts.open` with `{ "id": "<tool-id>" }` to focus the
owning card, and `xd.xenesis.tools.oauthDrafts.request` with
`{ "id": "<tool-id>" }` to record a local `xenesis-tool-oauth-draft` Action
Inbox item for review. These drafts do not complete OAuth, store tokens, write
MCP config, execute provider tools, send email, mutate documents, create or
change calendar events, mutate settings, or bypass approvals.

OAuth drafts include review steps for app registration, scope review,
token-store readiness, and readback verification. Settings renders these as
`Review steps` on the Google Workspace and Google Calendar cards so planned
OAuth work stays visible without implying OAuth support is complete.

Tool cards also expose a `toolActionCatalog` read model. Use
`xd.xenesis.tools.actions.status` to inspect review-only external tool action
groups, data scopes, approval policies, diagnostics, blocked actions, and
safety boundaries before any provider MCP tool execution path exists. Use
`xd.xenesis.tools.actions.open` with `{ "id": "<tool-id>" }` to focus the
owning card, and `xd.xenesis.tools.actions.request` with
`{ "id": "<tool-id>" }` to record a local `xenesis-tool-action-policy` Action
Inbox item for review. These catalogs are policy/readiness surfaces only: they
do not execute provider tools, complete OAuth, store tokens, write MCP config,
send email, update documents/tasks/issues, create/update/delete calendar
events, mutate external systems, or bypass approvals.

Implemented messenger cards also expose a `channelProfileDraft` read model. Use
`xd.xenesis.channels.profileDrafts.status` to inspect review-only profile field
state, missing required fields, guardrails, diagnostics, blocked actions, and
safety boundaries for Telegram, Slack, Discord, and Webhook. Use
`xd.xenesis.channels.profileDrafts.open` with `{ "channel": "<channel-id>" }`
to focus the owning card, and `xd.xenesis.channels.profileDrafts.request` with
`{ "channel": "<channel-id>" }` to record a local
`xenesis-channel-profile-draft` Action Inbox item for review. Drafts return
only field readiness states such as `configured`, `empty`, and `missing-env`;
they do not return raw env secret values, mutate channel settings, update
allowlists, write profiles, send test messages, start gateway services, store
secrets, or bypass approvals.

Channel profile drafts include review steps for credential readiness,
access/allowlist bindings, delivery guardrails, and pairing/readback checks.
Settings renders these as `Review steps` so the channel profile review flow can
be followed inside Desk before any channel update or test-send path is used.

The first section is an ordered onboarding checklist. It is derived from the
same provider, MCP, tool, gateway, messenger, and guide cards, so it is a
read-only progress view rather than a separate source of truth. Use it as the
setup journey:

1. First chat.
2. Local CLI and MCP.
3. Recommended tools.
4. Gateway.
5. Messenger routing.
6. End-to-end test send.

Each checklist card points to existing CR-backed settings or guide actions. A
completed setup step should be confirmed through readback, such as
`xd.xenesis.connections.status`, gateway status, channel runtime status, open
content, or diagnostics.

Each checklist card also exposes an `onboardingPlan` read model. Use
`xd.xenesis.onboarding.status` to inspect the initial setup phase, setup
surface, validation checks, diagnostics, CR readback paths, and safety
boundaries for each onboarding step. Use `xd.xenesis.onboarding.open` with
`{ "id": "<step-id>" }` to open Settings > Xenesis Agent > Connections and
focus the matching checklist card. This surface is read/open only: it does not
change provider, MCP, external tool, gateway, messenger, profile, credential, or
channel settings.

Onboarding plans include guided steps. Settings renders them as `Guided steps`
with the step kind, CR path, expected state, verification signal, and safety
boundary. Use those rows to move through first chat, local CLI/MCP, tool setup,
gateway readiness, messenger routing, and end-to-end test preparation without
guessing which CR surface should be read or opened next.

## AI Provider

The active provider comes from the user's settings and profile. Xenesis Desk does
not silently switch to a different keyed provider when credentials are missing.
`auto` resolves by credential scan, and local CLI selection remains separate from
provider identity.

The provider card also exposes a `providerSetup` read model through
`xd.xenesis.connections.status`. Use `xd.xenesis.providers.setup.status` when an
agent needs only provider setup metadata. The setup model covers configured
provider, model, auth mode, credential state, credential storage location,
endpoint, runtime profile, retry/fallback policy, local CLI boundary, verification
steps, CR readback paths, and risk controls. It reports whether credentials are
configured or missing without serializing API keys or bridge tokens.

The same provider card exposes a `providerProfileDraft` review model through
`xd.xenesis.connections.status`. Use
`xd.xenesis.providers.profileDrafts.status` to inspect provider, model, auth
mode, credential, endpoint, runtime profile, fallback policy, and local CLI
boundary field state. Use `xd.xenesis.providers.profileDrafts.open` to focus the
draft in Settings, and `xd.xenesis.providers.profileDrafts.request` to record a
local Action Inbox review item. This surface is status/open/request only: it
does not change the active provider, change the model, mutate fallback chains,
store credentials, switch local CLI selection, run provider prompts, or return
secret values.

The same provider card exposes a `providerView` read model for the internal Desk
surface. Use `xd.xenesis.providers.views.status` to inspect the view metadata and
`xd.xenesis.providers.views.open` to open Settings > Xenesis Agent > Connections
focused on the active provider card. Provider views are setup/readiness surfaces
only: they do not mutate provider selection, model selection, credentials,
runtime routing, or fallback policy.

`xd.xenesis.providers.views.open` also accepts `section`, `viewSection`, or
`providerViewSection` for section-level focus. Supported provider view sections
are `connection-card`, `setup`, `runtime`, `fallback-policy`,
`credential-boundary`, `profile-draft`, and `setup-plan`. These section opens
reuse existing Connection Center detail-focus blocks and remain read/open-only:
they do not edit provider settings, store credentials, switch runtime routing,
change fallback policy, or run provider prompts.

The provider card also exposes a `providerRouting` read model. Use
`xd.xenesis.providers.routing.status` to inspect route source, active
provider/model, runtime provider/model, retry count, configured fallback
providers, credential-pool state, diagnostics, and safety boundaries. The
fallback chain is read from the active Xenesis profile's `providerFallbacks`.
Credential pools expose provider names, env var names, and configured/missing or
not-required state only. They never serialize API key values, bridge tokens, or
provider secrets. This path is read-only and does not perform fallback, change
the active provider, or change local CLI selection.

The provider card also exposes a `providerSetupPlan` read model. Use
`xd.xenesis.providers.setupPlans.status` and
`xd.xenesis.providers.setupPlans.open` to inspect or focus a unified provider
setup plan. Each plan orders setup readback, routing readback, provider view
open, profile draft review, ready profile draft apply reference, diagnostic
runbook, and setup request steps. The setup-plan surface is read/open metadata
only. It does not change provider settings, store raw secrets, edit fallback
chains, switch local CLI selection, run provider prompts, or bypass approvals.

## MCP And Tool Connections

The Connection Center shows MCP readiness and recommended tool connections.
Current recommended MCP templates include Fetch, Filesystem, GitHub, Notion, and
Linear. Google Workspace and Google Calendar appear as planned/manual
connections until a verified install template is bundled.

The actionable tool cards are manual setup recipes, not automatic installers.
They show required environment variables such as `GITHUB_TOKEN` or
`NOTION_TOKEN`, point users to the local CLI MCP settings, and keep any write
workflow behind the existing provider/MCP/CR verification path.

For Fetch, Filesystem, GitHub, Notion, and Linear, the tool cards also expose a
copy-ready `mcpTemplate` read model through `xd.xenesis.connections.status`.
Settings renders the same template with server name, transport, command or URL,
default tool filters, and JSON/Codex TOML snippets. These snippets come from the
Xenesis recommended MCP server catalog and intentionally use environment
variable placeholders instead of storing secrets in Desk settings.

Google Workspace and Google Calendar intentionally do not expose install CR
actions yet. They remain planned until OAuth scopes, token storage, and a
verified MCP server template are selected and tested.

Each tool card also exposes a `toolSetup` read model through
`xd.xenesis.connections.status`. Use `xd.xenesis.tools.setup.status` when an
agent needs only the external tool setup view. The setup model covers auth mode,
data scopes, write scopes, credential storage, setup surface, verification
steps, CR readback paths, and risk controls. Google Workspace and Google
Calendar are visible here as planned OAuth connections, but they still have no
install action or bundled MCP template.

Each tool card also exposes a `toolInstallPlan` read model. Use
`xd.xenesis.tools.installPlans.status` to inspect install mode, runtime support,
setup/install surfaces, copy or OAuth setup actions, config targets, required
environment variables, diagnostics, and safety boundaries. Use
`xd.xenesis.tools.installPlans.open` with `{ "id": "<tool-id>" }` to open
Settings > Xenesis Agent > Connections and focus the matching tool card. This
is an on-demand setup/readiness surface only: it does not install MCP servers,
complete OAuth, store tokens, mutate MCP/provider settings, execute provider
tools, or enable write workflows. Fetch, Filesystem, GitHub, Notion, and Linear
can expose copy-ready or OAuth template plans; Google Workspace and Google
Calendar remain `planned-oauth` install plans until verified templates exist.

Each tool card also exposes a `toolConnector` read model. Use
`xd.xenesis.tools.connectors.status` to inspect connector type, auth mode,
runtime support, redacted credential refs, credential state, scopes, validation
checks, diagnostics, and safety boundaries. Credential refs contain names and
states such as `configured`, `missing`, `not-required`, or `planned`; they never
return raw token values. Fetch, Filesystem, GitHub, Notion, and Linear can report
ready MCP templates or OAuth endpoints. Google Workspace and Google Calendar
report `planned-oauth` until a verified OAuth/MCP template and token storage
path exist.

Each tool card also exposes a `toolView` read model. Use
`xd.xenesis.tools.views.status` to inspect the internal Desk surface for a tool,
including the Connection Center card, setup recipe, optional MCP template view,
readback paths, control paths, diagnostics, and safety boundaries. Use
`xd.xenesis.tools.views.open` with `{ "id": "<tool-id>" }` to open Settings >
Xenesis Agent > Connections and focus the tool card. This opens a Desk
setup/readiness view only; it does not execute the external tool, install MCP
servers, complete OAuth, or bypass approval paths.

`xd.xenesis.tools.views.open` also accepts an optional `section` value when the
Agent or operator needs to focus a specific internal tool-view section. Current
section values are `connection-card`, `setup`, `connector`, `setup-plan`,
`install-plan`, `mcp-template`, `oauth-draft`, `action-policy`, and
`user-stories`. For example, `{ "id": "notion", "section": "mcp-template",
"ensureVisible": true }` focuses the Notion MCP template section, while
`{ "id": "google-calendar", "section": "oauth-draft", "ensureVisible": true }`
focuses the Google Calendar OAuth draft section. Section opens are still
read/open planning surfaces only: they do not write MCP config, run installers,
complete OAuth, store tokens, execute provider tools, mutate external systems,
or approve write actions.

Each tool card also exposes a `toolUserStory` read model. Use
`xd.xenesis.tools.userStories.status` to inspect workflow type, runtime support,
user-story templates, prerequisite connectors, required scopes, CR read/control
paths, diagnostics, and safety boundaries for external tool workflows. Use
`xd.xenesis.tools.userStories.open` with `{ "id": "<tool-id>" }` to open
Settings > Xenesis Agent > Connections and focus the matching tool card. These
workflows are planning/readiness surfaces only: they do not install tools,
complete OAuth, store tokens, execute provider MCP tools, mutate external tool
settings, send email, update documents, or create/update/delete calendar events.
Google Workspace and Google Calendar stay `planned-oauth` until a verified
OAuth/MCP template and token storage path are implemented.

Each planned Google tool card also exposes a `toolOAuthDraft` read model. Use
`xd.xenesis.tools.oauthDrafts.status` to inspect the OAuth app/client draft,
redirect URI requirement, proposed read scopes, token-store intent, consent
mode, diagnostics, blocked actions, and safety boundaries. Use
`xd.xenesis.tools.oauthDrafts.open` with `{ "id": "<tool-id>" }` to focus the
matching card and `xd.xenesis.tools.oauthDrafts.request` with
`{ "id": "<tool-id>" }` to record a local Action Inbox review item. This is a
review-only setup surface: it does not complete OAuth, store tokens, write MCP
config, execute provider MCP tools, send email, mutate documents/tasks, or
create/update/delete calendar events.

Each tool card also exposes a `toolActionCatalog` read model. Use
`xd.xenesis.tools.actions.status` to inspect search/read/write action groups,
tool names, data scopes, approval policies, CR read/control paths, diagnostics,
blocked actions, and safety boundaries for external tool usage. Use
`xd.xenesis.tools.actions.open` with `{ "id": "<tool-id>" }` to focus the
matching card and `xd.xenesis.tools.actions.request` with
`{ "id": "<tool-id>" }` to record a local Action Inbox review item. This is a
review-only policy catalog: it does not execute provider MCP tools, complete
OAuth, store tokens, write MCP config, send email, update documents/tasks/issues,
or create/update/delete calendar events. Write groups remain approval-gated or
blocked until a separate verified execution path exists.

Use `xd.mcp.settings.status` to inspect MCP settings through the Capability
Registry.

## Gateway

The Xenesis Gateway is required for external messenger delivery. The Connection
Center reads gateway status from the same runtime status used by Settings and
the Capability Registry.

Useful CR paths:

- `xd.xenesis.gateway.status`
- `xd.xenesis.gateway.start`
- `xd.xenesis.gateway.stop`
- `xd.xenesis.gateway.restart`
- `xd.xenesis.gateway.openDashboard`

## External Messengers

The first actionable messenger set is Telegram, Slack, Discord, and webhook.
Each channel should be configured with environment variable names and allowlists
instead of hardcoded secrets.

The messenger catalog also includes planned OpenClaw/Hermes-style channels such
as WhatsApp, Signal, Microsoft Teams, Google Chat, iMessage, Matrix, IRC,
Mattermost, Nextcloud Talk, Nostr, Raft, Tlon, Synology Chat, Twitch, LINE,
WeChat, QQ Bot, Feishu/Lark, Yuanbao, Zalo, Email, SMS, Home Assistant, and
ntfy. These cards are read-only setup catalog entries until matching Xenesis
gateway adapters, authentication flows, allowlists, diagnostics, and live
verification exist.

Messenger cards expose `channelTemplate` metadata through
`xd.xenesis.connections.status`: category, adapter style, auth/setup mode,
expected capabilities, and required safety controls. Settings renders the same
metadata so channel planning is visible inside Xenesis Desk without presenting
planned channels as enabled runtime features.

Implemented channel cards also expose `channelTemplate.safety` metadata. Use
`xd.xenesis.channels.safety.status` to inspect access-group fields,
inbound/outbound delivery boundaries, bot-loop protection, approval guardrails,
troubleshooting signals, and read/control paths for Telegram, Slack, Discord,
and Webhook. This is a read-only safety/readiness model. OpenClaw-style access
groups are represented by the Xenesis runtime's actual allowlist fields such as
`allowedChatIds`, `allowedChannelIds`, `allowedGuildIds`, and `urlEnv`; there is
no separate OpenClaw access-group runtime in this repo. Channel writes remain on
`xd.xenesis.profiles.updateChannels`, and delivery tests remain on
`xd.xenesis.profiles.testChannel`.

Implemented channels also expose OpenClaw-style access-group readback through
`xd.xenesis.channels.accessGroups.status`. The read model maps Xenesis profile
allowlist fields such as `allowedChatIds`, `allowedChannelIds`,
`allowedGuildIds`, and `urlEnv` to reusable access-group bindings, reports only
`configured`, `empty`, or `unknown` value states, and treats empty required
allowlists as fail-closed diagnostics. It is read-only; channel mutations remain
on `xd.xenesis.profiles.updateChannels`.

Messenger cards also expose `channelTemplate.pairing` metadata. Use
`xd.xenesis.channels.pairing.status` to inspect channel pairing model, runtime
support, account scope, redacted credential refs, validation checks, readback
paths, diagnostics, and safety boundaries. Implemented channels report token or
webhook readiness from configured profile env fields and environment state
without returning raw values. Planned channels report expected pairing
requirements such as device-link, OAuth app, desktop bridge, mailbox, or local
network setup as planned metadata only; this path does not create QR sessions,
open OAuth flows, install adapters, approve accounts, mutate channel settings,
or send messages.

Messenger cards also expose `channelTemplate.userStory` metadata. Use
`xd.xenesis.channels.userStories.status` to inspect workflow type, runtime
support, user-story templates, prerequisite setup, CR read/control paths,
diagnostics, and safety boundaries for implemented and planned external
messenger channels. Use `xd.xenesis.channels.userStories.open` with
`{ "id": "<messenger-id>" }` to open Settings > Xenesis Agent > Connections and
focus the matching channel user-story card. Telegram, Slack, Discord, and
Webhook point to the existing gateway/test/readback paths. Planned messenger
channels remain planning surfaces only: user-story metadata does not enable a
gateway adapter, send messages, create pairing sessions, mutate allowlists, or
bypass approval policy.

Messenger cards also expose `channelSetupPlan` metadata. Use
`xd.xenesis.channels.setupPlans.status` to inspect the ordered review plan for
a messenger/channel and `xd.xenesis.channels.setupPlans.open` to focus that
plan inside Settings > Xenesis Agent > Connections. The plan joins messenger
view, channel routing, safety, access groups, pairing, user stories, channel
profile drafts, diagnostics, and setup requests into one read/open surface. It
is review-only orchestration metadata: it does not start gateway adapters, pair
accounts or devices, send messages, store credentials, mutate channel profiles,
or bypass approvals. Implemented channels may list existing approval-gated
profile apply/test CR paths as controlled steps; planned channels remain
review-only and do not expose apply/test steps.

Implemented messenger cards also expose `channelProfileDraft` metadata. Use
`xd.xenesis.channels.profileDrafts.status` to inspect the profile env-reference
fields, allowlist fields, guardrails, missing required field list, diagnostics,
blocked actions, and safety boundaries before using
`xd.xenesis.profiles.updateChannels`. Use
`xd.xenesis.channels.profileDrafts.open` to focus the card and
`xd.xenesis.channels.profileDrafts.request` to record a local Action Inbox
review item. This is a review-only surface: it does not mutate channel
settings, update allowlists, write profiles, send test messages, start the
gateway, store secrets, or bypass approval policy.

Messenger cards also expose a `messengerView` read model. Use
`xd.xenesis.messengers.views.status` to inspect the internal Desk surface for a
messenger, including runtime support, setup surface, CR open/read/control paths,
diagnostics, and safety boundaries. Use `xd.xenesis.messengers.views.open` with
`{ "id": "<messenger-id>" }` to open Settings > Xenesis Agent > Connections and
focus the messenger card. Planned channels open setup/readiness planning views
only; they do not expose a gateway adapter, account pairing flow, or delivery
action until runtime support exists.

`xd.xenesis.messengers.views.open` also accepts an optional `section` value when
the Agent or operator needs to focus a specific internal messenger-view section.
Current section values are `connection-card`, `setup`, `channel-template`,
`routing`, `safety`, `access-groups`, `pairing`, `setup-plan`, `profile-draft`,
and `user-stories`.

Examples:

```json
{ "id": "telegram", "section": "routing", "ensureVisible": true }
```

```json
{ "id": "slack", "section": "profile-draft", "ensureVisible": true }
```

Messenger view sections are read/open planning surfaces only. Opening a section
does not start the gateway, create pairing/OAuth/device-link sessions, store
secrets, mutate channel profiles, update allowlists, execute provider tools, or
send messages.

Each implemented channel also carries the routing guardrails that the runtime
already enforces: `approvalMode`, `maxTurns`, and `maxTokens`. These settings
are editable in Settings and visible to CR callers through the channel update
schema. Richer routing concepts such as per-account bindings or default-agent
selection should not be treated as implemented until the Xenesis runtime has
matching config, dispatcher behavior, and live verification.

Useful CR paths:

- `xd.xenesis.profiles.updateChannels`
- `xd.xenesis.profiles.testChannel`
- `xd.xenesis.channels.setupPlans.status`
- `xd.xenesis.channels.setupPlans.open`
- `xd.xenesis.channels.pairing.status`
- `xd.xenesis.channels.userStories.status`
- `xd.xenesis.channels.userStories.open`
- `xd.xenesis.channels.profileDrafts.status`
- `xd.xenesis.channels.profileDrafts.open`
- `xd.xenesis.channels.profileDrafts.request`
- `xd.xenesis.messengers.views.status`
- `xd.xenesis.messengers.views.open`

## Access Control

Messenger channels should restrict delivery by chat ID, channel ID, guild ID, or
webhook URL configuration. Treat allowlists as part of setup readiness.

## Routing

Inbound channel sessions determine where replies are delivered. When debugging
external bot behavior, inspect channel status, allowed IDs, channel guardrails,
gateway status, and bot session records before changing provider settings.

## Bot Loop Protection

Avoid connecting Xenesis to channels where it can receive its own outbound
messages. If loop behavior is suspected, disable the channel, inspect gateway
logs, and re-enable only after the channel source is isolated.

## Troubleshooting Ladder

1. Refresh Connection Center status.
2. Check provider readiness.
3. Check MCP status.
4. Check gateway status.
5. Check missing channel environment variables.
6. Check access allowlists.
7. Run a sanitized test send.
8. Inspect diagnostics and bot session records.

## Connection Status Through CR

Use `xd.xenesis.connections.status` to inspect provider, MCP, tool, gateway,
messenger, and guide readiness through the Capability Registry. Mutating setup
actions stay on their existing CR paths so approval and audit behavior remains
explicit.

Use `xd.xenesis.onboarding.status` and `xd.xenesis.onboarding.open` to inspect
or focus the initial setup checklist through CR. The read model is derived from
the Connection Center onboarding section and covers first chat, local CLI/MCP,
recommended tools, gateway, messenger routing, and end-to-end test send. It is a
setup/readiness surface only; mutating actions remain on the provider, MCP,
gateway, tool, channel, and settings CR paths listed by each step.

Use `xd.xenesis.providers.setup.status` to inspect the active AI provider setup
metadata through CR. The read model is scoped to identity, auth mode, credential
state, endpoint, runtime profile, retry/fallback policy, local CLI boundary,
verification, CR readback paths, and risk controls. It is read-only and does not
change provider selection or leak secret values.

Use `xd.xenesis.providers.routing.status` to inspect the active AI provider
routing metadata through CR. The read model covers user-settings/profile route
source, runtime provider/model, retry policy, configured fallback chain,
credential-pool state, diagnostics, and safety boundaries. It is read-only,
never returns secret values, and does not mutate provider selection, model
selection, runtime routing, fallback policy, credentials, or local CLI selection.

Use `xd.xenesis.providers.views.status` and
`xd.xenesis.providers.views.open` to inspect or open the internal Desk provider
setup/readiness view. The open path focuses the provider card in Settings >
Xenesis Agent > Connections and is a UI-control path only. It does not change
the active provider, credentials, model, runtime routing, or fallback policy.

Use `xd.xenesis.providers.setupPlans.status` and
`xd.xenesis.providers.setupPlans.open` to inspect or open the unified AI
provider setup plan through CR. The plan is derived from existing provider
setup, routing, view, profile draft, diagnostic, and setup-request metadata.
It can reference the ready approval-gated provider profile apply path, but the
setup-plan path itself is read/open only and does not mutate provider settings,
store raw secrets, edit fallback chains, change local CLI selection, run
provider prompts, or bypass approvals.

Use `xd.xenesis.providers.profileDrafts.status`,
`xd.xenesis.providers.profileDrafts.open`, and
`xd.xenesis.providers.profileDrafts.request` to inspect, open, or request review
of the active AI provider profile draft. The request path records a local Action
Inbox item with field states, missing required fields, guardrails, diagnostics,
blocked actions, and safety boundaries only. It does not mutate provider
settings, model settings, fallback chains, credentials, local CLI selection, or
run provider prompts.

Use `xd.xenesis.connections.open` with `{ "id": "<connection-id>" }` to open
Settings > Xenesis Agent > Connections and focus a specific provider, tool,
guide, or messenger card. This is a UI-control path; it does not mutate
connection settings.

Use `xd.xenesis.connections.diagnostics.status` and
`xd.xenesis.connections.diagnostics.open` to inspect or open a unified
diagnostic runbook for a Connection Center card. Runbooks aggregate the relevant
status, setup, connector, view, user-story, readback, control, diagnostic, and
safety metadata for the selected card. They are read/open planning surfaces only
and do not run checks, install adapters, complete OAuth, store tokens, execute
tools, send messages, mutate settings, or bypass approvals.

Use `xd.xenesis.guides.status` and `xd.xenesis.guides.open` to inspect or open
the guide catalog through CR. The guide catalog covers setup playbooks,
integration guides, and user-story templates. It is a navigation/readiness
surface only; `guides.open` focuses the Settings guide card by default and only
opens the repo-local guide file when `openFile` is true. Actual setup and
runtime actions stay on the provider, tool, channel, file, and settings CR paths
listed by the selected guide.

Use `xd.xenesis.channels.routing.status` to inspect implemented external bot
channel routing metadata through CR. The read model covers Telegram, Slack,
Discord, and Webhook route bindings, allowlist fields, auth or pairing mode,
default agent, session scope, diagnostics, and delivery features. Channel writes
still go through `xd.xenesis.profiles.updateChannels`, and delivery tests still
go through `xd.xenesis.profiles.testChannel`.

Use `xd.xenesis.channels.safety.status` to inspect implemented external bot
channel safety metadata through CR. The read model covers access-group
allowlist fields, inbound/outbound delivery boundaries, bot-loop protection,
approval guardrails, troubleshooting signals, readback paths, and control paths.
It is read-only; it does not create access groups, mutate channel settings,
enable planned adapters, send test messages, or bypass approval paths.

Use `xd.xenesis.channels.accessGroups.status` to inspect implemented external
bot channel access-group metadata through CR. The read model covers Telegram,
Slack, Discord, and Webhook profile allowlist bindings, redacted value states,
fail-closed diagnostics, readback paths, and channel update/test control
boundaries. It never returns raw chat IDs, channel IDs, guild IDs, endpoint
values, or secrets.

Use `xd.xenesis.channels.pairing.status` to inspect external bot channel pairing
metadata through CR. Implemented Telegram, Slack, Discord, and Webhook entries
report env-token, signed-token, or webhook-url readiness using redacted
credential refs and configured/missing/not-required states only. Planned
messenger entries remain planned pairing requirements; the path is read-only and
does not create QR/device links, OAuth installs, desktop-host sessions, channel
mutations, or delivery tests.

Use `xd.xenesis.channels.userStories.status` and
`xd.xenesis.channels.userStories.open` to inspect or open external messenger
channel workflow planning surfaces through CR. Implemented Telegram, Slack,
Discord, and Webhook workflows describe prompt intake, scoped replies, sanitized
tests, and the existing read/test CR paths. Planned messenger workflows describe
setup stories only and do not enable delivery, send replies, install adapters,
create pairing flows, mutate channel settings, or bypass approval guardrails.

Use `xd.xenesis.channels.setupPlans.status` and
`xd.xenesis.channels.setupPlans.open` to inspect or open unified external
messenger channel setup plans through CR. Each plan orders messenger view,
routing, safety, access-group, pairing, user-story, channel profile draft,
diagnostic runbook, and setup-request steps. Setup plans are read/open
orchestration metadata only; they do not start gateways, pair accounts or
devices, send messages, store credentials, mutate channel profiles, or bypass
approval. Implemented channels may reference existing approval-gated profile
draft apply and sanitized test-send paths; planned channels stay review-only.

Use `xd.xenesis.channels.profileDrafts.status`,
`xd.xenesis.channels.profileDrafts.open`, and
`xd.xenesis.channels.profileDrafts.request` to inspect, focus, or record a
review-only profile draft for implemented external bot channels. The read model
covers Telegram, Slack, Discord, and Webhook profile field readiness, guardrails,
missing required settings, diagnostics, blocked actions, and safety boundaries.
It returns env reference names and readiness states only; it does not return raw
secret values, mutate channel settings, update allowlists, write profiles, send
test messages, start the gateway, or bypass approval guardrails.

Use `xd.xenesis.messengers.views.status` and
`xd.xenesis.messengers.views.open` to inspect or open internal Desk
setup/readiness views for external messengers. Implemented Telegram, Slack,
Discord, and Webhook cards can point to existing profile channel update/test CR
paths. Planned messenger cards are planning views only; they do not create a
gateway adapter, pairing flow, delivery action, or approval bypass.
Pass optional `section` values such as `routing`, `safety`, `access-groups`,
`pairing`, `setup-plan`, `profile-draft`, `channel-template`, or `user-stories`
when the caller needs to focus a specific internal messenger-view detail. These
section opens stay read/open only: they do not start gateways, create pairing or
device-link sessions, store secrets, mutate profiles or allowlists, execute
provider tools, or send messages.

Use `xd.xenesis.tools.setup.status` to inspect external tool setup metadata
through CR. The read model covers Fetch, Filesystem, GitHub, Notion, Linear,
Google Workspace, and Google Calendar. It is read-only; MCP bridge state still
comes from `xd.mcp.settings.status`, and mutating tool workflows must use their
own verified provider/MCP/CR paths.

Use `xd.xenesis.tools.installPlans.status` and
`xd.xenesis.tools.installPlans.open` to inspect or open on-demand external tool
setup plans through CR. The open path focuses the matching Connection Center
tool card. These plans expose copy/template/OAuth readiness only; they do not
execute shell commands, install MCP servers, complete OAuth, write settings,
store secrets, or execute tools.

Use `xd.xenesis.tools.connectors.status` to inspect external tool connector
readiness through CR. The read model is redacted: it exposes credential names and
states, not token values. Planned Google Workspace/Google Calendar connectors
remain `planned-oauth` and do not imply that OAuth or MCP installation has been
completed.

Use `xd.xenesis.tools.views.status` and `xd.xenesis.tools.views.open` to inspect
or open internal Desk setup/readiness views for external tools. The open path
focuses the matching Connection Center tool card and keeps planned Google
Workspace/Google Calendar flows visibly planned until a verified OAuth/MCP
template exists.
Pass optional `section` values such as `mcp-template`, `oauth-draft`,
`connector`, `setup-plan`, `install-plan`, `action-policy`, or `user-stories`
when the caller needs to focus a specific internal tool-view detail.

Use `xd.xenesis.tools.userStories.status` and
`xd.xenesis.tools.userStories.open` to inspect or open external tool workflow
planning surfaces. The read model covers web context, workspace context, repo
triage, Notion knowledge capture, Linear task triage, Google inbox triage, and
Google Calendar context workflows. It is read/open only and does not execute
provider tools, complete OAuth, send email, update tasks/documents, or mutate
calendar events.

Use `xd.xenesis.tools.actions.status`, `xd.xenesis.tools.actions.open`, and
`xd.xenesis.tools.actions.request` to inspect, open, or request review of
external tool action policy catalogs. The request path records a local Action
Inbox review item with action groups, approval policies, diagnostics, blocked
actions, and safety boundaries only. It does not run provider tools, complete
OAuth, store tokens, write MCP config, send email, update documents/tasks/issues,
create/update/delete calendar events, mutate external systems, or bypass
approvals.
