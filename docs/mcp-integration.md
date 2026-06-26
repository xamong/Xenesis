# Xenesis Desk MCP Integration

Xenesis Desk exposes a local MCP stdio server so Codex, Claude Code, Hermes, and other MCP-capable CLI agents can call Desk actions.

## Architecture

- MCP server: `mcp/xenesis-desk-mcp-server.mjs`
- Electron bridge: `http://127.0.0.1:<port>`
- Renderer handoff: `mcp:open-file` IPC event reuses the existing file opener.

The MCP server writes files itself, then calls the local Electron bridge when a file should be opened in Xenesis Desk. The bridge is localhost-only and requires a per-run token. Xenesis Desk writes the current bridge URL and token to `XENIS_HOME/mcp/bridge.json`, or `${HOME}/.xenis/mcp/bridge.json` when `XENIS_HOME` is not set.

Default bridge ports:

- Packaged/release Xenesis Desk starts the bridge on `127.0.0.1:3847`.
- `npm run dev` starts the bridge on `127.0.0.1:3848`.
- If the preferred port is already in use, Xenesis Desk keeps the existing fallback behavior and binds to an available random port. The effective URL is always written to `bridge.json`.

## Capability Summary

See `docs/mcp-capabilities.md` for the current full tool/resource/prompt capability list.

For the Xenesis Bot Hermes Gateway setup, including `/bot/*` bridge endpoints, `XENIS_BOT_*` variables, and run order, see `docs/xenesis-bot-hermes-setup.md`.

## Tools

`xenesis_desk_get_xcon_prompt`

Returns XCON/SKETCH generation guidance assembled from the bundled prompt files in `mcp/prompts`.

Arguments:

- `kind`: `sketch-ui`, `strict-sketch`, `markdown-xcon`, `dashboard-workflow`, `family-template`, `review-repair`, `chat-artifact`, `chain`, `workflow`, or `template-lab`
- `task`: optional task hint, for example `dashboard`
- `brief`: concrete user request
- `audience`: optional target reader or operator

Use this tool before asking the model to generate a full XCON/SKETCH artifact when the MCP client does not support MCP prompts directly.

`xenesis_desk_validate_xcon_markdown`

Validates Markdown that contains renderable `xcon-sketch` fences.

Arguments:

- `content`: complete Markdown content, required

The validator checks that at least one `xcon-sketch` fence exists, every renderable fence starts with `screen`, and each SKETCH block parses through `@xcon-viewer/core`.

`xenesis_desk_create_xcon_markdown_from_content`

Saves complete LLM-generated Markdown content exactly as provided, validates its XCON/SKETCH fences, and optionally opens it in Xenesis Desk.

Arguments:

- `content`: complete Markdown content, required
- `title`: optional document title
- `workspaceDir`: output directory. Defaults to `XENIS_HOME/exports`; relative paths resolve under that exports directory.
- `outDir`: alias for `workspaceDir`, used by some mobile/Hermes callers. Relative paths resolve under `XENIS_HOME/exports`.
- `fileName`: optional Markdown file name
- `placement`: optional dock placement when opening the generated file. Use `tab`, `left`, `right`, `top`, or `bottom`.
- `streaming`: optional visual streaming render effect
- `streamingIntervalMs`, `streamingChunkSize`, `streamingInitialDelayMs`: optional streaming controls
- `openInDesk`: default `true`

`xenesis_desk_create_xcon_markdown`

Creates a Markdown file containing an `xcon-sketch` fence and optionally opens it in Xenesis Desk.

Arguments:

- `prompt`: user intent, required
- `title`: optional Markdown title
- `workspaceDir`: output directory. Defaults to `XENIS_HOME/exports`; relative paths resolve under that exports directory.
- `outDir`: alias for `workspaceDir`, used by some mobile/Hermes callers. Relative paths resolve under `XENIS_HOME/exports`.
- `fileName`: optional Markdown file name
- `mode`: `view`, `code`, or `both`, default `view`. Use `both` only when the user asks to see the rendered UI and source together.
- `placement`: optional dock placement when opening the generated file. Use `tab`, `left`, `right`, `top`, or `bottom`.
- `streaming`: optional visual streaming render effect
- `streamingIntervalMs`, `streamingChunkSize`, `streamingInitialDelayMs`: optional streaming controls
- `openInDesk`: default `true`

`xenesis_desk_open_file`

Opens an existing local file in Xenesis Desk.

Arguments:

- `filePath`: absolute local file path, required
- `placement`: optional dock placement when opening the file. Use `tab`, `left`, `right`, `top`, or `bottom`.
- `streaming`: optional visual streaming render effect

`xenesis_desk_playwright_snapshot`

Capture a webpage screenshot using Playwright and return the artifact path. The browser automation runs in `mcp/playwright-worker.mjs`, so the MCP server stays focused on stdio, validation, and Xenesis Desk bridge handoff.

Arguments:

- `url`: absolute target URL, required
- `selector`: optional CSS selector for element-only capture
- `outDir`: optional output directory. Defaults to `XENIS_HOME/captures`; relative paths resolve under `XENIS_HOME/exports`
- `fileName`: optional screenshot file name
- `format`: `png` or `jpeg`, default `png`
- `quality`: JPEG quality (1-100). Ignored for png
- `width`, `height`: optional viewport size
- `timeoutMs`: navigation timeout in ms, default 60000
- `fullPage`: capture full page when no selector is provided
- `headless`: browser headless mode, default true
- `waitForSelector`: wait for selector before capture when selector is set
- `allowedHosts`: optional host allowlist for safety
- `openInDesk`: open resulting screenshot in Xenesis Desk when true
- `placement`: optional dock placement when opening


`xenesis_desk_playwright_run`

Run an ordered Playwright action sequence and optionally save screenshots plus a Playwright `trace.zip` artifact.

Arguments:

- `url`: absolute target URL, required
- `actions`: ordered actions, required. Supported `type` values are `click`, `fill`, `press`, `waitForSelector`, `waitForTimeout`, and `screenshot`
- `outDir`: optional artifact directory. Defaults to `XENIS_HOME/captures`; relative paths resolve under `XENIS_HOME/exports`
- `screenshot`: capture a final screenshot after all actions
- `screenshotSelector`, `screenshotFileName`: optional final screenshot controls
- `trace`: save a Playwright trace zip when true
- `traceFileName`: optional trace zip file name
- `format`, `quality`, `width`, `height`, `timeoutMs`, `fullPage`, `headless`, `allowedHosts`: browser and artifact controls
- `openInDesk`: open the first screenshot artifact in Xenesis Desk when true
- `placement`: optional dock placement when opening

`xenesis_desk_run_extension_command`

Runs a registered Xenesis Desk extension command and dispatches its UI actions to Xenesis Desk.

Arguments:

- `commandId`: extension command id, required
- `panelPlacement`: optional placement override for extension panels opened by the command. Use `tab`, `left`, `right`, `top`, or `bottom`.

Extension authors can also set the default placement directly:

```js
api.openPanel('Inspector', html, { placement: 'right' });
// or
api.openPanel('Inspector', html, 'right');
```

## Prompt Resources

The MCP server exposes the bundled prompt files both as MCP resources and MCP prompt templates.

Resources:

- `xenesis://prompts/shared-xcon-contract`
- `xenesis://prompts/sketch-ui-generation`
- `xenesis://prompts/markdown-xcon-document`
- `xenesis://prompts/xcon-chain-generation`
- `xenesis://prompts/xcon-workflow-generation`
- `xenesis://prompts/family-data-binding-template`
- `xenesis://prompts/monitoring-dashboard-workflow`
- `xenesis://prompts/template-lab-business-document`
- `xenesis://prompts/review-and-repair`
- `xenesis://prompts/chat-artifact-simulation`
- `xenesis://prompts/showcase-component-catalog`
- `xenesis://prompts/auto-layout-layer-recipes`
- `xenesis://prompts/rich-list-xlist-recipes`
- `xenesis://prompts/dashboard-chart-map-network-recipes`
- `xenesis://prompts/family-binding-workflow-recipes`
- `xenesis://prompts/domain-blueprints`
- `xenesis://prompts/strict-generation-profile`

Prompt templates:

- `xcon.sketch-ui`
- `xcon.strict-sketch`
- `xcon.markdown-document`
- `xcon.dashboard-workflow`
- `xcon.family-template`
- `xcon.review-repair`
- `xcon.chat-artifact`

MCP clients that support `prompts/list` and `prompts/get` can load these templates directly. MCP clients that only support tools should call `xenesis_desk_get_xcon_prompt`, then generate content, then call `xenesis_desk_validate_xcon_markdown`, and finally call `xenesis_desk_create_xcon_markdown_from_content`.

For prompt kind selection, strict validation flow, and the golden sample, see `docs/mcp-prompt-usage.md`. For representative prompt quality checks, see `docs/mcp-prompt-quality-matrix.md`. For validation failure recovery, see `docs/mcp-xcon-repair-loop.md`.

## Local CLI Environment

When Terminal Management > Local Shell uses a selected CLI environment and terminal auto-configuration is enabled, new terminal sessions receive:

- `XENIS_MCP_SERVER_COMMAND`
- `XENIS_MCP_SERVER_PATH`
- `XENIS_MCP_SERVER_ARGS`
- `XENIS_MCP_BRIDGE_URL`
- `XENIS_MCP_BRIDGE_TOKEN`
- `XENIS_MCP_STATE_FILE`
- `XENIS_MCP_CONFIG_FILE`
- `XENIS_MCP_CONFIG_SNIPPET`

Use `XENIS_MCP_CONFIG_FILE` or `XENIS_MCP_CONFIG_SNIPPET` as the MCP client config source for tools that can import JSON config snippets.

## Example Prompt

```text
Create an operations dashboard with XCON/SKETCH and open it in Xenesis Desk.
```

The agent should call `xenesis_desk_create_xcon_markdown` with `mode: "both"` when the user wants to see the rendered UI and the source together.

To create an XCON/SKETCH Markdown file and place it next to the active terminal, pass `placement: "right"` to `xenesis_desk_create_xcon_markdown`. To run an extension command and place its panel next to the active terminal, pass `panelPlacement: "right"` to `xenesis_desk_run_extension_command`.
