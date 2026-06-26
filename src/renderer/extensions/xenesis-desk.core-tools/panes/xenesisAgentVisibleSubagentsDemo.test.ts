import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildXenesisControlDemoWorkArgsFromInput,
  buildXenesisVisibleSubagentsDemoArgsFromInput,
  buildXenesisVisibleSubagentsDemoWorkers,
  buildXenesisVisibleSubagentTerminalArgs,
  buildXenesisVisibleSubagentWorkArgsFromInput,
  buildXenesisVisibleSubagentWorkWorkers,
  parseXenesisVisibleSubagentRunOptions,
  resolveXenesisVisibleSubagentWorkCwd,
  selectXenesisVisibleSubagentSessionIds,
  shouldRouteXenesisInputToControlDemoSuite,
  shouldRouteXenesisInputToVisibleSubagentsDemo,
  shouldRouteXenesisInputToVisibleSubagentWork,
  summarizeXenesisVisibleSubagentTail,
} from './xenesisAgentVisibleSubagentsDemo';

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

test('routes natural visible subagent orchestration requests but not explanation requests', () => {
  assert.equal(
    shouldRouteXenesisInputToVisibleSubagentsDemo('서브에이전트 4개를 서로 다른 터미널에 띄우고 바둑판으로 보여줘'),
    true,
  );
  assert.equal(
    shouldRouteXenesisInputToVisibleSubagentsDemo('Show four visible Xenesis subagents in a terminal grid.'),
    true,
  );
  assert.equal(shouldRouteXenesisInputToVisibleSubagentsDemo('subagent bridge 문서가 무슨 기능인지 설명해줘'), false);
});

test('converts natural visible subagent requests into stable demo command arguments', () => {
  assert.equal(
    buildXenesisVisibleSubagentsDemoArgsFromInput('서브에이전트 4개를 3초 동안 보여주고 계속 열어둬'),
    '--show-ms 3000 --keep-open',
  );
  assert.equal(
    buildXenesisVisibleSubagentsDemoArgsFromInput('show visible subagents and close after cleanup'),
    '--show-ms 6000 --close-after',
  );
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

test('uses a compact control demo task suitable for visible terminal echo', () => {
  const args = buildXenesisControlDemoWorkArgsFromInput('');
  const taskText = args.split(' --show-ms ')[0] || '';

  assert.ok(taskText.length <= 220);
  assert.match(taskText, /Xenesis Desk control demo/);
  assert.match(taskText, /Capability Registry/);
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

test('routes task-oriented visible subagent requests to work mode', () => {
  assert.equal(
    shouldRouteXenesisInputToVisibleSubagentWork('서브에이전트 4개로 현재 프로젝트 상태를 분석하고 결과를 요약해줘'),
    true,
  );
  assert.equal(
    shouldRouteXenesisInputToVisibleSubagentWork('Use four visible subagents to check the release readiness.'),
    true,
  );
  assert.equal(shouldRouteXenesisInputToVisibleSubagentWork('서브에이전트 4개를 터미널에 띄우는 데모를 보여줘'), false);
});

test('converts work requests into stable work command arguments', () => {
  assert.equal(
    buildXenesisVisibleSubagentWorkArgsFromInput(
      '서브에이전트 4개로 현재 프로젝트 상태를 분석하고 5초 보여준 뒤 정리해',
    ),
    '현재 프로젝트 상태를 분석하고 5초 보여준 뒤 정리해 --show-ms 5000 --close-after',
  );
  assert.equal(
    buildXenesisVisibleSubagentWorkArgsFromInput('Use visible subagents to check release readiness and keep open'),
    'Use visible subagents to check release readiness and keep open --show-ms 6000 --keep-open',
  );
  assert.equal(
    buildXenesisVisibleSubagentWorkArgsFromInput(
      'Use visible subagents to check release readiness. Keep the worker terminals open after completion.',
    ),
    'Use visible subagents to check release readiness. Keep the worker terminals open after completion. --show-ms 6000 --keep-open',
  );
});

test('routes Xenesis Desk control demo requests to visible work subagents', () => {
  assert.equal(shouldRouteXenesisInputToControlDemoSuite('제니스가 Desk를 제어하는 데모를 보여줘'), true);
  assert.equal(shouldRouteXenesisInputToControlDemoSuite('Run the Xenesis Desk control demo and keep it open.'), true);
  assert.equal(shouldRouteXenesisInputToControlDemoSuite('제니스 Desk 제어 기능이 뭔지 설명해줘'), false);
});

test('converts control demo requests into a stable work-subagents command', () => {
  const args = buildXenesisControlDemoWorkArgsFromInput('제니스가 Desk를 제어하는 데모를 4초 보여주고 정리해');

  assert.match(args, /Xenesis Desk control demo/);
  assert.match(args, /Capability Registry/);
  assert.match(args, /--show-ms 4000/);
  assert.match(args, /--close-after/);
  assert.equal(args.includes('--keep-open'), false);
});

test('control demo defaults to cleanup unless the user asks to keep workers open', () => {
  assert.match(buildXenesisControlDemoWorkArgsFromInput(''), /--close-after/);
  assert.match(buildXenesisControlDemoWorkArgsFromInput('keep open'), /--keep-open/);
  assert.equal(buildXenesisControlDemoWorkArgsFromInput('keep open').includes('--close-after'), false);
});

test('control demo preserves explicit slash-style timing and cleanup options', () => {
  const args = buildXenesisControlDemoWorkArgsFromInput('--show-ms 500 --close-after');

  assert.match(args, /--show-ms 500/);
  assert.match(args, /--close-after/);
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
      { id: '' },
    ]),
    ['xv-demo-s1', 'xw-work-w1', 'custom-worker'],
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
