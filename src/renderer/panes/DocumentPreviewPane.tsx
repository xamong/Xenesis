import { renderAsync } from 'docx-preview';
import { Viewer as HwpViewer } from 'hwp.js';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PPTXViewer } from 'pptxviewjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useI18n } from '../i18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PreviewStatus = 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';

interface DocumentPreviewPaneProps {
  fileName: string;
  filePath?: string;
  ext: string;
  content: string;
  onContentUpdate?: (content: string) => void;
}

type HwpViewerHandle = {
  distory?: () => void;
  destroy?: () => void;
};

const WORD_EXTS = new Set(['docx']);
const HWP_EXTS = new Set(['hwp', 'hwpx']);
const SHEET_EXTS = new Set(['xls', 'xlsx', 'xlsm', 'xlsb']);
const PRESENTATION_EXTS = new Set(['pptx']);

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function clampZoom(value: number): number {
  return Math.min(2.5, Math.max(0.5, Number(value.toFixed(2))));
}

export function DocumentPreviewPane({ fileName, filePath, ext, content, onContentUpdate }: DocumentPreviewPaneProps) {
  const { t } = useI18n();
  const extLower = ext.toLowerCase();
  const bytes = useMemo(() => {
    try {
      return base64ToBytes(content);
    } catch {
      return null;
    }
  }, [content]);

  const [status, setStatus] = useState<PreviewStatus>('idle');
  const [message, setMessage] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [sheetHtml, setSheetHtml] = useState('');
  const [pptxViewer, setPptxViewer] = useState<PPTXViewer | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pptxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const docxBodyRef = useRef<HTMLDivElement | null>(null);
  const docxStyleRef = useRef<HTMLDivElement | null>(null);
  const hwpContainerRef = useRef<HTMLDivElement | null>(null);
  const hwpViewerRef = useRef<HwpViewerHandle | null>(null);

  const isPresentation = PRESENTATION_EXTS.has(extLower);
  const canZoom = extLower === 'pdf' || WORD_EXTS.has(extLower) || extLower === 'hwp' || isPresentation;
  const isSheet = SHEET_EXTS.has(extLower);
  const isPdf = extLower === 'pdf';

  const handleRefresh = useCallback(async () => {
    if (!filePath || !onContentUpdate) return;
    const result = await window.fileAPI.readFile(filePath);
    if (result?.contentType === 'document-preview') {
      onContentUpdate(result.content);
    }
  }, [filePath, onContentUpdate]);

  const { isRefreshing, refresh } = usePaneRefresh({ onRefresh: handleRefresh });

  useEffect(() => {
    setStatus('loading');
    setMessage('');
    setPdfDoc(null);
    setPageNumber(1);
    setPageCount(0);
    setWorkbook(null);
    setSheetNames([]);
    setActiveSheet('');
    setSheetHtml('');
    setPptxViewer(null);

    if (docxBodyRef.current) docxBodyRef.current.innerHTML = '';
    if (docxStyleRef.current) docxStyleRef.current.innerHTML = '';
    if (hwpContainerRef.current) hwpContainerRef.current.innerHTML = '';
    const pptxCanvas = pptxCanvasRef.current;
    if (pptxCanvas) {
      const context = pptxCanvas.getContext('2d');
      context?.clearRect(0, 0, pptxCanvas.width, pptxCanvas.height);
    }
    hwpViewerRef.current?.distory?.();
    hwpViewerRef.current?.destroy?.();
    hwpViewerRef.current = null;

    if (!bytes) {
      setStatus('error');
      setMessage(t('dock.documentPreviewInvalid'));
      return;
    }

    if (extLower === 'doc') {
      setStatus('unsupported');
      setMessage(t('dock.documentPreviewUnsupportedDoc'));
      return;
    }

    if (extLower === 'ppt') {
      setStatus('unsupported');
      setMessage(t('dock.documentPreviewUnsupportedPpt'));
      return;
    }

    if (extLower === 'hwpx') {
      setStatus('unsupported');
      setMessage(t('dock.documentPreviewUnsupportedHwpx'));
      return;
    }

    let cancelled = false;
    let pdfTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    let loadedPdf: PDFDocumentProxy | null = null;
    let loadedPptxViewer: PPTXViewer | null = null;
    let cleanup: (() => void) | undefined;

    const fail = (error: unknown) => {
      if (cancelled) return;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : t('dock.documentPreviewFailed'));
    };

    if (extLower === 'pdf') {
      pdfTask = pdfjsLib.getDocument({ data: bytesToArrayBuffer(bytes) });
      pdfTask.promise
        .then((pdf) => {
          loadedPdf = pdf;
          if (cancelled) {
            void pdf.destroy();
            return;
          }
          setPdfDoc(pdf);
          setPageCount(pdf.numPages);
          setPageNumber(1);
          setStatus('ready');
        })
        .catch(fail);
    } else if (WORD_EXTS.has(extLower)) {
      const body = docxBodyRef.current;
      const styles = docxStyleRef.current;
      if (!body) {
        fail(new Error(t('dock.documentPreviewFailed')));
      } else {
        body.innerHTML = '';
        if (styles) styles.innerHTML = '';
        renderAsync(bytesToArrayBuffer(bytes), body, styles ?? undefined, {
          className: 'doc-preview-docx-document',
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          useBase64URL: true,
        })
          .then(() => {
            if (!cancelled) setStatus('ready');
          })
          .catch(fail);
      }
    } else if (PRESENTATION_EXTS.has(extLower)) {
      const canvas = pptxCanvasRef.current;
      if (!canvas) {
        fail(new Error(t('dock.documentPreviewFailed')));
      } else {
        const viewer = new PPTXViewer({
          canvas,
          backgroundColor: '#ffffff',
          slideSizeMode: 'fit',
          autoExposeGlobals: true,
        });
        loadedPptxViewer = viewer;
        cleanup = () => {
          viewer.destroy();
          if (pptxCanvasRef.current === canvas) {
            const context = canvas.getContext('2d');
            context?.clearRect(0, 0, canvas.width, canvas.height);
          }
        };
        viewer
          .loadFile(bytesToArrayBuffer(bytes))
          .then(() => {
            if (cancelled) return;
            const count = viewer.getSlideCount();
            setPageCount(count);
            setPageNumber(1);
            setPptxViewer(viewer);
            setStatus(count > 0 ? 'ready' : 'error');
            if (count === 0) setMessage(t('dock.documentPreviewNoSlides'));
          })
          .catch(fail);
      }
    } else if (HWP_EXTS.has(extLower)) {
      const container = hwpContainerRef.current;
      if (!container) {
        fail(new Error(t('dock.documentPreviewFailed')));
      } else {
        try {
          container.innerHTML = '';
          const viewer = new HwpViewer(container, bytes);
          hwpViewerRef.current = viewer as HwpViewerHandle;
          cleanup = () => {
            hwpViewerRef.current?.distory?.();
            hwpViewerRef.current?.destroy?.();
            hwpViewerRef.current = null;
            container.innerHTML = '';
          };
          setStatus('ready');
        } catch (error) {
          fail(error);
        }
      }
    } else if (SHEET_EXTS.has(extLower)) {
      try {
        const nextWorkbook = XLSX.read(bytes, { type: 'array' });
        const names = nextWorkbook.SheetNames ?? [];
        setWorkbook(nextWorkbook);
        setSheetNames(names);
        setActiveSheet(names[0] ?? '');
        setStatus(names.length > 0 ? 'ready' : 'error');
        if (names.length === 0) setMessage(t('dock.documentPreviewNoSheets'));
      } catch (error) {
        fail(error);
      }
    } else {
      setStatus('unsupported');
      setMessage(t('dock.documentPreviewUnsupported'));
    }

    return () => {
      cancelled = true;
      cleanup?.();
      if (loadedPdf) {
        void loadedPdf.destroy();
      } else {
        void pdfTask?.destroy();
      }
      if (!cleanup) loadedPptxViewer?.destroy();
    };
  }, [bytes, extLower, t]);

  useEffect(() => {
    if (!pdfDoc || !isPdf) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null = null;
    setIsPageRendering(true);

    pdfDoc
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const viewport = page.getViewport({ scale: zoom });
        const context = canvas.getContext('2d');
        if (!context) throw new Error(t('dock.documentPreviewFailed'));
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        context.clearRect(0, 0, canvas.width, canvas.height);
        renderTask = page.render({ canvasContext: context, canvas, viewport });
        return renderTask.promise;
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : t('dock.documentPreviewFailed'));
      })
      .finally(() => {
        if (!cancelled) setIsPageRendering(false);
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [isPdf, pageNumber, pdfDoc, t, zoom]);

  useEffect(() => {
    if (!pptxViewer || !isPresentation || status !== 'ready') return;
    const canvas = pptxCanvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setIsPageRendering(true);

    pptxViewer
      .renderSlide(pageNumber - 1, canvas, { quality: 'high' })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : t('dock.documentPreviewFailed'));
      })
      .finally(() => {
        if (!cancelled) setIsPageRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isPresentation, pageNumber, pptxViewer, status, t, zoom]);

  useEffect(() => {
    if (!workbook || !activeSheet) {
      setSheetHtml('');
      return;
    }
    const sheet = workbook.Sheets[activeSheet];
    if (!sheet) {
      setSheetHtml('');
      return;
    }
    setSheetHtml(XLSX.utils.sheet_to_html(sheet, { id: 'doc-preview-table' }));
  }, [activeSheet, workbook]);

  const zoomOut = useCallback(() => setZoom((value) => clampZoom(value - 0.1)), []);
  const zoomIn = useCallback(() => setZoom((value) => clampZoom(value + 0.1)), []);
  const resetZoom = useCallback(() => setZoom(1), []);
  const prevPage = useCallback(() => setPageNumber((value) => Math.max(1, value - 1)), []);
  const nextPage = useCallback(() => setPageNumber((value) => Math.min(pageCount, value + 1)), [pageCount]);

  return (
    <div className="doc-preview-root">
      <div className="doc-preview-toolbar">
        <div className="doc-preview-title" title={filePath ?? fileName}>
          <span className="doc-preview-filename">{fileName}</span>
          <span className="doc-preview-badge">{extLower || 'file'}</span>
        </div>

        {isSheet && sheetNames.length > 0 && (
          <label className="doc-preview-sheet-picker">
            <span>{t('dock.documentPreviewSheet')}</span>
            <select value={activeSheet} onChange={(event) => setActiveSheet(event.target.value)}>
              {sheetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}

        {(isPdf || isPresentation) && pageCount > 0 && (
          <div className="doc-preview-page-controls">
            <button
              type="button"
              className="xd-icon-btn"
              onClick={prevPage}
              disabled={pageNumber <= 1}
              title={t(isPresentation ? 'dock.documentPreviewPrevSlide' : 'dock.documentPreviewPrevPage')}
            >
              ‹
            </button>
            <span>
              {isPresentation
                ? t('dock.documentPreviewSlide', { slide: pageNumber, count: pageCount })
                : t('dock.documentPreviewPage', { page: pageNumber, count: pageCount })}
            </span>
            <button
              type="button"
              className="xd-icon-btn"
              onClick={nextPage}
              disabled={pageNumber >= pageCount}
              title={t(isPresentation ? 'dock.documentPreviewNextSlide' : 'dock.documentPreviewNextPage')}
            >
              ›
            </button>
          </div>
        )}

        {canZoom && (
          <div className="doc-preview-zoom-controls">
            <button type="button" className="xd-icon-btn" onClick={zoomOut} title={t('dock.documentPreviewZoomOut')}>
              −
            </button>
            <button
              type="button"
              className="xd-mode-btn"
              onClick={resetZoom}
              title={t('dock.documentPreviewResetZoom')}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="xd-icon-btn" onClick={zoomIn} title={t('dock.documentPreviewZoomIn')}>
              +
            </button>
          </div>
        )}

        <div className="doc-preview-spacer" />
        <button
          type="button"
          className={`xd-icon-btn${isRefreshing ? ' pending' : ''}`}
          onClick={refresh}
          disabled={!filePath || !onContentUpdate || isRefreshing}
          title={t('dock.documentPreviewRefresh')}
        >
          ↻
        </button>
      </div>

      <div className="doc-preview-body">
        {status === 'loading' && <div className="doc-preview-state">{t('dock.documentPreviewLoading')}</div>}

        {(status === 'error' || status === 'unsupported') && (
          <div className={`doc-preview-state${extLower === 'doc' ? ' unsupported-doc' : ''}`}>
            <strong>
              {status === 'unsupported' ? t('dock.documentPreviewUnsupportedTitle') : t('dock.documentPreviewFailed')}
            </strong>
            <span>{message}</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`doc-preview-canvas${isPdf && status === 'ready' ? ' is-visible' : ''}`}
          aria-busy={isPageRendering}
        />

        <div className={`doc-preview-word${WORD_EXTS.has(extLower) && status === 'ready' ? ' is-visible' : ''}`}>
          <div ref={docxStyleRef} className="doc-preview-docx-styles" />
          <div
            ref={docxBodyRef}
            className="doc-preview-docx"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          />
        </div>

        <div
          ref={hwpContainerRef}
          className={`doc-preview-hwp${extLower === 'hwp' && status === 'ready' ? ' is-visible' : ''}`}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        />

        <div
          className={`doc-preview-pptx-stage${isPresentation && status === 'ready' ? ' is-visible' : ''}`}
          style={{ transform: `scale(${zoom})` }}
        >
          <canvas
            ref={pptxCanvasRef}
            className="doc-preview-pptx-canvas"
            width={1280}
            height={720}
            aria-busy={isPageRendering}
          />
        </div>

        {isSheet && status === 'ready' && (
          <div className="doc-preview-sheet doc-preview-table" dangerouslySetInnerHTML={{ __html: sheetHtml }} />
        )}
      </div>
    </div>
  );
}
