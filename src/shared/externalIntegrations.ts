export type ExternalIntegrationCategory =
  | 'productivity'
  | 'channel'
  | 'web-search'
  | 'browser-automation'
  | 'automation'
  | 'media'
  | 'smart-home'
  | 'apple-local';

export type ExternalIntegrationMaturity = 'native-status' | 'setup-ready' | 'planned';
export type ExternalIntegrationPlatform = 'cloud' | 'mcp' | 'local-apple' | 'browser-cloud' | 'home-lan';
export type ExternalRuntimeRoute =
  | 'api-token'
  | 'oauth'
  | 'mcp'
  | 'webhook'
  | 'local-automation'
  | 'browser-session'
  | 'lan-api';
export type ExternalIntegrationImportSource = 'hermes' | 'openclaw' | 'mcp-client';

export interface ExternalIntegrationImportMapping {
  source: ExternalIntegrationImportSource;
  keys: readonly string[];
  requiredRefs: readonly string[];
}

export interface ExternalCredentialRequirement {
  id: string;
  label: string;
  refs: readonly string[];
  required: boolean;
  secret: boolean;
  kind: 'env' | 'oauth-client' | 'oauth-token-store' | 'webhook-url' | 'local-permission';
}

export interface ExternalActionPolicy {
  statusOnly: boolean;
  providerToolExecution: 'blocked';
  externalMutation: 'blocked';
  secretStorage: 'not-implemented';
  oauthExchange: 'not-implemented';
}

export interface ExternalIntegrationDefinition {
  id: string;
  label: string;
  category: ExternalIntegrationCategory;
  maturity: ExternalIntegrationMaturity;
  platform: ExternalIntegrationPlatform;
  runtimeRoutes: readonly ExternalRuntimeRoute[];
  credentialRequirements: readonly ExternalCredentialRequirement[];
  actionPolicy: ExternalActionPolicy;
  sourceRuntimeDependency: false;
  sourceReferences: readonly {
    name: 'OpenClaw' | 'Hermes';
    label: string;
    url?: string;
  }[];
  importMappings: readonly ExternalIntegrationImportMapping[];
}

export interface ExternalCredentialState {
  required: {
    id: string;
    label: string;
    refs: readonly string[];
    required: true;
    present: boolean;
    secret: boolean;
  }[];
  optional: {
    id: string;
    label: string;
    refs: readonly string[];
    required: false;
    present: boolean;
    secret: boolean;
  }[];
  missingRequired: {
    id: string;
    refs: readonly string[];
    secret: boolean;
  }[];
}

export interface ExternalIntegrationStatusItem {
  id: string;
  label: string;
  category: ExternalIntegrationCategory;
  maturity: ExternalIntegrationMaturity;
  platform: ExternalIntegrationPlatform;
  runtimeRoutes: readonly ExternalRuntimeRoute[];
  credentialState: ExternalCredentialState;
  actionPolicy: ExternalActionPolicy;
  sourceRuntimeDependency: false;
  sourceReferences: ExternalIntegrationDefinition['sourceReferences'];
}

export interface ExternalIntegrationStatusRequest {
  id?: string;
  env?: Record<string, string | undefined | null>;
}

export interface ExternalIntegrationImportPreviewRequest {
  source: ExternalIntegrationImportSource;
  env?: Record<string, string | undefined>;
  mcpServers?: Record<string, unknown>;
  pluginIds?: string[];
}

export interface ExternalIntegrationImportPreview {
  ok: true;
  source: ExternalIntegrationImportSource;
  candidates: {
    integrationId: string;
    label: string;
    category: ExternalIntegrationCategory;
    source: ExternalIntegrationImportSource;
    matchedKeys: string[];
    requiredRefs: string[];
    matchedRefs: string[];
    missingRefs: string[];
    ready: boolean;
    readiness: 'ready' | 'missing-required-refs';
    secretValuesIncluded: false;
    applyRequiresApproval: true;
  }[];
  summary: {
    candidateCount: number;
    readyCount: number;
    missingCount: number;
    scanned: {
      envKeys: string[];
      mcpServers: string[];
      pluginIds: string[];
    };
  };
  warnings: string[];
}

interface ExternalIntegrationImportScan {
  envKeys: ReadonlySet<string>;
  mcpServerNames: ReadonlySet<string>;
  pluginIds: ReadonlySet<string>;
}

interface ExternalIntegrationImportScannedSummary {
  envKeys: string[];
  mcpServers: string[];
  pluginIds: string[];
}

export interface ExternalIntegrationCatalogStatus {
  ok: true;
  total: number;
  categories: {
    id: ExternalIntegrationCategory;
    label: string;
    total: number;
  }[];
  items: {
    id: string;
    label: string;
    category: string;
    maturity: ExternalIntegrationMaturity;
    platform: ExternalIntegrationPlatform;
    runtimeRoutes: readonly ExternalRuntimeRoute[];
    credentialRefs: {
      id: string;
      refs: readonly string[];
      required: boolean;
      secret: boolean;
    }[];
    actionPolicy: ExternalActionPolicy;
    sourceRuntimeDependency: false;
    sourceReferences: ExternalIntegrationDefinition['sourceReferences'];
  }[];
}

export interface ExternalIntegrationStatus {
  ok: true;
  total: number;
  items: ExternalIntegrationStatusItem[];
}

export interface ExternalIntegrationDoctorStatus {
  ok: true;
  total: number;
  findings: {
    checkId: string;
    integrationId: string;
    severity: 'error' | 'info';
    message: string;
    refs: readonly string[];
    secret: boolean;
  }[];
}

type ExternalIntegrationDefinitionSeed = Omit<ExternalIntegrationDefinition, 'importMappings'> & {
  importMappings?: readonly ExternalIntegrationImportMapping[];
};

const READ_ONLY_ACTION_POLICY: ExternalActionPolicy = {
  statusOnly: true,
  providerToolExecution: 'blocked',
  externalMutation: 'blocked',
  secretStorage: 'not-implemented',
  oauthExchange: 'not-implemented',
};

const CATEGORY_LABELS: Record<ExternalIntegrationCategory, string> = {
  productivity: 'Productivity',
  channel: 'Channels',
  'web-search': 'Web search',
  'browser-automation': 'Browser automation',
  automation: 'Automation',
  media: 'Media',
  'smart-home': 'Smart home',
  'apple-local': 'Apple local',
};

const OPENCLAW_REFERENCE = {
  name: 'OpenClaw',
  label: 'OpenClaw external integration reference',
  url: 'https://docs.openclaw.ai/channels',
} as const;

const HERMES_REFERENCE = {
  name: 'Hermes',
  label: 'Hermes integration reference',
  url: 'https://hermes-agent.nousresearch.com/docs/integrations/',
} as const;

function envCredential(
  id: string,
  label: string,
  refs: readonly string[],
  options: { required?: boolean; secret?: boolean; kind?: ExternalCredentialRequirement['kind'] } = {},
): ExternalCredentialRequirement {
  return {
    id,
    label,
    refs,
    required: options.required !== false,
    secret: options.secret !== false,
    kind: options.kind ?? 'env',
  };
}

function localPermission(id: string, label: string): ExternalCredentialRequirement {
  return {
    id,
    label,
    refs: [],
    required: false,
    secret: false,
    kind: 'local-permission',
  };
}

const EXTERNAL_INTEGRATION_DEFINITIONS = [
  {
    id: 'github',
    label: 'GitHub',
    category: 'productivity',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'mcp'],
    credentialRequirements: [envCredential('github-token', 'GitHub token', ['GITHUB_TOKEN'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE, OPENCLAW_REFERENCE],
  },
  {
    id: 'notion',
    label: 'Notion',
    category: 'productivity',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'mcp'],
    credentialRequirements: [envCredential('notion-api-key', 'Notion API key', ['NOTION_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'google-workspace',
    label: 'Google Workspace',
    category: 'productivity',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['oauth', 'mcp'],
    credentialRequirements: [
      envCredential('google-workspace-client-id', 'Google Workspace OAuth client id', ['GOOGLE_WORKSPACE_CLIENT_ID'], {
        kind: 'oauth-client',
        secret: false,
      }),
      envCredential(
        'google-workspace-client-secret',
        'Google Workspace OAuth client secret',
        ['GOOGLE_WORKSPACE_CLIENT_SECRET'],
        { kind: 'oauth-client' },
      ),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE, OPENCLAW_REFERENCE],
  },
  {
    id: 'google-calendar',
    label: 'Google Calendar',
    category: 'productivity',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['oauth', 'mcp'],
    credentialRequirements: [
      envCredential('google-calendar-client-id', 'Google Calendar OAuth client id', ['GOOGLE_CALENDAR_CLIENT_ID'], {
        kind: 'oauth-client',
        secret: false,
      }),
      envCredential(
        'google-calendar-client-secret',
        'Google Calendar OAuth client secret',
        ['GOOGLE_CALENDAR_CLIENT_SECRET'],
        { kind: 'oauth-client' },
      ),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE, OPENCLAW_REFERENCE],
  },
  {
    id: 'linear',
    label: 'Linear',
    category: 'productivity',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'mcp', 'oauth'],
    credentialRequirements: [envCredential('linear-api-key', 'Linear API key', ['LINEAR_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'linear-mcp',
    label: 'Linear MCP',
    category: 'productivity',
    maturity: 'native-status',
    platform: 'mcp',
    runtimeRoutes: ['mcp', 'oauth'],
    credentialRequirements: [
      envCredential('linear-mcp-client-id', 'Linear MCP OAuth client id', ['LINEAR_MCP_CLIENT_ID'], {
        kind: 'oauth-client',
        secret: false,
      }),
      envCredential('linear-mcp-client-secret', 'Linear MCP OAuth client secret', ['LINEAR_MCP_CLIENT_SECRET'], {
        kind: 'oauth-client',
      }),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'n8n-mcp',
    label: 'n8n MCP',
    category: 'automation',
    maturity: 'native-status',
    platform: 'mcp',
    runtimeRoutes: ['mcp', 'api-token'],
    credentialRequirements: [
      envCredential('n8n-mcp-url', 'n8n MCP URL', ['N8N_MCP_URL'], { secret: false }),
      envCredential('n8n-api-key', 'n8n API key', ['N8N_API_KEY']),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'airtable',
    label: 'Airtable',
    category: 'productivity',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'mcp'],
    credentialRequirements: [envCredential('airtable-api-key', 'Airtable API key', ['AIRTABLE_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'slack',
    label: 'Slack',
    category: 'channel',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'webhook'],
    credentialRequirements: [
      envCredential('slack-bot-token', 'Slack bot token', ['SLACK_BOT_TOKEN']),
      envCredential('slack-signing-secret', 'Slack signing secret', ['SLACK_SIGNING_SECRET']),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [OPENCLAW_REFERENCE, HERMES_REFERENCE],
  },
  {
    id: 'discord',
    label: 'Discord',
    category: 'channel',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'webhook'],
    credentialRequirements: [envCredential('discord-bot-token', 'Discord bot token', ['DISCORD_BOT_TOKEN'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [OPENCLAW_REFERENCE, HERMES_REFERENCE],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    category: 'channel',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'webhook'],
    credentialRequirements: [envCredential('telegram-bot-token', 'Telegram bot token', ['TELEGRAM_BOT_TOKEN'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [OPENCLAW_REFERENCE, HERMES_REFERENCE],
  },
  {
    id: 'google-chat',
    label: 'Google Chat',
    category: 'channel',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['webhook', 'oauth'],
    credentialRequirements: [
      envCredential('google-chat-webhook-url', 'Google Chat webhook URL', ['GOOGLE_CHAT_WEBHOOK_URL'], {
        kind: 'webhook-url',
      }),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [OPENCLAW_REFERENCE],
  },
  {
    id: 'microsoft-teams',
    label: 'Microsoft Teams',
    category: 'channel',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['webhook', 'oauth'],
    credentialRequirements: [
      envCredential('microsoft-teams-webhook-url', 'Microsoft Teams webhook URL', ['MICROSOFT_TEAMS_WEBHOOK_URL'], {
        kind: 'webhook-url',
      }),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [OPENCLAW_REFERENCE],
  },
  {
    id: 'brave-search',
    label: 'Brave Search',
    category: 'web-search',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'mcp'],
    credentialRequirements: [envCredential('brave-search-api-key', 'Brave Search API key', ['BRAVE_SEARCH_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'tavily',
    label: 'Tavily',
    category: 'web-search',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'mcp'],
    credentialRequirements: [envCredential('tavily-api-key', 'Tavily API key', ['TAVILY_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'exa',
    label: 'Exa',
    category: 'web-search',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'mcp'],
    credentialRequirements: [envCredential('exa-api-key', 'Exa API key', ['EXA_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'firecrawl',
    label: 'Firecrawl',
    category: 'web-search',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['api-token', 'mcp'],
    credentialRequirements: [envCredential('firecrawl-api-key', 'Firecrawl API key', ['FIRECRAWL_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'parallel',
    label: 'Parallel',
    category: 'browser-automation',
    maturity: 'native-status',
    platform: 'browser-cloud',
    runtimeRoutes: ['api-token', 'browser-session'],
    credentialRequirements: [envCredential('parallel-api-key', 'Parallel API key', ['PARALLEL_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'browserbase',
    label: 'Browserbase',
    category: 'browser-automation',
    maturity: 'native-status',
    platform: 'browser-cloud',
    runtimeRoutes: ['api-token', 'browser-session'],
    credentialRequirements: [
      envCredential('browserbase-api-key', 'Browserbase API key', ['BROWSERBASE_API_KEY']),
      envCredential('browserbase-project-id', 'Browserbase project id', ['BROWSERBASE_PROJECT_ID'], { secret: false }),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'browser-use',
    label: 'Browser Use',
    category: 'browser-automation',
    maturity: 'native-status',
    platform: 'browser-cloud',
    runtimeRoutes: ['api-token', 'browser-session'],
    credentialRequirements: [envCredential('browser-use-api-key', 'Browser Use API key', ['BROWSER_USE_API_KEY'])],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'spotify',
    label: 'Spotify',
    category: 'media',
    maturity: 'native-status',
    platform: 'cloud',
    runtimeRoutes: ['oauth', 'api-token'],
    credentialRequirements: [
      envCredential('spotify-client-id', 'Spotify client id', ['SPOTIFY_CLIENT_ID'], {
        kind: 'oauth-client',
        secret: false,
      }),
      envCredential('spotify-client-secret', 'Spotify client secret', ['SPOTIFY_CLIENT_SECRET'], {
        kind: 'oauth-client',
      }),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'home-assistant',
    label: 'Home Assistant',
    category: 'smart-home',
    maturity: 'native-status',
    platform: 'home-lan',
    runtimeRoutes: ['lan-api', 'api-token'],
    credentialRequirements: [
      envCredential('home-assistant-url', 'Home Assistant URL', ['HOME_ASSISTANT_URL'], { secret: false }),
      envCredential('home-assistant-token', 'Home Assistant token', ['HOME_ASSISTANT_TOKEN']),
    ],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'apple-notes',
    label: 'Apple Notes',
    category: 'apple-local',
    maturity: 'native-status',
    platform: 'local-apple',
    runtimeRoutes: ['local-automation'],
    credentialRequirements: [localPermission('apple-notes-permission', 'Apple Notes local permission')],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'apple-reminders',
    label: 'Apple Reminders',
    category: 'apple-local',
    maturity: 'native-status',
    platform: 'local-apple',
    runtimeRoutes: ['local-automation'],
    credentialRequirements: [localPermission('apple-reminders-permission', 'Apple Reminders local permission')],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [HERMES_REFERENCE],
  },
  {
    id: 'imessage',
    label: 'iMessage',
    category: 'channel',
    maturity: 'native-status',
    platform: 'local-apple',
    runtimeRoutes: ['local-automation'],
    credentialRequirements: [localPermission('imessage-permission', 'iMessage local permission')],
    actionPolicy: READ_ONLY_ACTION_POLICY,
    sourceRuntimeDependency: false,
    sourceReferences: [OPENCLAW_REFERENCE, HERMES_REFERENCE],
  },
] as const satisfies readonly ExternalIntegrationDefinitionSeed[];

export type ExternalIntegrationId = (typeof EXTERNAL_INTEGRATION_DEFINITIONS)[number]['id'];

export const EXTERNAL_INTEGRATIONS: readonly ExternalIntegrationDefinition[] = EXTERNAL_INTEGRATION_DEFINITIONS.map(
  (definition) => withExternalIntegrationImportMappings(definition),
);
export const EXTERNAL_INTEGRATION_IDS: readonly string[] = EXTERNAL_INTEGRATIONS.map((item) => item.id);

export function findExternalIntegration(id: string): ExternalIntegrationDefinition | undefined {
  return EXTERNAL_INTEGRATIONS.find((item) => item.id === id);
}

export function buildExternalIntegrationCatalogStatus(): ExternalIntegrationCatalogStatus {
  return {
    ok: true,
    total: EXTERNAL_INTEGRATIONS.length,
    categories: buildCategoryStatus(EXTERNAL_INTEGRATIONS),
    items: EXTERNAL_INTEGRATIONS.map((definition) => ({
      id: definition.id,
      label: definition.label,
      category: definition.category,
      maturity: definition.maturity,
      platform: definition.platform,
      runtimeRoutes: [...definition.runtimeRoutes],
      credentialRefs: definition.credentialRequirements.map((credential) => ({
        id: credential.id,
        refs: [...credential.refs],
        required: credential.required,
        secret: credential.secret,
      })),
      actionPolicy: { ...definition.actionPolicy },
      sourceRuntimeDependency: definition.sourceRuntimeDependency,
      sourceReferences: definition.sourceReferences.map((reference) => ({ ...reference })),
    })),
  };
}

export function buildExternalIntegrationStatus(
  request: ExternalIntegrationStatusRequest = {},
): ExternalIntegrationStatus {
  const env = request.env ?? readProcessEnv();
  const definitions = filterExternalIntegrations(request.id);
  return {
    ok: true,
    total: definitions.length,
    items: definitions.map((definition) => buildExternalIntegrationStatusItem(definition, env)),
  };
}

export function buildExternalIntegrationDoctorStatus(
  request: ExternalIntegrationStatusRequest = {},
): ExternalIntegrationDoctorStatus {
  const status = buildExternalIntegrationStatus(request);
  const findings = status.items.flatMap((item) =>
    item.credentialState.missingRequired.map((credential) => {
      const firstRefOrCredentialId = credential.refs[0] || credential.id;
      return {
        checkId: `${item.id}.credentials.${firstRefOrCredentialId}`,
        integrationId: item.id,
        severity: 'error' as const,
        message: `${item.label} is missing required credential ${firstRefOrCredentialId}.`,
        refs: [...credential.refs],
        secret: credential.secret,
      };
    }),
  );

  return {
    ok: true,
    total: status.total,
    findings,
  };
}

export function buildExternalIntegrationImportPreview(
  request: ExternalIntegrationImportPreviewRequest,
): ExternalIntegrationImportPreview {
  const env = request.env ?? {};
  const scan: ExternalIntegrationImportScan = {
    envKeys: new Set(Object.keys(env).filter((key) => isNonEmptyImportEnvValue(env[key]))),
    mcpServerNames: new Set(Object.keys(request.mcpServers ?? {})),
    pluginIds: new Set((request.pluginIds ?? []).map((item) => item.trim()).filter(Boolean)),
  };

  const candidates = EXTERNAL_INTEGRATIONS.flatMap((definition) => {
    const importMapping = definition.importMappings.find((mapping) => mapping.source === request.source);
    if (!importMapping) return [];

    const matchedKeys = importMapping.keys.filter((key) => hasImportKeyMatch(key, definition.id, scan));
    if (matchedKeys.length === 0) return [];

    const requiredRefs = [...importMapping.requiredRefs].sort();
    const matchedRefs = requiredRefs.filter((ref) => hasImportKeyMatch(ref, definition.id, scan));
    const missingRefs = requiredRefs.filter((ref) => !hasImportKeyMatch(ref, definition.id, scan));
    const ready = missingRefs.length === 0;

    return [
      {
        integrationId: definition.id,
        label: definition.label,
        category: definition.category,
        source: request.source,
        matchedKeys: [...matchedKeys].sort(),
        requiredRefs,
        matchedRefs,
        missingRefs,
        ready,
        readiness: ready ? ('ready' as const) : ('missing-required-refs' as const),
        secretValuesIncluded: false as const,
        applyRequiresApproval: true as const,
      },
    ];
  });
  const readyCount = candidates.filter((candidate) => candidate.ready).length;
  const missingCount = candidates.length - readyCount;

  return {
    ok: true,
    source: request.source,
    candidates,
    summary: {
      candidateCount: candidates.length,
      readyCount,
      missingCount,
      scanned: buildExternalIntegrationImportScannedSummary(scan),
    },
    warnings: [],
  };
}

function withExternalIntegrationImportMappings(
  definition: ExternalIntegrationDefinitionSeed,
): ExternalIntegrationDefinition {
  return {
    ...definition,
    importMappings: definition.importMappings ?? buildDefaultImportMappings(definition),
  };
}

function buildDefaultImportMappings(
  definition: ExternalIntegrationDefinitionSeed,
): readonly ExternalIntegrationImportMapping[] {
  return [...buildDefaultImportSources(definition)].map((source) => ({
    source,
    keys: buildDefaultImportKeys(definition),
    requiredRefs: buildDefaultRequiredImportRefs(definition, source),
  }));
}

function buildDefaultImportSources(
  definition: ExternalIntegrationDefinitionSeed,
): Set<ExternalIntegrationImportSource> {
  const sources = new Set<ExternalIntegrationImportSource>();
  for (const reference of definition.sourceReferences) {
    sources.add(reference.name === 'Hermes' ? 'hermes' : 'openclaw');
  }
  if (definition.runtimeRoutes.includes('mcp')) {
    sources.add('mcp-client');
  }
  if (definition.category === 'web-search') {
    sources.add('openclaw');
  }
  return sources;
}

function buildDefaultImportKeys(definition: ExternalIntegrationDefinitionSeed): readonly string[] {
  const keys = new Set<string>();
  for (const credential of definition.credentialRequirements) {
    for (const ref of credential.refs) {
      keys.add(ref);
    }
  }
  if (definition.runtimeRoutes.includes('mcp')) {
    keys.add(`mcp_servers.${definition.id}`);
  }
  keys.add(definition.id);
  return [...keys];
}

function buildDefaultRequiredImportRefs(
  definition: ExternalIntegrationDefinitionSeed,
  source: ExternalIntegrationImportSource,
): readonly string[] {
  if (source === 'mcp-client' && definition.runtimeRoutes.includes('mcp')) {
    return [`mcp_servers.${definition.id}`];
  }

  const refs = new Set<string>();
  for (const credential of definition.credentialRequirements) {
    if (!credential.required) continue;
    for (const ref of credential.refs) {
      refs.add(ref);
    }
  }
  return [...refs];
}

function hasImportKeyMatch(key: string, integrationId: string, scan: ExternalIntegrationImportScan): boolean {
  if (scan.envKeys.has(key)) return true;
  if (key.startsWith('mcp_servers.')) return scan.mcpServerNames.has(key.slice('mcp_servers.'.length));
  if (scan.pluginIds.has(key)) return true;
  if (key === integrationId && scan.pluginIds.has(integrationId)) return true;
  return false;
}

function buildExternalIntegrationImportScannedSummary(
  scan: ExternalIntegrationImportScan,
): ExternalIntegrationImportScannedSummary {
  return {
    envKeys: [...scan.envKeys].sort(),
    mcpServers: [...scan.mcpServerNames].sort(),
    pluginIds: [...scan.pluginIds].sort(),
  };
}

function isNonEmptyImportEnvValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildCategoryStatus(
  definitions: readonly ExternalIntegrationDefinition[],
): ExternalIntegrationCatalogStatus['categories'] {
  const counts = new Map<ExternalIntegrationCategory, number>();
  for (const definition of definitions) {
    counts.set(definition.category, (counts.get(definition.category) ?? 0) + 1);
  }

  return Object.entries(CATEGORY_LABELS)
    .map(([id, label]) => ({
      id: id as ExternalIntegrationCategory,
      label,
      total: counts.get(id as ExternalIntegrationCategory) ?? 0,
    }))
    .filter((item) => item.total > 0);
}

function filterExternalIntegrations(id: string | undefined): readonly ExternalIntegrationDefinition[] {
  if (!id) return EXTERNAL_INTEGRATIONS;
  const definition = findExternalIntegration(id);
  return definition ? [definition] : [];
}

function buildExternalIntegrationStatusItem(
  definition: ExternalIntegrationDefinition,
  env: Record<string, string | undefined | null>,
): ExternalIntegrationStatusItem {
  return {
    id: definition.id,
    label: definition.label,
    category: definition.category,
    maturity: definition.maturity,
    platform: definition.platform,
    runtimeRoutes: [...definition.runtimeRoutes],
    credentialState: buildCredentialState(definition.credentialRequirements, env),
    actionPolicy: { ...definition.actionPolicy },
    sourceRuntimeDependency: definition.sourceRuntimeDependency,
    sourceReferences: definition.sourceReferences.map((reference) => ({ ...reference })),
  };
}

function buildCredentialState(
  requirements: readonly ExternalCredentialRequirement[],
  env: Record<string, string | undefined | null>,
): ExternalCredentialState {
  const required = requirements
    .filter((credential) => credential.required)
    .map((credential) => ({
      id: credential.id,
      label: credential.label,
      refs: [...credential.refs],
      required: true as const,
      present: hasCredentialValue(credential, env),
      secret: credential.secret,
    }));
  const optional = requirements
    .filter((credential) => !credential.required)
    .map((credential) => ({
      id: credential.id,
      label: credential.label,
      refs: [...credential.refs],
      required: false as const,
      present: hasCredentialValue(credential, env),
      secret: credential.secret,
    }));

  return {
    required,
    optional,
    missingRequired: required
      .filter((credential) => !credential.present)
      .map((credential) => ({
        id: credential.id,
        refs: [...credential.refs],
        secret: credential.secret,
      })),
  };
}

function hasCredentialValue(
  credential: ExternalCredentialRequirement,
  env: Record<string, string | undefined | null>,
): boolean {
  return credential.refs.some((ref) => {
    const value = env[ref];
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
  });
}

function readProcessEnv(): Record<string, string | undefined> {
  const processLike = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return processLike?.env ?? {};
}
