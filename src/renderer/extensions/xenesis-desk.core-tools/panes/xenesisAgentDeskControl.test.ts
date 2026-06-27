import assert from 'node:assert/strict';
import test from 'node:test';
import {
  approveXenesisDeskActions,
  buildXenesisDeskActionCompletedMessage,
  buildXenesisDeskActionPendingMessage,
  buildXenesisDeskControlPromptHint,
  parseXenesisDeskActionBlocks,
  pendingXenesisDeskActionsFromResults,
  planXenesisDeskNaturalLanguageActions,
  runXenesisDeskActions,
  shouldRunXenesisDeskActionsDirectly,
} from './xenesisAgentDeskControl';

test('parseXenesisDeskActionBlocks extracts Desk CR actions and hides them from visible chat', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      'Open the terminal on the right.',
      '',
      '```xenesis-desk-action',
      '{"path":"xd.views.open","args":{"kind":"terminal","placement":"right","command":"Write-Output \\"ready\\"","shell":"powershell"},"reason":"Need a shell"}',
      '```',
      '',
      'Done.',
    ].join('\n'),
  );

  assert.equal(parsed.visibleText, 'Open the terminal on the right.\n\nDone.');
  assert.deepEqual(parsed.actions, [
    {
      id: 'desk-action-1',
      path: 'xd.views.open',
      args: { kind: 'terminal', placement: 'right', command: 'Write-Output "ready"', shell: 'powershell' },
      approved: false,
      reason: 'Need a shell',
    },
  ]);
  assert.deepEqual(parsed.errors, []);
});

test('parseXenesisDeskActionBlocks treats raw action JSON as a direct Desk action', () => {
  const parsed = parseXenesisDeskActionBlocks(
    '{"path":"xd.window.sizer.applyPreset","args":{"presetId":"qhd"},"approved":true}',
  );

  assert.equal(parsed.visibleText, '');
  assert.deepEqual(parsed.actions, [
    {
      id: 'desk-action-1',
      path: 'xd.window.sizer.applyPreset',
      args: { presetId: 'qhd' },
      approved: true,
    },
  ]);
  assert.deepEqual(parsed.errors, []);
});

test('parseXenesisDeskActionBlocks accepts arrays and rejects non-CR paths', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      '```xenesis-desk-actions',
      '[',
      '  {"path":"xd.window.sizer.applyPreset","args":{"preset":"QHD"}},',
      '  {"path":"shell.rm","args":{"path":"C:/"}}',
      ']',
      '```',
    ].join('\n'),
  );

  assert.equal(parsed.visibleText, '');
  assert.equal(parsed.actions.length, 1);
  assert.equal(parsed.actions[0]?.path, 'xd.window.sizer.applyPreset');
  assert.match(parsed.errors[0] || '', /must start with xd\./);
});

test('runXenesisDeskActions calls the direct CR executor in order', async () => {
  const calls: Array<{ path: string; args: unknown; approved: boolean | undefined }> = [];
  const results = await runXenesisDeskActions(
    [
      { id: 'a', path: 'xd.app.status', args: {}, approved: false },
      { id: 'b', path: 'xd.window.sizer.applyPreset', args: { presetId: 'qhd' }, approved: true },
    ],
    async (path, args, options) => {
      calls.push({ path, args, approved: options?.approved });
      return { ok: true, path, result: { path } };
    },
  );

  assert.deepEqual(calls, [
    { path: 'xd.app.status', args: {}, approved: false },
    { path: 'xd.window.sizer.applyPreset', args: { presetId: 'qhd' }, approved: true },
  ]);
  assert.equal(
    results.every((result) => result.ok),
    true,
  );
});

test('parseXenesisDeskActionBlocks accepts approved CR workflow actions', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      '```xenesis-desk-action',
      '{"path":"xd.automation.workflow.run","approved":true,"args":{"name":"settings-tour","steps":[{"path":"xd.dock.panes.list"},{"path":"xd.panes.settings.open","args":{"category":"run-model"}}]}}',
      '```',
    ].join('\n'),
  );

  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(parsed.actions, [
    {
      id: 'desk-action-1',
      path: 'xd.automation.workflow.run',
      args: {
        name: 'settings-tour',
        steps: [{ path: 'xd.dock.panes.list' }, { path: 'xd.panes.settings.open', args: { category: 'run-model' } }],
      },
      approved: true,
    },
  ]);
});

test('parseXenesisDeskActionBlocks accepts provider inline fence payloads', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      '상태를 확인하겠습니다.```xenesis-desk-action {"path":"xd.xenesis.connections.open","args":{"id":"notion","ensureVisible":true},"approved":true}',
      '',
      '노션 연결 카드를 열고 포커스했습니다.',
    ].join('\n'),
  );

  assert.equal(parsed.visibleText, '상태를 확인하겠습니다.\n\n노션 연결 카드를 열고 포커스했습니다.');
  assert.deepEqual(parsed.actions, [
    {
      id: 'desk-action-1',
      path: 'xd.xenesis.connections.open',
      args: { id: 'notion', ensureVisible: true },
      approved: true,
    },
  ]);
  assert.deepEqual(parsed.errors, []);
});

test('Desk action completion summaries include CR workflow run counts', () => {
  const completed = buildXenesisDeskActionCompletedMessage([
    {
      id: 'workflow',
      path: 'xd.automation.workflow.run',
      args: {},
      approved: true,
      ok: true,
      result: {
        name: 'settings-tour',
        completed: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
      },
    },
  ]);

  assert.match(completed, /settings-tour: 2 completed, 2 passed, 0 failed, 0 skipped/);
});

test('pendingXenesisDeskActionsFromResults preserves approval-required Desk actions', async () => {
  const actions = [
    { id: 'a', path: 'xd.views.open', args: { kind: 'terminal' }, approved: false, reason: 'Open terminal' },
    { id: 'b', path: 'xd.app.status', args: {}, approved: false },
  ];
  const results = await runXenesisDeskActions(actions, async (path) => {
    if (path === 'xd.views.open') {
      return {
        ok: false,
        path,
        error: 'Capability requires approval: xd.views.open',
        approvalRequired: true,
      };
    }
    return { ok: true, path, result: { ok: true } };
  });

  assert.deepEqual(pendingXenesisDeskActionsFromResults(actions, results), [actions[0]]);
});

test('approveXenesisDeskActions creates approved copies without mutating pending actions', () => {
  const pending = [
    { id: 'a', path: 'xd.views.open', args: { kind: 'terminal' }, approved: false, reason: 'Open terminal' },
  ];

  const approved = approveXenesisDeskActions(pending);

  assert.deepEqual(approved, [
    { id: 'a', path: 'xd.views.open', args: { kind: 'terminal' }, approved: true, reason: 'Open terminal' },
  ]);
  assert.equal(pending[0]?.approved, false);
});

test('Desk action user messages hide raw DSL behind pending and completion summaries', () => {
  const actions = [
    {
      id: 'a',
      path: 'xd.views.open',
      args: { kind: 'terminal', placement: 'right' },
      approved: false,
      reason: 'Open terminal',
    },
  ];
  const pending = buildXenesisDeskActionPendingMessage(actions, '터미널을 열려면 승인이 필요합니다.');
  const completed = buildXenesisDeskActionCompletedMessage([
    { id: 'a', path: 'xd.views.open', args: { kind: 'terminal', placement: 'right' }, approved: true, ok: true },
  ]);

  assert.match(pending, /승인이 필요합니다/);
  assert.match(pending, /xd\.views\.open/);
  assert.doesNotMatch(pending, /```xenesis-desk-action/);
  assert.match(completed, /Desk action completed/);
  assert.match(completed, /xd\.views\.open/);
});

test('Desk action completion summaries include useful read and control results', () => {
  const completed = buildXenesisDeskActionCompletedMessage([
    {
      id: 'files',
      path: 'xd.files.listOpen',
      args: {},
      approved: false,
      ok: true,
      result: {
        openFiles: [
          { title: 'README.md', filePath: 'D:\\Project\\README.md' },
          { title: 'notes.md', filePath: 'D:\\Project\\notes.md' },
        ],
      },
    },
    {
      id: 'capture',
      path: 'xd.capture.activePane',
      args: {},
      approved: false,
      ok: true,
      result: {
        filePath: 'C:\\Users\\devuser\\.xenesis-dev\\captures\\pane.png',
        width: 1280,
        height: 720,
      },
    },
    {
      id: 'size',
      path: 'xd.window.sizer.applyPreset',
      args: { presetId: 'qhd' },
      approved: false,
      ok: true,
      result: {
        bounds: { x: 0, y: 0, width: 2560, height: 1440 },
      },
    },
  ]);

  assert.match(completed, /README\.md/);
  assert.match(completed, /2 files/);
  assert.match(completed, /pane\.png/);
  assert.match(completed, /1280x720/);
  assert.match(completed, /2560x1440/);
});

test('shouldRunXenesisDeskActionsDirectly detects explicit user-provided CR action blocks', () => {
  const parsed = parseXenesisDeskActionBlocks(
    [
      'Please apply this Desk action.',
      '',
      '```xenesis-desk-action',
      '{"path":"xd.views.open","args":{"kind":"terminal","placement":"bottom","command":"Write-Output \\"ready\\"","shell":"powershell"},"approved":true}',
      '```',
    ].join('\n'),
  );

  assert.equal(shouldRunXenesisDeskActionsDirectly(parsed), true);
  assert.equal(parsed.visibleText, 'Please apply this Desk action.');
  assert.equal(parsed.actions.length, 1);
});

test('buildXenesisDeskControlPromptHint describes native CR control without external MCP dependency', () => {
  const hint = buildXenesisDeskControlPromptHint();
  assert.match(hint, /native Xenesis Desk Capability Registry/i);
  assert.match(hint, /xenesis-desk-action/);
  assert.match(hint, /xd\.views\.open/);
  assert.match(hint, /"command":"Write-Output \\"ready\\""/);
  assert.match(hint, /MUST return a `xenesis-desk-action` block/i);
  assert.match(hint, /not executing code/i);
  assert.match(hint, /file\/process sandbox does not apply/i);
  assert.doesNotMatch(hint, /requires external MCP/i);
});

test('buildXenesisDeskControlPromptHint lists real high-value CR paths and avoids stale aliases', () => {
  const hint = buildXenesisDeskControlPromptHint();

  assert.match(hint, /xd\.window\.sizer\.applyPreset/);
  assert.match(hint, /presetId/);
  assert.match(hint, /xd\.dock\.artifactTarget\.set/);
  assert.match(hint, /xd\.xenesis\.connections\.open/);
  assert.match(hint, /xd\.xenesis\.onboarding\.status/);
  assert.match(hint, /xd\.xenesis\.onboarding\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.connectors\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.userStories\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.userStories\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.installPlans\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.installPlans\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.userStories\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.userStories\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.accessGroups\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.pairing\.status/);
  assert.match(hint, /"id":"notion"/);
  assert.match(hint, /xd\.testing\.xenesisAgent\.submitPrompt/);
  assert.match(hint, /xd\.automation\.workflow\.preview/);
  assert.match(hint, /xd\.automation\.workflow\.run/);
  assert.match(hint, /Xenesis Agent should own generation through `\/artifact`/);
  assert.match(hint, /GowooriChat is fallback only/);
  assert.match(hint, /"kind":"xenesisAgent","placement":"right"/);
  assert.match(hint, /"useActive":true/);
  assert.match(hint, /ordered multi-step Desk control/i);
  assert.match(hint, /do not refuse/i);
  assert.match(hint, /runtime is read-only/i);
  assert.match(hint, /Capability Registry will enforce/i);

  assert.doesNotMatch(hint, /xd\.gowoori\.open/);
  assert.doesNotMatch(hint, /xd\.terminals\.spawn/);
  assert.match(hint, /xd\.dock\.panes\.list/);
});

test('planXenesisDeskNaturalLanguageActions maps common Korean Desk control requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('설정 열어줘').actions, [
    {
      id: 'natural-settings-open',
      path: 'xd.panes.settings.open',
      args: { placement: 'tab' },
      approved: false,
      reason: 'Open settings from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('오른쪽에 거울이 챗 열어줘').actions, [
    {
      id: 'natural-gowoori-chat-open',
      path: 'xd.views.open',
      args: { kind: 'gowooriChat', placement: 'right' },
      approved: false,
      reason: 'Open GowooriChat from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('현재 패인을 캡쳐해줘').actions, [
    {
      id: 'natural-capture-active-pane',
      path: 'xd.capture.activePane',
      args: {},
      approved: false,
      reason: 'Capture the active pane from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions covers read, layout, and window-size requests', () => {
  assert.equal(planXenesisDeskNaturalLanguageActions('열린 파일 목록 보여줘').actions[0]?.path, 'xd.files.listOpen');
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('창 크기를 QHD로 바꿔줘').actions[0]?.args, {
    presetId: 'qhd',
  });
  assert.equal(
    planXenesisDeskNaturalLanguageActions('현재 그룹을 바둑판 정렬해줘').actions[0]?.path,
    'xd.dock.arrangeGrid',
  );
});

test('planXenesisDeskNaturalLanguageActions maps terminal execution requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('터미널 목록 보여줘').actions, [
    {
      id: 'natural-terminals-list',
      path: 'xd.terminals.list',
      args: {},
      approved: false,
      reason: 'List terminals from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('터미널 10개 띄우고 바둑판 정렬해줘').actions, [
    {
      id: 'natural-terminal-run-many',
      path: 'xd.terminals.runMany',
      args: {
        count: 10,
        shell: 'powershell',
        command: 'Write-Host Xenesis-Desk-terminal',
        idPrefix: 'xenesis-agent-natural',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open multiple terminals from natural language request.',
    },
    {
      id: 'natural-dock-window-arrange',
      path: 'xd.dock.window.arrange',
      args: { windowState: 'document', mode: 'grid' },
      approved: false,
      reason: 'Arrange a Desk window area from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('터미널에서 npm test 실행해줘').actions, [
    {
      id: 'natural-terminal-run',
      path: 'xd.terminals.run',
      args: { command: 'npm test', shell: 'powershell', placement: 'tab' },
      approved: false,
      reason: 'Run terminal command from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps active-pane and scoped dock requests', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('오른쪽 패인 폭을 720으로 바꿔줘').actions, [
    {
      id: 'natural-dock-size-set',
      path: 'xd.dock.sizes.set',
      args: { right: 720 },
      approved: false,
      reason: 'Resize a dock side from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('현재 패인에 포커스 해줘').actions, [
    {
      id: 'natural-dock-focus-active',
      path: 'xd.dock.focus',
      args: { useActive: true },
      approved: false,
      reason: 'Focus the active dock content from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('현재 탭 닫아줘').actions, [
    {
      id: 'natural-dock-close-active',
      path: 'xd.dock.close',
      args: { useActive: true },
      approved: false,
      reason: 'Close the active dock content from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('문서 영역을 바둑판 정렬해줘').actions, [
    {
      id: 'natural-dock-window-arrange',
      path: 'xd.dock.window.arrange',
      args: { windowState: 'document', mode: 'grid' },
      approved: false,
      reason: 'Arrange a Desk window area from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('현재 패인을 세로 정렬해줘').actions, [
    {
      id: 'natural-dock-pane-arrange',
      path: 'xd.dock.pane.arrange',
      args: { useActive: true, mode: 'column' },
      approved: false,
      reason: 'Arrange the active dock pane from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('문서 영역 탭을 다시 합쳐줘').actions, [
    {
      id: 'natural-dock-window-merge',
      path: 'xd.dock.window.merge',
      args: { windowState: 'document' },
      approved: false,
      reason: 'Merge a Desk window area from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps tools and explorer filter requests', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('네트워크 모니터를 오른쪽에 열어줘').actions, [
    {
      id: 'natural-tool-network-monitor-open',
      path: 'xd.tools.core.networkMonitor.open',
      args: { placement: 'right' },
      approved: false,
      reason: 'Open Network Monitor from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('작업 실행 패널 열어줘').actions, [
    {
      id: 'natural-tool-run-task-panel-open',
      path: 'xd.tools.core.runTaskPanel.open',
      args: { placement: 'tab' },
      approved: false,
      reason: 'Open Run Task Panel from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('탐색기에서 src 필터 걸어줘').actions, [
    {
      id: 'natural-explorer-filter',
      path: 'xd.explorer.local.setFilter',
      args: { query: 'src' },
      approved: false,
      reason: 'Filter explorer from natural language request.',
    },
  ]);
});

test('buildXenesisDeskControlPromptHint describes settings files capture and layout control', () => {
  const hint = buildXenesisDeskControlPromptHint();

  assert.match(hint, /xd\.panes\.settings\.open/);
  assert.match(hint, /xd\.files\.listOpen/);
  assert.match(hint, /xd\.files\.open/);
  assert.match(hint, /xd\.capture\.activePane/);
  assert.match(hint, /xd\.dock\.arrangeGrid/);
  assert.match(hint, /xd\.tools\.core\.capabilityExplorer\.open/);
  assert.match(hint, /xd\.terminals\.runMany/);
  assert.match(hint, /xd\.dock\.sizes\.set/);
  assert.match(hint, /xd\.dock\.window\.arrange/);
  assert.match(hint, /xd\.dock\.pane\.arrange/);
  assert.match(hint, /xd\.tools\.core\.networkMonitor\.open/);
});
