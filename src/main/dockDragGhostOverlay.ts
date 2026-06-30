import { BrowserWindow, screen } from 'electron';
import {
  DOCK_DRAG_GHOST_OVERLAY_SIZE,
  type DockDragGhostOverlayPayload,
  normalizeDockDragGhostMode,
  resolveDockDragGhostOverlayBounds,
} from '../shared/dockDragGhost';

const OVERLAY_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html,
    body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: transparent;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      user-select: none;
      pointer-events: none;
    }

    #ghost {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      padding: 5px 10px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      border: 1px solid #60a5fa;
      border-radius: 4px;
      background: rgba(30, 64, 175, 0.94);
      box-shadow: 0 8px 20px rgba(2, 6, 23, 0.26);
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
    }

    #ghost[data-mode="reattach"] {
      border-color: #34d399;
      background: rgba(6, 78, 59, 0.94);
      color: #a7f3d0;
    }

    #ghost[data-mode="merge"] {
      border-color: #a78bfa;
      background: rgba(91, 33, 182, 0.94);
      color: #ddd6fe;
    }

    #ghost[data-mode="default"] {
      border-color: #22d3ee;
      background: rgba(15, 23, 42, 0.94);
      color: #67e8f9;
    }
  </style>
</head>
<body>
  <div id="ghost" data-mode="default"></div>
  <script>
    window.updateDockDragGhost = (payload) => {
      const ghost = document.getElementById('ghost');
      if (!ghost) return;
      ghost.dataset.mode = payload.mode || 'default';
      ghost.textContent = payload.label || '';
    };
  </script>
</body>
</html>`;

function normalizePayload(payload: unknown): DockDragGhostOverlayPayload {
  const raw = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  return {
    label: typeof raw.label === 'string' ? raw.label.slice(0, 180) : '',
    mode: normalizeDockDragGhostMode(raw.mode),
    screenX: typeof raw.screenX === 'number' && Number.isFinite(raw.screenX) ? raw.screenX : 0,
    screenY: typeof raw.screenY === 'number' && Number.isFinite(raw.screenY) ? raw.screenY : 0,
  };
}

export interface DockDragGhostOverlayController {
  show(payload: unknown): void;
  hide(): void;
  destroy(): void;
}

export function createDockDragGhostOverlayController(): DockDragGhostOverlayController {
  let overlayWindow: BrowserWindow | null = null;
  let isReady = false;
  let pendingPayload: DockDragGhostOverlayPayload | null = null;

  const applyPayload = (win: BrowserWindow, payload: DockDragGhostOverlayPayload): void => {
    const script = `window.updateDockDragGhost(${JSON.stringify({
      label: payload.label,
      mode: payload.mode,
    })})`;
    win.webContents.executeJavaScript(script, true).catch(() => undefined);
  };

  const ensureWindow = (): BrowserWindow => {
    if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;

    isReady = false;
    overlayWindow = new BrowserWindow({
      width: DOCK_DRAG_GHOST_OVERLAY_SIZE.width,
      height: DOCK_DRAG_GHOST_OVERLAY_SIZE.height,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    try {
      overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch {
      // Platform-dependent; ignored where unsupported.
    }

    overlayWindow.webContents.once('did-finish-load', () => {
      const win = overlayWindow;
      if (!win || win.isDestroyed()) return;
      isReady = true;
      if (pendingPayload) {
        applyPayload(win, pendingPayload);
        win.showInactive();
      }
    });

    overlayWindow.on('closed', () => {
      overlayWindow = null;
      isReady = false;
      pendingPayload = null;
    });

    overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(OVERLAY_HTML)}`).catch(() => undefined);
    return overlayWindow;
  };

  return {
    show(rawPayload: unknown): void {
      const payload = normalizePayload(rawPayload);
      const selectedDisplay = screen.getDisplayNearestPoint({ x: payload.screenX, y: payload.screenY });
      const bounds = resolveDockDragGhostOverlayBounds({
        screenX: payload.screenX,
        screenY: payload.screenY,
        workArea: selectedDisplay.workArea,
      });

      pendingPayload = payload;
      const win = ensureWindow();
      win.setBounds(bounds, false);
      if (isReady) {
        applyPayload(win, payload);
        win.showInactive();
      }
    },

    hide(): void {
      pendingPayload = null;
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
      }
    },

    destroy(): void {
      pendingPayload = null;
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.destroy();
      }
      overlayWindow = null;
      isReady = false;
    },
  };
}
