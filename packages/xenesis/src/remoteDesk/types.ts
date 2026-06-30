export interface RemoteDeskBridge {
  callCapability(
    path: string,
    args?: Record<string, unknown>,
    options?: { approved?: boolean; timeoutMs?: number },
  ): Promise<unknown>;
}

export interface RemoteDeskCommandRequest {
  conversationId: string;
  senderId?: string;
  text: string;
  send?: (response: RemoteDeskCommandResponse) => Promise<void>;
}

export interface RemoteDeskCommandAction {
  label: string;
  value: string;
}

export interface RemoteDeskCommandMessage {
  text: string;
  actions?: RemoteDeskCommandAction[];
}

export type RemoteDeskCommandResponse = string | RemoteDeskCommandMessage;

export interface RemoteDeskCommandRouter {
  canHandle(text: string, request?: RemoteDeskCommandRequest): boolean;
  handle(request: RemoteDeskCommandRequest): Promise<RemoteDeskCommandResponse>;
}

export interface RemoteDeskTerminalSummary {
  termId: string;
  title?: string;
  detail?: string;
  cwd?: string;
  lastSentCommand?: string;
  active?: boolean;
}

export interface RemoteDeskSession {
  termId?: string;
  lastTerminals?: RemoteDeskTerminalSummary[];
  seenEventIds: Set<string>;
  lastPending?: RemoteDeskPendingEvent;
  watchTimer?: ReturnType<typeof setTimeout>;
  watching?: boolean;
}

export interface RemoteDeskAgentSummary {
  agentId: string;
  id?: string;
  title?: string;
  workspace?: string;
  provider?: string;
  runtimeMode?: string;
  status?: string;
  running?: boolean;
  lastActivityAt?: string;
}

export interface RemoteDeskAgentEvent {
  id?: string;
  agentId?: string;
  kind?: string;
  text?: string;
  summary?: string;
  final?: boolean;
  externalSafe?: boolean;
  at?: string;
}

export interface RemoteDeskAgentSession {
  agentId?: string;
  lastAgents?: RemoteDeskAgentSummary[];
  seenEventIds: Set<string>;
  watchTimer?: ReturnType<typeof setTimeout>;
  watching?: boolean;
  watchGeneration?: number;
}

export interface RemoteDeskPendingEvent {
  id: string;
  suggestedInput?: string;
  options: RemoteDeskPendingOption[];
}

export interface RemoteDeskPendingOption {
  index: number;
  input: string;
  label: string;
}
