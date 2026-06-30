# 2026-06-29 Provider View Sections

## Objective

Make AI provider views addressable at section level through the Capability
Registry, matching the existing tool and messenger view-section behavior.

## Context

- Source of truth: repo code, tests, CR audit, and smoke scripts.
- Canonical vault role: navigation and working memory only.
- Relevant CR surfaces:
  - `xd.xenesis.providers.views.status`
  - `xd.xenesis.providers.views.open`

## Implemented Scope

- Added provider view section metadata to the shared Connection Center model:
  - `connection-card`
  - `setup`
  - `runtime`
  - `fallback-policy`
  - `credential-boundary`
  - `profile-draft`
  - `setup-plan`
- Added `section`, `viewSection`, and `providerViewSection` args to provider
  view open schema and main dispatch.
- Mapped each section to an existing Connection Center detail focus.
- Added renderer summary rows for provider view sections and their open args.
- Added deterministic natural-language routing for provider view section opens,
  including `codex app-server runtime view 열어줘`.

## Safety Boundary

Provider view sections are read/open metadata only. They do not change provider
selection, model selection, credential values, runtime routing, fallback chains,
local CLI selection, or provider execution. Credential-boundary sections must not
return API keys, bridge tokens, or local login secrets.

## Verification Notes

- RED shared model: provider view sections were absent.
- GREEN shared model: `npx tsx --test src\shared\xenesisConnections.test.ts`
- RED CR schema/main dispatch: provider view open schema had no section enum.
- GREEN CR schema/main dispatch:
  `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
- RED renderer/natural routing: provider section formatter and natural section
  open were absent.
- GREEN renderer/natural routing:
  - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

## Next

Run broad verification, regenerate CR audit output if changed, and commit this
slice as an isolated feature commit.
