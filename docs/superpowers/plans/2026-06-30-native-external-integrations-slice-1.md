# Native External Integrations Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Xenesis-native external integrations foundation: registry, read-only CR status/doctor surfaces, import-preview scaffolding, and Hermes provider-surface cleanup.

**Architecture:** Keep OpenClaw and Hermes as reference/import sources only. Add a focused shared registry module that owns integration ids, categories, maturity, routes, credential requirements, action policies, readiness evidence, doctor findings, and import-source metadata. Expose read-only native CR paths by adapting that shared registry through the existing `deskBridgeCapabilities.ts` adapter pattern and `src/main/index.ts` capability handlers.

**Tech Stack:** TypeScript, Node test runner, Electron main process, Xenesis Capability Registry, existing Connection Center status/readback conventions.

---

## Scope

This plan implements only Slice 1 from the approved design:

- native registry and status builders,
- representative native definitions for the broad OpenClaw/Hermes external-tool scope,
- read-only `xd.xenesis.integrations.*` CR paths,
- redacted import preview scaffolding for Hermes/OpenClaw config sources,
- tests proving Hermes is not presented as an agent provider.

This plan does not implement real OAuth exchange, real API probes, token writes,
or external service action execution. Those belong in later slices.

## File Structure

- Create `src/shared/externalIntegrations.ts`
  - Owns native integration types, seed definitions, normalization helpers,
    status builders, doctor builder, and import preview helper.
- Create `src/shared/externalIntegrations.test.ts`
  - Unit tests for registry scope, id ownership, redaction, doctor findings, and
    import preview behavior.
- Modify `src/shared/deskBridgeCapabilities.ts`
  - Add read-only CR schemas/methods and adapter dispatch for:
    `xd.xenesis.integrations.catalog.status`,
    `xd.xenesis.integrations.status`,
    `xd.xenesis.integrations.doctor.status`,
    `xd.xenesis.integrations.import.preview`.
- Modify `src/shared/xenesisConnectionCapabilities.test.ts`
  - Assert the new CR paths are registered and dispatched through the adapter.
- Modify `src/main/index.ts`
  - Add main handlers that call the shared registry builders.
- Modify Hermes provider surfaces:
  - `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
  - `src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriProviders.ts`
  - `src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/chat/gowooriChatConstants.ts`
  - `src/shared/deskBridgeCapabilities.ts` CR enum descriptions that still list Hermes as a provider
- Update `handoff.md` after material decisions, code changes, failed checks, and
  passed checks.

## Task 1: Shared Native Registry

**Files:**
- Create: `src/shared/externalIntegrations.ts`
- Test: `src/shared/externalIntegrations.test.ts`

- [ ] **Step 1: Write the failing registry test**

Add `src/shared/externalIntegrations.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildExternalIntegrationCatalogStatus,
  buildExternalIntegrationDoctorStatus,
  buildExternalIntegrationStatus,
  EXTERNAL_INTEGRATION_IDS,
  findExternalIntegration,
} from './externalIntegrations';

test('native external integration registry covers the first OpenClaw/Hermes service families', () => {
  for (const id of [
    'github',
    'notion',
    'google-workspace',
    'google-calendar',
    'linear',
    'slack',
    'discord',
    'telegram',
    'google-chat',
    'microsoft-teams',
    'airtable',
    'brave-search',
    'tavily',
    'exa',
    'firecrawl',
    'parallel',
    'browserbase',
    'browser-use',
    'spotify',
    'home-assistant',
    'apple-notes',
    'apple-reminders',
    'imessage',
    'linear-mcp',
    'n8n-mcp',
  ]) {
    assert.equal(EXTERNAL_INTEGRATION_IDS.includes(id), true, `${id} is registered`);
    assert.equal(findExternalIntegration(id)?.sourceRuntimeDependency, false, `${id} has no source runtime dependency`);
  }
});

test('catalog status groups integrations by native category and excludes model providers', () => {
  const catalog = buildExternalIntegrationCatalogStatus();

  assert.equal(catalog.ok, true);
  assert.equal(catalog.total, EXTERNAL_INTEGRATION_IDS.length);
  assert.equal(catalog.categories.some((item) => item.id === 'productivity'), true);
  assert.equal(catalog.categories.some((item) => item.id === 'channel'), true);
  assert.equal(catalog.categories.some((item) => item.id === 'web-search'), true);
  assert.equal(catalog.items.some((item) => item.id === 'hermes-agent'), false);
  assert.equal(catalog.items.some((item) => item.category === 'model-provider'), false);
});

test('integration status filters by id and never returns raw secret values', () => {
  const status = buildExternalIntegrationStatus({
    id: 'notion',
    env: {
      NOTION_API_KEY: 'secret_notion_value',
    },
  });

  assert.equal(status.ok, true);
  assert.equal(status.total, 1);
  assert.equal(status.items[0]?.id, 'notion');
  assert.equal(status.items[0]?.credentialState.required.length, 1);
  assert.equal(status.items[0]?.credentialState.required[0]?.present, true);
  assert.equal(JSON.stringify(status).includes('secret_notion_value'), false);
});

test('doctor status reports missing credentials without executing provider tools', () => {
  const doctor = buildExternalIntegrationDoctorStatus({
    id: 'notion',
    env: {},
  });

  assert.equal(doctor.ok, true);
  assert.equal(doctor.findings.some((item) => item.checkId === 'notion.credentials.NOTION_API_KEY'), true);
  assert.equal(doctor.findings.some((item) => item.severity === 'error'), true);
});
```

- [ ] **Step 2: Run the failing registry test**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/externalIntegrations.test.ts
```

Expected: fail with a module-not-found error for `./externalIntegrations`.

- [ ] **Step 3: Implement the native registry module**

Create `src/shared/externalIntegrations.ts`:

```ts
export type ExternalIntegrationCategory =
  | 'productivity'
  | 'communication'
  | 'channel'
  | 'web-search'
  | 'browser'
  | 'mcp'
  | 'media'
  | 'memory'
  | 'smart-home'
  | 'local-platform'
  | 'developer'
  | 'data';

export type ExternalIntegrationMaturity = 'native-ready' | 'setup-ready' | 'probe-only' | 'planned';
export type ExternalIntegrationPlatform = 'macos' | 'windows' | 'linux' | 'all';

export type ExternalRuntimeRoute =
  | { kind: 'mcp'; serverName: string; transport: 'stdio' | 'http' | 'sse' }
  | { kind: 'oauth-api'; provider: string; scopes: string[] }
  | { kind: 'api-key-api'; envVars: string[] }
  | { kind: 'service-account'; files: string[]; envVars: string[] }
  | { kind: 'local-cli'; commands: string[] }
  | { kind: 'browser-session'; browser: 'chrome' | 'system' }
  | { kind: 'platform-gateway'; envVars: string[] }
  | { kind: 'macos-automation'; permissions: string[] };

export type ExternalCredentialRequirement = {
  id: string;
  label: string;
  kind: 'api-key' | 'oauth-token' | 'client-secret' | 'service-account' | 'local-permission' | 'command';
  envVars?: string[];
  files?: string[];
  commands?: string[];
  required: boolean;
  secret: boolean;
};

export type ExternalActionPolicy = {
  defaultMode: 'read-only' | 'approval-required' | 'blocked';
  readActions: string[];
  writeActions: string[];
  destructiveActions: string[];
  safetyBoundaries: string[];
};

export type ExternalIntegrationDefinition = {
  id: string;
  label: string;
  vendor?: string;
  category: ExternalIntegrationCategory;
  maturity: ExternalIntegrationMaturity;
  platforms: ExternalIntegrationPlatform[];
  sourceReferences: Array<'xenesis' | 'openclaw' | 'hermes' | 'mcp-catalog'>;
  sourceRuntimeDependency: false;
  runtimeRoutes: ExternalRuntimeRoute[];
  credentials: ExternalCredentialRequirement[];
  setupSteps: string[];
  doctorChecks: string[];
  actionPolicy: ExternalActionPolicy;
  importMappings: Array<{ source: 'hermes' | 'openclaw' | 'mcp-client'; keys: string[] }>;
};

export type ExternalCredentialState = {
  required: Array<{ id: string; label: string; present: boolean; secret: boolean; refs: string[] }>;
  missingRequired: string[];
};

export type ExternalIntegrationStatusItem = {
  id: string;
  label: string;
  vendor?: string;
  category: ExternalIntegrationCategory;
  maturity: ExternalIntegrationMaturity;
  platforms: ExternalIntegrationPlatform[];
  sourceReferences: ExternalIntegrationDefinition['sourceReferences'];
  sourceRuntimeDependency: false;
  runtimeRoutes: ExternalRuntimeRoute[];
  credentialState: ExternalCredentialState;
  setupSteps: string[];
  doctorChecks: string[];
  actionPolicy: ExternalActionPolicy;
};

export type ExternalIntegrationStatusRequest = {
  id?: string;
  env?: Record<string, string | undefined>;
  platform?: NodeJS.Platform | string;
};

const APPROVAL_POLICY: ExternalActionPolicy = {
  defaultMode: 'approval-required',
  readActions: ['status', 'search', 'read', 'list'],
  writeActions: ['create', 'update', 'send', 'comment'],
  destructiveActions: ['delete', 'archive', 'revoke'],
  safetyBoundaries: ['Writes, sends, deletes, and token changes require explicit approval.'],
};

function apiKey(id: string, label: string, envVars: string[]): ExternalCredentialRequirement {
  return { id, label, kind: 'api-key', envVars, required: true, secret: true };
}

function oauth(id: string, label: string, files: string[] = []): ExternalCredentialRequirement {
  return { id, label, kind: 'oauth-token', files, required: true, secret: true };
}

function command(id: string, label: string, commands: string[]): ExternalCredentialRequirement {
  return { id, label, kind: 'command', commands, required: true, secret: false };
}

export const EXTERNAL_INTEGRATIONS = [
  {
    id: 'github',
    label: 'GitHub',
    vendor: 'GitHub',
    category: 'developer',
    maturity: 'setup-ready',
    platforms: ['all'],
    sourceReferences: ['xenesis', 'hermes'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'api-key-api', envVars: ['GITHUB_TOKEN', 'GH_TOKEN'] }],
    credentials: [apiKey('github-token', 'GitHub token', ['GITHUB_TOKEN', 'GH_TOKEN'])],
    setupSteps: ['Detect gh auth status or token env.', 'Verify repository read access before write actions.'],
    doctorChecks: ['credentials', 'gh-auth', 'repo-scope'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [{ source: 'hermes', keys: ['GITHUB_TOKEN', 'GH_TOKEN'] }],
  },
  {
    id: 'notion',
    label: 'Notion',
    vendor: 'Notion',
    category: 'productivity',
    maturity: 'setup-ready',
    platforms: ['all'],
    sourceReferences: ['xenesis', 'hermes'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'api-key-api', envVars: ['NOTION_API_KEY', 'NOTION_TOKEN'] }],
    credentials: [apiKey('notion-token', 'Notion integration token', ['NOTION_API_KEY', 'NOTION_TOKEN'])],
    setupSteps: ['Create a Notion integration token.', 'Share target pages or databases with the integration.'],
    doctorChecks: ['credentials', 'shared-page-access'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [{ source: 'hermes', keys: ['NOTION_API_KEY'] }],
  },
  {
    id: 'google-workspace',
    label: 'Google Workspace',
    vendor: 'Google',
    category: 'productivity',
    maturity: 'setup-ready',
    platforms: ['all'],
    sourceReferences: ['xenesis', 'hermes'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'oauth-api', provider: 'google', scopes: ['gmail', 'calendar', 'drive', 'docs', 'sheets'] }],
    credentials: [oauth('google-oauth-token', 'Google OAuth token', ['google_token.json'])],
    setupSteps: ['Register OAuth client.', 'Store client secret.', 'Complete staged OAuth authorization.'],
    doctorChecks: ['oauth-client-secret', 'oauth-token', 'scope-review'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [{ source: 'hermes', keys: ['google_token.json', 'google_client_secret.json'] }],
  },
  {
    id: 'google-calendar',
    label: 'Google Calendar',
    vendor: 'Google',
    category: 'productivity',
    maturity: 'setup-ready',
    platforms: ['all'],
    sourceReferences: ['xenesis', 'hermes'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'oauth-api', provider: 'google', scopes: ['calendar'] }],
    credentials: [oauth('google-calendar-token', 'Google Calendar OAuth token', ['google_token.json'])],
    setupSteps: ['Select calendar scopes.', 'Complete staged OAuth authorization.'],
    doctorChecks: ['oauth-token', 'calendar-scope'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [{ source: 'hermes', keys: ['google_token.json'] }],
  },
  {
    id: 'linear',
    label: 'Linear',
    vendor: 'Linear',
    category: 'productivity',
    maturity: 'setup-ready',
    platforms: ['all'],
    sourceReferences: ['xenesis', 'hermes', 'mcp-catalog'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'mcp', serverName: 'linear', transport: 'http' }],
    credentials: [oauth('linear-oauth-token', 'Linear OAuth token')],
    setupSteps: ['Install or enable Linear MCP.', 'Complete Linear OAuth.', 'Probe tool list.'],
    doctorChecks: ['mcp-config', 'oauth-token', 'tool-list'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [{ source: 'hermes', keys: ['mcp_servers.linear'] }],
  },
  {
    id: 'linear-mcp',
    label: 'Linear MCP',
    vendor: 'Linear',
    category: 'mcp',
    maturity: 'probe-only',
    platforms: ['all'],
    sourceReferences: ['hermes', 'mcp-catalog'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'mcp', serverName: 'linear', transport: 'http' }],
    credentials: [oauth('linear-mcp-oauth-token', 'Linear MCP OAuth token')],
    setupSteps: ['Import or configure the Linear MCP server.', 'Probe the configured server.'],
    doctorChecks: ['mcp-config', 'tool-list'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [{ source: 'hermes', keys: ['mcp_servers.linear'] }],
  },
  {
    id: 'n8n-mcp',
    label: 'n8n MCP',
    vendor: 'n8n',
    category: 'mcp',
    maturity: 'probe-only',
    platforms: ['all'],
    sourceReferences: ['hermes', 'mcp-catalog'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'mcp', serverName: 'n8n', transport: 'stdio' }],
    credentials: [apiKey('n8n-api-key', 'n8n API key', ['N8N_API_KEY'])],
    setupSteps: ['Import or configure n8n MCP.', 'Select safe default tools.', 'Probe the configured server.'],
    doctorChecks: ['mcp-config', 'credentials', 'tool-filter'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [{ source: 'hermes', keys: ['mcp_servers.n8n', 'N8N_API_KEY'] }],
  },
  ...[
    ['airtable', 'Airtable', 'Airtable', 'productivity', ['AIRTABLE_API_KEY']],
    ['slack', 'Slack', 'Slack', 'channel', ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN']],
    ['discord', 'Discord', 'Discord', 'channel', ['DISCORD_BOT_TOKEN']],
    ['telegram', 'Telegram', 'Telegram', 'channel', ['TELEGRAM_BOT_TOKEN']],
    ['google-chat', 'Google Chat', 'Google', 'channel', ['GOOGLE_CHAT_SERVICE_ACCOUNT_JSON', 'GOOGLE_CHAT_PROJECT_ID']],
    ['microsoft-teams', 'Microsoft Teams', 'Microsoft', 'channel', ['TEAMS_CLIENT_ID', 'TEAMS_CLIENT_SECRET', 'TEAMS_TENANT_ID']],
    ['brave-search', 'Brave Search', 'Brave', 'web-search', ['BRAVE_API_KEY', 'BRAVE_SEARCH_API_KEY']],
    ['tavily', 'Tavily', 'Tavily', 'web-search', ['TAVILY_API_KEY']],
    ['exa', 'Exa', 'Exa', 'web-search', ['EXA_API_KEY']],
    ['firecrawl', 'Firecrawl', 'Firecrawl', 'web-search', ['FIRECRAWL_API_KEY']],
    ['parallel', 'Parallel', 'Parallel', 'web-search', ['PARALLEL_API_KEY']],
    ['browserbase', 'Browserbase', 'Browserbase', 'browser', ['BROWSERBASE_API_KEY', 'BROWSERBASE_PROJECT_ID']],
    ['browser-use', 'Browser Use', 'Browser Use', 'browser', ['BROWSER_USE_API_KEY']],
    ['spotify', 'Spotify', 'Spotify', 'media', ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET']],
    ['home-assistant', 'Home Assistant', 'Home Assistant', 'smart-home', ['HASS_TOKEN']],
  ].map(([id, label, vendor, category, envVars]) => ({
    id,
    label,
    vendor,
    category,
    maturity: 'setup-ready',
    platforms: ['all'],
    sourceReferences: ['openclaw', 'hermes'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'api-key-api', envVars }],
    credentials: [apiKey(`${id}-credential`, `${label} credential`, envVars)],
    setupSteps: [`Configure ${label} credentials.`, `Run ${label} readiness checks.`],
    doctorChecks: ['credentials'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [
      { source: 'hermes', keys: envVars },
      { source: 'openclaw', keys: envVars },
    ],
  })),
  ...[
    ['apple-notes', 'Apple Notes', 'memo'],
    ['apple-reminders', 'Apple Reminders', 'remindctl'],
    ['imessage', 'iMessage', 'imsg'],
  ].map(([id, label, cli]) => ({
    id,
    label,
    vendor: 'Apple',
    category: 'local-platform',
    maturity: 'setup-ready',
    platforms: ['macos'],
    sourceReferences: ['hermes', 'openclaw'],
    sourceRuntimeDependency: false,
    runtimeRoutes: [{ kind: 'local-cli', commands: [cli] }],
    credentials: [command(`${id}-cli`, `${label} CLI`, [cli])],
    setupSteps: [`Install ${cli}.`, `Grant required macOS permissions.`],
    doctorChecks: ['command', 'macos-permissions'],
    actionPolicy: APPROVAL_POLICY,
    importMappings: [{ source: 'hermes', keys: [cli] }],
  })),
] as const satisfies readonly ExternalIntegrationDefinition[];

export type ExternalIntegrationId = (typeof EXTERNAL_INTEGRATIONS)[number]['id'];
export const EXTERNAL_INTEGRATION_IDS = EXTERNAL_INTEGRATIONS.map((item) => item.id);

export function findExternalIntegration(id: string): ExternalIntegrationDefinition | undefined {
  return EXTERNAL_INTEGRATIONS.find((item) => item.id === id);
}

function credentialRefs(credential: ExternalCredentialRequirement): string[] {
  return [...(credential.envVars ?? []), ...(credential.files ?? []), ...(credential.commands ?? [])];
}

function buildCredentialState(
  definition: ExternalIntegrationDefinition,
  env: Record<string, string | undefined> = process.env,
): ExternalCredentialState {
  const required = definition.credentials
    .filter((credential) => credential.required)
    .map((credential) => {
      const refs = credentialRefs(credential);
      const present = (credential.envVars ?? []).some((name) => Boolean(env[name])) || refs.length === 0;
      return {
        id: credential.id,
        label: credential.label,
        present,
        secret: credential.secret,
        refs,
      };
    });

  return {
    required,
    missingRequired: required.filter((item) => !item.present).map((item) => item.id),
  };
}

function statusItem(
  definition: ExternalIntegrationDefinition,
  request: ExternalIntegrationStatusRequest = {},
): ExternalIntegrationStatusItem {
  return {
    id: definition.id,
    label: definition.label,
    vendor: definition.vendor,
    category: definition.category,
    maturity: definition.maturity,
    platforms: [...definition.platforms],
    sourceReferences: [...definition.sourceReferences],
    sourceRuntimeDependency: false,
    runtimeRoutes: definition.runtimeRoutes.map((route) => ({ ...route })),
    credentialState: buildCredentialState(definition, request.env),
    setupSteps: [...definition.setupSteps],
    doctorChecks: [...definition.doctorChecks],
    actionPolicy: {
      ...definition.actionPolicy,
      readActions: [...definition.actionPolicy.readActions],
      writeActions: [...definition.actionPolicy.writeActions],
      destructiveActions: [...definition.actionPolicy.destructiveActions],
      safetyBoundaries: [...definition.actionPolicy.safetyBoundaries],
    },
  };
}

export function buildExternalIntegrationCatalogStatus() {
  const categories = [...new Set(EXTERNAL_INTEGRATIONS.map((item) => item.category))]
    .sort()
    .map((id) => ({
      id,
      total: EXTERNAL_INTEGRATIONS.filter((item) => item.category === id).length,
    }));

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    total: EXTERNAL_INTEGRATIONS.length,
    categories,
    items: EXTERNAL_INTEGRATIONS.map((item) => ({
      id: item.id,
      label: item.label,
      vendor: item.vendor,
      category: item.category,
      maturity: item.maturity,
      platforms: [...item.platforms],
      sourceReferences: [...item.sourceReferences],
      sourceRuntimeDependency: false,
      routeKinds: item.runtimeRoutes.map((route) => route.kind),
      credentialRefs: item.credentials.flatMap(credentialRefs),
      actionDefaultMode: item.actionPolicy.defaultMode,
    })),
  };
}

export function buildExternalIntegrationStatus(request: ExternalIntegrationStatusRequest = {}) {
  const definitions = request.id
    ? EXTERNAL_INTEGRATIONS.filter((item) => item.id === request.id)
    : [...EXTERNAL_INTEGRATIONS];
  if (request.id && definitions.length === 0) {
    return {
      ok: false,
      id: request.id,
      error: `Unsupported Xenesis external integration: ${request.id}`,
      allowedIntegrations: EXTERNAL_INTEGRATION_IDS,
      total: 0,
      items: [],
    };
  }

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    ...(request.id ? { id: request.id } : {}),
    total: definitions.length,
    items: definitions.map((definition) => statusItem(definition, request)),
  };
}

export function buildExternalIntegrationDoctorStatus(request: ExternalIntegrationStatusRequest = {}) {
  const status = buildExternalIntegrationStatus(request);
  if (!status.ok) return { ...status, findings: [] };

  const findings = status.items.flatMap((item) =>
    item.credentialState.missingRequired.map((credentialId) => ({
      checkId: `${item.id}.credentials.${item.credentialState.required.find((entry) => entry.id === credentialId)?.refs[0] ?? credentialId}`,
      integrationId: item.id,
      severity: 'error' as const,
      message: `${item.label} is missing required credentials.`,
      fixHint: `Configure ${credentialId} in the Xenesis integration setup flow.`,
      crPath: 'xd.xenesis.integrations.credentials.request',
      evidence: { credentialId },
    })),
  );

  return {
    ok: true,
    updatedAt: status.updatedAt,
    ...(request.id ? { id: request.id } : {}),
    total: status.total,
    findingCount: findings.length,
    findings,
  };
}
```

- [ ] **Step 4: Run the registry test**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/externalIntegrations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/externalIntegrations.ts src/shared/externalIntegrations.test.ts
git commit -m "feat: add native external integration registry"
```

## Task 2: Import Preview Scaffolding

**Files:**
- Modify: `src/shared/externalIntegrations.ts`
- Modify: `src/shared/externalIntegrations.test.ts`

- [ ] **Step 1: Add failing import preview tests**

Append to `src/shared/externalIntegrations.test.ts`:

```ts
import { buildExternalIntegrationImportPreview } from './externalIntegrations';

test('Hermes import preview maps known env and MCP keys without leaking secret values', () => {
  const preview = buildExternalIntegrationImportPreview({
    source: 'hermes',
    env: {
      NOTION_API_KEY: 'secret_notion_value',
      SLACK_BOT_TOKEN: 'xoxb-secret',
    },
    mcpServers: {
      linear: { url: 'https://mcp.linear.app/mcp' },
    },
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.source, 'hermes');
  assert.equal(preview.mappings.some((item) => item.integrationId === 'notion'), true);
  assert.equal(preview.mappings.some((item) => item.integrationId === 'slack'), true);
  assert.equal(preview.mappings.some((item) => item.integrationId === 'linear'), true);
  assert.equal(JSON.stringify(preview).includes('secret_notion_value'), false);
  assert.equal(JSON.stringify(preview).includes('xoxb-secret'), false);
});

test('OpenClaw import preview maps channel and web provider env keys', () => {
  const preview = buildExternalIntegrationImportPreview({
    source: 'openclaw',
    env: {
      TAVILY_API_KEY: 'tvly-secret',
      DISCORD_BOT_TOKEN: 'discord-secret',
    },
    pluginIds: ['tavily', 'discord'],
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.mappings.some((item) => item.integrationId === 'tavily'), true);
  assert.equal(preview.mappings.some((item) => item.integrationId === 'discord'), true);
  assert.equal(JSON.stringify(preview).includes('tvly-secret'), false);
  assert.equal(JSON.stringify(preview).includes('discord-secret'), false);
});
```

- [ ] **Step 2: Run the failing import preview tests**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/externalIntegrations.test.ts
```

Expected: FAIL because `buildExternalIntegrationImportPreview` is not exported.

- [ ] **Step 3: Add import preview types and builder**

Append to `src/shared/externalIntegrations.ts`:

```ts
export type ExternalIntegrationImportSource = 'hermes' | 'openclaw' | 'mcp-client';

export type ExternalIntegrationImportPreviewRequest = {
  source: ExternalIntegrationImportSource;
  env?: Record<string, string | undefined>;
  mcpServers?: Record<string, unknown>;
  pluginIds?: string[];
};

export function buildExternalIntegrationImportPreview(request: ExternalIntegrationImportPreviewRequest) {
  const env = request.env ?? {};
  const envKeys = new Set(Object.keys(env).filter((key) => Boolean(env[key])));
  const mcpServerNames = new Set(Object.keys(request.mcpServers ?? {}));
  const pluginIds = new Set((request.pluginIds ?? []).map((item) => item.trim()).filter(Boolean));

  const mappings = EXTERNAL_INTEGRATIONS.flatMap((definition) => {
    const importMapping = definition.importMappings.find((mapping) => mapping.source === request.source);
    if (!importMapping) return [];
    const matchedKeys = importMapping.keys.filter((key) => {
      if (envKeys.has(key)) return true;
      if (key.startsWith('mcp_servers.')) return mcpServerNames.has(key.slice('mcp_servers.'.length));
      if (pluginIds.has(key)) return true;
      if (pluginIds.has(definition.id)) return true;
      return false;
    });
    if (matchedKeys.length === 0) return [];
    return [
      {
        integrationId: definition.id,
        label: definition.label,
        category: definition.category,
        source: request.source,
        matchedKeys,
        secretValuesIncluded: false,
        applyRequiresApproval: true,
      },
    ];
  });

  return {
    ok: true,
    source: request.source,
    scanned: {
      envKeys: [...envKeys].sort(),
      mcpServers: [...mcpServerNames].sort(),
      pluginIds: [...pluginIds].sort(),
    },
    total: mappings.length,
    mappings,
  };
}
```

- [ ] **Step 4: Run the import preview tests**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/externalIntegrations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/externalIntegrations.ts src/shared/externalIntegrations.test.ts
git commit -m "feat: add external integration import preview"
```

## Task 3: Capability Registry Surface

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`

- [ ] **Step 1: Add failing CR registration and dispatch tests**

Append to `src/shared/xenesisConnectionCapabilities.test.ts`:

```ts
test('native external integration capabilities are registered as read-only paths', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));

  for (const path of [
    'xd.xenesis.integrations',
    'xd.xenesis.integrations.catalog',
    'xd.xenesis.integrations.catalog.status',
    'xd.xenesis.integrations.status',
    'xd.xenesis.integrations.doctor',
    'xd.xenesis.integrations.doctor.status',
    'xd.xenesis.integrations.import',
    'xd.xenesis.integrations.import.preview',
  ]) {
    assert.equal(paths.has(path), true, `${path} is registered`);
  }

  assert.equal(findDeskBridgeCapability('xd.xenesis.integrations.catalog.status')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.xenesis.integrations.status')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.xenesis.integrations.import.preview')?.permission, 'read');
});

test('native external integration capabilities dispatch to the adapter', async () => {
  const called: string[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisExternalIntegrationCatalogStatus: () => {
      called.push('catalog');
      return { ok: true, marker: 'catalog' };
    },
    getXenesisExternalIntegrationStatus: (args) => {
      called.push(`status:${(args as { id?: string })?.id ?? ''}`);
      return { ok: true, marker: 'status', args };
    },
    getXenesisExternalIntegrationDoctorStatus: () => {
      called.push('doctor');
      return { ok: true, marker: 'doctor' };
    },
    previewXenesisExternalIntegrationImport: () => {
      called.push('import-preview');
      return { ok: true, marker: 'import-preview' };
    },
  };

  await callDeskBridgeCapability(api, { path: 'xd.xenesis.integrations.catalog.status', source: 'test' });
  await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.integrations.status',
    args: { id: 'notion' },
    source: 'test',
  });
  await callDeskBridgeCapability(api, { path: 'xd.xenesis.integrations.doctor.status', source: 'test' });
  await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.integrations.import.preview',
    args: { source: 'hermes' },
    source: 'test',
  });

  assert.deepEqual(called, ['catalog', 'status:notion', 'doctor', 'import-preview']);
});
```

- [ ] **Step 2: Run the failing CR tests**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/xenesisConnectionCapabilities.test.ts
```

Expected: FAIL because the new CR paths and adapter methods do not exist.

- [ ] **Step 3: Add adapter method signatures**

In `src/shared/deskBridgeCapabilities.ts`, add these optional methods to
`DeskBridgeCapabilityAdapter` near the existing Xenesis connection adapter
methods:

```ts
  getXenesisExternalIntegrationCatalogStatus?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisExternalIntegrationStatus?: (args?: unknown) => Promise<unknown> | unknown;
  getXenesisExternalIntegrationDoctorStatus?: (args?: unknown) => Promise<unknown> | unknown;
  previewXenesisExternalIntegrationImport?: (args?: unknown) => Promise<unknown> | unknown;
```

- [ ] **Step 4: Add CR schemas**

In `src/shared/deskBridgeCapabilities.ts`, near the Xenesis tool schemas, add:

```ts
const XENESIS_EXTERNAL_INTEGRATION_STATUS_SCHEMA = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Integration id',
      description: 'Optional native Xenesis external integration id to filter.',
    },
    integration: {
      type: 'string',
      title: 'Integration id',
      description: 'Alias for id.',
    },
  },
} as const;

const XENESIS_EXTERNAL_INTEGRATION_IMPORT_PREVIEW_SCHEMA = {
  type: 'object',
  required: ['source'],
  properties: {
    source: {
      type: 'string',
      title: 'Import source',
      enum: ['hermes', 'openclaw', 'mcp-client'],
      description: 'External configuration source to preview before approval-gated import.',
    },
  },
} as const;
```

- [ ] **Step 5: Register CR groups**

In `src/shared/deskBridgeCapabilities.ts`, inside the `xd.xenesis` group near
the existing `xd.xenesis.tools` group, add:

```ts
      group(
        'xd.xenesis.integrations',
        'Native external integrations',
        'Xenesis-native external service integration catalog, readiness, doctor, and import preview state.',
        [
          group('xd.xenesis.integrations.catalog', 'Catalog', 'Native external integration catalog.', [
            method(
              'xd.xenesis.integrations.catalog.status',
              'Read native integration catalog',
              'Read the Xenesis-native external integration catalog without loading OpenClaw or Hermes plugin runtimes, storing credentials, starting OAuth, or executing external tools.',
              'read',
              XENESIS_EXTERNAL_INTEGRATION_STATUS_SCHEMA,
            ),
          ]),
          method(
            'xd.xenesis.integrations.status',
            'Read native integration status',
            'Read Xenesis-native external integration readiness and redacted credential state without exposing secrets, executing tools, writing config, or completing OAuth.',
            'read',
            XENESIS_EXTERNAL_INTEGRATION_STATUS_SCHEMA,
          ),
          group('xd.xenesis.integrations.doctor', 'Doctor', 'Native external integration doctor findings.', [
            method(
              'xd.xenesis.integrations.doctor.status',
              'Read native integration doctor',
              'Read structured doctor findings for Xenesis-native external integrations without repairing config, writing credentials, or probing real external APIs.',
              'read',
              XENESIS_EXTERNAL_INTEGRATION_STATUS_SCHEMA,
            ),
          ]),
          group('xd.xenesis.integrations.import', 'Import', 'Redacted import previews from external agent configs.', [
            method(
              'xd.xenesis.integrations.import.preview',
              'Preview native integration import',
              'Preview redacted mappings from Hermes, OpenClaw, or MCP client config into Xenesis-native integrations without copying secrets or mutating settings.',
              'read',
              XENESIS_EXTERNAL_INTEGRATION_IMPORT_PREVIEW_SCHEMA,
            ),
          ]),
        ],
      ),
```

- [ ] **Step 6: Add adapter dispatch**

In `callDeskBridgeCapability`, near the other `xd.xenesis.*` dispatch blocks,
add:

```ts
      if (path === 'xd.xenesis.integrations.catalog.status') {
        return callAdapter(path, api?.getXenesisExternalIntegrationCatalogStatus, request.args);
      }
      if (path === 'xd.xenesis.integrations.status') {
        return callAdapter(path, api?.getXenesisExternalIntegrationStatus, request.args);
      }
      if (path === 'xd.xenesis.integrations.doctor.status') {
        return callAdapter(path, api?.getXenesisExternalIntegrationDoctorStatus, request.args);
      }
      if (path === 'xd.xenesis.integrations.import.preview') {
        return callAdapter(path, api?.previewXenesisExternalIntegrationImport, request.args);
      }
```

- [ ] **Step 7: Run the CR tests**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/xenesisConnectionCapabilities.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/shared/deskBridgeCapabilities.ts src/shared/xenesisConnectionCapabilities.test.ts
git commit -m "feat: expose native integration CR status"
```

## Task 4: Main Process Capability Handlers

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Import shared registry builders**

Add these imports near the other shared imports in `src/main/index.ts`:

```ts
import {
  buildExternalIntegrationCatalogStatus,
  buildExternalIntegrationDoctorStatus,
  buildExternalIntegrationImportPreview,
  buildExternalIntegrationStatus,
} from '../shared/externalIntegrations';
```

- [ ] **Step 2: Add capability argument helpers**

Near the existing Xenesis tool status helpers in `src/main/index.ts`, add:

```ts
function readXenesisExternalIntegrationId(args?: unknown): string {
  const body = normalizeMcpCapabilityArgs(args);
  return readCapabilityString(body, ['id', 'integration', 'name']);
}

function getXenesisExternalIntegrationCatalogStatus(args?: unknown): Record<string, unknown> {
  return buildExternalIntegrationCatalogStatus();
}

function getXenesisExternalIntegrationStatus(args?: unknown): Record<string, unknown> {
  const id = readXenesisExternalIntegrationId(args);
  return buildExternalIntegrationStatus({
    ...(id ? { id } : {}),
    env: process.env,
    platform: process.platform,
  });
}

function getXenesisExternalIntegrationDoctorStatus(args?: unknown): Record<string, unknown> {
  const id = readXenesisExternalIntegrationId(args);
  return buildExternalIntegrationDoctorStatus({
    ...(id ? { id } : {}),
    env: process.env,
    platform: process.platform,
  });
}

function previewXenesisExternalIntegrationImport(args?: unknown): Record<string, unknown> {
  const body = normalizeMcpCapabilityArgs(args);
  const source = readCapabilityString(body, ['source', 'kind']);
  if (source !== 'hermes' && source !== 'openclaw' && source !== 'mcp-client') {
    return {
      ok: false,
      error: 'Import source must be hermes, openclaw, or mcp-client.',
      allowedSources: ['hermes', 'openclaw', 'mcp-client'],
    };
  }

  return buildExternalIntegrationImportPreview({
    source,
    env: process.env,
    mcpServers: {},
    pluginIds: [],
  });
}
```

- [ ] **Step 3: Wire handlers into the MCP bridge adapter**

Find the object passed to `callDeskBridgeCapability` in `src/main/index.ts` and
add:

```ts
    getXenesisExternalIntegrationCatalogStatus,
    getXenesisExternalIntegrationStatus,
    getXenesisExternalIntegrationDoctorStatus,
    previewXenesisExternalIntegrationImport,
```

- [ ] **Step 4: Run shared tests that compile main references**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/xenesisConnectionCapabilities.test.ts src/shared/externalIntegrations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: handle native integration CR status"
```

## Task 5: Hermes Provider Surface Cleanup

**Files:**
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`
- Modify: `src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriProviders.ts`
- Modify: `src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/chat/gowooriChatConstants.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Test: `src/shared/xenesisConnectionCapabilities.test.ts`

- [ ] **Step 1: Add failing provider-surface test**

Append to `src/shared/xenesisConnectionCapabilities.test.ts`:

```ts
test('Hermes is not exposed as a Xenesis agent provider surface', () => {
  const agentPaneSource = readFileSync(
    new URL('../renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx', import.meta.url),
    'utf8',
  );
  const gowooriProvidersSource = readFileSync(
    new URL('../renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriProviders.ts', import.meta.url),
    'utf8',
  );
  const capabilitySource = readFileSync(new URL('./deskBridgeCapabilities.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(agentPaneSource, /mock\|byok\|codex\|claude\|hermes/);
  assert.doesNotMatch(gowooriProvidersSource, /id:\s*'hermes'/);
  assert.doesNotMatch(capabilitySource, /enum:\s*\[[^\]]*'hermes'[^\]]*\]/);
});
```

- [ ] **Step 2: Run the failing provider-surface test**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/xenesisConnectionCapabilities.test.ts
```

Expected: FAIL while Hermes still appears in provider surface files.

- [ ] **Step 3: Remove Hermes from Xenesis Agent slash command help**

In `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx`,
change the provider command entry from:

```ts
usage: '/provider [mock|byok|codex|claude|hermes]',
```

to:

```ts
usage: '/provider [byok|codex|claude]',
```

If nearby command text says Hermes is an artifact provider, update that sentence
to:

```ts
description: 'Show or switch the artifact provider used by /artifact.',
```

- [ ] **Step 4: Remove Hermes from Gowoori provider definitions**

In `src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriProviders.ts`,
remove the object:

```ts
  {
    id: 'hermes',
    label: 'Hermes',
    kind: 'cli',
    command: 'hermes',
    defaultArgs: ['run', '--stdin'],
    promptMode: 'stdin',
    description: 'Prepare a Hermes gateway request for streaming into Gowoori.',
  },
```

If the `GowooriProvider` type includes `'hermes'`, remove it so the type is:

```ts
export type GowooriProvider = 'mock' | 'codex' | 'claude' | 'byok';
```

- [ ] **Step 5: Update any slow-provider or default-provider constants**

If `src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/chat/gowooriChatConstants.ts`
contains:

```ts
const SLOW_LOCAL_CLI_PROVIDERS = new Set<GowooriProvider>(['codex', 'claude', 'hermes']);
```

change it to:

```ts
const SLOW_LOCAL_CLI_PROVIDERS = new Set<GowooriProvider>(['codex', 'claude']);
```

- [ ] **Step 6: Remove Hermes from CR provider enums**

In `src/shared/deskBridgeCapabilities.ts`, replace provider enums that include
Hermes as a provider:

```ts
enum: ['mock', 'codex', 'claude', 'hermes', 'byok'],
```

with:

```ts
enum: ['codex', 'claude', 'byok'],
```

And replace:

```ts
enum: ['mock', 'byok', 'codex', 'claude', 'hermes'],
```

with:

```ts
enum: ['byok', 'codex', 'claude'],
```

If a schema still intentionally refers to historical records, rename its field
description to `legacyProvider` and do not expose it as an active selector.

- [ ] **Step 7: Run provider-surface tests**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/shared/xenesisConnectionCapabilities.test.ts
```

Expected: PASS.

- [ ] **Step 8: Run typecheck**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 npm run typecheck
```

Expected: PASS.

Then run this command and verify any remaining matches are legacy/import labels
rather than active provider selectors:

```bash
rg -n "\\bhermes\\b" src/shared/deskBridgeCapabilities.ts \
  src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx \
  src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriProviders.ts \
  src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/chat/gowooriChatConstants.ts
```

- [ ] **Step 9: Commit**

```bash
git add src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx \
  src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriProviders.ts \
  src/renderer/extensions/xenesis-desk.workflow-runner/gowoori/chat/gowooriChatConstants.ts \
  src/shared/deskBridgeCapabilities.ts \
  src/shared/xenesisConnectionCapabilities.test.ts
git commit -m "fix: remove Hermes from agent provider surfaces"
```

## Task 6: Onboarding Readiness Bridge

**Files:**
- Modify: `src/renderer/panes/onboarding/basicDeskSteps.ts`
- Modify: `src/renderer/panes/onboarding/onboardingRuntime.test.ts`

- [ ] **Step 1: Add failing onboarding readiness test**

In `src/renderer/panes/onboarding/onboardingRuntime.test.ts`, add a test that
requires the external integration setup step to include the native integration
doctor CR path:

```ts
test('external integration onboarding step requires native integration doctor readiness', () => {
  const step = BASIC_DESK_ONBOARDING_STEPS.find((item) => item.id === 'connect-external-tools');
  assert.ok(step, 'connect-external-tools step exists');

  assert.equal(
    step.verification.capabilityPaths.includes('xd.xenesis.integrations.doctor.status'),
    true,
    'external tool onboarding checks native integration doctor readiness through CR',
  );
});
```

- [ ] **Step 2: Run the failing onboarding test**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/renderer/panes/onboarding/onboardingRuntime.test.ts
```

Expected: FAIL because `connect-external-tools` does not include
`xd.xenesis.integrations.doctor.status` yet.

- [ ] **Step 3: Add native doctor paths to the external tools onboarding step**

In `src/renderer/panes/onboarding/basicDeskSteps.ts`, replace the
`connect-external-tools` `actions` and `verification` block with:

```ts
    actions: [
      {
        id: 'open-external-tool-setup',
        labelKey: 'app.onboardingOpenExternalToolSetup',
        descriptionKey: 'app.onboardingOpenExternalToolSetupDesc',
        capabilityPaths: [
          'xd.xenesis.tools.setupPlans.open',
          'xd.xenesis.tools.setupPlans.status',
          'xd.xenesis.integrations.status',
        ],
        primary: true,
      },
      {
        id: 'open-tool-connectors',
        labelKey: 'app.onboardingOpenToolConnectors',
        descriptionKey: 'app.onboardingOpenToolConnectorsDesc',
        capabilityPaths: [
          'xd.xenesis.tools.connectors.open',
          'xd.xenesis.tools.connectors.status',
          'xd.xenesis.integrations.doctor.status',
        ],
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyExternalTools',
      capabilityPaths: [
        'xd.xenesis.tools.setupPlans.status',
        'xd.xenesis.tools.connectors.status',
        'xd.xenesis.tools.runtime.status',
        'xd.xenesis.integrations.status',
        'xd.xenesis.integrations.doctor.status',
      ],
    },
```

- [ ] **Step 4: Run onboarding tests**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test src/renderer/panes/onboarding/onboardingRuntime.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/panes/onboarding/basicDeskSteps.ts \
  src/renderer/panes/onboarding/onboardingRuntime.test.ts
git commit -m "feat: gate onboarding on native integration doctor"
```

## Task 7: Verification And Handoff

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Update handoff before verification**

At the top of `handoff.md`, append commands run and files touched for Slice 1.
Record that implementation is now in progress and list the commits created by
Tasks 1-6.

- [ ] **Step 2: Run targeted tests**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 node --import tsx --test \
  src/shared/externalIntegrations.test.ts \
  src/shared/xenesisConnectionCapabilities.test.ts \
  src/renderer/panes/onboarding/onboardingRuntime.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run CR audit**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 npm run docs:capabilities:audit
```

Expected: PASS and `docs/capability-registry-audit.md` may be regenerated.

- [ ] **Step 5: Run build**

Run:

```bash
npx -y -p node@22.12.0 -p npm@10.9.0 npm run build
```

Expected: PASS. Existing Vite warnings about externalized modules or dynamic
imports are acceptable if they match prior build behavior.

- [ ] **Step 6: Final handoff update**

Update `handoff.md` with exact pass/fail results and known gaps:

```md
- Exact verification result:
  - Native registry tests: PASS/FAIL with command.
  - CR capability tests: PASS/FAIL with command.
  - Onboarding runtime tests: PASS/FAIL with command.
  - Typecheck: PASS/FAIL with command.
  - CR audit: PASS/FAIL with command.
  - Build: PASS/FAIL with command.
- Known gaps:
  - OAuth exchange, live API probes, token writes, and real external action execution remain later slices.
```

- [ ] **Step 7: Commit handoff and generated audit docs**

```bash
git add handoff.md docs/capability-registry-audit.md
git commit -m "docs: record native integration slice verification"
```

## Self-Review

- Spec coverage:
  - Covered: native registry, read-only status, doctor findings, import preview,
    onboarding readiness bridge, Hermes provider-surface cleanup.
  - Deferred: real OAuth exchange, real MCP probes, credential writes, external
    action execution, full UI wizard, and import apply.
- Placeholder scan:
  - The plan uses concrete file paths, commands, snippets, and expected results
    for every task.
- Type consistency:
  - Native ids use `ExternalIntegrationId`.
  - CR adapter methods consistently use
    `getXenesisExternalIntegrationCatalogStatus`,
    `getXenesisExternalIntegrationStatus`,
    `getXenesisExternalIntegrationDoctorStatus`, and
    `previewXenesisExternalIntegrationImport`.
  - CR paths consistently use `xd.xenesis.integrations.*`.
