import type { AgentMessage } from "../../messages.js";

export const SUMMARIZER_MIN_CONTEXT = 64_000;
const DEFAULT_MAX_TOKENS = 4096;

const SYSTEM_PROMPT = [
  "You are a context-compaction assistant. Summarize the conversation below into a compact,",
  "faithful reference that lets the main assistant continue without the full history.",
  "Produce these sections, each terse and factual:",
  "Goal / Constraints / Progress / Key Decisions / Next Steps / Critical Context.",
  "Preserve concrete identifiers (file paths, names, ids, values). Do not invent facts.",
  "This is a REFERENCE summary only — do not address the user or resume any task yourself."
].join("\n");

const UPDATE_SYSTEM_PROMPT = [
  SYSTEM_PROMPT,
  "",
  "You are UPDATING an existing summary with newer turns. Merge the new turns into the",
  "previous summary, preserving all still-relevant prior decisions; do not drop earlier facts",
  "unless they were explicitly superseded."
].join("\n");

function serializeConversation(messages: AgentMessage[]): string {
  const lines = messages.map((m) => {
    if (m.role === "tool") return `tool(${m.name}): ${m.content}`;
    return `${m.role}: ${(m as { content?: string }).content ?? ""}`;
  });
  return `<conversation>\n${lines.join("\n")}\n</conversation>`;
}

export function buildSummarizationMessages(older: AgentMessage[], previousSummary?: string): AgentMessage[] {
  const convo = serializeConversation(older);
  if (previousSummary && previousSummary.trim().length > 0) {
    return [
      { role: "system", content: UPDATE_SYSTEM_PROMPT },
      { role: "user", content: `<previous-summary>\n${previousSummary.trim()}\n</previous-summary>\n\n${convo}` }
    ];
  }
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: convo }
  ];
}

export function createLlmSummarizer(deps: {
  complete: (messages: AgentMessage[], maxTokens: number) => Promise<string>;
  maxTokens?: number;
}): (older: AgentMessage[], previousSummary?: string) => Promise<string> {
  const maxTokens = deps.maxTokens ?? DEFAULT_MAX_TOKENS;
  return async (older, previousSummary) => {
    const messages = buildSummarizationMessages(older, previousSummary);
    return await deps.complete(messages, maxTokens);
  };
}
