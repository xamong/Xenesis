# Xenesis Natural Intent Predicate Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move natural-language intent/context predicate ownership out of the planner and into the shared natural-language catalog.

**Architecture:** `src/shared/xenesisNaturalLanguageCatalog.ts` owns reusable rule data, match helpers, and semantic predicate helpers. `src/shared/xenesisNaturalLanguagePlanner.ts` keeps route ordering and dynamic extraction, but calls shared predicates instead of defining local `has...Intent` and `has...Context` helpers.

**Tech Stack:** TypeScript shared modules, Node `tsx --test`, Biome, Vite/Electron build, existing natural Desk routing smoke.

---

### Task 1: RED Predicate Ownership Tests

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Add source guard assertions**

In the planner ownership/source-guard test, require these local planner helpers to disappear:

```ts
for (const localPredicate of [
  'function hasExplicitOpenIntent',
  'function hasActionIntent',
  'function hasXenesisOnboardingContext',
  'function hasXenesisConnectionReadbackIntent',
  'function hasExternalToolCatalogContext',
  'function hasExternalMessengerCatalogContext',
  'function hasXenesisAggregateCatalogContext',
  'function hasXenesisMessengerProfileDraftCatalogContext',
  'function hasXenesisConnectionReviewRequestIntent',
  'function hasXenesisProviderProfileContext',
]) {
  assert.doesNotMatch(naturalPlannerSource, new RegExp(localPredicate));
}
```

Also require catalog-owned exports:

```ts
for (const sharedPredicate of [
  'hasXenesisNaturalExplicitOpenIntent',
  'hasXenesisNaturalActionIntent',
  'hasXenesisNaturalOnboardingContext',
  'hasXenesisNaturalConnectionReadbackIntent',
  'hasXenesisNaturalExternalToolCatalogContext',
  'hasXenesisNaturalExternalMessengerCatalogContext',
  'hasXenesisNaturalAggregateCatalogContext',
  'hasXenesisNaturalMessengerProfileDraftCatalogContext',
  'hasXenesisNaturalConnectionReviewRequestIntent',
  'hasXenesisNaturalProviderProfileContext',
]) {
  assert.match(catalogSource, new RegExp(`export function ${sharedPredicate}`));
}
```

- [x] **Step 2: Run focused RED**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because the planner still defines the local predicate helpers and the catalog does not export the semantic predicate helpers yet.

### Task 2: Move Predicate Helpers To Catalog

**Files:**
- Modify: `src/shared/xenesisNaturalLanguageCatalog.ts`
- Modify: `src/shared/xenesisNaturalLanguagePlanner.ts`

- [x] **Step 1: Add shared semantic predicates**

Add exports in the shared catalog:

```ts
export function hasXenesisNaturalExplicitOpenIntent(value: string): boolean {
  return (
    matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES) ||
    XENESIS_NATURAL_INTENT_PATTERNS.explicitOpenEnglish.test(value)
  );
}

export function hasXenesisNaturalActionIntent(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_ACTION_INTENT_RULES);
}
```

Add equivalent helpers for onboarding, connection readback, external tool catalog, external messenger catalog, aggregate catalog, messenger profile draft catalog, connection review request, and provider profile context using the existing rule arrays.

- [x] **Step 2: Replace planner-local helpers**

Import and use the shared helpers in `src/shared/xenesisNaturalLanguagePlanner.ts`. Delete the local `has...Intent` and `has...Context` helper definitions.

- [x] **Step 3: Run focused GREEN**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: PASS with unchanged planner behavior.

### Task 3: Verification, Docs, Commit

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
- Modify: `docs/superpowers/plans/2026-06-28-xenesis-natural-intent-predicate-ownership.md`

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
git add -f docs/superpowers/plans/2026-06-28-xenesis-natural-intent-predicate-ownership.md
git commit -m "refactor: catalog xenesis natural intent predicates"
```
