import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildXenesisControlDemoWorkArgs,
  buildXenesisVisibleSubagentsDemoWorkers,
  buildXenesisVisibleSubagentTerminalArgs,
  buildXenesisVisibleSubagentWorkWorkers,
  parseXenesisVisibleSubagentRunOptions,
  resolveXenesisVisibleSubagentWorkCwd,
  selectXenesisVisibleSubagentSessionIds,
  summarizeXenesisVisibleSubagentTail,
} from './xenesisAgentVisibleSubagentsDemo';

test('visible subagent helpers do not classify natural prompt text', () => {
  const source = readFileSync(new URL('./xenesisAgentVisibleSubagentsDemo.ts', import.meta.url), 'utf8');
  const paneSource = readFileSync(new URL('./XenesisAgentPane.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /shouldRouteXenesisInputToVisibleSubagentsDemo/);
  assert.doesNotMatch(source, /shouldRouteXenesisInputToVisibleSubagentWork/);
  assert.doesNotMatch(source, /shouldRouteXenesisInputToControlDemoSuite/);
  assert.doesNotMatch(source, /buildXenesisVisibleSubagentsDemoArgsFromInput/);
  assert.doesNotMatch(source, /buildXenesisVisibleSubagentWorkArgsFromInput/);
  assert.doesNotMatch(source, /buildXenesisControlDemoWorkArgsFromInput/);
  assert.doesNotMatch(source, /hasAnyTerm|hasKeepOpenIntent|hasControlDemoExecutionIntent/);
  assert.doesNotMatch(source, /hasControlDemoExplanationIntent|stripKoreanVisibleSubagentPrefix/);
  assert.doesNotMatch(paneSource, /shouldRouteXenesisInputToVisibleSubagents/);
  assert.doesNotMatch(paneSource, /buildXenesisControlDemoWorkArgsFromInput/);
});

test('Xenesis Agent exposes visible subagent plan sessions without GowooriChat control', () => {
  const paneSource = readFileSync(new URL('./XenesisAgentPane.tsx', import.meta.url), 'utf8');

  assert.match(paneSource, /subagents-plan/);
  assert.match(paneSource, /runVisibleSubagentPlanSession/);
  assert.match(paneSource, /formatVisibleSubagentPlanSessionForAgent/);
  assert.match(paneSource, /formatVisibleSubagentPlanSessionForTerminal/);
  assert.doesNotMatch(paneSource, /runGowooriChat.*subagents-plan/);
});

test('builds four visible subagent demo workers with stable markers', () => {
  const workers = buildXenesisVisibleSubagentsDemoWorkers({
    runId: 'demo-run',
    sleepSeconds: 7,
  });

  assert.equal(workers.length, 4);
  assert.deepEqual(
    workers.map((worker) => worker.id),
    ['demo-run-s1', 'demo-run-s2', 'demo-run-s3', 'demo-run-s4'],
  );
  assert.deepEqual(
    workers.map((worker) => worker.title),
    [
      'Subagent 1 - Repository Scanner',
      'Subagent 2 - Typecheck Watcher',
      'Subagent 3 - Demo Auditor',
      'Subagent 4 - Release Notes',
    ],
  );
  assert.ok(workers.every((worker) => worker.marker.includes(worker.id)));
  assert.ok(workers.every((worker) => worker.command.includes('Start-Sleep -Seconds 7')));
});

test('builds CR terminal arguments that identify Xenesis-owned visible subagents', () => {
  const [worker] = buildXenesisVisibleSubagentsDemoWorkers({
    runId: 'demo-run',
    sleepSeconds: 11,
  });

  const args = buildXenesisVisibleSubagentTerminalArgs(worker, {
    cwd: 'D:\\Workspace\\desk',
    shell: 'powershell',
    parentTermId: 'xenesis-agent-default',
  });

  assert.equal(args.id, 'demo-run-s1');
  assert.equal(args.title, 'Subagent 1 - Repository Scanner');
  assert.equal(args.command, worker.command);
  assert.equal(args.cwd, 'D:\\Workspace\\desk');
  assert.equal(args.shell, 'powershell');
  assert.equal(args.placement, 'tab');
  assert.deepEqual(args.metadata, {
    kind: 'xenesis-desk-subagent',
    subagentId: 'demo-run-s1',
    agent: 'xenesis',
    parentTermId: 'xenesis-agent-default',
    task: 'Repository Scanner',
    demo: 'visible-subagents',
  });
});

test('summarizes visible subagent tail output without ansi noise or command echo', () => {
  const [worker] = buildXenesisVisibleSubagentsDemoWorkers({
    runId: 'demo-run',
    sleepSeconds: 7,
  });
  const summary = summarizeXenesisVisibleSubagentTail(worker, {
    result: {
      tail: [
        "\u001b[92m$ErrorActionPreference = 'Stop'; Write-Host 'noise'\u001b[m",
        'Subagent 1 - Repository Scanner started',
        'Task: Repository Scanner',
        'Inspect package metadata and project entry points.',
        'Check README, package.json, and src layout.',
        'XENESIS_SUBAGENT_READY demo-run-s1',
        'PS C:\\Workspace>',
      ].join('\n'),
    },
  });

  assert.equal(summary.markerFound, true);
  assert.equal(summary.id, 'demo-run-s1');
  assert.equal(
    summary.summary,
    'Subagent 1 - Repository Scanner started; Task: Repository Scanner; Inspect package metadata and project entry points.; Check README, package.json, and src layout.',
  );
});

test('uses declared worker output when terminal wrapping splits tail text', () => {
  const [worker] = buildXenesisVisibleSubagentsDemoWorkers({
    runId: 'demo-run',
    sleepSeconds: 7,
  });
  const summary = summarizeXenesisVisibleSubagentTail(worker, {
    result: {
      tail: [
        'Subagent 1 - Repository Scanner started',
        'Task: Repository Scanner',
        'Inspect package metadata and project ent',
        'try points.',
        'XENESIS_SUBAGENT_READY demo-run-s1',
      ].join('\n'),
    },
  });

  assert.equal(
    summary.summary,
    'Subagent 1 - Repository Scanner started; Task: Repository Scanner; Inspect package metadata and project entry points.; Check README, package.json, and src layout.',
  );
});

test('builds four actual work subagents from a user task', () => {
  const workers = buildXenesisVisibleSubagentWorkWorkers('현재 프로젝트 상태를 분석하고 검증해줘', {
    runId: 'work-run',
    sleepSeconds: 9,
  });

  assert.equal(workers.length, 4);
  assert.deepEqual(
    workers.map((worker) => worker.id),
    ['work-run-w1', 'work-run-w2', 'work-run-w3', 'work-run-w4'],
  );
  assert.deepEqual(
    workers.map((worker) => worker.title),
    [
      'Subagent 1 - Project Scan',
      'Subagent 2 - Change Audit',
      'Subagent 3 - Verification Runner',
      'Subagent 4 - Handoff Summary',
    ],
  );
  assert.ok(workers.every((worker) => worker.marker.includes('XENESIS_WORK_SUBAGENT_DONE')));
  assert.ok(workers.every((worker) => worker.command.includes('현재 프로젝트 상태를 분석하고 검증해줘')));
  assert.ok(workers[2].command.includes('npm run typecheck'));
  assert.ok(workers.every((worker) => worker.command.includes('Start-Sleep -Seconds 9')));
});

test('compacts very long work task text before embedding it into terminal commands', () => {
  const longTask = `현재 프로젝트 상태를 분석해줘 ${'x'.repeat(480)} 끝`;
  const [worker] = buildXenesisVisibleSubagentWorkWorkers(longTask, {
    runId: 'work-run',
    sleepSeconds: 9,
  });

  assert.equal(worker.command.includes(longTask), false);
  assert.match(worker.command, /User task: 현재 프로젝트 상태를 분석해줘 x+/);
  assert.match(worker.command, /\.\.\./);
});

test('uses a bounded git status scan for the change-audit work subagent', () => {
  const workers = buildXenesisVisibleSubagentWorkWorkers('현재 프로젝트 상태 확인', {
    runId: 'work-run',
    sleepSeconds: 7,
  });
  const changeAudit = workers[1];

  assert.ok(changeAudit.command.includes('git status --short --untracked-files=no'));
  assert.equal(changeAudit.command.includes('git diff --stat'), false);
});

test('builds control demo work args from explicit slash options only', () => {
  assert.equal(
    buildXenesisControlDemoWorkArgs('--show-ms 500 --keep-open'),
    [
      'Xenesis Desk control demo:',
      'use Capability Registry to open four visible work subagents, inspect project status, typecheck, docs, and summarize.',
      'No Gowoori primary control.',
      '--show-ms 500',
      '--keep-open',
    ].join(' '),
  );
  assert.equal(
    buildXenesisControlDemoWorkArgs('제니스가 Desk를 제어하는 데모를 보여줘'),
    [
      'Xenesis Desk control demo:',
      'use Capability Registry to open four visible work subagents, inspect project status, typecheck, docs, and summarize.',
      'No Gowoori primary control.',
      '--show-ms 6000',
      '--close-after',
    ].join(' '),
  );
});

test('parses shared visible subagent runner options and strips them from work task text', () => {
  assert.deepEqual(
    parseXenesisVisibleSubagentRunOptions('현재 프로젝트 상태를 점검해줘 --show-ms=5000 --sleep=2 --close-after', {
      defaultTask: 'fallback task',
    }),
    {
      keepOpen: false,
      closeAfter: true,
      showMs: 5000,
      sleepSeconds: 2,
      taskInput: '현재 프로젝트 상태를 점검해줘',
    },
  );
  assert.deepEqual(
    parseXenesisVisibleSubagentRunOptions('--show-ms 120000 --sleep-sec 7 --keep-open', {
      defaultTask: 'fallback task',
    }),
    {
      keepOpen: true,
      closeAfter: false,
      showMs: 60000,
      sleepSeconds: 7,
      taskInput: 'fallback task',
    },
  );
  assert.deepEqual(parseXenesisVisibleSubagentRunOptions('keep-open show-ms 500 sleep 9 작업 유지'), {
    keepOpen: false,
    closeAfter: false,
    showMs: 6000,
    sleepSeconds: 45,
    taskInput: 'keep-open show-ms 500 sleep 9 작업 유지',
  });
});

test('summarizes actual work tail output using real result lines', () => {
  const [worker] = buildXenesisVisibleSubagentWorkWorkers('현재 프로젝트 상태 확인', {
    runId: 'work-run',
    sleepSeconds: 7,
  });
  const summary = summarizeXenesisVisibleSubagentTail(worker, {
    result: {
      tail: [
        'Subagent 1 - Project Scan started',
        'Workspace root scanned.',
        'package.json detected.',
        'XENESIS_WORK_SUBAGENT_DONE work-run-w1',
      ].join('\n'),
    },
  });

  assert.equal(summary.markerFound, true);
  assert.equal(summary.summary, 'Subagent 1 - Project Scan started; Workspace root scanned.; package.json detected.');
});

test('prioritizes work command evidence over work request boilerplate', () => {
  const [worker] = buildXenesisVisibleSubagentWorkWorkers('현재 프로젝트 상태 확인', {
    runId: 'work-run',
    sleepSeconds: 7,
  });
  const summary = summarizeXenesisVisibleSubagentTail(worker, {
    result: {
      tail: [
        'Subagent 1 - Project Scan started',
        'User task: 현재 프로젝트 상태 확인',
        'Role: Project Scan',
        'Inspect workspace root, package metadata, README, and source layout.',
        'Report project structure signals for the parent Xenesis Agent.',
        'Workspace root scanned.',
        'package.json detected.',
        'package: xenesis-desk',
        'version: 0.1.0-alpha.1',
        'XENESIS_WORK_SUBAGENT_DONE work-run-w1',
      ].join('\n'),
    },
  });

  assert.equal(
    summary.summary,
    'Subagent 1 - Project Scan started; Workspace root scanned.; package.json detected.; package: xenesis-desk',
  );
});

test('prioritizes verification exit code in work summaries', () => {
  const worker = buildXenesisVisibleSubagentWorkWorkers('현재 프로젝트 상태 확인', {
    runId: 'work-run',
    sleepSeconds: 7,
  })[2];
  const summary = summarizeXenesisVisibleSubagentTail(worker, {
    result: {
      tail: [
        'Subagent 3 - Verification Runner started',
        'User task: 현재 프로젝트 상태 확인',
        'Role: Verification Runner',
        'Typecheck started.',
        '> xenesis-desk@0.1.0-alpha.1 typecheck',
        '> tsc --noEmit -p tsconfig.json',
        'Typecheck exit code: 0',
        'Typecheck command complete.',
        'XENESIS_WORK_SUBAGENT_DONE work-run-w3',
      ].join('\n'),
    },
  });

  assert.match(summary.summary, /Typecheck exit code: 0/);
});

test('falls back to declared work evidence when tail is unreadable after marker', () => {
  const [worker] = buildXenesisVisibleSubagentWorkWorkers('현재 프로젝트 상태 확인', {
    runId: 'work-run',
    sleepSeconds: 7,
  });
  const summary = summarizeXenesisVisibleSubagentTail(worker, {
    result: {
      tail: 'XENESIS_WORK_SUBAGENT_DONE work-run-w1',
    },
  });

  assert.equal(summary.markerFound, true);
  assert.equal(
    summary.summary,
    'Subagent 1 - Project Scan started; Workspace root scanned.; package.json detected.; package.json missing.',
  );
});

test('does not treat echoed PowerShell command text as a completed subagent marker', () => {
  const [worker] = buildXenesisVisibleSubagentWorkWorkers('현재 프로젝트 상태 확인', {
    runId: 'work-run',
    sleepSeconds: 7,
  });
  const summary = summarizeXenesisVisibleSubagentTail(worker, {
    result: {
      tail: [
        "$ErrorActionPreference = 'Continue'; Write-Host 'Subagent 1 - Project Scan started'; Write-Host 'XENESIS_WORK_SUBAGENT_DONE work-run-w1'",
        'Workspace root scanned.',
      ].join('\n'),
    },
  });

  assert.equal(summary.markerFound, false);
  assert.equal(summary.summary, 'Workspace root scanned.');
});

test('recognizes completed marker lines with terminal wrap prefix noise', () => {
  const worker = buildXenesisVisibleSubagentWorkWorkers('현재 프로젝트 상태 확인', {
    runId: 'work-run',
    sleepSeconds: 7,
  })[2];
  const summary = summarizeXenesisVisibleSubagentTail(worker, {
    result: {
      tail: [
        'Subagent 3 - Verification Runner started',
        'Typecheck exit code: 0',
        '\\XENESIS_WORK_SUBAGENT_DONE work-run-w3',
      ].join('\n'),
    },
  });

  assert.equal(summary.markerFound, true);
  assert.match(summary.summary, /Typecheck exit code: 0/);
});

test('selects only visible Xenesis subagent sessions for cleanup', () => {
  assert.deepEqual(
    selectXenesisVisibleSubagentSessionIds([
      { id: 'xv-demo-s1' },
      { id: 'xw-work-w1' },
      { id: 'normal-terminal' },
      { id: 'custom-worker', metadata: { kind: 'xenesis-desk-subagent' } },
      { id: 'vp-demo-plan', metadata: { kind: 'xenesis-desk-subagent-plan' } },
      { id: '' },
    ]),
    ['xv-demo-s1', 'xw-work-w1', 'custom-worker', 'vp-demo-plan'],
  );
});

test('resolves work cwd from Desk bridge repo when runtime workspace is onboarding', () => {
  assert.equal(
    resolveXenesisVisibleSubagentWorkCwd('C:\\Users\\devuser\\.xenis-dev\\onboarding\\basic-desk', {
      result: {
        bridge: {
          serverPath: 'D:\\Workspace\\xenesis-desk\\mcp\\xenesis-desk-mcp-server.mjs',
        },
      },
    }),
    'D:\\Workspace\\xenesis-desk',
  );
});

test('prefers renderer workspace path over onboarding runtime workspace and bridge fallback', () => {
  assert.equal(
    resolveXenesisVisibleSubagentWorkCwd('C:\\Users\\devuser\\.xenis-dev\\onboarding\\basic-desk', {
      result: {
        rendererState: {
          workspace: {
            currentPath: 'D:\\Workspace\\xenesis-desk',
          },
        },
        bridge: {
          serverPath: 'D:\\Other\\xenesis-desk\\mcp\\xenesis-desk-mcp-server.mjs',
        },
      },
    }),
    'D:\\Workspace\\xenesis-desk',
  );
});

test('keeps explicit non-onboarding runtime workspace as work cwd', () => {
  assert.equal(
    resolveXenesisVisibleSubagentWorkCwd('D:\\Workspace\\xenesis-desk', {
      result: {
        bridge: {
          serverPath: 'D:\\Other\\xenesis-desk\\mcp\\xenesis-desk-mcp-server.mjs',
        },
      },
    }),
    'D:\\Workspace\\xenesis-desk',
  );
});
