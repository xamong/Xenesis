import { describe, expect, it } from 'vitest';
import { buildXenesisAgentRunContextDetail, buildXenesisAgentRunRequest } from './xenesisAgentRunRequest';

describe('buildXenesisAgentRunRequest casual input', () => {
  it('does not append Desk-control hint / read-only framing to a greeting', () => {
    const req = buildXenesisAgentRunRequest({
      prompt: '야',
      mode: 'chat',
      source: 'test',
      contextMessages: [],
    });
    expect(req.prompt).not.toContain('xenesis-desk-action');
    expect(req.prompt).not.toMatch(/read-only|sandbox/i);
    expect(req.prompt.trim()).toBe('야');
  });

  it('does not rewrite natural follow-up-looking prompts with local context heuristics', () => {
    const contextMessages = [
      {
        id: 'assistant-1',
        at: '2026-06-19T00:00:00.000Z',
        role: 'assistant' as const,
        content: '성경 읽기 웹 앱은 읽기 계획과 노트 기능부터 시작하면 됩니다.',
      },
      {
        id: 'user-1',
        at: '2026-06-19T00:00:01.000Z',
        role: 'user' as const,
        content: '성경 읽기 앱을 만들고 싶어요.',
      },
    ];

    const req = buildXenesisAgentRunRequest({
      prompt: '추천해주세요',
      mode: 'chat',
      source: 'test',
      contextMessages,
    });

    expect(req.prompt).toBe('추천해주세요');
    expect(req.prompt).not.toContain('Recent conversation context');
    expect(buildXenesisAgentRunContextDetail({ prompt: '추천해주세요', contextMessages })).toBe('');
  });
});
