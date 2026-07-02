import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildVisibleSubagentPlanLiveSmokePrompt,
  buildVisibleSubagentPlanLiveSmokeReport,
  buildVisibleSubagentPlanSubmitRequest,
  formatVisibleSubagentPlanLiveSmokePlan,
  parseVisibleSubagentPlanLiveSmokeCliArgs,
  VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_APP_READY_SELECTOR,
  VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_OPEN_REQUEST,
  VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SOURCE,
  VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SUBMIT_PATH,
} from './xenesisVisibleSubagentPlanSessionLiveSmoke.mjs';

test('visible subagent plan live smoke describes Agent slash execution through CR testing', () => {
  assert.equal(VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SOURCE, 'xenesis-visible-subagent-plan-live-smoke');
  assert.equal(VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_SUBMIT_PATH, 'xd.testing.xenesisAgent.submitPrompt');
  assert.equal(VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_APP_READY_SELECTOR, '.btn-settings');

  assert.deepEqual(VISIBLE_SUBAGENT_PLAN_LIVE_SMOKE_OPEN_REQUEST, {
    path: 'xd.tools.core.xenesisAgent.open',
    source: 'xenesis-visible-subagent-plan-live-smoke',
    approved: true,
    args: {
      placement: 'tab',
    },
  });

  const plan = formatVisibleSubagentPlanLiveSmokePlan();
  assert.match(plan, /\/subagents-plan/);
  assert.match(plan, /--manual/);
  assert.match(plan, /xd\.testing\.xenesisAgent\.submitPrompt/);
  assert.match(plan, /Visible Subagent Plan Session/);
  assert.doesNotMatch(plan, /GowooriChat/i);
});

test('visible subagent plan live smoke builds bounded slash prompts from flags', () => {
  assert.equal(
    buildVisibleSubagentPlanLiveSmokePrompt({
      task: '현재 변경사항을 분담해서 점검해줘',
      manual: true,
      keepOpen: true,
      closeAfter: true,
      showMs: 3000,
      sleepSeconds: 2,
    }),
    '/subagents-plan 현재 변경사항을 분담해서 점검해줘 --manual --show-ms 3000 --sleep 2 --keep-open',
  );

  assert.equal(
    buildVisibleSubagentPlanLiveSmokePrompt({
      task: '검증 계획을 보여줘',
      manual: false,
      keepOpen: false,
      closeAfter: true,
      showMs: 120000,
      sleepSeconds: 0,
    }),
    '/subagents-plan 검증 계획을 보여줘 --show-ms 60000 --sleep 1 --close-after',
  );
});

test('visible subagent plan live smoke submit request targets the Agent pane testing path', () => {
  assert.deepEqual(buildVisibleSubagentPlanSubmitRequest('/subagents-plan 테스트 --manual', 42000), {
    path: 'xd.testing.xenesisAgent.submitPrompt',
    source: 'xenesis-visible-subagent-plan-live-smoke',
    approved: true,
    args: {
      prompt: '/subagents-plan 테스트 --manual',
      expectedText: 'Visible Subagent Plan Session',
      expectedTextScope: 'anywhere',
      timeoutMs: 42000,
    },
  });
});

test('visible subagent plan live smoke CLI parser exposes dry-run and manual plan options', () => {
  assert.deepEqual(
    parseVisibleSubagentPlanLiveSmokeCliArgs([
      '--dry-run',
      '--json',
      '--task=현재 상태',
      '--show-ms=3000',
      '--sleep=2',
      '--keep-open',
      '--close-after',
      '--right-width=900',
      '--timeout-ms=1000',
    ]),
    {
      dryRun: true,
      json: true,
      manual: true,
      keepOpen: true,
      closeAfter: true,
      task: '현재 상태',
      showMs: 3000,
      sleepSeconds: 2,
      rightWidth: 900,
      timeoutMs: 1000,
    },
  );
});

test('visible subagent plan live smoke report summarizes checks without trusting overrides', () => {
  const report = buildVisibleSubagentPlanLiveSmokeReport(
    [
      { id: 'agent-open', ok: true },
      { id: 'plan-submit', ok: false, error: 'missing visible plan' },
    ],
    new Date('2026-06-27T00:00:00.000Z'),
    {
      ok: true,
      createdAt: '1999-01-01T00:00:00.000Z',
      summary: { total: 1, passed: 1, failed: 0 },
    },
  );

  assert.equal(report.ok, false);
  assert.equal(report.createdAt, '2026-06-27T00:00:00.000Z');
  assert.deepEqual(report.summary, { total: 2, passed: 1, failed: 1 });
  assert.equal(report.checks[1].error, 'missing visible plan');
});

test('visible subagent plan live smoke avoids release MCP bridge dependencies', () => {
  const source = readFileSync('scripts/xenesisVisibleSubagentPlanSessionLiveSmoke.mjs', 'utf8');

  assert.match(source, /_electron\.launch/);
  assert.doesNotMatch(source, /\.xenis\/mcp\/bridge\.json/);
  assert.doesNotMatch(source, /XENESIS_DESK_MCP/);
  assert.doesNotMatch(source, /runGowooriChat/);
});

test('visible subagent plan live smoke package script is exposed explicitly', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

  assert.equal(
    packageJson.scripts['smoke:xenesis:visible-subagent-plan'],
    'node ./scripts/xenesisVisibleSubagentPlanSessionLiveSmoke.mjs',
  );
});
