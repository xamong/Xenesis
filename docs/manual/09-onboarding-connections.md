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

Guide cards also expose a structured `guideCatalog` read model. Use
`xd.xenesis.guides.status` to inspect setup playbooks, integration guides, and
user-story templates for provider setup, MCP/external tools, gateway/channel
readiness, and CR-controlled Desk workflows. Use `xd.xenesis.guides.open` with
`{ "id": "<guide-id>" }` to focus the matching Settings guide card. Add
`"openFile": true` when the caller also wants to open the repo-local guide file.
This surface is read-only except for opening the guide/view; it does not install
tools, create OAuth flows, send messages, or mutate provider/channel settings.

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

The same provider card exposes a `providerView` read model for the internal Desk
surface. Use `xd.xenesis.providers.views.status` to inspect the view metadata and
`xd.xenesis.providers.views.open` to open Settings > Xenesis Agent > Connections
focused on the active provider card. Provider views are setup/readiness surfaces
only: they do not mutate provider selection, model selection, credentials,
runtime routing, or fallback policy.

The provider card also exposes a `providerRouting` read model. Use
`xd.xenesis.providers.routing.status` to inspect route source, active
provider/model, runtime provider/model, retry count, configured fallback
providers, credential-pool state, diagnostics, and safety boundaries. The
fallback chain is read from the active Xenesis profile's `providerFallbacks`.
Credential pools expose provider names, env var names, and configured/missing or
not-required state only. They never serialize API key values, bridge tokens, or
provider secrets. This path is read-only and does not perform fallback, change
the active provider, or change local CLI selection.

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

Messenger cards also expose a `messengerView` read model. Use
`xd.xenesis.messengers.views.status` to inspect the internal Desk surface for a
messenger, including runtime support, setup surface, CR open/read/control paths,
diagnostics, and safety boundaries. Use `xd.xenesis.messengers.views.open` with
`{ "id": "<messenger-id>" }` to open Settings > Xenesis Agent > Connections and
focus the messenger card. Planned channels open setup/readiness planning views
only; they do not expose a gateway adapter, account pairing flow, or delivery
action until runtime support exists.

Each implemented channel also carries the routing guardrails that the runtime
already enforces: `approvalMode`, `maxTurns`, and `maxTokens`. These settings
are editable in Settings and visible to CR callers through the channel update
schema. Richer routing concepts such as per-account bindings or default-agent
selection should not be treated as implemented until the Xenesis runtime has
matching config, dispatcher behavior, and live verification.

Useful CR paths:

- `xd.xenesis.profiles.updateChannels`
- `xd.xenesis.profiles.testChannel`
- `xd.xenesis.channels.pairing.status`
- `xd.xenesis.channels.userStories.status`
- `xd.xenesis.channels.userStories.open`
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

Use `xd.xenesis.connections.open` with `{ "id": "<connection-id>" }` to open
Settings > Xenesis Agent > Connections and focus a specific provider, tool,
guide, or messenger card. This is a UI-control path; it does not mutate
connection settings.

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

Use `xd.xenesis.messengers.views.status` and
`xd.xenesis.messengers.views.open` to inspect or open internal Desk
setup/readiness views for external messengers. Implemented Telegram, Slack,
Discord, and Webhook cards can point to existing profile channel update/test CR
paths. Planned messenger cards are planning views only; they do not create a
gateway adapter, pairing flow, delivery action, or approval bypass.

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

Use `xd.xenesis.tools.userStories.status` and
`xd.xenesis.tools.userStories.open` to inspect or open external tool workflow
planning surfaces. The read model covers web context, workspace context, repo
triage, Notion knowledge capture, Linear task triage, Google inbox triage, and
Google Calendar context workflows. It is read/open only and does not execute
provider tools, complete OAuth, send email, update tasks/documents, or mutate
calendar events.
