import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';

test('xenesis connection status capability is registered as a read path', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));

  assert.equal(paths.has('xd.xenesis.connections'), true);
  assert.equal(paths.has('xd.xenesis.connections.status'), true);
  assert.equal(paths.has('xd.xenesis.connections.open'), true);
  assert.equal(findDeskBridgeCapability('xd.xenesis.connections.status')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.xenesis.connections.status')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.xenesis.connections.open')?.permission, 'control');
  assert.equal(findDeskBridgeCapability('xd.xenesis.connections.open')?.approval, 'never');
  assert.deepEqual(findDeskBridgeCapability('xd.xenesis.connections.open')?.schema?.required, ['id']);
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

test('xenesis connection open capability focuses a settings connection card through the built-in pane adapter', async () => {
  let openedArgs: unknown = null;
  const api: DeskBridgeCapabilityAdapter = {
    openBuiltinPane: (args) => {
      openedArgs = args;
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

  assert.equal(result.ok, true);
  assert.deepEqual(openedArgs, {
    kind: 'settings',
    category: 'xenesis-agent',
    mode: 'connections',
    section: 'xenesis-connections',
    focusConnectionId: 'notion',
    ensureVisible: true,
  });
  assert.deepEqual(result.result, {
    ok: true,
    marker: 'connection-open',
  });
});

test('xenesis channel routing status capability is registered and dispatches to the adapter', async () => {
  const capability = findDeskBridgeCapability('xd.xenesis.channels.routing.status');
  const schemaProperties = (capability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(capability?.permission, 'read');
  assert.equal(capability?.approval, 'never');
  assert.deepEqual(schemaProperties.channel?.enum, ['telegram', 'slack', 'discord', 'webhook']);

  let calledArgs: unknown = null;
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisChannelRoutingStatus: (args) => {
      calledArgs = args;
      return {
        ok: true,
        items: [{ id: 'telegram' }],
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.channels.routing.status',
    args: { channel: 'telegram' },
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calledArgs, { channel: 'telegram' });
  assert.deepEqual(result.result, {
    ok: true,
    items: [{ id: 'telegram' }],
  });
});

test('xenesis tool setup status capability is registered and dispatches to the adapter', async () => {
  const capability = findDeskBridgeCapability('xd.xenesis.tools.setup.status');
  const schemaProperties = (capability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(capability?.permission, 'read');
  assert.equal(capability?.approval, 'never');
  assert.deepEqual(schemaProperties.id?.enum, [
    'fetch',
    'filesystem',
    'github',
    'notion',
    'linear',
    'google-workspace',
    'google-calendar',
  ]);

  let calledArgs: unknown = null;
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisToolSetupStatus: (args) => {
      calledArgs = args;
      return {
        ok: true,
        items: [{ id: 'google-calendar' }],
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.tools.setup.status',
    args: { id: 'google-calendar' },
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calledArgs, { id: 'google-calendar' });
  assert.deepEqual(result.result, {
    ok: true,
    items: [{ id: 'google-calendar' }],
  });
});

test('xenesis profile channel capabilities expose implemented guardrail fields', () => {
  const updateSchema = findDeskBridgeCapability('xd.xenesis.profiles.updateChannels')?.schema;
  const testSchema = findDeskBridgeCapability('xd.xenesis.profiles.testChannel')?.schema;

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
