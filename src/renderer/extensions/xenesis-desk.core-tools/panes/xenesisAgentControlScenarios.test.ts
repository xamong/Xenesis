import assert from 'node:assert/strict';
import test from 'node:test';
import { buildXenesisControlScenarioPromptHint, findXenesisControlScenarios } from './xenesisAgentControlScenarios';

test('findXenesisControlScenarios matches terminal orchestration requests', () => {
  const matches = findXenesisControlScenarios('터미널 오케스트레이션 시나리오 진행해');

  assert.equal(matches[0]?.id, 'terminal-orchestration');
  assert.deepEqual(matches[0]?.capabilities.slice(0, 3), [
    'xd.terminals.runMany',
    'xd.terminals.run',
    'xd.terminals.tail',
  ]);
});

test('buildXenesisControlScenarioPromptHint returns executable CR guidance for capture reports', () => {
  const hint = buildXenesisControlScenarioPromptHint('control-scenarios 문서대로 캡처 보고서 테스트해');

  assert.match(hint, /Xenesis control scenario catalog/);
  assert.match(hint, /Scenario 4: Capture and report generation/);
  assert.match(hint, /xd.capture.activePane/);
  assert.match(hint, /xd.artifacts.xconMarkdown.exportPdf/);
  assert.match(hint, /```xenesis-desk-action/);
});

test('buildXenesisControlScenarioPromptHint returns a catalog for generic scenario requests', () => {
  const hint = buildXenesisControlScenarioPromptHint('제어 시나리오 목록 보여줘');

  assert.match(hint, /Available control scenarios/);
  assert.match(hint, /1\. Terminal orchestration/);
  assert.match(hint, /15\. Transfer queue automation/);
});
