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
  assert.match(hint, /xd\.xenesis\.connections\.status/);
  assert.match(hint, /xd\.xenesis\.connections\.diagnostics\.status/);
  assert.match(hint, /xd\.xenesis\.connections\.diagnostics\.open/);
  assert.match(hint, /xd\.xenesis\.connections\.setupRequests\.status/);
  assert.match(hint, /xd\.xenesis\.connections\.setupRequests\.open/);
  assert.match(hint, /xd\.xenesis\.connections\.setupRequests\.request/);
  assert.match(hint, /xd\.xenesis\.onboarding\.status/);
  assert.match(hint, /xd\.xenesis\.onboarding\.open/);
  assert.match(hint, /xd\.xenesis\.guides\.status/);
  assert.match(hint, /xd\.xenesis\.guides\.open/);
  assert.match(hint, /xd\.xenesis\.providers\.setup\.status/);
  assert.match(hint, /xd\.xenesis\.providers\.routing\.status/);
  assert.match(hint, /xd\.xenesis\.providers\.views\.status/);
  assert.match(hint, /xd\.xenesis\.providers\.views\.open/);
  assert.match(hint, /xd\.localCli\.scan/);
  assert.match(hint, /xd\.mcp\.settings\.status/);
  assert.match(hint, /xd\.mcp\.bridge\.status/);
  assert.match(hint, /xd\.xenesis\.gateway\.status/);
  assert.match(hint, /xd\.xenesis\.gateway\.openDashboard/);
  assert.match(hint, /xd\.xenesis\.workspace\.set/);
  assert.match(hint, /xd\.xenesis\.diagnostics/);
  assert.match(hint, /xd\.xenesis\.reports\.list/);
  assert.match(hint, /xd\.xenesis\.tasks\.list/);
  assert.match(hint, /xd\.xenesis\.agents\.list/);
  assert.match(hint, /xd\.xenesis\.agents\.status/);
  assert.match(hint, /xd\.xenesis\.agents\.events/);
  assert.match(hint, /xd\.xenesis\.agents\.submit/);
  assert.match(hint, /xd\.xenesis\.profiles\.list/);
  assert.match(hint, /xd\.xenesis\.runs\.cancel/);
  assert.match(hint, /xd\.xenesis\.sessions\.reset/);
  assert.match(hint, /xd\.xenesis\.tools\.setup\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.connectors\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.views\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.views\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.userStories\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.userStories\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.installPlans\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.installPlans\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.mcpInstallDrafts\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.mcpInstallDrafts\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.mcpInstallDrafts\.request/);
  assert.match(hint, /xd\.xenesis\.tools\.oauthDrafts\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.oauthDrafts\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.oauthDrafts\.request/);
  assert.match(hint, /xd\.xenesis\.tools\.actions\.status/);
  assert.match(hint, /xd\.xenesis\.tools\.actions\.open/);
  assert.match(hint, /xd\.xenesis\.tools\.actions\.request/);
  assert.match(hint, /xd\.xenesis\.providers\.profileDrafts\.status/);
  assert.match(hint, /xd\.xenesis\.providers\.profileDrafts\.open/);
  assert.match(hint, /xd\.xenesis\.providers\.profileDrafts\.request/);
  assert.match(hint, /xd\.xenesis\.channels\.userStories\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.userStories\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.profileDrafts\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.profileDrafts\.open/);
  assert.match(hint, /xd\.xenesis\.channels\.profileDrafts\.request/);
  assert.match(hint, /xd\.xenesis\.channels\.accessGroups\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.pairing\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.routing\.status/);
  assert.match(hint, /xd\.xenesis\.channels\.safety\.status/);
  assert.match(hint, /xd\.xenesis\.messengers\.views\.status/);
  assert.match(hint, /xd\.xenesis\.messengers\.views\.open/);
  assert.match(hint, /tool action catalogs are review-only/i);
  assert.match(hint, /tool OAuth drafts are review-only/i);
  assert.match(hint, /do not complete OAuth/i);
  assert.match(hint, /store tokens/i);
  assert.match(hint, /write MCP config/i);
  assert.match(hint, /execute provider tools/i);
  assert.match(hint, /send email/i);
  assert.match(hint, /mutate documents/i);
  assert.match(hint, /mutate calendar events/i);
  assert.match(hint, /provider profile drafts are review-only/i);
  assert.match(hint, /do not mutate provider settings/i);
  assert.match(hint, /store credentials/i);
  assert.match(hint, /switch local CLI/i);
  assert.match(hint, /run provider prompts/i);
  assert.match(hint, /channel profile drafts are review-only/i);
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
  assert.match(hint, /quoted Agent pane message/i);
  assert.match(hint, /quoted prompt/i);
  assert.match(hint, /gateway, workspace, and active-run status/i);

  assert.doesNotMatch(hint, /xd\.gowoori\.open/);
  assert.doesNotMatch(hint, /xd\.terminals\.spawn/);
  assert.match(hint, /xd\.dock\.panes\.list/);
});

test('planXenesisDeskNaturalLanguageActions maps local CLI and MCP readbacks to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('MCP 설정 상태 보여줘').actions, [
    {
      id: 'natural-mcp-settings-status',
      path: 'xd.mcp.settings.status',
      args: {},
      approved: false,
      reason: 'Read MCP settings status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('MCP 브리지 상태 보여줘').actions, [
    {
      id: 'natural-mcp-bridge-status',
      path: 'xd.mcp.bridge.status',
      args: {},
      approved: false,
      reason: 'Read MCP bridge status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('로컬 CLI 스캔해줘').actions, [
    {
      id: 'natural-local-cli-scan',
      path: 'xd.localCli.scan',
      args: {},
      approved: false,
      reason: 'Scan local CLI agents from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 MCP 설치 초안 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-mcp-install-draft-open-notion',
      path: 'xd.xenesis.tools.mcpInstallDrafts.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion MCP install draft from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps gateway read and dashboard prompts to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('게이트웨이 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-gateway-status',
      path: 'xd.xenesis.gateway.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis gateway status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis gateway dashboard 열어줘').actions, [
    {
      id: 'natural-xenesis-gateway-dashboard-open',
      path: 'xd.xenesis.gateway.openDashboard',
      args: {},
      approved: false,
      reason: 'Open Xenesis gateway dashboard from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('게이트웨이 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-gateway',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'gateway' },
      approved: false,
      reason: 'Read Gateway onboarding checklist status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps runtime inventory readbacks to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-status',
      path: 'xd.xenesis.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis runtime status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis 운영 진단 보여줘').actions, [
    {
      id: 'natural-xenesis-diagnostics',
      path: 'xd.xenesis.diagnostics',
      args: {},
      approved: false,
      reason: 'Read Xenesis operational diagnostics from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis 리포트 목록 보여줘').actions, [
    {
      id: 'natural-xenesis-reports-list',
      path: 'xd.xenesis.reports.list',
      args: {},
      approved: false,
      reason: 'List Xenesis reports from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis 태스크 목록 보여줘').actions, [
    {
      id: 'natural-xenesis-tasks-list',
      path: 'xd.xenesis.tasks.list',
      args: {},
      approved: false,
      reason: 'List Xenesis tasks from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis Agent 목록 보여줘').actions, [
    {
      id: 'natural-xenesis-agents-list',
      path: 'xd.xenesis.agents.list',
      args: {},
      approved: false,
      reason: 'List registered Xenesis Agent panes from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis Agent "xenesis-agent" 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-agent-status',
      path: 'xd.xenesis.agents.status',
      args: { agentId: 'xenesis-agent' },
      approved: false,
      reason: 'Read Xenesis Agent pane status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis Agent "xenesis-agent" 이벤트 보여줘').actions, [
    {
      id: 'natural-xenesis-agent-events',
      path: 'xd.xenesis.agents.events',
      args: { agentId: 'xenesis-agent' },
      approved: false,
      reason: 'List Xenesis Agent pane events from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps profile inventory prompts to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis profile 목록 보여줘').actions, [
    {
      id: 'natural-xenesis-profiles-list',
      path: 'xd.xenesis.profiles.list',
      args: {},
      approved: false,
      reason: 'List Xenesis profiles from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('제네시스 active profile 확인해줘').actions, [
    {
      id: 'natural-xenesis-profiles-list',
      path: 'xd.xenesis.profiles.list',
      args: {},
      approved: false,
      reason: 'List Xenesis profiles from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps runtime control prompts to CR actions', () => {
  assert.deepEqual(
    planXenesisDeskNaturalLanguageActions('Xenesis runtime run "연결 상태를 요약해줘" 실행해줘').actions,
    [
      {
        id: 'natural-xenesis-runs-start',
        path: 'xd.xenesis.runs.start',
        args: { prompt: '연결 상태를 요약해줘' },
        approved: false,
        reason: 'Start Xenesis run from natural language request.',
      },
    ],
  );

  assert.deepEqual(
    planXenesisDeskNaturalLanguageActions('Xenesis Agent "xenesis-agent"에 "연결 상태 요약해줘" 보내줘').actions,
    [
      {
        id: 'natural-xenesis-agent-submit',
        path: 'xd.xenesis.agents.submit',
        args: { agentId: 'xenesis-agent', text: '연결 상태 요약해줘' },
        approved: false,
        reason: 'Submit Xenesis Agent pane message from natural language request.',
      },
    ],
  );

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Xenesis runtime run 취소해줘').actions, [
    {
      id: 'natural-xenesis-runs-cancel',
      path: 'xd.xenesis.runs.cancel',
      args: {},
      approved: false,
      reason: 'Cancel active Xenesis run from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('제네시스 세션 초기화해줘').actions, [
    {
      id: 'natural-xenesis-sessions-reset',
      path: 'xd.xenesis.sessions.reset',
      args: {},
      approved: false,
      reason: 'Reset active Xenesis session from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps workspace binding prompts to CR actions', () => {
  assert.deepEqual(
    planXenesisDeskNaturalLanguageActions('Xenesis workspace를 "E:\\Workspace\\plane"로 설정해줘').actions,
    [
      {
        id: 'natural-xenesis-workspace-set',
        path: 'xd.xenesis.workspace.set',
        args: { path: 'E:\\Workspace\\plane' },
        approved: false,
        reason: 'Set Xenesis workspace from natural language request.',
      },
    ],
  );

  assert.deepEqual(
    planXenesisDeskNaturalLanguageActions('제네시스 워크스페이스를 "D:\\Projects\\desk app"로 바꿔줘').actions,
    [
      {
        id: 'natural-xenesis-workspace-set',
        path: 'xd.xenesis.workspace.set',
        args: { path: 'D:\\Projects\\desk app' },
        approved: false,
        reason: 'Set Xenesis workspace from natural language request.',
      },
    ],
  );
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

test('planXenesisDeskNaturalLanguageActions maps Connection Center requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('연결 진단 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open Xenesis connection diagnostics catalog in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('설정 요청 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-requests-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open Xenesis connection setup request catalog in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 프로필 초안 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-profile-drafts-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason:
        'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('channel profile draft 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messengers-profile-drafts-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason:
        'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('가이드 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-guides-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open Xenesis guide catalog in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('guide catalog 열어줘').actions, [
    {
      id: 'natural-xenesis-guides-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open Xenesis guide catalog in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 연결 카드 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-open-notion',
      path: 'xd.xenesis.connections.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion connection card from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 OAuth 초안 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-open-google-calendar',
      path: 'xd.xenesis.tools.oauthDrafts.open',
      args: { id: 'google-calendar', ensureVisible: true },
      approved: false,
      reason: 'Open Google Calendar OAuth draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('온보딩 가이드 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-onboarding-connections',
      path: 'xd.xenesis.guides.open',
      args: { id: 'onboarding-connections', ensureVisible: true },
      approved: false,
      reason: 'Open Onboarding and connections guide from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 메신저 설정 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-telegram',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram messenger view from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps guide file open requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('온보딩 가이드 파일 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-onboarding-connections',
      path: 'xd.xenesis.guides.open',
      args: { id: 'onboarding-connections', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open Onboarding and connections guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('CR MCP 게이트웨이 문서 파일 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-cr-mcp-gateway-bots',
      path: 'xd.xenesis.guides.open',
      args: { id: 'cr-mcp-gateway-bots', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open Capability Registry, MCP, gateway, and bots guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('사용자 스토리 guide file 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-agent-user-stories',
      path: 'xd.xenesis.guides.open',
      args: { id: 'agent-user-stories', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open Agent user stories guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('헤르메스 guide file 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-agent-user-stories',
      path: 'xd.xenesis.guides.open',
      args: { id: 'agent-user-stories', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open Agent user stories guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('오픈클로 채널 가이드 파일 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-openclaw-channel-setup',
      path: 'xd.xenesis.guides.open',
      args: { id: 'openclaw-channel-setup', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open OpenClaw-style channel setup guide file from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 드라이브 통합 guide file 열어줘').actions, [
    {
      id: 'natural-xenesis-guide-open-external-tool-integrations',
      path: 'xd.xenesis.guides.open',
      args: { id: 'external-tool-integrations', ensureVisible: true, openFile: true },
      approved: false,
      reason: 'Open External tool integrations guide file from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps onboarding checklist open requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('온보딩 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-center-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open Xenesis onboarding checklist in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('초기 설정 체크리스트 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-center-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open Xenesis onboarding checklist in Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('첫 채팅 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-first-chat',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'first-chat', ensureVisible: true },
      approved: false,
      reason: 'Open First chat onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('로컬 CLI MCP 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-local-cli-mcp',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'local-cli-mcp', ensureVisible: true },
      approved: false,
      reason: 'Open Local CLI and MCP onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('추천 도구 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-recommended-tools',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'recommended-tools', ensureVisible: true },
      approved: false,
      reason: 'Open Recommended tools onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('게이트웨이 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-gateway',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'gateway', ensureVisible: true },
      approved: false,
      reason: 'Open Gateway onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('메신저 라우팅 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-messenger-routing',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'messenger-routing', ensureVisible: true },
      approved: false,
      reason: 'Open Messenger routing onboarding checklist step from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('엔드투엔드 테스트 온보딩 열어줘').actions, [
    {
      id: 'natural-xenesis-onboarding-open-test-send',
      path: 'xd.xenesis.onboarding.open',
      args: { id: 'test-send', ensureVisible: true },
      approved: false,
      reason: 'Open End-to-end test onboarding checklist step from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps detailed Connection Center open requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider setup 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open AI provider catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider routing 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-providers-routing-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open AI provider routing catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider view 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-providers-views-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open AI provider view catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider profile draft 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-providers-profile-drafts-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open AI provider profile draft catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 connector 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open external tool catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 setup 전체 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-catalog-open',
      path: 'xd.panes.settings.open',
      args: {
        category: 'xenesis-agent',
        mode: 'connections',
        section: 'xenesis-connections',
        placement: 'tab',
      },
      approved: false,
      reason: 'Open external messenger catalog in Xenesis Connection Center from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider setup 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-view-open-auto',
      path: 'xd.xenesis.providers.views.open',
      args: { provider: 'auto', ensureVisible: true },
      approved: false,
      reason: 'Open auto provider view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('codex app-server provider view 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-view-open-codex-app-server',
      path: 'xd.xenesis.providers.views.open',
      args: { provider: 'codex-app-server', ensureVisible: true },
      approved: false,
      reason: 'Open codex-app-server provider view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('codex app-server provider setup 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-view-open-codex-app-server',
      path: 'xd.xenesis.providers.views.open',
      args: { provider: 'codex-app-server', ensureVisible: true },
      approved: false,
      reason: 'Open codex-app-server provider view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('LM Studio provider setup 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-view-open-lmstudio',
      path: 'xd.xenesis.providers.views.open',
      args: { provider: 'lmstudio', ensureVisible: true },
      approved: false,
      reason: 'Open lmstudio provider view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Qwen provider profile draft 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-open-qwen',
      path: 'xd.xenesis.providers.profileDrafts.open',
      args: { provider: 'qwen', ensureVisible: true },
      approved: false,
      reason: 'Open qwen provider profile draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider profile draft 열어줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-open-auto',
      path: 'xd.xenesis.providers.profileDrafts.open',
      args: { provider: 'auto', ensureVisible: true },
      approved: false,
      reason: 'Open auto provider profile draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 설치 계획 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-install-plan-open-notion',
      path: 'xd.xenesis.tools.installPlans.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion tool install plan from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 setup 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-view-open-google-calendar',
      path: 'xd.xenesis.tools.views.open',
      args: { id: 'google-calendar', ensureVisible: true },
      approved: false,
      reason: 'Open Google Calendar tool view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 드라이브 setup 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-view-open-google-workspace',
      path: 'xd.xenesis.tools.views.open',
      args: { id: 'google-workspace', ensureVisible: true },
      approved: false,
      reason: 'Open Google Workspace tool view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('웹페이지 가져오기 설치 계획 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-install-plan-open-fetch',
      path: 'xd.xenesis.tools.installPlans.open',
      args: { id: 'fetch', ensureVisible: true },
      approved: false,
      reason: 'Open Fetch tool install plan from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('파일 시스템 connector 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-view-open-filesystem',
      path: 'xd.xenesis.tools.views.open',
      args: { id: 'filesystem', ensureVisible: true },
      approved: false,
      reason: 'Open Filesystem tool view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 connector 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-view-open-notion',
      path: 'xd.xenesis.tools.views.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion tool view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 MCP 설치 초안 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-mcp-install-draft-open-notion',
      path: 'xd.xenesis.tools.mcpInstallDrafts.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion MCP install draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 사용자 스토리 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-user-story-open-google-calendar',
      path: 'xd.xenesis.tools.userStories.open',
      args: { id: 'google-calendar', ensureVisible: true },
      approved: false,
      reason: 'Open Google Calendar tool user story from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('리니어 액션 정책 열어줘').actions, [
    {
      id: 'natural-xenesis-tool-action-policy-open-linear',
      path: 'xd.xenesis.tools.actions.open',
      args: { id: 'linear', ensureVisible: true },
      approved: false,
      reason: 'Open Linear tool action policy from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 setup 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-telegram',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram messenger view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('왓츠앱 setup 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-whatsapp',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'whatsapp', ensureVisible: true },
      approved: false,
      reason: 'Open WhatsApp messenger view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('마이크로소프트 팀즈 설정 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-microsoft-teams',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'microsoft-teams', ensureVisible: true },
      approved: false,
      reason: 'Open Microsoft Teams messenger view from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 챗 프로필 초안 열어줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-open-google-chat',
      path: 'xd.xenesis.messengers.views.open',
      args: { id: 'google-chat', ensureVisible: true },
      approved: false,
      reason: 'Open Google Chat messenger view from natural language request.',
    },
  ]);

  for (const [prompt, id, label] of [
    ['아이메시지 setup 열어줘', 'imessage', 'iMessage'],
    ['매트릭스 setup 열어줘', 'matrix', 'Matrix'],
    ['IRC setup 열어줘', 'irc', 'IRC'],
    ['Mattermost setup 열어줘', 'mattermost', 'Mattermost'],
    ['넥스트클라우드 톡 setup 열어줘', 'nextcloud-talk', 'Nextcloud Talk'],
    ['노스트르 setup 열어줘', 'nostr', 'Nostr'],
    ['Raft setup 열어줘', 'raft', 'Raft'],
    ['Tlon setup 열어줘', 'tlon', 'Tlon'],
    ['시놀로지 챗 setup 열어줘', 'synology-chat', 'Synology Chat'],
    ['로켓챗 setup 열어줘', 'rocket-chat', 'Rocket.Chat'],
    ['트위치 setup 열어줘', 'twitch', 'Twitch'],
    ['LINE setup 열어줘', 'line', 'LINE'],
    ['위챗 setup 열어줘', 'wechat', 'WeChat'],
    ['QQ 봇 setup 열어줘', 'qqbot', 'QQ Bot'],
    ['Lark setup 열어줘', 'feishu', 'Feishu / Lark'],
    ['딩톡 setup 열어줘', 'dingding', 'DingTalk / Dingding'],
    ['위안바오 setup 열어줘', 'yuanbao', 'Yuanbao'],
    ['Zalo setup 열어줘', 'zalo', 'Zalo'],
    ['이메일 setup 열어줘', 'email', 'Email'],
    ['SMS setup 열어줘', 'sms', 'SMS'],
    ['홈 어시스턴트 setup 열어줘', 'home-assistant', 'Home Assistant'],
    ['ntfy setup 열어줘', 'ntfy', 'ntfy'],
  ] as const) {
    assert.deepEqual(planXenesisDeskNaturalLanguageActions(prompt).actions, [
      {
        id: `natural-xenesis-messenger-view-open-${id}`,
        path: 'xd.xenesis.messengers.views.open',
        args: { id, ensureVisible: true },
        approved: false,
        reason: `Open ${label} messenger view from natural language request.`,
      },
    ]);
  }

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 사용자 스토리 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-user-story-open-telegram',
      path: 'xd.xenesis.channels.userStories.open',
      args: { id: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram channel user story from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 채널 프로필 열어줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-open-telegram',
      path: 'xd.xenesis.channels.profileDrafts.open',
      args: { channel: 'telegram', ensureVisible: true },
      approved: false,
      reason: 'Open Telegram channel profile draft from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 진단 runbook 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-open-notion',
      path: 'xd.xenesis.connections.diagnostics.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion connection diagnostics from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 setup request 열어줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-open-notion',
      path: 'xd.xenesis.connections.setupRequests.open',
      args: { id: 'notion', ensureVisible: true },
      approved: false,
      reason: 'Open Notion connection setup request from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps Connection Center readback requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('연결 진단 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-status',
      path: 'xd.xenesis.connections.diagnostics.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection diagnostics catalog from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Connection diagnostics 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-status',
      path: 'xd.xenesis.connections.diagnostics.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection diagnostics catalog from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('설정 요청 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-requests-status',
      path: 'xd.xenesis.connections.setupRequests.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection setup request catalog from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('connection setup request 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-requests-status',
      path: 'xd.xenesis.connections.setupRequests.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection setup request catalog from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('연결 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connections-status',
      path: 'xd.xenesis.connections.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Connection Center 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connections-status',
      path: 'xd.xenesis.connections.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis connection status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 연결 진단 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-diagnostics-status-notion',
      path: 'xd.xenesis.connections.diagnostics.status',
      args: { id: 'notion' },
      approved: false,
      reason: 'Read Notion connection diagnostics from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 OAuth 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-status-google-calendar',
      path: 'xd.xenesis.tools.oauthDrafts.status',
      args: { id: 'google-calendar' },
      approved: false,
      reason: 'Read Google Calendar OAuth draft status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 라우팅 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-routing-status-telegram',
      path: 'xd.xenesis.channels.routing.status',
      args: { channel: 'telegram' },
      approved: false,
      reason: 'Read Telegram channel routing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 setup request 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-status-notion',
      path: 'xd.xenesis.connections.setupRequests.status',
      args: { id: 'notion' },
      approved: false,
      reason: 'Read Notion connection setup request status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 설정 요청 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-status-telegram',
      path: 'xd.xenesis.connections.setupRequests.status',
      args: { id: 'telegram' },
      approved: false,
      reason: 'Read Telegram connection setup request status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps onboarding checklist readback requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('초기 설정 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status',
      path: 'xd.xenesis.onboarding.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis onboarding status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('초기 설정 체크리스트 확인해줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status',
      path: 'xd.xenesis.onboarding.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis onboarding status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('첫 채팅 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-first-chat',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'first-chat' },
      approved: false,
      reason: 'Read First chat onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('로컬 CLI MCP 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-local-cli-mcp',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'local-cli-mcp' },
      approved: false,
      reason: 'Read Local CLI and MCP onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('추천 도구 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-recommended-tools',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'recommended-tools' },
      approved: false,
      reason: 'Read Recommended tools onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('게이트웨이 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-gateway',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'gateway' },
      approved: false,
      reason: 'Read Gateway onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('메신저 라우팅 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-messenger-routing',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'messenger-routing' },
      approved: false,
      reason: 'Read Messenger routing onboarding checklist status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('엔드투엔드 테스트 온보딩 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-onboarding-status-test-send',
      path: 'xd.xenesis.onboarding.status',
      args: { id: 'test-send' },
      approved: false,
      reason: 'Read End-to-end test onboarding checklist status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps guide catalog readback requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('가이드 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guides-status',
      path: 'xd.xenesis.guides.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('guide catalog 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guides-status',
      path: 'xd.xenesis.guides.status',
      args: {},
      approved: false,
      reason: 'Read Xenesis guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('온보딩 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-onboarding-connections',
      path: 'xd.xenesis.guides.status',
      args: { id: 'onboarding-connections' },
      approved: false,
      reason: 'Read Onboarding and connections guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('CR MCP 게이트웨이 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-cr-mcp-gateway-bots',
      path: 'xd.xenesis.guides.status',
      args: { id: 'cr-mcp-gateway-bots' },
      approved: false,
      reason: 'Read Capability Registry, MCP, gateway, and bots guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('사용자 스토리 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-agent-user-stories',
      path: 'xd.xenesis.guides.status',
      args: { id: 'agent-user-stories' },
      approved: false,
      reason: 'Read Agent user stories guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 도구 통합 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-external-tool-integrations',
      path: 'xd.xenesis.guides.status',
      args: { id: 'external-tool-integrations' },
      approved: false,
      reason: 'Read External tool integrations guide catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Hermes 통합 가이드 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-guide-status-external-tool-integrations',
      path: 'xd.xenesis.guides.status',
      args: { id: 'external-tool-integrations' },
      approved: false,
      reason: 'Read External tool integrations guide catalog status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps detailed Connection Center readbacks to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider setup 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-providers-setup-status',
      path: 'xd.xenesis.providers.setup.status',
      args: {},
      approved: false,
      reason: 'Read AI provider setup catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider routing 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-providers-routing-status',
      path: 'xd.xenesis.providers.routing.status',
      args: {},
      approved: false,
      reason: 'Read AI provider routing catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider view 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-providers-views-status',
      path: 'xd.xenesis.providers.views.status',
      args: {},
      approved: false,
      reason: 'Read AI provider view catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider profile draft 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-providers-profile-drafts-status',
      path: 'xd.xenesis.providers.profileDrafts.status',
      args: {},
      approved: false,
      reason: 'Read AI provider profile draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 프로필 초안 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-profile-drafts-status',
      path: 'xd.xenesis.channels.profileDrafts.status',
      args: {},
      approved: false,
      reason: 'Read external messenger profile draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('channel profile draft 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-profile-drafts-status',
      path: 'xd.xenesis.channels.profileDrafts.status',
      args: {},
      approved: false,
      reason: 'Read external messenger profile draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 connector 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-connectors-status',
      path: 'xd.xenesis.tools.connectors.status',
      args: {},
      approved: false,
      reason: 'Read external tool connector catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 setup 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-setup-status',
      path: 'xd.xenesis.tools.setup.status',
      args: {},
      approved: false,
      reason: 'Read external tool setup catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 view 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-views-status',
      path: 'xd.xenesis.tools.views.status',
      args: {},
      approved: false,
      reason: 'Read external tool view catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 설치 계획 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-install-plans-status',
      path: 'xd.xenesis.tools.installPlans.status',
      args: {},
      approved: false,
      reason: 'Read external tool install plan catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 OAuth 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-oauth-drafts-status',
      path: 'xd.xenesis.tools.oauthDrafts.status',
      args: {},
      approved: false,
      reason: 'Read external tool OAuth draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 MCP 설치 초안 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-mcp-install-drafts-status',
      path: 'xd.xenesis.tools.mcpInstallDrafts.status',
      args: {},
      approved: false,
      reason: 'Read external tool MCP install draft catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 액션 정책 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-actions-status',
      path: 'xd.xenesis.tools.actions.status',
      args: {},
      approved: false,
      reason: 'Read external tool action policy catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 툴 사용자 스토리 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tools-user-stories-status',
      path: 'xd.xenesis.tools.userStories.status',
      args: {},
      approved: false,
      reason: 'Read external tool user-story catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 라우팅 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-routing-status',
      path: 'xd.xenesis.channels.routing.status',
      args: {},
      approved: false,
      reason: 'Read external messenger routing catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 안전 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-safety-status',
      path: 'xd.xenesis.channels.safety.status',
      args: {},
      approved: false,
      reason: 'Read external messenger safety catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 접근 그룹 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-access-groups-status',
      path: 'xd.xenesis.channels.accessGroups.status',
      args: {},
      approved: false,
      reason: 'Read external messenger access-group catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 액세스 그룹 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-access-groups-status',
      path: 'xd.xenesis.channels.accessGroups.status',
      args: {},
      approved: false,
      reason: 'Read external messenger access-group catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 페어링 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-pairing-status',
      path: 'xd.xenesis.channels.pairing.status',
      args: {},
      approved: false,
      reason: 'Read external messenger pairing catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 사용자 스토리 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-user-stories-status',
      path: 'xd.xenesis.channels.userStories.status',
      args: {},
      approved: false,
      reason: 'Read external messenger user-story catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('외부 메신저 setup 전체 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messengers-views-status',
      path: 'xd.xenesis.messengers.views.status',
      args: {},
      approved: false,
      reason: 'Read external messenger view catalog status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-provider-setup-status-auto',
      path: 'xd.xenesis.providers.setup.status',
      args: { provider: 'auto' },
      approved: false,
      reason: 'Read auto provider setup status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('codex app-server provider routing 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-provider-routing-status-codex-app-server',
      path: 'xd.xenesis.providers.routing.status',
      args: { provider: 'codex-app-server' },
      approved: false,
      reason: 'Read codex-app-server provider routing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Azure OpenAI provider routing 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-provider-routing-status-azure',
      path: 'xd.xenesis.providers.routing.status',
      args: { provider: 'azure' },
      approved: false,
      reason: 'Read azure provider routing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 connector 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-connector-status-notion',
      path: 'xd.xenesis.tools.connectors.status',
      args: { tool: 'notion' },
      approved: false,
      reason: 'Read Notion tool connector status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-setup-status-google-calendar',
      path: 'xd.xenesis.tools.setup.status',
      args: { id: 'google-calendar' },
      approved: false,
      reason: 'Read Google Calendar tool setup status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Google Drive OAuth 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-status-google-workspace',
      path: 'xd.xenesis.tools.oauthDrafts.status',
      args: { id: 'google-workspace' },
      approved: false,
      reason: 'Read Google Workspace OAuth draft status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 독스 액션 정책 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-action-policy-status-google-workspace',
      path: 'xd.xenesis.tools.actions.status',
      args: { tool: 'google-workspace' },
      approved: false,
      reason: 'Read Google Workspace tool action policy status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 설정 확인해줘').actions, [
    {
      id: 'natural-xenesis-tool-setup-status-notion',
      path: 'xd.xenesis.tools.setup.status',
      args: { id: 'notion' },
      approved: false,
      reason: 'Read Notion tool setup status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('리니어 config 확인해줘').actions, [
    {
      id: 'natural-xenesis-tool-setup-status-linear',
      path: 'xd.xenesis.tools.setup.status',
      args: { id: 'linear' },
      approved: false,
      reason: 'Read Linear tool setup status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 설치 계획 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-install-plan-status-notion',
      path: 'xd.xenesis.tools.installPlans.status',
      args: { tool: 'notion' },
      approved: false,
      reason: 'Read Notion tool install plan status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 사용자 스토리 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-tool-user-story-status-google-calendar',
      path: 'xd.xenesis.tools.userStories.status',
      args: { tool: 'google-calendar' },
      approved: false,
      reason: 'Read Google Calendar tool user story status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 접근 그룹 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-access-groups-status-telegram',
      path: 'xd.xenesis.channels.accessGroups.status',
      args: { channel: 'telegram' },
      approved: false,
      reason: 'Read Telegram channel access groups status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('디스코드 액세스 그룹 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-access-groups-status-discord',
      path: 'xd.xenesis.channels.accessGroups.status',
      args: { channel: 'discord' },
      approved: false,
      reason: 'Read Discord channel access groups status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 페어링 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-pairing-status-telegram',
      path: 'xd.xenesis.channels.pairing.status',
      args: { channel: 'telegram' },
      approved: false,
      reason: 'Read Telegram channel pairing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-telegram',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'telegram' },
      approved: false,
      reason: 'Read Telegram messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 챗 setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-google-chat',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'google-chat' },
      approved: false,
      reason: 'Read Google Chat messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 챗 라우팅 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-google-chat',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'google-chat' },
      approved: false,
      reason: 'Read Google Chat messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('왓츠앱 안전 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-whatsapp',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'whatsapp' },
      approved: false,
      reason: 'Read WhatsApp messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('ntfy setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-ntfy',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'ntfy' },
      approved: false,
      reason: 'Read ntfy messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('딩딩 setup 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-dingding',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'dingding' },
      approved: false,
      reason: 'Read DingTalk / Dingding messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('슬랙 config 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-messenger-view-status-slack',
      path: 'xd.xenesis.messengers.views.status',
      args: { id: 'slack' },
      approved: false,
      reason: 'Read Slack messenger view status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('라크 사용자 스토리 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-user-story-status-feishu',
      path: 'xd.xenesis.channels.userStories.status',
      args: { id: 'feishu' },
      approved: false,
      reason: 'Read Feishu / Lark channel user story status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('SMS 페어링 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-pairing-status-sms',
      path: 'xd.xenesis.channels.pairing.status',
      args: { channel: 'sms' },
      approved: false,
      reason: 'Read SMS channel pairing status from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 사용자 스토리 상태 보여줘').actions, [
    {
      id: 'natural-xenesis-channel-user-story-status-telegram',
      path: 'xd.xenesis.channels.userStories.status',
      args: { id: 'telegram' },
      approved: false,
      reason: 'Read Telegram channel user story status from natural language request.',
    },
  ]);
});

test('planXenesisDeskNaturalLanguageActions maps Connection Center review requests to CR actions', () => {
  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 연결 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-notion',
      path: 'xd.xenesis.connections.setupRequests.request',
      args: { id: 'notion' },
      approved: false,
      reason: 'Request Notion connection setup review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('노션 MCP 설치 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-mcp-install-draft-request-notion',
      path: 'xd.xenesis.tools.mcpInstallDrafts.request',
      args: { id: 'notion' },
      approved: false,
      reason: 'Request Notion MCP install draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 캘린더 OAuth 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-request-google-calendar',
      path: 'xd.xenesis.tools.oauthDrafts.request',
      args: { id: 'google-calendar' },
      approved: false,
      reason: 'Request Google Calendar OAuth draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('구글 드라이브 OAuth 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-oauth-draft-request-google-workspace',
      path: 'xd.xenesis.tools.oauthDrafts.request',
      args: { id: 'google-workspace' },
      approved: false,
      reason: 'Request Google Workspace OAuth draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('리니어 액션 정책 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-tool-action-policy-request-linear',
      path: 'xd.xenesis.tools.actions.request',
      args: { id: 'linear' },
      approved: false,
      reason: 'Request Linear tool action policy review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('텔레그램 채널 프로필 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-channel-profile-draft-request-telegram',
      path: 'xd.xenesis.channels.profileDrafts.request',
      args: { channel: 'telegram' },
      approved: false,
      reason: 'Request Telegram channel profile draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('왓츠앱 프로필 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-whatsapp',
      path: 'xd.xenesis.connections.setupRequests.request',
      args: { id: 'whatsapp' },
      approved: false,
      reason: 'Request WhatsApp connection setup review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Zalo 프로필 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-connection-setup-request-zalo',
      path: 'xd.xenesis.connections.setupRequests.request',
      args: { id: 'zalo' },
      approved: false,
      reason: 'Request Zalo connection setup review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('AI provider profile 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-request-auto',
      path: 'xd.xenesis.providers.profileDrafts.request',
      args: { provider: 'auto' },
      approved: false,
      reason: 'Request AI provider profile draft review from natural language request.',
    },
  ]);

  assert.deepEqual(planXenesisDeskNaturalLanguageActions('Claude interactive provider profile 검토 요청해줘').actions, [
    {
      id: 'natural-xenesis-provider-profile-draft-request-claude-interactive',
      path: 'xd.xenesis.providers.profileDrafts.request',
      args: { provider: 'claude-interactive' },
      approved: false,
      reason: 'Request claude-interactive provider profile draft review from natural language request.',
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
