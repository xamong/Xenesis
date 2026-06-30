import React, { useRef } from 'react';
import type { McpBridgeOnboardingScenarioRunResult } from '../../shared/types';
import type { CommandCenterPaneProps } from '../panes/CommandCenterPane';
import type { OnboardingStepVerifier } from '../panes/onboarding/onboardingTypes';
import DockPaneView from './DockPaneView';
import {
  Bounds,
  DockContent,
  DockEngine,
  DropPayload,
  SIDE_STATES,
  SideState,
  SplitSeamInfo,
  WINDOW_STATES,
  WindowState,
} from './engine';
import FloatWindow from './FloatWindow';
import { type DetachIntentMetadata, type DetachMode, useDragManager } from './useDragManager';

const DROP_ZONE_LABELS: Record<string, string> = {
  left: '◀',
  right: '▶',
  top: '▲',
  bottom: '▼',
  document: '⬡',
};
const PANE_DROP_LABELS: Record<string, string> = { left: '◀', right: '▶', top: '▲', bottom: '▼', fill: '◉' };
const SIDE_SIZE_VARS: Record<SideState, string> = {
  left: 'var(--dock-left)',
  right: 'var(--dock-right)',
  top: 'var(--dock-top)',
  bottom: 'var(--dock-bottom)',
};

interface DockRemainingFrame {
  left: string;
  top: string;
  right: string;
  bottom: string;
}

interface DockFrameResult {
  windowFrames: Record<WindowState, React.CSSProperties>;
  splitterFrames: Partial<Record<SideState, React.CSSProperties>>;
}

function cssAdd(a: string, b: string): string {
  if (a === '0px') return b;
  if (b === '0px') return a;
  return `calc(${a} + ${b})`;
}

function computeDockWindowFrames(engine: DockEngine): DockFrameResult {
  const remaining: DockRemainingFrame = { left: '0px', top: '0px', right: '0px', bottom: '0px' };
  const windowFrames = Object.fromEntries(
    WINDOW_STATES.map((state) => [state, { position: 'absolute' } as React.CSSProperties]),
  ) as Record<WindowState, React.CSSProperties>;
  const splitterFrames: Partial<Record<SideState, React.CSSProperties>> = {};

  for (const side of engine.getDockSideOrder()) {
    if (!engine.hasPanes(side)) continue;
    const size = SIDE_SIZE_VARS[side];
    if (side === 'left') {
      const startLeft = remaining.left;
      remaining.left = cssAdd(remaining.left, size);
      windowFrames.left = {
        position: 'absolute',
        left: startLeft,
        top: remaining.top,
        bottom: remaining.bottom,
        width: size,
      };
      splitterFrames.left = { left: remaining.left, top: remaining.top, bottom: remaining.bottom };
    } else if (side === 'right') {
      const startRight = remaining.right;
      remaining.right = cssAdd(remaining.right, size);
      windowFrames.right = {
        position: 'absolute',
        right: startRight,
        top: remaining.top,
        bottom: remaining.bottom,
        width: size,
      };
      splitterFrames.right = { right: remaining.right, top: remaining.top, bottom: remaining.bottom };
    } else if (side === 'top') {
      const startTop = remaining.top;
      remaining.top = cssAdd(remaining.top, size);
      windowFrames.top = {
        position: 'absolute',
        left: remaining.left,
        right: remaining.right,
        top: startTop,
        height: size,
      };
      splitterFrames.top = { left: remaining.left, right: remaining.right, top: remaining.top };
    } else if (side === 'bottom') {
      const startBottom = remaining.bottom;
      remaining.bottom = cssAdd(remaining.bottom, size);
      windowFrames.bottom = {
        position: 'absolute',
        left: remaining.left,
        right: remaining.right,
        bottom: startBottom,
        height: size,
      };
      splitterFrames.bottom = { left: remaining.left, right: remaining.right, bottom: remaining.bottom };
    }
  }

  windowFrames.document = {
    position: 'absolute',
    left: remaining.left,
    top: remaining.top,
    right: remaining.right,
    bottom: remaining.bottom,
  };
  return { windowFrames, splitterFrames };
}

interface DockHostProps {
  engine: DockEngine;
  onStatus: (msg: string) => void;
  onDetach: (payload: DropPayload, mode: DetachMode, metadata?: DetachIntentMetadata) => void;
  isDetachedWindow: boolean;
  onExtFileDrop?: (files: File[], pane: import('./engine').DockPane) => void;
  onOpenAutomationMonitor?: (termId: string) => void;
  onSaveTerminalProfile?: (termId: string) => void;
  onOnboardingOpenFolder?: () => void;
  onOnboardingOpenTerminal?: () => void;
  onOnboardingOpenFile?: () => void;
  onOnboardingOpenWorkspace?: () => void;
  onOnboardingOpenAiProviderSettings?: () => void;
  onOnboardingOpenProviderSetupPlan?: () => void;
  onOnboardingOpenExternalToolSetup?: () => void;
  onOnboardingOpenToolConnectors?: () => void;
  onOnboardingOpenMcpSetup?: () => void;
  onOnboardingOpenMcpOauth?: () => void;
  onOnboardingOpenKeyboardShortcuts?: () => void;
  onOnboardingOpenExtensions?: () => void;
  onOnboardingOpenDiagnostics?: () => void;
  onOnboardingOpenCommandCenter?: () => void;
  onOnboardingArrangePanes?: () => void;
  onOnboardingSaveWorkspace?: () => void;
  onOnboardingRestoreWorkspace?: () => void;
  onOnboardingUseWorkspacePath?: (path: string) => void;
  onOnboardingVerifyStep?: OnboardingStepVerifier;
  onOnboardingRunScenario?: () => Promise<McpBridgeOnboardingScenarioRunResult>;
  onOnboardingVerifyAll?: () => Promise<McpBridgeOnboardingScenarioRunResult>;
  onOnboardingDismiss?: () => void;
  onBrowserPopupOpen?: (url: string) => void;
  commandCenterProps?: CommandCenterPaneProps;
  showPaneIdentityOverlay?: boolean;
  /** 플로팅 창 위치 맵 — App.tsx 소유, saveLayout에서 읽음 */
  floatBoundsRef: React.MutableRefObject<Map<string, Bounds>>;
}

export default function DockHost({
  engine,
  onStatus,
  onDetach,
  isDetachedWindow,
  onExtFileDrop,
  onOpenAutomationMonitor,
  onSaveTerminalProfile,
  onOnboardingOpenFolder,
  onOnboardingOpenTerminal,
  onOnboardingOpenFile,
  onOnboardingOpenWorkspace,
  onOnboardingOpenAiProviderSettings,
  onOnboardingOpenProviderSetupPlan,
  onOnboardingOpenExternalToolSetup,
  onOnboardingOpenToolConnectors,
  onOnboardingOpenMcpSetup,
  onOnboardingOpenMcpOauth,
  onOnboardingOpenKeyboardShortcuts,
  onOnboardingOpenExtensions,
  onOnboardingOpenDiagnostics,
  onOnboardingOpenCommandCenter,
  onOnboardingArrangePanes,
  onOnboardingSaveWorkspace,
  onOnboardingRestoreWorkspace,
  onOnboardingUseWorkspacePath,
  onOnboardingVerifyStep,
  onOnboardingRunScenario,
  onOnboardingVerifyAll,
  onOnboardingDismiss,
  onBrowserPopupOpen,
  commandCenterProps,
  showPaneIdentityOverlay,
  floatBoundsRef,
}: DockHostProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dropOverlayRef = useRef<HTMLDivElement>(null);
  const paneDropOverlayRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  const { beginResize } = useDragManager(
    engine,
    rootRef,
    dropOverlayRef,
    paneDropOverlayRef,
    ghostRef,
    floatBoundsRef,
    onStatus,
    onDetach,
    isDetachedWindow,
  );

  // Compute layouts for all windows
  engine.computeLayouts();
  const cssVars = engine.getCSSVars();
  const { windowFrames, splitterFrames } = computeDockWindowFrames(engine);

  const floatPanes = [...engine.panes.values()].filter((p) => p.state === 'float');
  const hiddenContents = engine.getHiddenContents();
  const hiddenTrayContents = hiddenContents.filter(
    (content) => content.contentType !== 'command-center' && content.contentType !== 'xenesis-agent',
  );

  const handleHiddenShow = (content: DockContent) => {
    const pane = engine.restoreHiddenContent(content.id);
    const state = pane?.state ?? content.previousState;
    onStatus(`Showed ${content.title} in ${state}`);
  };

  return (
    <>
      {/* Main dock root */}
      <div ref={rootRef} className="dock-root" style={cssVars as React.CSSProperties}>
        {/* Dock windows */}
        {WINDOW_STATES.map((state) => {
          const win = engine.windows.get(state);
          const isEmpty = !win || win.panes.length === 0;
          const seams = engine.splitSeams.filter((s: SplitSeamInfo) => s.windowState === state);
          return (
            <section
              key={state}
              className={`dock-window${isEmpty && state !== 'document' ? ' is-empty' : ''}`}
              data-state={state}
              aria-label={`${state} dock window`}
              style={windowFrames[state]}
            >
              {win &&
                win.panes.map((paneId) => {
                  const pane = engine.panes.get(paneId);
                  if (!pane) return null;
                  return (
                    <DockPaneView
                      key={paneId}
                      pane={pane}
                      engine={engine}
                      winState={state}
                      onStatus={onStatus}
                      floatBoundsRef={floatBoundsRef}
                      onExtFileDrop={onExtFileDrop}
                      onOpenAutomationMonitor={onOpenAutomationMonitor}
                      onSaveTerminalProfile={onSaveTerminalProfile}
                      onOnboardingOpenFolder={onOnboardingOpenFolder}
                      onOnboardingOpenTerminal={onOnboardingOpenTerminal}
                      onOnboardingOpenFile={onOnboardingOpenFile}
                      onOnboardingOpenWorkspace={onOnboardingOpenWorkspace}
                      onOnboardingOpenAiProviderSettings={onOnboardingOpenAiProviderSettings}
                      onOnboardingOpenProviderSetupPlan={onOnboardingOpenProviderSetupPlan}
                      onOnboardingOpenExternalToolSetup={onOnboardingOpenExternalToolSetup}
                      onOnboardingOpenToolConnectors={onOnboardingOpenToolConnectors}
                      onOnboardingOpenMcpSetup={onOnboardingOpenMcpSetup}
                      onOnboardingOpenMcpOauth={onOnboardingOpenMcpOauth}
                      onOnboardingOpenKeyboardShortcuts={onOnboardingOpenKeyboardShortcuts}
                      onOnboardingOpenExtensions={onOnboardingOpenExtensions}
                      onOnboardingOpenDiagnostics={onOnboardingOpenDiagnostics}
                      onOnboardingOpenCommandCenter={onOnboardingOpenCommandCenter}
                      onOnboardingArrangePanes={onOnboardingArrangePanes}
                      onOnboardingSaveWorkspace={onOnboardingSaveWorkspace}
                      onOnboardingRestoreWorkspace={onOnboardingRestoreWorkspace}
                      onOnboardingUseWorkspacePath={onOnboardingUseWorkspacePath}
                      onOnboardingVerifyStep={onOnboardingVerifyStep}
                      onOnboardingRunScenario={onOnboardingRunScenario}
                      onOnboardingVerifyAll={onOnboardingVerifyAll}
                      onOnboardingDismiss={onOnboardingDismiss}
                      onBrowserPopupOpen={onBrowserPopupOpen}
                      commandCenterProps={commandCenterProps}
                      showPaneIdentityOverlay={showPaneIdentityOverlay}
                    />
                  );
                })}
              {state === 'document' && isEmpty && (
                <div className="empty-document">Drop a pane here or create a new document.</div>
              )}

              {/* ── 내부 pane 분할선 핸들 ────────────────────────────────────── */}
              {seams.map((seam: SplitSeamInfo, idx: number) => {
                const ratio = seam.node.ratio ?? 0.5;
                const isRow = seam.node.direction === 'row';
                const style: React.CSSProperties = isRow
                  ? {
                      position: 'absolute',
                      left: `${seam.containerLeft + seam.containerWidth * ratio}%`,
                      top: `${seam.containerTop}%`,
                      width: '8px',
                      height: `${seam.containerHeight}%`,
                      transform: 'translateX(-50%)',
                      cursor: 'col-resize',
                      zIndex: 8,
                    }
                  : {
                      position: 'absolute',
                      left: `${seam.containerLeft}%`,
                      top: `${seam.containerTop + seam.containerHeight * ratio}%`,
                      width: `${seam.containerWidth}%`,
                      height: '8px',
                      transform: 'translateY(-50%)',
                      cursor: 'row-resize',
                      zIndex: 8,
                    };
                return (
                  <div
                    key={`seam-${state}-${idx}`}
                    className={`pane-split-handle pane-split-handle--${seam.node.direction}`}
                    style={style}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      const winEl = (e.currentTarget as HTMLElement).closest('.dock-window') as HTMLElement | null;
                      rootRef.current?.classList.add('is-resizing');
                      window.addEventListener(
                        'pointerup',
                        () => {
                          rootRef.current?.classList.remove('is-resizing');
                        },
                        { once: true },
                      );
                      engine.beginSplitResize(seam, winEl, e.nativeEvent);
                    }}
                  />
                );
              })}
            </section>
          );
        })}

        {/* Splitters */}
        {SIDE_STATES.map((edge) => {
          const win = engine.windows.get(edge);
          const visible = win && win.panes.length > 0;
          return (
            <div
              key={edge}
              className={`dock-splitter${visible ? '' : ' is-hidden'}`}
              data-edge={edge}
              role="separator"
              aria-label={`${edge} splitter`}
              style={splitterFrames[edge]}
              onPointerDown={(e) => beginResize(edge as SideState, e.nativeEvent)}
            />
          );
        })}

        {/* Float layer */}
        <div className="float-layer" aria-label="Floating windows">
          {floatPanes.map((pane) => (
            <FloatWindow
              key={pane.id}
              pane={pane}
              engine={engine}
              onStatus={onStatus}
              floatBoundsRef={floatBoundsRef}
              onExtFileDrop={onExtFileDrop}
              onSaveTerminalProfile={onSaveTerminalProfile}
              onOnboardingOpenFolder={onOnboardingOpenFolder}
              onOnboardingOpenTerminal={onOnboardingOpenTerminal}
              onOnboardingOpenFile={onOnboardingOpenFile}
              onOnboardingOpenWorkspace={onOnboardingOpenWorkspace}
              onOnboardingOpenAiProviderSettings={onOnboardingOpenAiProviderSettings}
              onOnboardingOpenProviderSetupPlan={onOnboardingOpenProviderSetupPlan}
              onOnboardingOpenExternalToolSetup={onOnboardingOpenExternalToolSetup}
              onOnboardingOpenToolConnectors={onOnboardingOpenToolConnectors}
              onOnboardingOpenMcpSetup={onOnboardingOpenMcpSetup}
              onOnboardingOpenMcpOauth={onOnboardingOpenMcpOauth}
              onOnboardingOpenKeyboardShortcuts={onOnboardingOpenKeyboardShortcuts}
              onOnboardingOpenExtensions={onOnboardingOpenExtensions}
              onOnboardingOpenDiagnostics={onOnboardingOpenDiagnostics}
              onOnboardingOpenCommandCenter={onOnboardingOpenCommandCenter}
              onOnboardingArrangePanes={onOnboardingArrangePanes}
              onOnboardingSaveWorkspace={onOnboardingSaveWorkspace}
              onOnboardingRestoreWorkspace={onOnboardingRestoreWorkspace}
              onOnboardingUseWorkspacePath={onOnboardingUseWorkspacePath}
              onOnboardingVerifyStep={onOnboardingVerifyStep}
              onOnboardingRunScenario={onOnboardingRunScenario}
              onOnboardingVerifyAll={onOnboardingVerifyAll}
              onOnboardingDismiss={onOnboardingDismiss}
              onBrowserPopupOpen={onBrowserPopupOpen}
              commandCenterProps={commandCenterProps}
              showPaneIdentityOverlay={showPaneIdentityOverlay}
            />
          ))}
        </div>

        {/* Hidden tray */}
        {hiddenTrayContents.length > 0 && (
          <div className="hidden-tray" aria-label="Hidden content">
            {hiddenTrayContents.map((content) => (
              <button key={content.id} title={`Show ${content.title}`} onClick={() => handleHiddenShow(content)}>
                {content.title}
              </button>
            ))}
          </div>
        )}

        {/* Drop overlay */}
        <div ref={dropOverlayRef} className="drop-overlay" aria-hidden="true">
          {Object.entries(DROP_ZONE_LABELS).map(([zone, label]) => (
            <div key={zone} className="drop-zone" data-zone={zone}>
              <span className="drop-zone-label">{label}</span>
              <span className="drop-zone-preview" />
            </div>
          ))}
          {/* Pane-level drop overlay (nested, positioned by JS) */}
          <div ref={paneDropOverlayRef} className="pane-drop-overlay" aria-hidden="true">
            {Object.entries(PANE_DROP_LABELS).map(([zone, label]) => (
              <div key={zone} className="pane-drop-zone" data-zone={zone}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drag ghost (fixed, outside root) */}
      <div ref={ghostRef} className="drag-ghost" hidden />
    </>
  );
}
