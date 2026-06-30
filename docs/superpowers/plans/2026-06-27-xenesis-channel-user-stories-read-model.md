# Xenesis Channel User Stories Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CR-readable and CR-openable external messenger/channel user-story workflow surfaces for implemented and planned Xenesis channels.

**Architecture:** Reuse the Connection Center messenger cards as the source of truth. Add `channelTemplate.userStory` metadata and project it through `xd.xenesis.channels.userStories.status/open`; the open path only focuses Settings > Xenesis Agent > Connections and never sends messages or enables planned adapters.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, Electron main-process CR adapter, React Settings pane, Biome.

---

### Task 1: RED Tests

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Add shared model expectation**

Add a test that expects Telegram and Signal messenger cards to expose `channelTemplate.userStory` metadata. Telegram should represent implemented remote prompt workflows; Signal should represent planned private-message workflows.

- [x] **Step 2: Add CR capability expectation**

Add a test that expects `xd.xenesis.channels.userStories.status` and `xd.xenesis.channels.userStories.open` to be registered and dispatch to adapter methods.

- [x] **Step 3: Add renderer helper expectation**

Add a test that expects `formatXenesisChannelUserStorySummary` to summarize workflow type, runtime support, and story count.

- [x] **Step 4: Add Agent prompt hint expectation**

Add a test that expects the Agent Desk-control prompt hint to include both new CR paths.

- [x] **Step 5: Run RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: FAIL because channel user-story metadata, CR paths, renderer formatter, and prompt hints are missing.

### Task 2: Shared Model And CR Projection

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Add channel user-story types**

Add:

```ts
export type XenesisConnectionChannelUserStoryWorkflowType =
  | 'remote-prompt'
  | 'team-thread'
  | 'webhook-ingress'
  | 'planned-messenger'
  | 'planned-mailbox';

export type XenesisConnectionChannelUserStoryRuntimeSupport = 'implemented' | 'planned-adapter';

export interface XenesisConnectionChannelUserStoryTemplate {
  workflowType: XenesisConnectionChannelUserStoryWorkflowType;
  runtimeSupport: XenesisConnectionChannelUserStoryRuntimeSupport;
  primarySurface: string;
  setupSurface: string;
  userStories: string[];
  prerequisiteSetup: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}
```

- [x] **Step 2: Attach templates**

Attach `channelTemplate.userStory` to implemented Telegram, Slack, Discord, Webhook and all planned messenger cards.

- [x] **Step 3: Register CR paths**

Add:

```ts
xd.xenesis.channels.userStories.status
xd.xenesis.channels.userStories.open
```

Use the existing messenger id schema pattern. `status` is read/no approval. `open` is control/no approval and focuses the requested messenger card.

- [x] **Step 4: Add main-process helpers**

Use `getXenesisConnectionsStatus()` and project `sections.messengers.items` with `channelTemplate.userStory`.

### Task 3: UI, Agent Hint, Docs

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Add formatter**

Add:

```ts
export function formatXenesisChannelUserStorySummary(workflow: XenesisConnectionChannelUserStoryTemplate): string {
  return `${workflow.workflowType} / ${workflow.runtimeSupport} / ${workflow.userStories.length} user story/stories`;
}
```

- [x] **Step 2: Render Settings block**

Render `data-xenesis-channel-user-story="<channel-id>"` with summary, setup surface, user stories, prerequisites, read/control paths, diagnostics, and safety boundaries.

- [x] **Step 3: Update Agent prompt hint**

Add the two new paths to the useful direct CR path list.

- [x] **Step 4: Update docs**

Document that channel user stories are read/open planning surfaces and do not send messages, create adapters, bypass approvals, or enable planned channels.

### Task 4: Verification And Commit

**Files:**
- Commit all touched files except ignored local `handoff.md`.

- [x] **Step 1: Run focused tests**

Run the RED/GREEN focused command again after implementation.

- [x] **Step 2: Run scoped formatting/checking**

Run targeted Biome format/check over the small changed shared/renderer/i18n files.

- [x] **Step 3: Run release gates**

Run:

```powershell
npm run typecheck
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Record the known public-release infra gap if `.github/workflows/ci.yml` is still absent.

- [x] **Step 4: Run live smoke**

Verify direct `xd.xenesis.channels.userStories.status`, direct `xd.xenesis.channels.userStories.open`, Settings DOM `[data-xenesis-channel-user-story="telegram"]`, and Agent-pane fenced CR prompt.

- [x] **Step 5: Commit**

```powershell
git add -A
git add -f docs\superpowers\plans\2026-06-27-xenesis-channel-user-stories-read-model.md
git commit -m "feat: add xenesis channel user stories"
```
