# Xenesis Desk Capability Registry

This document is the maintenance guide for the Xenesis Desk Capability Registry.

The goal is to expose every controllable Xenesis Desk feature through a stable tree path such as `xd.files.open`, `xd.terminals.run`, or `xd.capture.pane`. The registry is the shared contract used by the MCP bridge, Gowoori agent tools, workflow tools, approval UI, and future automation surfaces.

## Source Of Truth

- Registry tree: `src/shared/deskBridgeCapabilities.ts`
- Main process adapter wiring: `src/main/index.ts`
- MCP bridge tools: `mcp/xenesis-desk-mcp-server.mjs`
- Registry tests: `scripts/mcpBridge.test.mjs`, `scripts/capabilityCoverageAudit.test.mjs`
- Generated inventory: `docs/capability-registry-list.md`
- Local generated audit: development-only capability coverage output

The registry currently contains broad Xenesis Desk coverage across callable methods, event nodes, static feature namespaces, and dynamic runtime overlays. At the current alpha scale, the public inventory is in the 650+ node and 390+ callable method range, with event nodes and runtime overlays continuing to grow.

For the generated full registry inventory, see `docs/capability-registry-list.md`.
Regenerate it with `npm run docs:capabilities` from the `xenesis-desk` project root.

For coverage verification, regenerate the audit with:

```powershell
npm run docs:capabilities:audit
```

The audit runs with Phase 5 capability visibility enabled so staged XamongCode coverage is included. It should always report zero missing registered paths, zero missing dispatched coverage paths, zero undispatched static callable methods, and zero dispatcher paths missing from the tree. Any nonzero entry in those sections is actionable wiring backlog.

## Product Namespaces

CR paths should expose stable product concepts first and implementation/service details second.

- `xd.gowoori.*`: Gowoori artifact viewer and GowooriChat generation control.
- `xd.xenesis.*`: Xenesis agent and gateway control surface for Xenesis Desk orchestration.
- `xd.services.*`: local runtime service lifecycle, including implementation-level service controls.

`xd.services.xenesis.*` remains available for the sidecar lifecycle surface. New Xenesis-facing automation should prefer the product namespace:

```ts
await deskBridge.get('xd.xenesis.status');
await deskBridge.call('xd.xenesis.gateway.start', {}, { approved: true });
await deskBridge.call('xd.xenesis.workspace.set', { path: '<workspace-path>' }, { approved: true });
await deskBridge.call('xd.xenesis.runs.start', { prompt: 'Create a project brief', workflow: 'xenis' }, { approved: true });
await deskBridge.call('xd.xenesis.runs.cancel', {}, { approved: true });
await deskBridge.call('xd.xenesis.sessions.reset', {}, { approved: true });
```

`xd.xenesis.runs.start` also accepts per-run Xenesis runtime overrides. These fields are different from smoke-script provider profiles such as `byok`, `codex-cli`, or `claude-cli`.

```ts
await deskBridge.call(
  'xd.xenesis.runs.start',
  {
    prompt: 'Create a compact report and include the requested artifact.',
    workflow: 'xenis',
    provider: 'mock',
    model: 'desk-mock',
    providerProfile: 'cr-provider-override',
    baseURL: 'http://127.0.0.1:11434/v1',
    apiKeyEnv: 'XENESIS_API_KEY',
  },
  { approved: true },
);
```

Supported runtime provider names currently include `openai`, `mock`, `anthropic`, `claude`, `openai-compatible`, `gemini`, `ollama`, `openrouter`, `groq`, `deepseek`, `mistral`, and `xai`.

## Development Bridge Smoke

Development Xenesis Desk exposes its local bridge through the dev home state file, normally `%USERPROFILE%\.xenis-dev\mcp\bridge.json`, with the bridge URL on port `3848`. Other Codex or Claude sessions should connect through `mcp/xenesis-desk-mcp-server.mjs` with `XENIS_HOME` set to the dev home, or with `XENIS_MCP_STATE_FILE` pointing at that state file. Do not copy the bridge token into long-lived config because it can rotate.

For a public-source quick check from the `xenesis-desk` project root, use the checked-in `xd` bridge helper:

```powershell
node scripts/xd.mjs --dev state
node scripts/xd.mjs --dev capabilities
node scripts/xd.mjs --dev call xd.app.status
```

This verifies bridge state, capability inventory, and a read-only capability call without relying on maintainer-only smoke runners. Deeper CR smoke suites are kept as local development assets and are not part of the public npm script surface.

## Dynamic Runtime Nodes

The registry supports a static source-of-truth tree plus dynamic runtime overlays. Static paths describe product features, while dynamic overlays describe live instances discovered at call time.

The first supported dynamic overlay is terminal sessions:

- Stable canonical paths use the session id: `xd.terminals.sessions.<termId>.*`.
- Short numeric aliases use the current terminal list order: `xd.terminals.0.*`, `xd.terminals.1.*`, and so on.
- Numeric aliases are convenient for quick automation, but they are volatile. Long-running workflows and external agents should prefer the stable session id form.

Examples:

```ts
await deskBridge.get('xd.terminals.sessions');
await deskBridge.get('xd.terminals.sessions.mcp-terminal-1.cwd');
await deskBridge.get('xd.terminals.sessions.mcp-terminal-1.hostname');
await deskBridge.get('xd.terminals.0.hostname');
await deskBridge.call('xd.terminals.sessions.mcp-terminal-1.tail', { maxBytes: 4096 });
await deskBridge.call('xd.terminals.0.write', { data: 'npm test\r' }, { approved: true });
```

Supported terminal dynamic read properties include `id`, `kind`, `label`, `title`, `detail`, `cwd`, `hostname`, `host`, `shell`, `command`, `pid`, `ownerWindowId`, `mcpCommand`, `scrollbackBytes`, `active`, `fitLocked`, `isAltBuffer`, `lastSentCommand`, `groupId`, `groupName`, `status`, and `connectionStatus`.

Supported terminal dynamic methods are `tail`, `write`, `resize`, `stop`, and `kill`. These are resolved through `xd.terminals.list` and then forwarded to the underlying static terminal adapters with the resolved `id` injected into the call arguments.

The dynamic template nodes are listed as `xd.terminals.sessions.{termId}.*` in `listDeskBridgeCapabilities()` so agents can discover the shape of runtime instances without knowing the active session ids in advance.

The second supported dynamic overlay is live dock panes and open dock contents:

- Pane paths use `xd.dock.panes.<paneId>.*` or the volatile list alias `xd.dock.panes.0.*`.
- Content paths use `xd.dock.contents.<contentId>.*` or the volatile list alias `xd.dock.contents.0.*`.
- Stable ids should be preferred for scripts. Numeric aliases are only for quick inspection.

Examples:

```ts
await deskBridge.get('xd.dock.panes.main.state');
await deskBridge.get('xd.dock.panes.main.contentCount');
await deskBridge.get('xd.dock.contents.gowoori-preview.title');
await deskBridge.call('xd.dock.contents.gowoori-preview.focus', {}, { approved: true });
await deskBridge.call('xd.dock.panes.main.arrange', { mode: 'grid' }, { approved: true });
await deskBridge.call('xd.dock.panes.main.merge', {}, { approved: true });
```

Supported pane read properties include `id`, `state`, `windowState`, `group`, `active`, `activeContentId`, `contents`, `contentIds`, `contentCount`, and `title`.

Supported content read properties include `id`, `title`, `label`, `type`, `kind`, `contentType`, `filePath`, `fileName`, `fileOrigin`, `remoteFilePath`, `paneId`, `windowState`, `active`, and `termId`.

Supported pane methods are `focus`, `close`, `closeAll`, `arrange`, `merge`, and `setArtifactTarget`. Supported content methods are `focus`, `close`, `closeOthers`, `closeRight`, `closeAll`, `arrange`, `merge`, and `setArtifactTarget`. They resolve the live inventory through `xd.dock.panes.list`, then forward to the existing stable dock capabilities.

## Public MCP Tools

The registry is exposed to external agents through these MCP tools:

- `xenesis_desk_capabilities`: list the full registry tree.
- `xenesis_desk_capability`: describe one registry node by path.
- `xenesis_desk_call_capability`: call one registered method path with optional arguments and approval metadata.

Only wired method nodes execute. Group nodes and event nodes are inspectable but not directly callable.

## Renderer Facade API

Renderer code can use the `deskBridge` facade from `src/renderer/deskBridge.ts` when it needs a TR-069-style access pattern over the registry.

```ts
import { deskBridge } from './deskBridge';

deskBridge.describe(path);
deskBridge.get(path);
deskBridge.set(path, value);
deskBridge.call(path, args);
deskBridge.subscribe(path, callback);
deskBridge.query(selector);
```

The facade is intentionally thin. The source of truth remains the capability tree and the existing `callDeskBridgeCapability()` dispatcher.

| API | Purpose | Current behavior |
| --- | --- | --- |
| `describe(path)` | Describe one node. | Returns the registry node or `null`. |
| `list()` | List all nodes. | Returns `listDeskBridgeCapabilities()`. |
| `query(selector)` | Find nodes by text or metadata. | Accepts a string search or selector object with `path`, `pathPrefix`, `kind`, `permission`, `approval`, `callable`, `readable`, `writable`, `subscribable`, `hasSchema`, `text`, and `predicate`. |
| `get(path, options)` | Read a path. | Calls read-only callable methods. For readable groups, collections, properties, or event nodes, returns the node metadata as the result. |
| `set(path, value, options)` | Set or mutate a path. | Only accepts callable `control` and `write` capabilities. The `value` is passed as the capability call args. Use `call()` for `execute` or `danger` paths. |
| `call(path, args, options)` | Execute a capability method. | Delegates to the preload `callCapability` bridge when available, otherwise falls back to the shared dispatcher. |
| `subscribe(path, callback)` | Subscribe to an event node. | Validates that the path is an event node and connects only event paths that have an actual preload event transport. Unwired event nodes throw a clear `Capability event is not wired` error. |

Source-scoped clients are also available through `createDeskBridgeFacade(source)` / `createDeskCapabilityClient(source)`. Gowoori and Workflow integrations should keep using their source-specific helpers so approval and audit metadata stay accurate.

## XD CLI Shortcuts

`scripts/xd.mjs` is a thin CLI over the same Capability Registry. It still supports generic calls:

```powershell
node scripts/xd.mjs capability xd.files.listOpen
node scripts/xd.mjs call xd.terminals.sessions.term-a.tail "{""maxBytes"":128}"
```

For common Xenesis Desk control flows, use the CR-mapped shortcuts:

```powershell
node scripts/xd.mjs --dev window-size qhd
node scripts/xd.mjs --dev dock-size right 620
node scripts/xd.mjs --dev view gowoori tab
node scripts/xd.mjs --dev artifact-target pane:main
node scripts/xd.mjs --dev view gowooriChat right --target-pane main
node scripts/xd.mjs --dev focus content:gowoori-chat
node scripts/xd.mjs --dev arrange grid pane:main
node scripts/xd.mjs --dev merge pane:main
node scripts/xd.mjs --dev close-right content:gowoori-chat
```

Target arguments accept `pane:<paneId>` or `content:<contentId>`. When the prefix is omitted, each command uses its documented default target type.
Use `--dev` or `XENIS_TARGET=dev` for development Xenesis Desk. Targeted mode resolves `XENIS_HOME\mcp\bridge.json` or `%USERPROFILE%\.xenis-dev\mcp\bridge.json` before inherited release bridge environment variables, preventing accidental calls to the packaged app on port `3847`.

## Capability Shape

Each node has a path, label, description, and kind.

- `group`: namespace only.
- `method`: callable operation.
- `event`: subscribable or observable event contract.

Method nodes include an access level:

- `read`: no approval required by default.
- `control`: changes app focus, view state, window state, or service state.
- `write`: writes local or remote state.
- `execute`: runs a command, browser automation, service prompt, or workflow action.
- `danger`: destructive or restart-level operation.

Control, write, execute, and danger calls are approval-gated unless a trusted caller explicitly supplies approval through the capability call flow.

## Top-Level Groups

The registry is organized by stable Xenesis Desk surface area:

- `xd.app`: app and bridge status.
- `xd.workspace`: workspace profile lifecycle.
- `xd.window`: window bounds, sizing, detach, merge, and reattach.
- `xd.updater`: update check, download, and install.
- `xd.services`: internal server and Xenesis sidecars. Phase 5-only XamongCode sidecar capabilities are exposed only when `XENIS_PHASE_5=true` or the matching global setting is enabled.
- `xd.events`: app, terminal, automation, capture, diagnostics, MCP, transfer, updater, window, and service events.
- `xd.localCli`: local CLI agent discovery.
- `xd.dock`: dock focus and close operations.
- `xd.files`: file open, read, save, reveal, safe write, backup, and open-file inventory.
- `xd.fs`: local filesystem list/read/write primitives.
- `xd.remoteFiles`: remote profile file operations.
- `xd.transferQueue`: file transfer queue operations.
- `xd.context`: active context and context action discovery.
- `xd.panels`: extension panel inventory.
- `xd.commands`: command palette discovery and execution.
- `xd.terminals`: terminal list, preview, run, input, resize, tail, stop, and dialogs.
- `xd.automation`: terminal automation, workflow run history, templates, and Playwright worker calls.
- `xd.mcp`: MCP bridge settings, action inbox, and Bot session state.
- `xd.extensions`: extension lifecycle, command listing, and command execution.
- `xd.settings`: settings read/save/import/export and backup restore.
- `xd.secrets`: secret vault state and clearing.
- `xd.processes`: process list and termination.
- `xd.gowoori`: GowooriChat generation and cancellation.
- `xd.capture`: capture overlay, pane capture, data URL save, thumbnails, and deletion.
- `xd.playwright`: direct Playwright snapshot and action runs.
- `xd.xcon`: output-target-agnostic XCON/SKETCH rendering operations.
- `xd.artifacts`: XCON Markdown prompt, validation, creation, and PDF export.
- `xd.diagnostics`: diagnostics state, list, record, clear, reveal, export, and renderer performance trace.
- `xd.audit`: structured Capability Registry audit log list, query, export, and clear operations.
- `xd.control`: multi-agent control lock acquire, release, force-release, and status.
- `xd.meta`: Meta Management tree, code CRUD, attribute schema, instances, snapshots, query, and relations graph.

## Bridge Coverage Metadata

The registry also records how Electron IPC channels, MCP bridge HTTP endpoints, command surfaces, context actions, public preload APIs, renderer UI actions, pane toolbars, menus, and app-shell controls map to capability paths.

- `DESK_BRIDGE_IPC_CAPABILITY_COVERAGE`: command or invoke channels that represent callable behavior.
- `DESK_BRIDGE_IPC_EVENT_COVERAGE`: emitted renderer event channels and dynamic event patterns.
- `DESK_BRIDGE_RENDERER_EVENT_COVERAGE`: renderer `CustomEvent` domain events that are observable automation surface.
- `DESK_BRIDGE_HTTP_CAPABILITY_COVERAGE`: MCP server `callBridge('/...')` HTTP endpoints that represent callable behavior through the local bridge.
- `DESK_BRIDGE_COMMAND_CAPABILITY_COVERAGE`: renderer command palette commands, settings shortcut command IDs, and registered extension command IDs.
- `DESK_BRIDGE_RENDERER_COMMAND_CAPABILITY_COVERAGE`: static renderer command entries that are not discovered through the extension command registry.
- `DESK_BRIDGE_DOCK_CONTENT_CAPABILITY_COVERAGE`: dock content/pane types that can be opened, focused, or controlled.
- `DESK_BRIDGE_EXTENSION_HOST_ACTION_CAPABILITY_COVERAGE`: extension host action payloads dispatched from extension panels.
- `DESK_BRIDGE_SETTINGS_SECTION_CAPABILITY_COVERAGE`: visible settings sections that can be opened directly.
- `DESK_BRIDGE_EXTENSION_TOOL_CAPABILITY_COVERAGE`: built-in extension tool ids and handlers.
- `DESK_BRIDGE_DOCK_ACTION_CAPABILITY_COVERAGE`: dock action payloads that change pane layout, focus, or lifecycle.
- `DESK_BRIDGE_DOCK_TAB_MENU_CAPABILITY_COVERAGE`: dock tab context-menu actions.
- `DESK_BRIDGE_*_MENU_CAPABILITY_COVERAGE`: renderer menu surfaces such as explorer, terminal context menu, favorites, capture, Meta Management, and Demo Timeline.
- `DESK_BRIDGE_*_TOOLBAR_CAPABILITY_COVERAGE`: pane toolbar and status controls such as diagnostics, Markdown, Mermaid, XCON Viewer, document preview, hex, browser, code, image, onboarding, and Command Center.
- `DESK_BRIDGE_APP_TOOLBAR_CAPABILITY_COVERAGE`: top-level application toolbar controls.
- `DESK_BRIDGE_*_DROPDOWN_CAPABILITY_COVERAGE`: app-shell dropdown menu actions such as shell profile selection, window sizing, workspace selection, dock arrange, and tools.
- `DESK_BRIDGE_COMMAND_CENTER_*_CAPABILITY_COVERAGE`: Command Center history, work-block, shortcut, and composer surfaces.
- `DESK_BRIDGE_AUTH_MENU_CAPABILITY_COVERAGE`: temporary auth UI actions.
- `DESK_BRIDGE_UPDATER_BANNER_CAPABILITY_COVERAGE`: updater banner actions.
- `DESK_BRIDGE_APP_MENU_ROLE_CAPABILITY_COVERAGE`: Electron native application menu roles.
- `DESK_BRIDGE_*_ACTION_CAPABILITY_COVERAGE`: renderer action payload unions such as explorer, remote explorer, terminal UI, favorites, and context actions.
- `DESK_BRIDGE_CONTEXT_ACTION_CAPABILITY_COVERAGE`: MCP active-context action kinds returned by `xenesis_desk_context_actions`.
- `DESK_BRIDGE_PRELOAD_API_COVERAGE`: public preload API methods that do not cross IPC but still need an explicit registry decision.

Coverage metadata is intentionally explicit. If an IPC channel, HTTP endpoint, command, context action, or preload method is not meant to be externally callable, mark it as `internal` and include a reason. This keeps the registry honest without exposing renderer-private channels or transport endpoints as public automation APIs.

MCP bridge HTTP endpoints are part of the external control surface because CLI agents reach Xenesis Desk through `mcp/xenesis-desk-mcp-server.mjs`, and some clients may call the Electron main bridge routes directly. Every `callBridge('/...')` path and every authenticated `src/main/index.ts` bridge route must therefore map to a registry method with `httpPathCapabilityPath`, or be explicitly marked internal. The capability registry transport endpoints, such as `/capabilities/list`, `/capabilities/describe`, and `/capabilities/call`, are classified as internal because they are the registry access mechanism rather than product features.

Transport routes that only deliver renderer events or poll an async request may remain internal when the product capability is represented by another method. For example, `/bot/message` is an MCP Bot event ingestion route, while `/gowoori-chat/run-status` is polling support for `xd.gowoori.chat.run`. Routes that create real user-visible work should be exposed as methods; `/action-inbox/request` is represented by `xd.mcp.actionInbox.request` because it records a new review or approval item.

Most public preload API methods are covered through their underlying IPC channel. If a method exposed through `contextBridge.exposeInMainWorld(...)` does not invoke, send, or subscribe to an IPC channel, it must still be listed in `DESK_BRIDGE_PRELOAD_API_COVERAGE` with either a capability path, event path, or internal reason. This prevents local renderer utilities from becoming invisible control surfaces.

Renderer command palette entries, Settings keyboard shortcut IDs, and internal extension manifest commands are treated as public control surface identifiers. The command coverage table maps these IDs to `xd.commands.palette.run` or `xd.extensions.runCommand` unless a command is intentionally internal. Active-context action kinds are also classified so the MCP context menu can be audited against registry paths.

Renderer UI surfaces are also part of the registry maintenance model even when they do not cross IPC. Toolbars, dropdowns, context menus, dock tab menus, status bars, app-shell buttons, Command Center work blocks, and temporary auth/updater UI actions must be classified. If a control only changes local pane state, classify it as `internal` with a concrete reason. If it triggers user-visible behavior that an agent may need to reproduce, map it to a stable capability path or event path.

Dynamic event patterns currently include:

- `terminal:data:*`
- `terminal:exit:*`
- `automation:status:*`
- `automation:event:*`

## Completeness Tests

`npm run test:mcp`, `npm run test:desk-bridge`, and `npm run docs:capabilities:audit` enforce the registry contract.

The registry tests verify:

- Every command IPC channel is classified by capability coverage metadata.
- Every event IPC channel is classified by event coverage metadata.
- Every MCP server `callBridge('/...')` HTTP endpoint is classified by HTTP capability coverage metadata.
- Every Electron main bridge HTTP route handler is classified by HTTP capability coverage metadata.
- Every registered extension command is classified by command coverage metadata.
- Every renderer command palette command is classified by command coverage metadata.
- Every Settings keyboard shortcut command ID is classified by command coverage metadata.
- Every MCP active-context action kind is classified by context action coverage metadata.
- Every public preload API method is backed by a classified IPC channel or an explicit preload API coverage entry.
- Every renderer `CustomEvent` domain event is classified by renderer event coverage metadata.
- Every dock content type and dock action payload is classified by coverage metadata.
- Every extension host action and built-in extension tool id is classified by coverage metadata.
- Every visible settings section is classified by coverage metadata.
- Every renderer menu surface covered by the Desk shell, explorer, terminal, favorites, capture, Meta Management, Demo Timeline, and dock tabs is classified by coverage metadata.
- Every pane toolbar/status surface covered by diagnostics, Markdown, Mermaid, XCON Viewer, document preview, hex, browser, code, image, onboarding, and Command Center is classified by coverage metadata.
- Every application toolbar, dropdown menu, Electron application menu role, Command Center history/work-block/shortcut action, auth menu action, and updater banner action is classified by coverage metadata.
- Every coverage `capabilityPath` exists in the registry tree.
- Every coverage `httpPathCapabilityPath` exists in the registry tree.
- Every coverage `eventPath` exists in the registry tree.
- Every registered method path is dispatched by `callDeskBridgeCapability`.
- Every dispatched path exists in the registry tree.
- Every optional `DeskBridgeCapabilityAdapter` method is reachable through the dispatcher.
- The MCP server exposes list, describe, and call tools for the registry.
- The generated audit confirms that coverage metadata points to registered nodes and callable coverage paths are dispatched.

`npm run typecheck` should also pass after registry edits.

## Adding A Capability

Use this sequence for every new Xenesis Desk feature.

1. Add or reuse a `DeskBridgeCapabilityAdapter` method if the capability needs main process or renderer behavior.
2. Add a `method(...)` or `event(...)` node under the correct registry group in `DESK_BRIDGE_CAPABILITY_TREE`.
3. Wire the method path in `callDeskBridgeCapability`.
4. If the feature has an Electron IPC channel, add it to `DESK_BRIDGE_IPC_CAPABILITY_COVERAGE`.
5. If the feature emits renderer events, add it to `DESK_BRIDGE_IPC_EVENT_COVERAGE`.
6. If the feature is reachable from the MCP server through `callBridge('/...')` or from an Electron main bridge HTTP route, add the HTTP path to `DESK_BRIDGE_HTTP_CAPABILITY_COVERAGE`.
7. If the feature adds a command palette command, extension command, or Settings keyboard shortcut ID, add it to `DESK_BRIDGE_COMMAND_CAPABILITY_COVERAGE`.
8. If the feature adds an active-context action kind for MCP context actions, add it to `DESK_BRIDGE_CONTEXT_ACTION_CAPABILITY_COVERAGE`.
9. If the feature exposes a preload API method without IPC, add it to `DESK_BRIDGE_PRELOAD_API_COVERAGE`.
10. If the feature adds a renderer `CustomEvent`, add it to `DESK_BRIDGE_RENDERER_EVENT_COVERAGE`.
11. If the feature adds dock content types, dock action payloads, extension host action payloads, built-in extension tool ids, or visible settings sections, classify them in the matching `DESK_BRIDGE_*_CAPABILITY_COVERAGE` constant.
12. If the feature adds renderer menu items, dock tab menu actions, pane toolbar/status controls, app toolbar controls, dropdown actions, Electron application menu roles, Command Center actions, auth menu actions, or updater banner actions, classify them in the matching UI-surface coverage constant.
13. If an IPC channel, HTTP endpoint, command, context action, preload method, event, menu action, toolbar action, app-shell action, or renderer payload is internal-only, still classify it as `internal` with a concrete reason.
14. Wire main/preload/renderer adapters only after the path and coverage contract are in place.
15. Run `npm run test:mcp`.
16. Run `npm run test:desk-bridge`.
17. Run `npm run docs:capabilities`.
18. Run `npm run docs:capabilities:audit`.
19. Run `npm run typecheck`.

Do not add a new IPC command, event, MCP bridge HTTP endpoint, command palette item, extension command, context action kind, Settings shortcut command ID, public preload method, renderer menu item, pane toolbar/status control, app toolbar button, dropdown action, dock action, extension host action, settings section, Command Center action, auth action, updater action, or Electron application menu role without a registry decision. Either expose it through a capability/event path or explicitly mark it internal.

## Automation Entry Points

External agents should prefer stable CR entry points over UI-specific commands when they need repeatable Xenesis Desk smoke tests.

- `xd.views.open`: unified view opener for terminal, browser, file, settings, diagnostics, Gowoori, GowooriChat, Xenesis Agent, and extension tools. Supports `placement` and `targetPaneId`.
- `xd.dock.sizes.current` / `xd.dock.sizes.set`: read or resize the left, right, top, and bottom dock regions. Automated Gowoori tests should set the right dock to about `620px` before opening GowooriChat.
- `xd.dock.pane.arrange` / `xd.dock.pane.merge`: arrange or merge the pane group containing a selected `paneId` or `contentId`.
- `xd.dock.window.arrange` / `xd.dock.window.merge`: arrange or merge all tabs in one dock window state such as `document`, `right`, or `bottom`.
- `xd.terminals.runMany`: start multiple visible terminal sessions for layout and terminal stress testing.

These entry points are intended for higher-level scenarios such as "open GowooriChat on the right, set the artifact target, open 10 terminals, arrange the document window as a grid, then merge it back".

## Naming Rules

- Paths are lowercase dot-separated namespaces.
- Use nouns for groups: `xd.terminals`, `xd.capture`, `xd.settings`.
- Use verbs for method leaves: `run`, `stop`, `read`, `save`, `delete`, `clear`.
- Keep public path names stable once external agents can call them.
- Prefer extending an existing group over adding a new top-level group.
- Avoid product-specific temporary names unless the feature is intentionally product-scoped, such as `xd.gowoori`.

## Approval Model

Capability calls preserve the existing Xenesis Desk approval model.

- MCP callers use `xenesis_desk_call_capability`.
- If a call requires approval and `approved` is not true, the bridge returns a structured approval requirement instead of executing.
- Approval requests are routed through the action inbox so the user can inspect the path, source, access level, and arguments.
- Gowoori and Workflow callers use source-scoped capability clients so their requests can be audited separately.

## Current Maintenance Standard

The Capability Registry is now the canonical map for Xenesis Desk automation. New features should be considered incomplete until they have:

- a registry node,
- dispatcher coverage,
- IPC classification where relevant,
- HTTP route classification where relevant,
- command and context-action classification where relevant,
- preload API classification where relevant,
- renderer event, menu, toolbar, dock, app-shell, app menu, and pane-local action classification where relevant,
- approval behavior where relevant,
- and passing MCP registry tests.
