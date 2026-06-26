# Xenesis Desk

[한국어](README.ko.md) | [Community](#community)

Repository: <https://github.com/xamong/xenesis-desk>

> A desktop where AI agents can see, click, type, run terminals, and render live UI while they work.

Most agent products stop at chat. Xenesis Desk gives agents a workbench: a 5-zone desktop with terminals, files, viewers, panels, approvals, MCP tools, and live UI rendering. Claude, Codex, Gemini, Cursor, Copilot, Hermes, and other agents can all control the same Desk through one Capability Registry.

When an agent answers, it does not have to send only text. Through **Gowoori** and **XCON**, the answer can become a live chart, table, map, network diagram, dashboard, or workflow surface streamed directly inside the conversation.

## What Makes It Different

| Idea | What it means |
|---|---|
| Agent workbench | The agent gets terminals, files, panes, viewers, and app control instead of a plain prompt box. |
| Shared control plane | MCP, provider skills, workflows, and the native Xenesis runtime call the same `xd.*` Capability Registry. |
| UI as the answer | LLM output can render as live XCON/Gowoori UI, not just Markdown text or static screenshots. |
| Remote CLI operations | Codex, Claude Code, and other terminal agents can be watched and controlled through gateway channels with safety gates. |
| Data-bound workflows | XCON fixtures, chains, sketches, and workflow actions keep generated dashboards alive as data changes. |

## What To Try First

1. Run the development app with `npm install` and `npm run dev`.
2. Open `Settings > AI Provider` and install a local MCP/Skill profile for a CLI agent.
3. Ask an agent to inspect Desk state through the MCP bridge or `/xd` skill.
4. Generate a Gowoori/XCON dashboard from Markdown and watch it render as UI.

Status: **Early alpha**. Xenesis Desk is already useful for experimentation, demos, and integration work, but the public API, packaging shape, provider installers, and UI workflows are still moving. We are looking for active community participation: try it, break it, open issues, propose demos, improve docs, add provider integrations, and help shape the agent workbench model. **Pull requests are welcome**, especially small focused PRs with clear reproduction steps or release-check coverage.

The source tree intentionally includes the desktop shell, the embedded Xenesis sidecar runtime, MCP bridge assets, sample extensions, and curated provider integration assets.

---

## Key Ideas

### AI agent with a workbench

Xenesis is not a tool for humans — it is an AI agent that owns a workbench. Terminals, file explorers, viewers, and panels are tools the agent uses to get work done.

### Workbench shared with other agents

Any external AI agent can control the same Desk through the Capability Registry (650+ public nodes and 390+ callable methods at the current alpha scale). Connect via MCP, HTTP bridge, or provider skills — Claude, Codex, Gemini, Cursor, Copilot, Hermes, and others all speak the same protocol.

### AI responds with UI, not just text

Gowoori turns LLM output into real rendered UI. The AI writes Markdown with `xcon-sketch` fences, and the viewer renders charts, tables, maps, and dashboards — streaming in real time as tokens arrive, even before the response is complete.

### Data-binding UI automation

XCON separates concerns into four layers:

| Layer | Fence | Role |
|---|---|---|
| **Fixture** | `` ```xcon-chain-fixture `` | Source data (JSON) |
| **Chain** | `` ```xcon-chain as alias `` | Data transformation (SUGAR expressions) |
| **Sketch** | `` ```xcon-sketch `` | UI layout (`$alias` references) |
| **Workflow** | `` ```xcon-workflow `` | Automation actions |

Change the fixture, and the UI updates automatically. The AI designs the dashboard once; Desk keeps it alive.

### Remote CLI control

The Xenesis Gateway + terminal stream filters let you operate Codex or Claude Code from a phone. Stream filters strip CLI chrome (progress spinners, tool calls, internal lines) and extract only the meaningful narrative. A safety layer blocks dangerous commands; an LLM engine auto-responds to safe prompts.

### Dashboards generated on demand

No pre-built dashboards. When a situation arises, the AI generates a dashboard tailored to that exact context — in a NOC, a meeting room, a classroom, or a one-person startup. The dashboard is not an asset; it is the agent's response.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App shell | Electron 41 |
| UI | React 19 + Vite 7 + electron-vite 5 + TypeScript 5.9 |
| Terminal | @xterm/xterm 6 + @lydell/node-pty (ConPTY) |
| Code editor | CodeMirror 6 (react-codemirror) |
| Grid | SpanGrid (Canvas-based high-performance grid) |
| XCON rendering | @xcon-viewer/core + @xcon-viewer/viewer |
| Agent runtime | Xenesis (packages/xenesis) — providers, tools, workflows, sessions, channels |
| MCP | @modelcontextprotocol/sdk (stdio server + HTTP bridge) |
| Internal server | Node.js + Express + better-sqlite3 |
| Packaging | electron-builder 26 (NSIS + portable) |

---

## Project Structure

```
xenesis-desk/
├── src/
│   ├── main/                        Electron main process
│   │   ├── index.ts                 PTY, IPC, MCP bridge, services
│   │   └── automation/              Terminal automation engine
│   │       ├── automationController.ts  Stream monitor + auto-input
│   │       ├── streamFilters/       CLI-specific filters (codex, claude, gemini)
│   │       ├── llmEngine.ts         LLM-based safe auto-response
│   │       └── safety.ts            Dangerous command detection
│   ├── preload/                     Electron contextBridge
│   ├── shared/
│   │   ├── types.ts                 Shared IPC types
│   │   └── deskBridgeCapabilities.ts  Capability Registry (650+ public nodes)
│   └── renderer/
│       ├── App.tsx                  Root component
│       ├── dock/                    5-zone docking engine
│       ├── terminal/                xterm host + command store
│       ├── markdown/                Streaming XCON Markdown renderer
│       ├── panes/                   Built-in panes (16 types)
│       └── extensions/
│           ├── xenesis-desk.core-tools/    AI chat, Xenesis Agent, Bot,
│           │                               Capability Explorer, Hermes panels
│           ├── xenesis-desk.data-tools/    Meta management, Query analyzer
│           └── xenesis-desk.workflow-runner/
│               ├── panes/           Workflow Runner, Demo Lab
│               └── gowoori/         AI-to-UI pipeline
│                   ├── agent/       Intent router, prompt packs,
│                   │                artifact pipeline, validation,
│                   │                auto-repair, acceptance gate
│                   ├── chat/        GowooriChat UI
│                   └── viewer/      Artifact preview + global overlay
├── packages/
│   ├── xenesis/                     Xenesis agent runtime
│   │   └── src/
│   │       ├── core/                AgentRunner (turn loop), pipeline, events
│   │       ├── providers/           LLM providers (OpenAI, Anthropic, CLI, mock)
│   │       ├── tools/               50+ agent tools (file, shell, browser,
│   │       │                        desk bridge, search, diagnostics...)
│   │       ├── channels/            Telegram, Discord, Slack, webhook adapters
│   │       ├── gateway/             HTTP gateway server + dashboard
│   │       ├── orchestration/       Task scheduler, worker, agent tasks
│   │       ├── workflows/           Workflow engine + policy
│   │       ├── extensions/          Memory, subagents, skills, plugins, MCP
│   │       ├── sessions/            JSONL session recording
│   │       └── evaluation/          Capability eval + feedback loop
│   └── xenesis-agent-core/          Embedded runtime bridge for Desk
├── extensions/                      Sample extension manifests (plugin.json + main.js)
│   └── sample.*/                    Sample extensions for developers
├── mcp/
│   ├── xenesis-desk-mcp-server.mjs  MCP stdio server
│   ├── xenesis-desk-file-safety.mjs Safe file write (preview/apply/restore)
│   ├── playwright-worker.mjs        Playwright screenshot/action worker
│   └── prompts/                     XCON generation prompt packs
├── providers/                       Provider integration assets
│   ├── shared/skills/xd/            /xd skill template (source of truth)
│   ├── claude/codex/cursor/...      Generated skill files (11 CLI agents)
│   └── hermes/plugins/              Hermes plug-ins + Xenesis gateway simulator
├── server/                          Built-in SQLite API server
└── scripts/                         Dev, build, release, and registry helper scripts
```

---

## Getting Started

### Requirements

| Item | Requirement |
|---|---|
| OS | Windows 10 1809+ / Windows 11 / macOS / Linux |
| Node.js | 22.12 or later |
| npm | 10 or later |
| C++ build tools | Required for `better-sqlite3` (Visual Studio Build Tools 2022 on Windows) |

### Development

```bash
npm install
npm run dev
```

Or use the platform script that also starts the internal SQLite server:

```powershell
# Windows
npm run dev

# The script handles npm install, server setup,
# native module rebuild, and electron-vite dev.
```

### Build

```bash
npm run build                  # typecheck + production build
npm run pack:win               # Windows unpacked build
npm run dist:win               # Windows installer (NSIS + portable)
npm run dist:mac               # macOS build (dmg + zip)
npm run check:docs-public      # scan public docs for local paths and token patterns
npm run check:public-release   # public source boundary check
npm run check:public-release:ci
```

---

## Documentation Map

| Topic | Document |
|---|---|
| Full user manual | [docs/user-manual.md](docs/user-manual.md) |
| Public English manual | [docs/manual/README.md](docs/manual/README.md) |
| MCP setup and tools | [docs/mcp-integration.md](docs/mcp-integration.md), [docs/mcp-capabilities.md](docs/mcp-capabilities.md) |
| Capability Registry contract | [docs/capability-registry.md](docs/capability-registry.md), [docs/capability-registry-list.md](docs/capability-registry-list.md) |
| Provider and bot integration | [docs/xenesis-bot-hermes-setup.md](docs/xenesis-bot-hermes-setup.md) |
| Release and packaging | [docs/deployment-and-update.md](docs/deployment-and-update.md), [docs/release-build-and-github-release.md](docs/release-build-and-github-release.md), [docs/macos-install.md](docs/macos-install.md) |

## Script Layout

Committed root scripts under `scripts/` are for app startup, packaging, provider sync, capability docs, public release checks, and runtime bridge helpers. Maintainer-only smoke tests and guided demo runners are intentionally kept out of the public npm script surface, so `package.json` should not depend on ignored local test or demo folders.

---

## Capability Registry

Every controllable feature in Xenesis Desk is exposed through a stable tree path like `xd.terminals.run`, `xd.files.open`, or `xd.capture.pane`.

The registry is the shared contract used by the MCP bridge, agent tools, workflow runner, approval UI, CLI shortcuts, and external agents.

```ts
// Describe a capability
await deskBridge.describe('xd.terminals.run');

// Call a capability
await deskBridge.call('xd.terminals.run', {
  command: 'npm test',
  shell: 'powershell'
}, { approved: true });

// Query capabilities
await deskBridge.query({ kind: 'method', permission: 'read' });
```

Top-level namespaces include `xd.app`, `xd.workspace`, `xd.window`, `xd.dock`, `xd.terminals`, `xd.files`, `xd.fs`, `xd.remoteFiles`, `xd.extensions`, `xd.settings`, `xd.capture`, `xd.diagnostics`, `xd.mcp`, `xd.gowoori`, `xd.xenesis`, `xd.services`, `xd.automation`, `xd.artifacts`, `xd.playwright`, `xd.xcon`, `xd.audit`, `xd.control`, and `xd.meta`.

---

## MCP Integration

The bundled MCP server exposes the Desk control tools to external AI agents:

```json
{
  "mcpServers": {
    "xenesis-desk": {
      "command": "node",
      "args": ["path/to/mcp/xenesis-desk-mcp-server.mjs"]
    }
  }
}
```

Tools include `xenesis_desk_state`, `xenesis_desk_terminal_run`, `xenesis_desk_call_capability`, `xenesis_desk_playwright_snapshot`, `xenesis_desk_create_xcon_markdown`, and more.

The server also exposes XCON generation prompts as MCP resources and prompt templates.

---

## XCON Viewer Integration

Any LLM provider can render UI in its chat by connecting `@xcon-viewer/core` and `@xcon-viewer/viewer`:

```js
import { parseBySyntax } from '@xcon-viewer/core';
import { render, viewerCss } from '@xcon-viewer/viewer';
```

When the Markdown renderer encounters an `xcon-sketch` fence, render it as a live UI component instead of a code block. Streaming rendering is supported — the UI builds progressively as tokens arrive.

---

## Provider Skills

The `providers/` folder packages Xenesis Desk integration for 11 CLI agents and Hermes/Xenesis gateway development:

| Provider | Integration |
|---|---|
| Claude Code, Codex, Cursor, Gemini, GitHub Copilot, Kimi, OpenCode, Pi, Qoder, Qwen, Devin | Generated skill files (`/xd` slash command) |
| Hermes | Python plug-ins (`xenesis_desk_gateway` + `xenesis_desk_bot` platform adapter) |
| Xenesis Gateway E2E | Local browser simulator for Telegram, Discord, Slack, and Xenesis Bot flows |

All providers control the same Desk through the same Capability Registry.

Installed public builds do not ship the full `providers/` development tree. Settings > AI Provider installs only the curated runtime assets packaged under `provider-assets/**`: the Hermes Plug-in pair and the shared Xenesis Desk MCP/Skill template for local CLI clients.

## Settings Surfaces

Xenesis Desk separates native Desk agent settings from external provider settings:

- **Settings > Xenesis Agent**: native Xenesis Agent runtime, managed gateway, external bot channels, and Gowoori agent tool settings.
- **Settings > AI Provider**: Hermes Plug-in installer, Local CLI MCP and Skill installer, and BYOK provider profiles. Phase 5 XamongCode surfaces are hidden unless `XENIS_PHASE_5=true` or the matching global setting is enabled.

---

## Terminal Automation

The automation engine monitors terminal output streams and provides intelligent auto-response:

- **Stream filters** for Codex, Claude Code, and Gemini strip internal progress lines and extract meaningful narrative
- **Safety layer** blocks dangerous patterns (`rm -rf`, `drop database`, credential access)
- **LLM engine** auto-responds to safe prompts (y/n confirmations, option selection)
- **Regex and state-machine engines** for rule-based automation

Combined with the Xenesis Gateway and channel adapters (Telegram, Discord, Slack), this enables mobile-quality remote control of CLI agents. External channels only receive terminal stream data after a channel explicitly runs `/desk watch`; unfiltered stream mode is kept local/e2e-only to avoid noisy or unsafe outbound bot traffic.

---

## Extensions

Extensions use a two-layer architecture:

- **Main process**: `plugin.json` manifest + `main.js` with `exports.activate(api)` for command registration
- **Renderer process**: `renderer.tsx` implementing `RendererExtensionContribution` for React panel UI

Built-in extensions:

| Extension | Panels |
|---|---|
| `xenesis-desk.core-tools` | Xenesis Agent, Xenesis Bot, AI Workbench, Artifact Library, Terminal Inspector, Process Viewer, Remote Sync Planner, Safe File Edit Center, Run Task Panel, Capability Explorer, Hermes panels, Activity Timeline, Network Monitor, Audit Log, Agent Performance, XApp Preview, and Phase 5 XamongCode (20 command ids; XamongCode hidden by default) |
| `xenesis-desk.data-tools` | Meta Management, Query Analyzer, SQLite Server Settings (4 commands) |
| `xenesis-desk.workflow-runner` | Workflow Runner, Demo Lab Player/Maker, Gowoori, GowooriChat, Alert Rules, Template Catalog, Artifact Versions (8 commands) |

Sample extensions (`sample.*`) demonstrate the extension API for third-party developers.

---

## Security

- Renderer runs in sandbox (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`)
- All IPC goes through `contextBridge` with validated payloads
- Capability calls from external sources require approval for `control`, `write`, `execute`, and `danger` operations
- Terminal automation blocks dangerous commands before auto-input
- AI API keys and bot tokens are stored locally through the settings/Secret Vault flow or referenced by environment variable names; secret values are never written into profiles
- Content-Security-Policy: `script-src 'self'`

---

## Community

- Contributing guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security policy: [SECURITY.md](SECURITY.md)
- Support routes: [SUPPORT.md](SUPPORT.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Issues: <https://github.com/xamong/xenesis-desk/issues>
- Discussions: <https://github.com/xamong/xenesis-desk/discussions>

---

## License

[MIT](LICENSE)
