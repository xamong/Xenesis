import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildEditMenuItems, type EditCommand, type EditCommandState } from './editCommandModel';

export interface EditContextMenuProps {
  x: number;
  y: number;
  state: EditCommandState;
  includeSave: boolean;
  onRun(command: EditCommand): void;
  onClose(): void;
}

export function EditContextMenu({ x, y, state, includeSave, onRun, onClose }: EditContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const items = useMemo(() => buildEditMenuItems(state, { includeSave }), [includeSave, state]);

  useEffect(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setPos({
      x: Math.max(4, Math.min(x, window.innerWidth - box.width - 4)),
      y: Math.max(4, Math.min(y, window.innerHeight - box.height - 4)),
    });
  }, [x, y]);

  useEffect(() => {
    const closeIfOutside = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    const close = () => onClose();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', closeIfOutside, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', closeIfOutside, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', key, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="xd-edit-context-menu"
      role="menu"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.command}
          type="button"
          className="xd-edit-context-menu-item"
          role="menuitem"
          disabled={item.disabled}
          aria-disabled={item.disabled}
          onClick={() => {
            if (!item.disabled) onRun(item.command);
          }}
        >
          <span>{item.label}</span>
          <kbd className="xd-edit-context-menu-shortcut">{item.shortcut}</kbd>
        </button>
      ))}
    </div>,
    document.body,
  );
}
