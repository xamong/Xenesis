import type { ToolCall } from "../messages.js";
import type { LedgerRecoveryOverlay } from "../messages/index.js";

export type KernelFailureReason =
  | "missing_tool_executor"
  | "tool_execution_failed"
  | "tool_unavailable"
  | "invalid_tool_input";

export interface KernelFailureOverlayOptions {
  id: string;
  reason: KernelFailureReason;
  toolCall: ToolCall;
  errorMessage?: string;
}

export function recoveryOverlayForKernelFailure(
  options: KernelFailureOverlayOptions
): LedgerRecoveryOverlay {
  const base = {
    kind: "recovery_overlay" as const,
    id: options.id,
    reason: options.reason,
    toolCallId: options.toolCall.id,
    toolName: options.toolCall.name
  };

  if (options.reason === "missing_tool_executor") {
    return {
      ...base,
      content: `Tool \`${options.toolCall.name}\` could not run because no kernel tool executor is configured.`
    };
  }

  if (options.reason === "tool_unavailable") {
    return {
      ...base,
      content: `Tool \`${options.toolCall.name}\` is not available to the kernel tool registry executor.`
    };
  }

  if (options.reason === "invalid_tool_input") {
    return {
      ...base,
      content: `Tool \`${options.toolCall.name}\` received invalid input before execution: ${options.errorMessage ?? "unknown validation error"}`
    };
  }

  return {
    ...base,
    content: `Tool \`${options.toolCall.name}\` failed before a result could be committed: ${options.errorMessage ?? "unknown error"}`
  };
}
