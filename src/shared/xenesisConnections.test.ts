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
