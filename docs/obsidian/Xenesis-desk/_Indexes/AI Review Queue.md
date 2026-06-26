---
type: index
repo: xenesis-desk
status: active
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
depends_on:
  - "[[Review Policy]]"
---

# AI Review Queue

## Purpose

Lists notes with `reviewed: false` or `ai_generated: true`.

## Graph Links

- Depends on [[Review Policy]]
- Watches `80_AI/Review`
- Watches `80_AI/Outputs`
- Watches `80_AI/Working Notes`
