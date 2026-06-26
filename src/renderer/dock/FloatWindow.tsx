import React, { useEffect, useRef } from 'react';
import type { McpBridgeOnboardingScenarioRunResult } from '../../shared/types';
import { useI18n } from '../i18n';
import type { CommandCenterPaneProps } from '../panes/CommandCenterPane';
import type { OnboardingStepVerifier } from '../panes/onboarding/onboardingTypes';
import DockPaneView from './DockPaneView';
import { Bounds, DOCK_STATES, DockEngine, DockPane } from './engine';

interface FloatWindowProps {
  pane: DockPane;
  engine: DockEngine;
  onStatus: (msg: string) => void;
  floatBoundsRef: React.MutableRefObject<Map<string, Bounds>>;
  onExtFileDrop?: (files: File[], pane: DockPane) => void;
  onSaveTerminalProfile?: (termId: string) => void;
  onOnboardingOpenFolder?: () => void;
  onOnboardingOpenTerminal?: () => void;
  onOnboardingOpenFile?: () => void;
  onOnboardingOpenWorkspace?: () => void;
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
}

export default function FloatWindow({
  pane,
  engine,
  onStatus,
  floatBoundsRef,
  onExtFileDrop,
  onSaveTerminalProfile,
  onOnboardingOpenFolder,
  onOnboardingOpenTerminal,
  onOnboardingOpenFile,
  onOnboardingOpenWorkspace,
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
}: FloatWindowProps) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLElement>(null);

  // bounds ref를 ResizeObserver로 동기화 (창 크기 조절 대응)
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onResizeObs = new ResizeObserver(() => {
      floatBoundsRef.current.set(pane.id, {
        x: (frame as HTMLElement).offsetLeft,
        y: (frame as HTMLElement).offsetTop,
        width: (frame as HTMLElement).offsetWidth,
        height: (frame as HTMLElement).offsetHeight,
      });
    });
    onResizeObs.observe(frame);
    return () => onResizeObs.disconnect();
  }, [pane.id, floatBoundsRef]);

  /**
   * 탭 스트립 빈 영역을 드래그해서 플로팅 창 이동.
   * 개별 탭·버튼·스크롤 화살표 위에서 시작된 포인터는 무시 → 탭 클릭·드래그 정상 동작 유지.
   */
  const handleTabBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // 탭·버튼·스크롤 화살표 클릭은 무시
    if ((e.target as Element).closest('.pane-tab, button, .pane-tabs-scroll')) return;
    if (e.button !== 0) return;
    e.preventDefault();

    const frame = frameRef.current as HTMLElement | null;
    if (frame) {
      pane.bounds = {
        x: frame.offsetLeft,
        y: frame.offsetTop,
        width: frame.offsetWidth,
        height: frame.offsetHeight,
      };
    }

    const start = { x: e.clientX, y: e.clientY, bounds: { ...pane.bounds } };

    const move = (mv: PointerEvent) => {
      pane.bounds.x = start.bounds.x + mv.clientX - start.x;
      pane.bounds.y = start.bounds.y + mv.clientY - start.y;
      const f = frameRef.current as HTMLElement | null;
      if (f) {
        f.style.left = `${pane.bounds.x}px`;
        f.style.top = `${pane.bounds.y}px`;
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const activeTitle = engine.contents.get(pane.activeContentId ?? '')?.title;
      onStatus(t('dock.floatMoveTitle', { title: activeTitle ?? pane.id }));
      const f = frameRef.current as HTMLElement | null;
      if (f) {
        floatBoundsRef.current.set(pane.id, {
          x: f.offsetLeft,
          y: f.offsetTop,
          width: f.offsetWidth,
          height: f.offsetHeight,
        });
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  };

  /** 플로팅 창 → 도킹 복귀 (탭 바 우측 ↧ 버튼) */
  const handleDock = () => {
    const activeContent = engine.contents.get(pane.activeContentId ?? '');
    const target = activeContent?.previousState ?? 'document';
    const resolvedState = DOCK_STATES.has(target) && target !== 'float' && target !== 'hidden' ? target : 'document';
    engine.dockPane(pane.id, resolvedState);
    onStatus(t('dock.dockReturnTitle', { state: String(resolvedState) }));
  };

  return (
    <section
      ref={frameRef as React.RefObject<HTMLElement>}
      className="float-window"
      data-pane-id={pane.id}
      style={{
        left: pane.bounds.x,
        top: pane.bounds.y,
        width: pane.bounds.width,
        height: pane.bounds.height,
      }}
    >
      <DockPaneView
        pane={pane}
        engine={engine}
        winState="float"
        onStatus={onStatus}
        floatBoundsRef={floatBoundsRef}
        onExtFileDrop={onExtFileDrop}
        onSaveTerminalProfile={onSaveTerminalProfile}
        onTabBarPointerDown={handleTabBarPointerDown}
        onDockAction={handleDock}
        onOnboardingOpenFolder={onOnboardingOpenFolder}
        onOnboardingOpenTerminal={onOnboardingOpenTerminal}
        onOnboardingOpenFile={onOnboardingOpenFile}
        onOnboardingOpenWorkspace={onOnboardingOpenWorkspace}
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
    </section>
  );
}
