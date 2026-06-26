---
type: architecture
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
  - "[[module-capability-registry]]"
---

# MCP Bridge Architecture

## Purpose

Maps external MCP and provider tool access back to the same CR-first control surface.

## Role In Final Goal

The MCP bridge exposes the CR-first control plane to external agents. It should
make external callers use CR discovery and generic CR calls instead of
duplicating Desk-specific tool behavior.

## Source Files

| Source | Role |
|---|---|
| `mcp/xenesis-desk-mcp-server.mjs` | MCP JSON-RPC server, tool schemas, bridge HTTP calls, and CR wrapper tools. |
| `src/shared/deskBridgeCapabilities.ts` | Capability source reached through bridge endpoints. |

## Control Flow

1. MCP client lists or calls a `xenesis_desk_*` tool.
2. CR wrapper tools call `/capabilities/list`, `/capabilities/describe`, or `/capabilities/call`.
3. Electron main bridge resolves the call through the Capability Registry.
4. Result, approval stop, or error returns through MCP.

## Risks

- Convenience MCP tools become separate behavior not backed by CR.
- Raw approval metadata leaks into normal Agent-pane responses.
- Bridge routes are reachable but not mapped to registry behavior.

## Verification

- `npm run docs:capabilities:audit`
- Live Agent pane prompt for MCP/CR tool use after MCP behavior changes.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-mcp-bridge]]
- Depends on [[module-capability-registry]]
- See [[mcp-tool-index]]
