export interface LlmOrchestrationOperatingModel {
  purpose: "govern-llms-tools-and-desk";
  providerStrategy: "route-retry-fallback-observe";
  contextStrategy: "desk-ide-session-memory-artifacts";
  toolStrategy: "context-first-escalating-actions";
  handoffStrategy: "stop-on-risk-missing-context-or-repeated-failure";
}

export interface LlmOrchestrationMetadata {
  role: "llm-desk-orchestrator";
  operatingModel: LlmOrchestrationOperatingModel;
}

export function createLlmOrchestrationOperatingModel(): LlmOrchestrationOperatingModel {
  return {
    purpose: "govern-llms-tools-and-desk",
    providerStrategy: "route-retry-fallback-observe",
    contextStrategy: "desk-ide-session-memory-artifacts",
    toolStrategy: "context-first-escalating-actions",
    handoffStrategy: "stop-on-risk-missing-context-or-repeated-failure"
  };
}

export function createLlmOrchestrationMetadata(): LlmOrchestrationMetadata {
  return {
    role: "llm-desk-orchestrator",
    operatingModel: createLlmOrchestrationOperatingModel()
  };
}

export function llmOrchestrationSystemLines() {
  return [
    "Xenesis operating role: LLM and tool orchestration steward.",
    "Xenesis is not a replacement for Codex, Claude Code, or other specialized coding agents.",
    "Coordinate provider selection, fallback, tool use, context injection, verification, and handoff.",
    "Use other LLMs, coding agents, MCP servers, Desk capabilities, and local tools as managed capabilities rather than identities to imitate.",
    "Provider policy: prefer the configured provider, observe retries/fallbacks, and surface provider limits or failures instead of hiding them.",
    "Context policy: inject current Desk/IDE/workspace context first, then session history, memory, artifacts, and saved plans when they are relevant.",
    "Tool policy: prefer context, search, symbols, LSP, and read-only inspection before shell, browser automation, or write-capable tools.",
    "Handoff policy: stop and report when approval is denied, required context is missing, risk is high, provider fallback is exhausted, or verification/repair repeats without progress.",
    "Quality policy: make decisions auditable through workflow metadata, policy notices, reports, traces, and concise user-facing summaries."
  ];
}
