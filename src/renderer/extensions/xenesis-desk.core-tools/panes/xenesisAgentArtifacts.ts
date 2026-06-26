import type {
  McpBridgeBotArtifact,
  McpBridgeBotSession,
  XenesisRunResult,
  XenesisStatus,
} from '../../../../shared/types';
import {
  createId,
  extractXenesisAssistantText,
  isRecord,
  nowIso,
  parseJsonRecords,
  stringField,
  stringifyDetail,
  XENESIS_ARTIFACT_SESSION_CHANGED_EVENT,
  XENESIS_ARTIFACT_SESSION_LIMIT,
  XENESIS_ARTIFACT_SESSION_STORAGE_KEY,
  type XenesisMode,
} from './xenesisAgentTypes';

function artifactFileName(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() || filePath;
}

export function inferXenesisArtifactKind(filePath: string, fallback = 'artifact'): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.xcon.md') || lower.endsWith('.xcon.markdown')) return 'xcon';
  if (lower.endsWith('.xcon.json') || lower.endsWith('.xconj') || lower.endsWith('.xcon.sketch')) return 'xcon';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.xcon') || lower.endsWith('.sketch')) return 'xcon';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp'))
    return 'screenshot';
  if (lower.endsWith('.zip')) return 'trace';
  if (lower.endsWith('.json')) return 'report';
  return fallback;
}

function xenesisArtifactFromRecord(record: Record<string, unknown>): McpBridgeBotArtifact | null {
  const filePath =
    stringField(record, 'filePath') ||
    stringField(record, 'path') ||
    stringField(record, 'markdownPath') ||
    stringField(record, 'pdfPath') ||
    stringField(record, 'screenshotPath') ||
    stringField(record, 'traceFilePath') ||
    stringField(record, 'reportPath');
  const title =
    stringField(record, 'title') ||
    stringField(record, 'name') ||
    stringField(record, 'label') ||
    (filePath ? artifactFileName(filePath) : '');
  const kind =
    stringField(record, 'kind') || stringField(record, 'type') || inferXenesisArtifactKind(filePath, 'artifact');
  const openCommand = stringField(record, 'openCommand');
  const focusCommand = stringField(record, 'focusCommand');
  if (!title && !filePath && !kind) return null;
  return {
    ...(title ? { title } : {}),
    ...(kind ? { kind } : {}),
    ...(filePath ? { filePath } : {}),
    ...(openCommand ? { openCommand } : {}),
    ...(focusCommand ? { focusCommand } : {}),
  };
}

function pushUniqueXenesisArtifact(artifacts: McpBridgeBotArtifact[], artifact: McpBridgeBotArtifact): void {
  const key = `${artifact.filePath || ''}\n${artifact.title || ''}\n${artifact.kind || ''}`;
  const exists = artifacts.some((item) => `${item.filePath || ''}\n${item.title || ''}\n${item.kind || ''}` === key);
  if (!exists) artifacts.push(artifact);
}

function collectXenesisArtifactsFromValue(value: unknown, artifacts: McpBridgeBotArtifact[], depth = 0): void {
  if (depth > 3 || value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectXenesisArtifactsFromValue(item, artifacts, depth + 1);
    return;
  }
  if (!isRecord(value)) return;
  const artifact = xenesisArtifactFromRecord(value);
  if (artifact) pushUniqueXenesisArtifact(artifacts, artifact);
  for (const key of ['artifact', 'artifacts', 'result', 'output', 'data']) {
    collectXenesisArtifactsFromValue(value[key], artifacts, depth + 1);
  }
}

export function extractXenesisArtifactsFromRunResult(result: XenesisRunResult): McpBridgeBotArtifact[] {
  const artifacts: McpBridgeBotArtifact[] = [];
  collectXenesisArtifactsFromValue(result.artifacts, artifacts);
  collectXenesisArtifactsFromValue(result.events, artifacts);
  if (result.output) {
    for (const record of parseJsonRecords(result.output)) {
      collectXenesisArtifactsFromValue(record, artifacts);
    }
  }
  return artifacts.slice(0, 100);
}

function isXenesisArtifactSession(value: unknown): value is McpBridgeBotSession {
  return (
    isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string' && Array.isArray(value.messages)
  );
}

export function readStoredXenesisArtifactSessions(): McpBridgeBotSession[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(XENESIS_ARTIFACT_SESSION_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(isXenesisArtifactSession).slice(0, XENESIS_ARTIFACT_SESSION_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function persistStoredXenesisArtifactSessions(sessions: McpBridgeBotSession[]): void {
  try {
    window.localStorage.setItem(
      XENESIS_ARTIFACT_SESSION_STORAGE_KEY,
      JSON.stringify(sessions.slice(0, XENESIS_ARTIFACT_SESSION_LIMIT)),
    );
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
}

export async function persistXenesisArtifactSession(
  prompt: string,
  mode: XenesisMode,
  result: XenesisRunResult,
): Promise<number> {
  const artifacts = extractXenesisArtifactsFromRunResult(result);
  if (artifacts.length === 0) return 0;
  const now = nowIso();
  const sessionId = result.sessionId || result.id || createId('xenesis-artifacts-session');
  const messageId = result.id || result.traceId || createId('xenesis-artifacts-message');
  const session: McpBridgeBotSession = {
    id: sessionId,
    title: prompt.split(/\r?\n/)[0]?.slice(0, 80) || 'Xenesis run artifacts',
    source: 'xenesis',
    status: result.ok ? 'final' : 'error',
    inputUrl: '',
    updatedAt: now,
    messages: [
      {
        id: messageId,
        role: 'assistant',
        content: extractXenesisAssistantText(result),
        artifacts,
        streaming: false,
        createdAt: now,
        updatedAt: now,
        xenesis_desk: {
          surface: 'xenesis-agent',
          mode,
          sourceMessageId: result.id || result.traceId || '',
          artifactAction: 'xenesis-run',
        },
      },
    ],
  };
  const next = [session, ...readStoredXenesisArtifactSessions().filter((item) => item.id !== session.id)].slice(
    0,
    XENESIS_ARTIFACT_SESSION_LIMIT,
  );
  persistStoredXenesisArtifactSessions(next);
  try {
    await window.mcpBridgeAPI?.saveBotSession(session);
  } catch {
    // Artifact Library can still read the local mirror when the bridge is unavailable.
  }
  window.dispatchEvent(new CustomEvent(XENESIS_ARTIFACT_SESSION_CHANGED_EVENT, { detail: session }));
  return artifacts.length;
}

export function recordXenesisRunDiagnostics(
  result: XenesisRunResult,
  artifactCount: number,
  status: XenesisStatus | null,
): void {
  const detail = stringifyDetail({
    sessionId: result.sessionId || '',
    traceId: result.traceId || '',
    artifactCount,
    runtimeMode: status?.runtimeMode || '',
    workspace: status?.workspace || '',
  });
  if (result.ok) {
    void window.diagnosticsAPI?.record({
      level: 'info',
      source: 'renderer',
      scope: 'xenesis',
      message: 'Xenesis Agent run completed',
      detail,
    });
    return;
  }
  void window.diagnosticsAPI?.record({
    level: 'warn',
    source: 'renderer',
    scope: 'xenesis',
    message: 'Xenesis Agent run failed',
    detail,
  });
}
