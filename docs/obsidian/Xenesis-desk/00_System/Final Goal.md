---
type: system
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
depends_on:
  - "[[Source of Truth Map]]"
verified_by:
  - "[[Verification Map]]"
---

# Final Goal

## Direction

Xenesis Desk is a CR-first control plane for agent workbench behavior.

Agents can use the Desk as a real workbench for files, terminals, browser
surfaces, panes, captures, and automation. The codebase should still converge
on one control model: Desk behavior is discovered, executed, approved, audited,
and verified through the Capability Registry.

This note is directional guidance, not a hard freeze on future architecture.
When design choices conflict, prefer the option that makes Desk behavior more
discoverable through CR paths, easier to verify, and safer for local workspace
control.

## Product Goal

Xenesis Desk should feel like an agent-native desktop: a user gives natural
language instructions, and the configured agent can operate real Desk surfaces
without forcing the user to translate intent into commands or internal APIs.

The product experience should make control visible. Agent work should leave
state, logs, approvals, open content, terminal sessions, diagnostics, and audit
records that a user or later agent can inspect.

## Technical Goal

The stable technical center is the Capability Registry.

- CR paths are the source of truth for controllable Desk behavior.
- MCP tools expose CR discovery and generic CR calls to external agents.
- Typed tools, UI shortcuts, renderer commands, HTTP routes, and provider
  adapters are convenience surfaces that map back to CR behavior.
- Approval-required actions create real approval records instead of chat-only
  text.
- Provider selection follows user settings and profiles.
- Live verification proves natural-language Agent pane behavior, not only
  direct function calls.

## Phase 1 Knowledge Graph Goal

The Obsidian graph should let an agent or human answer these questions before
editing code:

- What is the final direction of Xenesis Desk?
- Which source files own the relevant behavior?
- Which CR/MCP paths expose the behavior?
- Which actions require approval or create safety risk?
- Which commands or live prompts verify the change?
- Which notes explain the surrounding architecture and module ownership?

## Graph Links

- Depends on [[Source of Truth Map]]
- Verified by [[Verification Map]]
- Guides [[Capability Registry Architecture]]
- Guides [[MCP Bridge Architecture]]
- Guides [[Xenesis Agent Runtime]]
- Guides [[Approval Flow]]
- Guides [[Provider Model]]
