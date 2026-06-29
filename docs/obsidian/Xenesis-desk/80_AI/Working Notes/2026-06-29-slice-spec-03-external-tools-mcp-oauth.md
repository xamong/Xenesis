---
type: task
repo: xenesis-desk
aliases:
  - Slice Spec 03 External Tools MCP OAuth
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: low
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal Overall Spec]]"
  - "[[Final Goal Slice Spec Index]]"
  - "[[MCP Bridge Architecture]]"
  - "[[Capability Registry Architecture]]"
verified_by:
  - "[[Verification Map]]"
---

# Slice Spec 03 External Tools MCP OAuth

## Goal

Finish CR-backed external tool setup for Notion-style env-token MCP tools and
Google Calendar-style OAuth tools without exposing secrets or executing provider
tools during setup/readback.

## Scope

- Tool connection status, setup plan, connector status, runtime readiness.
- MCP install draft and profile draft for env-token tools.
- OAuth draft, setup packet, credential refs, scopes, token-store readiness,
  and blocked action catalog for OAuth tools.
- CR workflow preview for tool setup and user stories.
- Readback that proves the tool is ready before provider tool execution is
  allowed.

## Reference Intake

- `F:\agent-anal\analysis\openclaw-main\06-mcp-integration.md`
- `F:\agent-anal\analysis\hermes-agent-main\07-mcp-integration.md`
- `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`

Original source anchors:

- `F:\agent-anal\hermes-agent-main\gateway\platforms\api_server.py`
- `F:\agent-anal\hermes-agent-main\gateway\platform_registry.py`
- `F:\agent-anal\hermes-agent-main\tools\mcp_tool.py`
- `F:\agent-anal\hermes-agent-main\tools\mcp_oauth.py`
- `F:\agent-anal\hermes-agent-main\tools\mcp_oauth_manager.py`
- `F:\agent-anal\openclaw-main\src\agents\agent-bundle-mcp-runtime.ts`
- `F:\agent-anal\openclaw-main\src\agents\agent-bundle-mcp-materialize.ts`
- `F:\agent-anal\openclaw-main\src\agents\mcp-transport.ts`
- `F:\agent-anal\openclaw-main\src\agents\mcp-oauth.ts`
- `F:\agent-anal\openclaw-main\src\agents\mcp-config-shared.ts`
- `F:\agent-anal\openclaw-main\src\agents\codex-mcp-config.ts`

## Candidate Files

- `src/shared/xenesisConnections.ts`
- `src/shared/xenesisConnections.test.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/shared/xenesisConnectionCapabilities.test.ts`
- `src/main/index.ts`
- `src/renderer/panes/xenesisConnectionCenter.ts`
- `src/renderer/panes/xenesisConnectionCenter.test.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `docs/manual/11-external-tool-integrations.md`
- `scripts/assertCapabilityAuditZero.mjs`
- `handoff.md`

## Acceptance

- Notion exposes MCP template, install draft, profile draft, runtime readiness,
  action catalog, and user-story contract.
- Google Calendar exposes OAuth setup packet with credential refs, redirect URI
  policy, scopes, token-store state, and readback paths.
- Linear remains an explicit MCP/OAuth target with setup/readiness/readback
  coverage, or is moved to a named follow-up slice before this slice is accepted.
- Setup packet reads do not start OAuth, store tokens, write MCP config, execute
  provider tools, or mutate external systems.
- Runtime readiness blocks tool execution until readback conditions are met.
- Negative tests prove fake token store, MCP config writer, external executor,
  and provider tool executor are not called during setup/readback/preview.
- Secret values are never returned in status, docs examples, logs, or smoke
  output.
- Reference adoption map proposal is updated with borrowed, adapted, rejected,
  and verified MCP/OAuth/reference patterns.

## Verification

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
npm run typecheck
node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run typecheck
```

## Implementation Progress - 2026-06-29

- Added explicit Connection Center live-smoke baseline ids for Notion MCP
  readiness, Google Calendar OAuth setup packet/runtime readiness, Linear MCP
  OAuth readiness, and no OAuth side-effect boundary.
- Added shared read-model acceptance for Notion, Google Calendar, and Linear
  Slice 03 metadata. Secret literal values are asserted absent from serialized
  status.
- Added dispatcher approval/no-side-effect tests and an AST forbidden-call scan
  for main-process review/readback handlers.
- Added renderer guard coverage so `xd.xenesis.tools.profileDrafts.apply` is
  built only for `draftStatus: ready`; planned OAuth drafts remain review-only.
- Focused verification passed:
  - `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` -> 9/9.
  - `npx tsx --test src\shared\xenesisConnections.test.ts` -> 49/49.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` -> 49/49.
  - `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` -> 74/74.
- Broad verification passed:
  - `npm run docs:capabilities:audit; node scripts\assertCapabilityAuditZero.mjs`.
  - `npm run typecheck`; `npm --prefix packages/xenesis run typecheck`.
  - `npm run build`.
  - `node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json --timeout=120000` -> 14/14.
  - `node .\scripts\xenesisProviderOnboardingLiveSmoke.mjs --json --timeout=180000` -> 9/9.
  - `npm --prefix packages/xenesis test`; `npm --prefix packages/xenesis run build`;
    `npm --prefix packages/xenesis run provider:smoke`.
- Remaining repo-level gaps are pre-existing: `npm run lint` fails on
  repo-wide Biome debt, and `npm run check:public-release` fails because this
  repo is missing `.github\workflows\ci.yml`.

## Out Of Scope

- Completing real external OAuth consent.
- Writing real Google or Notion resources.
- Messenger channel routing.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[MCP Bridge Architecture]]
- Depends on [[Capability Registry Architecture]]
- Verified by [[Verification Map]]
