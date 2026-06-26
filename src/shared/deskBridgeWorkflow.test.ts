import assert from 'node:assert/strict';
import test from 'node:test';
import { callDeskBridgeCapability, listDeskBridgeCapabilities } from './deskBridgeCapabilities';
import { buildDeskBridgeWorkflowPreview, runDeskBridgeWorkflow } from './deskBridgeWorkflow';
import { XENESIS_TUI_CAPABILITY_PATH } from './xenesisTui';

test('CR workflow preview normalizes safe steps without executing them', () => {
  const preview = buildDeskBridgeWorkflowPreview({
    name: 'settings-tour',
    delayMs: 25,
    steps: [
      { path: 'xd.dock.panes.list' },
      {
        path: 'xd.panes.settings.open',
        args: { category: 'run-model', mode: 'hermes', section: 'hermes-provider' },
      },
    ],
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.name, 'settings-tour');
  assert.equal(preview.delayMs, 25);
  assert.deepEqual(preview.rejectedSteps, []);
  assert.deepEqual(
    preview.steps.map((step) => ({ index: step.index, path: step.path, args: step.args, approved: step.approved })),
    [
      { index: 0, path: 'xd.dock.panes.list', args: {}, approved: false },
      {
        index: 1,
        path: 'xd.panes.settings.open',
        args: { category: 'run-model', mode: 'hermes', section: 'hermes-provider' },
        approved: true,
      },
    ],
  );
});

test('CR workflow preview rejects unknown and explicitly dangerous steps', () => {
  const preview = buildDeskBridgeWorkflowPreview({
    steps: [
      { path: 'xd.capture.deleteAll' },
      { path: 'xd.meta.snapshot.import', args: { filePath: 'D:\\unsafe.json' } },
      { path: 'xd.not.registered' },
    ],
  });

  assert.equal(preview.ok, false);
  assert.deepEqual(
    preview.rejectedSteps.map((step) => ({ index: step.index, path: step.path, reason: step.reason })),
    [
      { index: 0, path: 'xd.capture.deleteAll', reason: 'Capability is not allowed in Xenesis Agent workflows.' },
      { index: 1, path: 'xd.meta.snapshot.import', reason: 'Capability is not allowed in Xenesis Agent workflows.' },
      { index: 2, path: 'xd.not.registered', reason: 'Capability is not registered.' },
    ],
  );
});

test('CR workflow preview rejects empty workflows', () => {
  const preview = buildDeskBridgeWorkflowPreview({ name: 'empty', steps: [] });

  assert.equal(preview.ok, false);
  assert.deepEqual(preview.rejectedSteps, [{ index: 0, path: '', reason: 'Workflow must include at least one step.' }]);
});

test('CR workflow runner executes normalized steps sequentially and stops on failure', async () => {
  const calls: Array<{ path: string; args: unknown; approved: boolean }> = [];
  const result = await runDeskBridgeWorkflow(
    {
      name: 'open-settings',
      steps: [
        { path: 'xd.dock.panes.list' },
        { path: 'xd.panes.settings.open', args: { category: 'interface' } },
        { path: 'xd.views.open', args: { kind: 'browser', url: 'https://example.com' } },
      ],
    },
    {
      execute: async (step) => {
        calls.push({ path: step.path, args: step.args, approved: step.approved });
        if (step.path === 'xd.panes.settings.open') {
          return { ok: false, error: 'renderer unavailable' };
        }
        return { ok: true, path: step.path };
      },
      delay: async () => {},
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.completed, 2);
  assert.equal(result.failed, 1);
  assert.equal(result.skipped, 1);
  assert.deepEqual(calls, [
    { path: 'xd.dock.panes.list', args: {}, approved: false },
    { path: 'xd.panes.settings.open', args: { category: 'interface' }, approved: true },
  ]);
  assert.deepEqual(
    result.results.map((item) => ({
      index: item.index,
      path: item.path,
      ok: item.ok,
      skipped: item.skipped === true,
      error: item.error,
    })),
    [
      { index: 0, path: 'xd.dock.panes.list', ok: true, skipped: false, error: undefined },
      { index: 1, path: 'xd.panes.settings.open', ok: false, skipped: false, error: 'renderer unavailable' },
      { index: 2, path: 'xd.views.open', ok: false, skipped: true, error: 'Skipped after previous workflow failure.' },
    ],
  );
});

test('CR workflow capabilities are registered and callable through the desk bridge dispatcher', async () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));
  assert.equal(paths.has('xd.automation.workflow.preview'), true);
  assert.equal(paths.has('xd.automation.workflow.run'), true);

  const preview = await callDeskBridgeCapability(undefined, {
    path: 'xd.automation.workflow.preview',
    args: {
      name: 'status-check',
      steps: [{ path: 'xd.app.status' }],
    },
    source: 'xenesis',
  });

  assert.equal(preview.ok, true);
  assert.equal((preview.result as { steps: Array<{ path: string }> }).steps[0].path, 'xd.app.status');

  const run = await callDeskBridgeCapability(
    {
      status: () => ({ bridge: 'ok' }),
    },
    {
      path: 'xd.automation.workflow.run',
      args: {
        name: 'status-check',
        steps: [{ path: 'xd.app.status' }],
      },
      source: 'xenesis',
      approved: true,
    },
  );

  assert.equal(run.ok, true);
  const result = run.result as { completed: number; results: Array<{ path: string; ok: boolean }> };
  assert.equal(result.completed, 1);
  assert.deepEqual(
    result.results.map((item) => ({ path: item.path, ok: item.ok })),
    [{ path: 'xd.app.status', ok: true }],
  );
});

test('workspace currentPath is registered and reads renderer workspace state', async () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));
  assert.equal(paths.has('xd.workspace.currentPath'), true);

  const result = await callDeskBridgeCapability(
    {
      status: () => ({
        rendererState: {
          workspace: {
            currentPath: 'D:\\Workspace\\xenesis-desk',
            profilePath: 'D:\\profiles\\xenesis.workspace.json',
            autoRestore: true,
          },
          explorer: {
            open: true,
            rootDir: 'D:\\Workspace\\xenesis-desk',
            selectedPath: 'D:\\Workspace\\xenesis-desk\\src',
            selectedIsDir: true,
          },
        },
      }),
    },
    {
      path: 'xd.workspace.currentPath',
      source: 'xenesis',
    },
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.result, {
    currentPath: 'D:\\Workspace\\xenesis-desk',
    profilePath: 'D:\\profiles\\xenesis.workspace.json',
    autoRestore: true,
    explorer: {
      open: true,
      rootDir: 'D:\\Workspace\\xenesis-desk',
      selectedPath: 'D:\\Workspace\\xenesis-desk\\src',
      selectedIsDir: true,
    },
  });
});

test('CR workflow run requires external approval before executing steps', async () => {
  let statusCalls = 0;
  const api = {
    status: () => {
      statusCalls += 1;
      return { bridge: 'ok' };
    },
  };
  const args = {
    name: 'approval-check',
    steps: [{ path: 'xd.app.status' }],
  };

  const blocked = await callDeskBridgeCapability(api, {
    path: 'xd.automation.workflow.run',
    args,
    source: 'xenesis',
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.approvalRequired, true);
  assert.match(blocked.error || '', /requires approval/i);
  assert.equal(statusCalls, 0);

  const approved = await callDeskBridgeCapability(api, {
    path: 'xd.automation.workflow.run',
    args,
    source: 'xenesis',
    approved: true,
  });

  assert.equal(approved.ok, true);
  assert.equal(statusCalls, 1);
});

test('Xenesis TUI is exposed and executed through the Capability Registry', async () => {
  const node = listDeskBridgeCapabilities().find((item) => item.path === XENESIS_TUI_CAPABILITY_PATH);
  assert.ok(node);
  assert.equal(node.label, 'Open Xenesis TUI');
  assert.equal(node.permission, 'execute');
  assert.equal(node.approval, 'when-external');
  assert.equal(node.callable, true);

  const blocked = await callDeskBridgeCapability(undefined, {
    path: XENESIS_TUI_CAPABILITY_PATH,
    args: { cwd: 'D:\\Workspace\\xenesis-desk', shell: 'powershell' },
    source: 'xenesis',
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.approvalRequired, true);

  let launchArgs: Record<string, unknown> | undefined;
  const approved = await callDeskBridgeCapability(
    {
      openXenesisTui: (args) => {
        launchArgs = args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
        return { ok: true, id: 'term-xenesis-tui' };
      },
    },
    {
      path: XENESIS_TUI_CAPABILITY_PATH,
      args: {
        cwd: 'D:\\Workspace\\xenesis-desk',
        shell: 'powershell',
        placement: 'bottom',
      },
      source: 'xenesis',
      approved: true,
    },
  );

  assert.equal(approved.ok, true);
  assert.deepEqual(launchArgs, {
    cwd: 'D:\\Workspace\\xenesis-desk',
    shell: 'powershell',
    placement: 'bottom',
  });
});
