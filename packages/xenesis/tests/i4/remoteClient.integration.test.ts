import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RemoteMcpToolClient } from '../../src/extensions/mcp.js';

let httpServer: Server | undefined;
let transport: StreamableHTTPServerTransport | undefined;
let client: RemoteMcpToolClient | undefined;

afterEach(async () => {
  try {
    await client?.close();
  } catch {
    /* ignore */
  }
  try {
    await transport?.close();
  } catch {
    /* ignore */
  }
  await new Promise<void>((resolve) => (httpServer ? httpServer.close(() => resolve()) : resolve()));
  httpServer = undefined;
  transport = undefined;
  client = undefined;
});

async function startServer(): Promise<string> {
  const mcp = new McpServer({ name: 'i4-test-server', version: '0.0.1' });
  mcp.registerTool(
    'echo',
    { description: 'Echo the input text', inputSchema: { text: z.string() } },
    async ({ text }) => ({ content: [{ type: 'text', text }] }),
  );
  transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(), enableJsonResponse: true });
  await mcp.connect(transport);
  httpServer = createServer((req, res) => {
    void transport!.handleRequest(req, res);
  });
  await new Promise<void>((resolve) => httpServer!.listen(0, '127.0.0.1', () => resolve()));
  const { port } = httpServer!.address() as AddressInfo;
  return `http://127.0.0.1:${port}/mcp`;
}

describe('RemoteMcpToolClient over StreamableHTTP', () => {
  it('lists tools from a real StreamableHTTP MCP server', async () => {
    const url = await startServer();
    client = new RemoteMcpToolClient('remote', { type: 'http', url });
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('echo');
  });

  it('calls a tool and receives the echoed content', async () => {
    const url = await startServer();
    client = new RemoteMcpToolClient('remote', { type: 'http', url });
    const result = await client.callTool('echo', { text: 'hi-i4' });
    const text = (result.content as Array<{ type: string; text?: string }>).find((c) => c.type === 'text')?.text;
    expect(result.isError).not.toBe(true);
    expect(text).toBe('hi-i4');
  });
});
