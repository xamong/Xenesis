# Xenesis Connection Diagnostic Runbooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CR-readable and CR-openable diagnostic runbooks for Connection Center provider, tool, gateway, messenger, guide, and onboarding cards.

**Architecture:** Reuse `buildXenesisConnectionsStatus()` as the source of truth and derive a `diagnosticRunbook` for each connection card from existing validation checks, readback paths, diagnostics, and control surfaces. The new `xd.xenesis.connections.diagnostics.status/open` paths only read or focus Settings; they do not execute tests, install tools, mutate settings, send messages, or complete OAuth.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Electron main-process CR adapter, React Settings pane, Biome.

---

### Task 1: RED Tests

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Add shared model expectation**

Add a test that expects Notion, Google Calendar, and Telegram cards to expose `diagnosticRunbook` metadata. Notion should include tool setup, connector, view, user-story, and install-plan steps; Google Calendar should stay planned; Telegram should include channel routing, safety, access-group, pairing, user-story, and messenger-view steps.

- [x] **Step 2: Add CR capability expectation**

Add a test that expects `xd.xenesis.connections.diagnostics.status` and `xd.xenesis.connections.diagnostics.open` to be registered and dispatch to adapter methods.

- [x] **Step 3: Add renderer helper expectation**

Add a test that expects `formatXenesisConnectionDiagnosticRunbookSummary` to summarize readiness and step count.

- [x] **Step 4: Add Agent prompt hint expectation**

Add a test that expects the Agent Desk-control prompt hint to include both new CR paths.

- [x] **Step 5: Run RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because diagnostic runbook metadata, CR paths, renderer formatter, and prompt hints are missing.

### Task 2: Shared Model And CR Projection

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Add diagnostic runbook types**

Add:

```ts
export type XenesisConnectionDiagnosticRunbookReadiness =
  | 'ready'
  | 'action-required'
  | 'planned'
  | 'disabled'
  | 'blocked'
  | 'unknown';

export interface XenesisConnectionDiagnosticRunbookStep {
  id: string;
  label: string;
  expectedState: string;
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
}

export interface XenesisConnectionDiagnosticRunbookTemplate {
  scope: XenesisConnectionKind;
  readiness: XenesisConnectionDiagnosticRunbookReadiness;
  primarySurface: string;
  setupSurface: string;
  steps: XenesisConnectionDiagnosticRunbookStep[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}
```

- [x] **Step 2: Attach runbooks**

Attach `diagnosticRunbook` to every Connection Center item by deriving steps from existing item metadata. Reuse existing validation/readback fields rather than inventing new runtime behavior.

- [x] **Step 3: Register CR paths**

Add:

```ts
xd.xenesis.connections.diagnostics.status
xd.xenesis.connections.diagnostics.open
```

`status` is read/no approval. `open` is control/no approval and focuses the requested connection card.

- [x] **Step 4: Add main-process helpers**

Use `getXenesisConnectionsStatus()` and flatten all sections, filtering items with `diagnosticRunbook`.

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

- [x] **Step 1: Add formatter**

Add:

```ts
export function formatXenesisConnectionDiagnosticRunbookSummary(
  runbook: XenesisConnectionDiagnosticRunbookTemplate,
): string {
  return `${runbook.readiness} / ${runbook.steps.length} diagnostic step(s)`;
}
```

- [x] **Step 2: Render Settings block**

Render `data-xenesis-connection-diagnostic-runbook="<connection-id>"` with readiness, setup surface, steps, read/control paths, diagnostics, and safety boundaries.

- [x] **Step 3: Update Agent prompt hint**

Add the two new paths to the useful direct CR path list.

- [x] **Step 4: Update docs**

Document that diagnostic runbooks are read/open planning surfaces and do not run checks, send messages, execute tools, complete OAuth, or mutate settings.

### Task 4: Verification And Commit

**Files:**
- Commit all touched files except ignored local `handoff.md`.

- [x] **Step 1: Run focused tests**

Run the RED/GREEN focused command again after implementation.

- [x] **Step 2: Run scoped formatting/checking**

Run targeted Biome format/check over the small changed shared/renderer/i18n files.

- [x] **Step 3: Run release gates**

Run:

```powershell
npm run typecheck
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Record the known public-release infra gap if `.github/workflows/ci.yml` is still absent.

- [x] **Step 4: Run live smoke**

Verify direct `xd.xenesis.connections.diagnostics.status`, direct `xd.xenesis.connections.diagnostics.open`, Settings DOM `[data-xenesis-connection-diagnostic-runbook="notion"]`, and Agent-pane fenced CR prompt.

- [x] **Step 5: Commit**

```powershell
git add -u
git add -f docs\superpowers\plans\2026-06-27-xenesis-connection-diagnostic-runbooks.md
git commit -m "feat: add xenesis connection diagnostic runbooks"
```
