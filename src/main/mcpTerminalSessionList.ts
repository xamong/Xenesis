import type { McpBridgeRendererStateSnapshot } from '../shared/types';

export interface McpTerminalSessionListItem {
  id: string;
  kind: unknown;
  shell?: unknown;
  command?: unknown;
  cwd?: unknown;
  backend?: { pid?: unknown };
  ownerWindowId?: unknown;
  mcpCommand?: unknown;
  mcpTitle?: unknown;
  mcpMetadata?: unknown;
  scrollbackBytes?: unknown;
}

export function buildMcpTerminalSessionList(
  sessions: Iterable<McpTerminalSessionListItem>,
  rendererState: McpBridgeRendererStateSnapshot | null | undefined,
): Array<Record<string, unknown>> {
  const rendererTitleByTermId = new Map<string, string>();
  for (const content of rendererState?.contents ?? []) {
    if (content.contentType !== 'terminal') continue;
    const termId = stringValue(content.termId).trim();
    const title = stringValue(content.title).trim();
    if (termId && title) rendererTitleByTermId.set(termId, title);
  }

  return [...sessions].map((session) => {
    const rendererTitle = rendererTitleByTermId.get(session.id);
    return {
      id: session.id,
      kind: session.kind,
      shell: session.shell,
      command: session.command,
      cwd: session.cwd,
      pid: session.backend?.pid,
      ownerWindowId: session.ownerWindowId,
      mcpCommand: session.mcpCommand,
      title: rendererTitle || session.mcpTitle,
      metadata: session.mcpMetadata,
      scrollbackBytes: session.scrollbackBytes,
    };
  });
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
