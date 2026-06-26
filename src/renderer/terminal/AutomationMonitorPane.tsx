/**
 * AutomationMonitorPane — 터미널 자동화 실시간 감시 패널.
 *
 * 상태가 명확히 보이도록 설계:
 *  - 대형 상태 표시기 (감시 중 / 대기 중 / 차단됨)
 *  - autoSend ON/OFF 실제 값 반영
 *  - pending 이벤트에 수동 전송 버튼 자동 생성
 *  - 수동 명령 입력 바 항상 노출
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AutomationEvent,
  AutomationMode,
  AutomationOption,
  AutomationStage,
  AutomationStatus,
  AutomationStreamFilterProfile,
} from '../../shared/types';
import { useI18n } from '../i18n';

interface AutomationMonitorPaneProps {
  termId: string;
  termLabel?: string;
}

// ── 상수 ──────────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<AutomationStage, string> = {
  1: '1. Regex',
  2: '2. State Machine',
  3: '3. LLM + Fallback',
};

const MODE_CLASSES: Record<AutomationMode, string> = {
  stream: 'is-stream',
  watch: 'is-watch',
  respond: 'is-respond',
};

type StreamFilterSelection = AutomationStreamFilterProfile | 'default';

const STREAM_FILTER_PROFILES: AutomationStreamFilterProfile[] = [
  'auto',
  'none',
  'codex',
  'claude',
  'gemini',
  'aider',
  'windsurf',
];

const SOURCE_COLORS: Record<string, string> = {
  regex: '#4ade80',
  'state-machine': '#60a5fa',
  llm: '#c084fc',
};

// ── automationAPI window 타입 ─────────────────────────────────────────────────

interface AutomationApiWindow {
  setEnabled(termId: string, enabled: boolean): void;
  setStage(termId: string, stage: AutomationStage): void;
  setStreamFilterProfile(termId: string, profile: AutomationStreamFilterProfile | 'default'): void;
  getStatus(termId: string): Promise<AutomationStatus | null>;
  getEvents(termId: string): Promise<AutomationEvent[]>;
  clearEvents(termId: string): void;
  onStatus(termId: string, cb: (s: AutomationStatus) => void): () => void;
  onEvent(termId: string, cb: (e: AutomationEvent) => void): () => void;
  reloadSettings(): void;
  manualSend(termId: string, input: string, pendingEventId?: string): void;
}

function getApi(): AutomationApiWindow | undefined {
  return (window as Window & { automationAPI?: AutomationApiWindow }).automationAPI;
}

// ── 대형 상태 표시기 컴포넌트 ─────────────────────────────────────────────────

function StatusIndicator({
  status,
  onToggle,
  onStageChange,
  onStreamFilterProfileChange,
}: {
  status: AutomationStatus | null;
  onToggle: () => void;
  onStageChange: (s: AutomationStage) => void;
  onStreamFilterProfileChange: (profile: StreamFilterSelection) => void;
}) {
  const { t } = useI18n();
  const isLoading = status === null;
  const isEnabled = status?.enabled ?? false;
  const isBlocked = status?.blocked ?? false;
  const mode = status?.mode ?? ((status?.autoSend ?? false) ? 'respond' : 'watch');
  const autoSend = mode === 'respond';
  const modeLabel =
    mode === 'stream' ? t('monitor.modeStream') : mode === 'watch' ? t('monitor.modeWatch') : t('monitor.modeRespond');
  const defaultStreamFilterProfile = status?.defaultStreamFilterProfile ?? 'auto';
  const effectiveStreamFilterProfile = status?.streamFilterProfile ?? defaultStreamFilterProfile;
  const streamFilterSelection: StreamFilterSelection = status?.streamFilterProfileOverride ?? 'default';

  let stateClass = 'am-si-state-idle';
  let stateText = t('monitor.stateIdle');
  let stateDesc = t('monitor.stateIdleDesc');
  let stateEmoji = '○';

  if (isLoading) {
    stateText = t('monitor.stateLoading');
    stateDesc = '';
    stateEmoji = '…';
  } else if (isBlocked) {
    stateClass = 'am-si-state-blocked';
    stateText = t('monitor.stateBlocked');
    stateDesc = t('monitor.stateBlockedDesc', { reason: status?.blockReason ?? '' });
    stateEmoji = '⛔';
  } else if (isEnabled) {
    stateClass = 'am-si-state-active';
    stateText = mode === 'stream' ? t('monitor.stateStreaming') : t('monitor.stateWatching');
    stateDesc =
      mode === 'stream'
        ? t('monitor.stateStreamingDesc', { mode: modeLabel })
        : t('monitor.stateWatchingDesc', {
            stage: STAGE_LABELS[status!.stage],
            mode: modeLabel,
          });
    stateEmoji = '●';
  }

  return (
    <div className={`am-si ${stateClass}`}>
      {/* ── 상태 표시 ── */}
      <div className="am-si-main">
        <span className="am-si-dot" aria-hidden>
          {stateEmoji}
        </span>
        <div className="am-si-text">
          <span className="am-si-title">{stateText}</span>
          {stateDesc && <span className="am-si-desc">{stateDesc}</span>}
        </div>

        {/* ── 토글 버튼 ── */}
        <button
          className={`am-si-btn${isEnabled ? ' am-si-btn-stop' : isBlocked ? ' am-si-btn-unblock' : ' am-si-btn-start'}`}
          onClick={onToggle}
          disabled={isLoading}
          title={isBlocked ? t('monitor.toggleTitle') : ''}
        >
          {isEnabled ? t('monitor.btnStop') : isBlocked ? t('monitor.btnUnblock') : t('monitor.btnStart')}
        </button>
      </div>

      {/* ── 활성 시 부가 정보 + Stage 선택 ── */}
      {isEnabled && !isBlocked && (
        <div className="am-si-sub">
          {mode !== 'stream' && (
            <div className="am-si-sub-row">
              <span className="am-si-sub-label">{t('monitor.subDetectMethod')}</span>
              <div className="am-si-stage-btns">
                {([1, 2, 3] as AutomationStage[]).map((s) => (
                  <button
                    key={s}
                    className={`am-si-stage-btn${status!.stage === s ? ' is-active' : ''}`}
                    onClick={() => onStageChange(s)}
                    title={STAGE_LABELS[s]}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="am-si-sub-row">
            <span className="am-si-sub-label">{t('monitor.subMode')}</span>
            <span className={`am-si-autosend-badge ${MODE_CLASSES[mode]}`}>{modeLabel}</span>
            {mode === 'watch' && <span className="am-si-autosend-hint">{t('monitor.autoSendHint')}</span>}
            {mode === 'stream' && <span className="am-si-autosend-hint">{t('monitor.streamHint')}</span>}
          </div>

          <div className="am-si-sub-row">
            <label className="am-si-sub-label" htmlFor="am-stream-filter-profile">
              {t('monitor.streamFilterOverrideLabel')}
            </label>
            <select
              id="am-stream-filter-profile"
              className="am-stream-filter-select"
              value={streamFilterSelection}
              onChange={(event) => onStreamFilterProfileChange(event.currentTarget.value as StreamFilterSelection)}
            >
              <option value="default">
                {t('monitor.streamFilterUseDefault', {
                  profile: streamFilterProfileLabel(defaultStreamFilterProfile, t),
                })}
              </option>
              {STREAM_FILTER_PROFILES.map((profile) => (
                <option key={profile} value={profile}>
                  {streamFilterProfileLabel(profile, t)}
                </option>
              ))}
            </select>
            <span className="am-si-autosend-hint">
              {t('monitor.streamFilterEffective', {
                profile: streamFilterProfileLabel(effectiveStreamFilterProfile, t),
              })}
            </span>
          </div>

          {mode !== 'stream' && status?.llmReady && (
            <div className="am-si-sub-row">
              <span className="am-si-sub-label">LLM</span>
              <span className="am-si-llm-badge">{t('monitor.llmReady')}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 차단 시 안내 ── */}
      {isBlocked && (
        <div className="am-si-blocked-hint">
          {t('monitor.blockedHint')}
          <strong>{t('monitor.blockedHintStrong')}</strong>
          {t('monitor.blockedHintSuffix')}
        </div>
      )}
    </div>
  );
}

// ── 수동 명령 입력 바 ─────────────────────────────────────────────────────────

function ManualInputBar({ termId }: { termId: string }) {
  const { t } = useI18n();
  const [value, setValue] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const input = trimmed.endsWith('\r') || trimmed.endsWith('\n') ? trimmed : trimmed + '\r';
    getApi()?.manualSend(termId, input);
    setValue('');
  }, [termId, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="am-manual-bar">
      <span className="am-manual-label">{t('monitor.manualInputLabel')}</span>
      <input
        className="am-manual-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('monitor.manualInputPlaceholder')}
        spellCheck={false}
        autoComplete="off"
      />
      <button className="am-btn am-btn-send" onClick={handleSend} disabled={!value.trim()}>
        {t('monitor.manualSendBtn')}
      </button>
    </div>
  );
}

// ── 이벤트 카드 ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: AutomationEvent;
  termId: string;
  onDismiss: (id: string) => void;
}

function EventCard({ event, termId, onDismiss }: EventCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(event.kind === 'pending');
  const [sent, setSent] = useState(Boolean(event.dismissed));
  const optionCount = event.options?.length ?? 0;
  const visibleText = eventVisibleText(event);
  const statusMeta = eventStatusMeta(event, sent);
  const deliveryNoteKey = eventDeliveryNoteKey(event, sent);

  const kindMeta = useMemo(
    (): Record<string, { text: string; emoji: string }> => ({
      stream: { text: t('monitor.kindStream'), emoji: '↪' },
      user_input: { text: t('monitor.kindUserInput'), emoji: '⌨' },
      auto_input: { text: t('monitor.kindAutoInput'), emoji: '⚡' },
      pending: { text: t('monitor.kindPending'), emoji: '⏸' },
      manual_sent: { text: t('monitor.kindManualSent'), emoji: '👆' },
      blocked: { text: t('monitor.kindBlocked'), emoji: '⛔' },
      llm_error: { text: t('monitor.kindLlmError'), emoji: '⚠' },
      status_change: { text: t('monitor.kindStatusChange'), emoji: 'ℹ' },
    }),
    [t],
  );

  const meta = kindMeta[event.kind] ?? { text: event.kind, emoji: '•' };
  const color = event.source ? (SOURCE_COLORS[event.source] ?? '#9ca3af') : '#9ca3af';
  const isPending = event.kind === 'pending';
  const isStream = event.kind === 'stream';
  const isUserInput = event.kind === 'user_input';
  const isBlocked = event.kind === 'blocked';
  const isError = event.kind === 'llm_error';
  const isAutoSent = event.kind === 'auto_input';
  const isManual = event.kind === 'manual_sent';

  const doSend = useCallback(
    (input: string) => {
      getApi()?.manualSend(termId, input, event.id);
      setSent(true);
      onDismiss(event.id);
    },
    [termId, event.id, onDismiss],
  );

  let cardClass = 'am-event-card';
  if (isBlocked) cardClass += ' am-event-blocked';
  else if (isError) cardClass += ' am-event-error';
  else if (isPending && !sent) cardClass += ' am-event-pending';
  else if (isAutoSent) cardClass += ' am-event-auto';
  else if (isManual) cardClass += ' am-event-manual';
  else if (isUserInput) cardClass += ' am-event-user';
  else if (isStream) cardClass += ' am-event-stream';
  else if (sent) cardClass += ' am-event-dismissed';

  const inlineText =
    visibleText ||
    (event.kind !== 'stream' ? (event.reason?.trim() ?? '') : '') ||
    (deliveryNoteKey ? t(deliveryNoteKey) : '');

  return (
    <div className={cardClass}>
      <div
        className="am-event-row"
        onClick={() => setExpanded((v) => !v)}
        title={visibleText || event.reason || meta.text}
      >
        <span className="am-event-emoji">{meta.emoji}</span>
        <span className="am-event-kind">
          {meta.text}
          {event.source && (
            <span className="am-event-source" style={{ color }}>
              {' '}
              [{event.source}]
            </span>
          )}
          {event.rule && <span className="am-event-rule"> {event.rule}</span>}
        </span>
        <span className={`am-event-status-badge am-event-status-${statusMeta.tone}`}>{t(statusMeta.labelKey)}</span>
        <span className="am-event-inline-text">{inlineText}</span>
        <span className="am-event-time">{new Date(event.at).toLocaleTimeString()}</span>
        <span className="am-event-expand">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* ── pending 전송 UI ── */}
      {isPending && (
        <div className="am-pending-section">
          {sent ? (
            <div className="am-pending-sent">{t('monitor.pendingSent')}</div>
          ) : (
            <>
              <div className="am-pending-summary">
                <strong>{t('monitor.kindPending')}</strong>
                <span>
                  {optionCount > 0
                    ? t('monitor.pendingChoiceSummary', { count: String(optionCount) })
                    : t('monitor.pendingSuggestedHint')}
                </span>
              </div>
              {event.suggestedInput && (
                <div className="am-pending-row">
                  <span className="am-pending-label">{t('monitor.pendingSuggestedLabel')}</span>
                  <button
                    className="am-btn am-btn-suggest"
                    onClick={() => doSend(event.suggestedInput!)}
                    title={t('monitor.pendingSendTitle', { input: event.suggestedInput })}
                  >
                    <code>{formatInput(event.suggestedInput)}</code>
                    <span> ↵</span>
                  </button>
                </div>
              )}
              {event.options && event.options.length > 0 && (
                <div className="am-options">
                  <span className="am-options-label">{t('monitor.optionsLabel')}</span>
                  <div className="am-options-buttons">
                    {event.options.map((opt: AutomationOption) => {
                      const optionDisplay = splitAutomationOptionLabel(opt.label);
                      return (
                        <button
                          key={`${opt.input}-${opt.label}`}
                          className="am-btn am-btn-option"
                          onClick={() => doSend(opt.input)}
                          title={t('monitor.optionSendTitle', { input: formatInput(opt.input) })}
                          aria-label={t('monitor.optionSendTitle', { input: formatInput(opt.input) })}
                        >
                          <span className="am-option-number">{optionDisplay.number}</span>
                          <span className="am-option-text">{optionDisplay.text}</span>
                          <code className="am-option-input">{formatInput(opt.input)}</code>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 확장 상세 + Raw 데이터 ── */}
      {expanded && (
        <div className="am-event-details">
          {event.input && (
            <div className="am-event-detail">
              <span className="am-event-detail-label">{t('monitor.eventDetailSentLabel')}</span>
              <code className="am-event-input">{JSON.stringify(event.input)}</code>
            </div>
          )}
          {event.streamText && (
            <div className="am-event-detail am-event-detail-col">
              <span className="am-event-detail-label">{t('monitor.eventDetailStreamLabel')}</span>
              <pre className="am-event-stream-text">{event.streamText}</pre>
            </div>
          )}
          {event.state && (
            <div className="am-event-detail">
              <span className="am-event-detail-label">{t('monitor.eventDetailRuleLabel')}</span>
              <code>{event.state}</code>
            </div>
          )}
          {/* Raw JSON */}
          <RawDataView event={event} />
        </div>
      )}
    </div>
  );
}

function RawDataView({ event }: { event: AutomationEvent }) {
  const { t } = useI18n();
  const [showRaw, setShowRaw] = useState(false);
  const rawJson = JSON.stringify(event, null, 2);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(rawJson).catch(() => {});
  }, [rawJson]);

  return (
    <div className="am-raw">
      <div className="am-raw-header">
        <button className="am-raw-toggle" onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? t('monitor.showRaw') : t('monitor.hideRaw')}
        </button>
        {showRaw && (
          <button className="am-raw-copy" onClick={handleCopy} title={t('monitor.copyToClipboard')}>
            {t('monitor.copyBtn')}
          </button>
        )}
      </div>
      {showRaw && <pre className="am-raw-pre">{rawJson}</pre>}
    </div>
  );
}

function formatInput(input: string): string {
  return input.replace(/\x1b/g, 'Esc').replace(/\r\n/g, '⏎').replace(/\r/g, '⏎').replace(/\n/g, '⏎');
}

function streamFilterProfileLabel(
  profile: AutomationStreamFilterProfile,
  t: (key: string, vars?: Record<string, string>) => string,
): string {
  if (profile === 'auto') return t('automation.streamFilterAuto');
  if (profile === 'none') return t('automation.streamFilterNone');
  if (profile === 'codex') return t('automation.streamFilterCodex');
  if (profile === 'claude') return t('automation.streamFilterClaude');
  if (profile === 'gemini') return t('automation.streamFilterGemini');
  if (profile === 'aider') return t('automation.streamFilterAider');
  return t('automation.streamFilterWindsurf');
}

function eventVisibleText(event: AutomationEvent): string {
  if (event.streamText?.trim()) return event.streamText.trim();
  if (event.input) return formatInput(event.input);
  if (event.kind === 'pending' && event.suggestedInput) return formatInput(event.suggestedInput);
  if (event.kind === 'blocked' || event.kind === 'llm_error') return event.reason?.trim() ?? '';
  return '';
}

function eventStatusMeta(event: AutomationEvent, sent: boolean) {
  if (event.kind === 'stream') {
    return event.streamText?.trim()
      ? { tone: 'relayed', labelKey: 'monitor.eventStatusRelayed' }
      : { tone: 'skipped', labelKey: 'monitor.eventStatusSkipped' };
  }
  if (event.kind === 'user_input') {
    return { tone: 'observed', labelKey: 'monitor.eventStatusObserved' };
  }
  if (event.kind === 'pending') {
    return sent
      ? { tone: 'sent', labelKey: 'monitor.eventStatusSent' }
      : { tone: 'pending', labelKey: 'monitor.eventStatusPending' };
  }
  if (event.kind === 'manual_sent' || event.kind === 'auto_input') {
    return { tone: 'sent', labelKey: 'monitor.eventStatusSent' };
  }
  if (event.kind === 'blocked') return { tone: 'blocked', labelKey: 'monitor.eventStatusBlocked' };
  if (event.kind === 'llm_error') return { tone: 'error', labelKey: 'monitor.eventStatusError' };
  return { tone: 'info', labelKey: 'monitor.eventStatusInfo' };
}

function eventDeliveryNoteKey(event: AutomationEvent, sent: boolean): string {
  if (event.kind === 'stream' && !event.streamText?.trim()) return 'monitor.eventStreamSkippedNote';
  if (event.kind === 'pending' && sent) return 'monitor.eventPendingSentNote';
  return '';
}

function splitAutomationOptionLabel(label: string): { number: string; text: string } {
  const match = /^(\d+)\.\s*(.+)$/.exec(label.trim());
  if (!match) return { number: '-', text: label };
  return { number: match[1], text: match[2] };
}

// ── 메인 패널 ─────────────────────────────────────────────────────────────────

export default function AutomationMonitorPane({ termId, termLabel }: AutomationMonitorPaneProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const dismissedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const api = getApi();
    if (!api) return;

    // PTY spawn이 requestAnimationFrame 안에서 비동기이므로,
    // 패널이 열릴 때 컨트롤러가 아직 생성 안 됐을 수 있음 → retry
    let cancelled = false;
    let retryCount = 0;
    const MAX_RETRIES = 20; // 최대 10초 대기

    const tryGetStatus = async () => {
      if (cancelled) return;
      try {
        const s = await api.getStatus(termId);
        if (s) {
          setStatus(s);
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

    api
      .getEvents(termId)
      .then((evs) => setEvents(evs))
      .catch(() => undefined);
    const unsubStatus = api.onStatus(termId, setStatus);
    const unsubEvent = api.onEvent(termId, (e) => {
      setEvents((prev) => {
        const next = [...prev, e];
        return next.length > 200 ? next.slice(-200) : next;
      });
    });
    return () => {
      cancelled = true;
      unsubStatus();
      unsubEvent();
    };
  }, [termId]);

  useEffect(() => {
    if (autoScroll && eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  const handleToggle = useCallback(() => {
    const api = getApi();
    if (!api) return;
    const nextEnabled = !(status?.enabled ?? false);
    // 낙관적 업데이트
    setStatus((prev) => {
      if (!prev) {
        return {
          termId,
          enabled: nextEnabled,
          mode: 'stream',
          stage: 1,
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
  }, [termId, status]);

  const handleStageChange = useCallback(
    (s: AutomationStage) => {
      getApi()?.setStage(termId, s);
    },
    [termId],
  );

  const handleStreamFilterProfileChange = useCallback(
    (nextProfile: StreamFilterSelection) => {
      getApi()?.setStreamFilterProfile(termId, nextProfile);
      setStatus((prev) => {
        if (!prev) return prev;
        const nextOverride = nextProfile === 'default' ? undefined : nextProfile;
        return {
          ...prev,
          streamFilterProfileOverride: nextOverride,
          streamFilterProfile: nextOverride ?? prev.defaultStreamFilterProfile,
        };
      });
    },
    [termId],
  );

  const handleClear = useCallback(() => {
    getApi()?.clearEvents(termId);
    setEvents([]);
    dismissedRef.current.clear();
  }, [termId]);

  const handleDismiss = useCallback((id: string) => {
    dismissedRef.current.add(id);
  }, []);

  const pendingCount = events.filter(
    (e) => e.kind === 'pending' && !e.dismissed && !dismissedRef.current.has(e.id),
  ).length;
  const activeMode: AutomationMode = status?.mode ?? ((status?.autoSend ?? false) ? 'respond' : 'watch');

  return (
    <div className="am-root">
      {/* ── 타이틀 바 ── */}
      <div className="am-topbar">
        <span className="am-topbar-title">
          {t('monitor.topbarTitle')}
          {termLabel && <span className="am-topbar-term"> — {termLabel}</span>}
        </span>
        <div className="am-topbar-actions">
          {pendingCount > 0 && (
            <span className="am-topbar-pending">⏸ {t('monitor.pendingCount', { count: String(pendingCount) })}</span>
          )}
          <label className="am-autoscroll-label">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            {t('monitor.autoScreenCapture')}
          </label>
          <button className="am-btn am-btn-clear" onClick={handleClear}>
            {t('monitor.clearAll')}
          </button>
        </div>
      </div>

      {/* ── 대형 상태 표시기 ── */}
      <StatusIndicator
        status={status}
        onToggle={handleToggle}
        onStageChange={handleStageChange}
        onStreamFilterProfileChange={handleStreamFilterProfileChange}
      />

      {/* ── 수동 명령 입력 ── */}
      <div className="am-section-label">{t('monitor.manualInputSection')}</div>
      <ManualInputBar termId={termId} />

      {/* ── 이벤트 기록 ── */}
      <div className="am-events-header">
        <span className="am-section-label am-section-label-inline">{t('monitor.eventsSection')}</span>
        <span className="am-event-count">{t('monitor.eventsCount', { count: String(events.length) })}</span>
      </div>

      <div className="am-events">
        {events.length === 0 ? (
          <div className="am-empty">
            <div className="am-empty-icon">📋</div>
            {status?.enabled ? (
              <>
                <div className="am-empty-active">
                  {activeMode === 'stream' ? t('monitor.emptyStreaming') : t('monitor.emptyActive')}
                </div>
                <div className="am-empty-hint">
                  {activeMode === 'stream'
                    ? t('monitor.emptyStreamHint')
                    : activeMode === 'respond'
                      ? t('monitor.emptyAutoSendOn')
                      : t('monitor.emptyAutoSendOff')}
                </div>
              </>
            ) : (
              <>
                <div>{t('monitor.emptyNoEvents')}</div>
                <div className="am-empty-hint">{t('monitor.emptyStartHint')}</div>
              </>
            )}
          </div>
        ) : (
          events.map((ev) => <EventCard key={ev.id} event={ev} termId={termId} onDismiss={handleDismiss} />)
        )}
        <div ref={eventsEndRef} />
      </div>

      <style>{STYLES}</style>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────

const STYLES = `
.am-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-base, #0f172a);
  color: var(--text-primary, #e2e8f0);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  overflow: hidden;
}

/* ── 타이틀 바 ── */
.am-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border, #1e293b);
  background: var(--bg-surface, #1e293b);
  flex-shrink: 0;
  gap: 10px;
  flex-wrap: wrap;
}
.am-topbar-title {
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.am-topbar-term { color: #64748b; font-weight: 400; }
.am-topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.am-topbar-pending {
  padding: 2px 8px;
  border-radius: 9999px;
  background: #422006;
  color: #fbbf24;
  font-size: 11px;
  font-weight: 700;
  animation: am-pulse 2s infinite;
}
@keyframes am-pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.6; }
}
.am-autoscroll-label {
  display: flex; align-items: center; gap: 4px;
  color: #64748b; cursor: pointer; font-size: 12px; white-space: nowrap;
}
.am-event-count { color: #475569; font-size: 11px; }

/* ── 대형 상태 표시기 ── */
.am-si {
  flex-shrink: 0;
  border-bottom: 2px solid transparent;
  padding: 12px 14px;
  transition: background 0.2s, border-color 0.2s;
}
.am-si-state-idle {
  background: #111827;
  border-bottom-color: #1e293b;
}
.am-si-state-active {
  background: linear-gradient(135deg, #052e16 0%, #0a1a0f 100%);
  border-bottom-color: #166534;
}
.am-si-state-blocked {
  background: linear-gradient(135deg, #1c0a0a 0%, #0f172a 100%);
  border-bottom-color: #991b1b;
}

.am-si-main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.am-si-dot {
  font-size: 22px;
  flex-shrink: 0;
  line-height: 1;
}
.am-si-state-active .am-si-dot {
  color: #4ade80;
  animation: am-blink 2s infinite;
}
@keyframes am-blink {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.5; }
}
.am-si-state-idle .am-si-dot    { color: #334155; }
.am-si-state-blocked .am-si-dot { color: #ef4444; }

.am-si-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.am-si-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}
.am-si-state-idle .am-si-title    { color: #475569; }
.am-si-state-active .am-si-title  { color: #4ade80; }
.am-si-state-blocked .am-si-title { color: #ef4444; }

.am-si-desc {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.am-si-state-active .am-si-desc { color: #86efac; }

/* ── 토글 버튼 ── */
.am-si-btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: 1.5px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.am-si-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.am-si-btn:hover:not(:disabled) { opacity: 0.82; }
.am-si-btn-start   { background: #166534; color: #4ade80; border-color: #15803d; }
.am-si-btn-stop    { background: #7f1d1d; color: #fca5a5; border-color: #991b1b; }
.am-si-btn-unblock { background: #78350f; color: #fcd34d; border-color: #b45309; }

/* ── 서브 정보 ── */
.am-si-sub {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(74,222,128,0.15);
}
.am-si-sub-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.am-si-sub-label {
  font-size: 11px;
  color: #4b7c61;
  white-space: nowrap;
  min-width: 56px;
}
.am-si-stage-btns {
  display: flex; gap: 4px; flex-wrap: wrap;
}
.am-si-stage-btn {
  padding: 2px 10px;
  border-radius: 5px;
  border: 1px solid #1e3a2f;
  background: #0a1a0f;
  color: #4b7c61;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.am-si-stage-btn.is-active {
  background: #166534;
  color: #4ade80;
  border-color: #15803d;
}
.am-si-stage-btn:hover:not(.is-active) {
  background: #1e3a2f;
  color: #86efac;
}
.am-si-autosend-badge {
  padding: 2px 9px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
}
.am-si-autosend-badge.is-on  { background: #1e3a5f; color: #93c5fd; }
.am-si-autosend-badge.is-off { background: #422006; color: #fbbf24; }
.am-si-autosend-badge.is-stream { background: #164e63; color: #67e8f9; }
.am-si-autosend-badge.is-watch { background: #422006; color: #fbbf24; }
.am-si-autosend-badge.is-respond { background: #1e3a5f; color: #93c5fd; }
.am-si-autosend-hint {
  font-size: 10px;
  color: #4b7c61;
  font-style: italic;
}
.am-stream-filter-select {
  min-width: 160px;
  max-width: 240px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid #1e3a2f;
  background: #0a1a0f;
  color: #86efac;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  outline: none;
}
.am-stream-filter-select:focus {
  border-color: #15803d;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.16);
}
.am-si-llm-badge {
  font-size: 11px;
  color: #c084fc;
  font-weight: 600;
}
.am-si-blocked-hint {
  margin-top: 8px;
  font-size: 11px;
  color: #fca5a5;
  padding: 6px 10px;
  background: rgba(153,27,27,0.3);
  border-radius: 6px;
  line-height: 1.5;
}

/* ── 섹션 레이블 ── */
.am-section-label {
  display: block;
  padding: 5px 14px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #334155;
  background: #0a0f1c;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.am-events-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 14px;
  background: #0a0f1c;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.am-section-label-inline {
  display: inline;
  padding: 0;
  background: transparent;
  border: none;
}

/* ── 수동 입력 바 ── */
.am-manual-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border, #1e293b);
  background: var(--bg-base, #0f172a);
  flex-shrink: 0;
}
.am-manual-label {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  flex-shrink: 0;
}
.am-manual-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  padding: 4px 10px;
  font-size: 12px;
  font-family: 'Cascadia Mono', Consolas, monospace;
  outline: none;
  min-width: 0;
}
.am-manual-input:focus { border-color: #3b82f6; }
.am-manual-input::placeholder { color: #334155; }

/* ── 버튼 공통 ── */
.am-btn {
  padding: 4px 11px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.am-btn:disabled { opacity: 0.38; cursor: not-allowed; }
.am-btn:hover:not(:disabled) { opacity: 0.82; }
.am-btn-clear   { background: #1e293b; color: #94a3b8; border-color: #334155; }
.am-btn-send    { background: #1e3a5f; color: #93c5fd; border-color: #1d4ed8; }
.am-btn-suggest {
  background: #1c3a2a; color: #4ade80; border-color: #166534;
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; padding: 3px 10px;
}
.am-btn-option {
  background: #1e293b; color: #e2e8f0; border-color: #334155;
  padding: 6px 8px; font-size: 12px;
  display: grid;
  grid-template-columns: 28px minmax(160px, 1fr) auto;
  align-items: center;
  gap: 8px;
  text-align: left;
  min-width: min(420px, 100%);
  max-width: 100%;
}
.am-btn-option:hover:not(:disabled) {
  background: #1e3a5f; color: #93c5fd; border-color: #1d4ed8; opacity: 1;
}
.am-option-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #93c5fd;
  font-weight: 800;
}
.am-option-text {
  min-width: 0;
  color: #e2e8f0;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}
.am-option-input {
  justify-self: end;
  border: 1px solid #475569;
  border-radius: 9999px;
  background: #0f172a;
  color: #86efac;
  padding: 2px 8px;
  font-family: 'Cascadia Mono', Consolas, monospace;
  font-size: 11px;
  white-space: nowrap;
}

/* ── 이벤트 목록 ── */
.am-events {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* ── 빈 상태 ── */
.am-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #334155;
  padding: 30px 20px;
  text-align: center;
}
.am-empty-icon  { font-size: 32px; }
.am-empty-active { color: #4ade80; font-weight: 600; font-size: 14px; }
.am-empty-hint  { font-size: 11px; color: #4b7c61; margin-top: 2px; }

/* ── 이벤트 카드 ── */
.am-event-card {
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
  flex-shrink: 0;
  color: #cbd5e1;
}
.am-event-card.am-event-dismissed { opacity: 0.55; }
.am-event-row {
  display: grid;
  grid-template-columns: auto auto auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
  min-height: 25px;
  padding: 3px 7px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.55);
  background: rgba(15, 23, 42, 0.58);
  user-select: none;
  cursor: pointer;
}
.am-event-stream .am-event-row { background: rgba(19, 32, 52, 0.46); }
.am-event-user .am-event-row { background: rgba(30, 27, 75, 0.46); }
.am-event-manual .am-event-row { background: rgba(10, 15, 28, 0.72); }
.am-event-auto .am-event-row { background: rgba(10, 26, 15, 0.66); }
.am-event-pending .am-event-row { background: rgba(28, 20, 0, 0.78); }
.am-event-blocked .am-event-row { background: rgba(28, 10, 10, 0.84); }
.am-event-error .am-event-row { background: rgba(28, 16, 7, 0.82); }
.am-event-row:hover { background: rgba(30, 41, 59, 0.82); }
.am-event-emoji {
  font-size: 12px;
  line-height: 1;
  width: 14px;
  text-align: center;
}
.am-event-kind   { font-weight: 600; font-size: 12px; color: #cbd5e1; white-space: nowrap; }
.am-event-source { font-size: 10px; font-weight: 600; white-space: nowrap; }
.am-event-rule   {
  display: inline-block;
  font-size: 10px; color: #64748b; white-space: nowrap;
  max-width: 100px; overflow: hidden; text-overflow: ellipsis;
  vertical-align: bottom;
}
.am-event-status-badge {
  padding: 1px 7px;
  border-radius: 9999px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.5;
  white-space: nowrap;
}
.am-event-status-relayed { border-color: #0e7490; color: #67e8f9; background: rgba(8, 47, 73, 0.5); }
.am-event-status-observed { border-color: #4338ca; color: #c4b5fd; background: rgba(49, 46, 129, 0.42); }
.am-event-status-skipped { border-color: #475569; color: #94a3b8; background: rgba(15, 23, 42, 0.72); }
.am-event-status-pending { border-color: #b45309; color: #fcd34d; background: rgba(120, 53, 15, 0.45); }
.am-event-status-sent    { border-color: #166534; color: #86efac; background: rgba(20, 83, 45, 0.45); }
.am-event-status-blocked { border-color: #991b1b; color: #fca5a5; background: rgba(127, 29, 29, 0.45); }
.am-event-status-error   { border-color: #92400e; color: #fbbf24; background: rgba(120, 53, 15, 0.42); }
.am-event-status-info    { border-color: #334155; color: #94a3b8; background: rgba(15, 23, 42, 0.55); }
.am-event-inline-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #dbeafe;
  font-family: 'Consolas', 'Cascadia Mono', monospace;
  font-size: 11px;
}
.am-event-time   { font-size: 11px; color: #475569; white-space: nowrap; }
.am-event-expand { font-size: 10px; color: #475569; }

/* ── pending ── */
.am-pending-section {
  margin: 6px 0 7px 27px;
  display: flex; flex-direction: column; gap: 6px;
}
.am-pending-sent { font-size: 11px; color: #4ade80; }
.am-pending-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 7px 9px;
  border: 1px solid rgba(217, 119, 6, 0.36);
  border-radius: 6px;
  background: rgba(120, 53, 15, 0.2);
  color: #fcd34d;
  font-size: 11px;
  line-height: 1.45;
}
.am-pending-summary strong {
  color: #fde68a;
  white-space: nowrap;
}
.am-pending-row  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.am-pending-label { font-size: 11px; color: #64748b; white-space: nowrap; flex-shrink: 0; }
.am-options      { display: flex; flex-direction: column; gap: 4px; }
.am-options-label { font-size: 11px; color: #64748b; }
.am-options-buttons { display: flex; gap: 6px; flex-wrap: wrap; align-items: stretch; }

/* ── 확장 상세 ── */
.am-event-details {
  margin: 5px 0 7px 27px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.am-event-detail  { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; }
.am-event-detail-col { flex-direction: column; gap: 4px; }
.am-event-detail-label { color: #64748b; white-space: nowrap; flex-shrink: 0; }
.am-event-input {
  background: #0f172a; border: 1px solid #334155; border-radius: 4px;
  padding: 2px 6px;
  font-family: 'Consolas', 'Cascadia Mono', monospace;
  color: #a5f3fc; word-break: break-all;
}
.am-event-stream-text {
  margin: 0;
  width: 100%;
  max-height: 140px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 5px;
  padding: 6px 8px;
  color: #cbd5e1;
  font-family: 'Consolas', 'Cascadia Mono', monospace;
  font-size: 11px;
}

/* ── Raw 데이터 뷰 ── */
.am-raw { margin-top: 6px; border-top: 1px solid #1e293b; padding-top: 6px; }
.am-raw-header { display: flex; align-items: center; gap: 8px; }
.am-raw-toggle {
  background: transparent; border: none;
  color: #475569; font-size: 10px; cursor: pointer;
  padding: 2px 4px; border-radius: 4px;
}
.am-raw-toggle:hover { color: #94a3b8; background: #1e293b; }
.am-raw-copy {
  background: transparent; border: 1px solid #334155;
  color: #64748b; font-size: 10px; cursor: pointer;
  padding: 1px 6px; border-radius: 4px;
}
.am-raw-copy:hover { border-color: #475569; color: #94a3b8; }
.am-raw-pre {
  margin: 6px 0 0;
  padding: 8px 10px;
  background: #0a0f1c;
  border: 1px solid #1e293b;
  border-radius: 6px;
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 11px;
  color: #7dd3fc;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  line-height: 1.5;
}
`;
