import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BrowserSourceKind,
  McpBridgeBrowserActionPayload,
  McpBridgeBrowserActionResult,
} from '../../shared/types';
import { ContextMenu, type ContextMenuItem, useContextMenu } from '../components/ContextMenu';
import { createCodeMirrorAdapter } from '../editing/codeMirrorAdapter';
import { useEditableSurface } from '../editing/useEditableSurface';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useSplitter } from '../hooks/useSplitter';
import { useI18n } from '../i18n';
import { saveEditableText } from '../utils/editableFileIo';
import {
  type BrowserSourceState,
  type BrowserViewMode,
  canEditBrowserSource,
  canSaveBrowserSource,
  createLocalBrowserSourceState,
  markBrowserSourceStale,
  resolveRemoteBrowserSource,
} from './browserSourceModel';

interface BrowserPaneProps {
  contentId?: string;
  initialUrl?: string;
  filePath?: string;
  fileName?: string;
  fileExt?: string;
  initialSource?: string;
  sourceKind?: BrowserSourceKind;
  onSourceUpdate?: (content: string) => void;
  onUrlChange?: (url: string) => void;
  /** 페이지 타이틀 변경 시 호출 — 도킹 탭 제목 갱신에 사용 */
  onTitleChange?: (title: string) => void;
  onOpenInDesk?: (url: string) => void;
}

const DEFAULT_URL = 'https://www.google.com';

// Typed wrapper to avoid JSX IntrinsicElements issues with webview
const WebviewEl = 'webview' as React.ElementType;

type WebviewElement = HTMLElement & {
  loadURL: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  getURL: () => string;
  executeJavaScript?: (code: string, userGesture?: boolean) => Promise<unknown>;
};

type WebviewPopupEvent = Event & {
  url?: string;
  targetUrl?: string;
  detail?: { url?: string };
  newGuest?: { destroy?: () => void; close?: () => void };
};

type WebviewContextMenuEvent = Event & {
  params?: {
    x: number;
    y: number;
    linkURL?: string;
    pageURL?: string;
    srcURL?: string;
    selectionText?: string;
    isEditable?: boolean;
  };
};

type BrowserPaneController = {
  run(payload: McpBridgeBrowserActionPayload): McpBridgeBrowserActionResult | Promise<McpBridgeBrowserActionResult>;
};

const browserPaneControllers = new Map<string, BrowserPaneController>();

export function runBrowserPaneAction(
  payload: McpBridgeBrowserActionPayload,
  fallbackContentId?: string,
): McpBridgeBrowserActionResult | Promise<McpBridgeBrowserActionResult> {
  const targetContentId = (payload.contentId || fallbackContentId || '').trim();
  const controller = targetContentId ? browserPaneControllers.get(targetContentId) : undefined;
  if (!controller) {
    return {
      requestId: payload.requestId,
      action: payload.action,
      ok: false,
      contentId: targetContentId || payload.contentId,
      paneId: payload.paneId,
      error: targetContentId
        ? `Browser pane is not mounted: ${targetContentId}`
        : 'No browser pane target is available',
    };
  }
  return controller.run(payload);
}

function popupUrlFromEvent(event: WebviewPopupEvent): string {
  return String(event.url || event.targetUrl || event.detail?.url || '').trim();
}

function normalizeBrowserUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('file://') || trimmed.startsWith('view-source:')) {
    return trimmed;
  }
  if (trimmed.includes('.') && !trimmed.includes(' ')) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

function createInitialBrowserSourceState(
  initialUrl: string,
  initialSource: string | undefined,
  sourceKind: BrowserSourceKind | undefined,
): BrowserSourceState {
  if (!initialSource) {
    return { text: '', kind: 'unavailable', url: initialUrl, loading: false };
  }
  if (sourceKind === 'dropped-file') {
    return createLocalBrowserSourceState({ text: initialSource, url: initialUrl, kind: 'dropped-file' });
  }
  if (!sourceKind || sourceKind === 'local-file') {
    return createLocalBrowserSourceState({ text: initialSource, url: initialUrl, kind: 'local-file' });
  }
  return { text: initialSource, kind: sourceKind, url: initialUrl, loading: false };
}

export function BrowserPane({
  contentId,
  initialUrl = DEFAULT_URL,
  filePath,
  fileName,
  fileExt,
  initialSource,
  sourceKind,
  onSourceUpdate,
  onUrlChange,
  onTitleChange,
  onOpenInDesk,
}: BrowserPaneProps) {
  const { t } = useI18n();
  const webviewRef = useRef<WebviewElement>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { ratio: splitRatio, isDragging: isSplitDragging, onSplitterMouseDown } = useSplitter(bodyRef);

  const [mode, setMode] = useState<BrowserViewMode>('preview');
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [displayUrl, setDisplayUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState(initialSource ?? '');
  const [sourceState, setSourceState] = useState<BrowserSourceState>(() =>
    createInitialBrowserSourceState(initialUrl, initialSource, sourceKind),
  );
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const stateRef = useRef({ displayUrl, isLoading, canBack, canForward });
  useEffect(() => {
    stateRef.current = { displayUrl, isLoading, canBack, canForward };
  }, [displayUrl, isLoading, canBack, canForward]);

  const sourceLabel =
    sourceState.kind === 'local-file'
      ? t('browser.localFileSource')
      : sourceState.kind === 'dropped-file'
        ? t('browser.droppedFileSource')
        : sourceState.kind === 'response-source'
          ? t('browser.responseSource')
          : sourceState.kind === 'dom-snapshot'
            ? t('browser.domSnapshotSource')
            : t('browser.unavailableSource');
  const canSaveSource = canSaveBrowserSource(sourceState.kind, filePath);

  const editorExts = useMemo(
    () => [
      html(),
      EditorView.theme({
        '.cm-scroller': { fontFamily: 'var(--font-mono, "Cascadia Code", Consolas, monospace)' },
      }),
    ],
    [],
  );

  const handleBrowserRefresh = useCallback(() => {
    if (isLoading) {
      webviewRef.current?.stop();
    } else {
      webviewRef.current?.reload();
    }
  }, [isLoading]);

  usePaneRefresh({ onRefresh: handleBrowserRefresh });

  const navigate = useCallback((url: string) => {
    const finalUrl = normalizeBrowserUrl(url);
    if (!finalUrl) return;

    setInputUrl(finalUrl);
    setDisplayUrl(finalUrl);
    setLoadError(null);
    webviewRef.current?.loadURL(finalUrl);
  }, []);

  const handlePopupOpen = useCallback(
    (url: string) => {
      const popupUrl = url.trim();
      if (!popupUrl) return;
      if (onOpenInDesk) {
        onOpenInDesk(popupUrl);
        return;
      }
      navigate(popupUrl);
    },
    [navigate, onOpenInDesk],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') navigate(inputUrl);
      if (e.key === 'Escape') setInputUrl(displayUrl);
    },
    [inputUrl, displayUrl, navigate],
  );

  const readDomSnapshot = useCallback(async () => {
    const wv = webviewRef.current;
    if (!wv?.executeJavaScript) throw new Error('Webview JavaScript execution is unavailable.');
    return String(
      await wv.executeJavaScript(
        "document.documentElement ? '<!doctype html>\\n' + document.documentElement.outerHTML : ''",
        false,
      ),
    );
  }, []);

  const loadSourceForCurrentUrl = useCallback(
    async (nextMode: BrowserViewMode = 'source') => {
      const url = webviewRef.current?.getURL?.() || displayUrl || inputUrl;
      if (!url.trim()) return;
      setMode(nextMode);
      if (sourceState.kind === 'local-file' || sourceState.kind === 'dropped-file') {
        setSourceState((state) => ({ ...state, stale: false }));
        return;
      }

      setSourceState((state) => ({ ...state, url, loading: true, stale: false, error: undefined }));
      const next = await resolveRemoteBrowserSource({
        url,
        loadResponseSource: (currentUrl) => window.browserSourceAPI.loadResponseSource({ url: currentUrl }),
        readDomSnapshot,
      });
      setSourceState(next);
      setSourceText(next.text);
    },
    [displayUrl, inputUrl, readDomSnapshot, sourceState.kind],
  );

  const handleSourceChange = useCallback(
    (value: string) => {
      if (!canEditBrowserSource(sourceState.kind)) return;
      setSourceText(value);
      setSourceState((state) => ({ ...state, text: value }));
      setIsModified(true);
      onSourceUpdate?.(value);
    },
    [onSourceUpdate, sourceState.kind],
  );

  const handleSaveSource = useCallback(async () => {
    if (!canSaveSource || !filePath || !isModified || isSaving) return;
    try {
      setIsSaving(true);
      const result = await saveEditableText({ filePath }, sourceText);
      setSaveMsg(result.saved ? t('common.saved') : t('common.saveFailed'));
      if (result.saved) {
        setIsModified(false);
        webviewRef.current?.reload();
      }
    } catch {
      setSaveMsg(t('common.saveError'));
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 2000);
    }
  }, [canSaveSource, filePath, isModified, isSaving, sourceText, t]);

  const sourceEditAdapter = useMemo(
    () =>
      createCodeMirrorAdapter({
        id: `browser-source:${filePath || displayUrl}`,
        label: `${fileName || displayUrl} source`,
        getView: () => editorRef.current?.view,
        readOnly: () => !canEditBrowserSource(sourceState.kind),
        canSave: () => canSaveSource && isModified && !isSaving,
        onSave: handleSaveSource,
      }),
    [canSaveSource, displayUrl, fileName, filePath, handleSaveSource, isModified, isSaving, sourceState.kind],
  );
  const sourceSurface = useEditableSurface({ adapter: sourceEditAdapter, includeSave: canSaveSource });
  const { menu, open: openContextMenu, close: closeContextMenu } = useContextMenu();

  const copyText = useCallback(async (text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  }, []);

  const openViewSourceInDesk = useCallback(
    (url: string) => {
      const targetUrl = url.trim();
      if (!targetUrl) return;
      const viewSourceUrl = targetUrl.startsWith('view-source:') ? targetUrl : `view-source:${targetUrl}`;
      if (onOpenInDesk) {
        onOpenInDesk(viewSourceUrl);
        return;
      }
      navigate(viewSourceUrl);
    },
    [navigate, onOpenInDesk],
  );

  const buildPreviewContextMenuItems = useCallback(
    (params: NonNullable<WebviewContextMenuEvent['params']>): ContextMenuItem[] => {
      const pageUrl = params.pageURL || webviewRef.current?.getURL?.() || displayUrl;
      const linkUrl = params.linkURL?.trim() || '';
      const srcUrl = params.srcURL?.trim() || '';
      const selectionText = params.selectionText?.trim() || '';
      const items: ContextMenuItem[] = [
        {
          kind: 'action',
          icon: '<',
          label: t('browser.backTitle'),
          action: () => webviewRef.current?.goBack(),
          disabled: !canBack,
        },
        {
          kind: 'action',
          icon: '>',
          label: t('browser.forwardTitle'),
          action: () => webviewRef.current?.goForward(),
          disabled: !canForward,
        },
        {
          kind: 'action',
          icon: isLoading ? 'x' : 'R',
          label: isLoading ? t('browser.stopTitle') : t('browser.refreshTitle'),
          action: () => (isLoading ? webviewRef.current?.stop() : webviewRef.current?.reload()),
        },
        { kind: 'divider' },
        {
          kind: 'action',
          icon: 'C',
          label: t('browser.copyUrlTitle'),
          action: () => void copyText(pageUrl),
          disabled: !pageUrl,
        },
        {
          kind: 'action',
          icon: '^',
          label: t('browser.openExternalTitle'),
          action: () => void window.fileAPI.openExternal(pageUrl),
          disabled: !/^https?:\/\//i.test(pageUrl),
        },
        {
          kind: 'action',
          icon: '+',
          label: t('browser.openInDeskTitle'),
          action: () => onOpenInDesk?.(pageUrl),
          disabled: !pageUrl || !onOpenInDesk,
        },
        { kind: 'divider' },
        {
          kind: 'action',
          icon: '</>',
          label: t('browser.viewSourceTitle'),
          action: () => void loadSourceForCurrentUrl(),
        },
        {
          kind: 'action',
          icon: '^',
          label: t('browser.openViewSourceTitle'),
          action: () => openViewSourceInDesk(pageUrl),
          disabled: !/^https?:\/\//i.test(pageUrl),
        },
        {
          kind: 'action',
          icon: 'C',
          label: t('browser.copySourceTitle'),
          action: () => void copyText(sourceState.text),
          disabled: !sourceState.text,
        },
      ];

      if (linkUrl) {
        items.push(
          { kind: 'divider' },
          {
            kind: 'action',
            icon: '+',
            label: t('browser.openInDeskTitle'),
            action: () => onOpenInDesk?.(linkUrl),
            disabled: !onOpenInDesk,
          },
          {
            kind: 'action',
            icon: '^',
            label: t('browser.openExternalTitle'),
            action: () => void window.fileAPI.openExternal(linkUrl),
            disabled: !/^https?:\/\//i.test(linkUrl),
          },
          {
            kind: 'action',
            icon: 'C',
            label: t('browser.copyUrlTitle'),
            action: () => void copyText(linkUrl),
          },
        );
      }

      if (srcUrl) {
        items.push({
          kind: 'action',
          icon: 'C',
          label: t('browser.copyUrlTitle'),
          action: () => void copyText(srcUrl),
        });
      }

      if (selectionText) {
        items.push({
          kind: 'action',
          icon: 'C',
          label: t('common.copy'),
          action: () => void copyText(selectionText),
        });
      }

      return items;
    },
    [
      canBack,
      canForward,
      copyText,
      displayUrl,
      isLoading,
      loadSourceForCurrentUrl,
      onOpenInDesk,
      openViewSourceInDesk,
      sourceState.text,
      t,
    ],
  );

  // 앱 종료 시 webview가 로딩 중이면 ERR_ABORTED (-3) 에러가 콘솔에 출력됨.
  // beforeunload에서 미리 stop()을 호출해 정상 중단 처리.
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const stopOnUnload = () => {
      try {
        wv.stop?.();
      } catch {
        /* webview가 이미 파괴된 경우 무시 */
      }
    };
    window.addEventListener('beforeunload', stopOnUnload);
    return () => window.removeEventListener('beforeunload', stopOnUnload);
  }, []);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onLoadStart = () => {
      setIsLoading(true);
      setLoadError(null);
    };
    const onLoadStop = () => {
      setIsLoading(false);
      const url = wv.getURL?.() ?? '';
      setDisplayUrl(url);
      setInputUrl(url);
      onUrlChange?.(url);
      setCanBack(wv.canGoBack?.() ?? false);
      setCanForward(wv.canGoForward?.() ?? false);
      setSourceState((state) =>
        state.kind === 'local-file' || state.kind === 'dropped-file' ? state : markBrowserSourceStale(state, url),
      );
    };
    const onLoadFail = (e: Event & { errorDescription?: string }) => {
      setIsLoading(false);
      if (e.errorDescription && e.errorDescription !== 'ERR_ABORTED') {
        setLoadError(e.errorDescription ?? t('browser.loadError'));
      }
    };
    const onDomReady = () => {
      setCanBack(wv.canGoBack?.() ?? false);
      setCanForward(wv.canGoForward?.() ?? false);
    };
    const onPageTitle = (e: Event & { title?: string }) => {
      const nextTitle = e.title?.trim();
      if (nextTitle) onTitleChange?.(nextTitle);
    };
    const onPopupOpen = (event: Event) => {
      const e = event as WebviewPopupEvent;
      e.preventDefault?.();
      e.newGuest?.destroy?.();
      e.newGuest?.close?.();
      handlePopupOpen(popupUrlFromEvent(e));
    };
    const onContextMenu = (event: Event) => {
      const e = event as WebviewContextMenuEvent;
      const params = e.params;
      if (!params) return;
      openContextMenu(
        {
          preventDefault: () => e.preventDefault?.(),
          stopPropagation: () => e.stopPropagation?.(),
          clientX: params.x,
          clientY: params.y,
        } as React.MouseEvent,
        buildPreviewContextMenuItems(params),
      );
    };

    wv.addEventListener('did-start-loading', onLoadStart);
    wv.addEventListener('did-stop-loading', onLoadStop);
    wv.addEventListener('did-fail-load', onLoadFail);
    wv.addEventListener('dom-ready', onDomReady);
    wv.addEventListener('page-title-updated', onPageTitle);
    wv.addEventListener('new-window', onPopupOpen);
    wv.addEventListener('did-create-window', onPopupOpen);
    wv.addEventListener('context-menu', onContextMenu);

    return () => {
      wv.removeEventListener('did-start-loading', onLoadStart);
      wv.removeEventListener('did-stop-loading', onLoadStop);
      wv.removeEventListener('did-fail-load', onLoadFail);
      wv.removeEventListener('dom-ready', onDomReady);
      wv.removeEventListener('page-title-updated', onPageTitle);
      wv.removeEventListener('new-window', onPopupOpen);
      wv.removeEventListener('did-create-window', onPopupOpen);
      wv.removeEventListener('context-menu', onContextMenu);
    };
  }, [buildPreviewContextMenuItems, handlePopupOpen, onUrlChange, onTitleChange, openContextMenu, t]);

  useEffect(() => {
    if (!contentId) return undefined;
    const snapshot = (
      payload: McpBridgeBrowserActionPayload,
      ok = true,
      error?: string,
    ): McpBridgeBrowserActionResult => ({
      requestId: payload.requestId,
      action: payload.action,
      ok,
      contentId,
      paneId: payload.paneId,
      url: webviewRef.current?.getURL?.() || stateRef.current.displayUrl,
      loading: stateRef.current.isLoading,
      canGoBack: webviewRef.current?.canGoBack?.() ?? stateRef.current.canBack,
      canGoForward: webviewRef.current?.canGoForward?.() ?? stateRef.current.canForward,
      ...(error ? { error } : {}),
    });

    const executeSnapshotScript = async (
      payload: McpBridgeBrowserActionPayload,
      script: string,
    ): Promise<McpBridgeBrowserActionResult> => {
      const webview = webviewRef.current;
      if (!webview?.executeJavaScript)
        return snapshot(payload, false, 'Browser webview JavaScript execution is not available');
      try {
        const result = await webview.executeJavaScript(script, true);
        return {
          ...snapshot(payload),
          ...(result && typeof result === 'object' ? (result as Record<string, unknown>) : { snapshot: result }),
        };
      } catch (error) {
        return snapshot(payload, false, error instanceof Error ? error.message : String(error));
      }
    };

    const textSnapshotScript = (payload: McpBridgeBrowserActionPayload): string => {
      const maxChars = Math.max(1, Number(payload.maxChars ?? 20000));
      const maxLinks = Math.max(0, Number(payload.maxLinks ?? 100));
      return `
(() => {
  const limit = (value, max) => String(value || '').slice(0, max);
  const text = limit(document.body ? document.body.innerText : '', ${JSON.stringify(maxChars)});
  const links = Array.from(document.querySelectorAll('a[href]')).slice(0, ${JSON.stringify(maxLinks)}).map((node) => ({
    text: limit(node.innerText || node.textContent || '', 240),
    href: node.href || node.getAttribute('href') || ''
  }));
  const forms = Array.from(document.querySelectorAll('form')).slice(0, 20).map((form, formIndex) => ({
    index: formIndex,
    action: form.action || form.getAttribute('action') || '',
    method: form.method || form.getAttribute('method') || '',
    controls: Array.from(form.querySelectorAll('input, textarea, select, button')).slice(0, 80).map((control) => ({
      tag: control.tagName.toLowerCase(),
      type: control.getAttribute('type') || '',
      name: control.getAttribute('name') || '',
      label: limit(control.getAttribute('aria-label') || control.getAttribute('placeholder') || control.textContent || '', 160)
    }))
  }));
  return { title: document.title || '', text, links, forms };
})()
`;
    };

    const domSnapshotScript = (payload: McpBridgeBrowserActionPayload): string => {
      const maxNodes = Math.max(1, Number(payload.maxNodes ?? 250));
      const maxTextChars = Math.max(1, Number(payload.maxTextChars ?? 5000));
      return `
(() => {
  const maxNodes = ${JSON.stringify(maxNodes)};
  const maxTextChars = ${JSON.stringify(maxTextChars)};
  const nodes = [];
  let textBudget = maxTextChars;
  const selectorFor = (node) => {
    if (!node || !node.tagName) return '';
    if (node.id) return '#' + node.id;
    const parts = [];
    let current = node;
    while (current && current.nodeType === 1 && parts.length < 5) {
      let part = current.tagName.toLowerCase();
      if (current.classList && current.classList.length) part += '.' + Array.from(current.classList).slice(0, 2).join('.');
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(' > ');
  };
  const walk = (node, depth = 0) => {
    if (!node || nodes.length >= maxNodes || depth > 8) return;
    if (node.nodeType !== 1) return;
    const element = node;
    const rawText = String(element.innerText || element.textContent || '').replace(/\\s+/g, ' ').trim();
    const text = textBudget > 0 ? rawText.slice(0, Math.min(240, textBudget)) : '';
    textBudget -= text.length;
    nodes.push({
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute('role') || '',
      id: element.id || '',
      className: element.className && typeof element.className === 'string' ? element.className.slice(0, 160) : '',
      selector: selectorFor(element),
      text
    });
    for (const child of Array.from(element.children)) walk(child, depth + 1);
  };
  walk(document.body || document.documentElement);
  return { dom: { title: document.title || '', url: location.href, nodes, truncated: nodes.length >= maxNodes } };
})()
`;
    };

    const elementActionScript = (payload: McpBridgeBrowserActionPayload): string => {
      const action = payload.elementAction || '';
      const selector = payload.selector || '';
      const text = payload.text || '';
      const value = payload.value || '';
      const key = payload.key || '';
      return `
(() => {
  const action = ${JSON.stringify(action)};
  const selector = ${JSON.stringify(selector)};
  const text = ${JSON.stringify(text)};
  const value = ${JSON.stringify(value)};
  const key = ${JSON.stringify(key)};
  const limit = (input, max = 240) => String(input || '').replace(/\\s+/g, ' ').trim().slice(0, max);
  const eventInit = { bubbles: true, cancelable: true };
  const dispatchInputEvents = (element) => {
    element.dispatchEvent(new Event('input', eventInit));
    element.dispatchEvent(new Event('change', eventInit));
  };
  const matchesText = (element) => {
    if (!text) return false;
    const haystack = [
      element.innerText,
      element.textContent,
      element.getAttribute && element.getAttribute('aria-label'),
      element.getAttribute && element.getAttribute('placeholder'),
      element.value
    ].map((item) => String(item || '').trim()).join(' ');
    return haystack.includes(text);
  };
  const findByText = () => {
    if (!text) return null;
    const candidates = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role="button"], [contenteditable="true"], label, output, *'));
    return candidates.find(matchesText) || null;
  };
  let element = null;
  try {
    element = selector ? document.querySelector(selector) : findByText();
  } catch (error) {
    return { ok: false, elementAction: { action, selector, text, matched: false, error: String(error && error.message ? error.message : error) } };
  }
  if (!element) {
    return { ok: false, elementAction: { action, selector, text, matched: false, error: 'Browser element target was not found' } };
  }
  const tag = String(element.tagName || '').toLowerCase();
  const beforeValue = 'value' in element ? String(element.value || '') : '';
  const beforeText = limit(element.innerText || element.textContent || beforeValue);
  try {
    if (action === 'fill') {
      element.focus && element.focus();
      if ('value' in element) {
        element.value = value;
      } else if (element.isContentEditable) {
        element.textContent = value;
      } else {
        return { ok: false, elementAction: { action, selector, text, matched: true, tag, error: 'Target element cannot be filled' } };
      }
      dispatchInputEvents(element);
    } else if (action === 'select') {
      element.focus && element.focus();
      if (tag !== 'select' || !('value' in element)) {
        return { ok: false, elementAction: { action, selector, text, matched: true, tag, error: 'Target element is not a select control' } };
      }
      const hasOption = Array.from(element.options || []).some((option) => String(option.value) === value);
      if (!hasOption) {
        return { ok: false, elementAction: { action, selector, text, value, matched: true, tag, error: 'Select option was not found' } };
      }
      element.value = value;
      dispatchInputEvents(element);
    } else if (action === 'press') {
      element.focus && element.focus();
      const keyName = key || 'Enter';
      for (const type of ['keydown', 'keypress', 'keyup']) {
        element.dispatchEvent(new KeyboardEvent(type, { key: keyName, bubbles: true, cancelable: true }));
      }
    } else if (action === 'click') {
      element.focus && element.focus();
      element.click();
    } else {
      return { ok: false, elementAction: { action, selector, text, matched: true, tag, error: 'Unsupported browser element action' } };
    }
    const afterValue = 'value' in element ? String(element.value || '') : '';
    const afterText = limit(element.innerText || element.textContent || afterValue);
    return {
      elementAction: {
        action,
        selector,
        text,
        value,
        key,
        matched: true,
        tag,
        beforeValue,
        afterValue,
        beforeText,
        afterText
      }
    };
  } catch (error) {
    return { ok: false, elementAction: { action, selector, text, matched: true, tag, error: String(error && error.message ? error.message : error) } };
  }
})()
`;
    };

    browserPaneControllers.set(contentId, {
      async run(payload) {
        const webview = webviewRef.current;
        if (payload.action === 'state') return snapshot(payload);
        if (!webview) return snapshot(payload, false, 'Browser webview is not available');
        if (payload.action === 'textSnapshot') return executeSnapshotScript(payload, textSnapshotScript(payload));
        if (payload.action === 'domSnapshot') return executeSnapshotScript(payload, domSnapshotScript(payload));
        if (payload.action === 'elementAction') return executeSnapshotScript(payload, elementActionScript(payload));
        if (payload.action === 'navigate') {
          const finalUrl = normalizeBrowserUrl(payload.url || '');
          if (!finalUrl) return snapshot(payload, false, 'url is required for browser navigate');
          navigate(finalUrl);
          return { ...snapshot(payload), url: finalUrl };
        }
        if (payload.action === 'back') webview.goBack?.();
        if (payload.action === 'forward') webview.goForward?.();
        if (payload.action === 'reload') webview.reload?.();
        if (payload.action === 'stop') webview.stop?.();
        return snapshot(payload);
      },
    });
    return () => {
      const controller = browserPaneControllers.get(contentId);
      if (controller) browserPaneControllers.delete(contentId);
    };
  }, [contentId, navigate]);

  const browserWebview = (
    <WebviewEl
      ref={webviewRef}
      src={displayUrl || initialUrl}
      className="browser-webview"
      webpreferences="contextIsolation=true"
    />
  );

  return (
    <div className="browser-pane">
      <div className="browser-toolbar">
        <button
          className="browser-nav-btn"
          onClick={() => webviewRef.current?.goBack()}
          disabled={!canBack}
          title={t('browser.backTitle')}
          aria-label={t('browser.backTitle')}
        >
          {'<'}
        </button>
        <button
          className="browser-nav-btn"
          onClick={() => webviewRef.current?.goForward()}
          disabled={!canForward}
          title={t('browser.forwardTitle')}
          aria-label={t('browser.forwardTitle')}
        >
          {'>'}
        </button>
        <button
          className="browser-nav-btn"
          onClick={() => (isLoading ? webviewRef.current?.stop() : webviewRef.current?.reload())}
          title={isLoading ? t('browser.stopTitle') : t('browser.refreshTitle')}
          aria-label={isLoading ? t('browser.stopTitle') : t('browser.refreshTitle')}
        >
          {isLoading ? 'x' : 'R'}
        </button>
        <input
          className="browser-url-bar"
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          spellCheck={false}
          placeholder={t('browser.urlPlaceholder')}
        />
        <button
          className="browser-nav-btn browser-go-btn"
          onClick={() => navigate(inputUrl)}
          title={t('browser.goTitle')}
          aria-label={t('browser.goTitle')}
        >
          Go
        </button>
        <button
          className="browser-nav-btn"
          onClick={() => {
            if (/^https?:\/\//i.test(displayUrl)) window.fileAPI.openExternal(displayUrl).catch(() => {});
          }}
          disabled={!/^https?:\/\//i.test(displayUrl)}
          title={t('browser.openExternalTitle')}
          aria-label={t('browser.openExternalTitle')}
        >
          ^
        </button>
        <div className="browser-mode-btns">
          <button
            className={`browser-mode-btn${mode === 'preview' ? ' active' : ''}`}
            onClick={() => setMode('preview')}
            title={t('browser.previewModeTitle')}
            aria-label={t('browser.previewModeTitle')}
          >
            P
          </button>
          <button
            className={`browser-mode-btn${mode === 'source' ? ' active' : ''}`}
            onClick={() => void loadSourceForCurrentUrl('source')}
            title={t('browser.sourceModeTitle')}
            aria-label={t('browser.sourceModeTitle')}
          >
            &lt;/&gt;
          </button>
          <button
            className={`browser-mode-btn${mode === 'split' ? ' active' : ''}`}
            onClick={() => void loadSourceForCurrentUrl('split')}
            title={t('browser.splitModeTitle')}
            aria-label={t('browser.splitModeTitle')}
          >
            S
          </button>
        </div>
      </div>

      {loadError && (
        <div className="browser-error">
          <span>! {loadError}</span>
          <button onClick={() => navigate(inputUrl)}>{t('browser.retry')}</button>
        </div>
      )}

      <div ref={bodyRef} className={`browser-body mode-${mode}`}>
        {(mode === 'source' || mode === 'split') && (
          <div
            className="browser-source-panel"
            style={mode === 'split' ? { width: `${splitRatio * 100}%`, flex: 'none' } : undefined}
            onFocusCapture={sourceSurface.onFocusCapture}
            onPointerDownCapture={sourceSurface.onPointerDownCapture}
            onContextMenu={sourceSurface.onContextMenu}
            onKeyDown={sourceSurface.onKeyDown}
          >
            <div className="browser-source-status">
              <span>{sourceLabel}</span>
              {fileExt && <span>.{fileExt}</span>}
              {sourceState.loading && <span>{t('browser.sourceLoading')}</span>}
              {sourceState.stale && <span>{t('browser.sourceStale')}</span>}
              {sourceState.error && <span title={sourceState.error}>{sourceState.error}</span>}
              <button
                className={`browser-source-save${isModified ? ' modified' : ''}`}
                onClick={handleSaveSource}
                disabled={!canSaveSource || !isModified || isSaving}
                title={
                  !canSaveSource && sourceState.kind === 'dropped-file'
                    ? t('browser.saveDisabledDroppedFile')
                    : t('common.saveCtrlS')
                }
              >
                {isSaving ? t('common.saving') : (saveMsg ?? t('common.save'))}
              </button>
            </div>
            <CodeMirror
              ref={editorRef}
              value={sourceText}
              theme={oneDark}
              extensions={editorExts}
              readOnly={!canEditBrowserSource(sourceState.kind)}
              onChange={handleSourceChange}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                drawSelection: true,
                dropCursor: false,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
                rectangularSelection: true,
                crosshairCursor: false,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                searchKeymap: true,
              }}
            />
          </div>
        )}
        {mode === 'split' && <div className="pane-splitter" onMouseDown={onSplitterMouseDown} />}
        {(mode === 'preview' || mode === 'split') && (
          <div className="browser-preview-panel">
            {isSplitDragging && <div className="browser-webview-cover" />}
            {browserWebview}
          </div>
        )}
      </div>
      {sourceSurface.menuElement}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeContextMenu} />}
    </div>
  );
}
