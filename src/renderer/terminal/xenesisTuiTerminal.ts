import type { ShellDescriptor, ShellKind } from '../../shared/types';

const XENESIS_TUI_WINDOWS_SHELL_PREFERENCE: ShellKind[] = ['pwsh', 'powershell', 'cmd'];

export function selectXenesisTuiShell(shells: ShellDescriptor[], defaultShell: ShellKind): ShellKind {
  for (const shell of XENESIS_TUI_WINDOWS_SHELL_PREFERENCE) {
    const descriptor = shells.find((item) => item.kind === shell);
    if (descriptor?.available) return shell;
  }
  return defaultShell;
}
