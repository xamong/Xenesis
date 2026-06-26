---
type: repo-overview
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
depends_on:
  - "[[Repo Overview]]"
  - "[[Graph Schema]]"
verified_by:
  - "[[Verification Gates]]"
---

# Source of Truth Map

## Priority Order

1. Git repo source files, tests, generated CR docs, and verification commands
2. Repo-local Obsidian mirror at docs/obsidian
3. External Obsidian app mirror at C:\Users\great\Documents\Obsidian Vault
4. Agent working notes and handoff notes

## Key Repo Paths

| Area | Source |
|---|---|
| CR source | src/shared/deskBridgeCapabilities.ts |
| CR guide | docs/capability-registry.md |
| MCP server | mcp/xenesis-desk-mcp-server.mjs |
| Agent pane | src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx |
| Provider runtime | packages/xenesis-agent-core/src/embeddedRuntime.ts, packages/xenesis/src/providers |
| Approval records | src/main/capabilityActionApproval.mjs, src/main/mcpActionInbox.mjs |

If notes and repo source disagree, trust the repo and record the mismatch in
handoff.md and [[AI Review Queue]].

## Graph Links

- Depends on [[Repo Overview]]
- Depends on [[Graph Schema]]
- Verified by [[Verification Gates]]
