import assert from 'node:assert/strict';
import test from 'node:test';
import { buildXenesisAgentHistoryMessages, buildXenesisContextualPrompt } from './xenesisAgentChatHistory';
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

test('buildXenesisContextualPrompt anchors short Korean follow-up requests to the recent topic', () => {
  const newestFirstMessages: XenesisChatMessage[] = [
    message('assistant', '웹 앱으로 만들려면 성경 읽기 계획, 메모, 번역본 비교 기능부터 추천합니다.'),
    message('user', '웹으로 만들고 싶어요.'),
    message('assistant', '성경 읽기 계획, 메모, 번역본 비교, 읽기 통계 기능을 넣을 수 있습니다.'),
    message('user', '성경을 잘 읽을 수 있는 프로그램요.'),
    message('assistant', '성경을 읽기 위한 팁으로 목적 정하기, 계획 세우기, 노트하기를 추천합니다.'),
    message('user', '성경을 잘 읽을 수 있는 방법에 대해 알고 싶어요.'),
  ];

  const result = buildXenesisContextualPrompt({
    prompt: '추천해주세요',
    messages: newestFirstMessages,
  });

  assert.equal(result.contextApplied, true);
  assert.match(result.prompt, /Current user request:\n추천해주세요/);
  assert.match(result.prompt, /Recent conversation context/);
  assert.match(result.prompt, /성경/);
  assert.match(result.prompt, /웹 앱/);
  assert.match(result.prompt, /Do not ask what the recommendation is about/);
});

test('buildXenesisContextualPrompt anchors common multilingual follow-up requests to the recent topic', () => {
  const newestFirstMessages: XenesisChatMessage[] = [
    message(
      'assistant',
      'A Bible reading web app should start with reading plans, notes, version comparison, and progress tracking.',
    ),
    message('user', 'I want to build it as a web app.'),
    message(
      'assistant',
      'For a Bible reading program, keep the first version focused on guided daily reading and simple reflection notes.',
    ),
    message('user', 'I want a program that helps people read the Bible well.'),
  ];

  const followUps = [
    'Recommend it.',
    'Show me examples.',
    'Make it into a web app.',
    '推荐一下。',
    '给我示例。',
    '做成网页应用。',
    'おすすめして。',
    '例を見せて。',
    'Webアプリにして。',
    'Recomiéndalo.',
    'Muéstrame ejemplos.',
    'Hazlo como una aplicación web.',
    'Recommande-le.',
    'Montre-moi des exemples.',
    'Fais-en une application web.',
    'Empfiehl es mir.',
    'Zeig mir Beispiele.',
    'Mach daraus eine Web-App.',
    'Consigliamelo.',
    'Mostrami degli esempi.',
    'Trasformalo in una web app.',
    'Порекомендуй.',
    'Покажи примеры.',
    'Сделай это веб-приложением.',
    'Recomende isso.',
    'Mostre exemplos.',
    'Buat jadi aplikasi web.',
    'Hiển thị ví dụ.',
    'เว็บแอปให้หน่อย',
    'Bunu web uygulaması yap.',
    'اعرض أمثلة.',
    'इसे वेब ऐप बनाओ।',
  ];

  for (const prompt of followUps) {
    const result = buildXenesisContextualPrompt({
      prompt,
      messages: newestFirstMessages,
    });

    assert.equal(result.contextApplied, true, prompt);
    assert.match(result.prompt, /Recent conversation context/, prompt);
    assert.match(result.prompt, /Bible reading/, prompt);
    assert.match(result.prompt, /Current user request:/, prompt);
  }
});

test('buildXenesisContextualPrompt keeps concrete standalone prompts unchanged', () => {
  const newestFirstMessages: XenesisChatMessage[] = [
    message('assistant', '웹 앱으로 만들려면 성경 읽기 계획, 메모, 번역본 비교 기능부터 추천합니다.'),
    message('user', '웹으로 만들고 싶어요.'),
  ];

  const result = buildXenesisContextualPrompt({
    prompt: 'React 상태 관리 방법을 알려줘.',
    messages: newestFirstMessages,
  });

  assert.equal(result.contextApplied, false);
  assert.equal(result.prompt, 'React 상태 관리 방법을 알려줘.');
});
