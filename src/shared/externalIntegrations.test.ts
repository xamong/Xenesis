import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildExternalIntegrationCatalogStatus,
  buildExternalIntegrationDoctorStatus,
  buildExternalIntegrationImportPreview,
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
  assert.equal(
    catalog.categories.some((item) => item.id === 'productivity'),
    true,
  );
  assert.equal(
    catalog.categories.some((item) => item.id === 'channel'),
    true,
  );
  assert.equal(
    catalog.categories.some((item) => item.id === 'web-search'),
    true,
  );
  assert.equal(
    catalog.items.some((item) => item.id === 'hermes-agent'),
    false,
  );
  assert.equal(
    catalog.items.some((item) => item.category === 'model-provider'),
    false,
  );
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
  assert.equal(
    doctor.findings.some((item) => item.checkId === 'notion.credentials.NOTION_API_KEY'),
    true,
  );
  assert.equal(
    doctor.findings.some((item) => item.severity === 'error'),
    true,
  );
});

test('Hermes import preview returns candidates, readiness, and summary without leaking secret values', () => {
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
  assert.equal(Object.hasOwn(preview, 'candidates'), true);
  assert.equal(Object.hasOwn(preview, 'summary'), true);
  assert.equal(Array.isArray(preview.warnings), true);
  assert.equal(Object.hasOwn(preview, 'mappings'), false);
  assert.equal(Object.hasOwn(preview, 'scanned'), false);
  assert.equal(Object.hasOwn(preview, 'total'), false);

  const notion = preview.candidates.find((item) => item.integrationId === 'notion');
  const slack = preview.candidates.find((item) => item.integrationId === 'slack');
  const linear = preview.candidates.find((item) => item.integrationId === 'linear');
  assert.equal(notion?.ready, true);
  assert.equal(notion?.readiness, 'ready');
  assert.deepEqual(notion?.requiredRefs, ['NOTION_API_KEY']);
  assert.deepEqual(notion?.matchedRefs, ['NOTION_API_KEY']);
  assert.deepEqual(notion?.missingRefs, []);
  assert.equal(slack?.ready, false);
  assert.equal(slack?.readiness, 'missing-required-refs');
  assert.equal(slack?.missingRefs.includes('SLACK_SIGNING_SECRET'), true);
  assert.equal(linear?.ready, false);
  assert.equal(linear?.matchedKeys.includes('mcp_servers.linear'), true);
  assert.equal(linear?.missingRefs.includes('LINEAR_API_KEY'), true);
  assert.equal(preview.summary.candidateCount, 3);
  assert.equal(preview.summary.readyCount, 1);
  assert.equal(preview.summary.missingCount, 2);
  assert.deepEqual(preview.summary.scanned.envKeys, ['NOTION_API_KEY', 'SLACK_BOT_TOKEN']);
  assert.deepEqual(preview.summary.scanned.mcpServers, ['linear']);
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
  const tavily = preview.candidates.find((item) => item.integrationId === 'tavily');
  const discord = preview.candidates.find((item) => item.integrationId === 'discord');
  assert.equal(tavily?.ready, true);
  assert.equal(tavily?.matchedKeys.includes('TAVILY_API_KEY'), true);
  assert.equal(tavily?.matchedKeys.includes('tavily'), true);
  assert.deepEqual(tavily?.missingRefs, []);
  assert.equal(discord?.ready, true);
  assert.equal(discord?.matchedKeys.includes('DISCORD_BOT_TOKEN'), true);
  assert.equal(discord?.matchedKeys.includes('discord'), true);
  assert.deepEqual(discord?.missingRefs, []);
  assert.equal(preview.summary.candidateCount, 2);
  assert.equal(preview.summary.readyCount, 2);
  assert.equal(preview.summary.missingCount, 0);
  assert.equal(JSON.stringify(preview).includes('tvly-secret'), false);
  assert.equal(JSON.stringify(preview).includes('discord-secret'), false);
});

test('MCP client import preview reports ready and missing server candidates without copying config values', () => {
  const preview = buildExternalIntegrationImportPreview({
    source: 'mcp-client',
    mcpServers: {
      linear: { url: 'https://mcp.linear.app/mcp' },
    },
    pluginIds: ['n8n-mcp'],
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.source, 'mcp-client');
  const linear = preview.candidates.find((item) => item.integrationId === 'linear');
  const n8n = preview.candidates.find((item) => item.integrationId === 'n8n-mcp');
  assert.equal(linear?.ready, true);
  assert.deepEqual(linear?.requiredRefs, ['mcp_servers.linear']);
  assert.deepEqual(linear?.matchedRefs, ['mcp_servers.linear']);
  assert.deepEqual(linear?.missingRefs, []);
  assert.equal(n8n?.ready, false);
  assert.deepEqual(n8n?.requiredRefs, ['mcp_servers.n8n-mcp']);
  assert.deepEqual(n8n?.matchedRefs, []);
  assert.deepEqual(n8n?.missingRefs, ['mcp_servers.n8n-mcp']);
  assert.equal(preview.summary.candidateCount, 2);
  assert.equal(preview.summary.readyCount, 1);
  assert.equal(preview.summary.missingCount, 1);
  assert.deepEqual(preview.summary.scanned.mcpServers, ['linear']);
  assert.deepEqual(preview.summary.scanned.pluginIds, ['n8n-mcp']);
  assert.equal(JSON.stringify(preview).includes('https://mcp.linear.app/mcp'), false);
});

test('import preview returns an empty summary when no source hints are present', () => {
  const preview = buildExternalIntegrationImportPreview({
    source: 'mcp-client',
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.source, 'mcp-client');
  assert.deepEqual(preview.candidates, []);
  assert.deepEqual(preview.warnings, []);
  assert.deepEqual(preview.summary, {
    candidateCount: 0,
    readyCount: 0,
    missingCount: 0,
    scanned: {
      envKeys: [],
      mcpServers: [],
      pluginIds: [],
    },
  });
});
