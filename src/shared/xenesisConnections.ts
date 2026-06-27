import {
  listRecommendedMcpServers,
  type RecommendedMcpServer,
} from '../../packages/xenesis/src/extensions/recommendedMcpServers';
import type {
  AiProviderSettings,
  McpSettingsStatus,
  ProviderIntegrationStatus,
  XenesisGatewayChannelName,
  XenesisProfileChannelName,
  XenesisStatus,
} from './types';

export type XenesisConnectionKind =
  | 'onboarding'
  | 'provider'
  | 'local-cli'
  | 'mcp'
  | 'gateway'
  | 'tool'
  | 'messenger'
  | 'guide';
export type XenesisConnectionStatus = 'ready' | 'needs-setup' | 'disabled' | 'blocked' | 'planned' | 'unknown';
export type XenesisConnectionSupportLevel = 'implemented' | 'manual' | 'planned';

export interface XenesisConnectionSettingsAction {
  category: string;
  mode?: string;
  section?: string;
}

export interface XenesisConnectionSourceDoc {
  label: string;
  url: string;
}

export interface XenesisConnectionMcpConfigSnippets {
  json: string;
  codexToml: string;
}

export interface XenesisConnectionMcpTemplate {
  serverName: string;
  displayName: string;
  description: string;
  transport: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  auth?: 'oauth' | 'none';
  requiredEnv: string[];
  defaultEnabledTools?: string[];
  configSnippets: XenesisConnectionMcpConfigSnippets;
}

export interface XenesisConnectionToolSetupTemplate {
  connection: 'mcp' | 'oauth-mcp' | 'local';
  authMode: 'none' | 'env-token' | 'oauth';
  dataScopes: string[];
  writeScopes: string[];
  credentialStorage: string;
  setupSurface: string;
  verification: string[];
  crReadPaths: string[];
  riskControls: string[];
}

export interface XenesisConnectionToolViewTemplate {
  viewType: 'connection-detail';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.tools.views.open';
  openArgs: { id: string };
  connectionCardId: string;
  internalViews: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionProviderSetupTemplate {
  source: 'user-settings' | 'auto-detect' | 'local-cli' | 'byok';
  provider: string;
  model: string;
  authMode: 'auto-detect' | 'local-login' | 'api-key' | 'none';
  credentialState: 'configured' | 'missing' | 'not-required';
  credentialStorage: string;
  endpoint: string;
  runtimeProfile: string;
  runtimeProvider: string;
  runtimeModel: string;
  providerRetries: number;
  fallbackPolicy: string;
  localCliBoundary: string;
  verification: string[];
  crReadPaths: string[];
  riskControls: string[];
}

export interface XenesisConnectionProviderViewTemplate {
  viewType: 'provider-detail';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.providers.views.open';
  openArgs: { provider: string };
  connectionCardId: string;
  internalViews: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export type XenesisConnectionProviderCredentialState = 'configured' | 'missing' | 'not-required';

export interface XenesisConnectionProviderFallbackInput {
  provider: string;
  model?: string;
  baseURL?: string;
  apiKeyEnv?: string;
}

export interface XenesisConnectionProviderFallbackChainItem {
  index: number;
  provider: string;
  model: string;
  baseURLState: 'default' | 'custom';
  apiKeyEnv: string;
  credentialState: XenesisConnectionProviderCredentialState;
}

export interface XenesisConnectionProviderCredentialPoolItem {
  provider: string;
  apiKeyEnv: string;
  credentialState: XenesisConnectionProviderCredentialState;
  source: 'runtime' | 'fallback';
}

export interface XenesisConnectionProviderRoutingTemplate {
  routeSource: 'user-settings-profile';
  activeProvider: string;
  activeModel: string;
  runtimeProfile: string;
  runtimeProvider: string;
  runtimeModel: string;
  retryPolicy: {
    maxRetries: number;
    source: 'profile.policy.providerRetries';
  };
  fallbackPolicy: string;
  fallbackChainSource: 'xenesis-runtime-config';
  fallbackChainVisible: boolean;
  fallbackChain: XenesisConnectionProviderFallbackChainItem[];
  credentialPools: XenesisConnectionProviderCredentialPoolItem[];
  readPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionChannelTemplate {
  category: 'consumer' | 'enterprise' | 'developer' | 'community' | 'regional' | 'iot';
  adapter: string;
  auth: string;
  capabilities: string[];
  safetyControls: string[];
  routing?: XenesisConnectionChannelRoutingTemplate;
  safety?: XenesisConnectionChannelSafetyTemplate;
}

export interface XenesisConnectionChannelRoutingTemplate {
  routeBinding: string;
  allowlistFields: string[];
  pairing: string;
  defaultAgent: string;
  sessionScope: string;
  diagnostics: string[];
  deliveryFeatures: string[];
}

export interface XenesisConnectionChannelSafetyTemplate {
  accessModel: 'allowlist' | 'signature-verified' | 'network-boundary';
  accessGroupFields: string[];
  inboundBoundary: string;
  outboundBoundary: string;
  loopProtection: string[];
  approvalGuardrails: Array<'readonly' | 'safe' | 'auto'>;
  troubleshooting: string[];
  readPaths: string[];
  controlPaths: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionMessengerViewTemplate {
  viewType: 'messenger-detail';
  runtimeSupport: 'implemented' | 'planned';
  primarySurface: string;
  setupSurface: string;
  openPath: 'xd.xenesis.messengers.views.open';
  openArgs: { id: string };
  connectionCardId: string;
  internalViews: string[];
  readPaths: string[];
  controlPaths: string[];
  diagnostics: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionGuideCatalogTemplate {
  guideType: 'setup-playbook' | 'integration-guide' | 'user-story-catalog';
  audience: 'operator' | 'agent' | 'developer';
  primarySurface: string;
  coveredSurfaces: string[];
  prerequisites: string[];
  validationChecks: string[];
  readPaths: string[];
  controlPaths: string[];
  userStoryTemplates: string[];
  safetyBoundaries: string[];
}

export interface XenesisConnectionItem {
  id: string;
  kind: XenesisConnectionKind;
  label: string;
  status: XenesisConnectionStatus;
  summary: string;
  supportLevel?: XenesisConnectionSupportLevel;
  setupSteps?: string[];
  sourceDocs?: XenesisConnectionSourceDoc[];
  requiredEnv?: string[];
  missingEnv?: string[];
  crActions?: string[];
  settingsTarget?: string;
  settingsAction?: XenesisConnectionSettingsAction;
  guidePath?: string;
  guideOpenPath?: string;
  mcpTemplate?: XenesisConnectionMcpTemplate;
  providerSetup?: XenesisConnectionProviderSetupTemplate;
  providerView?: XenesisConnectionProviderViewTemplate;
  providerRouting?: XenesisConnectionProviderRoutingTemplate;
  toolSetup?: XenesisConnectionToolSetupTemplate;
  toolView?: XenesisConnectionToolViewTemplate;
  messengerView?: XenesisConnectionMessengerViewTemplate;
  guideCatalog?: XenesisConnectionGuideCatalogTemplate;
  channelTemplate?: XenesisConnectionChannelTemplate;
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
    onboarding: XenesisConnectionSection;
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
  providerFallbacks?: XenesisConnectionProviderFallbackInput[];
  env?: Record<string, string | undefined>;
  now?: Date;
  repoRoot?: string;
}

export const XENESIS_CONNECTION_GUIDES: XenesisConnectionItem[] = [
  {
    id: 'onboarding-connections',
    kind: 'guide',
    label: 'Onboarding and connections',
    status: 'ready',
    summary: 'First-run setup order for providers, MCP tools, gateway, and external bot channels.',
    guidePath: 'docs/manual/09-onboarding-connections.md',
    guideCatalog: {
      guideType: 'setup-playbook',
      audience: 'operator',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['providers', 'mcp-tools', 'gateway', 'messengers', 'guides'],
      prerequisites: ['choose AI provider', 'configure MCP bridge', 'review external bot gateway'],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.providers.setup.status',
        'xd.xenesis.tools.setup.status',
        'xd.xenesis.messengers.views.status',
      ],
      readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.guides.status'],
      controlPaths: ['xd.xenesis.guides.open', 'xd.xenesis.connections.open', 'xd.files.open'],
      userStoryTemplates: [
        'first-run provider and MCP setup',
        'connect a planned external tool without pretending it is installed',
        'verify messenger routing before remote prompts',
      ],
      safetyBoundaries: [
        'guide catalog is read-only',
        'guide open may open a repo-local file or focus a Settings card',
        'actual provider, tool, and channel mutations stay on their existing CR paths',
      ],
    },
  },
  {
    id: 'cr-mcp-gateway-bots',
    kind: 'guide',
    label: 'Capability Registry, MCP, gateway, and bots',
    status: 'ready',
    summary: 'Existing CR, MCP bridge, gateway, and bot session reference.',
    guidePath: 'docs/manual/05-cr-mcp-gateway-bots.md',
    guideCatalog: {
      guideType: 'integration-guide',
      audience: 'developer',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['capability-registry', 'mcp-bridge', 'gateway', 'bot-sessions'],
      prerequisites: ['MCP bridge configured', 'Xenesis gateway reviewed', 'CR caller available'],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.gateway.status',
        'xd.xenesis.channels.routing.status',
        'xd.xenesis.channels.safety.status',
      ],
      readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.guides.status'],
      controlPaths: ['xd.xenesis.guides.open', 'xd.xenesis.connections.open', 'xd.files.open'],
      userStoryTemplates: [
        'inspect CR paths before driving Desk behavior',
        'verify gateway state before external bot delivery',
        'read channel routing and safety before profile mutations',
      ],
      safetyBoundaries: [
        'guide catalog is read-only',
        'CR mutations remain on their owning capability paths',
        'gateway and bot delivery tests stay on existing runtime CR paths',
      ],
    },
  },
  {
    id: 'agent-user-stories',
    kind: 'guide',
    label: 'Agent user stories',
    status: 'ready',
    summary:
      'Hermes-style user story templates for provider setup, external tools, messenger ingress, and CR-controlled Desk workflows.',
    guidePath: 'docs/manual/09-onboarding-connections.md',
    sourceDocs: [
      { label: 'Hermes user stories', url: 'https://hermes-agent.nousresearch.com/docs/user-stories' },
      { label: 'Hermes MCP feature', url: 'https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp' },
      { label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' },
    ],
    guideCatalog: {
      guideType: 'user-story-catalog',
      audience: 'agent',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['ai-providers', 'external-tools', 'messengers', 'capability-registry'],
      prerequisites: [
        'connection catalog readback',
        'provider routing readback',
        'tool view readback',
        'messenger view readback',
      ],
      validationChecks: [
        'xd.xenesis.connections.status',
        'xd.xenesis.providers.routing.status',
        'xd.xenesis.tools.views.status',
        'xd.xenesis.messengers.views.status',
      ],
      readPaths: ['xd.xenesis.connections.status', 'xd.xenesis.guides.status'],
      controlPaths: [
        'xd.xenesis.guides.open',
        'xd.xenesis.providers.views.open',
        'xd.xenesis.tools.views.open',
        'xd.xenesis.messengers.views.open',
      ],
      userStoryTemplates: [
        'inspect active provider routing before running a task',
        'connect Notion or Google Calendar as a planned MCP/OAuth workflow',
        'open a messenger setup view and verify routing/safety before remote prompts',
        'drive Desk actions through CR and verify readback',
      ],
      safetyBoundaries: [
        'guide catalog does not execute workflows',
        'planned integrations remain setup/readiness views until runtime support exists',
        'CR readback must verify any guide-driven action',
      ],
    },
  },
];

function isAbsoluteLocalPath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\') || value.startsWith('/');
}

function resolveRepoLocalPath(repoRoot: string | undefined, relativePath: string | undefined): string | undefined {
  const root = repoRoot?.trim();
  const target = relativePath?.trim();
  if (!target) return undefined;
  if (!root || isAbsoluteLocalPath(target)) return target;
  const separator = root.includes('\\') ? '\\' : '/';
  const cleanRoot = root.replace(/[\\/]+$/, '');
  const cleanTarget = target.replace(/^[\\/]+/, '').replace(/[\\/]/g, separator);
  return `${cleanRoot}${separator}${cleanTarget}`;
}

function withGuideOpenPaths(items: XenesisConnectionItem[], repoRoot: string | undefined): XenesisConnectionItem[] {
  return items.map((item) => {
    const guideOpenPath = resolveRepoLocalPath(repoRoot, item.guidePath);
    if (!guideOpenPath || guideOpenPath === item.guideOpenPath) return item;
    return { ...item, guideOpenPath };
  });
}

const RECOMMENDED_MCP_BY_NAME = new Map(listRecommendedMcpServers().map((server) => [server.name, server]));

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function tomlArray(values: string[] | undefined): string {
  return `[${(values ?? []).map((value) => tomlString(value)).join(', ')}]`;
}

function jsonMcpServerEntry(server: RecommendedMcpServer): Record<string, unknown> {
  if (server.template.type === 'stdio') {
    return {
      command: server.template.command,
      args: server.template.args ?? [],
      ...(server.template.env && Object.keys(server.template.env).length > 0 ? { env: server.template.env } : {}),
    };
  }
  return {
    url: server.template.url,
    ...(server.template.transport ? { transport: server.template.transport } : {}),
    ...(server.template.headers ? { headers: server.template.headers } : {}),
    ...(server.template.auth ? { auth: server.template.auth } : {}),
  };
}

function codexTomlMcpServerSnippet(server: RecommendedMcpServer): string {
  const lines = [`[mcp_servers.${server.name}]`, 'enabled = true'];
  if (server.template.type === 'stdio') {
    lines.push(`command = ${tomlString(server.template.command)}`);
    if (server.template.args?.length) lines.push(`args = ${tomlArray(server.template.args)}`);
    if (server.defaultEnabledTools?.length) {
      lines.push('');
      lines.push(`[mcp_servers.${server.name}.tool_filter]`);
      lines.push(`include = ${tomlArray(server.defaultEnabledTools)}`);
    }
    if (server.template.env && Object.keys(server.template.env).length > 0) {
      lines.push('');
      lines.push(`[mcp_servers.${server.name}.env]`);
      for (const [key, value] of Object.entries(server.template.env)) {
        lines.push(`${key} = ${tomlString(value)}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }

  lines.push(`url = ${tomlString(server.template.url)}`);
  if (server.template.transport) lines.push(`transport = ${tomlString(server.template.transport)}`);
  if (server.template.auth) lines.push(`auth = ${tomlString(server.template.auth)}`);
  return `${lines.join('\n')}\n`;
}

function mcpTemplateFor(serverName: string): XenesisConnectionMcpTemplate | undefined {
  const server = RECOMMENDED_MCP_BY_NAME.get(serverName);
  if (!server) return undefined;
  const jsonSnippet = JSON.stringify(
    {
      mcpServers: {
        [server.name]: jsonMcpServerEntry(server),
      },
    },
    null,
    2,
  );
  return {
    serverName: server.name,
    displayName: server.displayName,
    description: server.description,
    transport: server.transport,
    requiredEnv: [...(server.requiredEnv ?? [])],
    ...(server.defaultEnabledTools?.length ? { defaultEnabledTools: [...server.defaultEnabledTools] } : {}),
    ...(server.template.type === 'stdio'
      ? {
          command: server.template.command,
          args: [...(server.template.args ?? [])],
          env: { ...(server.template.env ?? {}) },
        }
      : {
          url: server.template.url,
          ...(server.template.auth ? { auth: server.template.auth } : {}),
        }),
    configSnippets: {
      json: `${jsonSnippet}\n`,
      codexToml: codexTomlMcpServerSnippet(server),
    },
  };
}

function toolViewTemplate(
  id: string,
  setupSurface: string,
  options: { hasMcpTemplate?: boolean } = {},
): XenesisConnectionToolViewTemplate {
  return {
    viewType: 'connection-detail',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface,
    openPath: 'xd.xenesis.tools.views.open',
    openArgs: { id },
    connectionCardId: id,
    internalViews: options.hasMcpTemplate
      ? ['connection-card', 'setup-recipe', 'mcp-template']
      : ['connection-card', 'setup-recipe'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.views.status',
      'xd.xenesis.tools.setup.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
    diagnostics: options.hasMcpTemplate
      ? ['mcp-settings-status', 'missing-env', 'template-snippet']
      : ['mcp-settings-status', 'missing-env'],
    safetyBoundaries: [
      'view opens internal setup/readiness surfaces only',
      'tool execution remains behind provider MCP tools and CR approval paths',
    ],
  };
}

const TOOL_CONNECTIONS: XenesisConnectionItem[] = [
  {
    id: 'fetch',
    kind: 'tool',
    label: 'Fetch',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for reading web pages as model context.',
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
    mcpTemplate: mcpTemplateFor('fetch'),
    toolView: toolViewTemplate('fetch', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolSetup: {
      connection: 'mcp',
      authMode: 'none',
      dataScopes: ['webpage:read'],
      writeScopes: [],
      credentialStorage: 'none',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'fetch-known-url', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['verify fetched content source', 'avoid sending private URLs to untrusted providers'],
    },
    setupSteps: [
      'Install the Fetch MCP server in the local CLI MCP settings.',
      'Verify the MCP bridge and provider CLI can list the fetch tools before relying on web context.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'filesystem',
    kind: 'tool',
    label: 'Filesystem',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for workspace-scoped file reads.',
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
    mcpTemplate: mcpTemplateFor('filesystem'),
    toolView: toolViewTemplate('filesystem', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolSetup: {
      connection: 'mcp',
      authMode: 'none',
      dataScopes: ['workspace:read-files', 'workspace:list-files', 'workspace:search-files'],
      writeScopes: [],
      credentialStorage: 'workspace root in MCP config',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'workspace-directory-list', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['scope filesystem to the active workspace', 'route writes through Desk approval paths'],
    },
    setupSteps: [
      'Install the filesystem MCP server with the active workspace root as its only scope.',
      'Keep write operations routed through Xenesis Desk CR paths so approval and audit records stay aligned.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'github',
    kind: 'tool',
    label: 'GitHub',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for repositories, issues, and pull requests.',
    requiredEnv: ['GITHUB_TOKEN'],
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
    mcpTemplate: mcpTemplateFor('github'),
    toolView: toolViewTemplate('github', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolSetup: {
      connection: 'mcp',
      authMode: 'env-token',
      dataScopes: ['github:search-code', 'github:read-repos', 'github:read-issues', 'github:read-pull-requests'],
      writeScopes: ['github:writes-disabled-until-approved'],
      credentialStorage: 'GITHUB_TOKEN environment variable',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'github-repo-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['use narrow repository scopes', 'verify read tools before writes'],
    },
    setupSteps: [
      'Create a GitHub token with the narrow repository scopes needed for the workspace.',
      'Set GITHUB_TOKEN in the environment used by the provider CLI or MCP server.',
      'Install the GitHub MCP server and verify repository read tools before enabling write workflows.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Recommended MCP tool for Notion pages and databases.',
    requiredEnv: ['NOTION_TOKEN'],
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
    mcpTemplate: mcpTemplateFor('notion'),
    toolView: toolViewTemplate('notion', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolSetup: {
      connection: 'mcp',
      authMode: 'env-token',
      dataScopes: ['notion:search', 'notion:read-pages', 'notion:read-databases'],
      writeScopes: ['notion:writes-disabled-until-approved'],
      credentialStorage: 'NOTION_TOKEN environment variable',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'notion-search-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['share only required pages/databases', 'verify read tools before writes'],
    },
    setupSteps: [
      'Create a Notion integration and share the needed pages or databases with it.',
      'Set NOTION_TOKEN in the environment used by the provider CLI or MCP server.',
      'Install the Notion MCP server and verify search/read tools before adding write workflows.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'linear',
    kind: 'tool',
    label: 'Linear',
    status: 'needs-setup',
    summary: 'Recommended OAuth MCP tool for Linear issues and projects.',
    settingsTarget: 'mcp',
    supportLevel: 'manual',
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
    mcpTemplate: mcpTemplateFor('linear'),
    toolView: toolViewTemplate('linear', 'Settings > AI Provider > Local CLI MCP', { hasMcpTemplate: true }),
    toolSetup: {
      connection: 'oauth-mcp',
      authMode: 'oauth',
      dataScopes: ['linear:read-issues', 'linear:read-projects', 'linear:read-comments'],
      writeScopes: ['linear:update-issues-after-approval', 'linear:create-comments-after-approval'],
      credentialStorage: 'OAuth token managed by the MCP client',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['mcp-server-listed', 'oauth-authorized', 'linear-issue-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['complete OAuth in the browser', 'keep issue updates approval-gated'],
    },
    setupSteps: [
      'Add the Linear hosted MCP endpoint to the provider CLI or local MCP config.',
      'Complete the OAuth flow in the browser when the provider asks for authorization.',
      'Verify issue/project read tools before enabling update workflows.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
  },
  {
    id: 'google-workspace',
    kind: 'tool',
    label: 'Google Workspace',
    status: 'planned',
    summary: 'Planned MCP connection for Google Workspace after a verified template is selected.',
    settingsTarget: 'mcp',
    supportLevel: 'planned',
    crActions: [],
    toolView: toolViewTemplate('google-workspace', 'Settings > AI Provider > Local CLI MCP'),
    toolSetup: {
      connection: 'oauth-mcp',
      authMode: 'oauth',
      dataScopes: ['google-drive.readonly', 'gmail.readonly', 'documents.readonly'],
      writeScopes: ['google-writes-disabled-until-template-verified'],
      credentialStorage: 'OAuth token store from the selected MCP server',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['oauth-consent-reviewed', 'drive-list-read', 'gmail-profile-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['review OAuth consent scopes', 'prefer read-only workspace scopes until writes are verified'],
    },
    setupSteps: [
      'Choose a verified Google Workspace MCP server with OAuth support before exposing install actions.',
      'Keep OAuth consent, token storage, and workspace data scopes visible in the setup view.',
      'Prefer read-only Drive/Gmail/Docs scopes until write approval behavior is verified.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
    warnings: ['No verified install template is bundled yet.'],
  },
  {
    id: 'google-calendar',
    kind: 'tool',
    label: 'Google Calendar',
    status: 'planned',
    summary: 'Planned MCP connection for calendar context and scheduling workflows.',
    settingsTarget: 'mcp',
    supportLevel: 'planned',
    crActions: [],
    toolView: toolViewTemplate('google-calendar', 'Settings > AI Provider > Local CLI MCP'),
    toolSetup: {
      connection: 'oauth-mcp',
      authMode: 'oauth',
      dataScopes: ['calendar.calendarlist.readonly', 'calendar.events.readonly', 'calendar.freebusy.readonly'],
      writeScopes: ['calendar-writes-disabled-until-template-verified'],
      credentialStorage: 'OAuth token store from the selected MCP server',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['oauth-consent-reviewed', 'calendar-list-read', 'calendar-events-read', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
      riskControls: ['review calendar scopes before scheduling', 'keep create/update/delete approval-gated'],
    },
    setupSteps: [
      'Select a verified Google Calendar MCP/OAuth server before exposing install actions.',
      'Require explicit calendar scope review before scheduling or event mutation is enabled.',
      'Verify read-only calendar listing before enabling create/update/delete workflows.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
    warnings: ['No verified install template is bundled yet.'],
  },
];

const MESSENGERS: Array<{
  id: XenesisProfileChannelName;
  label: string;
  setupSteps: string[];
  sourceDocs: XenesisConnectionSourceDoc[];
  channelTemplate: XenesisConnectionChannelTemplate;
}> = [
  {
    id: 'telegram',
    label: 'Telegram',
    setupSteps: [
      'Create a Telegram bot token and store it in the configured token environment variable.',
      'Limit allowed chat IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw Telegram', url: 'https://docs.openclaw.ai/channels/telegram' }],
    channelTemplate: {
      category: 'consumer',
      adapter: 'bot-api',
      auth: 'bot token',
      capabilities: ['direct-messages', 'groups', 'files'],
      safetyControls: ['allowlist', 'bot-loop-protection', 'approval-guardrails'],
      routing: {
        routeBinding: 'telegram.allowedChatIds',
        allowlistFields: ['allowedChatIds'],
        pairing: 'bot token',
        defaultAgent: 'xenesis-agent',
        sessionScope: 'chat',
        diagnostics: ['missing-env', 'safe-to-deliver', 'last-error'],
        deliveryFeatures: ['direct-messages', 'groups', 'files'],
      },
      safety: {
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
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'safety status is read-only',
          'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
          'channel writes stay on profile update CR paths',
          'delivery tests stay on profile test CR paths',
        ],
      },
    },
  },
  {
    id: 'slack',
    label: 'Slack',
    setupSteps: [
      'Create a Slack app with bot token, signing secret, and optional webhook URL.',
      'Limit allowed channel IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw Slack', url: 'https://docs.openclaw.ai/channels/slack' }],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'bot-api',
      auth: 'bot token and signing secret',
      capabilities: ['channels', 'threads', 'files'],
      safetyControls: ['allowlist', 'signature-verification', 'bot-loop-protection', 'approval-guardrails'],
      routing: {
        routeBinding: 'slack.allowedChannelIds',
        allowlistFields: ['allowedChannelIds'],
        pairing: 'Slack app bot token and signing secret',
        defaultAgent: 'xenesis-agent',
        sessionScope: 'channel-thread',
        diagnostics: ['missing-env', 'signature-check', 'safe-to-deliver', 'last-error'],
        deliveryFeatures: ['channels', 'threads', 'files'],
      },
      safety: {
        accessModel: 'signature-verified',
        accessGroupFields: ['allowedChannelIds'],
        inboundBoundary: 'slack channel allowlist and signing secret',
        outboundBoundary: 'same channel or thread scope as inbound route',
        loopProtection: [
          'ignore messages authored by the Slack bot user',
          'avoid channels where Xenesis can receive its own webhook output',
          'verify delivery with sanitized test messages before enabling action workflows',
        ],
        approvalGuardrails: ['readonly', 'safe', 'auto'],
        troubleshooting: ['missing-env', 'signature-check', 'allowlist-empty', 'safe-to-deliver', 'last-error'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'safety status is read-only',
          'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
          'channel writes stay on profile update CR paths',
          'delivery tests stay on profile test CR paths',
        ],
      },
    },
  },
  {
    id: 'discord',
    label: 'Discord',
    setupSteps: [
      'Create a Discord bot token or webhook URL and store it in the configured environment variable.',
      'Limit allowed channel and guild IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw Discord', url: 'https://docs.openclaw.ai/channels/discord' }],
    channelTemplate: {
      category: 'community',
      adapter: 'bot-api',
      auth: 'bot token or webhook URL',
      capabilities: ['channels', 'guilds', 'files'],
      safetyControls: ['allowlist', 'guild-scope', 'bot-loop-protection', 'approval-guardrails'],
      routing: {
        routeBinding: 'discord.allowedChannelIds',
        allowlistFields: ['allowedChannelIds', 'allowedGuildIds'],
        pairing: 'Discord bot token or webhook URL',
        defaultAgent: 'xenesis-agent',
        sessionScope: 'guild-channel',
        diagnostics: ['missing-env', 'guild-scope', 'safe-to-deliver', 'last-error'],
        deliveryFeatures: ['channels', 'guilds', 'files'],
      },
      safety: {
        accessModel: 'allowlist',
        accessGroupFields: ['allowedChannelIds', 'allowedGuildIds'],
        inboundBoundary: 'discord guild and channel allowlist',
        outboundBoundary: 'same guild-channel scope as inbound route',
        loopProtection: [
          'ignore messages authored by the Discord bot account',
          'avoid channels where Xenesis can receive its own webhook output',
          'verify delivery with sanitized test messages before enabling action workflows',
        ],
        approvalGuardrails: ['readonly', 'safe', 'auto'],
        troubleshooting: ['missing-env', 'guild-scope', 'allowlist-empty', 'safe-to-deliver', 'last-error'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'safety status is read-only',
          'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
          'channel writes stay on profile update CR paths',
          'delivery tests stay on profile test CR paths',
        ],
      },
    },
  },
  {
    id: 'webhook',
    label: 'Webhook',
    setupSteps: [
      'Create or select the inbound webhook URL environment variable.',
      'Keep webhook auth and network exposure constrained to trusted callers.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'Hermes user stories', url: 'https://hermes-agent.nousresearch.com/docs/user-stories' }],
    channelTemplate: {
      category: 'developer',
      adapter: 'webhook',
      auth: 'shared secret or protected inbound URL',
      capabilities: ['inbound-events', 'custom-routing'],
      safetyControls: ['network-boundary', 'request-auth', 'approval-guardrails'],
      routing: {
        routeBinding: 'webhook.urlEnv',
        allowlistFields: ['urlEnv'],
        pairing: 'protected inbound URL',
        defaultAgent: 'xenesis-agent',
        sessionScope: 'request',
        diagnostics: ['missing-env', 'network-boundary', 'last-error'],
        deliveryFeatures: ['inbound-events', 'custom-routing'],
      },
      safety: {
        accessModel: 'network-boundary',
        accessGroupFields: ['urlEnv'],
        inboundBoundary: 'protected webhook URL or shared secret boundary',
        outboundBoundary: 'request-scoped response boundary',
        loopProtection: [
          'avoid endpoints that post responses back into the same inbound URL',
          'keep webhook callers scoped to trusted automation',
          'verify delivery with sanitized test messages before enabling action workflows',
        ],
        approvalGuardrails: ['readonly', 'safe', 'auto'],
        troubleshooting: ['missing-env', 'network-boundary', 'request-auth', 'last-error', 'gateway-status'],
        readPaths: [
          'xd.xenesis.connections.status',
          'xd.xenesis.channels.routing.status',
          'xd.xenesis.channels.safety.status',
        ],
        controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
        safetyBoundaries: [
          'safety status is read-only',
          'access groups are represented by configured allowlist fields, not a separate OpenClaw runtime',
          'channel writes stay on profile update CR paths',
          'delivery tests stay on profile test CR paths',
        ],
      },
    },
  },
];

type PlannedMessengerDefinition = Omit<XenesisConnectionItem, 'kind' | 'status' | 'supportLevel' | 'warnings'> & {
  warnings?: string[];
};

function messengerViewTemplate(
  id: string,
  runtimeSupport: XenesisConnectionMessengerViewTemplate['runtimeSupport'],
): XenesisConnectionMessengerViewTemplate {
  const implemented = runtimeSupport === 'implemented';
  return {
    viewType: 'messenger-detail',
    runtimeSupport,
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: implemented ? 'Settings > Xenesis Agent > External bots' : 'Settings > Xenesis Agent > Connections',
    openPath: 'xd.xenesis.messengers.views.open',
    openArgs: { id },
    connectionCardId: id,
    internalViews: implemented
      ? ['connection-card', 'channel-template', 'routing', 'external-bot-settings']
      : ['connection-card', 'channel-template', 'planning-card'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.messengers.views.status',
      ...(implemented ? ['xd.xenesis.channels.routing.status', 'xd.xenesis.gateway.status'] : []),
    ],
    controlPaths: implemented
      ? [
          'xd.xenesis.messengers.views.open',
          'xd.xenesis.connections.open',
          'xd.xenesis.profiles.updateChannels',
          'xd.xenesis.profiles.testChannel',
          'xd.panes.settings.open',
        ]
      : ['xd.xenesis.messengers.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
    diagnostics: implemented
      ? ['gateway-status', 'missing-env', 'allowlist', 'last-error']
      : ['planned-adapter', 'required-auth', 'safety-review'],
    safetyBoundaries: implemented
      ? [
          'implemented channels still require gateway readiness before delivery',
          'channel writes and test sends stay on existing profile CR paths',
        ]
      : [
          'planned channels open setup/readiness planning views only',
          'no gateway adapter, pairing flow, or delivery action is exposed until runtime support exists',
        ],
  };
}

function plannedMessenger(definition: PlannedMessengerDefinition): XenesisConnectionItem {
  return {
    ...definition,
    kind: 'messenger',
    status: 'planned',
    supportLevel: 'planned',
    messengerView: messengerViewTemplate(definition.id, 'planned'),
    crActions: [],
    warnings: definition.warnings ?? [`No ${definition.label} gateway adapter is bundled yet.`],
  };
}

function openClawDoc(label: string, slug: string): XenesisConnectionSourceDoc {
  return { label: `OpenClaw ${label}`, url: `https://docs.openclaw.ai/channels/${slug}` };
}

const PLANNED_MESSENGERS: XenesisConnectionItem[] = [
  plannedMessenger({
    id: 'whatsapp',
    label: 'WhatsApp',
    summary: 'Planned mobile messenger channel; keep manual until provider, webhook, and delivery safety are verified.',
    setupSteps: [
      'Select a verified WhatsApp Business or OpenClaw-compatible provider adapter.',
      'Document allowed sender IDs before remote prompts are accepted.',
      'Verify delivery and bot-loop behavior before enabling action workflows.',
    ],
    sourceDocs: [openClawDoc('WhatsApp', 'whatsapp')],
    channelTemplate: {
      category: 'consumer',
      adapter: 'provider-webhook',
      auth: 'business provider token and webhook signature',
      capabilities: ['direct-messages', 'media'],
      safetyControls: ['sender-allowlist', 'webhook-signature', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'signal',
    label: 'Signal',
    summary: 'Planned privacy messenger channel after a verified bridge and account pairing flow are selected.',
    setupSteps: [
      'Select and document the Signal bridge or pairing runtime.',
      'Require explicit account pairing and sender allowlists before accepting prompts.',
      'Verify bridge reconnect behavior before enabling long-running sessions.',
    ],
    sourceDocs: [openClawDoc('Signal', 'signal')],
    channelTemplate: {
      category: 'consumer',
      adapter: 'bridge',
      auth: 'paired device or bridge account',
      capabilities: ['direct-messages', 'groups', 'media'],
      safetyControls: ['sender-allowlist', 'pairing-review', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'microsoft-teams',
    label: 'Microsoft Teams',
    summary:
      'Planned enterprise messenger channel; keep manual until adapter, auth, and allowed-team controls are verified.',
    setupSteps: [
      'Define the Teams app/bot registration path and tenant restrictions.',
      'Verify allowed-team and allowed-channel controls before enabling remote prompts.',
      'Confirm Graph or Bot Framework scopes before adding write actions.',
    ],
    sourceDocs: [openClawDoc('Microsoft Teams', 'msteams')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'bot-framework',
      auth: 'tenant app registration and bot secret',
      capabilities: ['channels', 'threads', 'files'],
      safetyControls: ['tenant-scope', 'channel-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'google-chat',
    label: 'Google Chat',
    summary:
      'Planned external messenger channel after a verified gateway adapter and OAuth/service-account setup are selected.',
    setupSteps: [
      'Select a verified Google Chat app or webhook adapter before exposing runtime enablement.',
      'Document workspace installation, allowed spaces, and bot loop protection before activation.',
      'Keep service-account or OAuth scopes visible in the setup view.',
    ],
    sourceDocs: [
      openClawDoc('Google Chat', 'googlechat'),
      {
        label: 'Hermes Google Chat messaging',
        url: 'https://hermes-agent.nousresearch.com/docs/user-guide/messaging/google_chat',
      },
    ],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'workspace-app',
      auth: 'workspace app, service account, or OAuth',
      capabilities: ['spaces', 'threads', 'cards'],
      safetyControls: ['workspace-scope', 'space-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'imessage',
    label: 'iMessage',
    summary:
      'Planned Apple Messages channel; keep manual until host pairing, routing, and privacy controls are verified.',
    setupSteps: [
      'Choose native iMessage or BlueBubbles bridge architecture.',
      'Document host, account, and recipient allowlist requirements.',
      'Verify local-host privacy and reconnect behavior before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('iMessage', 'imessage'), openClawDoc('BlueBubbles iMessage', 'imessage-from-bluebubbles')],
    channelTemplate: {
      category: 'consumer',
      adapter: 'desktop-bridge',
      auth: 'paired Apple account or BlueBubbles server credentials',
      capabilities: ['direct-messages', 'attachments'],
      safetyControls: ['recipient-allowlist', 'host-boundary', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'matrix',
    label: 'Matrix',
    summary: 'Planned federated chat channel after homeserver, room, and push-rule behavior are verified.',
    setupSteps: [
      'Configure the Matrix homeserver and bot account.',
      'Restrict allowed rooms before enabling delivery.',
      'Review push rules and migration behavior before long-running sessions.',
    ],
    sourceDocs: [
      openClawDoc('Matrix', 'matrix'),
      openClawDoc('Matrix migration', 'matrix-migration'),
      openClawDoc('Matrix push rules', 'matrix-push-rules'),
    ],
    channelTemplate: {
      category: 'community',
      adapter: 'bot-api',
      auth: 'homeserver access token',
      capabilities: ['rooms', 'threads', 'files'],
      safetyControls: ['room-allowlist', 'homeserver-scope', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'irc',
    label: 'IRC',
    summary: 'Planned legacy chat channel after server, channel, and nickname controls are defined.',
    setupSteps: [
      'Define IRC server, TLS, nickname, and channel configuration.',
      'Limit allowed channels before accepting prompts.',
      'Keep command parsing conservative because IRC messages are plain text.',
    ],
    sourceDocs: [openClawDoc('IRC', 'irc')],
    channelTemplate: {
      category: 'community',
      adapter: 'socket-bot',
      auth: 'server password, NickServ, or none',
      capabilities: ['channels', 'plain-text'],
      safetyControls: ['channel-allowlist', 'command-prefix', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'mattermost',
    label: 'Mattermost',
    summary: 'Planned self-hosted enterprise channel after server and team scopes are verified.',
    setupSteps: [
      'Configure the Mattermost server URL and bot token.',
      'Restrict allowed teams and channels before enabling prompts.',
      'Verify attachment and thread behavior before write workflows.',
    ],
    sourceDocs: [openClawDoc('Mattermost', 'mattermost')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'bot-api',
      auth: 'server URL and bot token',
      capabilities: ['channels', 'threads', 'files'],
      safetyControls: ['team-allowlist', 'channel-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'nextcloud-talk',
    label: 'Nextcloud Talk',
    summary: 'Planned collaboration channel after Nextcloud server, room, and credential handling are verified.',
    setupSteps: [
      'Configure the Nextcloud base URL and app password or token.',
      'Restrict allowed conversations before accepting prompts.',
      'Verify file sharing behavior before enabling write workflows.',
    ],
    sourceDocs: [openClawDoc('Nextcloud Talk', 'nextcloud-talk')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'server-api',
      auth: 'Nextcloud app password or token',
      capabilities: ['rooms', 'files'],
      safetyControls: ['room-allowlist', 'server-boundary', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'nostr',
    label: 'Nostr',
    summary: 'Planned decentralized channel after relay, key, and identity controls are defined.',
    setupSteps: [
      'Define relay list and bot identity storage.',
      'Restrict accepted authors or event kinds before accepting prompts.',
      'Avoid exposing private keys in Desk settings.',
    ],
    sourceDocs: [openClawDoc('Nostr', 'nostr')],
    channelTemplate: {
      category: 'community',
      adapter: 'relay-client',
      auth: 'Nostr key material or signer',
      capabilities: ['relays', 'events'],
      safetyControls: ['author-allowlist', 'key-boundary', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'raft',
    label: 'Raft',
    summary: 'Planned OpenClaw Raft channel until adapter semantics and routing controls are mapped into Xenesis.',
    setupSteps: [
      'Map the Raft channel adapter requirements into Xenesis gateway config.',
      'Document route IDs and allowed peers before accepting prompts.',
      'Verify loop protection before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('Raft', 'raft')],
    channelTemplate: {
      category: 'developer',
      adapter: 'openclaw-adapter',
      auth: 'adapter-specific credentials',
      capabilities: ['custom-routing'],
      safetyControls: ['peer-allowlist', 'route-review', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'tlon',
    label: 'Tlon',
    summary: 'Planned Tlon channel until identity, group, and routing behavior are verified.',
    setupSteps: [
      'Document Tlon identity and group requirements.',
      'Restrict allowed groups before accepting prompts.',
      'Verify inbound/outbound loop behavior.',
    ],
    sourceDocs: [openClawDoc('Tlon', 'tlon')],
    channelTemplate: {
      category: 'community',
      adapter: 'platform-api',
      auth: 'platform identity credentials',
      capabilities: ['groups', 'direct-messages'],
      safetyControls: ['group-allowlist', 'identity-review', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'synology-chat',
    label: 'Synology Chat',
    summary: 'Planned self-hosted chat channel after webhook/token behavior is verified.',
    setupSteps: [
      'Configure the Synology Chat server and integration token.',
      'Restrict allowed channels before accepting prompts.',
      'Verify server trust and outbound delivery behavior.',
    ],
    sourceDocs: [openClawDoc('Synology Chat', 'synology-chat')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'server-webhook',
      auth: 'server token or webhook secret',
      capabilities: ['channels', 'webhooks'],
      safetyControls: ['server-boundary', 'channel-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'twitch',
    label: 'Twitch',
    summary: 'Planned livestream chat channel after broadcaster, moderator, and chat-rate controls are verified.',
    setupSteps: [
      'Configure Twitch app credentials or bot OAuth.',
      'Restrict allowed channels and broadcaster IDs.',
      'Apply conservative rate limits before enabling replies.',
    ],
    sourceDocs: [openClawDoc('Twitch', 'twitch')],
    channelTemplate: {
      category: 'community',
      adapter: 'chat-api',
      auth: 'OAuth token',
      capabilities: ['channels', 'chat'],
      safetyControls: ['channel-allowlist', 'rate-limit', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'line',
    label: 'LINE',
    summary: 'Planned regional messenger channel after LINE bot credentials and allowed rooms are verified.',
    setupSteps: [
      'Configure LINE channel secret and access token.',
      'Restrict allowed user, group, or room IDs before accepting prompts.',
      'Verify webhook signature behavior before delivery.',
    ],
    sourceDocs: [openClawDoc('LINE', 'line')],
    channelTemplate: {
      category: 'regional',
      adapter: 'bot-api',
      auth: 'channel secret and access token',
      capabilities: ['direct-messages', 'groups', 'media'],
      safetyControls: ['signature-verification', 'room-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'wechat',
    label: 'WeChat',
    summary: 'Planned regional messenger channel after official account or bot adapter setup is verified.',
    setupSteps: [
      'Choose the WeChat official account or bot adapter path.',
      'Document account verification, callback, and allowed sender requirements.',
      'Verify delivery constraints before write workflows.',
    ],
    sourceDocs: [openClawDoc('WeChat', 'wechat')],
    channelTemplate: {
      category: 'regional',
      adapter: 'official-account',
      auth: 'official account token and callback secret',
      capabilities: ['direct-messages', 'media'],
      safetyControls: ['sender-allowlist', 'callback-verification', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'qqbot',
    label: 'QQ Bot',
    summary: 'Planned regional bot channel after QQ bot app credentials and group controls are verified.',
    setupSteps: [
      'Configure QQ Bot app credentials and callback endpoint.',
      'Restrict allowed groups before accepting prompts.',
      'Verify callback signatures before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('QQ Bot', 'qqbot')],
    channelTemplate: {
      category: 'regional',
      adapter: 'bot-api',
      auth: 'app credentials and callback signature',
      capabilities: ['groups', 'direct-messages'],
      safetyControls: ['group-allowlist', 'signature-verification', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'feishu',
    label: 'Feishu / Lark',
    summary: 'Planned enterprise messenger channel after tenant app credentials and chat scopes are verified.',
    setupSteps: [
      'Configure Feishu/Lark app ID, secret, and event subscription.',
      'Restrict allowed chats or tenant before accepting prompts.',
      'Verify event signature behavior before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('Feishu', 'feishu')],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'tenant-app',
      auth: 'app ID, app secret, and event verification token',
      capabilities: ['chats', 'threads', 'cards'],
      safetyControls: ['tenant-scope', 'chat-allowlist', 'signature-verification', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'yuanbao',
    label: 'Yuanbao',
    summary: 'Planned regional assistant channel until adapter and account controls are mapped into Xenesis.',
    setupSteps: [
      'Document Yuanbao adapter credentials and supported message events.',
      'Restrict allowed accounts or rooms before accepting prompts.',
      'Verify human/bot loop behavior before enabling delivery.',
    ],
    sourceDocs: [openClawDoc('Yuanbao', 'yuanbao')],
    channelTemplate: {
      category: 'regional',
      adapter: 'platform-adapter',
      auth: 'platform-specific credentials',
      capabilities: ['direct-messages'],
      safetyControls: ['account-allowlist', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'zalo',
    label: 'Zalo',
    summary: 'Planned regional messenger channel after Zalo bot/user adapter and delivery controls are verified.',
    setupSteps: [
      'Choose the Zalo bot or user adapter path.',
      'Restrict allowed users or groups before accepting prompts.',
      'Verify callback auth and rate limits before enabling replies.',
    ],
    sourceDocs: [
      openClawDoc('Zalo', 'zalo'),
      openClawDoc('Zalo Bot', 'zaloclawbot'),
      openClawDoc('Zalo User', 'zalouser'),
    ],
    channelTemplate: {
      category: 'regional',
      adapter: 'bot-or-user-adapter',
      auth: 'adapter-specific token or session',
      capabilities: ['direct-messages', 'groups', 'media'],
      safetyControls: ['sender-allowlist', 'rate-limit', 'bot-loop-protection', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'email',
    label: 'Email',
    summary: 'Planned asynchronous inbox channel after mailbox, sender, and thread controls are verified.',
    setupSteps: [
      'Select IMAP/SMTP, Gmail, or workspace mailbox adapter.',
      'Restrict accepted sender addresses and target folders before accepting prompts.',
      'Keep attachments and outbound replies approval-gated.',
    ],
    sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
    channelTemplate: {
      category: 'enterprise',
      adapter: 'mailbox',
      auth: 'OAuth or app password',
      capabilities: ['threads', 'attachments', 'asynchronous'],
      safetyControls: ['sender-allowlist', 'folder-scope', 'attachment-review', 'approval-guardrails'],
    },
    warnings: ['No Email gateway adapter is bundled yet.'],
  }),
  plannedMessenger({
    id: 'sms',
    label: 'SMS',
    summary: 'Planned SMS channel after provider, sender number, and recipient controls are verified.',
    setupSteps: [
      'Select the SMS provider and sender number.',
      'Restrict allowed phone numbers before accepting prompts.',
      'Keep outbound messages short and approval-gated.',
    ],
    sourceDocs: [openClawDoc('SMS', 'sms')],
    channelTemplate: {
      category: 'consumer',
      adapter: 'provider-webhook',
      auth: 'provider API key and webhook signature',
      capabilities: ['direct-messages', 'asynchronous'],
      safetyControls: ['phone-allowlist', 'webhook-signature', 'rate-limit', 'approval-guardrails'],
    },
  }),
  plannedMessenger({
    id: 'home-assistant',
    label: 'Home Assistant',
    summary: 'Planned automation channel after local network, entity, and action safety boundaries are defined.',
    setupSteps: [
      'Configure Home Assistant URL and long-lived token.',
      'Restrict allowed entities and service calls before enabling prompts.',
      'Route mutating home actions through explicit approval.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
    channelTemplate: {
      category: 'iot',
      adapter: 'local-api',
      auth: 'long-lived access token',
      capabilities: ['events', 'entity-state', 'automation'],
      safetyControls: ['entity-allowlist', 'network-boundary', 'approval-guardrails'],
    },
    warnings: ['No Home Assistant gateway adapter is bundled yet.'],
  }),
  plannedMessenger({
    id: 'ntfy',
    label: 'ntfy',
    summary: 'Planned push-notification channel after topic, token, and delivery controls are verified.',
    setupSteps: [
      'Configure ntfy server, topic, and token if required.',
      'Restrict allowed topics before accepting prompts.',
      'Keep one-way notifications separate from interactive sessions until reply behavior exists.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
    channelTemplate: {
      category: 'developer',
      adapter: 'push-topic',
      auth: 'topic token or none',
      capabilities: ['notifications'],
      safetyControls: ['topic-allowlist', 'network-boundary', 'approval-guardrails'],
    },
    warnings: ['No ntfy gateway adapter is bundled yet.'],
  }),
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

const LOCAL_PROVIDER_NAMES = ['codex-cli', 'codex-app-server', 'claude-cli', 'claude-interactive'] as const;

function isLocalProviderName(provider: string): boolean {
  return (LOCAL_PROVIDER_NAMES as readonly string[]).includes(provider);
}

function providerAuthMode(provider: string): XenesisConnectionProviderSetupTemplate['authMode'] {
  if (provider === 'auto') return 'auto-detect';
  if (isLocalProviderName(provider)) return 'local-login';
  if (provider === 'ollama' || provider === 'lmstudio') return 'none';
  return 'api-key';
}

function providerCredentialStorage(authMode: XenesisConnectionProviderSetupTemplate['authMode']): string {
  if (authMode === 'auto-detect') return 'credential scan: Codex login, Claude login, then env keys';
  if (authMode === 'local-login') return 'local CLI login or app-server session';
  if (authMode === 'none') return 'none';
  return 'AI Provider settings secret field';
}

function providerSetupTemplate(
  aiProvider: BuildXenesisConnectionsStatusInput['aiProvider'],
  xenesis: XenesisStatus | null,
): XenesisConnectionProviderSetupTemplate {
  const authMode = providerAuthMode(aiProvider.provider);
  const needsCredential = authMode === 'api-key';
  return {
    source: aiProvider.provider === 'auto' ? 'auto-detect' : 'user-settings',
    provider: aiProvider.provider,
    model: aiProvider.model || 'default',
    authMode,
    credentialState: needsCredential ? (aiProvider.apiKey ? 'configured' : 'missing') : 'not-required',
    credentialStorage: providerCredentialStorage(authMode),
    endpoint: aiProvider.baseUrl || xenesis?.providerRuntime.baseURL || 'default',
    runtimeProfile: xenesis?.providerRuntime.profile || xenesis?.profile.active || '',
    runtimeProvider: xenesis?.providerRuntime.provider || aiProvider.provider,
    runtimeModel: xenesis?.providerRuntime.model || aiProvider.model || 'default',
    providerRetries: xenesis?.profile.policy.providerRetries ?? 0,
    fallbackPolicy: 'configured-providerFallbacks',
    localCliBoundary: 'provider identity is separate from local CLI integration',
    verification: ['normal-chat', 'provider-footer', 'cr-readback'],
    crReadPaths: ['xd.xenesis.connections.status', 'xd.xenesis.providers.setup.status', 'xd.xenesis.status'],
    riskControls: [
      'do not silently switch keyed providers when credentials are missing',
      'keep local CLI selection separate from provider identity',
      'verify live Agent pane provider before Desk-control claims',
    ],
  };
}

function providerCredentialState(
  provider: string,
  apiKeyEnv: string,
  env: Record<string, string | undefined>,
  directSecret = false,
): XenesisConnectionProviderCredentialState {
  const authMode = providerAuthMode(provider);
  if (authMode === 'none' || authMode === 'local-login' || authMode === 'auto-detect') return 'not-required';
  if (directSecret) return 'configured';
  return apiKeyEnv && env[apiKeyEnv] ? 'configured' : 'missing';
}

function providerRoutingTemplate(
  aiProvider: BuildXenesisConnectionsStatusInput['aiProvider'],
  xenesis: XenesisStatus | null,
  providerFallbacks: XenesisConnectionProviderFallbackInput[] = [],
  env: Record<string, string | undefined> = {},
): XenesisConnectionProviderRoutingTemplate {
  const activeProvider = aiProvider.provider;
  const activeModel = aiProvider.model || 'default';
  const runtimeProvider = xenesis?.providerRuntime.provider || activeProvider;
  const runtimeModel = xenesis?.providerRuntime.model || activeModel;
  const runtimeProfile = xenesis?.providerRuntime.profile || xenesis?.profile.active || '';
  const runtimeApiKeyEnv = xenesis?.providerRuntime.apiKeyEnv || '';
  const fallbackChain = providerFallbacks.map((fallback, index) => ({
    index: index + 1,
    provider: fallback.provider,
    model: fallback.model || runtimeModel,
    baseURLState: fallback.baseURL ? ('custom' as const) : ('default' as const),
    apiKeyEnv: fallback.apiKeyEnv || '',
    credentialState: providerCredentialState(fallback.provider, fallback.apiKeyEnv || '', env),
  }));

  return {
    routeSource: 'user-settings-profile',
    activeProvider,
    activeModel,
    runtimeProfile,
    runtimeProvider,
    runtimeModel,
    retryPolicy: {
      maxRetries: xenesis?.profile.policy.providerRetries ?? 0,
      source: 'profile.policy.providerRetries',
    },
    fallbackPolicy: 'configured-providerFallbacks',
    fallbackChainSource: 'xenesis-runtime-config',
    fallbackChainVisible: fallbackChain.length > 0,
    fallbackChain,
    credentialPools: [
      {
        provider: runtimeProvider,
        apiKeyEnv: runtimeApiKeyEnv,
        credentialState: providerCredentialState(runtimeProvider, runtimeApiKeyEnv, env, Boolean(aiProvider.apiKey)),
        source: 'runtime',
      },
      ...fallbackChain.map((fallback) => ({
        provider: fallback.provider,
        apiKeyEnv: fallback.apiKeyEnv,
        credentialState: fallback.credentialState,
        source: 'fallback' as const,
      })),
    ],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.providers.routing.status',
      'xd.xenesis.status',
    ],
    diagnostics: ['provider-footer', 'work-log-provider', 'provider_retry', 'provider_fallback', 'cr-readback'],
    safetyBoundaries: [
      'routing status is read-only',
      'provider identity comes from user settings and profile',
      'fallback entries expose env names and credential state only, never secret values',
      'local CLI selection remains separate from provider identity',
      'missing keyed-provider credentials must not silently fall back',
    ],
  };
}

function providerViewTemplate(provider: string): XenesisConnectionProviderViewTemplate {
  return {
    viewType: 'provider-detail',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > AI Provider',
    openPath: 'xd.xenesis.providers.views.open',
    openArgs: { provider },
    connectionCardId: `provider-${provider}`,
    internalViews: ['connection-card', 'provider-setup', 'provider-runtime', 'fallback-policy', 'credential-boundary'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
      'xd.xenesis.providers.views.status',
      'xd.xenesis.status',
    ],
    controlPaths: ['xd.xenesis.providers.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
    diagnostics: ['provider-footer', 'work-log-provider', 'credential-state', 'runtime-profile', 'fallback-policy'],
    safetyBoundaries: [
      'provider view opens internal setup/readiness surfaces only',
      'provider identity comes from user settings and profile',
      'local CLI selection remains separate from provider identity',
      'missing keyed-provider credentials must not silently fall back',
    ],
  };
}

function providerItem(
  aiProvider: BuildXenesisConnectionsStatusInput['aiProvider'],
  xenesis: XenesisStatus | null,
  providerFallbacks: XenesisConnectionProviderFallbackInput[] = [],
  env: Record<string, string | undefined> = {},
): XenesisConnectionItem {
  const isLocalProvider = [
    'auto',
    'codex-cli',
    'codex-app-server',
    'claude-cli',
    'claude-interactive',
    'ollama',
    'lmstudio',
  ].includes(aiProvider.provider);
  const hasCredential = isLocalProvider || Boolean(aiProvider.apiKey);
  const hasModel = isLocalProvider || Boolean(aiProvider.model);
  return {
    id: `provider-${aiProvider.provider}`,
    kind: 'provider',
    label: `AI provider: ${aiProvider.provider}`,
    status: hasCredential && hasModel ? 'ready' : 'blocked',
    supportLevel: 'implemented',
    summary:
      hasCredential && hasModel
        ? 'Provider has enough settings for first chat.'
        : 'Provider needs a model or credential before reliable Agent use.',
    settingsTarget: 'run-model',
    settingsAction: { category: 'run-model', section: 'default' },
    providerSetup: providerSetupTemplate(aiProvider, xenesis),
    providerView: providerViewTemplate(aiProvider.provider),
    providerRouting: providerRoutingTemplate(aiProvider, xenesis, providerFallbacks, env),
    setupSteps: [
      'Choose the provider in AI Provider settings.',
      'Set a model and credential only when the selected provider requires them.',
      'Verify the Agent pane footer shows the intended provider before live Desk-control tests.',
    ],
    warnings: hasCredential && hasModel ? [] : ['Check AI Provider settings.'],
  };
}

function mcpItem(mcp: McpSettingsStatus): XenesisConnectionItem {
  return {
    id: 'xenesis-desk-mcp',
    kind: 'mcp',
    label: 'Xenesis Desk MCP',
    status: mcp.available && mcp.bridgeUrl ? 'ready' : 'blocked',
    supportLevel: 'implemented',
    summary:
      mcp.available && mcp.bridgeUrl ? `Bridge available at ${mcp.bridgeUrl}.` : 'MCP bridge status is not available.',
    settingsTarget: 'mcp',
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
    crActions: ['xd.mcp.settings.status'],
    setupSteps: [
      'Install the Xenesis Desk MCP bridge for the active local CLI provider.',
      'Verify the bridge URL and state file before running external agent control.',
      'Use CR readback paths after control calls to confirm state changes.',
    ],
    warnings: mcp.available ? [] : ['Install or start the Xenesis Desk MCP bridge.'],
  };
}

function localCliItems(providerIntegration: ProviderIntegrationStatus): XenesisConnectionItem[] {
  return providerIntegration.cliTargets.map((target) => ({
    id: `local-cli-${target.id}`,
    kind: 'local-cli',
    label: target.label,
    status: target.mcpInstalled || target.skillInstalled ? 'ready' : 'needs-setup',
    supportLevel: 'implemented',
    summary:
      target.mcpInstalled || target.skillInstalled
        ? 'Local CLI integration files are installed.'
        : 'Local CLI integration can be installed from AI Provider settings.',
    settingsTarget: 'run-model',
    settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
    crActions: ['xd.mcp.settings.status'],
    setupSteps: [
      `Install the ${target.label} MCP or skill integration from AI Provider settings.`,
      'Keep local CLI selection separate from the reasoning provider.',
      'Verify the installed integration appears in the provider work log before live CR control.',
    ],
  }));
}

function gatewayItem(xenesis: XenesisStatus | null): XenesisConnectionItem {
  if (!xenesis) {
    return {
      id: 'xenesis-gateway',
      kind: 'gateway',
      label: 'Xenesis Gateway',
      status: 'unknown',
      supportLevel: 'implemented',
      summary: 'Gateway status could not be read.',
      settingsTarget: 'xenesis-agent',
      settingsAction: { category: 'xenesis-agent', mode: 'gateway', section: 'gateway' },
      crActions: ['xd.xenesis.gateway.status'],
      setupSteps: [
        'Open Xenesis Agent gateway settings.',
        'Verify the gateway status path before starting external messenger channels.',
      ],
    };
  }
  return {
    id: 'xenesis-gateway',
    kind: 'gateway',
    label: 'Xenesis Gateway',
    status: xenesis.gateway.running ? 'ready' : xenesis.gateway.enabled ? 'needs-setup' : 'disabled',
    supportLevel: 'implemented',
    summary: xenesis.gateway.running
      ? `Gateway is running at ${xenesis.gateway.url || xenesis.url}.`
      : 'Gateway is stopped.',
    settingsTarget: 'xenesis-agent',
    settingsAction: { category: 'xenesis-agent', mode: 'gateway', section: 'gateway' },
    crActions: [
      'xd.xenesis.gateway.status',
      'xd.xenesis.gateway.start',
      'xd.xenesis.gateway.stop',
      'xd.xenesis.gateway.restart',
    ],
    warnings: xenesis.gateway.running ? [] : ['Start the gateway before using external messenger channels.'],
  };
}

function channelStatus(xenesis: XenesisStatus | null, name: XenesisGatewayChannelName): XenesisConnectionStatus {
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
  return MESSENGERS.map(({ id, label, setupSteps, sourceDocs, channelTemplate }) => {
    const runtime = xenesis?.gateway.channels?.[id];
    return {
      id,
      kind: 'messenger',
      label,
      status: channelStatus(xenesis, id),
      supportLevel: 'implemented',
      summary: runtime?.ready ? `${label} is ready to deliver messages.` : `${label} needs gateway and channel setup.`,
      missingEnv: runtime?.missingEnv,
      settingsTarget: 'xenesis-agent',
      settingsAction: { category: 'xenesis-agent', mode: 'external-bots', section: 'external-bots' },
      crActions: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
      setupSteps,
      sourceDocs,
      channelTemplate,
      messengerView: messengerViewTemplate(id, 'implemented'),
      warnings: [...(runtime?.warnings ?? []), ...(runtime?.lastError ? [runtime.lastError.message] : [])],
    };
  });
}

function hasReadyItem(items: XenesisConnectionItem[]): boolean {
  return items.some((item) => item.status === 'ready');
}

function hasBlockedItem(items: XenesisConnectionItem[]): boolean {
  return items.some((item) => item.status === 'blocked');
}

function onboardingStatusForReadyOrBlocked(
  ready: boolean,
  blocked: boolean,
  fallback: XenesisConnectionStatus = 'needs-setup',
): XenesisConnectionStatus {
  if (ready) return 'ready';
  if (blocked) return 'blocked';
  return fallback;
}

function onboardingItems(sections: Omit<XenesisConnectionsStatus['sections'], 'onboarding'>): XenesisConnectionItem[] {
  const provider = sections.provider.items[0];
  const mcp = sections.mcp.items[0];
  const gateway = sections.gateway.items[0];
  const implementedMessengers = sections.messengers.items.filter((item) => item.supportLevel === 'implemented');
  const actionableTools = sections.tools.items.filter((item) => item.supportLevel === 'manual');
  const localCliReady = hasReadyItem(sections.localCli.items);
  const mcpReady = mcp?.status === 'ready';
  const messengerReady = hasReadyItem(implementedMessengers);
  const messengerBlocked = hasBlockedItem(implementedMessengers);
  const gatewayReady = gateway?.status === 'ready';

  return [
    {
      id: 'first-chat',
      kind: 'onboarding',
      label: '1. First chat',
      status: provider?.status === 'ready' ? 'ready' : 'blocked',
      supportLevel: 'implemented',
      summary: 'AI provider and model readiness for the first Xenesis Agent response.',
      settingsTarget: 'run-model',
      settingsAction: { category: 'run-model', section: 'default' },
      setupSteps: [
        'Choose the active AI provider from user settings.',
        'Confirm the selected provider has the required model and credential.',
        'Run a normal Agent pane chat before testing Desk-control prompts.',
      ],
      crActions: ['xd.xenesis.connections.status'],
      warnings: provider?.warnings,
    },
    {
      id: 'local-cli-mcp',
      kind: 'onboarding',
      label: '2. Local CLI and MCP',
      status: onboardingStatusForReadyOrBlocked(localCliReady && mcpReady, mcp?.status === 'blocked'),
      supportLevel: 'implemented',
      summary: 'Local CLI integration and Xenesis Desk MCP bridge readiness for CR-capable providers.',
      settingsTarget: 'run-model',
      settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
      setupSteps: [
        'Install the selected local CLI integration when the provider needs it.',
        'Register the Xenesis Desk MCP bridge for that local CLI.',
        'Verify MCP status through the Connection Center before relying on external agent control.',
      ],
      crActions: ['xd.mcp.settings.status', 'xd.xenesis.connections.status'],
    },
    {
      id: 'recommended-tools',
      kind: 'onboarding',
      label: '3. Recommended tools',
      status: actionableTools.length > 0 ? 'needs-setup' : 'ready',
      supportLevel: 'manual',
      summary: 'Manual MCP recipes for Fetch, Filesystem, GitHub, Notion, Linear, and planned Google tools.',
      settingsTarget: 'mcp',
      settingsAction: { category: 'run-model', mode: 'local', section: 'local-cli' },
      setupSteps: [
        'Install only the MCP tools needed for the current workspace.',
        'Use narrow tokens and scopes for GitHub, Notion, Linear, Google Workspace, and Calendar integrations.',
        'Verify read tools before enabling write workflows or remote actions.',
      ],
      sourceDocs: [{ label: 'Hermes integrations', url: 'https://hermes-agent.nousresearch.com/docs/integrations/' }],
    },
    {
      id: 'gateway',
      kind: 'onboarding',
      label: '4. Gateway',
      status: gateway?.status ?? 'unknown',
      supportLevel: 'implemented',
      summary: 'Gateway lifecycle readiness before any external messenger can deliver prompts.',
      settingsTarget: 'xenesis-agent',
      settingsAction: { category: 'xenesis-agent', mode: 'gateway', section: 'gateway' },
      setupSteps: [
        'Enable and start the Xenesis Gateway.',
        'Verify the gateway URL and runtime status through CR readback.',
        'Keep gateway restart/stop actions on CR paths so audit records remain visible.',
      ],
      crActions: ['xd.xenesis.gateway.status', 'xd.xenesis.gateway.start', 'xd.xenesis.gateway.restart'],
      warnings: gateway?.warnings,
    },
    {
      id: 'messenger-routing',
      kind: 'onboarding',
      label: '5. Messenger routing',
      status: onboardingStatusForReadyOrBlocked(
        messengerReady,
        messengerBlocked,
        gatewayReady ? 'needs-setup' : 'blocked',
      ),
      supportLevel: 'implemented',
      summary: 'External messenger channel configuration, allowlists, and route safety.',
      settingsTarget: 'xenesis-agent',
      settingsAction: { category: 'xenesis-agent', mode: 'external-bots', section: 'external-bots' },
      setupSteps: [
        'Configure one supported channel: Telegram, Slack, Discord, or webhook.',
        'Set required token or webhook environment variable names without storing secrets in Desk settings.',
        'Add the chat, channel, guild, or webhook allowlist before enabling delivery.',
        'Avoid channels where Xenesis can receive its own outbound messages.',
      ],
      sourceDocs: [{ label: 'OpenClaw channel routing', url: 'https://docs.openclaw.ai/channels/channel-routing' }],
      crActions: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
    },
    {
      id: 'test-send',
      kind: 'onboarding',
      label: '6. End-to-end test',
      status: onboardingStatusForReadyOrBlocked(provider?.status === 'ready' && gatewayReady && messengerReady, false),
      supportLevel: 'implemented',
      summary: 'Sanitized channel test send and CR readback after setup.',
      settingsTarget: 'xenesis-agent',
      settingsAction: { category: 'xenesis-agent', mode: 'external-bots', section: 'external-bots' },
      setupSteps: [
        'Use the per-channel test button or CR test path with a sanitized message.',
        'Confirm the runtime status stays ready after the test send.',
        'Inspect diagnostics or bot session records if delivery fails.',
      ],
      crActions: ['xd.xenesis.profiles.testChannel', 'xd.xenesis.connections.status'],
    },
  ];
}

export function buildXenesisConnectionsStatus(input: BuildXenesisConnectionsStatusInput): XenesisConnectionsStatus {
  const baseSections: Omit<XenesisConnectionsStatus['sections'], 'onboarding'> = {
    provider: {
      id: 'provider',
      label: 'AI Provider',
      items: [providerItem(input.aiProvider, input.xenesis, input.providerFallbacks, input.env)],
    },
    localCli: { id: 'local-cli', label: 'Local CLI integration', items: localCliItems(input.providerIntegration) },
    mcp: { id: 'mcp', label: 'MCP bridge', items: [mcpItem(input.mcp)] },
    tools: { id: 'tools', label: 'Tool connections', items: TOOL_CONNECTIONS },
    gateway: { id: 'gateway', label: 'Gateway', items: [gatewayItem(input.xenesis)] },
    messengers: {
      id: 'messengers',
      label: 'Messengers',
      items: [...messengerItems(input.xenesis), ...PLANNED_MESSENGERS],
    },
    guides: {
      id: 'guides',
      label: 'Guides',
      items: withGuideOpenPaths(XENESIS_CONNECTION_GUIDES, input.repoRoot),
    },
  };
  const sections: XenesisConnectionsStatus['sections'] = {
    onboarding: { id: 'onboarding', label: 'Onboarding checklist', items: onboardingItems(baseSections) },
    ...baseSections,
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
