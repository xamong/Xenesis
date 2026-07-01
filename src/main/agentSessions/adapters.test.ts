import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createAgentSessionAdapters } from './adapters';

async function withTempHome<T>(fn: (homeDir: string) => Promise<T>): Promise<T> {
  const homeDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xd-agent-sessions-'));
  try {
    return await fn(homeDir);
  } finally {
    await fs.promises.rm(homeDir, { recursive: true, force: true });
  }
}

async function writeText(filePath: string, content: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content, 'utf8');
}

test('claude adapter scans history jsonl without mutating source files', async () => {
  await withTempHome(async (homeDir) => {
    const historyPath = path.join(homeDir, '.claude', 'history.jsonl');
    await writeText(
      historyPath,
      [
        JSON.stringify({
          sessionId: 'claude-1',
          cwd: 'D:/work/xenesis-desk',
          prompt: 'Fix terminal layout',
          timestamp: '2026-06-29T01:00:00.000Z',
        }),
      ].join('\n'),
    );
    const before = await fs.promises.readFile(historyPath, 'utf8');
    const adapter = createAgentSessionAdapters().find((item) => item.id === 'claude');
    assert.ok(adapter);

    const result = await adapter.scan({
      homeDir,
      xenisHomeDir: path.join(homeDir, '.xenis'),
      now: new Date('2026-06-29T02:00:00.000Z'),
    });
    const after = await fs.promises.readFile(historyPath, 'utf8');

    assert.equal(after, before);
    assert.equal(result.sessions.length, 1);
    assert.equal(result.sessions[0].id, 'claude:claude-1');
    assert.equal(result.sessions[0].projectName, 'xenesis-desk');
    assert.equal(result.sessions[0].resumeCommand, 'claude --resume claude-1');
  });
});

test('claude adapter scans project transcript jsonl sessions', async () => {
  await withTempHome(async (homeDir) => {
    await writeText(
      path.join(homeDir, '.claude', 'projects', 'D--work-xenesis-desk', 'claude-project-session.jsonl'),
      [
        JSON.stringify({
          type: 'system',
          sessionId: 'claude-project-session',
          cwd: 'D:/work/xenesis-desk',
          timestamp: '2026-06-29T01:00:00.000Z',
        }),
        JSON.stringify({
          type: 'user',
          sessionId: 'claude-project-session',
          cwd: 'D:/work/xenesis-desk',
          timestamp: '2026-06-29T01:01:00.000Z',
          message: {
            role: 'user',
            content: 'Claude 세션도 찾아줘',
          },
        }),
      ].join('\n'),
    );
    const adapter = createAgentSessionAdapters().find((item) => item.id === 'claude');
    assert.ok(adapter);

    const result = await adapter.scan({
      homeDir,
      xenisHomeDir: path.join(homeDir, '.xenis'),
      now: new Date('2026-06-29T02:00:00.000Z'),
    });

    assert.equal(result.sessions.length, 1);
    assert.equal(result.sessions[0].id, 'claude:claude-project-session');
    assert.equal(result.sessions[0].projectName, 'xenesis-desk');
    assert.equal(result.sessions[0].lastUserPrompt, 'Claude 세션도 찾아줘');
    assert.equal(result.sessions[0].resumeCommand, 'claude --resume claude-project-session');
  });
});

test('codex adapter scans jsonl sessions and reports sqlite source as diagnostic', async () => {
  await withTempHome(async (homeDir) => {
    await writeText(
      path.join(homeDir, '.codex', 'sessions', '2026', 'session-a.jsonl'),
      [
        JSON.stringify({
          id: 'codex-a',
          cwd: 'D:/work/xenesis-desk',
          role: 'user',
          content: 'review CR',
          timestamp: '2026-06-29T01:00:00.000Z',
        }),
        JSON.stringify({
          id: 'codex-a',
          role: 'assistant',
          content: 'done',
          timestamp: '2026-06-29T01:01:00.000Z',
        }),
      ].join('\n'),
    );
    await writeText(path.join(homeDir, '.codex', 'state_v2.sqlite'), 'not a fixture sqlite');
    const adapter = createAgentSessionAdapters().find((item) => item.id === 'codex');
    assert.ok(adapter);

    const result = await adapter.scan({
      homeDir,
      xenisHomeDir: path.join(homeDir, '.xenis'),
      now: new Date('2026-06-29T02:00:00.000Z'),
    });

    assert.equal(result.sessions.length, 1);
    assert.equal(result.sessions[0].id, 'codex:codex-a');
    assert.equal(result.sessions[0].resumeCommand, 'codex resume codex-a');
    assert.equal(
      result.diagnostics.some((item) => item.message.includes('sqlite')),
      true,
    );
  });
});

test('codex adapter scans current payload-based jsonl event streams', async () => {
  await withTempHome(async (homeDir) => {
    await writeText(
      path.join(homeDir, '.codex', 'sessions', '2026', '06', '29', 'rollout-session.jsonl'),
      [
        JSON.stringify({
          timestamp: '2026-06-29T01:00:00.000Z',
          type: 'session_meta',
          payload: {
            id: 'codex-current-a',
            cwd: 'D:/work/xenesis-desk',
          },
        }),
        JSON.stringify({
          timestamp: '2026-06-29T01:01:00.000Z',
          type: 'response_item',
          payload: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: '현재 폴더의 세션을 정리해줘' }],
          },
        }),
        JSON.stringify({
          timestamp: '2026-06-29T01:02:00.000Z',
          type: 'event_msg',
          payload: {
            type: 'agent_message',
            message: '정리했습니다.',
          },
        }),
      ].join('\n'),
    );
    const adapter = createAgentSessionAdapters().find((item) => item.id === 'codex');
    assert.ok(adapter);

    const result = await adapter.scan({
      homeDir,
      xenisHomeDir: path.join(homeDir, '.xenis'),
      now: new Date('2026-06-29T02:00:00.000Z'),
    });

    assert.equal(result.sessions.length, 1);
    assert.equal(result.sessions[0].id, 'codex:codex-current-a');
    assert.equal(result.sessions[0].projectName, 'xenesis-desk');
    assert.equal(result.sessions[0].lastUserPrompt, '현재 폴더의 세션을 정리해줘');
    assert.equal(result.sessions[0].resumeCommand, 'codex resume codex-current-a');
  });
});

test('gemini adapter scans chat session json files', async () => {
  await withTempHome(async (homeDir) => {
    await writeText(
      path.join(homeDir, '.gemini', 'tmp', 'abc', 'chats', 'session-g.json'),
      JSON.stringify({
        id: 'gemini-g',
        cwd: 'D:/work/gemini-project',
        updatedAt: '2026-06-29T01:00:00.000Z',
        messages: [{ role: 'user', content: 'summarize workspace' }],
      }),
    );
    const adapter = createAgentSessionAdapters().find((item) => item.id === 'gemini');
    assert.ok(adapter);

    const result = await adapter.scan({
      homeDir,
      xenisHomeDir: path.join(homeDir, '.xenis'),
      now: new Date('2026-06-29T02:00:00.000Z'),
    });

    assert.equal(result.sessions[0].id, 'gemini:gemini-g');
    assert.equal(result.sessions[0].projectName, 'gemini-project');
  });
});

test('xenesis adapter scans xenis run event jsonl files', async () => {
  await withTempHome(async (homeDir) => {
    const xenisHomeDir = path.join(homeDir, '.xenis');
    await writeText(
      path.join(xenisHomeDir, 'sessions', 'run-x1.jsonl'),
      [
        JSON.stringify({
          type: 'user_message',
          content: 'open app sessions',
          timestamp: '2026-06-29T01:00:00.000Z',
        }),
        JSON.stringify({
          type: 'assistant_message',
          content: 'ok',
          timestamp: '2026-06-29T01:01:00.000Z',
        }),
      ].join('\n'),
    );
    const adapter = createAgentSessionAdapters().find((item) => item.id === 'xenesis');
    assert.ok(adapter);

    const result = await adapter.scan({
      homeDir,
      xenisHomeDir,
      now: new Date('2026-06-29T02:00:00.000Z'),
    });

    assert.equal(result.sessions[0].source, 'xenesis');
    assert.equal(result.sessions[0].resumeCommand, 'xenesis sessions resume run-x1');
  });
});

test('adapter registry degrades one source without throwing for malformed records', async () => {
  await withTempHome(async (homeDir) => {
    await writeText(path.join(homeDir, '.claude', 'history.jsonl'), '{bad json}\n');
    const adapter = createAgentSessionAdapters().find((item) => item.id === 'claude');
    assert.ok(adapter);

    const result = await adapter.scan({
      homeDir,
      xenisHomeDir: path.join(homeDir, '.xenis'),
      now: new Date('2026-06-29T02:00:00.000Z'),
    });

    assert.equal(result.sessions.length, 0);
    assert.equal(
      result.diagnostics.some((item) => item.level === 'warn'),
      true,
    );
  });
});
