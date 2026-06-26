# Capability Registry, MCP, Gateway, and Bots

Xenesis Desk exposes several control layers. They are related but not interchangeable.

## Control Layers

| Layer | Role |
|---|---|
| Capability Registry | In-app `xd.*` capabilities and permission policy. |
| MCP bridge | Tool bridge used by external agents. |
| Xenesis Gateway | HTTP and bot channel gateway for `/desk` commands. |
| Hermes Plug-in | Provider and bot integration surface. |

## Capability Registry

Capability Registry is the app's internal action registry.

Common capability classes:

- App state.
- Pane and layout control.
- Terminal control.
- File and workspace operations.
- Artifact and Gowoori operations.
- Workflow and diagnostics operations.

Permission levels decide whether a capability can read state, preview changes, or apply changes.

## Dynamic Capability Paths

Capability names use the `xd.*` prefix. Some capabilities are static, while others are dynamically exposed based on enabled features, active workspace, or provider state.

If a capability is missing:

1. Check whether the feature is enabled.
2. Check permission level.
3. Check whether the relevant panel, terminal, or provider is running.
4. Refresh the capability explorer or bridge state.

## MCP Bridge

The MCP bridge lets external agents call Desk tools.

Common development conventions:

- Release bridge port: `3847`.
- Development bridge port: `3848`.

Bridge state can be written below:

- `%USERPROFILE%\.xenis\mcp\bridge.json`
- `%USERPROFILE%\.xenis-dev\mcp\bridge.json`

The exact path depends on release versus development mode and configured home directory.

Terminal image rendering uses the same bridge. The local CLI command below calls the Capability Registry path `xd.terminals.image.show` and auto-selects the active terminal when `--term-id` is omitted:

```bash
node scripts/xd.mjs image "<image-path>" --width=80% --height=auto
```

Use `--term-id=<termId>` when a specific terminal should receive the image.

The Xenesis TUI exposes the same bridge path with slash commands:

```text
/image "<image-path>" --width=80% --height=auto
/xcon-image ".\artifact.xcon.md" --theme=dark --title=Preview
```

These commands are listed by TUI slash suggestions and `/help`. Type `/` and filter by `image`, `im`, `xcon`, or Korean descriptions to find them. The suggestion footer shows examples and the completion that `Enter` will accept.

Both commands route through the Desk bridge:

| TUI command | Capability Registry path |
|---|---|
| `/image` | `xd.terminals.image.show` |
| `/xcon-image` | `xd.terminals.image.showXcon` |

## MCP Tools

Common tool categories:

- Read app status.
- List terminals.
- Send terminal input.
- Validate or create XCON Markdown.
- Export artifacts.
- Start or inspect workflows.
- Open panes or files.

Tools may return unauthorized or unavailable states when permissions, app state, or bridge connection are not ready.

### Desk-visible Subagents

When delegated Codex, Claude, Gemini, Xenesis, or custom agent work should be visible in the app, use the `xenesis_desk_subagent_*` MCP tools instead of a hidden background subagent:

- `xenesis_desk_subagent_start` opens a visible terminal tab and attaches metadata such as `kind: xenesis-desk-subagent`, `subagentId`, `parentTermId`, `agent`, `task`, and `command`.
- Xenesis runtime tool `desk_subagents_start_many` starts one to four visible workers and can arrange the document window as a grid after opening them.
- `xenesis_desk_subagent_list` lists terminal sessions so the parent can find worker terminals.
- `xenesis_desk_subagent_tail` reads recent output before the parent summarizes the delegated work.
- `xenesis_desk_subagent_stop` stops a visible worker terminal when the user asks to cancel or the worker is clearly stuck.

Native Codex or Claude subagent hooks cannot redirect an already-started hidden subagent into a Desk terminal. Install `scripts/xenesisDeskSubagentHook.mjs` only to record native hook lifecycle events into diagnostics and to remind future delegated work to use the visible MCP path.

For a deterministic visual check, open Xenesis Agent and run:

```text
/subagents-demo --keep-open
```

Maintainer-only automated demo runners may exist in local development workspaces, but the public manual only relies on the built-in app command.

## `/xd` Skill Surface

External CLI agents can use `/xd` commands or skills to discover and operate Desk capabilities. This is different from `/desk`, which targets the gateway command surface.

Use `/xd` for agent-side capability workflows. Use `/desk` for gateway and bot channel operations.

## Xenesis Gateway

The Xenesis Gateway manages external channel commands. The default gateway port is commonly `3338`.

Use `Settings > Xenesis Agent > Gateway` to inspect or configure the gateway.

Common `/desk` command groups:

- Terminal list and routing.
- Agent list and attachment.
- Watch or stream setup.
- Send commands or prompts.
- Detach or stop a channel.

### Remote Desk Terminal Selection

Use `/desk terminals` from Telegram, Slack, or Discord to list visible Xenesis Desk terminals. The response is a compact table with terminal number, ID, title, active state, and recent context.

When the channel supports buttons, Xenesis Gateway adds `Attach N` buttons for the first visible terminals. Selecting a button sends `/desk attach N` back through the same command router.

Text entry remains available on every channel:

```text
/desk terminals
/desk attach 1
/desk attach mcp-terminal-31bd
/desk attach 31bd
/desk status
/desk watch
/desk events
/desk send npm test
/desk detach
```

Use the full terminal ID when a suffix matches more than one terminal.

## External Bot Channels

External bots can connect through gateway policies. Channels may include local test bots, messaging adapters, or provider-specific integrations.

A channel normally needs:

- Registration.
- Authorization.
- Attachment to a terminal, agent, or route.
- Watch or stream activation.

Without watch or stream activation, a channel may be connected but silent.

Settings are managed in `Settings > Xenesis Agent > External Bot Channels`.
Those channel settings are stored in `XENIS_HOME/profiles.json` as part of the active Xenesis profile.
They are separate from Bot session snapshots.

## Xenesis Bot Channel Contract

`Xenesis Bot` is the common Desk cockpit for external bot channels. Hermes, Telegram,
Slack, Discord, Webhook, external agents, and external servers can all report into the
same surface. The Bot surface is not owned by Hermes.

Channel events should include these fields when they are sent to the MCP bridge Bot
event endpoint or saved through `xd.mcp.botSessions.save`:

| Field | Purpose |
|---|---|
| `channel` | Normalized channel name. Supported values are `hermes`, `telegram`, `slack`, `discord`, `webhook`, `agent`, `server`, and `external`. |
| `sessionId` | Stable conversation key. Reuse it so later messages restore into the same Bot tab. |
| `messageId` | Stable message key for stream/final replacement and highlighting. |
| `source` | Human-readable adapter or server name, such as `Telegram gateway` or `Slack app`. |
| `inputUrl` | Loopback URL that the Desk composer posts to when the user replies. |
| `placement` | Optional first-open placement: `tab`, `left`, `right`, `top`, or `bottom`. |

Example event:

```json
{
  "type": "message",
  "channel": "telegram",
  "sessionId": "telegram:123456",
  "messageId": "telegram:123456:1",
  "role": "assistant",
  "source": "Telegram gateway",
  "status": "completed",
  "inputUrl": "http://127.0.0.1:3859/message",
  "placement": "right",
  "content": "Desk command completed."
}
```

Channel-specific examples should keep the same shape and only change `channel`,
`sessionId`, `messageId`, and `source`:

```json
{ "channel": "slack", "sessionId": "slack:C01", "messageId": "slack:C01:1", "source": "Slack app" }
{ "channel": "discord", "sessionId": "discord:guild:channel", "messageId": "discord:guild:channel:1", "source": "Discord gateway" }
{ "channel": "webhook", "sessionId": "webhook:ops", "messageId": "webhook:ops:1", "source": "Webhook relay" }
```

Bot session snapshots are persisted in the MCP bridge directory as `bot-sessions.json`.
The CLI can read the same state through `XENIS_BOT_SESSIONS_FILE`; when that variable is
not set, it resolves beside the MCP bridge state file or under the default MCP bridge
directory. This file stores Bot session history, channel labels, `inputUrl`, messages,
approvals, and artifact metadata. It does not store external channel credentials.

Summary of storage roles:

| Data | Storage |
|---|---|
| `channel settings` | `XENIS_HOME/profiles.json` |
| `Bot session snapshots` | MCP bridge directory `bot-sessions.json` or `XENIS_BOT_SESSIONS_FILE` |

## `e2e_bot`

`e2e_bot` is a test-oriented bot channel used for end-to-end validation. Stream filters can isolate this channel so automated tests do not pick up unrelated terminal output.

## Unauthorized and Connection Errors

| Error | Likely cause |
|---|---|
| Unauthorized | Missing token, wrong channel policy, or insufficient permission. |
| `ECONNREFUSED` | Gateway or bridge is not running, port is wrong, or the app is down. |
| Tool unavailable | Feature disabled, panel not initialized, or bridge state stale. |
| Bot silent | Channel attached but not watched, or stream filter excludes output. |

## Hermes Plug-in

Hermes Plug-in is configured under `Settings > AI Provider > Hermes Plug-in`.

Related UI entry points may appear under:

- Tools menu.
- Hermes panels.
- Provider setup screens.
- Bot channel diagnostics.

Provider files and generated assets should not be assumed to be required in the installed app unless the release package explicitly includes them.

## Agent Guidance

When troubleshooting integrations:

- Distinguish MCP ports `3847` and `3848` from gateway port `3338`.
- Distinguish `/xd` from `/desk`.
- Verify authorization before debugging command syntax.
- Verify watch or stream state before expecting bot responses.
- Name the relevant settings path for provider and gateway changes.
