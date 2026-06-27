import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';

function startBridgeServer(): Promise<{ server: http.Server; url: string }> {
  const server = http.createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      assert.equal(request.url, '/capabilities/call');
      assert.match(body, /xd\.memory\.proposals\.accept/);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          ok: false,
          approvalRequired: true,
          path: 'xd.memory.proposals.accept',
          actionInboxItem: {
            id: 'approval-secret-id',
            title: 'Approve hidden memory write',
            kind: 'capability',
            command: 'xd.memory.proposals.accept',
            status: 'pending',
          },
        }),
      );
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Bridge server did not expose a TCP address.'));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

function readJsonRpcResponse(child: ReturnType<typeof spawn>, id: number): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const stdout = child.stdout;
    if (!stdout) {
      reject(new Error('MCP server stdout pipe is unavailable.'));
      return;
    }
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Timed out waiting for MCP response')), 5000);
    stdout.setEncoding('utf8');
    stdout.on('data', (chunk) => {
      buffer += chunk;
      while (buffer.includes('\n')) {
        const index = buffer.indexOf('\n');
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        const parsed = JSON.parse(line);
        if (parsed.id === id) {
          clearTimeout(timer);
          resolve(parsed);
        }
      }
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`MCP server exited before response: code=${code} signal=${signal}`));
    });
  });
}

test('xenesis_desk_call_capability approval text does not expose CR path or approval id', async (t) => {
  const { server, url } = await startBridgeServer();
  t.after(() => {
    server.close();
  });

  const child = spawn(process.execPath, ['mcp/xenesis-desk-mcp-server.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      XENIS_MCP_BRIDGE_URL: url,
      XENIS_MCP_BRIDGE_TOKEN: '',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  t.after(() => {
    child.kill();
  });
  assert.ok(child.stdin);

  const responsePromise = readJsonRpcResponse(child, 1);
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'xenesis_desk_call_capability',
        arguments: {
          path: 'xd.memory.proposals.accept',
          args: { proposalId: 'proposal-secret' },
          approved: false,
        },
      },
    })}\n`,
  );

  const response = await responsePromise;
  const text = response.result.content[0].text;
  assert.match(text, /Desk approval/i);
  assert.doesNotMatch(text, /approval-secret-id/);
  assert.doesNotMatch(text, /Approval request/);
  assert.doesNotMatch(text, /actionInboxItem|approvalRequired/);
  assert.doesNotMatch(text, /xd\.memory\.proposals\.accept/);

  child.stdin.end();
  await once(child, 'exit');
});
