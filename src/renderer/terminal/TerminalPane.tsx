/**
 * TerminalPane — 도킹 시스템 내 터미널 마운트 포인트 컴포넌트.
 *
 * 이 컴포넌트 자체는 xterm 인스턴스를 생성·관리하지 않는다.
 * 실제 xterm 생명주기는 terminalHost (명령형 모듈)에서 관리하며,
 * 이 컴포넌트는 마운트·언마운트 시 attach/detach만 요청한다.
 *
 * 덕분에 도킹 이동·패널 분리·플로트 등 레이아웃 변경 시에도
 * PTY가 종료되지 않고 DOM 노드만 새 위치로 이동된다.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AutomationApi, AutomationMode, AutomationStage, AutomationStatus } from '../../shared/types';
import { buildTerminalBotContextMessageFromSession } from '../extensions/xenesis-desk.core-tools/xenisBotContext';
import { useI18n } from '../i18n';
import { sendXenesisContextMessage } from '../utils/xenesisContextSend';
import { terminalHost } from './terminalHost';
import { shortTerminalId } from './terminalIdentity';
import {
  resolveHistoryPagingHeight,
  resolveHistoryWheelDeltaPixels,
  resolveHistoryWheelFrameDelta,
  resolveHistoryWheelPagingHeight,
} from './tuiScrollPolicy';

declare global {
  interface Window {
    automationAPI?: AutomationApi;
  }
}

interface TerminalPaneProps {
  termId: string;
  isActive: boolean;
  /** 자동화 감시 창 열기 요청 (App.tsx 에서 주입) */
  onOpenAutomationMonitor?: (termId: string) => void;
  /** 현재 터미널 세션을 설정 > 터미널 관리의 로컬 프로필로 저장 */
  onSaveTerminalProfile?: (termId: string) => void;
}

interface MenuState {
  x: number;
  y: number;
  hasSel: boolean;
}

// ─── 컨텍스트 메뉴 컴포넌트 ──────────────────────────────────────────────────

interface CtxMenuProps {
  menu: MenuState;
  termId: string;
  onClose: () => void;
  onSearch: () => void;
  automationStatus: AutomationStatus | null;
  onAutomationToggle: () => void;
  onAutomationStage: (stage: AutomationStage) => void;
  onOpenMonitor: () => void;
  onSaveLog: () => void;
  onSaveTerminalProfile: () => void;
  onSendSelectionToBot: () => void;
  onSendRecentOutputToBot: () => void;
}

const STAGE_LABELS: Record<AutomationStage, string> = {
  1: '1. Regex',
  2: '2. State Machine',
  3: '3. LLM + Fallback',
};

function TerminalContextMenu({
  menu,
  termId,
  onClose,
  onSearch,
  automationStatus,
  onAutomationToggle,
  onAutomationStage,
  onOpenMonitor,
  onSaveLog,
  onSaveTerminalProfile,
  onSendSelectionToBot,
  onSendRecentOutputToBot,
}: CtxMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);
  const automationMode: AutomationMode =
    automationStatus?.mode ?? ((automationStatus?.autoSend ?? false) ? 'respond' : 'watch');
  const automationModeLabel =
    automationMode === 'stream'
      ? t('monitor.modeStream')
      : automationMode === 'watch'
        ? t('monitor.modeWatch')
        : t('monitor.modeRespond');

  // 마운트 직후 화면 밖으로 나가지 않도록 위치 보정
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) el.style.left = `${Math.max(0, vw - rect.width - 4)}px`;
    if (rect.bottom > vh) el.style.top = `${Math.max(0, vh - rect.height - 4)}px`;
  }, []);

  // 외부 클릭 / Escape 로 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        terminalHost.focus(termId);
      }
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [termId, onClose]);

  const run = useCallback(
    (fn: () => void) => {
      onClose();
      // 메뉴가 닫힌 후 터미널 포커스 복원
      requestAnimationFrame(() => {
        fn();
        terminalHost.focus(termId);
      });
    },
    [termId, onClose],
  );

  return createPortal(
    <div
      ref={menuRef}
      className="term-ctx-menu"
      style={{ left: menu.x, top: menu.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="term-ctx-identity" title={termId}>
        <span className="term-ctx-identity-label">{t('terminal.termId')}</span>
        <code className="term-ctx-identity-value">{termId}</code>
        <button
          className="term-ctx-identity-copy"
          onClick={() =>
            run(() => {
              void navigator.clipboard.writeText(termId);
            })
          }
          title={t('terminal.copyTermId')}
        >
          {shortTerminalId(termId)}
        </button>
      </div>

      {/* 복사 */}
      <div
        className={`term-ctx-item${menu.hasSel ? '' : ' term-ctx-item-dim'}`}
        onClick={() => {
          if (menu.hasSel) run(() => terminalHost.copy(termId));
        }}
        title="Ctrl+Insert"
      >
        <span className="term-ctx-label">{t('terminal.copy')}</span>
        <span className="term-ctx-hint">Ctrl+Insert</span>
      </div>

      {/* 붙여넣기 */}
      <div className="term-ctx-item" onClick={() => run(() => terminalHost.paste(termId))} title="Shift+Insert">
        <span className="term-ctx-label">{t('terminal.paste')}</span>
        <span className="term-ctx-hint">Shift+Insert</span>
      </div>

      {/* 전체 선택 */}
      <div className="term-ctx-item" onClick={() => run(() => terminalHost.selectAll(termId))}>
        <span className="term-ctx-label">{t('terminal.selectAll')}</span>
        <span className="term-ctx-hint">Ctrl+A</span>
      </div>

      <div className="term-ctx-sep" />

      {/* 찾기 */}
      <div className="term-ctx-item" onClick={() => run(() => onSearch())} title="Ctrl+F">
        <span className="term-ctx-label">{t('terminal.find')}</span>
        <span className="term-ctx-hint">Ctrl+F</span>
      </div>

      <div className="term-ctx-item" onClick={() => run(onSaveLog)}>
        <span className="term-ctx-label">{t('terminal.terminalSaveLog')}</span>
        <span className="term-ctx-hint">.log</span>
      </div>

      <div className="term-ctx-item" onClick={() => run(onSaveTerminalProfile)}>
        <span className="term-ctx-label">{t('terminal.saveAsProfile')}</span>
        <span className="term-ctx-hint">{t('settings.remoteTerminalsTitle')}</span>
      </div>

      <div
        className={`term-ctx-item${menu.hasSel ? '' : ' term-ctx-item-dim'}`}
        onClick={() => {
          if (menu.hasSel) run(onSendSelectionToBot);
        }}
      >
        <span className="term-ctx-label">Send selection to Xenesis Agent</span>
        <span className="term-ctx-hint">Agent</span>
      </div>

      <div className="term-ctx-item" onClick={() => run(onSendRecentOutputToBot)}>
        <span className="term-ctx-label">Send recent output to Xenesis Agent</span>
        <span className="term-ctx-hint">200 lines</span>
      </div>

      <div className="term-ctx-sep" />

      {/* 화면 지우기 */}
      <div className="term-ctx-item" onClick={() => run(() => terminalHost.clearScreen(termId))}>
        <span className="term-ctx-label">{t('terminal.clearScreen')}</span>
        <span className="term-ctx-hint">clear</span>
      </div>

      {/* 전체 기록 지우기 */}
      <div className="term-ctx-item" onClick={() => run(() => terminalHost.clearScrollback(termId))}>
        <span className="term-ctx-label">{t('terminal.clearHistory')}</span>
        <span className="term-ctx-hint">{t('terminal.clearWithScrollback')}</span>
      </div>

      <div className="term-ctx-sep" />

      {/* ── 자동화 상태 표시줄 ── */}
      <div className="term-ctx-auto-status">
        {automationStatus?.blocked ? (
          <>
            <span className="term-ctx-auto-dot term-ctx-auto-dot-blocked">⛔</span>
            <span className="term-ctx-auto-label-blocked">{t('terminal.automationBlocked')}</span>
            <span className="term-ctx-auto-hint">{automationStatus.blockReason}</span>
          </>
        ) : automationStatus?.enabled ? (
          <>
            <span className="term-ctx-auto-dot term-ctx-auto-dot-on">●</span>
            <span className="term-ctx-auto-label-on">{t('terminal.automationWatching')}</span>
            <span className="term-ctx-auto-hint">
              {automationMode === 'stream'
                ? automationModeLabel
                : `${STAGE_LABELS[automationStatus.stage]} · ${automationModeLabel}`}
            </span>
          </>
        ) : (
          <>
            <span className="term-ctx-auto-dot term-ctx-auto-dot-off">○</span>
            <span className="term-ctx-auto-label-off">{t('terminal.normalTerminal')}</span>
            <span className="term-ctx-auto-hint">{t('terminal.automationInactive')}</span>
          </>
        )}
      </div>

      {/* 자동화 토글 버튼 */}
      <div
        className={`term-ctx-item term-ctx-item-auto-toggle${automationStatus?.enabled ? ' term-ctx-item-auto-on' : ''}${automationStatus?.blocked ? ' term-ctx-item-auto-blocked' : ''}`}
        onClick={() => run(onAutomationToggle)}
        title={automationStatus?.blocked ? t('terminal.unblockHint') : ''}
      >
        <span className="term-ctx-label">
          {automationStatus?.enabled
            ? t('terminal.stopAutomation')
            : automationStatus?.blocked
              ? t('terminal.unblockAndStart')
              : t('terminal.startAutomation')}
        </span>
      </div>

      {/* Stage 서브메뉴 — 자동화가 활성일 때만 표시 */}
      {automationStatus?.enabled && automationMode !== 'stream' && (
        <>
          {([1, 2, 3] as AutomationStage[]).map((stage) => (
            <div
              key={stage}
              className={`term-ctx-item term-ctx-item-sub${automationStatus.stage === stage ? ' term-ctx-item-active' : ''}`}
              onClick={() => run(() => onAutomationStage(stage))}
            >
              <span className="term-ctx-label">{STAGE_LABELS[stage]}</span>
              {automationStatus.stage === stage && <span className="term-ctx-hint">✓</span>}
            </div>
          ))}
        </>
      )}

      {/* 이벤트 감시 창 */}
      <div className="term-ctx-item" onClick={() => run(onOpenMonitor)}>
        <span className="term-ctx-label">{t('terminal.openEventMonitor')}</span>
        {automationStatus?.enabled && <span className="term-ctx-hint term-ctx-hint-on">{t('terminal.watching')}</span>}
      </div>
    </div>,
    document.body,
  );
}

// ─── TerminalPane ─────────────────────────────────────────────────────────────

export default function TerminalPane({
  termId,
  isActive,
  onOpenAutomationMonitor,
  onSaveTerminalProfile,
}: TerminalPaneProps) {
  const { t } = useI18n();
  const mountRef = useRef<HTMLDivElement>(null);
  /** 외부 스크롤 래퍼 — overflow:hidden으로 내부 터미널을 클리핑 */
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  /** 자동화 상태 */
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  /** 크기 고정 상태 — true이면 fit() 차단, TUI 앱 스크롤백 보호 */
  const [fitLocked, setFitLocked] = useState(() => terminalHost.isFitLocked(termId));
  /** Alternate screen buffer(TUI 앱 실행 중) 여부 */
  const [isAltBuffer, setIsAltBuffer] = useState(() => terminalHost.isAltBuffer(termId));
  /**
   * 내부 터미널 패널 확장량(px).
   * > 0 이면 dock-terminal-host가 래퍼보다 이 값만큼 더 높아진다.
   * 터미널이 크게 렌더링될수록 스크롤백에서 더 많은 행이 뷰포트로 올라와
   * 래퍼의 top 클리핑 영역에서 이전 출력을 볼 수 있다.
   */
  const [expandedHeight, setExpandedHeight] = useState(0);
  const historyPageDepthRef = useRef(0);
  const pendingHistoryWheelDeltaRef = useRef(0);
  const historyWheelFrameRef = useRef<number | null>(null);

  const scrollToLatestAfterFit = useCallback(() => {
    historyPageDepthRef.current = 0;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        terminalHost.scrollViewportToBottom(termId);
        terminalHost.focus(termId);
      }),
    );
  }, [termId]);

  const cancelHistoryWheelFrame = useCallback(() => {
    if (historyWheelFrameRef.current !== null) {
      cancelAnimationFrame(historyWheelFrameRef.current);
      historyWheelFrameRef.current = null;
    }
    pendingHistoryWheelDeltaRef.current = 0;
  }, [termId]);

  const syncHistoryPageDepthFromHeight = useCallback((height: number, viewportHeight: number) => {
    const page = Math.max(1, Math.floor(viewportHeight || 0));
    historyPageDepthRef.current = Math.max(0, Math.ceil(Math.max(0, Math.floor(height || 0)) / page));
  }, []);

  const runHistoryWheelFrame = useCallback(() => {
    historyWheelFrameRef.current = null;
    const viewportHeight = scrollWrapperRef.current?.clientHeight ?? 400;
    const { appliedDeltaPixels, remainingDeltaPixels } = resolveHistoryWheelFrameDelta({
      pendingDeltaPixels: pendingHistoryWheelDeltaRef.current,
      viewportHeight,
    });

    pendingHistoryWheelDeltaRef.current = remainingDeltaPixels;

    if (appliedDeltaPixels !== 0) {
      setExpandedHeight((prev) => {
        const next = resolveHistoryWheelPagingHeight({
          currentExpandedHeight: prev,
          viewportHeight,
          deltaY: appliedDeltaPixels,
          deltaMode: 0,
        });
        if (next === 0) {
          scrollToLatestAfterFit();
        } else {
          syncHistoryPageDepthFromHeight(next, viewportHeight);
          terminalHost.focus(termId);
        }
        return next;
      });
    }

    if (remainingDeltaPixels !== 0) {
      historyWheelFrameRef.current = requestAnimationFrame(runHistoryWheelFrame);
    }
  }, [termId, scrollToLatestAfterFit, syncHistoryPageDepthFromHeight]);

  const scheduleHistoryWheelFrame = useCallback(() => {
    if (historyWheelFrameRef.current !== null) return;
    historyWheelFrameRef.current = requestAnimationFrame(runHistoryWheelFrame);
  }, [runHistoryWheelFrame]);

  useLayoutEffect(() => {
    terminalHost.fit(termId);
  }, [expandedHeight, termId]);

  // ── attach / detach (PTY는 kill 하지 않음) ───────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    if (!terminalHost.has(termId)) {
      // 레이아웃 복원 등으로 인스턴스가 없는 경우 — 빈 상태로 유지
      return;
    }

    terminalHost.attachTo(termId, el);
    terminalHost.setSearchToggle(termId, () => setSearchOpen((v) => !v));
    terminalHost.setContextMenu(termId, (x, y, hasSel) => {
      // 화면 경계 사전 보정 (메뉴 대략 크기: 210×230px)
      const adjX = Math.min(x, window.innerWidth - 214);
      const adjY = Math.min(y, window.innerHeight - 234);
      setMenu({ x: Math.max(0, adjX), y: Math.max(0, adjY), hasSel });
    });
    terminalHost.setBufferModeCallback(termId, (isAlt) => {
      setIsAltBuffer(isAlt);
      if (isAlt) {
        cancelHistoryWheelFrame();
        historyPageDepthRef.current = 0;
        setExpandedHeight(0);
      }
    });

    return () => {
      terminalHost.setSearchToggle(termId, undefined);
      terminalHost.setContextMenu(termId, undefined);
      terminalHost.setBufferModeCallback(termId, undefined);
      terminalHost.detach(termId);
    };
  }, [termId, cancelHistoryWheelFrame]);

  useEffect(
    () => () => {
      cancelHistoryWheelFrame();
    },
    [cancelHistoryWheelFrame],
  );

  // ── 자동화 상태 구독 ─────────────────────────────────────────────────────
  useEffect(() => {
    const api = window.automationAPI;
    if (!api) return;

    // PTY spawn은 requestAnimationFrame 안에서 비동기 실행되므로,
    // 첫 getStatus 호출 시 컨트롤러가 아직 생성 안 됐을 수 있음.
    // → null이면 최대 10회(5초) 재시도
    let cancelled = false;
    let retryCount = 0;
    const MAX_RETRIES = 10;

    const tryGetStatus = async () => {
      if (cancelled) return;
      try {
        const s = await api.getStatus(termId);
        if (s) {
          setAutomationStatus(s);
        } else if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(tryGetStatus, 500);
        }
      } catch {
        if (!cancelled && retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(tryGetStatus, 500);
        }
      }
    };
    tryGetStatus();

    const unsub = api.onStatus(termId, setAutomationStatus);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [termId]);

  // ── 자동화 핸들러 ─────────────────────────────────────────────────────────
  const handleAutomationToggle = useCallback(() => {
    const api = window.automationAPI;
    if (!api) return;
    // blocked 상태여도 토글 허용 — setEnabled(true)가 차단 상태 초기화
    const nextEnabled = !(automationStatus?.enabled ?? false);

    // 낙관적 업데이트 — IPC 응답 전에 즉시 UI 반영
    setAutomationStatus((prev) => {
      if (!prev) {
        // 상태가 아직 null이면 임시 기본 상태로 생성
        return {
          termId,
          enabled: nextEnabled,
          mode: 'stream',
          stage: 1 as AutomationStage,
          defaultStreamFilterProfile: 'auto',
          streamFilterProfile: 'auto',
          llmReady: false,
          blocked: false,
          autoSend: false,
        };
      }
      return {
        ...prev,
        enabled: nextEnabled,
        blocked: nextEnabled ? false : prev.blocked,
        blockReason: nextEnabled ? undefined : prev.blockReason,
      };
    });

    api.setEnabled(termId, nextEnabled);

    // 자동화를 켤 때 → 모니터 창 자동 오픈으로 즉각적인 시각 피드백 제공
    if (nextEnabled) {
      onOpenAutomationMonitor?.(termId);
    }
  }, [termId, automationStatus, onOpenAutomationMonitor]);

  const handleAutomationStage = useCallback(
    (stage: AutomationStage) => {
      window.automationAPI?.setStage(termId, stage);
      // 낙관적 업데이트
      setAutomationStatus((prev) => (prev ? { ...prev, stage } : prev));
    },
    [termId],
  );

  const handleOpenMonitor = useCallback(() => {
    onOpenAutomationMonitor?.(termId);
  }, [termId, onOpenAutomationMonitor]);

  // ── 활성 탭 전환 시 re-fit + 포커스 ────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const tid = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          terminalHost.fit(termId);
          terminalHost.focus(termId);
        });
      });
    }, 20);
    return () => clearTimeout(tid);
  }, [isActive, termId]);

  // ── 검색 핸들러 ──────────────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (value) terminalHost.findNext(termId, value);
    },
    [termId],
  );

  const handleSearchNext = useCallback(() => {
    if (searchQuery) terminalHost.findNext(termId, searchQuery);
  }, [termId, searchQuery]);

  const handleSearchPrev = useCallback(() => {
    if (searchQuery) terminalHost.findPrev(termId, searchQuery);
  }, [termId, searchQuery]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    terminalHost.focus(termId);
  }, [termId]);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleSaveLog = useCallback(() => {
    const text = terminalHost.getBufferText(termId);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    window.terminalAPI.saveLog({ defaultName: `terminal-${stamp}.log`, text }).catch(() => {});
  }, [termId]);

  const handleSaveTerminalProfile = useCallback(() => {
    onSaveTerminalProfile?.(termId);
  }, [onSaveTerminalProfile, termId]);

  const dispatchBotContextMessage = useCallback((text: string) => {
    sendXenesisContextMessage(text, { source: `terminal:${termId}` });
  }, []);

  const currentTerminalSession = useCallback(
    () => terminalHost.listSessions().find((session) => session.id === termId),
    [termId],
  );

  const currentAutomationMode: AutomationMode =
    automationStatus?.mode ?? ((automationStatus?.autoSend ?? false) ? 'respond' : 'watch');
  const currentAutomationModeLabel =
    currentAutomationMode === 'stream'
      ? t('monitor.modeStream')
      : currentAutomationMode === 'watch'
        ? t('monitor.modeWatch')
        : t('monitor.modeRespond');

  const sendSelectionToBot = useCallback(() => {
    const selectedText = terminalHost.getSelection(termId);
    const message = buildTerminalBotContextMessageFromSession(currentTerminalSession(), {
      mode: 'selection',
      selectedText,
    });
    dispatchBotContextMessage(message);
  }, [currentTerminalSession, dispatchBotContextMessage, termId]);

  const sendRecentOutputToBot = useCallback(() => {
    const lines = terminalHost.getBufferText(termId).split(/\r?\n/);
    const recentOutput = lines.slice(-200).join('\n');
    const message = buildTerminalBotContextMessageFromSession(currentTerminalSession(), {
      mode: 'recent-output',
      recentOutput,
    });
    dispatchBotContextMessage(message);
  }, [currentTerminalSession, dispatchBotContextMessage, termId]);

  // ── 크기 고정 / 스크롤 ────────────────────────────────────────────────────
  const handleFitLockToggle = useCallback(() => {
    const next = !fitLocked;
    setFitLocked(next);
    terminalHost.setFitLock(termId, next);
    // 잠금 해제 시 터미널 포커스 복원은 setFitLock 내부 re-fit 후 처리
    if (next) terminalHost.focus(termId);
  }, [fitLocked, termId]);

  /**
   * ⇈ 스크롤 위로:
   *  - Alt buffer / PageControl normal buffer: 앱에 Page Up 키 전송
   *  - Normal buffer: 내부 터미널 높이를 확장해 이전 출력 표시
   *  - Shift+클릭: app-managed 키 입력을 강제로 전송
   */
  const handleScrollToTop = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      if (event?.shiftKey) {
        cancelHistoryWheelFrame();
        terminalHost.sendAppManagedPage(termId, 'previous');
        terminalHost.focus(termId);
        return;
      }
      if (isAltBuffer || terminalHost.isAppManagedNormalBufferPageControl(termId)) {
        cancelHistoryWheelFrame();
        terminalHost.scrollToTop(termId);
        terminalHost.focus(termId);
        return;
      }
      const step = scrollWrapperRef.current?.clientHeight ?? 400;
      cancelHistoryWheelFrame();
      setExpandedHeight((prev) => {
        const next = resolveHistoryPagingHeight({
          action: 'previous',
          currentExpandedHeight: prev,
          viewportHeight: step,
        });
        syncHistoryPageDepthFromHeight(next, step);
        return next;
      });
      terminalHost.focus(termId);
    },
    [termId, isAltBuffer, cancelHistoryWheelFrame, syncHistoryPageDepthFromHeight],
  );

  /**
   * ⇊ 스크롤 아래로:
   *  - Alt buffer: TUI 앱에 Page Down 키 전송
   *  - PageControl normal buffer: Page Down 키 전송 또는 최신 출력으로 즉시 이동
   *  - Normal buffer: 확장된 높이를 줄이며 다음 출력 표시
   *  - Ctrl/Alt + 클릭: 최신 출력으로 즉시 이동
   *  - Shift+클릭: app-managed 키 입력을 강제로 전송
   */
  const handleScrollToBottom = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      if (event?.shiftKey) {
        cancelHistoryWheelFrame();
        terminalHost.sendAppManagedPage(termId, 'next');
        terminalHost.focus(termId);
        return;
      }
      if (isAltBuffer) {
        cancelHistoryWheelFrame();
        terminalHost.scrollToBottom(termId);
        terminalHost.focus(termId);
        return;
      }
      if (terminalHost.isAppManagedNormalBufferPageControl(termId)) {
        cancelHistoryWheelFrame();
        if (event?.ctrlKey || event?.altKey) {
          historyPageDepthRef.current = 0;
          setExpandedHeight(0);
          scrollToLatestAfterFit();
        } else {
          terminalHost.scrollToBottom(termId);
          terminalHost.focus(termId);
        }
        return;
      }
      const step = scrollWrapperRef.current?.clientHeight ?? 400;
      const action = event?.ctrlKey || event?.altKey ? 'latest' : 'next';
      cancelHistoryWheelFrame();
      setExpandedHeight((prev) => {
        const next = resolveHistoryPagingHeight({
          action,
          currentExpandedHeight: prev,
          viewportHeight: step,
        });
        syncHistoryPageDepthFromHeight(next, step);
        if (action === 'latest' || next === 0) {
          scrollToLatestAfterFit();
          return 0;
        }
        terminalHost.focus(termId);
        return next;
      });
    },
    [termId, isAltBuffer, scrollToLatestAfterFit, cancelHistoryWheelFrame, syncHistoryPageDepthFromHeight],
  );

  const handleWheelProbe = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) {
        cancelHistoryWheelFrame();
        terminalHost.sendAppManagedWheelDelta(termId, event.deltaY, event.deltaMode);
        terminalHost.focus(termId);
        return;
      }
      if (isAltBuffer || terminalHost.isAppManagedNormalBufferPageControl(termId)) {
        cancelHistoryWheelFrame();
        terminalHost.scrollByWheelDelta(termId, event.deltaY, event.deltaMode);
        terminalHost.focus(termId);
        return;
      }
      const step = scrollWrapperRef.current?.clientHeight ?? 400;
      pendingHistoryWheelDeltaRef.current += resolveHistoryWheelDeltaPixels({
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        viewportHeight: step,
      });
      scheduleHistoryWheelFrame();
    },
    [termId, isAltBuffer, cancelHistoryWheelFrame, scheduleHistoryWheelFrame],
  );

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  return (
    <div className="dock-terminal-root">
      {searchOpen && (
        <div className="dock-search-bar">
          <input
            ref={searchInputRef}
            className="dock-search-input"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.shiftKey ? handleSearchPrev() : handleSearchNext();
              } else if (e.key === 'Escape') {
                closeSearch();
              }
            }}
            placeholder={t('terminal.searchPlaceholder')}
            aria-label={t('terminal.searchAriaLabel')}
          />
          <button onClick={handleSearchPrev} title={t('terminal.prevResult')}>
            ↑
          </button>
          <button onClick={handleSearchNext} title={t('terminal.nextResult')}>
            ↓
          </button>
          <button onClick={closeSearch} title={t('terminal.closeSearch')}>
            ✕
          </button>
        </div>
      )}

      {/* ── 스크롤 래퍼 + 터미널 호스트 ──────────────────────────────────────── */}
      <div ref={scrollWrapperRef} className="dock-terminal-scroll-wrapper">
        <div
          ref={mountRef}
          className={`dock-terminal-host${expandedHeight > 0 ? ' is-expanded' : ''}`}
          style={expandedHeight > 0 ? { height: `calc(100% + ${expandedHeight}px)` } : undefined}
        />
      </div>

      {/* ── 자동화 상태 배지 ─────────────────────────────────────────────── */}
      {automationStatus?.enabled && (
        <div
          className={`term-auto-badge${automationStatus.blocked ? ' term-auto-badge-blocked' : ''}`}
          title={
            automationStatus.blocked
              ? t('terminal.blockedStatus', { reason: automationStatus.blockReason ?? '' })
              : currentAutomationMode === 'stream'
                ? `${currentAutomationModeLabel}\n${t('terminal.clickToOpenMonitor')}`
                : `${t('terminal.watchingStatus')} — ${STAGE_LABELS[automationStatus.stage]} / ${currentAutomationModeLabel}\n${t('terminal.clickToOpenMonitor')}`
          }
          onClick={handleOpenMonitor}
        >
          {automationStatus.blocked ? (
            t('terminal.blockedBadge')
          ) : (
            <>
              <span className="term-auto-badge-dot">●</span>{' '}
              {t('terminal.watchingBadge', { stage: String(automationStatus.stage) })}
              <span className="term-auto-badge-mode">
                {' '}
                {currentAutomationMode === 'stream'
                  ? 'Stream'
                  : currentAutomationMode === 'respond'
                    ? 'Auto'
                    : t('terminal.manualBadge')}
              </span>
            </>
          )}
        </div>
      )}

      {/* ── 스크롤 오버레이 툴바 ────────────────────────────────────────── */}
      <div className="term-scroll-toolbar" aria-label={t('terminal.scrollTool')}>
        {/* Alternate buffer 상태 배지 — TUI 앱 실행 중일 때 표시 */}
        {isAltBuffer && (
          <div className="term-alt-badge" title={t('terminal.tuiAltScreen')}>
            TUI
          </div>
        )}
        {!isAltBuffer && expandedHeight > 0 && (
          <div className="term-alt-badge term-history-badge" title={t('terminal.backToLatest')}>
            {t('terminal.prevBtn')}
          </div>
        )}
        <div
          className="term-wheel-probe"
          role="button"
          tabIndex={0}
          onWheel={handleWheelProbe}
          title={t('terminal.wheelProbeHint')}
          aria-label={t('terminal.wheelProbeLabel')}
        />
        <button
          className={`term-scroll-btn${fitLocked ? ' is-locked' : ''}`}
          onClick={handleFitLockToggle}
          title={fitLocked ? t('terminal.unlockSizeTitle') : t('terminal.lockSizeTitle')}
          aria-pressed={fitLocked}
        >
          {fitLocked ? '🔒' : '🔓'}
        </button>
        <button
          className="term-scroll-btn"
          onClick={handleScrollToTop}
          title={isAltBuffer ? t('terminal.pageUpTui') : t('terminal.pageUpHint')}
        >
          ⇈
        </button>
        <button
          className={`term-scroll-btn${!isAltBuffer && expandedHeight > 0 ? ' is-active' : ''}`}
          onClick={handleScrollToBottom}
          title={
            isAltBuffer
              ? t('terminal.pageDownTui')
              : expandedHeight > 0
                ? t('terminal.backToLatest')
                : t('terminal.backToLatestBtn')
          }
        >
          ⇊
        </button>
      </div>

      {/* 우클릭 컨텍스트 메뉴 */}
      {menu && (
        <TerminalContextMenu
          menu={menu}
          termId={termId}
          onClose={closeMenu}
          onSearch={openSearch}
          automationStatus={automationStatus}
          onAutomationToggle={handleAutomationToggle}
          onAutomationStage={handleAutomationStage}
          onOpenMonitor={handleOpenMonitor}
          onSaveLog={handleSaveLog}
          onSaveTerminalProfile={handleSaveTerminalProfile}
          onSendSelectionToBot={sendSelectionToBot}
          onSendRecentOutputToBot={sendRecentOutputToBot}
        />
      )}
    </div>
  );
}
