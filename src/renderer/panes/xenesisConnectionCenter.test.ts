import assert from 'node:assert/strict';
import test from 'node:test';
import type { XenesisConnectionItem, XenesisConnectionsStatus } from '../../shared/types';
import {
  buildXenesisConnectionGuideRequest,
  buildXenesisConnectionSettingsRequest,
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
