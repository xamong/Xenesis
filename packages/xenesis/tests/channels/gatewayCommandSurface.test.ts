import { createServer, type Server } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { startGateway, type GatewayHandle } from '../../src/gateway/index.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

interface BridgeCall {
  path: string;
  args: Record<string, unknown>;
  approved: boolean;
}

interface FetchCall {
  url: string;
  body?: unknown;
}

const handles: GatewayHandle[] = [];
const bridgeServers: Server[] = [];

afterEach(async () => {
  await Promise.allSettled(handles.splice(0).map((handle) => handle.close()));
  await Promise.allSettled(
    bridgeServers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeIdleConnections?.();
          server.closeAllConnections?.();
          server.close(() => resolve());
        }),
    ),
  );
});

async function writeMockConfig(root: string) {
  const configPath = join(root, 'xenesis.config.json');
  await writeFile(
    configPath,
    JSON.stringify(
      {
        provider: 'mock',
        model: 'mock',
        worker: { enabled: false },
        channels: {
          telegram: {
            enabled: true,
            tokenEnv: '123456:direct-token',
            allowedChatIds: [100],
            approvalMode: 'safe',
            maxTurns: 4,
            maxTokens: 1000,
          },
        },
      },
      null,
      2,
    ),
    'utf8',
  );
  return configPath;
}

async function createFakeDeskBridge() {
  const calls: BridgeCall[] = [];
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/capabilities/call') {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: 'not found' }));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      path: string;
      args?: Record<string, unknown>;
      approved?: boolean;
    };
    calls.push({ path: body.path, args: body.args ?? {}, approved: body.approved === true });
    if (body.path === 'xd.terminals.list') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          ok: true,
          sessions: [{ id: 'term-1', title: 'PowerShell', cwd: 'D:\\Work', active: true }],
        }),
      );
      return;
    }
    if (body.path === 'xd.xenesis.agents.list') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          ok: true,
          agents: [{ agentId: 'xenis-a3f91c20', title: 'Xenesis Agent', workspace: 'D:\\Work', status: 'idle' }],
        }),
      );
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  bridgeServers.push(server);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('bridge did not bind to TCP');
  return { url: `http://127.0.0.1:${address.port}`, calls };
}

function fakeTelegramFetch(updates: unknown[]) {
  const calls: FetchCall[] = [];
  let delivered = false;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    if (url.includes('/getMe')) return json({ ok: true, result: { username: 'XenesisBot' } });
    if (url.includes('/setMyCommands')) return json({ ok: true, result: true });
    if (url.includes('/getUpdates')) {
      if (delivered) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        return json({ ok: true, result: [] });
      }
      delivered = true;
      return json({ ok: true, result: updates });
    }
    if (url.includes('/sendMessage') || url.includes('/answerCallbackQuery') || url.includes('/sendChatAction')) {
      return json({ ok: true, result: true });
    }
    return json({ ok: true, result: true });
  };
  return { calls, fetchImpl };
}

function json(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
}

async function waitFor(assertion: () => void | boolean, timeoutMs = 2000) {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = assertion();
      if (value !== false) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (lastError) throw lastError;
  throw new Error('Timed out waiting for condition.');
}

describe('Gateway channel command surface', () => {
  test('routes Telegram /desk, /terminals, and /agents through shared command routers', async () => {
    const workspace = await createTempWorkspace('xenesis-channel-command-');
    const bridge = await createFakeDeskBridge();
    let gateway: GatewayHandle | undefined;
    try {
      await writeMockConfig(workspace.root);
      const { calls, fetchImpl } = fakeTelegramFetch([
        { update_id: 1, message: { chat: { id: 100 }, from: { id: 100 }, text: '/desk' } },
        { update_id: 2, message: { chat: { id: 100 }, from: { id: 100 }, text: '/terminals' } },
        { update_id: 3, message: { chat: { id: 100 }, from: { id: 100 }, text: '/agents' } },
      ]);

      gateway = await startGateway({
        cwd: workspace.root,
        env: {
          XENESIS_HOME: join(workspace.root, '.xenesis'),
          XENIS_MCP_BRIDGE_URL: bridge.url,
        },
        port: 0,
        authToken: 'test-token',
        runCli: async () => 0,
        channelFetch: fetchImpl,
        runPipeline: async () => {
          throw new Error('agent pipeline should not run for Desk channel commands');
        },
      });
      handles.push(gateway);

      await waitFor(() => {
        const sendMessages = calls.filter((call) => call.url.includes('/sendMessage'));
        expect(sendMessages.length).toBeGreaterThanOrEqual(3);
      });

      const texts = calls
        .filter((call) => call.url.includes('/sendMessage'))
        .map((call) => String((call.body as { text?: unknown } | undefined)?.text ?? ''));
      expect(texts.some((text) => text.includes('Xenesis Desk Menu'))).toBe(true);
      expect(texts.some((text) => text.includes('term-1'))).toBe(true);
      expect(texts.some((text) => text.includes('xenis-a3f91c20'))).toBe(true);
      expect(bridge.calls.map((call) => call.path)).toContain('xd.terminals.list');
      expect(bridge.calls.map((call) => call.path)).toContain('xd.xenesis.agents.list');
    } finally {
      if (gateway) {
        await gateway.close();
        const index = handles.indexOf(gateway);
        if (index >= 0) handles.splice(index, 1);
      }
      await workspace.cleanup();
    }
  });
});
