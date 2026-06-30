# Xenesis CR-First Detail ControlPaths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove generic Settings fallback control paths from Xenesis provider/tool/messenger detail metadata where CR-specific open paths already exist.

**Architecture:** Keep explicit user-edit settings steps in onboarding plans unchanged, but make detail/view metadata advertise the CR-first surfaces that actually own the provider/tool/messenger cards. This is a metadata source-of-truth cleanup only; it does not change registry schemas, dispatch, provider settings, gateway behavior, OAuth, tool execution, messenger delivery, or approval semantics.

**Tech Stack:** TypeScript shared catalog, Node test runner via `tsx`, Biome, root TypeScript typecheck.

---

### Task 1: RED Tests For CR-First Detail Control Paths

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write the failing test expectations**

Change the existing deep-equality assertions so these metadata surfaces no longer include `xd.panes.settings.open` in `controlPaths`:

```ts
controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open'],
```

```ts
controlPaths: [
  'xd.xenesis.tools.installPlans.open',
  'xd.xenesis.tools.views.open',
  'xd.xenesis.connections.open',
],
```

```ts
controlPaths: ['xd.xenesis.providers.views.open', 'xd.xenesis.connections.open'],
```

```ts
controlPaths: [
  'xd.xenesis.messengers.views.open',
  'xd.xenesis.connections.open',
  'xd.xenesis.profiles.updateChannels',
  'xd.xenesis.profiles.testChannel',
],
```

Also assert the planned messenger detail paths are CR-only:

```ts
assert.deepEqual(signal?.messengerView?.controlPaths, [
  'xd.xenesis.messengers.views.open',
  'xd.xenesis.connections.open',
]);
```

- [x] **Step 2: Run test to verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because `toolViewTemplate`, `toolInstallPlanTemplate`, `providerViewTemplate`, and `messengerViewTemplate` still include `xd.panes.settings.open`.

### Task 2: Implement CR-First Detail Metadata

**Files:**
- Modify: `src/shared/xenesisConnections.ts`

- [x] **Step 1: Remove generic settings fallback from detail templates**

Update:

```ts
controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open'],
```

```ts
controlPaths: [
  'xd.xenesis.tools.installPlans.open',
  'xd.xenesis.tools.views.open',
  'xd.xenesis.connections.open',
],
```

```ts
controlPaths: implemented
  ? [
      'xd.xenesis.messengers.views.open',
      'xd.xenesis.connections.open',
      'xd.xenesis.profiles.updateChannels',
      'xd.xenesis.profiles.testChannel',
    ]
  : ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open'],
```

```ts
controlPaths: ['xd.xenesis.providers.views.open', 'xd.xenesis.connections.open'],
```

- [x] **Step 2: Run focused GREEN**

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
npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts --max-diagnostics 80
```

Expected: exit 0, with no new diagnostics.

- [x] **Step 2: Run broader verification**

Run:

```powershell
npm run typecheck
git diff --check
```

Expected: typecheck exit 0; diff check exit 0 with at most LF-to-CRLF warnings.

- [x] **Step 3: Update docs and commit**

Record exact verification outcomes in `handoff.md` and the Obsidian working note, then commit:

```powershell
git add src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts "docs\superpowers\plans\2026-06-28-xenesis-cr-first-detail-controlpaths.md" "docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-27-openclaw-hermes-batched-gap-map.md"
git commit -m "refactor: prefer xenesis detail control paths"
```
