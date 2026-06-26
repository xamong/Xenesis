/**
 * Structured audit logger for Capability Registry calls.
 *
 * Records every CR call with: who, what, when, which permission,
 * from which channel, and what happened. Writes to audit.jsonl.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AuditRecord {
  timestamp: string;
  path: string;
  source: string;
  sourceAgent?: string;
  channel?: string;
  userId?: string;
  permission: string;
  approval: string;
  approved: boolean;
  args?: unknown;
  resultOk: boolean;
  error?: string;
  durationMs: number;
}

export interface AuditLogger {
  log(record: AuditRecord): void;
  query(options?: { since?: string; source?: string; permission?: string; limit?: number }): AuditRecord[];
  exportAll(): AuditRecord[];
  clear(): void;
}

export function createAuditLogger(auditDir: string): AuditLogger {
  const filePath = path.join(auditDir, 'audit.jsonl');
  fs.mkdirSync(auditDir, { recursive: true });

  const inMemory: AuditRecord[] = [];
  const MAX_IN_MEMORY = 5000;

  return {
    log(record: AuditRecord): void {
      const line = JSON.stringify(record) + '\n';
      try {
        fs.appendFileSync(filePath, line, 'utf-8');
      } catch {
        /* best effort */
      }
      inMemory.push(record);
      if (inMemory.length > MAX_IN_MEMORY) inMemory.splice(0, inMemory.length - MAX_IN_MEMORY);
    },

    query(options = {}): AuditRecord[] {
      let result = [...inMemory];
      if (options.since) result = result.filter((r) => r.timestamp >= options.since!);
      if (options.source) result = result.filter((r) => r.source === options.source);
      if (options.permission) result = result.filter((r) => r.permission === options.permission);
      if (options.limit) result = result.slice(-options.limit);
      return result;
    },

    exportAll(): AuditRecord[] {
      return [...inMemory];
    },

    clear(): void {
      inMemory.length = 0;
    },
  };
}
