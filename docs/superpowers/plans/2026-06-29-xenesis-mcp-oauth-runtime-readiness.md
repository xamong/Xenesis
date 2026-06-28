# Xenesis MCP OAuth Runtime Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-first, Desk-native MCP OAuth runtime readiness surface for OAuth-capable recommended MCP tools, starting with Linear through derived template metadata.

**Architecture:** The Connection Center shared model derives `toolMcpOAuth` from existing tool connector and recommended MCP template data instead of hand-listing Linear-specific behavior. The Capability Registry exposes read/open/request methods under `xd.xenesis.tools.mcpOAuth.*`; request records review metadata only and does not start OAuth, store tokens, execute provider tools, or mutate external systems.

**Tech Stack:** TypeScript, Electron main/renderer, Xenesis Capability Registry, Node test runner via `tsx --test`, natural Desk routing smoke scripts, Biome, Vite build.

---

### Task 1: Shared Read Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write the failing shared-model test**

Add assertions to `buildXenesisConnectionsStatus exposes review-only MCP install drafts for recommended tools` or a new adjacent test:

```ts
const linear = status.sections.tools.items.find((item) => item.id === 'linear');
const notion = status.sections.tools.items.find((item) => item.id === 'notion');
const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

assert.equal(linear?.toolMcpOAuth?.status, 'ready-template');
assert.equal(linear?.toolMcpOAuth?.actionInboxKind, 'xenesis-tool-mcp-oauth');
assert.equal(linear?.toolMcpOAuth?.tool, 'linear');
assert.equal(linear?.toolMcpOAuth?.serverName, 'linear');
assert.equal(linear?.toolMcpOAuth?.authMode, 'oauth');
assert.equal(linear?.toolMcpOAuth?.transport, 'http');
assert.deepEqual(linear?.toolMcpOAuth?.missingRequiredFields, []);
assert.ok(linear?.toolMcpOAuth?.scopes.includes('linear:read-issues'));
assert.ok(linear?.toolMcpOAuth?.credentialRefs.some((credential) => credential.ref === 'LINEAR_OAUTH_TOKEN_STORE'));
assert.ok(linear?.toolMcpOAuth?.readPaths.includes('xd.xenesis.tools.mcpOAuth.status'));
assert.ok(linear?.toolMcpOAuth?.controlPaths.includes('xd.xenesis.tools.mcpOAuth.request'));
assert.ok(linear?.toolMcpOAuth?.blockedActions.includes('start OAuth flow'));
assert.equal(JSON.stringify(linear?.toolMcpOAuth).includes('secret-value-must-not-appear'), false);
assert.equal(notion?.toolMcpOAuth, undefined);
assert.equal(calendar?.toolMcpOAuth, undefined);
```

- [x] **Step 2: Run test to verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because `toolMcpOAuth` is not defined on `XenesisConnectionItem`.

- [x] **Step 3: Implement the minimal derived read model**

Add `XenesisConnectionToolMcpOAuthTemplate` and helpers in `src/shared/xenesisConnections.ts`. Derive the template only when all of these are true:

```ts
item.kind === 'tool'
item.toolConnector?.authMode === 'oauth'
item.mcpTemplate?.auth === 'oauth'
```

The builder must return:

```ts
{
  status: 'ready-template',
  actionInboxKind: 'xenesis-tool-mcp-oauth',
  tool: item.id,
  displayName: item.label,
  serverName: item.mcpTemplate.serverName,
  transport: item.mcpTemplate.transport,
  authMode: 'oauth',
  runtimeSupport: 'ready-template',
  authSurface: item.toolConnector.setupSurface,
  reviewSurface: 'Desk Action Inbox',
  credentialRefs: item.toolConnector.credentialRefs,
  missingRequiredFields: [],
  scopes: uniqueStrings(item.toolConnector.dataScopes),
  tokenStore: 'OAuth token managed by the MCP client',
  consentMode: 'provider-browser-oauth',
  readPaths: [
    'xd.xenesis.connections.status',
    'xd.xenesis.tools.mcpOAuth.status',
    'xd.xenesis.tools.connectors.status',
    'xd.xenesis.tools.mcpInstallDrafts.status',
    'xd.mcp.settings.status',
  ],
  controlPaths: [
    'xd.xenesis.tools.mcpOAuth.open',
    'xd.xenesis.tools.mcpOAuth.request',
    'xd.xenesis.connections.open',
  ],
  diagnostics: ['mcp-oauth-runtime', 'oauth-client', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
  blockedActions: ['start OAuth flow', 'store tokens', 'execute provider tools', 'mutate external systems'],
  safetyBoundaries: [
    'MCP OAuth readiness is review-only',
    'MCP OAuth readiness does not start OAuth, store tokens, write MCP config, execute provider tools, or mutate external systems',
    'credential values and OAuth tokens are never returned',
  ],
}
```

Attach it in `toolConnectionItems`, export types through `src/shared/types.ts`, and include the new paths in setup plans, diagnostics, blocked actions, and safety aggregations.

- [x] **Step 4: Run shared test to verify GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS for the new MCP OAuth readiness assertions.

### Task 2: Capability Registry

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Test: `src/shared/xenesisConnectionCapabilities.test.ts`

- [x] **Step 1: Write the failing CR test**

Add a test for:

```ts
xd.xenesis.tools.mcpOAuth.status
xd.xenesis.tools.mcpOAuth.open
xd.xenesis.tools.mcpOAuth.request
```

Assert `status` is read/never, `open` is control/never with optional `id`, and `request` is write/when-external with required `id`. Assert the schema accepts `linear`, and dispatch calls adapter methods named:

```ts
getXenesisToolMcpOAuthStatus
openXenesisToolMcpOAuth
requestXenesisToolMcpOAuth
```

- [x] **Step 2: Run test to verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: FAIL because the CR paths and adapter methods are not registered.

- [x] **Step 3: Register CR methods and dispatch**

Add schemas based on the external tool id enum, add the `xd.xenesis.tools.mcpOAuth` group beside `mcpInstallDrafts` and `oauthDrafts`, add adapter interface methods, and route the three paths through `callDeskBridgeCapability`.

- [x] **Step 4: Run CR test to verify GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: PASS for the MCP OAuth capability test and existing CR coverage.

### Task 3: Renderer Surface

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Test: `src/renderer/panes/xenesisConnectionCenter.test.ts`

- [x] **Step 1: Write the failing renderer test**

Assert `xenesisConnectionCenter` exports:

```ts
formatXenesisToolMcpOAuthSummary
buildXenesisToolMcpOAuthRequest
```

and that `XENESIS_CONNECTION_DETAIL_FOCUS_DATA_ATTRIBUTES['tool-mcp-oauth']` maps to `data-xenesis-tool-mcp-oauth`. Also assert `SettingsPane.tsx` references `toolMcpOAuth`, `formatXenesisToolMcpOAuthSummary`, and `buildXenesisToolMcpOAuthRequest`.

- [x] **Step 2: Run test to verify RED**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: FAIL because the renderer helper, focus attribute, and SettingsPane block do not exist.

- [x] **Step 3: Implement renderer support**

Add the formatter and request builder:

```ts
export function formatXenesisToolMcpOAuthSummary(oauth: XenesisConnectionToolMcpOAuthTemplate): string {
  return `${oauth.serverName} / ${oauth.transport} / ${oauth.status} / ${oauth.scopes.length} scope(s)`;
}

export function buildXenesisToolMcpOAuthRequest(item: XenesisConnectionItem): McpBridgeCapabilityCallRequest | null {
  if (!item.toolMcpOAuth) return null;
  return {
    path: 'xd.xenesis.tools.mcpOAuth.request',
    args: { id: item.id },
    source: 'xenesis',
    approved: true,
  };
}
```

Add a `tool-mcp-oauth` focus attribute and render a Connection Center detail block in `SettingsPane.tsx` with summary, scopes, credential refs, read/control paths, diagnostics, blocked actions, safety boundaries, and a request-review button.

- [x] **Step 4: Run renderer test to verify GREEN**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: PASS.

### Task 4: Natural Routing And Smokes

**Files:**
- Modify: `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`
- Test: `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

- [x] **Step 1: Write failing natural routing tests**

Add natural requests:

```ts
linear mcp oauth 상태 보여줘 -> xd.xenesis.tools.mcpOAuth.status { id: 'linear' }
linear mcp oauth 열어줘 -> xd.xenesis.tools.mcpOAuth.open { id: 'linear', ensureVisible: true }
linear mcp oauth 검토 요청해줘 -> xd.xenesis.tools.mcpOAuth.request { id: 'linear' }
```

- [x] **Step 2: Run tests to verify RED**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: FAIL because there are no mcpOAuth natural descriptors or smoke cases.

- [x] **Step 3: Implement natural descriptors**

Added a `toolMcpOAuth` connection target status/open descriptor using the existing OAuth context words plus a required MCP context group, and a review request descriptor for `xd.xenesis.tools.mcpOAuth.request`. The target is scoped to `tool`, and the CR/read model filters detailed availability to OAuth-capable MCP tools.

- [x] **Step 4: Run natural routing tests to verify GREEN**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: PASS.

### Task 5: Docs, Audit, Verification, Commit

**Files:**
- Modify: `docs/manual/11-external-tool-integrations.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-mcp-oauth-runtime-readiness.md`
- Modify: `handoff.md`
- Generated/updated by command: `docs/capability-registry-audit.md`

- [x] **Step 1: Update docs and handoff**

Document that Linear exposes a review-only MCP OAuth readiness surface through CR and Desk Connection Center, and state explicitly that it does not start OAuth or store tokens.

- [x] **Step 2: Run focused and broad verification**

Run:

```powershell
npx biome format --write src\shared\xenesisConnections.ts src\shared\types.ts src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\panes\SettingsPane.tsx src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\shared\xenesisNaturalLanguageActionResolvers.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs docs\manual\11-external-tool-integrations.md handoff.md
npx biome check src\shared\xenesisConnections.ts src\shared\types.ts src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\panes\SettingsPane.tsx src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\shared\xenesisNaturalLanguageActionResolvers.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80
npm run typecheck
npm run docs:capabilities:audit
rg -n "Missing registered paths|Missing dispatched coverage paths|Undispatched static callable methods|Dispatcher paths missing from tree" docs\capability-registry-audit.md
npm run smoke:xenesis:natural-desk-routing
npm run smoke:xenesis:connection-center
npm run build
git diff --check
```

Expected: changed-file Biome, typecheck, CR audit gap counters, natural routing smoke, Connection Center smoke, build, and diff check pass. `npm run lint` may remain blocked by the known repo-wide Biome/CRLF backlog; if run, record the exact result.

- [x] **Step 3: Commit**

Run:

```powershell
git status --short
git add -A
git add -f docs/superpowers/plans/2026-06-29-xenesis-mcp-oauth-runtime-readiness.md
git commit -m "feat: expose mcp oauth readiness"
```
