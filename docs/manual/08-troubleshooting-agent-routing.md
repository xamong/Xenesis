# Troubleshooting and Agent Routing

Use this section to route user questions to the right feature area and diagnose common issues.

## Question Routing

| User asks about | Route to |
|---|---|
| Moving panels, missing tabs, layout | [Workbench and docking](01-workbench-docking.md) |
| Running commands, command target, terminal output | [Terminal Command Center](02-terminal-command-center.md) |
| Built-in agent panel, runtime, work log | [Xenesis Agent](03-xenesis-agent.md) |
| XCON, previews, artifact repair, exports | [Gowoori and artifacts](04-gowoori-artifacts.md) |
| MCP, `/xd`, `/desk`, gateway, bots | [Capability Registry, MCP, Gateway, and Bots](05-cr-mcp-gateway-bots.md) |
| Files, profiles, secrets, settings | [Files, Workspace, and Settings](06-files-workspace-settings.md) |
| Tools menu, extensions, workflow runner | [Extensions, Workflow, and Operations](07-extensions-workflow-ops.md) |

## Basic Check Order

1. Check whether the app is running and the expected build mode is active.
2. Check the exact UI location or settings section.
3. Check permissions and feature flags.
4. Check terminal, bridge, or gateway connection state.
5. Check Diagnostics and Log Center.
6. Reproduce with the smallest command or action.

## React Update Loop

Symptom:

- The UI reports "Maximum update depth exceeded."

Likely causes:

- A component state update is triggered repeatedly by render or effect dependencies.
- A panel subscription emits state changes too aggressively.
- A derived value is recreated every render and used as an effect dependency.

First checks:

1. Identify the panel or route that triggers the loop.
2. Check recent changes to effects, stores, and subscriptions.
3. Stabilize dependencies with memoization or narrower selectors.
4. Verify with typecheck and the relevant UI test.

## Tools Submenu Closes

Symptom:

- A submenu closes before the user can select an item.

First checks:

1. Reopen the tools menu.
2. Move directly to the intended group.
3. Check whether focus was stolen by a panel or overlay.
4. Check hover and pointer-leave handling if reproducing in development.

## Gateway Unauthorized

Symptom:

- Gateway command returns Unauthorized.

First checks:

1. Verify the token or channel credential.
2. Verify the channel policy.
3. Verify the requested action permission.
4. Confirm the command is going to the gateway, not the MCP bridge.

## Gateway `ECONNREFUSED`

Symptom:

- Gateway request cannot connect.

First checks:

1. Confirm Xenesis Desk or the gateway service is running.
2. Confirm the port, commonly `3338`.
3. Confirm local firewall or proxy behavior.
4. Check `Settings > Xenesis Agent > Gateway`.

## `/desk agents` Fails

Symptom:

- `/desk agents` does not list expected agents.

First checks:

1. Confirm the gateway is running.
2. Confirm authorization.
3. Confirm the agent channel is registered.
4. Check whether the agent is embedded only and not exposed to the gateway.

## Messaging Bot Does Not Respond

Symptom:

- A connected bot channel does not answer.

First checks:

1. Confirm the bot is attached to a terminal, agent, or route.
2. Confirm watch or stream mode is active.
3. Confirm the channel filter includes the bot output.
4. Check provider-specific diagnostics under Hermes or gateway panels.

## `/desk send` Does Not Execute

Symptom:

- Text is sent but the command does not run, or only a blank line appears.

First checks:

1. Confirm the target terminal ID.
2. Confirm the terminator is `\r` or the expected Enter event.
3. Confirm the terminal process is active.
4. Confirm the command was not sent to a detached channel.

## Stream Is Too Noisy

Symptom:

- Automation stream includes too much CLI chrome or unrelated output.

First checks:

1. Use a narrower stream filter.
2. Isolate the target terminal or bot channel.
3. Remove unrelated watchers.
4. Check whether the CLI tool changed its output format.

## Raw Screen Has No Return

Symptom:

- Raw terminal screen output is visible but no structured answer is returned.

First checks:

1. Confirm the selected stream filter can recognize the provider output.
2. Confirm watch mode is active.
3. Confirm the CLI provider has completed its response.
4. Check raw stream and work log side by side.

## Gated Provider Text Is Visible

Symptom:

- Phase-gated provider wording is visible in normal settings or menus.

First checks:

1. Confirm `XENIS_PHASE_5` is not enabled.
2. Confirm the matching global setting is off.
3. Check menu and settings feature gates.
4. Treat this as a public-surface issue if visible in a release build.

## Agent Response Pattern

A good answer should include:

- The exact path or panel name.
- The state to verify.
- The first diagnostic command or action.
- Any permission, bridge, gateway, or feature flag requirement.

Example:

"Open Terminal Command Center, select the target terminal, set the terminator to Enter, then send the command. If it still only prints text, check whether the terminal is detached and verify the target `termId` in the terminal list."
