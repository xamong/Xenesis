import type { LedgerEntry } from "./messageTypes.js";

export function unresolvedToolCallIds(entries: readonly LedgerEntry[]) {
  const unresolved = new Map<string, string>();
  for (const entry of entries) {
    if (entry.kind === "assistant_message") {
      for (const toolCall of entry.toolCalls ?? []) {
        unresolved.set(toolCall.id, toolCall.name);
      }
    }
    if (entry.kind === "tool_result") {
      unresolved.delete(entry.toolCallId);
    }
  }
  return Array.from(unresolved.keys());
}

export function assertProviderRequestReady(entries: readonly LedgerEntry[]) {
  const unresolved = unresolvedToolCallIds(entries);
  if (unresolved.length > 0) {
    throw new Error(`Cannot create provider request with unresolved tool calls: ${unresolved.join(", ")}`);
  }
}
