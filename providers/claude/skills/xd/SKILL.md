---
name: xd
description: Control Xenesis Desk, Bot panels, Hermes gateway, and stash ops.
---

# Xenesis Desk Control

Use this skill when the user invokes `/xd`, mentions Xenesis Desk control, asks to operate Xenesis Desk from Claude Code, Codex, Hermes, Telegram, Discord, Slack, or wants terminal/file/XCON/panel/stash control through the Xenesis Desk MCP bridge or the Hermes `xenesis_desk_gateway` plugin.

The short callsign is `xd`. In hosts that map skills to slash commands, invoke this as `/xd`.

## When to Use

- The user asks for `/xd status`, `/xd run`, `/xd tail`, `/xd open`, `/xd xcon`, `/xd panels`, `/xd actions`, `/xd stash`, or similar Xenesis Desk control.
- The user wants Claude Code or Codex to drive Xenesis Desk through MCP, including terminal, safe file write, XCON, panel, diagnostics, and Playwright tasks.
- The user wants to open or inspect Xenesis Bot, Hermes Status, Action Inbox, Timeline, or Stash Operations panels.
- The user is testing Hermes mobile gateway integration with Telegram, Discord, Slack, or another messaging platform.
- The user needs Windows Server 2022 plus WSL2 Hermes bridge setup help.

Do not use this skill for ordinary local terminal work that does not need Xenesis Desk.

## Control Surface

Choose the surface from the current environment:

| Environment | Preferred action |
|---|---|
| Claude Code or Codex with Xenesis Desk MCP tools | Use the available `xenesis_desk_*` MCP tools directly. |
| Claude Code or Codex managing Hermes-only stash/mobile features | Open Xenesis Bot or Hermes Stash Operations through MCP, then route commands through the Hermes gateway/plugin. |
| Hermes CLI or Hermes mobile gateway | Use the Hermes plugin command `/xd ...`. |
| No Xenesis Desk MCP tools visible | Explain that the Xenesis Desk MCP server or bridge is not registered, then give the shortest setup path. |

Do not assume Hermes `/xd` exists inside Claude Code or Codex. In Claude Code and Codex, `/xd` is this skill's callsign; actual execution should be via MCP tools unless the task explicitly targets the Hermes gateway/plugin.

## Quick Reference

| User intent | Hermes command | MCP tool or route |
|---|---|---|
| status | `/xd status` | `xenesis_desk_state` |
| mobile dashboard | `/xd mobile` | `xenesis_desk_state`, `xenesis_desk_active_context`, `xenesis_desk_context_actions` |
| terminal preview | `/xd preview <cmd>` | `xenesis_desk_terminal_preview` |
| terminal run | `/xd run <cmd>` | `xenesis_desk_terminal_run` |
| terminal output | `/xd tail <id>` | `xenesis_desk_terminal_tail` |
| terminal stop | `/xd stop <id>` | `xenesis_desk_terminal_stop` |
| terminal list | `/xd terminals` | `xenesis_desk_terminal_list` |
| terminal inline image | `/xd image <path-or-url>` | `xenesis_desk_terminal_image_show` |
| terminal base64 image | n/a | `xenesis_desk_terminal_image_show_base64` |
| terminal XCON image | `/xd image xcon` | `xenesis_desk_terminal_xcon_image_show` |
| Desk-visible subagent start | n/a | `xenesis_desk_subagent_start` |
| Desk-visible subagent list | n/a | `xenesis_desk_subagent_list` |
| Desk-visible subagent output | n/a | `xenesis_desk_subagent_tail` |
| Desk-visible subagent stop | n/a | `xenesis_desk_subagent_stop` |
| active context | `/xd context` | `xenesis_desk_active_context` |
| context actions | `/xd actions` or `/xd context-actions` | `xenesis_desk_context_actions` |
| open file | `/xd open <path>` | `xenesis_desk_open_file` |
| artifact target | n/a | `xenesis_desk_state` → `artifactPaneId`; pass `targetPaneId` to open-file, XCON, or Playwright tools |
| safe file write preview | n/a | `xenesis_desk_preview_text_file_write` |
| safe file write apply | n/a | `xenesis_desk_apply_text_file_write` |
| restore safe write backup | n/a | `xenesis_desk_restore_text_file_backup` |
| XCON prompt | `/xd xcon prompt` | `xenesis_desk_get_xcon_prompt` |
| XCON markdown | `/xd xcon <prompt>` | `xenesis_desk_create_xcon_markdown` |
| XCON markdown from content | n/a | `xenesis_desk_create_xcon_markdown_from_content` |
| validate XCON markdown | `/xd validate` | `xenesis_desk_validate_xcon_markdown` |
| Office status | n/a | `xd.office.status` through the Capability Registry |
| Excel create/inspect/read | n/a | `xd.office.excel.createWorkbook`, `xd.office.excel.inspectWorkbook`, `xd.office.excel.readRange` |
| Excel installed automation | n/a | `xd.office.excel.openWorkbook`, `xd.office.excel.writeRange`, `xd.office.excel.saveWorkbook`, `xd.office.excel.closeWorkbook`, `xd.office.excel.exportPdf` |
| Playwright snapshot image | `/xd pw snapshot <url>` | `xenesis_desk_playwright_snapshot`; opens the image viewer by default, set `openInDesk:false` to only save |
| Playwright actions | `/xd pw run <json-payload>` | `xenesis_desk_playwright_run` |
| panels | `/xd panels` | `xenesis_desk_list_panels` |
| bridge panels | `/xd bridge-panels` | `xenesis_desk_list_panels` for extension panel records |
| open files | `/xd files` | `xenesis_desk_list_open_files` |
| diagnostics/logs | `/xd logs [limit]` | `xenesis_desk_recent_diagnostics` |
| focus content | `/xd focus <content-id|pane-id|#N>` | `xenesis_desk_focus_content` |
| close content | `/xd close <content-id|pane-id|#N>` | `xenesis_desk_close_content` |
| command palette | `/xd commands` | `xenesis_desk_command_palette` |
| run command palette item | `/xd command <id>` | `xenesis_desk_run_command_palette` |
| extensions | `/xd extensions` | `xenesis_desk_list_extension_commands` |
| run extension command | `/xd exec <id>` or `/xd extension <id>` | `xenesis_desk_run_extension_command` |
| diagnostics | `/xd diagnostics` | `xenesis_desk_recent_diagnostics` |
| Xenesis Bot panel | `/xd mobile` | `xenesis_desk_run_command_palette` with `xenesis-desk.core-tools.openXenisBot` |
| Hermes Status panel | `/xd status` or `/xd doctor` | `xenesis_desk_run_command_palette` with `xenesis-desk.core-tools.openHermesStatus` |
| Hermes Action Inbox | `/xd inbox` | `xenesis_desk_run_command_palette` with `xenesis-desk.core-tools.openHermesActionInbox` |
| Hermes Timeline | `/xd timeline` | `xenesis_desk_run_command_palette` with `xenesis-desk.core-tools.openHermesTimeline` |
| Hermes Stash Operations | `/xd stash health` or `/xd stash schedules` | `xenesis_desk_run_command_palette` with `xenesis-desk.core-tools.openHermesStashOps` |
| action audit | `/xd action-status <token>`, `/xd action-history`, `/xd action-clear` | Hermes gateway/plugin action token audit |
| readiness checks | `/xd selftest`, `/xd readiness`, `/xd watch`, `/xd repair` | Hermes gateway/plugin bridge health and repair guidance |
| handoff exports | `/xd snapshot`, `/xd brief`, `/xd handoff`, `/xd export`, `/xd exports`, `/xd support-bundle` | Hermes gateway/plugin operational reports |
| quick actions | `/xd menu`, `/xd quick`, `/xd workflow`, `/xd launch`, `/xd find`, `/xd recommend`, `/xd cleanup` | Hermes gateway/plugin mobile shortcuts and workspace workflows |
| pins | `/xd pin add|open|remove|clear` | Hermes gateway/plugin persistent path shortcuts |
| work packets | `/xd packet <markdown>`, `/xd packet open #N`, `/xd packet replay #N` | Hermes gateway/plugin artifact replay from Xenesis Desk Timeline packets |
| stash schedule ops | `/xd stash schedule|schedules|pause|resume|trigger|runs|repair|unschedule` | Hermes gateway/plugin; open Bot or Stash Ops through MCP |
| stash policy ops | `/xd stash health|preset|template|retention` | Hermes gateway/plugin; open Bot or Stash Ops through MCP |

## Hermes Gateway Command Families

When operating through Telegram, Discord, Slack, Hermes CLI, or Xenesis Bot, the `xenesis_desk_gateway` plugin exposes `/xd` command families beyond the direct MCP tools:

- Navigation and shortcuts: `/xd menu [#N]`, `/xd actions [#N]`, `/xd quick [#N|add|remove|clear|path|recommend]`, `/xd workflow [#N|add|remove|clear|path|templates|install]`, `/xd launch [limit|#N]`, `/xd find <query> [limit]`, `/xd recommend [#N]`, `/xd cleanup [dry-run|apply] [keep=N]`.
- Operational status: `/xd status`, `/xd doctor`, `/xd selftest`, `/xd readiness`, `/xd watch [limit|reset]`, `/xd timeline [limit]`, `/xd digest [limit]`, `/xd compatibility`, `/xd upgrade-notes`, `/xd repair`.
- Reports and handoff: `/xd mobile [limit]`, `/xd snapshot [limit]`, `/xd brief [limit]`, `/xd handoff [limit]`, `/xd export [handoff|snapshot] [limit]`, `/xd exports [limit|open #N|open <filename>]`, `/xd support-bundle [limit]`, `/xd inbox [limit|open #N|clear]`.
- Dock and context: `/xd state`, `/xd context`, `/xd context-actions [#N]`, `/xd action <token>`, `/xd action-status <token>`, `/xd action-history [limit]`, `/xd action-clear [expired|used|pending|all]`, `/xd panels`, `/xd bridge-panels`, `/xd files`, `/xd logs [limit]`, `/xd focus <content-id|pane-id|#N>`, `/xd close <content-id|pane-id|#N>`.
- Terminal and files: `/xd terminals`, `/xd tail <id|#N>`, `/xd stop <id|#N>`, `/xd run <command>`, `/xd open <absolute-path>`.
- Work packets: `/xd packet <work-packet-markdown>`, `/xd packet open #N`, `/xd packet replay #N`. Use these for Xenesis Desk Timeline packets that list artifact paths and replay commands.
- Pins: `/xd pin [add|open|remove|clear]` for stable workspace file/path shortcuts.
- XCON and browser: `/xd prompt [kind] [brief]`, `/xd xcon <prompt>`, `/xd pw snapshot <url> [selector] [open]`, `/xd pw run <json-payload>`.
- Commands: `/xd commands [query]`, `/xd command <command-id|#N> [placement]`, `/xd extensions`, `/xd exec <command-id|#N> [placement]`.

## Desk-visible Subagent Terminals

When the user wants delegated Codex, Claude, Gemini, Xenesis, or custom agent work to be visible in Xenesis Desk, prefer the `xenesis_desk_subagent_*` tools over a normal background subagent call.

- Use `xenesis_desk_active_context` first when the parent terminal or pane matters.
- Use `xenesis_desk_subagent_start` with `task`, optional `agent`, optional `command`, optional `cwd`, and optional `parentTermId`.
- Pass `parentTermId` when the current terminal id is known so the Desk can relate the worker terminal to the parent session.
- Set a short `title` that describes the delegated work; Xenesis Desk will open a visible terminal tab named `Subagent: <title>`.
- Use `xenesis_desk_subagent_list` and `xenesis_desk_subagent_tail` to inspect progress before summarizing.
- Use `xenesis_desk_subagent_stop` only when the user asks to cancel/stop or when the worker is clearly stuck.

Default commands are selected by `agent`: `codex exec <task>`, `claude -p <task>`, `gemini -p <task>`, or `xenesis run <task>`. Use `command` only when the user or project requires an explicit runner.

Visible subagent sessions use the XD skill contract identity `skill: xd` and `contractVersion: visible-subagent-v1`. When you provide a custom command, include the same contract in the worker prompt: stay on the assigned task, use MCP tools only when needed, do not use GowooriChat as the control path, inspect output with `xenesis_desk_subagent_tail`, and summarize evidence before completion.

## Windows Computer Use

When controlling registered Windows apps, observe visible UI before acting. Use `xd.apps.inspect`, `xd.apps.tree`, and `xd.apps.elementFromPoint` to analyze, locate, and verify controls before `xd.apps.click` or `xd.apps.typeText`, especially before coordinate click/type guesses. Use `xd.apps.highlight` and `xd.apps.captureElement` for the resolved window target; do not pass `elementRef` to highlight/capture until element-bound capture is available.

## Office Document Control

For Microsoft Office document work, prefer `xd.office.*` over visible UI control.

- Use `xd.office.status` before installed Office operations when availability matters.
- Use `xd.office.excel.createWorkbook`, `xd.office.excel.inspectWorkbook`, and `xd.office.excel.readRange` for file-based workbook generation and bounded reads.
- Use `xd.office.excel.openWorkbook`, `xd.office.excel.writeRange`, `xd.office.excel.saveWorkbook`, `xd.office.excel.closeWorkbook`, and `xd.office.excel.exportPdf` for installed Excel behavior, visible workbook sessions, Office save behavior, and PDF export.
- On Windows, installed Excel operations route through the Windows COM provider. On macOS, they route through the macOS Apple Events provider when available and permitted.
- Treat `xd.apps.*` as a fallback only when the user explicitly asks to operate the Office UI or when no `xd.office.*` capability can satisfy the task.
- Never generate or run raw COM, VBA, macro, PowerShell, AppleScript, or JXA from caller text. Only call typed `xd.office.*` capabilities with bounded arguments.
- If the user says "show in Gowoori", "거울이로 보여줘", or asks for a visual summary, Xenesis should create or transform the document/result first, then show the resulting artifact in Gowoori. Do not delegate Office document generation or control to GowooriChat unless the user explicitly asks to run GowooriChat.

## Terminal Inline Images

When the user asks to show this image in the terminal, render this image inline, display this picture in the active Desk terminal, or says "이 이미지를 터미널에 보여줘", prefer the dedicated terminal image MCP tools.

- Use `xenesis_desk_terminal_image_show` for an absolute local file path or URL.
- Use `xenesis_desk_terminal_image_show_base64` when the image is already available as bytes/base64 or has been converted from an attachment.
- Use `xenesis_desk_terminal_xcon_image_show` when the user wants an XCON/SKETCH fence rendered as an image inside the terminal.
- Omit `termId` unless the user names a specific terminal. The MCP tool targets the active terminal first, then falls back to the first known Xenesis Desk terminal.
- Prefer `width:"80%"` and `height:"auto"` for readable inline terminal rendering unless the user asks for a different size.

Only use the image viewer, Playwright screenshot tools, or file-open tools when the user asks to open, save, inspect, or compare the image outside the terminal. Do not shell-print raw OSC 1337 image escape sequences unless the MCP image tools are unavailable.

## XCON And PDF Flow

For inline chat, Xenesis Agent Workbench, or Xenesis Bot answers, prefer prompt kind `workbench-response` when a visual answer would help:

- Return the generated Markdown inline so the active chat/workbench surface can stream and render it directly.
- Include complete `xcon-sketch`, `xcon-chain`, `xcon-chain-fixture`, or `xcon-workflow` fences only when the fetched prompt asks for them.
- Skip validation for inline chat and Workbench responses. Use renderer partial rendering and visible render errors for inline XCON/SKETCH issues.
- Validate only when the user explicitly asks to save, export, open, validate, or repair an artifact.
- Do not call `xenesis_desk_create_xcon_markdown`, `xenesis_desk_create_xcon_markdown_from_content`, or safe file write tools unless the user explicitly asks for a saved file, export, or separate Desk pane/window.
- If the user asks for a saved file, export, or separate Desk pane/window, then use the dedicated XCON creation/export tools and set `openInDesk` according to the request.

For Hermes gateway/Bot saved artifact generation, prefer the dedicated XCON tools over generic file writes:

- Use `xenesis_desk_mobile_create_xcon_markdown_from_content` when the agent already has Markdown with XCON/SKETCH fences.
- Use `xenesis_desk_mobile_create_xcon_markdown` for prompt-based XCON/SKETCH Markdown generation from a brief.
- Use `xenesis_desk_mobile_export_xcon_pdf` to export an existing XCON Markdown file to PDF.
- `workspaceDir` and `outDir` are output directories for Markdown. Relative paths resolve under `XENIS_HOME/exports`.
- `pdfOutDir` is the output directory for PDF export. Relative paths resolve under `XENIS_HOME/exports`.
- XCON/SKETCH fence `mode` defaults to `view`; use `code` or `both` only when the user asks to inspect source or see both views.
- Prefer semantic data components when the request contains structured data. Do not emulate tables, charts, maps, or relationship diagrams with labels when XCON components exist for that job.
- Use `spanGrid` for table-like rankings, standings, schedules, inventories, ledgers, and comparison rows.
- Use `chart` for comparative values, trends, forecasts, distributions, scorecards, rankings, and numeric summaries.
- For operational status data with service names, state/severity, latency, owner, priority, incident, SLA, queue, or health fields, prefer an inline XCON/SKETCH dashboard with summary panels plus `spanGrid` and/or `chart` instead of plain Markdown tables.
- Use `map` for geographic, regional, route, venue, facility, weather-location, or site-status reports.
- Use `networkDiagram` for dependencies, process flows, topology, handoffs, lineage, and incident blast-radius views.
- Use only known public SKETCH component types. Do not invent convenience components such as `bulletList`, `timeline`, `kpiCard`, or `chartCard`; use Markdown bullets outside SKETCH, or valid `list`, `spanGrid`, `chart`, `panel`, and `label` compositions inside SKETCH.
- XCON/SKETCH nested components use parent-local coordinates. A child inside a `panel`, `list` template cell, or another component starts at `0 0` inside that parent, not at the screen origin. Do not add the parent panel's screen x/y offset to child coordinates. For nested children, child x/y must fit inside the parent width/height unless the user explicitly asks for clipping or overflow.
- Set `openInDesk:false` unless the user explicitly asks to open a separate Xenesis Desk pane/window. Xenesis Bot answers should include the generated Markdown with XCON/SKETCH fences inline so the chat surface renders it directly.
- Set `exportPdf:true` when the user asks for a shareable PDF, Telegram PDF delivery, or an XCON Markdown result that should be returned as PDF.

## Hermes Stash Operations

Stash operations are implemented by the Hermes `xenesis_desk_gateway` plugin, not by Hermes core and not as direct MCP tool names. For Claude Code or Codex, use MCP to open the Xenesis Bot or Hermes Stash Operations panel, then route plugin commands through the configured Hermes gateway when the user asks for stash scheduling, delivery, health, presets, templates, or retention.

Use these command families:

- Full gateway usage: `/xd stash [save|list|open|remove|restore|diff|export|import|apply|pack|unpack|apply-pack|inspect|promote|schedule|schedules|pause|resume|trigger|runs|repair|unschedule|prune|path]`.
- Capture and restore: `/xd stash save`, `/xd stashes`, `/xd stash open`, `/xd stash diff`, `/xd stash restore`, `/xd stash export`, `/xd stash import`, `/xd stash apply`.
- Pack and inspect: `/xd stash pack`, `/xd stash unpack`, `/xd stash apply-pack`, `/xd stash inspect`, `/xd stash promote`, `/xd stash prune`, `/xd stash remove`, `/xd stash path`.
- Scheduling: `/xd stash schedule #N <cron|interval> [deliver=...]`, `/xd stash schedules`, `/xd stash pause`, `/xd stash resume`, `/xd stash trigger`, `/xd stash runs`, `/xd stash repair`, `/xd stash unschedule`.
- Operations policy: `/xd stash health`, `/xd stash health digest`, `/xd stash health schedule <cron|interval> [deliver=...]`, `/xd stash preset`, `/xd stash template`, `/xd stash retention`.

Do not edit Hermes core to add or change these commands. If the plugin surface is insufficient, treat the capability as blocked until the plugin exposes it.

## Panel Command IDs

Open core Xenesis Desk panels with `xenesis_desk_run_command_palette`:

- `xenesis-desk.core-tools.openXamongCode`
- `xenesis-desk.core-tools.openXenisBot`
- `xenesis-desk.core-tools.openAiWorkbench`
- `xenesis-desk.core-tools.openArtifactLibrary`
- `xenesis-desk.core-tools.openTerminalInspector`
- `xenesis-desk.core-tools.openProcessViewer`
- `xenesis-desk.core-tools.openRemoteSyncPlanner`
- `xenesis-desk.core-tools.openRunTaskPanel`
- `xenesis-desk.core-tools.openHermesStatus`
- `xenesis-desk.core-tools.openHermesActionInbox`
- `xenesis-desk.core-tools.openHermesTimeline`
- `xenesis-desk.core-tools.openHermesStashOps`
- `xenesis-desk.core-tools.openPreview`

## Procedure

1. Identify whether the user wants direct Xenesis Desk MCP control or Hermes mobile/gateway plugin behavior.
2. If direct MCP tools are available, call the specific `xenesis_desk_*` tool instead of shelling into Hermes.
3. For terminal commands, preview first when the command is non-trivial, long-running, destructive, or touches broad paths.
4. For terminal image requests, use `xenesis_desk_terminal_image_show`, `xenesis_desk_terminal_image_show_base64`, or `xenesis_desk_terminal_xcon_image_show`.
5. For delegated agent work that the user wants to watch in Desk, use `xenesis_desk_subagent_start` instead of hiding it in an internal background worker.
6. For Office document operations, prefer typed `xd.office.*` capabilities. Use visible `xd.apps.*` UI control only as an explicit fallback.
7. For file writes through Xenesis Desk, use `xenesis_desk_preview_text_file_write` before `xenesis_desk_apply_text_file_write`; keep the returned backup path for rollback.
8. For file/XCON/panel actions, prefer the dedicated Xenesis Desk MCP tool over generic filesystem or terminal commands.
9. For panel work, run the command palette ID and verify with `xenesis_desk_list_panels`.
10. For mobile approval, action-token, and stash schedule/policy work, let the Hermes `xenesis_desk_gateway` plugin handle the flow through Xenesis Bot, Hermes Stash Operations, or the mobile gateway. Do not bypass that flow with direct bridge calls.
11. After running actions, verify with `xenesis_desk_state`, `xenesis_desk_terminal_tail`, `xenesis_desk_subagent_tail`, `xenesis_desk_list_open_files`, `xenesis_desk_list_panels`, or `xenesis_desk_recent_diagnostics` as appropriate.
12. For generated XCON Markdown, expect files to be created by the Xenesis Desk bridge/native MCP path, not by the Hermes plugin process. Omitted or relative `workspaceDir` values resolve under `XENIS_HOME/exports`.
13. For file, XCON, and Playwright artifacts, check `xenesis_desk_state.artifactPaneId` when the user wants outputs away from the active terminal or Bot pane. Omit `targetPaneId` to use the configured artifact pane, or pass a specific pane id to override it for one tool call.
14. For Xenesis Bot responses, render XCON/SKETCH inline in the Bot answer unless the user explicitly asks for a separate artifact pane. Use `openInDesk:false` for gateway XCON creation in that default chat flow.
15. For Telegram or mobile requests that need a document, create the full Markdown first, then export that Markdown to PDF with `exportPdf:true` or `xenesis_desk_mobile_export_xcon_pdf`.

## Windows and WSL2

When Hermes runs inside WSL2 Ubuntu and Xenesis Desk runs on Windows, `127.0.0.1` does not mean the same machine from both sides. If bridge connectivity fails or the user asks for setup, read `references/windows-wsl-hermes-gateway.md`.

For file paths in that setup, prefer Windows absolute paths or `/mnt/<drive>/...` paths. The Xenesis Desk bridge normalizes `/mnt/<drive>/...` to Windows paths for file open, XCON workspace, Playwright artifact directories, and safe text file writes.

## Safety

- Ask for explicit approval before destructive terminal commands unless the user has already authorized that exact workspace and operation class.
- Prefer `xenesis_desk_terminal_preview` before `xenesis_desk_terminal_run` for commands with side effects.
- Use safe file write preview/apply/restore tools instead of ad hoc text rewrites when the user wants Xenesis Desk-mediated file changes.
- For Playwright snapshot tools, expect the generated PNG/JPEG to open in the Xenesis Desk image viewer by default. Set `openInDesk:false` when the user only wants a saved artifact.
- For artifact-heavy work, prefer the configured artifact pane or an explicit `targetPaneId` instead of opening outputs over the active terminal or Bot pane.
- For generated XCON/SKETCH from Hermes gateway, keep the default display mode as `view`; use `both` only when explicitly requested.
- For Telegram PDF delivery, export the full Markdown document, not only the fenced XCON/SKETCH block.
- For Playwright tools, set `allowedHosts` when the target surface is known or sensitive.
- Do not modify Hermes core gateway files to add `/xd`; the intended Hermes path is the `xenesis_desk_gateway` plugin.
- Keep Hermes plugin `/xd` and Claude/Codex skill `/xd` conceptually separate.

## Verification

For direct MCP control, verify the bridge with:

- `xenesis_desk_state`
- `xenesis_desk_terminal_preview`
- `xenesis_desk_terminal_run`
- `xenesis_desk_terminal_tail`
- `xenesis_desk_terminal_image_show`
- `xenesis_desk_terminal_image_show_base64`
- `xenesis_desk_subagent_start`
- `xenesis_desk_subagent_tail`
- `xenesis_desk_preview_text_file_write` for write planning
- `xenesis_desk_run_command_palette` with `xenesis-desk.core-tools.openHermesStashOps`
- `xenesis_desk_list_panels`

For Hermes mobile gateway and plugin-only stash features, verify from the gateway/mobile surface:

```text
/xd status
/xd mobile
/xd run echo e2e-from-mobile
/xd terminals
/xd tail #1
/xd stash health
/xd stash schedules
/xd stash retention dry-run run-days=30 failed-days=90
```
