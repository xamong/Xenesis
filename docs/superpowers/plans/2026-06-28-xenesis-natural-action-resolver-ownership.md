# Xenesis Natural Action Resolver Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Xenesis/runtime natural-language action resolver helpers out of the planner and into a shared resolver module.

**Architecture:** Keep `src/shared/xenesisNaturalLanguagePlanner.ts` responsible for text normalization, route ordering, and plan selection. Put reusable `...ActionFromNaturalText` resolver helpers in `src/shared/xenesisNaturalLanguageActionResolvers.ts`, where they can use the catalog-owned rules, target finders, extractors, and action builders without bloating the route-order file. Preserve all CR paths, args, visible text, approval state, and route order.

**Tech Stack:** TypeScript shared modules, Node `tsx --test`, Biome, Vite/Electron build, natural Desk routing smoke.

---

### Task 1: RED Resolver Ownership Guard

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Add resolver source guard**

Update the existing planner ownership/source-guard test to read:

```ts
let naturalResolverSource = '';
try {
  naturalResolverSource = readFileSync(
    new URL('../../../../shared/xenesisNaturalLanguageActionResolvers.ts', import.meta.url),
    'utf8',
  );
} catch {
  naturalResolverSource = '';
}
```

Then change the current `localNaturalPlannerFunction` expectations so the planner no longer defines these helpers and the resolver module does:

```ts
for (const localNaturalPlannerFunction of [
  'function toolOpenActionFromNaturalText',
  'function viewKindFromNaturalText',
  'function xenesisConnectionTargetFromNaturalText',
  'function xenesisConnectionActionFromNaturalText',
  'function xenesisConnectionReadbackActionFromNaturalText',
  'function xenesisConnectionReviewRequestActionFromNaturalText',
  'function xenesisRuntimeInventoryActionFromNaturalText',
  'function xenesisWorkspaceSetActionFromNaturalText',
]) {
  assert.doesNotMatch(source, new RegExp(localNaturalPlannerFunction));
  assert.doesNotMatch(naturalPlannerSource, new RegExp(localNaturalPlannerFunction));
  assert.match(naturalResolverSource, new RegExp(localNaturalPlannerFunction));
}
```

- [x] **Step 2: Run focused RED**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because `src/shared/xenesisNaturalLanguageActionResolvers.ts` does not exist yet and the planner still defines the resolver helpers.

### Task 2: Move Resolver Helpers

**Files:**
- Create: `src/shared/xenesisNaturalLanguageActionResolvers.ts`
- Modify: `src/shared/xenesisNaturalLanguagePlanner.ts`

- [x] **Step 1: Create the resolver module**

Create `src/shared/xenesisNaturalLanguageActionResolvers.ts` and move the current top-level resolver helpers from `src/shared/xenesisNaturalLanguagePlanner.ts` into it. Export only the helpers the planner calls directly:

```ts
export function toolOpenActionFromNaturalText(...)
export function viewKindFromNaturalText(...)
export function xenesisConnectionReviewRequestActionFromNaturalText(...)
export function xenesisConnectionReadbackActionFromNaturalText(...)
export function xenesisConnectionActionFromNaturalText(...)
export function localCliMcpReadbackActionFromNaturalText(...)
export function xenesisGatewayActionFromNaturalText(...)
export function xenesisRuntimeInventoryActionFromNaturalText(...)
export function xenesisProfileInventoryActionFromNaturalText(...)
export function xenesisAgentSubmitActionFromNaturalText(...)
export function xenesisRunStartActionFromNaturalText(...)
export function xenesisRuntimeControlActionFromNaturalText(...)
export function xenesisWorkspaceSetActionFromNaturalText(...)
```

Keep helper-internal functions such as `xenesisProviderFromNaturalText`, `xenesisGuideActionFromNaturalText`, and `xenesisOnboardingOpenActionFromNaturalText` private to the resolver module.

- [x] **Step 2: Thin the planner**

In `src/shared/xenesisNaturalLanguagePlanner.ts`, import the exported resolver helpers from `./xenesisNaturalLanguageActionResolvers` and delete their local implementations. Keep the planner's route order and existing plan construction unchanged.

- [x] **Step 3: Run focused GREEN**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: PASS with unchanged natural-language behavior and source ownership guard passing.

### Task 3: Verification, Docs, Commit

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`
- Modify: `docs/superpowers/plans/2026-06-28-xenesis-natural-action-resolver-ownership.md`

- [x] **Step 1: Format and scoped checks**

Run:

```powershell
npx biome format --write src\shared\xenesisNaturalLanguageActionResolvers.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npx biome check src\shared\xenesisNaturalLanguageActionResolvers.ts src\shared\xenesisNaturalLanguagePlanner.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80
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
git add src/shared/xenesisNaturalLanguageActionResolvers.ts src/shared/xenesisNaturalLanguagePlanner.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md"
git add -f handoff.md docs/superpowers/plans/2026-06-28-xenesis-natural-action-resolver-ownership.md
git commit -m "refactor: split xenesis natural action resolvers"
```
