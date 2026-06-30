import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { CliIo } from '../../src/cli/main.js';
import type { InkTuiController } from '../../src/cli/tui/inkRenderer.js';
import { JsonlSessionWriter } from '../../src/sessions/index.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

type TuiScenario = (controller: InkTuiController) => Promise<void> | void;

const tuiMock = vi.hoisted(() => ({
  scenario: undefined as ((controller: unknown) => Promise<void> | void) | undefined,
  runInkTui: vi.fn(),
}));

vi.mock('../../src/cli/tui/inkRenderer.js', () => ({
  runInkTui: tuiMock.runInkTui,
}));

beforeEach(() => {
  tuiMock.scenario = undefined;
  tuiMock.runInkTui.mockReset();
  tuiMock.runInkTui.mockImplementation(async (props: { controller: unknown }) => {
    if (!tuiMock.scenario) throw new Error('TUI scenario not configured.');
    await tuiMock.scenario(props.controller);
  });
});

function envWithoutApiKey() {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  env.XENESIS_ENABLE_TEST_MOCK_PROVIDER = 'true';
  return env;
}

function createTtyInput() {
  const stream = new PassThrough() as PassThrough & { isTTY: boolean };
  stream.isTTY = true;
  return stream;
}

function createIo(options: Partial<CliIo> = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const env = { ...(options.env ?? envWithoutApiKey()) };
  if (options.cwd && env.XENESIS_HOME === undefined) {
    env.XENESIS_HOME = join(options.cwd, '.xenesis');
  }
  const io: CliIo = {
    cwd: options.cwd,
    env,
    stdin: options.stdin,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line),
  };
  return { io, stdout, stderr };
}

async function writeMockConfig(root: string, extra: Record<string, unknown> = {}) {
  const configPath = join(root, 'xenesis.config.json');
  await writeFile(
    configPath,
    JSON.stringify({
      provider: 'mock',
      model: 'mock-model',
      workspace: '.',
      ...extra,
    }),
    'utf8',
  );
  return configPath;
}

function setScenario(scenario: TuiScenario) {
  tuiMock.scenario = scenario as (controller: unknown) => Promise<void> | void;
}

function transcript(controller: InkTuiController) {
  return controller
    .getState()
    .messages.map((message) => `${message.role}: ${message.content}`)
    .join('\n');
}

function notices(controller: InkTuiController) {
  return controller
    .getState()
    .notices.map((notice) => notice.message)
    .join('\n');
}

function lastAssistantContent(controller: InkTuiController) {
  return (
    controller
      .getState()
      .messages.filter((message) => message.role === 'assistant')
      .at(-1)?.content ?? ''
  );
}

async function withBridgeServer(
  run: (context: {
    url: string;
    requests: Array<{ url?: string; headers: IncomingHttpHeaders; body: unknown }>;
  }) => Promise<void>,
) {
  const requests: Array<{ url?: string; headers: IncomingHttpHeaders; body: unknown }> = [];
  const server: Server = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      requests.push({
        url: request.url,
        headers: request.headers,
        body: body ? JSON.parse(body) : undefined,
      });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ ok: true, result: { ok: true, bytesSent: 1234 } }));
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('bridge test server did not bind to a TCP port');
  try {
    await run({ url: `http://127.0.0.1:${address.port}`, requests });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('runCli tui runtime integration', () => {
  test('drives prompt history and context notices through the real TUI controller path', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeMockConfig(workspace.root);
      const { runCli } = await import('../../src/cli/main.js');
      const { io, stderr } = createIo({ cwd: workspace.root, stdin: createTtyInput() });

      setScenario(async (controller) => {
        expect(controller.getState().sessionContext.activeSessionId).toMatch(/^session-/);
        expect(controller.getState().sessionContext.historyMessageCount).toBe(0);

        await controller.submit('first context turn');

        expect(controller.getState().sessionContext.historyMessageCount).toBeGreaterThanOrEqual(2);
        expect(transcript(controller)).toContain('assistant: mock response: first context turn');

        await controller.submit('mock:messages');

        const afterSecondPrompt = controller.getState();
        expect(afterSecondPrompt.sessionContext.historyMessageCount).toBeGreaterThanOrEqual(4);
        expect(transcript(controller)).toContain('user: first context turn');
        expect(transcript(controller)).toContain('assistant: mock response: first context turn');
        expect(transcript(controller)).toContain('user: mock:messages');
        expect(lastAssistantContent(controller)).toContain('user: first context turn');
        expect(lastAssistantContent(controller)).toContain('assistant: mock response: first context turn');
        expect(lastAssistantContent(controller)).toContain('user: mock:messages');

        await controller.submit('/status');
        await controller.submit('/session');

        const noticeText = notices(controller);
        expect(noticeText).toContain(`session=${afterSecondPrompt.sessionContext.activeSessionId}`);
        expect(noticeText).toContain(`context=${afterSecondPrompt.sessionContext.historyMessageCount}`);
        expect(noticeText).toContain('resumedFrom=none');
      });

      const exitCode = await runCli(['node', 'xenesis', 'tui', '--config', configPath], io);

      expect(exitCode, stderr.join('\n')).toBe(0);
      expect(stderr).toEqual([]);
      expect(tuiMock.runInkTui).toHaveBeenCalledTimes(1);
    } finally {
      await workspace.cleanup();
    }
  }, 15_000);

  test('passes persisted TUI input history into the Ink renderer', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeMockConfig(workspace.root);
      const historyDir = join(workspace.root, '.xenesis');
      await mkdir(historyDir, { recursive: true });
      await writeFile(
        join(historyDir, 'chat_history'),
        ['first historical prompt', '/status', '/image recent'].join('\n'),
        'utf8',
      );

      const { runCli } = await import('../../src/cli/main.js');
      const { io, stderr } = createIo({ cwd: workspace.root, stdin: createTtyInput() });

      setScenario(() => undefined);

      const exitCode = await runCli(['node', 'xenesis', 'tui', '--config', configPath], io);

      expect(exitCode, stderr.join('\n')).toBe(0);
      expect(stderr).toEqual([]);
      expect(tuiMock.runInkTui).toHaveBeenCalledTimes(1);
      expect(tuiMock.runInkTui.mock.calls[0]?.[0]).toMatchObject({
        inputHistory: ['first historical prompt', '/status', '/image recent'],
      });
    } finally {
      await workspace.cleanup();
    }
  });

  test('resumes a session log and clears visible context through the real TUI controller path', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeMockConfig(workspace.root);
      const xenesisHome = join(workspace.root, '.xenesis');
      const seedWriter = new JsonlSessionWriter({
        workspaceRoot: workspace.root,
        xenesisHome,
        sessionId: 'session-source',
        now: () => new Date('2026-06-23T00:00:00.000Z'),
      });
      await seedWriter.write({ type: 'user_message', message: { role: 'user', content: 'seed question' } });
      await seedWriter.write({ type: 'assistant_message', message: { role: 'assistant', content: 'seed answer' } });

      const { runCli } = await import('../../src/cli/main.js');
      const { io, stderr } = createIo({ cwd: workspace.root, stdin: createTtyInput() });

      setScenario(async (controller) => {
        const activeSessionId = controller.getState().sessionContext.activeSessionId;
        expect(activeSessionId).toMatch(/^session-/);
        expect(controller.getState().suggestionContext.sessionIds).toContain('session-source');

        await controller.submit('/resume session-source mock:messages');

        expect(controller.getState().sessionContext.activeSessionId).toBe(activeSessionId);
        expect(controller.getState().sessionContext.resumedFromSessionId).toBe('session-source');
        expect(controller.getState().sessionContext.historyMessageCount).toBeGreaterThanOrEqual(4);
        expect(transcript(controller)).toContain('user: mock:messages');
        expect(lastAssistantContent(controller)).toContain('user: seed question');
        expect(lastAssistantContent(controller)).toContain('assistant: seed answer');

        await controller.submit('/session');
        expect(notices(controller)).toContain('resumedFrom=session-source');

        await controller.submit('/clear');

        const cleared = controller.getState();
        expect(cleared.sessionContext.activeSessionId).toBe(activeSessionId);
        expect(cleared.sessionContext.lastSessionId).toBe(activeSessionId);
        expect(cleared.sessionContext.resumedFromSessionId).toBeUndefined();
        expect(cleared.sessionContext.historyMessageCount).toBe(0);
        expect(cleared.messages).toEqual([]);
      });

      const exitCode = await runCli(['node', 'xenesis', 'tui', '--config', configPath], io);

      expect(exitCode, stderr.join('\n')).toBe(0);
      expect(stderr).toEqual([]);
      expect(tuiMock.runInkTui).toHaveBeenCalledTimes(1);
    } finally {
      await workspace.cleanup();
    }
  });

  test('routes /image through the Desk bridge and captures the result in command output', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeMockConfig(workspace.root);
      const imagePath = join(workspace.root, '사용자 지정 1.png');
      await writeFile(imagePath, 'fake image bytes', 'utf8');
      await withBridgeServer(async ({ url, requests }) => {
        const { runCli } = await import('../../src/cli/main.js');
        const { io, stderr } = createIo({
          cwd: workspace.root,
          stdin: createTtyInput(),
          env: {
            ...envWithoutApiKey(),
            XENIS_MCP_BRIDGE_URL: url,
          },
        });

        setScenario(async (controller) => {
          await controller.submit(`/image "${imagePath}" --width=80% --height=auto`);

          expect(requests).toHaveLength(1);
          expect(requests[0].url).toBe('/capabilities/call');
          expect(requests[0].body).toMatchObject({
            path: 'xd.terminals.image.show',
            approved: true,
            args: {
              source: imagePath,
              width: '80%',
              height: 'auto',
            },
          });
          expect(controller.getState().commandOutput?.command).toBe(`/image "${imagePath}" --width=80% --height=auto`);
          expect(controller.getState().commandOutput?.lines.join('\n')).toContain('bytesSent');
          expect(notices(controller)).toContain('Image sent to terminal');
        });

        const exitCode = await runCli(['node', 'xenesis', 'tui', '--config', configPath], io);

        expect(exitCode, stderr.join('\n')).toBe(0);
        expect(stderr).toEqual([]);
      });
    } finally {
      await workspace.cleanup();
    }
  });

  test('supports /image recent, info, clear, capture suggestions, and friendly missing-file errors', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeMockConfig(workspace.root);
      const imagePath = join(workspace.root, 'diagram.png');
      const captureDir = join(workspace.root, '.xenesis', 'captures');
      const capturePath = join(captureDir, 'pane_capture_1.png');
      await writeFile(imagePath, 'fake image bytes', 'utf8');
      await mkdir(captureDir, { recursive: true });
      await writeFile(capturePath, 'capture image bytes', 'utf8');

      await withBridgeServer(async ({ url, requests }) => {
        const { runCli } = await import('../../src/cli/main.js');
        const { io, stderr } = createIo({
          cwd: workspace.root,
          stdin: createTtyInput(),
          env: {
            ...envWithoutApiKey(),
            XENIS_MCP_BRIDGE_URL: url,
          },
        });

        setScenario(async (controller) => {
          expect(controller.getState().runtime.deskBridgeStatus).toBe('configured');
          expect(controller.getState().suggestionContext.imageSources).toContain(capturePath);

          await controller.submit(`/image "${imagePath}" --width=80%`);
          await controller.submit('/image recent --height=auto');
          await controller.submit('/image info');
          await controller.submit('/image clear --term-id=term-a');
          await controller.submit('/image missing-file.png');

          expect(requests).toHaveLength(3);
          expect(requests[0].body).toMatchObject({
            path: 'xd.terminals.image.show',
            args: { source: imagePath, width: '80%' },
          });
          expect(requests[1].body).toMatchObject({
            path: 'xd.terminals.image.show',
            args: { source: imagePath, height: 'auto' },
          });
          expect(requests[2].body).toMatchObject({
            path: 'xd.terminals.ui.clearScreen',
            args: { termId: 'term-a' },
          });
          expect(controller.getState().suggestionContext.imageSources?.at(0)).toBe(imagePath);
          expect(notices(controller)).toContain('Image sent to terminal');
          expect(notices(controller)).toContain('Terminal screen clear requested');
          expect(controller.getState().commandOutput?.command).toBe('/image missing-file.png');
          expect(controller.getState().commandOutput?.kind).toBe('error');
          expect(controller.getState().commandOutput?.lines.join('\n')).toContain('Image file not found');

          await controller.submit('/status');
          expect(notices(controller)).toContain('bridge=configured');
        });

        const exitCode = await runCli(['node', 'xenesis', 'tui', '--config', configPath], io);

        expect(exitCode, stderr.join('\n')).toBe(0);
        expect(stderr).toEqual([]);
      });
    } finally {
      await workspace.cleanup();
    }
  });
});
