import type { ExtensionPanelPlacement } from '../shared/types';

export type McpBridgeBotEventType = 'session' | 'message' | 'stream' | 'final' | 'status' | 'error';
export type McpBridgeBotRole = 'user' | 'assistant' | 'system';

export interface McpBridgeBotApprovalUi {
  title?: string;
  subjectLabel?: string;
  reasonLabel?: string;
  choices?: string[];
  buttonLabels?: Record<string, string>;
}

export interface McpBridgeBotEvent {
  type: McpBridgeBotEventType;
  sessionId: string;
  messageId: string;
  role: McpBridgeBotRole;
  delta: string;
  content: string;
  title: string;
  source: string;
  status: string;
  inputUrl: string;
  placement?: ExtensionPanelPlacement;
  approvalUi?: McpBridgeBotApprovalUi;
  at: string;
}

export interface McpBridgeBotMessage {
  id: string;
  role: McpBridgeBotRole;
  content: string;
  approvalUi?: McpBridgeBotApprovalUi;
  streaming: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface McpBridgeBotSession {
  id: string;
  title: string;
  source: string;
  status: string;
  inputUrl: string;
  placement?: ExtensionPanelPlacement;
  updatedAt: string;
  messages: McpBridgeBotMessage[];
}

export interface McpBridgeBotState {
  sessions: Map<string, McpBridgeBotSession>;
}

export function normalizeBotBridgeEvent(raw: unknown, options?: { now?: string }): McpBridgeBotEvent;
export function createBotBridgeState(): McpBridgeBotState;
export function applyBotBridgeEvent(state: McpBridgeBotState, event: unknown): McpBridgeBotSession;
