# Agent Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the sibling Agent Sessions feature into this repo so Desk can scan local agent transcripts, list/search/pin/hide sessions, open a dedicated Agent Sessions pane, and resume a selected session through CR-controlled terminal execution without touching `packages/xenesis`.

**Architecture:** Add a shared `agentSessions` model, a main-process scanner/cache service, preload IPC API, CR capability group `xd.agentSessions.*`, and a core-tools renderer pane. The service reads known local agent stores from the user's home directory and `XENIS_HOME`, writes only cache/overlay files under `XENIS_HOME/agent-sessions`, and exposes all Desk-control actions through the existing `DeskBridgeCapabilityAdapter`. Renderer UI uses `window.agentSessionsAPI` for direct pane interactions and the Agent pane routes relevant natural-language session prompts to the same CR paths.

**Tech Stack:** Electron, electron-vite, React, TypeScript, Node `node:test` with `tsx`, Xenesis Desk Capability Registry, existing terminal/session IPC.

---

## Source Map

Current repo paths to inspect while implementing:

- `src/shared/types.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/shared/appMenuModel.ts`
- `src/main/index.ts`
- `src/main/extensions/extensionHost.ts`
- `src/preload/index.ts`
- `src/renderer/env.d.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/renderer.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/styles.css`
- `handoff.md`

Sibling reference paths:

- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\shared\agentSessions.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\shared\agentSessions.test.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\shared\agentSessionsCapabilities.test.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\agentSessions\pathUtils.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\agentSessions\jsonl.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\agentSessions\indexStore.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\agentSessions\adapters.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\agentSessions\service.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\agentSessions\*.test.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\agentSessions\terminalLinker.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.core-tools\panes\agentSessionsPanelModel.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.core-tools\panes\AgentSessionsPane.tsx`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentAgentSessions.ts`

Files to create:

- `src/shared/agentSessions.ts`
- `src/shared/agentSessions.test.ts`
- `src/shared/agentSessionsCapabilities.test.ts`
- `src/main/agentSessions/pathUtils.ts`
- `src/main/agentSessions/jsonl.ts`
- `src/main/agentSessions/indexStore.ts`
- `src/main/agentSessions/adapters.ts`
- `src/main/agentSessions/service.ts`
- `src/main/agentSessions/adapters.test.ts`
- `src/main/agentSessions/service.test.ts`
- `src/renderer/agentSessions/terminalLinker.ts`
- `src/renderer/agentSessions/terminalLinker.test.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.test.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/AgentSessionsPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentAgentSessions.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentAgentSessions.test.ts`

Files to edit:

- `src/shared/types.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/shared/appMenuModel.ts`
- `src/main/index.ts`
- `src/main/extensions/extensionHost.ts`
- `src/preload/index.ts`
- `src/renderer/env.d.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/renderer.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/styles.css`
- `handoff.md`

Files to avoid:

- `packages/xenesis/**`
- Generated dependency/build directories

## Behavioral Contract

- `status`, `scan`, `list`, and `search` are read paths and must not require approval.
- `resume`, `attachTerminal`, `pin`, and `hide` are control/write paths and must use existing CR approval semantics.
- Scanners must never modify source transcript files under `.codex`, `.claude`, `.gemini`, or other agent homes.
- Cache and user overlay are stored only under `xenisHomeDir/agent-sessions`.
- Resume opens a terminal through the existing terminal/MCP bridge path with metadata describing source, provider, session ID, project path, and resume command.
- The Agent Sessions pane is a core-tools pane with content type `xd-agent-sessions` and tool id `xenesis-desk.core-tools.agent-sessions`.
- The menu/CR open command id is `xenesis-desk.core-tools.openAgentSessions`.

## Implementation Tasks

### 1. Shared Model And Pure Tests

- [ ] Add failing shared tests in `src/shared/agentSessions.test.ts`.
  - Cover stable IDs: `createAgentSessionId('codex', 'codex-session-1') === 'codex:codex-session-1'`.
  - Cover fallback title compaction: empty Codex title becomes `Codex session 1`.
  - Cover Windows and POSIX project basename derivation.
  - Cover hidden filtering, ranking, sorting, count summaries, and visible subagent metadata detection.
  - Command:
    ```powershell
    node --import tsx --test src/shared/agentSessions.test.ts
    ```
  - Expected red result: module `./agentSessions` cannot be resolved or exported members are missing.

- [ ] Create `src/shared/agentSessions.ts` and make the shared tests pass.
  - Include source IDs from the sibling model:
    `xenesis`, `codex`, `claude`, `gemini`, `cursor`, `opencode`, `hermes`, `pi`, `qwen`, `qoder`, `github-copilot`, `devin`, `kimi`.
  - Export `AgentSessionsApi` so `src/shared/types.ts`, `src/preload/index.ts`, and `src/renderer/env.d.ts` can share one interface.
  - Keep string truncation and date normalization deterministic.
  - Command:
    ```powershell
    node --import tsx --test src/shared/agentSessions.test.ts
    ```
  - Expected green result: all tests in `src/shared/agentSessions.test.ts` pass.

### 2. Main Scanner Primitives

- [ ] Add scanner primitive tests for JSONL tail reading and cache storage.
  - Create focused assertions in new files:
    - `src/main/agentSessions/jsonl.test.ts`
    - `src/main/agentSessions/indexStore.test.ts`
  - Cover malformed JSONL line skipping, partial tail start handling, cache version reset, and overlay persistence.
  - Command:
    ```powershell
    node --import tsx --test src/main/agentSessions/jsonl.test.ts src/main/agentSessions/indexStore.test.ts
    ```
  - Expected red result: modules are missing.

- [ ] Create `pathUtils.ts`, `jsonl.ts`, and `indexStore.ts`.
  - `readJsonlTail(filePath, maxBytes)` returns `{ records, skipped }` without throwing for missing files.
  - `createAgentSessionIndexStore(xenisHomeDir)` exposes `cachePath`, `overlayPath`, `loadCache`, `saveCache`, `loadOverlay`, and `saveOverlay`.
  - Keep cache/overlay version constants exported for tests and diagnostics.
  - Command:
    ```powershell
    node --import tsx --test src/main/agentSessions/jsonl.test.ts src/main/agentSessions/indexStore.test.ts
    ```
  - Expected green result: JSONL and store tests pass.

### 3. Main Adapters And Service

- [ ] Add adapter and service tests.
  - Use temporary home directories with fixture files under `.codex`, `.claude`, `.gemini`, and `.xenis`.
  - Assert `.claude/history.jsonl` and project JSONL files are not modified by scans.
  - Assert current Codex payload-based JSONL events produce session ID, project path, last user prompt, and `codex resume <id>`.
  - Assert malformed records produce diagnostics without throwing.
  - Assert service applies pin/hide overlay and searches cached sessions.
  - Command:
    ```powershell
    node --import tsx --test src/main/agentSessions/adapters.test.ts src/main/agentSessions/service.test.ts
    ```
  - Expected red result: adapter/service modules are missing.

- [ ] Create `adapters.ts` and `service.ts`.
  - Start with sibling scanners for Xenesis, Codex, Claude, and Gemini.
  - Keep unsupported sources in the shared enum but do not create empty scanner adapters for them.
  - `createAgentSessionService({ homeDir, xenisHomeDir, adapters, installedLocalCliAgents })` returns `status`, `scan`, `list`, `search`, `pin`, and `hide`.
  - `scan` updates cache, then applies overlay before returning sessions.
  - Command:
    ```powershell
    node --import tsx --test src/main/agentSessions/adapters.test.ts src/main/agentSessions/service.test.ts
    ```
  - Expected green result: adapter and service tests pass.

### 4. CR Capability Registry Wiring

- [ ] Add failing CR registration/dispatch tests in `src/shared/agentSessionsCapabilities.test.ts`.
  - Assert these paths exist:
    - `xd.agentSessions`
    - `xd.agentSessions.status`
    - `xd.agentSessions.scan`
    - `xd.agentSessions.list`
    - `xd.agentSessions.search`
    - `xd.agentSessions.resume`
    - `xd.agentSessions.attachTerminal`
    - `xd.agentSessions.pin`
    - `xd.agentSessions.hide`
    - `xd.tools.core.agentSessions.open`
  - Assert read paths use `permission: 'read'`.
  - Assert `resume` uses `permission: 'execute'` and `approval: 'when-external'`.
  - Assert `attachTerminal` uses `permission: 'control'`.
  - Assert `pin` and `hide` use `permission: 'write'`.
  - Assert open path dispatches to `runExtensionCommand` with:
    ```ts
    { placement: 'tab', commandId: 'xenesis-desk.core-tools.openAgentSessions' }
    ```
  - Command:
    ```powershell
    node --import tsx --test src/shared/agentSessionsCapabilities.test.ts
    ```
  - Expected red result: paths are not registered.

- [ ] Edit `src/shared/deskBridgeCapabilities.ts`.
  - Extend `DeskBridgeCapabilityAdapter` with:
    ```ts
    agentSessionsStatus?: (args?: unknown) => Promise<unknown> | unknown;
    agentSessionsScan?: (args?: unknown) => Promise<unknown> | unknown;
    agentSessionsList?: (args?: unknown) => Promise<unknown> | unknown;
    agentSessionsSearch?: (args?: unknown) => Promise<unknown> | unknown;
    agentSessionsResume?: (args?: unknown) => Promise<unknown> | unknown;
    agentSessionsAttachTerminal?: (args?: unknown) => Promise<unknown> | unknown;
    agentSessionsPin?: (args?: unknown) => Promise<unknown> | unknown;
    agentSessionsHide?: (args?: unknown) => Promise<unknown> | unknown;
    ```
  - Add the `xd.agentSessions` group near other Agent/terminal-adjacent groups.
  - Add `xd.tools.core.agentSessions.open` alongside core tool open paths.
  - Add dispatch branches that call the adapter methods.
  - Add tool open dispatch using `toolOpenArgs('xenesis-desk.core-tools.openAgentSessions')`.
  - Command:
    ```powershell
    node --import tsx --test src/shared/agentSessionsCapabilities.test.ts
    ```
  - Expected green result: capability registration and dispatch tests pass.

### 5. IPC, Preload, And Main Bridge

- [ ] Edit `src/shared/types.ts` and `src/renderer/env.d.ts`.
  - Re-export/import `AgentSessionsApi` from `src/shared/agentSessions.ts`.
  - Add `agentSessionsAPI?: AgentSessionsApi` to `Window`.
  - Add `xd-agent-sessions` to `DockContentType`.
  - Add `xenesis-desk.core-tools.agent-sessions` to `ExtensionTool`.
  - Keep `LocalCliAgentId` exported where `agentSessions.ts` needs it; avoid introducing a circular runtime import.

- [ ] Edit `src/preload/index.ts`.
  - Import `AgentSessionsApi` and expose:
    ```ts
    const agentSessionsApi: AgentSessionsApi = {
      status: () => ipcRenderer.invoke('agent-sessions:status'),
      scan: (request) => ipcRenderer.invoke('agent-sessions:scan', request),
      list: (request) => ipcRenderer.invoke('agent-sessions:list', request),
      search: (request) => ipcRenderer.invoke('agent-sessions:search', request),
      pin: (request) => ipcRenderer.invoke('agent-sessions:pin', request),
      hide: (request) => ipcRenderer.invoke('agent-sessions:hide', request),
    };
    contextBridge.exposeInMainWorld('agentSessionsAPI', agentSessionsApi);
    ```

- [ ] Edit `src/main/index.ts`.
  - Import `createAgentSessionService`.
  - Create one service using current `xenisHomeDir`, `os.homedir()`, and installed local CLI scan result.
  - Register IPC handlers:
    - `agent-sessions:status`
    - `agent-sessions:scan`
    - `agent-sessions:list`
    - `agent-sessions:search`
    - `agent-sessions:pin`
    - `agent-sessions:hide`
  - Add `DeskBridgeCapabilityAdapter` methods for all Agent Sessions paths.
  - Implement `agentSessionsResume` in main, not in renderer:
    - normalize args with existing capability helpers.
    - choose by `sessionId` or ranked `query`.
    - return `{ ok: false, error: 'Agent session not found.' }` if no match.
    - return preview when `previewOnly === true`.
    - reuse a requested/existing terminal only if present in the main terminal session map.
    - otherwise create a terminal using existing terminal spawn helper with metadata:
      `kind: 'agent-session-resume'`, `agentSessionId`, `agentSessionSource`, `sourceSessionId`, `projectPath`, `resumeCommand`.
  - `agentSessionsAttachTerminal` can initially record a structured ok response only if the current terminal linking model has no persistent link owner; do not claim persistent linking unless overlay links are saved and used.
  - Command:
    ```powershell
    node --import tsx --test src/shared/agentSessionsCapabilities.test.ts src/main/agentSessions/service.test.ts
    ```
  - Expected green result: shared CR dispatch remains green and service tests still pass.

### 6. Renderer Models And Agent Sessions Pane

- [ ] Add renderer pure tests.
  - `src/renderer/agentSessions/terminalLinker.test.ts` covers smart target selection:
    matching idle terminal, unsafe alt-buffer terminal, explicit terminal id, and new terminal fallback.
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.test.ts` covers counts and action state.
  - Command:
    ```powershell
    node --import tsx --test src/renderer/agentSessions/terminalLinker.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.test.ts
    ```
  - Expected red result: modules are missing.

- [ ] Create `terminalLinker.ts` and `agentSessionsPanelModel.ts`.
  - Keep functions pure and independent from React.
  - Import `TerminalHostSessionInfo` only as a type.
  - Command:
    ```powershell
    node --import tsx --test src/renderer/agentSessions/terminalLinker.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.test.ts
    ```
  - Expected green result: renderer pure tests pass.

- [ ] Create `AgentSessionsPane.tsx` and styles.
  - On mount, call `window.agentSessionsAPI.status()` and `list({ includeHidden: false, limit: 100 })`.
  - Provide operator controls: refresh scan, search, source filter, include hidden toggle, pin, hide/unhide, resume preview/run.
  - Resume should call CR first through `window.deskBridgeAPI?.callCapability({ path: 'xd.agentSessions.resume', args, approved: false, source: 'xenesis' })`; render the existing approval flow result if approval is required.
  - Fall back to `window.agentSessionsAPI` only for read/pin/hide pane actions that are explicitly local UI operations.
  - Keep layout dense and consistent with core-tools panes; no landing page.

### 7. Core-Tools Registration And Menu

- [ ] Edit `src/renderer/extensions/xenesis-desk.core-tools/renderer.tsx`.
  - Import `AgentSessionsPane`.
  - Add `TOOL_IDS.agentSessions = 'xenesis-desk.core-tools.agent-sessions'`.
  - Add `agentSessionsContent()` returning content type `xd-agent-sessions`.
  - In `openTool`, focus existing `xd-agent-sessions` or open a new content.
  - In `renderContent`, render `<AgentSessionsPane />` for `xd-agent-sessions`.
  - Add icon label `AS` and include `xd-agent-sessions` in the core-tools content-type allow list.

- [ ] Edit `src/main/extensions/extensionHost.ts`.
  - Add the extension tool id `xenesis-desk.core-tools.agent-sessions` to the internal core-tools set.

- [ ] Edit `src/shared/appMenuModel.ts`.
  - Add command id `xenesis-desk.core-tools.openAgentSessions` in the Tools group near Xenesis Agent Workbench and Action Inbox.
  - Use a short label such as `Agent Sessions` and compact glyph `AS`.

- [ ] Ensure CR open path calls the same command id.
  - Command:
    ```powershell
    node --import tsx --test src/shared/agentSessionsCapabilities.test.ts
    ```
  - Expected green result: `xd.tools.core.agentSessions.open` dispatches to `openAgentSessions`.

### 8. Agent Pane Natural-Language Routing

- [ ] Add `xenesisAgentAgentSessions.test.ts`.
  - Assert these route to Agent Sessions:
    - `Codex 세션 이어서 열어줘`
    - `Claude session list`
    - `agent sessions 검색해줘`
  - Assert explanations and slash commands do not route:
    - `/help`
    - `agent sessions가 뭐야?`
  - Command:
    ```powershell
    node --import tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentAgentSessions.test.ts
    ```
  - Expected red result: helper module is missing.

- [ ] Create `xenesisAgentAgentSessions.ts`.
  - Export:
    - `shouldRouteXenesisInputToAgentSessions(input: string): boolean`
    - `buildAgentSessionCommandFromInput(input: string): { path: string; args: Record<string, unknown>; approved: boolean }`
  - Commands should target `xd.agentSessions.resume`, `xd.agentSessions.list`, or `xd.agentSessions.search`.
  - Use `approved: false` so Desk creates a real approval record when required.

- [ ] Integrate the helper into `XenesisAgentPane.tsx`.
  - Place the route check before generic visual artifact handling and before provider execution.
  - Use existing `window.deskBridgeAPI.callCapability` handling so approval cards stay inline.
  - Do not print internal `actionInboxItem` IDs or raw CR internals in normal chat.
  - Command:
    ```powershell
    node --import tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentAgentSessions.test.ts
    ```
  - Expected green result: routing helper tests pass.

### 9. Verification, Audit, And Commit

- [ ] Run focused tests while iterating:
  ```powershell
  node --import tsx --test src/shared/agentSessions.test.ts src/main/agentSessions/jsonl.test.ts src/main/agentSessions/indexStore.test.ts src/main/agentSessions/adapters.test.ts src/main/agentSessions/service.test.ts src/shared/agentSessionsCapabilities.test.ts src/renderer/agentSessions/terminalLinker.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentAgentSessions.test.ts
  ```
  Expected result: all focused tests pass.

- [ ] Run repo gates:
  ```powershell
  npm run typecheck
  npm run docs:capabilities:audit
  npm test
  npm run build
  ```
  Expected result: typecheck, CR audit, tests, and build pass. If `npm run lint` is still red from known unrelated diagnostics, run a touched-file Biome check and record exact output in `handoff.md`.

- [ ] Verify the CR audit result.
  - Confirm generated audit reports:
    - missing registered paths: 0
    - missing dispatched coverage paths: 0
    - undispatched static callable methods: 0
  - Do not call CR work complete unless these are all 0.

- [ ] Run a live Electron smoke if the implementation touched Agent/CR runtime paths.
  - Launch the app with temporary `XENIS_HOME` and temporary user data.
  - Seed one fake Codex JSONL session under the temporary home if the smoke harness supports a controlled home.
  - Drive one natural-language Agent pane prompt such as `Codex 세션 목록 보여줘`.
  - Confirm the provider footer/work log shows the intended provider and the result came through `xd.agentSessions.*`.
  - Record exact prompt and observed result in `handoff.md`.

- [ ] Update `handoff.md`.
  - Include touched files, commands run, exact verification result, known gaps, and next intended step.

- [ ] Commit the implementation.
  ```powershell
  git status --short
  git add src/shared/agentSessions.ts src/shared/agentSessions.test.ts src/shared/agentSessionsCapabilities.test.ts src/main/agentSessions src/renderer/agentSessions src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.ts src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/AgentSessionsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentAgentSessions.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentAgentSessions.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/shared/appMenuModel.ts src/main/index.ts src/main/extensions/extensionHost.ts src/preload/index.ts src/renderer/env.d.ts src/renderer/extensions/xenesis-desk.core-tools/renderer.tsx src/renderer/extensions/xenesis-desk.core-tools/styles.css handoff.md
  git commit -m "Port Agent Sessions"
  ```

## Final Review Checklist

- [ ] No file under `packages/xenesis` changed.
- [ ] Agent transcript source files are read-only during tests.
- [ ] `xd.agentSessions.*` paths are registered, dispatched, and audited.
- [ ] Resume path uses CR approval semantics and existing terminal creation.
- [ ] Renderer pane can scan, list, search, pin, hide, and request resume.
- [ ] Agent pane natural-language routing does not bypass CR.
- [ ] `handoff.md` contains exact verification evidence.
