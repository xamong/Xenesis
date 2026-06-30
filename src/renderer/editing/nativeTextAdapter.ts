import { createDefaultEditCommandState, type EditableSurfaceAdapter, type EditCommandState } from './editCommandModel';

export interface TextSelectionSnapshot {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface NativeTextAdapterOptions {
  id: string;
  label: string;
  getElement(): HTMLInputElement | HTMLTextAreaElement | null;
  canSave?: () => boolean;
  onSave?: () => Promise<void> | void;
}

export function textSelectionHasSelection(snapshot: TextSelectionSnapshot): boolean {
  return snapshot.selectionEnd > snapshot.selectionStart;
}

export function replaceTextSelection(snapshot: TextSelectionSnapshot, insert: string): TextSelectionSnapshot {
  const before = snapshot.value.slice(0, snapshot.selectionStart);
  const after = snapshot.value.slice(snapshot.selectionEnd);
  const nextCaret = before.length + insert.length;
  return {
    value: `${before}${insert}${after}`,
    selectionStart: nextCaret,
    selectionEnd: nextCaret,
  };
}

export function createTextSelectionState(options: {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  readOnly: boolean;
  disabled: boolean;
  canSave: boolean;
}): EditCommandState {
  const editable = !options.readOnly && !options.disabled;
  const hasSelection = options.selectionEnd > options.selectionStart;
  return {
    undo: editable,
    redo: editable,
    cut: editable && hasSelection,
    copy: hasSelection,
    paste: editable,
    selectAll: options.value.length > 0,
    save: editable && options.canSave,
  };
}

function selectionSnapshot(element: HTMLInputElement | HTMLTextAreaElement): TextSelectionSnapshot {
  return {
    value: element.value,
    selectionStart: element.selectionStart ?? 0,
    selectionEnd: element.selectionEnd ?? 0,
  };
}

async function readClipboardText(): Promise<string> {
  try {
    return (await navigator.clipboard?.readText?.()) || '';
  } catch {
    return '';
  }
}

async function writeClipboardText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText?.(text);
    return true;
  } catch {
    return document.execCommand('copy');
  }
}

export function createNativeTextAdapter(options: NativeTextAdapterOptions): EditableSurfaceAdapter {
  return {
    id: options.id,
    label: options.label,
    kind: 'textarea',
    getState() {
      const element = options.getElement();
      if (!element) return createDefaultEditCommandState();
      return createTextSelectionState({
        ...selectionSnapshot(element),
        readOnly: element.readOnly,
        disabled: element.disabled,
        canSave: Boolean(options.canSave?.()),
      });
    },
    async run(command) {
      const element = options.getElement();
      if (!element) return false;
      if (command === 'save') {
        if (!options.canSave?.() || !options.onSave) return false;
        await options.onSave();
        return true;
      }
      if (command === 'selectAll') {
        element.select();
        return true;
      }
      if (command === 'copy' || command === 'cut') {
        const snapshot = selectionSnapshot(element);
        if (!textSelectionHasSelection(snapshot)) return false;
        const selected = snapshot.value.slice(snapshot.selectionStart, snapshot.selectionEnd);
        const copied = await writeClipboardText(selected);
        if (command === 'cut' && copied && !element.readOnly && !element.disabled) {
          const next = replaceTextSelection(snapshot, '');
          element.value = next.value;
          element.setSelectionRange(next.selectionStart, next.selectionEnd);
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return copied;
      }
      if (command === 'paste') {
        if (element.readOnly || element.disabled) return false;
        const text = await readClipboardText();
        const next = replaceTextSelection(selectionSnapshot(element), text);
        element.value = next.value;
        element.setSelectionRange(next.selectionStart, next.selectionEnd);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return document.execCommand(command);
    },
  };
}
