# 2026-06-29 Auxiliary Natural Routing Surface Specs

## Objective

Derive remaining auxiliary natural-language routing descriptors and rules from shared specs.

## Changes

- Added `XENESIS_NATURAL_GUIDE_ACTION_SPECS`.
- Generated guide action descriptors and guide open/status rules from the guide spec.
- Added `XENESIS_NATURAL_ONBOARDING_ACTION_SPECS`.
- Generated onboarding action descriptors and onboarding open/status rules from the onboarding spec.
- Added `XENESIS_NATURAL_OAUTH_SETUP_PACKET_TARGET_RULE_SPECS`.
- Generated OAuth setup packet target rules from target status action descriptor keys.
- Added `XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTOR_SPECS`.
- Generated review-request descriptor aliases from provider and connection action-request descriptors.

## Verification

- RED: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` failed 43/44 before the auxiliary specs existed.
- GREEN: `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` passed 44/44.
- `npm run typecheck` -> passed.
- `npx biome check src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts handoff.md` -> passed for changed files.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` -> passed 6/6.
- `npm run docs:capabilities:audit` -> passed.
- `npm run smoke:xenesis:natural-desk-routing` -> passed 180/180.
- `rg -n "Missing|Undispatched|Dispatcher paths missing" docs\capability-registry-audit.md` -> all audited gap counts are 0.

## Notes

- This reduces duplicated deterministic routing data; it does not make routing model reasoning.
- Existing public export names remain stable for resolver call sites.
- Repository-wide `npm run lint` remains blocked by pre-existing diagnostics outside this slice; scoped Biome check passes.
