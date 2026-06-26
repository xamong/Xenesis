import { useCallback, useRef, useState } from 'react';

/**
 * 수평 분할 창 사이의 드래그 가능한 스플리터 훅.
 * containerRef: 양쪽 패널을 감싸는 flex 컨테이너의 ref
 * initial: 왼쪽 패널 비율 (0~1, 기본 0.5)
 *
 * isDragging: 드래그 중 true — webview / iframe 위에 투명 커버를 씌울 때 사용
 */
export function useSplitter(containerRef: React.RefObject<HTMLElement | null>, initial = 0.5) {
  const [ratio, setRatio] = useState(initial);
  const [isDragging, setIsDragging] = useState(false);
  const dragging = useRef(false);

  const onSplitterMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      setIsDragging(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const next = Math.max(0.15, Math.min(0.85, (ev.clientX - rect.left) / rect.width));
        setRatio(next);
      };

      const onMouseUp = () => {
        dragging.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [containerRef],
  );

  return { ratio, isDragging, onSplitterMouseDown };
}
