# Xenesis Channel Routing Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and Settings-visible routing/setup model for implemented Xenesis external bot channels.

**Architecture:** Extend the existing `channelTemplate` model instead of creating a parallel source of truth. `xd.xenesis.channels.routing.status` reads implemented messenger cards from the Connection Center model and returns their route binding, allowlist fields, auth/pairing, default agent, session scope, diagnostics, and delivery capabilities. Settings renders the same metadata inside each messenger connection card.

**Tech Stack:** TypeScript, Xenesis Capability Registry, React Settings pane, Node test runner, Biome, Electron live smoke.

---

### Task 1: Shared Channel Routing Model

**Files:**
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`

- [x] **Step 1: Write the failing test**

Add assertions that the implemented Telegram, Slack, Discord, and Webhook messenger cards include `channelTemplate.routing` with:

```ts
{
  routeBinding: 'telegram.allowedChatIds',
  allowlistFields: ['allowedChatIds'],
  pairing: 'bot token',
  defaultAgent: 'xenesis-agent',
  sessionScope: 'chat',
  diagnostics: ['missing-env', 'safe-to-deliver', 'last-error'],
  deliveryFeatures: ['direct-messages', 'groups', 'files'],
}
```

Use Telegram as the exact deep-equal case and check the other implemented channels have non-empty route binding, allowlist fields, diagnostics, and delivery features.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because `channelTemplate.routing` does not exist.

- [x] **Step 3: Implement minimal model**

Add:

```ts
export interface XenesisConnectionChannelRoutingTemplate {
  routeBinding: string;
  allowlistFields: string[];
  pairing: string;
  defaultAgent: string;
  sessionScope: string;
  diagnostics: string[];
  deliveryFeatures: string[];
}
```

Then add optional `routing?: XenesisConnectionChannelRoutingTemplate` to `XenesisConnectionChannelTemplate`, export the type from `src/shared/types.ts`, and populate routing metadata for the implemented Telegram, Slack, Discord, and Webhook entries.

- [x] **Step 4: Run test to verify it passes**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

### Task 2: CR Routing Status Capability

**Files:**
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Write the failing test**

Add assertions that:

- `xd.xenesis.channels.routing.status` exists under a new/readable channel-routing group.
- Permission is `read`, approval is `never`.
- The schema accepts optional `channel` with enum `telegram`, `slack`, `discord`, `webhook`.
- Dispatch calls a new adapter `getXenesisChannelRoutingStatus` with the original args.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: FAIL because the path and adapter do not exist.

- [x] **Step 3: Implement minimal registry, dispatch, and main adapter**

Add optional adapter method:

```ts
getXenesisChannelRoutingStatus?: (args?: unknown) => Promise<unknown> | unknown;
```

Register `xd.xenesis.channels.routing.status`. Dispatch it to the adapter. In `src/main/index.ts`, implement the adapter by reading `getXenesisConnectionsStatus()` and returning implemented messenger cards with `channelTemplate.routing`, optionally filtered by `channel`.

- [x] **Step 4: Run test to verify it passes**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
```

Expected: PASS.

### Task 3: Settings Rendering And Docs

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Write the failing renderer helper test**

Add `formatXenesisChannelRoutingSummary(template)` expectation for a Telegram-style template:

```ts
{
  routeBinding: 'telegram.allowedChatIds',
  allowlistFields: ['allowedChatIds'],
  pairing: 'bot token',
  defaultAgent: 'xenesis-agent',
  sessionScope: 'chat',
  diagnostics: ['missing-env', 'safe-to-deliver'],
  deliveryFeatures: ['direct-messages', 'groups'],
}
```

Expected summary: `telegram.allowedChatIds -> xenesis-agent (chat)`.

- [x] **Step 2: Run test to verify it fails**

Run:

```powershell
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: FAIL because `formatXenesisChannelRoutingSummary` does not exist.

- [x] **Step 3: Implement helper and render block**

Export `formatXenesisChannelRoutingSummary`. In `SettingsPane`, render `channelTemplate.routing` with:

- Route binding
- Default agent
- Session scope
- Allowlist fields
- Diagnostics
- Delivery features

Use `data-xenesis-channel-routing={item.id}` for live smoke.

- [x] **Step 4: Update docs and working notes**

Document `xd.xenesis.channels.routing.status`, clarify it is read-only setup/routing metadata, and record verification in the Obsidian working note and `handoff.md`.

- [x] **Step 5: Run targeted and broad verification**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80
npm run typecheck
npm run docs:capabilities:audit
npm run build
```

Expected: targeted tests, scoped Biome, typecheck, CR audit, and build pass. Remove generated audit docs after recording counters.

- [x] **Step 6: Live smoke**

Launch the Electron app and verify:

- `xd.xenesis.channels.routing.status` returns `ok=true`.
- `xd.xenesis.channels.routing.status` with `{ "channel": "telegram" }` returns one routing item.
- Settings > Xenesis Agent > Connections renders `[data-xenesis-channel-routing="telegram"]`.
- A live Agent-pane fenced CR prompt for `xd.xenesis.channels.routing.status` returns `Desk action completed.`

- [x] **Step 7: Commit**

Run:

```powershell
git add -f docs/superpowers/plans/2026-06-27-xenesis-channel-routing-read-model.md
git add src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/shared/deskBridgeCapabilities.ts src/main/index.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts docs/manual/09-onboarding-connections.md "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md"
git commit -m "feat: add xenesis channel routing read model"
```
