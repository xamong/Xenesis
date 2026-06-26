---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-27
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[MCP Bridge Architecture]]"
  - "[[Provider Model]]"
touches:
  - "src/shared/xenesisConnections.ts"
  - "src/shared/deskBridgeCapabilities.ts"
  - "src/main/index.ts"
  - "src/renderer/panes/SettingsPane.tsx"
---

# Xenesis Connection Center Working Note

## Objective

Add a CR-first Connection Center for Xenesis Agent onboarding, provider setup,
MCP/tool readiness, gateway status, external messenger readiness, and guide docs.

## Direction

This work supports [[Final Goal]] by making setup state discoverable through the
Capability Registry instead of only through separate renderer settings panels.

## Current First Slice

- Add `xd.xenesis.connections.status`.
- Add shared status aggregation.
- Add a Settings Connection Center tab.
- Add public manual docs.
- Keep mutating behavior on existing CR paths.

## Current Gap

`npm run docs:capabilities:audit` still reports the existing `xd.apps.*` dynamic
dispatch pattern as 8 undispatched static callable methods. Do not claim full CR
completion until that audit result is 0.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[MCP Bridge Architecture]]
- Depends on [[Provider Model]]
