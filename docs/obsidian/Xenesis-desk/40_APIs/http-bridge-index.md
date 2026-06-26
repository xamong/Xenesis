---
type: api
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
depends_on:
  - "[[module-mcp-bridge]]"
touches:
  - "mcp/xenesis-desk-mcp-server.mjs"
  - "src/main/index.ts"
---

# http-bridge-index

## Purpose

Indexes HTTP bridge surfaces that external tools use to reach Desk behavior.

## Graph Links

- Depends on [[module-mcp-bridge]]
- Touches `mcp/xenesis-desk-mcp-server.mjs`
- Touches `src/main/index.ts`
