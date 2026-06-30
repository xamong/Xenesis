# Xenesis CR-First Review Draft ControlPaths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make review-only OAuth and provider profile draft metadata advertise CR request/open paths instead of generic Settings fallback paths.

**Architecture:** Keep real user-edited onboarding settings steps on `xd.panes.settings.open`, but keep review-only draft surfaces on their own `xd.xenesis.*.open` and `xd.xenesis.*.request` paths. This is shared connection metadata only; it does not change CR schemas, dispatch, provider credentials, OAuth execution, Action Inbox mutation semantics, or natural-language routing.

**Tech Stack:** TypeScript shared connection catalog, Node test runner through `tsx`, Biome, root TypeScript typecheck.

---

### Task 1: RED Tests For Review Draft Control Paths

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write OAuth draft CR-only expectations**

In `buildXenesisConnectionsStatus exposes review-only tool OAuth drafts for planned Google tools`, add:

```ts
assert.deepEqual(workspace?.toolOAuthDraft?.controlPaths, [
  'xd.xenesis.tools.oauthDrafts.open',
  'xd.xenesis.tools.oauthDrafts.request',
  'xd.xenesis.connections.open',
]);
```

- [x] **Step 2: Write provider profile draft CR-only expectations**

In `buildXenesisConnectionsStatus exposes review-only provider profile drafts`, add:

```ts
assert.deepEqual(readyDraft?.controlPaths, [
  'xd.xenesis.providers.profileDrafts.open',
  'xd.xenesis.providers.profileDrafts.request',
  'xd.xenesis.connections.open',
]);
assert.deepEqual(
  readyDraft?.reviewSteps.find((step) => step.id === 'local-cli-boundary')?.controlPaths,
  ['xd.xenesis.providers.profileDrafts.open', 'xd.xenesis.providers.profileDrafts.request'],
);
```

- [x] **Step 3: Run test to verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because OAuth draft and provider profile draft metadata still include `xd.panes.settings.open`.

### Task 2: Implement CR-First Review Draft Metadata

**Files:**
- Modify: `src/shared/xenesisConnections.ts`

- [x] **Step 1: Remove generic settings fallback from OAuth draft control paths**

Change the OAuth draft aggregate `controlPaths` to:

```ts
controlPaths: [
  'xd.xenesis.tools.oauthDrafts.open',
  'xd.xenesis.tools.oauthDrafts.request',
  'xd.xenesis.connections.open',
],
```

- [x] **Step 2: Remove generic settings fallback from provider profile draft metadata**

Change the local CLI boundary review step to:

```ts
controlPaths: ['xd.xenesis.providers.profileDrafts.open', 'xd.xenesis.providers.profileDrafts.request'],
```

Change the provider profile draft aggregate `controlPaths` to:

```ts
controlPaths: [
  'xd.xenesis.providers.profileDrafts.open',
  'xd.xenesis.providers.profileDrafts.request',
  'xd.xenesis.connections.open',
],
```

- [x] **Step 3: Run focused GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

### Task 3: Verify, Document, Commit

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`

- [x] **Step 1: Format/check focused files**

Run:

```powershell
npx biome format --write src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnections.test.ts
npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts --max-diagnostics 80
```

Expected: focused test passes 35/35, Biome exits 0.

- [x] **Step 2: Run broader verification**

Run:

```powershell
npm run typecheck
git diff --check
```

Expected: typecheck exits 0; diff check exits 0 with at most LF-to-CRLF warnings.

- [x] **Step 3: Update docs and commit**

Record exact verification results in `handoff.md` and the Obsidian working note, mark this plan checklist complete, then commit:

```powershell
git add src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts "docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-27-openclaw-hermes-batched-gap-map.md"
git add -f docs\superpowers\plans\2026-06-28-xenesis-cr-first-review-draft-controlpaths.md
git commit -m "refactor: prefer xenesis review draft control paths"
```
