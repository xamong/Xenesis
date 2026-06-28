# Xenesis OAuth Setup Packet Open Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Google tool OAuth setup packets directly openable and focusable inside the Desk Connection Center through CR and natural language.

**Architecture:** Keep the existing read path `xd.xenesis.tools.oauthDrafts.setupPacket` unchanged. Add a dedicated open path, a separate Connection Center detail focus, renderer focus data, and natural-language routing that opens the setup packet block without starting OAuth or storing tokens.

**Tech Stack:** TypeScript shared models, Electron main CR adapter, React Settings renderer, Node test runner with `tsx`, natural routing smoke scripts.

---

### Task 1: Detail Focus And Tool View Section

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write failing shared model test**

Assert that planned Google tool views expose an `oauth-setup-packet` section and
that the setup packet control paths include the new open path:

```ts
assert.equal(
  status.sections.tools.items
    .find((item) => item.id === 'google-calendar')
    ?.toolView?.viewSections.find((section) => section.id === 'oauth-setup-packet')?.focusConnectionDetail,
  'tool-oauth-setup-packet',
);
assert.deepEqual(
  status.sections.tools.items
    .find((item) => item.id === 'google-calendar')
    ?.toolView?.viewSections.find((section) => section.id === 'oauth-setup-packet')?.openArgs,
  { id: 'google-calendar', section: 'oauth-setup-packet', ensureVisible: true },
);
assert.ok(
  status.sections.tools.items
    .find((item) => item.id === 'google-calendar')
    ?.toolOAuthDraft?.setupPacket.controlPaths.includes('xd.xenesis.tools.oauthDrafts.setupPacket.open'),
);
```

- [x] **Step 2: Run RED shared test**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: fail because `oauth-setup-packet` is not a tool view section and setup
packet control paths do not include an open path.

- [x] **Step 3: Implement shared model**

Add `tool-oauth-setup-packet` to `XENESIS_CONNECTION_CENTER_DETAIL_FOCUS_VALUES`,
add `oauth-setup-packet` to `XENESIS_CONNECTION_TOOL_VIEW_SECTION_IDS`, map it to
the new detail focus, add a planned OAuth tool view section, and add
`xd.xenesis.tools.oauthDrafts.setupPacket.open` to setup packet control paths.

- [x] **Step 4: Run GREEN shared test**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: pass.

### Task 2: CR Open Path And Main Dispatch

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Write failing CR tests**

Assert that `xd.xenesis.tools.oauthDrafts.setupPacket.open` is registered,
dispatches to an adapter, and main maps it to
`focusConnectionDetail: 'tool-oauth-setup-packet'`.

- [x] **Step 2: Run RED CR test**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: fail because the CR tree and dispatch adapter do not expose setup
packet open.

- [x] **Step 3: Implement CR and main dispatch**

Add adapter method `openXenesisToolOAuthSetupPacket`, register
`xd.xenesis.tools.oauthDrafts.setupPacket.open`, and implement main open by
calling the existing tool catalog open helper with allowed OAuth draft ids and
`focusConnectionDetail: 'tool-oauth-setup-packet'`.

- [x] **Step 4: Run GREEN CR test**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: pass.

### Task 3: Renderer Button And Natural Routing

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/shared/xenesisNaturalLanguageCapabilityCatalog.ts`
- Modify: `src/shared/xenesisNaturalLanguageActionResolvers.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

- [x] **Step 1: Write failing renderer and natural tests**

Add coverage for a new builder:

```ts
assert.deepEqual(buildXenesisToolOAuthSetupPacketOpenRequest(item), {
  path: 'xd.xenesis.tools.oauthDrafts.setupPacket.open',
  args: { id: 'google-calendar', ensureVisible: true },
  source: 'xenesis',
  approved: false,
});
```

Add natural routing coverage:

```ts
assert.deepEqual(planXenesisDeskNaturalLanguageActions('google calendar oauth setup packet 열어줘').actions, [
  {
    id: 'natural-xenesis-tool-oauth-setup-packet-open-google-calendar',
    path: 'xd.xenesis.tools.oauthDrafts.setupPacket.open',
    args: { id: 'google-calendar', ensureVisible: true },
    approved: false,
    reason: 'Open Google Calendar OAuth setup packet from natural language request.',
  },
]);
```

- [x] **Step 2: Run RED renderer and natural tests**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: fail because the renderer builder, detail focus selector, natural
open route, and smoke prompt are absent.

- [x] **Step 3: Implement renderer and natural routing**

Add the builder, add `data-xenesis-tool-oauth-setup-packet`, render an open
button, add translations, and route explicit open prompts mentioning OAuth setup
packet to the new CR open path.

- [x] **Step 4: Run GREEN renderer and natural tests**

Run the same three focused commands. Expected: pass.

### Task 4: Docs, Verification, And Commit

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/capability-registry-audit.md`
- Modify: `handoff.md`
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-oauth-setup-packet-open.md`

- [x] **Step 1: Update docs**

Document the setup packet open path and that it only focuses review metadata.

- [x] **Step 2: Run focused and broad verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
npm run typecheck
npm run docs:capabilities:audit
rg -n "Missing registered paths|Missing dispatched coverage paths|Undispatched static callable methods|Dispatcher paths missing from tree" docs\capability-registry-audit.md
npm run build
npm run smoke:xenesis:natural-desk-routing
git diff --check
```

- [x] **Step 3: Commit**

Commit with:

```powershell
git add -f -- docs\superpowers\plans\2026-06-29-xenesis-oauth-setup-packet-open.md
git add -- src\shared\xenesisConnections.ts src\shared\types.ts src\shared\xenesisConnections.test.ts src\shared\deskBridgeCapabilities.ts src\shared\xenesisConnectionCapabilities.test.ts src\main\index.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\panes\SettingsPane.tsx src\renderer\i18n\en.ts src\renderer\i18n\ko.ts src\shared\xenesisNaturalLanguageCapabilityCatalog.ts src\shared\xenesisNaturalLanguageActionResolvers.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs docs\manual\09-onboarding-connections.md docs\capability-registry-audit.md handoff.md docs\obsidian\Xenesis-desk\80_AI\Working` Notes\2026-06-29-oauth-setup-packet-open.md
git commit -m "feat: open oauth setup packets"
```
