import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditContextMenu } from './EditContextMenu';
import type { EditCommand } from './editCommandModel';
import { createDefaultEditCommandState, resolveEditShortcut } from './editCommandModel';
import { createNativeTextAdapter } from './nativeTextAdapter';

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'url', 'email', 'tel']);

export const SECRET_FIELD_PATTERN = /(password|secret|token|apikey|api[\s_-]?key|credential|bearer)/i;

function fieldMarker(element: HTMLInputElement | HTMLTextAreaElement): string {
  return [
    element.id,
    element.name,
    element.placeholder,
    element.getAttribute?.('aria-label'),
    element.getAttribute?.('autocomplete'),
    element.getAttribute?.('data-secret'),
    element.getAttribute?.('data-sensitive'),
  ]
    .filter(Boolean)
    .join(' ');
}

function tagNameOf(target: EventTarget | null): string {
  return String((target as { tagName?: string } | null)?.tagName ?? '').toUpperCase();
}

export function isEligibleGlobalNativeEditElement(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement {
  const tagName = tagNameOf(target);
  if (tagName !== 'INPUT' && tagName !== 'TEXTAREA') return false;

  const element = target as HTMLInputElement | HTMLTextAreaElement;
  if (element.disabled) return false;
  if (element.getAttribute?.('contenteditable') === 'true') return false;
  if (SECRET_FIELD_PATTERN.test(fieldMarker(element))) return false;

  if (tagName === 'TEXTAREA') return true;

  const input = element as HTMLInputElement;
  const type = String(input.type || 'text').toLowerCase();
  return TEXT_INPUT_TYPES.has(type);
}

export function GlobalNativeEditSurface() {
  const activeElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const adapter = useMemo(
    () =>
      createNativeTextAdapter({
        id: 'global-native-edit-surface',
        label: 'Native text field',
        getElement: () => activeElementRef.current,
      }),
    [],
  );

  const activateTarget = useCallback((target: EventTarget | null): boolean => {
    if (!isEligibleGlobalNativeEditElement(target)) return false;
    activeElementRef.current = target;
    return true;
  }, []);

  const runCommand = useCallback(
    async (command: EditCommand) => {
      await adapter.run(command);
      setMenu(null);
    },
    [adapter],
  );

  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      activateTarget(event.target);
    };
    const handlePointerDown = (event: PointerEvent) => {
      activateTarget(event.target);
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (!activateTarget(event.target)) return;
      event.preventDefault();
      setMenu({ x: event.clientX, y: event.clientY });
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!activateTarget(event.target)) return;
      const command = resolveEditShortcut(event);
      if (!command) return;
      if (!adapter.getState()[command]) return;
      event.preventDefault();
      void adapter.run(command);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activateTarget, adapter]);

  if (!menu) return null;

  return (
    <EditContextMenu
      x={menu.x}
      y={menu.y}
      state={adapter.getState() ?? createDefaultEditCommandState()}
      includeSave={false}
      onRun={runCommand}
      onClose={() => setMenu(null)}
    />
  );
}
