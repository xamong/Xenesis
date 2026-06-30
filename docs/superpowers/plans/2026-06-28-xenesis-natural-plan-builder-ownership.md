# Xenesis Natural Plan Builder Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move generic natural-language plan/action wrapper ownership out of the planner and into the shared natural-language catalog.

**Architecture:** `src/shared/xenesisNaturalLanguageCatalog.ts` already owns action request types, action builders, parse results, catalog rule matching, and visible text constants. It should also own the reusable natural-language plan type and catalog-rule-to-plan builders. `src/shared/xenesisNaturalLanguagePlanner.ts` should keep route order, dynamic extraction, and branch selection only.

**Tech Stack:** TypeScript shared modules, Node `tsx --test`, Biome, Vite/Electron build, existing natural Desk routing smoke.

---

### Task 1: RED Plan Builder Ownership Guards

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Add failing source-ownership assertions**

Update the planner ownership/source-guard test so these planner-local generic helpers must disappear:

```ts
for (const localNaturalPlannerHelper of [
  'function naturalCatalogRuleFromNaturalText',
  'function naturalCatalogRuleActionFromNaturalText',
  'function naturalCatalogRulePlanFromNaturalText',
  'function naturalPlan',
  'function emptyNaturalPlan',
]) {
  assert.doesNotMatch(naturalPlannerSource, new RegExp(localNaturalPlannerHelper));
}
```

Also require catalog-owned replacements:

```ts
for (const sharedNaturalPlanBuilder of [
  'buildXenesisNaturalLanguagePlan',
  'emptyXenesisNaturalLanguagePlan',
  'findXenesisNaturalCatalogRule',
  'findXenesisNaturalCatalogRulePlan',
]) {
  assert.match(catalogSource, new RegExp(`export function ${sharedNaturalPlanBuilder}`));
  assert.match(naturalPlannerSource, new RegExp(sharedNaturalPlanBuilder));
}
assert.match(catalogSource, /export interface XenesisNaturalLanguagePlan/);
assert.match(naturalPlannerSource, /type XenesisDeskNaturalLanguagePlan = XenesisNaturalLanguagePlan/);
```

- [x] **Step 2: Run focused RED**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because `src/shared/xenesisNaturalLanguagePlanner.ts` still defines the planner-local generic helpers and `src/shared/xenesisNaturalLanguageCatalog.ts` does not export the plan builder helpers yet.

### Task 2: Move Plan Builders To Catalog

**Files:**
- Modify: `src/shared/xenesisNaturalLanguageCatalog.ts`
- Modify: `src/shared/xenesisNaturalLanguagePlanner.ts`

- [x] **Step 1: Add catalog plan type and builders**

Add the shared plan interface near the existing parse-result type:

```ts
export interface XenesisNaturalLanguagePlan extends XenesisDeskActionParseResult {
  matched: boolean;
}
```

Add these helper exports near the existing natural action builders:

```ts
export function buildXenesisNaturalLanguagePlan(
  visibleText: string,
  actions: XenesisNaturalDeskActionRequest[],
  errors: string[] = [],
): XenesisNaturalLanguagePlan {
  return { visibleText, actions, errors, matched: actions.length > 0 || errors.length > 0 };
}

export function emptyXenesisNaturalLanguagePlan(): XenesisNaturalLanguagePlan {
  return {
    visibleText: XENESIS_NATURAL_TEXT_DEFAULTS.empty,
    actions: [],
    errors: [],
    matched: false,
  };
}

export function findXenesisNaturalCatalogRule(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
): XenesisNaturalCatalogActionRule | null {
  return findXenesisNaturalContextRule(value, rules);
}

export function findXenesisNaturalCatalogRulePlan(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = XENESIS_NATURAL_DESK_ACTION_ARGS.empty(),
): XenesisNaturalLanguagePlan | null {
  const rule = findXenesisNaturalCatalogRule(value, rules);
  if (!rule?.visibleText) return null;
  return buildXenesisNaturalLanguagePlan(rule.visibleText, [buildXenesisNaturalCatalogAction(rule.action, args)]);
}
```

- [x] **Step 2: Replace planner-local helpers**

Import and use the catalog helpers in `src/shared/xenesisNaturalLanguagePlanner.ts`:

```ts
import {
  buildXenesisNaturalLanguagePlan,
  emptyXenesisNaturalLanguagePlan,
  findXenesisNaturalCatalogRule,
  findXenesisNaturalCatalogRuleAction,
  findXenesisNaturalCatalogRulePlan,
  type XenesisNaturalLanguagePlan,
} from './xenesisNaturalLanguageCatalog';
```

Preserve the renderer-facing type name with an alias:

```ts
export type XenesisDeskNaturalLanguagePlan = XenesisNaturalLanguagePlan;
```

Delete the local `naturalCatalogRuleFromNaturalText`, `naturalCatalogRuleActionFromNaturalText`, `naturalCatalogRulePlanFromNaturalText`, `naturalPlan`, and `emptyNaturalPlan` helpers. Replace call sites as follows:

```ts
naturalCatalogRuleFromNaturalText(...) -> findXenesisNaturalCatalogRule(...)
naturalCatalogRuleActionFromNaturalText(...) -> findXenesisNaturalCatalogRuleAction(...)
naturalCatalogRulePlanFromNaturalText(...) -> findXenesisNaturalCatalogRulePlan(...)
naturalPlan(...) -> buildXenesisNaturalLanguagePlan(...)
emptyNaturalPlan() -> emptyXenesisNaturalLanguagePlan()
```

- [x] **Step 3: Run focused GREEN**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: PASS with unchanged natural-language route behavior.

### Task 3: Verification, Docs, Commit

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
- Modify: `docs/superpowers/plans/2026-06-28-xenesis-natural-plan-builder-ownership.md`

- [x] **Step 1: Format and scoped checks**

Run:

```powershell
npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80
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

Expected: all commands pass. Existing Vite warnings and LF-to-CRLF warnings are acceptable if unchanged.

- [x] **Step 3: Update logs and commit**

Record exact RED/GREEN and verification results in `handoff.md` and the Obsidian working note. Mark this plan checklist complete, then commit:

```powershell
git add src/shared/xenesisNaturalLanguageCatalog.ts src/shared/xenesisNaturalLanguagePlanner.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md"
git add -f docs/superpowers/plans/2026-06-28-xenesis-natural-plan-builder-ownership.md
git commit -m "refactor: catalog xenesis natural plan builders"
```
