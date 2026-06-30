import type { SessionEvent } from '../core/events.js';

export interface SessionWriter {
  write(event: SessionEvent): Promise<void>;
}

export interface JsonlSessionWriterOptions {
  workspaceRoot: string;
  xenesisHome?: string;
  sessionId: string;
  traceId?: string;
  now?: () => Date;
  initialSeq?: number;
}

export type { RecordedSessionEvent, SessionEvent } from '../core/events.js';
