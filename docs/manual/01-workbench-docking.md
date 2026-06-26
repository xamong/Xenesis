# Workbench and Docking

This section explains the current screen model in Xenesis Desk.

## Fixed Shell

The fixed shell is always part of the app frame. It is not a docked pane.

- Top toolbar: global actions, tools menu, diagnostics, settings, and quick entry points.
- Left navigation: persistent navigation for workspace files, panels, and primary surfaces.
- Window chrome and app-level state: sizing, theme, and global status.

If a user asks about the toolbar or navigation, describe it as fixed shell UI, not as a dock item.

## Docking Workspace

The docking workspace hosts movable panes. It is the area where work happens.

Common dock groups:

| Group | Typical content |
|---|---|
| Top | Secondary monitors, compact status views, temporary tools. |
| Left | Explorers, capability lists, and support panels. |
| Document | Editors, previews, documents, artifact views, and onboarding content. |
| Right | Xenesis Agent, property panels, and detailed inspectors. |
| Bottom | Terminal Command Center, logs, diagnostics, and command output. |

## Pane Versus Content

A pane is the docking container. Content is the feature inside it.

For example:

- Xenesis Agent is content commonly opened in the right dock group.
- Terminal Command Center is content commonly opened in the bottom dock group.
- A file editor or Gowoori preview is content commonly opened in the document group.

This distinction matters because users may move a pane without changing what the feature does.

## Default Layout

The usual first-run layout is:

- Xenesis Agent in the right group.
- Terminal Command Center in the bottom group.
- Onboarding or document content in the document group.
- File and tool navigation available from the fixed left navigation.

The layout is flexible. A missing pane usually means it was closed, moved, or hidden behind another tab in the same group.

## Active Pane and Terminal Target

The active pane is the UI pane that currently has focus. It is not always the terminal that will receive commands.

Terminal Command Center has its own target selection:

- A selected terminal target receives commands from the command input.
- A target list can receive multi-send commands.
- Automation watches use the configured terminal or external bot channel.

When diagnosing command delivery, check the Command Center target first.

## Artifact Target

Artifacts can be opened in the current document area or a specific artifact pane depending on the action.

Common artifact destinations:

- Gowoori preview pane.
- Artifact Library detail view.
- Document editor.
- Workflow or Demo Lab preview surface.

If an artifact appears to be missing, check open document tabs and the artifact library before assuming generation failed.

## Size and Borders

Pane borders, splitters, and tab labels are part of the docking workspace. Window size and display density are controlled from `Settings > Interface`.

If content looks clipped:

1. Resize the pane splitter.
2. Check whether the pane is nested in a smaller dock group.
3. Check window size and display mode in `Settings > Interface`.

## Common Operations

| Goal | Where to start |
|---|---|
| Open a terminal view | Bottom dock group or Terminal Command Center entry point. |
| Reopen the agent | Tools menu or `Settings > Xenesis Agent` related entry points. |
| Inspect capabilities | Tools menu, Capability Explorer, or CR-related panel. |
| Preview an artifact | Gowoori or Artifact Library panel. |
| Check app state | Diagnostics or Log Center. |

## Agent Guidance

When explaining layout issues, use concrete wording:

- "The toolbar is fixed shell UI."
- "The terminal is a docked pane in the bottom workspace group."
- "The command target is selected inside Terminal Command Center."
- "The file may be open in the document dock group, even if the left navigation still shows the workspace tree."
