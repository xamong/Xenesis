import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createTurnLedger } from '../../xenesis/src/core/turnLedger';
import { closeAllDatabases } from '../../xenesis/src/db/database';
import { DeskEmbeddedAgentRuntime, mapDeskEmbeddedPromptResult } from './embeddedAgentRuntime';
import {
  createDeskEmbeddedPromptOptions,
  type DeskEmbeddedPromptResult,
  normalizeDeskProviderName,
} from './embeddedRuntime';

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
      env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true' },
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
      env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true' },
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

test('createDeskEmbeddedPromptOptions forwards runtime approvalHandler to embedded prompt options', () => {
  const approvalHandler = () => true;
  const options = createDeskEmbeddedPromptOptions({
    workspace: 'D:/workspace',
    xenesisHome: 'C:/Users/example/.xenesis-dev',
    providerRuntime: {
      provider: 'mock',
      model: '',
      profile: '',
      baseURL: '',
      apiKeyEnv: '',
      env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true' },
    },
    approvalMode: 'safe',
    maxTurns: 4,
    approvalHandler,
    request: {
      prompt: '안녕',
    },
  });

  assert.equal(options.approvalHandler, approvalHandler);
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
  let runtime: DeskEmbeddedAgentRuntime | undefined;
  try {
    runtime = new DeskEmbeddedAgentRuntime({
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
        env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true' },
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
    runtime?.stop();
    closeAllDatabases();
    await rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
});

test('DeskEmbeddedAgentRuntime isolates session and history by run source', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'xenesis-desk-agent-runtime-sources-'));
  let runtime: DeskEmbeddedAgentRuntime | undefined;
  try {
    runtime = new DeskEmbeddedAgentRuntime({
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
        env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true' },
      },
      approvalMode: 'safe',
      maxTurns: 4,
    });

    runtime.start();
    const agentFirst = await runtime.run({
      prompt: 'agent only context',
      source: 'xenesis-xenesis-agent',
      stream: false,
    });
    const workbenchFirst = await runtime.run({
      prompt: 'mock:messages',
      source: 'xenesis-agent-workbench',
      stream: false,
    });
    const agentSecond = await runtime.run({
      prompt: 'mock:messages',
      source: 'xenesis-xenesis-agent',
      stream: false,
    });

    assert.equal(agentFirst.ok, true);
    assert.equal(workbenchFirst.ok, true);
    assert.equal(agentSecond.ok, true);
    assert.ok(agentFirst.sessionId);
    assert.ok(workbenchFirst.sessionId);
    assert.notEqual(workbenchFirst.sessionId, agentFirst.sessionId);
    assert.doesNotMatch(workbenchFirst.doneContent || '', /agent only context/);
    assert.equal(agentSecond.sessionId, agentFirst.sessionId);
    assert.match(agentSecond.doneContent || '', /agent only context/);
  } finally {
    runtime?.stop();
    closeAllDatabases();
    await rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
});

test('DeskEmbeddedAgentRuntime writes embedded mock provider turns to the injected turn ledger', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'xenesis-desk-agent-runtime-ledger-'));
  const turnLedger = createTurnLedger({
    now: () => '2026-06-28T00:00:00.000Z',
    idFactory: () => 'turn-runtime-ledger-1',
  });
  let runtime: DeskEmbeddedAgentRuntime | undefined;

  try {
    runtime = new DeskEmbeddedAgentRuntime({
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
        env: { XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true' },
      },
      approvalMode: 'safe',
      maxTurns: 4,
      turnLedger,
    });

    runtime.start();
    const result = await runtime.run({
      prompt: 'ledger check',
      stream: false,
    });

    assert.equal(result.ok, true);
    assert.equal(turnLedger.current()?.id, 'turn-runtime-ledger-1');
    assert.equal(turnLedger.current()?.sessionId, result.sessionId);
    assert.equal(turnLedger.current()?.status, 'completed');
  } finally {
    runtime?.stop();
    closeAllDatabases();
    await rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
});
