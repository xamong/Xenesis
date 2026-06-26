import type { AgentMessageAttachment, ToolCall } from "../messages.js";

export type LedgerEntry =
  | { kind: "user_message"; id: string; content: string }
  | { kind: "assistant_message"; id: string; content: string; toolCalls?: ToolCall[] }
  | { kind: "tool_result"; id: string; toolCallId: string; name: string; content: string; attachments?: AgentMessageAttachment[] }
  | {
      kind: "recovery_overlay";
      id: string;
      reason: string;
      content: string;
      toolCallId?: string;
      toolName?: string;
    }
  | {
      kind: "tool_policy_audit";
      id: string;
      toolCallId: string;
      name: string;
      policyName: string;
      status: "allow" | "deny";
      reason: string;
      nextAction?: string;
      requiredBefore: string[];
      missingBefore: string[];
      requiredBeforeAny: string[];
      missingBeforeAny: string[];
      priorityTools: string[];
    }
  | {
      kind: "tool_choice_audit";
      id: string;
      toolCallId: string;
      name: string;
      status: "followed_priority" | "missed_priority";
      reason: string;
      priorityReasons: string[];
      priorityTools: string[];
      unmetPriorityTools: string[];
    }
  | {
      kind: "permission_audit";
      id: string;
      toolCallId: string;
      name: string;
      status: "allow" | "ask" | "deny";
      reason: string;
      source: string;
      riskLevel: "low" | "medium" | "high";
      normalizedMode: string;
      approved?: boolean;
    }
  | { kind: "run_state"; id: string; state: string; summary?: string };

export type LedgerUserMessage = Extract<LedgerEntry, { kind: "user_message" }>;
export type LedgerAssistantMessage = Extract<LedgerEntry, { kind: "assistant_message" }>;
export type LedgerToolResult = Extract<LedgerEntry, { kind: "tool_result" }>;
export type LedgerRecoveryOverlay = Extract<LedgerEntry, { kind: "recovery_overlay" }>;
export type LedgerToolPolicyAudit = Extract<LedgerEntry, { kind: "tool_policy_audit" }>;
export type LedgerToolChoiceAudit = Extract<LedgerEntry, { kind: "tool_choice_audit" }>;
export type LedgerPermissionAudit = Extract<LedgerEntry, { kind: "permission_audit" }>;
