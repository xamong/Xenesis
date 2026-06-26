import { randomUUID } from 'node:crypto';
import type {
  AutomationEvent,
  AutomationEventKind,
  AutomationMode,
  AutomationRegexRule,
  AutomationSettings,
  AutomationStage,
  AutomationStatus,
  AutomationStreamFilterProfile,
} from '../../shared/types';
import { type AutomationEventLogSink, automationLogTextAndHex } from './automationEventLog';
import { parseAutomationOptions } from './automationOptionParser';
import { LlmEngine } from './llmEngine';
import { OutputBuffer } from './outputBuffer';
import { RegexEngine } from './regexEngine';
import { detectDanger } from './safety';
import { StateMachineEngine } from './stateMachineEngine';
import {
  type AutomationStreamFilterContext,
  extractAutomationStreamUserInputEcho,
  filterAutomationStreamText,
  isAutomationStreamInternalText,
  isAutomationStreamNarrativeBoundary,
  isAutomationStreamToolOutputContinuation,
  normalizeAutomationStreamText,
  resolveAutomationStreamFilterProfile,
  startsAutomationStreamEditBlockContext,
  startsAutomationStreamToolOutputContext,
} from './streamFilter';

/** 세션당 이벤트 최대 보관 수 */
const MAX_EVENTS = 200;
const MAX_STREAM_BUFFER_CHARS = 4096;
const STREAM_FRAGMENT_FLUSH_CHARS = 240;
const STREAM_PROMPT_FRAGMENT_RE =
  /\?|(\b(?:would you like|continue|proceed|confirm|approve|press enter|hit enter|select|choose|pick)\b)|(\[(?:y\/n|yes\/no)\])/i;
const MAX_RECENT_STREAM_EVENT_KEYS = 120;
const MAX_RECENT_MANUAL_INPUT_KEYS = 24;
const RECENT_STREAM_DEDUP_MS = 5 * 60 * 1000;
const RECENT_MANUAL_ECHO_MS = 30 * 1000;
const MANUAL_INPUT_PART_DELAY_MS = 12;
const MANUAL_SUBMIT_DELAY_MS = 120;
const STREAM_TOOL_OUTPUT_CONTINUATION_BUDGET = 12;
const STREAM_EDIT_BLOCK_CONTINUATION_BUDGET = 160;

interface RecentTextKey {
  key: string;
  at: number;
}

interface QueuedTerminalInput {
  input: string;
  textPhase: string;
  submitPhase: string;
}

interface TerminalInputPart {
  data: string;
  phase: string;
  delayBeforeMs: number;
}

export interface AutomationControllerOptions {
  termId: string;
  stage: AutomationStage;
  /** PTY에 데이터를 쓰는 함수 */
  write: (data: string) => void;
  /** 상태 변경 시 렌더러에 push하는 함수 */
  notifyStatus: (status: AutomationStatus) => void;
  /** 이벤트 발생 시 렌더러에 push하는 함수 */
  notifyEvent: (event: AutomationEvent) => void;
  /** 이벤트를 observability producer로 전달하는 선택적 hook */
  observeEvent?: (event: AutomationEvent) => void;
  /** 자동화 설정 (규칙, LLM 설정 등) */
  settings: AutomationSettings;
  /** aiProvider 공유 API 키 (llmApiKey 미설정 시 fallback) */
  fallbackApiKey: string;
  /** Stream 모드에서 CLI 자동 감지에 사용할 터미널별 실행 맥락 */
  getStreamContext?: () => AutomationStreamFilterContext;
  /** 자동화 시작 이후 이벤트 감시/터미널 write 진단 로그 */
  eventLog?: AutomationEventLogSink;
}

export class AutomationController {
  readonly termId: string;
  private write: (data: string) => void;
  private notifyStatus: (status: AutomationStatus) => void;
  private notifyEvent: (event: AutomationEvent) => void;
  private observeEvent?: (event: AutomationEvent) => void;

  private settings: AutomationSettings;
  private fallbackApiKey: string;
  private getStreamContext?: () => AutomationStreamFilterContext;
  private eventLog?: AutomationEventLogSink;
  private streamFilterProfileOverride: AutomationStreamFilterProfile | undefined;
  private detectedStreamFilterProfile: AutomationStreamFilterProfile | undefined;

  private buffer = new OutputBuffer();
  private streamTextBuffer = '';
  private observedTerminalInputLine = '';
  private recentStreamEventKeys: RecentTextKey[] = [];
  private recentManualInputKeys: RecentTextKey[] = [];
  private streamToolOutputContinuationBudget = 0;
  private streamEditBlockContinuationBudget = 0;
  private terminalInputQueue: QueuedTerminalInput[] = [];
  private terminalInputQueueRunning = false;
  private regex = new RegexEngine();
  private stateMachine = new StateMachineEngine();
  private llm: LlmEngine;

  private enabled = false;
  private stage: AutomationStage;
  private blocked = false;
  private blockReason: string | undefined;
  private busy = false;

  private events: AutomationEvent[] = [];

  constructor(options: AutomationControllerOptions) {
    this.termId = options.termId;
    this.write = options.write;
    this.notifyStatus = options.notifyStatus;
    this.notifyEvent = options.notifyEvent;
    this.observeEvent = options.observeEvent;
    this.settings = options.settings;
    this.fallbackApiKey = options.fallbackApiKey;
    this.getStreamContext = options.getStreamContext;
    this.eventLog = options.eventLog;
    this.stage = options.stage;
    this.llm = this.buildLlm();
  }

  // ── 공개 제어 API ────────────────────────────────────────────────────────────

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (value) {
      this.blocked = false;
      this.blockReason = undefined;
      this.regex.reset();
      this.stateMachine.reset();
      this.buffer.clear();
      this.streamTextBuffer = '';
      this.observedTerminalInputLine = '';
      this.recentStreamEventKeys = [];
      this.recentManualInputKeys = [];
      this.streamToolOutputContinuationBudget = 0;
      this.streamEditBlockContinuationBudget = 0;
      this.eventLog?.start(
        this.termId,
        this.getStatus(),
        this.getStreamContext?.() as Record<string, unknown> | undefined,
      );
    }
    this.pushStatus('status_change');
    if (!value) {
      this.eventLog?.stop(this.termId, this.getStatus());
    }
  }

  setStage(stage: AutomationStage): void {
    this.stage = stage;
    this.pushStatus('status_change');
  }

  setStreamFilterProfile(profile: AutomationStreamFilterProfile | undefined): void {
    if (this.streamFilterProfileOverride === profile) return;
    this.streamFilterProfileOverride = profile;
    this.resetStreamFilterState();
    this.pushStatus('status_change');
  }

  updateSettings(settings: AutomationSettings, fallbackApiKey: string): void {
    const previousProfile = this.activeStreamFilterProfile;
    if (
      settings.defaultMode !== this.settings.defaultMode ||
      (!this.streamFilterProfileOverride && settings.streamFilterProfile !== this.settings.streamFilterProfile)
    ) {
      this.resetStreamFilterState();
    }
    this.settings = settings;
    this.fallbackApiKey = fallbackApiKey;
    this.llm = this.buildLlm();
    if (previousProfile !== this.activeStreamFilterProfile) {
      this.resetStreamFilterState();
    }
    this.pushStatus('status_change');
  }

  getStatus(): AutomationStatus {
    const mode = this.mode;
    return {
      termId: this.termId,
      enabled: this.enabled,
      mode,
      stage: this.stage,
      defaultStreamFilterProfile: this.defaultStreamFilterProfile,
      streamFilterProfile: this.activeStreamFilterProfile,
      streamFilterProfileOverride: this.streamFilterProfileOverride,
      llmReady: this.llm.enabled,
      blocked: this.blocked,
      blockReason: this.blockReason,
      autoSend: mode === 'respond',
    };
  }

  getEvents(): AutomationEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  recordTerminalInput(data: string): void {
    const normalized = normalizeAutomationStreamText(data);
    for (const char of normalized) {
      if (char === '\n') {
        this.rememberManualInput(this.observedTerminalInputLine);
        this.observedTerminalInputLine = '';
        continue;
      }
      if (char === '\u0003' || char === '\u0015') {
        this.observedTerminalInputLine = '';
        continue;
      }
      if (char === '\b' || char === '\u007f') {
        this.observedTerminalInputLine = this.observedTerminalInputLine.slice(0, -1);
        this.rememberManualInput(this.observedTerminalInputLine);
        continue;
      }
      if (char < ' ') continue;
      this.observedTerminalInputLine = `${this.observedTerminalInputLine}${char}`.slice(-1000);
      this.rememberManualInput(char);
      this.rememberManualInput(this.observedTerminalInputLine);
    }
  }

  /**
   * 수동 명령 전송 (autoSend=false일 때도 허용).
   * pendingEventId 를 전달하면 해당 pending 이벤트를 dismissed=true 로 표시.
   */
  manualSend(input: string, pendingEventId?: string): void {
    if (!input) return;
    try {
      this.writeManualInput(input);
      this.rememberManualInput(input);
    } catch {
      // PTY 종료 후 무시
    }
    // pending 이벤트 처리 완료 표시
    if (pendingEventId) {
      const ev = this.events.find((e) => e.id === pendingEventId);
      if (ev) ev.dismissed = true;
    }
    // manual_sent 이벤트 기록
    this.addEvent('manual_sent', {
      input,
      reason: pendingEventId ? `수동 전송 (pending #${pendingEventId.slice(0, 8)})` : '수동 전송',
    });
  }

  private writeManualInput(input: string): void {
    this.enqueueTerminalInput(input, 'manual_text', 'manual_submit');
  }

  private enqueueTerminalInput(input: string, textPhase: string, submitPhase: string): void {
    this.terminalInputQueue.push({ input, textPhase, submitPhase });
    if (!this.terminalInputQueueRunning) this.drainTerminalInputQueue();
  }

  private drainTerminalInputQueue(): void {
    const item = this.terminalInputQueue.shift();
    if (!item) {
      this.terminalInputQueueRunning = false;
      return;
    }

    this.terminalInputQueueRunning = true;
    const parts = this.buildTerminalInputParts(item);
    this.writeTerminalInputParts(parts, 0);
  }

  private writeTerminalInputParts(parts: TerminalInputPart[], index: number): void {
    const part = parts[index];
    if (!part) {
      this.drainTerminalInputQueue();
      return;
    }

    const writePart = () => {
      try {
        this.writeToTerminal(part.data, part.phase);
      } catch {
        // PTY 종료 후 무시
      } finally {
        this.writeTerminalInputParts(parts, index + 1);
      }
    };

    if (part.delayBeforeMs <= 0) {
      writePart();
      return;
    }

    const timer = setTimeout(writePart, part.delayBeforeMs);
    timer.unref?.();
  }

  private buildTerminalInputParts(item: QueuedTerminalInput): TerminalInputPart[] {
    const submit = splitTrailingSubmitKey(item.input, this.resolveManualSubmitKey());
    if (!submit) return buildTypedTerminalInputParts(item.input, item.textPhase, 0);

    return [
      ...buildTypedTerminalInputParts(submit.text, item.textPhase, 0),
      {
        data: submit.key,
        phase: item.submitPhase,
        delayBeforeMs: submit.text ? MANUAL_SUBMIT_DELAY_MS : 0,
      },
    ];
  }

  // ── PTY 출력 수신 ────────────────────────────────────────────────────────────

  async onOutput(chunk: string): Promise<void> {
    if (!this.enabled || this.blocked) return;
    const mode = this.mode;
    if (mode === 'stream') {
      this.emitStreamEvent(chunk);
      return;
    }

    const text = this.buffer.append(chunk);
    if (this.busy) return;

    if (mode === 'respond') {
      // 자동 응답 모드에서만 위험 패턴을 차단한다.
      const danger = detectDanger(text.slice(-3000), this.settings.extraDangerPatterns);
      if (danger) {
        this.enabled = false;
        this.blocked = true;
        this.blockReason = danger;
        this.addEvent('blocked', { reason: `Danger pattern detected: ${danger}` });
        this.pushStatus('blocked');
        return;
      }
    }

    this.busy = true;
    try {
      let decision: {
        source?: string;
        input?: string | null;
        rule?: string;
        reason?: string;
        state?: string;
        error?: boolean;
      } | null = null;

      if (this.stage === 1) {
        decision = this.regex.decide(text, this.userRules);
      } else if (this.stage === 2) {
        decision = this.stateMachine.decide(text) ?? this.regex.decide(text, this.userRules);
      } else if (this.stage === 3) {
        decision =
          (await this.llm.decide(text)) ?? this.stateMachine.decide(text) ?? this.regex.decide(text, this.userRules);
      }

      if (!decision) return;

      if (decision.input) {
        if (mode === 'respond') {
          // ── 자동 전송 모드 ────────────────────────────────────────────────
          this.enqueueTerminalInput(decision.input, 'auto_input', 'auto_submit');
          this.addEvent('auto_input', {
            source: decision.source as AutomationEvent['source'],
            rule: decision.rule,
            input: decision.input,
            reason: decision.reason,
            state: decision.state,
          });
        } else {
          // ── 수동 대기 모드: 절대 전송 안 함 ─────────────────────────────
          // 로그 + 옵션 버튼 제공
          const options = parseAutomationOptions(text);
          this.addEvent('pending', {
            source: decision.source as AutomationEvent['source'],
            rule: decision.rule,
            suggestedInput: decision.input,
            input: undefined, // autoSend=false 이므로 아직 전송 안 됨
            reason: `[autoSend OFF] 엔진 제안: ${decision.reason ?? decision.input}`,
            state: decision.state,
            options: options.length > 0 ? options : undefined,
          });
        }
      } else if (decision.error) {
        this.addEvent('llm_error', { reason: decision.reason, error: true });
      }
    } finally {
      this.busy = false;
    }
  }

  // ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

  private get userRules(): AutomationRegexRule[] {
    return this.settings.regexRules ?? [];
  }

  private get mode(): AutomationMode {
    const mode = this.settings.defaultMode;
    if (mode === 'stream' || mode === 'watch' || mode === 'respond') return mode;
    return this.settings.autoSend ? 'respond' : 'watch';
  }

  private get defaultStreamFilterProfile(): AutomationStreamFilterProfile {
    return this.settings.streamFilterProfile ?? 'auto';
  }

  private get activeStreamFilterProfile(): AutomationStreamFilterProfile {
    return this.streamFilterProfileOverride ?? this.defaultStreamFilterProfile;
  }

  private buildLlm(): LlmEngine {
    const key = this.settings.llmApiKey || this.fallbackApiKey;
    const model = this.settings.llmModel || 'gpt-4.1-mini';
    return new LlmEngine(key, model);
  }

  private resetStreamFilterState(): void {
    this.detectedStreamFilterProfile = undefined;
    this.streamTextBuffer = '';
    this.recentStreamEventKeys = [];
    this.streamToolOutputContinuationBudget = 0;
    this.streamEditBlockContinuationBudget = 0;
  }

  private resolveManualSubmitKey(): string {
    return '\r';
  }

  private writeToTerminal(data: string, phase: string): void {
    this.write(data);
    const logged = automationLogTextAndHex(data);
    this.eventLog?.append({
      type: 'terminal_write',
      at: new Date().toISOString(),
      termId: this.termId,
      phase,
      text: logged.text,
      hex: logged.hex,
    });
  }

  private emitStreamEvent(chunk: string): void {
    const normalizedChunk = normalizeAutomationStreamText(chunk);
    if (!normalizedChunk.trim()) return;

    const configuredProfile = this.activeStreamFilterProfile;
    const streamContext: AutomationStreamFilterContext = {
      ...(this.getStreamContext?.() ?? {}),
      detectedProfile: this.detectedStreamFilterProfile,
      recentOutput: normalizedChunk,
    };
    const effectiveProfile = resolveAutomationStreamFilterProfile(configuredProfile, streamContext);
    if (configuredProfile === 'auto' && effectiveProfile !== 'none') {
      this.detectedStreamFilterProfile = effectiveProfile;
    }

    this.streamTextBuffer += normalizedChunk;
    if (this.streamTextBuffer.length > MAX_STREAM_BUFFER_CHARS) {
      this.streamTextBuffer = this.streamTextBuffer.slice(-MAX_STREAM_BUFFER_CHARS);
    }

    const parts = this.streamTextBuffer.split('\n');
    this.streamTextBuffer = parts.pop() ?? '';
    for (const part of parts) {
      this.addFilteredStreamEvent(part, effectiveProfile);
    }

    if (
      this.streamTextBuffer.length >= STREAM_FRAGMENT_FLUSH_CHARS ||
      STREAM_PROMPT_FRAGMENT_RE.test(this.streamTextBuffer)
    ) {
      const fragment = this.streamTextBuffer;
      this.streamTextBuffer = '';
      this.addFilteredStreamEvent(fragment, effectiveProfile);
    }
  }

  private addFilteredStreamEvent(text: string, profile: AutomationStreamFilterProfile): void {
    const userInput = extractAutomationStreamUserInputEcho(text, {
      profile,
      context: {
        ...(this.getStreamContext?.() ?? {}),
        detectedProfile: this.detectedStreamFilterProfile,
        recentOutput: text,
      },
    });
    if (userInput) {
      this.rememberManualInput(userInput);
      if (!this.shouldSkipDuplicateStreamEvent(`user:${userInput}`)) {
        this.addEvent('user_input', {
          input: userInput,
          relay: 'block',
          relaySource: 'user',
          relayText: userInput,
          relayReason: `${profileLabel(profile)} prompt echo must not be relayed.`,
          relayFilterProfile: profile,
          reason: `${profileLabel(profile)} prompt echo.`,
        });
      }
      return;
    }

    const filterContext = {
      ...(this.getStreamContext?.() ?? {}),
      detectedProfile: this.detectedStreamFilterProfile,
      recentOutput: text,
    };

    const startsToolOutputContext = startsAutomationStreamToolOutputContext(text, { profile, context: filterContext });
    const startsEditBlockContext = startsAutomationStreamEditBlockContext(text, { profile, context: filterContext });

    if (isAutomationStreamInternalText(text, { profile, context: filterContext })) {
      if (startsToolOutputContext) {
        this.streamToolOutputContinuationBudget = STREAM_TOOL_OUTPUT_CONTINUATION_BUDGET;
      }
      if (startsEditBlockContext) {
        this.streamEditBlockContinuationBudget = STREAM_EDIT_BLOCK_CONTINUATION_BUDGET;
      }
      return;
    }

    if (startsToolOutputContext) {
      this.streamToolOutputContinuationBudget = STREAM_TOOL_OUTPUT_CONTINUATION_BUDGET;
      return;
    }

    if (startsEditBlockContext) {
      if (!isAutomationStreamNarrativeBoundary(text, { profile, context: filterContext })) {
        this.streamEditBlockContinuationBudget = STREAM_EDIT_BLOCK_CONTINUATION_BUDGET;
        return;
      }
      this.streamEditBlockContinuationBudget = 0;
    }

    if (this.streamEditBlockContinuationBudget > 0) {
      if (!isAutomationStreamNarrativeBoundary(text, { profile, context: filterContext })) {
        this.streamEditBlockContinuationBudget -= 1;
        return;
      }
      this.streamEditBlockContinuationBudget = 0;
    }

    if (this.streamToolOutputContinuationBudget > 0) {
      if (!isAutomationStreamNarrativeBoundary(text, { profile, context: filterContext })) {
        this.streamToolOutputContinuationBudget -= 1;
        return;
      }
      this.streamToolOutputContinuationBudget = 0;
    } else if (isAutomationStreamToolOutputContinuation(text, { profile, context: filterContext })) {
      return;
    }

    const streamText = filterAutomationStreamText(text, {
      profile,
      context: filterContext,
    });
    if (!streamText) return;
    if (this.shouldSkipRecentManualEcho(streamText)) return;
    if (this.shouldSkipDuplicateStreamEvent(streamText)) return;
    this.addEvent('stream', {
      streamText,
      relay: 'allow',
      relaySource: 'assistant',
      relayText: streamText,
      relayReason:
        profile !== 'none'
          ? `Filtered terminal stream output (${profileLabel(profile)}).`
          : 'Filtered terminal stream output.',
      relayFilterProfile: profile,
      reason:
        profile !== 'none'
          ? `Filtered terminal stream output (${profileLabel(profile)}).`
          : 'Filtered terminal stream output.',
    });
  }

  private rememberManualInput(input: string): void {
    const key = normalizeAutomationEventTextKey(input);
    if (!key) return;
    rememberRecentTextKey(this.recentManualInputKeys, key, MAX_RECENT_MANUAL_INPUT_KEYS);
  }

  private shouldSkipRecentManualEcho(text: string): boolean {
    const key = normalizeAutomationEventTextKey(text);
    if (!key) return true;
    pruneRecentTextKeys(this.recentManualInputKeys, MAX_RECENT_MANUAL_INPUT_KEYS, RECENT_MANUAL_ECHO_MS);
    return this.recentManualInputKeys.some((item) => isRecentInputEchoKey(key, item.key));
  }

  private shouldSkipDuplicateStreamEvent(text: string): boolean {
    const key = normalizeAutomationEventTextKey(text);
    if (!key) return true;
    pruneRecentTextKeys(this.recentStreamEventKeys, MAX_RECENT_STREAM_EVENT_KEYS, RECENT_STREAM_DEDUP_MS);
    if (this.recentStreamEventKeys.some((item) => isRedundantStreamEventKey(key, item.key))) return true;
    rememberRecentTextKey(this.recentStreamEventKeys, key, MAX_RECENT_STREAM_EVENT_KEYS);
    return false;
  }

  private addEvent(
    kind: AutomationEventKind,
    extra: Partial<Omit<AutomationEvent, 'id' | 'termId' | 'at' | 'kind'>> = {},
  ): void {
    const event: AutomationEvent = {
      id: randomUUID(),
      termId: this.termId,
      at: new Date().toISOString(),
      kind,
      ...extra,
    };
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.shift();
    this.eventLog?.append({
      type: 'event',
      at: event.at,
      termId: this.termId,
      event,
    });
    this.notifyEvent(event);
    try {
      this.observeEvent?.(event);
    } catch {
      // Observability must not affect automation delivery.
    }
  }

  private pushStatus(kind: AutomationEventKind): void {
    const status = this.getStatus();
    this.notifyStatus(status);
    if (kind !== 'status_change') return;
    this.addEvent(kind, { reason: `mode=${status.mode} stage=${this.stage} enabled=${this.enabled}` });
  }
}

function normalizeAutomationEventTextKey(text: string): string {
  return normalizeAutomationStreamText(text)
    .split('\n')
    .map((line) => line.replace(/^[›>\s]+/, '').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/[⏎]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function profileLabel(profile: AutomationStreamFilterProfile): string {
  if (profile === 'claude') return 'Claude Code';
  if (profile === 'gemini') return 'Gemini CLI';
  if (profile === 'codex') return 'Codex';
  return profile;
}

function splitTrailingSubmitKey(input: string, submitKey: string): { text: string; key: string } | null {
  if (input.endsWith('\r\n')) return { text: input.slice(0, -2), key: submitKey };
  if (input.endsWith('\r')) return { text: input.slice(0, -1), key: submitKey };
  if (input.endsWith('\n')) return { text: input.slice(0, -1), key: submitKey };
  return null;
}

function buildTypedTerminalInputParts(input: string, phase: string, firstDelayMs: number): TerminalInputPart[] {
  const parts: TerminalInputPart[] = [];
  let first = true;
  for (const char of input) {
    parts.push({
      data: char,
      phase,
      delayBeforeMs: first ? firstDelayMs : MANUAL_INPUT_PART_DELAY_MS,
    });
    first = false;
  }
  return parts;
}

function isRecentInputEchoKey(key: string, inputKey: string): boolean {
  if (!key || !inputKey) return false;
  if (isRecentInputEchoKeyMatch(key, inputKey)) return true;
  const compactKey = key.replace(/\s+/g, '');
  const compactInputKey = inputKey.replace(/\s+/g, '');
  if (compactKey !== key || compactInputKey !== inputKey) {
    return isRecentInputEchoKeyMatch(compactKey, compactInputKey);
  }
  return false;
}

function isRecentInputEchoKeyMatch(key: string, inputKey: string): boolean {
  if (!key || !inputKey) return false;
  if (key === inputKey) return true;
  if (key.length <= 4 && inputKey.includes(key)) return true;
  if (key.length >= 5 && inputKey.length >= 5) return inputKey.includes(key);
  return false;
}

function isRedundantStreamEventKey(key: string, existingKey: string): boolean {
  if (!key || !existingKey) return false;
  if (key === existingKey) return true;
  if (key.length >= 8 && existingKey.includes(key)) return true;
  if (existingKey.length >= 8 && key.includes(existingKey)) return true;
  return false;
}

function rememberRecentTextKey(bucket: RecentTextKey[], key: string, maxItems: number): void {
  bucket.push({ key, at: Date.now() });
  while (bucket.length > maxItems) bucket.shift();
}

function pruneRecentTextKeys(bucket: RecentTextKey[], maxItems: number, maxAgeMs: number): void {
  const cutoff = Date.now() - maxAgeMs;
  for (let index = bucket.length - 1; index >= 0; index -= 1) {
    if (bucket[index].at < cutoff) bucket.splice(index, 1);
  }
  while (bucket.length > maxItems) bucket.shift();
}
