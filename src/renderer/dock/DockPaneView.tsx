import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { McpBridgeOnboardingScenarioRunResult, RemoteFileProfile } from '../../shared/types';
import { getExtensionContentIcon, isExtensionViewerContentType, renderExtensionContent } from '../extensions/registry';
import { useI18n } from '../i18n';
import { BrowserPane } from '../panes/BrowserPane';
import { CodePane } from '../panes/CodePane';
import { CommandCenterPane, type CommandCenterPaneProps } from '../panes/CommandCenterPane';
import { DiagnosticsPane } from '../panes/DiagnosticsPane';
import { DocumentPreviewPane } from '../panes/DocumentPreviewPane';
import { ExtensionPanelPane } from '../panes/ExtensionPanelPane';
import { HexPane } from '../panes/HexPane';
import { ImagePane } from '../panes/ImagePane';
import { MarkdownPane } from '../panes/MarkdownPane';
import { MermaidPane } from '../panes/MermaidPane';
import { OnboardingPane } from '../panes/OnboardingPane';
import type { OnboardingStepVerifier } from '../panes/onboarding/onboardingTypes';
import SettingsPane from '../panes/SettingsPane';
import { XconViewerPane } from '../panes/XconViewerPane';
import AutomationMonitorPane from '../terminal/AutomationMonitorPane';
import TerminalPane from '../terminal/TerminalPane';
import { terminalHost } from '../terminal/terminalHost';
import { shortTerminalId, terminalIdentityTitle } from '../terminal/terminalIdentity';
import { Bounds, DockEngine, DockPane, DockState } from './engine';

const PANE_BODY_FILE_DRAG_IDLE_RESET_MS = 450;

interface DockPaneViewProps {
  pane: DockPane;
  engine: DockEngine;
  winState: DockState | 'float';
  onStatus: (msg: string) => void;
  floatBoundsRef: React.MutableRefObject<Map<string, Bounds>>;
  /** 외부 OS 파일을 이 패인 위에 드롭했을 때 호출 */
  onExtFileDrop?: (files: File[], pane: DockPane) => void;
  /**
   * 플로팅 창 전용: 탭 바 빈 영역 포인터 다운 핸들러.
   * FloatWindow에서 주입하며, 창 이동(드래그) 로직을 담당.
   */
  onTabBarPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  /**
   * 플로팅 창 전용: 탭 바 우측 ↧ 버튼 클릭 시 도킹 복귀.
   */
  onDockAction?: () => void;
  /** 터미널에서 자동화 감시 창 열기 요청 */
  onOpenAutomationMonitor?: (termId: string) => void;
  /** 터미널에서 현재 세션을 로컬 터미널 프로필로 저장 요청 */
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
}

// Lazily reload file contents if fileContent is missing (after layout restore)
function FileContentLoader({
  contentId,
  filePath,
  fileExt,
  fileName,
  contentType,
  remoteFileProfile,
  remoteFilePath,
  engine,
  onLoaded,
}: {
  contentId: string;
  filePath: string;
  fileExt: string;
  fileName: string;
  contentType: 'markdown' | 'mermaid' | 'code' | 'image' | 'hex' | 'document-preview';
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
  engine: DockEngine;
  onLoaded: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load =
      remoteFileProfile && remoteFilePath
        ? window.remoteFileAPI.readFile(remoteFileProfile, remoteFilePath)
        : window.fileAPI.readFile(filePath);

    load
      .then((result) => {
        if (cancelled) return;
        if (result) {
          engine.updateContentPayload(contentId, {
            fileContent: result.content,
            ...(result.totalBytes !== undefined ? { totalBytes: result.totalBytes } : {}),
          });
          onLoaded();
        } else {
          setError(t('dock.fileNotFound'));
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('dock.fileLoadError'));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contentId, filePath, remoteFilePath, remoteFileProfile, engine, onLoaded, t]);

  if (loading) return <div className="file-loading">📂 {t('dock.fileLoading', { fileName })}</div>;
  if (error)
    return (
      <div className="file-error">
        <span>⚠ {error}</span>
        <p className="file-error-path">{filePath}</p>
      </div>
    );
  return null;
}

function ContentView({
  contentId,
  engine,
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
}: {
  contentId: string;
  engine: DockEngine;
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
}) {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const content = engine.contents.get(contentId);
  if (!content) return null;

  const onContentUpdate = useCallback(
    (fileContent: string) => {
      engine.updateContentPayload(contentId, { fileContent });
    },
    [contentId, engine],
  );

  const onUrlChange = useCallback(
    (url: string) => {
      engine.updateContentPayload(contentId, { url });
    },
    [contentId, engine],
  );

  // 페이지 타이틀 → 도킹 탭 제목 갱신
  const onTitleChange = useCallback(
    (title: string) => {
      const c = engine.contents.get(contentId);
      if (!c || c.contentType !== 'browser') return;
      c.title = title;
      engine.notify();
    },
    [contentId, engine],
  );

  /**
   * 마크다운 내 파일 링크 클릭 시 → 절대 경로로 파일을 읽어 새 탭으로 열기.
   * 네비게이션을 발생시키지 않으므로 터미널이 죽지 않는다.
   */
  const onOpenFile = useCallback(
    async (absolutePath: string) => {
      try {
        const result = await window.fileAPI.readFile(absolutePath);
        if (!result) return;
        const id = `file-${crypto.randomUUID()}`;
        const ext = result.ext;
        if (ext === 'svg' || ext === 'html' || ext === 'htm') {
          const isHtml = ext === 'html' || ext === 'htm';
          const fileUrl = `file:///${absolutePath.replace(/\\/g, '/')}`;
          engine.addContent({
            id,
            title: result.fileName,
            state: 'document',
            html: '',
            contentType: 'browser',
            url: fileUrl,
            ...(isHtml
              ? {
                  filePath: result.filePath,
                  fileName: result.fileName,
                  fileContent: result.content,
                  fileExt: result.ext,
                  browserSourceKind: 'local-file' as const,
                }
              : {}),
          });
        } else {
          const isXcon = ext === 'xcon' || ext === 'xconj' || ext === 'xcon.json' || ext === 'xcon.xml';
          const isMermaid = ext === 'mmd';
          const resolvedType = isXcon ? 'xcon-viewer' : isMermaid ? 'mermaid' : result.contentType;
          engine.addContent({
            id,
            title: result.fileName,
            state: 'document',
            html: '',
            contentType: resolvedType,
            filePath: result.filePath,
            fileName: result.fileName,
            fileContent: result.content,
            fileExt: result.ext,
            totalBytes: result.totalBytes,
          });
        }
      } catch {
        // 파일 열기 실패 시 조용히 무시
      }
    },
    [engine],
  );

  if (content.contentType === 'terminal') {
    return content.termId ? (
      <TerminalPane
        termId={content.termId}
        isActive={true}
        onOpenAutomationMonitor={onOpenAutomationMonitor}
        onSaveTerminalProfile={onSaveTerminalProfile}
      />
    ) : null;
  }

  if (content.contentType === 'command-center') {
    return commandCenterProps ? (
      <CommandCenterPane {...commandCenterProps} />
    ) : (
      <div className="file-error">{t('dock.noContent')}</div>
    );
  }

  if (content.contentType === 'automation-monitor') {
    return content.termId ? (
      <AutomationMonitorPane termId={content.termId} termLabel={content.title} />
    ) : (
      <div className="file-error">{t('dock.missingTermId')}</div>
    );
  }

  if (content.contentType === 'browser') {
    return (
      <BrowserPane
        contentId={content.id}
        initialUrl={content.url ?? 'https://www.google.com'}
        filePath={content.filePath}
        fileName={content.fileName}
        fileExt={content.fileExt}
        initialSource={content.fileContent}
        sourceKind={content.browserSourceKind}
        onSourceUpdate={onContentUpdate}
        onUrlChange={onUrlChange}
        onTitleChange={onTitleChange}
        onOpenInDesk={onBrowserPopupOpen}
      />
    );
  }

  if (content.contentType === 'markdown') {
    if (!content.fileName) {
      return <div className="file-error">{t('dock.noFilename')}</div>;
    }
    // fileContent 없고 filePath 있으면 IPC로 로드
    if (!content.fileContent && content.filePath) {
      return (
        <FileContentLoader
          key={tick}
          contentId={contentId}
          filePath={content.filePath}
          fileExt={content.fileExt ?? 'md'}
          fileName={content.fileName}
          contentType="markdown"
          remoteFileProfile={content.remoteFileProfile}
          remoteFilePath={content.remoteFilePath}
          engine={engine}
          onLoaded={reload}
        />
      );
    }
    if (!content.fileContent) {
      return <div className="file-error">{t('dock.noContent')}</div>;
    }
    return (
      <MarkdownPane
        filePath={content.filePath ?? content.fileName}
        fileName={content.fileName}
        initialContent={content.fileContent}
        remoteFileProfile={content.remoteFileProfile}
        remoteFilePath={content.remoteFilePath}
        renderOptions={content.renderOptions}
        onContentUpdate={onContentUpdate}
        onOpenFile={onOpenFile}
      />
    );
  }

  if (content.contentType === 'mermaid') {
    if (!content.fileName) {
      return <div className="file-error">{t('dock.noFilename')}</div>;
    }
    if (!content.fileContent && content.filePath) {
      return (
        <FileContentLoader
          key={tick}
          contentId={contentId}
          filePath={content.filePath}
          fileExt={content.fileExt ?? 'mmd'}
          fileName={content.fileName}
          contentType="mermaid"
          remoteFileProfile={content.remoteFileProfile}
          remoteFilePath={content.remoteFilePath}
          engine={engine}
          onLoaded={reload}
        />
      );
    }
    if (!content.fileContent) {
      return <div className="file-error">{t('dock.noContent')}</div>;
    }
    return (
      <MermaidPane
        filePath={content.filePath ?? content.fileName}
        fileName={content.fileName}
        initialContent={content.fileContent}
        remoteFileProfile={content.remoteFileProfile}
        remoteFilePath={content.remoteFilePath}
        onContentUpdate={onContentUpdate}
      />
    );
  }

  if (content.contentType === 'code') {
    if (!content.fileName) {
      return <div className="file-error">{t('dock.noFilename')}</div>;
    }
    if (!content.fileContent && content.filePath) {
      return (
        <FileContentLoader
          key={tick}
          contentId={contentId}
          filePath={content.filePath}
          fileExt={content.fileExt ?? 'txt'}
          fileName={content.fileName}
          contentType="code"
          remoteFileProfile={content.remoteFileProfile}
          remoteFilePath={content.remoteFilePath}
          engine={engine}
          onLoaded={reload}
        />
      );
    }
    if (!content.fileContent) {
      return <div className="file-error">{t('dock.noContent')}</div>;
    }
    return (
      <CodePane
        filePath={content.filePath ?? content.fileName}
        fileName={content.fileName}
        ext={content.fileExt ?? 'txt'}
        initialContent={content.fileContent}
        remoteFileProfile={content.remoteFileProfile}
        remoteFilePath={content.remoteFilePath}
        onContentUpdate={onContentUpdate}
      />
    );
  }

  if (content.contentType === 'image') {
    if (!content.fileName) {
      return <div className="file-error">{t('dock.noFilename')}</div>;
    }
    if (!content.fileContent && content.filePath) {
      return (
        <FileContentLoader
          key={tick}
          contentId={contentId}
          filePath={content.filePath}
          fileExt={content.fileExt ?? 'png'}
          fileName={content.fileName}
          contentType="image"
          remoteFileProfile={content.remoteFileProfile}
          remoteFilePath={content.remoteFilePath}
          engine={engine}
          onLoaded={reload}
        />
      );
    }
    if (!content.fileContent) {
      return <div className="file-error">{t('dock.noImage')}</div>;
    }
    return (
      <ImagePane
        fileName={content.fileName}
        filePath={content.filePath ?? content.fileName}
        imageUrl={content.fileContent}
      />
    );
  }

  if (content.contentType === 'hex') {
    if (!content.fileName) {
      return <div className="file-error">{t('dock.noFilename')}</div>;
    }
    if (!content.fileContent && content.filePath) {
      return (
        <FileContentLoader
          key={tick}
          contentId={contentId}
          filePath={content.filePath}
          fileExt={content.fileExt ?? ''}
          fileName={content.fileName}
          contentType="hex"
          remoteFileProfile={content.remoteFileProfile}
          remoteFilePath={content.remoteFilePath}
          engine={engine}
          onLoaded={reload}
        />
      );
    }
    if (!content.fileContent) {
      return <div className="file-error">{t('dock.noContent')}</div>;
    }
    return (
      <HexPane
        fileName={content.fileName}
        filePath={content.filePath ?? content.fileName}
        content={content.fileContent}
        totalBytes={content.totalBytes}
      />
    );
  }

  if (content.contentType === 'document-preview') {
    if (!content.fileName) {
      return <div className="file-error">{t('dock.noFilename')}</div>;
    }
    if (!content.fileContent && content.filePath) {
      return (
        <FileContentLoader
          key={tick}
          contentId={contentId}
          filePath={content.filePath}
          fileExt={content.fileExt ?? ''}
          fileName={content.fileName}
          contentType="document-preview"
          remoteFileProfile={content.remoteFileProfile}
          remoteFilePath={content.remoteFilePath}
          engine={engine}
          onLoaded={reload}
        />
      );
    }
    if (!content.fileContent) {
      return <div className="file-error">{t('dock.noContent')}</div>;
    }
    return (
      <DocumentPreviewPane
        fileName={content.fileName}
        filePath={content.filePath ?? content.fileName}
        ext={content.fileExt ?? ''}
        content={content.fileContent}
        onContentUpdate={onContentUpdate}
      />
    );
  }

  if (content.contentType === 'xcon-viewer') {
    if (!content.fileName) {
      return <div className="file-error">{t('dock.noFilename')}</div>;
    }
    if (!content.fileContent && content.filePath) {
      return (
        <FileContentLoader
          key={tick}
          contentId={contentId}
          filePath={content.filePath}
          fileExt={content.fileExt ?? 'xcon'}
          fileName={content.fileName}
          contentType="code"
          remoteFileProfile={content.remoteFileProfile}
          remoteFilePath={content.remoteFilePath}
          engine={engine}
          onLoaded={reload}
        />
      );
    }
    if (!content.fileContent) {
      return <div className="file-error">{t('dock.noContent')}</div>;
    }
    return (
      <XconViewerPane
        filePath={content.filePath ?? content.fileName}
        fileName={content.fileName}
        ext={content.fileExt ?? 'xcon'}
        initialContent={content.fileContent}
        remoteFileProfile={content.remoteFileProfile}
        remoteFilePath={content.remoteFilePath}
        renderOptions={content.renderOptions}
        onContentUpdate={onContentUpdate}
      />
    );
  }

  if (content.contentType === 'settings') {
    return <SettingsPane />;
  }

  if (content.contentType === 'diagnostics') {
    return <DiagnosticsPane />;
  }

  if (content.contentType === 'onboarding') {
    return (
      <OnboardingPane
        contentId={contentId}
        onOpenFolder={onOnboardingOpenFolder ?? (() => {})}
        onOpenTerminal={onOnboardingOpenTerminal ?? (() => {})}
        onOpenFile={onOnboardingOpenFile ?? (() => {})}
        onOpenWorkspace={onOnboardingOpenWorkspace ?? (() => {})}
        onOpenAiProviderSettings={onOnboardingOpenAiProviderSettings ?? (() => {})}
        onOpenProviderSetupPlan={onOnboardingOpenProviderSetupPlan ?? (() => {})}
        onOpenExternalToolSetup={onOnboardingOpenExternalToolSetup ?? (() => {})}
        onOpenToolConnectors={onOnboardingOpenToolConnectors ?? (() => {})}
        onOpenMcpSetup={onOnboardingOpenMcpSetup ?? (() => {})}
        onOpenMcpOauth={onOnboardingOpenMcpOauth ?? (() => {})}
        onOpenKeyboardShortcuts={onOnboardingOpenKeyboardShortcuts ?? (() => {})}
        onOpenExtensions={onOnboardingOpenExtensions ?? (() => {})}
        onOpenDiagnostics={onOnboardingOpenDiagnostics ?? (() => {})}
        onOpenCommandCenter={onOnboardingOpenCommandCenter ?? (() => {})}
        onArrangePanes={onOnboardingArrangePanes ?? (() => {})}
        onSaveWorkspace={onOnboardingSaveWorkspace ?? (() => {})}
        onRestoreWorkspace={onOnboardingRestoreWorkspace ?? (() => {})}
        onUseWorkspacePath={onOnboardingUseWorkspacePath ?? (() => {})}
        onVerifyStep={onOnboardingVerifyStep ?? (async () => ({ passed: false }))}
        onRunScenario={
          onOnboardingRunScenario ??
          (async () => ({
            requestId: '',
            trackId: 'basic-desk',
            ok: false,
            completed: false,
            steps: [],
            error: 'Onboarding scenario runner is not available.',
          }))
        }
        onVerifyAll={
          onOnboardingVerifyAll ??
          (async () => ({
            requestId: '',
            trackId: 'basic-desk',
            ok: false,
            completed: false,
            steps: [],
            error: 'Onboarding verifier is not available.',
          }))
        }
        onEnsureVisible={() => {
          const pane = engine.findPaneByContent(contentId);
          if (!pane) return;
          pane.activateContent(contentId);
          engine.activePaneId = pane.id;
          engine.notify();
        }}
        onDismiss={onOnboardingDismiss ?? (() => {})}
      />
    );
  }

  if (content.contentType === 'extension-panel') {
    return <ExtensionPanelPane title={content.title} html={content.html} />;
  }

  const extensionContent = renderExtensionContent(content, { engine, openFileByPath: onOpenFile });
  if (extensionContent) {
    return extensionContent;
  }

  // default: html
  return <span dangerouslySetInnerHTML={{ __html: content.html }} />;
}

// ─── 탭 컨텍스트 메뉴 ──────────────────────────────────────────────────────────

interface TabContextMenuState {
  x: number;
  y: number;
  contentId: string;
  paneId: string;
}

function TabContextMenu({
  menu,
  pane,
  engine,
  onClose,
  onStatus,
}: {
  menu: TabContextMenuState;
  pane: DockPane;
  engine: DockEngine;
  onClose: () => void;
  onStatus: (msg: string) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', close, true);
    return () => window.removeEventListener('mousedown', close, true);
  }, [onClose]);

  const idx = pane.contents.indexOf(menu.contentId);
  const hasRight = idx >= 0 && idx < pane.contents.length - 1;
  const hasOthers = pane.contents.length > 1;
  const content = engine.contents.get(menu.contentId);
  const canSendToBot = Boolean(content?.filePath || content?.remoteFilePath);
  const sourcePane = engine.panes.get(menu.paneId);
  const canArrangeGroup = Boolean(
    sourcePane &&
      sourcePane.state !== 'float' &&
      sourcePane.state !== 'hidden' &&
      (sourcePane.contents.length > 1 || sourcePane.group),
  );

  const killAndClose = (termIds: string[]) => {
    for (const tid of termIds) terminalHost.kill(tid);
  };

  const handleSendToBot = () => {
    if (!canSendToBot) return;
    window.dispatchEvent(
      new CustomEvent('xenesis-send-file-to-bot', {
        detail: { contentId: menu.contentId },
      }),
    );
    onStatus(`Sent to Xenesis Agent: ${content?.title || content?.fileName || menu.contentId}`);
    onClose();
  };

  const handleCloseThis = () => {
    if (content?.contentType === 'terminal' && content.termId) {
      terminalHost.kill(content.termId);
    }
    try {
      engine.closeContent(menu.contentId);
    } catch {
      /* ignore */
    }
    onStatus(t('common.tab.closeThis', { title: content?.title ?? menu.contentId }));
    onClose();
  };

  const handleCloseOthers = () => {
    const termIds = engine.closeOtherContentsInPane(menu.paneId, menu.contentId);
    killAndClose(termIds);
    onStatus(t('common.tab.closeOthers'));
    onClose();
  };

  const handleCloseRight = () => {
    const termIds = engine.closeContentsToRightInPane(menu.paneId, menu.contentId);
    killAndClose(termIds);
    onStatus(t('common.tab.closeRight'));
    onClose();
  };

  const handleCloseAll = () => {
    const termIds = engine.closeAllContentsInPane(menu.paneId);
    killAndClose(termIds);
    onStatus(t('common.tab.closeGroup'));
    onClose();
  };

  const handleArrangeGroupHorizontal = () => {
    onStatus(engine.arrangePaneGroup(menu.paneId, 'row', menu.contentId));
    onClose();
  };

  const handleArrangeGroupVertical = () => {
    onStatus(engine.arrangePaneGroup(menu.paneId, 'column', menu.contentId));
    onClose();
  };

  const handleArrangeGroupGrid = () => {
    onStatus(engine.arrangePaneGroup(menu.paneId, 'grid', menu.contentId));
    onClose();
  };

  const handleMergeGroup = () => {
    onStatus(engine.mergePaneGroup(menu.paneId, menu.contentId));
    onClose();
  };

  // 화면 경계 처리 (메뉴가 화면 밖으로 나가지 않도록)
  const [pos, setPos] = useState({ left: menu.x, top: menu.y });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = menu.x;
    let top = menu.y;
    if (left + rect.width > window.innerWidth - 4) left = window.innerWidth - rect.width - 4;
    if (top + rect.height > window.innerHeight - 4) top = window.innerHeight - rect.height - 4;
    if (left !== menu.x || top !== menu.y) setPos({ left, top });
  }, [menu.x, menu.y]);

  const stripArrangeIcon = (label: string) => label.replace(/^[⊟⊠⊞⊡]\s*/, '');

  return createPortal(
    <div
      ref={ref}
      className="tab-ctx-menu"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button className="tab-ctx-item" onClick={handleSendToBot} disabled={!canSendToBot}>
        Send to Xenesis Agent
      </button>
      <div className="tab-ctx-sep" />
      <button className="tab-ctx-item" onClick={handleCloseThis}>
        {t('common.tab.closeThisIcon')}
      </button>
      <button className="tab-ctx-item" onClick={handleCloseOthers} disabled={!hasOthers}>
        {t('common.tab.closeOthersIcon')}
      </button>
      <button className="tab-ctx-item" onClick={handleCloseRight} disabled={!hasRight}>
        {t('common.tab.closeRightIcon')}
      </button>
      <div className="tab-ctx-sep" />
      <button className="tab-ctx-item" onClick={handleArrangeGroupHorizontal} disabled={!canArrangeGroup}>
        <span className="arrange-icon arrange-icon--rotate90">⊟</span>
        <span>{stripArrangeIcon(t('common.tab.arrangeGroupHorizontalIcon'))}</span>
      </button>
      <button className="tab-ctx-item" onClick={handleArrangeGroupVertical} disabled={!canArrangeGroup}>
        <span className="arrange-icon">⊟</span>
        <span>{stripArrangeIcon(t('common.tab.arrangeGroupVerticalIcon'))}</span>
      </button>
      <button className="tab-ctx-item" onClick={handleArrangeGroupGrid} disabled={!canArrangeGroup}>
        <span className="arrange-icon">⊞</span>
        <span>{stripArrangeIcon(t('common.tab.arrangeGroupGridIcon'))}</span>
      </button>
      <button className="tab-ctx-item arrange-merge" onClick={handleMergeGroup} disabled={!canArrangeGroup}>
        <span className="arrange-icon">⊡</span>
        <span>{stripArrangeIcon(t('common.tab.mergeGroupIcon'))}</span>
      </button>
      <div className="tab-ctx-sep" />
      <button className="tab-ctx-item tab-ctx-item--danger" onClick={handleCloseAll}>
        {t('common.tab.closeGroupIcon')}
      </button>
    </div>,
    document.body,
  );
}

// ─── DockPaneView ──────────────────────────────────────────────────────────────

export default function DockPaneView({
  pane,
  engine,
  winState,
  onStatus,
  onExtFileDrop,
  onTabBarPointerDown,
  onDockAction,
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
}: DockPaneViewProps) {
  const { t, locale } = useI18n();
  const paneRef = useRef<HTMLElement>(null);

  // titleKey 가 있으면 현재 locale로 재번역, 없으면 저장된 title 사용
  const getDisplayTitle = useCallback(
    (c: { title: string; titleKey?: string; titleVars?: Record<string, string | number> }) =>
      c.titleKey ? t(c.titleKey, c.titleVars) : c.title,
    // locale 변경 시 리렌더 트리거
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale],
  );
  const tabsRef = useRef<HTMLDivElement>(null);

  // ── 탭 스크롤 상태 ──────────────────────────────────────────────────────────
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateScrollState);
    };
    // pane.contents.length 가 바뀌면 탭 추가/제거로 스크롤 상태 재계산 필요
  }, [pane.contents.length, updateScrollState]);

  // 마우스 휠로 탭 바 수평 스크롤 (비passive 핸들러)
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateScrollState();
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [updateScrollState]);

  const scrollTabs = useCallback((dir: 'left' | 'right') => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -150 : 150, behavior: 'smooth' });
  }, []);

  // ── 컨텍스트 메뉴 ──────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null);

  const handleTabContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, contentId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, contentId, paneId: pane.id });
    },
    [pane.id],
  );

  // ── 패인 포커스 추적 ────────────────────────────────────────────────────────
  const markActive = useCallback(() => {
    engine.activePaneId = pane.id;
  }, [engine, pane.id]);

  // ── pane-body 외부 파일 드래그 앤 드롭 ──────────────────────────────────────
  const [isPaneBodyDragOver, setIsPaneBodyDragOver] = useState(false);
  const paneBodyDragCounterRef = useRef(0);
  const paneBodyDragWatchdogRef = useRef<number | null>(null);

  const isExtFileDrag = (e: React.DragEvent): boolean => {
    const types = Array.from(e.dataTransfer.types);
    return types.includes('Files') && !types.some((t) => t.startsWith('application/xamong'));
  };

  const clearPaneBodyDragWatchdog = useCallback(() => {
    if (paneBodyDragWatchdogRef.current === null) return;
    window.clearTimeout(paneBodyDragWatchdogRef.current);
    paneBodyDragWatchdogRef.current = null;
  }, []);

  const resetPaneBodyDragOverlay = useCallback(() => {
    paneBodyDragCounterRef.current = 0;
    clearPaneBodyDragWatchdog();
    setIsPaneBodyDragOver(false);
  }, [clearPaneBodyDragWatchdog]);

  const armPaneBodyDragWatchdog = useCallback(() => {
    clearPaneBodyDragWatchdog();
    paneBodyDragWatchdogRef.current = window.setTimeout(() => {
      paneBodyDragCounterRef.current = 0;
      paneBodyDragWatchdogRef.current = null;
      setIsPaneBodyDragOver(false);
    }, PANE_BODY_FILE_DRAG_IDLE_RESET_MS);
  }, [clearPaneBodyDragWatchdog]);

  useEffect(() => {
    const handleWindowDragLeave = (event: DragEvent) => {
      const leftViewport =
        event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight;
      if (leftViewport) resetPaneBodyDragOverlay();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') resetPaneBodyDragOverlay();
    };

    window.addEventListener('dragleave', handleWindowDragLeave, true);
    window.addEventListener('dragend', resetPaneBodyDragOverlay);
    window.addEventListener('drop', resetPaneBodyDragOverlay);
    window.addEventListener('blur', resetPaneBodyDragOverlay);
    window.addEventListener('mouseleave', resetPaneBodyDragOverlay);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('dragleave', handleWindowDragLeave, true);
      window.removeEventListener('dragend', resetPaneBodyDragOverlay);
      window.removeEventListener('drop', resetPaneBodyDragOverlay);
      window.removeEventListener('blur', resetPaneBodyDragOverlay);
      window.removeEventListener('mouseleave', resetPaneBodyDragOverlay);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearPaneBodyDragWatchdog();
    };
  }, [clearPaneBodyDragWatchdog, resetPaneBodyDragOverlay]);

  const handlePaneBodyDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!isExtFileDrag(e)) return;
      armPaneBodyDragWatchdog();
      paneBodyDragCounterRef.current += 1;
      setIsPaneBodyDragOver(true);
      // isExtFileDrag 는 렌더마다 동일하므로 deps 불필요
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [armPaneBodyDragWatchdog],
  );

  const handlePaneBodyDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!isExtFileDrag(e)) return;
      paneBodyDragCounterRef.current -= 1;
      if (paneBodyDragCounterRef.current <= 0) {
        resetPaneBodyDragOverlay();
      } else {
        armPaneBodyDragWatchdog();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [armPaneBodyDragWatchdog, resetPaneBodyDragOverlay],
  );

  const handlePaneBodyDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isExtFileDrag(e)) return;
      // preventDefault → 드롭 허용 신호 (브라우저 기본 차단 해제)
      // stopPropagation 은 하지 않음 → App의 dragover가 .pane-body 위 여부를 감지할 수 있음
      e.preventDefault();
      armPaneBodyDragWatchdog();
      e.dataTransfer.dropEffect = 'copy';
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [armPaneBodyDragWatchdog],
  );

  const handlePaneBodyDrop = useCallback(
    (e: React.DragEvent) => {
      resetPaneBodyDragOverlay();
      if (!isExtFileDrag(e)) return;
      // stopPropagation → App의 전역 drop 핸들러가 중복 실행되지 않도록 차단
      e.stopPropagation();
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files) as File[];
      if (files.length === 0) return;
      onExtFileDrop?.(files, pane);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [pane, onExtFileDrop, resetPaneBodyDragOverlay],
  );

  // ── 활성 탭을 탭바에서 보이도록 자동 스크롤 ─────────────────────────────────
  useEffect(() => {
    const el = tabsRef.current;
    if (!el || !pane.activeContentId) return;
    const activeTab = el.querySelector<HTMLElement>(`[data-content-id="${pane.activeContentId}"]`);
    if (activeTab) {
      activeTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      updateScrollState();
    }
  }, [pane.activeContentId, updateScrollState]);

  // ── 탭 이벤트 ──────────────────────────────────────────────────────────────
  const handleCaptionPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as Element).closest('button')) return;
    markActive();
    engine.beginPaneDrag?.(pane, e.nativeEvent);
  };

  const handleTabPointerDown = (e: React.PointerEvent<HTMLDivElement>, contentId: string) => {
    if (e.button !== 0 || (e.target as Element).closest('.pane-tab-close')) return;
    e.preventDefault();
    markActive();
    const startTabReorderDrag = () => {
      const startEvent = e.nativeEvent;
      const startX = startEvent.clientX;
      const startY = startEvent.clientY;
      const tabBar = tabsRef.current;
      const dragThreshold = 4;
      const tabBarTolerance = 8;
      let didDrag = false;
      let delegatedToDockDrag = false;

      const cleanup = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleCancel);
      };

      const isInsideTabBar = (event: PointerEvent): boolean => {
        if (!tabBar) return false;
        const rect = tabBar.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top - tabBarTolerance &&
          event.clientY <= rect.bottom + tabBarTolerance
        );
      };

      const indexFromPointer = (clientX: number): number => {
        if (!tabBar) return pane.contents.indexOf(contentId);
        const tabs = Array.from(tabBar.querySelectorAll<HTMLElement>('.pane-tab[data-content-id]')).filter(
          (tab) => tab.dataset.contentId !== contentId,
        );
        if (tabs.length === 0) return pane.contents.indexOf(contentId);
        for (let index = 0; index < tabs.length; index += 1) {
          const rect = tabs[index].getBoundingClientRect();
          if (clientX < rect.left + rect.width / 2) return index;
        }
        return tabs.length;
      };

      function handleMove(moveEvent: PointerEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!didDrag && Math.hypot(dx, dy) < dragThreshold) return;
        didDrag = true;

        if (!isInsideTabBar(moveEvent)) {
          delegatedToDockDrag = true;
          cleanup();
          engine.beginContentDrag?.(pane, contentId, startEvent);
          return;
        }

        moveEvent.preventDefault();
        pane.moveContentWithinPane(contentId, indexFromPointer(moveEvent.clientX));
        markActive();
        engine.notify();
      }

      function handleUp(upEvent: PointerEvent) {
        cleanup();
        if (didDrag && !delegatedToDockDrag) upEvent.preventDefault();
      }

      function handleCancel() {
        cleanup();
      }

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp, { once: true });
      window.addEventListener('pointercancel', handleCancel, { once: true });
    };
    startTabReorderDrag();
  };

  const handleTabClick = (contentId: string) => {
    pane.activateContent(contentId);
    markActive();
    const content = engine.contents.get(contentId);
    onStatus(`Activated ${content?.title ?? contentId}`);
    engine.notify();
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, contentId: string) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    handleTabClick(contentId);
  };

  const handleFloat = () => {
    const rootEl = paneRef.current?.closest('.dock-root');
    const rect = rootEl ? rootEl.getBoundingClientRect() : null;
    onStatus(engine.floatPane(pane.id, rect));
  };

  const handleClose = () => {
    if (!pane.activeContentId) return;
    const content = engine.contents.get(pane.activeContentId);
    if (content?.contentType === 'terminal' && content.termId) {
      terminalHost.kill(content.termId);
    }
    engine.closeContent(pane.activeContentId);
    onStatus(`Closed ${content?.title ?? pane.activeContentId}`);
  };

  const handleToggleArtifactTarget = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const nextPaneId = engine.artifactPaneId === pane.id ? null : pane.id;
    engine.setArtifactPane(engine.artifactPaneId === pane.id ? null : pane.id);
    onStatus(nextPaneId ? `Artifact target pane: ${title}` : 'Artifact target pane cleared');
  };

  const handleTabClose = (e: React.MouseEvent<HTMLButtonElement>, contentId: string) => {
    e.stopPropagation();
    const content = engine.contents.get(contentId);
    if (content?.contentType === 'terminal' && content.termId) {
      terminalHost.kill(content.termId);
    }
    engine.closeContent(contentId);
    onStatus(`Closed ${content?.title ?? contentId}`);
  };

  const _activeContent = engine.contents.get(pane.activeContentId ?? '');
  const title = _activeContent ? getDisplayTitle(_activeContent) : 'Pane';
  const paneIdentityStatus =
    engine.artifactPaneId === pane.id
      ? t('app.paneInspectArtifact')
      : t('app.paneInspectState', { state: String(winState) });
  const paneIdentityContent = _activeContent ? getDisplayTitle(_activeContent) : t('app.paneInspectEmpty');

  const style: React.CSSProperties = {
    left: pane.layout.left,
    top: pane.layout.top,
    width: pane.layout.width,
    height: pane.layout.height,
  };

  return (
    <>
      <article
        ref={paneRef as React.RefObject<HTMLElement>}
        className="dock-pane"
        data-pane-id={pane.id}
        data-pane-state={pane.state}
        data-window-state={winState}
        data-is-active={engine.activePaneId === pane.id ? 'true' : undefined}
        data-is-artifact-target={engine.artifactPaneId === pane.id ? 'true' : undefined}
        style={style}
        onPointerDown={markActive}
      >
        {showPaneIdentityOverlay && (
          <div className="pane-identity-overlay" aria-label={t('app.paneInspectTitle')}>
            <div className="pane-identity-card">
              <span className="pane-identity-path">{pane.id}</span>
              <span className="pane-identity-meta">
                {paneIdentityStatus} · {paneIdentityContent}
              </span>
            </div>
          </div>
        )}
        <div className="pane-caption" onPointerDown={handleCaptionPointerDown}>
          <div className="pane-title">{title}</div>
          <div className="pane-actions">
            <button
              className="pane-action"
              title="Use as artifact target"
              aria-pressed={engine.artifactPaneId === pane.id}
              onClick={handleToggleArtifactTarget}
            >
              {engine.artifactPaneId === pane.id ? '◆' : '◇'}
            </button>
            <button className="pane-action" title="Float pane" onClick={handleFloat}>
              □
            </button>
            <button className="pane-action" title="Close active content" onClick={handleClose}>
              ×
            </button>
          </div>
        </div>

        {/* ── 탭 바 (스크롤 가능) ─────────────────────────────────────────── */}
        <div
          className={`pane-tabs-wrapper${onTabBarPointerDown ? ' is-float-drag-handle' : ''}`}
          onPointerDown={onTabBarPointerDown}
        >
          {canScrollLeft && (
            <button
              className="pane-tabs-scroll pane-tabs-scroll--left"
              onClick={() => scrollTabs('left')}
              title={t('common.tab.scrollLeft')}
              tabIndex={-1}
            >
              ‹
            </button>
          )}

          <div ref={tabsRef} className="pane-tabs">
            {pane.contents.map((id) => {
              const content = engine.contents.get(id);
              if (!content) return null;
              const isActive = id === pane.activeContentId;
              const typeIcon: Record<string, string> = {
                terminal: '▶',
                browser: '🌐',
                markdown: '📝',
                mermaid: '⬡',
                code: '📄',
                image: '🖼',
                html: '⬡',
                hex: '⬡',
                'command-center': '▣',
                'document-preview': '▤',
                settings: '⚙',
                diagnostics: '▤',
                onboarding: '?',
                'xcon-viewer': '⬡',
                'automation-monitor': '🤖',
                'extension-panel': '▣',
              };
              const icon = getExtensionContentIcon(content.contentType) ?? typeIcon[content.contentType] ?? '⬡';
              const displayTitle = getDisplayTitle(content);
              const terminalTermId = content.contentType === 'terminal' ? content.termId : undefined;
              const terminalShortId = terminalTermId ? shortTerminalId(terminalTermId) : '';
              const tabTitle = terminalTermId ? terminalIdentityTitle(displayTitle, terminalTermId) : displayTitle;
              return (
                <div
                  key={id}
                  className={`pane-tab${isActive ? ' is-active' : ''}`}
                  data-content-id={id}
                  data-content-type={content.contentType}
                  title={tabTitle}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isActive ? 'true' : 'false'}
                  onPointerDown={(e) => handleTabPointerDown(e, id)}
                  onClick={() => handleTabClick(id)}
                  onKeyDown={(e) => handleTabKeyDown(e, id)}
                  onContextMenu={(e) => handleTabContextMenu(e, id)}
                >
                  <span className="pane-tab-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="pane-tab-title">{displayTitle}</span>
                  {terminalShortId && (
                    <span className="pane-tab-termid" aria-label={`termId ${terminalTermId}`}>
                      {terminalShortId}
                    </span>
                  )}
                  <button
                    className="pane-tab-close"
                    title={`Close ${displayTitle}`}
                    onClick={(e) => handleTabClose(e, id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          {canScrollRight && (
            <button
              className="pane-tabs-scroll pane-tabs-scroll--right"
              onClick={() => scrollTabs('right')}
              title={t('common.tab.scrollRight')}
              tabIndex={-1}
            >
              ›
            </button>
          )}

          {winState === 'document' && (
            <button
              className="pane-action pane-tabs-artifact-btn"
              title="Use as artifact target"
              aria-pressed={engine.artifactPaneId === pane.id}
              onClick={handleToggleArtifactTarget}
            >
              {engine.artifactPaneId === pane.id ? '◆' : '◇'}
            </button>
          )}

          {/* 플로팅 창 전용: 도킹 복귀 버튼 */}
          {onDockAction && (
            <button
              className="pane-action pane-tabs-dock-btn"
              onClick={onDockAction}
              title={t('common.tab.dockReturn')}
              tabIndex={-1}
            >
              ↧
            </button>
          )}
        </div>

        <div
          className="pane-body"
          onDragEnter={handlePaneBodyDragEnter}
          onDragLeave={handlePaneBodyDragLeave}
          onDragOver={handlePaneBodyDragOver}
          onDrop={handlePaneBodyDrop}
        >
          {/*
           * ── 외부 파일 드래그 오버레이 ─────────────────────────────────────────
           * xterm.js 캔버스가 drop 이벤트를 내부적으로 소비(stopPropagation)해
           * pane-body 까지 버블링이 안 되는 문제를 해결:
           * 드래그 중에만 캔버스 위를 덮는 투명 오버레이를 렌더링해
           * drop 이벤트를 직접 받는다.
           */}
          {isPaneBodyDragOver && (
            <div
              className="pane-ext-drop-overlay"
              onDragEnter={handlePaneBodyDragEnter}
              onDragLeave={handlePaneBodyDragLeave}
              onDragOver={handlePaneBodyDragOver}
              onDrop={handlePaneBodyDrop}
            >
              <span className="pane-ext-drop-overlay__text">{t('common.tab.dropHere')}</span>
            </div>
          )}

          {pane.contents.map((id) => {
            const content = engine.contents.get(id);
            if (!content) return null;
            const isActive = id === pane.activeContentId;
            const isTerminal = content.contentType === 'terminal';
            const isViewer =
              [
                'browser',
                'markdown',
                'mermaid',
                'code',
                'image',
                'hex',
                'document-preview',
                'xcon-viewer',
                'automation-monitor',
                'extension-panel',
                'onboarding',
                'command-center',
              ].includes(content.contentType) || isExtensionViewerContentType(content.contentType);
            const typeClass = isTerminal ? 'is-terminal' : isViewer ? 'is-viewer' : 'is-html';
            return (
              <div
                key={id}
                className={`content-view ${typeClass}${isActive ? ' is-active' : ''}`}
                data-content-id={id}
                data-content-type={content.contentType}
              >
                {/* 항상 렌더링 유지 — CSS visibility로 표시/숨김.
                    React 컴포넌트가 마운트 상태를 유지하므로 내부 state·ref·스크롤이 보존됨. */}
                {isTerminal && content.termId ? (
                  <TerminalPane
                    termId={content.termId}
                    isActive={isActive}
                    onOpenAutomationMonitor={onOpenAutomationMonitor}
                    onSaveTerminalProfile={onSaveTerminalProfile}
                  />
                ) : (
                  <ContentView
                    contentId={id}
                    engine={engine}
                    onOpenAutomationMonitor={onOpenAutomationMonitor}
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
                  />
                )}
              </div>
            );
          })}
        </div>
      </article>

      {/* ── 탭 컨텍스트 메뉴 ──────────────────────────────────────────────── */}
      {contextMenu && (
        <TabContextMenu
          menu={contextMenu}
          pane={pane}
          engine={engine}
          onClose={() => setContextMenu(null)}
          onStatus={onStatus}
        />
      )}
    </>
  );
}
