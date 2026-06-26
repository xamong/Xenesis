import assert from 'node:assert/strict';
import test from 'node:test';

import type { ShellDescriptor } from '../../shared/types';
import { selectXenesisTuiShell } from './xenesisTuiTerminal';

const shells: ShellDescriptor[] = [
  { kind: 'powershell', label: 'Windows PowerShell', command: 'powershell.exe', available: true },
  { kind: 'cmd', label: 'Command Prompt', command: 'cmd.exe', available: true },
  { kind: 'pwsh', label: 'PowerShell 7+', command: 'pwsh.exe', available: false },
  { kind: 'wsl', label: 'WSL', command: 'wsl.exe', available: true },
];

test('selectXenesisTuiShell prefers an available Windows shell for the npm-linked command', () => {
  assert.equal(selectXenesisTuiShell(shells, 'wsl'), 'powershell');
});

test('selectXenesisTuiShell falls back to cmd when PowerShell shells are unavailable', () => {
  const cmdOnly = shells.map((shell) => ({
    ...shell,
    available: shell.kind === 'cmd',
  }));

  assert.equal(selectXenesisTuiShell(cmdOnly, 'wsl'), 'cmd');
});

test('selectXenesisTuiShell falls back to the default shell when no Windows shell is available', () => {
  const unavailable = shells.map((shell) => ({
    ...shell,
    available: false,
  }));

  assert.equal(selectXenesisTuiShell(unavailable, 'bash'), 'bash');
});
