import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export interface ChannelSendLogEntry {
  channel: string;
  at: string;
  conversationId: string;
  method: "send" | "sendMessage";
  text: string;
  chunkIndex: number;
  chunkCount: number;
  ok: boolean;
  status?: number;
  actionCount?: number;
  error?: string;
}

export type ChannelSendLogger = (entry: ChannelSendLogEntry) => void;

export function createChannelSendLogWriter(xenesisHome: string, channel: string): ChannelSendLogger {
  return (entry) => {
    const at = entry.at || new Date().toISOString();
    const filePath = join(xenesisHome, "logs", "channel-sends", `${safeFileSegment(channel)}-${dateSegment(at)}.jsonl`);
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      appendFileSync(filePath, `${JSON.stringify({ ...entry, at })}\n`, "utf8");
    } catch {
      // Channel logging is diagnostic-only and must never break message delivery.
    }
  };
}

function dateSegment(value: string) {
  return value.slice(0, 10) || "unknown-date";
}

function safeFileSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "channel";
}
