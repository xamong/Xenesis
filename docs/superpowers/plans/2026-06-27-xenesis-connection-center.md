# Xenesis Connection Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CR-first Connection Center that summarizes Xenesis Agent provider readiness, MCP/tool connections, gateway state, messenger channels, and guide docs inside Xenesis Desk.

**Architecture:** Add a shared typed connection status model, a main-process aggregator, a read-only CR path, a preload/API bridge, a Settings UI tab, and public manual docs. Existing gateway/profile/provider/MCP actions remain the mutating paths; the new connection status path is read-only and safe to expose to Agent/MCP callers.

**Tech Stack:** TypeScript, Electron IPC, React SettingsPane, Node `node:test`, Xenesis Capability Registry, Markdown docs.

---

## File Structure

- Create `src/shared/xenesisConnections.ts`: serializable connection catalog, readiness summaries, and aggregation helpers.
- Create `src/shared/xenesisConnections.test.ts`: root Node tests for connection status classification.
- Modify `src/shared/types.ts`: add `XenesisApi.connectionsStatus()` and import the `XenesisConnectionsStatus` type.
- Modify `src/shared/deskBridgeCapabilities.ts`: register and dispatch `xd.xenesis.connections.status`.
- Modify `src/main/index.ts`: build connection status from settings, MCP status, provider integration status, and Xenesis status; add IPC and CR adapter wiring.
- Modify `src/preload/index.ts`: expose `window.xenesisAPI.connectionsStatus()`.
- Modify `src/renderer/env.d.ts`: ensure the renderer sees the expanded `XenesisApi` type through the existing global.
- Modify `src/renderer/panes/SettingsPane.tsx`: add a Connection Center tab in the Xenesis Agent settings section.
- Modify `src/renderer/i18n/en.ts` and `src/renderer/i18n/ko.ts`: add Settings labels.
- Create `docs/manual/09-onboarding-connections.md`: user and agent guide for onboarding and connections.
- Modify `docs/manual/README.md`: link the new manual page.
- Create `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`: working graph note.
- Modify local `handoff.md`: record each material decision, command, and verification result. This file is ignored in this worktree unless explicitly force-added.

## Task 1: Repair Baseline Typecheck Failure

**Files:**
- Modify: `packages/xenesis-agent-core/src/embeddedAgentRuntime.test.ts`

- [ ] **Step 1: Confirm the existing failure**

Run:

```powershell
npm run typecheck
```

Expected: FAIL with:

```text
packages/xenesis-agent-core/src/embeddedAgentRuntime.test.ts(10,46): error TS2352
Property 'surface' is missing
```

- [ ] **Step 2: Patch the test fixture**

In `packages/xenesis-agent-core/src/embeddedAgentRuntime.test.ts`, update the first test fixture to include `surface`.

```ts
  const result = mapDeskEmbeddedPromptResult({
    ok: true,
    exitCode: 0,
    traceId: 'trace-1',
    sessionId: 'session-1',
    surface: 'agent',
    output: '',
    errors: '',
    events: [],
    doneContent: '최종 응답입니다.',
  } as DeskEmbeddedPromptResult);
```

- [ ] **Step 3: Run the narrow check**

Run:

```powershell
npm run typecheck
```

Expected: the `surface` error is gone. If a different existing error appears, record it in `handoff.md` before continuing.

- [ ] **Step 4: Commit**

```powershell
git add packages\xenesis-agent-core\src\embeddedAgentRuntime.test.ts
git commit -m "test: align embedded agent runtime fixture"
```

## Task 2: Add Shared Connection Status Model

**Files:**
- Create: `src/shared/xenesisConnections.ts`
- Create: `src/shared/xenesisConnections.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/xenesisConnections.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildXenesisConnectionsStatus, XENESIS_CONNECTION_GUIDES } from './xenesisConnections';

test('buildXenesisConnectionsStatus reports ready provider, MCP, gateway, and Telegram', () => {
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
      cliTargets: [
        {
          id: 'codex',
          label: 'Codex',
          configType: 'codex-toml',
          supportsMcp: true,
          supportsSkill: true,
          mcpConfigPath: 'C:/Users/example/.codex/config.toml',
          skillPath: 'C:/Users/example/.codex/skills/xd',
          mcpInstalled: true,
          skillInstalled: true,
        },
      ],
      hermes: {
        assetRoot: 'E:/xenesis/providers',
        hermesRoot: '',
        assetAvailable: true,
        rootConfigured: false,
        pluginsInstalled: false,
        items: [],
      },
    },
    xenesis: {
      ok: true,
      running: true,
      managed: true,
      enabled: true,
      runtimeMode: 'embedded',
      url: 'http://127.0.0.1:3846',
      runtimePath: 'embedded',
      xenesisHome: 'C:/Users/example/.xenis',
      workspace: 'E:/workspace/project',
      providerRuntime: {
        provider: 'codex-app-server',
        model: 'gpt-5-codex',
        profile: 'desk',
        baseURL: '',
        apiKeyEnv: '',
      },
      error: '',
      updatedAt: '2026-06-27T00:00:00.000Z',
      gateway: {
        enabled: true,
        running: true,
        managed: true,
        url: 'http://127.0.0.1:3846',
        host: '127.0.0.1',
        port: 3846,
        workspace: 'E:/workspace/project',
        error: '',
        updatedAt: '2026-06-27T00:00:00.000Z',
        channels: {
          total: 4,
          enabled: 1,
          ready: 1,
          blocked: 0,
          disabled: 3,
          items: [
            {
              name: 'telegram',
              enabled: true,
              ready: true,
              runtimeStatus: 'ready',
              missingEnv: [],
              warnings: [],
              safeToDeliver: true,
              approvalMode: 'safe',
              maxTurns: 4,
              maxTokens: 4000,
            },
          ],
          telegram: {
            name: 'telegram',
            enabled: true,
            ready: true,
            runtimeStatus: 'ready',
            missingEnv: [],
            warnings: [],
            safeToDeliver: true,
            approvalMode: 'safe',
            maxTurns: 4,
            maxTokens: 4000,
          },
        },
      },
      profile: {
        active: 'desk',
        configured: 'desk',
        installed: ['desk'],
        templates: [],
        channels: [
          { name: 'telegram', enabled: true, configured: true, env: ['TELEGRAM_BOT_TOKEN'] },
          { name: 'slack', enabled: false, configured: false, env: ['SLACK_BOT_TOKEN'] },
          { name: 'discord', enabled: false, configured: false, env: ['DISCORD_BOT_TOKEN'] },
          { name: 'webhook', enabled: false, configured: false, env: ['XENESIS_WEBHOOK_URL'] },
        ],
        channelSettings: {
          telegram: { enabled: true, tokenEnv: 'TELEGRAM_BOT_TOKEN', allowedChatIds: '123' },
          slack: {
            enabled: false,
            botTokenEnv: 'SLACK_BOT_TOKEN',
            signingSecretEnv: 'SLACK_SIGNING_SECRET',
            webhookUrlEnv: 'SLACK_WEBHOOK_URL',
            allowedChannelIds: '',
          },
          discord: {
            enabled: false,
            botTokenEnv: 'DISCORD_BOT_TOKEN',
            webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
            allowedChannelIds: '',
            allowedGuildIds: '',
          },
          webhook: { enabled: false, urlEnv: 'XENESIS_WEBHOOK_URL' },
        },
        policy: {
          workflow: '',
          approvalMode: 'safe',
          maxTurns: 4,
          providerRetries: 0,
          contextAutoCompact: true,
          memoryEnabled: true,
          subagentsEnabled: true,
          browserEnabled: true,
          verificationAutoRun: false,
          verificationAutoFix: false,
        },
      },
    },
  });

  assert.equal(status.summary.ready, 7);
  assert.equal(status.sections.provider.items[0].status, 'ready');
  assert.equal(status.sections.mcp.items[0].status, 'ready');
  assert.equal(status.sections.gateway.items[0].status, 'ready');
  assert.equal(status.sections.messengers.items.find((item) => item.id === 'telegram')?.status, 'ready');
  assert.equal(status.sections.tools.items.find((item) => item.id === 'google-calendar')?.status, 'planned');
});

test('buildXenesisConnectionsStatus reports missing setup without leaking secrets', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'openai',
      model: '',
      apiKey: 'sk-secret-value',
      baseUrl: '',
    },
    mcp: {
      available: false,
      serverPath: 'E:/xenesis/mcp/xenesis-desk-mcp-server.mjs',
      bridgeUrl: '',
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

  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes('sk-secret-value'), false);
  assert.equal(status.sections.provider.items[0].status, 'blocked');
  assert.equal(status.sections.mcp.items[0].status, 'blocked');
  assert.equal(status.sections.gateway.items[0].status, 'unknown');
  assert.ok(XENESIS_CONNECTION_GUIDES.some((guide) => guide.id === 'onboarding-connections'));
});
```

- [ ] **Step 2: Run the failing test**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: FAIL because `src/shared/xenesisConnections.ts` does not exist.

- [ ] **Step 3: Create the shared model and helper**

Create `src/shared/xenesisConnections.ts`:

```ts
import type {
  AiProviderSettings,
  McpSettingsStatus,
  ProviderIntegrationStatus,
  XenesisGatewayChannelName,
  XenesisProfileChannelName,
  XenesisStatus,
} from './types';

export type XenesisConnectionKind = 'provider' | 'local-cli' | 'mcp' | 'gateway' | 'tool' | 'messenger' | 'guide';
export type XenesisConnectionStatus = 'ready' | 'needs-setup' | 'disabled' | 'blocked' | 'planned' | 'unknown';

export interface XenesisConnectionItem {
  id: string;
  kind: XenesisConnectionKind;
  label: string;
  status: XenesisConnectionStatus;
  summary: string;
  requiredEnv?: string[];
  missingEnv?: string[];
  crActions?: string[];
  settingsTarget?: string;
  guidePath?: string;
  warnings?: string[];
}

export interface XenesisConnectionSection {
  id: string;
  label: string;
  items: XenesisConnectionItem[];
}

export interface XenesisConnectionsStatus {
  ok: boolean;
  updatedAt: string;
  summary: Record<XenesisConnectionStatus, number> & { total: number };
  sections: {
    provider: XenesisConnectionSection;
    localCli: XenesisConnectionSection;
    mcp: XenesisConnectionSection;
    tools: XenesisConnectionSection;
    gateway: XenesisConnectionSection;
    messengers: XenesisConnectionSection;
    guides: XenesisConnectionSection;
  };
  warnings: string[];
}

export interface BuildXenesisConnectionsStatusInput {
  aiProvider: Pick<AiProviderSettings, 'provider' | 'model' | 'apiKey' | 'baseUrl'>;
  mcp: McpSettingsStatus;
  providerIntegration: ProviderIntegrationStatus;
  xenesis: XenesisStatus | null;
  now?: Date;
}

export const XENESIS_CONNECTION_GUIDES: XenesisConnectionItem[] = [
  {
    id: 'onboarding-connections',
    kind: 'guide',
    label: 'Onboarding and connections',
    status: 'ready',
    summary: 'First-run setup order for providers, MCP tools, gateway, and external bot channels.',
    guidePath: 'docs/manual/09-onboarding-connections.md',
  },
  {
    id: 'cr-mcp-gateway-bots',
    kind: 'guide',
    label: 'Capability Registry, MCP, gateway, and bots',
    status: 'ready',
    summary: 'Existing CR, MCP bridge, gateway, and bot session reference.',
    guidePath: 'docs/manual/05-cr-mcp-gateway-bots.md',
  },
];

const TOOL_CONNECTIONS: XenesisConnectionItem[] = [
  {
    id: 'fetch',
    kind: 'tool',
    label: 'Fetch',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for reading web pages as model context.',
    settingsTarget: 'mcp',
  },
  {
    id: 'filesystem',
    kind: 'tool',
    label: 'Filesystem',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for workspace-scoped file reads.',
    settingsTarget: 'mcp',
  },
  {
    id: 'github',
    kind: 'tool',
    label: 'GitHub',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for repositories, issues, and pull requests.',
    requiredEnv: ['GITHUB_TOKEN'],
    settingsTarget: 'mcp',
  },
  {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for Notion pages and databases.',
    requiredEnv: ['NOTION_TOKEN'],
    settingsTarget: 'mcp',
  },
  {
    id: 'linear',
    kind: 'tool',
    label: 'Linear',
    status: 'needs-setup',
    summary: 'Recommended OAuth MCP tool for Linear issues and projects.',
    settingsTarget: 'mcp',
  },
  {
    id: 'google-workspace',
    kind: 'tool',
    label: 'Google Workspace',
    status: 'planned',
    summary: 'Planned MCP connection for Google Workspace after a verified template is selected.',
    settingsTarget: 'mcp',
    warnings: ['No verified install template is bundled yet.'],
  },
  {
    id: 'google-calendar',
    kind: 'tool',
    label: 'Google Calendar',
    status: 'planned',
    summary: 'Planned MCP connection for calendar context and scheduling workflows.',
    settingsTarget: 'mcp',
    warnings: ['No verified install template is bundled yet.'],
  },
];

const MESSENGERS: Array<{ id: XenesisProfileChannelName; label: string }> = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'slack', label: 'Slack' },
  { id: 'discord', label: 'Discord' },
  { id: 'webhook', label: 'Webhook' },
];

function countItems(sections: XenesisConnectionsStatus['sections']): XenesisConnectionsStatus['summary'] {
  const summary = {
    ready: 0,
    'needs-setup': 0,
    disabled: 0,
    blocked: 0,
    planned: 0,
    unknown: 0,
    total: 0,
  };
  for (const section of Object.values(sections)) {
    for (const item of section.items) {
      summary[item.status] += 1;
      summary.total += 1;
    }
  }
  return summary;
}

function providerItem(aiProvider: BuildXenesisConnectionsStatusInput['aiProvider']): XenesisConnectionItem {
  const isLocalProvider = ['auto', 'codex-cli', 'codex-app-server', 'claude-cli', 'claude-interactive', 'ollama', 'lmstudio'].includes(
    aiProvider.provider,
  );
  const hasCredential = isLocalProvider || Boolean(aiProvider.apiKey);
  const hasModel = isLocalProvider || Boolean(aiProvider.model);
  return {
    id: `provider-${aiProvider.provider}`,
    kind: 'provider',
    label: `AI provider: ${aiProvider.provider}`,
    status: hasCredential && hasModel ? 'ready' : 'blocked',
    summary: hasCredential && hasModel ? 'Provider has enough settings for first chat.' : 'Provider needs a model or credential before reliable Agent use.',
    settingsTarget: 'run-model',
    warnings: hasCredential && hasModel ? [] : ['Check AI Provider settings.'],
  };
}

function mcpItem(mcp: McpSettingsStatus): XenesisConnectionItem {
  return {
    id: 'xenesis-desk-mcp',
    kind: 'mcp',
    label: 'Xenesis Desk MCP',
    status: mcp.available && mcp.bridgeUrl ? 'ready' : 'blocked',
    summary: mcp.available && mcp.bridgeUrl ? `Bridge available at ${mcp.bridgeUrl}.` : 'MCP bridge status is not available.',
    settingsTarget: 'mcp',
    crActions: ['xd.mcp.settings.status'],
    warnings: mcp.available ? [] : ['Install or start the Xenesis Desk MCP bridge.'],
  };
}

function localCliItems(providerIntegration: ProviderIntegrationStatus): XenesisConnectionItem[] {
  return providerIntegration.cliTargets.map((target) => ({
    id: `local-cli-${target.id}`,
    kind: 'local-cli',
    label: target.label,
    status: target.mcpInstalled || target.skillInstalled ? 'ready' : 'needs-setup',
    summary:
      target.mcpInstalled || target.skillInstalled
        ? 'Local CLI integration files are installed.'
        : 'Local CLI integration can be installed from AI Provider settings.',
    settingsTarget: 'run-model',
    crActions: ['xd.mcp.settings.status'],
  }));
}

function gatewayItem(xenesis: XenesisStatus | null): XenesisConnectionItem {
  if (!xenesis) {
    return {
      id: 'xenesis-gateway',
      kind: 'gateway',
      label: 'Xenesis Gateway',
      status: 'unknown',
      summary: 'Gateway status could not be read.',
      settingsTarget: 'xenesis-agent',
      crActions: ['xd.xenesis.gateway.status'],
    };
  }
  return {
    id: 'xenesis-gateway',
    kind: 'gateway',
    label: 'Xenesis Gateway',
    status: xenesis.gateway.running ? 'ready' : xenesis.gateway.enabled ? 'needs-setup' : 'disabled',
    summary: xenesis.gateway.running ? `Gateway is running at ${xenesis.gateway.url || xenesis.url}.` : 'Gateway is stopped.',
    settingsTarget: 'xenesis-agent',
    crActions: [
      'xd.xenesis.gateway.status',
      'xd.xenesis.gateway.start',
      'xd.xenesis.gateway.stop',
      'xd.xenesis.gateway.restart',
    ],
    warnings: xenesis.gateway.running ? [] : ['Start the gateway before using external messenger channels.'],
  };
}

function channelStatus(
  xenesis: XenesisStatus | null,
  name: XenesisGatewayChannelName,
): XenesisConnectionStatus {
  const runtime = xenesis?.gateway.channels?.[name];
  if (!runtime) {
    const profileState = xenesis?.profile.channels.find((state) => state.name === name);
    if (!profileState) return 'unknown';
    if (!profileState.enabled) return 'disabled';
    return profileState.configured ? 'needs-setup' : 'blocked';
  }
  if (!runtime.enabled) return 'disabled';
  if (runtime.ready) return 'ready';
  return runtime.runtimeStatus === 'error' || runtime.missingEnv.length > 0 ? 'blocked' : 'needs-setup';
}

function messengerItems(xenesis: XenesisStatus | null): XenesisConnectionItem[] {
  return MESSENGERS.map(({ id, label }) => {
    const runtime = xenesis?.gateway.channels?.[id];
    return {
      id,
      kind: 'messenger',
      label,
      status: channelStatus(xenesis, id),
      summary: runtime?.ready ? `${label} is ready to deliver messages.` : `${label} needs gateway and channel setup.`,
      missingEnv: runtime?.missingEnv,
      settingsTarget: 'xenesis-agent',
      crActions: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
      warnings: [...(runtime?.warnings ?? []), ...(runtime?.lastError ? [runtime.lastError.message] : [])],
    };
  });
}

export function buildXenesisConnectionsStatus(input: BuildXenesisConnectionsStatusInput): XenesisConnectionsStatus {
  const sections: XenesisConnectionsStatus['sections'] = {
    provider: { id: 'provider', label: 'AI Provider', items: [providerItem(input.aiProvider)] },
    localCli: { id: 'local-cli', label: 'Local CLI integration', items: localCliItems(input.providerIntegration) },
    mcp: { id: 'mcp', label: 'MCP bridge', items: [mcpItem(input.mcp)] },
    tools: { id: 'tools', label: 'Tool connections', items: TOOL_CONNECTIONS },
    gateway: { id: 'gateway', label: 'Gateway', items: [gatewayItem(input.xenesis)] },
    messengers: { id: 'messengers', label: 'Messengers', items: messengerItems(input.xenesis) },
    guides: { id: 'guides', label: 'Guides', items: XENESIS_CONNECTION_GUIDES },
  };
  const summary = countItems(sections);
  return {
    ok: summary.blocked === 0,
    updatedAt: (input.now ?? new Date()).toISOString(),
    summary,
    sections,
    warnings: summary.blocked > 0 ? ['Some connections need setup before they are ready.'] : [],
  };
}
```

- [ ] **Step 4: Run the test**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts
git commit -m "feat: add xenesis connection status model"
```

## Task 3: Expose Connection Status Through Types, IPC, and CR

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

- [ ] **Step 1: Write CR coverage expectations**

Run before editing:

```powershell
rg -n "xd\.xenesis\.connections|connectionsStatus|getXenesisConnectionsStatus" src
```

Expected: no matches.

- [ ] **Step 2: Expand shared types**

At the top of `src/shared/types.ts`, add:

```ts
import type { XenesisConnectionsStatus } from './xenesisConnections';
export type { XenesisConnectionItem, XenesisConnectionStatus, XenesisConnectionsStatus } from './xenesisConnections';
```

In `export interface XenesisApi`, add after `gatewayOpenDashboard()`:

```ts
  connectionsStatus(): Promise<XenesisConnectionsStatus>;
```

- [ ] **Step 3: Add CR adapter and IPC mapping**

In `src/shared/deskBridgeCapabilities.ts`, add to the `DeskBridgeCapabilityApi` interface near `getXenesisStatus`:

```ts
  getXenesisConnectionsStatus?: () => Promise<unknown> | unknown;
```

Add to `IPC_CAPABILITY_MAP` near the other `xenesis:*` entries:

```ts
  'xenesis:connections-status': { capabilityPath: 'xd.xenesis.connections.status' },
```

Add a group under the `xd.xenesis` capability tree before `xd.xenesis.gateway`:

```ts
      group('xd.xenesis.connections', 'Connections', 'Xenesis onboarding and connection readiness.', [
        method(
          'xd.xenesis.connections.status',
          'Read connection status',
          'Read provider, MCP, tool, gateway, messenger, and guide readiness for Xenesis onboarding.',
          'read',
        ),
      ]),
```

Add dispatch before the gateway dispatch block:

```ts
      if (path === 'xd.xenesis.connections.status') {
        return callAdapter(path, api?.getXenesisConnectionsStatus);
      }
```

- [ ] **Step 4: Add main-process aggregator and adapter wiring**

In `src/main/index.ts`, import the helper and status type:

```ts
import { buildXenesisConnectionsStatus } from '../shared/xenesisConnections';
import type { XenesisConnectionsStatus } from '../shared/xenesisConnections';
```

Add the function near `getMcpSettingsStatus()`:

```ts
async function getXenesisConnectionsStatus() {
  const settings = loadSettings();
  return buildXenesisConnectionsStatus({
    aiProvider: settings.aiProvider,
    mcp: getMcpSettingsStatus(),
    providerIntegration: getProviderIntegrationStatusSnapshot(),
    xenesis: await getXenesisStatusPayload(),
  });
}
```

Add to the capability adapter object near `getXenesisStatus`:

```ts
    getXenesisConnectionsStatus: () =>
      getXenesisConnectionsStatus().then((status) => ({ ok: true, status })),
```

Add an IPC handler near `xenesis:gateway-status`:

```ts
  ipcMain.handle('xenesis:connections-status', (): Promise<XenesisConnectionsStatus> => getXenesisConnectionsStatus());
```

Keep `XenesisConnectionsStatus` imported from `../shared/xenesisConnections`; `src/shared/types.ts` re-exports it for renderer imports.

- [ ] **Step 5: Add preload method**

In `src/preload/index.ts`, add to `const xenesisApi: XenesisApi` after `gatewayOpenDashboard()`:

```ts
  connectionsStatus() {
    return ipcRenderer.invoke('xenesis:connections-status');
  },
```

- [ ] **Step 6: Run targeted checks**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npm run docs:capabilities:audit
npm run typecheck
```

Expected:

- connection model test passes
- CR audit reports 0 missing registered paths, 0 missing dispatch paths, and 0 undispatched static callable methods
- typecheck passes

- [ ] **Step 7: Commit**

```powershell
git add src\shared\types.ts src\shared\deskBridgeCapabilities.ts src\main\index.ts src\preload\index.ts
git commit -m "feat: expose xenesis connection status capability"
```

## Task 4: Add Settings Connection Center UI

**Files:**
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`

- [ ] **Step 1: Add state and loader**

In `SettingsPane.tsx`, add `XenesisConnectionsStatus` to the existing type imports from `../../shared/types`.

Near the existing `mcpStatus` and `xenesisGatewayStatus` state, add:

```ts
  const [xenesisConnectionsStatus, setXenesisConnectionsStatus] = useState<XenesisConnectionsStatus | null>(null);
  const [xenesisConnectionsBusy, setXenesisConnectionsBusy] = useState(false);
  const [xenesisConnectionsError, setXenesisConnectionsError] = useState('');
```

Near `loadMcpStatus`, add:

```ts
  const loadXenesisConnectionsStatus = useCallback(async () => {
    setXenesisConnectionsBusy(true);
    setXenesisConnectionsError('');
    try {
      setXenesisConnectionsStatus(await window.xenesisAPI.connectionsStatus());
    } catch (error) {
      setXenesisConnectionsStatus(null);
      setXenesisConnectionsError(error instanceof Error ? error.message : String(error));
    } finally {
      setXenesisConnectionsBusy(false);
    }
  }, []);
```

In the existing effect that loads MCP/profile/gateway status, add:

```ts
    void loadXenesisConnectionsStatus();
```

Include `loadXenesisConnectionsStatus` in the dependency array.

- [ ] **Step 2: Add render helpers**

Add these helpers near `renderXenesisGatewayChannelRuntimeStatus`:

```tsx
  const xenesisConnectionStatusLabel = (status: XenesisConnectionStatus) => {
    switch (status) {
      case 'ready':
        return t('settings.xenesisConnectionsStatusReady');
      case 'needs-setup':
        return t('settings.xenesisConnectionsStatusNeedsSetup');
      case 'disabled':
        return t('settings.xenesisConnectionsStatusDisabled');
      case 'blocked':
        return t('settings.xenesisConnectionsStatusBlocked');
      case 'planned':
        return t('settings.xenesisConnectionsStatusPlanned');
      default:
        return t('settings.xenesisConnectionsStatusUnknown');
    }
  };

  const renderXenesisConnectionItem = (item: XenesisConnectionItem) => (
    <div className="sp-integration-card" key={item.id} data-xenesis-connection={item.id}>
      <div>
        <strong>{item.label}</strong>
        <span>{item.summary}</span>
      </div>
      <div className="sp-actions-row">
        <span className={cls('sp-badge', `sp-badge-${item.status}`)}>{xenesisConnectionStatusLabel(item.status)}</span>
      </div>
      {(item.missingEnv?.length || item.warnings?.length || item.crActions?.length || item.guidePath) && (
        <div className="sp-info-list">
          {item.missingEnv?.length ? (
            <div>
              <span>{t('settings.xenesisConnectionsMissingEnv')}</span>
              <strong>{item.missingEnv.join(', ')}</strong>
            </div>
          ) : null}
          {item.crActions?.length ? (
            <div>
              <span>{t('settings.xenesisConnectionsCrActions')}</span>
              <strong>{item.crActions.join(', ')}</strong>
            </div>
          ) : null}
          {item.guidePath ? (
            <div>
              <span>{t('settings.xenesisConnectionsGuide')}</span>
              <strong>{item.guidePath}</strong>
            </div>
          ) : null}
          {item.warnings?.length ? (
            <div>
              <span>{t('settings.xenesisConnectionsWarnings')}</span>
              <strong>{item.warnings.join(' ')}</strong>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
```

Add `XenesisConnectionItem` and `XenesisConnectionStatus` to the type import.

- [ ] **Step 3: Add the Connection Center section**

Add before `renderXenesisGateway`:

```tsx
  const renderXenesisConnections = () => {
    const status = xenesisConnectionsStatus;
    const sections = status ? Object.values(status.sections) : [];
    return (
      <div className="sp-stack" data-settings-section="xenesis-connections">
        <section className="sp-section">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.xenesisConnectionsTitle')}</h2>
              <p>{t('settings.xenesisConnectionsDesc')}</p>
            </div>
            <div className="sp-actions-row">
              <button
                className="sp-btn"
                disabled={xenesisConnectionsBusy}
                onClick={() => {
                  void loadXenesisConnectionsStatus();
                }}
              >
                {xenesisConnectionsBusy ? t('common.checking') : t('settings.xenesisConnectionsRefresh')}
              </button>
            </div>
          </div>

          {status ? (
            <div className="sp-info-list">
              <div>
                <span>{t('settings.xenesisConnectionsReady')}</span>
                <strong>
                  {status.summary.ready}/{status.summary.total}
                </strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsBlocked')}</span>
                <strong>{status.summary.blocked}</strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsPlanned')}</span>
                <strong>{status.summary.planned}</strong>
              </div>
            </div>
          ) : (
            <div className="sp-empty-block">{t('settings.xenesisConnectionsEmpty')}</div>
          )}
          {xenesisConnectionsError && (
            <p className="sp-hint sp-warning-text">
              {t('settings.xenesisConnectionsFailed', { message: xenesisConnectionsError })}
            </p>
          )}
        </section>

        {sections.map((section) => (
          <section className="sp-section" key={section.id}>
            <div className="sp-section-heading">
              <div>
                <h3>{section.label}</h3>
              </div>
            </div>
            <div className="sp-integration-grid">{section.items.map(renderXenesisConnectionItem)}</div>
          </section>
        ))}
      </div>
    );
  };
```

- [ ] **Step 4: Add the Xenesis tab**

In `renderXenesisDeskSection`, add a first tab button before the Agent tab:

```tsx
          <button
            className={cls('sp-mode-option', xenesisTab === 'connections' && 'is-active')}
            data-settings-xenesis-tab="connections"
            onClick={() => setXenesisTab('connections')}
          >
            <strong>{t('settings.xenesisDeskTabConnections')}</strong>
            <span>
              {xenesisConnectionsStatus
                ? t('settings.xenesisDeskTabConnectionsDescReady', {
                    ready: String(xenesisConnectionsStatus.summary.ready),
                    total: String(xenesisConnectionsStatus.summary.total),
                  })
                : t('settings.xenesisDeskTabConnectionsDesc')}
            </span>
          </button>
```

Add the render branch before the Agent branch:

```tsx
      {xenesisTab === 'connections' && renderXenesisConnections()}
```

If the initial `xenesisTab` state is currently `'agent'`, keep it as `'agent'` to avoid changing the first visible screen. The new tab remains available.

- [ ] **Step 5: Add translations**

In `src/renderer/i18n/en.ts` under `settings`, add:

```ts
    xenesisDeskTabConnections: 'Connections',
    xenesisDeskTabConnectionsDesc: 'Provider, MCP, tools, gateway, and messengers',
    xenesisDeskTabConnectionsDescReady: '{ready}/{total} ready',
    xenesisConnectionsTitle: 'Connection Center',
    xenesisConnectionsDesc: 'Review Xenesis Agent setup, MCP tools, gateway, external messengers, and guide readiness.',
    xenesisConnectionsRefresh: 'Refresh connections',
    xenesisConnectionsReady: 'Ready',
    xenesisConnectionsBlocked: 'Blocked',
    xenesisConnectionsPlanned: 'Planned',
    xenesisConnectionsEmpty: 'Connection status is not loaded yet.',
    xenesisConnectionsFailed: 'Failed to read connection status: {message}',
    xenesisConnectionsMissingEnv: 'Missing environment',
    xenesisConnectionsCrActions: 'CR actions',
    xenesisConnectionsGuide: 'Guide',
    xenesisConnectionsWarnings: 'Warnings',
    xenesisConnectionsStatusReady: 'Ready',
    xenesisConnectionsStatusNeedsSetup: 'Needs setup',
    xenesisConnectionsStatusDisabled: 'Disabled',
    xenesisConnectionsStatusBlocked: 'Blocked',
    xenesisConnectionsStatusPlanned: 'Planned',
    xenesisConnectionsStatusUnknown: 'Unknown',
```

In `src/renderer/i18n/ko.ts` under `settings`, add:

```ts
    xenesisDeskTabConnections: '연결',
    xenesisDeskTabConnectionsDesc: 'Provider, MCP, 도구, Gateway, 메신저',
    xenesisDeskTabConnectionsDescReady: '{ready}/{total} 준비됨',
    xenesisConnectionsTitle: 'Connection Center',
    xenesisConnectionsDesc: 'Xenesis Agent 설정, MCP 도구, Gateway, 외부 메신저, 가이드 준비 상태를 확인합니다.',
    xenesisConnectionsRefresh: '연결 새로고침',
    xenesisConnectionsReady: '준비됨',
    xenesisConnectionsBlocked: '막힘',
    xenesisConnectionsPlanned: '계획됨',
    xenesisConnectionsEmpty: '연결 상태를 아직 불러오지 않았습니다.',
    xenesisConnectionsFailed: '연결 상태를 읽지 못했습니다: {message}',
    xenesisConnectionsMissingEnv: '누락된 환경 변수',
    xenesisConnectionsCrActions: 'CR 액션',
    xenesisConnectionsGuide: '가이드',
    xenesisConnectionsWarnings: '경고',
    xenesisConnectionsStatusReady: '준비됨',
    xenesisConnectionsStatusNeedsSetup: '설정 필요',
    xenesisConnectionsStatusDisabled: '꺼짐',
    xenesisConnectionsStatusBlocked: '막힘',
    xenesisConnectionsStatusPlanned: '계획됨',
    xenesisConnectionsStatusUnknown: '알 수 없음',
```

- [ ] **Step 6: Run checks**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src\renderer\panes\SettingsPane.tsx src\renderer\i18n\en.ts src\renderer\i18n\ko.ts
git commit -m "feat: add xenesis connection center settings"
```

## Task 5: Add Onboarding and Connections Manual

**Files:**
- Create: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/manual/README.md`

- [ ] **Step 1: Add the manual page**

Create `docs/manual/09-onboarding-connections.md`:

```md
# Onboarding and Connections

This page explains the recommended first-run setup order for Xenesis Agent,
provider settings, MCP tools, the Xenesis Gateway, and external bot channels.

## Setup Order

1. Configure the AI provider in Settings > AI Provider.
2. Verify Xenesis Agent can answer a normal chat prompt.
3. Install local CLI integration for Codex, Claude, or Cursor when needed.
4. Verify Xenesis Desk MCP status.
5. Connect recommended MCP tools.
6. Start or verify the Xenesis Gateway.
7. Configure external bot channels.
8. Send a channel test message.

## AI Provider

The active provider comes from the user's settings and profile. Xenesis Desk
does not silently switch to a different keyed provider when credentials are
missing. `auto` resolves by credential scan, and local CLI selection remains
separate from provider identity.

## MCP And Tool Connections

The Connection Center shows MCP readiness and recommended tool connections.
Current recommended MCP templates include Fetch, Filesystem, GitHub, Notion,
and Linear. Google Workspace and Google Calendar appear as planned/manual
connections until a verified install template is bundled.

Use `xd.mcp.settings.status` to inspect MCP settings through the Capability
Registry.

## Gateway

The Xenesis Gateway is required for external messenger delivery. The Connection
Center reads gateway status from the same runtime status used by Settings and
the Capability Registry.

Useful CR paths:

- `xd.xenesis.gateway.status`
- `xd.xenesis.gateway.start`
- `xd.xenesis.gateway.stop`
- `xd.xenesis.gateway.restart`
- `xd.xenesis.gateway.openDashboard`

## External Messengers

The first actionable messenger set is Telegram, Slack, Discord, and webhook.
Each channel should be configured with environment variable names and allowlists
instead of hardcoded secrets.

Useful CR paths:

- `xd.xenesis.profiles.updateChannels`
- `xd.xenesis.profiles.testChannel`

## Access Control

Messenger channels should restrict delivery by chat ID, channel ID, guild ID,
or webhook URL configuration. Treat allowlists as part of setup readiness.

## Routing

Inbound channel sessions determine where replies are delivered. When debugging
external bot behavior, inspect the channel status, allowed IDs, gateway status,
and bot session records before changing provider settings.

## Bot Loop Protection

Avoid connecting Xenesis to channels where it can receive its own outbound
messages. If loop behavior is suspected, disable the channel, inspect gateway
logs, and re-enable only after the channel source is isolated.

## Troubleshooting Ladder

1. Refresh Connection Center status.
2. Check provider readiness.
3. Check MCP status.
4. Check gateway status.
5. Check missing channel environment variables.
6. Check access allowlists.
7. Run a sanitized test send.
8. Inspect diagnostics and bot session records.

## Connection Status Through CR

Use `xd.xenesis.connections.status` to inspect provider, MCP, tool, gateway,
messenger, and guide readiness through the Capability Registry.
```

- [ ] **Step 2: Update manual index**

In `docs/manual/README.md`, add a row after Troubleshooting:

```md
| Onboarding and connections | [09-onboarding-connections.md](09-onboarding-connections.md) |
```

In the Current Settings Map list, update the Xenesis Agent bullet:

```md
- Xenesis Agent: Connection Center, agent runtime, gateway, external bot channels, and Gowoori agent tools.
```

- [ ] **Step 3: Run public docs safety check**

Run:

```powershell
npm run check:docs-public
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add docs\manual\09-onboarding-connections.md docs\manual\README.md
git commit -m "docs: add xenesis onboarding connections guide"
```

## Task 6: Add Obsidian Working Note

**Files:**
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`

- [ ] **Step 1: Create the working note**

Create `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`:

```md
---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-27
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[MCP Bridge Architecture]]"
  - "[[Provider Model]]"
touches:
  - "src/shared/xenesisConnections.ts"
  - "src/shared/deskBridgeCapabilities.ts"
  - "src/main/index.ts"
  - "src/renderer/panes/SettingsPane.tsx"
---

# Xenesis Connection Center Working Note

## Objective

Add a CR-first Connection Center for Xenesis Agent onboarding, provider setup,
MCP/tool readiness, gateway status, external messenger readiness, and guide docs.

## Direction

This work supports [[Final Goal]] by making setup state discoverable through the
Capability Registry instead of only through separate renderer settings panels.

## Current First Slice

- Add `xd.xenesis.connections.status`.
- Add shared status aggregation.
- Add a Settings Connection Center tab.
- Add public manual docs.
- Keep mutating behavior on existing CR paths.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[MCP Bridge Architecture]]
- Depends on [[Provider Model]]
```

- [ ] **Step 2: Run a path check**

Run:

```powershell
Test-Path 'docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-27-xenesis-connection-center.md'
```

Expected:

```text
True
```

- [ ] **Step 3: Commit**

```powershell
git add "docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-27-xenesis-connection-center.md"
git commit -m "docs: record xenesis connection center working note"
```

## Task 7: Final Verification and Live Evidence

**Files:**
- Modify: local `handoff.md`

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run root typecheck**

Run:

```powershell
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run CR audit**

Run:

```powershell
npm run docs:capabilities:audit
```

Expected: PASS with 0 missing registered paths, 0 missing dispatch paths, and 0 undispatched static callable methods.

- [ ] **Step 4: Run package checks if `packages/xenesis` changed**

If `git diff --name-only HEAD~1..HEAD` or the branch diff includes `packages/xenesis`, run:

```powershell
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run typecheck
npm --prefix packages/xenesis run build
```

Expected: PASS.

- [ ] **Step 5: Run live Agent pane verification**

Launch Electron through the repo's dev command:

```powershell
npm run dev:electron
```

In the Xenesis Agent pane, use a natural-language prompt:

```text
현재 Xenesis 연결 상태를 확인해서 provider, MCP, gateway, 외부 메신저 준비 상태를 요약해줘.
```

Expected evidence:

- The Agent response summarizes provider, MCP, gateway, tool, and messenger readiness.
- The work log or diagnostics show CR-backed status access.
- The footer provider matches the intended configured provider and does not silently fall back.

- [ ] **Step 6: Update handoff**

Add exact command outputs and live prompt evidence to `handoff.md`.

- [ ] **Step 7: Final commit**

```powershell
git status --short --ignored=matching handoff.md
```

Expected: `handoff.md` is ignored. Leave it updated in the worktree and summarize the verification evidence in the final response.
