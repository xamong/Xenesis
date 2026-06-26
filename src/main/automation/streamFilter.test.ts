import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAutomationStreamText, resolveAutomationStreamFilterProfile } from './streamFilter';
import { listAutomationStreamFilterAdapters } from './streamFilters/registry';

test('stream filter registry exposes CLI adapters by file', () => {
  assert.deepEqual(
    listAutomationStreamFilterAdapters()
      .map((adapter) => adapter.id)
      .sort(),
    ['aider', 'claude', 'codex', 'gemini', 'windsurf'],
  );
  assert.equal(resolveAutomationStreamFilterProfile('auto', { lastCommand: 'codex' }), 'codex');
  assert.equal(resolveAutomationStreamFilterProfile('auto', { lastCommand: 'claude' }), 'claude');
  assert.equal(resolveAutomationStreamFilterProfile('auto', { lastCommand: 'gemini' }), 'gemini');
  assert.equal(resolveAutomationStreamFilterProfile('auto', { lastCommand: 'aider' }), 'aider');
  assert.equal(resolveAutomationStreamFilterProfile('auto', { lastCommand: 'windsurf' }), 'windsurf');
});

test('codex stream filter suppresses code fragments observed in channel-send logs', () => {
  const text = [
    "step.stepId)?.titleKey.replace('app.', '') || 'onboardingVerifyUnknownStep'}`)}</strong>",
    "No exceptions without your human partner's permission.",
    '{demoRouteScenes.map(scene => (',
    '<li key={`${demoRouteRunId || \'demo-route\'}-${scene.stepId}`} className="onboarding-demo-route-scene">',
    "import { flushSync } from 'react-dom';",
    "message: failedStep.error || failedStep.message || t('app.onboardingVerifyUnknownStep'),",
    '});',
    'eGenerateDemoRoute|runViewerRef|',
    '먼저 회귀 테스트에 새 기대 동작을 추가합니다.',
  ].join('\n');

  assert.equal(filterAutomationStreamText(text, { profile: 'codex' }), '먼저 회귀 테스트에 새 기대 동작을 추가합니다.');
});

test('claude and gemini adapters keep user-facing output while suppressing tool chrome', () => {
  assert.equal(
    filterAutomationStreamText(
      ['✻ Welcome to Claude Code!', '⏺ Bash(npm test)', '작업 내용을 정리했습니다.'].join('\n'),
      { profile: 'claude' },
    ),
    '작업 내용을 정리했습니다.',
  );
  assert.equal(
    filterAutomationStreamText(['Gemini CLI', 'Tool call: edit_file', '검증 결과를 정리했습니다.'].join('\n'), {
      profile: 'gemini',
    }),
    '검증 결과를 정리했습니다.',
  );
});
