import type { GowooriArtifactRepairDiagnostic } from './gowooriArtifactRepair';

export interface GowooriArtifactComparisonSide {
  source: string;
  preview: string;
  renderable: boolean;
  canApply: boolean;
  diagnostics: GowooriArtifactRepairDiagnostic[];
}

export interface GowooriArtifactDiffLine {
  kind: 'same' | 'removed' | 'added';
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

export interface GowooriArtifactComparison {
  context: string;
  original: GowooriArtifactComparisonSide;
  repaired: GowooriArtifactComparisonSide;
  diff: GowooriArtifactDiffLine[];
}

export interface GowooriArtifactComparisonInput {
  context: string;
  originalSource: string;
  originalRenderable: boolean;
  originalDiagnostics: GowooriArtifactRepairDiagnostic[];
  repairedSource: string;
  repairedRenderable: boolean;
  repairedDiagnostics: GowooriArtifactRepairDiagnostic[];
}

const DEFAULT_PREVIEW_LIMIT = 2600;
const DEFAULT_DIFF_LIMIT = 240;

export function createGowooriArtifactComparison(input: GowooriArtifactComparisonInput): GowooriArtifactComparison {
  return {
    context: input.context,
    original: createComparisonSide(input.originalSource, input.originalRenderable, input.originalDiagnostics),
    repaired: createComparisonSide(input.repairedSource, input.repairedRenderable, input.repairedDiagnostics),
    diff: createGowooriArtifactLineDiff(input.originalSource, input.repairedSource),
  };
}

export function createGowooriArtifactPreview(source: string, limit = DEFAULT_PREVIEW_LIMIT): string {
  const normalizedSource = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (normalizedSource.length <= limit) return normalizedSource;
  return `${normalizedSource.slice(0, Math.max(0, limit - 120)).trimEnd()}\n\n... ${normalizedSource.length - limit} more chars omitted ...`;
}

function createComparisonSide(
  source: string,
  renderable: boolean,
  diagnostics: GowooriArtifactRepairDiagnostic[],
): GowooriArtifactComparisonSide {
  const hasErrors = diagnostics.some((item) => item.severity === 'error');
  return {
    source,
    preview: createGowooriArtifactPreview(source),
    renderable,
    canApply: renderable && !hasErrors,
    diagnostics,
  };
}

export function createGowooriArtifactLineDiff(
  originalSource: string,
  repairedSource: string,
  limit = DEFAULT_DIFF_LIMIT,
): GowooriArtifactDiffLine[] {
  const originalLines = normalizeDiffLines(originalSource);
  const repairedLines = normalizeDiffLines(repairedSource);
  const lcs = createLcsMatrix(originalLines, repairedLines);
  const diff: GowooriArtifactDiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < originalLines.length && newIndex < repairedLines.length) {
    const oldLine = originalLines[oldIndex];
    const newLine = repairedLines[newIndex];
    if (oldLine === newLine) {
      diff.push({
        kind: 'same',
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
        text: oldLine,
      });
      oldIndex += 1;
      newIndex += 1;
    } else if (lcs[oldIndex + 1]?.[newIndex] >= lcs[oldIndex]?.[newIndex + 1]) {
      diff.push({
        kind: 'removed',
        oldLineNumber: oldIndex + 1,
        text: oldLine,
      });
      oldIndex += 1;
    } else {
      diff.push({
        kind: 'added',
        newLineNumber: newIndex + 1,
        text: newLine,
      });
      newIndex += 1;
    }
  }

  while (oldIndex < originalLines.length) {
    diff.push({
      kind: 'removed',
      oldLineNumber: oldIndex + 1,
      text: originalLines[oldIndex],
    });
    oldIndex += 1;
  }

  while (newIndex < repairedLines.length) {
    diff.push({
      kind: 'added',
      newLineNumber: newIndex + 1,
      text: repairedLines[newIndex],
    });
    newIndex += 1;
  }

  if (diff.length <= limit) return diff;
  return [
    ...diff.slice(0, Math.max(0, limit - 1)),
    {
      kind: 'same',
      text: `... ${diff.length - limit} more diff lines omitted ...`,
    },
  ];
}

function normalizeDiffLines(source: string): string[] {
  const normalizedSource = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  return normalizedSource ? normalizedSource.split('\n') : [];
}

function createLcsMatrix(a: string[], b: string[]): number[][] {
  const matrix = Array.from({ length: a.length + 1 }, () => Array.from({ length: b.length + 1 }, () => 0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = a[i] === b[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }
  return matrix;
}
