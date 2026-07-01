# Workbench Subagent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the current sibling Workbench Subagent surface into this repo without touching `packages/xenesis`.

**Architecture:** Add a focused renderer model for subagent profiles, workers, assignments, result parsing, and file-backed transport. Wire the XCON Agent Workbench pane to terminal/fs APIs for visible workers and expose the same behavior through CR-first `xd.workbench.subagents.*` bridge paths that main forwards to the renderer.

**Tech Stack:** TypeScript/React renderer, Electron preload/main IPC, existing Terminal/Fs/MCP bridge APIs, Node test runner with `tsx`, Capability Registry tests.

---

### Task 1: Focused RED Tests

**Files:**
- Create: `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts`
- Create: `src/shared/workbenchSubagentCapabilities.test.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchModel.test.ts`

- [ ] **Step 1: Add subagent model and Pane source tests**

Use the sibling test assertions for profile defaults, JSON profile loading, managed spawn plans, assignment envelopes, file-backed transport, result parsing, approval envelopes, and scrollback recovery. Keep the source assertions scoped to existing public integration points:

```ts
assert.match(source, /loadXconWorkbenchSubagentProfilesFromJsonFiles/);
assert.match(source, /createXconWorkbenchManagedSubagentSpawnPlan/);
assert.match(source, /createXconWorkbenchSubagentAssignmentFileTransport/);
assert.match(source, /recoverXconWorkbenchSubagentWorkerOutput/);
assert.match(source, /window\.mcpBridgeAPI\.onWorkbenchSubagentAction/);
assert.match(source, /terminalAPI\.spawn/);
assert.match(source, /terminalAPI\??\.adopt/);
assert.match(source, /writeFileBase64/);
```

- [ ] **Step 2: Add CR route test**

Create `src/shared/workbenchSubagentCapabilities.test.ts` with this behavior:

```ts
const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));
assert.ok(paths.has('xd.workbench.subagents.status'));
assert.ok(paths.has('xd.workbench.subagents.attachActiveTerminal'));
assert.ok(paths.has('xd.workbench.subagents.startManaged'));
assert.ok(paths.has('xd.workbench.subagents.plan'));
assert.ok(paths.has('xd.workbench.subagents.dispatch'));
assert.ok(paths.has('xd.workbench.subagents.stop'));
assert.ok(paths.has('xd.workbench.subagents.resolveApproval'));
assert.equal(findDeskBridgeCapability('xd.workbench.subagents.status')?.permission, 'read');
assert.equal(findDeskBridgeCapability('xd.workbench.subagents.dispatch')?.permission, 'execute');
```

Then call three paths through `callDeskBridgeCapability` and assert adapter calls:

```ts
assert.deepEqual(calls, [
  { action: 'status' },
  { action: 'attachActiveTerminal', profileName: 'researcher' },
  { action: 'dispatch', prompt: 'Smoke assignment' },
]);
```

- [ ] **Step 3: Run RED**

Run:

```powershell
node --import tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts src/shared/workbenchSubagentCapabilities.test.ts
```

Expected: FAIL because `xconAgentWorkbenchSubagents.ts` and `xd.workbench.subagents.*` do not exist yet.

### Task 2: Subagent Renderer Model

**Files:**
- Create: `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.ts`
- Test: `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts`

- [ ] **Step 1: Implement profile model**

Add exported types/functions for:

```ts
DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES
normalizeXconWorkbenchSubagentProfile()
loadXconWorkbenchSubagentProfilesFromJsonFiles()
mergeXconWorkbenchSubagentProfileLayers()
mergeXconWorkbenchSubagentProfiles()
selectXconWorkbenchSubagentProfileName()
createXconWorkbenchSubagentProfileTemplateFiles()
```

- [ ] **Step 2: Implement worker lifecycle and spawn plans**

Add exported functions:

```ts
createXconWorkbenchManagedSubagentSpawnPlan()
attachXconWorkbenchSubagentWorker()
updateXconWorkbenchSubagentWorkerStatus()
detachXconWorkbenchSubagentWorker()
```

Managed spawn metadata must use `kind: 'xenesis-workbench-subagent'` so it does not collide with the existing visible demo subagent metadata.

- [ ] **Step 3: Implement assignment/result protocol**

Add exported functions:

```ts
buildXconWorkbenchSubagentAssignmentEnvelope()
createXconWorkbenchSubagentAssignmentPlan()
createXconWorkbenchSubagentAssignmentFileTransport()
buildXconWorkbenchSubagentApprovalEnvelope()
parseXconWorkbenchSubagentResultBlocks()
applyXconWorkbenchSubagentResults()
recoverXconWorkbenchSubagentWorkerOutput()
resolveXconWorkbenchSubagentStatePath()
```

The parser must ignore the embedded result contract example and repair terminal-wrapped JSON where a quoted string is split before `",`.

- [ ] **Step 4: Run model GREEN**

Run:

```powershell
node --import tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts
```

Expected: PASS.

### Task 3: CR Bridge Types, Main, And Preload

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Test: `src/shared/workbenchSubagentCapabilities.test.ts`

- [ ] **Step 1: Add shared MCP bridge types**

In `src/shared/types.ts`, add:

```ts
export type McpBridgeWorkbenchSubagentAction =
  | 'status'
  | 'attachActiveTerminal'
  | 'startManaged'
  | 'plan'
  | 'dispatch'
  | 'stop'
  | 'resolveApproval';
```

Add payload/result interfaces and `McpBridgeApi.onWorkbenchSubagentAction()` plus `reportWorkbenchSubagentActionResult()`.

- [ ] **Step 2: Add CR adapter method and registry paths**

In `DeskBridgeCapabilityAdapter`, add:

```ts
workbenchSubagentAction?: (args: unknown) => Promise<unknown> | unknown;
```

Add `xd.workbench.subagents.*` under the top-level `xd` tree, with permissions:

```text
status: read
attachActiveTerminal: control
startManaged: execute
plan: control
dispatch: execute
stop: control
resolveApproval: control
```

Dispatch each path through `api.workbenchSubagentAction` with `{ action, ...args }`.

- [ ] **Step 3: Add main IPC request/response forwarding**

In `src/main/index.ts`, add a pending map for `McpBridgeWorkbenchSubagentActionResult`, sanitizers for request/result, `sendMcpWorkbenchSubagentActionToRenderer()`, adapter wiring, and an IPC handler for `mcp:workbench-subagent-action-result`.

- [ ] **Step 4: Add preload listener**

In `src/preload/index.ts`, expose `onWorkbenchSubagentAction()` and `reportWorkbenchSubagentActionResult()` on `mcpBridgeAPI`.

- [ ] **Step 5: Run CR GREEN**

Run:

```powershell
node --import tsx --test src/shared/workbenchSubagentCapabilities.test.ts
```

Expected: PASS.

### Task 4: Workbench Pane Integration

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/XconAgentWorkbenchPane.tsx`
- Test: `src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts`

- [ ] **Step 1: Extend cached pane state**

Add subagent profile, selected profile, selected managed CLI, worker list, attach error, and pending assignment fields to the cache state and clone/save paths.

- [ ] **Step 2: Load profile files**

Read JSON profiles from `resolveXconWorkbenchSubagentStatePath(xenesisHome, 'profiles')` using `fsAPI.readDir` and `fsAPI.readTextFile`, merge them over built-ins, and keep diagnostics in `subagentProfileNotice`.

- [ ] **Step 3: Add terminal event handling**

Use `terminalAPI.onData` to append output and parse results, `terminalAPI.onExit` to mark managed workers failed when they exit before completion, and `terminalAPI.adopt` to recover scrollback for managed workers.

- [ ] **Step 4: Add worker actions**

Implement attach active terminal, install profile templates, open profile folder, start managed worker, stop/detach worker, create assignment plan, dispatch pending assignments, resolve approval, and synthesize result summaries.

- [ ] **Step 5: Add CR bridge action handler**

Register `window.mcpBridgeAPI.onWorkbenchSubagentAction()` and support `status`, `attachActiveTerminal`, `startManaged`, `plan`, `dispatch`, `stop`, and `resolveApproval`.

- [ ] **Step 6: Render Workbench controls**

Add a compact worker control section before the composer with managed CLI/profile selects, attach/start/template/folder/plan/summarize actions, worker cards, pending approval buttons, and pending assignment dispatch/cancel controls.

- [ ] **Step 7: Run Pane GREEN**

Run:

```powershell
node --import tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts
```

Expected: PASS.

### Task 5: Broader Verification And Commit

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Run focused suite**

Run:

```powershell
node --import tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts src/shared/workbenchSubagentCapabilities.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchModel.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run CR audit if CR changed**

Run:

```powershell
npm run docs:capabilities:audit
```

Expected: missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0.

- [ ] **Step 3: Run broad gates**

Run:

```powershell
npm run typecheck
npm test
npm run check:public-release
```

Expected: PASS. `npm run lint` may still fail on the existing repository baseline including `packages/xenesis`; record the exact result without modifying `packages/xenesis`.

- [ ] **Step 4: Update handoff and commit**

Record exact commands and results in `handoff.md`, then commit all scoped files with:

```powershell
git add -f docs/superpowers/specs/2026-07-01-workbench-subagent-slice-design.md docs/superpowers/plans/2026-07-01-workbench-subagent.md
git add handoff.md src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/shared/workbenchSubagentCapabilities.test.ts src/main/index.ts src/preload/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/XconAgentWorkbenchPane.tsx src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchSubagents.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xconAgentWorkbenchModel.test.ts
git commit -m "Port Workbench subagent orchestration"
```
