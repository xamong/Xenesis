---
type: api
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
depends_on:
  - "[[Final Goal]]"
  - "[[module-mcp-bridge]]"
  - "[[capability-index]]"
  - "[[capability-high-risk-paths]]"
verified_by:
  - "[[test-capability-audit]]"
touches:
  - "mcp/xenesis-desk-mcp-server.mjs"
---

# mcp-tool-index

## Purpose

Indexes MCP tool exposure for Xenesis Desk and maps it back to CR behavior.

## Role In Final Goal

The MCP bridge lets external agents use the same CR-first Desk control surface
instead of provider-specific shortcuts. MCP tools should discover, describe, and
call CR paths rather than duplicating Desk behavior.

## Source Files

| Source | Role |
|---|---|
| `mcp/xenesis-desk-mcp-server.mjs` | MCP server, tool schemas, JSON-RPC handling, bridge HTTP calls, and CR wrapper tools. |
| `src/shared/deskBridgeCapabilities.ts` | Registry source reached through MCP CR wrapper tools. |
| `docs/capability-registry.md` | MCP usage policy for CR callers. |

## CR Wrapper Tools

| MCP Tool | Role |
|---|---|
| `xenesis_desk_capabilities` | List the full registry tree. |
| `xenesis_desk_capability` | Describe one registry node by path. |
| `xenesis_desk_call_capability` | Call one registered path with args and approval metadata. |

## Legacy Convenience Tools

Convenience tools such as `xenesis_desk_terminal_run`,
`xenesis_desk_terminal_stop`, `xenesis_desk_preview_text_file_write`,
`xenesis_desk_apply_text_file_write`, and `xenesis_desk_restore_text_file_backup`
must stay mapped to equivalent CR behavior or be documented as transitional.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-mcp-bridge]]
- Depends on [[capability-index]]
- Depends on [[capability-high-risk-paths]]
- Verified by [[test-capability-audit]]
- Touches `mcp/xenesis-desk-mcp-server.mjs`
