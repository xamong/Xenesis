---
type: test
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
verified_by:
  - "[[Verification Map]]"
supports:
  - "[[Final Goal]]"
---

# test-live-agent-pane

## Purpose

Represents live Electron Agent pane verification for CR, approval, provider, and Desk-control behavior.

## Commands

| Check | Expected Use |
|---|---|
| Electron app + natural-language normal conversation prompt | Proves non-control chat is not forced into tool/action routing. |
| Electron app + natural-language Desk-control prompt | Proves the configured provider can call CR/MCP tools from the Agent pane. |
| Electron app + approval-required prompt | Proves approval cards appear and resolve through product UX. |

## Role In Final Goal

Live Agent-pane verification proves the actual product path, including provider
selection, work log, approval UI, and Desk control.

## Graph Links

- Verified by [[Verification Map]]
- Supports [[Final Goal]]
- Covers [[module-xenesis-agent-pane]]
- Covers [[module-approval-system]]
