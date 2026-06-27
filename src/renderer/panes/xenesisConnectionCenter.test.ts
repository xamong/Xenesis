import assert from 'node:assert/strict';
import test from 'node:test';
import type { XenesisConnectionItem, XenesisConnectionsStatus } from '../../shared/types';
import {
  buildXenesisConnectionGuideRequest,
  buildXenesisConnectionOpenRequest,
  buildXenesisConnectionSettingsRequest,
  formatXenesisChannelRoutingSummary,
  formatXenesisProviderSetupSummary,
  formatXenesisToolSetupSummary,
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
