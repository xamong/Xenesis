import type { ApprovalMode } from "../config/index.js";
import type { AgentIntent } from "./events.js";
import type { AgentRunMode } from "./AgentRuntimeFactory.js";

export interface IntentRoute {
  intent: AgentIntent;
  mode?: AgentRunMode;
  approvalMode?: ApprovalMode;
  reason: string;
}

export function classifyPromptIntent(_prompt: string, explicitMode?: AgentRunMode): IntentRoute {
  if (explicitMode) {
    return {
      intent: explicitMode,
      mode: explicitMode,
      reason: "explicit mode selected"
    };
  }

  return {
    intent: "default",
    reason: "no explicit mode selected"
  };
}
