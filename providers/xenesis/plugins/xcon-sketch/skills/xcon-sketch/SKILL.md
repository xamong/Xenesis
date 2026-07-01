---
name: xcon-sketch
description: Generate, validate, and save XCON/SKETCH artifacts through the installed Xenesis Desk MCP plugin.
---

# XCON/SKETCH Plugin

Use this skill only when the installed `xcon-sketch` plugin and its MCP tools are available.

## Contract

- Treat XCON/SKETCH support as plugin-provided capability, not as built-in Xenesis Agent knowledge.
- Before generating XCON/SKETCH, call the plugin MCP prompt tool or prompt resource for the requested artifact family.
- Skip validation for inline chat or Workbench responses; stream the Markdown with XCON/SKETCH fences directly.
- Use the plugin MCP validation tool only when the user explicitly asks to save, export, open, validate, or repair an artifact.
- Save or open artifacts through plugin MCP tools only when the user asks for a Desk-visible file or pane.
- If the plugin MCP tools are unavailable, say that the XCON/SKETCH plugin is not installed or not connected instead of inventing a format.

## Tool Naming

The runtime prefixes MCP tools with the plugin server name. Typical tools include:

- `mcp_xcon_sketch_prompt_get`
- `mcp_xcon_sketch_xenesis_desk_get_xcon_prompt`
- `mcp_xcon_sketch_xenesis_desk_validate_xcon_markdown`
- `mcp_xcon_sketch_xenesis_desk_create_xcon_markdown_from_content`
- `mcp_xcon_sketch_xenesis_desk_create_xcon_markdown`

Use `tool_search` if exact tool names differ.

## Generation Flow

1. Choose the artifact family: `workbench-response`, `sketch-ui`, `markdown-xcon`, `chain`, `workflow`, `family-template`, `review-repair`, or another prompt kind exposed by the MCP server.
   - For inline chat or Workbench responses, prefer `workbench-response`.
   - Do not force XCON/SKETCH for simple factual answers, short explanations, code snippets, or ordinary troubleshooting notes.
   - In Workbench, multi-agent, product, tool, or system comparisons should usually include XCON/SKETCH; fetch the `workbench-response` prompt and use Markdown plus visual components such as `spanGrid`, `chart`, or `networkDiagram`.
   - In Workbench, operational status lists with service names, state/severity, latency, owner, priority, incident, SLA, queue, or health data should usually include XCON/SKETCH; use a compact dashboard with summary panels plus `spanGrid` and/or `chart`.
   - For advanced visualizations, the fetched prompt may use `dataViz` with `treemap`, `sankey`, `sunburst`, `chord`, `forceGraph`, or `plot` when that communicates the answer better than a standard chart.
   - Use `markdown-xcon` for document/report artifacts, `dashboard-workflow` for monitoring dashboards, and `strict-sketch` for minimal validation-first screens.
2. Fetch the relevant prompt through MCP.
3. Generate Markdown with complete fenced blocks, such as `xcon-sketch`, `xcon-chain`, `xcon-chain-fixture`, or `xcon-workflow`, only when the fetched prompt asks for them.
4. For inline chat or Workbench responses, return the Markdown directly and rely on the renderer's partial rendering and visible render errors.
5. Validate with the plugin MCP validation tool only when the user wants a file, Desk pane, export, validation, or repair.
6. Save with the plugin MCP create tool only when the user wants a file, Desk pane, or export.

Do not route this work through Gowoori, Xenesis Agent panes, Hermes-specific plugins, or hardcoded Desk behavior. The plugin MCP surface is the source of truth.
