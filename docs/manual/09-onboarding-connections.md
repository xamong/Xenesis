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
`xd.xenesis.connections.status`.

Connection cards can include setup recipes, missing environment variables,
source documentation labels, and CR-first actions. `Open setup` routes through
`xd.panes.settings.open` to the relevant Settings surface. Guide cards route
through `xd.files.open` so the same action path is available to the Agent pane
and the renderer.

## AI Provider

The active provider comes from the user's settings and profile. Xenesis Desk does
not silently switch to a different keyed provider when credentials are missing.
`auto` resolves by credential scan, and local CLI selection remains separate from
provider identity.

## MCP And Tool Connections

The Connection Center shows MCP readiness and recommended tool connections.
Current recommended MCP templates include Fetch, Filesystem, GitHub, Notion, and
Linear. Google Workspace and Google Calendar appear as planned/manual
connections until a verified install template is bundled.

The actionable tool cards are manual setup recipes, not automatic installers.
They show required environment variables such as `GITHUB_TOKEN` or
`NOTION_TOKEN`, point users to the local CLI MCP settings, and keep any write
workflow behind the existing provider/MCP/CR verification path.

Google Workspace and Google Calendar intentionally do not expose install CR
actions yet. They remain planned until OAuth scopes, token storage, and a
verified MCP server template are selected and tested.

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
instead of hardcoded secrets. Google Chat, Microsoft Teams, and WhatsApp appear
as planned/manual cards until channel runtime support and verification are
implemented.

Useful CR paths:

- `xd.xenesis.profiles.updateChannels`
- `xd.xenesis.profiles.testChannel`

## Access Control

Messenger channels should restrict delivery by chat ID, channel ID, guild ID, or
webhook URL configuration. Treat allowlists as part of setup readiness.

## Routing

Inbound channel sessions determine where replies are delivered. When debugging
external bot behavior, inspect channel status, allowed IDs, gateway status, and
bot session records before changing provider settings.

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
