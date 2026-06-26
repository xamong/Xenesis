---
type: system
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
depends_on:
  - "[[Graph Schema]]"
  - "[[Review Policy]]"
  - "[[Source of Truth Map]]"
---

# AI Agent Rules

## Operating Rule

Agents use this vault as navigation, design intent, risk context, and handoff
memory. The repo remains the executable source of truth.

## Required Reading Order

1. Repo AGENTS.md
2. [[Xenesis-desk]]
3. [[AI Agent Rules]]
4. [[Graph Schema]]
5. [[Review Policy]]
6. [[Source of Truth Map]]
7. Relevant index notes under _Indexes
8. Relevant module, architecture, capability, data, test, ADR, risk, task, and handoff notes
9. Actual repo source files and tests

## Write Rules

- Read widely.
- Write directly only to 80_AI/Working Notes, 80_AI/Review, 80_AI/Outputs, and 70_Tasks by default.
- Treat canonical architecture, module, API, data, test, and ADR notes as proposal-first.
- If Obsidian and repo source disagree, trust the repo and record the mismatch in handoff.md and [[AI Review Queue]].

## Graph Links

- Depends on [[Graph Schema]]
- Depends on [[Review Policy]]
- Depends on [[Source of Truth Map]]
