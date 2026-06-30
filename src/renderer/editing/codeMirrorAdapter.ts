import { redo, redoDepth, selectAll, undo, undoDepth } from '@codemirror/commands';
import type { EditorView } from '@codemirror/view';
import { createDefaultEditCommandState, type EditableSurfaceAdapter, type EditCommandState } from './editCommandModel';

export interface CodeMirrorAdapterOptions {
  id: string;
  label: string;
  getView(): EditorView | undefined;
  readOnly?: () => boolean;
  canSave?: () => boolean;
  onSave?: () => Promise<void> | void;
}

function hasSelection(view: EditorView): boolean {
  return view.state.selection.ranges.some((range) => !range.empty);
}

async function writeClipboardText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText?.(text);
    return true;
  } catch {
    return document.execCommand('copy');
  }
}

async function readClipboardText(): Promise<string> {
  try {
    return (await navigator.clipboard?.readText?.()) || '';
  } catch {
    return '';
  }
}

export function createCodeMirrorAdapter(options: CodeMirrorAdapterOptions): EditableSurfaceAdapter {
  return {
    id: options.id,
    label: options.label,
    kind: 'codemirror',
    getState(): EditCommandState {
      const view = options.getView();
      if (!view) return createDefaultEditCommandState();
      const editable = !options.readOnly?.();
      const selected = hasSelection(view);
      const hasText = view.state.doc.length > 0;
      return {
        undo: editable && undoDepth(view.state) > 0,
        redo: editable && redoDepth(view.state) > 0,
        cut: editable && selected,
        copy: selected,
        paste: editable,
        selectAll: hasText,
        save: editable && Boolean(options.canSave?.()),
      };
    },
    async run(command) {
      const view = options.getView();
      if (!view) return false;
      const editable = !options.readOnly?.();
      if (command === 'undo') return editable ? undo(view) : false;
      if (command === 'redo') return editable ? redo(view) : false;
      if (command === 'selectAll') return selectAll(view);
      if (command === 'copy' || command === 'cut') {
        const selection = view.state.selection.main;
        if (selection.empty) return false;
        const text = view.state.sliceDoc(selection.from, selection.to);
        const copied = await writeClipboardText(text);
        if (copied && command === 'cut' && editable) {
          view.dispatch({ changes: { from: selection.from, to: selection.to, insert: '' } });
        }
        return copied;
      }
      if (command === 'paste') {
        if (!editable) return false;
        const text = await readClipboardText();
        view.dispatch(view.state.replaceSelection(text));
        view.focus();
        return true;
      }
      if (command === 'save') {
        if (!options.canSave?.() || !options.onSave) return false;
        await options.onSave();
        return true;
      }
      return false;
    },
  };
}
