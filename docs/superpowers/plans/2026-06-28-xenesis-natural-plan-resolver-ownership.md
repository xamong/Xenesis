# Xenesis Natural Plan Resolver Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move natural-language plan construction branches out of the planner so the planner owns route order only.

**Architecture:** Keep `src/shared/xenesisNaturalLanguagePlanner.ts` responsible for raw text normalization, action-intent gating, placement detection, and ordered branch selection. Add `src/shared/xenesisNaturalLanguagePlanResolvers.ts` to own branch-level plan construction: wrapping existing action resolvers in visible-text plans and building generic Desk/dock/explorer/terminal/view plans. Preserve CR paths, args, visible text, approval state, route order, and natural routing smoke behavior.

**Tech Stack:** TypeScript shared modules, Node `tsx --test`, Biome, Vite/Electron build, natural Desk routing smoke.

---

### Task 1: RED Plan Resolver Ownership Guard

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Read plan resolver source in the source guard**

Add a guarded read beside `naturalResolverSource`:

```ts
let naturalPlanResolverSource = '';
try {
  naturalPlanResolverSource = readFileSync(
    new URL('../../../../shared/xenesisNaturalLanguagePlanResolvers.ts', import.meta.url),
    'utf8',
  );
} catch {
  naturalPlanResolverSource = '';
}
```

- [x] **Step 2: Move plan-construction ownership expectations**

In the existing source guard, assert the planner does not own branch construction imports/rules and the new plan resolver does:

```ts
for (const sharedPlanResolverOwnedSymbol of [
  'buildXenesisNaturalCatalogAction',
  'buildXenesisNaturalLanguagePlan',
  'buildXenesisNaturalViewOpenAction',
  'findXenesisNaturalCatalogRule',
  'findXenesisNaturalCatalogRulePlan',
  'XENESIS_NATURAL_PLAN_VISIBLE_TEXT',
  'XENESIS_NATURAL_OPEN_COMMAND_RULES',
  'XENESIS_NATURAL_OPEN_OR_SHOW_RULES',
  'XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES',
  'XENESIS_NATURAL_DESK_PANE_OPEN_RULES',
  'XENESIS_NATURAL_TERMINAL_RUN_RULES',
  'XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES',
]) {
  assert.doesNotMatch(source, new RegExp(sharedPlanResolverOwnedSymbol));
  assert.doesNotMatch(naturalPlannerSource, new RegExp(sharedPlanResolverOwnedSymbol));
  assert.match(naturalPlanResolverSource, new RegExp(sharedPlanResolverOwnedSymbol));
}
```

Also assert the planner imports the new resolver module:

```ts
assert.match(naturalPlannerSource, /xenesisNaturalLanguagePlanResolvers/);
```

- [x] **Step 3: Run focused RED**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because `src/shared/xenesisNaturalLanguagePlanResolvers.ts` does not exist yet and the planner still owns plan-construction rules/builders.

### Task 2: Move Branch Plan Construction

**Files:**
- Create: `src/shared/xenesisNaturalLanguagePlanResolvers.ts`
- Modify: `src/shared/xenesisNaturalLanguagePlanner.ts`

- [x] **Step 1: Create `xenesisNaturalLanguagePlanResolvers.ts`**

Create the module and import the existing action resolvers plus catalog helpers. Export one function per branch currently implemented inside `planXenesisDeskNaturalLanguageActions`:

```ts
export function xenesisAgentSubmitPlanFromNaturalText(rawText: string): XenesisNaturalLanguagePlan | null
export function xenesisRunStartPlanFromNaturalText(rawText: string): XenesisNaturalLanguagePlan | null
export function xenesisWorkspaceSetPlanFromNaturalText(value: string, rawText: string): XenesisNaturalLanguagePlan | null
export function xenesisConnectionReviewRequestPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function explicitXenesisConnectionOpenPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function xenesisConnectionReadbackPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function xenesisConnectionOpenOrShowPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function localCliMcpReadbackPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function xenesisGatewayPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function xenesisRuntimeInventoryPlanFromNaturalText(value: string, rawText: string): XenesisNaturalLanguagePlan | null
export function xenesisProfileInventoryPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function xenesisRuntimeControlPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function deskPaneOpenPlanFromNaturalText(value: string, placement: string | undefined): XenesisNaturalLanguagePlan | null
export function toolOpenPlanFromNaturalText(value: string, placement: string | undefined): XenesisNaturalLanguagePlan | null
export function deskCapturePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function activeDockFocusPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function activeDockClosePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function dockSizePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function windowSizePresetPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function deskFileListPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function deskFilePathPlanFromNaturalText(value: string, rawText: string): XenesisNaturalLanguagePlan | null
export function explorerFilterPlanFromNaturalText(value: string, rawText: string): XenesisNaturalLanguagePlan | null
export function explorerNavigatePlanFromNaturalText(value: string, rawText: string): XenesisNaturalLanguagePlan | null
export function explorerSimplePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function deskMiscReadPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function terminalListPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function terminalManyPlanFromNaturalText(value: string, placement: string | undefined): XenesisNaturalLanguagePlan | null
export function terminalRunPlanFromNaturalText(value: string, rawText: string, placement: string | undefined): XenesisNaturalLanguagePlan | null
export function dockWindowArrangePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function dockPaneArrangePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function dockGroupArrangePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function dockWindowMergePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function dockPaneMergePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function dockGroupMergePlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function dockPanesListPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function artifactTargetPlanFromNaturalText(value: string): XenesisNaturalLanguagePlan | null
export function viewOpenPlanFromNaturalText(value: string, placement: string | undefined): XenesisNaturalLanguagePlan | null
```

Each function should contain the same logic and visible text currently used by the matching planner branch.

- [x] **Step 2: Thin `xenesisNaturalLanguagePlanner.ts`**

Import the exported plan resolvers and replace each branch body with an ordered resolver call. The planner should keep only:

```ts
const rawText = String(text || XENESIS_NATURAL_TEXT_DEFAULTS.empty).trim();
const value = normalizeXenesisNaturalLanguageText(rawText);
if (!value || !hasXenesisNaturalActionIntent(value)) return emptyXenesisNaturalLanguagePlan();
const placement = detectXenesisNaturalPlacement(value);
```

Then preserve the old branch order by calling the plan resolvers sequentially and returning the first non-null plan. Keep the final `emptyXenesisNaturalLanguagePlan()` fallback.

- [x] **Step 3: Run focused GREEN**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: PASS with all existing behavior tests unchanged and the new source-ownership guard passing.

### Task 3: Verification, Docs, Commit

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
- Modify: `docs/superpowers/plans/2026-06-28-xenesis-natural-plan-resolver-ownership.md`

- [x] **Step 1: Format and scoped checks**

Run:

```powershell
npx biome format --write src\shared\xenesisNaturalLanguagePlanResolvers.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npx biome check src\shared\xenesisNaturalLanguagePlanResolvers.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80
```

- [x] **Step 2: Broaden verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npm run typecheck
npm run build
npm run smoke:xenesis:natural-desk-routing
git diff --check
```

Expected: all commands pass. CR audit is not required for this slice because no CR schemas, dispatchers, or generated coverage maps change.

- [x] **Step 3: Update logs and commit**

Record exact RED/GREEN and verification results in `handoff.md` and the Obsidian working note. Mark this plan checklist complete, then commit:

```powershell
git add src/shared/xenesisNaturalLanguagePlanResolvers.ts src/shared/xenesisNaturalLanguagePlanner.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md"
git add -f handoff.md docs/superpowers/plans/2026-06-28-xenesis-natural-plan-resolver-ownership.md
git commit -m "refactor: split xenesis natural plan resolvers"
```
