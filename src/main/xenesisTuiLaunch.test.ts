import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { buildElectronRunAsNodeCommand, buildXenesisTuiTerminalRequest } from './xenesisTuiLaunch';

test('buildElectronRunAsNodeCommand wraps a packaged Electron runtime for shell startup', () => {
  const command = buildElectronRunAsNodeCommand({
    execPath: 'C:\\Program Files\\Xenesis Desk\\Xenesis Desk.exe',
    entrypoint:
      'C:\\Program Files\\Xenesis Desk\\resources\\app.asar.unpacked\\node_modules\\xenesis\\dist\\cli\\main.js',
    args: ['tui', '--cwd', '.'],
  });

  assert.equal(
    command,
    'cmd /d /s /c "set ELECTRON_RUN_AS_NODE=1&& ""C:\\Program Files\\Xenesis Desk\\Xenesis Desk.exe"" ""C:\\Program Files\\Xenesis Desk\\resources\\app.asar.unpacked\\node_modules\\xenesis\\dist\\cli\\main.js"" tui --cwd ."',
  );
});

test('buildXenesisTuiTerminalRequest uses bundled Xenesis entrypoint instead of workspace node_modules', () => {
  const runtimePath = 'C:\\Program Files\\Xenesis Desk\\resources\\app.asar.unpacked\\node_modules\\xenesis';
  const entrypoint = path.win32.join(runtimePath, 'dist', 'cli', 'main.js');

  const request = buildXenesisTuiTerminalRequest({
    args: {
      cwd: 'D:\\CodeTruck\\CodeBox\\Xamong',
      shell: 'powershell',
      placement: 'bottom',
    },
    runtimePath,
    execPath: 'C:\\Program Files\\Xenesis Desk\\Xenesis Desk.exe',
    platform: 'win32',
    existsSync: (candidate) => candidate === entrypoint,
  });

  assert.equal(request.cwd, 'D:\\CodeTruck\\CodeBox\\Xamong');
  assert.equal(request.shell, 'powershell');
  assert.equal(request.placement, 'bottom');
  assert.match(request.command, /ELECTRON_RUN_AS_NODE=1/);
  assert.match(request.command, /app\.asar\.unpacked\\node_modules\\xenesis\\dist\\cli\\main\.js/);
  assert.doesNotMatch(request.command, /\\.\\node_modules\\\.bin\\xenesis\.cmd/);
  assert.deepEqual(request.metadata, {
    kind: 'xenesis-tui',
    command: request.command,
  });
});

test('buildXenesisTuiTerminalRequest prefers PATH node.exe for interactive release TUI', () => {
  const runtimePath = 'C:\\Program Files\\Xenesis Desk\\resources\\app.asar.unpacked\\node_modules\\xenesis';
  const entrypoint = path.win32.join(runtimePath, 'dist', 'cli', 'main.js');
  const nodePath = 'C:\\Program Files\\nodejs\\node.exe';

  const request = buildXenesisTuiTerminalRequest({
    args: {
      cwd: 'F:\\Projects',
      shell: 'powershell',
    },
    runtimePath,
    execPath: 'C:\\Program Files\\Xenesis Desk\\Xenesis Desk.exe',
    env: { PATH: 'C:\\Program Files\\nodejs' },
    platform: 'win32',
    existsSync: (candidate) => candidate === entrypoint || candidate === nodePath,
  } as Parameters<typeof buildXenesisTuiTerminalRequest>[0] & { env: NodeJS.ProcessEnv });

  assert.equal(request.cwd, 'F:\\Projects');
  assert.match(request.command, /node\.exe/);
  assert.match(request.command, /app\.asar\.unpacked\\node_modules\\xenesis\\dist\\cli\\main\.js/);
  assert.doesNotMatch(request.command, /ELECTRON_RUN_AS_NODE=1/);
});
