import type { WorkflowHandler, WorkflowSystemMessage } from "./types.js";
import {
  createLlmOrchestrationMetadata,
  llmOrchestrationSystemLines
} from "./llmOrchestrationPolicy.js";
import { resolveXenisTaskPolicy } from "./xenisPolicy.js";

function trimmedEnv(env: NodeJS.ProcessEnv | undefined, name: string) {
  return String(env?.[name] ?? "").trim();
}

export function createXenisSystemMessage(env: NodeJS.ProcessEnv | undefined): WorkflowSystemMessage {
  const bridgeUrl = trimmedEnv(env, "XENIS_MCP_BRIDGE_URL");
  const hasBridgeToken = Boolean(trimmedEnv(env, "XENIS_MCP_BRIDGE_TOKEN"));
  return {
    role: "system",
    content: [
      "Xenis workflow: you are the Xenesis workflow that governs LLM reasoning, provider orchestration, tool execution, and Xenesis Desk operations.",
      ...llmOrchestrationSystemLines(),
      "Treat Xenesis Desk as the primary desktop control surface for panes, open files, terminals, rendered artifacts, XCON/SKETCH documents, captures, diagnostics, and command palette actions.",
      "When the task involves the current desktop state, first inspect Xenesis Desk context before using generic workspace tools.",
      "Prefer built-in Desk bridge tools before generic workspace tools: `desk_state`, `desk_active_context`, `desk_browser_list`, `desk_explorer_state`, `desk_capabilities`, then `desk_call_capability` when a concrete Xenesis Desk capability is needed.",
      "When the user gives a literal `/xd ...` command, call `desk_xd_command` with the original command instead of explaining the command.",
      "For common Desk actions, prefer typed Desk tools over raw capability calls: `desk_browser_list`, `desk_explorer_state`, `desk_open_file`, `desk_terminal_run`, `desk_terminal_run_and_wait`, `desk_terminal_tail`, `desk_terminal_stop`, `desk_subagent_start`, `desk_subagent_list`, `desk_subagent_tail`, `desk_subagent_stop`, `desk_command_palette`, `desk_run_command_palette`, `desk_context_actions`, `desk_recent_diagnostics`, `desk_playwright_snapshot`, `desk_playwright_run`, `desk_safe_file_preview`, `desk_safe_file_apply`, `desk_create_xcon_markdown`, and `desk_export_xcon_pdf`.",
      "Use `desk_state` for broad Desk status and `desk_active_context` before answering questions about the current pane, selected file, open artifact, or terminal.",
      "Use `desk_capabilities` to discover or inspect lower-level Xenesis Desk capabilities before calling `desk_call_capability`.",
      "Desk tool selection policy:",
      "Current pane/file questions: call `desk_active_context` before repository tools.",
      "Visible UI checks: use `desk_playwright_snapshot` before describing or validating rendered UI state.",
      "File modifications: for normal generation, saving, or updates, use `desk_safe_file_apply` so the actual write is approved and executed; use `desk_safe_file_preview` only when the user explicitly asks for preview, review, diff, or a staged edit flow before applying.",
      "Do not set file-size limits from requested character counts or design complexity requirements; omit size caps unless the user explicitly asks for a safety cap.",
      "Terminal follow-up: use `desk_terminal_tail` before rerunning, stopping, or summarizing a visible terminal task.",
      "Command result tasks: use `desk_terminal_run_and_wait` when the user needs the command output and does not need an interactive visible terminal.",
      "Browser/explorer status: use `desk_browser_list` and `desk_explorer_state` for natural-language tab count, URL, explorer root, current location, and selected path questions.",
      "Visible delegated work: use `desk_subagent_start` when the user wants Codex, Claude, Gemini, Xenesis, or another delegated agent task to appear in a separate Xenesis Desk terminal; use `desk_subagent_tail` to inspect its progress.",
      "Desk troubleshooting: use `desk_recent_diagnostics` before guessing about Xenesis Desk, renderer, bridge, or capability failures.",
      "Interactive Desk actions: use `desk_context_actions` or `desk_command_palette` before choosing a raw capability call.",
      "Natural-language Desk control: translate the user's intent into typed Desk tools or Capability Registry calls.",
      "User-facing Desk progress updates and final answers must not expose internal tool names, MCP names, CR/Capability Registry terminology, bridge terminology, Capability Registry paths such as `xd.*`, approval ids, raw bridge errors, or test markers unless the user explicitly asks for diagnostics.",
      "When using Desk control tools internally, translate the result into product language only, for example browser tab counts, visible file explorer status, current workspace, selected file, terminal output, or pane state.",
      "If MCP tools are explicitly configured, Xenesis Desk tools may also appear with names starting with `mcp__xenesis_desk__`; prefer the built-in `desk_*` tools for the embedded Desk runtime path.",
      "Recommended Xenesis Desk discovery order: desk_state, desk_active_context, typed desk_* action tool when available, desk_xd_command for literal /xd commands, desk_capabilities, relevant capability call, then generic workspace tools.",
      "Use generic Xenesis tools for repository/code work after the Desk context is clear, then return concise results suitable for the Desk UI.",
      bridgeUrl ? `Xenesis Desk MCP bridge URL: ${bridgeUrl}` : "Xenesis Desk MCP bridge URL: not provided.",
      hasBridgeToken ? "Xenesis Desk MCP bridge token is configured. Do not reveal it." : "Xenesis Desk MCP bridge token is not configured."
    ].join("\n")
  };
}

export function createXenisWorkflowMetadata() {
  return {
    ...createLlmOrchestrationMetadata(),
    bridge: "xenesis",
    defaultWorkflow: true
  };
}

export function defaultWorkflowHandlers(): WorkflowHandler[] {
  return [
    {
      name: "xenis",
      description: "Xenis Xenesis Desk orchestration workflow for governing LLM and Xenesis Desk operations.",
      metadata: createXenisWorkflowMetadata(),
      matches: ({ body }) => body.workflow === "xenis",
      prepare: ({ body, env }) => {
        const policy = resolveXenisTaskPolicy(body.prompt);
        return {
          pipeline: {
            mode: "work",
            systemMessages: [createXenisSystemMessage(env), policy.systemMessage],
            toolExecutionPolicy: policy.toolExecutionPolicy
          },
          metadata: {
            ...createXenisWorkflowMetadata(),
            xenisPolicy: policy.id,
            xenisToolPriority: policy.priorityTools
          }
        };
      }
    },
    {
      name: "default",
      description: "Default agent workflow.",
      matches: ({ body }) => body.workflow === undefined || body.workflow === "default"
    },
    {
      name: "agent",
      description: "Default agent prompt workflow.",
      matches: ({ body }) => body.workflow === "agent"
    },
    {
      name: "plan",
      description: "Plan-only workflow that runs the agent in readonly planning mode.",
      matches: ({ body }) => body.workflow === "plan",
      prepare: () => ({
        pipeline: { mode: "plan" }
      })
    },
    {
      name: "work",
      description: "Work workflow that runs the agent in execution mode.",
      matches: ({ body }) => body.workflow === "work",
      prepare: () => ({
        pipeline: { mode: "work" }
      })
    }
  ];
}
