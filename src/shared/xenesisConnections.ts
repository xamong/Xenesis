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
    summary:
      hasCredential && hasModel
        ? 'Provider has enough settings for first chat.'
        : 'Provider needs a model or credential before reliable Agent use.',
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
