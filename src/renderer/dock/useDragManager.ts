// Drag & drop manager — mirrors the original DockPanel drag logic exactly.
// Operates imperatively on DOM refs; triggers engine.notify() on drop.

import { useRef } from 'react';
import type { DockDragGhostMode } from '../../shared/dockDragGhost';
import type { SiblingWindowBounds } from '../../shared/types';
import type { DetachScreenPoint } from './detachBounds';
import { resolveDragGhostPosition } from './dragGhostPosition';
import { Bounds, DockEngine, DockPane, DropPayload, PaneDropTarget, SideState } from './engine';

interface DragState {
  currentDropZone: string | null;
  currentDropTarget: PaneDropTarget | { scope: 'root'; zone: string } | null;
}

export type DetachMode = 'detach' | 'reattach' | 'merge-to-detached';

export interface DetachIntentMetadata {
  targetWindowId?: number;
  dropPoint?: DetachScreenPoint;
}

export function useDragManager(
  engine: DockEngine,
  rootRef: React.RefObject<HTMLDivElement | null>,
  dropOverlayRef: React.RefObject<HTMLDivElement | null>,
  paneDropOverlayRef: React.RefObject<HTMLDivElement | null>,
  ghostRef: React.RefObject<HTMLDivElement | null>,
  floatBoundsRef: React.MutableRefObject<Map<string, Bounds>>,
  onStatus: (msg: string) => void,
  onDetach: (payload: DropPayload, mode: DetachMode, metadata?: DetachIntentMetadata) => void,
  isDetachedWindow: boolean,
): { beginResize: (edge: SideState, event: PointerEvent) => void } {
  const stateRef = useRef<DragState>({ currentDropZone: null, currentDropTarget: null });

  // ── Splitter resize ──────────────────────────────────────────────────────────
  function beginResize(edge: SideState, event: PointerEvent): void {
    const root = rootRef.current;
    root?.classList.add('is-resizing');
    engine.beginResize(edge, event);
    const up = () => {
      root?.classList.remove('is-resizing');
      onStatus(`Resized ${edge}`);
    };
    window.addEventListener('pointerup', up, { once: true });
  }

  // ── Hit test drop zones ───────────────────────────────────────────────────────
  function hitDropZone(clientX: number, clientY: number): string | null {
    const overlay = dropOverlayRef.current;
    if (!overlay) return null;
    for (const node of overlay.querySelectorAll('.drop-zone')) {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return el.dataset.zone ?? null;
      }
    }
    return null;
  }

  function showPaneDropIndicator(target: PaneDropTarget): void {
    const rootEl = rootRef.current;
    const overlay = paneDropOverlayRef.current;
    if (!rootEl || !overlay) return;
    const rootRect = rootEl.getBoundingClientRect();
    overlay.style.left = `${target.rect.left - rootRect.left}px`;
    overlay.style.top = `${target.rect.top - rootRect.top}px`;
    overlay.style.width = `${target.rect.width}px`;
    overlay.style.height = `${target.rect.height}px`;
    overlay.classList.add('is-active');
    overlay.querySelectorAll('.pane-drop-zone').forEach((node) => {
      const el = node as HTMLElement;
      el.classList.toggle('is-hot', el.dataset.zone === target.zone);
      el.classList.toggle('is-disabled', el.dataset.zone === 'fill' && target.fillDisabled);
    });
  }

  function hidePaneDropIndicator(): void {
    const overlay = paneDropOverlayRef.current;
    if (!overlay) return;
    overlay.classList.remove('is-active');
    overlay.querySelectorAll('.pane-drop-zone').forEach((node) => {
      const el = node as HTMLElement;
      el.classList.remove('is-hot', 'is-disabled');
    });
  }

  function getPaneDropTargetAt(clientX: number, clientY: number, payload: DropPayload): PaneDropTarget | null {
    const rootEl = rootRef.current;
    if (!rootEl) return null;
    const element = document.elementFromPoint(clientX, clientY);
    const paneNode = element?.closest('.dock-pane') as HTMLElement | null;
    if (!paneNode || !rootEl.contains(paneNode)) return null;
    const targetPane = engine.panes.get(paneNode.dataset.paneId!);
    if (!targetPane || targetPane.state === 'float' || targetPane.state === 'hidden') return null;
    if (payload.type === 'pane' && payload.paneId === targetPane.id) return null;
    if (!engine.findWindowByPane(targetPane.id)) return null;

    const rect = paneNode.getBoundingClientRect();
    const x = (clientX - rect.left) / Math.max(1, rect.width);
    const y = (clientY - rect.top) / Math.max(1, rect.height);
    let zone: string | null = 'fill';
    if (x < 0.3) zone = 'left';
    else if (x > 0.7) zone = 'right';
    else if (y < 0.3) zone = 'top';
    else if (y > 0.7) zone = 'bottom';

    const sameSourcePane = payload.paneId === targetPane.id;
    const fillDisabled = sameSourcePane;
    if (zone === 'fill' && fillDisabled) zone = null;

    return {
      scope: 'pane',
      targetPaneId: targetPane.id,
      zone,
      fillDisabled,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    };
  }

  // ── ghost 시각 모드 설정 ─────────────────────────────────────────────────────
  function applyGhostMode(ghost: HTMLDivElement | null, mode: string, text: string): void {
    if (!ghost) return;
    ghost.textContent = text;
    ghost.dataset.mode = mode;
  }

  // ── 스크린 좌표가 특정 창 bounds 안에 있는지 판별 ────────────────────────────
  function isInBounds(
    sx: number,
    sy: number,
    bounds: { x: number; y: number; width: number; height: number },
  ): boolean {
    return sx >= bounds.x && sx < bounds.x + bounds.width && sy >= bounds.y && sy < bounds.y + bounds.height;
  }

  function findDetachedWindowAt(screenX: number, screenY: number, sibling: SiblingWindowBounds): number | null {
    for (const { windowId, bounds } of sibling.detachedWindows) {
      if (isInBounds(screenX, screenY, bounds)) return windowId;
    }
    return null;
  }

  // ── Core drag ─────────────────────────────────────────────────────────────────
  function beginDrag(payload: DropPayload, event: PointerEvent): void {
    event.preventDefault();
    const pointerCaptureTarget =
      event.target instanceof Element && typeof event.target.setPointerCapture === 'function' ? event.target : null;
    if (pointerCaptureTarget) {
      try {
        pointerCaptureTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture can fail if the pointer is no longer active; drag still works without it.
      }
    }
    const ds = stateRef.current;
    const start = { x: event.clientX, y: event.clientY };
    let active = false;
    let reattachStarted = false;
    let nativeDragGhostVisible = false;
    let lastScreenPoint: DetachScreenPoint = { screenX: event.screenX, screenY: event.screenY };

    // 분리 창 드래그: 시작 시 이웃 창(메인+다른 분리 창) bounds를 한 번 조회
    let siblingBounds: SiblingWindowBounds = { mainWindow: null, detachedWindows: [] };
    let lastMergeTargetId: number | null = null;

    if (isDetachedWindow && typeof window.fileAPI?.getSiblingWindowBounds === 'function') {
      window.fileAPI
        .getSiblingWindowBounds()
        .then((b) => {
          siblingBounds = b;
        })
        .catch(() => {});
    }

    const updateGhostPosition = (pointerEvent: PointerEvent): void => {
      const ghost = ghostRef.current;
      if (!ghost) return;
      const rect = ghost.getBoundingClientRect();
      const position = resolveDragGhostPosition({
        clientX: pointerEvent.clientX,
        clientY: pointerEvent.clientY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        ghostWidth: rect.width,
        ghostHeight: rect.height,
      });
      ghost.style.left = `${position.left}px`;
      ghost.style.top = `${position.top}px`;
    };

    const hideNativeDragGhost = (): void => {
      if (!nativeDragGhostVisible) return;
      nativeDragGhostVisible = false;
      window.fileAPI?.hideDockDragGhostOverlay?.().catch(() => {});
    };

    const showNativeDragGhost = (mode: DockDragGhostMode, text: string, pointerEvent: PointerEvent): void => {
      const ghost = ghostRef.current;
      applyGhostMode(ghost, mode === 'default' ? '' : mode, text);
      if (typeof window.fileAPI?.showDockDragGhostOverlay === 'function') {
        if (ghost) ghost.hidden = true;
        nativeDragGhostVisible = true;
        window.fileAPI
          .showDockDragGhostOverlay({
            label: text,
            mode,
            screenX: pointerEvent.screenX,
            screenY: pointerEvent.screenY,
          })
          .catch(() => {
            nativeDragGhostVisible = false;
            if (ghost) ghost.hidden = false;
            updateGhostPosition(pointerEvent);
          });
        return;
      }
      if (ghost) ghost.hidden = false;
      updateGhostPosition(pointerEvent);
    };

    const move = (mv: PointerEvent) => {
      lastScreenPoint = { screenX: mv.screenX, screenY: mv.screenY };
      const distance = Math.abs(mv.clientX - start.x) + Math.abs(mv.clientY - start.y);
      if (!active && distance < 6) return;
      if (!active) {
        // 드래그 시작: webview 이벤트 차단막 활성화
        rootRef.current?.classList.add('is-dragging');
      }
      active = true;

      const overlay = dropOverlayRef.current;
      const ghost = ghostRef.current;
      if (ghost) {
        ghost.hidden = false;
      }

      // ── 윈도우 밖으로 나간 경우 ────────────────────────────────────────────────
      const isOutside =
        mv.clientX < 0 || mv.clientX > window.innerWidth || mv.clientY < 0 || mv.clientY > window.innerHeight;
      if (isOutside) {
        hidePaneDropIndicator();
        if (overlay) {
          overlay.classList.remove('is-active', 'is-pane-target');
          overlay.querySelectorAll('.drop-zone').forEach((n) => (n as HTMLElement).classList.remove('is-hot'));
        }
        if (isDetachedWindow) {
          // 우선순위: 다른 분리 창 → 메인 창 → 빈 공간
          const mergeTargetId = findDetachedWindowAt(mv.screenX, mv.screenY, siblingBounds);
          const isOverMain =
            !mergeTargetId && siblingBounds.mainWindow
              ? isInBounds(mv.screenX, mv.screenY, siblingBounds.mainWindow.bounds)
              : false;

          if (mergeTargetId !== null) {
            // ① 다른 분리 창 위 → 합치기 모드
            if (lastMergeTargetId !== mergeTargetId) {
              if (lastMergeTargetId !== null) {
                window.fileAPI?.highlightDetachedWindow?.(lastMergeTargetId, false).catch(() => {});
              }
              if (reattachStarted) {
                reattachStarted = false;
                window.fileAPI.reattachCancel().catch(() => {});
              }
              window.fileAPI?.highlightDetachedWindow?.(mergeTargetId, true).catch(() => {});
              lastMergeTargetId = mergeTargetId;
            }
            showNativeDragGhost('merge', `⊞ Merge tabs: ${payload.label}`, mv);
            ds.currentDropZone = `__merge_to_detached__:${mergeTargetId}`;
          } else if (isOverMain) {
            // ② 메인 창 위 → 메인으로 재결합
            if (lastMergeTargetId !== null) {
              window.fileAPI?.highlightDetachedWindow?.(lastMergeTargetId, false).catch(() => {});
              lastMergeTargetId = null;
            }
            if (!reattachStarted) {
              reattachStarted = true;
              window.fileAPI.reattachStart().catch(() => {});
            }
            showNativeDragGhost('reattach', `↩ Back to main: ${payload.label}`, mv);
            ds.currentDropZone = '__reattach__';
          } else {
            // ③ 빈 공간 → 새 분리 창으로 분리
            if (lastMergeTargetId !== null) {
              window.fileAPI?.highlightDetachedWindow?.(lastMergeTargetId, false).catch(() => {});
              lastMergeTargetId = null;
            }
            if (reattachStarted) {
              reattachStarted = false;
              window.fileAPI.reattachCancel().catch(() => {});
            }
            showNativeDragGhost('detach', `↗ Detach to new window: ${payload.label}`, mv);
            ds.currentDropZone = '__detach__';
          }
        } else {
          showNativeDragGhost('detach', `↗ Detach to new window: ${payload.label}`, mv);
          ds.currentDropZone = '__detach__';
        }
        ds.currentDropTarget = null;
        return;
      }

      hideNativeDragGhost();

      // ── 창 안으로 다시 진입 ─────────────────────────────────────────────────────
      const prevZone = ds.currentDropZone ?? '';
      const wasOutsideZone =
        prevZone === '__detach__' || prevZone === '__reattach__' || prevZone.startsWith('__merge_to_detached__:');
      if (wasOutsideZone) {
        if (reattachStarted) {
          reattachStarted = false;
          window.fileAPI.reattachCancel().catch(() => {});
        }
        if (lastMergeTargetId !== null) {
          window.fileAPI?.highlightDetachedWindow?.(lastMergeTargetId, false).catch(() => {});
          lastMergeTargetId = null;
        }
        applyGhostMode(ghost, '', payload.label);
        ds.currentDropZone = null;
      }

      // ── 일반 창 내부 드래그 ─────────────────────────────────────────────────────
      if (overlay) overlay.classList.add('is-active');
      applyGhostMode(ghost, '', payload.label);
      updateGhostPosition(mv);
      if (overlay) overlay.classList.remove('is-pane-target');
      const rootZone = hitDropZone(mv.clientX, mv.clientY);

      if (engine.shouldUseRootDropZone(rootZone, payload)) {
        hidePaneDropIndicator();
        if (overlay)
          overlay.querySelectorAll('.drop-zone').forEach((n) => {
            const el = n as HTMLElement;
            el.classList.toggle('is-hot', el.dataset.zone === rootZone);
          });
        ds.currentDropTarget = { scope: 'root', zone: rootZone! };
        ds.currentDropZone = rootZone;
        return;
      }

      const paneTarget = getPaneDropTargetAt(mv.clientX, mv.clientY, payload);
      if (paneTarget) {
        if (overlay) {
          overlay.classList.add('is-pane-target');
          overlay.querySelectorAll('.drop-zone').forEach((n) => (n as HTMLElement).classList.remove('is-hot'));
        }
        showPaneDropIndicator(paneTarget);
        ds.currentDropTarget = paneTarget.zone ? paneTarget : null;
        ds.currentDropZone = paneTarget.zone;
        return;
      }

      hidePaneDropIndicator();
      if (overlay)
        overlay.querySelectorAll('.drop-zone').forEach((n) => {
          const el = n as HTMLElement;
          el.classList.toggle('is-hot', el.dataset.zone === rootZone);
        });
      ds.currentDropTarget = rootZone ? { scope: 'root', zone: rootZone } : null;
      ds.currentDropZone = rootZone ?? null;
    };

    const cancel = (ke: KeyboardEvent) => {
      if (ke.key !== 'Escape') return;
      active = false;
      ds.currentDropZone = null;
      ds.currentDropTarget = null;
      cleanup({ cancelReattach: true });
      onStatus('Drag cancelled');
    };

    const cleanup = (opts?: { cancelReattach?: boolean }) => {
      // 드래그 종료: webview 이벤트 차단막 해제
      rootRef.current?.classList.remove('is-dragging');
      hideNativeDragGhost();
      if (pointerCaptureTarget) {
        try {
          if (pointerCaptureTarget.hasPointerCapture(event.pointerId)) {
            pointerCaptureTarget.releasePointerCapture(event.pointerId);
          }
        } catch {
          // Best-effort cleanup only; release can throw after pointer cancellation.
        }
      }
      if ((opts?.cancelReattach ?? true) && reattachStarted) {
        reattachStarted = false;
        window.fileAPI.reattachCancel().catch(() => {});
      }
      // 합치기 하이라이트 해제
      if (lastMergeTargetId !== null) {
        window.fileAPI?.highlightDetachedWindow?.(lastMergeTargetId, false).catch(() => {});
        lastMergeTargetId = null;
      }
      const overlay = dropOverlayRef.current;
      const ghost = ghostRef.current;
      if (overlay) {
        overlay.classList.remove('is-active', 'is-pane-target');
        overlay.querySelectorAll('.drop-zone').forEach((n) => (n as HTMLElement).classList.remove('is-hot'));
      }
      if (ghost) {
        ghost.hidden = true;
        delete ghost.dataset.mode;
      }
      hidePaneDropIndicator();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', cancel);
    };

    const up = () => {
      const target = ds.currentDropTarget;
      const zone = ds.currentDropZone ?? '';
      const isReattach = zone === '__reattach__';
      const isMerge = zone.startsWith('__merge_to_detached__:');
      // 재결합/합치기 성공 시에는 각 drop이 처리하므로 cancel 생략
      cleanup({ cancelReattach: !isReattach && !isMerge });

      if (active && isMerge) {
        const targetWindowId = Number(zone.replace('__merge_to_detached__:', ''));
        ds.currentDropZone = null;
        ds.currentDropTarget = null;
        onDetach(payload, 'merge-to-detached', { targetWindowId });
        return;
      }

      if (active && (zone === '__detach__' || isReattach)) {
        ds.currentDropZone = null;
        ds.currentDropTarget = null;
        onDetach(
          payload,
          isReattach ? 'reattach' : 'detach',
          zone === '__detach__' ? { dropPoint: lastScreenPoint } : undefined,
        );
        return;
      }

      if (!active || !target) {
        ds.currentDropZone = null;
        ds.currentDropTarget = null;
        return;
      }
      engine.syncFloatBoundsFromMap(floatBoundsRef.current);
      engine.performDrop(payload, target);
      ds.currentDropZone = null;
      ds.currentDropTarget = null;
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('keydown', cancel);
  }

  // Attach to engine so DockPaneView can call these
  engine.beginPaneDrag = (pane: DockPane, event: PointerEvent) => {
    if (event.button !== 0 || (event.target as Element | null)?.closest('button')) return;
    beginDrag(
      { type: 'pane', paneId: pane.id, label: engine.contents.get(pane.activeContentId ?? '')?.title ?? pane.id },
      event,
    );
  };

  engine.beginContentDrag = (pane: DockPane, contentId: string, event: PointerEvent) => {
    if (event.button !== 0 || (event.target as Element | null)?.closest('.pane-tab-close')) return;
    const content = engine.contents.get(contentId);
    beginDrag({ type: 'content', paneId: pane.id, contentId, label: content?.title ?? contentId }, event);
  };

  return { beginResize };
}
