# Xenesis Channel Access Groups Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CR-readable and Settings-rendered channel access-group model for implemented Xenesis external bot channels.

**Architecture:** Extend existing implemented `channelTemplate` metadata with `accessGroups`, then register `xd.xenesis.channels.accessGroups.status` beside routing and safety. The main-process adapter derives redacted runtime readiness from existing profile channel settings and gateway warnings; it never returns raw allowlist ids or secrets.

**Tech Stack:** TypeScript, Node test runner, Electron main adapter, React Settings pane, Xenesis Capability Registry.

---

## File Map

- Modify `src/shared/xenesisConnections.ts`: add access-group template types and metadata for Telegram, Slack, Discord, and Webhook.
- Modify `src/shared/types.ts`: re-export the new access-group template types for renderer imports.
- Modify `src/shared/xenesisConnections.test.ts`: add RED/GREEN coverage for access-group metadata.
- Modify `src/shared/deskBridgeCapabilities.ts`: add schema, adapter method, registry group, and dispatcher for `xd.xenesis.channels.accessGroups.status`.
- Modify `src/shared/xenesisConnectionCapabilities.test.ts`: add RED/GREEN CR registration and dispatch coverage.
- Modify `src/main/index.ts`: add main-process read adapter that derives `valueState` and fail-closed diagnostics from current profile/gateway state.
- Modify `src/renderer/panes/xenesisConnectionCenter.ts`: add summary formatter.
- Modify `src/renderer/panes/xenesisConnectionCenter.test.ts`: add RED/GREEN formatter coverage.
- Modify `src/renderer/panes/SettingsPane.tsx`: render access-group metadata under `data-xenesis-channel-access-groups`.
- Modify `src/renderer/i18n/en.ts` and `src/renderer/i18n/ko.ts`: add labels.
- Modify `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`: expose the access-group status path in the Agent Desk-control prompt hint.
- Modify `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`: cover the prompt hint.
- Modify `docs/manual/09-onboarding-connections.md`: document the CR path and boundary.
- Modify `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`: record this slice.
- Update root `handoff.md` after each material step.

---

### Task 1: Shared Access-Group Metadata

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write the failing shared metadata test**

Add a test named `buildXenesisConnectionsStatus exposes OpenClaw-style access group metadata for implemented channels`.

```ts
test('buildXenesisConnectionsStatus exposes OpenClaw-style access group metadata for implemented channels', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'codex-app-server',
      model: 'gpt-5-codex',
      apiKey: '',
      baseUrl: '',
    },
    mcp: {
      available: true,
      serverPath: 'E:/xenesis/mcp/xenesis-desk-mcp-server.mjs',
      bridgeUrl: 'http://127.0.0.1:3845',
      bridgeStatePath: 'C:/Users/example/.xenis/mcp/bridge.json',
      configFilePath: 'C:/Users/example/.xenis/mcp/xenesis-mcp-config.json',
    },
    providerIntegration: {
      cliTargets: [],
      hermes: {
        assetRoot: '',
        hermesRoot: '',
        assetAvailable: false,
        rootConfigured: false,
        pluginsInstalled: false,
        items: [],
      },
    },
    xenesis: null,
  });

  const implemented = status.sections.messengers.items.filter((item) => item.supportLevel === 'implemented');
  const telegram = implemented.find((item) => item.id === 'telegram');
  const discord = implemented.find((item) => item.id === 'discord');

  assert.deepEqual(telegram?.channelTemplate?.accessGroups, {
    model: 'profile-allowlist-fields',
    groupScope: 'chat',
    failClosed: true,
    bindings: [
      {
        groupId: 'telegram-allowed-chats',
        field: 'allowedChatIds',
        required: true,
        emptyDiagnostic: 'allowedChatIds is empty',
        description: 'Telegram chat ids allowed to deliver prompts.',
      },
    ],
    diagnostics: ['profile-channel-settings', 'allowlist-empty', 'gateway-status', 'safe-to-deliver', 'last-error'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.channels.accessGroups.status',
      'xd.xenesis.channels.safety.status',
      'xd.xenesis.status',
    ],
    controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
    safetyBoundaries: [
      'access-group status is read-only',
      'raw chat, channel, guild, and endpoint values are never returned',
      'empty required allowlists fail closed before delivery',
      'channel writes stay on profile update CR paths',
    ],
  });

  assert.deepEqual(discord?.channelTemplate?.accessGroups?.bindings.map((binding) => binding.field), [
    'allowedChannelIds',
    'allowedGuildIds',
  ]);
  assert.equal(discord?.channelTemplate?.accessGroups?.failClosed, true);

  for (const item of implemented) {
    assert.equal(item.channelTemplate?.accessGroups?.model, 'profile-allowlist-fields', `${item.id} model`);
    assert.ok(item.channelTemplate?.accessGroups?.bindings.length, `${item.id} bindings`);
    assert.equal(item.channelTemplate?.accessGroups?.readPaths.includes('xd.xenesis.channels.accessGroups.status'), true);
  }
});
```

- [x] **Step 2: Run test to verify RED**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: FAIL because `channelTemplate.accessGroups` is undefined.

- [x] **Step 3: Add shared types**

In `src/shared/xenesisConnections.ts`, add:

```ts
export interface XenesisConnectionChannelAccessGroupBinding {
  groupId: string;
  field: string;
  required: boolean;
  emptyDiagnostic: string;
  description: string;
}

export interface XenesisConnectionChannelAccessGroupsTemplate {
  model: 'profile-allowlist-fields';
  groupScope: 'chat' | 'channel' | 'guild' | 'endpoint';
  failClosed: boolean;
  bindings: XenesisConnectionChannelAccessGroupBinding[];
  diagnostics: string[];
  readPaths: string[];
  controlPaths: string[];
  safetyBoundaries: string[];
}
```

Then add `accessGroups?: XenesisConnectionChannelAccessGroupsTemplate;` to `XenesisConnectionChannelTemplate`.

In `src/shared/types.ts`, export both new type names from `./xenesisConnections`.

- [x] **Step 4: Add implemented channel metadata**

For Telegram, add exactly:

```ts
accessGroups: {
  model: 'profile-allowlist-fields',
  groupScope: 'chat',
  failClosed: true,
  bindings: [
    {
      groupId: 'telegram-allowed-chats',
      field: 'allowedChatIds',
      required: true,
      emptyDiagnostic: 'allowedChatIds is empty',
      description: 'Telegram chat ids allowed to deliver prompts.',
    },
  ],
  diagnostics: ['profile-channel-settings', 'allowlist-empty', 'gateway-status', 'safe-to-deliver', 'last-error'],
  readPaths: [
    'xd.xenesis.connections.status',
    'xd.xenesis.channels.accessGroups.status',
    'xd.xenesis.channels.safety.status',
    'xd.xenesis.status',
  ],
  controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
  safetyBoundaries: [
    'access-group status is read-only',
    'raw chat, channel, guild, and endpoint values are never returned',
    'empty required allowlists fail closed before delivery',
    'channel writes stay on profile update CR paths',
  ],
},
```

For Slack, use `groupScope: 'channel'`, group id `slack-allowed-channels`, field `allowedChannelIds`, and empty diagnostic `allowedChannelIds is empty`.

For Discord, use `groupScope: 'guild'`, bindings for `allowedChannelIds` and `allowedGuildIds`, and empty diagnostic `allowedChannelIds and allowedGuildIds are empty`.

For Webhook, use `groupScope: 'endpoint'`, group id `webhook-endpoint-env`, field `urlEnv`, empty diagnostic `urlEnv is empty`, and description `Webhook URL environment reference that defines the inbound endpoint boundary.`

- [x] **Step 5: Run shared test to verify GREEN**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`

Expected: PASS.

---

### Task 2: Capability Registry Access-Group Status

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/main/index.ts`

- [x] **Step 1: Write the failing CR test**

Add a test named `xenesis channel access group status capability is registered and dispatches to the adapter`.

```ts
test('xenesis channel access group status capability is registered and dispatches to the adapter', async () => {
  const capability = findDeskBridgeCapability('xd.xenesis.channels.accessGroups.status');
  const schemaProperties = (capability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(capability?.permission, 'read');
  assert.equal(capability?.approval, 'never');
  assert.deepEqual(schemaProperties.channel?.enum, ['telegram', 'slack', 'discord', 'webhook']);

  let calledArgs: unknown = null;
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelAccessGroupsStatus: (args) => {
      calledArgs = args;
      return {
        ok: true,
        items: [{ id: 'telegram', failClosed: true }],
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.accessGroups.status',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calledArgs, { channel: 'telegram' });
  assert.deepEqual(result.result, {
    ok: true,
    items: [{ id: 'telegram', failClosed: true }],
  });
});
```

- [x] **Step 2: Run test to verify RED**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: FAIL because `xd.xenesis.channels.accessGroups.status` is not registered.

- [x] **Step 3: Add CR schema and adapter method**

In `src/shared/deskBridgeCapabilities.ts`, add:

```ts
const XENESIS_CHANNEL_ACCESS_GROUP_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    channel: {
      type: 'string',
      title: 'Channel',
      enum: ['telegram', 'slack', 'discord', 'webhook'],
      description: 'Optional implemented external bot channel to filter.',
    },
  },
} as const;
```

Add to `DeskBridgeCapabilityAdapter`:

```ts
getXenesisChannelAccessGroupsStatus?: (args?: unknown) => Promise<unknown> | unknown;
```

- [x] **Step 4: Register and dispatch CR path**

Under `xd.xenesis.channels`, add group `xd.xenesis.channels.accessGroups` with leaf path `xd.xenesis.channels.accessGroups.status`, permission `read`, approval `never`, and schema `XENESIS_CHANNEL_ACCESS_GROUP_STATUS_SCHEMA`.

In dispatcher, route:

```ts
if (path === 'xd.xenesis.channels.accessGroups.status') {
  return callAdapter(path, api?.getXenesisChannelAccessGroupsStatus, request.args);
}
```

- [x] **Step 5: Add main adapter**

In `src/main/index.ts`, add:

```ts
function readChannelAccessGroupValueState(
  settings: XenesisStatus['profile']['channelSettings'] | undefined,
  channel: XenesisProfileChannelName,
  field: string,
): 'configured' | 'empty' | 'unknown' {
  const channelSettings = settings?.[channel] as Record<string, unknown> | undefined;
  const value = channelSettings?.[field];
  if (typeof value !== 'string') return 'unknown';
  return value.trim() ? 'configured' : 'empty';
}
```

Then implement:

```ts
async function getXenesisChannelAccessGroupsStatus(args?: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const channel = readCapabilityString(body, ['channel', 'id', 'name']);
  if (channel && !isXenesisProfileChannelName(channel)) {
    return {
      ok: false,
      error: `Unsupported Xenesis channel: ${channel}`,
      allowedChannels: XENESIS_PROFILE_CHANNEL_NAMES,
    };
  }

  const status = await getXenesisConnectionsStatus();
  const profileSettings = status.sections.messengers.items.length ? (await getXenesisStatusPayload()).profile.channelSettings : undefined;
  const items = status.sections.messengers.items
    .filter((item) => item.supportLevel === 'implemented' && item.channelTemplate?.accessGroups)
    .filter((item) => !channel || item.id === channel)
    .map((item: XenesisConnectionItem) => {
      const channelName = item.id as XenesisProfileChannelName;
      const template = item.channelTemplate?.accessGroups;
      const bindings = (template?.bindings ?? []).map((binding) => {
        const valueState = readChannelAccessGroupValueState(profileSettings, channelName, binding.field);
        return {
          ...binding,
          valueState,
          failClosed: binding.required && valueState !== 'configured',
        };
      });
      return {
        id: item.id,
        label: item.label,
        status: item.status,
        summary: item.summary,
        model: template?.model,
        groupScope: template?.groupScope,
        failClosed: bindings.some((binding) => binding.failClosed),
        bindings,
        diagnostics: template?.diagnostics ?? [],
        readPaths: template?.readPaths ?? [],
        controlPaths: template?.controlPaths ?? [],
        safetyBoundaries: template?.safetyBoundaries ?? [],
        runtimeWarnings: item.warnings ?? [],
        settingsAction: item.settingsAction,
        crActions: item.crActions ?? [],
      };
    });

  return {
    ok: true,
    updatedAt: status.updatedAt,
    ...(channel ? { channel } : {}),
    total: items.length,
    items,
  };
}
```

Wire it in the main adapter object:

```ts
getXenesisChannelAccessGroupsStatus: (args: unknown) => getXenesisChannelAccessGroupsStatus(args),
```

- [x] **Step 6: Run CR test to verify GREEN**

Run: `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`

Expected: PASS.

---

### Task 3: Renderer Access-Group Summary

**Files:**
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`

- [x] **Step 1: Write failing renderer formatter test**

Add a test named `formatXenesisChannelAccessGroupsSummary describes group scope and fail-closed bindings`.

```ts
test('formatXenesisChannelAccessGroupsSummary describes group scope and fail-closed bindings', () => {
  assert.equal(
    formatXenesisChannelAccessGroupsSummary({
      model: 'profile-allowlist-fields',
      groupScope: 'chat',
      failClosed: true,
      bindings: [
        {
          groupId: 'telegram-allowed-chats',
          field: 'allowedChatIds',
          required: true,
          emptyDiagnostic: 'allowedChatIds is empty',
          description: 'Telegram chat ids allowed to deliver prompts.',
        },
      ],
      diagnostics: ['allowlist-empty'],
      readPaths: ['xd.xenesis.channels.accessGroups.status'],
      controlPaths: ['xd.xenesis.profiles.updateChannels'],
      safetyBoundaries: ['raw values are never returned'],
    }),
    'chat / 1 group binding(s) / fail-closed',
  );
});
```

- [x] **Step 2: Run test to verify RED**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: FAIL because `formatXenesisChannelAccessGroupsSummary` is not exported.

- [x] **Step 3: Add renderer formatter**

In `src/renderer/panes/xenesisConnectionCenter.ts`, import the access-group type and add:

```ts
export function formatXenesisChannelAccessGroupsSummary(
  accessGroups: XenesisConnectionChannelAccessGroupsTemplate,
): string {
  return `${accessGroups.groupScope} / ${accessGroups.bindings.length} group binding(s) / ${
    accessGroups.failClosed ? 'fail-closed' : 'advisory'
  }`;
}
```

- [x] **Step 4: Render Settings access-group metadata**

In `SettingsPane.tsx`, import `formatXenesisChannelAccessGroupsSummary` and render after safety metadata:

```tsx
{channelTemplate.accessGroups ? (
  <div className="sp-info-list sp-info-list-compact" data-xenesis-channel-access-groups={item.id}>
    <div>
      <span>{t('settings.xenesisConnectionsChannelAccessGroupModel')}</span>
      <strong>{formatXenesisChannelAccessGroupsSummary(channelTemplate.accessGroups)}</strong>
    </div>
    <div>
      <span>{t('settings.xenesisConnectionsChannelAccessGroupBindings')}</span>
      <strong>
        {channelTemplate.accessGroups.bindings
          .map((binding) => `${binding.groupId}:${binding.field}`)
          .join(', ')}
      </strong>
    </div>
    <div>
      <span>{t('settings.xenesisConnectionsChannelAccessGroupDiagnostics')}</span>
      <strong>{channelTemplate.accessGroups.diagnostics.join(', ')}</strong>
    </div>
    <div>
      <span>{t('settings.xenesisConnectionsChannelAccessGroupReadback')}</span>
      <strong>{channelTemplate.accessGroups.readPaths.join(', ')}</strong>
    </div>
    <div>
      <span>{t('settings.xenesisConnectionsChannelAccessGroupControls')}</span>
      <strong>{channelTemplate.accessGroups.controlPaths.join(', ')}</strong>
    </div>
    <div>
      <span>{t('settings.xenesisConnectionsChannelAccessGroupBoundaries')}</span>
      <strong>{channelTemplate.accessGroups.safetyBoundaries.join(', ')}</strong>
    </div>
  </div>
) : null}
```

- [x] **Step 5: Add i18n labels**

Add English and Korean keys:

```ts
xenesisConnectionsChannelAccessGroupModel
xenesisConnectionsChannelAccessGroupBindings
xenesisConnectionsChannelAccessGroupDiagnostics
xenesisConnectionsChannelAccessGroupReadback
xenesisConnectionsChannelAccessGroupControls
xenesisConnectionsChannelAccessGroupBoundaries
```

- [x] **Step 6: Run renderer test to verify GREEN**

Run: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`

Expected: PASS.

---

### Task 4: Documentation And Working Notes

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update manual**

Add to the channel safety section:

```md
Implemented channels also expose OpenClaw-style access-group readback through
`xd.xenesis.channels.accessGroups.status`. The read model maps Xenesis profile
allowlist fields such as `allowedChatIds`, `allowedChannelIds`,
`allowedGuildIds`, and `urlEnv` to reusable access-group bindings, reports only
`configured`, `empty`, or `unknown` value states, and treats empty required
allowlists as fail-closed diagnostics. It is read-only; channel mutations remain
on `xd.xenesis.profiles.updateChannels`.
```

- [x] **Step 2: Update Obsidian working note**

Append a `Current Channel Access Groups Read Model Slice` section with:

- `channelTemplate.accessGroups`.
- `xd.xenesis.channels.accessGroups.status`.
- `data-xenesis-channel-access-groups="<channel-id>"`.
- The redaction boundary: raw ids/secrets are not returned.
- Verification commands as they are run.

- [x] **Step 3: Update handoff**

Record each command and exact result as it happens.

---

### Task 5: Verification And Commit

**Files:**
- All touched files.

- [x] **Step 1: Run focused tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: PASS.

- [x] **Step 2: Run scoped Biome**

Run:

```powershell
npx biome check src/shared/xenesisConnections.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/types.ts src/renderer/panes/xenesisConnectionCenter.ts src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts --max-diagnostics 80
```

Expected: PASS.

- [x] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 4: Run CR audit**

Run: `npm run docs:capabilities:audit`

Expected: PASS with missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0, dispatcher paths missing from tree 0. Remove generated `docs/capability-registry-audit.md` after recording if it appears.

- [x] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [x] **Step 6: Run public-release check**

Run: `npm run check:public-release`

Expected known gap: FAIL because `.github/workflows/ci.yml` is absent. Record exact output.

- [x] **Step 7: Run live Electron smoke**

Launch Electron with Playwright `_electron.launch({ args: ['.'], cwd })` after build.

Verify:

- Direct `xd.xenesis.channels.accessGroups.status` returns `ok=true`, `result.ok=true`, `total=4`.
- Filtered status with `{ channel: 'telegram' }` returns `total=1`, one binding with `field='allowedChatIds'`, and no raw chat ids.
- Settings renders `[data-xenesis-channel-access-groups="telegram"]`.
- Agent-pane fenced CR prompt for `xd.xenesis.channels.accessGroups.status` renders `Desk action completed`.

- [x] **Step 8: Commit**

Stage:

```powershell
git add docs/manual/09-onboarding-connections.md "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md" src/main/index.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts src/renderer/i18n/en.ts src/renderer/i18n/ko.ts src/renderer/panes/SettingsPane.tsx src/renderer/panes/xenesisConnectionCenter.test.ts src/renderer/panes/xenesisConnectionCenter.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/shared/xenesisConnectionCapabilities.test.ts src/shared/xenesisConnections.test.ts src/shared/xenesisConnections.ts
git add -f docs/superpowers/plans/2026-06-27-xenesis-channel-access-groups-read-model.md
```

Commit:

```powershell
git commit -m "feat: add xenesis channel access group status"
```
