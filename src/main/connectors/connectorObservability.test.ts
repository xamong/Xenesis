import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type { RendererObservabilityOperationEvent } from '../../shared/observabilityEvents';
import { type Connector, createConnectorRegistry, createGitHubConnector } from './connectorFramework';
import {
  clearConnectorObservabilitySink,
  observeConnectorOperation,
  setConnectorObservabilitySink,
} from './connectorObservability';
import { createGraphqlClient } from './graphqlClient';

function collectConnectorEvents(): RendererObservabilityOperationEvent[] {
  const events: RendererObservabilityOperationEvent[] = [];
  setConnectorObservabilitySink((event) => events.push(event));
  return events;
}

test('observeConnectorOperation emits redacted connector start and complete events', async () => {
  const events = collectConnectorEvents();
  try {
    const result = await observeConnectorOperation(
      {
        connectorId: 'github',
        operation: 'listRepos',
        protocol: 'http',
        method: 'GET',
        url: 'https://api.github.com/user/repos?token=secret-token&per_page=30',
        requestBody: {
          apiKey: 'sk-secret',
          visible: 'kept',
        },
      },
      async () => ({
        ok: true,
        token: 'secret-token',
        visible: 'done',
      }),
    );

    assert.deepEqual(result, { ok: true, token: 'secret-token', visible: 'done' });
    assert.equal(events.length, 2);
    assert.equal(events[0].phase, 'start');
    assert.equal(events[0].activity?.source, 'connector');
    assert.equal(events[0].activity?.label, 'connector.http.github.listRepos');
    assert.equal(events[0].network?.source, 'connector');
    assert.equal(events[0].network?.method, 'GET');
    assert.equal(events[0].network?.url, 'https://api.github.com/user/repos?token=redacted&per_page=30');
    assert.doesNotMatch(events[0].network?.requestBody ?? '', /sk-secret/);
    assert.equal(events[1].phase, 'complete');
    assert.equal(events[1].ok, true);
    assert.equal(events[1].status, 200);
    assert.match(events[1].responseBody ?? '', /visible/);
    assert.doesNotMatch(events[1].responseBody ?? '', /secret-token/);
  } finally {
    clearConnectorObservabilitySink();
  }
});

test('connector registry emits connector action telemetry around executed actions', async () => {
  const events = collectConnectorEvents();
  const registry = createConnectorRegistry();
  const connector: Connector = {
    id: 'demo',
    name: 'Demo',
    description: 'Demo connector',
    auth: { type: 'none' },
    actions: {
      ping: {
        name: 'ping',
        description: 'Ping demo',
        execute: async (params) => ({ echoed: params.visible, password: 'hidden' }),
      },
    },
    toFixture: (result) => ({ fixture: result }),
    testConnection: async () => true,
  };

  try {
    registry.register(connector);
    const result = await registry.execute('demo', 'ping', {
      visible: 'hello',
      password: 'secret-password',
    });

    assert.deepEqual(result, { fixture: { echoed: 'hello', password: 'hidden' } });
    assert.equal(events.length, 2);
    assert.equal(events[0].activity?.label, 'connector.action.demo.ping');
    assert.equal(events[0].network?.url, 'connector://demo/ping');
    assert.doesNotMatch(events[0].network?.requestBody ?? '', /secret-password/);
    assert.equal(events[1].ok, true);
    assert.doesNotMatch(events[1].responseBody ?? '', /hidden/);
  } finally {
    clearConnectorObservabilitySink();
  }
});

test('GitHub connector emits connector HTTP telemetry without leaking bearer tokens', async () => {
  const events = collectConnectorEvents();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), 'https://api.github.com/user/repos?per_page=30&sort=updated');
    assert.match(String(new Headers(init?.headers).get('authorization')), /secret-token/);
    return new Response(JSON.stringify([{ name: 'repo-one' }]), {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const connector = createGitHubConnector('secret-token');
    const result = await connector.actions.listRepos.execute({});

    assert.deepEqual(result, [{ name: 'repo-one' }]);
    assert.equal(events.length, 2);
    assert.equal(events[0].activity?.label, 'connector.http.github.listRepos');
    assert.equal(events[0].network?.url, 'https://api.github.com/user/repos?per_page=30&sort=updated');
    assert.doesNotMatch(JSON.stringify(events), /secret-token/);
  } finally {
    globalThis.fetch = originalFetch;
    clearConnectorObservabilitySink();
  }
});

test('GraphQL connector emits connector telemetry around queries', async () => {
  const events = collectConnectorEvents();
  const server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      assert.match(body, /viewer/);
      assert.equal(request.headers.authorization, 'Bearer secret-token');
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ data: { viewer: { id: 'viewer-1' } } }));
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
    const port = (server.address() as AddressInfo).port;
    const endpoint = `http://127.0.0.1:${port}/graphql?api_key=secret-query`;
    const client = await createGraphqlClient({
      endpoint,
      connectorId: 'crm',
      headers: { authorization: 'Bearer secret-token' },
    });

    const result = await client.query('{ viewer { id } }');

    assert.deepEqual(result, { viewer: { id: 'viewer-1' } });
    assert.equal(events.length, 2);
    assert.equal(events[0].activity?.label, 'connector.graphql.crm.query');
    assert.equal(events[0].network?.source, 'connector');
    assert.equal(events[0].network?.method, 'POST');
    assert.equal(events[0].network?.url, `http://127.0.0.1:${port}/graphql?api_key=redacted`);
    assert.doesNotMatch(JSON.stringify(events), /secret-token|secret-query/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    clearConnectorObservabilitySink();
  }
});
