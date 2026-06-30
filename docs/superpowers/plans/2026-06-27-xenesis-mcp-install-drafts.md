# Xenesis MCP Install Drafts Plan

## Objective

Expose Desk-native MCP install drafts for recommended Connection Center tools.
The CR surface should let an agent/operator read, open, and request review of a
draft without writing MCP config, completing OAuth, storing tokens, running
shell commands, or executing provider tools.

## Source Context

- Repo-local Obsidian and code are the working source for this slice.
- Do not re-browse external OpenClaw, Hermes, or MCP pages per slice.
- Existing local metadata:
  - `XenesisConnectionMcpTemplate` provides Fetch, Filesystem, GitHub, Notion,
    and Linear snippets.
  - `toolInstallPlan` describes install planning and Google planned OAuth gaps.
  - `setupRequest` can already create local Action Inbox review items.

## Scope

- Add `mcpInstallDraft` metadata to tool connection items.
- Expose CR paths:
  - `xd.xenesis.tools.mcpInstallDrafts.status`
  - `xd.xenesis.tools.mcpInstallDrafts.open`
  - `xd.xenesis.tools.mcpInstallDrafts.request`
- Record request items in the Action Inbox as review-only drafts.
- Render the draft summary in Settings Connection Center cards.
- Add Agent prompt-hint coverage so the provider can discover the new paths.

## Boundaries

- No MCP config writes.
- No shell command execution.
- No OAuth completion.
- No token storage or secret value return.
- No provider MCP tool execution.
- No external messages or settings mutation.
- Google Workspace and Google Calendar stay planned when no verified template
  exists.

## Tests First

1. Add RED tests in `src/shared/xenesisConnections.test.ts` for install-draft
   metadata and planned Google cards.
2. Add RED tests in `src/shared/xenesisConnectionCapabilities.test.ts` for CR
   registration and adapter dispatch.
3. Add RED tests in `src/renderer/panes/xenesisConnectionCenter.test.ts` for the
   formatter and request builder.
4. Add RED prompt-hint coverage in
   `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`.

Expected RED command:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

## Implementation Steps

1. Extend shared connection types with MCP install-draft readiness, review
   surface, snippets, paths, diagnostics, and safety boundaries.
2. Derive draft metadata from the existing MCP template, install plan,
   connector credential state, and tool status.
3. Add main-process CR status/open/request handlers and Action Inbox request
   recording.
4. Register and dispatch the new CR paths in the Capability Registry tree.
5. Render a Settings card section and add the review request action button.
6. Update Agent prompt hints and local docs.

## Verification

Run the narrowest relevant checks first:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npx biome check src/main/index.ts src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts --max-diagnostics 80
npm run typecheck
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Live verification target:

- Direct CR call for `xd.xenesis.tools.mcpInstallDrafts.status`.
- Direct CR request for one ready template, verifying an Action Inbox item.
- Settings DOM contains `data-xenesis-mcp-install-draft="<id>"`.
- Agent-pane CR prompt proves the provider can call the new path.
