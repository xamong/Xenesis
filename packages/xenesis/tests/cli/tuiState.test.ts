import { describe, expect, test } from 'vitest';
import {
  appendTuiNotice,
  clearTuiCommandOutput,
  createTuiState,
  reduceTuiEvent,
  renderTuiSnapshot,
  resolveTuiApproval,
  scrollTuiCommandOutput,
  setTuiCommandOutput,
  setTuiCommandOutputExpanded,
  setTuiCommandOutputSavedPath,
  setTuiSessionContext,
  setTuiSuggestionContext,
} from '../../src/cli/tui/state.js';

describe('TUI state', () => {
  test('tracks assistant streaming, tool activity, and terminal status', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });

    state = reduceTuiEvent(state, {
      type: 'run_state',
      status: 'started',
      phase: 'planning',
      turns: 0,
      summary: 'started',
    });
    state = reduceTuiEvent(state, { type: 'assistant_delta', delta: 'Hel' });
    state = reduceTuiEvent(state, { type: 'assistant_delta', delta: 'lo' });
    state = reduceTuiEvent(state, {
      type: 'tool_call',
      toolCall: { id: 'call-1', name: 'read', input: { path: 'README.md' } },
    });
    state = reduceTuiEvent(state, {
      type: 'tool_result',
      ok: true,
      message: { role: 'tool', toolCallId: 'call-1', name: 'read', content: 'done' },
    });
    state = reduceTuiEvent(state, { type: 'done', content: 'Hello', turns: 1 });

    expect(state.status).toBe('done');
    expect(state.assistantDraft).toBe('');
    expect(state.messages.at(-1)).toEqual({ role: 'assistant', content: 'Hello' });
    expect(state.tools.at(-1)).toMatchObject({ id: 'call-1', name: 'read', status: 'completed' });
    expect(renderTuiSnapshot(state)).toContain('Provider: mock');
    expect(renderTuiSnapshot(state)).toContain('Tools: read completed');
  });

  test('does not duplicate optimistic user input or terminal assistant content', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });

    state = reduceTuiEvent(state, { type: 'user_message', message: { role: 'user', content: '안녕' } });
    state = reduceTuiEvent(state, { type: 'user_message', message: { role: 'user', content: '안녕' } });
    state = reduceTuiEvent(state, {
      type: 'assistant_message',
      message: { role: 'assistant', content: '안녕하세요! 저는 Xenesis입니다.' },
    });
    state = reduceTuiEvent(state, { type: 'done', content: '안녕하세요! 저는 Xenesis입니다.', turns: 1 });

    expect(state.messages).toEqual([
      { role: 'user', content: '안녕' },
      { role: 'assistant', content: '안녕하세요! 저는 Xenesis입니다.' },
    ]);
  });

  test('appends and bounds visible notices', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });

    for (let index = 0; index < 10; index += 1) {
      state = appendTuiNotice(state, { kind: 'info', message: `notice ${index}` });
    }

    expect(state.notices).toHaveLength(8);
    expect(state.notices[0]).toEqual({ kind: 'info', message: 'notice 2' });
    expect(state.notices.at(-1)).toEqual({ kind: 'info', message: 'notice 9' });
  });

  test('stores and clears pending approval requests', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });

    state = reduceTuiEvent(state, {
      type: 'permission_request',
      request: {
        toolCallId: 'call-write',
        approvalId: 'approval-write',
        name: 'write',
        input: { path: 'notes.txt' },
        reason: 'User approval required for modifying tool.',
        riskLevel: 'medium',
        summary: 'write notes.txt',
        preview: '--- preview ---',
      },
    });

    expect(state.pendingApproval).toMatchObject({
      toolCallId: 'call-write',
      name: 'write',
      riskLevel: 'medium',
      summary: 'write notes.txt',
      preview: '--- preview ---',
    });

    state = resolveTuiApproval(state, true);

    expect(state.pendingApproval).toBeUndefined();
    expect(state.notices.at(-1)).toEqual({
      kind: 'info',
      message: 'Approved write: write notes.txt',
    });
  });

  test('stores full command output for slash command results', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });

    state = setTuiCommandOutput(state, {
      command: '/sessions list',
      kind: 'info',
      lines: Array.from({ length: 14 }, (_, index) => `session-${index}`),
    });

    expect(state.commandOutput).toMatchObject({
      command: '/sessions list',
      kind: 'info',
      lines: Array.from({ length: 14 }, (_, index) => `session-${index}`),
      offset: 0,
      expanded: false,
    });
    expect(renderTuiSnapshot(state)).toContain('Command: /sessions list');
    expect(renderTuiSnapshot(state)).toContain('session-13');
  });

  test('scrolls, expands, saves, and clears command output', () => {
    let state = setTuiCommandOutput(
      createTuiState({
        provider: 'mock',
        model: 'mock-model',
        approvalMode: 'safe',
        workspace: '/repo',
      }),
      {
        command: '/memory list',
        kind: 'info',
        lines: Array.from({ length: 20 }, (_, index) => `line-${index}`),
      },
    );

    state = scrollTuiCommandOutput(state, 5);
    expect(state.commandOutput?.offset).toBe(5);

    state = scrollTuiCommandOutput(state, -99);
    expect(state.commandOutput?.offset).toBe(0);

    state = setTuiCommandOutputExpanded(state, true);
    expect(state.commandOutput?.expanded).toBe(true);

    state = setTuiCommandOutputSavedPath(state, 'D:/repo/.xenesis/output.txt');
    expect(state.commandOutput?.savedPath).toBe('D:/repo/.xenesis/output.txt');

    state = clearTuiCommandOutput(state);
    expect(state.commandOutput).toBeUndefined();
  });

  test('stores bounded suggestion context for recent session ids', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });

    state = setTuiSuggestionContext(state, {
      sessionIds: Array.from({ length: 8 }, (_, index) => `session-${index}`),
    });

    expect(state.suggestionContext.sessionIds).toEqual([
      'session-0',
      'session-1',
      'session-2',
      'session-3',
      'session-4',
    ]);
  });

  test('tracks TUI session context metadata', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });

    expect(state.sessionContext).toEqual({
      historyMessageCount: 0,
    });

    state = setTuiSessionContext(state, {
      activeSessionId: 'session-active',
      lastSessionId: 'session-latest',
      resumedFromSessionId: 'session-source',
      historyMessageCount: 6,
    });

    expect(state.sessionContext).toEqual({
      activeSessionId: 'session-active',
      lastSessionId: 'session-latest',
      resumedFromSessionId: 'session-source',
      historyMessageCount: 6,
    });

    state = setTuiSessionContext(state, {
      resumedFromSessionId: undefined,
      historyMessageCount: -10,
    });

    expect(state.sessionContext).toEqual({
      activeSessionId: 'session-active',
      lastSessionId: 'session-latest',
      resumedFromSessionId: undefined,
      historyMessageCount: 0,
    });
  });
});
