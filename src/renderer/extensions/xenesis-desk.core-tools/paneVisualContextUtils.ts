import type {
  CapturePaneResult,
  McpBridgeRendererContentSnapshot,
  McpBridgeRendererPaneSnapshot,
  McpBridgeRendererStateSnapshot,
} from '../../../shared/types';

export interface PaneVisualContextTarget {
  paneId: string;
  contentId: string;
  title: string;
  contentType: string;
  filePath?: string;
  url?: string;
}

export interface PaneVisualContextCapture {
  target: PaneVisualContextTarget;
  artifact: CapturePaneResult;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function contentForPane(
  state: McpBridgeRendererStateSnapshot,
  pane: McpBridgeRendererPaneSnapshot | null | undefined,
): McpBridgeRendererContentSnapshot | null {
  const contentId = pane?.activeContentId || pane?.contents?.[0] || '';
  return contentId ? (state.contents.find((content) => content.id === contentId) ?? null) : null;
}

function isWorkbenchContent(content: McpBridgeRendererContentSnapshot | null): boolean {
  return content?.contentType === 'xd-ai-workbench';
}

export function resolveActivePaneVisualContext(
  state: McpBridgeRendererStateSnapshot | null | undefined,
): PaneVisualContextTarget | null {
  if (!state) return null;
  const panes = state.panes ?? [];
  const preferredPane =
    panes.find((pane) => pane.id === state.artifactPaneId) ??
    panes.find((pane) => pane.id === state.activePaneId) ??
    panes.find((pane) => pane.activeContentId) ??
    null;
  const preferredContent = contentForPane(state, preferredPane);
  const fallbackPane = isWorkbenchContent(preferredContent)
    ? (panes.find((pane) => {
        const content = contentForPane(state, pane);
        return content && !isWorkbenchContent(content) && content.contentType !== 'xenesis-bot';
      }) ?? preferredPane)
    : preferredPane;
  const content = contentForPane(state, fallbackPane);
  if (!fallbackPane || !content) return null;
  return {
    paneId: fallbackPane.id,
    contentId: content.id,
    title: cleanText(content.title) || content.id,
    contentType: cleanText(content.contentType) || 'unknown',
    filePath: cleanText(content.filePath),
    url: cleanText(content.url),
  };
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function captureActivePaneVisualContext(
  state: McpBridgeRendererStateSnapshot | null | undefined,
): Promise<PaneVisualContextCapture> {
  if (!window.captureAPI?.capturePane) {
    throw new Error('Pane capture API is not available.');
  }
  const target = resolveActivePaneVisualContext(state);
  if (!target) {
    throw new Error('No active pane is available to capture.');
  }
  const paneElement = document.querySelector<HTMLElement>(`[data-pane-id="${escapeAttributeValue(target.paneId)}"]`);
  if (!paneElement) {
    throw new Error(`Active pane element was not found: ${target.paneId}`);
  }
  const rect = paneElement.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    throw new Error(`Active pane has an invalid capture size: ${Math.round(rect.width)}x${Math.round(rect.height)}`);
  }
  const artifact = await window.captureAPI.capturePane({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    paneId: target.paneId,
    contentId: target.contentId,
    title: target.title,
    contentType: target.contentType,
  });
  return { target, artifact };
}

export function buildPaneVisualContextBotMessage(capture: PaneVisualContextCapture): string {
  return [
    'Use this Xenesis Desk active pane screenshot as visual context.',
    '',
    '```xenesis-pane-visual-context',
    JSON.stringify(
      {
        surface: 'pane',
        mode: 'visual-context',
        paneId: capture.target.paneId,
        contentId: capture.target.contentId,
        title: capture.target.title,
        contentType: capture.target.contentType,
        filePath: capture.target.filePath || '',
        url: capture.target.url || '',
        imageArtifact: {
          kind: 'screenshot',
          title: `Pane capture - ${capture.target.title}`,
          filePath: capture.artifact.filePath,
          fileName: capture.artifact.fileName,
          size: capture.artifact.size,
        },
      },
      null,
      2,
    ),
    '```',
    '',
    `The image artifact is saved at: ${capture.artifact.filePath}`,
    'Inspect the screenshot for layout, rendering, clipped text, overlap, and workflow correctness before suggesting changes.',
  ].join('\n');
}
