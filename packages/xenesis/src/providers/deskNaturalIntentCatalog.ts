export type DeskNaturalIntentFamily =
  | "status"
  | "explorer"
  | "terminal"
  | "browser"
  | "document"
  | "layout"
  | "multi_step"
  | "app_automation";

export interface DeskNaturalIntentExecution {
  path: string;
  approved?: boolean;
}

export interface DeskNaturalIntent {
  id: string;
  family: DeskNaturalIntentFamily;
  description: string;
  sampleUserRequests: string[];
  slots: string[];
  execute: DeskNaturalIntentExecution;
  alternativePaths: string[];
  readbackPaths: string[];
  placementStrategy?: string;
  modeStrategy?: string;
  guidance: string;
}

export interface DeskNaturalIntentPromptOptions {
  callTool: string;
}

export const DOCUMENT_AREA_PLACEMENT_STRATEGY = [
  "Document-area placement rule: when the user says right, left, top, or bottom for a document, browser, terminal, or generated view, interpret it relative to the document/work area unless they explicitly name the Xenesis Agent pane, side panel, Action Inbox, or a specific pane.",
  "First read xd.dock.panes.list, choose a document-state pane as targetPaneId, and prefer an artifact/document pane over the active Xenesis Agent pane.",
  "Do not satisfy document/work area left/right/top/bottom by opening a side dock. A readback with state=right, state=left, state=top, or state=bottom is side-dock placement, not document/work-area placement.",
  "When a document-state target pane exists and the user asks to place one new item beside it, call the open/control path with both placement and targetPaneId so the split is anchored inside the document window.",
  "When no document-state target pane exists, or when the user asks to lay out multiple items left/right or top/bottom in the work area, open all target content as document tabs with placement=tab or no side placement, in visual order: left-to-right order for right/left layouts and top-to-bottom order for top/bottom layouts.",
  "After opening multiple document/work-area tabs, call xd.dock.window.arrange with windowState=document and mode=row for left/right, mode=column for top/bottom, or mode=grid for grid. This matches the top tab-arrange menu behavior.",
  "Never use the current Xenesis Agent pane as the placement anchor for opened content unless the user explicitly asks to place content beside the Agent."
].join(" ");

export const DOCUMENT_MODE_STRATEGY = [
  "Document mode rule: documentMode supports preview/viewer, edit mode, and split mode intent.",
  "For preview/viewer mode, open or read the file with xd.files.open, xd.files.read, or xd.views.open; markdown, code, image, document-preview, and xcon-viewer are viewer surfaces.",
  "For Office or document-preview readiness questions, use xd.files.viewer.state after the preview is open and check previewStatus, previewReady, page count, and sheet names; an opened pane or capture alone does not prove the renderer is ready.",
  "For edit mode, open Safe File Edit Center with xd.tools.core.safeFileEditCenter.open, or use xd.files.previewTextWrite before xd.files.applyTextWrite; do not perform a direct write when the user asks for an editable document flow.",
  "For preview, edit/source, or split pane mode changes on an already open Markdown, Mermaid, or XCON document, call xd.documents.mode.set with documentMode and then verify with xd.documents.mode.read. For XCON, edit mode maps to source mode."
].join(" ");

export const APP_AUTOMATION_STRATEGY = [
  "App/document automation route priority: prefer API or SDK/CLI operations, then file format operations, then plugin/add-in automation, then OS accessibility, with screen/UI automation last.",
  "For Office files, use the dedicated CR file-format executors first: xd.documents.office.generate, xd.documents.office.edit, xd.documents.office.inspect, xd.documents.office.export, and xd.documents.office.verify.",
  "For rich Word and PowerPoint generation, choose an intent and send an Agent-authored layoutPlan so the result is not locked to the fallback template; use plain paragraphs/slides only for simple fallback files.",
  "For xd.documents.office.edit payloads, use appendParagraphs for Word/docx, appendRows with sheetName and rows for Excel/xlsx, and appendSlides for PowerPoint/pptx. Do not send generation-only paragraphs, sheets, or slides fields to the edit path.",
  "For approval-required Office generate, edit, or export calls, create the approved=false request and keep the normal approval-stop text generic. If the call returns pending approval, stop this provider turn; do not wait for approval execution or run same-turn inspect/verify/export. Do not echo hidden or remembered titles, marker identifiers, content values, file paths, raw args, CR paths, tool names, approval ids, approvalRequired, or actionInboxItem in user-facing text; let the Agent chat inline card show 이번만 승인, 항상 승인, and 거절.",
  "Use app/object automation only when the user needs behavior that file-format editing cannot cover; plan Microsoft Graph, Office.js, or Windows COM routes through xd.integrations.microsoft.graph.plan, xd.integrations.officejs.plan, or xd.desktop.office.com.plan, then execute through xd.integrations.microsoft.graph.execute, xd.integrations.officejs.execute, or xd.desktop.office.com.execute when credentials/host/app support are available.",
  "Microsoft Graph, Office.js, and Windows COM route executors cover generate, edit, inspect, export, and verify when their required token, host bridge, installed app, or platform support is configured; missing support is a diagnostic unavailable/error result, not success.",
  "For simple visible page readback, use xd.panes.browser.textSnapshot or xd.panes.browser.domSnapshot after opening/navigating the Desk browser pane.",
  "Visible Desk browser form interactions must use xd.panes.browser.elementAction before approval-gated UI automation.",
  "Do not send visible Desk browser fill, click, select, or press requests to xd.automation.ui.run unless elementAction cannot target the page.",
  "For simple visible web interaction inside an already-open Desk browser pane, use xd.panes.browser.elementAction for bounded fill, click, select, or press actions, then verify with xd.panes.browser.textSnapshot.",
  "When the user asks for actual screen operation, visible UI control, a screenshot/capture artifact, or a combined web plus desktop UI workflow, do not stop with a text-only permission explanation. Create the approval-required Desk action with approved=false on the concrete browser/UI automation capability so the chat approval flow can continue.",
  "If the user prompt contains an absolute URL and asks to type, fill, click, submit, or verify a web form, a text-only answer is invalid; use the visible browser or UI automation route and verify readback before reporting completion.",
  "Do not report user-requested completion markers for web form work until the browser interaction has actually run and text readback confirms the requested result.",
  "For simple document text readback, use xd.files.readText, xd.files.read, or xd.files.viewer.state after opening the document.",
  "Do not use approval-gated UI automation, Playwright run, or explorer navigation for simple browser/document readback or simple visible Desk browser form controls.",
  "Use browser or UI automation only when no stable API, SDK/CLI, file format, add-in route, or visible Desk browser elementAction route exists. Use xd.automation.ui.plan/run for complex/headless web automation or desktop application control. For Windows desktop tasks, xd.automation.ui.plan/run routes bounded window inventory, inspect, focus, sendKeys, invoke, setValue, and click actions through Windows UIAutomation.",
  "For desktop UI automation, if the user says only a generic control such as input field, textbox, or button without a visible control name, do an inspect-only run first, then use the inspected name, automationId, or controlType in a second run. Do not combine inspect with generic setValue/click actions in the same approval payload.",
  "For Windows desktop tasks, inspect once when discovery is needed, then move to concrete setValue, invoke, click, sendKeys, or focusWindow actions when the user names visible controls and values or an earlier turn already inspected the target. Do not repeat inspect-only approvals as the next step for the same requested desktop action.",
  "For visible external desktop app requests such as Notepad or KakaoTalk, first call xd.apps.status without a target to read registered profiles and disabled state when the appId is uncertain.",
  "Use registered appId values from profile readback; prefer xd.apps.launch, xd.apps.find, xd.apps.focus, xd.apps.resize, and targeted xd.apps.status for window management before generic UI automation.",
  "Do not type, hotkey, send, delete, or submit inside external desktop apps unless the user asked for that exact action; call approval-required xd.apps.typeText or xd.apps.hotkey with approved=false and stop if pending.",
  "Route available Desk actions through the registered CR capability families; do not invent xd.office or xd.appAutomation path names.",
  "Before final answers for immediately executed or read-only app/document work, verify with render/export/readback evidence such as file readback, open document state, document mode readback, terminal output, browser state, screenshot/capture, or exported artifact status. Pending approval is a stop state, not a completed result.",
  "For send/delete/external share/payment/legal/financial submissions or other irreversible external actions, create the real Desk approval request instead of completing silently."
].join(" ");

export const DESK_NATURAL_INTENT_CATALOG: readonly DeskNaturalIntent[] = [
  {
    id: "desk.status",
    family: "status",
    description: "For natural browser tab or file explorer status requests, plus workspace, provider, or Desk status requests.",
    sampleUserRequests: [
      "지금 데스크 상태 알려줘",
      "브라우저 탭 개수랑 파일 탐색기 상태 알려줘"
    ],
    slots: ["statusTarget"],
    execute: { path: "xd.app.status" },
    alternativePaths: [
      "xd.panes.browser.list",
      "xd.panes.browser.current",
      "xd.explorer.local.state",
      "xd.xenesis.status"
    ],
    readbackPaths: [
      "xd.app.status",
      "xd.panes.browser.list",
      "xd.explorer.local.state"
    ],
    guidance: "Use direct read paths and answer only with the product result. If a read path lacks a requested field, say that field is not currently returned by Desk."
  },
  {
    id: "explorer.navigate",
    family: "explorer",
    description: "For natural requests to open, move, or navigate the left file tree/local explorer to a folder path.",
    sampleUserRequests: [
      "왼쪽 파일 트리에서 E:\\Workspace\\plane 열어",
      "탐색기를 plane 폴더로 바꿔"
    ],
    slots: ["path"],
    execute: { path: "xd.explorer.local.navigate", approved: false },
    alternativePaths: [
      "xd.explorer.local.show",
      "xd.explorer.local.selectPath",
      "xd.explorer.local.refresh",
      "xd.explorer.local.openSelected",
      "xd.explorer.local.previewSelected"
    ],
    readbackPaths: [
      "xd.explorer.local.state"
    ],
    guidance: "Extract the folder path as the path slot. For outside-workspace or approval-required navigation, call the execute path with approved=false so Desk creates a real approval record; do not merely say approval is needed. To CREATE a new folder/directory that does not exist yet, navigation does not create it: instead either write a file inside the target folder with xd.files.applyTextWrite (the parent directory is auto-created) or run a directory-create command (mkdir / New-Item -ItemType Directory) via xd.terminals.run with approved=false. Never stop at chat-only 'approval needed' without making one of these concrete CR calls."
  },
  {
    id: "remote.explorer",
    family: "explorer",
    description: "For natural remote explorer requests, including remote explorer state, configured profile/path readback, remote navigation, refresh, parent folder, filtering, and selection.",
    sampleUserRequests: [
      "원격 파일 탐색기 현재 프로필과 경로 알려줘",
      "원격 탐색기에서 prod-sftp /var/www/html 경로로 이동해"
    ],
    slots: ["profileId", "path", "selectPath", "query"],
    execute: { path: "xd.explorer.remote.state" },
    alternativePaths: [
      "xd.explorer.remote.show",
      "xd.explorer.remote.navigate",
      "xd.explorer.remote.refresh",
      "xd.explorer.remote.goUp",
      "xd.explorer.remote.setFilter",
      "xd.explorer.remote.clearFilter",
      "xd.explorer.remote.selectPath",
      "xd.explorer.remote.openSelected",
      "xd.explorer.remote.previewSelected",
      "xd.explorer.remote.togglePreview",
      "xd.explorer.remote.toggleDetails",
      "xd.explorer.remote.sendSelectedToBot",
      "xd.explorer.remote.addSelectedToContext",
      "xd.explorer.remote.copySelectedPath",
      "xd.explorer.remote.openSelectedSyncPlanner"
    ],
    readbackPaths: [
      "xd.explorer.remote.state"
    ],
    guidance: "Use xd.explorer.remote.state for read-only remote explorer status, profileId, path, selected path, filter, and visibility questions. Use remote navigate only when the user asks to move a configured remote profile to a path; it requires profileId and path. For refresh, parent folder, filter, selection, preview, details, send-to-context, or sync-planner requests, call the matching remote explorer path and then verify with remote state. Do not answer remote explorer state from local explorer state."
  },
  {
    id: "terminal.control",
    family: "terminal",
    description: "For natural terminal requests, visible command execution, one-shot output, terminal status, and terminal readback.",
    sampleUserRequests: [
      "터미널 열고 npm test 실행해",
      "PowerShell에서 현재 폴더 목록 보여줘"
    ],
    slots: ["command", "cwd", "shell", "placement", "targetPaneId", "termId", "streamFilterProfile"],
    execute: { path: "xd.terminals.run" },
    alternativePaths: [
      "xd.terminals.openDefault",
      "xd.terminals.openPowerShell",
      "xd.terminals.openCmd",
      "xd.terminals.spawn",
      "xd.terminals.runAndWait",
      "xd.terminals.list",
      "xd.terminals.tail",
      "xd.terminals.stop"
    ],
    readbackPaths: [
      "xd.terminals.list",
      "xd.terminals.tail",
      "xd.terminals.sessions.{termId}.wait",
      "xd.terminals.sessions.{termId}.state",
      "xd.terminals.sessions.{termId}.automationQuality",
      "xd.dock.panes.list"
    ],
    placementStrategy: DOCUMENT_AREA_PLACEMENT_STRATEGY,
    guidance: "Use visible terminal paths for user-observable commands. For a visible terminal that must run a command, call the terminal execute path with approved=false when approval is required; do not merely say approval is needed before making that call. If the terminal call returns pending approval, stop this provider turn with generic approval-needed product language and do not wait for same-turn post-approval output. When a terminal action has executed immediately or a later turn is verifying an approved action, wait for the created terminal session output with xd.terminals.sessions.{termId}.wait and verify the session with xd.terminals.sessions.{termId}.state before reporting output. For terminal automation, stream filter, or output filtering quality questions, read xd.terminals.sessions.{termId}.automationQuality after identifying the terminal id from xd.terminals.list. Do not infer terminal success from the prompt or from a command string. Use runAndWait only when the user asks for one-shot output or a bounded command result."
  },
  {
    id: "browser.control",
    family: "browser",
    description: "For natural web or visible browser requests, opening URLs, navigating existing browser panes, browser history, reload, stop, bounded form interactions, and readback.",
    sampleUserRequests: [
      "Desk 안에서 https://example.com 열어",
      "현재 브라우저 탭을 새 URL로 이동해",
      "현재 열린 웹 폼에 이름을 입력하고 제출 버튼을 눌러"
    ],
    slots: ["url", "targetPaneId", "placement", "selector", "text", "elementAction", "value", "key"],
    execute: { path: "xd.panes.browser.open" },
    alternativePaths: [
      "xd.panes.browser.navigate",
      "xd.panes.browser.back",
      "xd.panes.browser.forward",
      "xd.panes.browser.reload",
      "xd.panes.browser.stop",
      "xd.panes.browser.elementAction",
      "xd.panes.browser.textSnapshot",
      "xd.panes.browser.domSnapshot"
    ],
    readbackPaths: [
      "xd.panes.browser.state",
      "xd.panes.browser.current",
      "xd.panes.browser.list",
      "xd.panes.browser.textSnapshot",
      "xd.panes.browser.domSnapshot",
      "xd.dock.panes.list"
    ],
    placementStrategy: DOCUMENT_AREA_PLACEMENT_STRATEGY,
    guidance: "Open web links inside Desk browser panes. For page title, body text, links, forms, or DOM readback, use textSnapshot or domSnapshot on the visible Desk browser pane before considering approval-gated automation. For simple visible form interactions in a Desk browser pane, use elementAction with a selector or visible text target for fill, select, press, and click, then verify with textSnapshot. Do not route simple visible Desk browser form controls to xd.automation.ui.run unless elementAction cannot target the page. After navigation, opening, or interaction, read browser state/list when the user asked for confirmation or page state."
  },
  {
    id: "document.open",
    family: "document",
    description: "For natural document or file viewing requests, editing requests, preview/viewer mode, edit mode, split mode intent, opening local files, markdown, code, images, XCON, and explicit view kinds.",
    sampleUserRequests: [
      "AGENTS.md 문서를 미리보기로 열어",
      "이 마크다운을 문서 영역 오른쪽에 분할 모드로 보여줘"
    ],
    slots: ["filePath", "kind", "placement", "targetPaneId", "documentMode", "editFlow"],
    execute: { path: "xd.files.open" },
    alternativePaths: [
      "xd.views.open",
      "xd.files.read",
      "xd.files.readText",
      "xd.files.listOpen",
      "xd.files.viewer.state",
      "xd.tools.core.safeFileEditCenter.open",
      "xd.files.previewTextWrite",
      "xd.files.applyTextWrite",
      "xd.files.restoreTextBackup",
      "xd.documents.mode.set",
      "xd.documents.mode.read"
    ],
    readbackPaths: [
      "xd.files.read",
      "xd.files.readText",
      "xd.files.listOpen",
      "xd.files.viewer.state",
      "xd.documents.mode.read",
      "xd.dock.contents",
      "xd.dock.panes.list"
    ],
    placementStrategy: DOCUMENT_AREA_PLACEMENT_STRATEGY,
    modeStrategy: DOCUMENT_MODE_STRATEGY,
    guidance: "Use filePath for file opens. Use views.open with kind file, markdown, code, image, or xcon when the user names a view type or dock placement. For document first-line, marker, body, or bounded text readback, use files.readText/read or viewer.state instead of explorer navigation or UI automation. For Office or document-preview readiness questions, use files.viewer.state after opening and report previewStatus, previewReady, sheet names, or page counts in user-facing language; do not treat a visible tab or capture alone as renderer readiness. For editing content, prefer Safe File Edit Center or preview/apply file writes. For text file generation or updates, do not set maxBytes from requested character count, document length, or design complexity requirements; omit maxBytes unless the user explicitly asks for a file-size safety cap. For preview, edit/source, or split view-mode requests, call xd.documents.mode.set after the target document is open and verify with xd.documents.mode.read."
  },
  {
    id: "layout.arrange",
    family: "layout",
    description: "For natural layout or pane arrangement requests, side dock sizes, whole-window arrangements, and targeted pane group arrangements.",
    sampleUserRequests: [
      "오른쪽 패널 넓이를 620으로 맞춰",
      "열린 패인들을 그리드로 정렬해"
    ],
    slots: ["side", "size", "mode", "paneId", "contentId"],
    execute: { path: "xd.dock.sizes.set" },
    alternativePaths: [
      "xd.dock.window.arrange",
      "xd.dock.window.merge",
      "xd.dock.pane.arrange",
      "xd.dock.pane.merge",
      "xd.dock.focus"
    ],
    readbackPaths: [
      "xd.dock.sizes.current",
      "xd.dock.panes.list",
      "xd.dock.contents"
    ],
    placementStrategy: "For document/work area arrangement, use windowState=document or target the pane/content inside the document area. Do not arrange around the Xenesis Agent pane unless the user explicitly names the Agent pane.",
    guidance: "Use sizes.set for side dimensions. Use window.arrange for whole dock windows and pane.arrange for a targeted pane group."
  },
  {
    id: "office.document",
    family: "app_automation",
    description: "For natural Word, Excel, and PowerPoint file generation, editing, inspection, export, and verification requests.",
    sampleUserRequests: [
      "워드 문서를 생성하고 내용이 들어갔는지 확인해",
      "엑셀 표를 만들고 PDF export 가능한지 검증해"
    ],
    slots: [
      "kind",
      "filePath",
      "outPath",
      "title",
      "intent",
      "layoutPlan",
      "paragraphs",
      "sheets",
      "slides",
      "appendParagraphs",
      "appendRows",
      "appendSlides",
      "expectedText",
      "targetFormat"
    ],
    execute: { path: "xd.documents.office.generate" },
    alternativePaths: [
      "xd.documents.office.edit",
      "xd.documents.office.inspect",
      "xd.documents.office.export",
      "xd.documents.office.verify",
      "xd.integrations.microsoft.graph.plan",
      "xd.integrations.microsoft.graph.execute",
      "xd.integrations.officejs.plan",
      "xd.integrations.officejs.execute",
      "xd.desktop.office.com.plan",
      "xd.desktop.office.com.execute"
    ],
    readbackPaths: [
      "xd.documents.office.inspect",
      "xd.documents.office.verify",
      "xd.files.open",
      "xd.files.listOpen"
    ],
    guidance: "Use Office file-format CR executors for Word/Excel/PowerPoint work first. For generate, set intent and provide layoutPlan for Word/docx or PowerPoint/pptx unless the user explicitly asks for a plain/simple file. Word layoutPlan.sections can use types cover, summary, heading, paragraphs/content, callout, table/comparison/matrix, checklist/action-items, timeline/process/roadmap, quote, and appendix. PowerPoint layoutPlan.slides can use roles title, agenda, section, comparison, timeline/process, metrics/scorecard, matrix/risk, recommendation/decision, closing, and content. Use paragraphs/slides as legacy fallback content, not as the only structure for rich documents. For Excel/xlsx, use sheets. For edit, use appendParagraphs for Word/docx, appendRows with sheetName and rows for Excel/xlsx, and appendSlides for PowerPoint/pptx; do not send generation-only paragraphs, sheets, slides, or layoutPlan fields to xd.documents.office.edit. If generate, edit, or export needs approval, create the approved=false request and answer with generic Desk approval language only; if the result is pending approval, stop this provider turn and do not run same-turn inspect or verify. Do not echo hidden or remembered titles, marker identifiers, content values, file paths, raw args, CR paths, tool names, approval ids, approvalRequired, or actionInboxItem in user-facing text. After generate or edit has executed immediately, or in a later verification turn after approval execution, call inspect or verify before answering. Use Graph, Office.js, or COM plan paths before execute paths when the user needs host/API/app behavior that file-format execution cannot provide; execute only when the required credentials, host bridge, or installed Office app support are available."
  },
  {
    id: "external.app",
    family: "app_automation",
    description: "For natural registered external desktop app launch, status, window management, and explicitly requested keyboard input requests.",
    sampleUserRequests: [
      "메모장 열어줘",
      "KakaoTalk 상태 확인해",
      "Notepad 창 찾아서 오른쪽으로 옮겨줘"
    ],
    slots: ["appId", "windowId", "processName", "titleContains", "path", "text", "keys", "x", "y", "width", "height", "mode"],
    execute: { path: "xd.apps.status" },
    alternativePaths: [
      "xd.apps.launch",
      "xd.apps.find",
      "xd.apps.focus",
      "xd.apps.resize",
      "xd.apps.typeText",
      "xd.apps.hotkey",
      "xd.apps.close",
      "xd.automation.ui.plan",
      "xd.automation.ui.run"
    ],
    readbackPaths: [
      "xd.apps.status",
      "xd.apps.find"
    ],
    guidance: "For visible external desktop app requests, use no-target xd.apps.status first when the registered appId or enabled/disabled profile state is uncertain. Use registered appId values from profile readback and prefer xd.apps.launch/find/focus/resize/status for launch and window management before generic UI automation. Only use xd.apps.typeText or xd.apps.hotkey when the user explicitly asks to type, send keys, or perform a hotkey; call them with approved=false when approval is required and stop if pending. Use xd.automation.ui.plan/run only after registered app control cannot identify or control the needed desktop UI element."
  },
  {
    id: "ui.automation",
    family: "app_automation",
    description: "For natural UI automation requests over web pages or desktop controls after stable browser and registered external app CR paths are insufficient.",
    sampleUserRequests: [
      "웹 페이지에서 이 버튼을 눌러보고 결과 확인해",
      "등록되지 않은 데스크톱 앱의 특정 버튼을 검사해",
      "브라우저에서 실제 화면 조작으로 입력하고 캡처를 남겨줘"
    ],
    slots: ["target", "actions", "url", "app"],
    execute: { path: "xd.automation.ui.run" },
    alternativePaths: [
      "xd.automation.ui.plan",
      "xd.playwright.snapshot",
      "xd.playwright.run",
      "xd.panes.browser.open",
      "xd.panes.browser.state",
      "xd.apps.status",
      "xd.apps.find"
    ],
    readbackPaths: [
      "xd.automation.ui.plan",
      "xd.playwright.snapshot",
      "xd.panes.browser.state",
      "xd.capture.activePane"
    ],
    guidance: "Use UI automation for clicking, typing, selecting, focusing, invoking, or inspecting desktop controls only after simple read-only Desk browser/document extraction, visible Desk browser elementAction, and registered external app xd.apps.* paths are insufficient. For visible Desk browser forms, use browser.control with xd.panes.browser.elementAction first. For registered external desktop apps, use external.app and xd.apps.status/find/launch/focus/resize/status first. Web targets can run through xd.automation.ui.run and Playwright when complex or headless interaction is required after visible Desk browser elementAction is insufficient, when the user explicitly asks for actual screen operation, or when a screenshot/capture artifact is part of the requested proof. For web actions, use the supported action names fill, click, press, waitForSelector, waitForTimeout, text, expectText, and screenshot; prefer expectText for assertions. The executor also normalizes common assertion aliases assertText and waitForText to expectText. Windows desktop targets can run through xd.automation.ui.run and Windows UIAutomation for listWindows, inspect, focusWindow, sendKeys, invoke, setValue, and click actions. If approval is required, call the concrete UI automation capability with approved=false so the Agent chat can render inline approval; if the call returns pending approval, stop this provider turn with generic approval-needed product language. Do not answer only that approval is needed before creating the real record. If the user says only a generic desktop control name such as input field, textbox, or button without a registered app control path, run inspect by itself first, then use the inspected name, automationId, or controlType in a second run; do not combine inspect with generic setValue/click actions in the same approval payload. Inspect once when discovery is needed, then move to concrete setValue/invoke/click/sendKeys/focusWindow actions when the user names visible controls and values or an earlier turn already inspected the target; do not repeat inspect-only approvals as the next step for the same requested desktop action. If the platform cannot provide a desktop backend, report that concrete blocker instead of pretending the action ran."
  },
  {
    id: "agent.artifact",
    family: "app_automation",
    description: "For natural requests to generate, continue, repair, apply, inspect, benchmark, or restore Agent-owned rich artifacts.",
    sampleUserRequests: [
      "대시보드 아티팩트를 만들어서 적용해줘",
      "방금 만든 에이전트 아티팩트 상태와 표시 가능 여부를 확인해"
    ],
    slots: ["prompt", "provider", "surface", "mode", "requestId", "filePath", "expectedComponents", "qualityLogAction"],
    execute: { path: "xd.agent.artifacts.generate", approved: false },
    alternativePaths: [
      "xd.agent.artifacts.status",
      "xd.agent.artifacts.cancel",
      "xd.agent.artifacts.apply",
      "xd.agent.artifacts.visibility",
      "xd.agent.artifacts.qualityLog.list",
      "xd.agent.artifacts.qualityLog.export",
      "xd.agent.artifacts.qualityLog.import",
      "xd.agent.artifacts.qualityLog.clear",
      "xd.agent.artifacts.qualityLog.applyEntry",
      "xd.agent.artifacts.providers.benchmark.run",
      "xd.agent.artifacts.providers.health"
    ],
    readbackPaths: [
      "xd.agent.artifacts.status",
      "xd.agent.artifacts.visibility",
      "xd.agent.artifacts.qualityLog.list",
      "xd.agent.artifacts.providers.health"
    ],
    guidance: "Use Agent-owned artifact CR paths for artifact lifecycle work. Keep this separate from Gowoori compatibility surfaces: do not call xd.gowoori.* for new Agent artifact requests unless the user explicitly asks for legacy Gowoori diagnostics. Generate through xd.agent.artifacts.generate with a real approval record when needed; if it returns pending approval, stop this provider turn with generic approval-needed product language. If the user asks to start work that may be cancelled later, generate with background=true so the returned request stays queued/running and can be cancelled. For natural cancel requests, call xd.agent.artifacts.cancel with the requestId, then read xd.agent.artifacts.status and report cancelled state without inventing success. Use xd.agent.artifacts.apply to write or open the generated source, and use visibility or qualityLog readback for verification after immediate execution or in a later verification turn after approval execution. For natural quality log restore/import requests, call xd.agent.artifacts.qualityLog.import with approved=false; if pending approval is returned, stop this provider turn, and verify with xd.agent.artifacts.qualityLog.list or export readback only after the action has executed. When restoring one saved entry, call xd.agent.artifacts.qualityLog.applyEntry with approved=false; if pending approval is returned, stop this provider turn, and read status, visibility, or qualityLog list only after execution. For bounded provider comparison or benchmark requests, call xd.agent.artifacts.providers.benchmark.run with approved=false using the requested providers and cases; if pending approval is returned, stop this provider turn, and read provider health or benchmark output only after execution. Use xd.agent.artifacts.providers.health for read-only provider availability questions. Only call xd.agent.artifacts.qualityLog.clear with approved=false when the user explicitly asks to clear the Agent artifact quality log; include confirm: \"clear-agent-artifact-quality-log\"; if pending approval is returned, stop this provider turn, and verify with qualityLog list readback only after execution."
  },
  {
    id: "multi_step.control",
    family: "multi_step",
    description: "For multi-step Desk control requests that combine terminal, browser, files, layout, or explorer actions in one user request.",
    sampleUserRequests: [
      "터미널 열고 브라우저도 열고 오른쪽에 배치해",
      "문서 열고 브라우저를 왼쪽으로 배치한 뒤 상태 확인해"
    ],
    slots: ["steps", "dependencies", "readback", "placementAnchor"],
    execute: { path: "xd.app.status" },
    alternativePaths: [
      "xd.terminals.run",
      "xd.panes.browser.open",
      "xd.files.open",
      "xd.views.open",
      "xd.dock.window.arrange",
      "xd.dock.pane.arrange"
    ],
    readbackPaths: [
      "xd.app.status",
      "xd.dock.panes.list",
      "xd.files.listOpen",
      "xd.terminals.list",
      "xd.panes.browser.list"
    ],
    placementStrategy: DOCUMENT_AREA_PLACEMENT_STRATEGY,
    guidance: "For multi-step Desk control requests, issue every required CR call instead of stopping after the first action. If one call needs approval, let Desk create the real approval record and continue with remaining independent approval requests when possible."
  }
] as const;

export function formatDeskNaturalIntentCatalogForPrompt(options: DeskNaturalIntentPromptOptions): string {
  const lines = [
    "Capability family intent catalog:",
    "Map the user's natural language request to these capability families and slots. Do not require the user to mention internal paths.",
    APP_AUTOMATION_STRATEGY
  ];

  for (const intent of DESK_NATURAL_INTENT_CATALOG) {
    const approvedText = intent.execute.approved === false ? " approved=false" : "";
    lines.push(
      `- ${intent.id} (${intent.family}): ${intent.description}`,
      `  examples: ${intent.sampleUserRequests.join(" | ")}`,
      `  slots: ${intent.slots.length ? intent.slots.join(", ") : "none"}`,
      `  execute: ${options.callTool} path=${intent.execute.path}${approvedText}`,
      `  alternatives: ${intent.alternativePaths.join(", ") || "none"}`,
      `  readback: ${intent.readbackPaths.join(", ") || "none"}`,
      ...(intent.placementStrategy ? [`  placement: ${intent.placementStrategy}`] : []),
      ...(intent.modeStrategy ? [`  mode: ${intent.modeStrategy}`] : []),
      `  rule: ${intent.guidance}`
    );
  }

  return lines.join("\n");
}
