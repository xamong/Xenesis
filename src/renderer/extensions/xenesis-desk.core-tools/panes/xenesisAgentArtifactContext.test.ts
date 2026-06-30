import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildXenesisArtifactPromptWithContext } from './xenesisAgentArtifactContext';
import type { XenesisChatMessage } from './xenesisAgentTypes';

function message(id: string, role: XenesisChatMessage['role'], content: string): XenesisChatMessage {
  return {
    id,
    role,
    content,
    at: `2026-06-19T00:00:0${id.replace(/\D/g, '') || '0'}Z`,
  };
}

test('artifact prompt context has no natural follow-up classifier', () => {
  const source = readFileSync(new URL('./xenesisAgentArtifactContext.ts', import.meta.url), 'utf8');
  const paneSource = readFileSync(new URL('./XenesisAgentPane.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /isXenesisArtifactFollowUpPrompt/);
  assert.doesNotMatch(source, /FORMAT_OR_ARTIFACT_PATTERN|ARTIFACT_ACTION_PATTERN|REFERENTIAL_PATTERN/);
  assert.doesNotMatch(source, /RESIDUE_PATTERNS|substantiveResidue|findPriorAssistantContext/);
  assert.doesNotMatch(source, /follow-up artifact conversion request|Current follow-up request/);
  assert.doesNotMatch(paneSource, /Artifact follow-up context applied/);
});

test('wraps artifact prompts as fresh current-request prompts without prior-context inference', () => {
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

  assert.equal(result.contextApplied, false);
  assert.match(result.prompt, /fresh artifact request inside Xenesis Agent/i);
  assert.match(result.prompt, /Use only the current user request as the source of truth/i);
  assert.match(result.prompt, /Current user request:\nxcon으로 보여줘\./);
  assert.doesNotMatch(result.prompt, /Previous Xenesis assistant answer|Previous user request/);
  assert.doesNotMatch(result.prompt, /체코 1 vs 남아프리카 1|멕시코 1 vs 대한민국 0/);
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
