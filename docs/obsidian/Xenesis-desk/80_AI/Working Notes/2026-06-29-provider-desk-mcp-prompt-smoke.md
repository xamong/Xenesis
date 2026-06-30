---
type: agent-handoff
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
depends_on:
  - "[[Provider Model]]"
  - "[[module-provider-runtime]]"
  - "[[module-mcp-bridge]]"
---

# Provider Desk MCP Prompt Smoke

## Objective

Add repeatable provider-package evidence that natural Desk-control prompts reach
the provider with Desk CR MCP discovery/call guidance, without restoring
deterministic natural-language routing.

## Change

- Added `provider:desk-mcp-prompt-smoke` in `packages/xenesis/package.json`.
- Added `packages/xenesis/scripts/provider-desk-mcp-prompt-smoke.mjs`.
- Added `packages/xenesis/scripts/provider-desk-mcp-prompt-smoke.test.mjs`.

## What It Proves

The smoke instantiates `CodexCliProvider` with Desk MCP auto-config and a fake
CLI runner. It submits `노션 연결 상태를 확인해줘` and captures the provider
stdin/args/metadata.

Checks prove:

- The natural prompt reaches provider stdin.
- `xenesis_dev.xenesis_desk_capabilities`,
  `xenesis_dev.xenesis_desk_capability`, and
  `xenesis_dev.xenesis_desk_call_capability` are present in provider guidance.
- The old full deterministic natural intent catalog text is absent.
- Explicit `xenesis-desk-action` blocks are not being injected.
- MCP args are configured for the provider run.
- Provider metadata marks `xenesisDeskMcpConfigured`.

## Verification

- RED: node test failed before the script existed.
- GREEN: node test passed after implementation.
- Direct smoke passed 6/6.
- Package typecheck passed.
- Package tests passed 367/367.
- Root typecheck passed.
- Mock provider smoke passed 6/6.

## Known Gap

This is provider-boundary evidence. It does not replace the final live
Electron Agent-pane proof that a selected real provider calls the MCP/CR tool
for a natural Desk-control prompt.

## Graph Links

- Depends on [[Provider Model]]
- Depends on [[module-provider-runtime]]
- Depends on [[module-mcp-bridge]]
