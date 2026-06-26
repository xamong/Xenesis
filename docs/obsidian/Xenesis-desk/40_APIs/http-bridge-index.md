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
  - "[[module-mcp-bridge]]"
touches:
  - "mcp/xenesis-desk-mcp-server.mjs"
  - "src/main/index.ts"
---

# http-bridge-index

## Purpose

Indexes HTTP bridge surfaces that external tools use to reach Desk behavior.

## Role In Final Goal

HTTP bridge routes are external or semi-external control surfaces. Product
behavior routes should map to CR paths, while registry transport routes such as
`/capabilities/list`, `/capabilities/describe`, and `/capabilities/call` are the
registry access mechanism itself.

## Graph Links

- Depends on [[module-mcp-bridge]]
- Touches `mcp/xenesis-desk-mcp-server.mjs`
- Touches `src/main/index.ts`
