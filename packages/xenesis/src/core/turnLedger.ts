export type XenesisTurnStatus =
  | 'queued'
  | 'provider_starting'
  | 'running'
  | 'waiting_for_approval'
  | 'waiting_for_user'
  | 'blocked'
  | 'failed'
  | 'completed'
  | 'cancelled';

export type XenesisTurnEvidenceKind =
  | 'provider-selected'
  | 'provider-started'
  | 'mcp-tool-called'
  | 'cr-capability-called'
  | 'approval-created'
  | 'approval-resolved'
  | 'readback'
  | 'final-response'
  | (string & {});

export type XenesisTurnProviderSource = 'profile' | 'command' | 'runtime';

export type XenesisTurnProcessModel = 'persistent-process' | 'process-per-turn' | 'embedded';

export interface XenesisTurnEvidenceRef {
  kind: XenesisTurnEvidenceKind;
  at: string;
  summary: string;
  id?: string;
  path?: string;
  verified: boolean;
}

export type XenesisTurnEvidenceInput = Omit<XenesisTurnEvidenceRef, 'at' | 'verified'> & {
  at?: string;
  verified?: boolean;
};

export interface XenesisTurnApprovalRef {
  summary: string;
  at: string;
  approvalId?: string;
  actionInboxItemId?: string;
  capabilityPath?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'expired' | (string & {});
}

export type XenesisTurnApprovalInput = Omit<XenesisTurnApprovalRef, 'at'> & {
  at?: string;
};

export type XenesisTurnApprovalResolutionInput = {
  approvalId?: string;
  actionInboxItemId?: string;
  capabilityPath?: string;
  status: NonNullable<XenesisTurnApprovalRef['status']>;
  summary?: string;
  at?: string;
};

export interface XenesisTurnToolCallRef {
  name: string;
  at: string;
  id?: string;
  path?: string;
  summary?: string;
  status?: 'queued' | 'running' | 'completed' | 'failed' | (string & {});
}

export type XenesisTurnToolCallInput = Omit<XenesisTurnToolCallRef, 'at'> & {
  at?: string;
};

export interface XenesisTurnDiagnostic {
  level: 'info' | 'warning' | 'error' | (string & {});
  message: string;
  at: string;
  errorClass?: string;
}

export interface XenesisTurnResult {
  responsePreview?: string;
  finishReason?: string;
  errorClass?: string;
  message?: string;
}

export interface XenesisTurnRecord {
  id: string;
  sessionId: string;
  paneId?: string;
  status: XenesisTurnStatus;
  userPromptPreview: string;
  responsePreview?: string;
  provider: {
    requested: string;
    resolved: string;
    source: XenesisTurnProviderSource;
    processModel?: XenesisTurnProcessModel;
  };
  approvals: XenesisTurnApprovalRef[];
  toolCalls: XenesisTurnToolCallRef[];
  evidence: XenesisTurnEvidenceRef[];
  diagnostics: XenesisTurnDiagnostic[];
  result?: XenesisTurnResult;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
}

export interface StartTurnInput {
  sessionId: string;
  prompt: string;
  providerRequested: string;
  providerResolved: string;
  providerSource: XenesisTurnProviderSource;
  processModel?: XenesisTurnProcessModel;
  paneId?: string;
}

export interface XenesisTurnProviderUpdate {
  resolved?: string;
  processModel?: XenesisTurnProcessModel | null;
}

export interface TurnLedgerOptions {
  now?: () => string;
  idFactory?: () => string;
  promptPreviewMaxChars?: number;
  responsePreviewMaxChars?: number;
  maxTurns?: number;
}

export interface XenesisTurnLedger {
  startTurn(input: StartTurnInput): XenesisTurnRecord;
  markProviderStarting(turnId: string, provider?: XenesisTurnProviderUpdate): XenesisTurnRecord;
  markRunning(turnId: string): XenesisTurnRecord;
  markWaitingForApproval(turnId: string, approval: XenesisTurnApprovalInput): XenesisTurnRecord;
  resolveApproval(turnId: string, approval: XenesisTurnApprovalResolutionInput): XenesisTurnRecord;
  addToolCall(turnId: string, toolCall: XenesisTurnToolCallInput): XenesisTurnRecord;
  updateToolCall(
    turnId: string,
    toolCall: Pick<XenesisTurnToolCallRef, 'id' | 'name' | 'path'> &
      Partial<Pick<XenesisTurnToolCallRef, 'status' | 'summary'>>,
  ): XenesisTurnRecord;
  addEvidence(turnId: string, evidence: XenesisTurnEvidenceInput): XenesisTurnRecord;
  failTurn(turnId: string, errorClass: string, message: string): XenesisTurnRecord;
  stopTurn(
    turnId: string,
    status: Extract<XenesisTurnStatus, 'blocked' | 'cancelled'>,
    reason: string,
  ): XenesisTurnRecord;
  completeTurn(turnId: string, response: string): XenesisTurnRecord;
  current(): XenesisTurnRecord | undefined;
  getTurn(turnId: string): XenesisTurnRecord | undefined;
  list(): XenesisTurnRecord[];
  events(turnId: string): XenesisTurnEvidenceRef[];
}

const DEFAULT_PROMPT_PREVIEW_MAX_CHARS = 240;
const HARD_PROMPT_PREVIEW_MAX_CHARS = 240;
const DEFAULT_RESPONSE_PREVIEW_MAX_CHARS = 1000;
const HARD_RESPONSE_PREVIEW_MAX_CHARS = 1000;
const DIAGNOSTIC_MESSAGE_PREVIEW_MAX_CHARS = 1000;
const DEFAULT_MAX_TURNS = 200;
const READBACK_MISSING_MESSAGE = 'readback evidence missing for a CR/MCP tool call';

export function createTurnLedger(options: TurnLedgerOptions = {}): XenesisTurnLedger {
  const turns = new Map<string, XenesisTurnRecord>();
  let currentTurnId: string | undefined;
  let nextId = 1;

  const now = options.now ?? (() => new Date().toISOString());
  const idFactory = options.idFactory ?? (() => `turn-${nextId++}`);
  const promptPreviewMaxChars = Math.min(
    options.promptPreviewMaxChars ?? DEFAULT_PROMPT_PREVIEW_MAX_CHARS,
    HARD_PROMPT_PREVIEW_MAX_CHARS,
  );
  const responsePreviewMaxChars = Math.min(
    options.responsePreviewMaxChars ?? DEFAULT_RESPONSE_PREVIEW_MAX_CHARS,
    HARD_RESPONSE_PREVIEW_MAX_CHARS,
  );
  const maxTurns = Math.max(1, Math.floor(options.maxTurns ?? DEFAULT_MAX_TURNS));
  const hardMaxTurns = Math.max(maxTurns + 1, maxTurns * 2);

  function requireTurn(turnId: string): XenesisTurnRecord {
    const turn = turns.get(turnId);
    if (!turn) throw new Error(`turn_not_found:${turnId}`);
    return turn;
  }

  function touch(turn: XenesisTurnRecord, timestamp = now()): void {
    turn.updatedAt = timestamp;
  }

  function setStatus(turnId: string, status: XenesisTurnStatus): XenesisTurnRecord {
    const turn = requireTurn(turnId);
    turn.status = status;
    touch(turn);
    return cloneTurn(turn);
  }

  function addEvidenceToTurn(turn: XenesisTurnRecord, evidence: XenesisTurnEvidenceInput): void {
    const candidate: XenesisTurnEvidenceRef = {
      ...evidence,
      at: evidence.at ?? now(),
      verified: evidence.verified ?? false,
    };
    const key = evidenceKey(candidate);
    if (!turn.evidence.some((item) => evidenceKey(item) === key)) {
      turn.evidence.push(candidate);
    }
  }

  function trimTurnStore(): void {
    while (turns.size > maxTurns) {
      const oldestEvictableTurnId = [...turns.entries()].find(
        ([turnId, turn]) => turnId !== currentTurnId && isTerminalStatus(turn.status),
      )?.[0];
      if (!oldestEvictableTurnId) break;
      turns.delete(oldestEvictableTurnId);
    }
    while (turns.size > hardMaxTurns) {
      const oldestOverflowTurnId = [...turns.keys()].find((turnId) => turnId !== currentTurnId);
      if (!oldestOverflowTurnId) return;
      turns.delete(oldestOverflowTurnId);
    }
  }

  return {
    startTurn(input) {
      const timestamp = now();
      const turn: XenesisTurnRecord = {
        id: idFactory(),
        sessionId: input.sessionId,
        ...(input.paneId !== undefined ? { paneId: input.paneId } : {}),
        status: 'queued',
        userPromptPreview: preview(input.prompt, promptPreviewMaxChars),
        provider: {
          requested: input.providerRequested,
          resolved: input.providerResolved,
          source: input.providerSource,
          ...(input.processModel !== undefined ? { processModel: input.processModel } : {}),
        },
        approvals: [],
        toolCalls: [],
        evidence: [],
        diagnostics: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      turns.set(turn.id, turn);
      currentTurnId = turn.id;
      trimTurnStore();
      return cloneTurn(turn);
    },

    markProviderStarting(turnId, provider) {
      const turn = requireTurn(turnId);
      if (provider?.resolved !== undefined) {
        turn.provider.resolved = provider.resolved;
      }
      if (provider && 'processModel' in provider) {
        if (provider.processModel === null) {
          delete turn.provider.processModel;
        } else if (provider.processModel !== undefined) {
          turn.provider.processModel = provider.processModel;
        }
      }
      turn.status = 'provider_starting';
      addEvidenceToTurn(turn, {
        kind: 'provider-started',
        summary: `provider ${turn.provider.resolved} started`,
        id: turn.provider.resolved,
        verified: true,
      });
      touch(turn);
      return cloneTurn(turn);
    },

    markRunning(turnId) {
      return setStatus(turnId, 'running');
    },

    markWaitingForApproval(turnId, approval) {
      const turn = requireTurn(turnId);
      const timestamp = approval.at ?? now();
      turn.status = 'waiting_for_approval';
      turn.approvals.push({ ...approval, at: timestamp, status: approval.status ?? 'pending' });
      addEvidenceToTurn(turn, {
        kind: 'approval-created',
        at: timestamp,
        id: approval.approvalId ?? approval.actionInboxItemId,
        path: approval.capabilityPath,
        summary: approval.summary,
        verified: true,
      });
      touch(turn, timestamp);
      return cloneTurn(turn);
    },

    resolveApproval(turnId, approval) {
      const turn = requireTurn(turnId);
      const timestamp = approval.at ?? now();
      const id = approval.approvalId ?? approval.actionInboxItemId;
      const existing = turn.approvals.find(
        (item) =>
          (approval.approvalId !== undefined && item.approvalId === approval.approvalId) ||
          (approval.actionInboxItemId !== undefined && item.actionInboxItemId === approval.actionInboxItemId),
      );
      const summary = approval.summary ?? `Approval ${approval.status}`;

      if (existing) {
        existing.status = approval.status;
        if (approval.capabilityPath !== undefined) existing.capabilityPath = approval.capabilityPath;
        if (approval.summary !== undefined) existing.summary = approval.summary;
      } else {
        turn.approvals.push({
          summary,
          at: timestamp,
          status: approval.status,
          ...(approval.approvalId !== undefined ? { approvalId: approval.approvalId } : {}),
          ...(approval.actionInboxItemId !== undefined ? { actionInboxItemId: approval.actionInboxItemId } : {}),
          ...(approval.capabilityPath !== undefined ? { capabilityPath: approval.capabilityPath } : {}),
        });
      }

      addEvidenceToTurn(turn, {
        kind: 'approval-resolved',
        at: timestamp,
        ...(id !== undefined ? { id } : {}),
        ...(approval.capabilityPath !== undefined ? { path: approval.capabilityPath } : {}),
        summary,
        verified: true,
      });
      touch(turn, timestamp);
      return cloneTurn(turn);
    },

    addToolCall(turnId, toolCall) {
      const turn = requireTurn(turnId);
      const timestamp = toolCall.at ?? now();
      turn.toolCalls.push({ ...toolCall, at: timestamp });
      touch(turn, timestamp);
      return cloneTurn(turn);
    },

    updateToolCall(turnId, toolCall) {
      const turn = requireTurn(turnId);
      const existing = turn.toolCalls.find(
        (item) =>
          (toolCall.id !== undefined && item.id === toolCall.id) ||
          (toolCall.id === undefined && item.name === toolCall.name && item.path === toolCall.path),
      );
      if (existing) {
        if (toolCall.status !== undefined) existing.status = toolCall.status;
        if (toolCall.summary !== undefined) existing.summary = toolCall.summary;
      }
      touch(turn);
      return cloneTurn(turn);
    },

    addEvidence(turnId, evidence) {
      const turn = requireTurn(turnId);
      addEvidenceToTurn(turn, evidence);
      touch(turn);
      return cloneTurn(turn);
    },

    failTurn(turnId, errorClass, message) {
      const turn = requireTurn(turnId);
      const timestamp = now();
      const messagePreview = preview(message, DIAGNOSTIC_MESSAGE_PREVIEW_MAX_CHARS);
      turn.status = 'failed';
      turn.failedAt = timestamp;
      turn.result = { ...(turn.result ?? {}), errorClass, message: messagePreview };
      turn.diagnostics.push({
        level: 'error',
        errorClass,
        message: messagePreview,
        at: timestamp,
      });
      touch(turn, timestamp);
      trimTurnStore();
      return cloneTurn(turn);
    },

    stopTurn(turnId, status, reason) {
      const turn = requireTurn(turnId);
      const timestamp = now();
      const messagePreview = preview(reason, DIAGNOSTIC_MESSAGE_PREVIEW_MAX_CHARS);
      turn.status = status;
      if (status === 'cancelled') {
        turn.result = { ...(turn.result ?? {}), finishReason: 'cancelled', message: messagePreview };
      } else {
        turn.result = { ...(turn.result ?? {}), finishReason: 'blocked', message: messagePreview };
      }
      turn.diagnostics.push({
        level: status === 'cancelled' ? 'info' : 'warning',
        message: messagePreview,
        at: timestamp,
      });
      touch(turn, timestamp);
      trimTurnStore();
      return cloneTurn(turn);
    },

    completeTurn(turnId, response) {
      const turn = requireTurn(turnId);
      const responsePreview = preview(response, responsePreviewMaxChars);
      turn.responsePreview = responsePreview;

      if (canComplete(turn)) {
        const timestamp = now();
        turn.status = 'completed';
        turn.completedAt = timestamp;
        turn.result = {
          ...(turn.result ?? {}),
          responsePreview,
          finishReason: 'completed',
        };
        addEvidenceToTurn(turn, {
          kind: 'final-response',
          at: timestamp,
          summary: 'assistant final response',
          verified: true,
        });
        touch(turn, timestamp);
      } else {
        const timestamp = now();
        turn.status = 'blocked';
        turn.result = {
          ...(turn.result ?? {}),
          responsePreview,
          finishReason: 'readback_missing',
          message: READBACK_MISSING_MESSAGE,
        };
        if (!turn.diagnostics.some((item) => item.message === READBACK_MISSING_MESSAGE)) {
          turn.diagnostics.push({
            level: 'warning',
            message: READBACK_MISSING_MESSAGE,
            at: timestamp,
          });
        }
        touch(turn, timestamp);
      }

      trimTurnStore();
      return cloneTurn(turn);
    },

    current() {
      if (!currentTurnId) return undefined;
      const turn = turns.get(currentTurnId);
      return turn ? cloneTurn(turn) : undefined;
    },

    getTurn(turnId) {
      const turn = turns.get(turnId);
      return turn ? cloneTurn(turn) : undefined;
    },

    list() {
      return [...turns.values()].map(cloneTurn);
    },

    events(turnId) {
      const turn = turns.get(turnId);
      return turn ? clone(turn.evidence) : [];
    },
  };
}

function isTerminalStatus(status: XenesisTurnStatus): boolean {
  return status === 'blocked' || status === 'cancelled' || status === 'completed' || status === 'failed';
}

function canComplete(turn: XenesisTurnRecord): boolean {
  const gatedCalls = turn.evidence.filter((item) => isReadbackGatedEvidence(item));
  if (gatedCalls.length === 0) return true;
  return gatedCalls.every((item) => hasMatchingVerifiedReadback(turn, item));
}

function isReadbackGatedEvidence(evidence: XenesisTurnEvidenceRef): boolean {
  return evidence.kind === 'cr-capability-called' || evidence.kind === 'mcp-tool-called';
}

function hasMatchingVerifiedReadback(turn: XenesisTurnRecord, gated: XenesisTurnEvidenceRef): boolean {
  if (gated.id !== undefined && gated.id.length > 0) {
    return turn.evidence.some((item) => item.kind === 'readback' && item.verified === true && item.id === gated.id);
  }
  if (gated.path !== undefined && gated.path.length > 0) {
    return turn.evidence.some((item) => item.kind === 'readback' && item.verified === true && item.path === gated.path);
  }
  return false;
}

function evidenceKey(evidence: XenesisTurnEvidenceRef): string {
  return [evidence.kind, evidence.path ?? '', evidence.id ?? '', evidence.summary].join('\u001f');
}

function preview(value: string, maxChars: number): string {
  if (maxChars <= 0) return '';
  if (value.length <= maxChars) return value;
  if (maxChars <= 3) return '.'.repeat(maxChars);
  return `${value.slice(0, maxChars - 3)}...`;
}

function cloneTurn(turn: XenesisTurnRecord): XenesisTurnRecord {
  return clone(turn);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
