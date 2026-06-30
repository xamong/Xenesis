# Xenesis Onboarding Status Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CR-readable and CR-openable Xenesis onboarding/initial-setup readiness surfaces derived from the existing Connection Center checklist.

**Architecture:** Keep the Connection Center onboarding section as the single source of truth. Add thin CR adapter paths that project `sections.onboarding` into an explicit onboarding status model and open Settings > Xenesis Agent > Connections focused on a selected onboarding step.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Electron main-process CR adapter, React Settings pane, Biome.

---

### Task 1: RED Tests For Onboarding Status

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [ ] **Step 1: Add shared model expectation**

Add a test that expects each onboarding checklist item to carry an `onboardingPlan` object with the setup phase, primary surface, read/control paths, validation checks, and safety boundaries.

- [ ] **Step 2: Add CR capability expectation**

Add a test that expects `xd.xenesis.onboarding.status` and `xd.xenesis.onboarding.open` to be registered and dispatched to adapter methods.

- [ ] **Step 3: Add renderer helper expectation**

Add a test that expects `formatXenesisOnboardingPlanSummary` to summarize a checklist item's onboarding plan.

- [ ] **Step 4: Add Agent prompt hint expectation**

Add a test that expects the Agent Desk-control prompt hint to include `xd.xenesis.onboarding.status` and `xd.xenesis.onboarding.open`.

- [ ] **Step 5: Run RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because `onboardingPlan`, the new CR paths, the formatter, and prompt hint entries are missing.

### Task 2: Minimal Shared Model And CR Adapter

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Add `XenesisConnectionOnboardingPlanTemplate`**

Fields:

```ts
export interface XenesisConnectionOnboardingPlanTemplate {
  phase: 'first-chat' | 'local-runtime' | 'external-tools' | 'gateway' | 'messenger-routing' | 'end-to-end-test';
  primarySurface: string;
  setupSurface: string;
  statusReadPaths: string[];
  controlPaths: string[];
  validationChecks: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}
```

- [ ] **Step 2: Attach `onboardingPlan` to each checklist item**

Each item in `onboardingItems(...)` gets a plan derived from its existing `settingsAction`, `crActions`, and setup steps. Keep the model read/open only.

- [ ] **Step 3: Register CR paths**

Add:

```ts
xd.xenesis.onboarding.status
xd.xenesis.onboarding.open
```

`status` is read/no approval. `open` is control/no approval and focuses the requested onboarding step.

- [ ] **Step 4: Add main-process status/open helpers**

Use `getXenesisConnectionsStatus()` and project `sections.onboarding.items`. `open` calls the existing built-in Settings pane bridge with `focusConnectionId`.

- [ ] **Step 5: Run GREEN focused tests**

Run the same focused test command. Expected: PASS.

### Task 3: Settings Rendering, Agent Hint, And Docs

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

Add `formatXenesisOnboardingPlanSummary(plan)` returning:

```ts
`${plan.phase} / ${plan.validationChecks.length} validation check(s)`
```

- [ ] **Step 2: Render Settings block**

Render `data-xenesis-onboarding-plan="<step-id>"` with summary, setup surface, read paths, control paths, diagnostics, and safety boundaries.

- [ ] **Step 3: Update Agent prompt hint**

Add the two CR paths to the useful direct CR path list.

- [ ] **Step 4: Update docs**

Document that `xd.xenesis.onboarding.status/open` are read/open setup surfaces and do not mutate provider, MCP, tool, gateway, or messenger settings.

### Task 4: Verification And Commit

**Files:**
- Commit all touched files except ignored local `handoff.md` unless explicitly needed.

- [ ] **Step 1: Format/check scoped files**

Run targeted Biome format/check over the small changed TS/TSX/i18n files.

- [ ] **Step 2: Run focused tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

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

Launch Electron via Playwright and verify direct `xd.xenesis.onboarding.status`, direct `xd.xenesis.onboarding.open`, Settings DOM `[data-xenesis-onboarding-plan="first-chat"]`, and an Agent-pane fenced CR prompt.

- [ ] **Step 5: Commit**

```powershell
git add -A
git add -f docs\superpowers\plans\2026-06-27-xenesis-onboarding-status-read-model.md
git commit -m "feat: add xenesis onboarding status"
```
