import { afterEach, describe, expect, test, vi } from 'vitest';
import { createComputerUseTool } from '../../src/tools/computerUseTool.js';
import type { ToolContext } from '../../src/tools/types.js';

function toolContext(): ToolContext {
  return {
    workspaceRoot: 'E:/tmp',
    cwd: 'E:/tmp',
    sessionId: 'computer-use-cr-test',
    env: {
      XENIS_MCP_BRIDGE_URL: 'http://bridge.test',
    } as NodeJS.ProcessEnv,
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

function mockBridge(payload: Record<string, unknown>, calls: Array<Record<string, unknown>>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
    });
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
}

function mockBridgeHandler(
  handler: (body: Record<string, unknown>) => Record<string, unknown>,
  calls: Array<Record<string, unknown>>,
) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    calls.push({ url: String(input), body });
    return new Response(JSON.stringify(handler(body)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
}

describe('computer_use Desk CR mapping', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('capture dispatches to xd.computer.capture', async () => {
    const calls: Array<Record<string, unknown>> = [];
    mockBridge(
      {
        ok: true,
        path: 'xd.computer.capture',
        result: { text: 'screen', elements: [], screenshot: '' },
      },
      calls,
    );

    const tool = createComputerUseTool();
    const result = await tool.run(
      {
        action: 'capture',
        mode: 'som',
        max_elements: 3,
        amount: 3,
        raise_window: false,
        approved: false,
        timeoutMs: 1000,
      },
      toolContext(),
    );

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('http://bridge.test/capabilities/call');
    expect(calls[0]?.body).toMatchObject({
      path: 'xd.computer.capture',
      args: { mode: 'som', max_elements: 3 },
      source: 'xenesis',
      approved: false,
    });
  });

  test('set_value dispatches text args matching the CR contract', async () => {
    const calls: Array<Record<string, unknown>> = [];
    mockBridgeHandler((body) => {
      if (body.path === 'xd.computer.capture') {
        return {
          ok: true,
          path: 'xd.computer.capture',
          result: { text: 'Name', elements: [{ role: 'textbox', label: 'Name' }], screenshot: '' },
        };
      }
      return { ok: true, path: body.path, result: { readback: 'set' } };
    }, calls);

    const tool = createComputerUseTool();
    await tool.run(
      {
        action: 'capture',
        mode: 'som',
        max_elements: 1,
        amount: 3,
        raise_window: false,
        approved: false,
        timeoutMs: 1000,
      },
      toolContext(),
    );

    const result = await tool.run(
      {
        action: 'set_value',
        mode: 'som',
        element: 1,
        text: 'hello',
        amount: 3,
        raise_window: false,
        approved: false,
        timeoutMs: 1000,
      },
      toolContext(),
    );

    expect(result.ok).toBe(true);
    expect(calls.at(-1)?.body).toMatchObject({
      path: 'xd.computer.set_value',
      args: { element: 1, text: 'hello' },
    });
  });

  test('stop dispatches to xd.computer.stop', async () => {
    const calls: Array<Record<string, unknown>> = [];
    mockBridge({ ok: true, path: 'xd.computer.stop', result: { stopped: true } }, calls);

    const tool = createComputerUseTool();
    const input = tool.inputSchema.parse({
      action: 'stop',
      timeoutMs: 1000,
    });
    const result = await tool.run(input, toolContext());

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toMatchObject({
      path: 'xd.computer.stop',
      args: {},
      approved: false,
    });
  });
});
