import assert from 'node:assert/strict';
import test from 'node:test';
import { createWindowsAppControlAdapter } from './windowsAppControl';

test('Windows adapter launches an executable through PowerShell', async () => {
  const commands: string[] = [];
  const adapter = createWindowsAppControlAdapter({
    runPowerShell: async (script) => {
      commands.push(script);
      return JSON.stringify({ ok: true, action: 'launch', processId: 123, windows: [] });
    },
  });

  const result = await adapter.launch({ executable: 'notepad.exe', args: [], cwd: '' });

  assert.equal(result.ok, true);
  assert.equal(result.processId, 123);
  assert.match(commands[0] || '', /Start-Process/);
  assert.match(commands[0] || '', /notepad\.exe/);
});

test('Windows adapter normalizes invalid JSON as a failed result', async () => {
  const adapter = createWindowsAppControlAdapter({
    runPowerShell: async () => 'not json',
  });

  const result = await adapter.status({ executable: 'notepad.exe' });

  assert.equal(result.ok, false);
  assert.match(result.error || '', /PowerShell returned non-JSON output/i);
});

test('Windows adapter builds focus resize and keyboard scripts', async () => {
  const commands: string[] = [];
  const adapter = createWindowsAppControlAdapter({
    runPowerShell: async (script) => {
      commands.push(script);
      return JSON.stringify({
        ok: true,
        action: 'status',
        windows: [{ windowId: '1001', title: 'Untitled - Notepad' }],
      });
    },
  });

  await adapter.focus({ windowId: '1001' });
  await adapter.resize({ windowId: '1001', x: 10, y: 20, width: 800, height: 600 });
  await adapter.typeText({ windowId: '1001', text: 'hello' });
  await adapter.hotkey({ windowId: '1001', keys: ['CTRL', 'S'] });

  assert.match(commands[0] || '', /SetForegroundWindow/);
  assert.match(commands[1] || '', /MoveWindow/);
  assert.match(commands[1] || '', /800/);
  assert.match(commands[2] || '', /SendKeys/);
  assert.match(commands[3] || '', /SendKeys/);
  assert.match(commands[3] || '', /\^s/i);
});

test('Windows adapter status can target a specific window id', async () => {
  const commands: string[] = [];
  const adapter = createWindowsAppControlAdapter({
    runPowerShell: async (script) => {
      commands.push(script);
      return JSON.stringify({
        ok: true,
        action: 'status',
        windows: [{ windowId: '1001', title: 'Untitled - Notepad' }],
      });
    },
  });

  await adapter.status({ windowId: '1001' });

  assert.match(commands[0] || '', /-WindowId '1001'/);
});
