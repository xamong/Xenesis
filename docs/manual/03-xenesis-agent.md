# Xenesis Agent

Xenesis Agent is the built-in agent surface inside Xenesis Desk. It is distinct from external CLI providers and bot channels.

## Naming

| Name | Meaning |
|---|---|
| Xenesis Agent | Native agent panel in the Desk app. |
| External CLI agent | A terminal-run provider such as Codex, Claude, Gemini, Aider, or another CLI. |
| Hermes bot | A provider or bot channel connected through Hermes Plug-in or gateway integration. |
| XamongCode | A gated Phase 5 provider surface. It is hidden unless explicitly enabled. |

## Panel Structure

The agent panel commonly contains:

- Header: current agent identity, model, provider, and runtime state.
- Chat transcript: user and assistant messages.
- Work log: tool calls, actions, and operational status.
- Raw stream: lower-level stream output for debugging.
- Input: prompt and command entry.
- Status bar: connection, runtime, gateway, and permission hints.

The panel is usually docked on the right side of the workspace, but it can be moved like any other dock pane.

## Badges and Status

Common status indicators describe:

- Runtime mode.
- Gateway connection.
- Capability Registry permission level.
- MCP bridge state.
- External bot attachment.
- Gowoori artifact activity.

If a badge and the transcript disagree, trust the detailed logs and Diagnostics panel.

## Inputs

The agent accepts natural language and command-style inputs.

Examples:

- `/status`
- `/subagents-demo --keep-open`
- "Open the artifact library."
- "Check the active terminal and summarize the last output."
- "Create an XCON Markdown artifact from this content."

Available commands depend on the enabled runtime and permissions.

## Message Flow

A typical message flow is:

1. User sends a prompt in the Xenesis Agent panel.
2. The runtime decides whether to answer directly or call a tool.
3. Capability Registry, MCP, gateway, or Gowoori actions may run.
4. Results stream back to the chat and work log.
5. Generated files or artifacts open in the relevant dock pane.

## Runtime Modes

| Mode | Description |
|---|---|
| Embedded | Runs through the native Desk runtime. |
| External gateway | Routes through the Xenesis Gateway or external bot channel. |

Embedded mode is best for local app control. External gateway mode is used when a CLI agent or bot channel needs to operate through Desk.

## CLI TUI

The package-level Xenesis CLI also provides a terminal TUI. Use it when the operator wants a Xenesis agent session inside a Desk terminal instead of the native Xenesis Agent pane.

From the Desk workspace, start the linked package with:

```powershell
.\node_modules\.bin\xenesis.cmd tui --cwd .
```

For source-level development, run:

```powershell
npx tsx packages/xenesis/src/cli/main.ts tui --cwd .
```

Useful TUI commands:

| Command | Purpose |
|---|---|
| `/status` | Show provider, model, approval mode, Desk bridge status, workspace, session, and context. |
| `/provider <name>` | Change or inspect the active provider. |
| `/model <name>` | Change the model used by later prompts. |
| `/approval <safe|auto|readonly>` | Change tool approval behavior. |
| `/sessions list` | List saved session logs. |
| `/resume <session-id> <prompt>` | Continue from a prior session. |
| `/compact [session-id]` | Compact the latest or selected session log. |
| `/image <path-or-url>` | Send a local image or image URL to the active Desk terminal through the Capability Registry bridge. |
| `/xcon-image <file-or-inline>` | Render an XCON/SKETCH file or snippet as an inline terminal image. |

Type `/` to filter commands by name, usage, alias, English text, or Korean text. Use `Tab` and `Shift+Tab` to move through suggestions, `Enter` to accept or submit, and `/help` for the full command palette.

## Settings

Use `Settings > Xenesis Agent` for:

- Agent runtime selection.
- Gateway configuration.
- External bot channels.
- Gowoori agent tool behavior.

Provider installation and CLI tool setup live under `Settings > AI Provider`, not under the Xenesis Agent section.

## Capability Registry Actions

The agent can call registered `xd.*` capabilities when the permission level allows it.

Typical action classes:

- Read app state.
- Open panes.
- Control terminals.
- Validate or create artifacts.
- Run safe file operations.
- Start or inspect workflows.

Actions that can change files, send terminal input, or operate external channels require stronger permission checks.

## External Bot Attachment

An external bot can be attached to:

- A terminal session.
- An agent channel.
- A gateway route.

Attachment alone is not enough for live response handling. The channel must also be watched or streamed through the relevant gateway command.

## Subagent Display

Subagent activity can be surfaced through MCP events such as `xenesis_desk_subagent_start`. The UI may show these events in the work log, raw stream, or a dedicated agent activity view.

For delegated work that should be visible to the user, prefer the Desk-visible subagent path instead of a hidden native CLI subagent. The parent agent should call `desk_subagents_start_many` when it needs two to four visible workers, or `desk_subagent_start` for one worker. Each worker opens as a Desk terminal with `kind: xenesis-desk-subagent` metadata, then the parent should inspect progress with `desk_subagent_tail` before summarizing.

The built-in `/subagents-demo` command demonstrates this path without relying on GowooriChat. Xenesis Agent receives the command, calls Capability Registry paths to start four visible worker terminals, arranges the document area as a grid, verifies each worker marker, and then stops the workers unless `--keep-open` is passed.

Native Codex or Claude subagent hooks are observer hooks only. Xenesis Desk records those lifecycle events in diagnostics when `scripts/xenesisDeskSubagentHook.mjs` is installed and the local bridge environment is available.

## Agent Guidance

When answering questions about Xenesis Agent:

- Clarify whether the user means the native panel or an external CLI agent.
- Point settings questions to `Settings > Xenesis Agent`.
- Point provider installation questions to `Settings > AI Provider`.
- Mention permissions when the requested action changes files, terminals, or external bot channels.
