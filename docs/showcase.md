# Xenesis Desk Showcase

This document is the short, shareable version of what Xenesis Desk can demonstrate. It is written for launch posts, demos, and first-time GitHub visitors.

## AI agents work in a real desktop

Xenesis Desk is not just a chat window around an LLM. It gives agents a desktop they can operate:

- open panes
- run terminals
- inspect files
- call MCP tools
- trigger workflows
- request approvals
- render live UI

The key difference is that every controllable feature is exposed through the same Capability Registry. Native Xenesis tools, MCP clients, provider skills, and workflow actions all call the same `xd.*` contract.

## Gowoori: Answers That Become UI

Gowoori turns LLM output into rendered UI. An agent can answer with Markdown that contains XCON/SKETCH fences, and Xenesis Desk renders the result as a live dashboard instead of a code block.

Demo shape:

1. Ask an agent to summarize a situation as a dashboard.
2. The agent emits fixture data, transformation chains, and an `xcon-sketch` layout.
3. The chat renders charts, tables, maps, network diagrams, and panels in real time.
4. The same data can be updated without rebuilding the UI.

This makes the dashboard the agent's response, not a prebuilt screen.

## Remote CLI control

Xenesis Gateway and terminal automation let a user operate terminal agents such as Codex or Claude Code from external channels.

Demo shape:

1. Start a CLI agent in a Xenesis Desk terminal.
2. Subscribe to the terminal stream from a gateway channel.
3. Watch filtered agent output instead of raw terminal noise.
4. Approve safe prompts or block dangerous commands through the safety layer.

The useful part is not just remote shell access. The useful part is a controlled, filtered, approval-aware channel into an agent that is already working inside Desk.

## Capability Registry

The Capability Registry is the shared control plane. Paths such as `xd.terminals.run`, `xd.files.open`, `xd.capture.pane`, and `xd.gowoori.*` are discoverable, schema-backed operations that can be called by:

- Xenesis native runtime
- MCP clients
- local CLI skills
- workflow runner
- extension commands
- approval UI

This is what lets many agents share the same workbench without each integration inventing its own bridge.

## Provider Installers

Settings > AI Provider installs curated integration assets for local agent clients and Hermes. Public packages do not ship the full development `providers/` tree; they ship the runtime subset under `provider-assets/**`.

Useful demos:

- install a Codex or Claude MCP/Skill profile
- install the Hermes Plug-in pair
- verify that the provider can call `xenesis_desk_state`
- call a Desk capability from an external agent

## Public Checks

These commands are useful when preparing a public demo or release check from the committed source tree:

```bash
npm run dev
npm run check:docs-public
npm run check:public-release:ci
```

For a development bridge sanity check while the app is running:

```bash
node scripts/xd.mjs --dev state
node scripts/xd.mjs --dev capabilities
node scripts/xd.mjs --dev call xd.app.status
```

For packaged runtime checks:

```bash
npm run pack:win
```
