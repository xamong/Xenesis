---
title: Shared Natural Target Resolution Helpers
date: 2026-06-29
type: working-note
status: verified
tags:
  - xenesis-desk
  - capability-registry
  - natural-language-routing
  - dehardcoding
---

# Shared Natural Target Resolution Helpers

## Objective

Move remaining direct natural target finder usage out of
`src/shared/xenesisNaturalLanguageActionResolvers.ts` and into named shared
capability catalog helpers.

## Changes

- Added helpers for view kind, connection action target, onboarding action step,
  and provider action target resolution.
- The natural action resolver now delegates these target resolution paths to the
  capability catalog helper layer.
- Provider auto target handling moved out of the resolver.
- Onboarding/provider helpers return only the fields needed by action builders,
  avoiding word catalog leakage back into the resolver.

## Verification

- RED focused test: failed 54/56 as expected.
- GREEN focused test: passed 56/56.
- Focused Biome write: passed; fixed two files.
- Post-format focused test: passed 56/56.
- Resolver source guard: no direct target finder/provider auto target matches.
- Root typecheck: passed.
- Fixture smoke: passed 6/6.
- Focused Biome recheck: passed.
- CR audit: passed; counters all 0.
- Build: passed with existing Vite warnings.
- Live natural Desk routing smoke: passed 261/261.

## Notes

The resolver still owns high-level ordering and runtime quoted text/path
extraction. The target dictionaries and target-to-action preparation now sit in
the shared capability catalog layer.
