import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePaneRefresh } from '../../../hooks/usePaneRefresh';
import { useI18n } from '../../../i18n';

// Typed webview element (Electron)
type XAppWebviewEl = HTMLElement & {
  executeJavaScript(code: string): Promise<unknown>;
};

const WebviewEl = 'webview' as React.ElementType;

/** xapp-viewer.html URL (개발: localhost, 배포: file://) */
function getViewerUrl(): string {
  const base = window.location.href.replace(/\/[^/]*$/, '/');
  return base + 'xapp-viewer.html';
}

/** 파일 경로에서 파일명만 추출 */
function fileNameFromPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop() ?? filePath;
}

function lastPathSegment(value: string): string {
  return (
    value
      .replace(/[\\/]+$/, '')
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() ?? ''
  );
}

function looksLikeFilePath(value: string): boolean {
  return /\.[a-z0-9]{1,12}$/i.test(lastPathSegment(value));
}

function xappEntryFilePath(projectOrFilePath: string): string {
  const trimmed = projectOrFilePath.trim().replace(/[\\/]+$/, '');
  if (!trimmed || looksLikeFilePath(trimmed)) return trimmed;
  const sep = trimmed.includes('/') && !trimmed.includes('\\') ? '/' : '\\';
  return `${trimmed}${sep}first.xconj`;
}

interface XAppPreviewPaneProps {
  /** 마운트 즉시 로드할 파일 경로 (App.tsx가 자동 생성할 때 전달) */
  initialFilePath?: string;
}

export function XAppPreviewPane({ initialFilePath }: XAppPreviewPaneProps) {
  const { t } = useI18n();
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [appTitle, setAppTitle] = useState<string | null>(null);

  const webviewRef = useRef<XAppWebviewEl>(null);
  const initialLoadDoneRef = useRef(false);

  /* ── webview에 XCON JSON 주입 ── */
  const injectContent = useCallback((content: string) => {
    const wv = webviewRef.current;
    if (!wv) return;
    const escaped = JSON.stringify(content);
    wv.executeJavaScript(`window.__xappViewerLoad && window.__xappViewerLoad(${escaped})`).catch(() => undefined);
  }, []);

  /* ── 뷰어 준비 완료 → 대기 중인 콘텐츠 주입 ── */
  useEffect(() => {
    if (isViewerReady && pendingContent) {
      injectContent(pendingContent);
      setPendingContent(null);
    }
  }, [isViewerReady, pendingContent, injectContent]);

  /* ── webview dom-ready 이벤트 ── */
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const onReady = () => setIsViewerReady(true);
    wv.addEventListener('dom-ready', onReady);
    return () => wv.removeEventListener('dom-ready', onReady);
  }, []);

  /* ── 파일 경로로부터 XCON JSON 읽어 뷰어에 주입 ── */
  const loadFile = useCallback(
    async (filePath: string) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const targetPath = xappEntryFilePath(filePath);
        const result = await window.fileAPI.readFile(targetPath);
        if (!result) throw new Error(t('xapp.cannotReadFile'));

        // 앱 타이틀 추출 (JSON 파싱 시도)
        try {
          const parsed = JSON.parse(result.content) as Record<string, unknown>;
          if (typeof parsed.title === 'string') setAppTitle(parsed.title);
        } catch {
          /* 무시 */
        }

        setCurrentFilePath(targetPath);

        if (isViewerReady) {
          injectContent(result.content);
        } else {
          setPendingContent(result.content);
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : t('common.unknownError'));
      } finally {
        setIsLoading(false);
      }
    },
    [isViewerReady, injectContent],
  );

  /* ── initialFilePath prop으로 마운트 즉시 로드 (최초 1회) ── */
  useEffect(() => {
    if (!initialFilePath || initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;
    loadFile(initialFilePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilePath]);

  /* ── xapp-bundle-ready 이벤트 수신 (XamongCodeChatPane 채팅 완료 시) ── */
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ bundlePath: string }>;
      const bundlePath = ev.detail?.bundlePath;
      if (typeof bundlePath === 'string' && bundlePath) {
        loadFile(bundlePath);
      }
    };
    window.addEventListener('xapp-bundle-ready', handler);
    return () => window.removeEventListener('xapp-bundle-ready', handler);
  }, [loadFile]);

  /* ── 새로고침 ── */
  const handleRefresh = useCallback(() => {
    if (currentFilePath) loadFile(currentFilePath);
  }, [currentFilePath, loadFile]);

  const { isRefreshing, refresh } = usePaneRefresh({
    onRefresh: handleRefresh,
    bindKeys: !!currentFilePath,
  });

  /* ── 파일 직접 열기 ── */
  const handleOpenFile = useCallback(async () => {
    const result = await window.fileAPI.openFile();
    if (!result) return;
    if (result.ext === 'xconj' || result.ext === 'json') {
      try {
        const parsed = JSON.parse(result.content) as Record<string, unknown>;
        if (typeof parsed.title === 'string') setAppTitle(parsed.title);
      } catch {
        /* 무시 */
      }
      setCurrentFilePath(result.filePath);
      setErrorMsg(null);
      if (isViewerReady) {
        injectContent(result.content);
      } else {
        setPendingContent(result.content);
      }
    } else {
      setErrorMsg(t('xapp.unsupportedFormat', { ext: result.ext }));
    }
  }, [isViewerReady, injectContent]);

  const viewerUrl = getViewerUrl();
  const fileName = currentFilePath ? fileNameFromPath(currentFilePath) : null;

  return (
    <div className="xap-pane">
      {/* ── 툴바 ── */}
      <div className="xap-toolbar">
        <span className="xap-title">{t('xapp.appPreviewTitle')}</span>

        {fileName && (
          <>
            <div className="xap-toolbar-sep" />
            <span className="xap-filename" title={currentFilePath ?? ''}>
              {fileName}
            </span>
          </>
        )}

        {appTitle && <span className="xap-app-title">{appTitle}</span>}

        {isLoading && <span className="xap-loading-badge">{t('common.loading')}</span>}

        <div className="xap-toolbar-flex" />

        <button
          className={`pane-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
          onClick={refresh}
          disabled={!currentFilePath || isLoading || isRefreshing}
          title={t('xapp.refreshTitle')}
        >
          ↺
        </button>
        <button className="xap-icon-btn" onClick={handleOpenFile} title={t('xapp.openXconJsonTitle')}>
          📂
        </button>
      </div>

      {/* ── 본문: 오버레이 + 웹뷰 ── */}
      <div className="xap-body">
        {/* 로딩 / 대기 오버레이 */}
        {(!isViewerReady || (!currentFilePath && !isLoading)) && (
          <div className="xap-overlay">
            <span className="xap-overlay-icon">⬡</span>
            {!isViewerReady ? (
              <span className="xap-overlay-title">{t('xapp.viewerLoading')}</span>
            ) : (
              <>
                <span className="xap-overlay-title">{t('xapp.waitingPreview')}</span>
                <span className="xap-overlay-hint">{t('xapp.chatHint')}</span>
                <button className="xap-overlay-btn" onClick={handleOpenFile}>
                  {t('xapp.openFile')}
                </button>
              </>
            )}
          </div>
        )}

        {/* 오류 배너 */}
        {errorMsg && (
          <div className="xap-error-banner">
            <span>⚠ {errorMsg}</span>
            <button className="xap-error-close" onClick={() => setErrorMsg(null)}>
              ×
            </button>
          </div>
        )}

        {/* xapp-viewer.html 웹뷰 — 항상 렌더링 유지 */}
        <WebviewEl
          ref={webviewRef}
          src={viewerUrl}
          className={`xap-webview${isViewerReady ? ' is-ready' : ''}`}
          webpreferences="contextIsolation=true"
          disablewebsecurity="false"
        />
      </div>
    </div>
  );
}
