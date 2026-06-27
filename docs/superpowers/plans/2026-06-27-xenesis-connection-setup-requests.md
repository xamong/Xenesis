# Xenesis Connection Setup Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-controlled setup request lifecycle for Connection Center cards that records reviewed setup requests in the existing Desk Action Inbox without executing installs, OAuth, tool calls, messages, or settings mutations.

**Architecture:** Reuse `buildXenesisConnectionsStatus()` as the source of truth and derive a `setupRequest` template from each card's existing setup, install-plan, connector, channel, guide, onboarding, and diagnostic metadata. Register `xd.xenesis.connections.setupRequests.status/open/request`; the `request` path is a write capability that records a local `xenesis-connection-setup` Action Inbox item through the existing main-process Action Inbox helper.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Electron main-process CR adapter, React Settings pane, existing MCP Action Inbox storage, Biome.

---

### Task 1: RED Tests

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [ ] **Step 1: Add shared setup request expectation**

Add a test that builds connection status and expects:

```ts
const notion = status.sections.tools.items.find((item) => item.id === 'notion');
assert.equal(notion?.setupRequest?.actionInboxKind, 'xenesis-connection-setup');
assert.equal(notion?.setupRequest?.readiness, 'action-required');
assert.deepEqual(notion?.setupRequest?.blockedActions, [
  'does not install MCP servers',
  'does not complete OAuth',
  'does not store tokens',
  'does not execute provider tools',
  'does not mutate provider/tool/channel settings',
  'does not send messages',
]);
assert.ok(notion?.setupRequest?.controlPaths.includes('xd.xenesis.connections.setupRequests.request'));
assert.ok(notion?.setupRequest?.readPaths.includes('xd.xenesis.connections.diagnostics.status'));

const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');
assert.equal(calendar?.setupRequest?.readiness, 'planned');
assert.match(calendar?.setupRequest?.description ?? '', /planned OAuth/i);

const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');
assert.equal(telegram?.setupRequest?.requestType, 'messenger-setup');
assert.ok(telegram?.setupRequest?.readPaths.includes('xd.xenesis.channels.pairing.status'));
```

- [ ] **Step 2: Add CR capability expectation**

Add a test that expects:

```ts
xd.xenesis.connections.setupRequests.status // read, approval never
xd.xenesis.connections.setupRequests.open // control, approval never
xd.xenesis.connections.setupRequests.request // write, approval when-external
```

Verify dispatch calls adapter methods:

```ts
getXenesisConnectionSetupRequestsStatus
openXenesisConnectionSetupRequest
requestXenesisConnectionSetup
```

- [ ] **Step 3: Add renderer helper expectation**

Add a formatter test:

```ts
assert.equal(
  formatXenesisConnectionSetupRequestSummary({
    readiness: 'action-required',
    steps: ['Create token', 'Paste env name'],
    requestType: 'tool-setup',
    // remaining fields filled with minimal arrays/strings
  }),
  'tool-setup / action-required / 2 setup step(s)',
);
```

- [ ] **Step 4: Add Agent prompt hint expectation**

Extend the high-value CR path test to expect:

```ts
xd.xenesis.connections.setupRequests.status
xd.xenesis.connections.setupRequests.open
xd.xenesis.connections.setupRequests.request
```

- [ ] **Step 5: Run RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because setup request metadata, CR paths, renderer formatter, and Agent prompt hints are missing.

### Task 2: Shared Model And CR Projection

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Add setup request types**

Add:

```ts
export type XenesisConnectionSetupRequestType =
  | 'onboarding-step'
  | 'provider-setup'
  | 'local-cli-setup'
  | 'mcp-setup'
  | 'gateway-setup'
  | 'tool-setup'
  | 'messenger-setup'
  | 'guide-review';

export interface XenesisConnectionSetupRequestTemplate {
  requestType: XenesisConnectionSetupRequestType;
  actionInboxKind: 'xenesis-connection-setup';
  readiness: XenesisConnectionDiagnosticRunbookReadiness;
  title: string;
  description: string;
  setupSurface: string;
  reviewSurface: string;
  steps: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  blockedActions: string[];
  safetyBoundaries: string[];
}
```

- [ ] **Step 2: Attach setup requests**

Derive `setupRequest` for every `XenesisConnectionItem` after diagnostic runbooks are attached. Use existing metadata only:

- onboarding: `onboardingPlan.validationChecks`
- provider: `providerSetup.verification`
- tool: `toolInstallPlan.installSteps`, `toolConnector.validationChecks`, `toolSetup.verification`
- messenger: pairing/safety/access/user-story metadata
- guide: guide prerequisites and validation checks

- [ ] **Step 3: Register CR paths**

Add:

```ts
xd.xenesis.connections.setupRequests.status
xd.xenesis.connections.setupRequests.open
xd.xenesis.connections.setupRequests.request
```

`status` is read/never, `open` is control/never, and `request` is write/when-external.

- [ ] **Step 4: Add main-process helpers**

Implement:

```ts
getXenesisConnectionSetupRequestsStatus(args?)
openXenesisConnectionSetupRequest(args?)
requestXenesisConnectionSetup(args?)
```

`requestXenesisConnectionSetup()` must call the existing `recordMcpActionInboxRequest()` with:

```ts
{
  kind: 'xenesis-connection-setup',
  title: setupRequest.title,
  command: `Review setup request for ${item.id}`,
  description: `${setupRequest.description}\n\nSteps:\n- ${setupRequest.steps.join('\n- ')}`,
  source: 'Xenesis Connection Center',
  sessionId: 'xenesis-connection-setup',
  approvalSessionKey: `xenesis-connection-setup:${item.id}`,
  risk: setupRequest.readiness,
  approveText: `Approve setup request for ${item.label}`,
  rejectText: `Reject setup request for ${item.label}`,
}
```

Return `{ ok: true, id, item, actionInboxItem }`.

### Task 3: UI, Agent Hint, Docs

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [ ] **Step 1: Add formatter**

Add:

```ts
export function formatXenesisConnectionSetupRequestSummary(
  request: XenesisConnectionSetupRequestTemplate,
): string {
  return `${request.requestType} / ${request.readiness} / ${request.steps.length} setup step(s)`;
}
```

- [ ] **Step 2: Render Settings block**

Render `data-xenesis-connection-setup-request="<connection-id>"` with summary, setup surface, review surface, steps, read/control paths, diagnostics, blocked actions, and safety boundaries.

- [ ] **Step 3: Update Agent prompt hint**

Add the three setup request CR paths to the Desk-control prompt hint and useful direct CR path list.

- [ ] **Step 4: Update docs**

Document that setup requests record Action Inbox items for review/approval and do not execute installs, OAuth, token storage, provider tools, messages, or settings mutations.

### Task 4: Verification And Commit

**Files:**
- Commit all touched files except ignored local `handoff.md`.

- [ ] **Step 1: Run focused tests**

Run the RED/GREEN focused command again after implementation.

- [ ] **Step 2: Run scoped formatting/checking**

Run targeted Biome format/check over the small changed shared/renderer/i18n files.

- [ ] **Step 3: Run release gates**

Run:

```powershell
npm run typecheck
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Record the known public-release infra gap if `.github/workflows/ci.yml` is still absent.

- [ ] **Step 4: Run live smoke**

Verify direct `xd.xenesis.connections.setupRequests.status`, direct approved `xd.xenesis.connections.setupRequests.request`, `xd.mcp.actionInbox.list`, Settings DOM `[data-xenesis-connection-setup-request="notion"]`, and Agent-pane fenced CR prompt.

- [ ] **Step 5: Commit**

```powershell
git add -u
git add -f docs\superpowers\plans\2026-06-27-xenesis-connection-setup-requests.md
git commit -m "feat: add xenesis connection setup requests"
```
