// src/extensions/MemoryMarkdown.ts
// P5b-2: declarative MEMORY.md snapshot. A bounded, human/agent-curated markdown of durable facts
// injected (volatile-tier) into every run when the memory tool is present. Mirrors Hermes' MEMORY.md.
import { readFileSync } from "node:fs";

/** Max characters of MEMORY.md we inject. Mirrors Hermes' ~2200-char cap to keep the prompt compact. */
export const MEMORY_MARKDOWN_MAX_CHARS = 2200;

/**
 * Read the declarative MEMORY.md snapshot.
 *
 * - Missing/unreadable file → "" (best-effort; MEMORY.md is optional).
 * - Trimmed and bounded to MEMORY_MARKDOWN_MAX_CHARS (truncated on a soft boundary when possible,
 *   with a trailing ellipsis marker so the model knows the snapshot was clipped).
 *
 * The result is plain markdown authored by the user/agent — it is injected verbatim into the
 * volatile memory tier, so callers MUST keep it on the post-boundary (cacheScope:"session") adapter.
 */
export function readMemoryMarkdown(path: string, maxChars: number = MEMORY_MARKDOWN_MAX_CHARS): string {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    // ENOENT or any read error: MEMORY.md is optional, degrade silently to empty.
    return "";
  }
  const trimmed = raw.trim();
  if (trimmed.length <= maxChars) return trimmed;
  // Clip to the cap. Prefer cutting on the last newline within the budget so we don't slice a line
  // mid-token; fall back to a hard cut. Reserve room for the ellipsis marker.
  const marker = "\n…(MEMORY.md truncated)";
  const budget = Math.max(0, maxChars - marker.length);
  const clipped = trimmed.slice(0, budget);
  const lastNewline = clipped.lastIndexOf("\n");
  const body = lastNewline > budget * 0.5 ? clipped.slice(0, lastNewline) : clipped;
  return `${body.trimEnd()}${marker}`;
}
