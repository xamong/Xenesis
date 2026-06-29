import type { ToolExecutionPolicy } from "../core/AgentRunner.js";
import type { HandoffPriorityPolicy } from "../orchestration/index.js";
import type { WorkflowSystemMessage } from "./types.js";

export type XenisTaskPolicyId =
  | "xd-command"
  | "desk-general";

export interface XenisTaskPolicy {
  id: XenisTaskPolicyId;
  label: string;
  priorityTools: string[];
  toolExecutionPolicy: ToolExecutionPolicy;
  systemMessage: WorkflowSystemMessage;
}

const xenisHandoffPriority: HandoffPriorityPolicy = {
  defaultPriority: 5,
  urgentPriority: 50,
  taskTypePriorities: {
    verify: 25,
    repair: 35,
    review: 12,
    research: 10,
    implement: 15
  }
};

function policyMessage(id: XenisTaskPolicyId, label: string, priorityTools: string[], rules: string[]): WorkflowSystemMessage {
  return {
    role: "system",
    content: [
      `Xenis task policy: ${id}`,
      `Task focus: ${label}`,
      `Tool priority: ${priorityTools.join(" -> ")}`,
      ...rules
    ].join("\n")
  };
}

function toolExecutionPolicy(
  id: XenisTaskPolicyId,
  priorityTools: string[],
  requiredBefore: Record<string, string[]> = {}
): ToolExecutionPolicy {
  return {
    name: `xenis:${id}`,
    priorityTools,
    handoffPriority: xenisHandoffPriority,
    ...(Object.keys(requiredBefore).length > 0 ? { requiredBefore } : {})
  };
}

export function resolveXenisTaskPolicy(prompt: string): XenisTaskPolicy {
  const trimmedPrompt = prompt.trim();
  const lowerPrompt = trimmedPrompt.toLowerCase();

  if (lowerPrompt === "/xd" || lowerPrompt.startsWith("/xd ") || lowerPrompt.startsWith("xd.")) {
    const priorityTools = [
      "desk_xd_command",
      "desk_capabilities",
      "desk_call_capability",
      "desk_state"
    ];
    return {
      id: "xd-command",
      label: "Explicit /xd or Capability Registry command",
      priorityTools,
      toolExecutionPolicy: toolExecutionPolicy("xd-command", priorityTools, {
        desk_call_capability: ["desk_capabilities"]
      }),
      systemMessage: policyMessage("xd-command", "Explicit /xd or Capability Registry command", priorityTools, [
        "When the user gives a literal `/xd ...` command, call `desk_xd_command` with that command instead of explaining it.",
        "For low-level `xd.*` paths, use `desk_capabilities` to inspect the path when uncertain, then use `desk_call_capability` or `/xd call` through `desk_xd_command`.",
        "Keep approval-gated control/write/execute actions inside the Desk bridge approval flow."
      ])
    };
  }

  const priorityTools = [
    "desk_state",
    "desk_active_context",
    "desk_capabilities"
  ];
  return {
    id: "desk-general",
    label: "General Desk orchestration",
    priorityTools,
    toolExecutionPolicy: toolExecutionPolicy("desk-general", priorityTools),
    systemMessage: policyMessage("desk-general", "General Desk orchestration", priorityTools, [
      "Use `desk_state` and `desk_active_context` before generic workspace tools when a request may depend on Xenesis Desk state.",
      "Use typed `desk_*` tools before raw capability calls whenever one matches the task.",
      "Use `desk_capabilities` only when a needed typed tool does not exist."
    ])
  };
}
