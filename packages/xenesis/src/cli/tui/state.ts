import type { ApprovalMode } from '../../config/index.js';
import type { AgentRunEvent, ApprovalRequest, RunLifecycleStatus } from '../../core/events.js';
import type { AgentMessage } from '../../core/messages.js';

export interface TuiRuntimeSummary {
  provider: string;
  model: string;
  approvalMode: ApprovalMode;
  workspace: string;
  deskBridgeStatus?: 'configured' | 'missing';
}

export type TuiToolStatus = 'running' | 'completed' | 'failed';

export interface TuiToolActivity {
  id: string;
  name: string;
  status: TuiToolStatus;
  summary?: string;
}

export interface TuiNotice {
  kind: 'info' | 'warning' | 'error';
  message: string;
}

export interface TuiCommandOutput {
  command: string;
  kind: 'info' | 'error';
  lines: string[];
  offset: number;
  expanded: boolean;
  savedPath?: string;
}

export type TuiCommandOutputInput = Omit<TuiCommandOutput, 'offset' | 'expanded' | 'savedPath'>;

export interface TuiSuggestionContext {
  sessionIds: string[];
  imageSources: string[];
}

export interface TuiSessionContext {
  activeSessionId?: string;
  lastSessionId?: string;
  resumedFromSessionId?: string;
  historyMessageCount: number;
}

export interface TuiApprovalRequest {
  toolCallId: string;
  name: string;
  riskLevel: ApprovalRequest['riskLevel'];
  summary: string;
  reason: string;
  preview?: string;
  restored?: boolean;
}

export interface TuiState {
  runtime: TuiRuntimeSummary;
  status: RunLifecycleStatus | 'idle' | 'done' | 'incomplete' | 'error';
  assistantDraft: string;
  messages: Array<Extract<AgentMessage, { role: 'user' | 'assistant' }>>;
  tools: TuiToolActivity[];
  notices: TuiNotice[];
  commandOutput?: TuiCommandOutput;
  suggestionContext: TuiSuggestionContext;
  sessionContext: TuiSessionContext;
  pendingApproval?: TuiApprovalRequest;
  turns: number;
}

export function createTuiState(runtime: TuiRuntimeSummary): TuiState {
  return {
    runtime,
    status: 'idle',
    assistantDraft: '',
    messages: [],
    tools: [],
    notices: [],
    commandOutput: undefined,
    suggestionContext: { sessionIds: [], imageSources: [] },
    sessionContext: { historyMessageCount: 0 },
    pendingApproval: undefined,
    turns: 0,
  };
}

function upsertTool(tools: TuiToolActivity[], activity: TuiToolActivity) {
  const existingIndex = tools.findIndex((tool) => tool.id === activity.id);
  if (existingIndex === -1) return [...tools, activity];
  return tools.map((tool, index) => (index === existingIndex ? { ...tool, ...activity } : tool));
}

export function appendTuiNotice(state: TuiState, notice: TuiNotice): TuiState {
  return {
    ...state,
    notices: [...state.notices, notice].slice(-8),
  };
}

export function setTuiCommandOutput(state: TuiState, output: TuiCommandOutputInput): TuiState {
  return {
    ...state,
    commandOutput: {
      ...output,
      lines: output.lines.slice(-500),
      offset: 0,
      expanded: false,
      savedPath: undefined,
    },
  };
}

export function clearTuiCommandOutput(state: TuiState): TuiState {
  return {
    ...state,
    commandOutput: undefined,
  };
}

export function scrollTuiCommandOutput(state: TuiState, delta: number): TuiState {
  if (!state.commandOutput) return state;
  const maxOffset = Math.max(0, state.commandOutput.lines.length - 1);
  return {
    ...state,
    commandOutput: {
      ...state.commandOutput,
      offset: clampNumber(state.commandOutput.offset + delta, 0, maxOffset),
    },
  };
}

export function setTuiCommandOutputOffset(state: TuiState, offset: number): TuiState {
  if (!state.commandOutput) return state;
  const maxOffset = Math.max(0, state.commandOutput.lines.length - 1);
  return {
    ...state,
    commandOutput: {
      ...state.commandOutput,
      offset: clampNumber(offset, 0, maxOffset),
    },
  };
}

export function setTuiCommandOutputExpanded(state: TuiState, expanded: boolean): TuiState {
  if (!state.commandOutput) return state;
  return {
    ...state,
    commandOutput: {
      ...state.commandOutput,
      expanded,
    },
  };
}

export function setTuiCommandOutputSavedPath(state: TuiState, savedPath: string): TuiState {
  if (!state.commandOutput) return state;
  return {
    ...state,
    commandOutput: {
      ...state.commandOutput,
      savedPath,
    },
  };
}

export function setTuiSuggestionContext(state: TuiState, context: Partial<TuiSuggestionContext>): TuiState {
  return {
    ...state,
    suggestionContext: {
      ...state.suggestionContext,
      ...context,
      sessionIds: (context.sessionIds ?? state.suggestionContext.sessionIds).slice(0, 5),
      imageSources: (context.imageSources ?? state.suggestionContext.imageSources).slice(0, 10),
    },
  };
}

export function setTuiSessionContext(state: TuiState, context: Partial<TuiSessionContext>): TuiState {
  return {
    ...state,
    sessionContext: {
      ...state.sessionContext,
      ...context,
      historyMessageCount: Math.max(0, context.historyMessageCount ?? state.sessionContext.historyMessageCount),
    },
  };
}

export function resolveTuiApproval(state: TuiState, approved: boolean): TuiState {
  const request = state.pendingApproval;
  if (!request) return state;
  return appendTuiNotice(
    {
      ...state,
      pendingApproval: undefined,
    },
    {
      kind: approved ? 'info' : 'warning',
      message: `${approved ? 'Approved' : 'Denied'} ${request.name}: ${request.summary}`,
    },
  );
}

function appendVisibleMessage(
  messages: TuiState['messages'],
  message: Extract<AgentMessage, { role: 'user' | 'assistant' }>,
) {
  const latest = messages.at(-1);
  if (latest?.role === message.role && latest.content === message.content) return messages;
  return [...messages, message];
}

export function reduceTuiEvent(state: TuiState, event: AgentRunEvent): TuiState {
  if (event.type === 'run_state') {
    return {
      ...state,
      status: event.status,
      turns: event.turns,
    };
  }

  if (event.type === 'user_message' || event.type === 'assistant_message') {
    return {
      ...state,
      assistantDraft: event.type === 'assistant_message' ? '' : state.assistantDraft,
      messages: appendVisibleMessage(state.messages, event.message),
    };
  }

  if (event.type === 'assistant_delta') {
    return {
      ...state,
      assistantDraft: `${state.assistantDraft}${event.delta}`,
    };
  }

  if (event.type === 'tool_call') {
    return {
      ...state,
      tools: upsertTool(state.tools, {
        id: event.toolCall.id,
        name: event.toolCall.name,
        status: 'running',
        summary: inputSummary(event.toolCall.input),
      }),
    };
  }

  if (event.type === 'tool_result') {
    return {
      ...state,
      status: 'tool_result',
      tools: upsertTool(state.tools, {
        id: event.message.toolCallId,
        name: event.message.name,
        status: event.ok ? 'completed' : 'failed',
        summary: event.message.content,
      }),
    };
  }

  if (event.type === 'permission_request') {
    return appendTuiNotice(
      {
        ...state,
        status: 'awaiting_approval',
        pendingApproval: toTuiApprovalRequest(event.request),
      },
      {
        kind: 'warning',
        message: `Approval required for ${event.request.name}: ${event.request.summary}`,
      },
    );
  }

  if (event.type === 'done') {
    return {
      ...state,
      status: 'done',
      assistantDraft: '',
      turns: event.turns,
      messages: appendVisibleMessage(state.messages, { role: 'assistant', content: event.content }),
    };
  }

  if (event.type === 'stopped') {
    return appendTuiNotice(
      {
        ...state,
        status: 'stopped',
        turns: event.turns,
      },
      {
        kind: 'warning',
        message: `Run stopped: ${event.reason}`,
      },
    );
  }

  if (event.type === 'incomplete_run') {
    return appendTuiNotice(
      {
        ...state,
        status: 'incomplete',
        turns: event.turns,
      },
      {
        kind: 'warning',
        message: event.summary,
      },
    );
  }

  if (event.type === 'error') {
    return appendTuiNotice(
      {
        ...state,
        status: 'error',
      },
      {
        kind: 'error',
        message: event.message,
      },
    );
  }

  return state;
}

export function renderTuiSnapshot(state: TuiState) {
  const lines = [
    'Xenesis TUI',
    `Provider: ${state.runtime.provider}`,
    `Model: ${state.runtime.model}`,
    `Approval: ${state.runtime.approvalMode}`,
    `Workspace: ${state.runtime.workspace}`,
    `Status: ${state.status}`,
    `Turns: ${state.turns}`,
  ];
  if (state.assistantDraft) lines.push(`Assistant draft: ${state.assistantDraft}`);
  if (state.messages.length > 0) {
    const latest = state.messages.at(-1);
    lines.push(`Latest: ${latest?.role}: ${latest?.content ?? ''}`);
  }
  if (state.tools.length > 0) {
    lines.push(`Tools: ${state.tools.map((tool) => `${tool.name} ${tool.status}`).join(', ')}`);
  }
  if (state.commandOutput) {
    lines.push(`Command: ${state.commandOutput.command}`);
    lines.push(...state.commandOutput.lines);
  }
  if (state.notices.length > 0) {
    lines.push(`Notices: ${state.notices.map((notice) => `${notice.kind}: ${notice.message}`).join(' | ')}`);
  }
  return lines.join('\n');
}

export function toTuiApprovalRequest(request: ApprovalRequest): TuiApprovalRequest {
  return {
    toolCallId: request.toolCallId,
    name: request.name,
    riskLevel: request.riskLevel,
    summary: request.summary,
    reason: request.reason,
    preview: request.preview,
  };
}

export function restoreTuiApproval(state: TuiState, request: ApprovalRequest): TuiState {
  return appendTuiNotice(
    {
      ...state,
      status: 'awaiting_approval',
      pendingApproval: {
        ...toTuiApprovalRequest(request),
        restored: true,
      },
    },
    {
      kind: 'warning',
      message: `Restored approval required for ${request.name}: ${request.summary}`,
    },
  );
}

function inputSummary(input: unknown) {
  if (input === undefined || input === null) return '';
  if (typeof input === 'string') return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
