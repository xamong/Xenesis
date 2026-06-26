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
});
