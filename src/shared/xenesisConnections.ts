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
}> = [
  {
    id: 'telegram',
    label: 'Telegram',
    setupSteps: [
      'Create a Telegram bot token and store it in the configured token environment variable.',
      'Limit allowed chat IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
  },
  {
    id: 'slack',
    label: 'Slack',
    setupSteps: [
      'Create a Slack app with bot token, signing secret, and optional webhook URL.',
      'Limit allowed channel IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
  },
  {
    id: 'discord',
    label: 'Discord',
    setupSteps: [
      'Create a Discord bot token or webhook URL and store it in the configured environment variable.',
      'Limit allowed channel and guild IDs before enabling delivery from the gateway.',
      'Use the channel test action before relying on remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
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
  },
];

const PLANNED_MESSENGERS: XenesisConnectionItem[] = [
  {
    id: 'google-chat',
    kind: 'messenger',
    label: 'Google Chat',
    status: 'planned',
    summary:
      'Planned external messenger channel after a verified gateway adapter and OAuth/service-account setup are selected.',
    supportLevel: 'planned',
    setupSteps: [
      'Select a verified Google Chat app or webhook adapter before exposing runtime enablement.',
      'Document workspace installation, allowed spaces, and bot loop protection before activation.',
    ],
    sourceDocs: [
      {
        label: 'Hermes Google Chat messaging',
        url: 'https://hermes-agent.nousresearch.com/docs/user-guide/messaging/google_chat',
      },
    ],
    warnings: ['No Google Chat gateway adapter is bundled yet.'],
  },
  {
    id: 'microsoft-teams',
    kind: 'messenger',
    label: 'Microsoft Teams',
    status: 'planned',
    summary:
      'Planned enterprise messenger channel; keep as manual until adapter, auth, and allowed-team controls are verified.',
    supportLevel: 'planned',
    setupSteps: [
      'Define the Teams app/bot registration path and tenant restrictions.',
      'Verify allowed-team and allowed-channel controls before enabling remote prompts.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
    warnings: ['No Microsoft Teams gateway adapter is bundled yet.'],
  },
  {
    id: 'whatsapp',
    kind: 'messenger',
    label: 'WhatsApp',
    status: 'planned',
    summary:
      'Planned mobile messenger channel; keep as manual until provider, webhook, and delivery safety are verified.',
    supportLevel: 'planned',
    setupSteps: [
      'Select a verified WhatsApp Business provider before exposing runtime enablement.',
      'Document allowed sender IDs and approval behavior for remote actions.',
    ],
    sourceDocs: [{ label: 'OpenClaw channels', url: 'https://docs.openclaw.ai/channels' }],
    warnings: ['No WhatsApp gateway adapter is bundled yet.'],
  },
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
  return MESSENGERS.map(({ id, label, setupSteps, sourceDocs }) => {
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
    provider: { id: 'provider', label: 'AI Provider', items: [providerItem(input.aiProvider)] },
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
