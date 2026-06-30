# Xenesis Channel Profile Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Desk-native, CR-first review surface for external messenger channel profile settings before any `xd.xenesis.profiles.updateChannels` mutation is performed.

**Architecture:** Extend the existing Connection Center read model with `channelProfileDraft` metadata for implemented Telegram, Slack, Discord, and webhook channels. Register `xd.xenesis.channels.profileDrafts.status/open/request` in the Capability Registry, with `request` recording a local Action Inbox item only. Settings renders the draft as an internal card and exposes a request button that does not mutate channel settings or send messages.

**Tech Stack:** TypeScript, Node test runner via `npx tsx --test`, Electron main-process CR adapter, React SettingsPane, Biome, Capability Registry audit.

---

### Task 1: Shared Read Model And Renderer Helpers

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`

- [x] **Step 1: Write failing shared tests**

Add a test that expects implemented messenger cards to expose `channelProfileDraft` with:
- `draftStatus`
- `actionInboxKind: "xenesis-channel-profile-draft"`
- redacted profile field states
- required/missing field names
- guardrail fields `approvalMode`, `maxTurns`, `maxTokens`
- read paths including `xd.xenesis.channels.profileDrafts.status`
- control paths including `xd.xenesis.channels.profileDrafts.request`
- safety boundaries stating that the draft does not mutate settings or send messages.

- [x] **Step 2: Write failing renderer helper tests**

Add tests for:
- `formatXenesisChannelProfileDraftSummary(draft)`
- `buildXenesisChannelProfileDraftRequest(item)`

Expected request path:

```ts
{
  path: 'xd.xenesis.channels.profileDrafts.request',
  args: { channel: item.id },
  source: 'xenesis',
  approved: true,
}
```

- [x] **Step 3: Verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: fail because `channelProfileDraft`, formatter, and request builder do not exist.

- [x] **Step 4: Implement minimal shared model**

Add exported types for:
- `XenesisConnectionChannelProfileDraftStatus`
- `XenesisConnectionChannelProfileDraftField`
- `XenesisConnectionChannelProfileDraftGuardrails`
- `XenesisConnectionChannelProfileDraftTemplate`

Attach `channelProfileDraft` to implemented messenger items using current profile settings, env state, routing/access-group/pairing metadata, and redacted field state only.

- [x] **Step 5: Implement renderer helpers**

Add formatter and request builder in `xenesisConnectionCenter.ts`, and re-export types through `src/shared/types.ts`.

- [x] **Step 6: Verify GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: all tests pass.

### Task 2: CR Registration, Main Adapter, And UI

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Write failing CR tests**

Add a test that expects:
- `xd.xenesis.channels.profileDrafts.status` as read/never
- `xd.xenesis.channels.profileDrafts.open` as control/never
- `xd.xenesis.channels.profileDrafts.request` as write with schema accepting `channel`
- dispatch to `getXenesisChannelProfileDraftsStatus`, `openXenesisChannelProfileDraft`, and `requestXenesisChannelProfileDraft`

- [x] **Step 2: Write failing Agent hint test**

Expect the Desk-control prompt hint to list the three new CR paths and state the review-only boundary.

- [x] **Step 3: Verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: fail because paths and hint do not exist.

- [x] **Step 4: Implement CR schemas and dispatch**

Add profile draft group under `xd.xenesis.channels.profileDrafts` and wire adapter methods.

- [x] **Step 5: Implement main-process handlers**

Add:
- `getXenesisChannelProfileDraftsStatus`
- `openXenesisChannelProfileDraft`
- `requestXenesisChannelProfileDraft`

The request handler must call `recordMcpActionInboxRequest` with kind `xenesis-channel-profile-draft`, approval session key `xenesis-channel-profile-draft:<channel>`, and a description containing only redacted env/profile field names and safety boundaries.

- [x] **Step 6: Render Settings card**

Render a section with `data-xenesis-channel-profile-draft="<channel>"`, draft summary, required fields, missing fields, guardrails, readback/control paths, diagnostics, blocked actions, and safety boundaries. Add a request button.

- [x] **Step 7: Verify GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: all focused tests pass.

### Task 3: Documentation, Audit, Live Verification, Commit

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update docs**

Document that channel profile drafts are review-only, do not mutate `updateChannels`, do not send test messages, and keep actual changes on existing CR paths.

- [x] **Step 2: Run verification**

Run:

```powershell
npx biome format --write <touched files>
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npx biome check <touched files> --max-diagnostics 80
npm run typecheck
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Expected: public-release may keep failing only for the known `.github/workflows/ci.yml` gap.

- [x] **Step 3: Live smoke**

Use Electron `_electron.launch` to verify:
- direct `xd.xenesis.channels.profileDrafts.status` for Telegram
- approved `xd.xenesis.channels.profileDrafts.request` for Slack
- Action Inbox contains `xenesis-channel-profile-draft:slack`
- Settings DOM has `[data-xenesis-channel-profile-draft="telegram"]`
- Agent-pane CR prompt for status returns `Desk action completed`

- [x] **Step 4: Commit**

Stage touched files and force-add this ignored plan file:

```powershell
git add <touched files>
git add -f docs/superpowers/plans/2026-06-27-xenesis-channel-profile-drafts.md
git commit -m "feat: add xenesis channel profile drafts"
```
