import type { GowooriChatMessage, GowooriSimpleArtifactSummary } from './gowooriChatTypes';

export function getGowooriArtifactTitleFromSource(source: string, fallback = 'Gowoori artifact'): string {
  const heading = source.match(/^\s*#\s+(.+?)\s*$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 90);
  const screen = source.match(/^\s*screen\s+"([^"]+)"/m)?.[1]?.trim();
  if (screen) return screen.slice(0, 90);
  return fallback.slice(0, 90);
}

function decodeGowooriQuotedText(value: string): string {
  try {
    return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

function normalizeGowooriArtifactSummaryLine(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~>#]/g, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsefulGowooriArtifactSummaryLine(value: string): boolean {
  if (!value) return false;
  if (value.length < 2) return false;
  if (/^[-:|]+$/.test(value)) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (/^(?:#[0-9a-f]{3,8}|@[\w-]+)$/i.test(value)) return false;
  if (/\{\{|\$[A-Za-z_]/.test(value)) return false;
  if (/^Generated artifact from .* stream\.?$/i.test(value)) return false;
  if (/^BYOK artifact generated\.?/i.test(value)) return false;
  if (/^Gowoori artifact failed preflight validation\.?$/i.test(value)) return false;
  return true;
}

function pushUniqueGowooriArtifactSummaryLine(lines: string[], value: string, maxLength = 128): void {
  const normalized = normalizeGowooriArtifactSummaryLine(value);
  if (!isUsefulGowooriArtifactSummaryLine(normalized)) return;
  const compact = normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}...` : normalized;
  const key = compact.toLocaleLowerCase();
  if (lines.some((line) => line.toLocaleLowerCase() === key)) return;
  lines.push(compact);
}

export function getGowooriMarkdownSummaryLines(source: string): string[] {
  const lines: string[] = [];
  let inFence = false;
  for (const rawLine of source.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !trimmed) continue;
    if (/^\|/.test(trimmed)) continue;
    pushUniqueGowooriArtifactSummaryLine(lines, trimmed);
    if (lines.length >= 4) break;
  }
  return lines;
}

export function getGowooriVisibleTextSummaryLines(source: string): string[] {
  const lines: string[] = [];
  const patterns = [
    /^\s*screen\s+"((?:\\.|[^"\\])+)"/gm,
    /^\s*[\w.-]+\s*:\s*(?:label|button)\s+"((?:\\.|[^"\\])+)"/gm,
    /"(?:text|label|title|subtitle|caption|value)"\s*:\s*"((?:\\.|[^"\\])+)"/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const decoded = decodeGowooriQuotedText(match[1] ?? '');
      for (const part of decoded.split(/\r?\n/)) {
        pushUniqueGowooriArtifactSummaryLine(lines, part, 96);
        if (lines.length >= 7) return lines;
      }
    }
  }

  return lines;
}

export function getGowooriUserFacingArtifactSummary(source: string, fallback = 'Gowoori artifact'): string {
  const title = getGowooriArtifactTitleFromSource(source, fallback);
  const lines: string[] = [];
  pushUniqueGowooriArtifactSummaryLine(lines, title, 96);
  for (const line of getGowooriMarkdownSummaryLines(source)) {
    pushUniqueGowooriArtifactSummaryLine(lines, line, 128);
  }
  for (const line of getGowooriVisibleTextSummaryLines(source)) {
    pushUniqueGowooriArtifactSummaryLine(lines, line, 96);
  }

  if (lines.length === 0) {
    return isUsefulGowooriArtifactSummaryLine(fallback) ? fallback : '생성된 결과를 거울이에 표시했습니다.';
  }

  return lines.slice(0, 6).join('\n');
}

export function createGowooriSimpleArtifactSummary(message: GowooriChatMessage | null): GowooriSimpleArtifactSummary {
  const source = message?.source ?? '';
  const sourceState = message?.sourceState;
  if (!source || !sourceState) {
    return {
      title: 'No artifact preview yet',
      description:
        'The latest generated Markdown + XCON/SKETCH artifact will appear here as soon as Gowoori receives renderable source.',
      sourceSizeLabel: '0 chars',
      stateLabel: 'Waiting',
      canPreview: false,
    };
  }

  const canPreview = sourceState.canPreview;
  return {
    title: canPreview ? 'Artifact preview ready' : 'Artifact preview blocked',
    description: canPreview
      ? 'Open a preview-only Gowoori pane before replacing the selected target.'
      : 'Run repair before opening this artifact in Gowoori.',
    sourceSizeLabel: `${source.length.toLocaleString()} chars`,
    stateLabel: sourceState.label,
    canPreview,
  };
}
