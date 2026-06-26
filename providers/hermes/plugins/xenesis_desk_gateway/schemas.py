from __future__ import annotations

from typing import Any


def _schema(name: str, description: str, properties: dict[str, Any], required: list[str] | None = None) -> dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "parameters": {
            "type": "object",
            "properties": properties,
            "required": required or [],
            "additionalProperties": False,
        },
    }


TERMINAL_PREVIEW_SCHEMA = _schema(
    "xenesis_desk_mobile_terminal_preview",
    "Preview an Xenesis Desk terminal command from a mobile/gateway session without starting it.",
    {
        "command": {"type": "string", "description": "Terminal command to run inside Xenesis Desk."},
        "shell": {"type": "string", "enum": ["powershell", "cmd", "pwsh", "wsl"], "description": "Optional local shell."},
        "cwd": {"type": "string", "description": "Optional working directory."},
    },
    ["command"],
)

TERMINAL_RUN_SCHEMA = _schema(
    "xenesis_desk_mobile_terminal_run",
    "Run a terminal command in Xenesis Desk after mobile/gateway approval.",
    {
        "command": {"type": "string", "description": "Terminal command to run inside Xenesis Desk."},
        "shell": {"type": "string", "enum": ["powershell", "cmd", "pwsh", "wsl"], "description": "Optional local shell."},
        "cwd": {"type": "string", "description": "Optional working directory."},
        "id": {"type": "string", "description": "Optional Xenesis Desk terminal session id."},
        "cols": {"type": "number", "description": "Optional initial terminal columns."},
        "rows": {"type": "number", "description": "Optional initial terminal rows."},
    },
    ["command"],
)

TERMINAL_TAIL_SCHEMA = _schema(
    "xenesis_desk_mobile_terminal_tail",
    "Read recent output from an Xenesis Desk terminal session.",
    {
        "id": {"type": "string", "description": "Xenesis Desk terminal session id."},
        "maxBytes": {"type": "number", "description": "Maximum recent output characters."},
    },
    ["id"],
)

TERMINAL_STOP_SCHEMA = _schema(
    "xenesis_desk_mobile_terminal_stop",
    "Stop an Xenesis Desk terminal session.",
    {
        "id": {"type": "string", "description": "Xenesis Desk terminal session id."},
    },
    ["id"],
)

TERMINAL_LIST_SCHEMA = _schema(
    "xenesis_desk_mobile_terminal_list",
    "List terminal sessions currently known to Xenesis Desk.",
    {},
)

STATE_SCHEMA = _schema(
    "xenesis_desk_mobile_state",
    "Read a summary of the running Xenesis Desk bridge, terminals, panels, files, and diagnostics.",
    {},
)

ACTIVE_CONTEXT_SCHEMA = _schema(
    "xenesis_desk_mobile_active_context",
    "Read the currently active Xenesis Desk pane, content, file, panel, or terminal context.",
    {},
)

CONTEXT_ACTIONS_SCHEMA = _schema(
    "xenesis_desk_mobile_context_actions",
    "List context-aware Xenesis Desk actions for the active pane, content, file, panel, or terminal.",
    {},
)

ACTION_HISTORY_SCHEMA = _schema(
    "xenesis_desk_mobile_action_history",
    "List recent Xenesis Desk mobile action token audit records.",
    {
        "limit": {"type": "number", "description": "Maximum action records to return. Defaults to 10, max 50."},
    },
)

ACTION_CLEAR_SCHEMA = _schema(
    "xenesis_desk_mobile_action_clear",
    "Clear Xenesis Desk mobile action token audit records for the current gateway session.",
    {
        "mode": {
            "type": "string",
            "enum": ["expired", "used", "pending", "all"],
            "description": "Records to clear. Defaults to expired.",
        },
    },
)

MOBILE_DASHBOARD_SCHEMA = _schema(
    "xenesis_desk_mobile_dashboard",
    "Read a compact Xenesis Desk mobile operations dashboard.",
    {
        "limit": {"type": "number", "description": "Maximum recent action records to include. Defaults to 5, max 20."},
    },
)

LIST_PANELS_SCHEMA = _schema(
    "xenesis_desk_mobile_list_panels",
    "List extension panels currently known to the Xenesis Desk mobile bridge.",
    {},
)

LIST_OPEN_FILES_SCHEMA = _schema(
    "xenesis_desk_mobile_list_open_files",
    "List files opened through the Xenesis Desk mobile bridge.",
    {},
)

RECENT_DIAGNOSTICS_SCHEMA = _schema(
    "xenesis_desk_mobile_recent_diagnostics",
    "Read recent redacted Xenesis Desk diagnostics entries.",
    {
        "limit": {"type": "number", "description": "Maximum diagnostics entries to return. Defaults to 20."},
    },
)

FOCUS_CONTENT_SCHEMA = _schema(
    "xenesis_desk_mobile_focus_content",
    "Focus an Xenesis Desk dock content or pane.",
    {
        "contentId": {"type": "string", "description": "Xenesis Desk dock content id to focus."},
        "paneId": {"type": "string", "description": "Xenesis Desk dock pane id to focus."},
    },
)

CLOSE_CONTENT_SCHEMA = _schema(
    "xenesis_desk_mobile_close_content",
    "Close an Xenesis Desk dock content or pane after mobile approval.",
    {
        "contentId": {"type": "string", "description": "Xenesis Desk dock content id to close."},
        "paneId": {"type": "string", "description": "Xenesis Desk dock pane id to close."},
    },
)

OPEN_FILE_SCHEMA = _schema(
    "xenesis_desk_mobile_open_file",
    "Open an existing local file in Xenesis Desk from a mobile/gateway session.",
    {
        "filePath": {"type": "string", "description": "Absolute path of the local file to open in Xenesis Desk."},
        "placement": {"type": "string", "enum": ["tab", "left", "right", "top", "bottom"], "description": "Optional dock placement."},
        "streaming": {"type": "boolean", "description": "When true, open with a visual streaming render effect."},
        "streamingIntervalMs": {"type": "number", "description": "Milliseconds between streaming updates."},
        "streamingChunkSize": {"type": "number", "description": "Characters appended on each streaming update."},
        "streamingInitialDelayMs": {"type": "number", "description": "Delay before streaming starts."},
    },
    ["filePath"],
)

GET_XCON_PROMPT_SCHEMA = _schema(
    "xenesis_desk_mobile_get_xcon_prompt",
    "Get Xenesis Desk XCON/SKETCH generation guidance before creating artifacts.",
    {
        "kind": {
            "type": "string",
            "enum": [
                "sketch-ui",
                "markdown-xcon",
                "dashboard-workflow",
                "family-template",
                "review-repair",
                "chat-artifact",
                "chain",
                "workflow",
                "template-lab",
            ],
            "description": "Prompt profile to assemble. Defaults to markdown-xcon.",
        },
        "task": {"type": "string", "description": "Optional task hint such as dashboard, workflow, review, or business document."},
        "brief": {"type": "string", "description": "User request or generation brief to append to the prompt guidance."},
        "audience": {"type": "string", "description": "Optional target audience for the generated document or screen."},
    },
)

VALIDATE_XCON_MARKDOWN_SCHEMA = _schema(
    "xenesis_desk_mobile_validate_xcon_markdown",
    "Validate Markdown containing XCON/SKETCH fences before opening it in Xenesis Desk.",
    {
        "content": {"type": "string", "description": "Markdown content to validate."},
    },
    ["content"],
)

CREATE_XCON_MARKDOWN_FROM_CONTENT_SCHEMA = _schema(
    "xenesis_desk_mobile_create_xcon_markdown_from_content",
    "Save Markdown containing XCON/SKETCH fences and optionally open it in Xenesis Desk after mobile approval.",
    {
        "content": {"type": "string", "description": "Complete Markdown content to write."},
        "title": {"type": "string", "description": "Optional document title."},
        "workspaceDir": {"type": "string", "description": "Directory where the Markdown file should be written. Relative paths resolve under Xenesis Desk exports."},
        "outDir": {"type": "string", "description": "Alias for workspaceDir. Relative paths resolve under Xenesis Desk exports."},
        "fileName": {"type": "string", "description": "Optional Markdown file name."},
        "placement": {"type": "string", "enum": ["tab", "left", "right", "top", "bottom"], "description": "Optional dock placement."},
        "streaming": {"type": "boolean", "description": "When true, open with a visual streaming render effect."},
        "streamingIntervalMs": {"type": "number", "description": "Milliseconds between streaming updates."},
        "streamingChunkSize": {"type": "number", "description": "Characters appended on each streaming update."},
        "streamingInitialDelayMs": {"type": "number", "description": "Delay before streaming starts."},
        "openInDesk": {"type": "boolean", "description": "When true, ask Xenesis Desk to open the generated file."},
        "exportPdf": {"type": "boolean", "description": "When true, also export the generated Markdown to PDF through Xenesis Desk."},
        "pdfFileName": {"type": "string", "description": "Optional PDF file name. The .pdf extension is added when omitted."},
        "pdfOutDir": {"type": "string", "description": "Optional PDF output directory. Relative paths resolve under Xenesis Desk exports."},
    },
    ["content"],
)

CREATE_XCON_MARKDOWN_SCHEMA = _schema(
    "xenesis_desk_mobile_create_xcon_markdown",
    "Create a rich XCON/SKETCH Markdown document and optionally open it in Xenesis Desk after mobile approval.",
    {
        "prompt": {"type": "string", "description": "What the user wants to build with XCON/SKETCH."},
        "title": {"type": "string", "description": "Optional document title."},
        "workspaceDir": {"type": "string", "description": "Directory where the Markdown file should be written. Relative paths resolve under Xenesis Desk exports."},
        "outDir": {"type": "string", "description": "Alias for workspaceDir. Relative paths resolve under Xenesis Desk exports."},
        "fileName": {"type": "string", "description": "Optional Markdown file name."},
        "mode": {"type": "string", "enum": ["view", "code", "both"], "description": "XCON/SKETCH fence display mode. Defaults to view."},
        "placement": {"type": "string", "enum": ["tab", "left", "right", "top", "bottom"], "description": "Optional dock placement."},
        "streaming": {"type": "boolean", "description": "When true, open with a visual streaming render effect."},
        "streamingIntervalMs": {"type": "number", "description": "Milliseconds between streaming updates."},
        "streamingChunkSize": {"type": "number", "description": "Characters appended on each streaming update."},
        "streamingInitialDelayMs": {"type": "number", "description": "Delay before streaming starts."},
        "openInDesk": {"type": "boolean", "description": "When true, ask Xenesis Desk to open the generated file."},
        "exportPdf": {"type": "boolean", "description": "When true, also export the generated Markdown to PDF through Xenesis Desk."},
        "pdfFileName": {"type": "string", "description": "Optional PDF file name. The .pdf extension is added when omitted."},
        "pdfOutDir": {"type": "string", "description": "Optional PDF output directory. Relative paths resolve under Xenesis Desk exports."},
    },
    ["prompt"],
)

EXPORT_XCON_PDF_SCHEMA = _schema(
    "xenesis_desk_mobile_export_xcon_pdf",
    "Export an existing XCON Markdown file to PDF through Xenesis Desk.",
    {
        "filePath": {"type": "string", "description": "Absolute path of the XCON Markdown file to export."},
        "title": {"type": "string", "description": "Optional document title used during PDF export."},
        "pdfFileName": {"type": "string", "description": "Optional PDF file name. The .pdf extension is added when omitted."},
        "pdfOutDir": {"type": "string", "description": "Optional PDF output directory. Relative paths resolve under Xenesis Desk exports."},
    },
    ["filePath"],
)

LIST_EXTENSION_COMMANDS_SCHEMA = _schema(
    "xenesis_desk_mobile_list_extension_commands",
    "List extension commands currently registered in the running Xenesis Desk app.",
    {
        "includeDisabled": {"type": "boolean", "description": "When true, include disabled commands."},
    },
)

COMMAND_PALETTE_SCHEMA = _schema(
    "xenesis_desk_mobile_command_palette",
    "List searchable Xenesis Desk command palette commands from a mobile/gateway session.",
    {
        "query": {"type": "string", "description": "Optional search text for command id, title, category, or extension name."},
        "includeDisabled": {"type": "boolean", "description": "When true, include disabled commands."},
    },
)

RUN_COMMAND_PALETTE_SCHEMA = _schema(
    "xenesis_desk_mobile_run_command_palette",
    "Run an Xenesis Desk command palette command after mobile approval.",
    {
        "commandId": {"type": "string", "description": "Command palette command id to run."},
        "panelPlacement": {"type": "string", "enum": ["tab", "left", "right", "top", "bottom"], "description": "Optional panel placement override."},
    },
    ["commandId"],
)

PLAYWRIGHT_SNAPSHOT_SCHEMA = _schema(
    "xenesis_desk_mobile_playwright_snapshot",
    "Capture a webpage screenshot through the Xenesis Desk MCP Playwright worker after mobile approval.",
    {
        "url": {"type": "string", "description": "Absolute http/https URL to capture."},
        "selector": {"type": "string", "description": "Optional CSS selector for element capture."},
        "outDir": {"type": "string", "description": "Optional artifact output directory."},
        "fileName": {"type": "string", "description": "Optional screenshot file name."},
        "format": {"type": "string", "enum": ["png", "jpeg"], "description": "Screenshot format."},
        "quality": {"type": "number", "description": "JPEG quality."},
        "width": {"type": "number", "description": "Viewport width."},
        "height": {"type": "number", "description": "Viewport height."},
        "timeoutMs": {"type": "number", "description": "Navigation timeout in milliseconds."},
        "fullPage": {"type": "boolean", "description": "Capture the full page when no selector is set."},
        "headless": {"type": "boolean", "description": "Run Chromium headless."},
        "allowedHosts": {"type": "array", "items": {"type": "string"}, "description": "Optional host allowlist."},
        "openInDesk": {"type": "boolean", "description": "Open the screenshot in Xenesis Desk."},
        "placement": {"type": "string", "enum": ["tab", "left", "right", "top", "bottom"], "description": "Optional dock placement."},
    },
    ["url"],
)

PLAYWRIGHT_RUN_SCHEMA = _schema(
    "xenesis_desk_mobile_playwright_run",
    "Run ordered Playwright actions through the Xenesis Desk MCP Playwright worker after mobile approval.",
    {
        "url": {"type": "string", "description": "Absolute http/https URL to open."},
        "actions": {"type": "array", "description": "Ordered actions: click, fill, press, waitForSelector, waitForTimeout, screenshot."},
        "outDir": {"type": "string", "description": "Optional artifact output directory."},
        "screenshot": {"type": "boolean", "description": "Capture a final screenshot."},
        "screenshotSelector": {"type": "string", "description": "Optional final screenshot selector."},
        "screenshotFileName": {"type": "string", "description": "Optional final screenshot file name."},
        "trace": {"type": "boolean", "description": "Save a Playwright trace.zip artifact."},
        "traceFileName": {"type": "string", "description": "Optional trace zip file name."},
        "format": {"type": "string", "enum": ["png", "jpeg"], "description": "Screenshot format."},
        "quality": {"type": "number", "description": "JPEG quality."},
        "width": {"type": "number", "description": "Viewport width."},
        "height": {"type": "number", "description": "Viewport height."},
        "timeoutMs": {"type": "number", "description": "Navigation and action timeout in milliseconds."},
        "fullPage": {"type": "boolean", "description": "Capture full-page screenshots."},
        "headless": {"type": "boolean", "description": "Run Chromium headless."},
        "allowedHosts": {"type": "array", "items": {"type": "string"}, "description": "Optional host allowlist."},
        "openInDesk": {"type": "boolean", "description": "Open the first screenshot in Xenesis Desk."},
        "placement": {"type": "string", "enum": ["tab", "left", "right", "top", "bottom"], "description": "Optional dock placement."},
    },
    ["url", "actions"],
)

RUN_EXTENSION_COMMAND_SCHEMA = _schema(
    "xenesis_desk_mobile_run_extension_command",
    "Run a registered Xenesis Desk extension command after mobile approval.",
    {
        "commandId": {"type": "string", "description": "Extension command id to run."},
        "panelPlacement": {"type": "string", "enum": ["tab", "left", "right", "top", "bottom"], "description": "Optional panel placement override."},
    },
    ["commandId"],
)
