# Slice 03 External Tools MCP/OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close Slice 03 by proving CR-backed external tool MCP/OAuth setup/readiness for Notion, Google Calendar, and Linear without exposing secrets or executing setup/readback side effects.

**Architecture:** The slice hardens the existing Connection Center and Capability Registry model instead of adding a real OAuth implementation. Notion remains an env-token MCP template with approval-gated config apply only after readiness; Google Calendar remains a planned OAuth setup packet/runtime readiness surface; Linear remains an explicit MCP OAuth readiness target. All setup/readback/preview paths are CR-discoverable and review-only unless they already delegate to the ready MCP install draft apply path.

**Tech Stack:** TypeScript, Electron main/renderer, Xenesis Desk Capability Registry, `tsx --test`, Node smoke scripts, Playwright Electron live smoke, repo-local Markdown/Obsidian working notes.

---

## File Structure

- Modify `handoff.md`
  - Active work log, exact commands, verification, known gaps, and next step.
- Modify `src/shared/xenesisConnections.test.ts`
  - Shared read-model contract for Slice 03 acceptance: Notion, Google Calendar, Linear, secret redaction, runtime blocking, and workflow-preview no-side-effect boundaries.
- Modify `src/shared/xenesisConnections.ts`
  - Only if the new shared contract finds a missing read path, blocked action, control path, safety boundary, or redaction gap.
- Modify `src/shared/xenesisConnectionCapabilities.test.ts`
  - CR dispatcher and source guards proving setup/readback paths do not dispatch to MCP config writers, token stores, external executors, or provider tool execution.
- Modify `src/shared/deskBridgeCapabilities.ts`
  - Only if a CR schema/dispatch gap is found by the new dispatcher tests or CR audit.
- Modify `src/main/index.ts`
  - Add Slice 03 live smoke snapshot check ids.
  - Only adjust OAuth/MCP request handlers if source guards find a forbidden side effect.
- Modify `scripts/xenesisConnectionCenterLiveSmoke.mjs`
  - Require exact Slice 03 live evidence check ids.
- Modify `scripts/xenesisConnectionCenterLiveSmoke.test.mjs`
  - RED/GREEN tests for the updated live smoke check contract.
- Modify `src/renderer/panes/xenesisConnectionCenter.test.ts`
  - Renderer helper contracts for ready MCP apply vs planned OAuth review/readback only.
- Modify `src/renderer/panes/xenesisConnectionCenter.ts`
  - Only if renderer helper tests find planned OAuth apply leakage or missing read/open requests.
- Modify `docs/manual/11-external-tool-integrations.md`
  - Document the verified Notion/Google Calendar/Linear boundary and exact live/check commands.
- Modify `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-03-external-tools-mcp-oauth.md`
  - Working-note implementation record and reference adoption summary.
- Modify `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`
  - Add Slice 03 OpenClaw/Hermes MCP/OAuth reference adoption row.

## Reference Adoption

| Reference | Original source checked | Borrowed pattern | Xenesis adaptation | Rejected behavior |
|---|---|---|---|---|
| OpenClaw MCP runtime/config | `F:\agent-anal\openclaw-main\src\agents\agent-bundle-mcp-runtime.ts`; `F:\agent-anal\openclaw-main\src\agents\agent-bundle-mcp-materialize.ts`; `F:\agent-anal\openclaw-main\src\agents\mcp-transport.ts`; `F:\agent-anal\openclaw-main\src\agents\mcp-config-shared.ts`; `F:\agent-anal\openclaw-main\src\agents\codex-mcp-config.ts` | Session-scoped MCP readiness, provider-safe config projection, redacted config summaries, and side-effect boundaries | CR read models expose install drafts, profile drafts, runtime readiness, and live smoke readbacks before provider tool use | Starting external MCP clients or executing provider tools during setup/readback |
| OpenClaw MCP OAuth | `F:\agent-anal\openclaw-main\src\agents\mcp-oauth.ts` | OAuth client/token-store boundary is explicit and credential values are not returned | Google Calendar exposes setup packet/runtime readiness with credential refs, redirect policy, scopes, token-store owner, and blocked actions | Running OAuth login or writing tokens in this slice |
| Hermes MCP OAuth/catalog | `F:\agent-anal\hermes-agent-main\tools\mcp_oauth.py`; `F:\agent-anal\hermes-agent-main\tools\mcp_oauth_manager.py`; `F:\agent-anal\hermes-agent-main\hermes_cli\mcp_catalog.py`; `F:\agent-anal\hermes-agent-main\tools\mcp_tool.py` | OAuth state/readiness and catalog install reviews are visible before tool registration/use | Linear has explicit MCP OAuth readiness; Notion has install/profile drafts; Google Calendar stays planned until verified OAuth/MCP setup exists | Catalog install execution, browser OAuth consent, token persistence, external mutation |

## Task 0: Handoff Before Product Code

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Record Slice 03 before any product code edit**

Update `handoff.md` with:

```markdown
## Active Slice 03 External Tools MCP/OAuth Planning

- Current objective:
  - Proceed with Slice 03 from the final-goal plan: finish CR-backed external
    tool setup/readiness evidence for Notion-style env-token MCP tools,
    Google Calendar-style OAuth setup packets, and Linear MCP OAuth readiness.
- Commands run:
  - Context reads only so far.
- Exact verification result:
  - No Slice 03 verification has been run yet in this turn.
  - No product code has been edited yet.
- Next intended step:
  - Execute `docs/superpowers/plans/2026-06-29-slice-03-external-tools-mcp-oauth.md`.
```

- [ ] **Step 2: Verify the handoff is present**

Run:

```powershell
rg -n "Active Slice 03 External Tools MCP/OAuth Planning" handoff.md
```

Expected: one match before editing `src/`, `scripts/`, or `docs/manual/`.

## Task 1: Live Smoke Contract RED

**Files:**
- Modify: `scripts/xenesisConnectionCenterLiveSmoke.test.mjs`

- [ ] **Step 1: Update the expected Slice 03 check ids in the smoke test**

Replace the expected array in `connection center live smoke requires exact reference baseline check ids` with this exact list:

```js
assert.deepEqual(CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS, [
  'reference-baseline:connection-center-root',
  'reference-baseline:connection-center-title',
  'reference-baseline:onboarding-guided-steps',
  'reference-baseline:provider-profile-review-steps',
  'reference-baseline:tool-profile-review-steps',
  'reference-baseline:tool-oauth-review-steps',
  'reference-baseline:tool-oauth-runtime-readback',
  'reference-baseline:external-tool-notion-mcp-readiness',
  'reference-baseline:external-tool-google-calendar-oauth-setup-packet',
  'reference-baseline:external-tool-google-calendar-oauth-runtime',
  'reference-baseline:external-tool-linear-mcp-oauth-readiness',
  'reference-baseline:external-tool-no-oauth-side-effect-boundary',
  'reference-baseline:channel-runtime-readback',
  'reference-baseline:channel-profile-review-steps',
]);
```

Update the two test assertions that embed missing/failing check ids so they use the new ids. The missing-check assertion should expect:

```js
'Missing reference baseline checks: reference-baseline:connection-center-root, reference-baseline:onboarding-guided-steps, reference-baseline:provider-profile-review-steps, reference-baseline:tool-profile-review-steps, reference-baseline:tool-oauth-review-steps, reference-baseline:tool-oauth-runtime-readback, reference-baseline:external-tool-notion-mcp-readiness, reference-baseline:external-tool-google-calendar-oauth-setup-packet, reference-baseline:external-tool-google-calendar-oauth-runtime, reference-baseline:external-tool-linear-mcp-oauth-readiness, reference-baseline:external-tool-no-oauth-side-effect-boundary, reference-baseline:channel-runtime-readback, reference-baseline:channel-profile-review-steps'
```

- [ ] **Step 2: Run the smoke contract test and confirm RED**

Run:

```powershell
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
```

Expected: FAIL because `scripts/xenesisConnectionCenterLiveSmoke.mjs` and `src/main/index.ts` do not yet contain the five new `external-tool:*` check ids.

## Task 2: Live Smoke Snapshot GREEN

**Files:**
- Modify: `scripts/xenesisConnectionCenterLiveSmoke.mjs`
- Modify: `src/main/index.ts`
- Test: `scripts/xenesisConnectionCenterLiveSmoke.test.mjs`

- [ ] **Step 1: Add the new required ids to the smoke script**

In `scripts/xenesisConnectionCenterLiveSmoke.mjs`, update `CONNECTION_CENTER_REFERENCE_BASELINE_CHECK_IDS` to the exact array from Task 1 Step 1.

- [ ] **Step 2: Add matching renderer snapshot checks**

In `src/main/index.ts`, inside `getConnectionCenterSnapshotForCapability`, extend the `checks` array after `reference-baseline:tool-oauth-runtime-readback` with:

```js
{
  id: 'reference-baseline:external-tool-notion-mcp-readiness',
  selector: '[data-xenesis-connection="notion"]',
  text: 'xd.xenesis.tools.mcpInstallDrafts.status',
},
{
  id: 'reference-baseline:external-tool-google-calendar-oauth-setup-packet',
  selector: '[data-xenesis-tool-oauth-setup-packet="google-calendar"]',
  text: 'GOOGLE_OAUTH_CLIENT_SECRET',
},
{
  id: 'reference-baseline:external-tool-google-calendar-oauth-runtime',
  selector: '[data-xenesis-tool-oauth-runtime="google-calendar"]',
  text: 'oauth-runtime-readiness',
},
{
  id: 'reference-baseline:external-tool-linear-mcp-oauth-readiness',
  selector: '[data-xenesis-tool-mcp-oauth="linear"]',
  text: 'linear:read-issues',
},
{
  id: 'reference-baseline:external-tool-no-oauth-side-effect-boundary',
  selector: '[data-xenesis-tool-oauth-draft="google-calendar"]',
  text: 'does not complete OAuth',
},
```

These value-bearing selectors are intentional: `SettingsPane.tsx` renders `data-xenesis-connection={item.id}`, `data-xenesis-tool-oauth-setup-packet={item.id}`, `data-xenesis-tool-oauth-runtime={item.id}`, and `data-xenesis-tool-mcp-oauth={item.id}`. If any selector fails in live smoke, inspect `src/renderer/panes/SettingsPane.tsx` before weakening it to a broad bare selector.

- [ ] **Step 3: Run the smoke contract test and confirm GREEN**

Run:

```powershell
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
```

Expected: PASS. The test also verifies the main-process snapshot source contains all exact ids.

## Task 3: Shared Read Model Acceptance Contracts

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnections.ts` only if this task fails.

- [ ] **Step 1: Add the Slice 03 acceptance test**

Append this test near the existing external tool tests in `src/shared/xenesisConnections.test.ts`:

```ts
test('slice 03 external tool MCP/OAuth acceptance is explicit and secret-safe', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'codex-app-server',
      model: 'gpt-5-codex',
      apiKey: '',
      baseUrl: '',
    },
    mcp: {
      available: true,
      serverPath: 'E:/xenesis/mcp/xenesis-desk-mcp-server.mjs',
      bridgeUrl: 'http://127.0.0.1:3845',
      bridgeStatePath: 'C:/Users/example/.xenis/mcp/bridge.json',
      configFilePath: 'C:/Users/example/.xenis/mcp/xenesis-mcp-config.json',
    },
    providerIntegration: {
      cliTargets: [],
      hermes: {
        assetRoot: '',
        hermesRoot: '',
        assetAvailable: false,
        rootConfigured: false,
        pluginsInstalled: false,
        items: [],
      },
    },
    xenesis: null,
    env: {
      NOTION_TOKEN: 'slice03-secret-notion-token',
      GOOGLE_OAUTH_CLIENT_SECRET: 'slice03-secret-google-client-secret',
    },
  });

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const googleCalendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');
  const linear = status.sections.tools.items.find((item) => item.id === 'linear');

  assert.equal(notion?.mcpTemplate?.serverName, 'notion');
  assert.equal(notion?.mcpInstallDraft?.draftStatus, 'ready');
  assert.equal(notion?.mcpInstallDraft?.controlPaths.includes('xd.xenesis.tools.mcpInstallDrafts.apply'), true);
  assert.equal(notion?.toolProfileDraft?.draftStatus, 'ready');
  assert.equal(notion?.toolProfileDraft?.controlPaths.includes('xd.xenesis.tools.profileDrafts.apply'), true);
  assert.equal(notion?.toolRuntime?.runtimeStatus, 'ready');
  assert.equal(notion?.toolRuntime?.readbackChecks.includes('notion-search-read'), true);
  assert.equal(Boolean(notion?.toolActionCatalog?.groups.length), true);
  assert.equal(notion?.toolUserStory?.storyContract.readbackPaths.includes('xd.xenesis.tools.runtime.status'), true);

  assert.equal(googleCalendar?.toolOAuthDraft?.setupPacket.packetStatus, 'planned-template');
  assert.equal(googleCalendar?.toolOAuthDraft?.setupPacket.credentialRefs.some((ref) => ref.ref === 'GOOGLE_OAUTH_CLIENT_SECRET'), true);
  assert.equal(googleCalendar?.toolOAuthDraft?.setupPacket.redirectUriPolicy.includes('Desk does not start an OAuth callback server'), true);
  assert.equal(googleCalendar?.toolOAuthDraft?.setupPacket.scopes.includes('calendar.freebusy.readonly'), true);
  assert.equal(googleCalendar?.toolOAuthDraft?.setupPacket.tokenStore, 'selected MCP OAuth token store');
  assert.equal(googleCalendar?.toolOAuthRuntime?.tokenStoreOwner, 'selected MCP OAuth runtime');
  assert.equal(googleCalendar?.toolOAuthRuntime?.readPaths.includes('xd.xenesis.tools.oauthRuntime.status'), true);
  assert.equal(googleCalendar?.toolRuntime?.runtimeStatus, 'planned-oauth');
  assert.equal(googleCalendar?.toolRuntime?.blockedActions.includes('execute provider tools before runtime readback'), true);
  assert.equal(googleCalendar?.toolRuntime?.blockedActions.includes('complete OAuth'), true);
  assert.equal(googleCalendar?.toolRuntime?.blockedActions.includes('mutate calendar events'), true);

  assert.equal(linear?.toolMcpOAuth?.tool, 'linear');
  assert.equal(linear?.toolMcpOAuth?.authMode, 'oauth');
  assert.equal(linear?.toolMcpOAuth?.readPaths.includes('xd.xenesis.tools.mcpOAuth.status'), true);
  assert.equal(linear?.toolMcpOAuth?.blockedActions.includes('start OAuth flow'), true);
  assert.equal(linear?.toolMcpOAuth?.blockedActions.includes('write MCP config'), true);
  assert.equal(linear?.toolRuntime?.readbackChecks.includes('linear-issue-read'), true);

  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes('slice03-secret-notion-token'), false);
  assert.equal(serialized.includes('slice03-secret-google-client-secret'), false);
});
```

- [ ] **Step 2: Add the setup/readback no-side-effect contract test**

Append this test in the same file:

```ts
test('slice 03 setup packets and workflow previews stay read/open and side-effect free', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'codex-app-server',
      model: 'gpt-5-codex',
      apiKey: '',
      baseUrl: '',
    },
    mcp: {
      available: true,
      serverPath: 'E:/xenesis/mcp/xenesis-desk-mcp-server.mjs',
      bridgeUrl: 'http://127.0.0.1:3845',
      bridgeStatePath: 'C:/Users/example/.xenis/mcp/bridge.json',
      configFilePath: 'C:/Users/example/.xenis/mcp/xenesis-mcp-config.json',
    },
    providerIntegration: {
      cliTargets: [],
      hermes: {
        assetRoot: '',
        hermesRoot: '',
        assetAvailable: false,
        rootConfigured: false,
        pluginsInstalled: false,
        items: [],
      },
    },
    xenesis: null,
  });

  const googleCalendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');
  const surfaces = [
    googleCalendar?.toolOAuthDraft,
    googleCalendar?.toolOAuthDraft?.setupPacket,
    googleCalendar?.toolOAuthRuntime,
    googleCalendar?.toolRuntime,
    googleCalendar?.toolSetupPlan,
  ].filter(Boolean);

  for (const surface of surfaces) {
    const text = JSON.stringify(surface);
    for (const expected of ['complete OAuth', 'store tokens', 'write MCP config', 'execute provider tools', 'mutate external systems']) {
      assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    }
    assert.doesNotMatch(text, /client_secret["']?\s*[:=]\s*["'][^"']+/i);
    assert.doesNotMatch(text, /access_token["']?\s*[:=]\s*["'][^"']+/i);
    assert.doesNotMatch(text, /refresh_token["']?\s*[:=]\s*["'][^"']+/i);
  }

  const preview = googleCalendar?.toolSetupPlan?.workflowPreview;
  assert.ok(preview);
  assert.equal(preview.previewPath, 'xd.automation.workflow.preview');
  assert.equal(preview.runPath, 'xd.automation.workflow.run');
  assert.equal(preview.steps.length > 0, true);
  const allowedPreviewPaths = new Set([
    'xd.xenesis.tools.views.open',
    'xd.xenesis.tools.setup.open',
    'xd.xenesis.tools.connectors.open',
    'xd.xenesis.tools.installPlans.open',
    'xd.xenesis.tools.runtime.open',
    'xd.xenesis.tools.profileDrafts.open',
    'xd.xenesis.tools.mcpInstallDrafts.open',
    'xd.xenesis.tools.actions.open',
    'xd.xenesis.tools.userStories.open',
    'xd.xenesis.connections.diagnostics.open',
    'xd.xenesis.connections.setupRequests.open',
    'xd.xenesis.tools.oauthDrafts.open',
    'xd.xenesis.tools.oauthDrafts.setupPacket.open',
    'xd.xenesis.tools.oauthRuntime.open',
  ]);
  for (const step of preview.steps) {
    assert.equal(step.approved, false);
    assert.equal(allowedPreviewPaths.has(step.path), true, `${step.path} should be a setup preview read/open path`);
  }
  assert.match(preview.safetyBoundary, /does not execute provider tools/i);
  assert.match(preview.safetyBoundary, /complete OAuth/i);
  assert.match(preview.safetyBoundary, /store tokens/i);
});
```

- [ ] **Step 3: Run the shared read-model test**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS if the current read model already meets Slice 03. If it fails, make the minimal change in `src/shared/xenesisConnections.ts` to add the missing read path, blocked action, safety boundary, or redacted state named by the assertion, then rerun the command until PASS.

## Task 4: CR Dispatcher and Main Handler No-Side-Effect Guards

**Files:**
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts` only if dispatch/schema gaps are found.
- Modify: `src/main/index.ts` only if source guards find forbidden calls in setup/readback handlers.

- [ ] **Step 1: Add a dispatcher test with a fake dangerous adapter**

Append this test after the MCP/OAuth capability tests in `src/shared/xenesisConnectionCapabilities.test.ts`:

```ts
test('slice 03 setup and readback CR paths do not dispatch to external side-effect adapters', async () => {
  const calls: Array<{ method: string; args: unknown }> = [];
  const dangerousCalls: string[] = [];
  const dangerousMethods = new Set([
    'applyXenesisToolMcpInstallDraft',
    'applyXenesisToolProfileDraft',
    'applyXenesisConnectionSetupRequest',
    'testXenesisChannelProfile',
    'applyXenesisChannelProfileDraft',
    'applyXenesisProviderProfileDraft',
  ]);
  const api = new Proxy(
    {
      getXenesisToolOAuthDraftsStatus: (args: unknown) => {
        calls.push({ method: 'oauthDrafts.status', args });
        return { ok: true, items: [{ id: 'google-calendar', draftStatus: 'planned-template' }] };
      },
      getXenesisToolOAuthSetupPacket: (args: unknown) => {
        calls.push({ method: 'oauthDrafts.setupPacket', args });
        return { ok: true, items: [{ id: 'google-calendar', setupPacket: { packetStatus: 'planned-template' } }] };
      },
      openXenesisToolOAuthSetupPacket: (args: unknown) => {
        calls.push({ method: 'oauthDrafts.setupPacket.open', args });
        return { ok: true, item: { id: 'google-calendar' } };
      },
      getXenesisToolOAuthRuntimeStatus: (args: unknown) => {
        calls.push({ method: 'oauthRuntime.status', args });
        return { ok: true, items: [{ id: 'google-calendar', runtimeStatus: 'planned-template' }] };
      },
      openXenesisToolOAuthRuntime: (args: unknown) => {
        calls.push({ method: 'oauthRuntime.open', args });
        return { ok: true, item: { id: 'google-calendar' } };
      },
      requestXenesisToolOAuthRuntime: (args: unknown) => {
        calls.push({ method: 'oauthRuntime.request', args });
        return { ok: true, id: 'google-calendar', actionInboxItem: { id: 'oauth-runtime-review' } };
      },
      getXenesisToolMcpOAuthStatus: (args: unknown) => {
        calls.push({ method: 'mcpOAuth.status', args });
        return { ok: true, items: [{ id: 'linear', status: 'ready-template' }] };
      },
      openXenesisToolMcpOAuth: (args: unknown) => {
        calls.push({ method: 'mcpOAuth.open', args });
        return { ok: true, item: { id: 'linear' } };
      },
      requestXenesisToolMcpOAuth: (args: unknown) => {
        calls.push({ method: 'mcpOAuth.request', args });
        return { ok: true, id: 'linear', actionInboxItem: { id: 'mcp-oauth-review' } };
      },
      getXenesisToolRuntimeStatus: (args: unknown) => {
        calls.push({ method: 'runtime.status', args });
        return { ok: true, items: [{ id: 'google-calendar', runtimeStatus: 'planned-oauth' }] };
      },
    } as DeskBridgeCapabilityAdapter,
    {
      get(target, prop, receiver) {
        if (dangerousMethods.has(String(prop))) {
          dangerousCalls.push(String(prop));
          throw new Error(`unexpected dangerous adapter call: ${String(prop)}`);
        }
        return Reflect.get(target, prop, receiver);
      },
    },
  );

  const requests = [
    { path: 'xd.xenesis.tools.oauthDrafts.status', args: { tool: 'google-calendar' } },
    { path: 'xd.xenesis.tools.oauthDrafts.setupPacket', args: { id: 'google-calendar' } },
    { path: 'xd.xenesis.tools.oauthDrafts.setupPacket.open', args: { id: 'google-calendar', ensureVisible: true } },
    { path: 'xd.xenesis.tools.oauthRuntime.status', args: { tool: 'google-calendar' } },
    { path: 'xd.xenesis.tools.oauthRuntime.open', args: { id: 'google-calendar' } },
    { path: 'xd.xenesis.tools.oauthRuntime.request', args: { id: 'google-calendar' }, approved: true },
    { path: 'xd.xenesis.tools.mcpOAuth.status', args: { tool: 'linear' } },
    { path: 'xd.xenesis.tools.mcpOAuth.open', args: { id: 'linear' } },
    { path: 'xd.xenesis.tools.mcpOAuth.request', args: { id: 'linear' }, approved: true },
    { path: 'xd.xenesis.tools.runtime.status', args: { tool: 'google-calendar' } },
  ];

  for (const request of requests) {
    const result = await callDeskBridgeCapability(api, {
      ...request,
      source: 'xenesis',
    });
    assert.equal(result.ok, true, request.path);
  }

  assert.deepEqual(dangerousCalls, []);
  assert.deepEqual(
    calls.map((call) => call.method),
    [
      'oauthDrafts.status',
      'oauthDrafts.setupPacket',
      'oauthDrafts.setupPacket.open',
      'oauthRuntime.status',
      'oauthRuntime.open',
      'oauthRuntime.request',
      'mcpOAuth.status',
      'mcpOAuth.open',
      'mcpOAuth.request',
      'runtime.status',
    ],
  );
});
```

- [ ] **Step 2: Add AST source guards for main-process setup/readback handlers**

Add this import at the top of `src/shared/xenesisConnectionCapabilities.test.ts`:

```ts
import ts from 'typescript';
```

Append this helper and test in the same file:

```ts
function collectFunctionCallExpressions(source: string, functionName: string): string[] {
  const file = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let target: ts.FunctionDeclaration | undefined;

  const findTarget = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) target = node;
    if (!target) ts.forEachChild(node, findTarget);
  };
  findTarget(file);
  assert.ok(target, `${functionName} should exist`);

  const calls: string[] = [];
  const readExpressionName = (expression: ts.Expression): string => {
    if (ts.isIdentifier(expression)) return expression.text;
    if (ts.isPropertyAccessExpression(expression)) {
      return `${readExpressionName(expression.expression)}.${expression.name.text}`;
    }
    if (ts.isElementAccessExpression(expression)) {
      return `${readExpressionName(expression.expression)}[]`;
    }
    return expression.getText(file);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) calls.push(readExpressionName(node.expression));
    ts.forEachChild(node, visit);
  };
  visit(target);
  return calls;
}

test('slice 03 main setup/readback handlers do not call token stores, MCP writers, or external executors', () => {
  const mainSource = readFileSync(new URL('../main/index.ts', import.meta.url), 'utf8');
  const guardedFunctions = [
    'getXenesisToolOAuthDraftsStatus',
    'getXenesisToolOAuthSetupPacket',
    'openXenesisToolOAuthDraft',
    'openXenesisToolOAuthSetupPacket',
    'requestXenesisToolOAuthDraft',
    'getXenesisToolOAuthRuntimeStatus',
    'openXenesisToolOAuthRuntime',
    'requestXenesisToolOAuthRuntime',
    'getXenesisToolMcpOAuthStatus',
    'openXenesisToolMcpOAuth',
    'requestXenesisToolMcpOAuth',
    'getXenesisToolRuntimeStatus',
    'openXenesisToolRuntime',
    'requestXenesisToolRuntime',
  ];
  const forbiddenCalls = new Set([
    'installExternalMcpServer',
    'applyXenesisToolMcpInstallDraft',
    'applyXenesisToolProfileDraft',
    'applyXenesisConnectionSetupRequest',
    'writeProfiles',
    'readXenesisChannelSecret',
    'runXenesisChannelSend',
    'fs.promises.writeFile',
    'fs.writeFileSync',
    'writeMcpBridgeStateFile',
  ]);

  for (const functionName of guardedFunctions) {
    const calls = collectFunctionCallExpressions(mainSource, functionName);
    for (const forbidden of forbiddenCalls) {
      assert.equal(
        calls.some((call) => call === forbidden || call.endsWith(`.${forbidden}`)),
        false,
        `${functionName} must not call ${forbidden}`,
      );
    }
  }
});
```

- [ ] **Step 3: Add approval-gate assertions for review request paths**

Append this test in the same file:

```ts
test('slice 03 review request paths require approval for external callers before dispatch', async () => {
  const dangerousCalls: string[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    requestXenesisToolOAuthRuntime: () => {
      dangerousCalls.push('requestXenesisToolOAuthRuntime');
      return { ok: true };
    },
    requestXenesisToolMcpOAuth: () => {
      dangerousCalls.push('requestXenesisToolMcpOAuth');
      return { ok: true };
    },
    requestXenesisToolOAuthDraft: () => {
      dangerousCalls.push('requestXenesisToolOAuthDraft');
      return { ok: true };
    },
  };

  for (const request of [
    { path: 'xd.xenesis.tools.oauthRuntime.request', args: { id: 'google-calendar' } },
    { path: 'xd.xenesis.tools.mcpOAuth.request', args: { id: 'linear' } },
    { path: 'xd.xenesis.tools.oauthDrafts.request', args: { id: 'google-calendar' } },
  ]) {
    const result = await callDeskBridgeCapability(api, {
      ...request,
      source: 'xenesis-slice-03-test',
      approved: false,
    });
    assert.equal(result.ok, false, request.path);
    assert.equal(result.approvalRequired, true, request.path);
  }

  assert.deepEqual(dangerousCalls, []);
});
```

Keep the `approved: true` dispatcher test from Step 1 as a narrow adapter wiring test only; it proves the intended adapter is called after approval has been granted.

- [ ] **Step 4: Run the CR capability tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: PASS. If a forbidden call is found, remove it from the setup/readback handler and route mutation only through the existing approval-gated apply path. If a dispatcher gap is found, fix `src/shared/deskBridgeCapabilities.ts` and rerun.

## Task 5: Renderer Request Boundary Contracts

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts` only if planned OAuth apply leakage is found.

- [ ] **Step 1: Add renderer helper tests for planned OAuth vs ready MCP apply**

Append this test near the existing tool request builder tests:

```ts
test('slice 03 renderer helper requests keep planned OAuth readback separate from ready MCP apply', () => {
  const googleCalendar = {
    id: 'google-calendar',
    toolOAuthDraft: {
      setupPacket: { packetStatus: 'planned-template' },
    },
    toolOAuthRuntime: {
      runtimeStatus: 'planned-template',
    },
    toolProfileDraft: {
      draftStatus: 'planned-template',
      controlPaths: [
        'xd.xenesis.tools.profileDrafts.open',
        'xd.xenesis.tools.profileDrafts.request',
        'xd.xenesis.tools.profileDrafts.apply',
      ],
    },
  } as unknown as XenesisConnectionItem;
  const notion = {
    id: 'notion',
    mcpInstallDraft: {
      draftStatus: 'ready',
      controlPaths: ['xd.xenesis.tools.mcpInstallDrafts.request', 'xd.xenesis.tools.mcpInstallDrafts.apply'],
    },
    toolProfileDraft: {
      draftStatus: 'ready',
      controlPaths: ['xd.xenesis.tools.profileDrafts.request', 'xd.xenesis.tools.profileDrafts.apply'],
    },
  } as unknown as XenesisConnectionItem;

  assert.deepEqual(buildXenesisToolOAuthSetupPacketRequest(googleCalendar), {
    path: 'xd.xenesis.tools.oauthDrafts.setupPacket',
    args: { id: 'google-calendar' },
    source: 'xenesis',
    approved: false,
  });
  assert.deepEqual(buildXenesisToolOAuthSetupPacketOpenRequest(googleCalendar), {
    path: 'xd.xenesis.tools.oauthDrafts.setupPacket.open',
    args: { id: 'google-calendar', ensureVisible: true },
    source: 'xenesis',
    approved: false,
  });
  assert.deepEqual(buildXenesisToolOAuthRuntimeRequest(googleCalendar), {
    path: 'xd.xenesis.tools.oauthRuntime.request',
    args: { id: 'google-calendar' },
    source: 'xenesis',
    approved: true,
  });
  assert.equal(buildXenesisMcpInstallDraftApplyRequest(googleCalendar), null);
  assert.equal(buildXenesisToolProfileDraftApplyRequest(googleCalendar), null);

  assert.deepEqual(buildXenesisMcpInstallDraftApplyRequest(notion), {
    path: 'xd.xenesis.tools.mcpInstallDrafts.apply',
    args: { id: 'notion', target: 'codex' },
    source: 'xenesis',
    approved: false,
  });
  assert.deepEqual(buildXenesisToolProfileDraftApplyRequest(notion), {
    path: 'xd.xenesis.tools.profileDrafts.apply',
    args: { id: 'notion', target: 'codex' },
    source: 'xenesis',
    approved: false,
  });
});
```

- [ ] **Step 2: Run the renderer helper tests**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: RED initially if `buildXenesisToolProfileDraftApplyRequest` only checks the apply control path. Fix `src/renderer/panes/xenesisConnectionCenter.ts` so it also requires `item.toolProfileDraft.draftStatus === 'ready'`, then rerun until PASS.

## Task 6: Documentation and Obsidian Working Notes

**Files:**
- Modify: `docs/manual/11-external-tool-integrations.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-03-external-tools-mcp-oauth.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`
- Modify: `handoff.md`

- [ ] **Step 1: Update the manual with Slice 03 verification evidence**

In `docs/manual/11-external-tool-integrations.md`, add a section named `## Slice 03 Verified Boundaries` after the existing CR path list:

```markdown
## Slice 03 Verified Boundaries

- Notion is the env-token MCP acceptance target: status/readback exposes the MCP template, MCP install draft, tool profile draft, generic runtime readiness, action catalog, and user-story contract before provider tool execution.
- Google Calendar is the planned OAuth acceptance target: status/readback exposes the OAuth setup packet, credential references, redirect URI policy, scopes, selected token-store state, OAuth runtime readiness, and blocked calendar mutations.
- Linear remains an explicit MCP OAuth readiness target through `xd.xenesis.tools.mcpOAuth.status`, `xd.xenesis.tools.mcpOAuth.open`, and `xd.xenesis.tools.mcpOAuth.request`.
- Setup packets, OAuth runtime readiness, MCP OAuth readiness, setup-plan workflow previews, and user-story previews do not start OAuth, store tokens, write MCP config, execute provider tools, or mutate external systems.
- The only config write path in this slice is the existing approval-gated ready MCP install draft apply path for ready env-token MCP drafts.
```

- [ ] **Step 2: Update the Slice 03 Obsidian working note**

Append this section to `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-03-external-tools-mcp-oauth.md`:

```markdown
## Implementation Plan

- Plan file: `docs/superpowers/plans/2026-06-29-slice-03-external-tools-mcp-oauth.md`
- Acceptance targets: Notion env-token MCP, Google Calendar planned OAuth setup packet/runtime readiness, Linear MCP OAuth readiness.
- Safety boundary: setup/readback/preview surfaces are review/read/open only and do not start OAuth, store tokens, write MCP config, execute provider tools, or mutate external systems.
- Live evidence: `scripts/xenesisConnectionCenterLiveSmoke.mjs` must report exact Slice 03 reference baseline ids for Notion, Google Calendar, Linear, and the no-side-effect OAuth boundary.
```

- [ ] **Step 3: Update the reference adoption proposal**

Append this row to the current map in `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`:

```markdown
| Slice 03 External Tools MCP/OAuth | `F:\agent-anal\analysis\openclaw-main\06-mcp-integration.md`; `F:\agent-anal\analysis\hermes-agent-main\07-mcp-integration.md` | `F:\agent-anal\openclaw-main\src\agents\agent-bundle-mcp-runtime.ts`; `F:\agent-anal\openclaw-main\src\agents\mcp-oauth.ts`; `F:\agent-anal\hermes-agent-main\tools\mcp_oauth.py`; `F:\agent-anal\hermes-agent-main\tools\mcp_oauth_manager.py`; `F:\agent-anal\hermes-agent-main\hermes_cli\mcp_catalog.py` | MCP runtime readiness, config projection, OAuth/token-store boundary, catalog install review | CR readback/setup packet/runtime readiness for Notion, Google Calendar, and Linear | Browser OAuth completion, token storage, MCP config writes during readback, provider tool execution during setup |
```

- [ ] **Step 4: Update handoff with commands and results**

Add a `Slice 03 implementation progress` block to `handoff.md` with:

- files touched
- each command run
- exact pass/fail result
- known gaps
- next intended step

Use the same bullet format already present in `handoff.md`.

## Task 7: Verification, Live Smoke, Audit, and Commit

**Files:**
- Verify all changed files.
- Commit all Slice 03 changes.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run CR audit and typechecks**

Run:

```powershell
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
npm run typecheck
npm --prefix packages/xenesis run typecheck
```

Expected:

- CR audit counters are 0.
- Root typecheck passes.
- Package typecheck passes.

- [ ] **Step 3: Build and live smoke**

Run:

```powershell
npm run build
node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json --timeout=120000
node .\scripts\xenesisProviderOnboardingLiveSmoke.mjs --json --timeout=180000
```

Expected:

- Build passes. Existing Vite warnings are acceptable only if they match the known `hwp.js` browser-externalized `fs` and mixed static/dynamic `src/renderer/deskBridge.ts` import warnings.
- Live smoke JSON has `ok: true`.
- Live smoke `checks` includes all five Slice 03 ids:
  - `reference-baseline:external-tool-notion-mcp-readiness`
  - `reference-baseline:external-tool-google-calendar-oauth-setup-packet`
  - `reference-baseline:external-tool-google-calendar-oauth-runtime`
  - `reference-baseline:external-tool-linear-mcp-oauth-readiness`
  - `reference-baseline:external-tool-no-oauth-side-effect-boundary`
- Provider onboarding live smoke JSON has `ok: true` and proves a real configured provider made a natural-language MCP/CR tool call with `providerNaturalLanguageToolSelectionProof=true`, `hasCrMcpToolEvidence=true`, and `hasCrReadbackAfterPrompt=true`.

- [ ] **Step 4: Package test and hygiene**

Run:

```powershell
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run build
npm --prefix packages/xenesis run provider:smoke
npm run lint
npm run check:public-release
git diff --check
git status --short
```

Expected:

- Package tests pass.
- Package build passes.
- Provider smoke passes.
- `npm run lint` passes, or any existing repo-wide lint debt is recorded with exact failure output in `handoff.md`.
- `npm run check:public-release` passes, or the known missing `.github/workflows/ci.yml` public-release gap is recorded with exact output in `handoff.md`.
- `git diff --check` exits 0 with at most LF/CRLF normalization warnings.
- `git status --short` shows only intended Slice 03 files.

- [ ] **Step 5: Commit**

Run:

```powershell
git add handoff.md docs\manual\11-external-tool-integrations.md docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-29-slice-03-external-tools-mcp-oauth.md docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-29-reference-adoption-map-proposal.md scripts\xenesisConnectionCenterLiveSmoke.mjs scripts\xenesisConnectionCenterLiveSmoke.test.mjs src\main\index.ts src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts
git commit -m "test: harden external tool MCP OAuth readiness"
```

Expected: Commit succeeds. If `docs/superpowers/plans/2026-06-29-slice-03-external-tools-mcp-oauth.md` is ignored, add it explicitly with `git add -f docs\superpowers\plans\2026-06-29-slice-03-external-tools-mcp-oauth.md` before the commit.

## Self-Review

Spec coverage:

- Notion MCP template/install/profile/runtime/action/user-story acceptance is covered by Task 3 and live smoke in Task 2.
- Google Calendar OAuth setup packet, credential refs, redirect policy, scopes, token-store state, runtime readiness, and blocked mutations are covered by Task 3 and live smoke in Task 2.
- Linear MCP OAuth readiness is covered by Task 3, Task 4, and live smoke in Task 2.
- Setup/readback/preview no-side-effect requirements are covered by Task 3 workflow-preview checks, Task 4 dispatcher/source guards, and Task 5 renderer request boundary checks.
- Secret redaction is covered by Task 3 and manual docs in Task 6.
- Reference adoption map updates are covered by Task 6.

Placeholder scan:

- No open placeholder steps remain.
- Each code-changing step names exact files, snippets, commands, and expected outcomes.

Type consistency:

- CR paths use existing `xd.xenesis.tools.*` names.
- Detail focus values use existing `tool-oauth-setup-packet`, `tool-oauth-runtime`, `tool-mcp-oauth`, `mcp-install-draft`, and `tool-profile-draft`.
- Renderer helper names match existing exports from `src/renderer/panes/xenesisConnectionCenter.ts`.
