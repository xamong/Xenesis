import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildXenesisConnectionsStatus,
  withXenesisConnectionSetupRequestReviews,
  XENESIS_CONNECTION_GUIDES,
} from './xenesisConnections';

const channelGuardrails = {
  approvalMode: 'safe' as const,
  maxTurns: 12,
  maxTokens: 120000,
};

const emptyChannelSettings = {
  telegram: { enabled: false, ...channelGuardrails, tokenEnv: 'TELEGRAM_BOT_TOKEN', allowedChatIds: '' },
  slack: {
    enabled: false,
    ...channelGuardrails,
    botTokenEnv: 'SLACK_BOT_TOKEN',
    signingSecretEnv: 'SLACK_SIGNING_SECRET',
    webhookUrlEnv: 'SLACK_WEBHOOK_URL',
    allowedChannelIds: '',
  },
  discord: {
    enabled: false,
    ...channelGuardrails,
    botTokenEnv: 'DISCORD_BOT_TOKEN',
    webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
    allowedChannelIds: '',
    allowedGuildIds: '',
  },
  webhook: { enabled: false, ...channelGuardrails, urlEnv: 'XENESIS_WEBHOOK_URL' },
};

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
          telegram: { enabled: true, ...channelGuardrails, tokenEnv: 'TELEGRAM_BOT_TOKEN', allowedChatIds: '123' },
          slack: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'SLACK_BOT_TOKEN',
            signingSecretEnv: 'SLACK_SIGNING_SECRET',
            webhookUrlEnv: 'SLACK_WEBHOOK_URL',
            allowedChannelIds: '',
          },
          discord: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'DISCORD_BOT_TOKEN',
            webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
            allowedChannelIds: '',
            allowedGuildIds: '',
          },
          webhook: { enabled: false, ...channelGuardrails, urlEnv: 'XENESIS_WEBHOOK_URL' },
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

  assert.equal(status.summary.ready, 13);
  assert.equal(status.sections.provider.items[0].status, 'ready');
  assert.equal(status.sections.mcp.items[0].status, 'ready');
  assert.equal(status.sections.gateway.items[0].status, 'ready');
  assert.equal(status.sections.messengers.items.find((item) => item.id === 'telegram')?.status, 'ready');
  assert.equal(status.sections.tools.items.find((item) => item.id === 'google-calendar')?.status, 'planned');
});

test('buildXenesisConnectionsStatus includes an ordered onboarding checklist', () => {
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
          telegram: { enabled: true, ...channelGuardrails, tokenEnv: 'TELEGRAM_BOT_TOKEN', allowedChatIds: '123' },
          slack: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'SLACK_BOT_TOKEN',
            signingSecretEnv: 'SLACK_SIGNING_SECRET',
            webhookUrlEnv: 'SLACK_WEBHOOK_URL',
            allowedChannelIds: '',
          },
          discord: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'DISCORD_BOT_TOKEN',
            webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
            allowedChannelIds: '',
            allowedGuildIds: '',
          },
          webhook: { enabled: false, ...channelGuardrails, urlEnv: 'XENESIS_WEBHOOK_URL' },
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

  assert.deepEqual(
    status.sections.onboarding.items.map((item) => item.id),
    ['first-chat', 'local-cli-mcp', 'recommended-tools', 'gateway', 'messenger-routing', 'test-send'],
  );
  assert.equal(status.sections.onboarding.items[0].status, 'ready');
  assert.equal(status.sections.onboarding.items[1].status, 'ready');
  assert.equal(status.sections.onboarding.items[2].status, 'needs-setup');
  assert.equal(status.sections.onboarding.items[3].status, 'ready');
  assert.equal(status.sections.onboarding.items[4].status, 'ready');
  assert.equal(status.sections.onboarding.items[5].status, 'ready');
  assert.deepEqual(status.sections.onboarding.items[4].settingsAction, {
    category: 'xenesis-agent',
    mode: 'external-bots',
    section: 'external-bots',
  });
  assert.ok(status.sections.onboarding.items[4].setupSteps?.some((step) => step.includes('allowlist')));
});

test('buildXenesisConnectionsStatus exposes onboarding plan metadata for initial setup steps', () => {
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
          telegram: { enabled: true, ...channelGuardrails, tokenEnv: 'TELEGRAM_BOT_TOKEN', allowedChatIds: '123' },
          slack: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'SLACK_BOT_TOKEN',
            signingSecretEnv: 'SLACK_SIGNING_SECRET',
            webhookUrlEnv: 'SLACK_WEBHOOK_URL',
            allowedChannelIds: '',
          },
          discord: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'DISCORD_BOT_TOKEN',
            webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
            allowedChannelIds: '',
            allowedGuildIds: '',
          },
          webhook: { enabled: false, ...channelGuardrails, urlEnv: 'XENESIS_WEBHOOK_URL' },
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

  const firstChat = status.sections.onboarding.items.find((item) => item.id === 'first-chat');
  assert.deepEqual(firstChat?.onboardingPlan, {
    phase: 'first-chat',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > AI Provider',
    statusReadPaths: [
      'xd.xenesis.onboarding.status',
      'xd.xenesis.connections.status',
      'xd.xenesis.providers.setup.status',
    ],
    controlPaths: ['xd.xenesis.onboarding.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
    validationChecks: ['provider-ready', 'normal-agent-chat', 'cr-readback'],
    diagnostics: ['provider-footer', 'runtime-provider', 'missing-credential'],
    safetyBoundaries: [
      'onboarding status is read-only',
      'provider settings are not mutated by onboarding reads',
      'credential values are never returned',
    ],
  });

  const messengerRouting = status.sections.onboarding.items.find((item) => item.id === 'messenger-routing');
  assert.deepEqual(messengerRouting?.onboardingPlan?.statusReadPaths, [
    'xd.xenesis.onboarding.status',
    'xd.xenesis.connections.status',
    'xd.xenesis.channels.routing.status',
    'xd.xenesis.channels.safety.status',
    'xd.xenesis.channels.accessGroups.status',
    'xd.xenesis.channels.pairing.status',
  ]);
  assert.deepEqual(messengerRouting?.onboardingPlan?.controlPaths, [
    'xd.xenesis.onboarding.open',
    'xd.xenesis.connections.open',
    'xd.xenesis.profiles.updateChannels',
    'xd.xenesis.profiles.testChannel',
  ]);
});

test('buildXenesisConnectionsStatus includes actionable setup recipes for MCP tools', () => {
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

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');

  assert.equal(notion?.supportLevel, 'manual');
  assert.deepEqual(notion?.settingsAction, {
    category: 'run-model',
    mode: 'local',
    section: 'local-cli',
  });
  assert.ok(notion?.setupSteps?.some((step) => step.includes('NOTION_TOKEN')));
  assert.ok(
    notion?.sourceDocs?.some((source) => source.url.includes('hermes-agent.nousresearch.com/docs/integrations')),
  );
});

test('buildXenesisConnectionsStatus exposes copy-ready recommended MCP templates', () => {
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
    repoRoot: 'E:/workspace/project',
  });

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

  assert.equal(notion?.mcpTemplate?.serverName, 'notion');
  assert.equal(notion?.mcpTemplate?.transport, 'stdio');
  assert.equal(notion?.mcpTemplate?.command, 'npx');
  assert.ok(notion?.mcpTemplate?.args?.includes('@notionhq/notion-mcp-server'));
  assert.deepEqual(notion?.mcpTemplate?.requiredEnv, ['NOTION_TOKEN']);
  assert.ok(notion?.mcpTemplate?.configSnippets.json.includes('"notion"'));
  assert.ok(notion?.mcpTemplate?.configSnippets.codexToml.includes('[mcp_servers.notion]'));
  assert.equal(calendar?.mcpTemplate, undefined);
});

test('buildXenesisConnectionsStatus exposes review-only MCP install drafts', () => {
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
    repoRoot: 'E:/workspace/project',
    env: {
      GITHUB_TOKEN: '',
      NOTION_TOKEN: 'secret-value-must-not-appear',
    },
  });

  const fetch = status.sections.tools.items.find((item) => item.id === 'fetch');
  const github = status.sections.tools.items.find((item) => item.id === 'github');
  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const linear = status.sections.tools.items.find((item) => item.id === 'linear');
  const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

  assert.equal(fetch?.mcpInstallDraft?.draftStatus, 'ready');
  assert.equal(fetch?.mcpInstallDraft?.serverName, 'fetch');
  assert.equal(fetch?.mcpInstallDraft?.actionInboxKind, 'xenesis-mcp-install-draft');
  assert.ok(fetch?.mcpInstallDraft?.configSnippets?.json.includes('"fetch"'));
  assert.ok(fetch?.mcpInstallDraft?.controlPaths.includes('xd.xenesis.tools.mcpInstallDrafts.request'));
  assert.ok(
    fetch?.mcpInstallDraft?.safetyBoundaries.some((boundary) => boundary.includes('does not write MCP config')),
  );

  assert.equal(github?.mcpInstallDraft?.draftStatus, 'missing-env');
  assert.deepEqual(github?.mcpInstallDraft?.requiredEnv, ['GITHUB_TOKEN']);
  assert.deepEqual(github?.mcpInstallDraft?.missingEnv, ['GITHUB_TOKEN']);

  assert.equal(notion?.mcpInstallDraft?.draftStatus, 'ready');
  assert.deepEqual(notion?.mcpInstallDraft?.missingEnv, []);
  assert.equal(JSON.stringify(notion?.mcpInstallDraft).includes('secret-value-must-not-appear'), false);

  assert.equal(linear?.mcpInstallDraft?.transport, 'http');
  assert.equal(linear?.mcpInstallDraft?.auth, 'oauth');
  assert.equal(linear?.mcpInstallDraft?.draftStatus, 'ready');

  assert.equal(calendar?.mcpInstallDraft?.draftStatus, 'planned');
  assert.equal(calendar?.mcpInstallDraft?.serverName, undefined);
  assert.equal(calendar?.mcpInstallDraft?.configSnippets, undefined);
  assert.equal(calendar?.mcpInstallDraft?.blockedActions.includes('install MCP server'), true);
});

test('buildXenesisConnectionsStatus exposes review-only tool OAuth drafts for planned Google tools', () => {
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
    env: {
      GOOGLE_OAUTH_TOKEN_STORE: 'secret-value-must-not-appear',
    },
  });

  const workspace = status.sections.tools.items.find((item) => item.id === 'google-workspace');
  const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');
  const notion = status.sections.tools.items.find((item) => item.id === 'notion');

  assert.equal(notion?.toolOAuthDraft, undefined);
  assert.equal(workspace?.toolOAuthDraft?.draftStatus, 'planned-template');
  assert.equal(workspace?.toolOAuthDraft?.actionInboxKind, 'xenesis-tool-oauth-draft');
  assert.equal(workspace?.toolOAuthDraft?.tool, 'google-workspace');
  assert.deepEqual(workspace?.toolOAuthDraft?.missingRequiredFields, ['oauthClient', 'redirectUri', 'tokenStore']);
  assert.ok(workspace?.toolOAuthDraft?.scopes.includes('gmail.readonly'));
  assert.ok(workspace?.toolOAuthDraft?.scopes.includes('documents.readonly'));
  assert.ok(workspace?.toolOAuthDraft?.profileFields.some((field) => field.field === 'oauthClient'));
  assert.ok(workspace?.toolOAuthDraft?.readPaths.includes('xd.xenesis.tools.oauthDrafts.status'));
  assert.ok(workspace?.toolOAuthDraft?.controlPaths.includes('xd.xenesis.tools.oauthDrafts.request'));
  assert.ok(workspace?.toolOAuthDraft?.blockedActions.includes('complete OAuth'));
  assert.ok(workspace?.toolOAuthDraft?.blockedActions.includes('store tokens'));

  assert.equal(calendar?.toolOAuthDraft?.draftStatus, 'planned-template');
  assert.equal(calendar?.toolOAuthDraft?.runtimeSupport, 'planned-oauth');
  assert.ok(calendar?.toolOAuthDraft?.scopes.includes('calendar.events.readonly'));
  assert.ok(calendar?.toolOAuthDraft?.scopes.includes('calendar.freebusy.readonly'));
  assert.ok(calendar?.toolOAuthDraft?.diagnostics.includes('scope-review'));
  assert.ok(
    calendar?.toolOAuthDraft?.safetyBoundaries.some((boundary) =>
      boundary.includes('tool OAuth drafts are review-only'),
    ),
  );
  assert.equal(JSON.stringify(calendar?.toolOAuthDraft).includes('secret-value-must-not-appear'), false);
});

test('buildXenesisConnectionsStatus exposes review-only tool action catalogs', () => {
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
    env: {
      NOTION_TOKEN: 'secret-value-must-not-appear',
    },
  });

  const fetch = status.sections.tools.items.find((item) => item.id === 'fetch');
  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const linear = status.sections.tools.items.find((item) => item.id === 'linear');
  const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

  assert.equal(fetch?.toolActionCatalog?.runtimeSupport, 'ready-template');
  assert.equal(fetch?.toolActionCatalog?.actionInboxKind, 'xenesis-tool-action-policy');
  assert.deepEqual(
    fetch?.toolActionCatalog?.groups.map((group) => group.kind),
    ['search', 'read'],
  );
  assert.equal(
    fetch?.toolActionCatalog?.groups.some((group) => group.kind === 'write'),
    false,
  );
  assert.ok(fetch?.toolActionCatalog?.readPaths.includes('xd.xenesis.tools.actions.status'));
  assert.ok(fetch?.toolActionCatalog?.controlPaths.includes('xd.xenesis.tools.actions.request'));

  assert.equal(notion?.toolActionCatalog?.runtimeSupport, 'ready-template');
  assert.ok(
    notion?.toolActionCatalog?.groups.some(
      (group) =>
        group.kind === 'search' &&
        group.actions.some((action) => action.toolNames.includes('search')) &&
        group.approvalPolicy === 'read-only',
    ),
  );
  assert.ok(
    notion?.toolActionCatalog?.groups.some(
      (group) =>
        group.kind === 'write' &&
        group.approvalPolicy === 'approval-gated' &&
        group.actions.some((action) => action.label.includes('Draft Notion updates')),
    ),
  );
  assert.equal(JSON.stringify(notion?.toolActionCatalog).includes('secret-value-must-not-appear'), false);

  assert.ok(
    linear?.toolActionCatalog?.groups.some(
      (group) =>
        group.kind === 'write' &&
        group.actions.some((action) => action.label.includes('issue updates and comments after approval')),
    ),
  );

  assert.equal(calendar?.toolActionCatalog?.runtimeSupport, 'planned-oauth');
  assert.ok(
    calendar?.toolActionCatalog?.groups.some(
      (group) =>
        group.kind === 'search' && group.actions.some((action) => action.toolNames.includes('gcal_find_meeting_times')),
    ),
  );
  assert.ok(
    calendar?.toolActionCatalog?.blockedActions.includes('create/update/delete calendar events without approval'),
  );
  assert.ok(
    calendar?.toolActionCatalog?.safetyBoundaries.some((boundary) =>
      boundary.includes('does not execute provider tools or mutate external systems'),
    ),
  );
});

test('buildXenesisConnectionsStatus keeps Google Calendar planned without fake install actions', () => {
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

  const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

  assert.equal(calendar?.status, 'planned');
  assert.equal(calendar?.supportLevel, 'planned');
  assert.equal(calendar?.settingsAction, undefined);
  assert.equal(
    calendar?.crActions?.some((action) => action.includes('install')),
    false,
  );
  assert.ok(calendar?.setupSteps?.some((step) => step.includes('Google Calendar')));
});

test('buildXenesisConnectionsStatus exposes tool setup auth, scope, verification, and CR readback metadata', () => {
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

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const googleWorkspace = status.sections.tools.items.find((item) => item.id === 'google-workspace');
  const googleCalendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

  assert.deepEqual(notion?.toolSetup, {
    connection: 'mcp',
    authMode: 'env-token',
    dataScopes: ['notion:search', 'notion:read-pages', 'notion:read-databases'],
    writeScopes: ['notion:writes-disabled-until-approved'],
    credentialStorage: 'NOTION_TOKEN environment variable',
    setupSurface: 'Settings > AI Provider > Local CLI MCP',
    verification: ['mcp-server-listed', 'notion-search-read', 'cr-readback'],
    crReadPaths: ['xd.xenesis.connections.status', 'xd.mcp.settings.status'],
    riskControls: ['share only required pages/databases', 'verify read tools before writes'],
  });
  assert.equal(googleWorkspace?.toolSetup?.authMode, 'oauth');
  assert.ok(googleWorkspace?.toolSetup?.dataScopes.includes('google-drive.readonly'));
  assert.ok(googleWorkspace?.toolSetup?.writeScopes.includes('google-writes-disabled-until-template-verified'));
  assert.equal(googleCalendar?.toolSetup?.authMode, 'oauth');
  assert.ok(googleCalendar?.toolSetup?.dataScopes.includes('calendar.events.readonly'));
  assert.ok(googleCalendar?.toolSetup?.verification.includes('calendar-list-read'));
  assert.equal(googleCalendar?.mcpTemplate, undefined);
  assert.equal(googleCalendar?.settingsAction, undefined);
});

test('buildXenesisConnectionsStatus exposes redacted external tool connector readiness', () => {
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
    env: {
      GITHUB_TOKEN: 'ghp_redacted',
      NOTION_TOKEN: '',
    },
  });

  const github = status.sections.tools.items.find((item) => item.id === 'github');
  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const googleCalendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

  assert.equal(github?.toolConnector?.credentialState, 'configured');
  assert.deepEqual(notion?.toolConnector, {
    connectorType: 'mcp-stdio',
    authMode: 'env-token',
    runtimeSupport: 'ready-template',
    credentialRefs: [{ ref: 'NOTION_TOKEN', source: 'env', required: true, state: 'missing' }],
    credentialState: 'missing',
    dataScopes: ['notion:search', 'notion:read-pages', 'notion:read-databases'],
    writeScopes: ['notion:writes-disabled-until-approved'],
    setupSurface: 'Settings > AI Provider > Local CLI MCP',
    validationChecks: ['mcp-server-listed', 'credential-state-redacted', 'notion-search-read', 'cr-readback'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.connectors.status',
      'xd.xenesis.tools.setup.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open'],
    diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet'],
    safetyBoundaries: [
      'credential values are never returned',
      'tool execution remains behind provider MCP tools and CR approval paths',
    ],
  });
  assert.equal(googleCalendar?.toolConnector?.runtimeSupport, 'planned-oauth');
  assert.equal(googleCalendar?.toolConnector?.credentialState, 'planned');
  assert.deepEqual(googleCalendar?.toolConnector?.credentialRefs, [
    { ref: 'GOOGLE_OAUTH_TOKEN_STORE', source: 'oauth-client', required: false, state: 'planned' },
  ]);
});

test('buildXenesisConnectionsStatus exposes internal Desk tool views for MCP and planned tools', () => {
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

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const googleCalendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

  assert.deepEqual(notion?.toolView, {
    viewType: 'connection-detail',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > AI Provider > Local CLI MCP',
    openPath: 'xd.xenesis.tools.views.open',
    openArgs: { id: 'notion' },
    connectionCardId: 'notion',
    internalViews: ['connection-card', 'setup-recipe', 'mcp-template'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.views.status',
      'xd.xenesis.tools.setup.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: ['xd.xenesis.tools.views.open', 'xd.xenesis.connections.open', 'xd.panes.settings.open'],
    diagnostics: ['mcp-settings-status', 'missing-env', 'template-snippet'],
    safetyBoundaries: [
      'view opens internal setup/readiness surfaces only',
      'tool execution remains behind provider MCP tools and CR approval paths',
    ],
  });
  assert.deepEqual(googleCalendar?.toolView?.internalViews, ['connection-card', 'setup-recipe']);
  assert.equal(googleCalendar?.toolView?.openArgs.id, 'google-calendar');
  assert.equal(googleCalendar?.toolView?.diagnostics.includes('template-snippet'), false);
});

test('buildXenesisConnectionsStatus exposes Hermes-style tool user-story workflows', () => {
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

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const googleCalendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');
  const googleWorkspace = status.sections.tools.items.find((item) => item.id === 'google-workspace');

  assert.deepEqual(notion?.toolUserStory, {
    workflowType: 'knowledge-capture',
    runtimeSupport: 'ready-template',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > AI Provider > Local CLI MCP',
    userStories: [
      'search Notion pages before answering a workspace question',
      'summarize a selected Notion database as task context',
      'draft Notion updates only after approval-gated write tooling exists',
    ],
    prerequisiteConnectors: ['notion'],
    requiredScopes: ['notion:search', 'notion:read-pages', 'notion:read-databases'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.userStories.status',
      'xd.xenesis.tools.connectors.status',
      'xd.xenesis.tools.views.status',
      'xd.xenesis.guides.status',
    ],
    controlPaths: ['xd.xenesis.tools.userStories.open', 'xd.xenesis.tools.views.open', 'xd.xenesis.guides.open'],
    diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    safetyBoundaries: [
      'user-story workflows are read/open planning surfaces',
      'tool execution stays behind provider MCP tools and CR approval paths',
      'writes require separate verified tool actions',
    ],
  });
  assert.equal(googleWorkspace?.toolUserStory?.workflowType, 'inbox-triage');
  assert.equal(googleCalendar?.toolUserStory?.workflowType, 'calendar-context');
  assert.equal(googleCalendar?.toolUserStory?.runtimeSupport, 'planned-oauth');
  assert.ok(googleCalendar?.toolUserStory?.requiredScopes.includes('calendar.events.readonly'));
  assert.ok(
    googleCalendar?.toolUserStory?.safetyBoundaries.includes(
      'planned OAuth calendar workflows do not create, update, or delete events',
    ),
  );
});

test('buildXenesisConnectionsStatus exposes on-demand tool install plans without executing installs', () => {
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

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const googleCalendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');

  assert.deepEqual(notion?.toolInstallPlan, {
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
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.tools.installPlans.status',
      'xd.xenesis.tools.setup.status',
      'xd.xenesis.tools.connectors.status',
      'xd.mcp.settings.status',
    ],
    controlPaths: [
      'xd.xenesis.tools.installPlans.open',
      'xd.xenesis.tools.views.open',
      'xd.xenesis.connections.open',
      'xd.panes.settings.open',
    ],
    diagnostics: ['missing-env', 'mcp-settings-status', 'template-snippet', 'cr-readback'],
    safetyBoundaries: [
      'install plans are read/open planning surfaces',
      'install plans do not execute shell commands or mutate MCP settings',
      'secret values are never stored or returned',
      'tool writes require separate verified approval-gated actions',
    ],
  });
  assert.equal(googleCalendar?.toolInstallPlan?.installMode, 'planned-oauth');
  assert.equal(googleCalendar?.toolInstallPlan?.runtimeSupport, 'planned-oauth');
  assert.deepEqual(googleCalendar?.toolInstallPlan?.installActions, []);
  assert.deepEqual(googleCalendar?.toolInstallPlan?.requiredEnv, []);
  assert.ok(
    googleCalendar?.toolInstallPlan?.safetyBoundaries.includes(
      'planned OAuth install plans do not complete OAuth or create calendar events',
    ),
  );
});

test('buildXenesisConnectionsStatus exposes provider setup identity, credential state, and fallback policy', () => {
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
        running: false,
        managed: true,
        url: 'http://127.0.0.1:3846',
        host: '127.0.0.1',
        port: 3846,
        workspace: 'E:/workspace/project',
        error: '',
        updatedAt: '2026-06-27T00:00:00.000Z',
        channels: { total: 0, enabled: 0, ready: 0, blocked: 0, disabled: 0, items: [] },
      },
      profile: {
        active: 'desk',
        configured: 'desk',
        installed: ['desk'],
        templates: [],
        channels: [],
        channelSettings: {
          telegram: { enabled: false, ...channelGuardrails, tokenEnv: 'TELEGRAM_BOT_TOKEN', allowedChatIds: '' },
          slack: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'SLACK_BOT_TOKEN',
            signingSecretEnv: 'SLACK_SIGNING_SECRET',
            webhookUrlEnv: 'SLACK_WEBHOOK_URL',
            allowedChannelIds: '',
          },
          discord: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'DISCORD_BOT_TOKEN',
            webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
            allowedChannelIds: '',
            allowedGuildIds: '',
          },
          webhook: { enabled: false, ...channelGuardrails, urlEnv: 'XENESIS_WEBHOOK_URL' },
        },
        policy: {
          workflow: 'default',
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

  const provider = status.sections.provider.items[0];

  assert.deepEqual(provider.providerSetup, {
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
  });
});

test('buildXenesisConnectionsStatus exposes review-only provider profile drafts', () => {
  const readyStatus = buildXenesisConnectionsStatus({
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

  const readyDraft = readyStatus.sections.provider.items[0].providerProfileDraft;
  assert.equal(readyDraft?.draftStatus, 'ready');
  assert.equal(readyDraft?.actionInboxKind, 'xenesis-provider-profile-draft');
  assert.equal(readyDraft?.provider, 'codex-app-server');
  assert.deepEqual(readyDraft?.missingRequiredFields, []);
  assert.equal(readyDraft?.profileFields.find((field) => field.field === 'credential')?.valueState, 'not-required');
  assert.equal(readyDraft?.guardrails.localCliBoundary, 'provider identity is separate from local CLI integration');
  assert.ok(readyDraft?.readPaths.includes('xd.xenesis.providers.profileDrafts.status'));
  assert.ok(readyDraft?.controlPaths.includes('xd.xenesis.providers.profileDrafts.request'));
  assert.ok(readyDraft?.blockedActions.includes('store provider credentials'));
  assert.ok(readyDraft?.safetyBoundaries.includes('provider profile drafts are review-only'));

  const missingStatus = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'openai',
      model: '',
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

  const missingDraft = missingStatus.sections.provider.items[0].providerProfileDraft;
  assert.equal(missingDraft?.draftStatus, 'missing-required-field');
  assert.deepEqual(missingDraft?.missingRequiredFields, ['model', 'apiKey']);
  assert.equal(missingDraft?.profileFields.find((field) => field.field === 'apiKey')?.secretRef, true);
  assert.equal(missingDraft?.profileFields.find((field) => field.field === 'apiKey')?.valueState, 'missing');
  assert.ok(missingDraft?.blockedActions.includes('change active provider'));
  assert.ok(missingDraft?.safetyBoundaries.includes('provider secrets are never returned'));
});

test('buildXenesisConnectionsStatus exposes an internal Desk provider view', () => {
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

  assert.deepEqual(status.sections.provider.items[0].providerView, {
    viewType: 'provider-detail',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > AI Provider',
    openPath: 'xd.xenesis.providers.views.open',
    openArgs: { provider: 'codex-app-server' },
    connectionCardId: 'provider-codex-app-server',
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
  });
});

test('buildXenesisConnectionsStatus exposes provider routing fallback and credential-pool metadata', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'openai',
      model: 'gpt-5.4-mini',
      apiKey: 'desk-secret',
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
    providerFallbacks: [
      { provider: 'anthropic', model: 'claude-sonnet-4-5', apiKeyEnv: 'ANTHROPIC_API_KEY' },
      { provider: 'ollama', model: 'llama3.1', baseURL: 'http://127.0.0.1:11434/v1' },
    ],
    env: { ANTHROPIC_API_KEY: 'configured-secret', OPENAI_API_KEY: 'runtime-secret' },
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
        provider: 'openai',
        model: 'gpt-5.4-mini',
        profile: 'desk',
        baseURL: '',
        apiKeyEnv: 'OPENAI_API_KEY',
      },
      error: '',
      updatedAt: '2026-06-27T00:00:00.000Z',
      gateway: {
        enabled: true,
        running: false,
        managed: true,
        url: 'http://127.0.0.1:3846',
        host: '127.0.0.1',
        port: 3846,
        workspace: 'E:/workspace/project',
        error: '',
        updatedAt: '2026-06-27T00:00:00.000Z',
        channels: { total: 0, enabled: 0, ready: 0, blocked: 0, disabled: 0, items: [] },
      },
      profile: {
        active: 'desk',
        configured: 'desk',
        installed: ['desk'],
        templates: [],
        channels: [],
        channelSettings: emptyChannelSettings,
        policy: {
          workflow: 'default',
          approvalMode: 'safe',
          maxTurns: 4,
          providerRetries: 2,
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

  assert.deepEqual(status.sections.provider.items[0].providerRouting, {
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
    credentialPools: [
      { provider: 'openai', apiKeyEnv: 'OPENAI_API_KEY', credentialState: 'configured', source: 'runtime' },
      { provider: 'anthropic', apiKeyEnv: 'ANTHROPIC_API_KEY', credentialState: 'configured', source: 'fallback' },
      { provider: 'ollama', apiKeyEnv: '', credentialState: 'not-required', source: 'fallback' },
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
  });
});

test('buildXenesisConnectionsStatus exposes an OpenClaw-style messenger channel catalog', () => {
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

  const messengerIds = new Set(status.sections.messengers.items.map((item) => item.id));
  for (const id of [
    'telegram',
    'slack',
    'discord',
    'webhook',
    'whatsapp',
    'signal',
    'microsoft-teams',
    'google-chat',
    'matrix',
    'line',
    'wechat',
    'qqbot',
    'feishu',
    'rocket-chat',
    'dingding',
    'email',
    'sms',
  ]) {
    assert.equal(messengerIds.has(id), true, `${id} should be present`);
  }

  const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');
  const signal = status.sections.messengers.items.find((item) => item.id === 'signal');
  const googleChat = status.sections.messengers.items.find((item) => item.id === 'google-chat');
  const rocketChat = status.sections.messengers.items.find((item) => item.id === 'rocket-chat');
  const dingding = status.sections.messengers.items.find((item) => item.id === 'dingding');

  assert.equal(telegram?.supportLevel, 'implemented');
  assert.equal(telegram?.channelTemplate?.category, 'consumer');
  assert.equal(telegram?.channelTemplate?.adapter, 'bot-api');
  assert.ok(telegram?.channelTemplate?.safetyControls.includes('allowlist'));
  assert.ok(telegram?.channelTemplate?.capabilities.includes('direct-messages'));
  assert.deepEqual(telegram?.crActions, ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel']);

  assert.equal(signal?.status, 'planned');
  assert.equal(signal?.supportLevel, 'planned');
  assert.equal(signal?.settingsAction, undefined);
  assert.equal(signal?.channelTemplate?.adapter, 'bridge');
  assert.ok(signal?.sourceDocs?.some((source) => source.url.endsWith('/channels/signal')));

  assert.equal(googleChat?.status, 'planned');
  assert.equal(googleChat?.channelTemplate?.category, 'enterprise');
  assert.ok(googleChat?.channelTemplate?.auth.includes('workspace'));
  assert.equal(googleChat?.crActions?.length ?? 0, 0);

  assert.equal(rocketChat?.status, 'planned');
  assert.equal(rocketChat?.supportLevel, 'planned');
  assert.equal(rocketChat?.channelTemplate?.category, 'enterprise');
  assert.equal(rocketChat?.channelTemplate?.adapter, 'bot-api');
  assert.ok(rocketChat?.sourceDocs?.some((source) => source.url.endsWith('/channels/rocket-chat')));
  assert.equal(rocketChat?.messengerView?.openArgs.id, 'rocket-chat');

  assert.equal(dingding?.status, 'planned');
  assert.equal(dingding?.supportLevel, 'planned');
  assert.equal(dingding?.channelTemplate?.category, 'enterprise');
  assert.equal(dingding?.channelTemplate?.adapter, 'tenant-app');
  assert.ok(dingding?.sourceDocs?.some((source) => source.url.endsWith('/channels/dingding')));
  assert.equal(dingding?.messengerView?.openArgs.id, 'dingding');
});

test('buildXenesisConnectionsStatus exposes OpenClaw-style routing metadata for implemented channels', () => {
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

  assert.deepEqual(telegram?.channelTemplate?.routing, {
    routeBinding: 'telegram.allowedChatIds',
    allowlistFields: ['allowedChatIds'],
    pairing: 'bot token',
    defaultAgent: 'xenesis-agent',
    sessionScope: 'chat',
    diagnostics: ['missing-env', 'safe-to-deliver', 'last-error'],
    deliveryFeatures: ['direct-messages', 'groups', 'files'],
  });

  for (const item of implemented) {
    assert.equal(typeof item.channelTemplate?.routing?.routeBinding, 'string', `${item.id} route binding`);
    assert.ok(item.channelTemplate?.routing?.allowlistFields.length, `${item.id} allowlist fields`);
    assert.ok(item.channelTemplate?.routing?.diagnostics.length, `${item.id} diagnostics`);
    assert.ok(item.channelTemplate?.routing?.deliveryFeatures.length, `${item.id} delivery features`);
  }
});

test('buildXenesisConnectionsStatus exposes channel safety access and loop-protection metadata', () => {
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

  const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');

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
  });
});

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

  assert.deepEqual(
    discord?.channelTemplate?.accessGroups?.bindings.map((binding) => binding.field),
    ['allowedChannelIds', 'allowedGuildIds'],
  );
  assert.equal(discord?.channelTemplate?.accessGroups?.failClosed, true);

  for (const item of implemented) {
    assert.equal(item.channelTemplate?.accessGroups?.model, 'profile-allowlist-fields', `${item.id} model`);
    assert.ok(item.channelTemplate?.accessGroups?.bindings.length, `${item.id} bindings`);
    assert.equal(
      item.channelTemplate?.accessGroups?.readPaths.includes('xd.xenesis.channels.accessGroups.status'),
      true,
    );
  }
});

test('buildXenesisConnectionsStatus exposes OpenClaw-style pairing metadata for implemented and planned channels', () => {
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

  const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');
  const signal = status.sections.messengers.items.find((item) => item.id === 'signal');

  assert.deepEqual(telegram?.channelTemplate?.pairing, {
    model: 'env-token',
    runtimeSupport: 'implemented',
    accountScope: 'bot-account',
    credentialRefs: [{ ref: 'tokenEnv', source: 'profile-env-field', required: true, state: 'unknown' }],
    pairingState: 'unknown',
    setupSurface: 'Settings > Xenesis Agent > External bots',
    validationChecks: ['profile-env-field-set', 'env-secret-configured', 'gateway-channel-ready', 'cr-readback'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.channels.pairing.status',
      'xd.xenesis.channels.routing.status',
      'xd.xenesis.status',
    ],
    controlPaths: ['xd.xenesis.profiles.updateChannels', 'xd.xenesis.profiles.testChannel'],
    diagnostics: ['missing-env', 'pairing-secret-state', 'gateway-status', 'last-error'],
    safetyBoundaries: [
      'pairing status is read-only',
      'credential values are never returned',
      'channel writes stay on profile update CR paths',
      'delivery tests stay on profile test CR paths',
    ],
  });
  assert.equal(signal?.channelTemplate?.pairing?.model, 'device-link');
  assert.equal(signal?.channelTemplate?.pairing?.runtimeSupport, 'planned-adapter');
  assert.equal(signal?.channelTemplate?.pairing?.pairingState, 'planned');
  assert.deepEqual(signal?.channelTemplate?.pairing?.credentialRefs, [
    { ref: 'SIGNAL_DEVICE_LINK', source: 'device-pairing', required: true, state: 'planned' },
  ]);
});

test('buildXenesisConnectionsStatus exposes channel user-story workflows for implemented and planned channels', () => {
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

  const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');
  const signal = status.sections.messengers.items.find((item) => item.id === 'signal');

  assert.deepEqual(telegram?.channelTemplate?.userStory, {
    workflowType: 'remote-prompt',
    runtimeSupport: 'implemented',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > Xenesis Agent > External bots',
    userStories: [
      'receive an allowed Telegram chat prompt and route it to Xenesis Agent',
      'reply in the same chat scope after approval policy checks',
      'run a sanitized channel test before relying on remote prompts',
    ],
    prerequisiteSetup: ['gateway-running', 'telegram-pairing-ready', 'telegram-allowlist-configured'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.channels.userStories.status',
      'xd.xenesis.channels.routing.status',
      'xd.xenesis.channels.safety.status',
      'xd.xenesis.channels.accessGroups.status',
      'xd.xenesis.channels.pairing.status',
      'xd.xenesis.gateway.status',
    ],
    controlPaths: [
      'xd.xenesis.channels.userStories.open',
      'xd.xenesis.messengers.views.open',
      'xd.xenesis.profiles.testChannel',
    ],
    diagnostics: ['gateway-status', 'safe-to-deliver', 'allowlist-empty', 'last-error'],
    safetyBoundaries: [
      'channel user stories are read/open planning surfaces',
      'message delivery stays on explicit channel test and gateway runtime paths',
      'remote prompts stay constrained by channel allowlists and approval guardrails',
    ],
  });

  assert.equal(signal?.channelTemplate?.userStory?.workflowType, 'planned-messenger');
  assert.equal(signal?.channelTemplate?.userStory?.runtimeSupport, 'planned-adapter');
  assert.deepEqual(signal?.channelTemplate?.userStory?.controlPaths, [
    'xd.xenesis.channels.userStories.open',
    'xd.xenesis.messengers.views.open',
    'xd.xenesis.connections.open',
  ]);
  assert.ok(
    signal?.channelTemplate?.userStory?.safetyBoundaries.some((boundary) =>
      boundary.includes('planned messenger user stories do not enable delivery'),
    ),
  );
});

test('buildXenesisConnectionsStatus exposes review-only channel profile drafts for implemented messengers', () => {
  const status = buildXenesisConnectionsStatus({
    aiProvider: {
      provider: 'codex-app-server',
      model: 'gpt-5-codex',
      apiKey: '',
      baseUrl: '',
    },
    mcp: {
      available: false,
      serverPath: '',
      bridgeUrl: '',
      bridgeStatePath: '',
      configFilePath: '',
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
          ready: 0,
          blocked: 1,
          disabled: 3,
          items: [],
        },
      },
      profile: {
        active: 'desk',
        configured: 'desk',
        installed: ['desk'],
        templates: [],
        channels: [
          { name: 'telegram', enabled: true, configured: false, env: ['TELEGRAM_BOT_TOKEN'] },
          { name: 'slack', enabled: false, configured: false, env: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'] },
          { name: 'discord', enabled: false, configured: false, env: ['DISCORD_BOT_TOKEN'] },
          { name: 'webhook', enabled: false, configured: false, env: ['XENESIS_WEBHOOK_URL'] },
        ],
        channelSettings: {
          telegram: { enabled: true, ...channelGuardrails, tokenEnv: 'TELEGRAM_BOT_TOKEN', allowedChatIds: '' },
          slack: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'SLACK_BOT_TOKEN',
            signingSecretEnv: 'SLACK_SIGNING_SECRET',
            webhookUrlEnv: 'SLACK_WEBHOOK_URL',
            allowedChannelIds: '',
          },
          discord: {
            enabled: false,
            ...channelGuardrails,
            botTokenEnv: 'DISCORD_BOT_TOKEN',
            webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
            allowedChannelIds: '',
            allowedGuildIds: '',
          },
          webhook: { enabled: false, ...channelGuardrails, urlEnv: 'XENESIS_WEBHOOK_URL' },
        },
        policy: {
          workflow: '',
          approvalMode: 'safe',
          maxTurns: 12,
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
    env: {
      TELEGRAM_BOT_TOKEN: '',
      SLACK_BOT_TOKEN: 'secret-value-must-not-appear',
      SLACK_SIGNING_SECRET: '',
    },
  });

  const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');
  const slack = status.sections.messengers.items.find((item) => item.id === 'slack');
  const signal = status.sections.messengers.items.find((item) => item.id === 'signal');

  assert.equal(telegram?.channelProfileDraft?.draftStatus, 'missing-required-field');
  assert.equal(telegram?.channelProfileDraft?.actionInboxKind, 'xenesis-channel-profile-draft');
  assert.equal(telegram?.channelProfileDraft?.channel, 'telegram');
  assert.equal(telegram?.channelProfileDraft?.guardrails.approvalMode, 'safe');
  assert.equal(telegram?.channelProfileDraft?.guardrails.maxTurns, 12);
  assert.equal(telegram?.channelProfileDraft?.guardrails.maxTokens, 120000);
  assert.deepEqual(telegram?.channelProfileDraft?.missingRequiredFields, ['tokenEnv:env-secret', 'allowedChatIds']);
  assert.deepEqual(
    telegram?.channelProfileDraft?.profileFields.map((field) => `${field.field}:${field.valueState}`),
    ['enabled:configured', 'tokenEnv:missing-env', 'allowedChatIds:empty'],
  );
  assert.ok(telegram?.channelProfileDraft?.readPaths.includes('xd.xenesis.channels.profileDrafts.status'));
  assert.ok(telegram?.channelProfileDraft?.controlPaths.includes('xd.xenesis.channels.profileDrafts.request'));
  assert.ok(
    telegram?.channelProfileDraft?.safetyBoundaries.some((boundary) =>
      boundary.includes('does not mutate channel settings'),
    ),
  );

  assert.equal(slack?.channelProfileDraft?.draftStatus, 'missing-required-field');
  assert.ok(JSON.stringify(slack?.channelProfileDraft).includes('secret-value-must-not-appear') === false);
  assert.deepEqual(slack?.channelProfileDraft?.missingRequiredFields, [
    'signingSecretEnv:env-secret',
    'allowedChannelIds',
  ]);
  assert.equal(signal?.channelProfileDraft, undefined);
});

test('buildXenesisConnectionsStatus exposes internal Desk messenger views for implemented and planned channels', () => {
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

  const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');
  const signal = status.sections.messengers.items.find((item) => item.id === 'signal');

  assert.deepEqual(telegram?.messengerView, {
    viewType: 'messenger-detail',
    runtimeSupport: 'implemented',
    primarySurface: 'Settings > Xenesis Agent > Connections',
    setupSurface: 'Settings > Xenesis Agent > External bots',
    openPath: 'xd.xenesis.messengers.views.open',
    openArgs: { id: 'telegram' },
    connectionCardId: 'telegram',
    internalViews: ['connection-card', 'channel-template', 'routing', 'external-bot-settings'],
    readPaths: [
      'xd.xenesis.connections.status',
      'xd.xenesis.messengers.views.status',
      'xd.xenesis.channels.routing.status',
      'xd.xenesis.gateway.status',
    ],
    controlPaths: [
      'xd.xenesis.messengers.views.open',
      'xd.xenesis.connections.open',
      'xd.xenesis.profiles.updateChannels',
      'xd.xenesis.profiles.testChannel',
      'xd.panes.settings.open',
    ],
    diagnostics: ['gateway-status', 'missing-env', 'allowlist', 'last-error'],
    safetyBoundaries: [
      'implemented channels still require gateway readiness before delivery',
      'channel writes and test sends stay on existing profile CR paths',
    ],
  });
  assert.equal(signal?.messengerView?.runtimeSupport, 'planned');
  assert.deepEqual(signal?.messengerView?.internalViews, ['connection-card', 'channel-template', 'planning-card']);
  assert.equal(signal?.messengerView?.controlPaths.includes('xd.xenesis.profiles.testChannel'), false);
});

test('buildXenesisConnectionsStatus resolves repo-local guide open paths from the repo root', () => {
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
    repoRoot: 'E:\\xenesis-desk',
  });
  const guide = status.sections.guides.items.find((item) => item.id === 'onboarding-connections');

  assert.equal(guide?.guidePath, 'docs/manual/09-onboarding-connections.md');
  assert.equal(guide?.guideOpenPath, 'E:\\xenesis-desk\\docs\\manual\\09-onboarding-connections.md');
});

test('buildXenesisConnectionsStatus exposes guide catalog metadata for onboarding playbooks', () => {
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
    repoRoot: 'E:\\xenesis-desk',
  });

  const onboarding = status.sections.guides.items.find((item) => item.id === 'onboarding-connections');
  const userStories = status.sections.guides.items.find((item) => item.id === 'agent-user-stories');

  assert.deepEqual(onboarding?.guideCatalog, {
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
  });
  assert.equal(onboarding?.guideOpenPath, 'E:\\xenesis-desk\\docs\\manual\\09-onboarding-connections.md');
  assert.equal(userStories?.guideCatalog?.guideType, 'user-story-catalog');
  assert.equal(userStories?.guideCatalog?.readPaths.includes('xd.xenesis.guides.status'), true);
});

test('buildXenesisConnectionsStatus exposes diagnostic runbooks for tools, planned tools, and channels', () => {
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

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');
  const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');

  assert.equal(notion?.diagnosticRunbook?.scope, 'tool');
  assert.equal(notion?.diagnosticRunbook?.readiness, 'action-required');
  assert.deepEqual(
    notion?.diagnosticRunbook?.steps.map((step) => step.id),
    [
      'connection-status',
      'tool-setup',
      'tool-connector',
      'tool-view',
      'tool-action-catalog',
      'tool-user-story',
      'tool-install-plan',
      'mcp-install-draft',
    ],
  );
  assert.equal(notion?.diagnosticRunbook?.readPaths.includes('xd.xenesis.tools.connectors.status'), true);
  assert.equal(notion?.diagnosticRunbook?.diagnostics.includes('notion-search-read'), true);

  assert.equal(calendar?.diagnosticRunbook?.scope, 'tool');
  assert.equal(calendar?.diagnosticRunbook?.readiness, 'planned');
  assert.equal(
    calendar?.diagnosticRunbook?.steps.some((step) => step.id === 'tool-install-plan'),
    true,
  );
  assert.equal(calendar?.diagnosticRunbook?.diagnostics.includes('planned-oauth-template'), true);
  assert.equal(
    calendar?.diagnosticRunbook?.safetyBoundaries.includes('diagnostic runbooks are read/open planning surfaces'),
    true,
  );

  assert.equal(telegram?.diagnosticRunbook?.scope, 'messenger');
  assert.deepEqual(
    telegram?.diagnosticRunbook?.steps.map((step) => step.id),
    [
      'connection-status',
      'channel-routing',
      'channel-safety',
      'channel-access-groups',
      'channel-pairing',
      'channel-user-story',
      'channel-profile-draft',
      'messenger-view',
    ],
  );
  assert.equal(telegram?.diagnosticRunbook?.readPaths.includes('xd.xenesis.channels.userStories.status'), true);
  assert.equal(telegram?.diagnosticRunbook?.controlPaths.includes('xd.xenesis.connections.diagnostics.open'), true);
});

test('buildXenesisConnectionsStatus exposes setup request templates without executing external work', () => {
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

  const notion = status.sections.tools.items.find((item) => item.id === 'notion');
  const calendar = status.sections.tools.items.find((item) => item.id === 'google-calendar');
  const telegram = status.sections.messengers.items.find((item) => item.id === 'telegram');

  assert.equal(notion?.setupRequest?.actionInboxKind, 'xenesis-connection-setup');
  assert.equal(notion?.setupRequest?.readiness, 'action-required');
  assert.deepEqual(notion?.setupRequest?.blockedActions, [
    'does not install MCP servers',
    'does not complete OAuth',
    'does not store tokens',
    'does not execute provider tools',
    'does not mutate provider/tool/channel settings',
    'does not send messages',
  ]);
  assert.equal(notion?.setupRequest?.controlPaths.includes('xd.xenesis.connections.setupRequests.request'), true);
  assert.equal(notion?.setupRequest?.readPaths.includes('xd.xenesis.connections.diagnostics.status'), true);

  assert.equal(calendar?.setupRequest?.readiness, 'planned');
  assert.match(calendar?.setupRequest?.description ?? '', /planned OAuth/i);

  assert.equal(telegram?.setupRequest?.requestType, 'messenger-setup');
  assert.equal(telegram?.setupRequest?.readPaths.includes('xd.xenesis.channels.pairing.status'), true);
});

test('withXenesisConnectionSetupRequestReviews joins Action Inbox review state by approval session key', () => {
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

  const enriched = withXenesisConnectionSetupRequestReviews(status, [
    {
      id: 'setup-notion',
      kind: 'xenesis-connection-setup',
      title: 'Review setup request for Notion',
      approvalSessionKey: 'xenesis-connection-setup:notion',
      requester: 'tester',
      source: 'Xenesis Connection Center',
      status: 'pending',
      createdAt: '2026-06-27T01:00:00.000Z',
      updatedAt: '2026-06-27T01:00:00.000Z',
      expiresAt: '2026-06-27T01:05:00.000Z',
      resolvedAt: '',
      result: '',
      error: '',
    },
  ]);

  const notion = enriched.sections.tools.items.find((item) => item.id === 'notion');
  const linear = enriched.sections.tools.items.find((item) => item.id === 'linear');

  assert.equal(notion?.setupRequest?.review?.status, 'pending');
  assert.equal(notion?.setupRequest?.review?.actionInboxItemId, 'setup-notion');
  assert.equal(notion?.setupRequest?.review?.requester, 'tester');
  assert.equal(notion?.setupRequest?.review?.approvalSessionKey, 'xenesis-connection-setup:notion');
  assert.equal(linear?.setupRequest?.review?.status, 'not-requested');
  assert.equal(linear?.setupRequest?.review?.approvalSessionKey, 'xenesis-connection-setup:linear');
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
  assert.equal(status.sections.provider.items[0].providerSetup?.credentialState, 'configured');
  assert.equal(status.sections.mcp.items[0].status, 'blocked');
  assert.equal(status.sections.gateway.items[0].status, 'unknown');
  assert.ok(XENESIS_CONNECTION_GUIDES.some((guide) => guide.id === 'onboarding-connections'));
});
