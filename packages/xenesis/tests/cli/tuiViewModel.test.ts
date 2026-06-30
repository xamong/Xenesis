import { describe, expect, test } from 'vitest';
import { measureTerminalCellWidth } from '../../src/cli/tui/inputBuffer.js';
import {
  createTuiState,
  reduceTuiEvent,
  scrollTuiCommandOutput,
  setTuiCommandOutput,
  setTuiCommandOutputExpanded,
  setTuiSessionContext,
  setTuiSuggestionContext,
} from '../../src/cli/tui/state.js';
import { createTuiViewModel } from '../../src/cli/tui/viewModel.js';

describe('TUI view model', () => {
  test('creates bounded sections for full-screen terminal rendering', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: 'D:/repo',
    });
    state = reduceTuiEvent(state, { type: 'user_message', message: { role: 'user', content: 'Inspect the project' } });
    state = reduceTuiEvent(state, { type: 'assistant_delta', delta: 'Reading files' });
    state = reduceTuiEvent(state, {
      type: 'tool_call',
      toolCall: { id: 'call-1', name: 'read', input: { path: 'README.md' } },
    });
    state = reduceTuiEvent(state, {
      type: 'permission_request',
      request: {
        toolCallId: 'call-2',
        approvalId: 'approval-2',
        name: 'write',
        input: { path: 'notes.txt' },
        reason: 'User approval required for modifying tool.',
        riskLevel: 'medium',
        summary: 'write notes.txt',
      },
    });

    const view = createTuiViewModel(state, { width: 72, height: 16 });

    expect(view.title).toBe('Xenesis TUI');
    expect(view.statusItems).toEqual([
      'provider mock',
      'model mock-model',
      'approval safe',
      'status awaiting_approval',
      'turns 0',
      'session none',
      'context 0',
    ]);
    expect(view.headerRows).toEqual([
      {
        label: 'runtime',
        items: ['provider mock', 'model mock-model', 'approval safe'],
        tone: 'normal',
      },
      {
        label: 'state',
        items: ['awaiting_approval', 'turns 0'],
        tone: 'warning',
      },
      {
        label: 'session',
        items: ['session none', 'context 0'],
        tone: 'muted',
      },
    ]);
    expect(view.transcriptRows).toEqual([
      { role: 'user', content: 'Inspect the project' },
      { role: 'assistant', content: 'Reading files' },
    ]);
    expect(view.toolRows).toEqual([{ name: 'read', status: 'running', detail: '{"path":"README.md"}' }]);
    expect(view.noticeRows.at(-1)).toMatchObject({
      kind: 'warning',
      message: 'Approval required for write: write notes.txt',
    });
    expect(view.approval).toMatchObject({
      name: 'write',
      riskLevel: 'medium',
      summary: 'write notes.txt',
      reason: 'User approval required for modifying tool.',
    });
    expect(view.approval?.help).toContain('y');
    expect(view.approval?.help).toContain('n');
    expect(view.footer).toContain('/help');
    expect(view.maxTranscriptRows).toBeLessThanOrEqual(6);
  });

  test('slices transcript rows by offset from the latest messages', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: 'D:/repo',
    });
    for (let index = 0; index < 10; index += 1) {
      state = reduceTuiEvent(state, {
        type: 'user_message',
        message: { role: 'user', content: `message-${index}` },
      });
    }

    const latestView = createTuiViewModel(state, { width: 72, height: 16 });
    const scrolledView = createTuiViewModel(state, { width: 72, height: 16 }, { transcriptOffset: 3 });

    expect(latestView.transcriptRows.map((row) => row.content)).toEqual(['message-8', 'message-9']);
    expect(latestView.transcriptRange).toBe('9-10/10');
    expect(scrolledView.transcriptRows.map((row) => row.content)).toEqual(['message-5', 'message-6']);
    expect(scrolledView.transcriptRange).toBe('6-7/10');
    expect(scrolledView.transcriptOffset).toBe(3);
  });

  test('wraps unified scrollback rows to the available terminal width', () => {
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: 'D:/repo',
    });
    state = reduceTuiEvent(state, {
      type: 'assistant_message',
      message: {
        role: 'assistant',
        content: '한글과 English words should wrap inside the center scrollback instead of clipping into the footer',
      },
    });

    const view = createTuiViewModel(state, { width: 32, height: 18 });

    expect(view.scrollbackRows.length).toBeGreaterThan(1);
    expect(view.totalScrollbackRows).toBeGreaterThanOrEqual(view.scrollbackRows.length);
    for (const row of view.scrollbackRows) {
      expect(measureTerminalCellWidth(row.text)).toBeLessThanOrEqual(28);
    }
  });

  test('marks active run lifecycle states with active header tone', () => {
    for (const status of ['started', 'provider_request', 'tool_call', 'tool_result'] as const) {
      const state = {
        ...createTuiState({
          provider: 'mock',
          model: 'mock-model',
          approvalMode: 'safe',
          workspace: 'D:/repo',
        }),
        status,
      };

      const view = createTuiViewModel(state, { width: 72, height: 16 });

      expect(view.headerRows.find((row) => row.label === 'state')?.tone).toBe('active');
    }
  });

  test('creates filtered slash command suggestion rows from current input', () => {
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: 'D:/repo',
    });

    const view = createTuiViewModel(state, { width: 72, height: 16 }, { inputValue: '/a' });

    expect(view.suggestionRows).toEqual([
      {
        command: '/approval',
        usage: '/approval <safe|auto|readonly>',
        description: 'Change approval mode for tool calls. 승인 모드 변경',
        completion: '/approval ',
        examples: ['/approval safe', '/approval auto', '/approval readonly'],
      },
    ]);
  });

  test('creates provider slash command suggestion rows', () => {
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: 'D:/repo',
    });

    const view = createTuiViewModel(state, { width: 72, height: 16 }, { inputValue: '/pro' });

    expect(view.suggestionRows).toEqual([
      {
        command: '/provider',
        usage: '/provider <name>',
        description: 'Show or change provider for subsequent prompts. 프로바이더 변경',
        completion: '/provider ',
        examples: ['/provider openai', '/provider qwen', '/provider deepseek'],
      },
    ]);
  });

  test('exposes compact command output rows for side panel rendering', () => {
    const state = setTuiCommandOutput(
      createTuiState({
        provider: 'mock',
        model: 'mock-model',
        approvalMode: 'safe',
        workspace: 'D:/repo',
      }),
      {
        command: '/memory list',
        kind: 'info',
        lines: ['memory: project-goal', 'memory: user-pref'],
      },
    );

    const view = createTuiViewModel(state, { width: 72, height: 16 });

    expect(view.commandOutput).toEqual({
      command: '/memory list',
      kind: 'info',
      lines: ['memory: project-goal'],
      totalLines: 2,
      offset: 0,
      endOffset: 1,
      expanded: false,
      range: '1-1/2',
      savedPath: undefined,
    });
  });

  test('slices command output by offset and expanded viewport', () => {
    let state = setTuiCommandOutput(
      createTuiState({
        provider: 'mock',
        model: 'mock-model',
        approvalMode: 'safe',
        workspace: 'D:/repo',
      }),
      {
        command: '/compact session-1',
        kind: 'info',
        lines: Array.from({ length: 20 }, (_, index) => `line-${index}`),
      },
    );
    state = scrollTuiCommandOutput(state, 5);
    state = setTuiCommandOutputExpanded(state, true);

    const view = createTuiViewModel(state, { width: 100, height: 22 });

    expect(view.commandOutput).toMatchObject({
      command: '/compact session-1',
      expanded: true,
      offset: 5,
      totalLines: 20,
      range: '6-12/20',
    });
    expect(view.commandOutput?.lines).toEqual(Array.from({ length: 7 }, (_, index) => `line-${index + 5}`));
  });

  test('uses state suggestion context for session argument suggestions', () => {
    const state = setTuiSuggestionContext(
      createTuiState({
        provider: 'mock',
        model: 'mock-model',
        approvalMode: 'safe',
        workspace: 'D:/repo',
      }),
      {
        sessionIds: ['session-current', 'session-previous'],
      },
    );

    const view = createTuiViewModel(state, { width: 72, height: 16 }, { inputValue: '/resume ' });

    expect(view.suggestionRows.map((item) => item.completion)).toEqual([
      '/resume session-current ',
      '/resume session-previous ',
    ]);
  });

  test('exposes active, latest, resumed, and context count in status items', () => {
    const state = setTuiSessionContext(
      createTuiState({
        provider: 'mock',
        model: 'mock-model',
        approvalMode: 'safe',
        workspace: 'D:/repo',
      }),
      {
        activeSessionId: 'session-active',
        lastSessionId: 'session-latest',
        resumedFromSessionId: 'session-source',
        historyMessageCount: 8,
      },
    );

    const view = createTuiViewModel(state, { width: 100, height: 20 });

    expect(view.statusItems).toContain('session session-active');
    expect(view.statusItems).toContain('latest session-latest');
    expect(view.statusItems).toContain('resumed session-source');
    expect(view.statusItems).toContain('context 8');
  });

  test('exposes configured Desk bridge status when available', () => {
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: 'D:/repo',
      deskBridgeStatus: 'configured',
    });

    const view = createTuiViewModel(state, { width: 100, height: 20 });

    expect(view.statusItems).toContain('bridge configured');
  });
});
