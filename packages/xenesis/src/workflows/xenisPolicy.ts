import type { ToolExecutionPolicy } from "../core/AgentRunner.js";
import type { HandoffPriorityPolicy } from "../orchestration/index.js";
import type { WorkflowSystemMessage } from "./types.js";

export type XenisTaskPolicyId =
  | "xd-command"
  | "visible-subagent"
  | "long-running-handoff"
  | "context-memory"
  | "safe-file-edit"
  | "ui-inspection"
  | "terminal-followup"
  | "desk-natural-control"
  | "desk-troubleshooting"
  | "current-context"
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

function normalizedPrompt(prompt: string) {
  return prompt.toLowerCase();
}

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

function isNaturalDeskControlPrompt(text: string) {
  const hasDeskTarget = includesAny(text, [
    "xenesis desk",
    "desk",
    "데스크",
    "패널",
    "pane",
    "panel",
    "탭",
    "tab",
    "도킹",
    "dock",
    "창",
    "window",
    "명령 팔레트",
    "커맨드 팔레트",
    "command palette",
    "capability",
    "capabilities",
    "cr",
    "레지스트리",
    "registry"
  ]);
  if (!hasDeskTarget) return false;

  return includesAny(text, [
    "열어",
    "열기",
    "실행",
    "띄워",
    "보여",
    "목록",
    "닫아",
    "닫기",
    "중지",
    "정지",
    "도킹",
    "이동",
    "분리",
    "합쳐",
    "병합",
    "포커스",
    "선택해",
    "호출",
    "call",
    "run",
    "open",
    "close",
    "dock",
    "detach",
    "focus",
    "move",
    "list",
    "show",
    "execute"
  ]);
}

function isBrowserExplorerStatusPrompt(text: string) {
  const asksForState = includesAny(text, [
    "확인",
    "알려",
    "몇",
    "개수",
    "상태",
    "목록",
    "위치",
    "주소",
    "current",
    "status",
    "count",
    "where",
    "location",
    "url",
    "list"
  ]);
  if (!asksForState) return false;

  return includesAny(text, [
    "브라우저 탭",
    "브라우저 창",
    "브라우저 목록",
    "열린 브라우저",
    "browser tab",
    "browser pane",
    "browser window",
    "open browser",
    "파일 탐색기",
    "탐색기",
    "file explorer",
    "explorer root",
    "selected path"
  ]);
}

function isLongRunningHandoffPrompt(text: string) {
  const broadScope = includesAny(text, [
    "전체",
    "모든",
    "대규모",
    "여러",
    "많은",
    "프로젝트",
    "마이그레이션",
    "migration",
    "migrate",
    "refactor all",
    "whole project",
    "all files",
    "audit",
    "sweep"
  ]);
  const stagedWork = includesAny(text, [
    "단계별",
    "차근차근",
    "순서대로",
    "일괄",
    "끝까지",
    "완료",
    "검증",
    "보고",
    "수정",
    "구현",
    "정리",
    "repair",
    "verify",
    "report",
    "complete",
    "finish",
    "step by step"
  ]);

  return broadScope && stagedWork;
}

function isVisibleSubagentPrompt(text: string) {
  const mentionsSubagent = includesAny(text, [
    "서브에이전트",
    "하위 에이전트",
    "subagent",
    "sub-agent",
    "delegated agent",
    "worker agent"
  ]);
  const wantsVisibleTerminal = includesAny(text, [
    "별도 터미널",
    "터미널 창",
    "터미널에서",
    "작업내역",
    "진행상황",
    "보고 싶",
    "visible",
    "separate terminal",
    "own terminal",
    "terminal tab",
    "watch"
  ]);
  return mentionsSubagent && wantsVisibleTerminal;
}

function isMemoryPrompt(text: string) {
  const mentionsMemory = includesAny(text, [
    "기억",
    "메모리",
    "장기기억",
    "memory",
    "remember",
    "recall"
  ]);
  if (!mentionsMemory) return false;

  return includesAny(text, [
    "기억해",
    "기억해줘",
    "기억해둬",
    "기억해 둬",
    "저장",
    "검색",
    "찾아",
    "찾아줘",
    "확인",
    "내용",
    "뭐",
    "무엇",
    "remember",
    "recall",
    "search",
    "save",
    "store",
    "stored"
  ]);
}

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

function naturalDeskControlPolicy(): XenisTaskPolicy {
  const priorityTools = [
    "desk_browser_list",
    "desk_explorer_state",
    "desk_active_context",
    "desk_context_actions",
    "desk_command_palette",
    "desk_run_command_palette",
    "desk_capabilities",
    "desk_call_capability",
    "desk_state"
  ];
  return {
    id: "desk-natural-control",
    label: "Natural-language Desk control",
    priorityTools,
    toolExecutionPolicy: toolExecutionPolicy("desk-natural-control", priorityTools, {
      desk_call_capability: ["desk_capabilities"],
      desk_run_command_palette: ["desk_command_palette"]
    }),
    systemMessage: policyMessage("desk-natural-control", "Natural-language Desk control", priorityTools, [
      "Translate the user's natural-language Desk request into typed Desk tools or Capability Registry calls; do not require the user to write `/xd`.",
      "Use `desk_browser_list` for natural-language questions about open browser tabs, browser pane count, or browser URLs.",
      "Use `desk_explorer_state` for natural-language questions about the file explorer, explorer root, current location, or selected path.",
      "Use `desk_active_context` and `desk_context_actions` first when the request references the current pane, panel, tab, or visible Desk state.",
      "Use `desk_command_palette` before `desk_run_command_palette` when the request mentions the command palette or an app command.",
      "Use `desk_capabilities` before `desk_call_capability` when a typed Desk tool does not cover the requested action.",
      "Do not use generic file read, shell, workspace switching, or approval flows to answer Desk UI state questions.",
      "Keep approval-gated control/write/execute actions inside the Desk bridge approval flow.",
      "Do not expose internal tool names, MCP names, CR/Capability Registry terminology, bridge terminology, Capability Registry paths, approval ids, raw bridge errors, or test markers in user-facing progress updates or final answers unless the user explicitly asks for diagnostics.",
      "Translate internal Desk reads into product language only: browser tab counts, file explorer open/closed state, current workspace, selected path, pane state, or terminal output."
    ])
  };
}

function contextMemoryPolicy(): XenisTaskPolicy {
  const priorityTools = [
    "memory",
    "desk_active_context",
    "desk_state"
  ];
  return {
    id: "context-memory",
    label: "Durable memory request",
    priorityTools,
    toolExecutionPolicy: toolExecutionPolicy("context-memory", priorityTools),
    systemMessage: policyMessage("context-memory", "Durable memory request", priorityTools, [
      "The user is asking to save, search, recall, inspect, or manage durable memory.",
      "Use the `memory` tool before answering. For explicit remember/save requests, call `memory` with action `save` or `propose` before finalizing.",
      "For memory search/recall/list/history requests, call `memory` with action `search`, `list`, `history`, or `proposals` before finalizing.",
      "Do not answer a durable-memory request using only the current conversation transcript. If the memory tool is unavailable or denied, report that concrete limitation.",
      "Do not store secrets, credentials, or sensitive personal details as active memory without an explicit confirmation path."
    ])
  };
}

export function resolveXenisTaskPolicy(prompt: string): XenisTaskPolicy {
  const text = normalizedPrompt(prompt);

  if (/(^|\s)\/xd(\s|$)/.test(text) || /(^|\s)xd\.[a-z0-9_.-]+/i.test(prompt)) {
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

  if (isVisibleSubagentPrompt(text)) {
    const priorityTools = [
      "desk_active_context",
      "desk_subagent_start",
      "desk_subagent_list",
      "desk_subagent_tail",
      "desk_subagent_stop",
      "desk_state"
    ];
    return {
      id: "visible-subagent",
      label: "Desk-visible subagent terminals",
      priorityTools,
      toolExecutionPolicy: toolExecutionPolicy("visible-subagent", priorityTools, {
        desk_subagent_tail: ["desk_subagent_list"],
        desk_subagent_stop: ["desk_subagent_tail"]
      }),
      systemMessage: policyMessage("visible-subagent", "Desk-visible subagent terminals", priorityTools, [
        "Use `desk_active_context` first to identify the parent Desk context and active terminal when available.",
        "Use `desk_subagent_start` for delegated work that the user wants to observe in a separate Xenesis Desk terminal.",
        "Pass `parentTermId` when the parent terminal id is known, and set a short `title` that summarizes the delegated task.",
        "Use `desk_subagent_list` and `desk_subagent_tail` to inspect progress before summarizing or stopping a delegated terminal.",
        "Use `desk_subagent_stop` only when the user asks to cancel/stop or the delegated task is clearly stuck."
      ])
    };
  }

  if (isLongRunningHandoffPrompt(text)) {
    const priorityTools = [
      "desk_active_context",
      "task_handoff",
      "agent_task",
      "todo",
      "desk_state"
    ];
    return {
      id: "long-running-handoff",
      label: "Long-running dependency handoff",
      priorityTools,
      toolExecutionPolicy: toolExecutionPolicy("long-running-handoff", priorityTools),
      systemMessage: policyMessage("long-running-handoff", "Long-running dependency handoff", priorityTools, [
        "Use `desk_active_context` first when the request depends on the visible Desk workspace, selected folder, selected file, or active pane.",
        "Use `todo` for the immediate coordination checklist.",
        "Use `task_handoff` to queue durable dependency-aware stages.",
        "Prefer handoff when work is too broad, long, or sequential to complete reliably inside one response.",
        "Use `dependsOnLabels` for inspect -> implement -> verify -> report chains.",
        "Omit dependencies for independent research or inspection branches so the worker can run them earlier.",
        "Use `agent_task` to inspect, retry, cancel, or summarize queued work after handoff.",
        "Keep the current turn focused on decomposition, risk checks, and the next visible user update rather than attempting all queued stages inline."
      ])
    };
  }

  if (isMemoryPrompt(text)) {
    return contextMemoryPolicy();
  }

  if (includesAny(text, [
    "수정",
    "편집",
    "변경",
    "저장",
    "고쳐",
    "반영",
    "write",
    "edit",
    "modify",
    "patch",
    "save",
    "apply"
  ])) {
    const priorityTools = [
      "desk_active_context",
      "desk_safe_file_apply",
      "desk_safe_file_preview",
      "desk_recent_diagnostics"
    ];
    return {
      id: "safe-file-edit",
      label: "Desk-visible file modification",
      priorityTools,
      toolExecutionPolicy: toolExecutionPolicy("safe-file-edit", priorityTools),
      systemMessage: policyMessage("safe-file-edit", "Desk-visible file modification", priorityTools, [
        "Use `desk_active_context` to identify the selected file or pane before editing Desk-visible content.",
        "For normal file generation, saving, or updates, use `desk_safe_file_apply` so the actual write is approved and executed.",
        "Use `desk_safe_file_preview` only when the user explicitly asks for preview, review, diff, or a staged edit flow before applying.",
        "Do not set file-size limits from requested character counts or design complexity requirements; omit size caps unless the user explicitly asks for a safety cap.",
        "If the preview or apply step fails, use `desk_recent_diagnostics` before trying a different write path."
      ])
    };
  }

  if (isBrowserExplorerStatusPrompt(text)) {
    return naturalDeskControlPolicy();
  }

  if (includesAny(text, [
    "화면",
    "ui",
    "렌더",
    "렌더링",
    "스크린샷",
    "보이는",
    "깨졌",
    "브라우저",
    "screenshot",
    "render",
    "visible",
    "layout",
    "browser"
  ])) {
    const priorityTools = [
      "desk_active_context",
      "desk_playwright_snapshot",
      "desk_recent_diagnostics"
    ];
    return {
      id: "ui-inspection",
      label: "Visible UI inspection",
      priorityTools,
      toolExecutionPolicy: toolExecutionPolicy("ui-inspection", priorityTools),
      systemMessage: policyMessage("ui-inspection", "Visible UI inspection", priorityTools, [
        "Use `desk_active_context` to understand the visible pane or target before inspecting UI state.",
        "Use `desk_playwright_snapshot` before describing or validating rendered UI state.",
        "Use `desk_recent_diagnostics` if the rendered state is missing, blank, stale, or inconsistent."
      ])
    };
  }

  if (includesAny(text, [
    "터미널",
    "콘솔",
    "출력",
    "멈춰",
    "중지",
    "실행한",
    "terminal",
    "console",
    "tail",
    "output",
    "stop",
    "rerun"
  ])) {
    const priorityTools = [
      "desk_state",
      "desk_terminal_tail",
      "desk_terminal_stop",
      "desk_terminal_run",
      "desk_terminal_run_and_wait"
    ];
    return {
      id: "terminal-followup",
      label: "Visible terminal follow-up",
      priorityTools,
      toolExecutionPolicy: toolExecutionPolicy("terminal-followup", priorityTools, {
        desk_terminal_stop: ["desk_terminal_tail"],
        desk_terminal_run: ["desk_terminal_tail"],
        desk_terminal_run_and_wait: ["desk_state"]
      }),
      systemMessage: policyMessage("terminal-followup", "Visible terminal follow-up", priorityTools, [
        "Use `desk_state` to identify visible terminal sessions before acting on them.",
        "Use `desk_terminal_tail` before rerunning, stopping, or summarizing a visible terminal task.",
        "Use `desk_terminal_stop` only when the user asks to stop/cancel or the task is clearly stuck.",
        "Use `desk_terminal_run` for new visible terminal commands after checking existing terminal context.",
        "Use `desk_terminal_run_and_wait` for one-shot commands where the output and exit code are the required result."
      ])
    };
  }

  if (isNaturalDeskControlPrompt(text)) {
    return naturalDeskControlPolicy();
  }

  if (includesAny(text, [
    "오류",
    "에러",
    "실패",
    "문제",
    "진단",
    "원인",
    "gateway",
    "bridge",
    "capability",
    "renderer",
    "diagnostic",
    "troubleshoot",
    "failure",
    "error"
  ])) {
    const priorityTools = [
      "desk_recent_diagnostics",
      "desk_state",
      "desk_capabilities",
      "desk_call_capability"
    ];
    return {
      id: "desk-troubleshooting",
      label: "Desk bridge troubleshooting",
      priorityTools,
      toolExecutionPolicy: toolExecutionPolicy("desk-troubleshooting", priorityTools, {
        desk_call_capability: ["desk_capabilities"]
      }),
      systemMessage: policyMessage("desk-troubleshooting", "Desk bridge troubleshooting", priorityTools, [
        "Use `desk_recent_diagnostics` before guessing about Xenesis Desk, renderer, bridge, or capability failures.",
        "Use `desk_state` to correlate diagnostics with open panes, terminals, and files.",
        "Use `desk_capabilities` before retrying a lower-level `desk_call_capability` call."
      ])
    };
  }

  if (includesAny(text, [
    "현재",
    "선택",
    "패널",
    "창",
    "파일",
    "pane",
    "active",
    "selected",
    "context",
    "current",
    "file"
  ])) {
    const priorityTools = [
      "desk_active_context",
      "desk_context_actions",
      "desk_state"
    ];
    return {
      id: "current-context",
      label: "Current Desk context",
      priorityTools,
      toolExecutionPolicy: toolExecutionPolicy("current-context", priorityTools, {
        list: ["desk_active_context"],
        read: ["desk_active_context"],
        search: ["desk_active_context"],
        code_symbols: ["desk_active_context"]
      }),
      systemMessage: policyMessage("current-context", "Current Desk context", priorityTools, [
        "Use `desk_active_context` before repository tools when the user asks about the current pane, selected file, or active Desk state.",
        "Use `desk_context_actions` to discover relevant interactive actions for the current pane.",
        "Use `desk_state` when the current context alone is not enough."
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
