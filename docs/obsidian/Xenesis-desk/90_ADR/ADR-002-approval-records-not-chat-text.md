---
type: adr
repo: xenesis-desk
status: accepted
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
date: 2026-06-26
touches:
  - "[[module-approval-system]]"
  - "[[module-xenesis-agent-pane]]"
verified_by:
  - "[[test-live-agent-pane]]"
---

# ADR-002 approval records not chat text

## Context

Approval-required actions need durable evidence that can be audited and resolved
by Desk UI, not simulated by assistant prose.

## Decision

Approval-required actions must create real approval records and normal
Agent-pane text must not expose raw approval internals.

## Consequences

- Chat text is not approval evidence.
- Action Inbox is an audit/backstop surface.
- The primary approval UX is an inline approval card in the Agent pane.

## Graph Links

- Decides [[module-approval-system]]
- Decides [[module-xenesis-agent-pane]]
- Verified by [[test-live-agent-pane]]
