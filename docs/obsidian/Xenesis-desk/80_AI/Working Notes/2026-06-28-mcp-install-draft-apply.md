---
type: agent-handoff
repo: xenesis-desk
status: verified
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-28
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[MCP Bridge Architecture]]"
  - "[[module-mcp-bridge]]"
touches:
  - "src/main/providerIntegrationInstaller.mjs"
  - "src/main/index.ts"
  - "src/shared/deskBridgeCapabilities.ts"
  - "src/shared/xenesisConnections.ts"
  - "src/shared/xenesisNaturalLanguageCapabilityCatalog.ts"
  - "src/shared/xenesisNaturalLanguageCatalog.ts"
  - "src/renderer/panes/SettingsPane.tsx"
---

# MCP Install Draft Apply Slice

## Objective

Move recommended external-tool MCP setup beyond review-only metadata by adding
an approval-gated Capability Registry apply path for ready MCP install drafts.

## Scope Boundary

- Applies only ready recommended MCP drafts.
- Defaults to Codex MCP config; explicit targets can select Codex, Claude,
  Cursor, or all supported local CLI targets.
- Writes local MCP config with backups and redacted readback metadata.
- Does not run shell commands, install packages, complete OAuth, store new
  tokens, execute provider tools, send messages, or mutate external systems.

## Implementation Notes

- New CR path: `xd.xenesis.tools.mcpInstallDrafts.apply`.
- Approval: `when-external`; permission: `write`.
- Main handler resolves recommended MCP templates, rejects missing env before
  writing, and delegates file writes to provider-integration helpers.
- Connection Center read model exposes the apply path only for ready drafts.
- Settings UI renders an apply action only when the ready draft includes the
  apply control path.
- Natural language maps explicit apply prompts such as
  `노션 MCP 설치 적용해줘` to the apply path while keeping
  `노션 MCP 설치해줘` on the review-request path.

## Verification So Far

- `node --test src\main\providerIntegrationInstaller.test.mjs` passed with 3/3.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
  with 35/35.
- `npx tsx --test src\shared\xenesisConnections.test.ts` passed with 36/36.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` passed
  with 40/40.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed with 38/38.

## Final Verification

- `node --test src\main\providerIntegrationInstaller.test.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
  passed with 8/8.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  passed with 149/149.
- `npm run typecheck` passed.
- `npm run build` passed with existing Vite warnings only.
- `npm run docs:capabilities:audit` passed with missing registered paths 0,
  missing dispatched coverage paths 0, undispatched static callable methods 0,
  and dispatcher paths missing from tree 0.
- `npm run smoke:xenesis:natural-desk-routing` passed with 147/147.
- `npx biome check ... --max-diagnostics 120` exited 0 with existing
  warnings/infos only.
- `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
