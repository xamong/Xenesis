import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RemoteFileProfile, RenderOptions } from '../../shared/types';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useSplitter } from '../hooks/useSplitter';
import { useStreamingText } from '../hooks/useStreamingText';
import { useI18n } from '../i18n';
import { saveEditableText } from '../utils/editableFileIo';

// ── XCON 순서 보존 키-값 컨테이너 인터페이스 ──────────────────────────────
interface XconLike {
  get(key: string | number): unknown;
  set(key: string, value: unknown): XconLike;
  contains(key: string): boolean;
  count: number;
  keys: string[];
  values: unknown[];
  getString(key: string): string;
  [Symbol.iterator](): Iterator<{ key: string; value: unknown }>;
}

interface SketchRecoveryError {
  line: number;
  column?: number;
  message: string;
  source?: string;
}

// index.html의 <script src="./lib/xcon/XCON.js">로 전역 노출됨
// xamong-sketch.js 로드 후 fromSketch / fromSketchLenient / toSketch / detectSyntax 가 패치됨
declare const XCON: {
  fromXml(src: string): XconLike | null;
  fromJSON(src: string | object): XconLike | null;
  fromTagless(src: string): XconLike | null;
  fromSketch?(src: string): XconLike | null;
  fromSketchLenient?(
    src: string,
    options?: { maxRecoveries?: number },
  ): { document: XconLike | null; errors: SketchRecoveryError[] };
  toSketch?(dict: XconLike, options?: { pretty?: boolean }): string;
  detectSyntax?(src: string): 'json' | 'xml' | 'tagless' | 'sketch';
  deserialize(src: string): XconLike | null;
  isXCONObject(obj: unknown): boolean;
  toJSON(dict: XconLike, pretty: boolean): string;
  serialize(dict: XconLike, comment: boolean): string;
  toTagless(dict: XconLike, alist?: string, endAlist?: string): string;
  TAGLESS: boolean;
  setAListType(alist: string, endAlist?: string, tagless?: boolean): void;
};

// ── XCON 헬퍼 ────────────────────────────────────────────────────────────────

/** XCON 객체 여부 판별 (duck typing) */
function isXconObj(v: unknown): v is XconLike {
  return (
    typeof v === 'object' && v !== null && typeof (v as XconLike).get === 'function' && Symbol.iterator in (v as object)
  );
}

/** XCON 객체에서 문자열 값 안전하게 추출 */
function xStr(x: XconLike, key: string): string {
  const v = x.get(key);
  if (v === null || v === undefined || isXconObj(v) || Array.isArray(v)) return '';
  return String(v);
}

/** XCON 색상 문자열("R,G,B,A") → CSS rgba() */
function xconColorToCss(colorStr: string): string {
  const parts = colorStr.split(',').map((p) => parseInt(p.trim(), 10));
  if (parts.length >= 3 && !parts.some(isNaN)) {
    const a = parts[3] !== undefined ? (parts[3] / 255).toFixed(2) : '1';
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${a})`;
  }
  return colorStr; // hex 등 그대로
}

// ── 데이터 추출 타입 ──────────────────────────────────────────────────────────

interface XconConfigEntry {
  key: string;
  value: string;
}
interface XconColorEntry {
  key: string;
  css: string;
  raw: string;
}
interface XconColumn {
  name: string;
  dataType: string;
  key: boolean;
}
interface XconTable {
  name: string;
  columns: XconColumn[];
  rows: Record<string, string>[];
}
interface XconApiParam {
  name: string;
  value: string;
}
interface XconApiEndpoint {
  name: string;
  endpoint: string;
  version: string;
  description: string;
  caller: string;
  method: string;
  parameters: XconApiParam[];
  returns: string[];
  action: Record<string, unknown> | null;
}
interface XconArrayField {
  key: string;
  value: string;
}
interface XconArrayItem {
  fields: XconArrayField[];
}
interface XconArraySection {
  key: string;
  items: XconArrayItem[];
}

/** 최상위 단순값 → Config 엔트리 배열 */
function extractConfig(xcon: XconLike): XconConfigEntry[] {
  const result: XconConfigEntry[] = [];
  for (const { key, value } of xcon) {
    if (value !== null && value !== undefined && !isXconObj(value) && !Array.isArray(value)) {
      result.push({ key, value: String(value) });
    }
  }
  return result;
}

/** colors / typography / layout / effects + 기타 섹션 → Style 데이터 */

/** XCON 값이 색상(R,G,B,A 또는 hex) 형태인지 추정 */
function looksLikeColor(raw: string): boolean {
  // "R,G,B" 또는 "R,G,B,A" 형태
  if (/^\d{1,3},\d{1,3},\d{1,3}(,\d{1,3})?$/.test(raw.trim())) return true;
  // #hex
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw.trim())) return true;
  return false;
}

/**
 * XCON 객체를 재귀적으로 순회해 색상 값은 XconColorEntry 로,
 * 나머지 스칼라는 XconConfigEntry 로 분류한다.
 */
function collectStyleValues(obj: XconLike, colors: XconColorEntry[], others: XconConfigEntry[], prefix = '') {
  for (const { key, value } of obj) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (isXconObj(value)) {
      collectStyleValues(value, colors, others, label);
    } else if (!Array.isArray(value) && value !== null && value !== undefined) {
      const raw = String(value);
      if (looksLikeColor(raw)) {
        colors.push({ key: label, css: xconColorToCss(raw), raw });
      } else {
        others.push({ key: label, value: raw });
      }
    }
  }
}

interface StyleSection {
  title: string;
  entries: XconConfigEntry[];
}

function extractStyle(xcon: XconLike) {
  const colors: XconColorEntry[] = [];
  const sections: StyleSection[] = [];

  // ── colors 섹션 ─────────────────────────────────────────────────────────
  const colorsVal = xcon.get('colors');
  if (isXconObj(colorsVal)) {
    const colorOthers: XconConfigEntry[] = [];
    collectStyleValues(colorsVal, colors, colorOthers);
    // colorOthers는 색상이 아닌 값 - 혹시 있으면 일반 섹션으로
    if (colorOthers.length) sections.push({ title: 'xconViewer.colorsOther', entries: colorOthers });
  }

  // 최상위에 color/bg/fg 포함 키가 있으면 색상으로 추정
  for (const { key, value } of xcon) {
    if (typeof value !== 'string' || !value) continue;
    const lk = key.toLowerCase();
    if (
      lk.includes('color') ||
      lk.startsWith('bg') ||
      lk.startsWith('fg') ||
      lk.includes('background') ||
      lk.includes('foreground')
    ) {
      if (!colors.find((c) => c.key === key)) {
        const raw = value;
        colors.push({ key, css: xconColorToCss(raw), raw });
      }
    }
  }

  // ── 알려진 섹션들: 재귀 flatten ─────────────────────────────────────────
  const knownSections: [string, string][] = [
    ['typography', 'xconViewer.typography'],
    ['layout', 'xconViewer.layout'],
    ['effects', 'xconViewer.effects'],
    ['spacing', 'xconViewer.spacing'],
    ['radius', 'xconViewer.borderRadius'],
    ['shadow', 'xconViewer.shadow'],
    ['animation', 'xconViewer.animation'],
  ];

  for (const [sectionKey, sectionTitle] of knownSections) {
    const val = xcon.get(sectionKey);
    if (!isXconObj(val)) continue;
    const sColors: XconColorEntry[] = [];
    const sEntries: XconConfigEntry[] = [];
    collectStyleValues(val, sColors, sEntries, '');
    // 색상이 섹션 안에 있으면 전역 colors 에 prefix 붙여 추가
    sColors.forEach((e) => colors.push({ key: `${sectionKey}.${e.key}`, css: e.css, raw: e.raw }));
    if (sEntries.length) sections.push({ title: sectionTitle, entries: sEntries });
  }

  // ── 위에서 처리 안 된 최상위 XCON 섹션들도 수집 ──────────────────────────
  const handled = new Set(['colors', 'typography', 'layout', 'effects', 'spacing', 'radius', 'shadow', 'animation']);
  for (const { key, value } of xcon) {
    if (handled.has(key) || !isXconObj(value)) continue;
    const sColors: XconColorEntry[] = [];
    const sEntries: XconConfigEntry[] = [];
    collectStyleValues(value, sColors, sEntries, '');
    sColors.forEach((e) => colors.push({ key: `${key}.${e.key}`, css: e.css, raw: e.raw }));
    if (sEntries.length) sections.push({ title: key, entries: sEntries });
  }

  return { colors, sections };
}

const DB_SKIP = new Set([
  'refresh',
  'ddls',
  'insert',
  'type',
  'name',
  'title',
  'version',
  'platform',
  'theme',
  'locale',
  'homepage',
  'colors',
  'typography',
  'layout',
  'screens',
  'description',
  'width',
  'height',
  'mapfile',
  'globalstyle',
  'database',
  'api',
  'caching',
  'hotcaching',
]);

/** xTable 타입 엔트리 → Table 배열 (XCON API 활용) */
function extractTables(xcon: XconLike): XconTable[] {
  const tables: XconTable[] = [];
  for (const { key, value } of xcon) {
    if (DB_SKIP.has(key) || !isXconObj(value)) continue;
    if (xStr(value, 'type') !== 'xTable') continue;

    const columns: XconColumn[] = [];
    const colsVal = value.get('columns');
    if (Array.isArray(colsVal)) {
      for (const col of colsVal) {
        if (isXconObj(col)) {
          columns.push({
            name: xStr(col, 'name'),
            dataType: xStr(col, 'dataType') || 'string',
            key: xStr(col, 'key').toLowerCase() === 'true',
          });
        }
      }
    }

    const rows: Record<string, string>[] = [];
    const rowsVal = value.get('rows');
    if (Array.isArray(rowsVal)) {
      for (const row of rowsVal) {
        if (isXconObj(row)) {
          const r: Record<string, string> = {};
          for (const { key: k, value: v } of row) r[k] = String(v ?? '');
          rows.push(r);
        }
      }
    }
    tables.push({ name: key, columns, rows });
  }
  return tables;
}

/** xNode 타입 엔트리 → API 엔드포인트 배열 (XCON API 활용) */
function extractApiEndpoints(xcon: XconLike): XconApiEndpoint[] {
  const endpoints: XconApiEndpoint[] = [];
  for (const { key, value } of xcon) {
    if (DB_SKIP.has(key) || !isXconObj(value)) continue;
    if (xStr(value, 'type') !== 'xNode') continue;

    const actionVal = value.get('action');
    const method = isXconObj(actionVal) ? xStr(actionVal, 'method') : '';

    const paramXcon = value.get('parameter');
    const parameters: XconApiParam[] = [];
    if (isXconObj(paramXcon)) {
      for (const { key: k, value: v } of paramXcon) {
        if (!isXconObj(v) && !Array.isArray(v)) parameters.push({ name: k, value: String(v ?? '') });
      }
    }

    const returnsVal = value.get('returns');
    const returns: string[] = Array.isArray(returnsVal) ? returnsVal.map((r) => String(r)) : [];

    // action을 plain object로 변환 (렌더링용)
    let actionPlain: Record<string, unknown> | null = null;
    if (isXconObj(actionVal)) {
      actionPlain = {};
      for (const { key: k, value: v } of actionVal) actionPlain[k] = v;
    }

    endpoints.push({
      name: key,
      endpoint: xStr(value, 'endpoint'),
      version: xStr(value, 'version'),
      description: xStr(value, 'description'),
      caller: xStr(value, 'caller'),
      method,
      parameters,
      returns,
      action: actionPlain,
    });
  }
  return endpoints;
}

/** 최상위 배열 값 → 섹션별 아이템 배열로 추출 (unified 뷰에서 사용) */
function extractArraySections(xcon: XconLike): XconArraySection[] {
  const result: XconArraySection[] = [];
  for (const { key, value } of xcon) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const items: XconArrayItem[] = [];
    for (const item of value) {
      if (isXconObj(item)) {
        const fields: XconArrayField[] = [];
        for (const { key: k, value: v } of item) {
          if (v !== null && v !== undefined && !isXconObj(v) && !Array.isArray(v)) {
            fields.push({ key: k, value: String(v) });
          }
        }
        if (fields.length > 0) items.push({ fields });
      } else if (item !== null && item !== undefined) {
        items.push({ fields: [{ key: '', value: String(item) }] });
      }
    }
    if (items.length > 0) result.push({ key, items });
  }
  return result;
}

// ── 파일명 → 뷰어 타입 ───────────────────────────────────────────────────────

// ── XCON 컴포넌트 뷰어 표시 조건 ──────────────────────────────────────────────
/*
XCON에 type, pos, components 키가 있으면 뷰어에 표시한다.
또는 type에 form, xForm, panel, label, button, list, xList 이 있으면 뷰어에 표시한다.
아니면 type에 아래 목록 중 하나 이상이 있으면 뷰어에 표시한다.
frame
import
grid
flexBox
stack
spacer
divider
card
text
textView
shape
icon
badge
avatar
textField
passwordField
textarea
checkbox
radioButton
select
slider
switch
colorPicker
datePicker
timePicker
filePicker
imagePicker
rating
image
videoView
webView
banner
carousel
gallery
treeView
chart
dataViz
networkDiagram
map
calendar
qrCode
barcode
signaturePad
flipbook
fileUpload
alert
notice
tooltip
modal
tabs
accordion
progressBar
spinner
searchBar
chatBubble
*/

type XconFileType = 'config' | 'database' | 'api' | 'xcon';

/** 파일명을 보고 어떤 전용 뷰어를 쓸지 결정한다 */
function getXconFileType(name: string): XconFileType {
  const n = name.toLowerCase();
  if (n === 'database.xcon' || n === 'database.xconj') return 'database';
  if (n === 'api.xcon' || n === 'api.xconj') return 'api';
  if (['first.xcon', 'map.xcon', 'gstyle.xcon', 'first.xconj', 'map.xconj', 'gstyle.xconj'].includes(n))
    return 'config';
  return 'xcon';
}

// ── XCON UI 컴포넌트 타입 목록 ────────────────────────────────────────────────
// XCON에 type, pos, components 키가 있으면 UI 뷰어에 표시한다.
// 또는 type 값이 아래 목록 중 하나이면 UI 뷰어에 표시한다.
const UI_COMPONENT_TYPES = new Set([
  'form',
  'xForm',
  'panel',
  'label',
  'button',
  'list',
  'xList',
  'frame',
  'import',
  'grid',
  'flexBox',
  'stack',
  'spacer',
  'divider',
  'card',
  'text',
  'textView',
  'shape',
  'icon',
  'badge',
  'avatar',
  'textField',
  'passwordField',
  'textarea',
  'checkbox',
  'radioButton',
  'select',
  'slider',
  'switch',
  'colorPicker',
  'datePicker',
  'timePicker',
  'filePicker',
  'imagePicker',
  'rating',
  'image',
  'videoView',
  'webView',
  'banner',
  'carousel',
  'gallery',
  'treeView',
  'chart',
  'dataViz',
  'networkDiagram',
  'map',
  'calendar',
  'qrCode',
  'barcode',
  'signaturePad',
  'flipbook',
  'fileUpload',
  'alert',
  'notice',
  'tooltip',
  'modal',
  'tabs',
  'accordion',
  'progressBar',
  'spinner',
  'searchBar',
  'chatBubble',
]);

/** XCON 객체가 UI 뷰어에서 표시할 수 있는 컴포넌트인지 판별 */
function isUiXcon(xcon: XconLike): boolean {
  if (xcon.contains('type') && xcon.contains('pos') && xcon.contains('components')) return true;
  const typeVal = xStr(xcon, 'type');
  return typeVal !== '' && UI_COMPONENT_TYPES.has(typeVal);
}

// ── XCON 콘텐츠 기반 뷰 타입 ──────────────────────────────────────────────────
type XconViewType = 'config' | 'database' | 'api' | 'ui' | 'unified';

/**
 * 파일명으로 결정된 fileType 과 파싱된 xconObj 를 조합해 최종 뷰 타입을 결정한다.
 *
 * - 파일명이 이미 config/database/api → 그대로 사용
 * - XCON type = database / api        → database / api 패널
 * - XCON type = first, map, gstyle    → config 패널
 * - XCON type = logic, patterns, requirements → unified (renderUnified)
 * - UI 컴포넌트 조건 충족             → ui (웹뷰 렌더러)
 * - 그 외                             → unified (renderUnified)
 */
function resolveXconViewType(fileType: XconFileType, xconObj: XconLike | null): XconViewType {
  if (fileType !== 'xcon') return fileType;
  if (!xconObj) return 'ui';

  const xconType = xStr(xconObj, 'type');
  if (xconType === 'database') return 'database';
  if (xconType === 'api') return 'api';
  if (['first', 'map', 'gstyle'].includes(xconType)) return 'config';
  if (['logic', 'patterns', 'requirements'].includes(xconType)) return 'unified';
  if (isUiXcon(xconObj)) return 'ui';
  return 'unified';
}

// ── XconInfoPanel ─────────────────────────────────────────────────────────────

type InfoTab = 'config' | 'style' | 'database' | 'api';

const METHOD_COLOR: Record<string, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#eab308',
  DELETE: '#ef4444',
};

/** defaultTab: 파일 타입에 따른 초기 탭 (database.xcon → 'database', api.xcon → 'api', 나머지 → 'config') */
function XconInfoPanel({ xcon, defaultTab = 'config' }: { xcon: XconLike | null; defaultTab?: InfoTab }) {
  const { t: t18n } = useI18n();
  const [tab, setTab] = useState<InfoTab>(defaultTab);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedApi, setSelectedApi] = useState<string | null>(null);
  const [searchDb, setSearchDb] = useState('');
  const [searchApi, setSearchApi] = useState('');

  if (!xcon) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: 14,
        }}
      >
        <span>{t18n('xconViewer.parseError')}</span>
      </div>
    );
  }

  const configEntries = extractConfig(xcon);
  const { colors, sections: styleSections } = extractStyle(xcon);
  const tables = extractTables(xcon);
  const apis = extractApiEndpoints(xcon);
  const arraySections = extractArraySections(xcon);

  const hasStyle = colors.length > 0 || styleSections.length > 0;
  const hasDb = tables.length > 0;
  const hasApi = apis.length > 0;
  const hasArrays = arraySections.length > 0;

  // DB·API 없으면 탭 대신 하나의 통합 스크롤 뷰로 표시
  const useUnifiedView = !hasDb && !hasApi;

  const tabs: { id: InfoTab; label: string; count?: number }[] = [
    ...(hasDb ? [{ id: 'database' as InfoTab, label: '🗄 Database', count: tables.length }] : []),
    ...(hasApi ? [{ id: 'api' as InfoTab, label: '🔌 API', count: apis.length }] : []),
  ];

  // 탭이 없어진 경우 database로 복귀 (database/api 중 있는 것으로)
  const activeTab = tabs.find((t) => t.id === tab) ? tab : (tabs[0]?.id ?? 'database');

  const s = {
    root: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', background: '#161b27' },
    tabBar: {
      display: 'flex',
      gap: 2,
      padding: '6px 10px',
      borderBottom: '1px solid #2a3441',
      background: '#1e2535',
      flexShrink: 0,
    },
    tabBtn: (active: boolean) => ({
      padding: '4px 14px',
      borderRadius: 5,
      border: 'none',
      cursor: 'pointer',
      fontSize: 12,
      fontWeight: 600,
      background: active ? '#3b5bdb' : 'transparent',
      color: active ? '#fff' : '#8898aa',
      transition: 'all .15s',
    }),
    body: { flex: 1, overflow: 'auto', padding: 16 },
    card: { background: '#1e2535', border: '1px solid #2a3441', borderRadius: 8, padding: 16, marginBottom: 14 },
    label: { color: '#8898aa', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 },
    value: { color: '#e2e8f0', fontSize: 13 },
    key: { color: '#7dd3fc', fontSize: 12, fontFamily: 'monospace', minWidth: 130 },
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', borderBottom: '1px solid #252d3d' },
    split: { flex: 1, display: 'flex', overflow: 'hidden' },
    sidebar: { width: 220, borderRight: '1px solid #2a3441', overflow: 'auto', padding: 8, flexShrink: 0 },
    sideItem: (active: boolean) => ({
      padding: '7px 10px',
      borderRadius: 6,
      cursor: 'pointer',
      marginBottom: 4,
      fontSize: 12,
      background: active ? '#1e3a5f' : 'transparent',
      color: active ? '#7dd3fc' : '#c0cfe0',
      border: `1px solid ${active ? '#2d5fa3' : 'transparent'}`,
    }),
    detail: { flex: 1, overflow: 'auto', padding: 16 },
    badge: (color: string) => ({
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      background: `${color}22`,
      color,
      border: `1px solid ${color}55`,
    }),
    th: {
      padding: '7px 10px',
      textAlign: 'left' as const,
      fontSize: 11,
      color: '#8898aa',
      fontWeight: 600,
      whiteSpace: 'nowrap' as const,
      borderBottom: '1px solid #2a3441',
    },
    td: {
      padding: '6px 10px',
      fontSize: 12,
      color: '#c0cfe0',
      borderBottom: '1px solid #1e2535',
      whiteSpace: 'nowrap' as const,
    },
    search: {
      width: '100%',
      padding: '5px 10px',
      borderRadius: 5,
      border: '1px solid #2a3441',
      background: '#161b27',
      color: '#e2e8f0',
      fontSize: 12,
      outline: 'none',
      marginBottom: 8,
      boxSizing: 'border-box' as const,
    },
    section: { color: '#7dd3fc', fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 12 },
  };

  // ── 섹션 헤더 스타일 ──────────────────────────────────────────────────────
  const SectionHeader = ({ icon, title, sub }: { icon: string; title: string; sub?: string }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        margin: '20px 0 10px',
        paddingBottom: 6,
        borderBottom: '1px solid #2a3441',
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>{title}</span>
      {sub && <span style={{ color: '#4b5563', fontSize: 11 }}>{sub}</span>}
    </div>
  );

  // ── 통합 뷰 (Config + Style 합쳐서 섹션 그룹으로) ─────────────────────────
  const renderUnified = () => (
    <div style={s.body}>
      {/* ① 앱 설정 값 (스칼라 키-값) */}
      {configEntries.length > 0 && (
        <>
          <SectionHeader icon="⚙" title={t18n('xconViewer.configTitle')} />
          <div style={s.card}>
            {configEntries.map(({ key, value }) => (
              <div key={key} style={s.row}>
                <span style={s.key}>{key}</span>
                <span style={s.value}>{value || <em style={{ color: '#4b5563' }}>{t18n('xconViewer.empty')}</em>}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ② 색상 팔레트 */}
      {colors.length > 0 && (
        <>
          <SectionHeader
            icon="🎨"
            title={t18n('xconViewer.colorsTitle')}
            sub={t18n('xconViewer.colorsCount', { count: String(colors.length) })}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 6,
              marginBottom: 14,
            }}
          >
            {colors.map(({ key, css, raw }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  borderRadius: 6,
                  background: '#1e2535',
                  border: '1px solid #2a3441',
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 5,
                    flexShrink: 0,
                    background: css,
                    border: '1px solid #3a4556',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)',
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#7dd3fc', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>{key}</div>
                  <div style={{ color: '#4b5563', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>{raw}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ③ 스타일 섹션들 (layout / typography / effects 등) */}
      {styleSections.map((sec) => (
        <React.Fragment key={sec.title}>
          <SectionHeader
            icon="📐"
            title={t18n(sec.title)}
            sub={t18n('xconViewer.colorsCount', { count: String(sec.entries.length) })}
          />
          <div style={s.card}>
            {sec.entries.map(({ key, value }) => (
              <div key={key} style={s.row}>
                <span style={s.key}>{key}</span>
                <span style={s.value}>{value}</span>
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}

      {/* ④ 배열 섹션들 (screenPatterns / interactionPatterns 등) */}
      {hasArrays &&
        arraySections.map((sec) => (
          <React.Fragment key={sec.key}>
            <SectionHeader
              icon="📋"
              title={sec.key}
              sub={t18n('xconViewer.colorsCount', { count: String(sec.items.length) })}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {sec.items.map((item, idx) => {
                const nameField = item.fields.find((f) => f.key === 'name');
                const descField = item.fields.find((f) => f.key === 'description');
                const restFields = item.fields.filter((f) => f.key !== 'name' && f.key !== 'description');
                return (
                  <div key={idx} style={{ ...s.card, padding: '10px 14px' }}>
                    {/* name 필드 → 굵은 타이틀로 강조 */}
                    {nameField && (
                      <div
                        style={{
                          color: '#7dd3fc',
                          fontWeight: 700,
                          fontSize: 13,
                          fontFamily: 'monospace',
                          marginBottom: descField || restFields.length ? 5 : 0,
                        }}
                      >
                        {nameField.value}
                      </div>
                    )}
                    {/* description 필드 → 설명 텍스트 */}
                    {descField && (
                      <div
                        style={{
                          color: '#94a3b8',
                          fontSize: 12,
                          lineHeight: 1.5,
                          marginBottom: restFields.length ? 8 : 0,
                        }}
                      >
                        {descField.value}
                      </div>
                    )}
                    {/* 나머지 스칼라 필드 → key-value 행 */}
                    {restFields.map(({ key, value }) =>
                      key === '' ? (
                        <span key={`${idx}-plain`} style={s.value}>
                          {value}
                        </span>
                      ) : (
                        <div key={key} style={{ ...s.row, paddingTop: 4 }}>
                          <span style={s.key}>{key}</span>
                          <span style={s.value}>{value}</span>
                        </div>
                      ),
                    )}
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        ))}

      {/* 아무 내용도 없으면 */}
      {configEntries.length === 0 && colors.length === 0 && styleSections.length === 0 && !hasArrays && (
        <div style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
          {t18n('xconViewer.noContent')}
        </div>
      )}
    </div>
  );

  // ── Database 탭 ──────────────────────────────────────────────────────────
  const renderDatabase = () => {
    const currentTable = tables.find((tbl) => tbl.name === (selectedTable ?? tables[0]?.name));
    const filteredRows = (currentTable?.rows ?? []).filter(
      (row) => !searchDb || Object.values(row).some((v) => String(v).toLowerCase().includes(searchDb.toLowerCase())),
    );
    return (
      <div style={s.split}>
        <div style={s.sidebar}>
          <div style={{ ...s.label, marginBottom: 8 }}>Tables ({tables.length})</div>
          {tables.map((tbl) => (
            <div
              key={tbl.name}
              style={s.sideItem(tbl.name === (selectedTable ?? tables[0]?.name))}
              onClick={() => {
                setSelectedTable(tbl.name);
                setSearchDb('');
              }}
            >
              <div style={{ fontWeight: 600 }}>{tbl.name}</div>
              <div style={{ color: '#6b7280', fontSize: 10 }}>
                {t18n('xconViewer.tableColumns', { cols: String(tbl.columns.length), rows: String(tbl.rows.length) })}
              </div>
            </div>
          ))}
        </div>
        <div style={s.detail}>
          {currentTable ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#7dd3fc', fontWeight: 700, fontSize: 15 }}>{currentTable.name}</span>
                <span style={s.badge('#22c55e')}>{filteredRows.length} rows</span>
              </div>
              {/* 스키마 */}
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
                {currentTable.columns.map((col) => (
                  <span key={col.name} style={s.badge(col.key ? '#eab308' : '#6b7280')}>
                    {col.name}: {col.dataType}
                    {col.key ? ' (PK)' : ''}
                  </span>
                ))}
              </div>
              <input
                style={s.search}
                placeholder={t18n('xconViewer.rowSearch')}
                value={searchDb}
                onChange={(e) => setSearchDb(e.target.value)}
              />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1e2535' }}>
                      {currentTable.columns.map((col) => (
                        <th key={col.name} style={s.th}>
                          {col.name}
                          {col.key && <span style={{ color: '#eab308' }}> ★</span>}
                          <div style={{ color: '#4b5563', fontWeight: 400 }}>{col.dataType}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={currentTable.columns.length}
                          style={{ ...s.td, textAlign: 'center', color: '#4b5563' }}
                        >
                          {t18n('xconViewer.noData')}
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, i) => (
                        <tr key={i}>
                          {currentTable.columns.map((col) => (
                            <td key={col.name} style={s.td}>
                              {row[col.name] ?? <em style={{ color: '#4b5563' }}>null</em>}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ color: '#6b7280', fontSize: 13 }}>{t18n('xconViewer.selectTable')}</div>
          )}
        </div>
      </div>
    );
  };

  // ── API 탭 ──────────────────────────────────────────────────────────────
  const renderApi = () => {
    const filteredApis = apis.filter(
      (ep) =>
        !searchApi ||
        ep.name.toLowerCase().includes(searchApi.toLowerCase()) ||
        ep.endpoint.toLowerCase().includes(searchApi.toLowerCase()),
    );
    const currentApi = apis.find((ep) => ep.name === (selectedApi ?? apis[0]?.name));
    const methodColor = (m: string) => METHOD_COLOR[m?.toUpperCase()] ?? '#6b7280';

    return (
      <div style={s.split}>
        <div style={s.sidebar}>
          <div style={{ ...s.label, marginBottom: 6 }}>Endpoints ({apis.length})</div>
          <input
            style={s.search}
            placeholder={t18n('xconViewer.searchPlaceholder')}
            value={searchApi}
            onChange={(e) => setSearchApi(e.target.value)}
          />
          {filteredApis.map((ep) => (
            <div
              key={ep.name}
              style={s.sideItem(ep.name === (selectedApi ?? apis[0]?.name))}
              onClick={() => setSelectedApi(ep.name)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {ep.method && (
                  <span style={{ ...s.badge(methodColor(ep.method)), fontSize: 9, padding: '1px 5px' }}>
                    {ep.method}
                  </span>
                )}
                <span style={{ fontWeight: 600, fontSize: 12 }}>{ep.name}</span>
              </div>
              <div style={{ color: '#4b5563', fontSize: 10, fontFamily: 'monospace' }}>{ep.endpoint}</div>
            </div>
          ))}
        </div>
        <div style={s.detail}>
          {currentApi ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ color: '#7dd3fc', fontWeight: 700, fontSize: 15 }}>{currentApi.name}</span>
                {currentApi.method && <span style={s.badge(methodColor(currentApi.method))}>{currentApi.method}</span>}
              </div>
              {currentApi.endpoint && (
                <div style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                  {currentApi.endpoint}
                </div>
              )}
              {currentApi.description && (
                <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>{currentApi.description}</div>
              )}
              {currentApi.caller && (
                <div style={{ ...s.row, marginBottom: 10 }}>
                  <span style={s.key}>caller</span>
                  <span style={s.value}>{currentApi.caller}</span>
                  {currentApi.version && (
                    <>
                      <span style={s.key}>version</span>
                      <span style={s.value}>{currentApi.version}</span>
                    </>
                  )}
                </div>
              )}
              {/* Parameters */}
              {currentApi.parameters.length > 0 && (
                <>
                  <div style={s.section}>Parameters</div>
                  <div style={{ background: '#1e2535', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#252d3d' }}>
                          <th style={s.th}>Name</th>
                          <th style={s.th}>Value / Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentApi.parameters.map((p, i) => (
                          <tr key={i}>
                            <td style={s.td}>
                              <span style={{ fontFamily: 'monospace' }}>{p.name}</span>
                            </td>
                            <td style={s.td}>{p.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {/* Returns */}
              {currentApi.returns.length > 0 && (
                <>
                  <div style={s.section}>Returns</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
                    {currentApi.returns.map((r, i) => (
                      <span key={i} style={s.badge('#22c55e')}>
                        {r}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {/* Action */}
              {currentApi.action && (
                <>
                  <div style={s.section}>Action</div>
                  <div style={{ background: '#1e2535', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                    {Object.entries(currentApi.action).map(([k, v]) => (
                      <div key={k} style={{ ...s.row, alignItems: 'flex-start' }}>
                        <span style={s.key}>{k}</span>
                        <span
                          style={{
                            ...s.value,
                            fontFamily: typeof v === 'object' ? 'monospace' : undefined,
                            fontSize: 11,
                            whiteSpace: 'pre-wrap' as const,
                            wordBreak: 'break-all' as const,
                          }}
                        >
                          {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ color: '#6b7280', fontSize: 13 }}>{t18n('xconViewer.selectEndpoint')}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={s.root}>
      {useUnifiedView ? (
        /* ── 설정 파일: 탭 없이 섹션 그룹 스크롤 뷰 ── */
        renderUnified()
      ) : (
        /* ── Database / API 파일: 탭 전환 뷰 ── */
        <>
          <div style={s.tabBar}>
            {tabs.map((t) => (
              <button key={t.id} style={s.tabBtn(t.id === activeTab)} onClick={() => setTab(t.id)}>
                {t.label}
                {t.count !== undefined ? ` (${t.count})` : ''}
              </button>
            ))}
          </div>
          {activeTab === 'database' && renderDatabase()}
          {activeTab === 'api' && renderApi()}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface XconViewerPaneProps {
  filePath: string;
  fileName: string;
  ext: string;
  initialContent: string;
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
  renderOptions?: RenderOptions;
  onContentUpdate?: (content: string) => void;
}

type ViewMode = 'preview' | 'source' | 'split';
const MIN_XCON_VIEWER_RENDER_INTERVAL_MS = 120;
type SourceFormat = 'xml' | 'json' | 'tagless' | 'sketch';

// Typed webview element (Electron)
type XconWebviewEl = HTMLElement & {
  executeJavaScript(code: string): Promise<unknown>;
  getURL(): string;
};

const WebviewEl = 'webview' as React.ElementType;

/** App 루트에서 현재 테마(dark/light)를 읽는다 */
function getCurrentTheme(): 'dark' | 'light' {
  const root = document.querySelector('.app');
  if (root?.classList.contains('theme-light')) return 'light';
  return 'dark';
}

/** xcon-viewer.html 의 URL (개발: localhost, 배포: file://) */
function getViewerUrl(): string {
  const base = window.location.href.replace(/\/[^/]*$/, '/');
  return base + 'xcon-viewer.html';
}

/** 확장자 → SourceFormat 매핑 (.xcon 제외 — 내용으로 판별) */
function extToFormat(ext: string): SourceFormat {
  switch (ext.toLowerCase()) {
    case 'xconj':
    case 'xcon.json':
      return 'json';
    case 'xconx':
    case 'xcon.xml':
      return 'xml';
    case 'xcont':
    case 'xcon.tagless':
      return 'tagless';
    case 'xcons':
    case 'xcon.sketch':
    case 'sketch':
      return 'sketch';
    default:
      return 'json';
  }
}

/**
 * 콘텐츠 앞부분을 보고 XCON 포맷을 자동 판별한다.
 *  - `{` 또는 `[` 로 시작      → JSON
 *  - `<` 로 시작               → XML
 *  - `screen ` 키워드로 시작   → SKETCH
 *  - 그 외                     → TAGLESS
 */
function detectFormatFromContent(src: string): SourceFormat {
  const t = src.trimStart();
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  if (t.startsWith('<')) return 'xml';
  if (/^screen\s/.test(t)) return 'sketch';
  return 'tagless';
}

/** SourceFormat → XCON 파싱 (XconLike | null) */
function parseWithFormat(src: string, fmt: SourceFormat): XconLike | null {
  try {
    if (fmt === 'xml') return XCON.fromXml(src);
    if (fmt === 'json') return XCON.fromJSON(src);
    if (fmt === 'tagless') return XCON.fromTagless(src);
    if (fmt === 'sketch') {
      if (XCON.fromSketchLenient) return XCON.fromSketchLenient(src).document;
      return XCON.fromSketch ? XCON.fromSketch(src) : XCON.deserialize(src);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function findBestEffortXconViewerSource(src: string, fmt: SourceFormat): string {
  if (parseWithFormat(src, fmt)) return src;

  const normalized = String(src || '').replace(/\r\n/g, '\n');
  const completeSource = normalized.endsWith('\n')
    ? normalized
    : normalized.slice(0, Math.max(0, normalized.lastIndexOf('\n') + 1));
  const lines = completeSource.split('\n');

  for (let end = lines.length; end > 0; end -= 1) {
    const candidate = lines.slice(0, end).join('\n').trimEnd();
    if (!candidate.trim()) continue;
    if (parseWithFormat(candidate, fmt)) return candidate;
  }

  return '';
}

function hashXconViewerRenderPayload(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

export function XconViewerPane({
  filePath,
  fileName,
  ext,
  initialContent,
  remoteFileProfile,
  remoteFilePath,
  renderOptions,
  onContentUpdate,
}: XconViewerPaneProps) {
  const { t: t18n } = useI18n();
  // .xcon → 내용으로 자동 판별 (JSON / XML / TAGLESS)
  // .xml → xml, .xconj → json, .xconl → tagless
  const fileFormat: SourceFormat =
    ext.toLowerCase() === 'xcon' ? detectFormatFromContent(initialContent) : extToFormat(ext);

  /** 파일명에서 결정되는 기본 뷰어 타입 */
  const fileType = getXconFileType(fileName);

  const bodyRef = useRef<HTMLDivElement>(null);
  const { ratio: splitRatio, isDragging: isSplitDragging, onSplitterMouseDown } = useSplitter(bodyRef);

  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<ViewMode>('preview');
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [renderPending, setRenderPending] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>(fileFormat);
  const streamedContent = useStreamingText(content, renderOptions, isModified);
  const viewerRenderContent = useMemo(() => {
    if (!streamedContent.isStreaming) return streamedContent.text;
    return findBestEffortXconViewerSource(streamedContent.text, sourceFormat) || streamedContent.text;
  }, [streamedContent.isStreaming, streamedContent.text, sourceFormat]);

  // 전용 패널용: 파싱 결과를 state로 관리 (ref 변경은 리렌더 미유발)
  const [xconObj, setXconObj] = useState<XconLike | null>(() => parseWithFormat(initialContent, fileFormat));

  /**
   * XCON 콘텐츠 기반 최종 뷰 타입.
   * 파일명(fileType) + 파싱 결과(xconObj)의 type 필드를 조합해 결정한다.
   */
  const xconViewType = React.useMemo(() => resolveXconViewType(fileType, xconObj), [fileType, xconObj]);

  /** 웹뷰 렌더러가 아닌 전용 패널(XconInfoPanel)을 사용하는지 여부 */
  const isSpecialFile = xconViewType !== 'ui';

  const webviewRef = useRef<XconWebviewEl>(null);
  /** content를 sourceFormat에 맞게 파싱한 XCON 객체 캐시 */
  const xconRef = useRef<XconLike | null>(xconObj);
  const pendingViewerRenderRef = useRef<{ payload: string; renderKey: string } | null>(null);
  const viewerRenderTimerRef = useRef<number | undefined>(undefined);
  const lastViewerRenderKeyRef = useRef('');
  const lastViewerRenderAtRef = useRef(0);

  // Sync to DockContent (debounced)
  useEffect(() => {
    const timer = setTimeout(() => onContentUpdate?.(content), 500);
    return () => clearTimeout(timer);
  }, [content, onContentUpdate]);

  /* ── content / sourceFormat 변경 시 xconRef + xconObj 갱신 (debounced 400ms) ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = parseWithFormat(content, sourceFormat);
      xconRef.current = parsed;
      setXconObj(parsed); // 전용 패널 리렌더 트리거
    }, 400);
    return () => clearTimeout(timer);
  }, [content, sourceFormat]);

  /* ── webview 렌더 호출 ──
     tagless는 webview가 이해하는 xml로 변환해서 전달.
     sketch는 xcon-viewer.html에 xamong-sketch.js가 로드되어 있으므로 직접 전달. */
  const flushViewerRender = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const pending = pendingViewerRenderRef.current;
    if (!pending) {
      setRenderPending(false);
      return;
    }
    pendingViewerRenderRef.current = null;
    viewerRenderTimerRef.current = undefined;
    lastViewerRenderKeyRef.current = pending.renderKey;
    lastViewerRenderAtRef.current = Date.now();
    wv.executeJavaScript(`window.__xconViewerRender && window.__xconViewerRender(${pending.payload})`)
      .catch(() => undefined)
      .finally(() => setRenderPending(false));
  }, []);

  const renderInViewer = useCallback(
    (src: string, fmt: SourceFormat) => {
      const wv = webviewRef.current;
      if (!wv) return;
      const theme = getCurrentTheme();

      let viewerContent = src;
      let viewerFormat: string = fmt === 'json' ? 'json' : fmt === 'sketch' ? 'sketch' : 'xml';

      if (fmt === 'tagless') {
        try {
          const xcon = xconRef.current ?? XCON.fromTagless(src);
          if (xcon) {
            XCON.TAGLESS = false;
            XCON.setAListType('xcon');
            viewerContent = XCON.serialize(xcon, false);
            viewerFormat = 'xml';
          }
        } catch {
          /* 변환 실패 시 원본 전달 */
        }
      }

      const payload = JSON.stringify({ content: viewerContent, format: viewerFormat, theme });
      const renderKey = `${theme}:${viewerFormat}:${hashXconViewerRenderPayload(viewerContent)}`;
      if (lastViewerRenderKeyRef.current === renderKey) {
        setRenderPending(false);
        return;
      }

      pendingViewerRenderRef.current = { payload, renderKey };
      const elapsed = Date.now() - lastViewerRenderAtRef.current;
      const delay = lastViewerRenderAtRef.current ? Math.max(0, MIN_XCON_VIEWER_RENDER_INTERVAL_MS - elapsed) : 0;

      if (delay <= 0) {
        if (viewerRenderTimerRef.current !== undefined) {
          window.clearTimeout(viewerRenderTimerRef.current);
          viewerRenderTimerRef.current = undefined;
        }
        flushViewerRender();
        return;
      }

      if (viewerRenderTimerRef.current === undefined) {
        viewerRenderTimerRef.current = window.setTimeout(flushViewerRender, delay);
      }
    },
    [flushViewerRender],
  );

  /* ── 이하 웹뷰 관련 effects: 특수 파일(config/database/api)에선 불필요 ── */

  /* ── webview dom-ready 이벤트 ── */
  useEffect(() => {
    if (isSpecialFile) return;
    const wv = webviewRef.current;
    if (!wv) return;
    const onReady = () => {
      setIsViewerReady(true);
    };
    wv.addEventListener('dom-ready', onReady);
    return () => wv.removeEventListener('dom-ready', onReady);
  }, [isSpecialFile]);

  /* ── 준비되거나 콘텐츠가 변경되면 중복 렌더를 coalesce해서 전달 ── */
  useEffect(() => {
    if (isSpecialFile || !isViewerReady) return;
    setRenderPending(true);
    renderInViewer(viewerRenderContent, sourceFormat);
  }, [isSpecialFile, viewerRenderContent, sourceFormat, isViewerReady, renderInViewer]);

  useEffect(
    () => () => {
      if (viewerRenderTimerRef.current !== undefined) {
        window.clearTimeout(viewerRenderTimerRef.current);
      }
    },
    [],
  );

  /* ── 앱 테마 변경 감지 → 뷰어 테마 동기화 ── */
  useEffect(() => {
    if (isSpecialFile) return;
    const appEl = document.querySelector('.app');
    if (!appEl) return;
    const observer = new MutationObserver(() => {
      const wv = webviewRef.current;
      if (!wv || !isViewerReady) return;
      const theme = getCurrentTheme();
      wv.executeJavaScript(
        `window.__xconViewerSetTheme && window.__xconViewerSetTheme(${JSON.stringify(theme)})`,
      ).catch(() => undefined);
    });
    observer.observe(appEl, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [isSpecialFile, isViewerReady]);

  const handleChange = useCallback((val: string) => {
    setContent(val);
    setIsModified(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isModified || isSaving) return;
    try {
      setIsSaving(true);
      const result = await saveEditableText({ filePath, remoteFileProfile, remoteFilePath }, content);
      setSaveMsg(result.saved ? t18n('common.saved') : t18n('common.saveFailed'));
      if (result.saved) setIsModified(false);
    } catch {
      setSaveMsg(t18n('common.saveError'));
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 2000);
    }
  }, [content, filePath, isModified, isSaving, remoteFilePath, remoteFileProfile, t18n]);

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

  const handleRefresh = useCallback(() => {
    renderInViewer(content, sourceFormat);
  }, [content, sourceFormat, renderInViewer]);

  const convertTo = useCallback(
    (targetFormat: SourceFormat) => {
      if (targetFormat === sourceFormat || isConverting) return;

      setIsConverting(true);
      try {
        // 캐시된 xcon 객체 우선 사용, 없으면 즉시 파싱
        const xcon = xconRef.current ?? parseWithFormat(content, sourceFormat);
        if (!xcon) throw new Error(t18n('xconViewer.parseFailed'));

        let result: string;
        if (targetFormat === 'json') {
          result = XCON.toJSON(xcon, true);
        } else if (targetFormat === 'xml') {
          // XML 변환 시 TAGLESS 모드 해제
          XCON.TAGLESS = false;
          XCON.setAListType('xcon');
          result = XCON.serialize(xcon, false);
        } else if (targetFormat === 'sketch') {
          if (typeof XCON.toSketch === 'function') {
            result = XCON.toSketch(xcon);
          } else {
            throw new Error(t18n('xconViewer.sketchNotFound'));
          }
        } else {
          result = XCON.toTagless(xcon);
        }

        setContent(result);
        setSourceFormat(targetFormat);
        setIsModified(true);
      } catch (e) {
        setSaveMsg(t18n('xconViewer.convertFailed', { e: e instanceof Error ? e.message : String(e) }));
        setTimeout(() => setSaveMsg(null), 2500);
      } finally {
        setIsConverting(false);
      }
    },
    [content, isConverting, sourceFormat],
  );

  const { isRefreshing, refresh } = usePaneRefresh({ onRefresh: handleRefresh });

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setSaveMsg(t18n('common.copied'));
    } catch {
      setSaveMsg(t18n('common.copyFailed'));
    } finally {
      setTimeout(() => setSaveMsg(null), 1500);
    }
  }, [content]);

  // sketch는 커스텀 DSL이므로 언어 하이라이팅 없이 순수 텍스트 에디터로 표시
  const langExt = sourceFormat === 'json' ? json() : sourceFormat === 'sketch' ? null : xml();
  const editorExts = [
    ...(langExt ? [langExt] : []),
    EditorView.theme({
      '.cm-scroller': { fontFamily: 'var(--font-mono, "Cascadia Code", Consolas, monospace)' },
    }),
  ];

  const viewerUrl = getViewerUrl();

  return (
    <div className="xd-pane">
      {/* ── 툴바 ── */}
      <div className="xd-toolbar">
        <span className="xd-filename" title={filePath}>
          {fileName}
          {isModified ? ' •' : ''}
        </span>
        <span className="xd-badge">
          {xconViewType === 'config'
            ? 'XCON/CONFIG'
            : xconViewType === 'database'
              ? 'XCON/DB'
              : xconViewType === 'api'
                ? 'XCON/API'
                : xconViewType === 'unified'
                  ? 'XCON/INFO'
                  : sourceFormat === 'json'
                    ? 'XCON/JSON'
                    : sourceFormat === 'tagless'
                      ? 'XCON/TAGLESS'
                      : sourceFormat === 'sketch'
                        ? 'XCON/SKETCH'
                        : 'XCON/XML'}
        </span>
        <div className="xd-toolbar-sep" />

        {/* 모드 선택 */}
        <div className="xd-mode-btns">
          {(['preview', 'source', 'split'] as ViewMode[]).map((m) => (
            <button key={m} className={`xd-mode-btn${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>
              {m === 'preview'
                ? t18n('xconViewer.previewTab')
                : m === 'source'
                  ? t18n('xconViewer.sourceTab')
                  : t18n('xconViewer.splitTab')}
            </button>
          ))}
        </div>

        <div className="xd-toolbar-sep" />

        {/* 새로고침 */}
        <button
          className={`pane-refresh-btn${isRefreshing || renderPending ? ' is-spinning' : ''}`}
          onClick={refresh}
          disabled={isRefreshing}
          title={t18n('xconViewer.refreshRenderTitle')}
        >
          ↺
        </button>

        <div className="xd-toolbar-flex" />

        {/* 포맷 변환 */}
        <div className="xd-mode-btns" title={t18n('xconViewer.formatConvertTitle')}>
          {(['json', 'xml', 'tagless', 'sketch'] as SourceFormat[]).map((fmt) => (
            <button
              key={fmt}
              className={`xd-mode-btn${sourceFormat === fmt ? ' active' : ''}`}
              onClick={() => convertTo(fmt)}
              disabled={isConverting || sourceFormat === fmt}
              title={t18n('xconViewer.convertToFormat', { fmt: fmt.toUpperCase() })}
            >
              {isConverting && sourceFormat !== fmt ? '…' : fmt.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="xd-toolbar-sep" />

        <button className="xd-icon-btn" onClick={handleCopy} title={t18n('xconViewer.copySourceTitle')}>
          ⧉
        </button>
        <button
          className={`xd-save-btn${isModified ? ' modified' : ''}`}
          onClick={handleSave}
          disabled={isSaving || !isModified}
          title={t18n('xconViewer.saveTitle')}
        >
          {isSaving ? t18n('common.saving') : (saveMsg ?? t18n('common.save'))}
        </button>
      </div>

      {/* ── 바디 ── */}
      <div ref={bodyRef} className={`xd-body mode-${mode}`}>
        {/* 소스 패널 (모든 파일 공통) */}
        <div
          className="xd-source-panel"
          style={mode === 'split' ? { width: `${splitRatio * 100}%`, flex: 'none' } : undefined}
        >
          <div className="xd-editor-wrap">
            <CodeMirror
              value={content}
              theme={oneDark}
              extensions={editorExts}
              onChange={handleChange}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                drawSelection: true,
                dropCursor: false,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: false,
                rectangularSelection: true,
                crosshairCursor: false,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                searchKeymap: true,
              }}
            />
          </div>
        </div>

        {mode === 'split' && <div className="pane-splitter" onMouseDown={onSplitterMouseDown} />}

        {/* 미리보기 패널: 파일 타입에 따라 전용 뷰어 또는 웹뷰 */}
        <div className="xd-preview-panel" style={{ position: 'relative' }}>
          {/* 스플리터 드래그 중 webview/iframe의 마우스 이벤트 차단 커버 */}
          {isSplitDragging && <div style={{ position: 'absolute', inset: 0, zIndex: 9999, cursor: 'col-resize' }} />}
          {isSpecialFile ? (
            /* ── 특수 파일 / 비-UI XCON: 전용 구조화 뷰어 ── */
            <XconInfoPanel
              xcon={xconObj}
              defaultTab={xconViewType === 'database' ? 'database' : xconViewType === 'api' ? 'api' : 'config'}
            />
          ) : (
            /* ── 일반 XCON: 기존 웹뷰 렌더러 ── */
            <>
              {!isViewerReady && (
                <div className="xd-loading">
                  <span className="xd-loading-icon">⬡</span>
                  <span>{t18n('xconViewer.viewerLoading')}</span>
                </div>
              )}
              <WebviewEl
                ref={webviewRef}
                src={viewerUrl}
                className={`xd-webview${isViewerReady ? ' ready' : ''}`}
                webpreferences="contextIsolation=true"
                disablewebsecurity="false"
              />
            </>
          )}
        </div>
      </div>

      {/* ── 상태바 ── */}
      <div className="xd-statusbar">
        <span className="xd-statusbar-format">
          {xconViewType === 'config'
            ? t18n('xconViewer.configSection')
            : xconViewType === 'database'
              ? '🗄 Database'
              : xconViewType === 'api'
                ? '🔌 API'
                : xconViewType === 'unified'
                  ? '📋 XCON INFO'
                  : sourceFormat === 'json'
                    ? '🔶 XCON JSON'
                    : sourceFormat === 'tagless'
                      ? '🔹 XCON TAGLESS'
                      : sourceFormat === 'sketch'
                        ? '✏ XCON SKETCH'
                        : '🔷 XCON XML'}
        </span>
        <span>{t18n('xconViewer.lines', { n: String(content.split('\n').length) })}</span>
        <span>{t18n('xconViewer.chars', { n: String(content.length) })}</span>
        {!isSpecialFile && renderPending && (
          <span className="xd-statusbar-pending">{t18n('xconViewer.rendering')}</span>
        )}
        {!isSpecialFile && isViewerReady && !renderPending && (
          <span className="xd-statusbar-ok">{t18n('xconViewer.renderDone')}</span>
        )}
        {isSpecialFile && xconObj && <span className="xd-statusbar-ok">{t18n('xconViewer.parseDone')}</span>}
        {isSpecialFile && !xconObj && <span className="xd-statusbar-pending">{t18n('xconViewer.parsing')}</span>}
      </div>
    </div>
  );
}
