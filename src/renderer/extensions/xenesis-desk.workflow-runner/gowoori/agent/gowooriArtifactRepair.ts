import {
  findOpenMarkdownCodeFence,
  getMarkdownCodeFenceInfo,
  renderMarkdownCodeFence,
  scanMarkdownCodeFences,
} from '../../../../markdown/markdownCodeFences';

export type GowooriArtifactRepairSeverity = 'info' | 'warning' | 'error';

export interface GowooriArtifactRepairDiagnostic {
  severity: GowooriArtifactRepairSeverity;
  message: string;
}

export interface GowooriArtifactRepairOptions {
  allowPartial?: boolean;
}

export interface GowooriArtifactRepairResult {
  source: string;
  changed: boolean;
  renderable: boolean;
  diagnostics: GowooriArtifactRepairDiagnostic[];
}

const LEADING_MARKDOWN_FENCE_PATTERN = /^[ \t]{0,3}(`{3,}|~{3,})(?:markdown|md|text)\b[^\n]*\n/i;
const RAW_SKETCH_PATTERN = /^\s*screen(?:\s+"[^"]*"|\s+\d|\s+[A-Za-z0-9_-])/i;

export function normalizeGowooriArtifactSource(
  input: string,
  options: GowooriArtifactRepairOptions = {},
): GowooriArtifactRepairResult {
  const diagnostics: GowooriArtifactRepairDiagnostic[] = [];
  const original = String(input || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  let source = original.trim();

  if (!source) {
    return {
      source: '',
      changed: original !== '',
      renderable: false,
      diagnostics,
    };
  }

  const wrappedMarkdown = getWholeMarkdownWrapper(source);
  if (wrappedMarkdown) {
    source = wrappedMarkdown.code.trim();
    diagnostics.push({
      severity: 'info',
      message: 'Removed an outer markdown/text code fence around the generated artifact.',
    });
  } else if (LEADING_MARKDOWN_FENCE_PATTERN.test(source)) {
    const candidate = source.replace(LEADING_MARKDOWN_FENCE_PATTERN, '').trim();
    if (
      candidate &&
      (hasRenderableFence(candidate) || candidate.includes('```') || RAW_SKETCH_PATTERN.test(candidate))
    ) {
      source = candidate;
      diagnostics.push({
        severity: 'info',
        message: 'Removed an unfinished leading markdown/text code fence around the generated artifact.',
      });
    }
  }

  if (!hasRenderableFence(source) && RAW_SKETCH_PATTERN.test(source) && !source.includes('```')) {
    source = ['```xcon-sketch', source.trim(), '```'].join('\n');
    diagnostics.push({
      severity: 'info',
      message: 'Wrapped raw SKETCH output in an xcon-sketch code fence.',
    });
  }

  if (hasUnclosedFence(source)) {
    source = `${source.trimEnd()}\n\`\`\``;
    diagnostics.push({
      severity: options.allowPartial ? 'info' : 'warning',
      message: 'Closed an unfinished markdown code fence for preview rendering.',
    });
  }

  const beforeFenceAlias = source;
  source = normalizeRenderableFenceAliases(source);
  if (source !== beforeFenceAlias) {
    diagnostics.push({
      severity: 'info',
      message: 'Normalized sketch code fence aliases to xcon-sketch.',
    });
  }

  const renderable = hasRenderableFence(source);

  if (renderable && source && !source.endsWith('\n')) {
    source = `${source}\n`;
  }

  return {
    source,
    changed: source !== original,
    renderable,
    diagnostics,
  };
}

function hasUnclosedFence(source: string): boolean {
  return Boolean(findOpenMarkdownCodeFence(source));
}

function getWholeMarkdownWrapper(source: string): { code: string } | null {
  const trimmed = String(source || '').trim();
  const fences = scanMarkdownCodeFences(trimmed);
  if (fences.length !== 1) return null;
  const [fence] = fences;
  if (fence.start !== 0 || fence.end !== trimmed.length) return null;
  const { lang } = getMarkdownCodeFenceInfo(fence.info);
  return ['markdown', 'md', 'text'].includes(lang) ? { code: fence.code } : null;
}

function hasRenderableFence(source: string): boolean {
  return scanMarkdownCodeFences(source).some((fence) => {
    const { lang } = getMarkdownCodeFenceInfo(fence.info);
    return /^(?:xcon(?:-[\w-]+)?|xcons|sketch)$/.test(lang);
  });
}

function normalizeRenderableFenceAliases(source: string): string {
  const fences = scanMarkdownCodeFences(source);
  let output = '';
  let cursor = 0;
  let changed = false;

  for (const fence of fences) {
    const { lang, args } = getMarkdownCodeFenceInfo(fence.info);
    if (lang !== 'sketch') continue;
    output += source.slice(cursor, fence.start);
    output += renderMarkdownCodeFence(fence.marker, ['xcon-sketch', args].filter(Boolean).join(' '), fence.code);
    cursor = fence.end;
    changed = true;
  }

  if (!changed) return source;
  return `${output}${source.slice(cursor)}`;
}
