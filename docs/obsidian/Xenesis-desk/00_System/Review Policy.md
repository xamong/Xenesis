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
  - "[[Graph Schema]]"
---

# Review Policy

## Default Model

The default model is read-wide / write-review-only.

## Direct Write Areas

- 80_AI/Working Notes
- 80_AI/Review
- 80_AI/Outputs
- 70_Tasks

## Proposal-First Areas

- 20_Architecture
- 30_Modules
- 40_APIs
- 50_Data
- 60_Tests
- 90_ADR

## AI-Generated Defaults

```yaml
ai_generated: true
reviewed: false
confidence: low
status: draft
```

## Graph Links

- Depends on [[Graph Schema]]
- Reviewed through [[AI Review Queue]]
