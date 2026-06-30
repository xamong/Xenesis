# Xenesis User Story Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured Hermes/OpenClaw-style story contracts to tool and messenger user-story read models.

**Architecture:** Extend the shared Connection Center user-story templates with a reusable `storyContract` that names readbacks, open surface, approval boundary, and completion evidence. Render that contract in Settings and keep it available through existing CR status/open paths instead of adding a new subsystem.

**Tech Stack:** TypeScript shared models, Node test runner with `tsx`, React Settings renderer, existing Capability Registry status/open paths.

---

### Task 1: Shared Story Contract Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write failing shared model tests**

Add assertions that `notion.toolUserStory.storyContract` and
`telegram.channelTemplate.userStory.storyContract` exist and expose:

```ts
assert.equal(notion?.toolUserStory?.storyContract.openPath, 'xd.xenesis.tools.userStories.open');
assert.deepEqual(notion?.toolUserStory?.storyContract.openArgs, { id: 'notion' });
assert.ok(notion?.toolUserStory?.storyContract.readbackPaths.includes('xd.xenesis.tools.userStories.status'));
assert.ok(notion?.toolUserStory?.storyContract.approvalBoundaries.includes('xd.xenesis.tools.mcpInstallDrafts.apply'));
assert.ok(notion?.toolUserStory?.storyContract.completionEvidence.includes('MCP settings readback lists the Notion server before tool use.'));

assert.equal(telegram?.channelTemplate?.userStory?.storyContract.openPath, 'xd.xenesis.channels.userStories.open');
assert.deepEqual(telegram?.channelTemplate?.userStory?.storyContract.openArgs, { id: 'telegram' });
assert.ok(telegram?.channelTemplate?.userStory?.storyContract.readbackPaths.includes('xd.xenesis.channels.userStories.status'));
assert.ok(telegram?.channelTemplate?.userStory?.storyContract.approvalBoundaries.includes('xd.xenesis.profiles.testChannel'));
assert.ok(telegram?.channelTemplate?.userStory?.storyContract.completionEvidence.includes('Gateway/channel readbacks confirm the selected channel is safe before remote prompts.'));
```

- [x] **Step 2: Run RED test**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: fail because `storyContract` is missing on tool and channel user-story templates.

- [x] **Step 3: Implement shared story contract**

Add a reusable interface:

```ts
export interface XenesisConnectionUserStoryContract {
  readbackPaths: string[];
  openPath: string;
  openArgs: Record<string, string>;
  approvalBoundaries: string[];
  completionEvidence: string[];
  safetyBoundary: string;
}
```

Then add `storyContract` to `XenesisConnectionToolUserStoryTemplate` and
`XenesisConnectionChannelUserStoryTemplate`. Populate it from the existing
tool/channel template helpers without duplicating per-card rendering logic.

- [x] **Step 4: Run GREEN test**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: pass.

### Task 2: Renderer Contract Summary

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`

- [x] **Step 1: Write failing renderer formatter tests**

Add tests for `formatXenesisUserStoryContractSummary` and
`formatXenesisUserStoryContractDetail`:

```ts
assert.equal(
  formatXenesisUserStoryContractSummary(contract),
  'xd.xenesis.tools.userStories.open / 2 readback path(s) / 1 approval boundary/boundaries / 2 evidence signal(s)',
);
assert.equal(
  formatXenesisUserStoryContractDetail(contract),
  'open xd.xenesis.tools.userStories.open {"id":"notion"} / read xd.xenesis.tools.userStories.status, xd.xenesis.tools.connectors.status / approvals xd.xenesis.tools.mcpInstallDrafts.apply / evidence MCP settings readback lists the Notion server before tool use.; Action Inbox records explicit setup approval. / safety user-story contracts are read/open planning metadata',
);
```

- [x] **Step 2: Run RED renderer test**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: fail because the formatter functions are missing.

- [x] **Step 3: Implement renderer summary and Settings rows**

Export the formatter functions from `xenesisConnectionCenter.ts`, import them in
`SettingsPane.tsx`, and render contract summary/detail rows for both
`toolUserStory` and `channelTemplate.userStory`.

- [x] **Step 4: Run GREEN renderer test**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: pass.

### Task 3: Docs, Audit, And Commit

**Files:**
- Modify: `handoff.md`
- Modify: `docs/manual/12-agent-user-stories.md`
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-user-story-contracts.md`

- [x] **Step 1: Update docs**

Document that existing user-story CR paths now return `storyContract` with
readbacks, open path, approval boundaries, completion evidence, and safety
boundary.

- [x] **Step 2: Run focused and broad verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
npm run typecheck
npm run docs:capabilities:audit
rg -n "Missing registered paths|Missing dispatched coverage paths|Undispatched static callable methods|Dispatcher paths missing from tree" docs\capability-registry-audit.md
npm run smoke:xenesis:natural-desk-routing
git diff --check
```

- [x] **Step 3: Commit**

Commit with:

```powershell
git add -- src\shared\xenesisConnections.ts src\shared\types.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\panes\SettingsPane.tsx src\renderer\i18n\en.ts src\renderer\i18n\ko.ts docs\manual\12-agent-user-stories.md handoff.md docs\obsidian\Xenesis-desk\80_AI\Working` Notes\2026-06-29-user-story-contracts.md
git commit -m "feat: add user story contracts"
```
