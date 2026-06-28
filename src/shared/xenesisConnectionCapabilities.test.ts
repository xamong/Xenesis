import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';
import {
  buildXenesisConnectionCenterOpenArgs,
  XENESIS_CONNECTION_MESSENGER_IDS,
  XENESIS_CONNECTION_PROVIDER_IDS,
  XENESIS_CONNECTION_TOOL_IDS,
} from './xenesisConnections';

test('xenesis capability ID allowlists are owned by the shared connection catalog', () => {
  const capabilitySource = readFileSync(new URL('./deskBridgeCapabilities.ts', import.meta.url), 'utf8');
  const mainSource = readFileSync(new URL('../main/index.ts', import.meta.url), 'utf8');
  const testSource = readFileSync(new URL('./xenesisConnectionCapabilities.test.ts', import.meta.url), 'utf8');

  for (const [label, source] of [
    ['deskBridgeCapabilities.ts', capabilitySource],
    ['main/index.ts', mainSource],
  ] as const) {
    assert.doesNotMatch(source, /const XENESIS_ONBOARDING_STEP_IDS = \[/, `${label} owns onboarding ids`);
    assert.doesNotMatch(source, /const XENESIS_GUIDE_IDS = \[/, `${label} owns guide ids`);
    assert.doesNotMatch(source, /const XENESIS_MESSENGER_VIEW_IDS = \[/, `${label} owns messenger ids`);
    assert.doesNotMatch(source, /const XENESIS_EXTERNAL_TOOL_IDS = \[/, `${label} owns external tool ids`);
    assert.doesNotMatch(source, /const XENESIS_TOOL_SETUP_IDS = \[/, `${label} owns tool setup ids`);
    assert.doesNotMatch(source, /const XENESIS_TOOL_OAUTH_DRAFT_IDS = \[/, `${label} owns OAuth draft ids`);
    assert.doesNotMatch(source, /const XENESIS_PROVIDER_IDS = \[/, `${label} owns provider ids`);
    assert.doesNotMatch(source, /const XENESIS_PROVIDER_SETUP_IDS = \[/, `${label} owns provider setup ids`);
    assert.doesNotMatch(source, /section:\s*'xenesis-connections'/, `${label} owns Connection Center section`);
    assert.doesNotMatch(
      source,
      /\[data-settings-section="xenesis-connections"\]/,
      `${label} owns Connection Center root selector`,
    );
  }

  assert.match(capabilitySource, /buildXenesisConnectionCenterOpenArgs/);
  assert.match(mainSource, /buildXenesisConnectionCenterOpenArgs/);
  assert.doesNotMatch(testSource, /const ALL_AI_PROVIDER_KINDS = \[/);
});

function schemaRequiredFields(capability: ReturnType<typeof findDeskBridgeCapability>): string[] {
  const required = capability?.schema?.required;
  return Array.isArray(required) ? [...required] : [];
}

function schemaProperties(capability: ReturnType<typeof findDeskBridgeCapability>): Record<string, any> {
  return (capability?.schema?.properties ?? {}) as Record<string, any>;
}

function assertOpenCapabilityDetailFocus(path: string, expectedDetail: string): void {
  const properties = schemaProperties(findDeskBridgeCapability(path));
  assert.equal(properties.focusConnectionDetail?.type, 'string', `${path} exposes detail focus type`);
  assert.equal(
    properties.focusConnectionDetail?.enum.includes(expectedDetail),
    true,
    `${path} exposes ${expectedDetail} detail focus`,
  );
}

test('xenesis connection status capability is registered as a read path', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));

  assert.equal(paths.has('xd.xenesis.connections'), true);
  assert.equal(paths.has('xd.xenesis.connections.status'), true);
  assert.equal(paths.has('xd.xenesis.connections.open'), true);
  assert.equal(findDeskBridgeCapability('xd.xenesis.connections.status')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.xenesis.connections.status')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.xenesis.connections.open')?.permission, 'control');
  assert.equal(findDeskBridgeCapability('xd.xenesis.connections.open')?.approval, 'never');
  assert.equal(schemaRequiredFields(findDeskBridgeCapability('xd.xenesis.connections.open')).includes('id'), false);
});

test('xenesis connection open capabilities expose detail focus selectors', () => {
  assertOpenCapabilityDetailFocus('xd.xenesis.connections.open', 'diagnostic-runbook');
  assertOpenCapabilityDetailFocus('xd.xenesis.onboarding.open', 'onboarding-plan');
  assertOpenCapabilityDetailFocus('xd.xenesis.guides.open', 'guide-catalog');
  assertOpenCapabilityDetailFocus('xd.xenesis.connections.diagnostics.open', 'diagnostic-runbook');
  assertOpenCapabilityDetailFocus('xd.xenesis.connections.setupRequests.open', 'setup-request');
  assertOpenCapabilityDetailFocus('xd.xenesis.tools.oauthDrafts.open', 'tool-oauth-draft');
  assertOpenCapabilityDetailFocus('xd.xenesis.tools.mcpInstallDrafts.open', 'mcp-install-draft');
  assertOpenCapabilityDetailFocus('xd.xenesis.tools.installPlans.open', 'tool-install-plan');
  assertOpenCapabilityDetailFocus('xd.xenesis.tools.actions.open', 'tool-action-catalog');
  assertOpenCapabilityDetailFocus('xd.xenesis.tools.connectors.open', 'tool-connector');
  assertOpenCapabilityDetailFocus('xd.xenesis.tools.setup.open', 'tool-setup');
  assertOpenCapabilityDetailFocus('xd.xenesis.tools.views.open', 'tool-view');
  assertOpenCapabilityDetailFocus('xd.xenesis.channels.routing.open', 'channel-routing');
  assertOpenCapabilityDetailFocus('xd.xenesis.channels.safety.open', 'channel-safety');
  assertOpenCapabilityDetailFocus('xd.xenesis.channels.accessGroups.open', 'channel-access-groups');
  assertOpenCapabilityDetailFocus('xd.xenesis.channels.pairing.open', 'channel-pairing');
  assertOpenCapabilityDetailFocus('xd.xenesis.channels.setupPlans.open', 'channel-setup-plan');
  assertOpenCapabilityDetailFocus('xd.xenesis.channels.profileDrafts.open', 'channel-profile-draft');
  assertOpenCapabilityDetailFocus('xd.xenesis.messengers.views.open', 'messenger-view');
  assertOpenCapabilityDetailFocus('xd.xenesis.providers.routing.open', 'provider-routing');
  assertOpenCapabilityDetailFocus('xd.xenesis.providers.profileDrafts.open', 'provider-profile-draft');
  assertOpenCapabilityDetailFocus('xd.xenesis.providers.setup.open', 'provider-setup');
  assertOpenCapabilityDetailFocus('xd.xenesis.providers.views.open', 'provider-view');
});

test('xenesis connection detail focus propagates through main and renderer bridge source', () => {
  const mainSource = readFileSync(new URL('../main/index.ts', import.meta.url), 'utf8');
  const appSource = readFileSync(new URL('../renderer/App.tsx', import.meta.url), 'utf8');

  assert.match(mainSource, /focusConnectionDetail\s*=\s*kind === 'settings'/);
  assert.match(mainSource, /focusConnectionDetail:\s*payload\.focusConnectionDetail/);
  assert.match(mainSource, /focusConnectionDetail,\s*\n\s*ensureVisible/);
  assert.match(appSource, /focusConnectionDetail\?: unknown/);
  assert.match(appSource, /focusConnectionDetail:\s*payload\.focusConnectionDetail/);
  assert.match(appSource, /focusConnectionDetail:\s*payload\.focusConnectionDetail,\s*\n\s*ensureVisible/);
});

test('xenesis connection status capability dispatches to the adapter', async () => {
  let called = 0;
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisConnectionsStatus: () => {
      called += 1;
      return {
        ok: true,
        status: {
          ok: true,
          marker: 'connections-status',
        },
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.status',
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.equal(called, 1);
  assert.deepEqual(result.result, {
    ok: true,
    status: {
      ok: true,
      marker: 'connections-status',
    },
  });
});

test('xenesis connection open capability opens the Connection Center catalog or focuses a card', async () => {
  const openedArgs: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    openBuiltinPane: (args) => {
      openedArgs.push(args);
      return {
        ok: true,
        marker: 'connection-open',
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.open',
    args: {
      id: 'notion',
    },
    source: 'xenesis',
  });
  const catalogResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.open',
    args: { ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.equal(catalogResult.ok, true);
  assert.deepEqual(openedArgs, [
    buildXenesisConnectionCenterOpenArgs({ focusConnectionId: 'notion' }),
    buildXenesisConnectionCenterOpenArgs({ ensureVisible: true }),
  ]);
  assert.deepEqual(result.result, {
    ok: true,
    marker: 'connection-open',
  });
  assert.deepEqual(catalogResult.result, {
    ok: true,
    marker: 'connection-open',
  });
});

test('xenesis connection center testing snapshot capability is registered and dispatches to the adapter', async () => {
  const capability = findDeskBridgeCapability('xd.testing.connectionCenter.snapshot');
  const schemaProperties = (capability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(capability?.permission, 'read');
  assert.equal(capability?.approval, 'never');
  assert.equal(schemaProperties.includeBodyText?.type, 'boolean');
  assert.equal(schemaProperties.maxTextLength?.type, 'number');
  assert.equal(schemaProperties.timeoutMs?.type, 'number');

  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    snapshotConnectionCenter: (args) => {
      calls.push(args);
      return {
        ok: true,
        present: true,
        checks: [{ id: 'connection-center-root', present: true }],
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.testing.connectionCenter.snapshot',
    args: { includeBodyText: true, maxTextLength: 640, timeoutMs: 1500 },
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ includeBodyText: true, maxTextLength: 640, timeoutMs: 1500 }]);
  assert.deepEqual(result.result, {
    ok: true,
    present: true,
    checks: [{ id: 'connection-center-root', present: true }],
  });
});

test('xenesis connection setup request apply capability is registered and dispatches to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.connections.setupRequests.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.connections.setupRequests.open');
  const requestCapability = findDeskBridgeCapability('xd.xenesis.connections.setupRequests.request');
  const applyCapability = findDeskBridgeCapability('xd.xenesis.connections.setupRequests.apply');
  const applySchemaProperties = (applyCapability?.schema?.properties ?? {}) as Record<string, any>;

  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(requestCapability?.permission, 'write');
  assert.equal(requestCapability?.approval, 'when-external');
  assert.equal(applyCapability?.permission, 'write');
  assert.equal(applyCapability?.approval, 'when-external');
  assert.deepEqual(applyCapability?.schema?.required, ['id']);
  assert.equal(applySchemaProperties.id?.enum.includes('notion'), true);
  assert.equal(applySchemaProperties.id?.enum.includes('telegram'), true);
  assert.equal(applySchemaProperties.id?.enum.includes('google-calendar'), true);
  assert.equal(applySchemaProperties.target?.enum.includes('codex'), true);

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisConnectionSetupRequestsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'notion', readiness: 'action-required' }],
      };
    },
    openXenesisConnectionSetupRequest: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion', readiness: 'action-required' },
      };
    },
    requestXenesisConnectionSetup: (args) => {
      calls.push({ method: 'request', args });
      return {
        ok: true,
        id: 'notion',
        actionInboxItem: { id: 'setup-notion' },
      };
    },
    applyXenesisConnectionSetupRequest: (args) => {
      calls.push({ method: 'apply', args });
      return {
        ok: true,
        id: 'notion',
        delegatedPath: 'xd.xenesis.tools.mcpInstallDrafts.apply',
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.setupRequests.status',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.setupRequests.open',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const requestResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.setupRequests.request',
    args: { id: 'notion' },
    source: 'xenesis',
    approved: true,
  });
  const applyResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.setupRequests.apply',
    args: { id: 'notion', target: 'codex' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(requestResult.ok, true);
  assert.equal(applyResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'notion' } },
    { method: 'open', args: { id: 'notion' } },
    { method: 'request', args: { id: 'notion' } },
    { method: 'apply', args: { id: 'notion', target: 'codex' } },
  ]);
  assert.deepEqual(applyResult.result, {
    ok: true,
    id: 'notion',
    delegatedPath: 'xd.xenesis.tools.mcpInstallDrafts.apply',
  });
});

test('xenesis onboarding status capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.onboarding.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.onboarding.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  for (const step of [
    'first-chat',
    'local-cli-mcp',
    'recommended-tools',
    'gateway',
    'messenger-routing',
    'test-send',
  ]) {
    assert.equal(statusSchemaProperties.id?.enum.includes(step), true, `${step} should be accepted by status`);
    assert.equal(openSchemaProperties.id?.enum.includes(step), true, `${step} should be accepted by open`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisOnboardingStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'first-chat' }],
      };
    },
    openXenesisOnboardingStep: (args) => {
      calls.push({ method: 'open', args });
      if (!(args as { id?: string } | undefined)?.id) {
        return {
          ok: true,
          total: 6,
        };
      }
      return {
        ok: true,
        item: { id: 'first-chat' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.onboarding.status',
    args: { id: 'first-chat' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.onboarding.open',
    args: { id: 'first-chat' },
    source: 'xenesis',
  });
  const catalogOpenResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.onboarding.open',
    args: { ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(catalogOpenResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'first-chat' } },
    { method: 'open', args: { id: 'first-chat' } },
    { method: 'open', args: { ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'first-chat' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'first-chat' },
  });
  assert.deepEqual(catalogOpenResult.result, {
    ok: true,
    total: 6,
  });
});

test('xenesis channel routing capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.channels.routing.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.channels.routing.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('channel'), false);
  for (const channel of ['telegram', 'slack', 'discord', 'webhook', 'whatsapp', 'google-chat', 'microsoft-teams']) {
    assert.equal(statusSchemaProperties.channel?.enum.includes(channel), true, `${channel} should be accepted`);
    assert.equal(openSchemaProperties.channel?.enum.includes(channel), true, `${channel} should be accepted by open`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelRoutingStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'telegram' }],
      };
    },
    openXenesisChannelRouting: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'telegram' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.routing.status',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.routing.open',
    args: { channel: 'telegram', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { channel: 'telegram' } },
    { method: 'open', args: { channel: 'telegram', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'telegram' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'telegram' },
  });
});

test('xenesis channel safety capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.channels.safety.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.channels.safety.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('channel'), false);
  for (const channel of ['telegram', 'slack', 'discord', 'webhook', 'whatsapp', 'google-chat', 'microsoft-teams']) {
    assert.equal(statusSchemaProperties.channel?.enum.includes(channel), true, `${channel} should be accepted`);
    assert.equal(openSchemaProperties.channel?.enum.includes(channel), true, `${channel} should be accepted by open`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelSafetyStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'telegram', accessModel: 'allowlist' }],
      };
    },
    openXenesisChannelSafety: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'telegram', accessModel: 'allowlist' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.safety.status',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.safety.open',
    args: { channel: 'telegram', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { channel: 'telegram' } },
    { method: 'open', args: { channel: 'telegram', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'telegram', accessModel: 'allowlist' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'telegram', accessModel: 'allowlist' },
  });
});

test('xenesis channel access group capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.channels.accessGroups.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.channels.accessGroups.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('channel'), false);
  for (const channel of ['telegram', 'slack', 'discord', 'webhook', 'whatsapp', 'google-chat', 'microsoft-teams']) {
    assert.equal(statusSchemaProperties.channel?.enum.includes(channel), true, `${channel} should be accepted`);
    assert.equal(openSchemaProperties.channel?.enum.includes(channel), true, `${channel} should be accepted by open`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelAccessGroupsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'telegram', failClosed: true }],
      };
    },
    openXenesisChannelAccessGroups: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'telegram', failClosed: true },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.accessGroups.status',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.accessGroups.open',
    args: { channel: 'telegram', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { channel: 'telegram' } },
    { method: 'open', args: { channel: 'telegram', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'telegram', failClosed: true }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'telegram', failClosed: true },
  });
});

test('xenesis channel pairing capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.channels.pairing.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.channels.pairing.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('channel'), false);
  assert.equal(statusSchemaProperties.channel?.enum.includes('telegram'), true);
  assert.equal(statusSchemaProperties.channel?.enum.includes('signal'), true);
  assert.equal(statusSchemaProperties.id?.enum.includes('whatsapp'), true);
  assert.equal(openSchemaProperties.channel?.enum.includes('telegram'), true);
  assert.equal(openSchemaProperties.channel?.enum.includes('signal'), true);
  assert.equal(openSchemaProperties.id?.enum.includes('whatsapp'), true);

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelPairingStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'signal', pairingState: 'planned' }],
      };
    },
    openXenesisChannelPairing: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'signal', pairingState: 'planned' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.pairing.status',
    args: { channel: 'signal' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.pairing.open',
    args: { channel: 'signal', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { channel: 'signal' } },
    { method: 'open', args: { channel: 'signal', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'signal', pairingState: 'planned' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'signal', pairingState: 'planned' },
  });
});

test('xenesis channel user story capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.channels.userStories.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.channels.userStories.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  for (const messenger of ['telegram', 'slack', 'discord', 'webhook', 'signal', 'google-chat', 'email']) {
    assert.equal(
      statusSchemaProperties.id?.enum.includes(messenger),
      true,
      `${messenger} should be accepted by status`,
    );
    assert.equal(openSchemaProperties.id?.enum.includes(messenger), true, `${messenger} should be accepted by open`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelUserStoriesStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'telegram', workflowType: 'remote-prompt' }],
      };
    },
    openXenesisChannelUserStory: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'telegram' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.userStories.status',
    args: { id: 'telegram' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.userStories.open',
    args: { id: 'telegram' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'telegram' } },
    { method: 'open', args: { id: 'telegram' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'telegram', workflowType: 'remote-prompt' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'telegram' },
  });
});

test('xenesis tool setup capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.setup.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.setup.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.deepEqual(statusSchemaProperties.id?.enum, [
    'fetch',
    'filesystem',
    'github',
    'notion',
    'linear',
    'google-workspace',
    'google-calendar',
  ]);
  assert.deepEqual(openSchemaProperties.id?.enum, [
    'fetch',
    'filesystem',
    'github',
    'notion',
    'linear',
    'google-workspace',
    'google-calendar',
  ]);

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolSetupStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'google-calendar' }],
      };
    },
    openXenesisToolSetup: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.setup.status',
    args: { id: 'google-calendar' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.setup.open',
    args: { id: 'notion', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'google-calendar' } },
    { method: 'open', args: { id: 'notion', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'google-calendar' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'notion' },
  });
});

test('xenesis tool connector status capability is registered and dispatches to the adapter', async () => {
  const capability = findDeskBridgeCapability('xd.xenesis.tools.connectors.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.connectors.open');
  const schemaProperties = (capability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(capability?.permission, 'read');
  assert.equal(capability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.deepEqual(schemaProperties.id?.enum, [
    'fetch',
    'filesystem',
    'github',
    'notion',
    'linear',
    'google-workspace',
    'google-calendar',
  ]);
  assert.deepEqual(schemaProperties.tool?.enum, [
    'fetch',
    'filesystem',
    'github',
    'notion',
    'linear',
    'google-workspace',
    'google-calendar',
  ]);
  assert.deepEqual(openSchemaProperties.id?.enum, [
    'fetch',
    'filesystem',
    'github',
    'notion',
    'linear',
    'google-workspace',
    'google-calendar',
  ]);

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolConnectorsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'google-calendar', credentialState: 'planned' }],
      };
    },
    openXenesisToolConnector: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion' },
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.connectors.status',
    args: { tool: 'google-calendar' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.connectors.open',
    args: { id: 'notion', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { tool: 'google-calendar' } },
    { method: 'open', args: { id: 'notion', ensureVisible: true } },
  ]);
  assert.deepEqual(result.result, {
    ok: true,
    items: [{ id: 'google-calendar', credentialState: 'planned' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'notion' },
  });
});

test('xenesis tool view capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.views.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.views.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.equal(openSchemaProperties.section?.enum.includes('mcp-template'), true);
  assert.equal(openSchemaProperties.section?.enum.includes('oauth-draft'), true);
  for (const tool of ['fetch', 'notion', 'google-calendar']) {
    assert.equal(statusSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by status`);
    assert.equal(openSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by open`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolViewsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'notion' }],
      };
    },
    openXenesisToolView: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.views.status',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.views.open',
    args: { id: 'notion', section: 'mcp-template' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'notion' } },
    { method: 'open', args: { id: 'notion', section: 'mcp-template' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'notion' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'notion' },
  });
});

test('xenesis tool user story capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.userStories.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.userStories.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  for (const tool of ['notion', 'linear', 'google-workspace', 'google-calendar']) {
    assert.equal(statusSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by status`);
    assert.equal(statusSchemaProperties.tool?.enum.includes(tool), true, `${tool} should be accepted by status alias`);
    assert.equal(openSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by open`);
    assert.equal(openSchemaProperties.tool?.enum.includes(tool), true, `${tool} should be accepted by open alias`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolUserStoriesStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'google-calendar', workflowType: 'calendar-context' }],
      };
    },
    openXenesisToolUserStory: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'google-calendar', workflowType: 'calendar-context' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.userStories.status',
    args: { tool: 'google-calendar' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.userStories.open',
    args: { id: 'google-calendar' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { tool: 'google-calendar' } },
    { method: 'open', args: { id: 'google-calendar' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'google-calendar', workflowType: 'calendar-context' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'google-calendar', workflowType: 'calendar-context' },
  });
});

test('xenesis tool install plan capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.installPlans.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.installPlans.open');
  const requestCapability = findDeskBridgeCapability('xd.xenesis.tools.installPlans.request');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  const requestSchemaProperties = (requestCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.equal(requestCapability?.permission, 'write');
  assert.equal(requestCapability?.approval, 'when-external');
  assert.deepEqual(requestCapability?.schema?.required, ['id']);
  for (const tool of ['notion', 'linear', 'google-workspace', 'google-calendar']) {
    assert.equal(statusSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by status`);
    assert.equal(statusSchemaProperties.tool?.enum.includes(tool), true, `${tool} should be accepted by status alias`);
    assert.equal(openSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by open`);
    assert.equal(openSchemaProperties.tool?.enum.includes(tool), true, `${tool} should be accepted by open alias`);
    assert.equal(requestSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by request`);
    assert.equal(
      requestSchemaProperties.tool?.enum.includes(tool),
      true,
      `${tool} should be accepted by request alias`,
    );
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolInstallPlansStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'notion', installMode: 'copy-template' }],
      };
    },
    openXenesisToolInstallPlan: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion', installMode: 'copy-template' },
      };
    },
    requestXenesisToolInstallPlan: (args) => {
      calls.push({ method: 'request', args });
      return {
        ok: true,
        item: { id: 'notion', installMode: 'copy-template' },
        actionInboxItem: { id: 'install-plan-review' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.installPlans.status',
    args: { tool: 'notion' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.installPlans.open',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const requestResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.installPlans.request',
    args: { id: 'notion' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(requestResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { tool: 'notion' } },
    { method: 'open', args: { id: 'notion' } },
    { method: 'request', args: { id: 'notion' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'notion', installMode: 'copy-template' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'notion', installMode: 'copy-template' },
  });
  assert.deepEqual(requestResult.result, {
    ok: true,
    item: { id: 'notion', installMode: 'copy-template' },
    actionInboxItem: { id: 'install-plan-review' },
  });
});

test('xenesis MCP install draft capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.mcpInstallDrafts.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.mcpInstallDrafts.open');
  const requestCapability = findDeskBridgeCapability('xd.xenesis.tools.mcpInstallDrafts.request');
  const applyCapability = findDeskBridgeCapability('xd.xenesis.tools.mcpInstallDrafts.apply');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  const requestSchemaProperties = (requestCapability?.schema?.properties ?? {}) as Record<string, any>;
  const applySchemaProperties = (applyCapability?.schema?.properties ?? {}) as Record<string, any>;

  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.equal(requestCapability?.permission, 'write');
  assert.equal(requestCapability?.approval, 'when-external');
  assert.deepEqual(requestCapability?.schema?.required, ['id']);
  assert.equal(applyCapability?.permission, 'write');
  assert.equal(applyCapability?.approval, 'when-external');
  assert.deepEqual(applyCapability?.schema?.required, ['id']);
  assert.deepEqual(applySchemaProperties.target?.enum, ['codex', 'claude', 'cursor', 'all']);
  for (const tool of ['fetch', 'github', 'notion', 'linear', 'google-calendar']) {
    assert.equal(statusSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by status`);
    assert.equal(statusSchemaProperties.tool?.enum.includes(tool), true, `${tool} should be accepted by status alias`);
    assert.equal(openSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by open`);
    assert.equal(requestSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by request`);
    assert.equal(applySchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by apply`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolMcpInstallDraftsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'notion', draftStatus: 'ready' }],
      };
    },
    openXenesisToolMcpInstallDraft: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion', draftStatus: 'ready' },
      };
    },
    requestXenesisToolMcpInstallDraft: (args) => {
      calls.push({ method: 'request', args });
      return {
        ok: true,
        id: 'notion',
        actionInboxItem: { id: 'mcp-install-notion' },
      };
    },
    applyXenesisToolMcpInstallDraft: (args) => {
      calls.push({ method: 'apply', args });
      return {
        ok: true,
        id: 'notion',
        serverName: 'notion',
        targets: [{ id: 'codex', changed: true }],
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.mcpInstallDrafts.status',
    args: { tool: 'notion' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.mcpInstallDrafts.open',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const requestResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.mcpInstallDrafts.request',
    args: { id: 'notion' },
    source: 'xenesis',
    approved: true,
  });
  const applyResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.mcpInstallDrafts.apply',
    args: { id: 'notion', target: 'codex' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(requestResult.ok, true);
  assert.equal(applyResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { tool: 'notion' } },
    { method: 'open', args: { id: 'notion' } },
    { method: 'request', args: { id: 'notion' } },
    { method: 'apply', args: { id: 'notion', target: 'codex' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'notion', draftStatus: 'ready' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'notion', draftStatus: 'ready' },
  });
  assert.deepEqual(requestResult.result, {
    ok: true,
    id: 'notion',
    actionInboxItem: { id: 'mcp-install-notion' },
  });
  assert.deepEqual(applyResult.result, {
    ok: true,
    id: 'notion',
    serverName: 'notion',
    targets: [{ id: 'codex', changed: true }],
  });
});

test('xenesis tool OAuth draft capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.oauthDrafts.status');
  const setupPacketCapability = findDeskBridgeCapability('xd.xenesis.tools.oauthDrafts.setupPacket');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.oauthDrafts.open');
  const requestCapability = findDeskBridgeCapability('xd.xenesis.tools.oauthDrafts.request');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const setupPacketSchemaProperties = (setupPacketCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  const requestSchemaProperties = (requestCapability?.schema?.properties ?? {}) as Record<string, any>;

  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(setupPacketCapability?.permission, 'read');
  assert.equal(setupPacketCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.equal(requestCapability?.permission, 'write');
  assert.equal(requestCapability?.approval, 'when-external');
  assert.deepEqual(requestCapability?.schema?.required, ['id']);
  for (const tool of ['google-workspace', 'google-calendar']) {
    assert.equal(statusSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by status`);
    assert.equal(statusSchemaProperties.tool?.enum.includes(tool), true, `${tool} should be accepted by status alias`);
    assert.equal(
      setupPacketSchemaProperties.id?.enum.includes(tool),
      true,
      `${tool} should be accepted by setup packet`,
    );
    assert.equal(
      setupPacketSchemaProperties.tool?.enum.includes(tool),
      true,
      `${tool} should be accepted by setup packet alias`,
    );
    assert.equal(openSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by open`);
    assert.equal(requestSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by request`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolOAuthDraftsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'google-calendar', draftStatus: 'planned-template' }],
      };
    },
    getXenesisToolOAuthSetupPacket: (args) => {
      calls.push({ method: 'setupPacket', args });
      return {
        ok: true,
        items: [{ id: 'google-calendar', setupPacket: { packetStatus: 'planned-template' } }],
      };
    },
    openXenesisToolOAuthDraft: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'google-calendar', draftStatus: 'planned-template' },
      };
    },
    requestXenesisToolOAuthDraft: (args) => {
      calls.push({ method: 'request', args });
      return {
        ok: true,
        id: 'google-calendar',
        actionInboxItem: { id: 'tool-oauth-draft-google-calendar' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.oauthDrafts.status',
    args: { tool: 'google-calendar' },
    source: 'xenesis',
  });
  const setupPacketResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.oauthDrafts.setupPacket',
    args: { id: 'google-calendar' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.oauthDrafts.open',
    args: { id: 'google-calendar' },
    source: 'xenesis',
  });
  const requestResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.oauthDrafts.request',
    args: { id: 'google-calendar' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(statusResult.ok, true);
  assert.equal(setupPacketResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(requestResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { tool: 'google-calendar' } },
    { method: 'setupPacket', args: { id: 'google-calendar' } },
    { method: 'open', args: { id: 'google-calendar' } },
    { method: 'request', args: { id: 'google-calendar' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'google-calendar', draftStatus: 'planned-template' }],
  });
  assert.deepEqual(setupPacketResult.result, {
    ok: true,
    items: [{ id: 'google-calendar', setupPacket: { packetStatus: 'planned-template' } }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'google-calendar', draftStatus: 'planned-template' },
  });
  assert.deepEqual(requestResult.result, {
    ok: true,
    id: 'google-calendar',
    actionInboxItem: { id: 'tool-oauth-draft-google-calendar' },
  });
});

test('xenesis tool action catalog capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.actions.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.actions.open');
  const requestCapability = findDeskBridgeCapability('xd.xenesis.tools.actions.request');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  const requestSchemaProperties = (requestCapability?.schema?.properties ?? {}) as Record<string, any>;

  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.equal(requestCapability?.permission, 'write');
  assert.equal(requestCapability?.approval, 'when-external');
  assert.deepEqual(requestCapability?.schema?.required, ['id']);
  for (const tool of ['fetch', 'filesystem', 'github', 'notion', 'linear', 'google-workspace', 'google-calendar']) {
    assert.equal(statusSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by status`);
    assert.equal(statusSchemaProperties.tool?.enum.includes(tool), true, `${tool} should be accepted by status alias`);
    assert.equal(openSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by open`);
    assert.equal(requestSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by request`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolActionCatalogStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'notion', runtimeSupport: 'ready-template' }],
      };
    },
    openXenesisToolActionCatalog: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion', runtimeSupport: 'ready-template' },
      };
    },
    requestXenesisToolActionCatalog: (args) => {
      calls.push({ method: 'request', args });
      return {
        ok: true,
        id: 'notion',
        actionInboxItem: { id: 'tool-action-catalog-notion' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.actions.status',
    args: { tool: 'notion' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.actions.open',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const requestResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.actions.request',
    args: { id: 'notion' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(requestResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { tool: 'notion' } },
    { method: 'open', args: { id: 'notion' } },
    { method: 'request', args: { id: 'notion' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'notion', runtimeSupport: 'ready-template' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'notion', runtimeSupport: 'ready-template' },
  });
  assert.deepEqual(requestResult.result, {
    ok: true,
    id: 'notion',
    actionInboxItem: { id: 'tool-action-catalog-notion' },
  });
});

test('xenesis tool open capabilities allow catalog opens without focused ids', async () => {
  const openPaths = [
    'xd.xenesis.tools.setup.open',
    'xd.xenesis.tools.connectors.open',
    'xd.xenesis.tools.views.open',
    'xd.xenesis.tools.userStories.open',
    'xd.xenesis.tools.installPlans.open',
    'xd.xenesis.tools.mcpInstallDrafts.open',
    'xd.xenesis.tools.oauthDrafts.open',
    'xd.xenesis.tools.actions.open',
  ];
  for (const path of openPaths) {
    assert.equal(schemaRequiredFields(findDeskBridgeCapability(path)).includes('id'), false, `${path} id optional`);
  }

  const calls: Array<{ path: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    openXenesisToolSetup: (args) => {
      calls.push({ path: 'xd.xenesis.tools.setup.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisToolConnector: (args) => {
      calls.push({ path: 'xd.xenesis.tools.connectors.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisToolView: (args) => {
      calls.push({ path: 'xd.xenesis.tools.views.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisToolUserStory: (args) => {
      calls.push({ path: 'xd.xenesis.tools.userStories.open', args });
      return { ok: true, total: 4 };
    },
    openXenesisToolInstallPlan: (args) => {
      calls.push({ path: 'xd.xenesis.tools.installPlans.open', args });
      return { ok: true, total: 4 };
    },
    openXenesisToolMcpInstallDraft: (args) => {
      calls.push({ path: 'xd.xenesis.tools.mcpInstallDrafts.open', args });
      return { ok: true, total: 5 };
    },
    openXenesisToolOAuthDraft: (args) => {
      calls.push({ path: 'xd.xenesis.tools.oauthDrafts.open', args });
      return { ok: true, total: 2 };
    },
    openXenesisToolActionCatalog: (args) => {
      calls.push({ path: 'xd.xenesis.tools.actions.open', args });
      return { ok: true, total: 7 };
    },
  };

  for (const path of openPaths) {
    const result = await callDeskBridgeCapability(api, {
      path,
      args: { ensureVisible: true },
      source: 'xenesis',
    });
    assert.equal(result.ok, true, `${path} should dispatch`);
  }

  assert.deepEqual(
    calls,
    openPaths.map((path) => ({ path, args: { ensureVisible: true } })),
  );
});

test('xenesis channel profile draft capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.channels.profileDrafts.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.channels.profileDrafts.open');
  const requestCapability = findDeskBridgeCapability('xd.xenesis.channels.profileDrafts.request');
  const applyCapability = findDeskBridgeCapability('xd.xenesis.channels.profileDrafts.apply');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  const requestSchemaProperties = (requestCapability?.schema?.properties ?? {}) as Record<string, any>;
  const applySchemaProperties = (applyCapability?.schema?.properties ?? {}) as Record<string, any>;

  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('channel'), false);
  assert.equal(requestCapability?.permission, 'write');
  assert.equal(requestCapability?.approval, 'when-external');
  assert.deepEqual(requestCapability?.schema?.required, ['channel']);
  assert.equal(applyCapability?.permission, 'write');
  assert.equal(applyCapability?.approval, 'when-external');
  assert.deepEqual(applyCapability?.schema?.required, ['channel']);
  for (const channel of ['telegram', 'slack', 'discord', 'webhook', 'signal', 'google-chat', 'zalo']) {
    assert.equal(statusSchemaProperties.channel?.enum.includes(channel), true, `${channel} status channel enum`);
    assert.equal(statusSchemaProperties.id?.enum.includes(channel), true, `${channel} status id enum`);
    assert.equal(openSchemaProperties.channel?.enum.includes(channel), true, `${channel} open channel enum`);
    assert.equal(requestSchemaProperties.channel?.enum.includes(channel), true, `${channel} request channel enum`);
  }
  for (const channel of ['telegram', 'slack', 'discord', 'webhook']) {
    assert.equal(applySchemaProperties.channel?.enum.includes(channel), true, `${channel} apply channel enum`);
  }
  for (const channel of ['signal', 'google-chat', 'zalo']) {
    assert.equal(applySchemaProperties.channel?.enum.includes(channel), false, `${channel} apply channel enum`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelProfileDraftsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'telegram', draftStatus: 'missing-required-field' }],
      };
    },
    openXenesisChannelProfileDraft: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'telegram', draftStatus: 'missing-required-field' },
      };
    },
    requestXenesisChannelProfileDraft: (args) => {
      calls.push({ method: 'request', args });
      return {
        ok: true,
        channel: 'telegram',
        actionInboxItem: { id: 'channel-profile-draft-telegram' },
      };
    },
    applyXenesisChannelProfileDraft: (args) => {
      calls.push({ method: 'apply', args });
      return {
        ok: true,
        channel: 'telegram',
        item: { id: 'telegram', draftStatus: 'ready' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.profileDrafts.status',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.profileDrafts.open',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });
  const requestResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.profileDrafts.request',
    args: { channel: 'telegram' },
    source: 'xenesis',
    approved: true,
  });
  const applyResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.profileDrafts.apply',
    args: { channel: 'telegram' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(requestResult.ok, true);
  assert.equal(applyResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { channel: 'telegram' } },
    { method: 'open', args: { channel: 'telegram' } },
    { method: 'request', args: { channel: 'telegram' } },
    { method: 'apply', args: { channel: 'telegram' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'telegram', draftStatus: 'missing-required-field' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'telegram', draftStatus: 'missing-required-field' },
  });
  assert.deepEqual(requestResult.result, {
    ok: true,
    channel: 'telegram',
    actionInboxItem: { id: 'channel-profile-draft-telegram' },
  });
  assert.deepEqual(applyResult.result, {
    ok: true,
    channel: 'telegram',
    item: { id: 'telegram', draftStatus: 'ready' },
  });
});

test('xenesis messenger view capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.messengers.views.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.messengers.views.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  for (const messenger of ['telegram', 'signal', 'google-chat', 'rocket-chat', 'dingding']) {
    assert.equal(
      statusSchemaProperties.id?.enum.includes(messenger),
      true,
      `${messenger} should be accepted by status`,
    );
    assert.equal(
      statusSchemaProperties.messenger?.enum.includes(messenger),
      true,
      `${messenger} should be accepted by status alias`,
    );
    assert.equal(openSchemaProperties.id?.enum.includes(messenger), true, `${messenger} should be accepted by open`);
    assert.equal(
      openSchemaProperties.messenger?.enum.includes(messenger),
      true,
      `${messenger} should be accepted by open alias`,
    );
  }
  assert.equal(openSchemaProperties.section?.enum.includes('routing'), true);
  assert.equal(openSchemaProperties.section?.enum.includes('profile-draft'), true);

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisMessengerViewsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'telegram' }],
      };
    },
    openXenesisMessengerView: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'telegram' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.messengers.views.status',
    args: { id: 'telegram' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.messengers.views.open',
    args: { id: 'telegram', section: 'routing' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'telegram' } },
    { method: 'open', args: { id: 'telegram', section: 'routing' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'telegram' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'telegram' },
  });
});

test('xenesis messenger and channel open capabilities allow catalog opens without focused selectors', async () => {
  const openPaths = [
    'xd.xenesis.channels.routing.open',
    'xd.xenesis.channels.safety.open',
    'xd.xenesis.channels.accessGroups.open',
    'xd.xenesis.channels.pairing.open',
    'xd.xenesis.channels.userStories.open',
    'xd.xenesis.channels.setupPlans.open',
    'xd.xenesis.channels.profileDrafts.open',
    'xd.xenesis.messengers.views.open',
  ];
  for (const path of openPaths) {
    const selectorField =
      path === 'xd.xenesis.messengers.views.open' ||
      path === 'xd.xenesis.channels.userStories.open' ||
      path === 'xd.xenesis.channels.setupPlans.open'
        ? 'id'
        : 'channel';
    assert.equal(
      schemaRequiredFields(findDeskBridgeCapability(path)).includes(selectorField),
      false,
      `${path} selector optional`,
    );
  }

  const calls: Array<{ path: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    openXenesisChannelRouting: (args) => {
      calls.push({ path: 'xd.xenesis.channels.routing.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisChannelSafety: (args) => {
      calls.push({ path: 'xd.xenesis.channels.safety.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisChannelAccessGroups: (args) => {
      calls.push({ path: 'xd.xenesis.channels.accessGroups.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisChannelPairing: (args) => {
      calls.push({ path: 'xd.xenesis.channels.pairing.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisChannelUserStory: (args) => {
      calls.push({ path: 'xd.xenesis.channels.userStories.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisChannelSetupPlan: (args) => {
      calls.push({ path: 'xd.xenesis.channels.setupPlans.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisChannelProfileDraft: (args) => {
      calls.push({ path: 'xd.xenesis.channels.profileDrafts.open', args });
      return { ok: true, total: 7 };
    },
    openXenesisMessengerView: (args) => {
      calls.push({ path: 'xd.xenesis.messengers.views.open', args });
      return { ok: true, total: 7 };
    },
  };

  for (const path of openPaths) {
    const result = await callDeskBridgeCapability(api, {
      path,
      args: { ensureVisible: true },
      source: 'xenesis',
    });
    assert.equal(result.ok, true, `${path} should dispatch`);
  }

  assert.deepEqual(
    calls,
    openPaths.map((path) => ({ path, args: { ensureVisible: true } })),
  );
});

test('xenesis guide catalog capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.guides.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.guides.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.equal(openSchemaProperties.openFile?.type, 'boolean');
  assert.equal(openSchemaProperties.openFile?.default, false);
  for (const guide of [
    'onboarding-connections',
    'cr-mcp-gateway-bots',
    'openclaw-channel-setup',
    'external-tool-integrations',
    'agent-user-stories',
  ]) {
    assert.equal(statusSchemaProperties.id?.enum.includes(guide), true, `${guide} should be accepted by status`);
    assert.equal(openSchemaProperties.id?.enum.includes(guide), true, `${guide} should be accepted by open`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisGuidesStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'agent-user-stories', guideType: 'user-story-catalog' }],
      };
    },
    openXenesisGuide: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'agent-user-stories' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.guides.status',
    args: { id: 'agent-user-stories' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.guides.open',
    args: { id: 'agent-user-stories' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'agent-user-stories' } },
    { method: 'open', args: { id: 'agent-user-stories' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'agent-user-stories', guideType: 'user-story-catalog' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'agent-user-stories' },
  });
});

test('xenesis tool setup plan capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.setupPlans.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.setupPlans.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assertOpenCapabilityDetailFocus('xd.xenesis.tools.setupPlans.open', 'tool-setup-plan');
  for (const tool of XENESIS_CONNECTION_TOOL_IDS) {
    assert.equal(statusSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by status`);
    assert.equal(openSchemaProperties.id?.enum.includes(tool), true, `${tool} should be accepted by open`);
    assert.equal(openSchemaProperties.tool?.enum.includes(tool), true, `${tool} should be accepted by open alias`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolSetupPlansStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'google-calendar', runtimeSupport: 'planned-oauth' }],
      };
    },
    openXenesisToolSetupPlan: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'google-calendar', runtimeSupport: 'planned-oauth' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.setupPlans.status',
    args: { id: 'google-calendar' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.setupPlans.open',
    args: { id: 'google-calendar', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'google-calendar' } },
    { method: 'open', args: { id: 'google-calendar', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'google-calendar', runtimeSupport: 'planned-oauth' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'google-calendar', runtimeSupport: 'planned-oauth' },
  });
});

test('xenesis channel setup plan capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.channels.setupPlans.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.channels.setupPlans.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assertOpenCapabilityDetailFocus('xd.xenesis.channels.setupPlans.open', 'channel-setup-plan');
  for (const channel of XENESIS_CONNECTION_MESSENGER_IDS) {
    assert.equal(statusSchemaProperties.id?.enum.includes(channel), true, `${channel} should be accepted by status`);
    assert.equal(
      statusSchemaProperties.channel?.enum.includes(channel),
      true,
      `${channel} should be accepted by status alias`,
    );
    assert.equal(openSchemaProperties.id?.enum.includes(channel), true, `${channel} should be accepted by open`);
    assert.equal(
      openSchemaProperties.channel?.enum.includes(channel),
      true,
      `${channel} should be accepted by open alias`,
    );
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelSetupPlansStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'telegram', runtimeSupport: 'implemented' }],
      };
    },
    openXenesisChannelSetupPlan: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'telegram', runtimeSupport: 'implemented' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.setupPlans.status',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.setupPlans.open',
    args: { id: 'telegram', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { channel: 'telegram' } },
    { method: 'open', args: { id: 'telegram', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'telegram', runtimeSupport: 'implemented' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'telegram', runtimeSupport: 'implemented' },
  });
});

test('xenesis provider setup plan capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.providers.setupPlans.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.providers.setupPlans.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('provider'), false);
  assertOpenCapabilityDetailFocus('xd.xenesis.providers.setupPlans.open', 'provider-setup-plan');
  for (const provider of XENESIS_CONNECTION_PROVIDER_IDS) {
    assert.equal(statusSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
    assert.equal(
      openSchemaProperties.provider?.enum.includes(provider),
      true,
      `${provider} should be accepted by open`,
    );
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisProviderSetupPlansStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'provider-codex-app-server', provider: 'codex-app-server' }],
      };
    },
    openXenesisProviderSetupPlan: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'provider-codex-app-server', provider: 'codex-app-server' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.setupPlans.status',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.setupPlans.open',
    args: { provider: 'codex-app-server', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { provider: 'codex-app-server' } },
    { method: 'open', args: { provider: 'codex-app-server', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'provider-codex-app-server', provider: 'codex-app-server' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'provider-codex-app-server', provider: 'codex-app-server' },
  });
});

test('xenesis provider setup capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.providers.setup.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.providers.setup.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('provider'), false);
  for (const provider of XENESIS_CONNECTION_PROVIDER_IDS) {
    assert.equal(statusSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
    assert.equal(
      openSchemaProperties.provider?.enum.includes(provider),
      true,
      `${provider} should be accepted by open`,
    );
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisProviderSetupStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ provider: 'codex-app-server' }],
      };
    },
    openXenesisProviderSetup: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'provider-codex-app-server' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.setup.status',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.setup.open',
    args: { provider: 'codex-app-server', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { provider: 'codex-app-server' } },
    { method: 'open', args: { provider: 'codex-app-server', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ provider: 'codex-app-server' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'provider-codex-app-server' },
  });
});

test('xenesis provider routing capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.providers.routing.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.providers.routing.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openRequired = Array.isArray(openCapability?.schema?.required)
    ? (openCapability.schema.required as string[])
    : [];
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(openRequired.includes('provider'), false);
  for (const provider of XENESIS_CONNECTION_PROVIDER_IDS) {
    assert.equal(statusSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
    assert.equal(
      openSchemaProperties.provider?.enum.includes(provider),
      true,
      `${provider} should be accepted by open`,
    );
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisProviderRoutingStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ provider: 'codex-app-server', fallbackChainVisible: true }],
      };
    },
    openXenesisProviderRouting: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { provider: 'codex-app-server', fallbackChainVisible: true },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.routing.status',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.routing.open',
    args: { provider: 'codex-app-server', ensureVisible: true },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { provider: 'codex-app-server' } },
    { method: 'open', args: { provider: 'codex-app-server', ensureVisible: true } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ provider: 'codex-app-server', fallbackChainVisible: true }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { provider: 'codex-app-server', fallbackChainVisible: true },
  });
});

test('xenesis provider view capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.providers.views.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.providers.views.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('provider'), false);
  for (const provider of XENESIS_CONNECTION_PROVIDER_IDS) {
    assert.equal(statusSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
    assert.equal(openSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisProviderViewsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'provider-codex-app-server' }],
      };
    },
    openXenesisProviderView: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'provider-codex-app-server' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.views.status',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.views.open',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { provider: 'codex-app-server' } },
    { method: 'open', args: { provider: 'codex-app-server' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'provider-codex-app-server' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'provider-codex-app-server' },
  });
});

test('xenesis provider profile draft capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.providers.profileDrafts.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.providers.profileDrafts.open');
  const requestCapability = findDeskBridgeCapability('xd.xenesis.providers.profileDrafts.request');
  const applyCapability = findDeskBridgeCapability('xd.xenesis.providers.profileDrafts.apply');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  const requestSchemaProperties = (requestCapability?.schema?.properties ?? {}) as Record<string, any>;
  const applySchemaProperties = (applyCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('provider'), false);
  assert.equal(requestCapability?.permission, 'write');
  assert.equal(requestCapability?.approval, 'when-external');
  assert.deepEqual(requestCapability?.schema?.required, ['provider']);
  assert.equal(applyCapability?.permission, 'write');
  assert.equal(applyCapability?.approval, 'when-external');
  assert.deepEqual(applyCapability?.schema?.required, ['provider']);
  assert.equal(applySchemaProperties.model?.type, 'string');
  assert.equal(applySchemaProperties.baseUrl?.type, 'string');
  assert.equal(applySchemaProperties.reasoningEffort?.enum.includes('medium'), true);
  assert.equal(applySchemaProperties.apiKey, undefined);
  for (const provider of XENESIS_CONNECTION_PROVIDER_IDS) {
    assert.equal(statusSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
    assert.equal(openSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
    assert.equal(requestSchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
    assert.equal(applySchemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
  }

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisProviderProfileDraftsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ provider: 'codex-app-server', draftStatus: 'ready' }],
      };
    },
    openXenesisProviderProfileDraft: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { provider: 'codex-app-server', draftStatus: 'ready' },
      };
    },
    requestXenesisProviderProfileDraft: (args) => {
      calls.push({ method: 'request', args });
      return {
        ok: true,
        provider: 'codex-app-server',
        actionInboxItem: { id: 'provider-profile-draft-codex-app-server' },
      };
    },
    applyXenesisProviderProfileDraft: (args) => {
      calls.push({ method: 'apply', args });
      return {
        ok: true,
        provider: 'codex-app-server',
        activeAiProviderProfileId: 'default',
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.profileDrafts.status',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.profileDrafts.open',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });
  const requestResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.profileDrafts.request',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
    approved: true,
  });
  const applyResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.profileDrafts.apply',
    args: { provider: 'codex-app-server', model: 'gpt-5-codex' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(requestResult.ok, true);
  assert.equal(applyResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { provider: 'codex-app-server' } },
    { method: 'open', args: { provider: 'codex-app-server' } },
    { method: 'request', args: { provider: 'codex-app-server' } },
    { method: 'apply', args: { provider: 'codex-app-server', model: 'gpt-5-codex' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ provider: 'codex-app-server', draftStatus: 'ready' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { provider: 'codex-app-server', draftStatus: 'ready' },
  });
  assert.deepEqual(requestResult.result, {
    ok: true,
    provider: 'codex-app-server',
    actionInboxItem: { id: 'provider-profile-draft-codex-app-server' },
  });
  assert.deepEqual(applyResult.result, {
    ok: true,
    provider: 'codex-app-server',
    activeAiProviderProfileId: 'default',
  });
});

test('xenesis provider open capabilities allow catalog opens without focused providers', async () => {
  const openPaths = [
    'xd.xenesis.providers.setup.open',
    'xd.xenesis.providers.views.open',
    'xd.xenesis.providers.profileDrafts.open',
  ];
  for (const path of openPaths) {
    assert.equal(
      schemaRequiredFields(findDeskBridgeCapability(path)).includes('provider'),
      false,
      `${path} provider optional`,
    );
  }

  const calls: Array<{ path: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    openXenesisProviderSetup: (args) => {
      calls.push({ path: 'xd.xenesis.providers.setup.open', args });
      return { ok: true, total: 16 };
    },
    openXenesisProviderView: (args) => {
      calls.push({ path: 'xd.xenesis.providers.views.open', args });
      return { ok: true, total: 16 };
    },
    openXenesisProviderProfileDraft: (args) => {
      calls.push({ path: 'xd.xenesis.providers.profileDrafts.open', args });
      return { ok: true, total: 16 };
    },
  };

  for (const path of openPaths) {
    const result = await callDeskBridgeCapability(api, {
      path,
      args: { ensureVisible: true },
      source: 'xenesis',
    });
    assert.equal(result.ok, true, `${path} should dispatch`);
  }

  assert.deepEqual(
    calls,
    openPaths.map((path) => ({ path, args: { ensureVisible: true } })),
  );
});

test('xenesis connection diagnostic runbook capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.connections.diagnostics.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.connections.diagnostics.open');
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisConnectionDiagnosticRunbooksStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [{ id: 'notion' }],
      };
    },
    openXenesisConnectionDiagnosticRunbook: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.diagnostics.status',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.diagnostics.open',
    args: { id: 'notion' },
    source: 'xenesis',
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'notion' } },
    { method: 'open', args: { id: 'notion' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [{ id: 'notion' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'notion' },
  });
});

test('xenesis connection setup request capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.connections.setupRequests.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.connections.setupRequests.open');
  const requestCapability = findDeskBridgeCapability('xd.xenesis.connections.setupRequests.request');
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.equal(schemaRequiredFields(openCapability).includes('id'), false);
  assert.equal(requestCapability?.permission, 'write');
  assert.equal(requestCapability?.approval, 'when-external');
  assert.deepEqual(requestCapability?.schema?.required, ['id']);

  const calls: Array<{ method: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisConnectionSetupRequestsStatus: (args) => {
      calls.push({ method: 'status', args });
      return {
        ok: true,
        items: [
          {
            id: 'notion',
            review: {
              status: 'pending',
              approvalSessionKey: 'xenesis-connection-setup:notion',
              actionInboxItemId: 'setup-notion',
            },
          },
        ],
      };
    },
    openXenesisConnectionSetupRequest: (args) => {
      calls.push({ method: 'open', args });
      return {
        ok: true,
        item: { id: 'notion' },
      };
    },
    requestXenesisConnectionSetup: (args) => {
      calls.push({ method: 'request', args });
      return {
        ok: true,
        id: 'notion',
        actionInboxItem: { id: 'setup-notion' },
      };
    },
  };

  const statusResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.setupRequests.status',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const openResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.setupRequests.open',
    args: { id: 'notion' },
    source: 'xenesis',
  });
  const requestResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.connections.setupRequests.request',
    args: { id: 'notion' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(statusResult.ok, true);
  assert.equal(openResult.ok, true);
  assert.equal(requestResult.ok, true);
  assert.deepEqual(calls, [
    { method: 'status', args: { id: 'notion' } },
    { method: 'open', args: { id: 'notion' } },
    { method: 'request', args: { id: 'notion' } },
  ]);
  assert.deepEqual(statusResult.result, {
    ok: true,
    items: [
      {
        id: 'notion',
        review: {
          status: 'pending',
          approvalSessionKey: 'xenesis-connection-setup:notion',
          actionInboxItemId: 'setup-notion',
        },
      },
    ],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'notion' },
  });
  assert.deepEqual(requestResult.result, {
    ok: true,
    id: 'notion',
    actionInboxItem: { id: 'setup-notion' },
  });
});

test('xenesis guide, diagnostic, and setup-request open capabilities allow catalog opens without focused ids', async () => {
  const openPaths = [
    'xd.xenesis.guides.open',
    'xd.xenesis.connections.diagnostics.open',
    'xd.xenesis.connections.setupRequests.open',
  ];
  for (const path of openPaths) {
    assert.equal(schemaRequiredFields(findDeskBridgeCapability(path)).includes('id'), false, `${path} id optional`);
  }

  const calls: Array<{ path: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    openXenesisGuide: (args) => {
      calls.push({ path: 'xd.xenesis.guides.open', args });
      return { ok: true, total: 5 };
    },
    openXenesisConnectionDiagnosticRunbook: (args) => {
      calls.push({ path: 'xd.xenesis.connections.diagnostics.open', args });
      return { ok: true, total: 9 };
    },
    openXenesisConnectionSetupRequest: (args) => {
      calls.push({ path: 'xd.xenesis.connections.setupRequests.open', args });
      return { ok: true, total: 9 };
    },
  };

  for (const path of openPaths) {
    const result = await callDeskBridgeCapability(api, {
      path,
      args: { ensureVisible: true },
      source: 'xenesis',
    });
    assert.equal(result.ok, true, `${path} should dispatch`);
  }

  assert.deepEqual(
    calls,
    openPaths.map((path) => ({ path, args: { ensureVisible: true } })),
  );
});

test('xenesis profile channel capabilities expose implemented guardrail fields', () => {
  const updateSchema = findDeskBridgeCapability('xd.xenesis.profiles.updateChannels')?.schema;
  const testCapability = findDeskBridgeCapability('xd.xenesis.profiles.testChannel');
  const testSchema = testCapability?.schema;

  assert.equal(testCapability?.permission, 'write');
  assert.equal(testCapability?.approval, 'when-external');
  assert.deepEqual(schemaRequiredFields(testCapability), ['channel']);

  for (const schema of [updateSchema, testSchema]) {
    const schemaProperties = (schema?.properties ?? {}) as Record<string, any>;
    const channelProperties = (schemaProperties.channels?.properties ?? {}) as Record<string, any>;
    for (const channel of ['telegram', 'slack', 'discord', 'webhook']) {
      const properties = channelProperties[channel]?.properties ?? {};

      assert.deepEqual(properties.approvalMode?.enum, ['readonly', 'safe', 'auto']);
      assert.equal(properties.maxTurns?.type, 'number');
      assert.equal(properties.maxTurns?.minimum, 1);
      assert.equal(properties.maxTokens?.type, 'number');
      assert.equal(properties.maxTokens?.minimum, 1);
    }
  }
});

test('xenesis profile channel test requires approval and dispatches to the adapter', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    testXenesisProfileChannel: (args) => {
      calls.push(args);
      return { ok: true, channel: 'telegram' };
    },
  };

  const pendingResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.profiles.testChannel',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });
  assert.equal(pendingResult.ok, false);
  assert.equal(pendingResult.approvalRequired, true);
  assert.deepEqual(calls, []);

  const approvedResult = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.profiles.testChannel',
    args: { channel: 'telegram' },
    source: 'xenesis',
    approved: true,
  });
  assert.equal(approvedResult.ok, true);
  assert.deepEqual(calls, [{ channel: 'telegram' }]);
});
