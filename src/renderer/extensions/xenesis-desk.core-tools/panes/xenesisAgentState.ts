import { useSyncExternalStore } from 'react';
import {
  appendRawStreamEntryToList,
  type MergeRawStreamEntryInput,
  mergeRawStreamEntryToList,
} from './xenesisAgentRawStream';
import { normalizeXenesisStatusBarKeys, XENESIS_STATUS_BAR_DEFAULT_KEYS } from './xenesisAgentStatusBar';
import {
  createId,
  isRecord,
  nowIso,
  XENESIS_AGENT_STATE_STORAGE_KEY,
  XENESIS_AGENT_STATUS_BAR_KEYS_STORAGE_KEY,
  type XenesisAgentState,
  type XenesisChatMessage,
  type XenesisRawStreamEntry,
  type XenesisStatusBarItemKey,
} from './xenesisAgentTypes';
import { type XenesisPolicyNotice, type XenesisPolicySnapshot, xenesisPolicyNoticeKey } from './xenesisPolicyNotices';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  return isRecord(value) && Object.values(value).every(isStringArray);
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === 'number';
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || isStringArray(value);
}

function isPolicySnapshot(value: unknown): value is XenesisPolicySnapshot {
  return (
    isRecord(value) &&
    typeof value.policyName === 'string' &&
    isStringArray(value.priorityTools) &&
    isStringArrayRecord(value.requiredBefore) &&
    isStringArrayRecord(value.requiredBeforeAny) &&
    isOptionalNumber(value.allowCount) &&
    isOptionalNumber(value.denyCount) &&
    isOptionalStringArray(value.nextActions)
  );
}

function loadPersistedStatusBarKeys(): XenesisStatusBarItemKey[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(XENESIS_AGENT_STATUS_BAR_KEYS_STORAGE_KEY) || 'null');
    if (!isStringArray(parsed)) return null;
    return normalizeXenesisStatusBarKeys(parsed);
  } catch {
    return null;
  }
}

function persistStatusBarKeys(keys: readonly string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      XENESIS_AGENT_STATUS_BAR_KEYS_STORAGE_KEY,
      JSON.stringify(normalizeXenesisStatusBarKeys(keys)),
    );
  } catch {
    // Status bar preferences are durable UI state; storage failures should not block chat.
  }
}

export function initialAgentState(): XenesisAgentState {
  return {
    status: null,
    prompt: '',
    mode: 'chat',
    loading: false,
    running: false,
    error: '',
    messages: [],
    rawStream: [],
    policyNotices: [],
    policySnapshot: null,
    rawStreamOpen: false,
    rawStreamFocusId: '',
    activeSessionId: '',
    statusBarKeys: [...XENESIS_STATUS_BAR_DEFAULT_KEYS],
  };
}

export function loadPersistedAgentState(): XenesisAgentState {
  const fallback = initialAgentState();
  const persistedStatusBarKeys = loadPersistedStatusBarKeys();
  if (persistedStatusBarKeys) fallback.statusBarKeys = persistedStatusBarKeys;
  if (typeof sessionStorage === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(XENESIS_AGENT_STATE_STORAGE_KEY) || '');
    if (!isRecord(parsed)) return fallback;
    return {
      ...fallback,
      ...parsed,
      loading: false,
      running: false,
      messages: Array.isArray(parsed.messages) ? (parsed.messages.slice(0, 80) as XenesisChatMessage[]) : [],
      rawStream: Array.isArray(parsed.rawStream) ? (parsed.rawStream.slice(0, 120) as XenesisRawStreamEntry[]) : [],
      policyNotices: Array.isArray(parsed.policyNotices)
        ? (parsed.policyNotices.slice(0, 40) as XenesisPolicyNotice[])
        : [],
      policySnapshot: isPolicySnapshot(parsed.policySnapshot) ? parsed.policySnapshot : null,
      rawStreamOpen: false,
      rawStreamFocusId: '',
      activeSessionId: typeof parsed.activeSessionId === 'string' ? parsed.activeSessionId : '',
      mode: parsed.mode === 'plan' || parsed.mode === 'work' ? parsed.mode : 'chat',
      statusBarKeys:
        persistedStatusBarKeys ??
        normalizeXenesisStatusBarKeys(isStringArray(parsed.statusBarKeys) ? parsed.statusBarKeys : undefined),
    };
  } catch {
    return fallback;
  }
}

export function persistAgentState(state: XenesisAgentState): void {
  persistStatusBarKeys(state.statusBarKeys);
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      XENESIS_AGENT_STATE_STORAGE_KEY,
      JSON.stringify({
        status: state.status,
        prompt: state.prompt,
        mode: state.mode,
        error: state.error,
        messages: state.messages.slice(0, 80),
        rawStream: state.rawStream.slice(0, 120),
        policyNotices: state.policyNotices.slice(0, 40),
        policySnapshot: state.policySnapshot,
        activeSessionId: state.activeSessionId,
        statusBarKeys: normalizeXenesisStatusBarKeys(state.statusBarKeys),
      }),
    );
  } catch {
    // Persistence is a convenience for dock remounts; storage failures should not block chat.
  }
}

const XENESIS_AGENT_PERSIST_THROTTLE_MS = 300;
let pendingPersistAgentState: XenesisAgentState | null = null;
let pendingPersistAgentStateTimer: ReturnType<typeof setTimeout> | null = null;

function hasActiveAgentStreaming(state: XenesisAgentState): boolean {
  return state.running || state.loading || state.messages.some((message) => message.streaming);
}

function clearPendingPersistAgentState(): void {
  if (pendingPersistAgentStateTimer) {
    clearTimeout(pendingPersistAgentStateTimer);
    pendingPersistAgentStateTimer = null;
  }
  pendingPersistAgentState = null;
}

function flushPendingPersistAgentState(): void {
  const nextState = pendingPersistAgentState;
  clearPendingPersistAgentState();
  if (nextState) persistAgentState(nextState);
}

function schedulePersistAgentState(state: XenesisAgentState): void {
  if (typeof sessionStorage === 'undefined') return;
  pendingPersistAgentState = state;
  if (pendingPersistAgentStateTimer) return;
  pendingPersistAgentStateTimer = setTimeout(() => {
    flushPendingPersistAgentState();
  }, XENESIS_AGENT_PERSIST_THROTTLE_MS);
}

function persistAgentStateForUpdate(state: XenesisAgentState): void {
  persistStatusBarKeys(state.statusBarKeys);
  if (hasActiveAgentStreaming(state)) {
    schedulePersistAgentState(state);
    return;
  }
  clearPendingPersistAgentState();
  persistAgentState(state);
}

export const xenesisAgentStateStore = {
  snapshot: loadPersistedAgentState(),
  listeners: new Set<() => void>(),
  getSnapshot(): XenesisAgentState {
    return this.snapshot;
  },
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  update(updater: Partial<XenesisAgentState> | ((state: XenesisAgentState) => XenesisAgentState)): XenesisAgentState {
    const next = typeof updater === 'function' ? updater(this.snapshot) : { ...this.snapshot, ...updater };
    this.snapshot = next;
    persistAgentStateForUpdate(next);
    for (const listener of this.listeners) listener();
    return next;
  },
};

export function useXenesisAgentState(): XenesisAgentState {
  return useSyncExternalStore(
    (listener) => xenesisAgentStateStore.subscribe(listener),
    () => xenesisAgentStateStore.getSnapshot(),
    () => xenesisAgentStateStore.getSnapshot(),
  );
}

export function appendChatMessage(message: Omit<XenesisChatMessage, 'id' | 'at'> & { at?: string }): string {
  const id = createId('xenesis-chat');
  xenesisAgentStateStore.update((state) => ({
    ...state,
    messages: [
      {
        id,
        at: message.at || nowIso(),
        role: message.role,
        content: message.content,
        kind: message.kind,
        error: message.error,
        streaming: message.streaming,
        deskActions: message.deskActions,
        deskActionStatus: message.deskActionStatus,
        deskActionResults: message.deskActionResults,
      },
      ...state.messages,
    ].slice(0, 80),
  }));
  return id;
}

export function replaceChatMessage(
  messageId: string,
  replacement: Partial<Omit<XenesisChatMessage, 'id'>> & Pick<XenesisChatMessage, 'content'>,
): void {
  xenesisAgentStateStore.update((state) => ({
    ...state,
    messages: state.messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            ...replacement,
            at: replacement.at || message.at,
            streaming: replacement.streaming,
            // Preserve the streamed intermediate narration as the "thinking
            // process" the first time the final answer replaces it. Captured
            // once (!thinkingContent guard) so the progressive reveal — which
            // re-calls replaceChatMessage with streaming=true — does not
            // overwrite it; skipped when the streamed text matches the
            // replacement (clean answer, nothing discarded).
            ...(message.streaming &&
            !message.thinkingContent &&
            typeof message.content === 'string' &&
            message.content.trim() &&
            message.content.trim() !== (replacement.content ?? '').trim()
              ? { thinkingContent: message.content }
              : {}),
          }
        : message,
    ),
  }));
}

export function appendAssistantStreamDelta(messageId: string, delta: string): void {
  if (!messageId || !delta) return;
  xenesisAgentStateStore.update((state) => ({
    ...state,
    messages: state.messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            role: 'assistant',
            content: `${message.content}${delta}`,
            streaming: true,
          }
        : message,
    ),
  }));
}

export function appendAssistantStreamDeltaWithRawMerge(
  messageId: string,
  delta: string,
  rawEntry: MergeRawStreamEntryInput,
): void {
  if (!messageId || !delta) return;
  xenesisAgentStateStore.update((state) => ({
    ...state,
    messages: state.messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            role: 'assistant',
            content: `${message.content}${delta}`,
            streaming: true,
          }
        : message,
    ),
    rawStream: mergeRawStreamEntryToList(state.rawStream, rawEntry),
  }));
}

export function appendRawStreamEntry(entry: Omit<XenesisRawStreamEntry, 'id' | 'at'> & { at?: string }): void {
  xenesisAgentStateStore.update((state) => ({
    ...state,
    rawStream: appendRawStreamEntryToList(state.rawStream, entry),
  }));
}

export function mergeRawStreamEntry(entry: MergeRawStreamEntryInput): void {
  xenesisAgentStateStore.update((state) => ({
    ...state,
    rawStream: mergeRawStreamEntryToList(state.rawStream, entry),
  }));
}

export function appendPolicyNotice(notice: XenesisPolicyNotice): void {
  xenesisAgentStateStore.update((state) => {
    const nextKey = xenesisPolicyNoticeKey(notice);
    const existingKeys = new Set(state.policyNotices.map(xenesisPolicyNoticeKey));
    if (existingKeys.has(nextKey)) return state;
    return {
      ...state,
      policyNotices: [notice, ...state.policyNotices].slice(0, 40),
    };
  });
}

export function appendPolicyNotices(notices: XenesisPolicyNotice[]): void {
  for (const notice of notices) appendPolicyNotice(notice);
}

export function setPolicySnapshot(policySnapshot: XenesisPolicySnapshot | null): void {
  xenesisAgentStateStore.update({ policySnapshot });
}

export function setRawStreamOpen(rawStreamOpen: boolean): void {
  xenesisAgentStateStore.update((state) => ({
    ...state,
    rawStreamOpen,
    rawStreamFocusId: rawStreamOpen ? state.rawStreamFocusId : '',
  }));
}

export function focusRawStreamEntry(entryId: string): void {
  xenesisAgentStateStore.update((state) => ({
    ...state,
    rawStreamOpen: true,
    rawStreamFocusId: entryId,
  }));
}

export function clearRawStream(): void {
  xenesisAgentStateStore.update({ rawStream: [], rawStreamFocusId: '' });
}

export function clearChat(): void {
  xenesisAgentStateStore.update({
    messages: [],
    policyNotices: [],
    policySnapshot: null,
    error: '',
    activeSessionId: '',
  });
}
