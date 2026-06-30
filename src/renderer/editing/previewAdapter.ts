import { createDefaultEditCommandState, type EditableSurfaceAdapter } from './editCommandModel';

export interface PreviewAdapterOptions {
  id: string;
  label: string;
  getElement(): HTMLElement | null;
}

function selectedTextInside(element: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return '';
  const anchor = selection.anchorNode;
  const focus = selection.focusNode;
  if (!anchor || !focus) return '';
  if (!element.contains(anchor) || !element.contains(focus)) return '';
  return selection.toString();
}

export function createPreviewAdapter(options: PreviewAdapterOptions): EditableSurfaceAdapter {
  return {
    id: options.id,
    label: options.label,
    kind: 'preview',
    getState() {
      const element = options.getElement();
      const state = createDefaultEditCommandState();
      if (!element) return state;
      state.copy = selectedTextInside(element).length > 0;
      state.selectAll = Boolean(element.textContent?.length);
      return state;
    },
    async run(command) {
      const element = options.getElement();
      if (!element) return false;
      if (command === 'selectAll') {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return true;
      }
      if (command === 'copy') {
        const text = selectedTextInside(element);
        if (!text) return false;
        try {
          await navigator.clipboard?.writeText?.(text);
          return true;
        } catch {
          return document.execCommand('copy');
        }
      }
      return false;
    },
  };
}
