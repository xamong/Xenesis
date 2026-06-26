import assert from 'node:assert/strict';
import test from 'node:test';

import { buildXenesisArtifactPromptWithContext, isXenesisArtifactFollowUpPrompt } from './xenesisAgentArtifactContext';
import type { XenesisChatMessage } from './xenesisAgentTypes';

function message(id: string, role: XenesisChatMessage['role'], content: string): XenesisChatMessage {
  return {
    id,
    role,
    content,
    at: `2026-06-19T00:00:0${id.replace(/\D/g, '') || '0'}Z`,
  };
}

test('detects short artifact conversion follow-ups without treating new concrete requests as follow-ups', () => {
  assert.equal(isXenesisArtifactFollowUpPrompt('xcon으로 보여줘'), true);
  assert.equal(isXenesisArtifactFollowUpPrompt('그걸 XCON/SKETCH로 다시 보여줘'), true);
  assert.equal(isXenesisArtifactFollowUpPrompt('위 내용을 표와 차트로 보여줘'), true);
  assert.equal(isXenesisArtifactFollowUpPrompt('이번주 제주도 날씨를 xcon으로 보여줘'), false);
  assert.equal(isXenesisArtifactFollowUpPrompt('차트와 그리드가 있는 영업 대시보드 만들어줘'), false);
});

test('builds contextual artifact prompts from the previous user and assistant turn', () => {
  const messages: XenesisChatMessage[] = [
    message(
      'a2',
      'assistant',
      [
        '오늘의 월드컵 경기 결과는 다음과 같습니다:',
        '1. 체코 1 vs 남아프리카 1 - 최종',
        '2. 스위스 4 vs 보스니아-헤르체고비나 1 - 최종',
        '3. 캐나다 6 vs 카타르 0 - 최종',
        '4. 멕시코 1 vs 대한민국 0 - 최종',
      ].join('\n'),
    ),
    message('u1', 'user', '오늘 월드컵 경기 결과를 정리해줘.'),
  ];

  const result = buildXenesisArtifactPromptWithContext({
    prompt: 'xcon으로 보여줘.',
    messages,
  });

  assert.equal(result.contextApplied, true);
  assert.match(result.prompt, /Current follow-up request:\nxcon으로 보여줘\./);
  assert.match(result.prompt, /Previous user request:\n오늘 월드컵 경기 결과를 정리해줘\./);
  assert.match(result.prompt, /체코 1 vs 남아프리카 1/);
  assert.match(result.prompt, /멕시코 1 vs 대한민국 0/);
  assert.match(result.prompt, /Do not generate a generic XCON or Gowoori feature demo/i);
  assert.equal(result.applyLabel, '오늘 월드컵 경기 결과를 정리해줘.');
});

test('treats generic sample-screen requests as contextual artifact follow-ups', () => {
  const messages: XenesisChatMessage[] = [
    message(
      'a2',
      'assistant',
      [
        '성경읽기 앱 요구사항은 다음과 같습니다.',
        '1. 읽기 계획 및 알림',
        '2. 주제별 구절 검색',
        '3. 노트 및 하이라이트',
        '4. 번역본 비교',
      ].join('\n'),
    ),
    message('u1', 'user', '성경읽기 앱 요구사항 정의서를 만들어줘.'),
  ];

  const result = buildXenesisArtifactPromptWithContext({
    prompt: '각 기능에 대한 샘플 화면이 필요해.',
    messages,
  });

  assert.equal(isXenesisArtifactFollowUpPrompt('각 기능에 대한 샘플 화면이 필요해.'), true);
  assert.equal(result.contextApplied, true);
  assert.match(result.prompt, /Previous user request:\n성경읽기 앱 요구사항 정의서를 만들어줘\./);
  assert.match(result.prompt, /읽기 계획 및 알림/);
  assert.match(result.prompt, /주제별 구절 검색/);
  assert.match(result.prompt, /Do not generate a generic XCON or Gowoori feature demo/i);
  assert.match(result.prompt, /create those screens for the features described in the previous answer/i);
  assert.equal(result.applyLabel, '성경읽기 앱 요구사항 정의서를 만들어줘.');
});

test('wraps standalone artifact prompts with a fresh-request guard when no usable prior answer exists', () => {
  const result = buildXenesisArtifactPromptWithContext({
    prompt: 'xcon으로 보여줘',
    messages: [message('u1', 'user', '안녕')],
  });

  assert.equal(result.contextApplied, false);
  assert.match(result.prompt, /fresh artifact request inside Xenesis Agent/i);
  assert.match(result.prompt, /Use only the current user request as the source of truth/i);
  assert.match(result.prompt, /No previous assistant answer is available/i);
  assert.match(result.prompt, /Current user request:\nxcon으로 보여줘/);
  assert.equal(result.applyLabel, '');
});

test('wraps bounded non-follow-up artifact prompts without importing previous domains', () => {
  const result = buildXenesisArtifactPromptWithContext({
    prompt: [
      '아래 CR 스모크 상태 요약만 기준으로 5줄 이내로 답해줘.',
      '- CR bridge: DEV 3848 연결 확인',
      '- Agent path: xd.testing.xenesisAgent.submitPrompt',
      '- capture: xd.capture.thumbnail으로 검증',
    ].join('\n'),
    messages: [
      message('a2', 'assistant', '이전 답변에는 전혀 다른 도메인의 긴 보고서가 있었습니다.'),
      message('u1', 'user', '이전 요청'),
    ],
  });

  assert.equal(result.contextApplied, false);
  assert.match(result.prompt, /fresh artifact request inside Xenesis Agent/i);
  assert.match(result.prompt, /bounded bullets or data/i);
  assert.match(result.prompt, /CR bridge: DEV 3848/);
  assert.match(result.prompt, /xd\.testing\.xenesisAgent\.submitPrompt/);
  assert.doesNotMatch(result.prompt, /Previous Xenesis assistant answer/);
});
