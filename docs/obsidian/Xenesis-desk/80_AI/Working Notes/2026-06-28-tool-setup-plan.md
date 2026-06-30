---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-28
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[module-capability-registry]]"
  - "[[module-xenesis-agent-pane]]"
touches:
  - "src/shared/xenesisConnections.ts"
  - "src/shared/deskBridgeCapabilities.ts"
  - "src/main/index.ts"
  - "src/renderer/panes/SettingsPane.tsx"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "src/shared/xenesisNaturalLanguageCapabilityCatalog.ts"
  - "src/shared/xenesisNaturalLanguageCatalog.ts"
  - "scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs"
---

# External Tool Setup Plan Slice

## Objective

Add a CR-first setup-plan layer for external tools. Each tool gets a derived
plan that joins the existing tool view, setup metadata, connector readiness,
install plan, MCP install draft, OAuth setup packet, action policy, user
stories, diagnostics, and setup request surfaces into one ordered read/open
surface.

## Implementation

- Added `toolSetupPlan` metadata and `tool-setup-plan` focus selectors to the
  Connection Center model.
- Registered `xd.xenesis.tools.setupPlans.status` and
  `xd.xenesis.tools.setupPlans.open` as read/open CR paths.
- Added main-process handlers that reuse the existing Connection Center open
  and focus mechanism.
- Added renderer summary, read request helper, Settings detail block, and
  Korean/English labels.
- Added deterministic natural routing for setup-plan catalog and target
  status/open prompts.
- Updated the external tool manual and live natural Desk routing smoke
  inventory.

## Boundaries

- Setup plans are review/read/open surfaces only.
- They do not install MCP servers, write MCP config, complete OAuth, store
  tokens, execute provider tools, mutate settings, or mutate external systems.
- Ready apply behavior stays on existing approval-gated CR paths.

## Verification

- Focused tests passed:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` 38/38.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` 38/38.
  - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` 48/48.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` 38/38.
  - `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` 5/5.
- Broad checks passed:
  - `npm run typecheck`.
  - `npm run docs:capabilities:audit` wrote 773 CR nodes and 689 coverage path
    references.
  - `npm run build`.
  - `npm --prefix packages/xenesis test` 367/367.
  - `npm --prefix packages/xenesis run typecheck`.
  - `npm --prefix packages/xenesis run build`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 168/168 when run after
    build completed.
  - `git diff --check` exited 0 with line-ending warnings only.

## Known Gaps

- `npm run lint` still fails repo-wide with existing Biome/CRLF/style findings
  outside this slice.
- `npm --prefix packages/xenesis run provider:smoke` is blocked by missing
  `OPENAI_API_KEY`.
- `npm run check:public-release` is blocked by missing
  `.github/workflows/ci.yml` in this worktree.
- Do not run the live Electron smoke in parallel with `npm run build`; both use
  the `out/` directory and can create transient smoke failures.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[module-capability-registry]]
- Depends on [[module-xenesis-agent-pane]]
- Extends [[Xenesis Connection Center Working Note]]
