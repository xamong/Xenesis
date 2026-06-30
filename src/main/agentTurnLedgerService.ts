import type {
  XenesisTurnDiagnostic,
  XenesisTurnEvidenceRef,
  XenesisTurnLedger,
  XenesisTurnRecord,
  XenesisTurnToolCallRef,
} from '../../packages/xenesis/src/core/turnLedger';

function readAgentTurnId(args: unknown): string {
  if (!args || typeof args !== 'object') return '';
  const id = (args as { id?: unknown }).id;
  return typeof id === 'string' ? id : '';
}

function readAgentTurnEvents(ledger: XenesisTurnLedger, id: string) {
  try {
    return ledger.events(id).map(redactAgentTurnEvidenceForCr);
  } catch {
    return [];
  }
}

const PUBLIC_STRUCTURAL_ID_FIELDS = new Set(['id', 'turnId']);
const SECRET_FIELD_NAME_PATTERN =
  /(?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|client[_-]?secret|token|secret|password|passwd|authorization)/i;

function redactAgentTurnText(value: string, options: { redactBareUuid?: boolean } = {}): string {
  const redacted = value
    .replace(/\b(Authorization\s*[:=]\s*)(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [redacted]')
    .replace(/\bBasic\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Basic [redacted]')
    .replace(
      /\b((?:[A-Za-z0-9_.-]*(?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|client[_-]?secret|token|secret|password|passwd|authorization)[A-Za-z0-9_.-]*)\s*[:=]\s*")([^"]*)(")/gi,
      '$1[redacted]$3',
    )
    .replace(
      /\b((?:[A-Za-z0-9_.-]*(?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|client[_-]?secret|token|secret|password|passwd|authorization)[A-Za-z0-9_.-]*)\s*[:=]\s*')([^']*)(')/gi,
      '$1[redacted]$3',
    )
    .replace(
      /\b((?:[A-Za-z0-9_.-]*(?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|client[_-]?secret|token|secret|password|passwd|authorization)[A-Za-z0-9_.-]*)\s*[:=]\s*)[^\s"',}<>]+/gi,
      '$1[redacted]',
    )
    .replace(
      /(["'](?:[A-Za-z0-9_.-]*(?:api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|client[_-]?secret|token|secret|password|passwd|authorization)[A-Za-z0-9_.-]*)["']\s*:\s*["'])[^"']+(["'])/gi,
      '$1[redacted]$2',
    )
    .replace(
      /\b((?:approval[_-]?id|approvalId|actionInboxItem(?:\.id|Id)?|action[_-]?inbox[_-]?item[_-]?id)\s*[:=]\s*["']?)[^\s"',}<>]+(["']?)/gi,
      '$1[redacted]$2',
    )
    .replace(/\b([A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD)\s*=\s*)[^\s"'<>]+/gi, '$1[redacted]')
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{6,}|gh[pousr]_[A-Za-z0-9_]{8,}|github_pat_[A-Za-z0-9_]{8,}|glpat-[A-Za-z0-9_-]{8,}|xox[abprs]-[A-Za-z0-9-]{8,}|AKIA[0-9A-Z]{16}|(?:apr|approval|ain|inbox|actionInbox)[_-][A-Za-z0-9_-]{4,})\b/g,
      '[redacted secret]',
    );
  if (!options.redactBareUuid) return redacted;
  return redacted.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    '[redacted id]',
  );
}

function redactAgentTurnValueForCr(value: unknown, key?: string, depth = 0): unknown {
  const isPublicTopLevelId = depth === 1 && PUBLIC_STRUCTURAL_ID_FIELDS.has(key ?? '');
  if (key && PUBLIC_STRUCTURAL_ID_FIELDS.has(key) && !isPublicTopLevelId) return '[redacted id]';
  if (key && SECRET_FIELD_NAME_PATTERN.test(key)) return '[redacted]';

  if (typeof value === 'string') {
    return redactAgentTurnText(value, { redactBareUuid: !isPublicTopLevelId });
  }
  if (Array.isArray(value)) return value.map((item) => redactAgentTurnValueForCr(item, undefined, depth + 1));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, item]) => [entryKey, redactAgentTurnValueForCr(item, entryKey, depth + 1)]),
  );
}

function redactAgentTurnEvidenceForCr(evidence: XenesisTurnEvidenceRef): Omit<XenesisTurnEvidenceRef, 'id'> {
  const { id: _id, summary, ...safeEvidence } = evidence;
  return redactAgentTurnValueForCr({
    ...safeEvidence,
    summary: redactAgentTurnText(summary),
  }) as Omit<XenesisTurnEvidenceRef, 'id'>;
}

function redactAgentTurnToolCallForCr(toolCall: XenesisTurnToolCallRef): Omit<XenesisTurnToolCallRef, 'id'> {
  const { id: _id, summary, ...safeToolCall } = toolCall;
  return redactAgentTurnValueForCr({
    ...safeToolCall,
    ...(summary !== undefined ? { summary: redactAgentTurnText(summary) } : {}),
  }) as Omit<XenesisTurnToolCallRef, 'id'>;
}

function redactAgentTurnDiagnosticForCr(diagnostic: XenesisTurnDiagnostic): XenesisTurnDiagnostic {
  return redactAgentTurnValueForCr({
    ...diagnostic,
    message: redactAgentTurnText(diagnostic.message),
  }) as XenesisTurnDiagnostic;
}

function redactAgentTurnRecordForCr(turn: XenesisTurnRecord): Record<string, unknown> {
  const { sessionId: _sessionId, paneId: _paneId, ...publicTurn } = turn;
  return redactAgentTurnValueForCr({
    ...publicTurn,
    userPromptPreview: redactAgentTurnText(turn.userPromptPreview),
    ...(turn.responsePreview !== undefined ? { responsePreview: redactAgentTurnText(turn.responsePreview) } : {}),
    approvals: turn.approvals.map(
      ({ approvalId: _approvalId, actionInboxItemId: _actionInboxItemId, summary, ...approval }) => ({
        ...approval,
        summary: redactAgentTurnText(summary),
      }),
    ),
    toolCalls: turn.toolCalls.map(redactAgentTurnToolCallForCr),
    evidence: turn.evidence.map(redactAgentTurnEvidenceForCr),
    diagnostics: turn.diagnostics.map(redactAgentTurnDiagnosticForCr),
    ...(turn.result
      ? {
          result: {
            ...turn.result,
            responsePreview:
              turn.result.responsePreview === undefined ? undefined : redactAgentTurnText(turn.result.responsePreview),
            message: turn.result.message === undefined ? undefined : redactAgentTurnText(turn.result.message),
          },
        }
      : {}),
  }) as Record<string, unknown>;
}

export function createAgentTurnLedgerReadbackApi(ledger: XenesisTurnLedger) {
  return {
    agentTurnsList: () => ({ ok: true, turns: ledger.list().map(redactAgentTurnRecordForCr) }),
    agentTurnsCurrent: () => {
      const turn = ledger.current();
      return { ok: true, turn: turn ? redactAgentTurnRecordForCr(turn) : null };
    },
    agentTurnsGet: (args?: unknown) => {
      const id = readAgentTurnId(args);
      const turn = id ? ledger.getTurn(id) : undefined;
      return { ok: true, turn: turn ? redactAgentTurnRecordForCr(turn) : null };
    },
    agentTurnEvents: (args?: unknown) => {
      const id = readAgentTurnId(args);
      return { ok: true, events: id ? readAgentTurnEvents(ledger, id) : [] };
    },
  };
}
