# Xenesis Prompt Hint Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Desk control prompt-hint ownership out of the broad natural-language catalog, derive high-value CR path checks from the Capability Registry, and verify the Agent pane facade remains free of local hardcoded routing.

**Architecture:** Keep `xenesisAgentDeskControl.ts` as a renderer facade. Create a focused shared prompt-hint catalog/spec module for prompt text, example action blocks, and discovery prefixes, while `xenesisDeskControlPromptHint.ts` owns registry discovery and prompt assembly. Tests should check behavior and ownership boundaries instead of hand-listing every CR path in the renderer test.

**Tech Stack:** TypeScript shared modules, Node test runner through `tsx`, Biome, Xenesis Desk Capability Registry.

---

### Task 1: Add RED Ownership Tests

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- Test: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [ ] **Step 1: Write the failing ownership test**

Add imports for the new catalog exports that do not exist yet:

```ts
import {
  XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS,
} from '../../../../shared/xenesisDeskControlPromptHintCatalog';
```

Add source ownership assertions near the existing prompt-hint source guard:

```ts
const promptHintCatalogSource = readFileSync(
  new URL('../../../../shared/xenesisDeskControlPromptHintCatalog.ts', import.meta.url),
  'utf8',
);

assert.doesNotMatch(catalogSource, /XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES/);
assert.doesNotMatch(catalogSource, /XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES/);
assert.doesNotMatch(catalogSource, /XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES/);
assert.match(promptHintCatalogSource, /XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS/);
assert.match(promptHintCatalogSource, /XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES/);
assert.match(promptHintSource, /XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS/);
```

- [ ] **Step 2: Write the failing registry-derived path coverage test**

Replace the hand-listed high-value prompt assertions with a table generated from registry prefixes:

```ts
const connectionCenterPromptPaths = listDeskBridgeCapabilities()
  .filter((node) => node.callable)
  .map((node) => node.path)
  .filter((path) =>
    XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES.connectionCenter.some((prefix) =>
      isXenesisDeskCapabilityPathUnderPrefix(path, prefix),
    ),
  )
  .sort();

for (const path of connectionCenterPromptPaths) {
  assert.match(hint, new RegExp(path.replaceAll('.', '\\.')));
}
```

Keep representative content checks for safety boundaries, examples, and stale aliases.

- [ ] **Step 3: Run the RED test**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because `xenesisDeskControlPromptHintCatalog.ts` and its exports do not exist yet.

### Task 2: Implement Focused Prompt Hint Catalog

**Files:**
- Create: `src/shared/xenesisDeskControlPromptHintCatalog.ts`
- Modify: `src/shared/xenesisDeskControlPromptHint.ts`
- Modify: `src/shared/xenesisNaturalLanguageCatalog.ts`
- Test: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [ ] **Step 1: Create the catalog module**

Create `src/shared/xenesisDeskControlPromptHintCatalog.ts` with:

```ts
export type XenesisDeskControlPromptHintSectionKind = 'static' | 'discovery';

export interface XenesisDeskControlPromptHintStaticSection {
  id: string;
  kind: 'static';
  lines: readonly string[];
}

export interface XenesisDeskControlPromptHintDiscoverySection {
  id: string;
  kind: 'discovery';
  linePrefix: string;
  prefixes: readonly string[];
}

export type XenesisDeskControlPromptHintSection =
  | XenesisDeskControlPromptHintStaticSection
  | XenesisDeskControlPromptHintDiscoverySection;
```

Move the existing prompt hint before lines, discovery prefix, discovery prefixes, and after lines into:

```ts
export const XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES = {
  connectionCenter: [
    'xd.xenesis.connections',
    'xd.xenesis.onboarding',
    'xd.xenesis.guides',
    'xd.xenesis.providers',
    'xd.xenesis.tools',
    'xd.xenesis.channels',
    'xd.xenesis.messengers',
    'xd.testing.connectionCenter',
  ],
} as const;

export const XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS = [
  { id: 'native-control-policy', kind: 'static', lines: [...] },
  {
    id: 'connection-center-discovery',
    kind: 'discovery',
    linePrefix: '- Connection Center CR paths discovered from Capability Registry: ',
    prefixes: XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES.connectionCenter,
  },
  { id: 'examples-and-natural-routing', kind: 'static', lines: [...] },
] as const satisfies readonly XenesisDeskControlPromptHintSection[];
```

- [ ] **Step 2: Update prompt assembly**

Change `src/shared/xenesisDeskControlPromptHint.ts` to import `XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS`, flatten static lines, and build discovery lines through `buildXenesisDeskRegistryCapabilityPathSummary(section.prefixes)`.

Keep these public helper exports:

```ts
export function isXenesisDeskCapabilityPathUnderPrefix(...)
export function buildXenesisDeskRegistryCapabilityPathSummary(...)
export function buildXenesisDeskDirectCrPathSummary(...)
export function buildXenesisDeskControlPromptHint()
```

- [ ] **Step 3: Remove old prompt hint constants from the broad catalog**

Delete these exports from `src/shared/xenesisNaturalLanguageCatalog.ts`:

```ts
XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES
XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX
XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES
XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES
```

- [ ] **Step 4: Run the GREEN focused test**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: PASS.

### Task 3: Expand Local Smoke and Documentation

**Files:**
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
- Modify: `docs/manual/09-onboarding-connections.md`
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-prompt-hint-catalog.md`
- Modify: `handoff.md`

- [ ] **Step 1: Add smoke coverage**

Add one prompt-hint-adjacent smoke case that proves natural routing still opens an internal connection surface after the catalog move:

```js
{
  id: 'settings-connectors-open',
  prompt: 'Connectors 설정 열어줘',
  expectPath: 'xd.panes.settings.open',
}
```

If this case already exists, add an explicit OAuth setup packet open case:

```js
{
  id: 'google-calendar-oauth-setup-packet-open',
  prompt: 'google calendar oauth setup packet 열어줘',
  expectPath: 'xd.xenesis.tools.oauthDrafts.setupPacket.open',
}
```

- [ ] **Step 2: Document the ownership boundary**

Add a short note to `docs/manual/09-onboarding-connections.md` stating that prompt-hint path discovery is generated from the Capability Registry and prompt policy/examples live in `src/shared/xenesisDeskControlPromptHintCatalog.ts`.

- [ ] **Step 3: Add an Obsidian working note**

Create `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-prompt-hint-catalog.md` with the objective, files touched, commands, boundaries, and known gaps.

- [ ] **Step 4: Update handoff**

Record RED/GREEN commands, touched files, exact verification results, known gaps, and next intended step.

### Task 4: Broad Verification and Commit

**Files:**
- Modify: `docs/capability-registry-audit.md` only if generated by audit
- Modify: `handoff.md`

- [ ] **Step 1: Format and focused checks**

Run:

```powershell
npx biome format --write src\shared\xenesisDeskControlPromptHint.ts src\shared\xenesisDeskControlPromptHintCatalog.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs docs\manual\09-onboarding-connections.md handoff.md
npx biome check src\shared\xenesisDeskControlPromptHint.ts src\shared\xenesisDeskControlPromptHintCatalog.ts src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80
```

Expected: PASS or only pre-existing unrelated repo-wide lint gaps when running broader lint.

- [ ] **Step 2: Run relevant tests and smokes**

Run:

```powershell
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
npm run smoke:xenesis:natural-desk-routing
npm run smoke:xenesis:connection-center
npm run typecheck
npm run docs:capabilities:audit
rg -n "Missing registered paths|Missing dispatched coverage paths|Undispatched static callable methods|Dispatcher paths missing from tree" docs\capability-registry-audit.md
git diff --check
```

Expected: focused tests pass, natural routing smoke passes, connection center smoke passes, typecheck passes, CR audit gap counters are all 0, and diff check has no whitespace errors except possible existing line-ending warnings.

- [ ] **Step 3: Commit**

Run:

```powershell
git status --short
git add -A
git commit -m "refactor: catalog xenesis prompt hint policy"
git status --short --branch
```

Expected: commit succeeds on `agent/upcoming-work-20260627` and worktree is clean.
