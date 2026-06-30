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
