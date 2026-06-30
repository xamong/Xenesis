---
type: working-note
status: implemented
updated: 2026-06-28
tags:
  - xenesis-desk
  - capability-registry
  - provider-profile
  - agent-pane
---

# Provider Profile Draft Apply

## Objective

Move ready AI provider profile drafts from review-only metadata to a CR-first,
approval-gated apply path.

## Implemented

- Added `xd.xenesis.providers.profileDrafts.apply` as a write capability with
  `when-external` approval.
- Exposed the apply control path only when the provider profile draft is
  `ready`.
- Added `src/shared/xenesisProviderProfileApply.ts` to accept only non-secret
  provider profile fields and reject raw `apiKey`, `secret`, and `token`
  values.
- Added main-process `applyXenesisProviderProfileDraft`, wired through the
  generic Capability Registry adapter.
- Added Connection Center renderer helper and Settings button for provider
  draft apply.
- Routed `AI provider profile draft 적용해줘` to
  `xd.xenesis.providers.profileDrafts.apply` before channel-profile apply, so
  `draft` is no longer misread as the `raft` messenger target.

## Safety Boundaries

- Raw provider secrets are not accepted by the apply helper.
- The handler returns redacted secret state only.
- Apply does not mutate fallback chains, local CLI selection, or provider
  prompt execution.
- Missing-required provider drafts remain without the apply control path.

## Verification

- `npx tsx --test src\shared\xenesisProviderProfileApply.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed with 153/153.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed with
  5/5.
- `npx biome check --write ...` fixed safe import ordering and exited 0 with
  existing warnings/infos only on touched files.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed and generated
  `docs/capability-registry-audit.md` with 768 nodes and 689 coverage path
  references.
- `npm run build` passed.
- `npm run smoke:xenesis:natural-desk-routing` passed with 153/153.

## Known Gap

- `npm --prefix packages/xenesis run provider:smoke` did not run to completion
  because the local environment has no `OPENAI_API_KEY`; the script defaults to
  `provider=openai` and exits before live provider checks.
