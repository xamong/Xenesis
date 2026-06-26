import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isPathInside } from "../utils/workspace.js";
import type { JsonlSessionWriterOptions, SessionWriter } from "./types.js";
import type { RecordedSessionEvent, SessionEvent } from "../core/events.js";

export class JsonlSessionWriter implements SessionWriter {
  private readonly logPath: string;
  private readonly sessionId: string;
  private readonly traceId: string | undefined;
  private readonly now: () => Date;
  private seq: number;

  constructor(options: JsonlSessionWriterOptions) {
    const home = options.xenesisHome ?? resolve(options.workspaceRoot, ".xenesis");
    const sessionsDir = resolve(home, "sessions");
    const logPath = resolve(sessionsDir, `${options.sessionId}.jsonl`);

    if (!isPathInside(sessionsDir, logPath)) {
      throw new Error(`Session log path is outside the Xenesis sessions directory: ${options.sessionId}`);
    }

    this.logPath = logPath;
    this.sessionId = options.sessionId;
    this.traceId = options.traceId;
    this.now = options.now ?? (() => new Date());
    this.seq = options.initialSeq ?? 0;
  }

  async write(event: SessionEvent) {
    const record: RecordedSessionEvent = {
      ...event,
      sessionId: this.sessionId,
      ...(this.traceId ? { traceId: this.traceId } : {}),
      seq: this.seq++,
      timestamp: this.now().toISOString()
    };

    await mkdir(dirname(this.logPath), { recursive: true });
    await appendFile(this.logPath, `${JSON.stringify(record)}\n`, "utf8");
  }
}
