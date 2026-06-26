# Extensions, Workflow, and Operations

This section explains operational panels, menus, and workflow tools.

## Tools Menu

The top toolbar contains the main tools menu. Menu groups may vary by build and enabled feature flags.

Common groups:

| Group | Purpose |
|---|---|
| XG Xenesis Agent | Open or manage the native agent surface. |
| Capability Explorer | Inspect registered `xd.*` capabilities. |
| Tools | Core utilities and operational panels. |
| Hermes | Provider and bot integration surfaces. |
| Gowoori | Artifact and AI-to-UI tools. |
| Extensions | Installed extension panels and sample extensions. |
| Lab | Demo Lab and experiment surfaces. |
| Developer | Development-only tools and gated provider surfaces. |
| Start Xenesis Desk | Launch or restart related Desk services. |
| Diagnostics and Log Center | Inspect logs, bridge state, and runtime issues. |
| Settings | Open app settings. |

## Submenu Behavior

Submenus open from the tools menu and may close when focus leaves the menu. If a submenu closes unexpectedly, reopen the tools menu and move directly to the target group before selecting the item.

## Tools Group

The Tools group can include general utility panels, diagnostics, file tools, terminal helpers, and runtime operations.

Use this group when the user asks for a tool but not a specific provider or artifact surface.

## Hermes Group

The Hermes group is for provider and bot integration.

Common entry points:

- Hermes Plug-in setup.
- Provider diagnostics.
- Bot channel panels.
- Gateway-related integration views.

Provider installation details live under `Settings > AI Provider`.

## Gowoori Group

The Gowoori group is for artifacts and AI-to-UI workflows.

Common entry points:

- Gowoori preview.
- Artifact Library.
- XCON Markdown validation.
- Export tools.
- Demo or preview helpers.

## Extensions Group

The Extensions group lists enabled extension panels. Sample extensions may appear in development builds or when explicitly installed.

Extensions should be treated as optional unless they are part of the release build.

## Developer Group

The Developer group is for development and gated features. Phase 5 XamongCode surfaces should remain hidden unless the matching flag or global setting is enabled.

Do not route normal users to Developer tools unless the requested task requires them.

## Command Palette and Panels

Some panels can be opened from the command palette or top toolbar. The same feature may appear in more than one entry point.

When giving instructions, prefer the most stable path:

- Settings path for configuration.
- Tools menu path for operational panels.
- Dock pane name for already-open content.

## Workflow Runner

Workflow Runner executes structured workflows. It is useful for repeatable operations rather than one-off commands.

Typical workflow operation:

1. Select or open a workflow.
2. Review inputs and permissions.
3. Run the workflow.
4. Inspect output, logs, and artifacts.
5. Save or export results if needed.

## Demo Lab

Demo Lab is for repeatable demonstrations and smoke checks. It can load presets, render artifacts, and exercise scripted flows.

Use Demo Lab when the goal is to show the product flow or verify a scenario.

## Diagnostics and Log Center

Diagnostics and Log Center are the first places to check when behavior is unclear.

Common diagnostics:

- App logs.
- MCP bridge state.
- Gateway connection.
- Terminal status.
- Provider status.
- Artifact validation errors.

## Agent Guidance

When routing users:

- Use `Settings > AI Provider` for provider installation.
- Use `Settings > Xenesis Agent` for agent, gateway, and bot runtime behavior.
- Use Tools menu groups for opening panels.
- Use Diagnostics and Log Center before assuming a feature failed silently.
