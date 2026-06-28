# Xenesis Natural Target Metadata Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move remaining Connection Center natural-routing target metadata out of the generic natural-language catalog and into the shared connection source of truth.

**Architecture:** `src/shared/xenesisConnections.ts` owns provider/tool/messenger/guide/onboarding target metadata. `src/shared/xenesisNaturalLanguageCatalog.ts` keeps generic matching/building behavior and re-exports the connection-owned targets for existing callers. `src/shared/xenesisNaturalLanguagePlanner.ts` keeps route ordering unchanged.

**Tech Stack:** TypeScript shared modules, Node `node:test`, `tsx`, Biome, repo typecheck.

---

### Task 1: RED Ownership Tests

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- Modify: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Add failing source guards**

Add assertions that the natural catalog no longer declares:

```ts
assert.doesNotMatch(catalogSource, /export const XENESIS_NATURAL_PLANNED_GOOGLE_TOOL_IDS = \[/);
assert.doesNotMatch(catalogSource, /export const XENESIS_NATURAL_GUIDE_TARGETS:[\s\S]*=\s*\[/);
assert.doesNotMatch(catalogSource, /export const XENESIS_NATURAL_ONBOARDING_STEP_TARGETS:[\s\S]*=\s*\[/);
assert.match(connectionSource, /XENESIS_CONNECTION_NATURAL_GUIDE_TARGETS/);
assert.match(connectionSource, /XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGETS/);
```

- [x] **Step 2: Add connection-catalog behavior assertions**

Assert guide/onboarding/planned-Google metadata exists in `xenesisConnections.ts` exports:

```ts
assert.equal(isXenesisConnectionNaturalPlannedGoogleToolTarget({ id: 'google-calendar', kind: 'tool' }), true);
assert.equal(isXenesisConnectionNaturalPlannedGoogleToolTarget({ id: 'notion', kind: 'tool' }), false);
assert.equal(XENESIS_CONNECTION_NATURAL_GUIDE_TARGETS.some((target) => target.id === 'external-tool-integrations'), true);
assert.equal(XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGETS.map((target) => target.id).join(','), XENESIS_CONNECTION_ONBOARDING_STEP_IDS.join(','));
```

- [x] **Step 3: Run RED verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because connection-owned guide/onboarding/planned-Google exports do not exist yet and catalog still owns those lists.

### Task 2: Move Metadata Ownership

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/xenesisNaturalLanguageCatalog.ts`

- [x] **Step 1: Add connection-owned natural target types/exports**

In `xenesisConnections.ts`, extend the existing natural-target section with:

```ts
export interface XenesisConnectionNaturalGuideTarget extends XenesisConnectionNaturalWordsTarget {
  requiredWordGroups?: readonly (readonly string[])[];
  blockedByMatchedTargetIds?: readonly string[];
  fallback?: boolean;
}

export const XENESIS_CONNECTION_NATURAL_PLANNED_GOOGLE_TOOL_IDS = XENESIS_CONNECTION_TOOL_OAUTH_DRAFT_IDS;

export function isXenesisConnectionNaturalPlannedGoogleToolTarget(
  target: Pick<XenesisConnectionNaturalConnectionTarget, 'id' | 'kind'>,
): boolean {
  return (
    target.kind === 'tool' &&
    (XENESIS_CONNECTION_NATURAL_PLANNED_GOOGLE_TOOL_IDS as readonly string[]).includes(target.id)
  );
}
```

- [x] **Step 2: Move guide targets**

Define `XENESIS_CONNECTION_NATURAL_GUIDE_TARGETS` in `xenesisConnections.ts` with the existing guide ids, labels, words, required groups, blocking, and fallback behavior. Use labels from `XENESIS_CONNECTION_GUIDES` where practical and keep matching behavior unchanged.

- [x] **Step 3: Move onboarding step targets**

Define `XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGETS` in `xenesisConnections.ts` from the existing step ids and labels/words, preserving order from `XENESIS_CONNECTION_ONBOARDING_STEP_IDS`.

- [x] **Step 4: Re-export connection-owned targets from natural catalog**

Import the new connection exports into `xenesisNaturalLanguageCatalog.ts`, remove the local list literals, and keep public export names stable:

```ts
export const XENESIS_NATURAL_GUIDE_TARGETS = XENESIS_CONNECTION_NATURAL_GUIDE_TARGETS;
export const XENESIS_NATURAL_ONBOARDING_STEP_TARGETS = XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGETS;
export const isXenesisNaturalPlannedGoogleToolTarget = isXenesisConnectionNaturalPlannedGoogleToolTarget;
```

### Task 3: Verification And Docs

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`

- [x] **Step 1: Run focused tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: PASS with the same planner behavior.

- [x] **Step 2: Run scoped formatting/linting**

Run:

```powershell
npx biome format --write src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80
```

Expected: format completes; scoped check exits 0 or only reports known pre-existing warnings in touched files.

- [x] **Step 3: Run broader route/type verification**

Run:

```powershell
npm run smoke:xenesis:natural-desk-routing
npm run typecheck
git diff --check
```

Expected: natural routing smoke and typecheck pass; `git diff --check` exits 0, allowing existing LF-to-CRLF warnings.

- [x] **Step 4: Update logs and commit**

Record RED/GREEN and verification in `handoff.md` and the Obsidian working note, then commit the slice.
