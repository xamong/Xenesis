/**
 * XCON Lint integration for Gowoori and CodeMirror.
 *
 * Bridges @xcon-chain/lint results into:
 *   1. CodeMirror inline diagnostics (warning/error markers)
 *   2. Gowoori quality score display
 *   3. Auto-repair reason explanations
 */

export interface XconLintIssue {
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  ruleId?: string;
}

export interface XconLintResult {
  ok: boolean;
  issues: XconLintIssue[];
  score: number;
  summary: string;
}

export function lintXconSource(source: string): XconLintResult {
  const issues: XconLintIssue[] = [];
  const lines = source.split('\n');
  let inSketch = false;
  let sketchLineStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```xcon-sketch')) {
      inSketch = true;
      sketchLineStart = i;
      continue;
    }
    if (inSketch && trimmed === '```') {
      inSketch = false;
      continue;
    }

    if (inSketch) {
      if (i === sketchLineStart + 1 && !trimmed.startsWith('screen ')) {
        issues.push({
          line: i + 1,
          column: 1,
          severity: 'error',
          message: 'XCON/SKETCH must start with a screen declaration.',
          ruleId: 'sketch-screen-required',
        });
      }

      if (/\t/.test(line)) {
        issues.push({
          line: i + 1,
          column: line.indexOf('\t') + 1,
          severity: 'error',
          message: 'Tabs are not allowed. Use spaces for indentation.',
          ruleId: 'no-tabs',
        });
      }

      if (trimmed.includes('javascript:') || trimmed.includes('<script')) {
        issues.push({
          line: i + 1,
          column: 1,
          severity: 'error',
          message: 'Script injection is not allowed in XCON.',
          ruleId: 'no-script',
        });
      }

      if (/at\s+\d+\s+\d+\s+\d+\s+\d+/.test(trimmed)) {
        const match = trimmed.match(/at\s+(-?\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)/);
        if (match) {
          const [, x, y, w, h] = match.map(Number);
          if (w <= 0 || h <= 0) {
            issues.push({
              line: i + 1,
              column: 1,
              severity: 'warning',
              message: `Component has zero or negative size: ${w}x${h}`,
              ruleId: 'positive-size',
            });
          }
        }
      }
    }

    if (trimmed.startsWith('```xcon-chain-fixture')) {
      const endIdx = lines.findIndex((l, j) => j > i && l.trim() === '```');
      if (endIdx > i) {
        const fixtureContent = lines
          .slice(i + 1, endIdx)
          .join('\n')
          .trim();
        if (fixtureContent) {
          try {
            JSON.parse(fixtureContent);
          } catch (error) {
            issues.push({
              line: i + 2,
              column: 1,
              severity: 'error',
              message: `Invalid fixture JSON: ${error instanceof Error ? error.message : 'parse error'}`,
              ruleId: 'valid-fixture-json',
            });
          }
        }
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);

  return {
    ok: errorCount === 0,
    issues,
    score,
    summary:
      errorCount === 0 && warningCount === 0
        ? 'No issues found.'
        : `${errorCount} error(s), ${warningCount} warning(s). Score: ${score}/100.`,
  };
}

export function formatLintResultForGowoori(result: XconLintResult): string {
  if (result.ok && result.issues.length === 0) return `Lint: ${result.score}/100 — Clean`;
  const top3 = result.issues
    .slice(0, 3)
    .map((i) => `L${i.line}: ${i.message}`)
    .join('; ');
  return `Lint: ${result.score}/100 — ${top3}`;
}
