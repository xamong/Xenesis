import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXTERNAL_APP_ACTIONS,
  type ExternalAppAction,
  type ExternalAppActionResult,
} from '../../shared/externalAppControl';
import type { AppControlAdapter } from './appControlAdapter';
import { __appControlServiceTestInternals, createAppControlService } from './appControlService';
import type { WindowsAppControlAdapter } from './windowsAppControl';

function okResult(action: ExternalAppActionResult['action']): ExternalAppActionResult {
  return {
    ok: true,
    action,
    approvalLevel: 'medium',
    windows: [],
    message: `${action} ok`,
  };
}

const adapter: WindowsAppControlAdapter = {
  launch: async () => okResult('launch'),
  find: async () => okResult('find'),
  status: async () => okResult('status'),
  focus: async () => okResult('focus'),
  resize: async () => okResult('resize'),
  typeText: async () => okResult('typeText'),
  hotkey: async () => okResult('hotkey'),
  close: async () => okResult('close'),
  click: async () => okResult('click'),
  doubleClick: async () => okResult('doubleClick'),
  tripleClick: async () => okResult('tripleClick'),
  middleClick: async () => okResult('middleClick'),
  rightClick: async () => okResult('rightClick'),
  move: async () => okResult('move'),
  mouseDown: async () => okResult('mouseDown'),
  mouseUp: async () => okResult('mouseUp'),
  dragAndDrop: async () => okResult('dragAndDrop'),
  screenshot: async () => okResult('screenshot'),
  inspect: async () => okResult('inspect'),
  elementFromPoint: async () => okResult('elementFromPoint'),
  tree: async () => okResult('tree'),
  menuExplore: async () => okResult('menuExplore'),
  highlight: async () => okResult('highlight'),
  captureElement: async () => okResult('captureElement'),
};

test('app control service defaults to built-in settings for status readback', async () => {
  const service = createAppControlService({
    adapter,
  });

  const result = await service.run({ action: 'status' });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'status');
  assert.equal(
    result.profiles?.some((profile) => profile.id === 'notepad'),
    true,
  );
});

test('app control service honors profile approval level', async () => {
  const service = createAppControlService({
    adapter,
    getSettings: () => ({
      enabled: true,
      profiles: [
        {
          id: 'powershell',
          label: 'PowerShell',
          platform: 'windows',
          executable: 'powershell.exe',
          allowedActions: ['launch', 'status'],
          approvalLevel: 'high',
          enabled: true,
        },
      ],
    }),
  });

  const launchResult = await service.run({ action: 'launch', appId: 'powershell' });
  const statusResult = await service.run({ action: 'status', appId: 'powershell' });

  assert.equal(launchResult.approvalLevel, 'high');
  assert.equal(statusResult.approvalLevel, 'high');
  assert.deepEqual(statusResult.policy, {
    approval: 'never',
    reason: 'External app action allowed: status',
  });
});

test('app control service blocks disabled KakaoTalk profile before adapter execution', async () => {
  let called = false;
  const service = createAppControlService({
    getSettings: () => ({
      enabled: true,
      profiles: [
        {
          id: 'kakaotalk',
          label: 'KakaoTalk',
          platform: 'windows',
          executable: 'KakaoTalk.exe',
          allowedActions: ['launch', 'focus', 'resize', 'status', 'find'],
          approvalLevel: 'high',
          enabled: false,
        },
      ],
    }),
    adapter: {
      ...adapter,
      launch: async () => {
        called = true;
        return okResult('launch');
      },
    },
  });

  const result = await service.run({ action: 'launch', appId: 'kakaotalk' });

  assert.equal(result.ok, false);
  assert.equal(result.approvalLevel, 'high');
  assert.equal(result.error, 'External app profile is disabled: kakaotalk');
  assert.equal(called, false);
});

test('app control service blocks unknown app ids before adapter execution', async () => {
  let called = false;
  const service = createAppControlService({
    getSettings: () => ({ enabled: true, profiles: [] }),
    adapter: {
      ...adapter,
      focus: async () => {
        called = true;
        return okResult('focus');
      },
    },
  });

  const result = await service.run({ action: 'focus', appId: 'missing-app' });

  assert.equal(result.ok, false);
  assert.equal(result.approvalLevel, 'high');
  assert.equal(result.error, 'External app profile not found: missing-app');
  assert.equal(called, false);
});

test('app control service blocks disallowed keyboard actions before adapter execution', async () => {
  let called = false;
  const service = createAppControlService({
    getSettings: () => ({
      enabled: true,
      profiles: [
        {
          id: 'notes',
          label: 'Notes',
          platform: 'windows',
          executable: 'notes.exe',
          allowedActions: ['launch', 'status', 'find'],
          approvalLevel: 'low',
          enabled: true,
        },
      ],
    }),
    adapter: {
      ...adapter,
      typeText: async () => {
        called = true;
        return okResult('typeText');
      },
    },
  });

  const result = await service.run({ action: 'typeText', appId: 'notes', text: 'x'.repeat(5001) });

  assert.equal(result.ok, false);
  assert.equal(result.approvalLevel, 'high');
  assert.equal(result.error, 'External app action is not allowed for notes: typeText');
  assert.equal(called, false);
});

test('app control service attaches policy audit metadata to successful results', async () => {
  const service = createAppControlService({
    adapter,
    getSettings: () => ({
      enabled: true,
      profiles: [
        {
          id: 'custom-editor',
          label: 'Custom Editor',
          platform: 'windows',
          executable: 'C:\\Tools\\editor.exe',
          allowedActions: ['launch', 'focus', 'status', 'find'],
          approvalLevel: 'medium',
          enabled: true,
        },
      ],
    }),
  });

  const result = await service.run({ action: 'focus', appId: 'notepad' });

  assert.equal(result.approvalLevel, 'medium');
  assert.deepEqual(result.policy, {
    approval: 'never',
    reason: 'External app action allowed: focus',
  });
});

test('app control service marks arbitrary path keyboard actions as high-risk always-approval', async () => {
  const inputs: unknown[] = [];
  const service = createAppControlService({
    getSettings: () => ({ enabled: true, profiles: [] }),
    adapter: {
      ...adapter,
      typeText: async (input) => {
        inputs.push(input);
        return okResult('typeText');
      },
    },
  });

  const result = await service.run({ action: 'typeText', path: 'C:\\Tools\\editor.exe', text: 'hello' });

  assert.equal(result.ok, true);
  assert.equal(result.approvalLevel, 'high');
  assert.deepEqual(result.policy, {
    approval: 'always',
    reason: 'External app action allowed: typeText',
  });
  assert.deepEqual(inputs, [
    {
      executable: 'C:\\Tools\\editor.exe',
      processName: undefined,
      titleContains: undefined,
      windowId: undefined,
      text: 'hello',
    },
  ]);
});

test('app control service applies launch placement after the app opens', async () => {
  const resizeInputs: unknown[] = [];
  const service = createAppControlService({
    getSettings: () => ({ enabled: true, profiles: [] }),
    adapter: {
      ...adapter,
      launch: async () => ({
        ok: true,
        action: 'launch',
        approvalLevel: 'medium',
        processId: 123,
        windows: [{ windowId: '1001', processId: 123, title: 'Untitled - Notepad' }],
        message: 'launch ok',
      }),
      resize: async (input) => {
        resizeInputs.push(input);
        return {
          ok: true,
          action: 'resize',
          approvalLevel: 'low',
          windows: [
            {
              windowId: '1001',
              processId: 123,
              title: 'Untitled - Notepad',
              bounds: { x: 20, y: 30, width: 800, height: 600 },
            },
          ],
          message: 'resize ok',
        };
      },
    },
  });

  const result = await service.run({
    action: 'launch',
    appId: 'notepad',
    placement: { x: 20, y: 30, width: 800, height: 600 },
  });

  assert.equal(result.ok, true);
  assert.equal(result.message, 'External app launched and placed.');
  assert.deepEqual(resizeInputs, [
    {
      executable: 'notepad.exe',
      processName: undefined,
      titleContains: undefined,
      windowId: '1001',
      x: 20,
      y: 30,
      width: 800,
      height: 600,
    },
  ]);
  assert.deepEqual(result.windows[0]?.bounds, { x: 20, y: 30, width: 800, height: 600 });
});

test('app control service passes macOS profile bundleId to the adapter', async () => {
  const calls: unknown[] = [];
  const routeAdapter: AppControlAdapter = {
    ...adapter,
    status: async (input) => {
      calls.push(input);
      return okResult('status');
    },
  };
  const service = createAppControlService({
    adapter: routeAdapter,
    getSettings: () => ({
      enabled: true,
      profiles: [
        {
          id: 'textedit',
          label: 'TextEdit',
          platform: 'macos',
          bundleId: 'com.apple.TextEdit',
          executable: '/Applications/TextEdit.app',
          allowedActions: ['status'],
          approvalLevel: 'medium',
          enabled: true,
        },
      ],
    }),
  });

  const result = await service.run({ action: 'status', appId: 'textedit' });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    {
      executable: '/Applications/TextEdit.app',
      bundleId: 'com.apple.TextEdit',
      processName: undefined,
      titleContains: undefined,
      windowId: undefined,
    },
  ]);
});

test('app control service routes pointer drag and screenshot actions to the adapter', async () => {
  const calls: unknown[] = [];
  const routeAdapter: WindowsAppControlAdapter = {
    ...adapter,
    click: async (input) => {
      calls.push({ method: 'click', input });
      return okResult('click');
    },
    dragAndDrop: async (input) => {
      calls.push({ method: 'dragAndDrop', input });
      return okResult('dragAndDrop');
    },
    screenshot: async (input) => {
      calls.push({ method: 'screenshot', input });
      return okResult('screenshot');
    },
  };
  const service = createAppControlService({
    adapter: routeAdapter,
    getSettings: () => ({ enabled: true, profiles: [] }),
  });

  await service.run({ action: 'click', appId: 'notepad', windowId: '1001', x: 10, y: 20 });
  await service.run({
    action: 'dragAndDrop',
    appId: 'notepad',
    windowId: '1001',
    startX: 10,
    startY: 20,
    endX: 110,
    endY: 120,
  });
  await service.run({
    action: 'screenshot',
    appId: 'notepad',
    windowId: '1001',
    screenshotPath: 'C:\\Temp\\notepad.png',
  });

  assert.deepEqual(calls, [
    {
      method: 'click',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: '1001',
        x: 10,
        y: 20,
      },
    },
    {
      method: 'dragAndDrop',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: '1001',
        startX: 10,
        startY: 20,
        endX: 110,
        endY: 120,
      },
    },
    {
      method: 'screenshot',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: '1001',
        screenshotPath: 'C:\\Temp\\notepad.png',
      },
    },
  ]);
});

test('app control service routes observation actions to the adapter', async () => {
  const calls: unknown[] = [];
  const routeAdapter: WindowsAppControlAdapter = {
    ...adapter,
    inspect: async (input) => {
      calls.push({ method: 'inspect', input });
      return okResult('inspect');
    },
    elementFromPoint: async (input) => {
      calls.push({ method: 'elementFromPoint', input });
      return okResult('elementFromPoint');
    },
    tree: async (input) => {
      calls.push({ method: 'tree', input });
      return okResult('tree');
    },
    menuExplore: async (input) => {
      calls.push({ method: 'menuExplore', input });
      return okResult('menuExplore');
    },
    highlight: async (input) => {
      calls.push({ method: 'highlight', input });
      return okResult('highlight');
    },
    captureElement: async (input) => {
      calls.push({ method: 'captureElement', input });
      return okResult('captureElement');
    },
  };
  const service = createAppControlService({
    adapter: routeAdapter,
    getSettings: () => ({ enabled: true, profiles: [] }),
  });

  const inspectResult = await service.run({
    action: 'inspect',
    appId: 'notepad',
    windowId: '1001',
    includeTreePreview: true,
  });
  await service.run({ action: 'elementFromPoint', appId: 'notepad', windowId: '1001', x: 10, y: 20 });
  await service.run({
    action: 'tree',
    appId: 'notepad',
    windowId: '1001',
    depth: 3,
    limit: 50,
    includeValues: true,
    includeFullTree: false,
  });
  await service.run({ action: 'menuExplore', appId: 'notepad', windowId: '1001', depth: 3, limit: 50 });
  await service.run({ action: 'highlight', appId: 'notepad', elementRef: 'uia:button:1', durationMs: 700 });
  await service.run({
    action: 'captureElement',
    appId: 'notepad',
    elementRef: 'uia:button:1',
    screenshotPath: 'C:\\Temp\\element.png',
  });

  assert.equal(inspectResult.ok, true);
  assert.equal(inspectResult.action, 'inspect');
  assert.equal(inspectResult.appId, 'notepad');
  assert.deepEqual(calls, [
    {
      method: 'inspect',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: '1001',
        appId: 'notepad',
        includeTreePreview: true,
      },
    },
    {
      method: 'elementFromPoint',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: '1001',
        appId: 'notepad',
        x: 10,
        y: 20,
      },
    },
    {
      method: 'tree',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: '1001',
        appId: 'notepad',
        depth: 3,
        limit: 50,
        includeValues: true,
        includeFullTree: false,
      },
    },
    {
      method: 'menuExplore',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: '1001',
        appId: 'notepad',
        depth: 3,
        limit: 50,
        includeValues: undefined,
      },
    },
    {
      method: 'highlight',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: undefined,
        appId: 'notepad',
        elementRef: 'uia:button:1',
        durationMs: 700,
      },
    },
    {
      method: 'captureElement',
      input: {
        executable: 'notepad.exe',
        processName: undefined,
        titleContains: undefined,
        windowId: undefined,
        appId: 'notepad',
        elementRef: 'uia:button:1',
        screenshotPath: 'C:\\Temp\\element.png',
      },
    },
  ]);
});

test('app control service denies profile-disallowed observation actions before adapter routing', async () => {
  let inspectCalled = false;
  const routeAdapter: WindowsAppControlAdapter = {
    ...adapter,
    inspect: async () => {
      inspectCalled = true;
      return okResult('inspect');
    },
  };
  const service = createAppControlService({
    adapter: routeAdapter,
    getSettings: () => ({
      enabled: true,
      profiles: [
        {
          id: 'locked',
          label: 'Locked App',
          platform: 'windows',
          executable: 'locked.exe',
          allowedActions: ['status'],
          approvalLevel: 'high',
          enabled: true,
        },
      ],
    }),
  });

  const result = await service.run({ action: 'inspect', appId: 'locked', includeTreePreview: true });

  assert.equal(inspectCalled, false);
  assert.equal(result.ok, false);
  assert.equal(result.action, 'inspect');
  assert.equal(result.approvalLevel, 'high');
  assert.match(result.error || '', /not allowed/i);
});

test('app control service fails closed for unrouted normalized actions without closing', async () => {
  let closeCalled = false;
  const routeAdapter: WindowsAppControlAdapter = {
    ...adapter,
    close: async () => {
      closeCalled = true;
      return okResult('close');
    },
  };

  const result = await __appControlServiceTestInternals.runAdapterAction(
    routeAdapter,
    {
      action: 'futureAction',
      appId: 'notepad',
      windowId: '1001',
    } as unknown as ExternalAppAction,
    { executable: 'notepad.exe' },
    'medium',
  );

  assert.equal(closeCalled, false);
  assert.equal(result.ok, false);
  assert.equal(result.action, 'futureAction');
  assert.equal(result.code, 'unsupported_action');
  assert.match(result.error || '', /not routed/i);
});

test('app control service returns profile status readback without a target or adapter execution', async () => {
  let called = false;
  const service = createAppControlService({
    getSettings: () => ({
      enabled: true,
      profiles: [
        {
          id: 'custom-editor',
          label: 'Custom Editor',
          platform: 'windows',
          executable: 'C:\\Tools\\editor.exe',
          allowedActions: ['launch', 'focus', 'status', 'find'],
          approvalLevel: 'medium',
          enabled: true,
        },
        {
          id: 'kakaotalk',
          label: 'KakaoTalk',
          platform: 'windows',
          executable: 'KakaoTalk.exe',
          allowedActions: ['launch', 'focus', 'resize', 'status', 'find'],
          approvalLevel: 'high',
          enabled: false,
        },
      ],
    }),
    adapter: {
      ...adapter,
      status: async () => {
        called = true;
        return okResult('status');
      },
    },
  });

  const result = await service.run({ action: 'status' });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'status');
  assert.equal(result.approvalLevel, 'low');
  assert.equal(called, false);
  assert.deepEqual(result.windows, []);
  assert.deepEqual(result.profiles, [
    {
      id: 'notepad',
      label: 'Notepad',
      enabled: true,
      approvalLevel: 'medium',
      allowedActions: EXTERNAL_APP_ACTIONS,
    },
    {
      id: 'custom-editor',
      label: 'Custom Editor',
      enabled: true,
      approvalLevel: 'medium',
      allowedActions: ['launch', 'focus', 'status', 'find'],
    },
    {
      id: 'kakaotalk',
      label: 'KakaoTalk',
      enabled: false,
      approvalLevel: 'high',
      allowedActions: ['launch', 'focus', 'resize', 'status', 'find'],
    },
  ]);
});

test('app control service returns profile status readback when app control is disabled', async () => {
  let called = false;
  const service = createAppControlService({
    getSettings: () => ({
      enabled: false,
      profiles: [
        {
          id: 'custom-editor',
          label: 'Custom Editor',
          platform: 'windows',
          executable: 'C:\\Tools\\editor.exe',
          allowedActions: ['launch', 'status', 'find'],
          approvalLevel: 'medium',
          enabled: true,
        },
      ],
    }),
    adapter: {
      ...adapter,
      status: async () => {
        called = true;
        return okResult('status');
      },
    },
  });

  const result = await service.run({ action: 'status' });

  assert.equal(result.ok, true);
  assert.equal(result.controlEnabled, false);
  assert.equal(called, false);
  assert.deepEqual(result.policy, {
    approval: 'never',
    reason: 'External app profile status readback.',
  });
  assert.deepEqual(
    result.profiles?.map((profile) => profile.id),
    ['notepad', 'custom-editor'],
  );
});

test('app control service preserves action risk when app control is disabled', async () => {
  const service = createAppControlService({
    getSettings: () => ({ enabled: false, profiles: [] }),
    adapter,
  });

  const result = await service.run({ action: 'launch', path: 'C:\\Tools\\tool.exe' });

  assert.equal(result.ok, false);
  assert.equal(result.approvalLevel, 'high');
  assert.equal(result.error, 'External app control is disabled.');
});

test('app control service forwards targeted window status to the adapter', async () => {
  const statusInputs: unknown[] = [];
  const service = createAppControlService({
    getSettings: () => ({ enabled: true, profiles: [] }),
    adapter: {
      ...adapter,
      status: async (input) => {
        statusInputs.push(input);
        return {
          ok: true,
          action: 'status',
          approvalLevel: 'low',
          windows: [{ windowId: '1001', title: 'Untitled - Notepad' }],
          message: 'status ok',
        };
      },
    },
  });

  const result = await service.run({ action: 'status', windowId: '1001' });

  assert.equal(result.ok, true);
  assert.equal(result.policy?.approval, 'never');
  assert.deepEqual(statusInputs, [
    { executable: '', processName: undefined, titleContains: undefined, windowId: '1001' },
  ]);
});
