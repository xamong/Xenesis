import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_CONTROL_LAB_ACTIONS,
  applyAppControlLabElementSelection,
  buildAppControlLabArgs,
  buildAppControlLabNetworkDiagramModel,
  buildAppControlLabNetworkDiagramSketch,
  flattenAppControlLabTree,
  isAppControlLabTreeRowSelected,
  recordAppControlLabHistory,
  selectedElementRefLabel,
  summarizeAppControlLabCallResult,
} from './appControlLabModel';

test('App Control Lab uses conservative CR action paths', () => {
  assert.deepEqual(
    APP_CONTROL_LAB_ACTIONS.map((action) => action.path),
    [
      'xd.apps.status',
      'xd.apps.launch',
      'xd.apps.find',
      'xd.apps.close',
      'xd.apps.inspect',
      'xd.apps.tree',
      'xd.apps.menuExplore',
      'xd.apps.elementFromPoint',
      'xd.apps.highlight',
      'xd.apps.captureElement',
    ],
  );
});

test('App Control Lab argument builder trims and clamps numeric fields', () => {
  assert.deepEqual(
    buildAppControlLabArgs(
      { id: 'tree', label: 'Tree', path: 'xd.apps.tree', action: 'tree', group: 'observe' },
      {
        appId: ' notepad ',
        path: '',
        processName: '',
        titleContains: '',
        windowId: '',
        elementRef: '',
        x: '12.8',
        y: '30.2',
        depth: '99',
        limit: '5000',
        includeValues: true,
        includeFullTree: true,
        includeTreePreview: false,
        durationMs: '50',
        argsText: '',
        cwd: '',
        screenshotPath: '',
      },
    ),
    { action: 'tree', appId: 'notepad', depth: 20, limit: 1000, includeValues: true, includeFullTree: true },
  );

  assert.deepEqual(buildAppControlLabArgs('highlight', { elementRef: ' button-1 ', durationMs: 10 }), {
    action: 'highlight',
    elementRef: 'button-1',
    durationMs: 100,
  });
});

test('App Control Lab summarizes tree results and records capped history', () => {
  const action = APP_CONTROL_LAB_ACTIONS.find((item) => item.id === 'tree');
  assert.ok(action);

  const summary = summarizeAppControlLabCallResult(action, {
    ok: true,
    result: {
      ok: true,
      action: 'tree',
      approvalLevel: 'low',
      windows: [],
      message: 'tree ok',
      tree: [
        {
          elementRef: 'root',
          role: 'window',
          name: 'Root',
          children: [{ elementRef: 'child', role: 'button', name: 'Run' }],
        },
      ],
    },
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.treeRows.length, 2);
  assert.equal(applyAppControlLabElementSelection({ elementRef: '' }, summary.treeRows[1]).elementRef, 'child');
  assert.equal(
    recordAppControlLabHistory(
      [],
      { id: '1', actionId: 'tree', path: 'xd.apps.tree', at: 1, result: { ok: true, message: 'ok' } },
      1,
    ).length,
    1,
  );
  assert.equal(flattenAppControlLabTree(summary.resultTree).length, 2);
});

test('App Control Lab tree selection and network diagram helpers stay deterministic', () => {
  const selected = applyAppControlLabElementSelection(
    { appId: 'notepad', windowId: '1001', elementRef: 'old' },
    { depth: 1, label: 'Save', elementRef: ' uia:save-button ', provider: 'uia', role: 'button' },
  );

  assert.deepEqual(selected, { appId: 'notepad', windowId: '1001', elementRef: 'uia:save-button' });
  assert.equal(selectedElementRefLabel(selected), 'uia:save-button');
  assert.equal(isAppControlLabTreeRowSelected(selected, { elementRef: 'uia:save-button' }), true);

  const rows = [
    { depth: 0, label: 'Root', elementRef: 'root', provider: 'uia', role: 'window' },
    { depth: 1, label: 'Run', elementRef: 'child', provider: 'uia', role: 'button' },
  ] as const;
  const model = buildAppControlLabNetworkDiagramModel(rows, 'child');
  const sketch = buildAppControlLabNetworkDiagramSketch(rows, { width: 640, height: 360 }, 'child');

  assert.deepEqual(
    model.links.map((link) => `${link.source}->${link.target}`),
    ['root->child'],
  );
  assert.match(sketch, /networkDiagram/);
  assert.match(sketch, /"id":"child"/);
});
