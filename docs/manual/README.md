# Xenesis Desk Manual

Xenesis Desk is an Early alpha desktop workbench for running local and remote AI agents with real terminals, MCP tools, UI artifacts, and workflow panels. This manual is the public English version of the working manual used to explain the current product surface.

The manual is written for two audiences:

- Users who want to understand where each feature lives.
- Agents that need reliable product context before answering questions or operating the app.

## Product Names

| Name | Meaning |
|---|---|
| Xenesis Desk | The Electron desktop app. |
| Xenesis Agent | The built-in agent panel inside Xenesis Desk. |
| Xenis | A short user-facing name used by the Desk experience. |
| `xenesis_desk` | Public MCP, skill, and gateway identifier. |
| `xenis` | Internal home and state path abbreviation. |
| `xd` | Capability Registry, CLI, and skill prefix. |
| Gowoori | The AI-to-UI rendering layer for Markdown, XCON, Sketch, and workflow artifacts. |
| Hermes Plug-in | Provider integration surface for external AI and bot channels. |

## Manual Sections

| Section | File |
|---|---|
| Workbench and docking | [01-workbench-docking.md](01-workbench-docking.md) |
| Terminal Command Center | [02-terminal-command-center.md](02-terminal-command-center.md) |
| Xenesis Agent | [03-xenesis-agent.md](03-xenesis-agent.md) |
| Gowoori and artifacts | [04-gowoori-artifacts.md](04-gowoori-artifacts.md) |
| Capability Registry, MCP, gateway, and bots | [05-cr-mcp-gateway-bots.md](05-cr-mcp-gateway-bots.md) |
| Files, workspace, and settings | [06-files-workspace-settings.md](06-files-workspace-settings.md) |
| Extensions, workflow, and operations | [07-extensions-workflow-ops.md](07-extensions-workflow-ops.md) |
| Troubleshooting and agent routing | [08-troubleshooting-agent-routing.md](08-troubleshooting-agent-routing.md) |
| Onboarding and connections | [09-onboarding-connections.md](09-onboarding-connections.md) |
| OpenClaw-style channel setup | [10-openclaw-channel-setup.md](10-openclaw-channel-setup.md) |
| External tool integrations | [11-external-tool-integrations.md](11-external-tool-integrations.md) |
| Agent user stories | [12-agent-user-stories.md](12-agent-user-stories.md) |

## Core Model

Xenesis Desk separates the fixed shell from the docking workspace.

- Fixed shell: top toolbar, left navigation, global menus, and app-level controls.
- Docking workspace: movable panels for documents, terminals, agents, artifacts, tools, and diagnostics.
- Terminal Command Center: the central surface for selecting terminals, sending commands, managing command bundles, and watching automation streams.
- Xenesis Agent: the native Desk agent that can call Capability Registry actions, use MCP tools, interact with Gowoori, and coordinate external bots.

## Current Settings Map

The main settings areas are:

- General: app-level preferences.
- Xenesis Agent: Connection Center, agent runtime, gateway, external bot channels, and Gowoori agent tools.
- AI Provider: Hermes Plug-in, Local CLI MCP and Skill installer, and BYOK provider profiles.
- Terminal Management: terminal profiles and captured terminal state.
- Remote Files: remote workspace profiles and credentials.
- Automation: stream, watch, and response behavior.
- Extensions: extension enablement and workflow tools.
- Workspace: workspace roots and behavior.
- Interface: language, display mode, shortcuts, and window size or position.
- Info: app information, secrets, and settings backup.

## Agent Answering Rules

When answering product questions:

- Name the exact panel, menu, or settings path.
- Distinguish a docked pane from fixed shell UI.
- Distinguish built-in Xenesis Agent behavior from external CLI agents.
- Distinguish MCP bridge ports from the Xenesis Gateway port.
- Mention early alpha limits when behavior is experimental or gated.
