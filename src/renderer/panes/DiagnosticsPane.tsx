import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DiagnosticsLogEntry, DiagnosticsLogLevel, DiagnosticsLogSource } from '../../shared/types';
import { useI18n } from '../i18n';
import {
  clearRendererPerformanceTrace,
  createRendererPerformanceTraceSummary,
  getRendererPerformanceTraceSetting,
  getRendererPerformanceTraceSnapshot,
  type RendererPerformanceTraceEntry,
  setRendererPerformanceTraceSetting,
  subscribeRendererPerformanceTrace,
} from '../utils/performanceTrace';

type DiagnosticsFilterLevel = 'all' | DiagnosticsLogLevel;
type DiagnosticsFilterSource = 'all' | DiagnosticsLogSource;

const LEVELS: DiagnosticsFilterLevel[] = ['all', 'error', 'warn', 'info'];
const DEFAULT_PERFORMANCE_TRACE_SETTING = 'xdbot markdown-xcon';
const SOURCES: DiagnosticsFilterSource[] = [
  'all',
  'main',
  'renderer',
  'extension',
  'terminal',
  'remote-file',
  'updater',
  'transfer',
  'system',
];

function formatDiagnosticsLog(items: DiagnosticsLogEntry[]): string {
  return items
    .map((item) => {
      const timestamp = new Date(item.timestamp).toISOString();
      const detail = item.detail ? `\n${item.detail}` : '';
      return `[${timestamp}] [${item.level}] [${item.source}] ${item.scope} - ${item.message}${detail}`;
    })
    .join('\n\n');
}

function matchesQuery(item: DiagnosticsLogEntry, query: string): boolean {
  if (!query) return true;
  const haystack = `${item.level} ${item.source} ${item.scope} ${item.message} ${item.detail ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function formatPerformanceDuration(durationMs?: number): string {
  if (!Number.isFinite(durationMs)) return '';
  return `${Math.max(0, durationMs ?? 0).toFixed(1)}ms`;
}

function formatPerformanceTraceDetails(item: RendererPerformanceTraceEntry): string {
  const details = item.details && Object.keys(item.details).length > 0 ? item.details : undefined;
  if (!details) return '';
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export function DiagnosticsPane() {
  const { t } = useI18n();
  const [items, setItems] = useState<DiagnosticsLogEntry[]>([]);
  const [diagnosticsLevel, setDiagnosticsLevel] = useState<DiagnosticsFilterLevel>('all');
  const [diagnosticsSource, setDiagnosticsSource] = useState<DiagnosticsFilterSource>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [diagnosticsBundleMessage, setDiagnosticsBundleMessage] = useState('');
  const [performanceTraceSetting, setPerformanceTraceSettingState] = useState(() =>
    getRendererPerformanceTraceSetting(),
  );
  const [performanceTraceItems, setPerformanceTraceItems] = useState<RendererPerformanceTraceEntry[]>(() =>
    getRendererPerformanceTraceSnapshot(),
  );

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setItems(await window.diagnosticsAPI.list());
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return window.diagnosticsAPI.onChanged(setItems);
  }, [load]);

  useEffect(() => subscribeRendererPerformanceTrace(setPerformanceTraceItems), []);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (diagnosticsLevel === 'all' || item.level === diagnosticsLevel) &&
          (diagnosticsSource === 'all' || item.source === diagnosticsSource) &&
          matchesQuery(item, query.trim()),
      ),
    [diagnosticsLevel, diagnosticsSource, items, query],
  );
  const performanceTraceEnabled = performanceTraceSetting.trim().length > 0;
  const recentPerformanceTraceItems = useMemo(
    () => performanceTraceItems.slice(-12).reverse(),
    [performanceTraceItems],
  );
  const performanceTraceSummary = useMemo(
    () => createRendererPerformanceTraceSummary(performanceTraceItems).slice(0, 3),
    [performanceTraceItems],
  );

  const handleClear = useCallback(async () => {
    setItems(await window.diagnosticsAPI.clear());
  }, []);

  const handleExport = useCallback(() => {
    void window.terminalAPI.saveLog({
      defaultName: 'xenesis-diagnostics.log',
      text: formatDiagnosticsLog(filteredItems),
    });
  }, [filteredItems]);

  const handleTogglePerformanceTrace = useCallback(() => {
    const next = performanceTraceEnabled ? '' : DEFAULT_PERFORMANCE_TRACE_SETTING;
    setPerformanceTraceSettingState(setRendererPerformanceTraceSetting(next));
  }, [performanceTraceEnabled]);

  const handleClearPerformanceTrace = useCallback(() => {
    setPerformanceTraceItems(clearRendererPerformanceTrace());
  }, []);

  const handleExportPerformanceTrace = useCallback(() => {
    void window.terminalAPI.saveLog({
      defaultName: 'xenesis-renderer-performance-trace.json',
      text: JSON.stringify(performanceTraceItems, null, 2),
    });
  }, [performanceTraceItems]);

  const handleRevealLogFile = useCallback(() => {
    void window.diagnosticsAPI.revealLogFile();
  }, []);

  const handleExportBundle = useCallback(async () => {
    setDiagnosticsBundleMessage('');
    try {
      const result = await window.diagnosticsAPI.exportBundle();
      if (result.saved) {
        setDiagnosticsBundleMessage(t('app.diagnosticsBundleExported', { path: result.path ?? '' }));
      } else if (result.error) {
        setDiagnosticsBundleMessage(t('app.diagnosticsBundleExportFailed', { e: result.error }));
      }
    } catch (error) {
      setDiagnosticsBundleMessage(
        t('app.diagnosticsBundleExportFailed', {
          e: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }, [t]);

  const levelLabel = useCallback(
    (level: DiagnosticsFilterLevel) => (level === 'all' ? t('app.diagnosticsAll') : t(`app.diagnosticsLevel.${level}`)),
    [t],
  );

  const sourceLabel = useCallback(
    (source: DiagnosticsFilterSource) =>
      source === 'all' ? t('app.diagnosticsAll') : t(`app.diagnosticsSource.${source}`),
    [t],
  );

  return (
    <div className="diagnostics-pane">
      <div className="diagnostics-toolbar">
        <div className="diagnostics-heading">
          <h2>{t('app.diagnosticsCenter')}</h2>
          <span>{t('app.diagnosticsCount', { count: filteredItems.length, total: items.length })}</span>
        </div>
        <div className="diagnostics-actions">
          <button type="button" onClick={load} disabled={busy}>
            {t('app.diagnosticsRefresh')}
          </button>
          <button type="button" onClick={handleExport} disabled={filteredItems.length === 0}>
            {t('app.diagnosticsExport')}
          </button>
          <button type="button" onClick={handleExportBundle}>
            {t('app.diagnosticsExportBundle')}
          </button>
          <button type="button" onClick={handleRevealLogFile}>
            {t('app.diagnosticsRevealLogFile')}
          </button>
          <button type="button" onClick={handleClear} disabled={items.length === 0}>
            {t('app.diagnosticsClear')}
          </button>
        </div>
      </div>
      {diagnosticsBundleMessage && <p className="diagnostics-status">{diagnosticsBundleMessage}</p>}

      <div className="diagnostics-filters">
        <label>
          <span>{t('app.diagnosticsLevelLabel')}</span>
          <select
            value={diagnosticsLevel}
            onChange={(event) => setDiagnosticsLevel(event.target.value as DiagnosticsFilterLevel)}
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {levelLabel(level)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('app.diagnosticsSourceLabel')}</span>
          <select
            value={diagnosticsSource}
            onChange={(event) => setDiagnosticsSource(event.target.value as DiagnosticsFilterSource)}
          >
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {sourceLabel(source)}
              </option>
            ))}
          </select>
        </label>
        <label className="diagnostics-search">
          <span>{t('app.diagnosticsSearch')}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('app.diagnosticsSearchPlaceholder')}
          />
        </label>
      </div>

      <section className="diagnostics-performance-trace" aria-label={t('app.diagnosticsPerformanceTraceTitle')}>
        <div className="diagnostics-performance-head">
          <div>
            <h3>{t('app.diagnosticsPerformanceTraceTitle')}</h3>
            <span>{t('app.diagnosticsPerformanceTraceCount', { count: performanceTraceItems.length })}</span>
          </div>
          <div className="diagnostics-performance-actions">
            <span className={`diagnostics-trace-status ${performanceTraceEnabled ? 'is-on' : 'is-off'}`}>
              {performanceTraceEnabled
                ? t('app.diagnosticsPerformanceTraceOn')
                : t('app.diagnosticsPerformanceTraceOff')}
            </span>
            <button type="button" onClick={handleTogglePerformanceTrace}>
              {performanceTraceEnabled
                ? t('app.diagnosticsPerformanceTraceDisable')
                : t('app.diagnosticsPerformanceTraceEnable')}
            </button>
            <button type="button" onClick={handleExportPerformanceTrace} disabled={performanceTraceItems.length === 0}>
              {t('app.diagnosticsPerformanceTraceExport')}
            </button>
            <button type="button" onClick={handleClearPerformanceTrace} disabled={performanceTraceItems.length === 0}>
              {t('app.diagnosticsPerformanceTraceClear')}
            </button>
          </div>
        </div>
        <div className="diagnostics-trace-summary" aria-label={t('app.diagnosticsPerformanceTraceBottleneck')}>
          {performanceTraceSummary.length === 0 ? (
            <div className="diagnostics-trace-summary-empty">{t('app.diagnosticsPerformanceTraceNoBottleneck')}</div>
          ) : (
            performanceTraceSummary.map((item) => (
              <article key={`${item.scope}-${item.action}`} className="diagnostics-trace-summary-card">
                <span>{t('app.diagnosticsPerformanceTraceBottleneck')}</span>
                <strong>
                  {item.scope} / {item.action}
                </strong>
                <dl>
                  <div>
                    <dt>count</dt>
                    <dd>{item.count}</dd>
                  </div>
                  <div>
                    <dt>avg</dt>
                    <dd>{formatPerformanceDuration(item.averageDurationMs)}</dd>
                  </div>
                  <div>
                    <dt>max</dt>
                    <dd>{formatPerformanceDuration(item.maxDurationMs)}</dd>
                  </div>
                  <div>
                    <dt>total</dt>
                    <dd>{formatPerformanceDuration(item.totalDurationMs)}</dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
        <div className="diagnostics-trace-list">
          {recentPerformanceTraceItems.length === 0 ? (
            <div className="diagnostics-trace-empty">{t('app.diagnosticsPerformanceTraceEmpty')}</div>
          ) : (
            recentPerformanceTraceItems.map((item, index) => {
              const detail = formatPerformanceTraceDetails(item);
              const duration = formatPerformanceDuration(item.durationMs);
              return (
                <article
                  key={`${item.timestamp}-${item.scope}-${item.action}-${index}`}
                  className="diagnostics-trace-row"
                >
                  <div className="diagnostics-trace-row-head">
                    <span>{item.scope}</span>
                    <strong>{item.action}</strong>
                    {duration && <span>{duration}</span>}
                    {item.timestamp && <time>{new Date(item.timestamp).toLocaleTimeString()}</time>}
                  </div>
                  {detail && <pre>{detail}</pre>}
                </article>
              );
            })
          )}
        </div>
      </section>

      <div className="diagnostics-list">
        {filteredItems.length === 0 ? (
          <div className="diagnostics-empty">{t('app.diagnosticsEmpty')}</div>
        ) : (
          filteredItems.map((item) => (
            <article key={item.id} className={`diagnostics-row diagnostics-row--${item.level}`}>
              <div className="diagnostics-row-head">
                <span className="diagnostics-badge diagnostics-badge--level">{levelLabel(item.level)}</span>
                <span className="diagnostics-badge">{sourceLabel(item.source)}</span>
                <span className="diagnostics-scope">{item.scope}</span>
                <time>{new Date(item.timestamp).toLocaleString()}</time>
              </div>
              <div className="diagnostics-message">{item.message}</div>
              {item.detail && <pre className="diagnostics-detail">{item.detail}</pre>}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
