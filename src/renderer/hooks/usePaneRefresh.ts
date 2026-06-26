import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 패인 공통 새로고침 훅
 *
 * 모든 뷰어 패인에서 일관된 방식으로 새로고침 기능을 제공한다.
 *
 * - `onRefresh` 콜백을 받아 `isRefreshing` 상태와 `refresh` 트리거 함수를 반환
 * - F5 / Ctrl+R(macOS: ⌘R) 키를 전역 바인딩 (bindKeys=true일 때)
 * - 새로고침 완료 전 중복 호출은 무시
 *
 * 향후 이 훅을 통해 공통 기능을 한 곳에서 확장할 수 있다:
 *   - 마지막 새로고침 시각 표시
 *   - 오류 토스트 / 재시도 횟수 제한
 *   - 자동 주기 새로고침 (interval 옵션)
 *   - 새로고침 성공/실패 이벤트 전파
 */

export interface PaneRefreshOptions {
  /** 새로고침 시 실행할 비동기 함수 */
  onRefresh: () => Promise<void> | void;
  /**
   * F5 / Ctrl+R 키 바인딩 여부 (기본값: true)
   * SettingsPane 등 입력 위주 패인에서는 false 로 설정
   */
  bindKeys?: boolean;
}

export interface PaneRefreshResult {
  /** 새로고침 진행 중 여부 — 버튼 disabled / 스피너 표시에 사용 */
  isRefreshing: boolean;
  /** 새로고침을 트리거한다. 이미 진행 중이면 무시된다. */
  refresh: () => void;
}

export function usePaneRefresh({ onRefresh, bindKeys = true }: PaneRefreshOptions): PaneRefreshResult {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // stale closure 방지: 항상 최신 콜백 참조
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // 중복 실행 방지 flag (state와 별도로 즉시 반영)
  const busyRef = useRef(false);

  const refresh = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsRefreshing(true);
    Promise.resolve()
      .then(() => onRefreshRef.current())
      .finally(() => {
        busyRef.current = false;
        setIsRefreshing(false);
      });
  }, []);

  useEffect(() => {
    if (!bindKeys) return;
    const handler = (e: KeyboardEvent) => {
      // F5 또는 Ctrl+R (Shift 제외 — 브라우저 강력 새로고침 패턴 충돌 방지)
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey)) {
        e.preventDefault();
        refresh();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bindKeys, refresh]);

  return { isRefreshing, refresh };
}
