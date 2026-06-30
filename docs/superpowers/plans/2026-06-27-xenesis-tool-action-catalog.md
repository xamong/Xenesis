# Xenesis Tool Action Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Desk-native, CR-first action policy catalog for external tools before any provider MCP tool execution or external mutation is attempted.

**Architecture:** Extend the Connection Center tool cards with `toolActionCatalog` metadata for Fetch, Filesystem, GitHub, Notion, Linear, Google Workspace, and Google Calendar. Register `xd.xenesis.tools.actions.status/open/request`; the request path records a review-only Action Inbox item and never executes provider tools. Render the same model in Settings and expose it to the Agent prompt hint.

**Tech Stack:** TypeScript, Node test runner via `npx tsx --test`, Electron main-process CR adapter, React SettingsPane, Biome, Capability Registry audit.

---

### Task 1: Shared Action Catalog Model And Renderer Helpers

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`

- [x] **Step 1: Write failing shared tests**

Add a test that expects tool cards to expose `toolActionCatalog` with:
- `runtimeSupport`
- `actionInboxKind: "xenesis-tool-action-policy"`
- search/read/write action groups
- approval policy for each group
- read paths including `xd.xenesis.tools.actions.status`
- control paths including `xd.xenesis.tools.actions.open` and `xd.xenesis.tools.actions.request`
- blocked actions for direct provider tool execution, unapproved writes, OAuth completion, token storage, and config writes
- safety boundaries stating that the catalog does not execute provider tools or mutate external systems.

Use concrete assertions:
- `fetch` has search/read actions and no write actions.
- `notion` has search/read/write groups, with write policy approval-gated.
- `linear` write actions mention issue/comment updates after approval.
- `google-calendar` is `planned-oauth`, includes read/search calendar actions, and keeps create/update/delete blocked until a verified template exists.

- [x] **Step 2: Write failing renderer helper tests**

Add tests for:
- `formatXenesisToolActionCatalogSummary(catalog)`
- `buildXenesisToolActionCatalogRequest(item)`

Expected request path:

```ts
{
  path: 'xd.xenesis.tools.actions.request',
  args: { id: item.id },
  source: 'xenesis',
  approved: true,
}
```

- [x] **Step 3: Verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: fail because `toolActionCatalog`, formatter, and request builder do not exist.

- [x] **Step 4: Implement minimal shared model**

Add exported types for:
- `XenesisConnectionToolActionCatalogRuntimeSupport`
- `XenesisConnectionToolActionCatalogGroupKind`
- `XenesisConnectionToolActionCatalogApprovalPolicy`
- `XenesisConnectionToolActionCatalogAction`
- `XenesisConnectionToolActionCatalogGroup`
- `XenesisConnectionToolActionCatalogTemplate`

Attach `toolActionCatalog` to the seven tool cards using existing setup, connector, user-story, and install-plan metadata. Keep values as action names and policy labels only; do not include tokens, OAuth values, request payloads, or provider output.

- [x] **Step 5: Implement renderer helpers**

Add formatter and request builder in `xenesisConnectionCenter.ts`, and re-export types through `src/shared/types.ts`.

- [x] **Step 6: Verify GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: all tests pass.

### Task 2: CR Registration, Main Adapter, Settings UI, And Agent Hint

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Write failing CR tests**

Add a test that expects:
- `xd.xenesis.tools.actions.status` as read/never
- `xd.xenesis.tools.actions.open` as control/never, required `["id"]`
- `xd.xenesis.tools.actions.request` as write/when-external, required `["id"]`
- dispatch to `getXenesisToolActionCatalogStatus`, `openXenesisToolActionCatalog`, and `requestXenesisToolActionCatalog`

- [x] **Step 2: Write failing Agent hint test**

Expect the Desk-control prompt hint to list the three new CR paths and state that tool action catalogs are review-only and do not execute provider tools or mutate external systems.

- [x] **Step 3: Verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: fail because paths and hint do not exist.

- [x] **Step 4: Implement CR schemas and dispatch**

Add profile draft-style schemas and dispatch branches under `xd.xenesis.tools.actions`.

- [x] **Step 5: Implement main-process handlers**

Add:
- `getXenesisToolActionCatalogStatus`
- `openXenesisToolActionCatalog`
- `requestXenesisToolActionCatalog`

The request handler must call `recordMcpActionInboxRequest` with kind `xenesis-tool-action-policy`, approval session key `xenesis-tool-action-policy:<tool-id>`, and a description containing action group names, approval policies, diagnostics, blocked actions, and safety boundaries only.

- [x] **Step 6: Render Settings card**

Render a section with `data-xenesis-tool-action-catalog="<tool-id>"`, summary, group policies, actions, read/control paths, diagnostics, blocked actions, and safety boundaries. Add a request button.

- [x] **Step 7: Verify GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: all focused tests pass.

### Task 3: Documentation, Audit, Live Verification, Commit

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update docs**

Document that tool action catalogs are review-only policy surfaces. They do not execute provider MCP tools, complete OAuth, store tokens, write MCP config, send email, update documents/tasks/issues, or create/update/delete calendar events.

- [x] **Step 2: Run verification**

Run:

```powershell
npx biome format --write <touched files>
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npx biome check <touched files> --max-diagnostics 80
npm run typecheck
npm --prefix packages/xenesis run typecheck
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run build
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Expected: public-release may keep failing only for the known `.github/workflows/ci.yml` gap; repo-wide lint may still fail on existing unrelated Biome/CRLF/style findings, so also record scoped touched-file Biome output.

- [x] **Step 3: Live smoke**

Use Electron `_electron.launch` to verify:
- direct `xd.xenesis.tools.actions.status` for Notion returns search/read/write groups
- direct `xd.xenesis.tools.actions.status` for Google Calendar returns `planned-oauth`
- approved `xd.xenesis.tools.actions.request` for Linear creates Action Inbox key `xenesis-tool-action-policy:linear`
- Settings DOM has `[data-xenesis-tool-action-catalog="notion"]`
- Agent-pane CR prompt for status returns `Desk action completed`

- [x] **Step 4: Commit**

Stage touched files and force-add this ignored plan file:

```powershell
git add <touched files>
git add -f docs/superpowers/plans/2026-06-27-xenesis-tool-action-catalog.md
git commit -m "feat: add xenesis tool action catalog"
```
