import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type ContextMenuItem =
  | { kind: 'action'; label: string; action: () => void; disabled?: boolean; icon?: string }
  | { kind: 'submenu'; label: string; icon?: string; items: ContextMenuItem[] }
  | { kind: 'divider' };

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

// ── 서브메뉴 컴포넌트 ─────────────────────────────────────────────────────────

interface SubMenuProps {
  items: ContextMenuItem[];
  parentRect: DOMRect;
  onClose: () => void;
}

function SubMenu({ items, parentRect, onClose }: SubMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: parentRect.right, y: parentRect.top });

  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let x = parentRect.right;
    let y = parentRect.top;
    if (x + r.width > window.innerWidth) x = parentRect.left - r.width;
    if (y + r.height > window.innerHeight) y = window.innerHeight - r.height - 4;
    setPos({ x, y });
  }, [parentRect]);

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 10001 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => renderItem(item, i, onClose))}
    </div>
  );
}

// ── 개별 항목 렌더 ───────────────────────────────────────────────────────────

function renderItem(item: ContextMenuItem, key: number, onClose: () => void): React.ReactNode {
  if (item.kind === 'divider') {
    return <div key={key} className="ctx-menu-divider" />;
  }

  if (item.kind === 'submenu') {
    return <SubMenuItem key={key} item={item} onClose={onClose} />;
  }

  return (
    <button
      key={key}
      className={`ctx-menu-item${item.disabled ? ' is-disabled' : ''}`}
      disabled={item.disabled}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (!item.disabled) {
          item.action();
          onClose();
        }
      }}
    >
      {item.icon && <span className="ctx-menu-icon">{item.icon}</span>}
      <span className="ctx-menu-label">{item.label}</span>
    </button>
  );
}

// ── 서브메뉴 트리거 항목 ──────────────────────────────────────────────────────

interface SubMenuItemProps {
  item: Extract<ContextMenuItem, { kind: 'submenu' }>;
  onClose: () => void;
}

function SubMenuItem({ item, onClose }: SubMenuItemProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={ref}
      className="ctx-menu-item ctx-menu-item--submenu"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {item.icon && <span className="ctx-menu-icon">{item.icon}</span>}
      <span className="ctx-menu-label">{item.label}</span>
      <span className="ctx-menu-arrow">▸</span>
      {open && ref.current && (
        <SubMenu items={item.items} parentRect={ref.current.getBoundingClientRect()} onClose={onClose} />
      )}
    </button>
  );
}

// ── 메인 ContextMenu 컴포넌트 ─────────────────────────────────────────────────

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // 화면 경계 체크
  useEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (nx + r.width > window.innerWidth) nx = window.innerWidth - r.width - 4;
    if (ny + r.height > window.innerHeight) ny = window.innerHeight - r.height - 4;
    if (nx < 0) nx = 4;
    if (ny < 0) ny = 4;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  // 외부 클릭 / ESC / 오른쪽 클릭 → 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onCtx = () => onClose();
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('contextmenu', onCtx, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('contextmenu', onCtx, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className="ctx-menu"
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 10000 }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => renderItem(item, i, onClose))}
    </div>,
    document.body,
  );
}

// ── 훅: 컨텍스트 메뉴 상태 관리 헬퍼 ────────────────────────────────────────

export interface CtxMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export function useContextMenu() {
  const [menu, setMenu] = useState<CtxMenuState | null>(null);

  const open = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const close = useCallback(() => setMenu(null), []);

  return { menu, open, close };
}
