import type { AgentMessage } from "../../messages.js";

type ToolMessage = Extract<AgentMessage, { role: "tool" }>;
type AssistantMessage = Extract<AgentMessage, { role: "assistant" }>;

function hashString(value: string): string {
  // FNV-1a 32-bit — deterministic, no crypto dependency.
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function firstLineHead(content: string, max = 120): string {
  const firstLine = content.split("\n", 1)[0] ?? "";
  return firstLine.length > max ? firstLine.slice(0, max) : firstLine;
}

function descriptorFor(message: ToolMessage): string {
  return `[${message.name}] result elided (${message.content.length} chars): ${firstLineHead(message.content)}`;
}

/**
 * Deterministic, no-LLM prune of the older message slice that is about to be summarized.
 * Returns a NEW array; never mutates the inputs.
 *
 * Pass A — dedup identical tool results: the most-recent copy of identical content is retained
 * verbatim; earlier copies are replaced with a cleared-duplicate notice.
 *
 * Pass B — oversized tool result descriptor: tool messages whose content exceeds `threshold`
 * chars are replaced with a one-line descriptor and their attachments are dropped.
 *
 * Pass C — oversized assistant tool-call input: ToolCall.input is `unknown` (object), so we
 * measure JSON.stringify length and replace the entire input with an elided sentinel object
 * `{ __elided: <len> }` when oversized.
 */
export function pruneOlderMessages(
  older: AgentMessage[],
  opts: { threshold: number }
): { messages: AgentMessage[]; prunedCount: number } {
  const threshold = Math.max(1, opts.threshold);
  let prunedCount = 0;

  // Pass A — dedup identical tool results. Walk from the end so the most-recent copy is retained;
  // earlier identical copies are cleared.
  const seenToolHashes = new Set<string>();
  const clearedDuplicate = new Set<number>();
  for (let i = older.length - 1; i >= 0; i -= 1) {
    const m = older[i]!;
    if (m.role !== "tool") continue;
    const key = `${m.name} ${hashString(m.content)}`;
    if (seenToolHashes.has(key)) {
      clearedDuplicate.add(i);
    } else {
      seenToolHashes.add(key);
    }
  }

  const messages = older.map((m, i): AgentMessage => {
    if (m.role === "tool") {
      if (clearedDuplicate.has(i)) {
        prunedCount += 1;
        return { role: "tool", toolCallId: m.toolCallId, name: m.name, content: "[duplicate tool output cleared — identical to a more recent call]" };
      }
      if (m.content.length > threshold) {
        prunedCount += 1;
        // descriptor only: drop attachments
        return { role: "tool", toolCallId: m.toolCallId, name: m.name, content: descriptorFor(m) };
      }
      return { ...m };
    }
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      let changed = false;
      const toolCalls = m.toolCalls.map((tc) => {
        // ToolCall.input is `unknown` (object) — measure JSON.stringify length
        const serialized = JSON.stringify(tc.input) ?? "";
        if (serialized.length > threshold) {
          changed = true;
          return { ...tc, input: { __elided: serialized.length } };
        }
        return tc;
      });
      if (changed) {
        prunedCount += 1;
        return { ...(m as AssistantMessage), toolCalls };
      }
      return { ...m };
    }
    return { ...m };
  });

  return { messages, prunedCount };
}
