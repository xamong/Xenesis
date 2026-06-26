/**
 * Tiptap rich editor integration for XCON (Sprint 10-6).
 *
 * Provides the data layer for embedding XCON fence previews
 * inside a Tiptap WYSIWYG editor. The actual React component
 * would use @tiptap/react with this configuration.
 *
 * Mode switching: CodeMirror (source) ↔ Tiptap (WYSIWYG)
 */

export interface TiptapXconConfig {
  initialContent: string;
  editable: boolean;
  onUpdate?: (content: string) => void;
}

export interface XconFenceBlock {
  type: 'xcon-sketch' | 'xcon-chain-fixture' | 'xcon-chain' | 'xcon-workflow';
  content: string;
  startLine: number;
  endLine: number;
}

export function extractXconFences(markdown: string): XconFenceBlock[] {
  const fences: XconFenceBlock[] = [];
  const lines = markdown.split('\n');
  let inFence = false;
  let fenceType: XconFenceBlock['type'] | null = null;
  let fenceContent: string[] = [];
  let fenceStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!inFence) {
      if (trimmed.startsWith('```xcon-sketch')) {
        inFence = true;
        fenceType = 'xcon-sketch';
        fenceContent = [];
        fenceStart = i;
      } else if (trimmed.startsWith('```xcon-chain-fixture')) {
        inFence = true;
        fenceType = 'xcon-chain-fixture';
        fenceContent = [];
        fenceStart = i;
      } else if (trimmed.startsWith('```xcon-chain')) {
        inFence = true;
        fenceType = 'xcon-chain';
        fenceContent = [];
        fenceStart = i;
      } else if (trimmed.startsWith('```xcon-workflow')) {
        inFence = true;
        fenceType = 'xcon-workflow';
        fenceContent = [];
        fenceStart = i;
      }
    } else if (trimmed === '```') {
      fences.push({
        type: fenceType!,
        content: fenceContent.join('\n'),
        startLine: fenceStart,
        endLine: i,
      });
      inFence = false;
      fenceType = null;
    } else {
      fenceContent.push(lines[i]);
    }
  }

  return fences;
}

export function replaceXconFence(markdown: string, fenceIndex: number, newContent: string): string {
  const fences = extractXconFences(markdown);
  if (fenceIndex < 0 || fenceIndex >= fences.length) return markdown;

  const fence = fences[fenceIndex];
  const lines = markdown.split('\n');
  const before = lines.slice(0, fence.startLine + 1);
  const after = lines.slice(fence.endLine);

  return [...before, newContent, ...after].join('\n');
}

export function getTiptapExtensionConfig() {
  return {
    xconSketchNodeName: 'xconSketchBlock',
    xconFixtureNodeName: 'xconFixtureBlock',
    xconChainNodeName: 'xconChainBlock',
    xconWorkflowNodeName: 'xconWorkflowBlock',
    supportedFenceTypes: ['xcon-sketch', 'xcon-chain-fixture', 'xcon-chain', 'xcon-workflow'] as const,
  };
}
