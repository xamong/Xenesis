# Xenesis Desk Capability Registry 목록

생성일: 2026-06-29

이 문서는 Xenesis Desk Capability Registry의 현재 노드 목록을 정리한 자동 생성 문서입니다.
레지스트리의 단일 기준은 `src/shared/deskBridgeCapabilities.ts`이며, 이 문서는 `scripts/generateCapabilityRegistryDocs.mjs`로 재생성할 수 있습니다.
기본 목록은 `XENIS_PHASE_5`가 꺼진 상태의 공개 capability를 기준으로 하며, Phase 5 전용 XamongCode capability는 audit 문서에서 별도로 검증합니다.

## 요약

- 전체 노드: 796
- 호출 가능 method: 493
- 구독 가능 event: 54
- schema 보유 노드: 216
- 최상위 그룹: 42

## Kind별 노드 수

| Kind | Count |
| --- | ---: |
| collection | 24 |
| event | 54 |
| group | 177 |
| method | 493 |
| property | 48 |

## Permission별 노드 수

| Permission | Count |
| --- | ---: |
| control | 263 |
| danger | 9 |
| execute | 26 |
| read | 430 |
| write | 68 |

## Approval별 노드 수

| Approval | Count |
| --- | ---: |
| never | 696 |
| when-external | 100 |

## 최상위 그룹

| Path | Label | Description | Direct children |
| --- | --- | --- | ---: |
| `xd.app` | Application | Application status, window state, and runtime inventory. | 2 |
| `xd.workspace` | Workspace | Workspace profile save, open, read, and recent-list operations. | 5 |
| `xd.window` | Window | Window bounds and window sizing controls. | 4 |
| `xd.updater` | Updater | Application update status and update lifecycle operations. | 4 |
| `xd.services` | Runtime services | Managed local runtime services used by Xenesis Desk. | 3 |
| `xd.xenesis` | Xenesis | Xenesis agent and gateway control surface for Xenesis Desk orchestration. | 18 |
| `xd.testing` | Testing | Development-only testing helpers for Xenesis Desk CR and smoke workflows. | 3 |
| `xd.events` | Events | Subscribable Xenesis Desk event surface and observable state changes. | 22 |
| `xd.ui` | UI | Global Xenesis Desk user-interface controls. | 5 |
| `xd.layout` | Layout | Saved dock layout commands and app-level layout reset operations. | 3 |
| `xd.panes` | Built-in panes | Built-in non-extension panes opened by renderer commands. | 5 |
| `xd.views` | Views | Unified pane and tool opening surface with explicit dock placement. | 1 |
| `xd.localCli` | Local CLI agents | Local Codex, Claude, Cursor, and related CLI agent discovery. | 1 |
| `xd.dock` | Dock | Dock layout, panes, contents, and focus management. | 19 |
| `xd.explorer` | Explorer | Explorer panes, navigation, and file-tree UI control surface. | 2 |
| `xd.favorites` | Favorites | Favorites, captures, and remote-files side panel controls. | 8 |
| `xd.apps` | External apps | Visible external desktop app launch and window control surface. | 8 |
| `xd.files` | Files | Local file open, preview, and safe-write control surface. | 11 |
| `xd.fs` | File system | Directory listing and base64 file transfer primitives. | 4 |
| `xd.remoteFiles` | Remote files | FTP, FTPS, and SFTP profile-backed remote file operations. | 8 |
| `xd.transferQueue` | Transfer queue | Remote upload and download queue lifecycle. | 6 |
| `xd.context` | Context | Active pane, active content, and context-aware action discovery. | 2 |
| `xd.panels` | Panels | Extension panel and renderer panel inventory. | 1 |
| `xd.commands` | Commands | Command palette and command dispatch surface. | 1 |
| `xd.terminals` | Terminals | Terminal session lifecycle and output inspection. | 20 |
| `xd.automation` | Automation | Terminal automation controller status and controls. | 5 |
| `xd.mcp` | MCP bridge | MCP bridge status, action inbox, and Bot session state. | 4 |
| `xd.cr` | Capability Registry | Capability Registry smoke, coverage, and handoff verification surface. | 1 |
| `xd.extensions` | Extensions | Extension command and panel control surface. | 6 |
| `xd.tools` | Tools | First-class Xenesis Desk tool panels opened through the extension host. | 4 |
| `xd.settings` | Settings | Application settings, provider profiles, and user preferences. | 6 |
| `xd.secrets` | Secret vault | Secret vault status and reset operations. | 2 |
| `xd.processes` | Processes | Local process inventory and termination surface. | 2 |
| `xd.gowoori` | Gowoori | Gowoori artifact viewer and GowooriChat generation control surface. | 2 |
| `xd.capture` | Capture | Renderer pane capture and visual smoke-test support. | 10 |
| `xd.playwright` | Playwright | Browser automation and screenshot support. | 2 |
| `xd.xcon` | XCON Render | Standalone XCON/SKETCH rendering operations (output-target agnostic). | 1 |
| `xd.artifacts` | Artifacts | Artifact prompt, validation, creation, and export operations. | 2 |
| `xd.diagnostics` | Diagnostics | Diagnostics logs, bridge health, and renderer performance trace. | 8 |
| `xd.audit` | Audit Log | Structured Capability Registry audit records. | 4 |
| `xd.control` | Agent Control Lock | Multi-agent access control. Ensures only one agent controls the Desk at a time. | 4 |
| `xd.meta` | Meta Management | Hierarchical metadata (CMDB) tree, code CRUD, attributes, instances, snapshots, and relations. | 7 |

## Coverage Map

Electron IPC, HTTP bridge, command palette, renderer command, dock content, menu, context action 등 기존 Xenesis Desk 기능 표면이 어떤 Capability path로 연결되는지 확인하기 위한 coverage map입니다.

| Coverage constant | Entries |
| --- | ---: |
| `DESK_BRIDGE_APP_MENU_ROLE_CAPABILITY_COVERAGE` | 14 |
| `DESK_BRIDGE_APP_TOOLBAR_CAPABILITY_COVERAGE` | 16 |
| `DESK_BRIDGE_ARRANGE_MENU_CAPABILITY_COVERAGE` | 4 |
| `DESK_BRIDGE_AUTH_MENU_CAPABILITY_COVERAGE` | 5 |
| `DESK_BRIDGE_BROWSER_TOOLBAR_CAPABILITY_COVERAGE` | 6 |
| `DESK_BRIDGE_CAPTURE_MENU_CAPABILITY_COVERAGE` | 8 |
| `DESK_BRIDGE_CODE_TOOLBAR_CAPABILITY_COVERAGE` | 4 |
| `DESK_BRIDGE_COMMAND_CAPABILITY_COVERAGE` | 56 |
| `DESK_BRIDGE_COMMAND_CENTER_ACTION_CAPABILITY_COVERAGE` | 8 |
| `DESK_BRIDGE_COMMAND_CENTER_HISTORY_CAPABILITY_COVERAGE` | 2 |
| `DESK_BRIDGE_COMMAND_CENTER_SHORTCUT_CAPABILITY_COVERAGE` | 6 |
| `DESK_BRIDGE_COMMAND_CENTER_WORK_BLOCK_CAPABILITY_COVERAGE` | 13 |
| `DESK_BRIDGE_CONTEXT_ACTION_CAPABILITY_COVERAGE` | 10 |
| `DESK_BRIDGE_DEMO_TIMELINE_MENU_CAPABILITY_COVERAGE` | 5 |
| `DESK_BRIDGE_DIAGNOSTICS_TOOLBAR_CAPABILITY_COVERAGE` | 11 |
| `DESK_BRIDGE_DOCK_ACTION_CAPABILITY_COVERAGE` | 16 |
| `DESK_BRIDGE_DOCK_CONTENT_CAPABILITY_COVERAGE` | 48 |
| `DESK_BRIDGE_DOCK_TAB_MENU_CAPABILITY_COVERAGE` | 9 |
| `DESK_BRIDGE_DOCUMENT_PREVIEW_TOOLBAR_CAPABILITY_COVERAGE` | 7 |
| `DESK_BRIDGE_EXPLORER_ACTION_CAPABILITY_COVERAGE` | 20 |
| `DESK_BRIDGE_EXTENSION_HOST_ACTION_CAPABILITY_COVERAGE` | 5 |
| `DESK_BRIDGE_EXTENSION_TOOL_CAPABILITY_COVERAGE` | 33 |
| `DESK_BRIDGE_FAVORITES_ACTION_CAPABILITY_COVERAGE` | 8 |
| `DESK_BRIDGE_FAVORITES_MENU_CAPABILITY_COVERAGE` | 5 |
| `DESK_BRIDGE_HEX_TOOLBAR_CAPABILITY_COVERAGE` | 4 |
| `DESK_BRIDGE_HTTP_CAPABILITY_COVERAGE` | 114 |
| `DESK_BRIDGE_IMAGE_TOOLBAR_CAPABILITY_COVERAGE` | 7 |
| `DESK_BRIDGE_IPC_CAPABILITY_COVERAGE` | 176 |
| `DESK_BRIDGE_IPC_EVENT_COVERAGE` | 47 |
| `DESK_BRIDGE_LOCAL_EXPLORER_MENU_CAPABILITY_COVERAGE` | 16 |
| `DESK_BRIDGE_MARKDOWN_TOOLBAR_CAPABILITY_COVERAGE` | 17 |
| `DESK_BRIDGE_MERMAID_TOOLBAR_CAPABILITY_COVERAGE` | 17 |
| `DESK_BRIDGE_META_MANAGEMENT_MENU_CAPABILITY_COVERAGE` | 4 |
| `DESK_BRIDGE_ONBOARDING_ACTION_CAPABILITY_COVERAGE` | 8 |
| `DESK_BRIDGE_PRELOAD_API_COVERAGE` | 1 |
| `DESK_BRIDGE_REMOTE_EXPLORER_ACTION_CAPABILITY_COVERAGE` | 15 |
| `DESK_BRIDGE_REMOTE_EXPLORER_MENU_CAPABILITY_COVERAGE` | 13 |
| `DESK_BRIDGE_RENDERER_COMMAND_CAPABILITY_COVERAGE` | 24 |
| `DESK_BRIDGE_RENDERER_EVENT_COVERAGE` | 41 |
| `DESK_BRIDGE_SETTINGS_SECTION_CAPABILITY_COVERAGE` | 17 |
| `DESK_BRIDGE_SHELL_DROPDOWN_CAPABILITY_COVERAGE` | 4 |
| `DESK_BRIDGE_TERMINAL_CONTEXT_MENU_CAPABILITY_COVERAGE` | 12 |
| `DESK_BRIDGE_TERMINAL_UI_ACTION_CAPABILITY_COVERAGE` | 14 |
| `DESK_BRIDGE_TOOLS_MENU_CAPABILITY_COVERAGE` | 4 |
| `DESK_BRIDGE_UPDATER_BANNER_CAPABILITY_COVERAGE` | 2 |
| `DESK_BRIDGE_WINDOW_SIZER_MENU_CAPABILITY_COVERAGE` | 3 |
| `DESK_BRIDGE_WORKSPACE_MENU_CAPABILITY_COVERAGE` | 2 |
| `DESK_BRIDGE_XCON_VIEWER_TOOLBAR_CAPABILITY_COVERAGE` | 10 |

## 전체 Capability 목록

아래 표는 `listDeskBridgeCapabilities()` 결과를 path namespace별로 나눈 전체 목록입니다.

### xd

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd` | group | read | never | readable | Xenesis Desk | Root capability tree for Xenesis Desk control surfaces. |

### xd.app

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.app` | group | read | never | readable | Application | Application status, window state, and runtime inventory. |
| `xd.app.status` | method | read | never | callable | Read status | Read the current Xenesis Desk bridge, app, renderer, and diagnostics status. |
| `xd.app.quit` | method | danger | when-external | callable | Quit application | Quit the Xenesis Desk application through the native application menu role. |

### xd.apps

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.apps` | group | read | never | readable | External apps | Visible external desktop app launch and window control surface. |
| `xd.apps.status` | method | read | never | callable, schema | Read external app status | Find visible windows for a registered external desktop app profile such as Notepad. |
| `xd.apps.find` | method | read | never | callable, schema | Find external app windows | Find visible external desktop app windows. |
| `xd.apps.launch` | method | execute | when-external | callable, schema | Launch external app | Launch a registered external desktop app profile. Prefer appId such as notepad over arbitrary paths. |
| `xd.apps.focus` | method | control | never | callable, schema | Focus external app | Focus a visible external app window. |
| `xd.apps.resize` | method | control | never | callable, schema | Resize external app | Move and resize a visible external app window. |
| `xd.apps.typeText` | method | execute | when-external | callable, schema | Type into external app | Type text into a focused external app window. |
| `xd.apps.hotkey` | method | execute | when-external | callable, schema | Send external app hotkey | Send a hotkey to a focused external app window. |
| `xd.apps.close` | method | control | never | callable, schema | Close external app window | Close a visible external app window or process. |

### xd.artifacts

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.artifacts` | group | read | never | readable | Artifacts | Artifact prompt, validation, creation, and export operations. |
| `xd.artifacts.engine` | group | read | never | readable | Artifact Engine | Shared Gowoori/Xenesis artifact routing and preparation operations. |
| `xd.artifacts.engine.route` | method | read | never | callable, schema | Route artifact request | Classify a natural-language request and assemble the prompt plan used by Gowoori or Xenesis artifact generation. |
| `xd.artifacts.engine.prepare` | method | read | never | callable, schema | Prepare artifact result | Normalize and validate generated Markdown + XCON/SKETCH content before preview, apply, or handoff. |
| `xd.artifacts.xconMarkdown` | group | read | never | readable | XCON Markdown | XCON/SKETCH Markdown prompt, validation, creation, and PDF export. |
| `xd.artifacts.xconMarkdown.prompt` | method | read | never | callable, schema | Get XCON prompt guidance | Return assembled XCON/SKETCH generation guidance for agents and tools. |
| `xd.artifacts.xconMarkdown.validate` | method | read | never | callable, schema | Validate XCON Markdown | Validate Markdown content that contains renderable XCON/SKETCH fences. |
| `xd.artifacts.xconMarkdown.create` | method | write | when-external | callable, schema | Create XCON Markdown from prompt | Create a Markdown file containing an XCON/SKETCH fence from a prompt and optionally open it in Xenesis Desk. |
| `xd.artifacts.xconMarkdown.createFromContent` | method | write | when-external | callable, schema | Create XCON Markdown from content | Save Markdown containing XCON/SKETCH fences and optionally open it in Xenesis Desk. |
| `xd.artifacts.xconMarkdown.exportPdf` | method | write | when-external | callable, schema | Export XCON Markdown PDF | Export an existing XCON Markdown file to PDF using Xenesis Desk. |

### xd.audit

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.audit` | group | read | never | readable | Audit Log | Structured Capability Registry audit records. |
| `xd.audit.list` | method | read | never | callable, schema | List audit records | List recent audit records. |
| `xd.audit.query` | method | read | never | callable, schema | Query audit records | Query audit records by source, permission, or start time. |
| `xd.audit.export` | method | read | never | callable | Export audit records | Export in-memory audit records. |
| `xd.audit.clear` | method | control | never | callable | Clear audit records | Clear in-memory audit records. |

### xd.automation

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.automation` | group | read | never | readable | Automation | Terminal automation controller status and controls. |
| `xd.automation.workflow` | group | read | never | readable | CR workflow runner | Preview and execute structured Capability Registry workflows for Xenesis Agent Desk control. |
| `xd.automation.workflow.preview` | method | read | never | callable, schema | Preview CR workflow | Validate and normalize a structured CR workflow without executing any step. |
| `xd.automation.workflow.run` | method | execute | when-external | callable, schema | Run CR workflow | Validate and execute a structured CR workflow sequentially through the Capability Registry. |
| `xd.automation.terminals` | group | read | never | readable | Terminal automation | Automation state attached to terminal sessions. |
| `xd.automation.terminals.status` | method | read | never | callable | Read automation status | Read automation status for a terminal session. |
| `xd.automation.terminals.events` | method | read | never | callable | Read automation events | Read automation event history for a terminal session. |
| `xd.automation.terminals.clearEvents` | method | control | never | callable | Clear automation events | Clear automation event history for a terminal session. |
| `xd.automation.terminals.setEnabled` | method | control | never | callable | Enable terminal automation | Enable or disable automation for a terminal session. |
| `xd.automation.terminals.setStage` | method | control | never | callable | Set automation stage | Set automation stage for a terminal session. |
| `xd.automation.terminals.setStreamFilterProfile` | method | control | never | callable, schema | Set stream filter profile | Override or reset the terminal automation stream filter profile. |
| `xd.automation.terminals.reloadSettings` | method | control | never | callable | Reload automation settings | Reload automation settings into every active terminal automation controller. |
| `xd.automation.terminals.manualSend` | method | execute | when-external | callable | Send manual automation input | Manually send input through a terminal automation controller. |
| `xd.automation.workflowRuns` | group | read | never | readable | Workflow run history | Saved workflow run history records and cleanup controls. |
| `xd.automation.workflowRuns.list` | method | read | never | callable | List workflow runs | List stored workflow run history records. |
| `xd.automation.workflowRuns.save` | method | write | when-external | callable | Save workflow run | Save one workflow run history record. |
| `xd.automation.workflowRuns.delete` | method | write | when-external | callable | Delete workflow run | Delete one workflow run history record by id. |
| `xd.automation.workflowRuns.clear` | method | danger | when-external | callable | Clear workflow runs | Clear stored workflow run history records. |
| `xd.automation.workflowTemplates` | group | read | never | readable | Workflow templates | Saved workflow templates and favorite/touch metadata. |
| `xd.automation.workflowTemplates.list` | method | read | never | callable | List workflow templates | List saved workflow templates. |
| `xd.automation.workflowTemplates.save` | method | write | when-external | callable | Save workflow template | Save or replace one workflow template. |
| `xd.automation.workflowTemplates.favorite` | method | write | when-external | callable | Favorite workflow template | Set one workflow template favorite flag. |
| `xd.automation.workflowTemplates.touch` | method | write | when-external | callable | Touch workflow template | Update one workflow template last-used metadata. |
| `xd.automation.workflowTemplates.remove` | method | write | when-external | callable | Remove workflow template | Remove one workflow template. |
| `xd.automation.playwright` | group | read | never | readable | Workflow Playwright | Workflow-scoped Playwright snapshot and action runners. |
| `xd.automation.playwright.snapshot` | method | execute | when-external | callable | Run workflow snapshot | Run the workflow Playwright snapshot worker. |
| `xd.automation.playwright.run` | method | execute | when-external | callable | Run workflow browser actions | Run the workflow Playwright action worker. |

### xd.capture

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.capture` | group | read | never | readable | Capture | Renderer pane capture and visual smoke-test support. |
| `xd.capture.start` | method | control | never | callable | Start capture overlay | Start the multi-display capture overlay. |
| `xd.capture.cancel` | method | control | never | callable | Cancel capture overlay | Close every active capture overlay window. |
| `xd.capture.startFileDrag` | method | control | never | callable | Start capture file drag | Start an operating-system drag gesture for a saved capture file. |
| `xd.capture.pane` | method | control | never | callable, schema | Capture pane rectangle | Capture a renderer pane rectangle from the focused or main Xenesis Desk window. |
| `xd.capture.saveDataUrl` | method | write | when-external | callable, schema | Save capture data URL | Save a PNG data URL into the capture directory. |
| `xd.capture.list` | method | read | never | callable | List captures | List saved screenshot captures. |
| `xd.capture.thumbnail` | method | read | never | callable, schema | Read capture thumbnail | Read a saved capture thumbnail as a data URL. |
| `xd.capture.delete` | method | write | when-external | callable, schema | Delete capture | Delete one saved screenshot capture. |
| `xd.capture.deleteAll` | method | danger | when-external | callable | Delete all captures | Delete every saved screenshot capture. |
| `xd.capture.activePane` | method | control | never | callable, schema | Capture active pane | Capture a screenshot of the active or requested Xenesis Desk pane. |

### xd.commands

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.commands` | group | read | never | readable | Commands | Command palette and command dispatch surface. |
| `xd.commands.palette` | group | read | never | readable | Command palette | Search and run Xenesis Desk command palette commands. |
| `xd.commands.palette.list` | method | read | never | callable, schema | List command palette items | List searchable command palette commands. |
| `xd.commands.palette.run` | method | control | never | callable, schema | Run command palette item | Run a command palette command and dispatch its UI actions. |

### xd.context

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.context` | group | read | never | readable | Context | Active pane, active content, and context-aware action discovery. |
| `xd.context.active` | method | read | never | callable | Read active context | Read the currently active Xenesis Desk pane, content, file, panel, or terminal context. |
| `xd.context.actions` | method | read | never | callable | List context actions | List context-aware actions for the currently active pane, content, file, panel, or terminal. |

### xd.control

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.control` | group | read | never | readable | Agent Control Lock | Multi-agent access control. Ensures only one agent controls the Desk at a time. |
| `xd.control.acquire` | method | control | never | callable, schema | Acquire lock | Acquire exclusive control of the Desk. Returns a lockId for subsequent calls. |
| `xd.control.release` | method | control | never | callable, schema | Release lock | Release exclusive control of the Desk. |
| `xd.control.forceRelease` | method | danger | when-external | callable | Force release | Force release the current lock regardless of holder. |
| `xd.control.status` | method | read | never | callable | Lock status | Check who currently holds the control lock. |

### xd.cr

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.cr` | group | read | never | readable | Capability Registry | Capability Registry smoke, coverage, and handoff verification surface. |
| `xd.cr.smoke` | group | read | never | readable | CR smoke handoff | CR smoke-test handoff artifacts for external LLM verification. |
| `xd.cr.smoke.latest` | method | read | never | callable, schema | Read latest CR smoke handoff | Read the latest CR smoke handoff JSON files written under the Xenesis Desk dev MCP smoke directory. |

### xd.diagnostics

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.diagnostics` | group | read | never | readable | Diagnostics | Diagnostics logs, bridge health, and renderer performance trace. |
| `xd.diagnostics.state` | method | read | never | callable | Read diagnostics state | Read the bridge status snapshot used for diagnostics. |
| `xd.diagnostics.list` | method | read | never | callable | List diagnostics | List all diagnostics entries currently stored in memory. |
| `xd.diagnostics.recent` | method | read | never | callable, schema | Read recent diagnostics | Read recent diagnostics entries. |
| `xd.diagnostics.record` | method | write | when-external | callable, schema | Record diagnostic | Record a diagnostics entry. |
| `xd.diagnostics.clear` | method | control | never | callable | Clear diagnostics | Clear in-memory diagnostics entries. |
| `xd.diagnostics.revealLogFile` | method | control | never | callable | Reveal diagnostics log file | Reveal the diagnostics log file in the operating system shell. |
| `xd.diagnostics.exportBundle` | method | write | when-external | callable | Export diagnostics bundle | Export a diagnostics support bundle. |
| `xd.diagnostics.performanceTrace` | method | control | never | callable, schema | Configure performance trace | Enable, disable, clear, or filter renderer performance trace diagnostics. |

### xd.dock

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.dock` | group | read | never | readable | Dock | Dock layout, panes, contents, and focus management. |
| `xd.dock.focus` | method | control | never | callable, schema | Focus dock content | Focus an open content item or pane in the Xenesis Desk dock. |
| `xd.dock.move` | method | control | never | callable, schema | Move dock content | Move an open content item to a dock window state or into a target dock pane. |
| `xd.dock.close` | method | control | never | callable, schema | Close dock content | Close an open content item or pane in the Xenesis Desk dock. |
| `xd.dock.closeOthers` | method | control | never | callable, schema | Close other dock tabs | Close every other content item in the same dock pane as the target content. |
| `xd.dock.closeRight` | method | control | never | callable, schema | Close dock tabs to the right | Close content items to the right of the target tab in the same dock pane. |
| `xd.dock.closeAll` | method | control | never | callable, schema | Close all dock tabs in pane | Close every content item in the target dock pane. |
| `xd.dock.arrangeGroup` | method | control | never | callable, schema | Arrange dock group | Arrange a dock pane group horizontally, vertically, or as a grid. |
| `xd.dock.arrangeHorizontal` | method | control | never | callable | Arrange dock group horizontally | Arrange the active or targeted dock group horizontally. |
| `xd.dock.arrangeVertical` | method | control | never | callable | Arrange dock group vertically | Arrange the active or targeted dock group vertically. |
| `xd.dock.arrangeGrid` | method | control | never | callable | Arrange dock group as grid | Arrange the active or targeted dock group as a grid. |
| `xd.dock.mergeGroup` | method | control | never | callable, schema | Merge dock group | Restore an arranged dock pane group back into tabbed content. |
| `xd.dock.mergeAll` | method | control | never | callable | Merge all dock groups | Merge arranged dock groups back into tabbed panes. |
| `xd.dock.sizes` | group | read | never | readable | Dock sizes | Read or set side dock widths and heights for reproducible layouts and visual tests. |
| `xd.dock.sizes.current` | method | read | never | callable | Read dock sizes | Read the current left, right, top, and bottom dock sizes in pixels. |
| `xd.dock.sizes.set` | method | control | never | callable, schema | Set dock sizes | Set side dock widths and heights in pixels. Use right for a readable GowooriChat side pane during tests. |
| `xd.dock.pane` | group | read | never | readable | Pane layout aliases | Stable pane-scoped aliases for arranging or merging the targeted dock pane group. |
| `xd.dock.pane.arrange` | method | control | never | callable, schema | Arrange pane group | Arrange the pane group containing contentId or paneId horizontally, vertically, or as a grid. |
| `xd.dock.pane.merge` | method | control | never | callable, schema | Merge pane group | Merge the pane group containing contentId or paneId back into one tab group. |
| `xd.dock.pane.size.set` | method | control | never | callable, schema | Set pane group size | Set the width or height percentage of the exact pane group branch inside its current dock window. |
| `xd.dock.window` | group | read | never | readable | Window layout | Arrange or merge all tabs in one Xenesis Desk dock window state. |
| `xd.dock.window.arrange` | method | control | never | callable, schema | Arrange dock window | Arrange all tabs in a dock window horizontally, vertically, or as a grid. |
| `xd.dock.window.merge` | method | control | never | callable, schema | Merge dock window | Merge all arranged tabs in one dock window back into one tab group. |
| `xd.dock.artifactTarget` | group | read | never | readable | Artifact target | Pane used for generated artifact previews such as Gowoori results. |
| `xd.dock.artifactTarget.current` | method | read | never | callable | Read artifact target | Read the current artifact target pane and active dock pane. |
| `xd.dock.artifactTarget.set` | method | control | never | callable, schema | Set artifact target | Set the artifact target pane. Omit paneId/contentId to use the active pane. |
| `xd.dock.panes` | collection | read | never | readable | Panes | Dock pane inventory and pane-level placement targets. |
| `xd.dock.panes.list` | method | read | never | callable | List dock panes | List current dock pane inventory and active content references. |
| `xd.dock.contents` | collection | read | never | readable | Contents | Open dock content inventory and active content references. |
| `xd.dock.changed` | event | read | never | subscribable | Dock changed | Emitted when pane or content state changes. |
| `xd.dock.panes.{paneId}` | collection | read | never | readable | Dock pane {paneId} | Runtime dock pane instance. |
| `xd.dock.panes.{paneId}.id` | property | read | never | readable | Pane id | Runtime dock pane id property. |
| `xd.dock.panes.{paneId}.state` | property | read | never | readable | Pane state | Runtime dock pane state property. |
| `xd.dock.panes.{paneId}.windowState` | property | read | never | readable | Pane windowState | Runtime dock pane windowState property. |
| `xd.dock.panes.{paneId}.group` | property | read | never | readable | Pane group | Runtime dock pane group property. |
| `xd.dock.panes.{paneId}.active` | property | read | never | readable | Pane active | Runtime dock pane active property. |
| `xd.dock.panes.{paneId}.activeContentId` | property | read | never | readable | Pane activeContentId | Runtime dock pane activeContentId property. |
| `xd.dock.panes.{paneId}.contents` | property | read | never | readable | Pane contents | Runtime dock pane contents property. |
| `xd.dock.panes.{paneId}.contentIds` | property | read | never | readable | Pane contentIds | Runtime dock pane contentIds property. |
| `xd.dock.panes.{paneId}.contentCount` | property | read | never | readable | Pane contentCount | Runtime dock pane contentCount property. |
| `xd.dock.panes.{paneId}.title` | property | read | never | readable | Pane title | Runtime dock pane title property. |
| `xd.dock.panes.{paneId}.focus` | method | control | never | callable | Pane focus | Runtime dock pane focus operation. |
| `xd.dock.panes.{paneId}.close` | method | control | never | callable | Pane close | Runtime dock pane close operation. |
| `xd.dock.panes.{paneId}.closeAll` | method | control | never | callable | Pane closeAll | Runtime dock pane closeAll operation. |
| `xd.dock.panes.{paneId}.arrange` | method | control | never | callable | Pane arrange | Runtime dock pane arrange operation. |
| `xd.dock.panes.{paneId}.merge` | method | control | never | callable | Pane merge | Runtime dock pane merge operation. |
| `xd.dock.panes.{paneId}.setArtifactTarget` | method | control | never | callable | Pane setArtifactTarget | Runtime dock pane setArtifactTarget operation. |
| `xd.dock.contents.{contentId}` | collection | read | never | readable | Dock content {contentId} | Runtime dock content instance. |
| `xd.dock.contents.{contentId}.id` | property | read | never | readable | Content id | Runtime dock content id property. |
| `xd.dock.contents.{contentId}.title` | property | read | never | readable | Content title | Runtime dock content title property. |
| `xd.dock.contents.{contentId}.label` | property | read | never | readable | Content label | Runtime dock content label property. |
| `xd.dock.contents.{contentId}.type` | property | read | never | readable | Content type | Runtime dock content type property. |
| `xd.dock.contents.{contentId}.kind` | property | read | never | readable | Content kind | Runtime dock content kind property. |
| `xd.dock.contents.{contentId}.contentType` | property | read | never | readable | Content contentType | Runtime dock content contentType property. |
| `xd.dock.contents.{contentId}.filePath` | property | read | never | readable | Content filePath | Runtime dock content filePath property. |
| `xd.dock.contents.{contentId}.fileName` | property | read | never | readable | Content fileName | Runtime dock content fileName property. |
| `xd.dock.contents.{contentId}.fileOrigin` | property | read | never | readable | Content fileOrigin | Runtime dock content fileOrigin property. |
| `xd.dock.contents.{contentId}.remoteFilePath` | property | read | never | readable | Content remoteFilePath | Runtime dock content remoteFilePath property. |
| `xd.dock.contents.{contentId}.paneId` | property | read | never | readable | Content paneId | Runtime dock content paneId property. |
| `xd.dock.contents.{contentId}.windowState` | property | read | never | readable | Content windowState | Runtime dock content windowState property. |
| `xd.dock.contents.{contentId}.active` | property | read | never | readable | Content active | Runtime dock content active property. |
| `xd.dock.contents.{contentId}.termId` | property | read | never | readable | Content termId | Runtime dock content termId property. |
| `xd.dock.contents.{contentId}.focus` | method | control | never | callable | Content focus | Runtime dock content focus operation. |
| `xd.dock.contents.{contentId}.move` | method | control | never | callable | Content move | Runtime dock content move operation. |
| `xd.dock.contents.{contentId}.close` | method | control | never | callable | Content close | Runtime dock content close operation. |
| `xd.dock.contents.{contentId}.closeOthers` | method | control | never | callable | Content closeOthers | Runtime dock content closeOthers operation. |
| `xd.dock.contents.{contentId}.closeRight` | method | control | never | callable | Content closeRight | Runtime dock content closeRight operation. |
| `xd.dock.contents.{contentId}.closeAll` | method | control | never | callable | Content closeAll | Runtime dock content closeAll operation. |
| `xd.dock.contents.{contentId}.arrange` | method | control | never | callable | Content arrange | Runtime dock content arrange operation. |
| `xd.dock.contents.{contentId}.merge` | method | control | never | callable | Content merge | Runtime dock content merge operation. |
| `xd.dock.contents.{contentId}.setArtifactTarget` | method | control | never | callable | Content setArtifactTarget | Runtime dock content setArtifactTarget operation. |

### xd.events

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.events` | group | read | never | readable | Events | Subscribable Xenesis Desk event surface and observable state changes. |
| `xd.events.app` | group | read | never | readable | Application events | Application lifecycle events. |
| `xd.events.app.closing` | event | read | never | subscribable | Application closing | Emitted before the application closes. |
| `xd.events.auth` | group | read | never | readable | Auth events | Authentication and user profile renderer events. |
| `xd.events.auth.profileUpdated` | event | read | never | subscribable | Profile updated | Emitted when the signed-in profile changes. |
| `xd.events.automation` | group | read | never | readable | Automation events | Terminal automation state and rule execution events. |
| `xd.events.automation.terminals` | group | read | never | readable | Terminal automation events | Per-terminal automation status and event streams. |
| `xd.events.automation.terminals.status` | event | read | never | subscribable | Automation status | Emitted when a terminal automation controller status changes. |
| `xd.events.automation.terminals.event` | event | read | never | subscribable | Automation event | Emitted when a terminal automation controller records a new event. |
| `xd.events.bot` | group | read | never | readable | Bot events | Xenesis Bot and chat handoff renderer events. |
| `xd.events.bot.commandRequested` | event | read | never | subscribable | Bot command requested | Emitted when a pane sends a command-style request to Bot. |
| `xd.events.bot.runCommandRequested` | event | read | never | subscribable | Bot run command requested | Emitted when a command bundle is sent to Bot for execution help. |
| `xd.events.bot.sendFileRequested` | event | read | never | subscribable | Send file to Agent requested | Legacy event emitted when an open file is sent to Xenesis Agent context. |
| `xd.events.bot.messageFocusRequested` | event | read | never | subscribable | Bot message focus requested | Emitted when a bot message should be focused in the chat UI. |
| `xd.events.bot.messageHighlightRequested` | event | read | never | subscribable | Bot message highlight requested | Emitted when a bot message should be highlighted in the chat UI. |
| `xd.events.capture` | group | read | never | readable | Capture events | Capture overlay and screenshot lifecycle events. |
| `xd.events.capture.preparing` | event | read | never | subscribable | Capture preparing | Emitted when capture overlay preparation starts. |
| `xd.events.capture.ready` | event | read | never | subscribable | Capture ready | Emitted when capture overlay or capture flow is ready. |
| `xd.events.capture.done` | event | read | never | subscribable | Capture done | Emitted when a capture file is saved. |
| `xd.events.diagnostics` | group | read | never | readable | Diagnostics events | Diagnostics state change events. |
| `xd.events.diagnostics.changed` | event | read | never | subscribable | Diagnostics changed | Emitted when diagnostics entries change. |
| `xd.events.diagnostics.performanceTrace` | event | read | never | subscribable | Performance trace | Emitted when renderer performance trace samples are recorded. |
| `xd.events.extensions` | group | read | never | readable | Extension events | Extension registry and enablement events. |
| `xd.events.extensions.changed` | event | read | never | subscribable | Extensions changed | Emitted when extension state, installation, or enablement changes. |
| `xd.events.extensions.commandRequested` | event | read | never | subscribable | Extension command requested | Emitted when renderer UI requests an extension command to run. |
| `xd.events.explorer` | group | read | never | readable | Explorer events | Explorer context, navigation, compare, and remote sync renderer events. |
| `xd.events.explorer.contextChanged` | event | read | never | subscribable | Explorer context changed | Emitted when the explorer context bundle changes. |
| `xd.events.explorer.compareSelectionChanged` | event | read | never | subscribable | Explorer compare selection changed | Emitted when local/remote compare selection changes. |
| `xd.events.explorer.compareHistoryChanged` | event | read | never | subscribable | Explorer compare history changed | Emitted when compare history changes. |
| `xd.events.explorer.remoteSyncPlannerHandoff` | event | read | never | subscribable | Remote sync planner handoff | Emitted when explorer selection is handed to the remote sync planner. |
| `xd.events.explorer.local` | group | read | never | readable | Local explorer events | Local explorer navigation and action request events. |
| `xd.events.explorer.local.navigateRequested` | event | read | never | subscribable | Local explorer navigate requested | Emitted when the local explorer should navigate to a path. |
| `xd.events.explorer.local.actionRequested` | event | read | never | subscribable | Local explorer action requested | Emitted when the local explorer should run an action. |
| `xd.events.explorer.remote` | group | read | never | readable | Remote explorer events | Remote explorer navigation and action request events. |
| `xd.events.explorer.remote.navigateRequested` | event | read | never | subscribable | Remote explorer navigate requested | Emitted when the remote explorer should navigate to a path. |
| `xd.events.explorer.remote.actionRequested` | event | read | never | subscribable | Remote explorer action requested | Emitted when the remote explorer should run an action. |
| `xd.events.favorites` | group | read | never | readable | Favorites events | Favorites side-panel renderer events. |
| `xd.events.favorites.showTabRequested` | event | read | never | subscribable | Favorites tab requested | Emitted when a side-panel tab should be shown. |
| `xd.events.files` | group | read | never | readable | File events | File-open and file-edit handoff renderer events. |
| `xd.events.files.openLocalRequested` | event | read | never | subscribable | Open local file requested | Emitted when a local file should be opened in the dock. |
| `xd.events.files.openRemoteRequested` | event | read | never | subscribable | Open remote file requested | Emitted when a remote file should be opened in the dock. |
| `xd.events.files.safeEditHandoff` | event | read | never | subscribable | Safe edit handoff | Emitted when a file is handed to the safe edit workflow. |
| `xd.events.gowoori` | group | read | never | readable | Gowoori events | Gowoori viewer, chat, apply, and quality-log events. |
| `xd.events.gowoori.openRequested` | event | read | never | subscribable | Gowoori open requested | Emitted when a Gowoori viewer pane should be opened. |
| `xd.events.gowoori.applyRequested` | event | read | never | subscribable | Gowoori apply requested | Emitted when generated content should be applied to a Gowoori viewer. |
| `xd.events.gowoori.instanceChanged` | event | read | never | subscribable | Gowoori instance changed | Emitted when an active Gowoori viewer instance announces its state. |
| `xd.events.gowoori.instanceRequested` | event | read | never | subscribable | Gowoori instance requested | Emitted when GowooriChat requests current Gowoori viewer state. |
| `xd.events.gowoori.qualityLogChanged` | event | read | never | subscribable | Gowoori quality log changed | Emitted when Gowoori generation quality logs change. |
| `xd.events.mcp` | group | read | never | readable | MCP events | MCP bridge notification events. |
| `xd.events.mcp.actionInboxChanged` | event | read | never | subscribable | Action inbox changed | Emitted when MCP action inbox contents change. |
| `xd.events.mcp.botEvent` | event | read | never | subscribable | Bot event | Emitted when the MCP bridge records a bot event. |
| `xd.events.settings` | group | read | never | readable | Settings events | Settings pane and persisted settings renderer events. |
| `xd.events.settings.changed` | event | read | never | subscribable | Settings changed | Emitted when application settings change. |
| `xd.events.settings.categoryOpenRequested` | event | read | never | subscribable | Settings category open requested | Emitted when the settings pane should open a specific category. |
| `xd.events.settings.targetOpenRequested` | event | read | never | subscribable | Settings target open requested | Emitted when the settings pane should open a category, mode, and section target. |
| `xd.events.terminals` | group | read | never | readable | Terminal events | Per-terminal data and lifecycle events. |
| `xd.events.terminals.data` | event | read | never | subscribable | Terminal data | Emitted when a terminal session writes output data. |
| `xd.events.terminals.exit` | event | read | never | subscribable | Terminal exit | Emitted when a terminal session exits. |
| `xd.events.terminals.openLocalRequested` | event | read | never | subscribable | Open local terminal requested | Emitted when a configured local terminal profile should open. |
| `xd.events.terminals.openRemoteRequested` | event | read | never | subscribable | Open remote terminal requested | Emitted when a configured remote terminal profile should open. |
| `xd.events.transferQueue` | group | read | never | readable | Transfer queue events | Transfer queue state change events. |
| `xd.events.transferQueue.changed` | event | read | never | subscribable | Transfer queue changed | Emitted when transfer queue contents change. |
| `xd.events.updater` | group | read | never | readable | Updater events | Application updater events. |
| `xd.events.updater.statusChanged` | event | read | never | subscribable | Updater status changed | Emitted when updater status changes. |
| `xd.events.window` | group | read | never | readable | Window events | Window state events. |
| `xd.events.window.boundsChanged` | event | read | never | subscribable | Window bounds changed | Emitted when the focused window bounds change. |
| `xd.events.windowSizer` | group | read | never | readable | Window sizer events | Window sizer preset selection renderer events. |
| `xd.events.windowSizer.presetSelected` | event | read | never | subscribable | Window sizer preset selected | Emitted when a window sizer preset should be selected. |
| `xd.events.workflow` | group | read | never | readable | Workflow events | Workflow runner handoff and draft events. |
| `xd.events.workflow.draftHandoff` | event | read | never | subscribable | Workflow draft handoff | Emitted when a workflow draft is handed off to the workflow runner. |
| `xd.events.workspace` | group | read | never | readable | Workspace events | Workspace selection and navigation events. |
| `xd.events.workspace.changed` | event | read | never | subscribable | Workspace changed | Emitted when the active workspace path changes. |
| `xd.events.xapp` | group | read | never | readable | XApp events | XApp project, bundle, and README handoff events. |
| `xd.events.xapp.bundleReady` | event | read | never | subscribable | XApp bundle ready | Emitted when an XApp bundle is ready to open. |
| `xd.events.xapp.projectReady` | event | read | never | subscribable | XApp project ready | Emitted when an XApp project is ready to open. |
| `xd.events.xapp.projectRegistered` | event | read | never | subscribable | XApp project registered | Emitted when an XApp project registration changes. |
| `xd.events.xapp.readmeReady` | event | read | never | subscribable | XApp README ready | Emitted when an XApp README is ready to open. |
| `xd.events.services` | group | read | never | readable | Service events | Managed runtime service events. |
| `xd.events.services.xenesis` | group | read | never | readable | Xenesis events | Xenesis runtime gateway events. |
| `xd.events.services.xenesis.runEvent` | event | read | never | subscribable | Xenesis run event | Emitted while a Xenesis prompt run is progressing. |

### xd.explorer

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.explorer` | group | read | never | readable | Explorer | Explorer panes, navigation, and file-tree UI control surface. |
| `xd.explorer.local` | group | read | never | readable | Local explorer | Local file explorer sidebar visibility and navigation. |
| `xd.explorer.local.show` | method | control | never | callable | Show local explorer | Show the local file explorer sidebar. |
| `xd.explorer.local.hide` | method | control | never | callable | Hide local explorer | Hide the local file explorer sidebar. |
| `xd.explorer.local.toggle` | method | control | never | callable | Toggle local explorer | Toggle local file explorer sidebar visibility. |
| `xd.explorer.local.navigate` | method | control | never | callable, schema | Navigate local explorer | Open the local file explorer and navigate to a root path, optionally selecting a child path. |
| `xd.explorer.local.refresh` | method | control | never | callable | Refresh local explorer | Reload the current local explorer root. |
| `xd.explorer.local.goUp` | method | control | never | callable | Go to parent folder | Move the local explorer root to its parent folder. |
| `xd.explorer.local.setFilter` | method | control | never | callable, schema | Set local explorer filter | Filter the local explorer tree by file name, extension, or path text. |
| `xd.explorer.local.clearFilter` | method | control | never | callable | Clear local explorer filter | Clear the current local explorer filter. |
| `xd.explorer.local.selectPath` | method | control | never | callable, schema | Select local explorer path | Select a file or folder in the local explorer tree when it is visible or already loaded. |
| `xd.explorer.local.openSelected` | method | control | never | callable | Open selected local item | Open the currently selected local file, or enter the selected folder. Accepts an optional path to select first. |
| `xd.explorer.local.previewSelected` | method | control | never | callable | Preview selected local file | Open the explorer preview panel for the selected local file. |
| `xd.explorer.local.togglePreview` | method | control | never | callable | Toggle local explorer preview | Show or hide the local explorer preview panel. |
| `xd.explorer.local.toggleDetails` | method | control | never | callable | Toggle local explorer details | Show or hide the local explorer selection details panel. |
| `xd.explorer.local.sendSelectedToBot` | method | control | never | callable | Send selected local item to Agent | Send the selected local file or folder context to Xenesis Agent. |
| `xd.explorer.local.addSelectedToContext` | method | control | never | callable | Add selected local item to context | Add the selected local file or folder to the explorer context bundle. |
| `xd.explorer.local.copySelectedPath` | method | control | never | callable | Copy selected local path | Copy the selected local file or folder path to the clipboard. |
| `xd.explorer.local.addSelectedToFavorites` | method | write | when-external | callable | Add selected local item to favorites | Add the selected local file or folder to the Favorites side panel. |
| `xd.explorer.local.openSelectedInTerminal` | method | control | never | callable, schema | Open selected local item in terminal | Open the selected local file or folder location in a terminal. |
| `xd.explorer.local.openSelectedSafeEdit` | method | control | never | callable | Open selected local file in Safe Edit | Send the selected local file to the Safe File Edit Center. |
| `xd.explorer.local.openSelectedSyncPlanner` | method | control | never | callable | Open selected local item in Sync Planner | Send the selected local file or folder context to the Remote Sync Planner. |
| `xd.explorer.remote` | group | read | never | readable | Remote explorer | Remote file explorer side-panel visibility and navigation. |
| `xd.explorer.remote.show` | method | control | never | callable | Show remote explorer | Show the Favorites side panel and activate the remote-files tab. |
| `xd.explorer.remote.navigate` | method | control | never | callable, schema | Navigate remote explorer | Open the remote file explorer and navigate a configured profile to a remote path, optionally selecting a child path. |
| `xd.explorer.remote.refresh` | method | control | never | callable | Refresh remote explorer | Reload the current remote explorer path. |
| `xd.explorer.remote.goUp` | method | control | never | callable | Go to parent remote folder | Move the current remote explorer profile to its parent folder. |
| `xd.explorer.remote.setFilter` | method | control | never | callable, schema | Set remote explorer filter | Filter the remote file list by file name, extension, or path text. |
| `xd.explorer.remote.clearFilter` | method | control | never | callable | Clear remote explorer filter | Clear the current remote explorer filter. |
| `xd.explorer.remote.selectPath` | method | control | never | callable, schema | Select remote explorer path | Select a remote file or folder when it is visible or already loaded. |
| `xd.explorer.remote.openSelected` | method | control | never | callable | Open selected remote item | Open the selected remote file, or enter the selected remote folder. Accepts an optional path to select first. |
| `xd.explorer.remote.previewSelected` | method | control | never | callable | Preview selected remote file | Open the remote explorer preview panel for the selected remote file. |
| `xd.explorer.remote.togglePreview` | method | control | never | callable | Toggle remote explorer preview | Show or hide the remote explorer preview panel. |
| `xd.explorer.remote.toggleDetails` | method | control | never | callable | Toggle remote explorer details | Show or hide the remote explorer selection details panel. |
| `xd.explorer.remote.sendSelectedToBot` | method | control | never | callable | Send selected remote item to Agent | Send the selected remote file or folder context to Xenesis Agent. |
| `xd.explorer.remote.addSelectedToContext` | method | control | never | callable | Add selected remote item to context | Add the selected remote file or folder to the explorer context bundle. |
| `xd.explorer.remote.copySelectedPath` | method | control | never | callable | Copy selected remote path | Copy the selected remote file or folder path to the clipboard. |
| `xd.explorer.remote.openSelectedSyncPlanner` | method | control | never | callable | Open selected remote item in Sync Planner | Send the selected remote file or folder context to the Remote Sync Planner. |

### xd.extensions

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.extensions` | group | read | never | readable | Extensions | Extension command and panel control surface. |
| `xd.extensions.list` | method | read | never | callable | List extensions | List extension manifests, status, and contribution metadata. |
| `xd.extensions.reload` | method | control | never | callable | Reload extensions | Reload extension manifests and registered commands. |
| `xd.extensions.retry` | method | control | never | callable, schema | Retry extension | Retry loading one failed extension. |
| `xd.extensions.setEnabled` | method | control | never | callable, schema | Enable or disable extension | Update one extension enabled state. |
| `xd.extensions.listCommands` | method | read | never | callable | List extension commands | List registered extension commands. |
| `xd.extensions.runCommand` | method | control | never | callable, schema | Run extension command | Run a registered extension command. |

### xd.favorites

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.favorites` | group | read | never | readable | Favorites | Favorites, captures, and remote-files side panel controls. |
| `xd.favorites.list` | method | read | never | callable | List favorites | List current renderer favorites from the Favorites side panel. |
| `xd.favorites.add` | method | write | when-external | callable, schema | Add favorite | Add a file, folder, URL, or terminal path to Favorites. |
| `xd.favorites.addCurrentTab` | method | write | when-external | callable | Add current tab to favorites | Add the active file-backed tab to Favorites. |
| `xd.favorites.remove` | method | write | when-external | callable, schema | Remove favorite | Remove a favorite by id. |
| `xd.favorites.open` | method | control | never | callable, schema | Open favorite | Open a favorite by id using the same behavior as the Favorites pane. |
| `xd.favorites.openInTerminal` | method | control | never | callable, schema | Open favorite in terminal | Open a file or folder favorite path in a visible terminal. |
| `xd.favorites.copyPath` | method | control | never | callable, schema | Copy favorite path | Copy a favorite path or explicit path to the clipboard. |
| `xd.favorites.showTab` | method | control | never | callable, schema | Show side-panel tab | Switch the Favorites side panel between favorites, captures, and remote files. |

### xd.files

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.files` | group | read | never | readable | Files | Local file open, preview, and safe-write control surface. |
| `xd.files.open` | method | control | never | callable, schema | Open file | Request that Xenesis Desk opens a local file in a dock pane. |
| `xd.files.dialog` | group | read | never | readable | File dialogs | Native local file dialog operations. |
| `xd.files.dialog.open` | method | control | never | callable | Open local file dialog | Open a native file dialog and read the selected file into Xenesis Desk. |
| `xd.files.read` | method | read | never | callable, schema | Read local file | Read a local file into the same structured payload used by Xenesis Desk file viewers. |
| `xd.files.saveText` | method | write | when-external | callable, schema | Save text file | Write UTF-8 text to an existing local path. |
| `xd.files.saveTextAs` | method | write | when-external | callable | Save text file as | Open a native save dialog and write UTF-8 text to the selected path. |
| `xd.files.revealPath` | method | control | never | callable, schema | Reveal path | Reveal a local file or directory in the operating system file manager. |
| `xd.files.openExternal` | method | control | never | callable, schema | Open external URL | Open an external HTTP, HTTPS, or mailto URL with the operating system. |
| `xd.files.previewTextWrite` | method | write | when-external | callable, schema | Preview text write | Preview a safe UTF-8 text file write without changing disk. |
| `xd.files.applyTextWrite` | method | write | when-external | callable, schema | Apply text write | Apply a safe UTF-8 text file write with backup metadata. |
| `xd.files.restoreTextBackup` | method | write | when-external | callable, schema | Restore text backup | Restore a safe text write from a backup artifact. |
| `xd.files.listOpen` | method | read | never | callable | List open files | List files currently known to the Xenesis Desk bridge and renderer. |

### xd.fs

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.fs` | group | read | never | readable | File system | Directory listing and base64 file transfer primitives. |
| `xd.fs.listDir` | method | read | never | callable | List directory | List local directory entries. |
| `xd.fs.selectDir` | method | control | never | callable | Select directory | Open a native directory picker. |
| `xd.fs.readFileBase64` | method | read | never | callable | Read file as base64 | Read a local file as a base64 payload for transfer. |
| `xd.fs.writeFileBase64` | method | write | when-external | callable | Write base64 file | Write a base64 payload to a local file path. |

### xd.gowoori

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.gowoori.artifact` | group | read | never | readable | Gowoori Artifact | Rendered Gowoori artifact inspection and visual acceptance helpers. |
| `xd.gowoori.artifact.visibility` | method | control | never | callable, schema | Inspect artifact visibility | Find expected rich components in a rendered Gowoori artifact, optionally reveal them, and return viewport visibility metrics. |
| `xd.gowoori` | group | read | never | readable | Gowoori | Gowoori artifact viewer and GowooriChat generation control surface. |
| `xd.gowoori.chat` | group | read | never | readable | GowooriChat | GowooriChat request lifecycle and cancellation. |
| `xd.gowoori.chat.run` | method | execute | when-external | callable, schema | Run GowooriChat | Ask GowooriChat to generate, repair, continue, or explain an artifact. |
| `xd.gowoori.chat.cancel` | method | control | never | callable, schema | Cancel GowooriChat | Cancel a pending GowooriChat generation request. |
| `xd.gowoori.overlay` | group | read | never | readable | Gowoori Overlay | Desk-wide translucent overlay for rendered Gowoori artifacts. |
| `xd.gowoori.overlay.show` | method | control | never | callable, schema | Show overlay | Render Markdown/XCON content as a top-level translucent Gowoori overlay over the whole Desk. |
| `xd.gowoori.overlay.hide` | method | control | never | callable, schema | Hide overlay | Hide the active Gowoori overlay, optionally matching a specific overlay id. |
| `xd.gowoori.overlay.status` | method | read | never | callable, schema | Read overlay status | Read whether a Gowoori overlay is visible and return its metadata. |

### xd.layout

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.layout` | group | read | never | readable | Layout | Saved dock layout commands and app-level layout reset operations. |
| `xd.layout.save` | method | write | when-external | callable | Save layout | Save the current Xenesis Desk dock layout. |
| `xd.layout.restore` | method | control | never | callable | Restore layout | Restore the saved Xenesis Desk dock layout. |
| `xd.layout.reset` | method | control | never | callable | Reset layout | Reset the Xenesis Desk dock layout to defaults. |

### xd.localCli

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.localCli` | group | read | never | readable | Local CLI agents | Local Codex, Claude, Cursor, and related CLI agent discovery. |
| `xd.localCli.scan` | method | read | never | callable | Scan local CLI agents | Scan installed local CLI agents and version metadata. |

### xd.mcp

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.mcp` | group | read | never | readable | MCP bridge | MCP bridge status, action inbox, and Bot session state. |
| `xd.mcp.settings` | group | read | never | readable | MCP settings | MCP settings availability and endpoint status. |
| `xd.mcp.settings.status` | method | read | never | callable | Read MCP settings status | Read MCP configuration and status metadata. |
| `xd.mcp.bridge` | group | read | never | readable | MCP bridge status | Live MCP bridge runtime status. |
| `xd.mcp.bridge.status` | method | read | never | callable | Read MCP bridge status | Read the live MCP bridge status snapshot. |
| `xd.mcp.actionInbox` | group | read | never | readable | Action inbox | MCP action inbox inventory and approval resolution. |
| `xd.mcp.actionInbox.list` | method | read | never | callable | List action inbox | List pending MCP bridge action inbox items. |
| `xd.mcp.actionInbox.request` | method | write | when-external | callable, schema | Request action inbox item | Record one MCP bridge action inbox request for user review or approval. |
| `xd.mcp.actionInbox.resolve` | method | control | never | callable | Resolve action inbox item | Resolve one MCP bridge action inbox item. |
| `xd.mcp.botSessions` | group | read | never | readable | Bot sessions | MCP Bot session state snapshots. Bot session snapshots are persisted in the MCP bridge directory as bot-sessions.json. |
| `xd.mcp.botSessions.list` | method | read | never | callable | List Bot sessions | List known MCP Bot session snapshots. |
| `xd.mcp.botSessions.save` | method | write | when-external | callable, schema | Save Bot session | Save one channel-aware MCP Bot session snapshot. |

### xd.meta

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.meta` | group | read | never | readable | Meta Management | Hierarchical metadata (CMDB) tree, code CRUD, attributes, instances, snapshots, and relations. |
| `xd.meta.tree` | group | read | never | readable | Tree | Meta tree navigation. |
| `xd.meta.tree.load` | method | read | never | callable | Load tree | Load the full meta code tree. |
| `xd.meta.tree.search` | method | read | never | callable, schema | Search tree | Search tree nodes by CODE or NAME. |
| `xd.meta.codes` | group | read | never | readable | Codes | Meta code CRUD operations. |
| `xd.meta.codes.list` | method | read | never | callable, schema | List codes | List codes by PID, TYPE, or CODE filter. |
| `xd.meta.codes.create` | method | write | when-external | callable | Create code | Create a new meta code entry. |
| `xd.meta.codes.update` | method | write | when-external | callable | Update code | Update an existing meta code entry. |
| `xd.meta.codes.batch` | method | write | when-external | callable | Batch codes | Batch insert or update multiple code entries. |
| `xd.meta.attributes` | group | read | never | readable | Attributes | Meta attribute definitions. |
| `xd.meta.attributes.list` | method | read | never | callable | List attributes | List attribute definitions for the current node. |
| `xd.meta.attributes.schema` | method | read | never | callable | Schema | Convert attributes to form field schema with auto-inferred input types. |
| `xd.meta.instances` | group | read | never | readable | Instances | Meta instance data. |
| `xd.meta.instances.list` | method | read | never | callable | List instances | List instance data for the selected node. |
| `xd.meta.instances.toFixture` | method | read | never | callable, schema | To fixture | Convert instances to XCON fixture JSON for data binding. |
| `xd.meta.query` | group | read | never | readable | Query | Direct SQL query execution. |
| `xd.meta.query.run` | method | execute | when-external | callable, schema | Run query | Execute a SQL query against the meta database. |
| `xd.meta.snapshot` | group | read | never | readable | Snapshot | Meta snapshot import and export. |
| `xd.meta.snapshot.export` | method | read | never | callable | Export snapshot | Export the selected node as an XMDB assist JSON snapshot. |
| `xd.meta.snapshot.import` | method | write | when-external | callable | Import snapshot | Import an XMDB assist JSON snapshot into the selected node. |
| `xd.meta.relations` | group | read | never | readable | Relations | Meta relation graph. |
| `xd.meta.relations.graph` | method | read | never | callable | Relation graph | Build the parent/template/attribute/instance relation graph. |

### xd.panels

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.panels` | group | read | never | readable | Panels | Extension panel and renderer panel inventory. |
| `xd.panels.list` | method | read | never | callable | List panels | List panels currently known to the Xenesis Desk bridge and renderer. |

### xd.panes

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.panes` | group | read | never | readable | Built-in panes | Built-in non-extension panes opened by renderer commands. |
| `xd.panes.browser` | group | read | never | readable | Browser pane | Browser pane operations. |
| `xd.panes.browser.open` | method | control | never | callable | Open browser pane | Open a new Xenesis Desk browser pane. |
| `xd.panes.browser.navigate` | method | control | never | callable, schema | Navigate browser pane | Navigate an existing Xenesis Desk browser pane. |
| `xd.panes.browser.back` | method | control | never | callable | Go back in browser pane | Navigate an existing Desk browser pane backward. |
| `xd.panes.browser.forward` | method | control | never | callable | Go forward in browser pane | Navigate an existing Desk browser pane forward. |
| `xd.panes.browser.reload` | method | control | never | callable | Reload browser pane | Reload an existing Desk browser pane. |
| `xd.panes.browser.stop` | method | control | never | callable | Stop browser pane load | Stop loading an existing Desk browser pane. |
| `xd.panes.browser.state` | method | read | never | callable | Read browser pane state | Read navigation state from an existing Desk browser pane. |
| `xd.panes.browser.textSnapshot` | method | read | never | callable, schema | Read browser text snapshot | Read visible text, links, and form controls from an existing Desk browser pane. |
| `xd.panes.browser.domSnapshot` | method | read | never | callable, schema | Read browser DOM snapshot | Read a bounded DOM structure summary from an existing Desk browser pane. |
| `xd.panes.browser.elementAction` | method | control | never | callable, schema | Run browser element action | Run a bounded click, fill, select, or key press against a visible Desk browser pane. Prefer this over xd.automation.ui.run for simple visible Desk browser form fill, click, select, and press actions. |
| `xd.panes.commandCenter` | group | read | never | readable | Command Center pane | Command Center creation and restore. |
| `xd.panes.commandCenter.open` | method | control | never | callable | Open Command Center | Open or restore the Command Center in the bottom dock. |
| `xd.panes.diagnostics` | group | read | never | readable | Diagnostics pane | Diagnostics pane creation. |
| `xd.panes.diagnostics.open` | method | control | never | callable | Open diagnostics pane | Open the diagnostics center pane. |
| `xd.panes.onboarding` | group | read | never | readable | Onboarding pane | Onboarding pane creation. |
| `xd.panes.onboarding.open` | method | control | never | callable | Open onboarding pane | Open the onboarding/start pane. |
| `xd.panes.onboarding.sample` | group | read | never | readable | Sample workspace | Interactive onboarding sample workspace operations. |
| `xd.panes.onboarding.sample.status` | method | read | never | callable | Read sample workspace status | Read whether the onboarding sample workspace exists and is complete. |
| `xd.panes.onboarding.sample.prepare` | method | write | when-external | callable | Prepare sample workspace | Create or repair the onboarding sample workspace under XENIS_HOME. |
| `xd.panes.onboarding.sample.reset` | method | write | when-external | callable | Reset sample workspace | Reset only the generated onboarding sample workspace under XENIS_HOME. |
| `xd.panes.onboarding.step` | group | read | never | readable | Onboarding step runner | Run and verify Basic Desk onboarding steps through the renderer. |
| `xd.panes.onboarding.step.run` | method | control | never | callable, schema | Run onboarding step | Run the action sequence for a Basic Desk onboarding step and return the renderer result. |
| `xd.panes.onboarding.step.verify` | method | read | never | callable, schema | Verify onboarding step | Verify a Basic Desk onboarding step against the current renderer state and return the result. |
| `xd.panes.onboarding.scenario` | group | read | never | readable | Onboarding scenario runner | Run complete onboarding tracks through the renderer. |
| `xd.panes.onboarding.scenario.run` | method | control | never | callable, schema | Run Basic Desk onboarding scenario | Run the complete Basic Desk onboarding track and return per-step progress results. |
| `xd.panes.onboarding.scenario.runs` | group | read | never | readable | Onboarding scenario run artifacts | List, open, and clear saved onboarding scenario run artifacts. |
| `xd.panes.onboarding.scenario.runs.list` | method | read | never | callable | List onboarding scenario runs | List saved onboarding scenario run artifacts. |
| `xd.panes.onboarding.scenario.runs.preview` | method | control | never | callable, schema | Preview onboarding scenario run | Open the onboarding pane, select a saved run, and scroll the in-Desk run preview into view. |
| `xd.panes.onboarding.scenario.runs.open` | method | control | never | callable, schema | Open onboarding scenario run | Open the latest or selected onboarding scenario run artifact folder. |
| `xd.panes.onboarding.scenario.runs.clear` | method | write | when-external | callable | Clear onboarding scenario runs | Clear saved onboarding scenario run artifacts. |
| `xd.panes.onboarding.demoRoute` | group | read | never | readable | Onboarding demo route | Generate and open Demo Route artifacts from saved onboarding scenario results. |
| `xd.panes.onboarding.demoRoute.save` | method | write | when-external | callable, schema | Save onboarding Demo Route | Persist CR Demo Route JSON, storyboard Markdown, and Demo Lab preset from a scenario run result. |
| `xd.panes.onboarding.demoMode` | group | read | never | readable | Onboarding Demo Mode UI | Drive and verify the visible onboarding Demo Mode experience inside the renderer. |
| `xd.panes.onboarding.demoMode.run` | method | control | never | callable, schema | Run onboarding Demo Mode UI flow | Open the onboarding pane, switch to Demo Mode, run the Basic Desk demo flow, verify the rendered Demo Route panel, and optionally open the Demo Lab Player. |
| `xd.panes.settings` | group | read | never | readable | Settings pane | Settings pane creation. |
| `xd.panes.settings.open` | method | control | never | callable, schema | Open settings pane | Open the Xenesis Desk settings pane. |

### xd.playwright

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.playwright` | group | read | never | readable | Playwright | Browser automation and screenshot support. |
| `xd.playwright.snapshot` | method | execute | when-external | callable, schema | Capture URL screenshot | Capture a screenshot from a URL using Playwright. |
| `xd.playwright.run` | method | execute | when-external | callable, schema | Run browser actions | Run a Playwright browser session with ordered actions. |

### xd.processes

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.processes` | group | read | never | readable | Processes | Local process inventory and termination surface. |
| `xd.processes.list` | method | read | never | callable | List processes | List local OS processes visible to Xenesis Desk. |
| `xd.processes.kill` | method | danger | when-external | callable, schema | Kill process | Terminate a local process by pid. |

### xd.remoteFiles

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.remoteFiles` | group | read | never | readable | Remote files | FTP, FTPS, and SFTP profile-backed remote file operations. |
| `xd.remoteFiles.test` | method | read | never | callable | Test remote profile | Test connectivity for a remote file profile. |
| `xd.remoteFiles.list` | method | read | never | callable | List remote directory | List entries in a remote directory. |
| `xd.remoteFiles.read` | method | read | never | callable | Read remote file | Read a remote file into the local viewer payload format. |
| `xd.remoteFiles.readBase64` | method | read | never | callable | Read remote file as base64 | Read a remote file as a base64 transfer payload. |
| `xd.remoteFiles.write` | method | write | when-external | callable | Write remote file | Write a base64 transfer payload to a remote path. |
| `xd.remoteFiles.mkdir` | method | write | when-external | callable | Create remote directory | Create a remote directory. |
| `xd.remoteFiles.delete` | method | danger | when-external | callable | Delete remote file | Delete a remote file or directory. |
| `xd.remoteFiles.rename` | method | write | when-external | callable | Rename remote file | Rename or move a remote file or directory. |

### xd.secrets

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.secrets` | group | read | never | readable | Secret vault | Secret vault status and reset operations. |
| `xd.secrets.status` | method | read | never | callable | Read secret vault status | Read secret vault availability and configured storage mode. |
| `xd.secrets.clear` | method | danger | when-external | callable | Clear secret vault | Clear stored secret values from the Xenesis Desk secret vault. |

### xd.services

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.services` | group | read | never | readable | Runtime services | Managed local runtime services used by Xenesis Desk. |
| `xd.services.internalServer` | group | read | never | readable | Internal server | Bundled SQLite and API server lifecycle. |
| `xd.services.internalServer.status` | method | read | never | callable | Read internal server status | Read the bundled internal server process and port status. |
| `xd.services.internalServer.start` | method | control | never | callable | Start internal server | Start the bundled internal server process. |
| `xd.services.internalServer.stop` | method | control | never | callable | Stop internal server | Stop the bundled internal server process. |
| `xd.services.xenesis` | group | read | never | readable | Xenesis gateway | Xenesis gateway sidecar lifecycle and prompt execution. |
| `xd.services.xenesis.status` | method | read | never | callable | Read Xenesis status | Read Xenesis runtime and gateway status. |
| `xd.services.xenesis.diagnostics` | method | read | never | callable | Read Xenesis diagnostics | Read Xenesis operational diagnostics, recent reports, tasks, and policy notices. |
| `xd.services.xenesis.reports` | method | read | never | callable | List Xenesis reports | List recent Xenesis runtime and verification reports. |
| `xd.services.xenesis.tasks` | method | read | never | callable | List Xenesis tasks | List recent Xenesis agent tasks and their state. |
| `xd.services.xenesis.setWorkspace` | method | control | never | callable, schema | Set Xenesis workspace | Set the active workspace used by the Xenesis runtime gateway. |
| `xd.services.xenesis.start` | method | control | never | callable | Start Xenesis | Start the Xenesis runtime gateway. |
| `xd.services.xenesis.stop` | method | control | never | callable | Stop Xenesis | Stop the Xenesis runtime gateway. |
| `xd.services.xenesis.restart` | method | control | never | callable | Restart Xenesis | Restart the Xenesis runtime gateway. |
| `xd.services.xenesis.cancel` | method | control | never | callable | Cancel Xenesis run | Cancel the active Xenesis runtime request. |
| `xd.services.xenesis.resetSession` | method | control | never | callable | Reset Xenesis session | Clear the active Xenesis conversation/session state. |
| `xd.services.xenesis.run` | method | execute | when-external | callable, schema | Run Xenesis prompt | Run a prompt through the Xenesis runtime gateway. |

### xd.settings

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.settings` | group | read | never | readable | Settings | Application settings, provider profiles, and user preferences. |
| `xd.settings.read` | method | read | never | callable | Read settings | Read the current Xenesis Desk settings with secrets protected. |
| `xd.settings.save` | method | write | when-external | callable, schema | Save settings | Persist a partial Xenesis Desk settings patch. |
| `xd.settings.export` | method | write | when-external | callable | Export settings | Open a save dialog and export Xenesis Desk settings backup JSON. |
| `xd.settings.import` | method | write | when-external | callable | Import settings | Open a file dialog and import an Xenesis Desk settings backup JSON. |
| `xd.settings.sections` | collection | read | never | readable | Settings sections | Visible settings pane sections and their functional surfaces. |
| `xd.settings.sections.general` | collection | read | never | readable | General | General Xenesis Desk preferences and account-visible settings. |
| `xd.settings.sections.xenesis-agent` | collection | read | never | readable | Xenesis Agent | Native Xenesis Agent, gateway, external bot channel, and Gowoori tool settings. |
| `xd.settings.sections.run-model` | collection | read | never | readable | AI Provider | AI provider profiles, Hermes plugin settings, and local CLI agent settings. |
| `xd.settings.sections.interface` | collection | read | never | readable | Interface | Interface settings, window sizing, theme, language, and keyboard shortcut entry points. |
| `xd.settings.sections.info` | collection | read | never | readable | Info | Basic application information, general preferences, media, connector, and MCP entry points. |
| `xd.settings.sections.language` | collection | read | never | readable | Language | Locale and language preferences. |
| `xd.settings.sections.appearance` | collection | read | never | readable | Appearance | Theme, font, and visual preferences. |
| `xd.settings.sections.automation` | collection | read | never | readable | Automation | Terminal automation and controller settings. |
| `xd.settings.sections.keyboard-shortcuts` | collection | read | never | readable | Keyboard shortcuts | Keyboard shortcut bindings for command palette commands. |
| `xd.settings.sections.workspace` | collection | read | never | readable | Workspace | Workspace profile and recent workspace settings. |
| `xd.settings.sections.settings-backup` | collection | read | never | readable | Settings backup | Settings export, import, and backup restore surface. |
| `xd.settings.sections.remote-terminals` | collection | read | never | readable | Remote terminals | Local, SSH, and Telnet terminal profile settings. |
| `xd.settings.sections.remote-files` | collection | read | never | readable | Remote files | SFTP, FTP, and FTPS remote file profile settings. |
| `xd.settings.sections.window-sizer` | collection | read | never | readable | Window sizer | Window size preset settings. |
| `xd.settings.sections.extensions` | collection | read | never | readable | Extensions | Extension inventory and extension-specific settings. |
| `xd.settings.sections.secret-vault` | collection | read | never | readable | Secret vault | Secret vault status and clearing surface. |
| `xd.settings.sections.about` | collection | read | never | readable | About | About, update, and build metadata surface. |
| `xd.settings.backups` | group | read | never | readable | Settings backups | Stored settings backup inventory and restore operations. |
| `xd.settings.backups.list` | method | read | never | callable | List settings backups | List saved Xenesis Desk settings backup files. |
| `xd.settings.backups.restore` | method | write | when-external | callable, schema | Restore settings backup | Restore a saved Xenesis Desk settings backup file. |

### xd.terminals

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.terminals` | group | read | never | readable | Terminals | Terminal session lifecycle and output inspection. |
| `xd.terminals.list` | method | read | never | callable | List terminals | List terminal sessions known to Xenesis Desk. |
| `xd.terminals.shells` | group | read | never | readable | Shells | Available local terminal shell descriptors. |
| `xd.terminals.shells.list` | method | read | never | callable | List terminal shells | List local shells available to Xenesis Desk terminals. |
| `xd.terminals.openDefault` | method | control | never | callable | Open default terminal | Open a new terminal pane using the configured default shell. |
| `xd.terminals.openPowerShell` | method | control | never | callable | Open Windows PowerShell terminal | Open a new Windows PowerShell terminal pane. |
| `xd.terminals.openCmd` | method | control | never | callable | Open cmd terminal | Open a new cmd terminal pane. |
| `xd.terminals.openPwsh` | method | control | never | callable | Open PowerShell 7 terminal | Open a new PowerShell 7 terminal pane. |
| `xd.terminals.openWsl` | method | control | never | callable | Open WSL terminal | Open a new WSL terminal pane. |
| `xd.terminals.preview` | method | read | never | callable, schema | Preview terminal command | Preview a terminal command without starting a terminal session. |
| `xd.terminals.spawn` | method | execute | when-external | callable | Spawn terminal session | Spawn a low-level Xenesis Desk terminal session. |
| `xd.terminals.run` | method | execute | when-external | callable, schema | Run terminal command | Request a visible Xenesis Desk terminal command. |
| `xd.terminals.runMany` | method | execute | when-external | callable, schema | Run many terminal commands | Open multiple visible terminal sessions for dock arrangement and stress testing. |
| `xd.terminals.write` | method | execute | when-external | callable | Write terminal input | Write input data to a terminal session. |
| `xd.terminals.image` | group | read | never | readable | Terminal inline image | Render PNG, JPEG, and GIF images directly inside terminal panes using iTerm IIP protocol. |
| `xd.terminals.image.show` | method | execute | when-external | callable, schema | Show inline image | Display an image inline in a terminal from a file path or URL. |
| `xd.terminals.image.showBase64` | method | execute | when-external | callable, schema | Show inline image from base64 | Display an image inline in a terminal from base64-encoded data. |
| `xd.terminals.image.showXcon` | method | execute | when-external | callable, schema | Show XCON as inline image | Render XCON/SKETCH markup to a PNG and display it inline in a terminal. |
| `xd.terminals.resize` | method | control | never | callable | Resize terminal session | Resize a terminal backend. |
| `xd.terminals.kill` | method | control | never | callable | Kill terminal session | Kill a terminal backend and remove its session. |
| `xd.terminals.adopt` | method | control | never | callable | Adopt terminal session | Read scrollback for a terminal session during window handoff. |
| `xd.terminals.ui` | group | read | never | readable | Terminal UI actions | Control visible terminal pane interactions for the active or specified terminal. |
| `xd.terminals.ui.copy` | method | control | never | callable | Copy terminal selection | Copy the current selection from a visible terminal. |
| `xd.terminals.ui.paste` | method | control | never | callable | Paste into terminal | Paste clipboard text into a visible terminal. |
| `xd.terminals.ui.selectAll` | method | control | never | callable | Select all terminal text | Select all visible terminal buffer text. |
| `xd.terminals.ui.clearScreen` | method | control | never | callable | Clear terminal screen | Clear the visible terminal screen. |
| `xd.terminals.ui.clearScrollback` | method | control | never | callable | Clear terminal scrollback | Clear terminal scrollback history. |
| `xd.terminals.ui.scrollTop` | method | control | never | callable | Scroll terminal to top | Scroll a visible terminal to the top of the scrollback buffer. |
| `xd.terminals.ui.scrollBottom` | method | control | never | callable | Scroll terminal to bottom | Scroll a visible terminal to the bottom of the scrollback buffer. |
| `xd.terminals.ui.setFitLock` | method | control | never | callable, schema | Set terminal fit lock | Enable or disable terminal fit lock for a visible terminal. |
| `xd.terminals.ui.toggleFitLock` | method | control | never | callable | Toggle terminal fit lock | Toggle terminal fit lock for a visible terminal. |
| `xd.terminals.ui.findNext` | method | control | never | callable, schema | Find next terminal match | Find the next occurrence of a query in a visible terminal. |
| `xd.terminals.ui.findPrev` | method | control | never | callable, schema | Find previous terminal match | Find the previous occurrence of a query in a visible terminal. |
| `xd.terminals.ui.saveLog` | method | write | when-external | callable | Save terminal log | Save the visible terminal buffer through the standard terminal log flow. |
| `xd.terminals.ui.sendSelectionToBot` | method | control | never | callable | Send terminal selection to Agent | Send the selected terminal text to Xenesis Agent as context. |
| `xd.terminals.ui.sendRecentOutputToBot` | method | control | never | callable | Send recent terminal output to Agent | Send recent terminal output to Xenesis Agent as context. |
| `xd.terminals.dialog` | group | read | never | readable | Terminal dialogs | Terminal working-directory and log-save dialogs. |
| `xd.terminals.dialog.selectCwd` | method | control | never | callable | Select terminal working directory | Open a native folder picker for a terminal working directory. |
| `xd.terminals.dialog.saveLog` | method | write | when-external | callable | Save terminal log | Open a native save dialog and write terminal log text. |
| `xd.terminals.tail` | method | read | never | callable, schema | Tail terminal output | Read recent output from a known Xenesis Desk terminal session. |
| `xd.terminals.stop` | method | control | never | callable, schema | Stop terminal session | Stop a known Xenesis Desk terminal session. |
| `xd.terminals.sessions` | collection | read | never | readable | Terminal sessions | Runtime terminal session instances materialized from xd.terminals.list. |
| `xd.terminals.sessions.{termId}` | collection | read | never | readable | Terminal {termId} | Runtime terminal session instance. |
| `xd.terminals.sessions.{termId}.id` | property | read | never | readable | Terminal id | Runtime terminal session id property. |
| `xd.terminals.sessions.{termId}.kind` | property | read | never | readable | Terminal kind | Runtime terminal session kind property. |
| `xd.terminals.sessions.{termId}.label` | property | read | never | readable | Terminal label | Runtime terminal session label property. |
| `xd.terminals.sessions.{termId}.title` | property | read | never | readable | Terminal title | Runtime terminal session title property. |
| `xd.terminals.sessions.{termId}.detail` | property | read | never | readable | Terminal detail | Runtime terminal session detail property. |
| `xd.terminals.sessions.{termId}.cwd` | property | read | never | readable | Terminal cwd | Runtime terminal session cwd property. |
| `xd.terminals.sessions.{termId}.hostname` | property | read | never | readable | Terminal hostname | Runtime terminal session hostname property. |
| `xd.terminals.sessions.{termId}.host` | property | read | never | readable | Terminal host | Runtime terminal session host property. |
| `xd.terminals.sessions.{termId}.shell` | property | read | never | readable | Terminal shell | Runtime terminal session shell property. |
| `xd.terminals.sessions.{termId}.command` | property | read | never | readable | Terminal command | Runtime terminal session command property. |
| `xd.terminals.sessions.{termId}.pid` | property | read | never | readable | Terminal pid | Runtime terminal session pid property. |
| `xd.terminals.sessions.{termId}.ownerWindowId` | property | read | never | readable | Terminal ownerWindowId | Runtime terminal session ownerWindowId property. |
| `xd.terminals.sessions.{termId}.mcpCommand` | property | read | never | readable | Terminal mcpCommand | Runtime terminal session mcpCommand property. |
| `xd.terminals.sessions.{termId}.scrollbackBytes` | property | read | never | readable | Terminal scrollbackBytes | Runtime terminal session scrollbackBytes property. |
| `xd.terminals.sessions.{termId}.active` | property | read | never | readable | Terminal active | Runtime terminal session active property. |
| `xd.terminals.sessions.{termId}.fitLocked` | property | read | never | readable | Terminal fitLocked | Runtime terminal session fitLocked property. |
| `xd.terminals.sessions.{termId}.isAltBuffer` | property | read | never | readable | Terminal isAltBuffer | Runtime terminal session isAltBuffer property. |
| `xd.terminals.sessions.{termId}.imageAddonLoaded` | property | read | never | readable | Terminal imageAddonLoaded | Runtime terminal session imageAddonLoaded property. |
| `xd.terminals.sessions.{termId}.imageAddonUnavailableReason` | property | read | never | readable | Terminal imageAddonUnavailableReason | Runtime terminal session imageAddonUnavailableReason property. |
| `xd.terminals.sessions.{termId}.lastSentCommand` | property | read | never | readable | Terminal lastSentCommand | Runtime terminal session lastSentCommand property. |
| `xd.terminals.sessions.{termId}.groupId` | property | read | never | readable | Terminal groupId | Runtime terminal session groupId property. |
| `xd.terminals.sessions.{termId}.groupName` | property | read | never | readable | Terminal groupName | Runtime terminal session groupName property. |
| `xd.terminals.sessions.{termId}.status` | property | read | never | readable | Terminal status | Runtime terminal session status property. |
| `xd.terminals.sessions.{termId}.connectionStatus` | property | read | never | readable | Terminal connectionStatus | Runtime terminal session connectionStatus property. |
| `xd.terminals.sessions.{termId}.tail` | method | read | never | readable, callable | Terminal tail | Runtime terminal session tail operation. |
| `xd.terminals.sessions.{termId}.write` | method | execute | when-external | callable | Terminal write | Runtime terminal session write operation. |
| `xd.terminals.sessions.{termId}.resize` | method | control | never | callable | Terminal resize | Runtime terminal session resize operation. |
| `xd.terminals.sessions.{termId}.stop` | method | control | never | callable | Terminal stop | Runtime terminal session stop operation. |
| `xd.terminals.sessions.{termId}.kill` | method | control | never | callable | Terminal kill | Runtime terminal session kill operation. |

### xd.testing

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.testing` | group | read | never | readable | Testing | Development-only testing helpers for Xenesis Desk CR and smoke workflows. |
| `xd.testing.xenesisAgent` | group | read | never | readable | Xenesis Agent testing | Development-only helpers for driving the live Xenesis Agent pane in CR tests. |
| `xd.testing.xenesisAgent.snapshot` | method | read | never | callable, schema | Snapshot Xenesis Agent pane | Read the visible development Xenesis Agent transcript state so smoke runners can report live progress while a provider request is still active. |
| `xd.testing.xenesisAgent.submitPrompt` | method | execute | never | callable, schema | Submit Xenesis Agent prompt | Set the live development Xenesis Agent prompt input, submit it, and optionally wait for rendered text. |
| `xd.testing.xenesisAgent.dropAttachments` | method | execute | never | callable, schema | Drop Xenesis Agent attachments | Dispatch real drag/drop attachment events into the live development Xenesis Agent pane and wait for attachment chips. |
| `xd.testing.connectionCenter` | group | read | never | readable | Connection Center testing | Development-only helpers for reading the live Connection Center renderer state in CR smoke workflows. |
| `xd.testing.connectionCenter.snapshot` | method | read | never | callable, schema | Snapshot Connection Center | Read the current live Settings > Xenesis Agent > Connections renderer state for smoke verification. |
| `xd.testing.gowooriChat` | group | read | never | readable | GowooriChat testing | Development-only helpers for driving the live GowooriChat pane in CR tests. |
| `xd.testing.gowooriChat.submitPrompt` | method | execute | never | callable, schema | Submit GowooriChat prompt | Type into the live development GowooriChat textarea, submit it, and optionally wait for rendered text. |

### xd.tools

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.tools` | group | read | never | readable | Tools | First-class Xenesis Desk tool panels opened through the extension host. |
| `xd.tools.open` | method | control | never | callable, schema | Open tool by id | Open a known Xenesis Desk tool panel by ExtensionTool id. |
| `xd.tools.core` | group | read | never | readable | Core tools | Built-in operational, AI, preview, and Hermes core tool panels. |
| `xd.tools.core.bot.open` | method | control | never | callable | Open Xenesis Bot | Open the Xenesis Bot tool panel. |
| `xd.tools.core.aiWorkbench.open` | method | control | never | callable | Open AI Workbench | Open the AI Workbench tool panel. |
| `xd.tools.core.artifactLibrary.open` | method | control | never | callable | Open Artifact Library | Open the Artifact Library tool panel. |
| `xd.tools.core.terminalInspector.open` | method | control | never | callable | Open Terminal Inspector | Open the Terminal Inspector tool panel. |
| `xd.tools.core.processViewer.open` | method | control | never | callable | Open Process Viewer | Open the Process Viewer tool panel. |
| `xd.tools.core.remoteSyncPlanner.open` | method | control | never | callable | Open Remote Sync Planner | Open the Remote Sync Planner tool panel. |
| `xd.tools.core.runTaskPanel.open` | method | control | never | callable | Open Run Task Panel | Open the Run Task Panel tool panel. |
| `xd.tools.core.safeFileEditCenter.open` | method | control | never | callable | Open Safe File Edit Center | Open the Safe File Edit Center tool panel. |
| `xd.tools.core.xenesisAgent.open` | method | control | never | callable | Open Xenesis Agent | Open the Xenesis Agent tool panel. |
| `xd.tools.core.hermesStatus.open` | method | control | never | callable | Open Hermes Status | Open the Hermes Status tool panel. |
| `xd.tools.core.hermesActionInbox.open` | method | control | never | callable | Open Hermes Action Inbox | Open the Hermes Action Inbox tool panel. |
| `xd.tools.core.capabilityExplorer.open` | method | control | never | callable | Open Capability Explorer | Open the Capability Explorer tool panel. |
| `xd.tools.core.hermesTimeline.open` | method | control | never | callable | Open Hermes Timeline | Open the Hermes Timeline tool panel. |
| `xd.tools.core.hermesStashOps.open` | method | control | never | callable | Open Hermes Stash Ops | Open the Hermes Stash Ops tool panel. |
| `xd.tools.core.xappPreview.open` | method | control | never | callable | Open XApp Preview | Open the XApp Preview tool panel. |
| `xd.tools.core.activityTimeline.open` | method | control | never | callable | Open Activity Timeline | Open the Activity Timeline panel. |
| `xd.tools.core.networkMonitor.open` | method | control | never | callable | Open Network Monitor | Open the Network Monitor panel. |
| `xd.tools.core.xdBlaster.open` | method | control | never | callable | Open XD Blaster | Open the XD Blaster panel. |
| `xd.tools.core.auditLog.open` | method | control | never | callable | Open Audit Log | Open the Audit Log panel. |
| `xd.tools.core.agentPerformance.open` | method | control | never | callable | Open Agent Performance | Open the Agent Performance panel. |
| `xd.tools.data` | group | read | never | readable | Data tools | Built-in metadata, query, and SQLite data tool panels. |
| `xd.tools.data.metaManagement.open` | method | control | never | callable | Open Meta Management | Open the Meta Management tool panel. |
| `xd.tools.data.queryAnalyzer.open` | method | control | never | callable | Open Query Analyzer | Open the Query Analyzer tool panel. |
| `xd.tools.data.queryAnalyzerOd.open` | method | control | never | callable | Open Query Analyzer OD | Open the OD Query Analyzer tool panel. |
| `xd.tools.data.sqliteServerSettings.open` | method | control | never | callable | Open SQLite Server Settings | Open the SQLite Server Settings tool panel. |
| `xd.tools.workflow` | group | read | never | readable | Workflow tools | Built-in workflow runner, Demo Lab, Gowoori, and GowooriChat panels. |
| `xd.tools.workflow.runner.open` | method | control | never | callable | Open Workflow Runner | Open the Workflow Runner tool panel. |
| `xd.tools.workflow.demoLabPlayback.open` | method | control | never | callable | Open Demo Lab Playback | Open the read-only Demo Lab playback panel. |
| `xd.tools.workflow.demoLabPlayback.control` | method | control | never | callable, schema | Control Demo Lab Playback | Read status or drive playback controls for the active Demo Lab playback panel. |
| `xd.tools.workflow.demoLabPlayer.open` | method | control | never | callable | Open Demo Lab Maker | Open the Demo Lab maker panel. |
| `xd.tools.workflow.gowoori.open` | method | control | never | callable | Open Gowoori | Open the Gowoori artifact viewer panel. |
| `xd.tools.workflow.gowooriChat.open` | method | control | never | callable | Open GowooriChat | Open the GowooriChat tool panel. |
| `xd.tools.workflow.alertRules.open` | method | control | never | callable | Open Alert Rules | Open the Alert Rules panel. |
| `xd.tools.workflow.templateCatalog.open` | method | control | never | callable | Open Template Catalog | Open the Template Catalog panel. |
| `xd.tools.workflow.artifactVersions.open` | method | control | never | callable | Open Artifact Versions | Open the Artifact Versions panel. |

### xd.transferQueue

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.transferQueue` | group | read | never | readable | Transfer queue | Remote upload and download queue lifecycle. |
| `xd.transferQueue.enqueue` | method | write | when-external | callable | Enqueue transfer | Add an upload or download job to the transfer queue. |
| `xd.transferQueue.list` | method | read | never | callable | List transfers | List transfer queue items. |
| `xd.transferQueue.retry` | method | control | never | callable | Retry transfer | Retry a failed or canceled transfer queue item. |
| `xd.transferQueue.cancel` | method | control | never | callable | Cancel transfer | Cancel a queued or running transfer queue item. |
| `xd.transferQueue.clearCompleted` | method | write | when-external | callable | Clear completed transfers | Remove completed, failed, and canceled transfer queue items. |
| `xd.transferQueue.clearAll` | method | danger | when-external | callable | Clear all transfers | Clear every non-running transfer queue item. |

### xd.ui

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.ui` | group | read | never | readable | UI | Global Xenesis Desk user-interface controls. |
| `xd.ui.commandPalette` | group | read | never | readable | Command palette | Command palette visibility and execution entrypoints. |
| `xd.ui.commandPalette.open` | method | control | never | callable | Open command palette | Open or toggle the Xenesis Desk command palette. |
| `xd.ui.edit` | group | read | never | readable | Edit roles | Native Electron edit menu roles for the focused Xenesis Desk window. |
| `xd.ui.edit.undo` | method | control | never | callable | Undo | Run the native undo role in the focused Xenesis Desk window. |
| `xd.ui.edit.redo` | method | control | never | callable | Redo | Run the native redo role in the focused Xenesis Desk window. |
| `xd.ui.edit.cut` | method | control | never | callable | Cut | Run the native cut role in the focused Xenesis Desk window. |
| `xd.ui.edit.copy` | method | control | never | callable | Copy | Run the native copy role in the focused Xenesis Desk window. |
| `xd.ui.edit.paste` | method | control | never | callable | Paste | Run the native paste role in the focused Xenesis Desk window. |
| `xd.ui.edit.selectAll` | method | control | never | callable | Select all | Run the native select-all role in the focused Xenesis Desk window. |
| `xd.ui.theme` | group | read | never | readable | Theme | Global theme controls. |
| `xd.ui.theme.toggle` | method | control | never | callable | Toggle theme | Toggle between dark and light UI themes. |
| `xd.ui.font` | group | read | never | readable | Font size | Global UI font size controls. |
| `xd.ui.font.increase` | method | control | never | callable | Increase font size | Increase the Xenesis Desk UI font size. |
| `xd.ui.font.decrease` | method | control | never | callable | Decrease font size | Decrease the Xenesis Desk UI font size. |
| `xd.ui.view` | group | read | never | readable | View roles | Native Electron view menu roles for the focused Xenesis Desk window. |
| `xd.ui.view.reload` | method | control | never | callable | Reload | Reload the focused Xenesis Desk window. |
| `xd.ui.view.forceReload` | method | control | never | callable | Force reload | Reload the focused Xenesis Desk window while bypassing cache. |
| `xd.ui.view.toggleDevTools` | method | control | never | callable | Toggle developer tools | Open or close developer tools for the focused Xenesis Desk window. |
| `xd.ui.view.resetZoom` | method | control | never | callable | Reset zoom | Reset the focused Xenesis Desk window zoom level. |
| `xd.ui.view.zoomIn` | method | control | never | callable | Zoom in | Increase the focused Xenesis Desk window zoom level. |
| `xd.ui.view.zoomOut` | method | control | never | callable | Zoom out | Decrease the focused Xenesis Desk window zoom level. |
| `xd.ui.view.toggleFullscreen` | method | control | never | callable | Toggle fullscreen | Toggle fullscreen on the focused Xenesis Desk window. |

### xd.updater

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.updater` | group | read | never | readable | Updater | Application update status and update lifecycle operations. |
| `xd.updater.status` | method | read | never | callable | Read updater status | Read the current application updater status. |
| `xd.updater.check` | method | control | never | callable | Check for updates | Ask the configured updater feed whether a newer release is available. |
| `xd.updater.download` | method | write | when-external | callable | Download update | Download the currently available update package. |
| `xd.updater.install` | method | danger | when-external | callable | Install update | Install a downloaded update and restart the application. |

### xd.views

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.views` | group | read | never | readable | Views | Unified pane and tool opening surface with explicit dock placement. |
| `xd.views.open` | method | control | never | callable, schema | Open Xenesis Desk view | Open a built-in pane, tool, file, terminal, Command Center, Gowoori, GowooriChat, Xenesis Agent, or XCON viewer at a requested placement. |

### xd.window

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.window` | group | read | never | readable | Window | Window bounds and window sizing controls. |
| `xd.window.bounds` | group | read | never | readable | Bounds | Window bounds inventory. |
| `xd.window.bounds.current` | method | read | never | callable | Read current window bounds | Read the current main Xenesis Desk window bounds. |
| `xd.window.sizer` | group | read | never | readable | Sizer | Window sizing preset operations. |
| `xd.window.sizer.applyPreset` | method | control | never | callable | Apply window size preset | Apply a configured window size preset to the main window. |
| `xd.window.tabs` | group | read | never | readable | Tabs | Tab detach and reattach operations across Xenesis Desk windows. |
| `xd.window.tabs.detach` | method | control | never | callable | Detach tab | Detach one dock tab into a separate Xenesis Desk window. |
| `xd.window.tabs.getDetachPayload` | method | read | never | callable | Read detach payload | Read the pending detach payload for the focused detached window. |
| `xd.window.tabs.reattachStart` | method | control | never | callable | Start reattach | Show the main-window reattach drop target. |
| `xd.window.tabs.reattachCancel` | method | control | never | callable | Cancel reattach | Hide the main-window reattach drop target. |
| `xd.window.tabs.reattachDrop` | method | control | never | callable | Drop reattach payload | Send a detached tab payload back to the main window. |
| `xd.window.detached` | group | read | never | readable | Detached windows | Detached-window merge, highlight, bounds, and close controls. |
| `xd.window.detached.siblingBounds` | method | read | never | callable | Read sibling window bounds | Read main and detached sibling window bounds. |
| `xd.window.detached.mergeTab` | method | control | never | callable | Merge tab to detached window | Send a tab payload to another detached window. |
| `xd.window.detached.highlight` | method | control | never | callable | Highlight detached window | Show or hide a detached-window merge target highlight. |
| `xd.window.detached.closeSelf` | method | control | never | callable | Close focused detached window | Close the focused detached Xenesis Desk window. |

### xd.workspace

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.workspace` | group | read | never | readable | Workspace | Workspace profile save, open, read, and recent-list operations. |
| `xd.workspace.currentPath` | method | read | never | callable | Read current workspace path | Read the current local workspace and file explorer state reported by the renderer. |
| `xd.workspace.saveAs` | method | write | when-external | callable | Save workspace as | Save the current workspace profile through the native save dialog. |
| `xd.workspace.open` | method | control | never | callable | Open workspace | Open a workspace profile through the native open dialog. |
| `xd.workspace.read` | method | read | never | callable, schema | Read workspace | Read a workspace profile from an absolute file path. |
| `xd.workspace.clearRecent` | method | write | when-external | callable | Clear recent workspaces | Clear the recent workspace profile list. |

### xd.xcon

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.xcon` | group | read | never | readable | XCON Render | Standalone XCON/SKETCH rendering operations (output-target agnostic). |
| `xd.xcon.renderToPng` | method | read | never | callable, schema | Render XCON to PNG | Render XCON/SKETCH markup to a PNG image and return as base64. Use this to send XCON visuals to any channel: Telegram, Discord, Slack, email, or file. |

### xd.xenesis

| Path | Kind | Permission | Approval | Flags | Label | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `xd.xenesis` | group | read | never | readable | Xenesis | Xenesis agent and gateway control surface for Xenesis Desk orchestration. |
| `xd.xenesis.status` | method | read | never | callable | Read Xenesis status | Read the current Xenesis gateway, workspace, and active-run status. |
| `xd.xenesis.diagnostics` | method | read | never | callable | Read Xenesis diagnostics | Read Xenesis operational diagnostics, recent reports, tasks, and policy notices. |
| `xd.xenesis.tui` | group | read | never | readable | TUI | Xenesis terminal user-interface launch surface. |
| `xd.xenesis.tui.open` | method | execute | when-external | callable, schema | Open Xenesis TUI | Open the Xenesis CLI TUI in a visible Xenesis Desk terminal. |
| `xd.xenesis.reports` | group | read | never | readable | Reports | Xenesis runtime and verification reports. |
| `xd.xenesis.reports.list` | method | read | never | callable | List reports | List recent Xenesis runtime and verification reports. |
| `xd.xenesis.tasks` | group | read | never | readable | Tasks | Xenesis agent task inventory. |
| `xd.xenesis.tasks.list` | method | read | never | callable | List tasks | List recent Xenesis agent tasks and their state. |
| `xd.xenesis.agents` | group | read | never | readable | Agents | Xenesis Agent panes exposed to the runtime gateway for external routing. |
| `xd.xenesis.agents.list` | method | read | never | callable | List agents | List renderer-registered Xenesis Agent instances available for external routing. |
| `xd.xenesis.agents.status` | method | read | never | callable, schema | Read agent status | Read the status for one renderer-registered Xenesis Agent instance. |
| `xd.xenesis.agents.submit` | method | execute | when-external | callable, schema | Submit agent message | Submit a message to a renderer-registered Xenesis Agent instance. |
| `xd.xenesis.agents.events` | method | read | never | callable, schema | List agent events | List recent events for one renderer-registered Xenesis Agent instance. |
| `xd.xenesis.connections` | group | read | never | readable | Connections | Xenesis onboarding and connection readiness. |
| `xd.xenesis.connections.status` | method | read | never | callable | Read connection status | Read provider, MCP, tool, gateway, messenger, and guide readiness for Xenesis onboarding. |
| `xd.xenesis.connections.open` | method | control | never | callable, schema | Open connection catalog or card | Open Settings > Xenesis Agent > Connections and optionally focus one provider, tool, guide, or messenger card. |
| `xd.xenesis.connections.diagnostics` | group | read | never | readable | Connection diagnostics | Read/open diagnostic runbooks for Connection Center cards. |
| `xd.xenesis.connections.diagnostics.status` | method | read | never | callable, schema | Read connection diagnostic runbooks | Read Desk-native diagnostic runbooks that combine status, setup, connector, view, user-story, and safety metadata for Connection Center cards. |
| `xd.xenesis.connections.diagnostics.open` | method | control | never | callable, schema | Open connection diagnostic runbook | Open Settings > Xenesis Agent > Connections and focus the card that owns one diagnostic runbook. |
| `xd.xenesis.connections.setupRequests` | group | read | never | readable | Connection setup requests | Read/open setup request templates, record reviews, and approval-apply ready delegated setup paths for Connection Center cards. |
| `xd.xenesis.connections.setupRequests.status` | method | read | never | callable, schema | Read connection setup requests | Read Desk-native setup request templates that can be reviewed before any install, OAuth, token, tool, message, or settings mutation work is performed. |
| `xd.xenesis.connections.setupRequests.open` | method | control | never | callable, schema | Open connection setup request | Open Settings > Xenesis Agent > Connections and focus the card that owns one setup request template. |
| `xd.xenesis.connections.setupRequests.request` | method | write | when-external | callable, schema | Request connection setup review | Record a local Action Inbox item for reviewing a Connection Center setup request without executing installs, OAuth, token storage, provider tools, messages, or settings mutations. |
| `xd.xenesis.connections.setupRequests.apply` | method | write | when-external | callable, schema | Apply connection setup request | After explicit approval, apply a ready Connection Center setup request by delegating to an existing safe setup apply path such as MCP install draft apply, channel profile draft apply, or provider profile draft apply. Planned OAuth, token storage, provider tool execution, messages, and external system mutations remain blocked. |
| `xd.xenesis.onboarding` | group | read | never | readable | Onboarding | Xenesis initial setup checklist and readiness. |
| `xd.xenesis.onboarding.status` | method | read | never | callable, schema | Read onboarding status | Read the Xenesis initial setup checklist, setup surfaces, validation checks, diagnostics, and safety boundaries. |
| `xd.xenesis.onboarding.open` | method | control | never | callable, schema | Open onboarding step | Open Settings > Xenesis Agent > Connections and focus one onboarding checklist step. |
| `xd.xenesis.guides` | group | read | never | readable | Guides | Xenesis setup playbooks, integration guides, and user-story templates. |
| `xd.xenesis.guides.status` | method | read | never | callable, schema | Read guide catalog status | Read structured guide catalog metadata for onboarding, provider/tool setup, external messenger setup, and CR-controlled Desk workflows. |
| `xd.xenesis.guides.open` | method | control | never | callable, schema | Open guide | Open a Xenesis guide card in Settings and optionally open the repo-local guide file. |
| `xd.xenesis.channels` | group | read | never | readable | Channels | External bot channel routing and setup state. |
| `xd.xenesis.channels.routing` | group | read | never | readable | Routing | External bot channel route bindings and safety metadata. |
| `xd.xenesis.channels.routing.status` | method | read | never | callable, schema | Read channel routing status | Read route binding, allowlist, pairing, default-agent, diagnostics, and delivery metadata for implemented and planned Xenesis external messenger channels. |
| `xd.xenesis.channels.routing.open` | method | control | never | callable, schema | Open channel routing | Open Settings > Xenesis Agent > Connections and focus an implemented or planned external messenger routing card inside Desk. |
| `xd.xenesis.channels.safety` | group | read | never | readable | Safety | External bot channel access, loop-protection, and troubleshooting metadata. |
| `xd.xenesis.channels.safety.status` | method | read | never | callable, schema | Read channel safety status | Read access-group fields, inbound/outbound boundaries, bot-loop protection, approval guardrails, troubleshooting, and safety boundaries for implemented and planned Xenesis external messenger channels. |
| `xd.xenesis.channels.safety.open` | method | control | never | callable, schema | Open channel safety | Open Settings > Xenesis Agent > Connections and focus an implemented or planned external messenger safety card inside Desk. |
| `xd.xenesis.channels.accessGroups` | group | read | never | readable | Access groups | External bot channel access-group bindings and fail-closed readiness metadata. |
| `xd.xenesis.channels.accessGroups.status` | method | read | never | callable, schema | Read channel access-group status | Read profile allowlist bindings, redacted value states, fail-closed diagnostics, readback paths, and control boundaries for implemented and planned Xenesis external messenger channels. |
| `xd.xenesis.channels.accessGroups.open` | method | control | never | callable, schema | Open channel access groups | Open Settings > Xenesis Agent > Connections and focus an implemented or planned external messenger access-group card inside Desk. |
| `xd.xenesis.channels.pairing` | group | read | never | readable | Pairing | External bot channel pairing mode, credential readiness, validation checks, diagnostics, and safety boundaries. |
| `xd.xenesis.channels.pairing.status` | method | read | never | callable, schema | Read channel pairing status | Read pairing model, runtime support, account scope, redacted credential state, validation checks, diagnostics, and safety boundaries for implemented and planned Xenesis external messenger channels. |
| `xd.xenesis.channels.pairing.open` | method | control | never | callable, schema | Open channel pairing | Open Settings > Xenesis Agent > Connections and focus an external messenger pairing card inside Desk. |
| `xd.xenesis.channels.runtime` | group | read | never | readable | Runtime readiness | External bot channel runtime support, gateway readiness, readback checks, blocked actions, and review requests. |
| `xd.xenesis.channels.runtime.status` | method | read | never | callable, schema | Read channel runtime readiness | Read runtime support, runtime status, gateway requirement, readiness checks, diagnostics, blocked actions, and safety boundaries for implemented and planned external messenger channels without starting gateways, pairing accounts, mutating profiles, or sending messages. |
| `xd.xenesis.channels.runtime.open` | method | control | never | callable, schema | Open channel runtime readiness | Open Settings > Xenesis Agent > Connections and focus an external messenger channel runtime-readiness card inside Desk. |
| `xd.xenesis.channels.runtime.request` | method | write | when-external | callable, schema | Request channel runtime readiness review | Record a local Action Inbox item for reviewing channel runtime readiness without starting gateways, pairing accounts, mutating channel profiles, storing credentials, sending messages, or bypassing approvals. |
| `xd.xenesis.channels.userStories` | group | read | never | readable | User stories | Read and open Desk planning surfaces for external messenger channel user-story workflows. |
| `xd.xenesis.channels.userStories.status` | method | read | never | callable, schema | Read channel user-story workflows | Read workflow type, runtime support, user stories, prerequisite setup, CR paths, diagnostics, and safety boundaries for implemented and planned Xenesis external messenger channels. |
| `xd.xenesis.channels.userStories.open` | method | control | never | callable, schema | Open channel user-story workflow | Open Settings > Xenesis Agent > Connections and focus an external messenger channel user-story workflow card inside Desk. |
| `xd.xenesis.channels.setupPlans` | group | read | never | readable | Setup plans | Read and open ordered review plans for external messenger channel setup. |
| `xd.xenesis.channels.setupPlans.status` | method | read | never | callable, schema | Read channel setup plans | Read ordered messenger/channel setup plans that collect view, routing, safety, access-group, pairing, user-story, profile-draft, diagnostic, and setup-request CR paths without starting gateways, pairing accounts, storing credentials, or sending messages. |
| `xd.xenesis.channels.setupPlans.open` | method | control | never | callable, schema | Open channel setup plan | Open Settings > Xenesis Agent > Connections and focus an external messenger channel setup-plan card inside Desk. |
| `xd.xenesis.channels.profileDrafts` | group | read | never | readable | Profile drafts | Read, open, request review, and apply approval-gated external messenger channel profile drafts. |
| `xd.xenesis.channels.profileDrafts.status` | method | read | never | callable, schema | Read channel profile drafts | Read review-only channel profile draft field state, guardrails, missing required fields, diagnostics, and safety boundaries without mutating channel settings or exposing secrets. |
| `xd.xenesis.channels.profileDrafts.open` | method | control | never | callable, schema | Open channel profile draft | Open Settings > Xenesis Agent > Connections and focus an implemented external messenger channel profile-draft card inside Desk. |
| `xd.xenesis.channels.profileDrafts.request` | method | write | when-external | callable, schema | Request channel profile draft review | Record a local Action Inbox item for reviewing a channel profile draft without mutating channel settings, updating allowlists, writing profiles, sending test messages, starting the gateway, storing secrets, or bypassing approvals. |
| `xd.xenesis.channels.profileDrafts.apply` | method | write | when-external | callable, schema | Apply channel profile draft | Apply implemented external messenger channel profile draft settings through the Xenesis profile channel model after approval, without storing raw secret values, starting gateways, or sending test messages. |
| `xd.xenesis.messengers` | group | read | never | readable | Messengers | External messenger connection views and readiness state. |
| `xd.xenesis.messengers.views` | group | read | never | readable | Views | Internal Desk views for external messenger setup and readiness. |
| `xd.xenesis.messengers.views.status` | method | read | never | callable, schema | Read messenger view status | Read internal Desk view surfaces, CR open/read paths, diagnostics, runtime support, and safety boundaries for Xenesis messenger connections. |
| `xd.xenesis.messengers.views.open` | method | control | never | callable, schema | Open messenger view | Open Settings > Xenesis Agent > Connections and focus an external messenger connection card inside Desk. |
| `xd.xenesis.tools` | group | read | never | readable | Tools | External tool connection setup state. |
| `xd.xenesis.tools.setup` | group | read | never | readable | Setup | External tool auth, scope, verification, and CR readback metadata. |
| `xd.xenesis.tools.setup.status` | method | read | never | callable, schema | Read tool setup status | Read auth mode, data scopes, write scopes, credential storage, verification, setup surface, and CR readback metadata for Xenesis external tool connections. |
| `xd.xenesis.tools.setup.open` | method | control | never | callable, schema | Open tool setup | Open Settings > Xenesis Agent > Connections and focus an external tool setup card inside Desk. |
| `xd.xenesis.tools.setupPlans` | group | read | never | readable | Setup plans | Ordered CR-first setup plans that connect external tool views, setup metadata, connector readiness, install plans, OAuth packets, action policies, diagnostics, and review requests. |
| `xd.xenesis.tools.setupPlans.status` | method | read | never | callable, schema | Read tool setup plans | Read ordered setup-plan steps, CR read/open/review paths, diagnostics, blocked actions, and safety boundaries for Xenesis external tool setup without executing provider tools, completing OAuth, storing tokens, or writing MCP config. |
| `xd.xenesis.tools.setupPlans.open` | method | control | never | callable, schema | Open tool setup plan | Open Settings > Xenesis Agent > Connections and focus an external tool setup-plan card inside Desk. |
| `xd.xenesis.tools.connectors` | group | read | never | readable | Connectors | External tool connector type, auth, redacted credential state, scopes, diagnostics, and safety boundaries. |
| `xd.xenesis.tools.connectors.status` | method | read | never | callable, schema | Read tool connector status | Read connector type, auth mode, runtime support, redacted credential state, validation checks, CR paths, diagnostics, and safety boundaries for Xenesis external tool connections. |
| `xd.xenesis.tools.connectors.open` | method | control | never | callable, schema | Open tool connector | Open Settings > Xenesis Agent > Connections and focus an external tool connector card inside Desk. |
| `xd.xenesis.tools.views` | group | read | never | readable | Views | Internal Desk views for external tool connection setup and readiness. |
| `xd.xenesis.tools.views.status` | method | read | never | callable, schema | Read tool view status | Read internal Desk view surfaces, CR open/read paths, diagnostics, and safety boundaries for Xenesis external tool connections. |
| `xd.xenesis.tools.views.open` | method | control | never | callable, schema | Open tool view | Open Settings > Xenesis Agent > Connections and focus an external tool connection card inside Desk. |
| `xd.xenesis.tools.userStories` | group | read | never | readable | User stories | Read and open Desk planning surfaces for external tool user-story workflows. |
| `xd.xenesis.tools.userStories.status` | method | read | never | callable, schema | Read tool user-story workflows | Read workflow type, runtime support, user stories, prerequisite connectors, scopes, CR paths, diagnostics, and safety boundaries for Xenesis external tool workflows. |
| `xd.xenesis.tools.userStories.open` | method | control | never | callable, schema | Open tool user-story workflow | Open Settings > Xenesis Agent > Connections and focus an external tool user-story workflow card inside Desk. |
| `xd.xenesis.tools.installPlans` | group | read | never | readable | Install plans | Read, open, and request review-only Desk setup surfaces for external tool install planning. |
| `xd.xenesis.tools.installPlans.status` | method | read | never | callable, schema | Read tool install plans | Read install mode, runtime support, setup surfaces, copy/OAuth actions, config targets, required env, diagnostics, and safety boundaries for Xenesis external tool setup. |
| `xd.xenesis.tools.installPlans.open` | method | control | never | callable, schema | Open tool install plan | Open Settings > Xenesis Agent > Connections and focus an external tool install-plan card inside Desk. |
| `xd.xenesis.tools.installPlans.request` | method | write | when-external | callable, schema | Request tool install plan review | Record a local Action Inbox item for reviewing an external tool install plan without executing installs, writing MCP config, completing OAuth, storing tokens, executing provider tools, mutating settings, or mutating external systems. |
| `xd.xenesis.tools.profileDrafts` | group | read | never | readable | Tool profile drafts | Read, open, and request review-only external tool profile drafts before setup, credential storage, OAuth, or provider tool execution. |
| `xd.xenesis.tools.profileDrafts.status` | method | read | never | callable, schema | Read tool profile drafts | Read review-only external tool profile drafts, profile fields, missing required fields, review steps, diagnostics, blocked actions, and safety boundaries without storing credentials, completing OAuth, writing MCP config, executing provider tools, or mutating external systems. |
| `xd.xenesis.tools.profileDrafts.open` | method | control | never | callable, schema | Open tool profile draft | Open Settings > Xenesis Agent > Connections and focus an external tool profile draft inside Desk. |
| `xd.xenesis.tools.profileDrafts.request` | method | write | when-external | callable, schema | Request tool profile draft review | Record a local Action Inbox item for reviewing an external tool profile draft without storing credentials, completing OAuth, writing MCP config, executing provider tools, or mutating external systems. |
| `xd.xenesis.tools.profileDrafts.apply` | method | write | when-external | callable, schema | Apply tool profile draft | After explicit approval, apply a ready external tool profile draft by delegating to its ready MCP install draft apply path. Does not complete OAuth, store credentials or tokens, run shell commands, execute provider tools, or mutate external systems. |
| `xd.xenesis.tools.mcpInstallDrafts` | group | read | never | readable | MCP install drafts | Read, open, request review, and apply approval-gated MCP install drafts for recommended external tool connections. |
| `xd.xenesis.tools.mcpInstallDrafts.status` | method | read | never | callable, schema | Read MCP install drafts | Read review-only MCP install drafts, template snippets, missing env, config targets, diagnostics, and safety boundaries without writing MCP config or running tools. |
| `xd.xenesis.tools.mcpInstallDrafts.open` | method | control | never | callable, schema | Open MCP install draft | Open Settings > Xenesis Agent > Connections and focus an external tool MCP install-draft card inside Desk. |
| `xd.xenesis.tools.mcpInstallDrafts.request` | method | write | when-external | callable, schema | Request MCP install draft review | Record a local Action Inbox item for reviewing an MCP install draft without writing config, running shell commands, completing OAuth, storing tokens, executing provider tools, or mutating settings. |
| `xd.xenesis.tools.mcpInstallDrafts.apply` | method | write | when-external | callable, schema | Apply MCP install draft | After explicit approval, merge a ready recommended MCP install draft into selected local MCP config files with backups and redacted readback. Does not run shell commands, complete OAuth, store new tokens, execute provider tools, or mutate external systems. |
| `xd.xenesis.tools.oauthDrafts` | group | read | never | readable | OAuth drafts | Read, open, and request review-only OAuth app and token-store drafts for planned Google tool connections. |
| `xd.xenesis.tools.oauthDrafts.status` | method | read | never | callable, schema | Read tool OAuth drafts | Read review-only OAuth app, scope, consent, token-store, diagnostics, and safety-boundary metadata without completing OAuth, storing tokens, writing MCP config, or running provider tools. |
| `xd.xenesis.tools.oauthDrafts.setupPacket` | method | read | never | callable, schema | Read tool OAuth setup packet | Read the review-only OAuth setup packet for planned Google tool connections, including app registration, redirect URI policy, credential refs, scope review, token-store readiness, diagnostics, and safety boundaries without completing OAuth, storing tokens, writing MCP config, or running provider tools. |
| `xd.xenesis.tools.oauthDrafts.setupPacket.open` | method | control | never | callable, schema | Open tool OAuth setup packet | Open Settings > Xenesis Agent > Connections and focus the review-only OAuth setup packet block for a planned Google tool without completing OAuth, storing tokens, writing MCP config, or running provider tools. |
| `xd.xenesis.tools.oauthDrafts.open` | method | control | never | callable, schema | Open tool OAuth draft | Open Settings > Xenesis Agent > Connections and focus an external tool OAuth draft card inside Desk. |
| `xd.xenesis.tools.oauthDrafts.request` | method | write | when-external | callable, schema | Request tool OAuth draft review | Record a local Action Inbox item for reviewing a tool OAuth draft without completing OAuth, storing tokens, writing MCP config, executing provider tools, sending email, mutating documents, or mutating calendar events. |
| `xd.xenesis.tools.runtime` | group | read | never | readable | Tool runtime readiness | Read, open, and request generic review-only external tool runtime readiness before provider tool execution. |
| `xd.xenesis.tools.runtime.status` | method | read | never | callable, schema | Read tool runtime readiness | Read generic external tool runtime readiness, credential state, readback checks, diagnostics, blocked actions, and safety boundaries without executing provider tools, installing MCP servers, writing MCP config, storing credentials, completing OAuth, or mutating external systems. |
| `xd.xenesis.tools.runtime.open` | method | control | never | callable, schema | Open tool runtime readiness | Open Settings > Xenesis Agent > Connections and focus the generic external tool runtime readiness block. |
| `xd.xenesis.tools.runtime.request` | method | write | when-external | callable, schema | Request tool runtime readiness review | Record a local Action Inbox item for reviewing external tool runtime readiness without executing provider tools, installing MCP servers, writing MCP config, storing credentials, completing OAuth, or mutating external systems. |
| `xd.xenesis.tools.mcpOAuth` | group | read | never | readable | MCP OAuth readiness | Read, open, and request review-only MCP OAuth runtime readiness for OAuth-capable recommended external tool connections. |
| `xd.xenesis.tools.mcpOAuth.status` | method | read | never | callable, schema | Read MCP OAuth readiness | Read review-only MCP OAuth runtime readiness, credential references, scopes, diagnostics, and safety boundaries without starting OAuth, storing tokens, writing MCP config, or running provider tools. |
| `xd.xenesis.tools.mcpOAuth.open` | method | control | never | callable, schema | Open MCP OAuth readiness | Open Settings > Xenesis Agent > Connections and focus an external tool MCP OAuth readiness card inside Desk. |
| `xd.xenesis.tools.mcpOAuth.request` | method | write | when-external | callable, schema | Request MCP OAuth readiness review | Record a local Action Inbox item for reviewing MCP OAuth runtime readiness without starting OAuth, storing tokens, writing MCP config, executing provider tools, or mutating external systems. |
| `xd.xenesis.tools.oauthRuntime` | group | read | never | readable | OAuth runtime readiness | Read, open, and request review-only OAuth runtime readiness for planned Google tool connections. |
| `xd.xenesis.tools.oauthRuntime.status` | method | read | never | callable, schema | Read tool OAuth runtime readiness | Read review-only OAuth runtime callback policy, token-store ownership, readback checks, diagnostics, and safety boundaries without starting OAuth, hosting callback servers, storing tokens, writing MCP config, or running provider tools. |
| `xd.xenesis.tools.oauthRuntime.open` | method | control | never | callable, schema | Open tool OAuth runtime readiness | Open Settings > Xenesis Agent > Connections and focus the review-only OAuth runtime readiness block for a planned Google tool. |
| `xd.xenesis.tools.oauthRuntime.request` | method | write | when-external | callable, schema | Request tool OAuth runtime readiness review | Record a local Action Inbox item for reviewing OAuth runtime readiness without starting OAuth, hosting callback servers, storing tokens, writing MCP config, executing provider tools, or mutating Google data. |
| `xd.xenesis.tools.actions` | group | read | never | readable | Tool actions | Read, open, and request review-only external tool action policy catalogs before provider tool execution exists. |
| `xd.xenesis.tools.actions.status` | method | read | never | callable, schema | Read tool action catalogs | Read review-only external tool action groups, approval policies, CR readback paths, diagnostics, blocked actions, and safety boundaries without executing provider tools or mutating external systems. |
| `xd.xenesis.tools.actions.open` | method | control | never | callable, schema | Open tool action catalog | Open Settings > Xenesis Agent > Connections and focus an external tool action policy catalog inside Desk. |
| `xd.xenesis.tools.actions.request` | method | write | when-external | callable, schema | Request tool action policy review | Record a local Action Inbox item for reviewing an external tool action policy catalog without running provider tools, storing credentials, completing OAuth, writing MCP config, or mutating external systems. |
| `xd.xenesis.providers` | group | read | never | readable | Providers | AI provider setup and routing state. |
| `xd.xenesis.providers.setup` | group | read | never | readable | Setup | AI provider auth, runtime, retry, fallback, and verification metadata. |
| `xd.xenesis.providers.setup.status` | method | read | never | callable, schema | Read provider setup status | Read provider identity, model, auth mode, credential state, endpoint, runtime profile, retry/fallback policy, verification, CR readback, and risk controls for the active Xenesis AI provider. |
| `xd.xenesis.providers.setup.open` | method | control | never | callable, schema | Open provider setup | Open Settings > Xenesis Agent > Connections and focus the active AI provider setup card inside Desk. |
| `xd.xenesis.providers.routing` | group | read | never | readable | Routing | AI provider route, retry, fallback, and credential-pool read model. |
| `xd.xenesis.providers.routing.status` | method | read | never | callable, schema | Read provider routing status | Read provider route source, runtime provider/model, retry policy, configured fallback chain, credential-pool state, diagnostics, and safety boundaries for the active Xenesis AI provider. |
| `xd.xenesis.providers.routing.open` | method | control | never | callable, schema | Open provider routing | Open Settings > Xenesis Agent > Connections and focus the AI provider routing card inside Desk. |
| `xd.xenesis.providers.views` | group | read | never | readable | Views | Internal Desk views for AI provider setup and readiness. |
| `xd.xenesis.providers.views.status` | method | read | never | callable, schema | Read provider view status | Read internal Desk view surfaces, CR open/read paths, diagnostics, and safety boundaries for the active Xenesis AI provider. |
| `xd.xenesis.providers.views.open` | method | control | never | callable, schema | Open provider view | Open Settings > Xenesis Agent > Connections and focus the active AI provider connection card inside Desk. |
| `xd.xenesis.providers.setupPlans` | group | read | never | readable | Setup plans | Ordered CR-first setup plans that connect provider setup, routing, views, profile drafts, diagnostics, and setup review requests. |
| `xd.xenesis.providers.setupPlans.status` | method | read | never | callable, schema | Read provider setup plans | Read ordered setup-plan steps, CR read/open/review paths, diagnostics, blocked actions, and safety boundaries for Xenesis AI provider setup without changing provider settings, storing raw secrets, editing fallback chains, changing local CLI selection, or running provider prompts. |
| `xd.xenesis.providers.setupPlans.open` | method | control | never | callable, schema | Open provider setup plan | Open Settings > Xenesis Agent > Connections and focus the AI provider setup-plan card inside Desk. |
| `xd.xenesis.providers.profileDrafts` | group | read | never | readable | Profile drafts | Read, open, review, and approval-apply AI provider profile drafts. |
| `xd.xenesis.providers.profileDrafts.status` | method | read | never | callable, schema | Read provider profile drafts | Read provider profile field state, guardrails, missing required fields, diagnostics, apply readiness, and safety boundaries without exposing secrets. |
| `xd.xenesis.providers.profileDrafts.open` | method | control | never | callable, schema | Open provider profile draft | Open Settings > Xenesis Agent > Connections and focus the active provider profile-draft card inside Desk. |
| `xd.xenesis.providers.profileDrafts.request` | method | write | when-external | callable, schema | Request provider profile draft review | Record a local Action Inbox item for reviewing a provider profile draft without changing provider settings, model settings, fallback chains, credentials, local CLI selection, or running provider prompts. |
| `xd.xenesis.providers.profileDrafts.apply` | method | write | when-external | callable, schema | Apply provider profile draft | Apply a ready provider profile draft to non-secret AI provider profile settings after Capability Registry approval; raw provider secrets, fallback chains, local CLI selection, and provider prompt execution are not changed. |
| `xd.xenesis.gateway` | group | read | never | readable | Gateway | Xenesis gateway lifecycle operations. |
| `xd.xenesis.gateway.status` | method | read | never | callable | Read gateway status | Read the Xenesis gateway runtime status. |
| `xd.xenesis.gateway.start` | method | control | never | callable | Start gateway | Start the Xenesis runtime gateway. |
| `xd.xenesis.gateway.stop` | method | control | never | callable | Stop gateway | Stop the Xenesis runtime gateway. |
| `xd.xenesis.gateway.restart` | method | control | never | callable | Restart gateway | Restart the Xenesis runtime gateway. |
| `xd.xenesis.gateway.openDashboard` | method | control | never | callable | Open gateway dashboard | Open the Xenesis gateway dashboard in a Xenesis Desk browser pane. |
| `xd.xenesis.workspace` | group | read | never | readable | Workspace | Xenesis workspace binding. |
| `xd.xenesis.workspace.set` | method | control | never | callable, schema | Set workspace | Set the active workspace used by the Xenesis runtime gateway. |
| `xd.xenesis.profiles` | group | read | never | readable | Profiles | Xenesis profile inventory, installation, and active-profile selection. |
| `xd.xenesis.profiles.list` | method | read | never | callable | List profiles | Read installed Xenesis profiles and the active profile. |
| `xd.xenesis.profiles.install` | method | write | when-external | callable, schema | Install profile | Install or update a Xenesis profile configuration. |
| `xd.xenesis.profiles.use` | method | control | never | callable, schema | Use profile | Select the active Xenesis profile by name. |
| `xd.xenesis.profiles.updateChannels` | method | write | when-external | callable, schema | Update profile channels | Update external bot channel settings for a Xenesis profile. |
| `xd.xenesis.profiles.testChannel` | method | write | when-external | callable, schema | Test profile channel | Send a sanitized test message through a Xenesis external bot channel. |
| `xd.xenesis.runs` | group | read | never | readable | Runs | Xenesis prompt run lifecycle. |
| `xd.xenesis.runs.start` | method | execute | when-external | callable, schema | Start run | Run a prompt through the Xenesis runtime gateway. |
| `xd.xenesis.runs.cancel` | method | control | never | callable | Cancel run | Cancel the active Xenesis runtime request. |
| `xd.xenesis.sessions` | group | read | never | readable | Sessions | Xenesis conversation/session controls. |
| `xd.xenesis.sessions.reset` | method | control | never | callable | Reset session | Clear the active Xenesis conversation/session state. |
