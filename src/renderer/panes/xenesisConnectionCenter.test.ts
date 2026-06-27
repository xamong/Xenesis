import assert from 'node:assert/strict';
import test from 'node:test';
import type { XenesisConnectionItem, XenesisConnectionsStatus } from '../../shared/types';
import {
  buildXenesisConnectionGuideRequest,
  buildXenesisConnectionOpenRequest,
  buildXenesisConnectionSettingsRequest,
  formatXenesisChannelAccessGroupsSummary,
  formatXenesisChannelPairingSummary,
  formatXenesisChannelRoutingSummary,
  formatXenesisChannelSafetySummary,
  formatXenesisGuideCatalogSummary,
  formatXenesisMessengerViewSummary,
  formatXenesisProviderRoutingSummary,
  formatXenesisProviderSetupSummary,
  formatXenesisProviderViewSummary,
  formatXenesisToolConnectorSummary,
  formatXenesisToolInstallPlanSummary,
  formatXenesisToolSetupSummary,
  formatXenesisToolUserStorySummary,
  formatXenesisToolViewSummary,
  listXenesisConnectionSections,
  XENESIS_CONNECTION_STATUS_ORDER,
  xenesisConnectionTone,
} from './xenesisConnectionCenter';

test('xenesisConnectionTone maps every status to a stable UI tone', () => {
  assert.deepEqual(XENESIS_CONNECTION_STATUS_ORDER, [
    'ready',
    'needs-setup',
    'blocked',
    'disabled',
    'planned',
    'unknown',
  ]);
  assert.equal(xenesisConnectionTone('ready'), 'success');
  assert.equal(xenesisConnectionTone('needs-setup'), 'warning');
  assert.equal(xenesisConnectionTone('blocked'), 'danger');
  assert.equal(xenesisConnectionTone('disabled'), 'muted');
  assert.equal(xenesisConnectionTone('planned'), 'info');
  assert.equal(xenesisConnectionTone('unknown'), 'neutral');
});

test('listXenesisConnectionSections preserves status section order', () => {
  const status = {
    ok: true,
    updatedAt: '2026-06-27T00:00:00.000Z',
    summary: {
      ready: 1,
      'needs-setup': 0,
      disabled: 0,
      blocked: 0,
      planned: 0,
      unknown: 0,
      total: 1,
    },
    sections: {
      onboarding: { id: 'onboarding', label: 'Onboarding checklist', items: [] },
      provider: { id: 'provider', label: 'Provider', items: [] },
      localCli: { id: 'local-cli', label: 'Local CLI', items: [] },
      mcp: { id: 'mcp', label: 'MCP', items: [] },
      tools: { id: 'tools', label: 'Tools', items: [] },
      gateway: { id: 'gateway', label: 'Gateway', items: [] },
      messengers: { id: 'messengers', label: 'Messengers', items: [] },
      guides: { id: 'guides', label: 'Guides', items: [] },
    },
    warnings: [],
  } satisfies XenesisConnectionsStatus;

  assert.deepEqual(
    listXenesisConnectionSections(status).map((section) => section.id),
    ['onboarding', 'provider', 'local-cli', 'mcp', 'tools', 'gateway', 'messengers', 'guides'],
  );
  assert.deepEqual(listXenesisConnectionSections(null), []);
});

test('buildXenesisConnectionOpenRequest focuses the connection card through CR', () => {
  const item = {
    id: 'signal',
    kind: 'messenger',
    label: 'Signal',
    status: 'planned',
    summary: 'Signal setup',
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisConnectionOpenRequest(item), {
    path: 'xd.xenesis.connections.open',
    args: {
      id: 'signal',
      ensureVisible: true,
    },
    source: 'xenesis',
    approved: true,
  });
});

test('buildXenesisConnectionSettingsRequest opens the configured settings target through CR', () => {
  const item = {
    id: 'notion',
    kind: 'tool',
    label: 'Notion',
    status: 'needs-setup',
    summary: 'Notion setup',
    settingsAction: {
      category: 'run-model',
      mode: 'local',
      section: 'local-cli',
    },
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisConnectionSettingsRequest(item), {
    path: 'xd.panes.settings.open',
    args: {
      category: 'run-model',
      mode: 'local',
      section: 'local-cli',
      ensureVisible: true,
    },
    source: 'xenesis',
    approved: true,
  });
});

test('buildXenesisConnectionGuideRequest opens repo-local guide files through CR', () => {
  const item = {
    id: 'guide',
    kind: 'guide',
    label: 'Guide',
    status: 'ready',
    summary: 'Guide setup',
    guidePath: 'docs/manual/09-onboarding-connections.md',
    guideOpenPath: 'E:\\xenesis-desk\\docs\\manual\\09-onboarding-connections.md',
  } satisfies XenesisConnectionItem;

  assert.deepEqual(buildXenesisConnectionGuideRequest(item), {
    path: 'xd.files.open',
    args: {
      filePath: 'E:\\xenesis-desk\\docs\\manual\\09-onboarding-connections.md',
      placement: 'tab',
    },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(buildXenesisConnectionGuideRequest({ ...item, guidePath: '', guideOpenPath: '' }), null);
});

test('formatXenesisChannelRoutingSummary describes route, default agent, and session scope', () => {
  assert.equal(
    formatXenesisChannelRoutingSummary({
      routeBinding: 'telegram.allowedChatIds',
      allowlistFields: ['allowedChatIds'],
      pairing: 'bot token',
      defaultAgent: 'xenesis-agent',
      sessionScope: 'chat',
      diagnostics: ['missing-env', 'safe-to-deliver'],
      deliveryFeatures: ['direct-messages', 'groups'],
    }),
    'telegram.allowedChatIds -> xenesis-agent (chat)',
  );
});

test('formatXenesisChannelSafetySummary describes access model, inbound boundary, and loop guard count', () => {
  assert.equal(
    formatXenesisChannelSafetySummary({
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
      troubleshooting: ['missing-env', 'allowlist-empty'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.profiles.updateChannels'],
      safetyBoundaries: ['safety status is read-only'],
    }),
    'allowlist / telegram chat allowlist / 3 loop guard(s)',
  );
});

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

test('formatXenesisChannelPairingSummary describes pairing model, account scope, and state', () => {
  assert.equal(
    formatXenesisChannelPairingSummary({
      model: 'env-token',
      runtimeSupport: 'implemented',
      accountScope: 'bot-account',
      credentialRefs: [{ ref: 'TELEGRAM_BOT_TOKEN', source: 'env', required: true, state: 'configured' }],
      pairingState: 'configured',
      setupSurface: 'Settings > Xenesis Agent > External bots',
      validationChecks: ['env-secret-configured'],
      readPaths: ['xd.xenesis.channels.pairing.status'],
      controlPaths: ['xd.xenesis.profiles.updateChannels'],
      diagnostics: ['pairing-secret-state'],
      safetyBoundaries: ['credential values are never returned'],
    }),
    'env-token / bot-account / configured',
  );
});

test('formatXenesisGuideCatalogSummary describes guide type, audience, and surface count', () => {
  assert.equal(
    formatXenesisGuideCatalogSummary({
      guideType: 'user-story-catalog',
      audience: 'agent',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      coveredSurfaces: ['ai-providers', 'external-tools', 'messengers', 'capability-registry'],
      prerequisites: ['connection catalog readback'],
      validationChecks: ['xd.xenesis.connections.status'],
      readPaths: ['xd.xenesis.guides.status'],
      controlPaths: ['xd.xenesis.guides.open'],
      userStoryTemplates: ['inspect active provider routing before running a task'],
      safetyBoundaries: ['guide catalog does not execute workflows'],
    }),
    'user-story-catalog / agent / 4 surface(s)',
  );
});

test('formatXenesisToolSetupSummary describes connection, auth, and setup surface', () => {
  assert.equal(
    formatXenesisToolSetupSummary({
      connection: 'mcp',
      authMode: 'env-token',
      dataScopes: ['notion:search'],
      writeScopes: ['notion:writes-disabled-until-approved'],
      credentialStorage: 'NOTION_TOKEN environment variable',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      verification: ['notion-search-read'],
      crReadPaths: ['xd.xenesis.connections.status'],
      riskControls: ['share only required pages/databases'],
    }),
    'mcp / env-token / Settings > AI Provider > Local CLI MCP',
  );
});

test('formatXenesisToolUserStorySummary describes workflow type, runtime support, and story count', () => {
  assert.equal(
    formatXenesisToolUserStorySummary({
      workflowType: 'calendar-context',
      runtimeSupport: 'planned-oauth',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      userStories: [
        'inspect upcoming meetings before an agent task',
        'summarize calendar context with read-only scopes',
        'draft scheduling actions only after explicit approval gates exist',
      ],
      prerequisiteConnectors: ['google-calendar'],
      requiredScopes: ['calendar.calendarlist.readonly', 'calendar.events.readonly'],
      readPaths: ['xd.xenesis.tools.userStories.status'],
      controlPaths: ['xd.xenesis.tools.userStories.open'],
      diagnostics: ['planned-oauth-template'],
      safetyBoundaries: ['planned OAuth calendar workflows do not create, update, or delete events'],
    }),
    'calendar-context / planned-oauth / 3 user story/stories',
  );
});

test('formatXenesisToolInstallPlanSummary describes install mode, runtime support, and step count', () => {
  assert.equal(
    formatXenesisToolInstallPlanSummary({
      installMode: 'copy-template',
      runtimeSupport: 'ready-template',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      installSurface: 'Settings > AI Provider > Local CLI MCP',
      installActions: ['open-local-cli-mcp-settings', 'copy-json-mcp-config', 'copy-codex-toml-config'],
      installSteps: [
        'copy the Notion MCP template into the selected local CLI MCP config',
        'set NOTION_TOKEN in the provider runtime environment',
        'verify xd.mcp.settings.status lists the server before tool use',
      ],
      configTargets: ['json-mcp-config', 'codex-toml'],
      requiredEnv: ['NOTION_TOKEN'],
      readPaths: ['xd.xenesis.tools.installPlans.status'],
      controlPaths: ['xd.xenesis.tools.installPlans.open'],
      diagnostics: ['missing-env'],
      safetyBoundaries: ['install plans do not execute shell commands or mutate MCP settings'],
    }),
    'copy-template / ready-template / 3 step(s)',
  );
});

test('formatXenesisProviderSetupSummary describes provider, model, and auth mode', () => {
  assert.equal(
    formatXenesisProviderSetupSummary({
      source: 'user-settings',
      provider: 'codex-app-server',
      model: 'gpt-5-codex',
      authMode: 'local-login',
      credentialState: 'not-required',
      credentialStorage: 'local CLI login or app-server session',
      endpoint: 'default',
      runtimeProfile: 'desk',
      runtimeProvider: 'codex-app-server',
      runtimeModel: 'gpt-5-codex',
      providerRetries: 0,
      fallbackPolicy: 'configured-providerFallbacks',
      localCliBoundary: 'provider identity is separate from local CLI integration',
      verification: ['normal-chat', 'provider-footer', 'cr-readback'],
      crReadPaths: ['xd.xenesis.connections.status', 'xd.xenesis.providers.setup.status', 'xd.xenesis.status'],
      riskControls: [
        'do not silently switch keyed providers when credentials are missing',
        'keep local CLI selection separate from provider identity',
        'verify live Agent pane provider before Desk-control claims',
      ],
    }),
    'codex-app-server / gpt-5-codex / local-login',
  );
});

test('formatXenesisProviderViewSummary describes internal Desk provider view surface and type', () => {
  assert.equal(
    formatXenesisProviderViewSummary({
      viewType: 'provider-detail',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider',
      openPath: 'xd.xenesis.providers.views.open',
      openArgs: { provider: 'codex-app-server' },
      connectionCardId: 'provider-codex-app-server',
      internalViews: ['connection-card', 'provider-setup', 'provider-runtime'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.providers.views.open'],
      diagnostics: ['provider-footer'],
      safetyBoundaries: ['provider view opens internal setup/readiness surfaces only'],
    }),
    'Settings > Xenesis Agent > Connections / provider-detail',
  );
});

test('formatXenesisToolViewSummary describes internal Desk tool view surface and type', () => {
  assert.equal(
    formatXenesisToolViewSummary({
      viewType: 'connection-detail',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      openPath: 'xd.xenesis.tools.views.open',
      openArgs: { id: 'notion' },
      connectionCardId: 'notion',
      internalViews: ['connection-card', 'setup-recipe', 'mcp-template'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.tools.views.open'],
      diagnostics: ['mcp-settings-status'],
      safetyBoundaries: ['view opens internal setup/readiness surfaces only'],
    }),
    'Settings > Xenesis Agent > Connections / connection-detail',
  );
});

test('formatXenesisToolConnectorSummary describes connector type, auth, and runtime support', () => {
  assert.equal(
    formatXenesisToolConnectorSummary({
      connectorType: 'mcp-stdio',
      authMode: 'env-token',
      runtimeSupport: 'ready-template',
      credentialRefs: [{ ref: 'NOTION_TOKEN', source: 'env', required: true, state: 'missing' }],
      credentialState: 'missing',
      dataScopes: ['notion:search'],
      writeScopes: ['notion:writes-disabled-until-approved'],
      setupSurface: 'Settings > AI Provider > Local CLI MCP',
      validationChecks: ['credential-state-redacted'],
      readPaths: ['xd.xenesis.tools.connectors.status'],
      controlPaths: ['xd.xenesis.tools.views.open'],
      diagnostics: ['missing-env'],
      safetyBoundaries: ['credential values are never returned'],
    }),
    'mcp-stdio / env-token / ready-template',
  );
});

test('formatXenesisProviderRoutingSummary describes active provider, fallbacks, and retries', () => {
  assert.equal(
    formatXenesisProviderRoutingSummary({
      routeSource: 'user-settings-profile',
      activeProvider: 'openai',
      activeModel: 'gpt-5.4-mini',
      runtimeProfile: 'desk',
      runtimeProvider: 'openai',
      runtimeModel: 'gpt-5.4-mini',
      retryPolicy: { maxRetries: 2, source: 'profile.policy.providerRetries' },
      fallbackPolicy: 'configured-providerFallbacks',
      fallbackChainSource: 'xenesis-runtime-config',
      fallbackChainVisible: true,
      fallbackChain: [
        {
          index: 1,
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          baseURLState: 'default',
          apiKeyEnv: 'ANTHROPIC_API_KEY',
          credentialState: 'configured',
        },
        {
          index: 2,
          provider: 'ollama',
          model: 'llama3.1',
          baseURLState: 'custom',
          apiKeyEnv: '',
          credentialState: 'not-required',
        },
      ],
      credentialPools: [],
      readPaths: [],
      diagnostics: [],
      safetyBoundaries: [],
    }),
    'openai -> 2 fallback(s) / retries 2',
  );
});

test('formatXenesisMessengerViewSummary describes internal Desk messenger view surface and runtime support', () => {
  assert.equal(
    formatXenesisMessengerViewSummary({
      viewType: 'messenger-detail',
      runtimeSupport: 'implemented',
      primarySurface: 'Settings > Xenesis Agent > Connections',
      setupSurface: 'Settings > Xenesis Agent > External bots',
      openPath: 'xd.xenesis.messengers.views.open',
      openArgs: { id: 'telegram' },
      connectionCardId: 'telegram',
      internalViews: ['connection-card', 'channel-template', 'routing', 'external-bot-settings'],
      readPaths: ['xd.xenesis.connections.status'],
      controlPaths: ['xd.xenesis.messengers.views.open'],
      diagnostics: ['gateway-status'],
      safetyBoundaries: ['implemented channels still require gateway readiness before delivery'],
    }),
    'Settings > Xenesis Agent > Connections / implemented',
  );
});
