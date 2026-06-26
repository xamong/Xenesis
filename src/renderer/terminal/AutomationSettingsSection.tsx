/**
 * AutomationSettingsSection — 자동화 전역 설정 편집 UI.
 * App.tsx 의 설정 패널(settings-panel) 안에 <section>으로 삽입된다.
 *
 * 구성:
 *  1. 기본 설정 (defaultMode, defaultStage)
 *  2. 전송 규칙 (Regex Rules) — CRUD
 *  3. 차단 패턴 (Danger Patterns) — 기본 패턴 + 추가 패턴
 *  4. LLM 설정 (apiKey, model)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AutomationMode,
  AutomationRegexRule,
  AutomationSettings,
  AutomationStage,
  AutomationStreamFilterProfile,
} from '../../shared/types';
import { useI18n } from '../i18n';

// 기본 내장 차단 패턴 (safety.ts와 동기화)
const BUILTIN_DANGER_PATTERNS = [
  'rm -rf',
  'rmdir /s',
  'format c:',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  '> /dev/sda',
  'chmod -R 777 /',
  'wget.*|.*sh',
  'curl.*|.*sh',
  'env_file',
  'OPENAI_API_KEY',
  'SECRET',
  'PASSWORD',
  'TOKEN',
  'PRIVATE_KEY',
];

interface AutomationSettingsSectionProps {
  /** 초기 설정값 */
  initial: AutomationSettings;
  /** 설정 저장 콜백 */
  onSave: (settings: AutomationSettings) => void;
}

// ─── 인라인 규칙 편집 폼 ──────────────────────────────────────────────────────

interface RuleFormState {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  response: string;
  cooldownMs: number;
  enabled: boolean;
}

const EMPTY_RULE = (): RuleFormState => ({
  id: crypto.randomUUID(),
  name: '',
  pattern: '',
  flags: 'i',
  response: '',
  cooldownMs: 2000,
  enabled: true,
});

function RuleForm({
  initial,
  onConfirm,
  onCancel,
}: {
  initial?: RuleFormState;
  onConfirm: (rule: AutomationRegexRule) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<RuleFormState>(initial ?? EMPTY_RULE());
  const [patternError, setPatternError] = useState('');

  const set = <K extends keyof RuleFormState>(k: K, v: RuleFormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleConfirm = () => {
    // 패턴 유효성 검사
    try {
      new RegExp(form.pattern, form.flags);
      setPatternError('');
    } catch (e) {
      setPatternError(String(e));
      return;
    }
    if (!form.name.trim()) {
      setPatternError(t('automation.nameRequired'));
      return;
    }
    if (!form.pattern.trim()) {
      setPatternError(t('automation.patternRequired'));
      return;
    }
    if (!form.response.trim()) {
      setPatternError(t('automation.responseRequired'));
      return;
    }
    onConfirm({ ...form });
  };

  return (
    <div className="as-rule-form">
      <div className="as-rule-form-row">
        <label className="as-rule-label">{t('automation.nameLabel')}</label>
        <input
          className="as-input"
          placeholder={t('automation.namePlaceholder')}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          autoFocus
        />
      </div>
      <div className="as-rule-form-row">
        <label className="as-rule-label">{t('automation.patternLabel')}</label>
        <div className="as-rule-pattern-row">
          <input
            className={`as-input as-input-mono${patternError ? ' as-input-err' : ''}`}
            placeholder="(yes|no)\?"
            value={form.pattern}
            onChange={(e) => {
              set('pattern', e.target.value);
              setPatternError('');
            }}
          />
          <input
            className="as-input as-input-flags"
            placeholder={t('automation.flagPlaceholder')}
            value={form.flags}
            onChange={(e) => set('flags', e.target.value)}
            maxLength={5}
            title={t('automation.flagTitle')}
          />
        </div>
        {patternError && <div className="as-rule-err">{patternError}</div>}
      </div>
      <div className="as-rule-form-row">
        <label className="as-rule-label">{t('automation.responseLabel')}</label>
        <input
          className="as-input as-input-mono"
          placeholder={t('automation.responsePlaceholder')}
          value={form.response}
          onChange={(e) => set('response', e.target.value)}
        />
        <span className="as-rule-hint">{'\\r = Enter  \\n = Newline  \\t = Tab'}</span>
      </div>
      <div className="as-rule-form-row">
        <label className="as-rule-label">{t('automation.cooldownLabel')}</label>
        <input
          className="as-input as-input-short"
          type="number"
          min={0}
          max={60000}
          step={500}
          value={form.cooldownMs}
          onChange={(e) => set('cooldownMs', Number(e.target.value))}
        />
        <span className="as-rule-hint">{t('automation.cooldownHint')}</span>
      </div>
      <div className="as-rule-form-row as-rule-form-row-check">
        <label className="as-toggle-label">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          {t('automation.ruleEnable')}
        </label>
      </div>
      <div className="as-rule-form-actions">
        <button className="as-btn as-btn-primary" onClick={handleConfirm}>
          {t('common.save')}
        </button>
        <button className="as-btn as-btn-ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function AutomationSettingsSection({ initial, onSave }: AutomationSettingsSectionProps) {
  const { t } = useI18n();

  const STAGE_LABELS: Record<AutomationStage, string> = {
    1: t('automation.stage1'),
    2: t('automation.stage2'),
    3: t('automation.stage3'),
  };

  const MODE_LABELS: Record<AutomationMode, string> = {
    stream: t('automation.modeStream'),
    watch: t('automation.modeWatch'),
    respond: t('automation.modeRespond'),
  };

  const STREAM_FILTER_LABELS: Record<AutomationStreamFilterProfile, string> = {
    auto: t('automation.streamFilterAuto'),
    none: t('automation.streamFilterNone'),
    codex: t('automation.streamFilterCodex'),
    claude: t('automation.streamFilterClaude'),
    gemini: t('automation.streamFilterGemini'),
    aider: t('automation.streamFilterAider'),
    windsurf: t('automation.streamFilterWindsurf'),
  };

  const [defaultMode, setDefaultMode] = useState<AutomationMode>(
    initial.defaultMode ?? (initial.autoSend ? 'respond' : 'watch'),
  );
  const [streamFilterProfile, setStreamFilterProfile] = useState<AutomationStreamFilterProfile>(
    initial.streamFilterProfile ?? 'auto',
  );
  const [defaultStage, setDefaultStage] = useState<AutomationStage>(initial.defaultStage);
  const [rules, setRules] = useState<AutomationRegexRule[]>(initial.regexRules ?? []);
  const [extraDanger, setExtraDanger] = useState<string[]>(initial.extraDangerPatterns ?? []);
  const [llmApiKey, setLlmApiKey] = useState(initial.llmApiKey ?? '');
  const [llmModel, setLlmModel] = useState(initial.llmModel ?? 'gpt-4.1-mini');

  // 새 위험 패턴 입력
  const [newDanger, setNewDanger] = useState('');

  // 규칙 편집 상태 (null=숨김, 'new'=새 규칙, id=편집 중)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const dangerControlsDisabled = defaultMode !== 'respond';

  // 변경 감지 → debounce 저장
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collect = useCallback(
    (): AutomationSettings => ({
      defaultMode,
      streamFilterProfile,
      autoSend: defaultMode === 'respond',
      defaultStage,
      regexRules: rules,
      extraDangerPatterns: extraDanger,
      llmApiKey,
      llmModel,
    }),
    [defaultMode, streamFilterProfile, defaultStage, rules, extraDanger, llmApiKey, llmModel],
  );

  // 설정 변경 시 debounce 저장
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(collect());
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMode, streamFilterProfile, defaultStage, rules, extraDanger, llmApiKey, llmModel]);

  // ── 규칙 CRUD ──────────────────────────────────────────────────────────────

  const handleAddRule = (rule: AutomationRegexRule) => {
    setRules((r) => [...r, rule]);
    setEditingRuleId(null);
  };

  const handleUpdateRule = (rule: AutomationRegexRule) => {
    setRules((r) => r.map((x) => (x.id === rule.id ? rule : x)));
    setEditingRuleId(null);
  };

  const handleDeleteRule = (id: string) => {
    setRules((r) => r.filter((x) => x.id !== id));
  };

  const handleToggleRule = (id: string) => {
    setRules((r) => r.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
  };

  // ── 위험 패턴 CRUD ─────────────────────────────────────────────────────────

  const handleAddDanger = () => {
    const p = newDanger.trim();
    if (!p || extraDanger.includes(p)) return;
    setExtraDanger((d) => [...d, p]);
    setNewDanger('');
  };

  const handleDeleteDanger = (p: string) => {
    setExtraDanger((d) => d.filter((x) => x !== p));
  };

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="as-root">
      {/* ── 1. 기본 설정 ─────────────────────────────────────── */}
      <section className="settings-section">
        <h3 className="settings-section-title">{t('automation.basicTitle')}</h3>

        {/* defaultMode */}
        <div className="as-field-row as-field-row-col">
          <span className="as-field-label">{t('automation.defaultModeLabel')}</span>
          <div className="as-stage-btns">
            {(['stream', 'watch', 'respond'] as AutomationMode[]).map((mode) => (
              <button
                key={mode}
                className={`as-stage-btn${defaultMode === mode ? ' is-active' : ''}`}
                onClick={() => setDefaultMode(mode)}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
          <span className="as-field-hint">{t('automation.modeHint')}</span>
        </div>

        {/* streamFilterProfile */}
        <div className="as-field-row as-field-row-col">
          <span className="as-field-label">{t('automation.streamFilterLabel')}</span>
          <div className="as-stage-btns">
            {(
              ['auto', 'none', 'codex', 'claude', 'gemini', 'aider', 'windsurf'] as AutomationStreamFilterProfile[]
            ).map((profile) => (
              <button
                key={profile}
                className={`as-stage-btn${streamFilterProfile === profile ? ' is-active' : ''}`}
                onClick={() => setStreamFilterProfile(profile)}
              >
                {STREAM_FILTER_LABELS[profile]}
              </button>
            ))}
          </div>
          <span className="as-field-hint">{t('automation.streamFilterHint')}</span>
        </div>

        {/* defaultStage */}
        <div className="as-field-row as-field-row-col">
          <span className="as-field-label">{t('automation.defaultStageLabel')}</span>
          <div className="as-stage-btns">
            {([1, 2, 3] as AutomationStage[]).map((s) => (
              <button
                key={s}
                className={`as-stage-btn${defaultStage === s ? ' is-active' : ''}`}
                onClick={() => setDefaultStage(s)}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
          <span className="as-field-hint">{t('automation.stageHint')}</span>
        </div>
      </section>

      {/* ── 2. 전송 규칙 (Regex) ─────────────────────────────── */}
      <section className="settings-section">
        <div className="as-section-header">
          <h3 className="settings-section-title">{t('automation.rulesTitle')}</h3>
          {editingRuleId !== 'new' && (
            <button className="as-btn as-btn-sm as-btn-primary" onClick={() => setEditingRuleId('new')}>
              {t('automation.addRule')}
            </button>
          )}
        </div>
        <p className="as-section-desc">{t('automation.rulesDesc')}</p>

        {editingRuleId === 'new' && <RuleForm onConfirm={handleAddRule} onCancel={() => setEditingRuleId(null)} />}

        {rules.length === 0 && editingRuleId !== 'new' ? (
          <div className="as-empty">
            {t('automation.rulesEmpty')} <strong>{t('automation.addRule')}</strong>
            {t('automation.rulesEmptyHint')}
          </div>
        ) : (
          <div className="as-rule-list">
            {rules.map((rule) => (
              <div key={rule.id} className={`as-rule-item${!rule.enabled ? ' is-disabled' : ''}`}>
                {editingRuleId === rule.id ? (
                  <RuleForm
                    initial={rule as RuleFormState}
                    onConfirm={handleUpdateRule}
                    onCancel={() => setEditingRuleId(null)}
                  />
                ) : (
                  <>
                    <div className="as-rule-meta">
                      <label className="as-toggle-label">
                        <input type="checkbox" checked={rule.enabled} onChange={() => handleToggleRule(rule.id)} />
                      </label>
                      <div className="as-rule-info">
                        <span className="as-rule-name">{rule.name}</span>
                        <code className="as-rule-pattern">
                          /{rule.pattern}/{rule.flags}
                          {' → '}
                          <span className="as-rule-response">{JSON.stringify(rule.response)}</span>
                        </code>
                        <span className="as-rule-cool">
                          {t('automation.cooldownMs', { ms: String(rule.cooldownMs) })}
                        </span>
                      </div>
                      <div className="as-rule-actions">
                        <button
                          className="as-btn as-btn-xs as-btn-ghost"
                          onClick={() => setEditingRuleId(rule.id)}
                          title={t('common.edit')}
                        >
                          ✎
                        </button>
                        <button
                          className="as-btn as-btn-xs as-btn-danger"
                          onClick={() => handleDeleteRule(rule.id)}
                          title={t('common.delete')}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 3. 차단 패턴 ─────────────────────────────────────── */}
      <section className={`settings-section${dangerControlsDisabled ? ' as-section-disabled' : ''}`}>
        <h3 className="settings-section-title">{t('automation.dangerTitle')}</h3>
        <p className="as-section-desc">{t('automation.dangerDesc')}</p>

        {/* 기본 내장 패턴 */}
        <div className="as-danger-group">
          <span className="as-danger-group-label">{t('automation.dangerBuiltinLabel')}</span>
          <div className="as-danger-chips">
            {BUILTIN_DANGER_PATTERNS.map((p) => (
              <span key={p} className="as-chip as-chip-builtin">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* 추가 패턴 */}
        <div className="as-danger-group">
          <span className="as-danger-group-label">{t('automation.dangerExtraLabel')}</span>
          <div className="as-danger-add-row">
            <input
              className="as-input as-input-mono"
              placeholder={t('automation.dangerAddPlaceholder')}
              value={newDanger}
              disabled={dangerControlsDisabled}
              onChange={(e) => setNewDanger(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddDanger();
              }}
            />
            <button
              className="as-btn as-btn-sm as-btn-primary"
              onClick={handleAddDanger}
              disabled={dangerControlsDisabled || !newDanger.trim()}
            >
              {t('common.add')}
            </button>
          </div>
          {extraDanger.length === 0 ? (
            <div className="as-empty">{t('automation.dangerEmpty')}</div>
          ) : (
            <div className="as-danger-chips">
              {extraDanger.map((p) => (
                <span key={p} className="as-chip as-chip-custom">
                  {p}
                  <button
                    className="as-chip-del"
                    onClick={() => handleDeleteDanger(p)}
                    disabled={dangerControlsDisabled}
                    title={t('common.delete')}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. LLM 설정 ──────────────────────────────────────── */}
      <section className="settings-section">
        <h3 className="settings-section-title">{t('automation.llmTitle')}</h3>
        <p className="as-section-desc">{t('automation.llmDesc')}</p>
        <div className="as-field-row as-field-row-col">
          <label className="as-field-label">{t('automation.llmApiKeyLabel')}</label>
          <input
            className="as-input as-input-mono"
            type="password"
            placeholder={t('automation.llmApiKeyPlaceholder')}
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
          />
        </div>
        <div className="as-field-row as-field-row-col">
          <label className="as-field-label">{t('automation.llmModelLabel')}</label>
          <input
            className="as-input"
            placeholder="gpt-4.1-mini"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
          />
        </div>
      </section>

      <style>{AS_STYLES}</style>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const AS_STYLES = `
.as-root {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── 섹션 헤더 ── */
.as-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.as-section-header .settings-section-title {
  margin-bottom: 0;
}
.as-section-desc {
  font-size: 12px;
  color: var(--text-mute, #64748b);
  margin: 0 0 12px 0;
  line-height: 1.5;
}
.as-section-disabled .as-danger-add-row,
.as-section-disabled .as-chip-custom {
  opacity: 0.58;
}

/* ── 필드 행 ── */
.as-field-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.as-field-row-col {
  flex-direction: column;
  align-items: flex-start;
}
.as-field-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.as-field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
}
.as-field-hint {
  font-size: 11px;
  color: var(--text-mute, #64748b);
}

/* ── 토글 스위치 ── */
.as-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.as-switch input { display: none; }
.as-switch-track {
  width: 38px; height: 20px;
  border-radius: 10px;
  background: #334155;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.as-switch-track::after {
  content: '';
  position: absolute;
  top: 3px; left: 3px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #94a3b8;
  transition: transform 0.2s, background 0.2s;
}
.as-switch.is-on .as-switch-track { background: #166534; }
.as-switch.is-on .as-switch-track::after {
  transform: translateX(18px);
  background: #4ade80;
}
.as-switch-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-mute, #64748b);
  min-width: 28px;
}
.as-switch.is-on .as-switch-label { color: #4ade80; }

/* ── Stage 버튼 ── */
.as-stage-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 6px 0;
}
.as-stage-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1.5px solid #334155;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.as-stage-btn:hover { border-color: #475569; color: #94a3b8; }
.as-stage-btn.is-active {
  border-color: #2563eb;
  background: rgba(37,99,235,0.15);
  color: #93c5fd;
}

/* ── 인풋 ── */
.as-input {
  width: 100%;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1.5px solid #334155;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 13px;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.as-input:focus { outline: none; border-color: #2563eb; }
.as-input-mono { font-family: "Cascadia Code", Consolas, monospace; }
.as-input-err { border-color: #ef4444; }
.as-input-short { width: 120px; }
.as-input-flags { width: 70px; flex-shrink: 0; }

/* ── 버튼 ── */
.as-btn {
  padding: 5px 14px;
  border-radius: 6px;
  border: 1.5px solid transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: opacity 0.15s;
}
.as-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.as-btn:hover:not(:disabled) { opacity: 0.82; }
.as-btn-primary { background: #1e40af; color: #bfdbfe; border-color: #2563eb; }
.as-btn-ghost   { background: transparent; color: #94a3b8; border-color: #334155; }
.as-btn-danger  { background: transparent; color: #ef4444; border-color: #ef4444; }
.as-btn-sm  { padding: 4px 10px; font-size: 12px; }
.as-btn-xs  { padding: 2px 7px; font-size: 11px; }

/* ── 규칙 목록 ── */
.as-rule-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.as-rule-item {
  border-radius: 8px;
  border: 1.5px solid #1e293b;
  background: #0f172a;
  overflow: hidden;
}
.as-rule-item.is-disabled { opacity: 0.45; }
.as-rule-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
}
.as-rule-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.as-rule-name {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}
.as-rule-pattern {
  font-size: 11px;
  color: #4ade80;
  font-family: "Cascadia Code", Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.as-rule-response { color: #fcd34d; }
.as-rule-cool {
  font-size: 10px;
  color: #64748b;
}
.as-rule-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* ── 규칙 편집 폼 ── */
.as-rule-form {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #0f172a;
  border-radius: 8px;
  border: 1.5px solid #2563eb;
}
.as-rule-form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.as-rule-form-row-check { flex-direction: row; align-items: center; }
.as-rule-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.as-rule-pattern-row {
  display: flex;
  gap: 6px;
}
.as-rule-hint {
  font-size: 10px;
  color: #475569;
  font-family: "Cascadia Code", Consolas, monospace;
}
.as-rule-err {
  font-size: 11px;
  color: #ef4444;
}
.as-rule-form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ── 토글 라벨 ── */
.as-toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #94a3b8;
}

/* ── 위험 패턴 ── */
.as-danger-group {
  margin-bottom: 14px;
}
.as-danger-group-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.as-danger-add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.as-danger-add-row .as-input { flex: 1; }
.as-danger-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.as-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-family: "Cascadia Code", Consolas, monospace;
}
.as-chip-builtin {
  background: rgba(239,68,68,0.12);
  color: #fca5a5;
  border: 1px solid rgba(239,68,68,0.25);
}
.as-chip-custom {
  background: rgba(251,146,60,0.12);
  color: #fcd34d;
  border: 1px solid rgba(251,146,60,0.35);
}
.as-chip-del {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0 2px;
  font-size: 10px;
  line-height: 1;
  opacity: 0.7;
}
.as-chip-del:hover { opacity: 1; }
.as-chip-del:disabled { cursor: not-allowed; opacity: 0.35; }

/* ── 빈 상태 ── */
.as-empty {
  padding: 12px;
  color: #475569;
  font-size: 12px;
  background: #0f172a;
  border-radius: 6px;
  border: 1px dashed #1e293b;
}
`;
