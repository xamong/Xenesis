import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isXenesisApprovalIntent,
  isXenesisMarkdownSaveRequest,
  shouldPreferXenesisAgentPrompt,
} from './xenesisAgentInputRouting';

test('detects short approval follow-ups as approval intent', () => {
  assert.equal(isXenesisApprovalIntent('승인'), true);
  assert.equal(isXenesisApprovalIntent('네 승인합니다'), true);
  assert.equal(isXenesisApprovalIntent('approve'), true);
  assert.equal(isXenesisApprovalIntent('저장 승인'), true);
  assert.equal(isXenesisApprovalIntent('승인 방식 설명해줘'), false);
});

test('detects markdown file save requests', () => {
  assert.equal(isXenesisMarkdownSaveRequest('개발 단계를 정리해서 markdown 파일로 만들어줘'), true);
  assert.equal(isXenesisMarkdownSaveRequest('위 대화에서 나온 내용을 markdown 으로 저장해'), true);
  assert.equal(isXenesisMarkdownSaveRequest('파일로 저장해'), true);
  assert.equal(isXenesisMarkdownSaveRequest('샘플 화면을 만들어줘'), false);
});

test('keeps ordinary follow-up questions in the agent instead of artifact routing', () => {
  assert.equal(shouldPreferXenesisAgentPrompt('이 화면을 개발하려면 뭐부터 해야 해?'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('왜 화면을 띄우는거야? 질문에 답해줘'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('개발 방향을 markdown 파일로 정리해줘'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('각 기능에 대한 샘플 화면이 필요해'), false);
  assert.equal(shouldPreferXenesisAgentPrompt('성경읽기 프로그램 샘플 화면이 필요해'), false);
});

test('keeps greetings and ordinary chat in Xenesis instead of artifact routing', () => {
  assert.equal(shouldPreferXenesisAgentPrompt('안녕'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('안녕하세요.'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('오늘 날씨 어때?'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('성경을 잘 읽을 수 있는 방법에 대해 알고 싶어요.'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('대한민국에서 여름에 갈 만한 여행지 추천해줘.'), true);
});

test('keeps multilingual follow-up requests in Xenesis conversation context', () => {
  assert.equal(shouldPreferXenesisAgentPrompt('영어로.'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('in English'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('用英文'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('英語で'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('en español'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('en français'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('auf Deutsch'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('in italiano'), true);
  assert.equal(shouldPreferXenesisAgentPrompt('на русском'), true);
});

test('routes explicit artifact requests away from plain Xenesis chat', () => {
  assert.equal(shouldPreferXenesisAgentPrompt('xcon으로 보여줘'), false);
  assert.equal(shouldPreferXenesisAgentPrompt('차트와 그리드가 있는 대시보드 만들어줘'), false);
  assert.equal(shouldPreferXenesisAgentPrompt('지도로 보여줘'), false);
});
