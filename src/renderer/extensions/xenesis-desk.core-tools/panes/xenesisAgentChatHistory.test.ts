import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildXenesisAgentHistoryMessages } from './xenesisAgentChatHistory';
import type { XenesisChatMessage } from './xenesisAgentTypes';

const message = (
  role: XenesisChatMessage['role'],
  content: string,
  extra: Partial<XenesisChatMessage> = {},
): XenesisChatMessage => ({
  id: `${role}-${content}`,
  at: '2026-06-19T00:00:00.000Z',
  role,
  content,
  ...extra,
});

test('buildXenesisAgentHistoryMessages returns previous user and assistant turns in chronological order', () => {
  const newestFirstMessages: XenesisChatMessage[] = [
    message('assistant', '', { streaming: true }),
    message('user', '영어로.'),
    message('assistant', '제주도, 부산 해운대, 강릉 경포대를 추천합니다.'),
    message('user', '대한민국에서 여름에 가볼 만한 여행지 추천해줘.'),
    message('system', 'Ready'),
  ];

  assert.deepEqual(buildXenesisAgentHistoryMessages(newestFirstMessages), [
    { role: 'user', content: '대한민국에서 여름에 가볼 만한 여행지 추천해줘.' },
    { role: 'assistant', content: '제주도, 부산 해운대, 강릉 경포대를 추천합니다.' },
    { role: 'user', content: '영어로.' },
  ]);
});

test('buildXenesisAgentHistoryMessages can exclude the current prompt already being sent', () => {
  const newestFirstMessages: XenesisChatMessage[] = [
    message('assistant', '제주도, 부산 해운대, 강릉 경포대를 추천합니다.'),
    message('user', '대한민국에서 여름에 가볼 만한 여행지 추천해줘.'),
  ];

  assert.deepEqual(buildXenesisAgentHistoryMessages(newestFirstMessages, { currentPrompt: '영어로.' }), [
    { role: 'user', content: '대한민국에서 여름에 가볼 만한 여행지 추천해줘.' },
    { role: 'assistant', content: '제주도, 부산 해운대, 강릉 경포대를 추천합니다.' },
  ]);
});

test('xenesis chat history does not classify natural follow-up prompts', () => {
  const source = readFileSync(new URL('./xenesisAgentChatHistory.ts', import.meta.url), 'utf8');
  const runRequestSource = readFileSync(new URL('./xenesisAgentRunRequest.ts', import.meta.url), 'utf8');
  const paneSource = readFileSync(new URL('./XenesisAgentPane.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /buildXenesisContextualPrompt/);
  assert.doesNotMatch(source, /isLikelyFollowUpPrompt|isLikelyStandalonePrompt/);
  assert.doesNotMatch(source, /exactFollowUpPrompts|followUpPromptPatterns/);
  assert.doesNotMatch(source, /Recent conversation context|Treat the current request as a follow-up/);
  assert.doesNotMatch(runRequestSource, /buildXenesisContextualPrompt/);
  assert.doesNotMatch(paneSource, /Recent conversation context attached to follow-up prompt/);
});
