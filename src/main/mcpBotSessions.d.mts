import type { McpBridgeBotApprovalUi, McpBridgeBotArtifact, McpBridgeBotRole } from '../shared/types';

export interface McpBotMessage {
  id: string;
  role: McpBridgeBotRole;
  content: string;
  approvalUi?: McpBridgeBotApprovalUi;
  artifacts?: McpBridgeBotArtifact[];
  streaming: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface McpBotSession {
  id: string;
  title: string;
  source: string;
  status: string;
  inputUrl: string;
  updatedAt: string;
  messages: McpBotMessage[];
}

export interface McpBotSessionsState {
  sessions: Map<string, McpBotSession>;
}

export function normalizeMcpBotSession(raw: unknown, options?: { now?: string }): McpBotSession;
export function createMcpBotSessionsState(): McpBotSessionsState;
export function applyMcpBotSession(state: McpBotSessionsState, raw: unknown, options?: { now?: string }): McpBotSession;
export function listMcpBotSessions(state: McpBotSessionsState, options?: { limit?: number }): McpBotSession[];
export function persistMcpBotSessionsState(
  state: McpBotSessionsState,
  filePath: string,
  options?: { now?: string; limit?: number },
): { version: 1; savedAt: string; sessions: McpBotSession[] };
export function loadMcpBotSessionsStateFromFile(
  state: McpBotSessionsState,
  filePath: string,
  options?: { now?: string },
): { loaded: boolean; count: number };
