import { getMarkdownCodeFenceInfo, scanMarkdownCodeFences } from '../../../../markdown/markdownCodeFences';
import type { GowooriArtifactRepairDiagnostic } from './gowooriArtifactRepair';

export interface GowooriArtifactValidationResult {
  ok: boolean;
  renderableBlockCount: number;
  diagnostics: GowooriArtifactRepairDiagnostic[];
}

interface GowooriRenderableBlock {
  lang: string;
  body: string;
  start: number;
}

interface GowooriDeclaredAlias {
  name: string;
  start: number;
}

const XCON_LANGUAGE_PATTERN = /^(?:xcon-sketch|xcons|xcon|sketch)(?:\s|$)/i;
const XCON_CHAIN_LANGUAGE_PATTERN = /^xcon-chain(?:\s|$)/i;
const SKETCH_LANGUAGE_PATTERN = /^(?:xcon-sketch|sketch)(?:\s|$)/i;
const SCREEN_PATTERN = /^\s*screen(?:\s+"[^"]*"|\s+\d|\s+[A-Za-z0-9_-])/im;
const MUSTACHE_PATTERN = /\{\{[\s\S]*?\}\}/;
const GENERIC_PLACEHOLDER_PATTERNS = [
  /Welcome to (?:the )?XCON Interface/i,
  /This artifact demonstrates a simple user interface/i,
  /designed for an informational display/i,
];
const TEXT_COMPONENT_PATTERN = /^(\s*)[A-Za-z_][\w-]*:\s*(?:label|button|badge)\b/i;
const COMPONENT_OR_PROPERTY_PATTERN = /^(\s*)[A-Za-z_][\w-]*:/;
const COLOR_PROPERTY_PATTERN = /^\s*color\s+/i;
const ANY_COMPONENT_PATTERN = /^(\s*)([A-Za-z_][\w-]*):\s*([A-Za-z_][\w-]*)\b/i;
const BACKGROUND_PROPERTY_PATTERN = /^\s*(?:backgroundColor|background|bg)\s+/i;
const ALIAS_REFERENCE_PATTERN = /(?:^|[^\\])\$([A-Za-z_][\w-]*)\b/g;

export function validateGowooriArtifactSource(source: string): GowooriArtifactValidationResult {
  const diagnostics: GowooriArtifactRepairDiagnostic[] = [];
  const blocks = extractRenderableBlocks(source);
  const declaredAliases = extractDeclaredChainAliases(source);

  if (blocks.length === 0) {
    diagnostics.push({
      severity: 'error',
      message: 'No renderable XCON/SKETCH block was found. Add at least one fenced ```xcon-sketch block.',
    });
    return {
      ok: false,
      renderableBlockCount: 0,
      diagnostics,
    };
  }

  blocks.forEach((block, index) => {
    const blockLabel = `${block.lang || 'xcon'} block ${index + 1}`;
    if (!block.body.trim()) {
      diagnostics.push({
        severity: 'error',
        message: `${blockLabel} is empty.`,
      });
      return;
    }

    if (SKETCH_LANGUAGE_PATTERN.test(block.lang) && !SCREEN_PATTERN.test(block.body)) {
      diagnostics.push({
        severity: 'error',
        message: `${blockLabel} does not start with a screen declaration. Gowoori needs a screen root for SKETCH rendering.`,
      });
    }

    if (SKETCH_LANGUAGE_PATTERN.test(block.lang) && MUSTACHE_PATTERN.test(block.body)) {
      diagnostics.push({
        severity: 'warning',
        message: `${blockLabel} contains {{...}} expressions. Prefer xcon-chain aliases and $alias references for Gowoori artifacts.`,
      });
    }

    if (SKETCH_LANGUAGE_PATTERN.test(block.lang) && containsGenericPlaceholderContent(block.body)) {
      diagnostics.push({
        severity: 'error',
        message: `${blockLabel} looks like a generic placeholder screen. Generate request-specific content before applying to Gowoori.`,
      });
    }

    if (SKETCH_LANGUAGE_PATTERN.test(block.lang)) {
      for (const componentName of findTextComponentsMissingExplicitColor(block.body)) {
        diagnostics.push({
          severity: 'error',
          message: `${blockLabel} text component "${componentName}" is missing an explicit color. Set a high-contrast color before applying to Gowoori.`,
        });
      }

      for (const problem of findLowContrastTextComponents(block.body)) {
        diagnostics.push({
          severity: problem.severity,
          message: `${blockLabel} text component "${problem.componentName}" uses low contrast color ${problem.color} on ${problem.backgroundColor}. Use a darker or lighter high-contrast color.`,
        });
      }

      for (const aliasName of findUndeclaredAliasReferences(block.body, block.start, declaredAliases)) {
        diagnostics.push({
          severity: 'error',
          message: `${blockLabel} references undeclared xcon-chain alias "$${aliasName}". Declare it in a preceding \`\`\`xcon-chain as ${aliasName} block or replace it with concrete text.`,
        });
      }

      for (const problem of findInvalidChartDataShapes(block.body)) {
        diagnostics.push({
          severity: 'error',
          message: `${blockLabel} ${problem}`,
        });
      }
    }
  });

  return {
    ok: !diagnostics.some((item) => item.severity === 'error'),
    renderableBlockCount: blocks.length,
    diagnostics,
  };
}

function containsGenericPlaceholderContent(source: string): boolean {
  return GENERIC_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(source));
}

function findTextComponentsMissingExplicitColor(source: string): string[] {
  const missing: string[] = [];
  const lines = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(TEXT_COMPONENT_PATTERN);
    if (!match) continue;
    const componentIndent = match[1].length;
    const componentName = line.trim().split(':', 1)[0] || `line ${index + 1}`;
    let hasColor = false;

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex];
      if (!nextLine.trim()) continue;
      const nextMatch = nextLine.match(COMPONENT_OR_PROPERTY_PATTERN);
      if (nextMatch && nextMatch[1].length <= componentIndent) break;
      if (COLOR_PROPERTY_PATTERN.test(nextLine)) {
        hasColor = true;
        break;
      }
    }

    if (!hasColor) missing.push(componentName);
  }

  return missing;
}

function findLowContrastTextComponents(
  source: string,
): Array<{ componentName: string; color: string; backgroundColor: string; severity: 'error' | 'warning' }> {
  const problems: Array<{
    componentName: string;
    color: string;
    backgroundColor: string;
    severity: 'error' | 'warning';
  }> = [];
  const lines = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');
  const stack: Array<{ indent: number; backgroundColor?: string }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const componentMatch = line.match(ANY_COMPONENT_PATTERN);
    if (componentMatch) {
      const indent = componentMatch[1].length;
      const componentName = componentMatch[2];
      const componentType = componentMatch[3].toLowerCase();
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parentBackground = findNearestBackgroundColor(stack);
      const explicitColor = findComponentPropertyValue(lines, index, indent, COLOR_PROPERTY_PATTERN);
      const ownBackground =
        getInlineComponentBackgroundColor(line) ||
        findComponentPropertyValue(lines, index, indent, BACKGROUND_PROPERTY_PATTERN);
      const effectiveBackground = ownBackground || parentBackground;
      const contrastSeverity =
        explicitColor && effectiveBackground ? getLowContrastSeverity(explicitColor, effectiveBackground) : null;
      if (
        ['label', 'button', 'badge'].includes(componentType) &&
        explicitColor &&
        effectiveBackground &&
        contrastSeverity
      ) {
        problems.push({
          componentName,
          color: explicitColor,
          backgroundColor: effectiveBackground,
          severity: contrastSeverity,
        });
      }
      stack.push({ indent, backgroundColor: ownBackground || undefined });
      continue;
    }

    const screenBackground = getInlineScreenBackgroundColor(line);
    if (screenBackground) {
      stack.length = 0;
      stack.push({ indent: -1, backgroundColor: screenBackground });
      continue;
    }

    const backgroundValue = getPropertyValue(line, BACKGROUND_PROPERTY_PATTERN);
    if (backgroundValue && stack.length > 0) {
      stack[stack.length - 1].backgroundColor = backgroundValue;
    }
  }

  return problems;
}

function findUndeclaredAliasReferences(
  body: string,
  blockStart: number,
  declaredAliases: GowooriDeclaredAlias[],
): string[] {
  const aliasNames = new Set<string>();
  for (const match of String(body || '').matchAll(ALIAS_REFERENCE_PATTERN)) {
    const aliasName = match[1];
    if (!declaredAliases.some((alias) => alias.name === aliasName && alias.start < blockStart)) {
      aliasNames.add(aliasName);
    }
  }
  return [...aliasNames];
}

function findInvalidChartDataShapes(source: string): string[] {
  const diagnostics: string[] = [];
  const lines = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  for (const line of lines) {
    const match = line.match(/^\s*chartData\s+(.+?)\s*$/i);
    if (!match) continue;
    const rawValue = match[1].trim();
    if (!rawValue || rawValue.startsWith('$')) continue;
    if (rawValue.startsWith('[')) {
      diagnostics.push(
        'chartData must be a JSON object with labels and datasets, not an array of label/value records.',
      );
      continue;
    }
    if (!rawValue.startsWith('{')) {
      diagnostics.push('chartData must be a single-line JSON object with labels and datasets.');
      continue;
    }
    try {
      const parsed = JSON.parse(rawValue) as { labels?: unknown; datasets?: unknown };
      if (!Array.isArray(parsed.labels) || !Array.isArray(parsed.datasets)) {
        diagnostics.push('chartData must include labels and datasets arrays for the chart renderer.');
        continue;
      }
      if (
        parsed.datasets.some(
          (dataset) => !dataset || typeof dataset !== 'object' || !Array.isArray((dataset as { data?: unknown }).data),
        )
      ) {
        diagnostics.push('each chartData dataset must include a data array.');
      }
    } catch {
      diagnostics.push('chartData must be valid single-line JSON so Gowoori can render the chart.');
    }
  }

  return diagnostics;
}

function extractDeclaredChainAliases(source: string): GowooriDeclaredAlias[] {
  const aliases: GowooriDeclaredAlias[] = [];
  const normalizedSource = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  for (const fence of scanMarkdownCodeFences(normalizedSource)) {
    const { lang, args } = getMarkdownCodeFenceInfo(fence.info);
    if (!XCON_CHAIN_LANGUAGE_PATTERN.test(lang)) continue;
    const match = args.match(/\bas\s+([A-Za-z_][\w-]*)/i);
    if (match) {
      aliases.push({ name: match[1], start: fence.start });
    }
  }
  for (const match of normalizedSource.matchAll(/^[ \t]{0,3}`{3,}xcon-chain\s+as\s+([A-Za-z_][\w-]*)\b/gim)) {
    const name = match[1];
    const start = match.index ?? 0;
    if (!aliases.some((alias) => alias.name === name && alias.start === start)) {
      aliases.push({ name, start });
    }
  }
  return aliases;
}

function findComponentPropertyValue(
  lines: string[],
  startIndex: number,
  componentIndent: number,
  propertyPattern: RegExp,
): string | null {
  for (let nextIndex = startIndex + 1; nextIndex < lines.length; nextIndex += 1) {
    const nextLine = lines[nextIndex];
    if (!nextLine.trim()) continue;
    const nextMatch = nextLine.match(COMPONENT_OR_PROPERTY_PATTERN);
    if (nextMatch && nextMatch[1].length <= componentIndent) break;
    const value = getPropertyValue(nextLine, propertyPattern);
    if (value) return value;
  }
  return null;
}

function getPropertyValue(line: string, propertyPattern: RegExp): string | null {
  if (!propertyPattern.test(line)) return null;
  const rawValue = line.replace(propertyPattern, '').trim();
  return normalizeColorValue(rawValue);
}

function getInlineScreenBackgroundColor(line: string): string | null {
  const match = line.match(/^\s*screen\b[\s\S]*\s(?:bg|backgroundColor|background)\s+(.+?)\s*$/i);
  return match ? normalizeColorValue(match[1]) : null;
}

function getInlineComponentBackgroundColor(line: string): string | null {
  const match = line.match(
    /\s(?:bg|backgroundColor|background)\s+("[^"]+"|'[^']+'|#[0-9a-f]{3,8}|rgba?\([^)]*\)|[A-Za-z][\w.-]*)\s*$/i,
  );
  return match ? normalizeColorValue(match[1]) : null;
}

function findNearestBackgroundColor(stack: Array<{ indent: number; backgroundColor?: string }>): string | null {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const color = stack[index].backgroundColor;
    if (color) return color;
  }
  return null;
}

function normalizeColorValue(value: string): string {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

function getLowContrastSeverity(foreground: string, background: string): 'error' | 'warning' | null {
  const foregroundRgb = parseStaticColor(foreground);
  const backgroundRgb = parseStaticColor(background);
  if (!foregroundRgb || !backgroundRgb) return null;
  const contrastRatio = getContrastRatio(foregroundRgb, backgroundRgb);
  if (contrastRatio < 1.5) return 'error';
  if (contrastRatio < 3) return 'warning';
  return null;
}

function parseStaticColor(color: string): [number, number, number] | null {
  const normalized = normalizeColorValue(color).toLowerCase();
  if (normalized === 'white') return [255, 255, 255];
  if (normalized === 'black') return [0, 0, 0];
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return null;
  const value = hex[1];
  if (value.length === 3) {
    return value.split('').map((part) => parseInt(`${part}${part}`, 16)) as [number, number, number];
  }
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function getContrastRatio(foreground: [number, number, number], background: [number, number, number]): number {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(rgb: [number, number, number]): number {
  const [red, green, blue] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function extractRenderableBlocks(source: string): GowooriRenderableBlock[] {
  const blocks: GowooriRenderableBlock[] = [];
  const normalizedSource = String(source || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  for (const fence of scanMarkdownCodeFences(normalizedSource)) {
    const { lang } = getMarkdownCodeFenceInfo(fence.info);
    if (!XCON_LANGUAGE_PATTERN.test(lang)) continue;
    blocks.push({
      lang,
      body: fence.code,
      start: fence.start,
    });
  }
  return blocks;
}
