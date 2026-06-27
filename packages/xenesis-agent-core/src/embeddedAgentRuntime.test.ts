import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DeskEmbeddedAgentRuntime, mapDeskEmbeddedPromptResult } from './embeddedAgentRuntime';
import {
  createDeskEmbeddedPromptOptions,
  normalizeDeskProviderName,
  type DeskEmbeddedPromptResult,
} from './embeddedRuntime';
import { closeAllDatabases } from '../../xenesis/src/db/database';

test('mapDeskEmbeddedPromptResult preserves final doneContent from embedded runtime', () => {
  const result = mapDeskEmbeddedPromptResult({
    ok: true,
    exitCode: 0,
    traceId: 'trace-1',
    sessionId: 'session-1',
    output: '',
    errors: '',
    surface: {
      name: 'embedded',
      outputMode: 'stream-json',
      interactive: true,
    },
    events: [],
    doneContent: '최종 응답입니다.',
  } as DeskEmbeddedPromptResult);

  assert.equal(result.doneContent, '최종 응답입니다.');
});

test('createDeskEmbeddedPromptOptions enables provider streaming by default', () => {
  const options = createDeskEmbeddedPromptOptions({
    workspace: 'D:/workspace',
    xenesisHome: 'C:/Users/example/.xenesis-dev',
    providerRuntime: {
      provider: 'mock',
      model: '',
      profile: '',
      baseURL: '',
      apiKeyEnv: '',
      env: {},
    },
    approvalMode: 'safe',
    maxTurns: 4,
    request: {
      prompt: '안녕',
    },
  });

  assert.equal(options.stream, true);
});

test('createDeskEmbeddedPromptOptions preserves explicit stream false override', () => {
  const options = createDeskEmbeddedPromptOptions({
    workspace: 'D:/workspace',
    xenesisHome: 'C:/Users/example/.xenesis-dev',
    providerRuntime: {
      provider: 'mock',
      model: '',
      profile: '',
      baseURL: '',
      apiKeyEnv: '',
      env: {},
    },
    approvalMode: 'safe',
    maxTurns: 4,
    request: {
      prompt: '안녕',
      stream: false,
    },
  });

  assert.equal(options.stream, false);
});

test('createDeskEmbeddedPromptOptions preserves Qwen provider override for embedded Xenesis runs', () => {
  const options = createDeskEmbeddedPromptOptions({
    workspace: 'D:/workspace',
    xenesisHome: 'C:/Users/example/.xenesis-dev',
    providerRuntime: {
      provider: 'qwen',
      model: 'qwen-plus',
      profile: '',
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      apiKeyEnv: 'DASHSCOPE_API_KEY',
      env: { DASHSCOPE_API_KEY: 'dashscope-key' },
    },
    approvalMode: 'safe',
    maxTurns: 4,
    request: {
      prompt: '안녕',
    },
  });

  assert.equal(options.cli?.provider, 'qwen');
  assert.equal(options.cli?.model, 'qwen-plus');
  assert.equal(options.cli?.apiKeyEnv, 'DASHSCOPE_API_KEY');
});

test('normalizeDeskProviderName accepts codex-responses (Option B direct transport)', () => {
  assert.equal(normalizeDeskProviderName('codex-responses'), 'codex-responses');
});

test('createDeskEmbeddedPromptOptions preserves codex-responses provider for embedded Xenesis runs', () => {
  const options = createDeskEmbeddedPromptOptions({
    workspace: 'D:/workspace',
    xenesisHome: 'C:/Users/example/.xenesis-dev',
    providerRuntime: {
      provider: 'codex-responses',
      model: 'gpt-5.5',
      profile: '',
      baseURL: '',
      apiKeyEnv: '',
      env: {},
    },
    approvalMode: 'safe',
    maxTurns: 4,
    request: {
      prompt: '안녕',
    },
  });

  assert.equal(options.cli?.provider, 'codex-responses');
});

test('DeskEmbeddedAgentRuntime status exposes sanitized effective provider runtime', () => {
  const runtime = new DeskEmbeddedAgentRuntime({
    enabled: true,
    xenesisHome: 'C:/Users/example/.xenesis-dev',
    runtimePath: 'embedded',
    workspace: 'D:/workspace',
    env: { DASHSCOPE_API_KEY: 'dashscope-secret' },
    providerRuntime: {
      provider: 'qwen',
      model: 'qwen-plus',
      profile: 'desk',
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      apiKeyEnv: 'DASHSCOPE_API_KEY',
      env: { DASHSCOPE_API_KEY: 'dashscope-secret' },
    },
    approvalMode: 'safe',
    maxTurns: 4,
  });

  const status = runtime.start();

  assert.deepEqual(status.providerRuntime, {
    provider: 'qwen',
    model: 'qwen-plus',
    profile: 'desk',
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  });
  assert.equal(JSON.stringify(status).includes('dashscope-secret'), false);
});

test('DeskEmbeddedAgentRuntime reuses session and history across embedded mock provider turns', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'xenesis-desk-agent-runtime-'));
  try {
    const runtime = new DeskEmbeddedAgentRuntime({
      enabled: true,
      xenesisHome: join(workspace, '.xenesis'),
      runtimePath: 'embedded',
      workspace,
      env: {},
      providerRuntime: {
        provider: 'mock',
        model: 'mock-model',
        profile: '',
        baseURL: '',
        apiKeyEnv: '',
        env: {},
      },
      approvalMode: 'safe',
      maxTurns: 4,
    });

    runtime.start();
    const first = await runtime.run({
      prompt: '첫 질문',
      stream: false,
    });
    const second = await runtime.run({
      prompt: 'mock:messages',
      stream: false,
    });

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.ok(first.sessionId);
    assert.equal(second.sessionId, first.sessionId);
    assert.match(second.doneContent || '', /user: 첫 질문/);
    assert.match(second.doneContent || '', /assistant: mock response: 첫 질문/);
    assert.match(second.doneContent || '', /user: mock:messages/);
  } finally {
    closeAllDatabases();
    await rm(workspace, { recursive: true, force: true });
  }
});
