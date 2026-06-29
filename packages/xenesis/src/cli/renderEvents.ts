import type { AgentRunEvent } from "../core/events.js";

const MAX_RENDERED_TOOL_RESULT_CHARS = 6_000;

function truncateCliOutput(content: string, maxChars = MAX_RENDERED_TOOL_RESULT_CHARS) {
  if (content.length <= maxChars) return content;
  const headLength = Math.floor(maxChars * 0.65);
  const tailLength = maxChars - headLength;
  const omitted = content.length - headLength - tailLength;
  return [
    content.slice(0, headLength),
    "",
    `[cli output truncated: omitted ${omitted} characters from ${content.length}]`,
    "",
    content.slice(content.length - tailLength)
  ].join("\n");
}

export function renderEvent(event: AgentRunEvent): string {
  switch (event.type) {
    case "user_message":
      return "";
    case "assistant_message":
      return event.message.content;
    case "assistant_delta":
      return "";
    case "provider_retry":
      return `provider retry: ${event.provider} attempt ${event.attempt}/${event.maxRetries} (${event.message})`;
    case "provider_fallback":
      return `provider fallback: ${event.from} -> ${event.to} (${event.message})`;
    case "context_recovery":
      return `context recovery: compacting after provider context limit (${event.message})`;
    case "context_compact":
      return `context compacted: ${event.originalMessages} -> ${event.compactedMessages} messages`;
    case "artifact":
      return "";
    case "workspace_change":
      return "";
    case "run_state":
      return "";
    case "run_snapshot":
      return "";
    case "workflow_step":
      return "";
    case "run_stage":
      return "";
    case "context_source":
      return "";
    case "tool_call":
      return `tool: ${event.toolCall.name}`;
    case "tool_result_stored":
      return "";
    case "tool_result":
      return truncateCliOutput(event.message.content);
    case "tool_policy_snapshot":
      return "";
    case "tool_policy_audit":
      return event.status === "deny"
        ? `tool policy denied: ${event.name} (${event.reason})${event.nextAction ? ` next: ${event.nextAction}` : ""}`
        : "";
    case "tool_choice_audit":
      return event.status === "missed_priority"
        ? `tool choice missed priority: ${event.name} before ${event.unmetPriorityTools.join(", ")}`
        : "";
    case "permission_request":
      return `approval required for ${event.request.name}: ${event.request.reason} risk=${event.request.riskLevel}; target=${event.request.summary}`;
    case "approval_resolved":
      return `approval ${event.decision} for tool call ${event.toolCallId} (approved=${event.approved})`;
    case "permission_audit":
      return "";
    case "tool_event":
      if (event.event.type === "ask") return `? ${event.event.question}`;
      if (event.event.type === "external_content_warning") {
        return `tool result warning: ${event.event.toolName}: ${event.event.warnings.join(" ")}`;
      }
      return "";
    case "done":
      return "";
    case "incomplete_run":
      return "";
    case "stopped":
      return `stopped: ${event.reason} after ${event.turns} turns`;
    case "verification_result":
      return `verification: ${event.status} (attempt ${event.attempt}/${event.maxAttempts})${
        event.failedCommands.length > 0 ? ` failed: ${event.failedCommands.join(", ")}` : ""
      }`;
    case "repair_decision":
      return event.status === "blocked" ? `repair blocked: ${event.reason}` : "";
    case "run_self_review":
      return `self review: ${event.status} score=${event.score} findings=${event.findings.length}${
        event.nextActions.length > 0 ? ` next=${event.nextActions.join(",")}` : ""
      }`;
    case "error":
      return `error: ${event.message}`;
  }
}
