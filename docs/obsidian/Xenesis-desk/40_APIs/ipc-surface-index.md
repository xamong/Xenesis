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
  - "[[module-capability-registry]]"
touches:
  - "src/main/index.ts"
  - "src/preload/index.ts"
---

# ipc-surface-index

## Purpose

Indexes Electron main/preload IPC boundaries relevant to Desk control.

## Role In Final Goal

IPC is the renderer/main-process transport layer for Desk behavior. IPC methods
that trigger product behavior should be covered by CR mappings so UI shortcuts
and agents converge on the same control plane.

## Graph Links

- Depends on [[module-capability-registry]]
- Touches `src/main/index.ts`
- Touches `src/preload/index.ts`
