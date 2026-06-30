# Xenesis Channel Safety Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only CR and Settings surface that exposes implemented external bot channel safety, access-group, loop-protection, and troubleshooting metadata.

**Architecture:** Extend `XenesisConnectionChannelTemplate` with a `safety` read model for implemented Telegram, Slack, Discord, and Webhook cards. Register `xd.xenesis.channels.safety.status` beside the existing channel routing path, derive the CR payload from `getXenesisConnectionsStatus()`, and render the same model in Settings > Xenesis Agent > Connections.

**Tech Stack:** TypeScript, Electron main/renderer, Xenesis shared Capability Registry, `node:test`, Playwright live Electron smoke.

---

### Task 1: Shared Channel Safety Model

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write the failing shared-model test**

Add a test named `buildXenesisConnectionsStatus exposes channel safety access and loop-protection metadata`. Assert that the Telegram implemented messenger card has:

```ts
assert.deepEqual(telegram?.channelTemplate?.safety, {
  accessModel: 'allowlist',
  accessGroupFields: ['allowedChatIds'],
  inboundBoundary: 'telegram chat allowlist',
  outboundBoundary: 'same chat scope as inbound route',
  loopProtection: [
    'ignore messages authored by the bot account',
    'avoid channels where Xenesis can receive its own outbound messages',
    'verify delivery with sanitized test messages before enabling action workflows',
  ],
  approvalGuardrails: ['readonly', 'safe', 'auto'],
  troubleshooting: ['missing-env', 'allowlist-empty', 'safe-to-deliver', 'last-error', 'gateway-status'],
  readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.channels.routing.status', 'xd.xenesis.channels.safety.status'],
  controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
  safetyBoundaries: [
    'safety status is read-only',
    'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
    'channel writes stay on profile update CR paths',
    'delivery tests stay on profile test CR paths',
  ],
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: FAIL because `channelTemplate.safety` is undefined.

- [x] **Step 3: Add shared types**

Add `XenesisConnectionChannelSafetyTemplate` with exact fields from the test and export it from `src/shared/types.ts`.

- [x] **Step 4: Implement implemented-channel safety metadata**

Add `safety` objects to Telegram, Slack, Discord, and Webhook channel templates. Use each channel's existing allowlist/signature/network terms. Do not add safety metadata to planned channels in this slice.

- [x] **Step 5: Run the shared test and verify GREEN**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: PASS.

### Task 2: Channel Safety CR Capability

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`
- Test: `src/shared/xenesisConnectionCapabilities.test.ts`

- [x] **Step 1: Write the failing CR dispatch test**

Add a test named `xenesis channel safety status capability is registered and dispatches to the adapter`. Assert `xd.xenesis.channels.safety.status` is read/no-approval, accepts the implemented channel enum, and dispatches to `getXenesisChannelSafetyStatus`.

- [x] **Step 2: Run the test and verify RED**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: FAIL because the CR path and adapter are missing.

- [x] **Step 3: Register and dispatch the CR path**

Add `getXenesisChannelSafetyStatus?: (args?: unknown) => Promise<unknown> | unknown` to `DeskBridgeCapabilityAdapter`. Add a `xd.xenesis.channels.safety` group using the same channel status schema as routing. Dispatch the path to the adapter.

- [x] **Step 4: Add main-process status helper**

Add `getXenesisChannelSafetyStatus(args?: unknown)` near `getXenesisChannelRoutingStatus()`. Normalize `channel`, reject unsupported ids, filter implemented messenger items with `channelTemplate.safety`, and return `id`, `label`, `status`, `summary`, `safetyControls`, `safety`, `settingsAction`, `crActions`, and `warnings`.

- [x] **Step 5: Wire the main adapter**

Add `getXenesisChannelSafetyStatus: (args: unknown) => getXenesisChannelSafetyStatus(args)` to the CR adapter object.

- [x] **Step 6: Run the CR test and verify GREEN**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: PASS.

### Task 3: Renderer Summary And Settings Surface

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`

- [x] **Step 1: Write the failing renderer helper test**

Add `formatXenesisChannelSafetySummary()` coverage expecting:

```ts
'allowlist / telegram chat allowlist / 3 loop guard(s)'
```

- [x] **Step 2: Run the renderer test and verify RED**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: FAIL because the helper is missing.

- [x] **Step 3: Add the summary helper**

Implement `formatXenesisChannelSafetySummary(safety)` using `accessModel`, `inboundBoundary`, and `loopProtection.length`.

- [x] **Step 4: Render channel safety in Settings**

When `channelTemplate.safety` exists, render a compact block with `data-xenesis-channel-safety={item.id}`. Include summary, access-group fields, inbound/outbound boundaries, loop protection, troubleshooting, read/control paths, and safety boundaries.

- [x] **Step 5: Run renderer and focused shared tests**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts src\shared\xenesisConnections.test.ts`

Expected: PASS.

### Task 4: Documentation And Obsidian

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update the manual**

Document `channelTemplate.safety`, `xd.xenesis.channels.safety.status`, the read-only boundary, and the difference between OpenClaw access groups and Xenesis allowlist fields.

- [x] **Step 2: Update the Obsidian working note**

Append the Channel Safety Read Model slice with files, CR paths, and remaining gaps.

- [x] **Step 3: Update `handoff.md`**

Record implementation progress, RED/GREEN evidence, docs changed, known gaps, and next intended step.

### Task 5: Verification And Commit

**Files:**
- Verify changed files and generated docs.

- [x] **Step 1: Run focused tests**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: PASS.

- [x] **Step 2: Run scoped Biome**

Run: `npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80`

Expected: PASS for the scoped files.

- [x] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 4: Run CR audit**

Run: `npm run docs:capabilities:audit`

Expected: PASS with missing registered paths, missing dispatched coverage paths, undispatched static callable methods, and dispatcher paths missing from tree all equal to 0. Remove generated `docs/capability-registry-audit.md` after recording counters.

- [x] **Step 5: Run build**

Run: `npm run build`

Expected: PASS, allowing already-known Vite warnings.

- [x] **Step 6: Run public release check**

Run: `npm run check:public-release`

Expected: FAIL only if the known `.github/workflows/ci.yml` infra gap remains.

- [x] **Step 7: Run live Electron smoke**

Launch Electron with Playwright `_electron.launch({ args: ['.'], cwd })`. Verify direct `xd.xenesis.channels.safety.status`, filtered Telegram safety, DOM marker `[data-xenesis-channel-safety="telegram"]`, and an Agent-pane fenced CR prompt for the same path returning `Desk action completed`.

- [x] **Step 8: Commit**

Stage the ignored plan with `git add -f docs/superpowers/plans/2026-06-27-xenesis-channel-safety-read-model.md`, stage changed implementation/docs, and commit with:

```bash
git commit -m "feat: add xenesis channel safety status"
```
