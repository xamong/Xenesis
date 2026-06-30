import type {
  LedgerAssistantMessage,
  LedgerEntry,
  LedgerPermissionAudit,
  LedgerRecoveryOverlay,
  LedgerToolChoiceAudit,
  LedgerToolPolicyAudit,
  LedgerToolResult,
  LedgerUserMessage,
} from './messageTypes.js';

export type AppendLedgerUserMessage = Omit<LedgerUserMessage, 'kind'>;
export type AppendLedgerAssistantMessage = Omit<LedgerAssistantMessage, 'kind'>;
export type AppendLedgerToolResult = Omit<LedgerToolResult, 'kind'>;
export type AppendLedgerRecoveryOverlay = Omit<LedgerRecoveryOverlay, 'kind'>;
export type AppendLedgerToolPolicyAudit = Omit<LedgerToolPolicyAudit, 'kind'>;
export type AppendLedgerToolChoiceAudit = Omit<LedgerToolChoiceAudit, 'kind'>;
export type AppendLedgerPermissionAudit = Omit<LedgerPermissionAudit, 'kind'>;

export class MessageLedger {
  private readonly entries: LedgerEntry[] = [];

  append(entry: LedgerEntry) {
    this.entries.push(structuredClone(entry));
  }

  appendUserMessage(entry: AppendLedgerUserMessage) {
    this.append({ kind: 'user_message', ...entry });
  }

  appendAssistantMessage(entry: AppendLedgerAssistantMessage) {
    this.append({ kind: 'assistant_message', ...entry });
  }

  appendToolResult(entry: AppendLedgerToolResult) {
    this.append({ kind: 'tool_result', ...entry });
  }

  appendRecoveryOverlay(entry: AppendLedgerRecoveryOverlay) {
    this.append({ kind: 'recovery_overlay', ...entry });
  }

  appendToolPolicyAudit(entry: AppendLedgerToolPolicyAudit) {
    this.append({ kind: 'tool_policy_audit', ...entry });
  }

  appendToolChoiceAudit(entry: AppendLedgerToolChoiceAudit) {
    this.append({ kind: 'tool_choice_audit', ...entry });
  }

  appendPermissionAudit(entry: AppendLedgerPermissionAudit) {
    this.append({ kind: 'permission_audit', ...entry });
  }

  snapshot(): LedgerEntry[] {
    return structuredClone(this.entries);
  }
}
