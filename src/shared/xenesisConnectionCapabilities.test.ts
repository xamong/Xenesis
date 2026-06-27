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

test('xenesis tool view capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.tools.views.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.tools.views.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.deepEqual(openCapability?.schema?.required, ['id']);
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

test('xenesis messenger view capabilities are registered and dispatch to the adapter', async () => {
  const statusCapability = findDeskBridgeCapability('xd.xenesis.messengers.views.status');
  const openCapability = findDeskBridgeCapability('xd.xenesis.messengers.views.open');
  const statusSchemaProperties = (statusCapability?.schema?.properties ?? {}) as Record<string, any>;
  const openSchemaProperties = (openCapability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(statusCapability?.permission, 'read');
  assert.equal(statusCapability?.approval, 'never');
  assert.equal(openCapability?.permission, 'control');
  assert.equal(openCapability?.approval, 'never');
  assert.deepEqual(openCapability?.schema?.required, ['id']);
  for (const messenger of ['telegram', 'signal', 'google-chat']) {
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
    items: [{ id: 'telegram' }],
  });
  assert.deepEqual(openResult.result, {
    ok: true,
    item: { id: 'telegram' },
  });
});

test('xenesis provider setup status capability is registered and dispatches to the adapter', async () => {
  const capability = findDeskBridgeCapability('xd.xenesis.providers.setup.status');
  const schemaProperties = (capability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(capability?.permission, 'read');
  assert.equal(capability?.approval, 'never');
  for (const provider of [
    'auto',
    'openai',
    'anthropic',
    'gemini',
    'codex-app-server',
    'codex-cli',
    'claude-cli',
    'ollama',
  ]) {
    assert.equal(schemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
  }

  let calledArgs: unknown = null;
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisProviderSetupStatus: (args) => {
      calledArgs = args;
      return {
        ok: true,
        items: [{ provider: 'codex-app-server' }],
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.setup.status',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calledArgs, { provider: 'codex-app-server' });
  assert.deepEqual(result.result, {
    ok: true,
    items: [{ provider: 'codex-app-server' }],
  });
});

test('xenesis provider routing status capability is registered and dispatches to the adapter', async () => {
  const capability = findDeskBridgeCapability('xd.xenesis.providers.routing.status');
  const schemaProperties = (capability?.schema?.properties ?? {}) as Record<string, any>;
  assert.equal(capability?.permission, 'read');
  assert.equal(capability?.approval, 'never');
  for (const provider of ['auto', 'openai', 'anthropic', 'gemini', 'codex-app-server', 'codex-cli', 'ollama']) {
    assert.equal(schemaProperties.provider?.enum.includes(provider), true, `${provider} should be accepted`);
  }

  let calledArgs: unknown = null;
  const api: DeskBridgeCapabilityAdapter = {
    getXenesisProviderRoutingStatus: (args) => {
      calledArgs = args;
      return {
        ok: true,
        items: [{ provider: 'codex-app-server', fallbackChainVisible: true }],
      };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.xenesis.providers.routing.status',
    args: { provider: 'codex-app-server' },
    source: 'xenesis',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calledArgs, { provider: 'codex-app-server' });
  assert.deepEqual(result.result, {
    ok: true,
    items: [{ provider: 'codex-app-server', fallbackChainVisible: true }],
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
  assert.deepEqual(openCapability?.schema?.required, ['provider']);
  for (const provider of ['auto', 'openai', 'codex-app-server', 'codex-cli', 'ollama']) {
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
