import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { listDeskBridgeCapabilities } from '../../../../shared/deskBridgeCapabilities';
import {
  isXenesisDeskActionRecordValue,
  isXenesisDeskActionValueType,
  XENESIS_DESK_ACTION_ACTIVITY_PHASES,
  XENESIS_DESK_ACTION_CALL_RESULT_KEYS,
  XENESIS_DESK_ACTION_PROTOCOL_FORMAT,
  XENESIS_DESK_ACTION_PROTOCOL_TEXT,
  XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT,
  XENESIS_DESK_ACTION_VALUE_TYPE_NAMES,
} from '../../../../shared/xenesisDeskActionProtocol';
import { isXenesisDeskCapabilityPathUnderPrefix } from '../../../../shared/xenesisDeskControlPromptHint';
import {
  XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES,
  XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS,
} from '../../../../shared/xenesisDeskControlPromptHintCatalog';
import {
  approveXenesisDeskActions,
  buildXenesisDeskActionCompletedMessage,
  buildXenesisDeskActionPendingMessage,
  buildXenesisDeskControlPromptHint,
  parseXenesisDeskActionBlocks,
  pendingXenesisDeskActionsFromResults,
  runXenesisDeskActions,
  shouldRunXenesisDeskActionsDirectly,
  summarizeXenesisDeskActionExecution,
} from './xenesisAgentDeskControl';

test('pre-provider natural Desk heuristic routing code is absent', () => {
  const agentPaneSource = readFileSync(new URL('./XenesisAgentPane.tsx', import.meta.url), 'utf8');
  const controlSource = readFileSync(new URL('./xenesisAgentDeskControl.ts', import.meta.url), 'utf8');
  const protocolSource = readFileSync(
    new URL('../../../../shared/xenesisDeskActionProtocol.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(agentPaneSource, /planXenesisDeskNaturalLanguageActions/);
  assert.doesNotMatch(agentPaneSource, /bypassNaturalDeskRouting/);
  assert.doesNotMatch(agentPaneSource, /naturalDeskActionRequest/);
  assert.doesNotMatch(agentPaneSource, /Direct natural Desk action prompt/);
  assert.doesNotMatch(controlSource, /xenesisNaturalLanguage/);
  assert.doesNotMatch(protocolSource, /natural language|XENESIS_NATURAL_|findXenesisNatural|hasXenesisNatural/i);

  for (const removedModule of [
    '../../../../shared/xenesisNaturalLanguageCatalog.ts',
    '../../../../shared/xenesisNaturalLanguageCapabilityCatalog.ts',
    '../../../../shared/xenesisNaturalLanguageActionResolvers.ts',
    '../../../../shared/xenesisNaturalLanguagePlanResolvers.ts',
    '../../../../shared/xenesisNaturalLanguagePlanner.ts',
  ]) {
    assert.equal(existsSync(new URL(removedModule, import.meta.url)), false, `${removedModule} should be removed`);
  }
});

test('ordinary natural Desk prompts are not parsed as direct Desk actions', () => {
  for (const prompt of [
    '노션 connector 상태 보여줘',
    'AI provider 설정해줘',
    '초기 설정 체크리스트 열어줘',
    '텔레그램 channel runtime 열어줘',
  ]) {
    const parsed = parseXenesisDeskActionBlocks(prompt);
    assert.deepEqual(parsed, {
      visibleText: prompt,
      actions: [],
      errors: [],
    });
    assert.equal(shouldRunXenesisDeskActionsDirectly(parsed), false);
  }
});

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
  assert.equal(shouldRunXenesisDeskActionsDirectly(parsed), true);
});

test('parseXenesisDeskActionBlocks accepts raw action JSON arrays and rejects non-CR paths', () => {
  assert.deepEqual(
    parseXenesisDeskActionBlocks('{"path":"xd.window.sizer.applyPreset","args":{"presetId":"qhd"},"approved":true}'),
    {
      visibleText: '',
      actions: [
        {
          id: 'desk-action-1',
          path: 'xd.window.sizer.applyPreset',
          args: { presetId: 'qhd' },
          approved: true,
        },
      ],
      errors: [],
    },
  );

  assert.deepEqual(parseXenesisDeskActionBlocks('[{"path":"xd.files.listOpen"},{"path":"terminal.run"}]'), {
    visibleText: '',
    actions: [
      {
        id: 'desk-action-1',
        path: 'xd.files.listOpen',
        args: {},
        approved: false,
      },
    ],
    errors: ['Desk action 2 path must start with xd.: terminal.run'],
  });
});

test('runXenesisDeskActions calls the direct CR executor and reports activity', async () => {
  const calls: Array<{ path: string; args: unknown; approved: boolean | undefined }> = [];
  const phases: string[] = [];
  const results = await runXenesisDeskActions(
    [
      { id: 'one', path: 'xd.files.listOpen', args: {}, approved: true },
      { id: 'two', path: 'xd.capture.activePane', args: { includeImage: false }, approved: false },
    ],
    async (path, args, options) => {
      calls.push({ path, args, approved: options?.approved });
      return path === 'xd.capture.activePane'
        ? { ok: false, error: 'requires approval', approvalRequired: true, permission: path }
        : { ok: true, result: { files: ['README.md'] } };
    },
    {
      onActivity: (activity) => phases.push(activity.phase),
    },
  );

  assert.deepEqual(calls, [
    { path: 'xd.files.listOpen', args: {}, approved: true },
    { path: 'xd.capture.activePane', args: { includeImage: false }, approved: false },
  ]);
  assert.deepEqual(phases, [
    XENESIS_DESK_ACTION_ACTIVITY_PHASES.start,
    XENESIS_DESK_ACTION_ACTIVITY_PHASES.success,
    XENESIS_DESK_ACTION_ACTIVITY_PHASES.start,
    XENESIS_DESK_ACTION_ACTIVITY_PHASES.approvalRequired,
  ]);
  assert.deepEqual(
    results.map((result) => ({ id: result.id, ok: result.ok, approvalRequired: result.approvalRequired })),
    [
      { id: 'one', ok: true, approvalRequired: undefined },
      { id: 'two', ok: false, approvalRequired: true },
    ],
  );
});

test('approval helpers preserve pending actions and create approved copies', () => {
  const actions = [
    { id: 'one', path: 'xd.files.listOpen', args: {}, approved: false },
    { id: 'two', path: 'xd.capture.activePane', args: {}, approved: false },
  ];
  const pending = pendingXenesisDeskActionsFromResults(actions, [
    { id: 'one', ok: true },
    {
      id: 'two',
      ok: false,
      error: 'requires approval',
      approvalRequired: true,
    },
  ]);

  assert.deepEqual(pending, [{ id: 'two', path: 'xd.capture.activePane', args: {}, approved: false }]);
  assert.deepEqual(approveXenesisDeskActions(pending), [
    { id: 'two', path: 'xd.capture.activePane', args: {}, approved: true },
  ]);
  assert.equal(actions[1]?.approved, false);
});

test('Desk action user messages hide raw DSL behind pending and completion summaries', () => {
  const pendingMessage = buildXenesisDeskActionPendingMessage(
    [{ path: 'xd.capture.activePane', reason: 'Need current pane evidence' }],
    'Capture requested.',
  );
  assert.match(pendingMessage, /Desk action approval required/);
  assert.match(pendingMessage, /Need current pane evidence/);
  assert.doesNotMatch(pendingMessage, /```xenesis-desk-action/);

  const completedMessage = buildXenesisDeskActionCompletedMessage([
    {
      id: 'one',
      path: 'xd.files.listOpen',
      args: {},
      approved: true,
      ok: true,
      result: { files: ['README.md', 'package.json'] },
    },
    {
      id: 'two',
      path: 'xd.capture.activePane',
      args: {},
      approved: true,
      ok: false,
      error: 'Capture failed',
    },
  ]);
  assert.match(completedMessage, /Desk action completed with 1 issue/);
  assert.match(completedMessage, /2 files, first: README.md/);
  assert.match(completedMessage, /Capture failed/);
});

test('Desk action protocol helpers expose stable result semantics', () => {
  assert.equal(XENESIS_DESK_ACTION_CALL_RESULT_KEYS.approvalRequired, 'approvalRequired');
  assert.equal(XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.object, 'object');
  assert.equal(isXenesisDeskActionRecordValue({ result: true }), true);
  assert.equal(isXenesisDeskActionRecordValue(['result']), false);
  assert.equal(isXenesisDeskActionValueType('result', XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string), true);
  assert.equal(XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(2, 'passed'), '2 passed');
  assert.equal(
    summarizeXenesisDeskActionExecution({ ok: true, path: 'xd.files.listOpen' }),
    'Desk action applied: xd.files.listOpen',
  );
  assert.equal(
    summarizeXenesisDeskActionExecution({ ok: false, path: 'xd.files.listOpen' }),
    'Desk action failed: xd.files.listOpen',
  );
});

test('buildXenesisDeskControlPromptHint describes real CR paths without natural routing instructions', () => {
  const hint = buildXenesisDeskControlPromptHint();

  assert.match(hint, /xd\.panes\.settings\.open/);
  assert.match(hint, /xd\.files\.listOpen/);
  assert.match(hint, /xd\.capture\.activePane/);
  assert.match(hint, /xd\.dock\.arrangeGrid/);
  assert.match(hint, /xd\.tools\.core\.capabilityExplorer\.open/);
  assert.match(hint, /xd\.terminals\.runMany/);
  assert.match(hint, /xenesis-desk-action/);
  assert.doesNotMatch(hint, /natural-language|natural Desk routing/i);
});

test('prompt hint dynamic path summaries stay tied to callable CR inventory', () => {
  const callablePaths = new Set(
    listDeskBridgeCapabilities()
      .filter((node) => node.callable)
      .map((node) => node.path),
  );
  assert.equal(isXenesisDeskCapabilityPathUnderPrefix('xd.files.open', 'xd.files'), true);
  assert.equal(isXenesisDeskCapabilityPathUnderPrefix('xd.files.open', 'xd.file'), false);
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.capabilityPathSeparator, '.');
  assert.equal(XENESIS_DESK_ACTION_PROTOCOL_TEXT.completedHeader(0), 'Desk action completed.');

  for (const prefix of Object.values(XENESIS_DESK_CONTROL_PROMPT_HINT_DISCOVERY_PREFIXES).flat()) {
    assert.equal(
      [...callablePaths].some((path) => isXenesisDeskCapabilityPathUnderPrefix(path, prefix)),
      true,
      `${prefix} should have at least one callable CR path`,
    );
  }
  assert.ok(XENESIS_DESK_CONTROL_PROMPT_HINT_SECTIONS.length > 0);
});
