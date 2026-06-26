# Workspace Scratchpad Sample

Opens a durable extension-local Markdown scratchpad backed by the read/write text file APIs.

What it shows:

- **Workspace Scratchpad** as a useful generated document.
- **Session checklist** for validating persistence through the normal editor save flow.
- **Extension storage** for extension-local state outside the active workspace.
- **Last opened** timestamp updates each time the command runs.

The sample uses `api.readTextFile()` and `api.writeTextFile()` against `api.storagePath`.
