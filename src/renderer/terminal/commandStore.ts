/**
 * commandStore — 명령 이력 및 단축 명령(북마크)을 localStorage에 저장/로드.
 *
 * NOTE: localStorage는 URL 오리진(origin)에 따라 저장 위치가 달라지므로
 *       영속 저장(재시작 후 복원)은 terminalAPI.saveSettings/getSettings 를 통해
 *       userData/settings.json 에 저장한다. 이 파일의 save/load 함수는
 *       같은 세션 내 즉시 접근(동기)용 캐시 역할을 담당한다.
 */

// CmdShortcut 는 main/renderer 공유 타입에서 가져온다
import type { CmdShortcut, TerminalWorkBlock } from '../../shared/types';

export type { CmdShortcut, TerminalWorkBlock };

const HISTORY_KEY = 'xamong-desk-cmd-history';
const SHORTCUT_KEY = 'xamong-desk-cmd-shortcuts';
const WORK_BLOCKS_KEY = 'xamong-desk-terminal-work-blocks';

export const MAX_HISTORY = 200;
export const MAX_WORK_BLOCKS = 200;
export const WORK_BLOCK_EXPORT_KIND = 'xenesis-terminal-work-blocks';

export interface WorkBlockExportPayload {
  kind: typeof WORK_BLOCK_EXPORT_KIND;
  version: 1;
  exportedAt: string;
  blocks: TerminalWorkBlock[];
}

// ─── 명령 이력 ────────────────────────────────────────────────────────────────

export function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveHistory(list: string[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

/** 새 명령을 이력 맨 앞에 추가 (중복 제거 후 최대 MAX_HISTORY 유지) */
export function pushHistory(list: string[], cmd: string): string[] {
  return [cmd, ...list.filter((h) => h !== cmd)].slice(0, MAX_HISTORY);
}

// ─── 단축 명령 ────────────────────────────────────────────────────────────────

export function loadShortcuts(): CmdShortcut[] {
  try {
    return JSON.parse(localStorage.getItem(SHORTCUT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveShortcuts(shortcuts: CmdShortcut[]): void {
  localStorage.setItem(SHORTCUT_KEY, JSON.stringify(shortcuts));
}

// ─── 터미널 묶음 명령 ───────────────────────────────────────────────────────

function fallbackId(): string {
  return `work-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? fallbackId();
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeWorkBlock(value: unknown): TerminalWorkBlock | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<TerminalWorkBlock>;
  const command = cleanText(raw.command);
  if (!command) return null;
  const now = Date.now();
  const label = cleanText(raw.label) || command.split(/\r?\n/)[0].slice(0, 80) || '묶음 명령';
  return {
    id: cleanText(raw.id) || createId(),
    label,
    command,
    group: cleanText(raw.group),
    cwd: cleanText(raw.cwd),
    terminalKind: cleanText(raw.terminalKind) || 'shell',
    createdAt: finiteNumber(raw.createdAt, now),
    updatedAt: finiteNumber(raw.updatedAt, now),
    runCount: Math.max(0, finiteNumber(raw.runCount, 0)),
  };
}

function normalizeWorkBlocks(values: unknown[]): TerminalWorkBlock[] {
  return values
    .map(normalizeWorkBlock)
    .filter((block): block is TerminalWorkBlock => Boolean(block))
    .slice(0, MAX_WORK_BLOCKS);
}

export function loadWorkBlocks(): TerminalWorkBlock[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(WORK_BLOCKS_KEY) ?? '[]');
    return normalizeWorkBlocks(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export function saveWorkBlocks(blocks: TerminalWorkBlock[]): void {
  const normalized = normalizeWorkBlocks(blocks);
  localStorage.setItem(WORK_BLOCKS_KEY, JSON.stringify(normalized));
}

export function createWorkBlockExportPayload(
  blocks: TerminalWorkBlock[],
  exportedAt = new Date().toISOString(),
): WorkBlockExportPayload {
  return {
    kind: WORK_BLOCK_EXPORT_KIND,
    version: 1,
    exportedAt,
    blocks: normalizeWorkBlocks(blocks),
  };
}

export function parseWorkBlockImportPayload(value: unknown): TerminalWorkBlock[] {
  if (Array.isArray(value)) {
    return normalizeWorkBlocks(value);
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  const payload = value as Partial<WorkBlockExportPayload>;
  if (payload.kind !== WORK_BLOCK_EXPORT_KIND || !Array.isArray(payload.blocks)) {
    return [];
  }
  return normalizeWorkBlocks(payload.blocks);
}

export function mergeImportedWorkBlocks(
  current: TerminalWorkBlock[],
  imported: TerminalWorkBlock[],
): TerminalWorkBlock[] {
  const byId = new Map<string, TerminalWorkBlock>();
  for (const block of normalizeWorkBlocks(current)) {
    byId.set(block.id, block);
  }
  for (const block of normalizeWorkBlocks(imported)) {
    byId.set(block.id, block);
  }
  return [...byId.values()].slice(0, MAX_WORK_BLOCKS);
}

export function createWorkBlock(input: {
  label?: string;
  command: string;
  group?: string;
  cwd?: string;
  terminalKind?: string;
  now?: number;
  id?: string;
}): TerminalWorkBlock {
  const now = finiteNumber(input.now, Date.now());
  const command = cleanText(input.command);
  const label = cleanText(input.label) || command.split(/\r?\n/)[0].slice(0, 80) || '묶음 명령';
  return {
    id: cleanText(input.id) || createId(),
    label,
    command,
    group: cleanText(input.group),
    cwd: cleanText(input.cwd),
    terminalKind: cleanText(input.terminalKind) || 'shell',
    createdAt: now,
    updatedAt: now,
    runCount: 0,
  };
}

export function touchWorkBlockRun(block: TerminalWorkBlock, now = Date.now()): TerminalWorkBlock {
  return {
    ...block,
    updatedAt: now,
    runCount: block.runCount + 1,
  };
}

export function duplicateWorkBlock(block: TerminalWorkBlock, now = Date.now()): TerminalWorkBlock {
  return {
    ...block,
    id: createId(),
    label: `${block.label} 복사본`,
    createdAt: now,
    updatedAt: now,
    runCount: 0,
  };
}

export function deleteWorkBlock(blocks: TerminalWorkBlock[], id: string): TerminalWorkBlock[] {
  return blocks.filter((block) => block.id !== id);
}

export function updateWorkBlock(
  blocks: TerminalWorkBlock[],
  id: string,
  patch: Partial<Pick<TerminalWorkBlock, 'label' | 'command' | 'group' | 'cwd' | 'terminalKind'>>,
  now = Date.now(),
): TerminalWorkBlock[] {
  return blocks
    .map((block) => {
      if (block.id !== id) return block;
      return normalizeWorkBlock({
        ...block,
        ...patch,
        id: block.id,
        createdAt: block.createdAt,
        updatedAt: now,
        runCount: block.runCount,
      });
    })
    .filter((block): block is TerminalWorkBlock => Boolean(block));
}
