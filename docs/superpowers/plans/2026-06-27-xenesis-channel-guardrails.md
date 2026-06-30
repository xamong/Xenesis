# Xenesis Channel Guardrails Plan

## Objective

Expose the existing per-channel external bot guardrails (`approvalMode`,
`maxTurns`, and `maxTokens`) as first-class Xenesis Desk settings and CR schema
fields, without inventing unsupported OpenClaw/Hermes routing bindings that are
not implemented by this repo's runtime.

## Constraints

- Preserve the CR-first path: `xd.xenesis.profiles.updateChannels` remains the
  write path.
- Do not store bot secrets in Desk settings; secret values remain env var
  references or direct values handled by the existing redaction path.
- Keep OpenClaw channel routing parity bounded to the repo's actual runtime:
  enabled channel, allowed target scope, approval mode, and run limits.
- Continue using `handoff.md` for material progress.

## Task 1: Capability Schema

- [x] **Step 1: Red test** - Add assertions that
  `xd.xenesis.profiles.updateChannels` exposes approval/run-limit fields in
  each channel schema.
- [x] **Step 2: Implement** - Expand the CR schema for profile channel update
  and test requests.
- [x] **Step 3: Verify** - Run the focused capability schema test.

## Task 2: Profile State And Persistence

- [x] **Step 1: Red test or typecheck pressure** - Extend shared channel
  settings types so callers must carry `approvalMode`, `maxTurns`, and
  `maxTokens`.
- [x] **Step 2: Implement** - Include guardrails in profile summaries,
  defaults, normalization, and persistence while preserving existing values
  when older callers omit the fields.
- [x] **Step 3: Verify** - Run focused tests and `npm run typecheck`.

## Task 3: Settings UI And Docs

- [x] **Step 1: Implement UI** - Add compact per-channel guardrail controls to
  the external bot settings cards.
- [x] **Step 2: Update docs** - Update the manual and Obsidian working note with
  the bounded routing/guardrail model.
- [x] **Step 3: Verify** - Run format/check, targeted tests, typecheck, CR
  audit, and a live smoke where feasible.
- [x] **Step 4: Commit** - Commit the slice separately.
