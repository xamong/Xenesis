import assert from 'node:assert/strict';
import test from 'node:test';
import { createMockGowooriResponse } from './gowooriProviders';
import { findMockScenario } from './mockScenarios';

test('forced mock scenario wins over stale weather context in artifact prompts', () => {
  const prompt = [
    '이전 응답: 이번주 서울 날씨 요약',
    '/artifact [mock:noc] C06 Xenesis 제어 데모야. Server-03 긴급 장애 NOC 상황판을 생성해줘.',
    '상태 KPI, 장애 추세 chart, 영향 서비스 networkDiagram, 조치 queue를 포함해줘.',
  ].join('\n');

  const scenario = findMockScenario(prompt);
  assert.equal(scenario?.id, 'noc');

  const source = createMockGowooriResponse(prompt, 'generate');
  assert.match(source, /Server-03 긴급 장애 대시보드/);
  assert.doesNotMatch(source, /이번주 서울 날씨 요약|주간 날씨 대시보드/);
});

test('forced mock scenario is recognized after the artifact command prefix', () => {
  const prompt = '/artifact [mock:noc] 이번주 서울 날씨 말고 대시보드를 만들어줘.';

  const scenario = findMockScenario(prompt);
  assert.equal(scenario?.id, 'noc');

  const source = createMockGowooriResponse(prompt, 'generate');
  assert.match(source, /Server-03 긴급 장애 대시보드/);
  assert.doesNotMatch(source, /주간 날씨 대시보드/);
});
