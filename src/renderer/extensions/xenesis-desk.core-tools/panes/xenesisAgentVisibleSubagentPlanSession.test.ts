import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVisibleSubagentPlanSession,
  formatVisibleSubagentPlanSessionForAgent,
  formatVisibleSubagentPlanSessionForTerminal,
  parseVisibleSubagentPlanSessionOptions,
  shouldRouteVisibleSubagentPlanSessionPrompt,
  shouldTreatVisibleSubagentPlanSessionPromptAsExplanation,
} from './xenesisAgentVisibleSubagentPlanSession';

test('builds an automatic subagent-driven visible plan session', () => {
  const session = buildVisibleSubagentPlanSession('현재 프로젝트 상태를 점검해줘', {
    runId: 'vp-test',
    manualSelection: false,
  });

  assert.equal(session.id, 'vp-test');
  assert.equal(session.userTask, '현재 프로젝트 상태를 점검해줘');
  assert.equal(session.status, 'running');
  assert.deepEqual(session.modes, ['subagent-driven', 'inline']);
  assert.equal(session.recommendedMode, 'subagent-driven');
  assert.equal(session.selectedMode, 'subagent-driven');
  assert.equal(session.selectionSource, 'auto');
  assert.equal(session.manualSelection, false);
  assert.equal(session.workers.length, 4);
  assert.deepEqual(
    session.workers.map((worker) => worker.title),
    [
      'Subagent 1 - Project Scan',
      'Subagent 2 - Change Audit',
      'Subagent 3 - Verification Runner',
      'Subagent 4 - Handoff Summary',
    ],
  );
  assert.deepEqual(session.layoutPolicy, {
    rightWidth: 760,
    bottomHeight: 170,
    documentArrangement: 'grid',
  });
  assert.deepEqual(session.cleanupPolicy, {
    keepOpen: false,
    closeAfter: false,
    showMs: 6000,
  });
  assert.deepEqual(session.timeoutPolicy, {
    workerMarkerTimeoutMs: 120000,
    pollMs: 750,
  });
});

test('builds a manual plan session that awaits mode selection', () => {
  const session = buildVisibleSubagentPlanSession('visible subagents로 점검해줘', {
    runId: 'vp-manual',
    manualSelection: true,
  });

  assert.equal(session.id, 'vp-manual');
  assert.equal(session.status, 'awaiting-selection');
  assert.equal(session.selectedMode, undefined);
  assert.equal(session.selectionSource, undefined);
  assert.equal(session.manualSelection, true);
  assert.equal(session.recommendedMode, 'subagent-driven');
});

test('formats visible plan session text for Agent and terminal surfaces', () => {
  const session = buildVisibleSubagentPlanSession('현재 프로젝트 상태를 점검해줘', {
    runId: 'vp-format',
    manualSelection: false,
  });

  const agentText = formatVisibleSubagentPlanSessionForAgent(session);
  const terminalText = formatVisibleSubagentPlanSessionForTerminal(session);

  for (const text of [agentText, terminalText]) {
    assert.match(text, /Visible Subagent Plan Session/);
    assert.match(text, /현재 프로젝트 상태를 점검해줘/);
    assert.match(text, /subagent-driven/);
    assert.match(text, /inline/);
    assert.match(text, /Subagent 1 - Project Scan/);
    assert.match(text, /Subagent 4 - Handoff Summary/);
  }
});

test('parses visible plan session options and strips execution flags from task', () => {
  assert.deepEqual(
    parseVisibleSubagentPlanSessionOptions(
      '현재 프로젝트 점검 --manual --show-ms=3000 --sleep 2 --keep-open --close-after',
    ),
    {
      manualSelection: true,
      keepOpen: true,
      closeAfter: false,
      showMs: 3000,
      sleepSeconds: 2,
      taskInput: '현재 프로젝트 점검',
    },
  );
});

test('routes action prompts but rejects explanation-only visible plan prompts', () => {
  assert.equal(shouldTreatVisibleSubagentPlanSessionPromptAsExplanation('subagent plan session이 뭔지 설명해줘'), true);
  assert.equal(shouldTreatVisibleSubagentPlanSessionPromptAsExplanation('021 데모는 무슨 기능이야?'), true);
  assert.equal(shouldRouteVisibleSubagentPlanSessionPrompt('subagent plan session이 뭔지 설명해줘'), false);
  assert.equal(shouldRouteVisibleSubagentPlanSessionPrompt('서브에이전트로 계획 세우고 실행해줘'), true);
  assert.equal(
    shouldRouteVisibleSubagentPlanSessionPrompt('Show a plan, choose subagent-driven, and run visible workers'),
    true,
  );
});
