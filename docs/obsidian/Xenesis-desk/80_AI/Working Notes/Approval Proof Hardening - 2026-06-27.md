---
type: working-note
risk: high
status: verified
touches:
  - "[[module-capability-registry]]"
  - "[[module-mcp-bridge]]"
  - "[[module-approval-system]]"
  - "[[module-xenesis-agent-pane]]"
verified_by:
  - "[[test-capability-audit]]"
  - "[[test-live-agent-pane]]"
---

# Approval Proof Hardening - 2026-06-27

Implemented and verified MCP/CR approval-proof hardening before Evidence-Governed
Memory OS implementation.

Verified scope:

- External MCP `/capabilities/call` cannot authorize approval-required paths with
  caller-supplied `approved: true`.
- External MCP transport cannot spoof `source`.
- `xd.mcp.actionInbox.resolve` is `when-external`.
- Real Action Inbox resolution re-enters CR with an internal approval proof.
- Remembered approvals re-enter CR with a remembered approval proof.
- Live Electron Agent pane renders a pending approval card for external
  `xd.mcp.actionInbox.resolve`, and the approval button clears the pending state.

Commands and smoke markers:

- `node --import tsx --test src\shared\mcpApprovalHardening.test.ts`
- `node --import tsx --test src\shared\externalAppCapabilities.test.ts`
- `node --import tsx --test src\shared\deskBridgeWorkflow.test.ts`
- `node --import tsx --test src\shared\*.test.ts`
- `npm run docs:capabilities`
- `npm run docs:capabilities:audit`
- `npm run typecheck`
- `npm run build`
- `node --import tsx --test packages\xenesis-agent-core\src\embeddedAgentRuntime.test.ts`
- Live smoke marker: pending card for `xd.mcp.actionInbox.resolve`, Action Inbox
  item `capability-xenesis-xd.mcp.actionInbox.resolve`, then pending card count
  `0` after Agent-pane approval.

Additional cleanup fix:

- `embeddedAgentRuntime.test.ts` now closes the Xenesis database pool before
  deleting its temp workspace, avoiding Windows `EBUSY` on `.xenesis\xenesis.db`.

Known follow-up:

- `xd.services.xenesis.setWorkspace` currently executes as `control | never`,
  including for an external `E:\tmp` workspace from the Agent pane. This does
  not match the AGENTS external-workspace approval policy and should be handled
  as a separate approval-policy gap.
