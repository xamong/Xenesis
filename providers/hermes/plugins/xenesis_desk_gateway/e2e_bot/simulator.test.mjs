import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hermesRoot = path.resolve(__dirname, '..', '..', '..');
const projectRoot = path.resolve(hermesRoot, '..', '..');

function resolvePython() {
  const explicit = process.env.XD_E2E_PYTHON || process.env.PYTHON;
  if (explicit) return explicit;
  const candidates = [
    path.join(projectRoot, '.venv', 'Scripts', 'python.exe'),
    path.join(projectRoot, 'venv', 'Scripts', 'python.exe'),
    path.join(projectRoot, '.venv', 'bin', 'python'),
    path.join(projectRoot, 'venv', 'bin', 'python'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

async function requestWorker(payload) {
  const worker = spawn(resolvePython(), [path.join(__dirname, 'worker.py')], {
    cwd: hermesRoot,
    env: {
      ...process.env,
      PYTHONUTF8: process.env.PYTHONUTF8 || '1',
      PYTHONIOENCODING: process.env.PYTHONIOENCODING || 'utf-8',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const lines = createInterface({ input: worker.stdout });
  const stderr = [];
  worker.stderr.on('data', (chunk) => stderr.push(chunk.toString('utf8')));

  try {
    worker.stdin.write(`${JSON.stringify({ id: '1', ...payload })}\n`, 'utf8');
    let timeout;
    const [line] = await Promise.race([
      once(lines, 'line'),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`worker timeout: ${stderr.join('')}`)), 10000);
        timeout.unref?.();
      }),
    ]);
    clearTimeout(timeout);
    return JSON.parse(line);
  } finally {
    worker.kill();
  }
}

async function withWorker(run, options = {}) {
  const worker = spawn(resolvePython(), [path.join(__dirname, 'worker.py')], {
    cwd: hermesRoot,
    env: {
      ...process.env,
      ...(options.env || {}),
      PYTHONUTF8: process.env.PYTHONUTF8 || '1',
      PYTHONIOENCODING: process.env.PYTHONIOENCODING || 'utf-8',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const lines = createInterface({ input: worker.stdout });
  const queue = [];
  const waiters = [];
  const stderr = [];
  worker.stderr.on('data', (chunk) => stderr.push(chunk.toString('utf8')));
  lines.on('line', (line) => {
    if (waiters.length > 0) {
      waiters.shift()(line);
      return;
    }
    queue.push(line);
  });

  let nextId = 1;
  async function send(payload, timeoutMs = 10000) {
    const id = String(nextId++);
    worker.stdin.write(`${JSON.stringify({ id, ...payload })}\n`, 'utf8');
    let timeout;
    const line = await Promise.race([
      queue.length > 0 ? Promise.resolve(queue.shift()) : new Promise((resolve) => waiters.push(resolve)),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`worker timeout: ${stderr.join('')}`)), timeoutMs);
        timeout.unref?.();
      }),
    ]);
    clearTimeout(timeout);
    const response = JSON.parse(line);
    assert.equal(response.id, id);
    return response;
  }

  try {
    return await run(send);
  } finally {
    worker.kill();
  }
}

async function withGatewayServer(handler, run) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    await once(req, 'end');
    const bodyText = Buffer.concat(chunks).toString('utf8');
    const request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      bodyText,
      body: bodyText ? JSON.parse(bodyText) : undefined,
    };
    requests.push(request);
    const response = await handler(request);
    res.writeHead(response.status ?? 200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(response.body ?? { ok: true }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await run({ url: `http://127.0.0.1:${port}`, requests });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function withBridgeServer(handler, run) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    await once(req, 'end');
    const bodyText = Buffer.concat(chunks).toString('utf8');
    const request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      bodyText,
      body: bodyText ? JSON.parse(bodyText) : undefined,
    };
    requests.push(request);
    const response = await handler(request, requests.length);
    res.writeHead(response.status ?? 200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(response.body ?? { ok: true }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await run({ url: `http://127.0.0.1:${port}`, requests });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function withE2eServer(env, run) {
  const port = await getFreePort();
  const serverProcess = spawn(
    process.execPath,
    [path.join(__dirname, 'server.mjs'), '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: hermesRoot,
      env: {
        ...process.env,
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  const stdout = [];
  const stderr = [];
  serverProcess.stdout.on('data', (chunk) => stdout.push(chunk.toString('utf8')));
  serverProcess.stderr.on('data', (chunk) => stderr.push(chunk.toString('utf8')));
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 10000) {
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) break;
      } catch {
        // retry until the child server binds
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return await run({ baseUrl, stdout, stderr });
  } finally {
    serverProcess.kill();
    await Promise.race([once(serverProcess, 'exit'), new Promise((resolve) => setTimeout(resolve, 1000))]);
  }
}

test('/desk status is routed to the Xenesis gateway status endpoint, not the MCP /xd command handler', async () => {
  await withGatewayServer(
    (request) => ({
      body: {
        ok: true,
        service: 'xenesis-gateway',
        activeRuns: 0,
        tasks: {
          total: 3,
          queued: 0,
          running: 1,
          completed: 2,
          failed: 0,
        },
        channels: {
          total: 4,
          enabled: 1,
          ready: 1,
          blocked: 0,
          disabled: 3,
          items: [
            { name: 'telegram', enabled: true, ready: true },
            { name: 'discord', enabled: false, ready: false },
          ],
        },
        receivedPath: request.url,
      },
    }),
    async ({ url, requests }) => {
      const response = await requestWorker({
        method: 'send',
        platform: 'telegram',
        sessionKey: 'telegram:e2e-user:e2e-chat',
        userId: 'e2e-user',
        chatId: 'e2e-chat',
        gatewayUrl: url,
        text: '/desk status',
      });

      assert.equal(response.ok, true);
      assert.equal(response.mode, 'xenesis-gateway');
      assert.equal(response.gateway?.path, '/status');
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, 'GET');
      assert.equal(requests[0].url, '/status');
      assert.match(response.outbound, /xenesis-gateway: ready/);
      assert.match(response.outbound, /Runs: active=0/);
      assert.match(response.outbound, /Tasks: total=3, queued=0, running=1, completed=2, failed=0/);
      assert.match(response.outbound, /Channels: total=4, enabled=1, ready=1, blocked=0, disabled=3 \(telegram\)/);
      assert.doesNotMatch(response.outbound, /^\{/);
      assert.doesNotMatch(response.outbound, /receivedPath/);
    },
  );
});

test('/desk run posts a prompt to the Xenesis gateway /run endpoint', async () => {
  await withGatewayServer(
    (request) => ({
      body: {
        id: 'run-e2e',
        exitCode: 0,
        output: `accepted: ${request.body.prompt}`,
      },
    }),
    async ({ url, requests }) => {
      const response = await requestWorker({
        method: 'send',
        platform: 'telegram',
        sessionKey: 'telegram:e2e-user:e2e-chat',
        userId: 'e2e-user',
        chatId: 'e2e-chat',
        gatewayUrl: url,
        text: '/desk run 현재 상태를 요약해줘',
      });

      assert.equal(response.ok, true);
      assert.equal(response.mode, 'xenesis-gateway');
      assert.equal(response.gateway?.path, '/run');
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, 'POST');
      assert.equal(requests[0].url, '/run');
      assert.equal(requests[0].body.prompt, '현재 상태를 요약해줘');
      assert.equal(requests[0].body.workflow, 'xenis');
      assert.equal(requests[0].body.ideContext.source, 'xenesis-desk-e2e-bot');
      assert.match(response.outbound, /accepted: 현재 상태를 요약해줘/);
    },
  );
});

test('/desk channel simulation preserves terminal session state and uses Desk bridge capabilities', async () => {
  await withBridgeServer(
    (request) => {
      assert.equal(request.method, 'POST');
      assert.equal(request.url, '/capabilities/call');
      const { path: capabilityPath, args = {} } = request.body;
      if (capabilityPath === 'xd.terminals.list') {
        return {
          body: {
            ok: true,
            sessions: [
              {
                id: 'term-abc-12345678',
                title: 'mongna',
                detail: 'pwsh.exe',
                cwd: 'D:\\Workspace\\sample-app',
                lastSentCommand: '오늘 대전 날씨 어때?',
                active: true,
              },
            ],
          },
        };
      }
      if (capabilityPath === 'xd.automation.terminals.setEnabled') {
        assert.deepEqual(args, { termId: 'term-abc-12345678', enabled: true });
        return { body: { ok: true, status: { enabled: true, mode: 'stream', stage: 1 } } };
      }
      if (capabilityPath === 'xd.automation.terminals.events') {
        assert.deepEqual(args, { termId: 'term-abc-12345678' });
        return {
          body: {
            ok: true,
            events: [
              { id: 'noise-1', kind: 'stream', streamText: '• Running rg -n "token" index.html' },
              { id: 'answer-1', kind: 'stream', streamText: '• 이번 주 제주도는 흐리고 습한 날이 많겠습니다.' },
              {
                id: 'pending-1',
                kind: 'pending',
                reason: 'approval requested',
                suggestedInput: '1\r',
                options: [
                  { index: 1, input: '1\r', label: 'Yes, proceed' },
                  { index: 2, input: '2\r', label: 'No' },
                ],
              },
            ],
          },
        };
      }
      if (capabilityPath === 'xd.automation.terminals.manualSend') {
        return { body: { ok: true, status: { enabled: true, mode: 'stream', stage: 1 } } };
      }
      return { status: 404, body: { ok: false, error: `unexpected capability ${capabilityPath}` } };
    },
    async ({ url, requests }) => {
      await withWorker(
        async (send) => {
          const basePayload = {
            method: 'send',
            platform: 'telegram',
            sessionKey: 'telegram:e2e-user:e2e-chat',
            userId: 'e2e-user',
            chatId: 'e2e-chat',
          };

          const terminals = await send({ ...basePayload, text: '/desk terminals' });
          assert.equal(terminals.ok, true);
          assert.equal(terminals.mode, 'desk-channel-sim');
          assert.match(terminals.outbound, /Terminals/);
          assert.doesNotMatch(terminals.outbound, /No \| ID \| Title \| State \| Context/);
          assert.match(terminals.outbound, /1\. term-abc · mongna/);
          assert.match(terminals.outbound, /status: active/);
          assert.match(terminals.outbound, /cwd: D:\\Workspace\\sample-app/);
          assert.doesNotMatch(terminals.outbound, /shell: pwsh\.exe/);

          const attach = await send({ ...basePayload, text: '/desk attach 1' });
          assert.match(attach.outbound, /Attached to terminal term-abc-12345678/);
          assert.deepEqual(attach.actions, [
            { label: 'Watch', value: '/desk watch' },
            { label: 'Detach', value: '/desk detach' },
          ]);

          const watch = await send({ ...basePayload, text: '/desk watch' });
          assert.match(watch.outbound, /Automation enabled for term-abc-12345678/);

          const poll = await send({ method: 'poll', sessionKey: 'telegram:e2e-user:e2e-chat' });
          assert.equal(poll.ok, true);
          assert.equal(poll.messages.length, 1);
          assert.match(poll.messages[0].text, /이번 주 제주도는 흐리고 습한 날이 많겠습니다/);
          assert.match(poll.messages[0].text, /1\. Yes, proceed/);
          assert.doesNotMatch(poll.messages[0].text, /Running rg/);

          const repeat = await send({ method: 'poll', sessionKey: 'telegram:e2e-user:e2e-chat' });
          assert.equal(repeat.messages.length, 0);

          const plain = await send({ ...basePayload, text: '오늘 서울 날씨 알려줘' });
          assert.equal(plain.mode, 'desk-channel-sim');
          assert.match(plain.outbound, /Sent input to term-abc-12345678/);

          const choose = await send({ ...basePayload, text: '/desk choose 2' });
          assert.match(choose.outbound, /Sent option 2 to term-abc-12345678/);

          const detach = await send({ ...basePayload, text: '/desk detach' });
          assert.match(detach.outbound, /Detached from Xenesis Desk terminal/);
        },
        {
          env: {
            XENIS_MCP_BRIDGE_URL: url,
            XENIS_MCP_BRIDGE_TOKEN: '',
          },
        },
      );

      const capabilityCalls = requests.map((request) => request.body);
      assert.deepEqual(
        capabilityCalls.map((call) => call.path),
        [
          'xd.terminals.list',
          'xd.automation.terminals.setEnabled',
          'xd.automation.terminals.events',
          'xd.automation.terminals.manualSend',
          'xd.automation.terminals.manualSend',
        ],
      );
      assert.deepEqual(capabilityCalls.at(-2).args, {
        termId: 'term-abc-12345678',
        input: '오늘 서울 날씨 알려줘\r',
      });
      assert.deepEqual(capabilityCalls.at(-1).args, {
        termId: 'term-abc-12345678',
        input: '2\r',
        pendingEventId: 'pending-1',
      });
    },
  );
});

test('e2e bot writes final send and watch outbound messages to channel send logs', async () => {
  const tempHome = mkdtempSync(path.join(tmpdir(), 'xenesis-e2e-channel-send-'));
  try {
    await withBridgeServer(
      (request) => {
        const { path: capabilityPath, args = {} } = request.body;
        if (capabilityPath === 'xd.automation.terminals.setEnabled') {
          assert.deepEqual(args, { termId: 'term-log-12345678', enabled: true });
          return { body: { ok: true, status: { enabled: true, mode: 'stream', stage: 1 } } };
        }
        if (capabilityPath === 'xd.automation.terminals.events') {
          return {
            body: {
              ok: true,
              events: [
                {
                  id: 'noise-log-1',
                  kind: 'stream',
                  streamText: '차단되어야 하는 응답입니다.',
                  relay: 'block',
                  relaySource: 'tool',
                  relayText: '차단되어야 하는 응답입니다.',
                },
                {
                  id: 'local-log-1',
                  kind: 'stream',
                  streamText: '로컬에만 보여야 하는 응답입니다.',
                  relay: 'local-only',
                  relaySource: 'system',
                  relayText: '로컬에만 보여야 하는 응답입니다.',
                },
                {
                  id: 'echo-log-1',
                  kind: 'stream',
                  streamText:
                    'Output\necho e2e-discord-slash-okecho e2e-discord-slash-ok\nPS D:\\Work> echo e2e-discord-slash-ok\nManual input sent\n수동 전송',
                  relay: 'allow',
                  relaySource: 'assistant',
                  relayText:
                    'Output\necho e2e-discord-slash-okecho e2e-discord-slash-ok\nPS D:\\Work> echo e2e-discord-slash-ok\nManual input sent\n수동 전송',
                },
                {
                  id: 'manual-log-1',
                  kind: 'manual_sent',
                  reason: '수동 전송',
                },
                {
                  id: 'answer-log-1',
                  kind: 'stream',
                  streamText: 'Running최종 전송으로 확인할 메시지입니다.',
                  relay: 'allow',
                  relaySource: 'assistant',
                  relayText: 'Running최종 전송으로 확인할 메시지입니다.',
                },
              ],
            },
          };
        }
        return { body: { ok: true } };
      },
      async ({ url }) => {
        await withWorker(
          async (send) => {
            const basePayload = {
              method: 'send',
              platform: 'telegram',
              sessionKey: 'telegram:e2e-user:e2e-chat',
              userId: 'e2e-user',
              chatId: 'e2e-chat',
            };

            await send({ ...basePayload, text: '/desk attach term-log-12345678' });
            await send({ ...basePayload, text: '/desk watch' });
            const poll = await send({ method: 'poll', sessionKey: 'telegram:e2e-user:e2e-chat' });
            assert.equal(poll.messages.length, 1);
            assert.match(poll.messages[0].text, /Running최종 전송으로 확인할 메시지입니다/);
            assert.doesNotMatch(poll.messages[0].text, /차단되어야 하는 응답입니다/);
            assert.doesNotMatch(poll.messages[0].text, /로컬에만 보여야 하는 응답입니다/);
            assert.doesNotMatch(poll.messages[0].text, /e2e-discord-slash-ok/);
            assert.doesNotMatch(poll.messages[0].text, /Manual input sent|수동 전송/);
          },
          {
            env: {
              XENIS_HOME: tempHome,
              XENIS_MCP_BRIDGE_URL: url,
              XENIS_MCP_BRIDGE_TOKEN: '',
            },
          },
        );
      },
    );

    const logDir = path.join(tempHome, 'logs', 'channel-sends');
    const logFiles = readdirSync(logDir).filter((file) => /^e2e_bot-\d{4}-\d{2}-\d{2}\.jsonl$/.test(file));
    assert.equal(logFiles.length, 1);
    const entries = readFileSync(path.join(logDir, logFiles[0]), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    assert(
      entries.some(
        (entry) =>
          entry.channel === 'e2e_bot' &&
          entry.source === 'send' &&
          entry.simulatedPlatform === 'telegram' &&
          entry.conversationId === 'telegram:e2e-user:e2e-chat' &&
          entry.status === 'success' &&
          /Attached to terminal term-log-12345678/.test(entry.text),
      ),
    );
    assert(
      entries.some(
        (entry) =>
          entry.channel === 'e2e_bot' &&
          entry.source === 'watch' &&
          entry.mode === 'desk-watch' &&
          entry.status === 'success' &&
          /Running최종 전송으로 확인할 메시지입니다/.test(entry.text) &&
          !/차단되어야 하는 응답입니다/.test(entry.text) &&
          !/로컬에만 보여야 하는 응답입니다/.test(entry.text) &&
          !/e2e-discord-slash-ok/.test(entry.text) &&
          !/Manual input sent|수동 전송/.test(entry.text),
      ),
    );
  } finally {
    rmSync(tempHome, { recursive: true, force: true });
  }
});

test('/desk agent simulation attaches to Xenesis Agent panes, relays final events, and writes send logs', async () => {
  const tempHome = mkdtempSync(path.join(tmpdir(), 'xenesis-e2e-agent-channel-send-'));
  try {
    await withBridgeServer(
      (request) => {
        assert.equal(request.method, 'POST');
        assert.equal(request.url, '/capabilities/call');
        const { path: capabilityPath, args = {} } = request.body;
        if (capabilityPath === 'xd.xenesis.agents.list') {
          return {
            body: {
              ok: true,
              agents: [
                {
                  agentId: 'xenis-a3f91c20',
                  title: 'Xenesis Agent',
                  workspace: 'D:\\Workspace\\sample-app',
                  provider: 'Codex CLI',
                  status: 'ready',
                  runtimeMode: 'chat',
                },
              ],
            },
          };
        }
        if (capabilityPath === 'xd.xenesis.agents.submit') {
          assert.deepEqual(args, {
            agentId: 'xenis-a3f91c20',
            text: '이번주 제주도 날씨 어때?',
            conversationId: 'telegram:e2e-user:e2e-chat',
            senderId: 'e2e-user',
            senderName: 'Telegram Tester',
          });
          return { body: { ok: true, accepted: true } };
        }
        if (capabilityPath === 'xd.xenesis.agents.events') {
          assert.deepEqual(args, { agentId: 'xenis-a3f91c20' });
          return {
            body: {
              ok: true,
              events: [
                {
                  id: 'unsafe-1',
                  kind: 'assistant_final',
                  text: '숨겨야 하는 응답입니다.',
                  final: true,
                  externalSafe: false,
                },
                {
                  id: 'final-1',
                  kind: 'assistant_final',
                  text: '이번 주 제주도는 흐리고 바람이 강한 날이 많겠습니다.',
                  final: true,
                  externalSafe: true,
                },
              ],
            },
          };
        }
        return { status: 404, body: { ok: false, error: `unexpected capability ${capabilityPath}` } };
      },
      async ({ url, requests }) => {
        await withWorker(
          async (send) => {
            const basePayload = {
              method: 'send',
              platform: 'telegram',
              sessionKey: 'telegram:e2e-user:e2e-chat',
              userId: 'e2e-user',
              userName: 'Telegram Tester',
              chatId: 'e2e-chat',
              chatName: 'Telegram DM',
            };

            const agents = await send({ ...basePayload, text: '/desk agents' });
            assert.equal(agents.ok, true);
            assert.equal(agents.mode, 'desk-channel-sim');
            assert.match(agents.outbound, /1\. xenis-a3f91c20 - Xenesis Agent/);
            assert.match(agents.outbound, /provider: Codex CLI/);
            assert.deepEqual(agents.actions, [{ label: 'Attach 1', value: '/desk agent attach 1' }]);

            const attach = await send({ ...basePayload, text: '/desk agent attach 1' });
            assert.match(attach.outbound, /Attached to Xenesis Agent xenis-a3f91c20/);
            assert.deepEqual(attach.actions, [
              { label: 'Watch', value: '/desk agent watch' },
              { label: 'Events', value: '/desk agent events' },
              { label: 'Detach', value: '/desk agent detach' },
            ]);

            const watch = await send({ ...basePayload, text: '/desk agent watch' });
            assert.match(watch.outbound, /Watching Xenesis Agent xenis-a3f91c20/);

            const poll = await send({ method: 'poll', sessionKey: 'telegram:e2e-user:e2e-chat' });
            assert.equal(poll.ok, true);
            assert.equal(poll.attachedAgentId, 'xenis-a3f91c20');
            assert.equal(poll.agentWatching, true);
            assert.equal(poll.messages.length, 1);
            assert.equal(poll.messages[0].mode, 'desk-agent-watch');
            assert.match(poll.messages[0].text, /이번 주 제주도는 흐리고 바람이 강한 날/);
            assert.doesNotMatch(poll.messages[0].text, /숨겨야 하는 응답/);

            const repeat = await send({ method: 'poll', sessionKey: 'telegram:e2e-user:e2e-chat' });
            assert.equal(repeat.messages.length, 0);

            const plain = await send({ ...basePayload, text: '이번주 제주도 날씨 어때?' });
            assert.equal(plain.mode, 'desk-channel-sim');
            assert.match(plain.outbound, /Sent message to Xenesis Agent xenis-a3f91c20/);
          },
          {
            env: {
              XENIS_HOME: tempHome,
              XENIS_MCP_BRIDGE_URL: url,
              XENIS_MCP_BRIDGE_TOKEN: '',
            },
          },
        );

        assert.deepEqual(
          requests.map((request) => request.body.path),
          ['xd.xenesis.agents.list', 'xd.xenesis.agents.events', 'xd.xenesis.agents.submit'],
        );
      },
    );

    const logDir = path.join(tempHome, 'logs', 'channel-sends');
    const logFiles = readdirSync(logDir).filter((file) => /^e2e_bot-\d{4}-\d{2}-\d{2}\.jsonl$/.test(file));
    assert.equal(logFiles.length, 1);
    const entries = readFileSync(path.join(logDir, logFiles[0]), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert(
      entries.some(
        (entry) =>
          entry.channel === 'e2e_bot' &&
          entry.source === 'agent-watch' &&
          entry.mode === 'desk-agent-watch' &&
          entry.status === 'success' &&
          /이번 주 제주도는 흐리고 바람이 강한 날/.test(entry.text) &&
          !/숨겨야 하는 응답/.test(entry.text),
      ),
    );
    assert(
      entries.some(
        (entry) =>
          entry.channel === 'e2e_bot' &&
          entry.source === 'send' &&
          entry.mode === 'desk-channel-sim' &&
          /Sent message to Xenesis Agent xenis-a3f91c20/.test(entry.text),
      ),
    );
  } finally {
    rmSync(tempHome, { recursive: true, force: true });
  }
});

test('/desk agents reports Desk bridge 400 responses without failing the worker', async () => {
  await withBridgeServer(
    (request) => {
      assert.equal(request.method, 'POST');
      assert.equal(request.url, '/capabilities/call');
      assert.equal(request.body.path, 'xd.xenesis.agents.list');
      return {
        status: 400,
        body: {
          ok: false,
          error: 'unknown capability xd.xenesis.agents.list',
        },
      };
    },
    async ({ url, requests }) => {
      await withWorker(
        async (send) => {
          const response = await send({
            method: 'send',
            platform: 'telegram',
            sessionKey: 'telegram:e2e-user:e2e-chat',
            userId: 'e2e-user',
            chatId: 'e2e-chat',
            text: '/desk agents',
          });

          assert.equal(response.ok, true);
          assert.equal(response.mode, 'desk-channel-sim');
          assert.match(response.outbound, /Failed to list Xenesis Agents/);
          assert.match(response.outbound, /unknown capability xd\.xenesis\.agents\.list/);
        },
        {
          env: {
            XENIS_MCP_BRIDGE_URL: url,
            XENIS_MCP_BRIDGE_TOKEN: '',
          },
        },
      );

      assert.equal(requests.length, 1);
    },
  );
});

test('E2E server prefers dev Desk bridge state over inherited stale bridge env', async () => {
  const tempHome = mkdtempSync(path.join(tmpdir(), 'xenesis-e2e-server-home-'));
  try {
    await withBridgeServer(
      (request) => {
        assert.equal(request.method, 'POST');
        assert.equal(request.url, '/capabilities/call');
        assert.equal(request.body.path, 'xd.xenesis.agents.list');
        return {
          body: {
            ok: true,
            agents: [
              {
                agentId: 'xenis-e2e-dev',
                title: 'Dev Xenesis Agent',
                provider: 'Codex CLI',
              },
            ],
          },
        };
      },
      async ({ url, requests }) => {
        const devStateDir = path.join(tempHome, '.xenis-dev', 'mcp');
        const releaseStateDir = path.join(tempHome, '.xenis', 'mcp');
        mkdirSync(devStateDir, { recursive: true });
        mkdirSync(releaseStateDir, { recursive: true });
        const devStateFile = path.join(devStateDir, 'bridge.json');
        writeFileSync(devStateFile, JSON.stringify({ bridgeUrl: url, bridgeToken: '' }), 'utf8');
        writeFileSync(
          path.join(releaseStateDir, 'bridge.json'),
          JSON.stringify({ bridgeUrl: 'http://127.0.0.1:1', bridgeToken: 'stale-release-token' }),
          'utf8',
        );

        await withE2eServer(
          {
            HOME: tempHome,
            USERPROFILE: tempHome,
            XENIS_MCP_BRIDGE_URL: 'http://127.0.0.1:3847',
            XENIS_MCP_BRIDGE_TOKEN: 'stale-env-token',
            XENIS_MCP_STATE_FILE: path.join(releaseStateDir, 'bridge.json'),
            XD_E2E_BRIDGE_PROFILE: 'dev',
            XD_E2E_USE_ENV_BRIDGE: '',
          },
          async ({ baseUrl }) => {
            const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
            assert.equal(health.ok, true);
            assert.equal(health.node.bridgeStateFile, devStateFile);
            assert.equal(health.worker.bridgeUrl, url);

            const response = await fetch(`${baseUrl}/api/send`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                text: '/desk agents',
                platform: 'telegram',
                sessionKey: 'telegram:e2e-user:e2e-chat',
                userId: 'e2e-user',
                chatId: 'e2e-chat',
              }),
            }).then((item) => item.json());
            assert.equal(response.ok, true);
            assert.match(response.outbound, /xenis-e2e-dev - Dev Xenesis Agent/);
          },
        );

        assert.equal(requests.length >= 1, true);
      },
    );
  } finally {
    rmSync(tempHome, { recursive: true, force: true });
  }
});

test('E2E server can switch Desk bridge target from the UI API', async () => {
  const tempHome = mkdtempSync(path.join(tmpdir(), 'xenesis-e2e-bridge-switch-'));
  try {
    await withBridgeServer(
      (request) => {
        assert.equal(request.method, 'POST');
        assert.equal(request.url, '/capabilities/call');
        assert.equal(request.body.path, 'xd.xenesis.agents.list');
        return {
          body: {
            ok: true,
            agents: [
              {
                agentId: 'xenis-switched-bridge',
                title: 'Selected Bridge Agent',
                provider: 'Codex CLI',
              },
            ],
          },
        };
      },
      async ({ url }) => {
        const devStateDir = path.join(tempHome, '.xenis-dev', 'mcp');
        const releaseStateDir = path.join(tempHome, '.xenis', 'mcp');
        mkdirSync(devStateDir, { recursive: true });
        mkdirSync(releaseStateDir, { recursive: true });
        writeFileSync(
          path.join(devStateDir, 'bridge.json'),
          JSON.stringify({
            bridgeUrl: 'http://127.0.0.1:3848',
            bridgeToken: 'dev-token',
          }),
        );
        writeFileSync(
          path.join(releaseStateDir, 'bridge.json'),
          JSON.stringify({
            bridgeUrl: url,
            bridgeToken: 'release-token',
          }),
        );

        await withE2eServer(
          {
            HOME: tempHome,
            USERPROFILE: tempHome,
            XD_E2E_BRIDGE_PROFILE: 'dev',
          },
          async ({ baseUrl }) => {
            const before = await fetch(`${baseUrl}/api/bridge`).then((item) => item.json());
            assert.equal(before.ok, true);
            assert.equal(before.active.bridgeUrl, 'http://127.0.0.1:3848');
            assert(before.choices.some((choice) => choice.id === 'profile:release'));

            const selected = await fetch(`${baseUrl}/api/bridge`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ selection: 'profile:release' }),
            }).then((item) => item.json());
            assert.equal(selected.ok, true);
            assert.equal(selected.active.bridgeUrl, url);

            const health = await fetch(`${baseUrl}/api/health`).then((item) => item.json());
            assert.equal(health.worker.bridgeUrl, url);

            const response = await fetch(`${baseUrl}/api/send`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                text: '/desk agents',
                platform: 'telegram',
                sessionKey: 'telegram:e2e-user:e2e-chat',
                userId: 'e2e-user',
                chatId: 'e2e-chat',
              }),
            }).then((item) => item.json());
            assert.equal(response.ok, true);
            assert.match(response.outbound, /xenis-switched-bridge - Selected Bridge Agent/);
          },
        );
      },
    );
  } finally {
    rmSync(tempHome, { recursive: true, force: true });
  }
});

test('E2E server refreshes selected Desk bridge token when the state file changes', async () => {
  const tempHome = mkdtempSync(path.join(tmpdir(), 'xenesis-e2e-bridge-token-refresh-'));
  try {
    await withBridgeServer(
      (request) => {
        assert.equal(request.method, 'POST');
        assert.equal(request.url, '/capabilities/call');
        if (request.headers.authorization !== 'Bearer fresh-token') {
          return { status: 401, body: { ok: false, error: 'Unauthorized' } };
        }
        return {
          body: {
            ok: true,
            agents: [
              {
                agentId: 'xenis-fresh-token',
                title: 'Fresh Token Agent',
                provider: 'Codex CLI',
              },
            ],
          },
        };
      },
      async ({ url }) => {
        const devStateDir = path.join(tempHome, '.xenis-dev', 'mcp');
        mkdirSync(devStateDir, { recursive: true });
        const devStateFile = path.join(devStateDir, 'bridge.json');
        writeFileSync(
          devStateFile,
          JSON.stringify({
            bridgeUrl: url,
            bridgeToken: 'old-token',
          }),
        );

        await withE2eServer(
          {
            HOME: tempHome,
            USERPROFILE: tempHome,
            XD_E2E_BRIDGE_PROFILE: 'dev',
          },
          async ({ baseUrl }) => {
            const before = await fetch(`${baseUrl}/api/health`).then((item) => item.json());
            assert.equal(before.worker.bridgeUrl, url);

            writeFileSync(
              devStateFile,
              JSON.stringify({
                bridgeUrl: url,
                bridgeToken: 'fresh-token',
              }),
            );

            const response = await fetch(`${baseUrl}/api/send`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                text: '/desk agents',
                platform: 'telegram',
                sessionKey: 'telegram:e2e-user:e2e-chat',
                userId: 'e2e-user',
                chatId: 'e2e-chat',
              }),
            }).then((item) => item.json());
            assert.equal(response.ok, true);
            assert.match(response.outbound, /xenis-fresh-token - Fresh Token Agent/);
          },
        );
      },
    );
  } finally {
    rmSync(tempHome, { recursive: true, force: true });
  }
});

test('desk relay filtering lives in a dedicated Python module', async () => {
  const worker = readFileSync(path.join(__dirname, 'worker.py'), 'utf8');
  const relayModulePath = path.join(__dirname, 'desk_relay.py');
  assert.equal(existsSync(relayModulePath), true);
  assert.match(worker, /from desk_relay import \(/);
  assert.doesNotMatch(worker, /^def _normalized_desk_stream_text\(/m);
  assert.doesNotMatch(worker, /^def _is_desk_noisy_stream_text\(/m);
  assert.doesNotMatch(worker, /^def _starts_desk_tool_output_context\(/m);

  const script = [
    'import json',
    'from desk_relay import compact_desk_stream_output, relay_desk_stream_text',
    'state = {"tool": 0, "edit": 0}',
    'payload = {',
    '  "canonical": relay_desk_stream_text({"kind": "stream", "streamText": "Running최종 전송", "relay": "allow", "relayText": "Running최종 전송"}, state),',
    '  "canonicalEcho": relay_desk_stream_text({"kind": "stream", "streamText": "Output\\necho e2e-discord-slash-okecho e2e-discord-slash-ok\\nPS D:\\\\Work> echo e2e-discord-slash-ok\\nManual input sent\\n수동 전송", "relay": "allow", "relayText": "Output\\necho e2e-discord-slash-okecho e2e-discord-slash-ok\\nPS D:\\\\Work> echo e2e-discord-slash-ok\\nManual input sent\\n수동 전송"}, state),',
    '  "blocked": relay_desk_stream_text({"kind": "stream", "streamText": "차단", "relay": "block", "relayText": "차단"}, state),',
    '  "legacy": relay_desk_stream_text({"kind": "stream", "streamText": "• Running rg -n token index.html\\n• 이번 주 제주도는 흐림입니다."}, {"tool": 0, "edit": 0}),',
    '  "compact": compact_desk_stream_output(["a", "b", "a", "c"]),',
    '}',
    'print(json.dumps(payload, ensure_ascii=False))',
  ].join('\n');
  const python = spawn(resolvePython(), ['-c', script], {
    cwd: __dirname,
    env: {
      ...process.env,
      PYTHONUTF8: process.env.PYTHONUTF8 || '1',
      PYTHONIOENCODING: process.env.PYTHONIOENCODING || 'utf-8',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const [stdoutChunks, stderrChunks] = [[], []];
  python.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
  python.stderr.on('data', (chunk) => stderrChunks.push(chunk));
  const [exitCode] = await once(python, 'exit');
  assert.equal(exitCode, 0, Buffer.concat(stderrChunks).toString('utf8'));
  const payload = JSON.parse(Buffer.concat(stdoutChunks).toString('utf8'));
  assert.deepEqual(payload, {
    canonical: 'Running최종 전송',
    canonicalEcho: '',
    blocked: '',
    legacy: '이번 주 제주도는 흐림입니다.',
    compact: ['a', 'b', 'c'],
  });
});

test('/xd commands continue to use the existing MCP-backed command handler', async () => {
  const response = await requestWorker({
    method: 'send',
    platform: 'telegram',
    sessionKey: 'telegram:e2e-user:e2e-chat',
    userId: 'e2e-user',
    chatId: 'e2e-chat',
    text: '/xd status',
  });

  assert.equal(response.ok, true);
  assert.equal(response.mode, 'xd-command');
  assert.match(response.outbound, /Xenesis Desk|Bridge|Mobile|Status/i);
});

test('static simulator exposes Telegram, Discord, Slack, and Xenesis Bot profiles', () => {
  const html = readFileSync(path.join(__dirname, 'static', 'index.html'), 'utf8');
  const app = readFileSync(path.join(__dirname, 'static', 'app.js'), 'utf8');
  const styles = readFileSync(path.join(__dirname, 'static', 'styles.css'), 'utf8');

  assert.match(html, /platformMode/);
  assert.match(html, /gatewayUrl/);
  assert.match(html, /Xenesis gateway/);
  assert.match(html, /Desk bridge/);
  assert.match(html, /bridgeTarget/);
  assert.match(html, /\/xd/);
  for (const profile of ['telegram', 'discord', 'slack', 'xenesis_desk_bot']) {
    assert.match(app, new RegExp(`${profile}`));
  }
  assert.match(app, /xenesis_desk/);
  assert.match(app, /3338/);
  assert.match(app, /\/api\/bridge/);
  assert.match(app, /bridgeTargetEl/);
  assert.match(app, /\/desk status/);
  assert.match(app, /\/desk terminals/);
  assert.match(app, /\/desk watch/);
  assert.match(app, /pollWatchMessages/);
  assert.match(app, /\/xd status/);
  assert.match(app, /buildMessagePayload/);
  assert.match(styles, /platform-discord/);
  assert.match(styles, /platform-slack/);
  assert.match(styles, /platform-xenesis/);
});
