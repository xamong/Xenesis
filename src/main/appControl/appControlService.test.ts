import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExternalAppActionResult } from '../../shared/externalAppControl';
import { createAppControlService } from './appControlService';
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
};

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
      allowedActions: ['launch', 'focus', 'resize', 'typeText', 'hotkey', 'close', 'status', 'find'],
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
