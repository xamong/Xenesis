export type EditCommand = 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll' | 'save';

export type EditableSurfaceKind = 'codemirror' | 'textarea' | 'contenteditable' | 'preview' | 'webview';

export type EditCommandState = Record<EditCommand, boolean>;

export interface EditableSurfaceAdapter {
  id: string;
  label: string;
  kind: EditableSurfaceKind;
  getState(): EditCommandState;
  run(command: EditCommand): Promise<boolean> | boolean;
}

export interface EditMenuItemModel {
  command: EditCommand;
  label: string;
  shortcut: string;
  disabled: boolean;
}

export interface EditShortcutEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

const EDIT_COMMAND_LABELS: Record<EditCommand, string> = {
  undo: 'Undo',
  redo: 'Redo',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  selectAll: 'Select All',
  save: 'Save',
};

const EDIT_COMMAND_ORDER: EditCommand[] = ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll', 'save'];

function defaultIsMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toLowerCase().includes('mac');
}

export function createDefaultEditCommandState(): EditCommandState {
  return {
    undo: false,
    redo: false,
    cut: false,
    copy: false,
    paste: false,
    selectAll: false,
    save: false,
  };
}

export function resolveEditShortcut(event: EditShortcutEventLike): EditCommand | null {
  if (event.altKey) return null;
  if (!event.ctrlKey && !event.metaKey) return null;

  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  if (key === 'y') return 'redo';
  if (key === 'x') return 'cut';
  if (key === 'c') return 'copy';
  if (key === 'v') return 'paste';
  if (key === 'a') return 'selectAll';
  if (key === 's') return 'save';
  return null;
}

export function editShortcutLabel(command: EditCommand, isMac = defaultIsMac()): string {
  const mod = isMac ? '⌘' : 'Ctrl+';
  switch (command) {
    case 'undo':
      return `${mod}Z`;
    case 'redo':
      return isMac ? '⌘⇧Z' : 'Ctrl+Shift+Z';
    case 'cut':
      return `${mod}X`;
    case 'copy':
      return `${mod}C`;
    case 'paste':
      return `${mod}V`;
    case 'selectAll':
      return `${mod}A`;
    case 'save':
      return `${mod}S`;
  }
}

export function buildEditMenuItems(
  state: EditCommandState,
  options: { includeSave: boolean; isMac?: boolean },
): EditMenuItemModel[] {
  return EDIT_COMMAND_ORDER.filter((command) => command !== 'save' || options.includeSave).map((command) => ({
    command,
    label: EDIT_COMMAND_LABELS[command],
    shortcut: editShortcutLabel(command, options.isMac),
    disabled: !state[command],
  }));
}
