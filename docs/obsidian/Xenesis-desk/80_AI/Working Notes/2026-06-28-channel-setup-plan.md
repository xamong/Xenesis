# 2026-06-28 Channel Setup Plan

## Objective

Add a CR-first setup-plan surface for external messenger/channel setup.

## Implemented Surface

- Model: `channelSetupPlan` on messenger connection items.
- CR paths:
  - `xd.xenesis.channels.setupPlans.status`
  - `xd.xenesis.channels.setupPlans.open`
- Settings focus detail:
  - `channel-setup-plan`
  - `data-xenesis-channel-setup-plan`

## Plan Contents

Each plan joins existing channel/messenger surfaces into one ordered review
sequence:

- Messenger view
- Channel routing
- Channel safety
- Channel access groups
- Channel pairing
- Channel user stories
- Channel profile draft review
- Implemented-only approval-gated profile apply and channel test references
- Diagnostic runbook
- Setup request

## Safety Boundary

Channel setup plans are read/open orchestration metadata. They do not start
gateways, pair accounts or devices, send messages, store credentials, mutate
channel profiles, or bypass approvals. Planned channels remain review-only and
do not expose apply/test steps.

## Verification Notes

Focused tests added/updated:

- `src/shared/xenesisConnections.test.ts`
- `src/shared/xenesisConnectionCapabilities.test.ts`
- `src/renderer/panes/xenesisConnectionCenter.test.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

Manual docs updated:

- `docs/manual/10-openclaw-channel-setup.md`
- `docs/manual/09-onboarding-connections.md`

Passed verification:

- Focused tests: shared connections 39/39, connection capabilities 39/39,
  connection center 50/50, agent desk control 38/38, routing manifest 5/5.
- Broad checks: root typecheck, Xenesis package typecheck/test/build, CR audit,
  root build.
- Live natural routing smoke: `npm run smoke:xenesis:natural-desk-routing`
  passed 174/174 after adding approval-card visible-text evidence to the smoke
  checker.

Known blocked gates:

- Repo-wide `npm run lint` still fails on existing Biome diagnostics.
- `npm --prefix packages/xenesis run provider:smoke` needs `OPENAI_API_KEY`.
- `npm run check:public-release` needs `.github/workflows/ci.yml` in this
  worktree.
