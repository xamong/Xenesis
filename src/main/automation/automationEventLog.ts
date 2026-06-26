import fs from 'node:fs';
import path from 'node:path';
import type { AutomationEvent, AutomationStatus } from '../../shared/types';

export type AutomationLogEntry =
  | { type: 'session_start'; at: string; termId: string; status: AutomationStatus; context?: Record<string, unknown> }
  | { type: 'session_stop'; at: string; termId: string; status: AutomationStatus }
  | { type: 'event'; at: string; termId: string; event: AutomationEvent }
  | { type: 'terminal_write'; at: string; termId: string; phase: string; text: string; hex: string };

export interface AutomationEventLogSink {
  start(termId: string, status: AutomationStatus, context?: Record<string, unknown>): void;
  append(entry: AutomationLogEntry): void;
  stop(termId: string, status: AutomationStatus): void;
}

interface SessionLog {
  id: string;
  path: string;
}

export class JsonlAutomationEventLogSink implements AutomationEventLogSink {
  private readonly sessions = new Map<string, SessionLog>();

  constructor(private readonly rootDir: string) {}

  start(termId: string, status: AutomationStatus, context?: Record<string, unknown>): void {
    const at = new Date().toISOString();
    const session = {
      id: `${compactTimestamp(at)}-${safeFileSegment(termId)}`,
      path: path.join(this.rootDir, safeFileSegment(termId), `${compactTimestamp(at)}.jsonl`),
    };
    this.sessions.set(termId, session);
    this.appendToSession(session, { type: 'session_start', at, termId, status, context });
  }

  append(entry: AutomationLogEntry): void {
    const session = this.sessions.get(entry.termId);
    if (!session) return;
    this.appendToSession(session, entry);
  }

  stop(termId: string, status: AutomationStatus): void {
    const session = this.sessions.get(termId);
    if (!session) return;
    this.appendToSession(session, {
      type: 'session_stop',
      at: new Date().toISOString(),
      termId,
      status,
    });
    this.sessions.delete(termId);
  }

  private appendToSession(session: SessionLog, entry: AutomationLogEntry): void {
    try {
      fs.mkdirSync(path.dirname(session.path), { recursive: true });
      fs.appendFileSync(session.path, `${JSON.stringify({ sessionId: session.id, ...entry })}\n`, 'utf8');
    } catch {
      // Logging must never break terminal automation.
    }
  }
}

export function automationLogTextAndHex(data: string): { text: string; hex: string } {
  return {
    text: data.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t'),
    hex: Buffer.from(data, 'utf8').toString('hex'),
  };
}

function safeFileSegment(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'terminal';
}

function compactTimestamp(value: string): string {
  return value.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}
