import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { classifyDirectMemoryIntent } from '../../src/core/memoryDirectRoute.js';
import { runAgentPipeline } from '../../src/core/AgentRunPipeline.js';
import { SqliteMemoryLedgerStore, SqliteMemoryStore } from '../../src/extensions/index.js';
import { readSessionLog } from '../../src/sessions/history.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

async function writeMockConfig(root: string) {
  const configPath = join(root, 'xenesis.config.json');
  await writeFile(
    configPath,
    JSON.stringify({
      provider: 'mock',
      model: 'mock-model',
      workspace: '.',
      extensions: {
        memory: {
          enabled: true,
          path: 'runtime-memory.json',
        },
      },
    }),
    'utf8',
  );
  return configPath;
}

describe('direct memory route', () => {
  it('does not consume memory governance proposal prompts', () => {
    expect(classifyDirectMemoryIntent('보류된 장기기억 후보 보여줘')).toBeUndefined();
    expect(classifyDirectMemoryIntent('memory proposals list')).toBeUndefined();
    expect(classifyDirectMemoryIntent('이 memory proposal을 승인해줘')).toBeUndefined();
  });

  it('handles explicit memory save/search prompts before provider execution and records ledger evidence', async () => {
    const workspace = await createTempWorkspace('i1-memory-direct-');
    try {
      const configPath = await writeMockConfig(workspace.root);
      const xenesisHome = join(workspace.root, '.xenesis-home');
      await mkdir(xenesisHome, { recursive: true });
      const env = { XENESIS_HOME: xenesisHome };
      const marker = 'direct-memory-marker';

      const saveResult = await runAgentPipeline({
        cwd: workspace.root,
        configPath,
        env,
        prompt: `이 내용을 장기기억에 저장해: 내가 답변은 짧고 실행 중심으로 받는 걸 선호한다. 검증 표식은 ${marker}`,
      });

      expect(saveResult.doneContent).toContain('기억했습니다');
      expect(saveResult.events.some((event) => event.type === 'tool_call' && event.toolCall.name === 'memory')).toBe(
        true,
      );

      const memoryStore = new SqliteMemoryStore({ xenesisHome });
      const ledgerStore = new SqliteMemoryLedgerStore({ xenesisHome });
      const records = await memoryStore.list();
      expect(records.some((record) => record.text.includes(marker) && record.status === 'active')).toBe(true);
      expect((await ledgerStore.listEvents()).map((event) => event.type)).toContain('memory_accepted');

      const saveLog = await readSessionLog(xenesisHome, saveResult.sessionId);
      expect(saveLog.some((event) => event.type === 'user_message' && event.message.content.includes(marker))).toBe(
        true,
      );
      expect(saveLog.some((event) => event.type === 'tool_call' && event.toolCall.name === 'memory')).toBe(true);

      const searchResult = await runAgentPipeline({
        cwd: workspace.root,
        configPath,
        env,
        prompt: '내가 방금 저장하라고 한 검증 표식을 기억에서 찾아줘.',
      });

      expect(searchResult.doneContent).toContain(marker);
      expect(searchResult.events.some((event) => event.type === 'tool_result')).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });

  it('handles explicit memory save-then-search prompts as two memory calls with the requested id', async () => {
    const workspace = await createTempWorkspace('i1-memory-direct-composite-');
    try {
      const configPath = await writeMockConfig(workspace.root);
      const xenesisHome = join(workspace.root, '.xenesis-home');
      await mkdir(xenesisHome, { recursive: true });
      const env = { XENESIS_HOME: xenesisHome };

      expect(
        classifyDirectMemoryIntent(
          "memory 도구로 'xenesis capability memory anchor'라는 장기 기억을 capability-anchor id로 저장한 뒤, 같은 문구를 검색해서 저장 여부를 확인해줘.",
        ),
      ).toBe('save_search');

      const result = await runAgentPipeline({
        cwd: workspace.root,
        configPath,
        env,
        prompt:
          "memory 도구로 'xenesis capability memory anchor'라는 장기 기억을 capability-anchor id로 저장한 뒤, 같은 문구를 검색해서 저장 여부를 확인해줘.",
      });

      const memoryToolCalls = result.events.flatMap((event) =>
        event.type === 'tool_call' && event.toolCall.name === 'memory' ? [event.toolCall] : [],
      );
      expect(memoryToolCalls).toHaveLength(2);
      expect(
        memoryToolCalls.map((toolCall) =>
          toolCall.input && typeof toolCall.input === 'object' && 'action' in toolCall.input
            ? toolCall.input.action
            : undefined,
        ),
      ).toEqual(['save', 'search']);
      expect(result.doneContent).toContain('capability-anchor');
      expect(result.doneContent).toContain('xenesis capability memory anchor');

      const memoryStore = new SqliteMemoryStore({ xenesisHome });
      const records = await memoryStore.list();
      expect(records.some((record) => record.id === 'capability-anchor' && record.status === 'active')).toBe(true);
    } finally {
      await workspace.cleanup();
    }
  });
});
