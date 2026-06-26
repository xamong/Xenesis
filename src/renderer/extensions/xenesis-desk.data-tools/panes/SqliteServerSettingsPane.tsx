import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AppSettings, ServerStatus } from '../../../../shared/types';
import { useI18n } from '../../../i18n';

const DEFAULT_API_URL = 'https://ai.xamong.com';
const DEFAULT_PORT = 3001;
const PORT_MIN = 1024;
const PORT_MAX = 65535;

function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function parsePort(value: string): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < PORT_MIN || n > PORT_MAX) return null;
  return n;
}

function localhostUrlWithPort(url: string, port: number): string {
  const rawUrl = url.trim() || DEFAULT_API_URL;
  const localhostMatch = /^(https?:\/\/localhost:)\d+(\/?.*)$/.exec(rawUrl);
  return localhostMatch ? `${localhostMatch[1]}${port}${localhostMatch[2]}` : rawUrl;
}

export function SqliteServerSettingsPane(): React.ReactElement {
  const { t } = useI18n();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [devMode, setDevMode] = useState(false);
  const [portStr, setPortStr] = useState(String(DEFAULT_PORT));
  const [portError, setPortError] = useState('');
  const [srvStatus, setSrvStatus] = useState<ServerStatus>({ running: false, port: DEFAULT_PORT });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');

  const effectivePort = parsePort(portStr) ?? settings?.serverPort ?? DEFAULT_PORT;

  const applySettings = useCallback((next: AppSettings) => {
    setSettings(next);
    setApiUrl(next.apiUrl || DEFAULT_API_URL);
    setDevMode(next.devMode ?? false);
    setPortStr(String(next.serverPort ?? DEFAULT_PORT));
    setPortError('');
  }, []);

  const pollStatus = useCallback(() => {
    window.serverAPI
      .status()
      .then(setSrvStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.terminalAPI
      .getSettings()
      .then(applySettings)
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
    pollStatus();
  }, [applySettings, pollStatus]);

  useEffect(() => {
    if (!devMode) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollStatus();
    pollRef.current = setInterval(pollStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [devMode, pollStatus]);

  const saveUpdatedSettings = useCallback(
    async (updated: Partial<AppSettings>) => {
      await window.terminalAPI.saveSettings(updated);
      setSettings((prev) => (prev ? { ...prev, ...updated } : prev));
      window.dispatchEvent(
        new CustomEvent('app-settings-changed', {
          detail: { ...(settings ?? {}), ...updated },
        }),
      );
    },
    [settings],
  );

  const handlePortChange = useCallback(
    (value: string) => {
      setPortStr(value);
      if (!value) {
        setPortError(t('settings.portRequired'));
        return;
      }
      const port = parsePort(value);
      if (port === null) {
        setPortError(t('settings.portRange', { min: String(PORT_MIN), max: String(PORT_MAX) }));
        return;
      }
      setPortError('');
      setApiUrl((prev) => localhostUrlWithPort(prev, port));
    },
    [t],
  );

  const handleSave = useCallback(async () => {
    const port = parsePort(portStr);
    if (port === null) {
      setPortError(t('settings.portRange', { min: String(PORT_MIN), max: String(PORT_MAX) }));
      return;
    }
    const finalApiUrl = localhostUrlWithPort(apiUrl, port);
    setBusy(true);
    setMessage('');
    try {
      await saveUpdatedSettings({ apiUrl: finalApiUrl, devMode, serverPort: port });
      setApiUrl(finalApiUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [apiUrl, devMode, portStr, saveUpdatedSettings, t]);

  const handleServerToggle = useCallback(async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!srvStatus.running) {
        const port = parsePort(portStr);
        const savedPort = settings?.serverPort ?? DEFAULT_PORT;
        if (port !== null && port !== savedPort) {
          const finalApiUrl = localhostUrlWithPort(apiUrl, port);
          await saveUpdatedSettings({ apiUrl: finalApiUrl, devMode, serverPort: port });
          setApiUrl(finalApiUrl);
        }
      }

      const status = srvStatus.running ? await window.serverAPI.stop() : await window.serverAPI.start();
      setSrvStatus(status);

      if (!srvStatus.running && status.running) {
        const targetUrl = `http://localhost:${status.port}`;
        const currentUrl = apiUrl.trim() || DEFAULT_API_URL;
        const localhostMatch = /^https?:\/\/localhost:\d+(\/?.*)$/.exec(currentUrl);
        if (localhostMatch && currentUrl !== targetUrl) {
          await saveUpdatedSettings({ apiUrl: targetUrl, serverPort: status.port });
          setApiUrl(targetUrl);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }, [apiUrl, devMode, portStr, saveUpdatedSettings, settings?.serverPort, srvStatus.running]);

  return (
    <section className="sp-section">
      <div className="sp-section-heading">
        <div>
          <h2>{t('settings.developerServerTitle')}</h2>
          <p>{t('settings.developerServerDesc')}</p>
        </div>
        <div className="sp-actions-row">
          <button className="sp-btn sp-btn-primary" disabled={busy || !!portError} onClick={handleSave}>
            {saved ? t('settings.settingsSaved') : t('settings.settingsSave')}
          </button>
        </div>
      </div>

      {message && <p className="sp-error">{message}</p>}

      <div className="sp-field">
        <label className="sp-label" htmlFor="sp-ext-api-url">
          {t('settings.developerApiUrlLabel')}
        </label>
        <div className="sp-input-row">
          <input
            id="sp-ext-api-url"
            className="sp-input"
            type="text"
            value={apiUrl}
            placeholder={DEFAULT_API_URL}
            onChange={(event) => setApiUrl(event.target.value)}
          />
          <button
            className="sp-icon-btn"
            title={t('settings.developerApiUrlResetTitle')}
            onClick={() => setApiUrl(DEFAULT_API_URL)}
          >
            R
          </button>
        </div>
        <p className="sp-hint">{t('settings.developerApiUrlHint')}</p>
      </div>

      <div className="sp-grid two">
        <div className="sp-field sp-field-inline">
          <label className="sp-label" htmlFor="sp-ext-dev-mode">
            {t('settings.developerDevModeLabel')}
          </label>
          <button
            id="sp-ext-dev-mode"
            className={cls('sp-toggle', devMode && 'sp-toggle-on')}
            role="switch"
            aria-checked={devMode}
            onClick={() => setDevMode((value) => !value)}
          >
            <span className="sp-toggle-thumb" />
          </button>
          <span className="sp-toggle-label">
            {devMode ? t('settings.developerDevModeOn') : t('settings.developerDevModeOff')}
          </span>
        </div>

        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-ext-server-port">
            {t('settings.developerPortLabel')}
          </label>
          <div className="sp-input-row">
            <input
              id="sp-ext-server-port"
              className={cls('sp-input', 'sp-input-port', portError && 'sp-input-error')}
              type="number"
              min={PORT_MIN}
              max={PORT_MAX}
              value={portStr}
              onChange={(event) => handlePortChange(event.target.value)}
            />
            <button
              className="sp-icon-btn"
              title={t('settings.developerPortResetTitle')}
              onClick={() => handlePortChange(String(DEFAULT_PORT))}
            >
              R
            </button>
            <span className="sp-hint sp-inline-hint">
              {srvStatus.running
                ? `${t('settings.developerServerRunning', { port: String(srvStatus.port) })}${srvStatus.port !== effectivePort ? ` ${t('settings.developerServerRestartHint')}` : ''}`
                : t('settings.developerServerApplyHint')}
            </span>
          </div>
          {portError && <p className="sp-error">{portError}</p>}
        </div>
      </div>

      {devMode && (
        <div className="sp-server-status-row">
          <span className={cls('sp-server-dot', srvStatus.running ? 'sp-dot-on' : 'sp-dot-off')} />
          <span className="sp-server-status-text">
            {srvStatus.running
              ? `${t('settings.agentApiStatusRunning')} (${t('settings.developerPortLabel')} ${srvStatus.port}${srvStatus.pid != null ? `, PID ${srvStatus.pid}` : ''})`
              : t('settings.developerServerStopped')}
          </span>
          <button
            className={cls('sp-btn', srvStatus.running ? 'sp-btn-danger' : 'sp-btn-success')}
            disabled={busy}
            onClick={handleServerToggle}
          >
            {busy
              ? t('settings.developerServerProcessing')
              : srvStatus.running
                ? t('settings.developerServerStop')
                : t('settings.developerServerStart')}
          </button>
          {srvStatus.running && (
            <button className="sp-btn-ghost sp-btn-sm" onClick={() => setApiUrl(`http://localhost:${srvStatus.port}`)}>
              {t('settings.developerSetApiUrl')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
