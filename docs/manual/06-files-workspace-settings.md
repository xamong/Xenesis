# Files, Workspace, and Settings

This section explains where Xenesis Desk stores state and how the workspace and settings surfaces are organized.

## Xenis Home

Xenesis Desk uses a Xenis home directory for app state.

Common locations:

- `%USERPROFILE%\.xenis`
- `%USERPROFILE%\.xenis-dev`

The development home is used by dev builds or when explicitly selected.

Global app settings are persisted in:

`<XENIS_HOME>\settings.json`

Development builds normally use `%USERPROFILE%\.xenis-dev\settings.json`; packaged builds normally use `%USERPROFILE%\.xenis\settings.json` unless `XENIS_HOME` is explicitly set.

Common subfolders include:

- MCP bridge state.
- Gateway state.
- Logs.
- Provider configuration.
- Terminal profiles.
- Agent profiles.
- Artifact metadata.
- Backups and restore points.

## Workspace

The workspace is the project or folder the app is operating on. It is separate from the Xenis home directory.

Workspace behavior includes:

- File tree navigation.
- Opening files into the document dock group.
- Terminal current working directory.
- Safe file edit preview and apply flows.
- Remote file profile binding.

## File Explorer

The file explorer is reached from the fixed left navigation. Opening a file usually creates or activates a document pane in the docking workspace.

If the file appears selected but not visible, check the document tabs and active dock group.

## Safe File Edit Center

Safe File Edit Center is used when an agent or tool proposes file changes.

Typical flow:

1. Generate or receive a proposed edit.
2. Preview the diff.
3. Apply the change.
4. Restore from a backup if needed.

MCP safe-write flows should prefer preview and apply behavior over direct file mutation.

## Remote Files

Remote file settings manage remote workspace access.

Common fields:

- Profile name.
- Host or endpoint.
- Authentication method.
- Remote root.
- Local mapping.
- Connection behavior.

Credentials should be stored through the app's secret handling rather than copied into plain text project files.

Remote terminal and remote file profile lists are stored as settings sections:

| Settings section | Contains |
|---|---|
| `remoteTerminals` | Local terminal profiles, SSH/TELNET profiles, terminal groups. |
| `remoteFiles` | SFTP/FTP/FTPS profiles and remote file groups. |

When workspace settings are imported, remote profile records merge by profile `id` so existing passwords and passphrases are kept when the imported profile leaves those fields blank.

## Settings Structure

Main settings sections:

| Section | Purpose |
|---|---|
| General | App-wide preferences. |
| Xenesis Agent | Agent runtime, gateway, external bots, and Gowoori tools. |
| AI Provider | Hermes Plug-in, Local CLI MCP and Skill installer, and BYOK profiles. |
| Terminal Management | Terminal profiles and saved current terminal state. |
| Remote Files | Remote workspace access and credentials. |
| Automation | Stream, watch, and response behavior. |
| Extensions | Extension enablement and workflow tools. |
| Workspace | Workspace roots and behavior. |
| Interface | Language, display mode, shortcuts, and window size or position. |
| Info | App information, secrets, and settings backup. |

## Xenesis Agent Settings

`Settings > Xenesis Agent` contains:

- Agent runtime.
- Gateway.
- External bots.
- Gowoori agent tools.

Use this section for native agent behavior and gateway state.

## AI Provider Settings

`Settings > AI Provider` contains:

- Hermes Plug-in installer.
- Local CLI MCP and Skill installer.
- BYOK provider profiles.

This is the correct place for provider installation and CLI integration setup.

## Interface Settings

`Settings > Interface` contains:

- Language.
- Display mode.
- Keyboard shortcuts.
- Window size and position.

Use this section for visual and interaction preferences.

## Info Settings

`Settings > Info` contains:

- Basic app information.
- Secrets.
- Settings backup and restore.

Secrets may use OS-provided secure storage. If secure storage is unavailable, the app should clearly report the fallback behavior.

Settings backup and restore also operate on the same `<XENIS_HOME>\settings.json` data. Backups are written under the Xenis home backup directory and should not be committed to source control.

## Xenesis Profiles

Xenesis runtime profiles can be stored under:

`<XENIS_HOME>\xenesis\profiles.json`

Common profile names include:

- `desk`
- `dev`
- `external`
- `safe-analysis`

Profile names and exact fields can evolve during early alpha development.

## Phase 5 Provider Surface

The Phase 5 XamongCode surface is hidden unless `XENIS_PHASE_5=true` or the matching global setting is enabled.

Do not describe it as generally available unless the user has enabled it.

## Agent Guidance

When answering settings questions:

- Route provider setup to `Settings > AI Provider`.
- Route native agent and gateway setup to `Settings > Xenesis Agent`.
- Route terminal profiles to `Settings > Terminal Management`.
- Route secrets and backup to `Settings > Info`.
- Route language, display, shortcuts, and window geometry to `Settings > Interface`.
