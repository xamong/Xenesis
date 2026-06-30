import mermaid from 'mermaid';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useSplitter } from '../hooks/useSplitter';
import { useStreamingText } from '../hooks/useStreamingText';
import 'katex/dist/katex.min.css';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import type { RemoteFileProfile, RenderOptions, ThemeName } from '../../shared/types';
import { initMermaid } from '../hooks/useMermaidTheme';
import { useI18n } from '../i18n';
import {
  getMarkdownXconFormat,
  MarkdownXconBlock,
  useStableStreamingMarkdownPreview,
} from '../markdown/StreamingXconMarkdown';
import { useAppTheme } from '../ThemeContext';
import { readEditableText, saveEditableText } from '../utils/editableFileIo';

// ── Mermaid inline renderer ──────────────────────────────────────────────────

let mermaidMdSeq = 0;

function MermaidBlock({ code, theme }: { code: string; theme: ThemeName }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initMermaid(theme);
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    setError(null);
    if (!code.trim()) return;

    const id = `mmd-md-${++mermaidMdSeq}`;
    let cancelled = false;

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        const svgEl = ref.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (error) {
    return (
      <div className="md-mermaid-error">
        <span className="md-mermaid-error-title">{t('markdown.mermaidError')}</span>
        <pre className="md-mermaid-error-msg">{error}</pre>
      </div>
    );
  }

  return <div ref={ref} className="md-mermaid-block" />;
}

// ── XCON inline binding controls ─────────────────────────────────────────────

type MarkdownXconDisplayMode = 'view' | 'code' | 'both';

// ── Template-lab style data binding for Markdown preview ─────────────────────

type MarkdownBindingData = Record<string, unknown>;

interface MarkdownBindingEnv {
  data: unknown;
  vars: MarkdownBindingData;
  diagnostics: string[];
}

interface MarkdownFixtureRef {
  key: string;
  kind: 'local' | 'remote';
  path: string;
  source: string;
}

interface MarkdownFixtureLoadState {
  dataByKey: Record<string, unknown>;
  diagnosticsByKey: Record<string, string>;
}

interface MarkdownBindingResult {
  markdown: string;
  vars: MarkdownBindingData;
  diagnostics: string[];
}

interface MarkdownCodeFenceMatch {
  start: number;
  end: number;
  info: string;
  content: string;
  marker: string;
  raw: string;
}

const emptyMarkdownFixtureLoadState: MarkdownFixtureLoadState = {
  dataByKey: {},
  diagnosticsByKey: {},
};

const markdownVariableReferencePattern = /\$([A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)*)/g;

function escapeMarkdownRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scanMarkdownCodeFences(source: string): MarkdownCodeFenceMatch[] {
  const text = String(source || '');
  const fences: MarkdownCodeFenceMatch[] = [];
  const openPattern = /(^|\n)[ \t]{0,3}(`{3,}|~{3,})([^\r\n]*)(?:\r?\n|$)/g;
  let openMatch: RegExpExecArray | null;

  while ((openMatch = openPattern.exec(text)) !== null) {
    const start = openMatch.index + openMatch[1].length;
    const marker = openMatch[2];
    const markerChar = marker[0];
    const info = openMatch[3].trimEnd();
    const contentStart = openPattern.lastIndex;
    const closePattern = new RegExp(
      `(^|\\n)[ \\t]{0,3}${escapeMarkdownRegex(markerChar)}{${marker.length},}[ \\t]*(?:\\r?\\n|$)`,
      'g',
    );
    closePattern.lastIndex = contentStart;
    const closeMatch = closePattern.exec(text);
    if (!closeMatch) break;

    const closingStart = closeMatch.index + closeMatch[1].length;
    const end = closePattern.lastIndex;
    fences.push({
      start,
      end,
      info,
      content: text.slice(contentStart, closingStart),
      marker,
      raw: text.slice(start, end),
    });
    openPattern.lastIndex = end;
  }

  return fences;
}

function renderMarkdownFence(marker: string, info: string, code: string): string {
  const body = code.endsWith('\n') ? code : `${code}\n`;
  return `${marker}${info}\n${body}${marker}\n`;
}

function getMarkdownFenceParts(info: string): { lang: string; args: string[] } {
  const [language, ...args] = String(info || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return { lang: (language || '').toLowerCase(), args };
}

function isMarkdownFixtureFenceLanguage(lang: string): boolean {
  return lang === 'xcon-chain-fixture' || lang === 'chain-fixture' || lang === 'fixture' || lang === 'json-fixture';
}

function isMarkdownBindingFenceLanguage(lang: string): boolean {
  return lang === 'xcon-chain' || lang === 'chain' || lang === 'sugar';
}

function isMarkdownSketchFenceLanguage(lang: string): boolean {
  return lang === 'xcon-sketch' || lang === 'sketch';
}

function getMarkdownXconDisplayMode(args: string[]): MarkdownXconDisplayMode {
  const normalized = args.map((arg) => arg.trim().toLowerCase()).filter(Boolean);
  for (let index = 0; index < normalized.length; index += 1) {
    const arg = normalized[index];
    const nextArg = normalized[index + 1];
    if (arg === 'mode' && isMarkdownXconDisplayMode(nextArg)) {
      return nextArg;
    }
    const [, value] = /^(?:mode|display|view)=([a-z]+)$/.exec(arg) ?? [];
    if (isMarkdownXconDisplayMode(value)) return value;
    if (isMarkdownXconDisplayMode(arg)) return arg;
  }
  return 'view';
}

function isMarkdownXconDisplayMode(value: unknown): value is MarkdownXconDisplayMode {
  return value === 'view' || value === 'code' || value === 'both';
}

function renderMarkdownXconFenceByMode(
  marker: string,
  info: string,
  lang: string,
  args: string[],
  code: string,
): string {
  const mode = getMarkdownXconDisplayMode(args); // supports "mode=code" and "mode both"
  const sourceInfo = lang === 'xcon' ? 'xcon-code' : `${lang}-code`;
  const viewFence = renderMarkdownFence(marker, info, code);
  const codeFence = renderMarkdownFence(marker, sourceInfo, code);
  if (mode === 'code') return codeFence;
  if (mode === 'both') return `${viewFence}\n${codeFence}`;
  return viewFence;
}

function isPlainMarkdownObject(value: unknown): value is MarkdownBindingData {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneMarkdownBindingData<T>(value: T): T {
  if (value === undefined) return {} as T;
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeMarkdownFixtureData(baseValue: unknown, overrideValue: unknown): unknown {
  if (isPlainMarkdownObject(baseValue) && isPlainMarkdownObject(overrideValue)) {
    const output: MarkdownBindingData = { ...baseValue };
    for (const [key, value] of Object.entries(overrideValue)) {
      output[key] = Object.hasOwn(output, key)
        ? mergeMarkdownFixtureData(output[key], value)
        : cloneMarkdownBindingData(value);
    }
    return output;
  }
  return cloneMarkdownBindingData(overrideValue);
}

function getMarkdownFixturePathSource(content: string): string {
  const source = String(content || '').trim();
  if (!source || source.startsWith('{') || source.startsWith('[')) return '';
  const line =
    source
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find(Boolean) ?? '';
  return line
    .replace(/^path\s*[:=]\s*/i, '')
    .replace(/^file\s*[:=]\s*/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function parseMarkdownFixtureJson(content: string): unknown {
  return JSON.parse(String(content || '{}'));
}

function resolveMarkdownFixturePath(currentFilePath: string, fixturePath: string): string | null {
  const source = fixturePath.trim();
  if (!source) return null;
  if (/^[A-Za-z]:[\\/]/.test(source)) return source;
  if (source.startsWith('file://')) {
    try {
      let result = decodeURIComponent(new URL(source).pathname);
      if (/^\/[A-Za-z]:\//.test(result)) result = result.slice(1).replace(/\//g, '\\');
      return result;
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(source)) return null;
  return resolveFilePath(currentFilePath, source);
}

function resolveRemoteMarkdownFixturePath(currentRemotePath: string | undefined, fixturePath: string): string | null {
  const source = fixturePath.trim().replace(/\\/g, '/');
  if (!source || /^[A-Za-z]:\//.test(source) || source.startsWith('file://') || /^https?:\/\//i.test(source))
    return null;
  if (source.startsWith('/')) return normalizeRemoteMarkdownPath(source);
  if (!currentRemotePath) return null;
  const base = currentRemotePath.replace(/\\/g, '/');
  const baseDir = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '';
  return normalizeRemoteMarkdownPath(baseDir + source);
}

function normalizeRemoteMarkdownPath(source: string): string {
  const absolute = source.startsWith('/');
  const parts: string[] = [];
  for (const part of source.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return `${absolute ? '/' : ''}${parts.join('/')}`;
}

function resolveMarkdownFixtureRef(
  currentFilePath: string,
  currentRemotePath: string | undefined,
  fixturePath: string,
): MarkdownFixtureRef | null {
  const remotePath = resolveRemoteMarkdownFixturePath(currentRemotePath, fixturePath);
  if (remotePath) {
    return {
      key: `remote:${remotePath}`,
      kind: 'remote',
      path: remotePath,
      source: fixturePath,
    };
  }

  const localPath = resolveMarkdownFixturePath(currentFilePath, fixturePath);
  if (!localPath) return null;
  return {
    key: `local:${localPath}`,
    kind: 'local',
    path: localPath,
    source: fixturePath,
  };
}

function collectMarkdownFixtureRefs(
  source: string,
  currentFilePath: string,
  currentRemotePath?: string,
): MarkdownFixtureRef[] {
  const refs = new Map<string, MarkdownFixtureRef>();
  for (const fence of scanMarkdownCodeFences(source)) {
    const { lang } = getMarkdownFenceParts(fence.info);
    if (!isMarkdownFixtureFenceLanguage(lang)) continue;
    try {
      parseMarkdownFixtureJson(fence.content);
    } catch {
      const fixturePath = getMarkdownFixturePathSource(fence.content);
      const ref = resolveMarkdownFixtureRef(currentFilePath, currentRemotePath, fixturePath);
      if (ref) refs.set(ref.key, ref);
    }
  }
  return [...refs.values()];
}

function getMarkdownBindingAlias(args: string[]): string {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === 'as' && args[index + 1]) return args[index + 1].trim();
    if (arg.startsWith('as=')) return arg.slice(3).trim();
  }
  const first = args[0] || '';
  return /^[A-Za-z_][\w.-]*$/.test(first) ? first : '';
}

function splitMarkdownPipeline(expression: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote = '';
  let escaped = false;
  let depth = 0;
  for (const char of expression) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      current += char;
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      current += char;
      continue;
    }
    if (char === quote) {
      quote = '';
      current += char;
      continue;
    }
    if (!quote && char === '(') depth += 1;
    if (!quote && char === ')') depth = Math.max(0, depth - 1);
    if (!quote && depth === 0 && char === '|') {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function stripMarkdownExpressionPrefix(expression: string): string {
  return expression.trim().replace(/^=\s*/, '');
}

function evaluateMarkdownBindingExpression(expression: string, data: unknown, vars: MarkdownBindingData = {}): unknown {
  const source = stripMarkdownExpressionPrefix(expression);
  if (!source) return '';
  const pipeline = splitMarkdownPipeline(source);
  let value = evaluateMarkdownBindingOperand(pipeline[0] ?? '', data, vars);
  for (const segment of pipeline.slice(1)) {
    value = applyMarkdownBindingOperator(value, segment, data, vars);
  }
  return value;
}

function evaluateMarkdownBindingOperand(operand: string, data: unknown, vars: MarkdownBindingData): unknown {
  let source = operand.trim();
  if (!source) return '';
  if (source.startsWith('(') && source.endsWith(')')) source = source.slice(1, -1).trim();
  if ((source.startsWith('"') && source.endsWith('"')) || (source.startsWith("'") && source.endsWith("'"))) {
    return source
      .slice(1, -1)
      .replace(/\\(["'\\])/g, '$1')
      .replace(/\\n/g, '\n');
  }
  if (source === 'true') return true;
  if (source === 'false') return false;
  if (source === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(source)) return Number(source);
  const path = source.startsWith('$') ? source.slice(1) : source;
  const resolved = resolveMarkdownNamedValue(path, data, vars);
  return resolved.found ? resolved.value : undefined;
}

function applyMarkdownBindingOperator(
  value: unknown,
  segment: string,
  data: unknown,
  vars: MarkdownBindingData,
): unknown {
  const trimmed = segment.trim();
  const [operator = '', ...restParts] = trimmed.split(/\s+/);
  const rest = trimmed.slice(operator.length).trim();
  switch (operator) {
    case 'sum':
      return sumMarkdownValues(value, rest);
    case 'format':
      return formatMarkdownBindingNumber(value, evaluateMarkdownBindingOperand(rest, data, vars));
    case 'concat':
      return `${formatMarkdownBindingValue(value)}${formatMarkdownBindingValue(evaluateMarkdownBindingOperand(rest, data, vars))}`;
    case 'sortBy':
      return sortMarkdownBindingArray(value, restParts[0] ?? '', (restParts[1] ?? 'asc').toLowerCase() === 'desc');
    case 'map':
      return Array.isArray(value) ? value.map((item) => resolveMarkdownDataPath(item, rest).value) : [];
    case 'join':
      return Array.isArray(value)
        ? value.map(formatMarkdownBindingValue).join(String(evaluateMarkdownBindingOperand(rest, data, vars) ?? ''))
        : formatMarkdownBindingValue(value);
    case 'default': {
      const fallback = evaluateMarkdownBindingOperand(rest, data, vars);
      return value === undefined || value === null || value === '' ? fallback : value;
    }
    case 'upper':
      return formatMarkdownBindingValue(value).toUpperCase();
    case 'lower':
      return formatMarkdownBindingValue(value).toLowerCase();
    default:
      throw new Error(`Unsupported binding operator: ${operator || segment}`);
  }
}

function sumMarkdownValues(value: unknown, fieldPath: string): number {
  if (!Array.isArray(value)) return Number(value) || 0;
  return value.reduce((total, item) => {
    const itemValue = fieldPath ? resolveMarkdownDataPath(item, fieldPath).value : item;
    return total + (Number(itemValue) || 0);
  }, 0);
}

function sortMarkdownBindingArray(value: unknown, fieldPath: string, desc: boolean): unknown[] {
  if (!Array.isArray(value)) return [];
  return [...value].sort((left, right) => {
    const a = resolveMarkdownDataPath(left, fieldPath).value;
    const b = resolveMarkdownDataPath(right, fieldPath).value;
    const result =
      typeof a === 'number' && typeof b === 'number'
        ? a - b
        : formatMarkdownBindingValue(a).localeCompare(formatMarkdownBindingValue(b));
    return desc ? -result : result;
  });
}

function formatMarkdownBindingNumber(value: unknown, patternValue: unknown): string {
  const pattern = String(patternValue ?? '#,###');
  const number = Number(value);
  if (!Number.isFinite(number)) return formatMarkdownBindingValue(value);
  const decimalPart = pattern.match(/\.[#0]+/)?.[0];
  const fractionDigits = decimalPart ? Math.max(0, decimalPart.length - 1) : 0;
  const formatted = number.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return pattern.replace(/[#,]+(?:\.[#0]+)?/, formatted);
}

function resolveMarkdownNamedValue(
  name: string,
  data: unknown,
  vars: MarkdownBindingData,
): { found: boolean; value: unknown } {
  if (Object.hasOwn(vars, name)) {
    return { found: true, value: vars[name] };
  }
  const [head, ...tail] = name.split('.');
  if (head && Object.hasOwn(vars, head)) {
    return tail.length ? resolveMarkdownDataPath(vars[head], tail.join('.')) : { found: true, value: vars[head] };
  }
  return resolveMarkdownDataPath(data, name);
}

function resolveMarkdownDataPath(root: unknown, path: string): { found: boolean; value: unknown } {
  const tokens = tokenizeMarkdownDataPath(path);
  if (!tokens.length) return { found: true, value: root };
  let current = root as any;
  for (const token of tokens) {
    if (current === null || current === undefined) return { found: false, value: undefined };
    if (!Object.hasOwn(Object(current), token)) return { found: false, value: undefined };
    current = current[token];
  }
  return { found: true, value: current };
}

function tokenizeMarkdownDataPath(path: string): string[] {
  const tokens: string[] = [];
  const pattern = /[^.[\]]+|\[(?:"([^"]+)"|'([^']+)'|(\d+))\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(path.trim())) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? match[0]);
  }
  return tokens;
}

function applyMarkdownBindingVariables(text: string, env: MarkdownBindingEnv, sketchMode: boolean): string {
  const source = String(text || '');
  return source.replace(markdownVariableReferencePattern, (match, name, offset) => {
    const resolved = resolveMarkdownNamedValue(name, env.data, env.vars);
    if (!resolved.found) return match;
    const value = resolved.value;
    if (!sketchMode) return formatMarkdownBindingValue(value);
    if (isInsideQuotedMarkdownSketchString(source, offset)) return escapeMarkdownSketchStringFragment(value);
    if (value && typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(formatMarkdownBindingValue(value));
  });
}

function isInsideQuotedMarkdownSketchString(source: string, offset: number): boolean {
  const lineStart = source.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  let quote = '';
  let escaped = false;
  for (let index = lineStart; index < offset; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === '`') && !quote) {
      quote = char;
    } else if (char === quote) {
      quote = '';
    }
  }
  return Boolean(quote);
}

function escapeMarkdownSketchStringFragment(value: unknown): string {
  return formatMarkdownBindingValue(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
}

function formatMarkdownBindingValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatMarkdownBindingValue).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  if (value === null || value === undefined) return '';
  return String(value);
}

function resolveMarkdownTemplateBindings(
  source: string,
  fixtureState: MarkdownFixtureLoadState,
  currentFilePath: string,
  currentRemotePath?: string,
): MarkdownBindingResult {
  const env: MarkdownBindingEnv = {
    data: {},
    vars: {},
    diagnostics: Object.values(fixtureState.diagnosticsByKey),
  };
  const parts: string[] = [];
  let lastIndex = 0;

  for (const fence of scanMarkdownCodeFences(source)) {
    parts.push(applyMarkdownBindingVariables(source.slice(lastIndex, fence.start), env, false));

    const info = fence.info;
    const fenceContent = fence.content;
    const { lang, args } = getMarkdownFenceParts(info);

    if (isMarkdownFixtureFenceLanguage(lang)) {
      try {
        env.data = mergeMarkdownFixtureData(env.data, parseMarkdownFixtureJson(fenceContent));
      } catch (error) {
        const fixturePath = getMarkdownFixturePathSource(fenceContent);
        const ref = resolveMarkdownFixtureRef(currentFilePath, currentRemotePath, fixturePath);
        if (!ref) {
          env.diagnostics.push(`Fixture error: ${error instanceof Error ? error.message : String(error)}`);
        } else if (Object.hasOwn(fixtureState.dataByKey, ref.key)) {
          env.data = mergeMarkdownFixtureData(env.data, fixtureState.dataByKey[ref.key]);
        } else if (fixtureState.diagnosticsByKey[ref.key]) {
          env.diagnostics.push(fixtureState.diagnosticsByKey[ref.key]);
        }
      }
    } else if (isMarkdownBindingFenceLanguage(lang)) {
      try {
        const alias = getMarkdownBindingAlias(args);
        const value = evaluateMarkdownBindingExpression(fenceContent, env.data, env.vars);
        if (alias) env.vars[alias] = value;
      } catch (error) {
        env.diagnostics.push(`Binding error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (getMarkdownXconFormat(lang)) {
      const resolvedCode = applyMarkdownBindingVariables(fenceContent, env, isMarkdownSketchFenceLanguage(lang));
      parts.push(renderMarkdownXconFenceByMode(fence.marker, info, lang, args, resolvedCode));
    } else {
      parts.push(fence.raw);
    }

    lastIndex = fence.end;
  }

  parts.push(applyMarkdownBindingVariables(String(source || '').slice(lastIndex), env, false));
  return {
    markdown: prependMarkdownBindingDiagnostics(parts.join(''), env.diagnostics),
    vars: env.vars,
    diagnostics: env.diagnostics,
  };
}

function prependMarkdownBindingDiagnostics(markdown: string, diagnostics: string[]): string {
  const unique = [...new Set(diagnostics.filter(Boolean))];
  if (!unique.length) return markdown;
  const lines = unique.map((message) => `> ${message.replace(/\r?\n/g, ' ')}`);
  return `${lines.join('\n')}\n\n${markdown}`;
}

interface MarkdownPaneProps {
  filePath: string;
  fileName: string;
  initialContent: string;
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
  renderOptions?: RenderOptions;
  onContentUpdate?: (content: string) => void;
  /** 마크다운 내 상대/절대 파일 링크 클릭 시 내부 뷰어로 열기 */
  onOpenFile?: (absolutePath: string) => void;
}

/**
 * 현재 파일 경로 기준으로 상대 href를 절대 경로로 변환한다.
 * URL API를 사용해 .. 등의 경로 조각도 정규화한다.
 * Windows drive-letter paths are supported.
 */
function resolveFilePath(currentFilePath: string, href: string): string | null {
  if (!currentFilePath) return null;
  try {
    const normalized = currentFilePath.replace(/\\/g, '/');
    const withSlash = normalized.startsWith('/') ? normalized : '/' + normalized;
    const baseUrl = new URL('file://' + withSlash);
    const resolved = new URL(href, baseUrl);
    if (resolved.protocol !== 'file:') return null;
    let result = decodeURIComponent(resolved.pathname);
    // Convert file URL drive-letter paths back to native Windows separators.
    if (/^\/[A-Za-z]:\//.test(result)) {
      result = result.slice(1).replace(/\//g, '\\');
    }
    return result;
  } catch {
    return null;
  }
}

type ViewMode = 'preview' | 'edit' | 'split';

export function MarkdownPane({
  filePath,
  fileName,
  initialContent,
  remoteFileProfile,
  remoteFilePath,
  renderOptions,
  onContentUpdate,
  onOpenFile,
}: MarkdownPaneProps) {
  const appTheme = useAppTheme();
  const { t } = useI18n();
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<ViewMode>('preview');
  const [zoom, setZoom] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { ratio: splitRatio, onSplitterMouseDown } = useSplitter(bodyRef);
  const editorExts = useMemo(
    () => [
      markdown(),
      EditorView.theme({
        '.cm-scroller': { fontFamily: 'var(--font-mono, "Cascadia Code", Consolas, monospace)' },
      }),
    ],
    [],
  );

  // Sync to DockContent when content changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => onContentUpdate?.(content), 500);
    return () => clearTimeout(timer);
  }, [content, onContentUpdate]);

  const handleChange = useCallback((val: string) => {
    setContent(val);
    setIsModified(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isModified || isSaving) return;
    try {
      setIsSaving(true);
      const result = await saveEditableText({ filePath, remoteFileProfile, remoteFilePath }, content);
      setSaveMsg(result.saved ? t('common.saved') : t('common.saveFailed'));
      if (result.saved) setIsModified(false);
    } catch {
      setSaveMsg(t('common.saveError'));
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 2000);
    }
  }, [content, filePath, isModified, isSaving, remoteFilePath, remoteFileProfile, t]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleRefresh = useCallback(async () => {
    const result = await readEditableText({ filePath, remoteFileProfile, remoteFilePath });
    if (result?.content !== undefined) {
      setContent(result.content);
      setIsModified(false);
    }
  }, [filePath, remoteFilePath, remoteFileProfile]);

  const { isRefreshing, refresh } = usePaneRefresh({ onRefresh: handleRefresh });
  const [fixtureState, setFixtureState] = useState<MarkdownFixtureLoadState>(emptyMarkdownFixtureLoadState);

  useEffect(() => {
    const refs = collectMarkdownFixtureRefs(content, filePath, remoteFilePath);
    if (!refs.length) {
      setFixtureState(emptyMarkdownFixtureLoadState);
      return;
    }

    let cancelled = false;
    Promise.all(
      refs.map(async (ref) => {
        try {
          const result =
            ref.kind === 'remote'
              ? remoteFileProfile
                ? await window.remoteFileAPI.readFile(remoteFileProfile, ref.path)
                : null
              : await window.fileAPI.readFile(ref.path);
          if (!result) throw new Error('Fixture file could not be read.');
          return { ref, data: parseMarkdownFixtureJson(result.content) };
        } catch (error) {
          return {
            ref,
            error: `Fixture ${ref.source}: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const dataByKey: Record<string, unknown> = {};
        const diagnosticsByKey: Record<string, string> = {};
        for (const item of results) {
          if ('error' in item) {
            diagnosticsByKey[item.ref.key] = item.error ?? 'Fixture load failed.';
          } else {
            dataByKey[item.ref.key] = item.data;
          }
        }
        setFixtureState({ dataByKey, diagnosticsByKey });
      })
      .catch(() => {
        if (!cancelled) setFixtureState(emptyMarkdownFixtureLoadState);
      });

    return () => {
      cancelled = true;
    };
  }, [content, filePath, remoteFilePath, remoteFileProfile]);

  const boundContent = useMemo(
    () => resolveMarkdownTemplateBindings(content, fixtureState, filePath, remoteFilePath),
    [content, fixtureState, filePath, remoteFilePath],
  );
  const streamedMarkdown = useStreamingText(boundContent.markdown, renderOptions, isModified);
  const previewMarkdown = useStableStreamingMarkdownPreview(streamedMarkdown.text);

  const insertText = useCallback((before: string, after = '') => {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    view.dispatch({
      changes: { from, to, insert: before + selected + after },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
    });
    view.focus();
  }, []);

  const toolbar = useMemo(
    () => [
      { label: 'B', title: t('markdown.bold'), action: () => insertText('**', '**') },
      { label: 'I', title: t('markdown.italic'), action: () => insertText('_', '_') },
      { label: 'S', title: t('markdown.strikethrough'), action: () => insertText('~~', '~~') },
      { label: 'H1', title: t('markdown.h1'), action: () => insertText('# ') },
      { label: 'H2', title: t('markdown.h2'), action: () => insertText('## ') },
      { label: '`', title: t('markdown.inlineCode'), action: () => insertText('`', '`') },
      { label: '```', title: t('markdown.codeBlock'), action: () => insertText('```\n', '\n```') },
      { label: '—', title: t('markdown.hr'), action: () => insertText('\n---\n') },
      { label: '☑', title: t('markdown.todo'), action: () => insertText('- [ ] ') },
      { label: '🔗', title: t('markdown.link'), action: () => insertText('[', '](url)') },
    ],
    [insertText, t],
  );

  return (
    <div className="md-pane">
      <div className="md-toolbar">
        <span className="md-filename" title={filePath}>
          {fileName}
          {isModified ? ' •' : ''}
        </span>
        <div className="md-toolbar-sep" />
        <div className="md-mode-btns">
          {(['preview', 'edit', 'split'] as ViewMode[]).map((m) => (
            <button key={m} className={`md-mode-btn${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>
              {m === 'preview' ? t('markdown.preview') : m === 'edit' ? t('markdown.edit') : t('markdown.split')}
            </button>
          ))}
        </div>
        <div className="md-toolbar-sep" />
        {mode !== 'preview' &&
          toolbar.map((btn) => (
            <button key={btn.label} className="md-fmt-btn" title={btn.title} onClick={btn.action}>
              {btn.label}
            </button>
          ))}
        <div className="md-toolbar-flex" />
        <button
          className={`pane-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
          onClick={refresh}
          disabled={isRefreshing}
          title={t('common.reloadFromDisk')}
        >
          ↺
        </button>
        <div className="md-zoom-ctrl">
          <button onClick={() => setZoom((z) => Math.max(50, z - 10))}>−</button>
          <span>{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(200, z + 10))}>+</button>
        </div>
        <button
          className={`md-save-btn${isModified ? ' modified' : ''}`}
          onClick={handleSave}
          disabled={isSaving || !isModified}
          title={t('common.saveCtrlS')}
        >
          {isSaving ? t('common.saving') : (saveMsg ?? t('common.save'))}
        </button>
      </div>

      <div ref={bodyRef} className={`md-body mode-${mode}`}>
        {(mode === 'edit' || mode === 'split') && (
          <div
            className="md-editor"
            style={mode === 'split' ? { width: `${splitRatio * 100}%`, flex: 'none' } : undefined}
          >
            <CodeMirror
              ref={editorRef}
              value={content}
              theme={oneDark}
              extensions={editorExts}
              onChange={handleChange}
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                drawSelection: true,
                dropCursor: false,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: false,
                closeBrackets: false,
                autocompletion: false,
                rectangularSelection: false,
                crosshairCursor: false,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                searchKeymap: true,
              }}
            />
          </div>
        )}
        {mode === 'split' && <div className="pane-splitter" onMouseDown={onSplitterMouseDown} />}
        {(mode === 'preview' || mode === 'split') && (
          <div className="md-preview" style={{ zoom: `${zoom}%` }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                img({ src, alt }) {
                  return <img src={src} alt={alt ?? ''} style={{ maxWidth: '100%' }} />;
                },
                code({ className, children, ...props }) {
                  const lang = /language-([\w-]+)/.exec(className ?? '')?.[1] ?? '';
                  const codeStr = String(children).replace(/\n$/, '');
                  if (lang === 'mermaid') {
                    return <MermaidBlock code={codeStr} theme={appTheme} />;
                  }
                  const xconFormat = getMarkdownXconFormat(lang);
                  if (xconFormat) {
                    return <MarkdownXconBlock code={codeStr} format={xconFormat} theme={appTheme} />;
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                a({ href, children, ...props }) {
                  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    if (!href) return;

                    // 외부 URL → OS 기본 브라우저 (IPC 경유, 네비게이션 없음)
                    if (/^https?:\/\//i.test(href) || href.startsWith('//') || href.startsWith('mailto:')) {
                      window.fileAPI.openExternal(href).catch(() => {});
                      return;
                    }

                    // 앵커 링크 → 동일 페이지 내 스크롤
                    if (href.startsWith('#')) {
                      const el = document.getElementById(href.slice(1));
                      el?.scrollIntoView({ behavior: 'smooth' });
                      return;
                    }

                    // 상대/절대 파일 경로 → 내부 뷰어로 열기
                    if (onOpenFile) {
                      const resolved = resolveFilePath(filePath, href);
                      if (resolved) {
                        onOpenFile(resolved);
                        return;
                      }
                    }
                  };
                  return (
                    <a href={href} onClick={handleClick} style={{ cursor: 'pointer' }} {...props}>
                      {children}
                    </a>
                  );
                },
              }}
            >
              {previewMarkdown}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
