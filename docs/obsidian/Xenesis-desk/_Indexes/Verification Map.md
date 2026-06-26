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
  - "[[Verification Gates]]"
---

# Verification Map

## Filter Intent

Map graph areas to repo verification commands.

## Commands

| Area | Command |
|---|---|
| Root typecheck | 
pm run typecheck |
| Lint | 
pm run lint |
| CR audit | 
pm run docs:capabilities:audit |
| Xenesis tests | 
pm --prefix packages/xenesis test |
| Xenesis typecheck | 
pm --prefix packages/xenesis run typecheck |
| Xenesis build | 
pm --prefix packages/xenesis run build |
| Provider smoke | 
pm --prefix packages/xenesis run provider:smoke |
| Public release | 
pm run check:public-release |
| Live Agent pane | Electron app + natural-language Desk-control prompt |

## Graph Links

- Depends on [[Verification Gates]]
