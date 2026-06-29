---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
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

Original source anchors are selected during implementation from:

- `F:\agent-anal\hermes-agent-main\gateway\platforms\api_server.py`
- `F:\agent-anal\hermes-agent-main\gateway\platform_registry.py`
- `F:\agent-anal\openclaw-main\src`
- `F:\agent-anal\openclaw-main\extensions`

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
- `handoff.md`

## Acceptance

- Notion exposes MCP template, install draft, profile draft, runtime readiness,
  action catalog, and user-story contract.
- Google Calendar exposes OAuth setup packet with credential refs, redirect URI
  policy, scopes, token-store state, and readback paths.
- Setup packet reads do not start OAuth, store tokens, write MCP config, execute
  provider tools, or mutate external systems.
- Runtime readiness blocks tool execution until readback conditions are met.
- Secret values are never returned in status, docs examples, logs, or smoke
  output.

## Verification

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npm run docs:capabilities:audit
npm run typecheck
npm run smoke:xenesis:connection-center -- --json
```

Provider runtime tests are added only if the slice changes package-level MCP or
provider prompt behavior:

```powershell
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run typecheck
```

## Out Of Scope

- Completing real external OAuth consent.
- Writing real Google or Notion resources.
- Messenger channel routing.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[MCP Bridge Architecture]]
- Depends on [[Capability Registry Architecture]]
- Verified by [[Verification Map]]
