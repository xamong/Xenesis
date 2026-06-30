---
type: agent-handoff
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
depends_on:
  - "[[Provider Model]]"
  - "[[module-provider-runtime]]"
---

# Provider Smoke Gateway Auth

## Objective

Fix the provider smoke verification gate so mock-provider smoke can reach and
pass gateway `/run` and `/run/stream` checks without failing on gateway bearer
authentication.

## Root Cause

`startGateway()` auto-generates a bearer token when none is configured, and
non-public gateway routes require that token. `provider-smoke.mjs` launched the
gateway without `--auth-token-env` and posted to `/run` and `/run/stream` without
an `Authorization` header, so the smoke failed with `Unauthorized`.

## Change

- Added `packages/xenesis/scripts/provider-smoke-gateway-auth.test.mjs`.
- Added a dedicated `XENESIS_PROVIDER_SMOKE_GATEWAY_TOKEN` token path in
  `packages/xenesis/scripts/provider-smoke.mjs`.
- Provider smoke now passes `--auth-token-env` when spawning the gateway and
  sends `Authorization: Bearer ...` headers for gateway checks.

## Verification

- RED: node regression test reproduced provider smoke exit 1 after gateway
  `/run` failed.
- GREEN: node regression test passed.
- `XENESIS_PROVIDER=mock npm --prefix packages/xenesis run provider:smoke`
  passed 6/6.
- `npm --prefix packages/xenesis run typecheck` passed.
- `npm run typecheck` passed.
- Package tests passed 367/367 on clean rerun; an earlier shell session PID
  test failure passed on targeted rerun and did not reproduce.

## Known Gaps

- Default provider smoke still needs `OPENAI_API_KEY` because its default
  provider is `openai`.
- This verifies package-level provider smoke with `mock`; live Agent-pane
  natural Desk-control via the selected real provider remains a separate proof.

## Graph Links

- Depends on [[Provider Model]]
- Depends on [[module-provider-runtime]]
