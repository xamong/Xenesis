# Terminal Command Center

Terminal Command Center is the primary execution surface in Xenesis Desk. It manages local terminals, command delivery, automation streams, and external bot routing.

## Role

Use Terminal Command Center when you need to:

- Run shell commands.
- Control CLI agents such as Codex, Claude, Gemini, Aider, Windsurf, or custom tools.
- Send the same command to one or more terminals.
- Watch terminal output and filter it into readable automation streams.
- Connect terminal sessions to MCP, Capability Registry, or gateway workflows.

## Sessions and Terminal IDs

Each terminal has a session identity. The UI may show a short terminal ID, display name, shell, current working directory, and process state.

Important fields:

- `termId`: the terminal identity used by tools and gateway commands.
- Current working directory: the path where commands execute.
- Shell or command: the process started for the terminal.
- Environment: inherited process environment plus profile-specific overrides.
- Status: running, exited, attached, detached, or unavailable.

## Terminal Images from the `xd` CLI

Agents and local operators can render a local image or image URL into a Desk terminal through the MCP/Capability Registry bridge.

For the common case, omit the terminal ID. The CLI asks Desk for the active terminal first, then falls back to another available terminal:

```bash
node scripts/xd.mjs image "<image-path>" --width=80% --height=auto
```

If the image should go to a specific terminal, pass the terminal identity explicitly:

```bash
node scripts/xd.mjs image "<image-path>" --term-id=term-123 --width 80% --height auto
```

The same option syntax works for XCON images:

```bash
node scripts/xd.mjs xcon-image ".\artifact.xcon.md" --term-id=term-123 --theme=dark --title=Preview
```

Inside the Xenesis TUI, use the matching slash commands. Press `/` and type `im` or `xcon-i` to see filtered suggestions:

```text
/image "<image-path>" --width=80% --height=auto
/xcon-image ".\artifact.xcon.md" --theme=dark --title=Preview
```

Both TUI commands call the Desk Capability Registry through the MCP bridge and target the active Desk terminal when `--term-id` is omitted.

## Xenesis TUI Command Palette

The Xenesis CLI TUI is the terminal-native operator surface for chat-oriented agent runs.

In Xenesis Desk, open it from:

```text
Xenesis > Xenesis TUI
```

This creates a Desk terminal rooted at the Desk workspace and starts the linked Xenesis CLI TUI.
The menu action is backed by the Capability Registry path `xd.xenesis.tui.open`, so the same launch path is available to Desk automation, command palette routing, and external agents after approval.

Start the installed or linked package from the Desk workspace:

```powershell
.\node_modules\.bin\xenesis.cmd tui --cwd .
```

For source-level development from the Desk workspace, run:

```powershell
npx tsx packages/xenesis/src/cli/main.ts tui --cwd .
```

The TUI is designed so operators do not need to memorize every command:

- Type `/` to open slash suggestions.
- Filtering matches command names, usage strings, aliases, English descriptions, and Korean descriptions.
- Use `Tab` and `Shift+Tab` to move through multiple suggestions. If only one suggestion matches, `Tab` completes it.
- Press `Enter` to accept the selected suggestion. If the typed command is already exact, `Enter` submits it.
- Use `Esc` to hide suggestions first, then clear the input.
- Use `/help` or `/commands` to open the categorized command palette.

The footer shows detail for the selected suggestion, including examples, aliases, and the completion that `Enter` will accept.

## Xenesis TUI Navigation

The TUI header is split into three rows:

| Row | Purpose |
|---|---|
| `runtime` | Provider, model, approval mode, and Desk bridge status. |
| `state` | Current run status and turn count. |
| `session` | Current session id, context count, latest session, and resumed session. |

Transcript and output navigation use the same keys:

| Key | Behavior |
|---|---|
| `PageUp` / `PageDown` | Scroll command output when output is visible; otherwise scroll the transcript. |
| `Home` / `End` | With empty input, jump to the top or bottom of output/transcript. |
| `/output expand` | Expand the latest command output panel. |
| `/output compact` | Return command output to compact view. |
| `/output save` | Save the latest command output to a file under the Xenesis home state directory. |
| `/output clear` | Hide the latest command output panel. |

When the transcript has more rows than fit on screen, its title includes the visible range, such as `Transcript 11-20/20`.

## Command Center Controls

Common controls include:

| Control | Purpose |
|---|---|
| Target | The terminal that receives the next command. |
| Target list | A multi-target selection for fan-out commands. |
| Send mode | Determines whether input is sent as text, command, event, or bundle item. |
| Terminator | Appends Enter or another line ending. |
| Command input | The command or text to send. |
| History | Recently sent commands. |
| Bundles | Saved command groups for repeated workflows. |

## Terminators

The common terminators are:

- `\r`: carriage return, commonly used for terminal Enter events.
- `\n`: line feed.
- `\r\n`: Windows-style newline.
- Event mode: sends a structured terminal input event instead of raw text.

If a command appears in the terminal but does not execute, the terminator is the first thing to check.

## Automation Modes

| Mode | Behavior |
|---|---|
| Stream | Captures filtered assistant-readable output. |
| Watch | Watches a terminal or external bot channel for changes. |
| Respond | Sends a response through a configured bot or agent channel. |

External bot streams should only be treated as live after the bot has been attached and watched with the gateway command flow.

## Stream Filters

Stream filters remove CLI chrome and keep useful assistant output.

Typical filter families:

- Codex.
- Claude.
- Gemini.
- Aider.
- Windsurf.
- Shared generic terminal output.
- `e2e_bot` for end-to-end bot tests.

If output is too noisy, switch to a narrower filter. If output is missing, check whether the filter is too strict.

## External Bot Flow

The gateway command flow is usually:

1. List terminals with `/desk terminals`.
2. Attach a bot or agent channel to a terminal.
3. Start watching the terminal or channel.
4. Send commands or prompts.
5. Detach when the workflow is done.

The exact command names depend on the gateway channel, but `/desk` commands are the entry point.

## Saved Terminal State

Terminal profiles can be created from the current terminal state. The profile can capture information such as:

- Current folder.
- Launch command or shell.
- Environment variables.
- Display name.
- Startup behavior.

The profile is staged in `Settings > Terminal Management`. It is not final until the user saves it from that settings section.

## Logs

Use Diagnostics or Log Center for app logs. Terminal and gateway state may also be written below the Xenis home directory:

- `%USERPROFILE%\.xenis`
- `%USERPROFILE%\.xenis-dev`

The development home is used by dev builds or when explicitly configured.

## Common Issues

| Symptom | First check |
|---|---|
| Command text appears but does not run | Terminator setting. |
| Command goes to the wrong terminal | Command Center target. |
| Stream output is unreadable | Filter selection. |
| External bot does not respond | Gateway authorization and watch state. |
| Terminal cannot be found | Current terminal list and `termId`. |

## Agent Guidance

When giving instructions, name both the UI location and the state to verify. Example: "Open Terminal Command Center, select the target terminal, set the terminator to Enter, then send the command."
