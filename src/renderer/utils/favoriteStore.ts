// ── 즐겨찾기 데이터 모델 & localStorage 영속성 ────────────────────────────────

const STORAGE_KEY = 'xamong-desk-favorites';
const SPLIT_KEY = 'xamong-desk-sidebar-split';

export type FavoriteKind = 'file' | 'folder' | 'url' | 'terminal-path';

export interface FavoriteItem {
  id: string;
  kind: FavoriteKind;
  /** 절대 파일/폴더 경로, http(s) URL, 또는 디렉터리 경로 */
  path: string;
  /** 화면에 표시할 짧은 이름 */
  label: string;
  addedAt: number;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function loadFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(items: FavoriteItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 저장 실패 시 조용히 무시
  }
}

export function addFavorite(items: FavoriteItem[], draft: Omit<FavoriteItem, 'id' | 'addedAt'>): FavoriteItem[] {
  // 동일 경로/URL 중복 방지
  if (items.some((f) => f.path === draft.path)) return items;
  const next: FavoriteItem = {
    ...draft,
    id: crypto.randomUUID(),
    addedAt: Date.now(),
  };
  return [...items, next];
}

export function removeFavorite(items: FavoriteItem[], id: string): FavoriteItem[] {
  return items.filter((f) => f.id !== id);
}

// ── 라벨 자동 생성 헬퍼 ───────────────────────────────────────────────────────

/** 파일/폴더 경로에서 basename 추출 */
export function labelFromPath(p: string): string {
  return p.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? p;
}

/** URL에서 표시용 짧은 레이블 추출 (hostname[:port][/첫번째 세그먼트]) */
export function labelFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.replace(/\/$/, '').split('/').filter(Boolean)[0];
    return seg ? `${u.host}/${seg}` : u.host;
  } catch {
    return url.length > 40 ? url.slice(0, 37) + '…' : url;
  }
}

// ── 사이드바 분할 비율 영속성 ─────────────────────────────────────────────────

/** 탐색기 영역 비율 (0.2 ~ 0.85), 기본 0.60 */
export function loadSplitRatio(): number {
  try {
    const v = parseFloat(localStorage.getItem(SPLIT_KEY) ?? '');
    return isNaN(v) ? 0.6 : Math.max(0.15, Math.min(0.85, v));
  } catch {
    return 0.6;
  }
}

export function saveSplitRatio(ratio: number): void {
  try {
    localStorage.setItem(SPLIT_KEY, String(ratio));
  } catch {}
}
