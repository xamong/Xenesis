import fs from 'node:fs';
import path from 'node:path';

import {
  type AgentSession,
  type AgentSessionDiagnostic,
  type AgentSessionSource,
  compactAgentSessionText,
  normalizeAgentSession,
} from '../../shared/agentSessions';
import type { LocalCliAgentId } from '../../shared/types';
import { readJsonlTail } from './jsonl';
import { collectFiles, pathExists, resolveHomePath } from './pathUtils';

export interface AgentSessionScanContext {
  homeDir: string;
  xenisHomeDir: string;
  now: Date;
}

export interface AgentSessionAdapterScanResult {
  sessions: AgentSession[];
  diagnostics: AgentSessionDiagnostic[];
}

export interface AgentSessionAdapter {
  id: AgentSessionSource;
  label: string;
  localCliAgentId?: LocalCliAgentId;
  scannerVersion: number;
  scan(context: AgentSessionScanContext): Promise<AgentSessionAdapterScanResult>;
  buildResumeCommand(session: AgentSession, mode?: string): string;
}

interface MakeSessionInput {
  source: AgentSessionSource;
  label: string;
  scannerVersion: number;
  sourceSessionId: string;
  projectPath: string;
  title: string;
  summary: string;
  lastUserPrompt?: string;
  updatedAt: string;
  resumeCommand: string;
  sourcePath: string;
  scannedAt: string;
  messageCount?: number;
}

function makeSession(input: MakeSessionInput): AgentSession {
  return normalizeAgentSession({
    source: input.source,
    provider: input.source,
    sourceSessionId: input.sourceSessionId,
    projectPath: input.projectPath,
    title: compactAgentSessionText(input.title, 120) || `${input.label} session`,
    summary: compactAgentSessionText(input.summary, 220),
    lastUserPrompt: compactAgentSessionText(input.lastUserPrompt, 220),
    updatedAt: input.updatedAt,
    resumeCommand: input.resumeCommand,
    messageCount: input.messageCount,
    state: 'saved',
    sourceDetails: {
      sourcePaths: [input.sourcePath],
      scannerVersion: input.scannerVersion,
      scanStatus: 'fresh',
      lastScannedAt: input.scannedAt,
    },
  });
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readFirstString(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    return value.map((item) => readFirstString(item)).find(Boolean) ?? '';
  }

  const record = asRecord(value);
  if (!record) return '';
  return (
    readString(record, ['text', 'message', 'content', 'prompt', 'cwd', 'projectPath', 'project_path', 'workspace']) ||
    readFirstString(record.content) ||
    readFirstString(record.message)
  );
}

function readNestedString(record: Record<string, unknown>, paths: string[][]): string {
  for (const pathParts of paths) {
    let value: unknown = record;
    for (const part of pathParts) {
      const parent = asRecord(value);
      value = parent ? parent[part] : undefined;
    }
    const text = readFirstString(value);
    if (text) return text;
  }
  return '';
}

function latestIso(records: Record<string, unknown>[], fallback: Date): string {
  const values = records
    .map((record) => readString(record, ['timestamp', 'updatedAt', 'createdAt']))
    .filter(Boolean)
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);
  return new Date(values.length ? Math.max(...values) : fallback.getTime()).toISOString();
}

function codexSessionIdFromFile(filePath: string): string {
  const baseName = path.basename(filePath, path.extname(filePath));
  const uuid = baseName.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  return uuid || baseName;
}

function readCodexSessionId(record: Record<string, unknown>): string {
  return readNestedString(record, [
    ['id'],
    ['sessionId'],
    ['session_id'],
    ['payload', 'id'],
    ['payload', 'sessionId'],
    ['payload', 'session_id'],
  ]);
}

function readCodexProjectPath(record: Record<string, unknown>): string {
  return readNestedString(record, [
    ['cwd'],
    ['projectPath'],
    ['project_path'],
    ['workspace'],
    ['payload', 'cwd'],
    ['payload', 'projectPath'],
    ['payload', 'project_path'],
    ['payload', 'workspace'],
    ['payload', 'workspace_roots'],
  ]);
}

function isCodexUserRecord(record: Record<string, unknown>): boolean {
  const payload = asRecord(record.payload);
  return (
    readString(record, ['role']) === 'user' ||
    readString(record, ['type']) === 'user_message' ||
    readString(payload ?? {}, ['role']) === 'user' ||
    readString(payload ?? {}, ['type']) === 'user_message'
  );
}

function readCodexPrompt(record: Record<string, unknown>): string {
  return readNestedString(record, [
    ['content'],
    ['prompt'],
    ['message'],
    ['payload', 'message'],
    ['payload', 'prompt'],
    ['payload', 'content'],
  ]);
}

function readClaudeSessionId(record: Record<string, unknown>): string {
  return readNestedString(record, [['sessionId'], ['session_id'], ['id'], ['message', 'sessionId']]);
}

function readClaudeProjectPath(record: Record<string, unknown>): string {
  return readNestedString(record, [['cwd'], ['projectPath'], ['project_path'], ['workspace'], ['message', 'cwd']]);
}

function isClaudeUserRecord(record: Record<string, unknown>): boolean {
  return (
    readString(record, ['type']) === 'user' ||
    readString(record, ['role']) === 'user' ||
    readNestedString(record, [['message', 'role']]) === 'user'
  );
}

function readClaudePrompt(record: Record<string, unknown>): string {
  return readNestedString(record, [['prompt'], ['content'], ['message', 'content'], ['message']]);
}

function dedupeSessions(sessions: AgentSession[]): AgentSession[] {
  return Array.from(new Map(sessions.map((session) => [session.id, session])).values());
}

async function scanClaude(context: AgentSessionScanContext): Promise<AgentSessionAdapterScanResult> {
  const historyPath = resolveHomePath(context.homeDir, '.claude/history.jsonl');
  const diagnostics: AgentSessionDiagnostic[] = [];
  const sessions: AgentSession[] = [];

  if (pathExists(historyPath)) {
    const read = await readJsonlTail(historyPath);
    if (read.skipped > 0) {
      diagnostics.push({
        source: 'claude',
        level: 'warn',
        message: `Skipped ${read.skipped} malformed Claude history record(s).`,
      });
    }

    sessions.push(
      ...read.records.flatMap((record) => {
        const sourceSessionId = readString(record, ['sessionId', 'session_id', 'id']);
        const projectPath = readString(record, ['cwd', 'projectPath', 'project_path']);
        const prompt = readString(record, ['prompt', 'content', 'message']);
        if (!sourceSessionId || !projectPath || !prompt) return [];
        return [
          makeSession({
            source: 'claude',
            label: 'Claude Code',
            scannerVersion: 2,
            sourceSessionId,
            projectPath,
            title: prompt,
            summary: prompt,
            lastUserPrompt: prompt,
            updatedAt: latestIso([record], context.now),
            resumeCommand: `claude --resume ${sourceSessionId}`,
            sourcePath: historyPath,
            scannedAt: context.now.toISOString(),
            messageCount: 1,
          }),
        ];
      }),
    );
  }

  const projectFiles = await collectFiles(
    resolveHomePath(context.homeDir, '.claude/projects'),
    (filePath) => filePath.toLowerCase().endsWith('.jsonl'),
    200,
  );
  for (const filePath of projectFiles) {
    const read = await readJsonlTail(filePath);
    if (read.skipped > 0) {
      diagnostics.push({
        source: 'claude',
        level: 'warn',
        message: `Skipped ${read.skipped} malformed Claude project record(s).`,
        detail: filePath,
      });
    }

    const sourceSessionId =
      read.records.map(readClaudeSessionId).find(Boolean) || path.basename(filePath, path.extname(filePath));
    const projectPath = read.records.map(readClaudeProjectPath).find(Boolean);
    const userRecord = [...read.records].reverse().find(isClaudeUserRecord) ?? read.records.find(readClaudePrompt);
    const prompt = userRecord ? readClaudePrompt(userRecord) : '';
    if (!sourceSessionId || !projectPath) continue;

    sessions.push(
      makeSession({
        source: 'claude',
        label: 'Claude Code',
        scannerVersion: 2,
        sourceSessionId,
        projectPath,
        title: prompt || `Claude session ${sourceSessionId}`,
        summary: prompt,
        lastUserPrompt: prompt,
        updatedAt: latestIso(read.records, context.now),
        resumeCommand: `claude --resume ${sourceSessionId}`,
        sourcePath: filePath,
        scannedAt: context.now.toISOString(),
        messageCount: read.records.length,
      }),
    );
  }

  return { sessions: dedupeSessions(sessions), diagnostics };
}

async function scanCodex(context: AgentSessionScanContext): Promise<AgentSessionAdapterScanResult> {
  const diagnostics: AgentSessionDiagnostic[] = [];
  const codexRoot = resolveHomePath(context.homeDir, '.codex');
  const sessionsRoot = path.join(codexRoot, 'sessions');
  const sqliteFiles = await collectFiles(codexRoot, (filePath) => /state.*\.sqlite$/i.test(filePath), 20);
  if (sqliteFiles.length > 0) {
    diagnostics.push({
      source: 'codex',
      level: 'info',
      message: 'Codex sqlite state file detected; JSONL transcript scanner is used in this pass.',
      detail: sqliteFiles.map((item) => path.basename(item)).join(', '),
    });
  }

  const files = await collectFiles(sessionsRoot, (filePath) => filePath.toLowerCase().endsWith('.jsonl'), 200);
  const sessions: AgentSession[] = [];
  for (const filePath of files) {
    const read = await readJsonlTail(filePath);
    if (read.skipped > 0) {
      diagnostics.push({
        source: 'codex',
        level: 'warn',
        message: `Skipped ${read.skipped} malformed Codex record(s).`,
        detail: filePath,
      });
    }

    const sourceSessionId = read.records.map(readCodexSessionId).find(Boolean) || codexSessionIdFromFile(filePath);
    const projectPath = read.records.map(readCodexProjectPath).find(Boolean);
    const userRecord = [...read.records].reverse().find(isCodexUserRecord) ?? read.records.find(readCodexPrompt);
    const prompt = userRecord ? readCodexPrompt(userRecord) : '';
    if (!sourceSessionId || !projectPath) continue;

    sessions.push(
      makeSession({
        source: 'codex',
        label: 'Codex CLI',
        scannerVersion: 2,
        sourceSessionId,
        projectPath,
        title: prompt || `Codex session ${sourceSessionId}`,
        summary: prompt,
        lastUserPrompt: prompt,
        updatedAt: latestIso(read.records, context.now),
        resumeCommand: `codex resume ${sourceSessionId}`,
        sourcePath: filePath,
        scannedAt: context.now.toISOString(),
        messageCount: read.records.length,
      }),
    );
  }
  return { sessions, diagnostics };
}

async function scanGemini(context: AgentSessionScanContext): Promise<AgentSessionAdapterScanResult> {
  const root = resolveHomePath(context.homeDir, '.gemini/tmp');
  const files = await collectFiles(root, (filePath) => /session-.+\.json$/i.test(path.basename(filePath)), 200);
  const diagnostics: AgentSessionDiagnostic[] = [];
  const sessions: AgentSession[] = [];

  for (const filePath of files) {
    try {
      const parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as Record<string, unknown>;
      const sourceSessionId = readString(parsed, ['id', 'sessionId', 'session_id']) || path.basename(filePath, '.json');
      const projectPath = readString(parsed, ['cwd', 'projectPath', 'project_path']);
      const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
      const lastUser = [...messages]
        .reverse()
        .find((item) => item && typeof item === 'object' && (item as Record<string, unknown>).role === 'user') as
        | Record<string, unknown>
        | undefined;
      const prompt = lastUser ? readString(lastUser, ['content', 'text', 'message']) : '';
      if (!projectPath) continue;

      sessions.push(
        makeSession({
          source: 'gemini',
          label: 'Gemini CLI',
          scannerVersion: 1,
          sourceSessionId,
          projectPath,
          title: prompt || `Gemini session ${sourceSessionId}`,
          summary: prompt,
          lastUserPrompt: prompt,
          updatedAt: readString(parsed, ['updatedAt', 'timestamp']) || context.now.toISOString(),
          resumeCommand: `gemini --resume ${sourceSessionId}`,
          sourcePath: filePath,
          scannedAt: context.now.toISOString(),
          messageCount: messages.length,
        }),
      );
    } catch (error) {
      diagnostics.push({
        source: 'gemini',
        level: 'warn',
        message: 'Failed to parse Gemini session JSON.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { sessions, diagnostics };
}

async function scanXenesis(context: AgentSessionScanContext): Promise<AgentSessionAdapterScanResult> {
  const root = path.join(context.xenisHomeDir, 'sessions');
  const files = await collectFiles(root, (filePath) => filePath.toLowerCase().endsWith('.jsonl'), 200);
  const diagnostics: AgentSessionDiagnostic[] = [];
  const sessions: AgentSession[] = [];

  for (const filePath of files) {
    const read = await readJsonlTail(filePath);
    if (read.skipped > 0) {
      diagnostics.push({
        source: 'xenesis',
        level: 'warn',
        message: `Skipped ${read.skipped} malformed Xenesis record(s).`,
        detail: filePath,
      });
    }

    const sourceSessionId = path.basename(filePath, path.extname(filePath));
    const userRecord =
      [...read.records].reverse().find((record) => String(record.type ?? record.role).includes('user')) ??
      read.records[0];
    const prompt = userRecord ? readString(userRecord, ['content', 'message', 'prompt']) : '';
    sessions.push(
      makeSession({
        source: 'xenesis',
        label: 'Xenesis',
        scannerVersion: 1,
        sourceSessionId,
        projectPath: context.xenisHomeDir,
        title: prompt || `Xenesis session ${sourceSessionId}`,
        summary: prompt,
        lastUserPrompt: prompt,
        updatedAt: latestIso(read.records, context.now),
        resumeCommand: `xenesis sessions resume ${sourceSessionId}`,
        sourcePath: filePath,
        scannedAt: context.now.toISOString(),
        messageCount: read.records.length,
      }),
    );
  }
  return { sessions, diagnostics };
}

export function createAgentSessionAdapters(): AgentSessionAdapter[] {
  return [
    {
      id: 'xenesis',
      label: 'Xenesis',
      localCliAgentId: 'hermes',
      scannerVersion: 1,
      scan: scanXenesis,
      buildResumeCommand: (session) => `xenesis sessions resume ${session.sourceSessionId}`,
    },
    {
      id: 'codex',
      label: 'Codex CLI',
      localCliAgentId: 'codex',
      scannerVersion: 2,
      scan: scanCodex,
      buildResumeCommand: (session) => `codex resume ${session.sourceSessionId}`,
    },
    {
      id: 'claude',
      label: 'Claude Code',
      localCliAgentId: 'claude',
      scannerVersion: 2,
      scan: scanClaude,
      buildResumeCommand: (session) => `claude --resume ${session.sourceSessionId}`,
    },
    {
      id: 'gemini',
      label: 'Gemini CLI',
      localCliAgentId: 'gemini',
      scannerVersion: 1,
      scan: scanGemini,
      buildResumeCommand: (session) => `gemini --resume ${session.sourceSessionId}`,
    },
  ];
}
